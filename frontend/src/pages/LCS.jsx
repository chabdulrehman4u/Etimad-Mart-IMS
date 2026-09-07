import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { getLcsParcels, getProducts, syncLcsParcels, updateLcsParcelProducts } from '../services/api';

const toLocalDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  }
  return '';
};

const startOfThisMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const LCS = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const today = useMemo(() => toLocalDateInputValue(new Date()), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateInputValue(d);
  }, []);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [preset, setPreset] = useState('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [activeParcel, setActiveParcel] = useState(null);
  const [draftProducts, setDraftProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const applyPreset = (preset) => {
    if (preset === 'today') {
      const t = toLocalDateInputValue(new Date());
      setFromDate(t);
      setToDate(t);
      return;
    }
    if (preset === 'last7') {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      setFromDate(toLocalDateInputValue(start));
      setToDate(toLocalDateInputValue(end));
      return;
    }
    if (preset === 'thisMonth') {
      setFromDate(toLocalDateInputValue(startOfThisMonth()));
      setToDate(toLocalDateInputValue(new Date()));
    }
  };

  const queryParams = useMemo(() => {
    return {
      from: fromDate || undefined,
      to: toDate || undefined,
    };
  }, [fromDate, toDate]);

  const {
    data: rows = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['lcs-parcels', queryParams],
    queryFn: async () => {
      const res = await getLcsParcels({ ...queryParams, limit: 5000 });
      return res.data || [];
    },
    enabled: Boolean(queryParams.from && queryParams.to),
    keepPreviousData: true,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return res.data || [];
    },
  });

  const openProductModal = (row) => {
    setActiveParcel(row);
    setDraftProducts(Array.isArray(row.products) ? row.products.map((p) => ({
      productId: p.productId || p._id || undefined,
      name: p.name || '',
      quantity: p.quantity || 1,
    })) : []);
    setProductSearch('');
    setSelectedProductId('');
    setSelectedQuantity(1);
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    setActiveParcel(null);
    setDraftProducts([]);
    setProductSearch('');
    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.model.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }, [products, productSearch]);

  const handleAddDraftProduct = () => {
    if (!selectedProductId) return;
    const base = products.find((p) => p._id === selectedProductId);
    if (!base) return;

    const qty = Math.max(1, Number(selectedQuantity || 1) || 1);

    setDraftProducts((prev) => {
      const existingIndex = prev.findIndex((x) => String(x.productId) === String(selectedProductId));
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: (Number(copy[existingIndex].quantity || 0) || 0) + qty,
        };
        return copy;
      }
      return [
        ...prev,
        {
          productId: base._id,
          name: `${base.name} (${base.model})`,
          quantity: qty,
        },
      ];
    });

    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleRemoveDraftProduct = (index) => {
    setDraftProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProducts = async () => {
    if (!activeParcel) return;
    try {
      await updateLcsParcelProducts(activeParcel._id, { products: draftProducts });
      await refetch();
      closeProductModal();
    } catch (error) {
      console.error('Error saving products for LCS parcel:', error);
      window.alert('Failed to save products for this parcel.');
    }
  };

  const { mutateAsync: doSync, isPending: isSyncing } = useMutation({
    mutationFn: async ({ from, to }) => {
      const res = await syncLcsParcels({ from, to });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lcs-parcels'] });
    },
  });

  const handleFetch = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select From and To dates');
      return;
    }
    if (String(fromDate) > String(toDate)) {
      toast.error('From date must be before To date');
      return;
    }

    try {
      const out = await doSync({ from: fromDate, to: toDate });
      await refetch();
      const synced = Number(out?.synced || 0);
      const source = Number(out?.source_rows || 0);
      toast.success(`Synced ${synced} parcels${source ? ` (from ${source} rows)` : ''}`);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to fetch';
      toast.error(msg);
    }
  };

  const statusColor = (status) => {
    const raw = String(status || '').trim();
    if (!raw) return 'bg-gray-100 text-gray-700';

    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    const RETURN_CODES = new Set(['RV', 'RW', 'DR', 'DW', 'DS', 'RS']);
    const CODE_COLORS = {
      DV: 'bg-emerald-100 text-emerald-800',
      DP: 'bg-blue-100 text-blue-800',
      AR: 'bg-indigo-100 text-indigo-800',
      AC: 'bg-cyan-100 text-cyan-800',
      SP: 'bg-sky-100 text-sky-800',
      DC: 'bg-teal-100 text-teal-800',
      RC: 'bg-violet-100 text-violet-800',
      PN: 'bg-amber-100 text-amber-800',
      SS: 'bg-yellow-100 text-yellow-800',
      SN: 'bg-gray-100 text-gray-700',
      LD: 'bg-purple-100 text-purple-800',
      RN: 'bg-orange-100 text-orange-800',
      NR: 'bg-orange-100 text-orange-800',
      RO: 'bg-orange-100 text-orange-800',
      CN: 'bg-red-100 text-red-800',
      CC: 'bg-red-100 text-red-800',
    };

    if (RETURN_CODES.has(upper)) return 'bg-rose-100 text-rose-800';
    if (CODE_COLORS[upper]) return CODE_COLORS[upper];

    if (lower.includes('delivered')) return CODE_COLORS.DV;
    if (lower.includes('dispatched')) return CODE_COLORS.DP;
    if (lower.includes('arrived at station')) return CODE_COLORS.AR;
    if (lower.includes('assign to courier')) return CODE_COLORS.AC;
    if (lower.includes('shipment picked')) return CODE_COLORS.SP;
    if (lower.includes('drop off')) return CODE_COLORS.DC;
    if (lower.includes('consignment booked')) return CODE_COLORS.RC;
    if (lower.includes('missroute')) return CODE_COLORS.LD;
    if (lower.includes('pending')) return CODE_COLORS.PN;
    if (lower.includes('pickup request sent')) return CODE_COLORS.SS;
    if (lower.includes('pickup request not')) return CODE_COLORS.SN;
    if (lower.includes('cancel')) return CODE_COLORS.CN;
    if (lower.includes('auto') && lower.includes('cancel')) return CODE_COLORS.CC;
    if (lower.includes('ready for return')) return CODE_COLORS.RN;
    if (lower.includes('being return')) return CODE_COLORS.RO;
    if (lower.includes('return')) return 'bg-rose-100 text-rose-800';

    return 'bg-slate-100 text-slate-800';
  };

  const statusOptions = useMemo(() => {
    const set = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      const raw = row?.raw || {};
      const s = String(row?.status || raw?.booked_packet_status || raw?.status || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const cityOptions = useMemo(() => {
    const set = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      const raw = row?.raw || {};
      const from = String(row?.originCity || raw?.origin_city || '').trim();
      const to = String(row?.destinationCity || raw?.destination_city || '').trim();
      if (from) set.add(from);
      if (to) set.add(to);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = String(searchText || '').trim().toLowerCase();
    const statusQ = String(statusFilter || '').trim().toLowerCase();
    const cityQ = String(cityFilter || '').trim().toLowerCase();

    const list = Array.isArray(rows) ? rows : [];

    return list.filter((row) => {
      const raw = row?.raw || {};
      const cn = row?.cn || raw.tracking_number || raw.trackingNumber || raw.booked_packet_cn || raw.bookedPacketCn || raw.CN || raw.cn || '';
      const orderId = row?.orderId || raw.booked_packet_order_id || raw.order_id || raw.orderId || '';
      const manualProducts = Array.isArray(row?.products) && row.products.length > 0
        ? row.products.map((p) => `${p.name}${p.quantity && p.quantity !== 1 ? ` x${p.quantity}` : ''}`).join(', ')
        : '';
      const product = manualProducts || row?.productDescription || raw.product_description || raw.productDescription || '';
      const from = row?.originCity || raw.origin_city || '';
      const to = row?.destinationCity || raw.destination_city || '';
      const consignee = row?.consigneeName || raw.consignment_name_eng || raw.consignment_name || raw.consignee_name || '';
      const phone = row?.consigneePhone || raw.consignment_phone || raw.consignee_phone || raw.phone || '';
      const status = row?.status || raw.title || raw.booked_packet_status || raw.status || '';

      if (statusQ && String(status || '').toLowerCase() !== statusQ) return false;
      if (cityQ) {
        const fromL = String(from || '').toLowerCase();
        const toL = String(to || '').toLowerCase();
        if (fromL !== cityQ && toL !== cityQ) return false;
      }

      if (!q) return true;

      const hay = [cn, orderId, product, from, to, consignee, phone, status].map((x) => String(x || '').toLowerCase());
      return hay.some((s) => s.includes(q));
    });
  }, [rows, searchText, statusFilter, cityFilter]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>LCS Parcels Status</span>
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Presets</label>
                <select
                  value={preset}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPreset(next);
                    if (next) applyPreset(next);
                    setPreset('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Select preset</option>
                  <option value="today">Today</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 flex items-end">
              <div className="w-full">
                <Button type="button" onClick={handleFetch} disabled={isSyncing} className="w-full">
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
                {(isLoading || isFetching) ? (
                  <div className="mt-1 text-xs text-gray-500">Loading from DB...</div>
                ) : null}
              </div>
            </div>

            <div className="flex items-end justify-end">
              <div className="text-sm text-gray-600">
                Showing: <span className="font-semibold text-gray-900">{filteredRows.length}</span> / {rows.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="CN, Order ID, Phone, Consignee, City, Status"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Parcels</span>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto max-h-[80vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                  {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th> */}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">COD</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Consignee</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-4 sticky text-left right-0 py-2  bg-white text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-gray-500 text-sm">Loading...</td>
                  </tr>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const raw = row?.raw || {};

                    const bookingDate = toLocalDateInputValue(row?.bookingDate) || pick(raw, ['booking_date', 'bookingDate', 'booked_packet_date', 'bookedPacketDate']);
                    const cn = row?.cn || pick(raw, ['tracking_number', 'trackingNumber', 'booked_packet_cn', 'bookedPacketCn', 'CN', 'cn', 'cn_no', 'cn_number']);
                    const orderId = row?.orderId || pick(raw, ['booked_packet_order_id', 'order_id', 'orderId']);
                    const manualProducts = Array.isArray(row?.products) && row.products.length > 0
                      ? row.products.map((p) => `${p.name}${p.quantity && p.quantity !== 1 ? ` x${p.quantity}` : ''}`).join(', ')
                      : '';
                    const product = manualProducts || row?.productDescription || pick(raw, ['product_description', 'productDescription']);
                    const from = row?.originCity || pick(raw, ['origin_city', 'originCity']);
                    const to = row?.destinationCity || pick(raw, ['destination_city', 'destinationCity']);
                    const consignee = row?.consigneeName || pick(raw, ['consignment_name_eng', 'consignment_name', 'consignee_name', 'consigneeName']);
                    const phone = row?.consigneePhone || pick(raw, ['consignment_phone', 'consignee_phone', 'phone', 'phoneNumber']);
                    const status = row?.status || pick(raw, ['title', 'booked_packet_status', 'status']);
                    const cod = row?.codValue ?? pick(raw, ['cod_value', 'booked_packet_collect_amount', 'codValue']);

                    return (
                      <tr key={String(cn || '') + String(orderId || '')} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{bookingDate}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap font-medium">{cn}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{orderId}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{product}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{cod != null && String(cod) !== '' ? Number(cod || 0).toLocaleString('en-PK') : ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{to}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{consignee}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{phone}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusColor(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{from}</td>
                        <td className="px-4 py-2 text-sm text-left whitespace-nowrap sticky right-0 bg-white">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openProductModal(row)}
                          >
                            Add / Edit Products
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-gray-500 text-sm">No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Product mapping modal */}
      <Modal isOpen={productModalOpen} onClose={closeProductModal} title="Assign Products to Parcel">
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            {activeParcel && (
              <>
                <div><span className="font-semibold">CN:</span> {activeParcel.cn}</div>
                <div><span className="font-semibold">Order ID:</span> {activeParcel.orderId}</div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Search Product</label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Search by name, model, or category..."
            />
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg mt-1">
              {filteredProducts.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No products found.</div>
              ) : (
                filteredProducts.slice(0, 50).map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedProductId(p._id)}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50 ${selectedProductId === p._id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-600">Model: {p.model} • {p.category}</div>
                    <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Selected Product</label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 min-h-[40px] flex items-center">
                {selectedProductId
                  ? (() => {
                    const p = products.find((x) => x._id === selectedProductId);
                    return p ? `${p.name} (${p.model})` : 'Unknown product';
                  })()
                  : 'None selected'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <Button type="button" onClick={handleAddDraftProduct} disabled={!selectedProductId}>
                Add to List
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Assigned Products</span>
              {draftProducts.length > 0 && (
                <span className="text-xs text-gray-500">Total lines: {draftProducts.length}</span>
              )}
            </div>
            {draftProducts.length === 0 ? (
              <div className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500">
                No products assigned yet. Use the search above to add products.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                {draftProducts.map((p, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-600">Qty: {p.quantity}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftProduct(index)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={closeProductModal}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveProducts} disabled={!activeParcel}>
              Save Products
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LCS;
