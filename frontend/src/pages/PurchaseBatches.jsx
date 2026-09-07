import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts, createPurchaseBatch, getPurchaseBatches } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const PurchaseBatches = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [batchNumber, setBatchNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return res.data || [];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['purchase-batches'],
    queryFn: async () => {
      const res = await getPurchaseBatches({ limit: 50 });
      return res.data || [];
    },
  });

  const productsById = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      if (p?._id) map[String(p._id)] = p;
    });
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return (products || []).filter((p) => {
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.model || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
      );
    }).slice(0, 20);
  }, [products, productSearch]);

  const batchTotal = useMemo(() => {
    return (items || []).reduce((sum, it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unitPrice || 0);
      return sum + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);
    }, 0);
  }, [items]);

  const selectedBatchItems = useMemo(() => {
    if (!selectedBatch || !Array.isArray(selectedBatch.items)) return [];
    return selectedBatch.items;
  }, [selectedBatch]);

  const selectedBatchTotals = useMemo(() => {
    const totals = { quantity: 0, amount: 0 };
    selectedBatchItems.forEach((it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unitPrice || 0);
      if (Number.isFinite(qty)) totals.quantity += qty;
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        totals.amount += qty * price;
      }
    });
    return totals;
  }, [selectedBatchItems]);

  const addProductToItems = (product) => {
    if (!product?._id) return;
    setItems((prev) => {
      const existing = prev.find((it) => String(it.productId) === String(product._id));
      if (existing) {
        return prev.map((it) =>
          String(it.productId) === String(product._id)
            ? { ...it, quantity: Number(it.quantity || 0) + 1 }
            : it
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          model: product.model,
          quantity: 1,
          unitPrice: Number(product.originalPrice || 0),
        },
      ];
    });
  };

  const handleCreateBatch = async (e) => {
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

    try {
      await createPurchaseBatch({
        batchNumber: batchNumber.trim() || undefined,
        supplierName: supplierName.trim(),
        purchaseDate,
        notes: notes.trim() || undefined,
        items: cleanItems,
      });

      toast.success('Purchase batch recorded');
      setBatchNumber('');
      setSupplierName('');
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setItems([]);
      setProductSearch('');
      setShowProductSearch(false);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-batches'] }),
      ]);
    } catch (error) {
      console.error('Error creating purchase batch:', error);
      const msg = error.response?.data?.message || 'Failed to create purchase batch';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Batches</h1>
          <p className="text-gray-600 mt-1">Record incoming stock batches with supplier and purchase price.</p>
          <p className="text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded-lg mt-1">
            ⚡ Existing batches are not edited. If you miss a product or need a correction, create a new batch for the
            adjustment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="text-sm px-3 py-1"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? 'Hide form' : 'Add batch'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-visible">
          <CardHeader>
            <CardTitle>New Purchase Batch</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <form onSubmit={handleCreateBatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number (optional)</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g. B-2025-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Any remarks for this batch"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Products to Batch</label>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductSearch(true);
                }}
                placeholder="Search products by name, model, or category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {showProductSearch && productSearch && filteredProducts.length > 0 && (
                <div className="mt-1 max-h-56 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg text-sm z-20">
                  {filteredProducts.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        addProductToItems(p);
                        setProductSearch('');
                        setShowProductSearch(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-600">Model: {p.model} • {p.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((it, idx) => {
                        const product = productsById[String(it.productId)] || {};
                        const qty = Number(it.quantity || 0);
                        const price = Number(it.unitPrice || 0);
                        const lineTotal = qty * price;

                        return (
                          <tr key={`${it.productId}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{product.name || it.name}</div>
                              <div className="text-xs text-gray-600">{product.model || it.model} • {product.category}</div>
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
                                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-right text-sm"
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
                                className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-right text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-gray-800">
                              {lineTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setItems((prev) => prev.filter((_, i) => i !== idx));
                                }}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end text-sm text-gray-800 font-semibold">
                  Total: Rs. {batchTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

              <div className="flex justify-end">
                <Button type="submit" className="flex items-center gap-2">
                  Save Batch
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!batches || batches.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                      No batches recorded yet.
                    </td>
                  </tr>
                )}
                {(batches || []).map((batch) => (
                  <tr
                    key={batch._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedBatch(batch);
                      setIsBatchModalOpen(true);
                    }}
                  >
                    <td className="px-4 py-2 text-xs text-gray-800">
                      {batch.purchaseDate ? new Date(batch.purchaseDate).toLocaleDateString('en-PK') : ''}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-800">{batch.batchNumber || '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-800">{batch.supplierName}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-800">
                      {Array.isArray(batch.items) ? batch.items.length : 0}
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-gray-800">
                      {Number(batch.totalAmount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {batch.notes || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={
          selectedBatch
            ? `Batch Details${selectedBatch.batchNumber ? ` - ${selectedBatch.batchNumber}` : ''}`
            : 'Batch Details'
        }
      >
        {selectedBatch && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="font-medium text-gray-800">Supplier</div>
                <div className="text-gray-700">{selectedBatch.supplierName}</div>
              </div>
              <div>
                <div className="font-medium text-gray-800">Date</div>
                <div className="text-gray-700">
                  {selectedBatch.purchaseDate
                    ? new Date(selectedBatch.purchaseDate).toLocaleDateString('en-PK')
                    : ''}
                </div>
              </div>
              {selectedBatch.notes && (
                <div className="md:col-span-2">
                  <div className="font-medium text-gray-800">Notes</div>
                  <div className="text-gray-700">{selectedBatch.notes}</div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg mt-2">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedBatchItems.map((it, idx) => {
                    const product = productsById[String(it.productId)] || {};
                    const qty = Number(it.quantity || 0);
                    const price = Number(it.unitPrice || 0);
                    const lineTotal = qty * price;

                    return (
                      <tr key={`${it.productId}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{product.name || ''}</div>
                          <div className="text-[11px] text-gray-600">
                            {[product.model, product.category].filter(Boolean).join(' • ')}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{qty}</td>
                        <td className="px-3 py-2 text-right">
                          {price.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {lineTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {selectedBatchItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-gray-500">
                        No items in this batch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-6 text-sm font-semibold text-gray-800 mt-2">
              <div>Total Qty: {selectedBatchTotals.quantity}</div>
              <div>
                Total Amount: Rs.{' '}
                {selectedBatchTotals.amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseBatches;
