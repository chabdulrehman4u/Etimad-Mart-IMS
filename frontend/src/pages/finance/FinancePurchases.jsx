import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFinancePurchases,
  createFinancePurchase,
  updateFinancePurchase,
  deleteFinancePurchase,
  getProducts,
  getFinanceBanks,
  getFinancePettyCash,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import SearchableSelect from '../../components/SearchableSelect';
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
  Edit2,
  Plus,
  Truck,
  Package,
} from 'lucide-react';

const FinancePurchases = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [search, setSearch] = useState('');

  // Purchase form state
  const initialFormState = {
    supplierName: '',
    batchNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    courierExpense: '',
    paymentStatus: 'paid', // paid, partially_paid, unpaid
    paymentMethod: 'cash', // cash, bank, credit
    paidAmount: '',
    bankAccountId: '',
    dueDate: '',
    items: [{ productId: '', quantity: '', unitPrice: '' }],
  };

  const [formData, setFormData] = useState(initialFormState);

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

  const accounts = (banksData.accounts || []).filter((a) => a.isActive !== false);
  const currentPettyCash = Number(pettyCashData.currentPettyCash || 0);

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
        const prod = products.find((p) => String(p._id) === String(value));
        if (prod && !nextItems[idx].unitPrice) {
          nextItems[idx].unitPrice = prod.originalPrice || '';
        }
      }
      return { ...prev, items: nextItems };
    });
  };

  // Calculations
  const itemsSubtotal = useMemo(() => {
    return formData.items.reduce((sum, it) => {
      const q = Number(it.quantity || 0);
      const p = Number(it.unitPrice || 0);
      return sum + (q > 0 && p >= 0 ? q * p : 0);
    }, 0);
  }, [formData.items]);

  const totalUnitsCount = useMemo(() => {
    return formData.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  }, [formData.items]);

  const numCourierExpense = Number(formData.courierExpense || 0);
  const courierPerUnit = totalUnitsCount > 0 ? numCourierExpense / totalUnitsCount : 0;
  const calculatedTotal = itemsSubtotal + numCourierExpense;

  const editingBatch = useMemo(() => {
    return editingBatchId ? (purchases || []).find((b) => b._id === editingBatchId) : null;
  }, [editingBatchId, purchases]);

  const oldPaidAmount = useMemo(() => {
    if (!editingBatch) return 0;
    if (editingBatch.paidAmount !== undefined && editingBatch.paidAmount !== null) {
      return Number(editingBatch.paidAmount || 0);
    }
    if (editingBatch.paymentStatus === 'paid') {
      return Number(editingBatch.totalAmount || 0);
    }
    if (editingBatch.paymentStatus === 'partially_paid') {
      return Number(editingBatch.paidAmount || 0);
    }
    return 0;
  }, [editingBatch]);

  const currentPaid = useMemo(() => {
    if (formData.paymentStatus === 'paid') return calculatedTotal;
    if (formData.paymentStatus === 'partially_paid') return Number(formData.paidAmount || 0);
    return 0;
  }, [formData.paymentStatus, calculatedTotal, formData.paidAmount]);

  const paymentDifference = useMemo(() => {
    if (!editingBatchId) return 0;
    return currentPaid - oldPaidAmount;
  }, [editingBatchId, currentPaid, oldPaidAmount]);

  // Selected bank account
  const selectedBank = accounts.find((a) => String(a._id) === String(formData.bankAccountId));

  // Invalidate queries helper
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financePurchases'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-batches'] });
    queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
    queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
    queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
    queryClient.invalidateQueries({ queryKey: ['financePayables'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // Save / Update mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingBatchId) {
        return updateFinancePurchase(editingBatchId, payload);
      }
      return createFinancePurchase(payload);
    },
    onSuccess: () => {
      toast.success(
        editingBatchId
          ? 'Purchase batch updated & balances reconciled successfully!'
          : 'Purchase batch recorded & stock updated successfully!'
      );
      setIsModalOpen(false);
      setEditingBatchId(null);
      setFormData(initialFormState);
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save purchase');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteFinancePurchase(id),
    onSuccess: () => {
      toast.success('Purchase batch deleted, stock reversed, and payments refunded successfully!');
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete purchase');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingBatchId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (batch) => {
    setEditingBatchId(batch._id);
    setFormData({
      supplierName: batch.supplierName || '',
      batchNumber: batch.batchNumber || '',
      purchaseDate: batch.purchaseDate ? batch.purchaseDate.slice(0, 10) : '',
      notes: batch.notes || '',
      courierExpense: batch.courierExpense ?? '',
      paymentStatus: batch.paymentStatus || 'paid',
      paymentMethod: batch.paymentMethod || 'cash',
      paidAmount: batch.paidAmount ?? '',
      bankAccountId: batch.bankAccountId?._id || batch.bankAccountId || '',
      dueDate: batch.dueDate ? batch.dueDate.slice(0, 10) : '',
      items:
        Array.isArray(batch.items) && batch.items.length > 0
          ? batch.items.map((it) => ({
              productId: it.productId?._id || it.productId || '',
              quantity: it.quantity || '',
              unitPrice: it.unitPrice || '',
            }))
          : [{ productId: '', quantity: '', unitPrice: '' }],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (batch) => {
    const paymentSourceLabel =
      batch.paymentMethod === 'bank'
        ? `Bank Account (${batch.bankAccountId?.bankName || 'Bank'})`
        : 'Petty Cash';

    const refundMsg =
      batch.paidAmount > 0
        ? `\n- Rs. ${Number(batch.paidAmount).toLocaleString('en-PK')} will be refunded back to ${paymentSourceLabel}.`
        : '';

    if (
      !window.confirm(
        `Are you sure you want to delete purchase batch "${batch.batchNumber || batch.supplierName}"?\n\n- All added products will have their stock reversed in inventory.${refundMsg}\n- Associated ledger & payable records will be voided.`
      )
    ) {
      return;
    }

    deleteMutation.mutate(batch._id);
  };

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

    const actualPaid =
      formData.paymentStatus === 'paid'
        ? calculatedTotal
        : formData.paymentStatus === 'partially_paid'
        ? Number(formData.paidAmount || 0)
        : 0;

    // Validate balances
    // Validate balances:
    // If new purchase: validate full actualPaid
    if (!editingBatchId && actualPaid > 0) {
      if (formData.paymentMethod === 'cash' && actualPaid > currentPettyCash) {
        return toast.error(
          `Paid amount (Rs. ${actualPaid.toLocaleString('en-PK')}) exceeds available Petty Cash (Rs. ${currentPettyCash.toLocaleString('en-PK')})`
        );
      }
      if (formData.paymentMethod === 'bank') {
        if (!formData.bankAccountId) {
          return toast.error('Please select a bank account');
        }
        if (selectedBank && actualPaid > Number(selectedBank.currentBalance || 0)) {
          return toast.error(
            `Paid amount exceeds ${selectedBank.bankName} balance (Rs. ${Number(selectedBank.currentBalance || 0).toLocaleString('en-PK')})`
          );
        }
      }
    }

    // If editing purchase: validate only additional difference if positive
    if (editingBatchId && paymentDifference > 0) {
      if (formData.paymentMethod === 'cash' && paymentDifference > currentPettyCash) {
        return toast.error(
          `Additional difference (Rs. ${paymentDifference.toLocaleString('en-PK')}) exceeds available Petty Cash (Rs. ${currentPettyCash.toLocaleString('en-PK')})`
        );
      }
      if (formData.paymentMethod === 'bank') {
        if (!formData.bankAccountId) {
          return toast.error('Please select a bank account');
        }
        if (selectedBank && paymentDifference > Number(selectedBank.currentBalance || 0)) {
          return toast.error(
            `Additional difference exceeds ${selectedBank.bankName} balance (Rs. ${Number(selectedBank.currentBalance || 0).toLocaleString('en-PK')})`
          );
        }
      }
    }

    const payload = {
      supplierName: formData.supplierName,
      batchNumber: formData.batchNumber || undefined,
      purchaseDate: formData.purchaseDate,
      notes: formData.notes,
      courierExpense: numCourierExpense,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
      paymentStatus: formData.paymentStatus,
      paymentMethod: formData.paymentMethod,
      paidAmount: actualPaid,
      bankAccountId: formData.paymentMethod === 'bank' ? formData.bankAccountId : undefined,
      dueDate: formData.dueDate || undefined,
    };

    saveMutation.mutate(payload);
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const filteredPurchases = purchases.filter(
    (p) =>
      p.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      p.batchNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.items?.some((it) => it.productId?.name?.toLowerCase().includes(search.toLowerCase()))
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
            {purchases.length} recorded purchase batches with integrated stock increment & landed cost tracking
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
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
          Courier/shipping costs entered are divided equally across all items in the batch to calculate the true landed cost price.
          If purchased on credit, an <strong>Accounts Payable</strong> liability is automatically created for the supplier.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search supplier, batch #, or product name..." />
          <span className="text-xs text-slate-500 font-medium">
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
                <th className="px-4 py-3">Courier Cost</th>
                <th className="px-4 py-3">Payment Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Batch Cost</th>
                <th className="px-4 py-3 text-right">Paid / Remaining</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">
                    No purchase batches found matching your criteria.
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
                      <span className="text-slate-700 font-semibold">
                        {batch.items?.reduce((s, it) => s + Number(it.quantity || 0), 0) || 0} unit(s)
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1">
                        ({batch.items?.length || 0} product types)
                      </span>
                      <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                        {batch.items?.map((it) => it.productId?.name || 'Item').join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {batch.courierExpense > 0 ? (
                        <div>
                          <span className="font-semibold text-amber-700">
                            {formatCur(batch.courierExpense)}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            (Rs. {Number(batch.items?.[0]?.courierExpensePerUnit || 0).toFixed(2)}/unit)
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {batch.paymentMethod === 'bank' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                          <Building2 size={11} />
                          {batch.bankAccountId?.bankName || 'Bank'}
                          {batch.bankAccountId?.accountNumber ? ` (${batch.bankAccountId.accountNumber})` : ''}
                        </span>
                      ) : batch.paymentMethod === 'credit' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[10px]">
                          <CreditCard size={11} />
                          Credit / Udhaar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                          <Wallet size={11} />
                          Petty Cash
                        </span>
                      )}
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
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(batch)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Purchase Batch"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(batch)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete Batch & Revert Stock/Balances"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record / Edit Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBatchId(null);
        }}
        title={editingBatchId ? `Edit Purchase Batch: ${formData.batchNumber || formData.supplierName}` : 'Record New Purchase Batch'}
      >
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
                Notes / Reference
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional purchase notes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Products Repeater with SearchableSelect */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                <Package size={14} className="text-blue-600" />
                Products in this Batch ({formData.items.length})
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Item
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {formData.items.map((item, idx) => {
                const effectiveUnitCost =
                  Number(item.unitPrice || 0) + (totalUnitsCount > 0 ? courierPerUnit : 0);

                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <div className="flex-1 w-full">
                        <SearchableSelect
                          options={products}
                          value={item.productId}
                          onChange={(val) => updateItemRow(idx, 'productId', val)}
                          placeholder="Search product by name, model, barcode..."
                          displayField="name"
                          valueField="_id"
                          searchFields={['name', 'model', 'category', 'barcode']}
                          renderOption={(p) => (
                            <div className="flex justify-between items-center text-xs">
                              <div>
                                <span className="font-semibold">{p.name}</span>
                                {p.model && <span className="text-gray-500 ml-1">({p.model})</span>}
                              </div>
                              <span className="text-slate-500 font-mono text-[11px]">
                                Stock: {p.stock || 0}
                              </span>
                            </div>
                          )}
                          required
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="w-24">
                          <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right focus:ring-2 focus:ring-slate-800 focus:outline-none font-semibold"
                            required
                          />
                        </div>

                        <div className="w-28">
                          <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Cost Rs."
                            value={item.unitPrice}
                            onChange={(e) => updateItemRow(idx, 'unitPrice', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right focus:ring-2 focus:ring-slate-800 focus:outline-none font-semibold"
                            required
                          />
                        </div>

                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition mt-4"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Landed Cost Breakdown per item */}
                    {Number(item.quantity || 0) > 0 && Number(item.unitPrice || 0) > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-100">
                        <span>
                          Subtotal: <strong>Rs. {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('en-PK')}</strong>
                        </span>
                        {courierPerUnit > 0 && (
                          <span className="text-amber-700">
                            + Courier: Rs. {courierPerUnit.toFixed(2)}/u ➡️ <strong>Landed Cost: Rs. {effectiveUnitCost.toFixed(2)}/unit</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Courier / Shipping Expense Allocation */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label className="block text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  <Truck size={15} className="text-amber-700" />
                  Courier / Freight Expense (Rs.)
                </label>
                <p className="text-[11px] text-amber-700">
                  Equally divided on total units ({totalUnitsCount} units) to calculate product landed cost.
                </p>
              </div>
              <div className="w-40">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.courierExpense}
                  onChange={(e) => setFormData({ ...formData, courierExpense: e.target.value })}
                  placeholder="0"
                  className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-sm font-bold text-right bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {totalUnitsCount > 0 && numCourierExpense > 0 && (
              <div className="flex items-center justify-between text-xs text-amber-800 pt-2 border-t border-amber-200/80 font-medium">
                <span>Total Items in Batch: <strong>{totalUnitsCount} units</strong></span>
                <span>
                  Courier Cost per Unit: <strong className="text-amber-900 font-bold">Rs. {courierPerUnit.toFixed(2)} / unit</strong>
                </span>
              </div>
            )}
          </div>

          {/* Payment Terms Section */}
          <div className="bg-slate-100 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-1 pb-2 border-b border-slate-200">
              <div className="space-x-2">
                <span>Items Cost: <strong>{formatCur(itemsSubtotal)}</strong></span>
                {numCourierExpense > 0 && (
                  <span>+ Courier: <strong>{formatCur(numCourierExpense)}</strong></span>
                )}
              </div>
              <div className="text-sm font-bold text-slate-800">
                <span>Total Batch Amount: </span>
                <span className="text-base text-slate-900 font-black">{formatCur(calculatedTotal)}</span>
              </div>
            </div>

            {editingBatchId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-blue-800 font-bold">Original Paid: </span>
                  <span className="font-semibold text-slate-800">Rs. {oldPaidAmount.toLocaleString('en-PK')}</span>
                </div>
                <div>
                  <span className="text-blue-800 font-bold">Adjustment Difference: </span>
                  {paymentDifference > 0 ? (
                    <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      +Rs. {paymentDifference.toLocaleString('en-PK')} (Will deduct difference from {formData.paymentMethod === 'bank' ? 'Bank' : 'Petty Cash'})
                    </span>
                  ) : paymentDifference < 0 ? (
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      -Rs. {Math.abs(paymentDifference).toLocaleString('en-PK')} (Will refund difference to {formData.paymentMethod === 'bank' ? 'Bank' : 'Petty Cash'})
                    </span>
                  ) : (
                    <span className="font-medium text-slate-600">
                      Rs. 0 (No extra payment needed)
                    </span>
                  )}
                </div>
              </div>
            )}

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
                    Deduct Payment From *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none font-medium"
                  >
                    <option value="cash">💵 Petty Cash Drawer (Avail: {formatCur(currentPettyCash)})</option>
                    <option value="bank">🏦 Bank Account</option>
                  </select>
                </div>
              )}

              {formData.paymentStatus !== 'unpaid' && formData.paymentMethod === 'bank' && (
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Bank Account *
                  </label>
                  <select
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Bank Account --</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.bankName} - {a.accountTitle} ({a.accountNumber}) — Bal: {formatCur(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                  {selectedBank && (
                    <p className="text-[11px] text-blue-700 mt-1">
                      Available in {selectedBank.bankName}: <strong>{formatCur(selectedBank.currentBalance)}</strong>
                    </p>
                  )}
                </div>
              )}

              {formData.paymentStatus === 'partially_paid' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Paid Upfront Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={calculatedTotal}
                    step="any"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    placeholder="Enter advance payment"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none font-semibold"
                    required
                  />
                  <p className="text-[11px] text-rose-600 mt-1">
                    Remaining debt to supplier: {formatCur(calculatedTotal - Number(formData.paidAmount || 0))}
                  </p>
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingBatchId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saveMutation.isPending}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              {saveMutation.isPending
                ? 'Processing...'
                : editingBatchId
                ? 'Save Changes & Update Stock'
                : 'Confirm & Intake Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinancePurchases;
