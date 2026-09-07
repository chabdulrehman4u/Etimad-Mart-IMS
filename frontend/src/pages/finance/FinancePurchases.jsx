import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFinancePurchases,
  createFinancePurchase,
  getProducts,
  getFinanceBanks,
  getFinancePettyCash,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import { useToast } from '../../context/ToastContext';
import {
  Boxes,
  PlusCircle,
  Calendar,
  CreditCard,
  Building2,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';

const FinancePurchases = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // New purchase form state
  const [formData, setFormData] = useState({
    supplierName: '',
    batchNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    paymentStatus: 'paid', // paid, partially_paid, unpaid
    paymentMethod: 'cash', // cash, bank, credit
    paidAmount: '',
    bankAccountId: '',
    dueDate: '',
    items: [{ productId: '', quantity: '', unitPrice: '' }],
  });

  // Queries
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['financePurchases'],
    queryFn: async () => {
      const res = await getFinancePurchases();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: banksData = { accounts: [] } } = useQuery({
    queryKey: ['financeBanks'],
    queryFn: async () => {
      const res = await getFinanceBanks();
      return res.data;
    },
  });

  const { data: pettyCashData = { currentPettyCash: 0 } } = useQuery({
    queryKey: ['financePettyCash'],
    queryFn: async () => {
      const res = await getFinancePettyCash();
      return res.data;
    },
  });

  const accounts = banksData.accounts || [];
  const currentPettyCash = pettyCashData.currentPettyCash || 0;

  // Item helpers
  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '', unitPrice: '' }],
    }));
  };

  const removeItemRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItemRow = (idx, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], [field]: value };
      if (field === 'productId') {
        const prod = products.find((p) => p._id === value);
        if (prod && !nextItems[idx].unitPrice) {
          nextItems[idx].unitPrice = prod.originalPrice || '';
        }
      }
      return { ...prev, items: nextItems };
    });
  };

  // Live total purchase cost calculation
  const calculatedTotal = formData.items.reduce((sum, it) => {
    const q = Number(it.quantity || 0);
    const p = Number(it.unitPrice || 0);
    return sum + q * p;
  }, 0);

  const purchaseMutation = useMutation({
    mutationFn: (payload) => createFinancePurchase(payload),
    onSuccess: () => {
      toast.success('Purchase batch recorded and inventory updated successfully!');
      setIsModalOpen(false);
      setFormData({
        supplierName: '',
        batchNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: '',
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        paidAmount: '',
        bankAccountId: '',
        dueDate: '',
        items: [{ productId: '', quantity: '', unitPrice: '' }],
      });
      queryClient.invalidateQueries({ queryKey: ['financePurchases'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financePayables'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record purchase');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierName.trim()) {
      return toast.error('Supplier name is required');
    }

    const validItems = formData.items.filter(
      (it) => it.productId && Number(it.quantity || 0) > 0 && Number(it.unitPrice || 0) >= 0
    );

    if (validItems.length === 0) {
      return toast.error('Please add at least one product with valid quantity and price');
    }

    const payload = {
      supplierName: formData.supplierName,
      batchNumber: formData.batchNumber || undefined,
      purchaseDate: formData.purchaseDate,
      notes: formData.notes,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
      paymentStatus: formData.paymentStatus,
      paymentMethod: formData.paymentMethod,
      paidAmount:
        formData.paymentStatus === 'paid'
          ? calculatedTotal
          : formData.paymentStatus === 'partially_paid'
          ? Number(formData.paidAmount || 0)
          : 0,
      bankAccountId: formData.paymentMethod === 'bank' ? formData.bankAccountId : undefined,
      dueDate: formData.dueDate || undefined,
    };

    purchaseMutation.mutate(payload);
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const filteredPurchases = purchases.filter(
    (p) =>
      p.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      p.batchNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Stock Purchases & Supplier Intake
          </span>
          <h2 className="text-2xl font-black text-slate-800 mt-0.5">
            {formatCur(purchases.reduce((s, p) => s + Number(p.totalAmount || 0), 0))}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {purchases.length} recorded purchase batches with integrated stock increment
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-900"
        >
          <PlusCircle className="w-4 h-4" />
          Record New Purchase
        </Button>
      </div>

      {/* Accounting Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Purchasing stock does <strong>not</strong> count as an operating expense. Cash/bank is converted to inventory asset.
          If purchased on credit (unpaid/partial), an <strong>Accounts Payable</strong> liability is automatically created for the supplier.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search supplier or batch #..." />
          <span className="text-xs text-slate-500">
            Showing {filteredPurchases.length} batches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Batch / Date</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Items Included</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Cost</th>
                <th className="px-4 py-3 text-right">Paid / Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400">
                    No purchase batches recorded.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((batch) => (
                  <tr key={batch._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{batch.batchNumber || '-'}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(batch.purchaseDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{batch.supplierName}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600 font-medium">
                        {batch.items?.length || 0} product(s)
                      </span>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {batch.items?.map((it) => it.productId?.name || 'Item').join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3 uppercase text-[10px] font-semibold text-slate-600">
                      {batch.paymentMethod || 'cash'}
                      {batch.bankAccountId?.bankName && ` (${batch.bankAccountId.bankName})`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          batch.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : batch.paymentStatus === 'partially_paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {batch.paymentStatus === 'paid'
                          ? 'PAID'
                          : batch.paymentStatus === 'partially_paid'
                          ? 'PARTIAL'
                          : 'CREDIT (UNPAID)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                      {formatCur(batch.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-emerald-700 font-semibold">{formatCur(batch.paidAmount)}</p>
                      {batch.remainingAmount > 0 && (
                        <p className="text-rose-600 text-[10px] font-medium">
                          Due: {formatCur(batch.remainingAmount)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Purchase Batch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="e.g. Al-Madina Wholesale Importers"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Batch / Invoice #
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="Optional supplier bill/batch #"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional purchase details"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Products Repeater */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase">
                Stock Items to Add ({formData.items.length})
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Item
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-slate-800 focus:outline-none"
                      required
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} {p.model ? `(${p.model})` : ''} - Curr Stock: {p.stock || 0}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-right focus:ring-2 focus:ring-slate-800 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Unit Cost Rs."
                      value={item.unitPrice}
                      onChange={(e) => updateItemRow(idx, 'unitPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-right focus:ring-2 focus:ring-slate-800 focus:outline-none"
                      required
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Terms Section */}
          <div className="bg-slate-100 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-800 pb-2 border-b border-slate-200">
              <span>Total Batch Amount:</span>
              <span className="text-lg text-slate-900">{formatCur(calculatedTotal)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Status *
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                >
                  <option value="paid">Paid in Full (Upfront)</option>
                  <option value="partially_paid">Partially Paid (Advance)</option>
                  <option value="unpaid">Unpaid / 100% Credit (Supplier Udhaar)</option>
                </select>
              </div>

              {formData.paymentStatus !== 'unpaid' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                  >
                    <option value="cash">Petty Cash Drawer (Avail: {formatCur(currentPettyCash)})</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
              )}

              {formData.paymentStatus !== 'unpaid' && formData.paymentMethod === 'bank' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Bank Account *
                  </label>
                  <select
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    required
                  >
                    <option value="">Choose Bank...</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.bankName} - {a.accountTitle} ({formatCur(a.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.paymentStatus === 'partially_paid' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Paid Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={calculatedTotal}
                    step="any"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    placeholder="Enter upfront payment"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    required
                  />
                </div>
              )}

              {formData.paymentStatus !== 'paid' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Due Date (For Supplier Udhaar)
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={purchaseMutation.isPending}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              {purchaseMutation.isPending ? 'Processing...' : 'Confirm & Intake Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinancePurchases;

