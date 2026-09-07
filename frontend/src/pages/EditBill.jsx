import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBill, getProducts, getCustomers, updateBill, getCustomerLastProductPrice } from '../services/api';
import Button from '../components/Button';
import { AlertTriangle, ArrowLeft, Save, ShoppingCart } from 'lucide-react';
import SearchBar from '../components/SearchBar';

const EditBill = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [billItems, setBillItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [previousRemainingForBill, setPreviousRemainingForBill] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newLineQuantity, setNewLineQuantity] = useState(1);
  const [newLineUnitPrice, setNewLineUnitPrice] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [lastPriceInfo, setLastPriceInfo] = useState(null);

  const { data: billData, isLoading: billLoading, error: billError } = useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      const response = await getBill(id);
      return response.data;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await getProducts();
      return response.data || [];
    }
  });

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) || null,
    [products, selectedProductId]
  );

  // Load last price this customer paid for the selected product (if any),
  // mirroring the behavior from the main Billing page
  useEffect(() => {
    setLastPriceInfo(null);

    if (!selectedCustomer || !selectedProduct) return;

    const customerId = selectedCustomer.id || selectedCustomer._id;
    if (!customerId) return;

    let cancelled = false;
    const fetchLastPrice = async () => {
      try {
        const response = await getCustomerLastProductPrice(customerId, selectedProduct._id);
        const data = response.data;
        if (!cancelled && data?.found) {
          setLastPriceInfo({ unitPrice: Number(data.unitPrice || 0), date: data.date });
        }
      } catch (err) {
        console.error('Error fetching last price for customer/product (edit bill):', err);
      }
    };

    fetchLastPrice();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomer, selectedProduct]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase();
    if (!query) return products.slice(0, 15);
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.model?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      )
      .slice(0, 15);
  }, [products, productSearch]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await getCustomers();
      return response.data || [];
    }
  });

  useEffect(() => {
    if (billData) {
      setBillItems(
        billData.items.map((item) => ({
          productId: item.productId?._id || item.productId,
          name: item.name,
          model: item.model,
          category: item.category,
          selectedPrice: Number(item.selectedPrice || item.unitPrice || 0),
          quantity: Number(item.quantity || 0),
          stock: Number(item.productId?.stock || 0)
        }))
      );

      setSelectedCustomer(billData.customer || null);
      setAmountPaid(Number(billData.amountPaid || 0));
      setNotes(billData.notes || '');

      const totalNum = Number(billData.total || 0);
      const paidNum = Number(billData.amountPaid || 0);
      const remainingNum = Number(billData.remainingAmount || 0);
      const prevRemaining = remainingNum - totalNum + paidNum;
      setPreviousRemainingForBill(prevRemaining);
    }
  }, [billData]);

  const subtotal = useMemo(() => {
    return billItems.reduce((sum, item) => {
      const price = Number(item.selectedPrice || 0);
      const qty = Number(item.quantity || 0);
      return sum + price * qty;
    }, 0);
  }, [billItems]);

  const total = useMemo(() => {
    return Math.max(0, subtotal);
  }, [subtotal]);

  const numericAmountPaid = Number(amountPaid || 0);
  const remainingAmount = Math.max(0, total - numericAmountPaid);

  const handleAddItem = () => {
    const product = products.find((p) => p._id === selectedProductId);
    if (!product) {
      alert('Please select a product to add');
      return;
    }

    const qty = Number(newLineQuantity || 0);
    const price = Number(newLineUnitPrice || 0);

    if (qty <= 0 || price < 0) {
      alert('Please enter a valid quantity and unit price');
      return;
    }

    const existing = billItems.find((item) => item.productId === product._id);

    if (existing) {
      setBillItems((prev) =>
        prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: Number(item.quantity || 0) + qty, selectedPrice: price }
            : item
        )
      );
    } else {
      const newItem = {
        productId: product._id,
        name: product.name || 'Unknown Product',
        model: product.model || 'N/A',
        category: product.category || 'Uncategorized',
        selectedPrice: price,
        quantity: qty,
        stock: Number(product.stock || 0)
      };

      setBillItems((prev) => [...prev, newItem]);
    }

    setSelectedProductId('');
    setNewLineQuantity(1);
    setNewLineUnitPrice('');
  };

  const updateQuantity = (productId, newQuantity) => {
    const qty = Number(newQuantity || 0);
    if (qty <= 0) return;
    setBillItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const updateItemPrice = (productId, newPrice) => {
    const price = Number(newPrice || 0);
    setBillItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, selectedPrice: price } : item
      )
    );
  };

  const removeItem = (productId) => {
    setBillItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSave = async () => {
    if (!billData) return;
    if (billItems.length === 0) {
      alert('Bill must have at least one item');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        customer: selectedCustomer,
        items: billItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          model: item.model,
          category: item.category,
          selectedPriceType: billData.items.find((bi) => (bi.productId?._id || bi.productId) === item.productId)?.selectedPriceType || 'retailPrice',
          selectedPrice: Number(item.selectedPrice),
          quantity: Number(item.quantity)
        })),
        subtotal: Number(subtotal),
        discount: 0,
        discountType: 'percentage',
        total: Number(total),
        amountPaid: numericAmountPaid,
        previousRemaining: Number(previousRemainingForBill || 0),
        remainingAmount,
        paymentMethod: billData.paymentMethod || 'cash',
        notes,
        sellerId: billData.seller?._id || billData.seller // Add sellerId from original bill (handle populated or non-populated)
      };

      await updateBill(id, payload);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['bills'] }),
        queryClient.invalidateQueries({ queryKey: ['billingStats'] })
      ]);

      alert('Bill updated successfully');
      navigate('/billing', { state: { activeTab: 'history' } });
    } catch (error) {
      console.error('Error updating bill:', error);
      const message = error.response?.data?.message || error.message || 'Failed to update bill';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (billLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (billError || !billData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">Failed to load bill for editing.</p>
          <Button onClick={() => navigate('/billing')}>Back to Billing</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          onClick={() => navigate('/billing')}
        >
          <ArrowLeft size={16} />
          Back to Billing
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart size={22} />
          Edit Bill #{billData.billNumber}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
        {/* Top controls: customer, paid, notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={selectedCustomer?.id || selectedCustomer?._id || ''}
              onChange={(e) => {
                const cust = customers.find((c) => c._id === e.target.value);
                if (cust) {
                  setSelectedCustomer({
                    id: cust._id,
                    name: cust.name,
                    type: cust.type,
                    phone: cust.phone,
                    address: cust.address
                  });
                } else {
                  setSelectedCustomer(null);
                }
              }}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (PKR)</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Bill Items</h2>
          {/* Add new item section */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Product</label>
              <div className="relative">
                <SearchBar
                  value={productSearch}
                  onChange={(value) => {
                    setProductSearch(value);
                    setShowProductSearch(true);
                  }}
                  placeholder="Search products by name, model, or category..."
                  onFocus={() => setShowProductSearch(true)}
                />

                {showProductSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                    {filteredProducts.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p._id);
                          setProductSearch(`${p.name} (${p.model})`);
                          setNewLineUnitPrice(p.retailPrice || p.originalPrice || '');
                          setShowProductSearch(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                      >
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-600">Model: {p.model}  b {p.category}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={newLineQuantity}
                onChange={(e) => setNewLineQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (Rs.)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={newLineUnitPrice}
                onChange={(e) => setNewLineUnitPrice(e.target.value)}
              />
            </div>
            <div className="md:col-span-4 mt-2 flex flex-wrap items-center gap-3">
              {selectedProduct ? (
                <>
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <span className="font-medium">Stock:</span>{' '}
                    <span className="font-semibold">{selectedProduct.stock ?? 0}</span>
                  </div>
                  <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <span className="font-medium">Original:</span>{' '}
                    <span>Rs. {selectedProduct.originalPrice ?? 0}</span>
                  </div>
                  <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <span className="font-medium">Wholesale:</span>{' '}
                    <span>Rs. {selectedProduct.wholesalePrice ?? 0}</span>
                  </div>
                  <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <span className="font-medium">Retail:</span>{' '}
                    <span>Rs. {selectedProduct.retailPrice ?? 0}</span>
                  </div>
                  <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <span className="font-medium">Website:</span>{' '}
                    <span>Rs. {selectedProduct.websitePrice ?? 0}</span>
                  </div>
                  {lastPriceInfo ? (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                      <span className="font-medium">Last for this customer:</span>{' '}
                      <span>Rs. {lastPriceInfo.unitPrice}</span>
                      {lastPriceInfo.date && (
                        <span className="ml-2 text-[11px] text-emerald-800/80">
                          ({new Date(lastPriceInfo.date).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  ) : selectedCustomer ? (
                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                      <span className="font-medium">First purchase for this customer</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-xs text-gray-500">
                  Select a product to see stock and price details
                </div>
              )}
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <Button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-sm">
                Add Item
              </Button>
            </div>
          </div>

          {billItems.length === 0 ? (
            <p className="text-sm text-gray-500">No items on this bill.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-center">Unit Price</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billItems.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.model} • {item.category}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          value={item.selectedPrice}
                          onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        Rs. {(Number(item.selectedPrice || 0) * Number(item.quantity || 0)).toLocaleString('en-PK')}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-800"
                          onClick={() => removeItem(item.productId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t pt-4">
          <div className="text-sm text-gray-600">
            <div>Subtotal: <span className="font-semibold">Rs. {subtotal.toLocaleString('en-PK')}</span></div>
            <div>Total: <span className="font-semibold">Rs. {total.toLocaleString('en-PK')}</span></div>
            <div>Remaining: <span className="font-semibold text-red-600">Rs. {remainingAmount.toLocaleString('en-PK')}</span></div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBill;
