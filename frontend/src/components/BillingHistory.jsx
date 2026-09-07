import React, { useState , useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBills, getBillingStats, deleteBill, getBillStockMovements } from '../services/api';
import BillReceipt from './BillReceipt';
import Modal from './Modal';
import { 
  Receipt, 
  Calendar, 
  User, 
  Search, 
  Filter, 
  Pencil,
  Eye, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package
} from 'lucide-react';

const BillingHistory = () => {
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(1);
  const [stockMovementsBill, setStockMovementsBill] = useState(null);
  const [stockMovementsData, setStockMovementsData] = useState(null);
  const [stockMovementsLoading, setStockMovementsLoading] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: billsResponse,
    isLoading: billsLoading
  } = useQuery({
    queryKey: ['bills', { page, ...filters }],
    queryFn: async () => {
      const response = await getBills({
        page,
        limit: 20,
        ...filters
      });
      return response.data;
    }
  });

  const { data: statsResponse } = useQuery({
    queryKey: ['billingStats'],
    queryFn: async () => {
      const response = await getBillingStats();
      return response.data;
    }
  });

  const pagination = billsResponse?.pagination || { current: page, pages: 1, total: 0 };

 useEffect(() => {
    setBills(billsResponse?.bills || []);
  }, [billsResponse]);

useEffect(() => {
    setStats(statsResponse || null);
  }, [statsResponse]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancelBill = async (bill) => {
    if (!window.confirm('Are you sure you want to cancel this bill? This will restore stock used by this bill.')) {
      return;
    }

    try {
      await deleteBill(bill._id);
      // Optimistically mark bill as cancelled in local state
      setBills((prev) => prev.map((b) => (b._id === bill._id ? { ...b, status: 'cancelled' } : b)));
      // Also update currently selected bill if open
      setSelectedBill((prev) => (prev && prev._id === bill._id ? { ...prev, status: 'cancelled' } : prev));
      // Refresh stats so aggregates reflect cancellation
      queryClient.invalidateQueries({ queryKey: ['billingStats'] });
      // Refresh bills list from server on next refetch
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    } catch (error) {
      console.error('Error cancelling bill:', error);
      alert('Failed to cancel bill. Please try again.');
    }
  };

  const handlePaymentUpdated = (updatedBill) => {
    setBills((prev) => prev.map((b) => (b._id === updatedBill._id ? updatedBill : b)));
    setSelectedBill(updatedBill);
    // Refresh stats so daily/monthly numbers and any aggregates stay accurate
    queryClient.invalidateQueries({ queryKey: ['billingStats'] });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={16} />;
      case 'cancelled':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setShowReceipt(true);
  };

  const handlePrintBill = () => {
    window.print();
  };

  const handleViewStockMovements = async (bill) => {
    setStockMovementsBill(bill);
    setStockMovementsData(null);
    setStockMovementsLoading(true);
    try {
      const response = await getBillStockMovements(bill._id);
      setStockMovementsData(response.data);
    } catch (error) {
      console.error('Error fetching bill stock movements:', error);
      alert('Failed to load stock movements for this bill.');
    } finally {
      setStockMovementsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Today's Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.daily.totalRevenue)}</p>
                <p className="text-emerald-200 text-sm">{stats.daily.totalBills} bills</p>
              </div>
              <DollarSign size={40} className="text-emerald-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Monthly Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.monthly.totalRevenue)}</p>
                <p className="text-blue-200 text-sm">{stats.monthly.totalBills} bills</p>
              </div>
              <TrendingUp size={40} className="text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Average Order</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.daily.averageOrderValue)}</p>
                <p className="text-purple-200 text-sm">Per transaction</p>
              </div>
              <ShoppingBag size={40} className="text-purple-200" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by bill number or customer name..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Receipt size={24} />
            Billing History ({pagination.total} total)
          </h2>
        </div>

        {billsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No bills found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Bill Number</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">Items</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-blue-600">{bill.billNumber}</div>
                      <div className="text-sm text-gray-500">
                        {bill.paymentMethod.charAt(0).toUpperCase() + bill.paymentMethod.slice(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {bill.customer && bill.customer.name ? (
                        <div>
                          <div className="font-medium text-gray-900">{bill.customer.name}</div>
                          <div className="text-sm text-gray-500">{bill.customer.type}</div>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">Walk-in Customer</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm">{formatDate(bill.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                        {bill.items.length} items
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-lg text-emerald-600">{formatCurrency(bill.total)}</div>
                      {bill.discount > 0 && (
                        <div className="text-sm text-gray-500">
                          Discount: {formatCurrency(bill.discount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(bill.status)}`}>
                        {getStatusIcon(bill.status)}
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewBill(bill)}
                          title="View"
                          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        {bill.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/billing/edit/${bill._id}`)}
                            title="Edit"
                            className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {bill.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelBill(bill)}
                            title="Cancel"
                            className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => handleViewStockMovements(bill)}
                          title="Stock Movements"
                          className="bg-slate-700 text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Package size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {pagination.current} of {pagination.pages} ({pagination.total} total bills)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={pagination.current === 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={pagination.current === pagination.pages}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bill Receipt Modal */}
      {showReceipt && selectedBill && (
        <BillReceipt
          bill={selectedBill}
          onClose={() => {
            setShowReceipt(false);
            setSelectedBill(null);
          }}
          onPrint={handlePrintBill}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}

      <Modal
        isOpen={!!stockMovementsBill}
        onClose={() => {
          setStockMovementsBill(null);
          setStockMovementsData(null);
          setStockMovementsLoading(false);
        }}
        title={stockMovementsBill ? `Stock Movements - ${stockMovementsBill.billNumber}` : 'Stock Movements'}
      >
        {stockMovementsLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stock movements...</p>
          </div>
        ) : !stockMovementsData ? (
          <div className="text-gray-600">No data.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-700">Stock Added Back</div>
                <div className="text-lg font-bold text-emerald-800">{Number(stockMovementsData.totals?.stockIn || 0)}</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <div className="text-xs text-rose-700">Stock Deducted</div>
                <div className="text-lg font-bold text-rose-800">{Number(stockMovementsData.totals?.stockOut || 0)}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-700">Net</div>
                <div className="text-lg font-bold text-slate-800">{Number(stockMovementsData.totals?.net || 0)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Added Back</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Deducted</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(stockMovementsData.movements || []).map((m) => {
                    const name = m.product?.name || 'Unknown';
                    const model = m.product?.model || '';
                    return (
                      <tr key={String(m.productId)} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{name}</div>
                          {model ? <div className="text-xs text-gray-500">{model}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-emerald-700 font-semibold">{Number(m.stockIn || 0)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-rose-700 font-semibold">{Number(m.stockOut || 0)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-slate-800 font-semibold">{Number(m.net || 0)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillingHistory;
