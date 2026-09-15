import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  createPurchaseBatch,
  updatePurchaseBatch,
  deletePurchaseBatch,
  getPurchaseBatches,
  getFinanceBanks,
  getFinancePettyCash,
} from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../context/ToastContext';
import {
  PlusCircle,
  Calendar,
  CreditCard,
  Building2,
  Wallet,
  AlertCircle,
  Trash2,
  Edit2,
  Eye,
  Truck,
  Package,
} from 'lucide-react';

const PurchaseBatches = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [courierExpense, setCourierExpense] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid'); // 'paid', 'partially_paid', 'unpaid'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'bank', 'credit'
  const [paidAmount, setPaidAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // 1. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return res.data || [];
    },
  });

  // 2. Fetch Batches
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['purchase-batches'],
    queryFn: async () => {
      const res = await getPurchaseBatches({ limit: 100 });
      return res.data || [];
    },
  });

  // 3. Fetch Banks & Petty Cash for payment deduction
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

  const activeBanks = (banksData.accounts || []).filter((a) => a.isActive !== false);
  const currentPettyCash = Number(pettyCashData.currentPettyCash || 0);

  const selectedBank = activeBanks.find((a) => String(a._id) === String(bankAccountId));

  const productsById = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      if (p?._id) map[String(p._id)] = p;
    });
    return map;
  }, [products]);

  // Calculations
  const itemsTotal = useMemo(() => {
    return (items || []).reduce((sum, it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unitPrice || 0);
      return sum + (qty > 0 && price >= 0 ? qty * price : 0);
    }, 0);
  }, [items]);

  const totalUnits = useMemo(() => {
    return (items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  }, [items]);

  const numCourier = Number(courierExpense || 0);
  const courierPerUnit = totalUnits > 0 ? numCourier / totalUnits : 0;
  const batchTotal = itemsTotal + numCourier;

  const editingBatch = useMemo(() => {
    return editingBatchId ? (batches || []).find((b) => b._id === editingBatchId) : null;
  }, [editingBatchId, batches]);

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
    if (paymentStatus === 'paid') return batchTotal;
    if (paymentStatus === 'partially_paid') return Number(paidAmount || 0);
    return 0;
  }, [paymentStatus, batchTotal, paidAmount]);

  const paymentDifference = useMemo(() => {
    if (!editingBatchId) return 0;
    return currentPaid - oldPaidAmount;
  }, [editingBatchId, currentPaid, oldPaidAmount]);

  const addProductToItems = (productId) => {
    if (!productId) return;
    const prod = productsById[String(productId)];
    if (!prod) return;

    setItems((prev) => {
      const existing = prev.find((it) => String(it.productId) === String(prod._id));
      if (existing) {
        return prev.map((it) =>
          String(it.productId) === String(prod._id)
            ? { ...it, quantity: Number(it.quantity || 0) + 1 }
            : it
        );
      }
      return [
        ...prev,
        {
          productId: prod._id,
          name: prod.name,
          model: prod.model,
          quantity: 1,
          unitPrice: Number(prod.originalPrice || 0),
        },
      ];
    });

    setSelectedProductToAdd('');
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-batches'] });
    queryClient.invalidateQueries({ queryKey: ['financePurchases'] });
    queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
    queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
    queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
    queryClient.invalidateQueries({ queryKey: ['financePayables'] });
  };

  const resetForm = () => {
    setEditingBatchId(null);
    setBatchNumber('');
    setSupplierName('');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setCourierExpense('');
    setPaymentStatus('paid');
    setPaymentMethod('cash');
    setPaidAmount('');
    setBankAccountId('');
    setDueDate('');
    setItems([]);
    setSelectedProductToAdd('');
    setShowForm(false);
  };

  const handleEditBatch = (batch) => {
    setEditingBatchId(batch._id);
    setBatchNumber(batch.batchNumber || '');
    setSupplierName(batch.supplierName || '');
    setPurchaseDate(batch.purchaseDate ? batch.purchaseDate.slice(0, 10) : '');
    setNotes(batch.notes || '');
    setCourierExpense(batch.courierExpense ?? '');
    setPaymentStatus(batch.paymentStatus || 'paid');
    setPaymentMethod(batch.paymentMethod || 'cash');
    setPaidAmount(batch.paidAmount ?? '');
    setBankAccountId(batch.bankAccountId?._id || batch.bankAccountId || '');
    setDueDate(batch.dueDate ? batch.dueDate.slice(0, 10) : '');

    const loadedItems = (batch.items || []).map((it) => {
      const prod = productsById[String(it.productId?._id || it.productId)] || {};
      return {
        productId: it.productId?._id || it.productId,
        name: prod.name || it.productId?.name || 'Product',
        model: prod.model || it.productId?.model || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
      };
    });

    setItems(loadedItems);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBatch = async (batch) => {
    const paymentSourceLabel =
      batch.paymentMethod === 'bank'
        ? `Bank Account (${batch.bankAccountId?.bankName || 'Bank'})`
        : 'Petty Cash';

    const refundMsg =
      batch.paidAmount > 0
        ? `\n- Rs. ${Number(batch.paidAmount).toLocaleString('en-PK')} will be refunded to ${paymentSourceLabel}.`
        : '';

    if (
      !window.confirm(
        `Are you sure you want to delete purchase batch "${batch.batchNumber || batch.supplierName}"?\n\n- All added products will have their stock deducted back.${refundMsg}\n- Associated ledger & payable records will be voided.`
      )
    ) {
      return;
    }

    try {
      await deletePurchaseBatch(batch._id);
      toast.success('Purchase batch deleted, stock reversed, and payments refunded successfully!');
      invalidateAll();
    } catch (err) {
      console.error('Error deleting batch:', err);
      toast.error(err.response?.data?.message || 'Failed to delete purchase batch');
    }
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();

    if (!supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    const cleanItems = (items || [])
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity || 0),
        unitPrice: Number(it.unitPrice || 0),
      }))
      .filter((it) => it.productId && it.quantity > 0 && it.unitPrice >= 0);

    if (cleanItems.length === 0) {
      toast.error('Add at least one product to the batch');
      return;
    }

    const actualPaid =
      paymentStatus === 'paid'
        ? batchTotal
        : paymentStatus === 'partially_paid'
        ? Number(paidAmount || 0)
        : 0;

    // Balance checks on creation
    // Balance checks:
    // If new batch: check full actualPaid
    if (!editingBatchId && actualPaid > 0) {
      if (paymentMethod === 'cash' && actualPaid > currentPettyCash) {
        toast.error(
          `Paid amount (Rs. ${actualPaid.toLocaleString('en-PK')}) exceeds available Petty Cash (Rs. ${currentPettyCash.toLocaleString('en-PK')})`
        );
        return;
      }
      if (paymentMethod === 'bank') {
        if (!bankAccountId) {
          toast.error('Please select a bank account');
          return;
        }
        if (selectedBank && actualPaid > Number(selectedBank.currentBalance || 0)) {
          toast.error(
            `Paid amount exceeds ${selectedBank.bankName} balance (Rs. ${Number(selectedBank.currentBalance || 0).toLocaleString('en-PK')})`
          );
          return;
        }
      }
    }

    // If editing batch: only check if the extra difference exceeds available balance
    if (editingBatchId && paymentDifference > 0) {
      if (paymentMethod === 'cash' && paymentDifference > currentPettyCash) {
        toast.error(
          `Additional difference (Rs. ${paymentDifference.toLocaleString('en-PK')}) exceeds available Petty Cash (Rs. ${currentPettyCash.toLocaleString('en-PK')})`
        );
        return;
      }
      if (paymentMethod === 'bank') {
        if (!bankAccountId) {
          toast.error('Please select a bank account');
          return;
        }
        if (selectedBank && paymentDifference > Number(selectedBank.currentBalance || 0)) {
          toast.error(
            `Additional difference exceeds ${selectedBank.bankName} balance (Rs. ${Number(selectedBank.currentBalance || 0).toLocaleString('en-PK')})`
          );
          return;
        }
      }
    }

    const payload = {
      batchNumber: batchNumber.trim() || undefined,
      supplierName: supplierName.trim(),
      purchaseDate,
      notes: notes.trim() || undefined,
      courierExpense: numCourier,
      items: cleanItems,
      paymentStatus,
      paymentMethod,
      paidAmount: actualPaid,
      bankAccountId: paymentMethod === 'bank' ? bankAccountId : undefined,
      dueDate: dueDate || undefined,
    };

    try {
      if (editingBatchId) {
        await updatePurchaseBatch(editingBatchId, payload);
        toast.success('Purchase batch updated & stock reconciled successfully!');
      } else {
        await createPurchaseBatch(payload);
        toast.success('Purchase batch recorded & stock updated successfully!');
      }

      resetForm();
      invalidateAll();
    } catch (error) {
      console.error('Error saving purchase batch:', error);
      const msg = error.response?.data?.message || 'Failed to save purchase batch';
      toast.error(msg);
    }
  };

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.toLowerCase();
    return batches.filter(
      (b) =>
        b.supplierName?.toLowerCase().includes(q) ||
        b.batchNumber?.toLowerCase().includes(q) ||
        b.items?.some((it) => it.productId?.name?.toLowerCase().includes(q))
    );
  }, [batches, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Batches</h1>
          <p className="text-gray-600 mt-1">
            Record, edit, and track supplier purchase batches with automated stock, courier landed cost, and payment deductions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="text-sm px-4 py-2 flex items-center gap-2"
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
          >
            <PlusCircle size={16} />
            {showForm ? 'Cancel / Close' : 'Add New Batch'}
          </Button>
        </div>
      </div>

      {/* Add / Edit Form Card */}
      {showForm && (
        <Card className="shadow-lg border border-slate-200 bg-white rounded-2xl overflow-visible">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Package size={20} className="text-blue-600" />
                {editingBatchId ? `Edit Purchase Batch: ${batchNumber || supplierName}` : 'New Purchase Batch'}
              </CardTitle>
              {editingBatchId && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                  Editing Mode
                </span>
              )}
            </div>
          </CardHeader>

          <CardBody className="space-y-5">
            <form onSubmit={handleSaveBatch} className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Batch # (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g. B-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              {/* Searchable Product Selector */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Package size={15} className="text-blue-600" />
                  Search & Add Products to Batch
                </label>
                <div className="max-w-2xl">
                  <SearchableSelect
                    options={products}
                    value={selectedProductToAdd}
                    onChange={(val) => {
                      if (val) addProductToItems(val);
                    }}
                    placeholder="Type product name, model, barcode to add..."
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
                          Stock: {p.stock || 0} • Cost: Rs. {p.originalPrice || 0}
                        </span>
                      </div>
                    )}
                  />
                </div>

                {/* Items Table */}
                {items.length > 0 ? (
                  <div className="space-y-3 mt-3">
                    <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100/70 border-b text-slate-600 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-3 py-2.5 text-left">Product</th>
                            <th className="px-3 py-2.5 text-right w-28">Quantity</th>
                            <th className="px-3 py-2.5 text-right w-32">Unit Cost (Rs.)</th>
                            <th className="px-3 py-2.5 text-right w-36">Effective Landed Cost</th>
                            <th className="px-3 py-2.5 text-right w-32">Line Total</th>
                            <th className="px-3 py-2.5 text-center w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((it, idx) => {
                            const product = productsById[String(it.productId)] || {};
                            const qty = Number(it.quantity || 0);
                            const price = Number(it.unitPrice || 0);
                            const effectiveCost = price + (totalUnits > 0 ? courierPerUnit : 0);
                            const lineTotal = qty * price;

                            return (
                              <tr key={`${it.productId}-${idx}`} className="hover:bg-slate-50/80 transition">
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-gray-900">{product.name || it.name}</div>
                                  <div className="text-[11px] text-gray-500">
                                    {[product.model || it.model, product.category].filter(Boolean).join(' • ')}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(e) => {
                                      const v = Math.max(1, Number(e.target.value || 1));
                                      setItems((prev) =>
                                        prev.map((row, i) => (i === idx ? { ...row, quantity: v } : row))
                                      );
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-right text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => {
                                      const v = Math.max(0, Number(e.target.value || 0));
                                      setItems((prev) =>
                                        prev.map((row, i) => (i === idx ? { ...row, unitPrice: v } : row))
                                      );
                                    }}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-right text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className="font-bold text-slate-800 text-xs">
                                    Rs. {effectiveCost.toFixed(2)}
                                  </span>
                                  {courierPerUnit > 0 && (
                                    <p className="text-[10px] text-amber-700 font-medium">
                                      (+ Rs. {courierPerUnit.toFixed(2)} courier)
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                                  Rs. {lineTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                    title="Remove Product"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600 px-1 font-medium">
                      <span>Total Products: <strong>{items.length}</strong> | Total Units: <strong>{totalUnits}</strong></span>
                      <span>Items Subtotal: <strong className="text-sm text-slate-900 font-bold">Rs. {itemsTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-2">
                    No products added to this batch yet. Search a product above to add.
                  </p>
                )}
              </div>

              {/* Courier Expense Allocation Section */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                      <Truck size={15} className="text-amber-700" />
                      Courier / Shipping Expense (Rs.)
                    </label>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Equally divided on total quantity ({totalUnits} units) to calculate product landed cost.
                    </p>
                  </div>
                  <div className="w-40">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={courierExpense}
                      onChange={(e) => setCourierExpense(e.target.value)}
                      placeholder="0"
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold text-right bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {totalUnits > 0 && numCourier > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-800 pt-2 border-t border-amber-200/80 font-medium">
                    <span>Total Units: <strong>{totalUnits} units</strong></span>
                    <span>
                      Courier per Unit: <strong className="text-amber-900 font-bold">Rs. {courierPerUnit.toFixed(2)} / unit</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Terms & Balances */}
              <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-1 pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">
                    Grand Batch Total:
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    Rs. {batchTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                  </span>
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
                          +Rs. {paymentDifference.toLocaleString('en-PK')} (Will deduct difference from {paymentMethod === 'bank' ? 'Bank' : 'Petty Cash'})
                        </span>
                      ) : paymentDifference < 0 ? (
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          -Rs. {Math.abs(paymentDifference).toLocaleString('en-PK')} (Will refund difference to {paymentMethod === 'bank' ? 'Bank' : 'Petty Cash'})
                        </span>
                      ) : (
                        <span className="font-medium text-slate-600">
                          Rs. 0 (No extra payment needed)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Payment Status *
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="paid">Paid in Full (Upfront)</option>
                      <option value="partially_paid">Partially Paid (Advance)</option>
                      <option value="unpaid">Unpaid / 100% Credit (Supplier Udhaar)</option>
                    </select>
                  </div>

                  {paymentStatus !== 'unpaid' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Deduct Payment From *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none font-medium"
                      >
                        <option value="cash">💵 Petty Cash Drawer (Avail: Rs. {currentPettyCash.toLocaleString('en-PK')})</option>
                        <option value="bank">🏦 Bank Account</option>
                      </select>
                    </div>
                  )}

                  {paymentStatus !== 'unpaid' && paymentMethod === 'bank' && (
                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Select Bank Account *
                      </label>
                      <select
                        value={bankAccountId}
                        onChange={(e) => setBankAccountId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                        required
                      >
                        <option value="">-- Choose Bank Account --</option>
                        {activeBanks.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.bankName} ({a.accountNumber}) — Bal: Rs. {Number(a.currentBalance || 0).toLocaleString('en-PK')}
                          </option>
                        ))}
                      </select>
                      {selectedBank && (
                        <p className="text-[11px] text-blue-700 mt-1">
                          Available: <strong>Rs. {Number(selectedBank.currentBalance || 0).toLocaleString('en-PK')}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {paymentStatus === 'partially_paid' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Paid Upfront Amount (Rs.) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={batchTotal}
                        step="any"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none font-semibold"
                        required
                      />
                      <p className="text-[11px] text-rose-600 mt-1">
                        Remaining payable: Rs. {(batchTotal - Number(paidAmount || 0)).toLocaleString('en-PK')}
                      </p>
                    </div>
                  )}

                  {paymentStatus !== 'paid' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Payment Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="flex items-center gap-2">
                  <PlusCircle size={16} />
                  {editingBatchId ? 'Save Changes & Update Stock' : 'Save Batch & Intake Stock'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Batches Table Card */}
      <Card className="shadow-lg border border-slate-200 bg-white rounded-2xl overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Recent Purchase Batches</CardTitle>
            <div className="w-full sm:w-72">
              <SearchBar value={search} onChange={setSearch} placeholder="Search supplier or batch #..." />
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Batch #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Items / Units</th>
                  <th className="px-4 py-3">Courier Cost</th>
                  <th className="px-4 py-3">Payment Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Loading purchase batches...
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No purchase batches found.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => {
                    const totalQty = (batch.items || []).reduce(
                      (sum, it) => sum + Number(it.quantity || 0),
                      0
                    );

                    return (
                      <tr key={batch._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {batch.purchaseDate
                            ? new Date(batch.purchaseDate).toLocaleDateString('en-PK')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {batch.batchNumber || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {batch.supplierName}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-slate-800">{totalQty} units</span>
                          <span className="text-gray-400 text-[10px] ml-1">
                            ({batch.items?.length || 0} types)
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {batch.courierExpense > 0 ? (
                            <span className="font-semibold text-amber-700">
                              Rs. {Number(batch.courierExpense).toLocaleString('en-PK')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {batch.paymentMethod === 'bank' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                              <Building2 size={11} />
                              {batch.bankAccountId?.bankName || 'Bank'}
                            </span>
                          ) : batch.paymentMethod === 'credit' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[10px]">
                              <CreditCard size={11} />
                              Credit
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
                              : 'CREDIT'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          Rs. {Number(batch.totalAmount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setIsBatchModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditBatch(batch)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit Batch"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(batch)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete Batch & Revert Stock/Balances"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Batch Details Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={
          selectedBatch
            ? `Batch Details: ${selectedBatch.batchNumber || selectedBatch.supplierName}`
            : 'Batch Details'
        }
      >
        {selectedBatch && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[10px]">Supplier</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedBatch.supplierName}</p>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[10px]">Purchase Date</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedBatch.purchaseDate
                    ? new Date(selectedBatch.purchaseDate).toLocaleDateString('en-PK')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[10px]">Courier Expense</span>
                <p className="font-semibold text-amber-800 mt-0.5">
                  Rs. {Number(selectedBatch.courierExpense || 0).toLocaleString('en-PK')}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[10px]">Payment Source</span>
                <p className="font-semibold text-slate-800 mt-0.5 uppercase">
                  {selectedBatch.paymentMethod || 'cash'}
                </p>
              </div>
            </div>

            {selectedBatch.notes && (
              <div className="bg-white p-2 rounded-lg border text-gray-700">
                <span className="font-semibold text-gray-500">Notes: </span>
                {selectedBatch.notes}
              </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/70 border-b uppercase text-[10px] font-bold text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Base Cost</th>
                    <th className="px-3 py-2 text-right">Courier / Unit</th>
                    <th className="px-3 py-2 text-right">Landed Cost</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(selectedBatch.items || []).map((it, idx) => {
                    const product = productsById[String(it.productId?._id || it.productId)] || {};
                    const qty = Number(it.quantity || 0);
                    const price = Number(it.unitPrice || 0);
                    const courierUnit = Number(it.courierExpensePerUnit || 0);
                    const landed = Number(it.effectiveCostPrice || price + courierUnit);
                    const lineTotal = qty * price;

                    return (
                      <tr key={`${it.productId}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-gray-900">{product.name || it.productId?.name || 'Product'}</div>
                          <div className="text-[10px] text-gray-500">
                            {[product.model, product.category].filter(Boolean).join(' • ')}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{qty}</td>
                        <td className="px-3 py-2 text-right">Rs. {price.toLocaleString('en-PK')}</td>
                        <td className="px-3 py-2 text-right text-amber-700">Rs. {courierUnit.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          Rs. {landed.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          Rs. {lineTotal.toLocaleString('en-PK')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-100/80 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900">
              <span>
                Total Units: {selectedBatch.items?.reduce((s, it) => s + Number(it.quantity || 0), 0)}
              </span>
              <span className="text-sm">
                Total Batch Amount: Rs. {Number(selectedBatch.totalAmount || 0).toLocaleString('en-PK')}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseBatches;
