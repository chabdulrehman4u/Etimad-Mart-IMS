import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontTrackOrder = () => {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [identifier, setIdentifier] = useState(initialId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const handleTrack = async (idToSearch) => {
    const term = (idToSearch || identifier).trim();
    if (!term) return;

    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      const res = await axios.get(`/api/storefront/etimadmart/track/${encodeURIComponent(term)}`);
      if (res.data?.success && res.data.order) {
        setOrder(res.data.order);
      } else {
        setError(res.data?.message || 'Order not found. Please check your order number or phone.');
        setOrder(null);
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setError(err.response?.data?.message || 'Order not found. Verify your Order # (e.g. WEB-1001) or phone number.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleTrack(initialId);
    }
  }, [initialId]);

  const getStatusStep = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return 4;
    if (s === 'dispatched' || s === 'in_transit') return 3;
    if (s === 'confirmed') return 2;
    return 1; // pending
  };

  const currentStep = order ? getStatusStep(order.status) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 w-full">
        {/* Title & Search Form */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-10 shadow-2xs text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Truck size={32} />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Track Your Online Order
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Enter your Order Number (e.g. <span className="font-mono font-bold text-blue-600">WEB-1001</span>) or Mobile Number to check real-time courier dispatch status.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTrack();
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="text"
              required
              placeholder="WEB-1001 or 03001234567"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="flex-1 px-4 py-3 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-blue-500/20"
            >
              {loading ? 'Searching...' : 'Track Parcel'}
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Tracking Results */}
        {order && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-10 shadow-md space-y-8 animate-in fade-in">
            {/* Header Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Order Details
                </span>
                <h2 className="text-xl font-black text-gray-900 font-mono">
                  {order.orderNumber}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent'} • Customer: {order.customer?.name}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full capitalize">
                  {order.status || 'Pending Verification'}
                </span>
                <p className="text-sm font-black text-gray-900 mt-1">
                  Rs. {order.totalAmount?.toLocaleString()} (COD)
                </p>
              </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Fulfillment Timeline
              </h3>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-3 rounded-2xl border transition ${currentStep >= 1 ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-gray-50 text-gray-400'}`}>
                  <Package className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <span>Order Placed</span>
                </div>
                <div className={`p-3 rounded-2xl border transition ${currentStep >= 2 ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-gray-50 text-gray-400'}`}>
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <span>Verified</span>
                </div>
                <div className={`p-3 rounded-2xl border transition ${currentStep >= 3 ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-gray-50 text-gray-400'}`}>
                  <Truck className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <span>Dispatched</span>
                </div>
                <div className={`p-3 rounded-2xl border transition ${currentStep >= 4 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-gray-50 text-gray-400'}`}>
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  <span>Delivered</span>
                </div>
              </div>
            </div>

            {/* Courier Tracking Info */}
            {order.courier?.trackingNumber ? (
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-blue-400">Courier Provider</p>
                    <p className="font-bold text-sm">{order.courier.provider || 'Leopards Courier Service'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-blue-400">Consignment Number (CN)</p>
                    <p className="font-mono font-bold text-sm text-emerald-400">{order.courier.trackingNumber}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                ℹ️ Your order is being packed at our central warehouse. Once booked with Leopards/PostEx, your tracking CN number will be automatically updated here and sent via SMS.
              </div>
            )}

            {/* Shipping Address & Item Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 border space-y-1">
                <p className="font-bold text-gray-700">Delivery Destination:</p>
                <p className="text-gray-900">{order.customer?.address}</p>
                <p className="text-gray-500 font-semibold">{order.customer?.city}, {order.customer?.province}</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border space-y-1">
                <p className="font-bold text-gray-700">Package Items:</p>
                <div className="space-y-1 text-gray-600">
                  {order.items?.map((it, idx) => (
                    <p key={idx} className="truncate">
                      • {it.quantity}x {it.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontTrackOrder;
