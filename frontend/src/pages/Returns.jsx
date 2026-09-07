import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts, getReturns, createReturn, getLcsParcelByCn } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import SearchableSelect from '../components/SearchableSelect';
import ScanInput from '../components/ScanInput';
import { Package, RefreshCw, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Returns = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    customerName: '',
    trackingId: '',
    notes: ''
  });

  const toast = useToast();
  const queryClient = useQueryClient();

  const handleScanLcsReturn = async (value) => {
    const raw = String(value || '').trim();
    if (!raw) return;

    try {
      const parts = raw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const cn = parts[0] || '';

      if (!cn) {
        toast.error('Invalid scan: CN number is missing');
        return;
      }

      // Set CN on the form immediately
      setFormData((prev) => ({
        ...prev,
        trackingId: cn
      }));

      try {
        const res = await getLcsParcelByCn(cn);
        const parcel = res.data;
        if (!parcel) {
          toast.error('Parcel not found for scanned CN');
          return;
        }

        const consigneeName = parcel.consigneeName || '';
        const parcelCodRaw = parcel.codValue != null ? Number(parcel.codValue) : NaN;
        const codFromParcel = Number.isFinite(parcelCodRaw) && parcelCodRaw > 0 ? parcelCodRaw : undefined;

        setFormData((prev) => ({
          ...prev,
          customerName: prev.customerName || consigneeName || prev.customerName,
          trackingId: cn,
          unitPrice: prev.unitPrice || (codFromParcel !== undefined ? codFromParcel : prev.unitPrice),
          quantity: prev.quantity || prev.quantity || ''
        }));

        toast.success('Return form prefilled from LCS');
      } catch (err) {
        if (err?.response?.status === 404) {
          toast.error('Parcel not found for scanned CN');
        } else {
          console.error('Error looking up LCS parcel by CN:', err);
          toast.error('Failed to lookup LCS parcel');
        }
      }
    } catch (error) {
      console.error('Error processing scanned LCS barcode for return:', error);
      toast.error('Failed to process scanned LCS barcode');
    }
  };

  const {
    data: products = [],
    isLoading: productsLoading
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return res.data || [];
    }
  });

  const {
    data: returns = [],
    isLoading: returnsLoading,
    refetch: refetchReturns
  } = useQuery({
    queryKey: ['returns', { search: searchQuery }],
    queryFn: async () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const res = await getReturns(params);
      return res.data || [];
    }
  });

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        id: p._id,
        name: p.name,
        model: p.model,
        display: `${p.name} (${p.model})`
      })),
    [products]
  );

  const selectedProduct = productOptions.find((p) => p.id === formData.productId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.productId) {
        toast.error('Please select a product');
        return;
      }

      const payload = {
        productId: formData.productId,
        quantity: Number(formData.quantity || 0),
        unitPrice: Number(formData.unitPrice || 0),
        customerName: formData.customerName,
        trackingId: formData.trackingId,
        notes: formData.notes
      };

      if (!payload.quantity || payload.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }

      await createReturn(payload);

      toast.success('Return recorded and stock updated');

      setFormData({
        productId: '',
        quantity: '',
        unitPrice: '',
        customerName: '',
        trackingId: '',
        notes: ''
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] }),
        queryClient.invalidateQueries({ queryKey: ['returns'] })
      ]);
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error(error.response?.data?.message || 'Failed to record return');
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="text-emerald-600" size={20} />
                Returns
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Log returned products and automatically update stock levels
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => refetchReturns()}
                className="shadow-sm flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowForm((prev) => !prev)}
                className="shadow-sm flex items-center gap-2"
              >
                <ArrowUpRight size={16} />
                {showForm ? 'Hide Form' : 'Add Return'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
      {/* Info Box */}
      <div className="flex items-start gap-3 text-sm bg-amber-50 text-gray-600">
        <AlertTriangle size={16} className="text-amber-500 ml-1 my-1" />
        <p className="text-amber-500">
          Every return recorded here automatically increases the stock of the selected product in the
          inventory.
        </p>
      </div>
      </Card>

      {/* New Return Form */}
      {showForm && (
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ArrowUpRight size={18} className="text-emerald-600" />
              Add New Return
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
            <ScanInput
              label="LCS Scan (optional)"
              placeholder="Scan LCS barcode (CN, city code, COD) for this return"
              helperText="Scan KP/CN to auto-fill tracking and customer details, then select product and submit."
              onScan={handleScanLcsReturn}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <SearchableSelect
                  options={productOptions}
                  value={formData.productId}
                  onChange={(value) => {
                    const selected = productOptions.find((p) => p.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      productId: value,
                      unitPrice: prev.unitPrice || selected?.unitPrice || ''
                    }));
                  }}
                  placeholder={productsLoading ? 'Loading products...' : 'Search and select a product'}
                  displayField="display"
                  valueField="id"
                  searchFields={['name', 'model']}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customerName: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Who returned this product?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID</label>
                <input
                  type="text"
                  required
                  value={formData.trackingId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trackingId: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter return tracking or reference ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g. 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (PKR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unitPrice: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={selectedProduct ? 'Optional (for record)' : 'Optional (for record)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Reason, condition, etc."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="px-6">
                Record Return
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      )}

      {/* Returns List */}
      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-lg font-semibold text-gray-800">Recent Returns</CardTitle>
          <div className="w-full md:w-72">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by tracking ID..."
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {returnsLoading ? (
            <div className="py-12 text-center text-gray-500">Loading returns...</div>
          ) : returns.length === 0 ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Package size={24} className="text-gray-400" />
              </div>
              <p>No returns logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Tracking ID</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                  {returns.map((ret) => (
                    <tr key={ret._id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {formatDate(ret.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {ret.product?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ret.product?.model || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ret.customerName || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ret.trackingId}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {ret.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {ret.unitPrice != null ? `Rs. ${ret.unitPrice.toLocaleString('en-PK')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={ret.notes}>
                        {ret.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

    </div>
  );
};

export default Returns;
