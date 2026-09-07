import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSellers, getSeller, createSeller, updateSeller, deleteSeller, getSellerLeaderboard } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { Plus, Edit, Trash2, Trophy, TrendingUp, Users, Download, Copy, CheckCircle, History } from 'lucide-react';
import { exportToExcel, formatForExport } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Sellers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [credentialsModal, setCredentialsModal] = useState({ isOpen: false, name: '', password: '' });
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    basicSalary: '',
    commissionRate: ''
  });
  const toast = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    seller: null,
    sales: [],
    loading: false
  });

  const [historyMonth, setHistoryMonth] = useState('all');

  const historyMonths = useMemo(() => {
    const set = new Set();
    (historyModal.sales || []).forEach((sale) => {
      if (!sale?.createdAt) return;
      const d = new Date(sale.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [historyModal.sales]);

  const filteredHistorySales = useMemo(() => {
    if (historyMonth === 'all') return historyModal.sales || [];
    return (historyModal.sales || []).filter((sale) => {
      if (!sale?.createdAt) return false;
      const d = new Date(sale.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === historyMonth;
    });
  }, [historyModal.sales, historyMonth]);

  const historyTotals = useMemo(() => {
    return (filteredHistorySales || []).reduce(
      (acc, sale) => {
        acc.totalRevenue += Number(sale?.total || 0);
        acc.totalCommission += Number(sale?.commission || 0);
        acc.totalProductsSold += Number(sale?.quantity || 0);
        return acc;
      },
      { totalRevenue: 0, totalCommission: 0, totalProductsSold: 0 }
    );
  }, [filteredHistorySales]);

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const response = await getSellers();
      return response.data;
    }
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['sellerLeaderboard'],
    queryFn: async () => {
      const response = await getSellerLeaderboard();
      return response.data;
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSeller) {
        // Only send editable fields (do not override earned commission)
        const payload = {
          name: formData.name,
          phone: formData.phone,
          basicSalary: formData.basicSalary,
          commissionRate: formData.commissionRate
        };

        await updateSeller(editingSeller._id, payload);
        toast.success(`✅ ${formData.name} updated successfully!`);
        setIsModalOpen(false);
        resetForm();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sellers'] }),
          queryClient.invalidateQueries({ queryKey: ['sellerLeaderboard'] })
        ]);
      } else {
        const payload = {
          name: formData.name,
          phone: formData.phone,
          basicSalary: formData.basicSalary,
          commissionRate: formData.commissionRate
        };

        const response = await createSeller(payload);
        toast.success(`🎉 ${formData.name} added as seller!`);
        // Show credentials modal with temporary password
        setCredentialsModal({
          isOpen: true,
          password: response.data.temporaryPassword,
          name: response.data.seller.name
        });
        setIsModalOpen(false);
        resetForm();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sellers'] }),
          queryClient.invalidateQueries({ queryKey: ['sellerLeaderboard'] })
        ]);
      }
    } catch (error) {
      console.error('Error saving seller:', error);
      toast.error(error.response?.data?.message || 'Failed to save seller');
    }
  };

  const handleViewHistory = async (seller) => {
    setHistoryModal({ isOpen: true, seller, sales: [], loading: true });
    try {
      const response = await getSeller(seller._id);
      const data = response.data || {};
      setHistoryMonth('all');
      setHistoryModal((prev) => ({
        ...prev,
        seller: data.seller || seller,
        sales: data.sales || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error loading seller history:', error);
      toast.error(error.response?.data?.message || 'Failed to load seller history');
      setHistoryModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleEdit = (seller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      phone: seller.phone || '',
      basicSalary: seller.basicSalary ?? '',
      commissionRate: seller.commissionRate ?? ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const seller = sellers.find(s => s._id === id);
    if (window.confirm(`Are you sure you want to delete ${seller?.name}?`)) {
      try {
        await deleteSeller(id);
        toast.success(`🗑️ ${seller?.name} removed successfully`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sellers'] }),
          queryClient.invalidateQueries({ queryKey: ['sellerLeaderboard'] })
        ]);
      } catch (error) {
        console.error('Error deleting seller:', error);
        toast.error('Failed to delete seller');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', basicSalary: '', commissionRate: '' });
    setEditingSeller(null);
  };

  const handleCopyCredentials = () => {
    const text = `Login Credentials for ${credentialsModal.name}\nTemporary Password: ${credentialsModal.password}`;
    navigator.clipboard.writeText(text);
    toast.success('📋 Credentials copied to clipboard!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeCredentialsModal = () => {
    setCredentialsModal({ isOpen: false, name: '', password: '' });
    setCopied(false);
  };

  // Filter and search sellers
  const filteredSellers = useMemo(() => {
    return sellers.filter(seller =>
      seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.phone?.includes(searchQuery)
    );
  }, [sellers, searchQuery]);

  // Paginate sellers
  const paginatedSellers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSellers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSellers, currentPage]);

  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);

  // Handle export
  const handleExport = () => {
    const formattedData = formatForExport(filteredSellers, 'sellers');
    exportToExcel(formattedData, 'sellers');
    toast.success(`📊 Exported ${filteredSellers.length} sellers to Excel!`);
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sellers</h1>
          <p className="text-gray-600 mt-1">Manage sellers and track commissions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={20} />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus size={20} />
            Add Seller
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardBody>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search sellers by name or phone..."
          />
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              Found {filteredSellers.length} seller(s)
            </div>
          )}
        </CardBody>
      </Card>

      {/* Leaderboard */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-emerald-600" size={24} />
            Top Sellers
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((seller, index) => (
              <div key={seller._id} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{medals[index]}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{seller.name}</p>
                    <p className="text-sm text-gray-600">#{index + 1} Seller</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">Rs. {seller.totalCommission.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-500">Commission</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Sellers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {searchQuery
              ? `Filtered Sellers (${filteredSellers.length})`
              : `All Sellers (${sellers.length})`}
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSellers.length > 0 ? paginatedSellers.map((seller) => (
                  <tr key={seller._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-800">{seller.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{seller.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Rs. {(seller.basicSalary ?? 0).toLocaleString('en-PK')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Rs. {(seller.commissionRate ?? 0).toLocaleString('en-PK')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Rs. {(seller.commission ?? 0).toLocaleString('en-PK')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="font-medium text-emerald-600">Rs. {(seller.total ?? 0).toLocaleString('en-PK')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(seller)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleViewHistory(seller)}>
                          <History size={16} />
                        </Button>
                        {(role === 'admin' || role === 'superadmin') && (
                          <Button variant="danger" size="sm" onClick={() => handleDelete(seller._id)}>
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No sellers found. {searchQuery && 'Try adjusting your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredSellers.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredSellers.length}
            />
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingSeller ? 'Edit Seller' : 'Add New Seller'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seller Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (Rs.)</label>
            <input
              type="number"
              min="0"
              value={formData.basicSalary}
              onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (per product, Rs.)</label>
            <input
              type="number"
              min="0"
              value={formData.commissionRate}
              onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1">
              {editingSeller ? 'Update Seller' : 'Create Seller'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={credentialsModal.isOpen}
        onClose={closeCredentialsModal}
        title="🎉 Seller Created Successfully!"
      >
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-emerald-900 font-medium">Seller account created!</p>
              <p className="text-emerald-700 text-sm mt-1">
                Share this temporary password with <strong>{credentialsModal.name}</strong>
              </p>
            </div>
          </div>

          {/* Credentials Display */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">Login Credentials</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Temporary Password</label>
                <div className="bg-white border border-gray-300 rounded-lg px-4 py-3 font-mono text-lg font-bold text-emerald-600">
                  {credentialsModal.password}
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-900 text-sm">
              ⚠️ <strong>Important:</strong> This password will only be shown once.
              Please copy and share it with the seller securely.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleCopyCredentials}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Credentials
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={closeCredentialsModal}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Seller History Modal */}
      <Modal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal({ isOpen: false, seller: null, sales: [], loading: false })}
        title={historyModal.seller ? `Seller History - ${historyModal.seller.name}` : 'Seller History'}
      >
        <div className="space-y-4">
          {historyModal.loading ? (
            <div className="text-sm text-gray-600">Loading history...</div>
          ) : historyModal.sales.length === 0 ? (
            <div className="text-sm text-gray-500">No history found for this seller.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-gray-600 font-medium">Month:</div>
                <select
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  {historyMonths.map((m) => {
                    const [yy, mm] = m.split('-');
                    const label = new Date(Number(yy), Number(mm) - 1, 1).toLocaleString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    });
                    return (
                      <option key={m} value={m}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span>
                  <span className="font-semibold">Commission rate:</span>{' '}
                  Rs. {(historyModal.seller?.commissionRate ?? 0).toLocaleString('en-PK')}
                </span>
                <span>
                  <span className="font-semibold">Sales:</span>{' '}
                  {filteredHistorySales.length}
                </span>
                <span>
                  <span className="font-semibold">Products:</span>{' '}
                  {historyTotals.totalProductsSold}
                </span>
                <span>
                  <span className="font-semibold">Revenue:</span>{' '}
                  Rs. {historyTotals.totalRevenue.toLocaleString('en-PK')}
                </span>
                <span>
                  <span className="font-semibold">Commission:</span>{' '}
                  Rs. {historyTotals.totalCommission.toLocaleString('en-PK')}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistorySales.map((sale) => (
                      <tr key={sale._id}>
                        <td className="px-3 py-2 text-xs text-gray-800">
                          {sale.productName || sale.productId?.name || '-'}-{sale.productId?.model}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-800">
                          {sale.customerName || sale.customerId?.name || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {sale.customerId?.address || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleString('en-PK') : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Sellers;
