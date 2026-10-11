import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Package,
  Truck,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Printer,
  Search,
  RefreshCw,
  Send,
  Calendar,
  Building2,
  Share2,
  Filter,
} from 'lucide-react';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { useToast } from '../context/ToastContext';
import {
  getOnlineOrders,
  getOnlineOrderStats,
  updateOnlineOrderStatus,
  bookOnlineOrderCourier,
  convertOnlineOrderToBill,
} from '../services/api';

const OnlineOrders = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [orderToBook, setOrderToBook] = useState(null);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const [courierForm, setCourierForm] = useState({
    provider: 'Leopards',
    trackingNumber: '',
    weightKg: 0.5,
    pieces: 1,
  });

  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch online orders
  const {
    data: ordersData = { orders: [], statusCounts: {}, pagination: {} },
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['online-orders', selectedStatus, searchQuery],
    queryFn: async () => {
      const res = await getOnlineOrders({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        limit: 50,
      });
      return res.data;
    },
  });

  // Fetch stats
  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['online-order-stats'],
    queryFn: async () => {
      const res = await getOnlineOrderStats();
      return res.data;
    },
  });

  const orders = ordersData.orders || [];
  const statusCounts = ordersData.statusCounts || {};

  // Status updates
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateOnlineOrderStatus(orderId, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['online-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['online-order-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Courier booking submission
  const handleCourierSubmit = async (e) => {
    e.preventDefault();
    if (!orderToBook) return;

    try {
      const res = await bookOnlineOrderCourier(orderToBook._id, courierForm);
      toast.success(`Courier booked! Tracking CN: ${res.data.trackingNumber}`);
      setIsCourierModalOpen(false);
      setOrderToBook(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['online-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['online-order-stats'] }),
      ]);
    } catch (err) {
      console.error('Error booking courier:', err);
      toast.error(err.response?.data?.message || 'Failed to book courier');
    }
  };

  // Convert order to store bill
  const handleConvertToBill = async (orderId) => {
    try {
      const res = await convertOnlineOrderToBill(orderId);
      toast.success(res.data.message || 'Converted to Bill successfully!');
      await queryClient.invalidateQueries({ queryKey: ['online-orders'] });
    } catch (err) {
      console.error('Error converting order to bill:', err);
      toast.error(err.response?.data?.message || 'Failed to convert order to bill');
    }
  };

  // WhatsApp 1-Click order confirmation URL generator
  const getWhatsAppLink = (order) => {
    const rawPhone = String(order.customer.phone || '').replace(/[^0-9]/g, '');
    let formattedPhone = rawPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('92')) {
      formattedPhone = '92' + formattedPhone;
    }

    const itemsText = order.items.map((i) => `• ${i.name} (${i.model || 'Standard'}) x ${i.quantity}`).join('\n');
    const message = `Assalam-o-Alaikum ${order.customer.name},\n\nThank you for your order at *Etimad Mart*!\n\n*Order #:* ${order.orderNumber}\n*Items:*\n${itemsText}\n*Total Bill (COD):* Rs. ${order.total.toLocaleString('en-PK')}\n*Delivery Address:* ${order.customer.address}, ${order.customer.city}\n\nPlease reply with *CONFIRM* to dispatch your parcel. Shukriya!`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const statusPills = [
    { key: 'all', label: 'All Orders', count: statusCounts.all || 0, color: 'bg-slate-700 text-white' },
    { key: 'pending', label: 'Pending', count: statusCounts.pending || 0, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { key: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed || 0, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { key: 'dispatched', label: 'Dispatched', count: statusCounts.dispatched || 0, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { key: 'delivered', label: 'Delivered', count: statusCounts.delivered || 0, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled || 0, color: 'bg-rose-100 text-rose-800 border-rose-300' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">Pending Review</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">Confirmed</span>;
      case 'dispatched':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">Dispatched</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Delivered</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">Cancelled</span>;
      case 'returned':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300">Returned</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-2xl shadow-xl text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-white/20 rounded-xl">
                <Globe size={26} className="text-white" />
              </span>
              <h1 className="text-3xl font-extrabold">Online Store Orders</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span> Live Web Bridge
              </span>
            </div>
            <p className="text-blue-100 text-sm max-w-2xl">
              Real-time incoming orders from <strong className="text-white underline">etimadmart.com</strong> and online customer storefronts. Automatic inventory reservation, 1-click WhatsApp verification, and courier booking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => refetchOrders()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} /> Refresh
            </Button>
            <a
              href="https://etimadmart.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-blue-900 font-bold rounded-lg shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2 text-sm"
            >
              Visit Store <ExternalLink size={15} />
            </a>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-xs">
            <div className="text-xs text-blue-200 font-medium">Total Online Orders</div>
            <div className="text-2xl font-bold mt-1">{stats.totalOrders || 0}</div>
          </div>
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 backdrop-blur-xs">
            <div className="text-xs text-amber-200 font-medium flex items-center gap-1.5">
              <AlertTriangle size={13} /> Needs Confirmation
            </div>
            <div className="text-2xl font-bold mt-1 text-amber-300">{stats.pendingCount || 0}</div>
          </div>
          <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-4 backdrop-blur-xs">
            <div className="text-xs text-purple-200 font-medium flex items-center gap-1.5">
              <Truck size={13} /> Dispatched / In Transit
            </div>
            <div className="text-2xl font-bold mt-1 text-purple-300">{stats.dispatchedCount || 0}</div>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4 backdrop-blur-xs">
            <div className="text-xs text-emerald-200 font-medium flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Delivered
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-300">{stats.deliveredCount || 0}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-xs col-span-2 md:col-span-1">
            <div className="text-xs text-blue-200 font-medium">Online COD Sales</div>
            <div className="text-xl font-bold mt-1 text-white truncate">
              Rs. {Number(stats.totalRevenue || 0).toLocaleString('en-PK')}
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Pills & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {statusPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setSelectedStatus(pill.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  selectedStatus === pill.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                    selectedStatus === pill.key ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-80">
            <SearchBar
              value={searchQuery}
              onChange={(v) => setSearchQuery(v)}
              placeholder="Search by order #, phone, customer, city..."
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
        <CardBody className="p-0">
          {ordersLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Loading online store orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-3">
              <Globe size={48} className="mx-auto text-gray-300" />
              <p className="text-base font-semibold text-gray-700">No online orders found</p>
              <p className="text-xs text-gray-500">
                Incoming orders from your web storefront will automatically appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Order #</th>
                    <th className="px-5 py-3.5">Customer & City</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5 text-right">Total COD</th>
                    <th className="px-5 py-3.5">Courier & Tracking</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-center">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Order Number & Date */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-blue-700 flex items-center gap-1.5">
                          <Package size={15} />
                          {order.orderNumber}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(order.createdAt).toLocaleString('en-PK', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        {order.source && (
                          <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {order.source}
                          </span>
                        )}
                      </td>

                      {/* Customer Name, Phone, Address */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-semibold text-gray-900">{order.customer.name}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} className="text-gray-400" />
                          <span>{order.customer.phone}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate max-w-xs">
                          <MapPin size={12} className="text-rose-500 shrink-0" />
                          <span className="font-medium text-gray-700">{order.customer.city}</span>: {order.customer.address}
                        </div>
                        {order.customerNotes && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 rounded p-1 mt-1.5 border border-amber-200">
                            Note: "{order.customerNotes}"
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-800 flex items-center gap-2">
                              <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}x
                              </span>
                              <span className="font-medium">{item.name}</span>
                              {item.model && <span className="text-gray-400">({item.model})</span>}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total COD */}
                      <td className="px-5 py-4 text-right align-top">
                        <div className="font-bold text-gray-900 text-base">
                          Rs. {Number(order.total || 0).toLocaleString('en-PK')}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Subtotal: Rs. {Number(order.subtotal || 0).toLocaleString('en-PK')}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Delivery: Rs. {Number(order.shippingFee || 0).toLocaleString('en-PK')}
                        </div>
                        <span className="inline-block mt-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {order.paymentMethod}
                        </span>
                      </td>

                      {/* Courier & Tracking */}
                      <td className="px-5 py-4 align-top">
                        {order.courier?.trackingNumber ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              <Truck size={12} /> {order.courier.provider}
                            </span>
                            <div className="font-mono text-xs font-bold text-slate-800">
                              CN: {order.courier.trackingNumber}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs text-gray-400 italic">Not Booked</span>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderToBook(order);
                                  setIsCourierModalOpen(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                              >
                                + Book Courier
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center align-top">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Quick Actions */}
                      <td className="px-5 py-4 text-center align-top">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* 1-Click WhatsApp Confirmation */}
                          <a
                            href={getWhatsAppLink(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-200"
                            title="Verify via WhatsApp"
                          >
                            <Send size={15} />
                          </a>

                          {/* Print Shipping Label */}
                          <button
                            type="button"
                            onClick={() => {
                              setOrderToPrint(order);
                              setIsLabelModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-colors border border-slate-300"
                            title="Print 4x6 / Thermal Label"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Status Actions */}
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                              className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Confirm
                            </button>
                          )}

                          {order.status === 'confirmed' && !order.courier?.trackingNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                setOrderToBook(order);
                                setIsCourierModalOpen(true);
                              }}
                              className="px-2 py-1 text-xs font-semibold rounded bg-purple-600 text-white hover:bg-purple-700"
                            >
                              Dispatch
                            </button>
                          )}

                          {order.status === 'dispatched' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order._id, 'delivered')}
                              className="px-2 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Delivered
                            </button>
                          )}

                          {/* Cancel Option */}
                          {['pending', 'confirmed'].includes(order.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to cancel order #${order.orderNumber}? Stock will be restored to warehouse.`)) {
                                  handleUpdateStatus(order._id, 'cancelled');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                              title="Cancel & Restock"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Courier Booking Modal */}
      <Modal
        isOpen={isCourierModalOpen}
        onClose={() => {
          setIsCourierModalOpen(false);
          setOrderToBook(null);
        }}
        title={`Book Courier Dispatch — ${orderToBook?.orderNumber}`}
        size="md"
      >
        {orderToBook && (
          <form onSubmit={handleCourierSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold text-gray-900">{orderToBook.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Destination City:</span>
                <span className="font-semibold text-blue-700">{orderToBook.customer.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">COD PKR Amount:</span>
                <span className="font-bold text-gray-900">Rs. {orderToBook.total.toLocaleString('en-PK')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Courier Service Provider
              </label>
              <select
                value={courierForm.provider}
                onChange={(e) => setCourierForm({ ...courierForm, provider: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Leopards">Leopards Courier Service (LCS)</option>
                <option value="PostEx">PostEx Courier & COD</option>
                <option value="Trax">Trax Logistics</option>
                <option value="TCS">TCS Express</option>
                <option value="Self">Self Delivery / Rider</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Parcel Weight (Kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={courierForm.weightKg}
                  onChange={(e) => setCourierForm({ ...courierForm, weightKg: Number(e.target.value) })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Pieces / Packets
                </label>
                <input
                  type="number"
                  min="1"
                  value={courierForm.pieces}
                  onChange={(e) => setCourierForm({ ...courierForm, pieces: Number(e.target.value) })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Tracking CN # (Leave empty to auto-generate)
              </label>
              <input
                type="text"
                placeholder="e.g. LEO-948123 or leave blank"
                value={courierForm.trackingNumber}
                onChange={(e) => setCourierForm({ ...courierForm, trackingNumber: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Auto-generates standard courier manifest consignment number if left empty.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" className="flex-1 bg-purple-700 hover:bg-purple-800">
                Confirm Booking & Dispatch
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCourierModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Printable Thermal Shipping Label Modal */}
      <Modal
        isOpen={isLabelModalOpen}
        onClose={() => {
          setIsLabelModalOpen(false);
          setOrderToPrint(null);
        }}
        title="Print Shipping Label / Packing Slip"
        size="md"
      >
        {orderToPrint && (
          <div className="space-y-4">
            {/* Printable Label Container */}
            <div
              id="shipping-label-printable"
              className="border-2 border-dashed border-gray-400 p-6 rounded-xl bg-white text-black font-sans space-y-4 shadow-xs"
            >
              {/* Header */}
              <div className="border-b-2 border-black pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider">ETIMAD MART</h2>
                  <p className="text-xs text-gray-600">Online Storefront Dispatch</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{orderToPrint.courier?.provider || 'LEOPARDS'}</div>
                  <div className="text-xs font-mono">
                    {orderToPrint.courier?.trackingNumber || orderToPrint.orderNumber}
                  </div>
                </div>
              </div>

              {/* COD Box */}
              <div className="p-3 bg-gray-100 border-2 border-black rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">Cash on Delivery (COD)</div>
                  <div className="text-2xl font-black">Rs. {Number(orderToPrint.total || 0).toLocaleString('en-PK')}</div>
                </div>
                <div className="text-right text-xs">
                  <div>Order #: <strong>{orderToPrint.orderNumber}</strong></div>
                  <div>City: <strong className="uppercase">{orderToPrint.customer.city}</strong></div>
                </div>
              </div>

              {/* Recipient / Shipping Details */}
              <div className="border-b border-gray-300 pb-3 text-xs space-y-1">
                <div className="font-bold uppercase text-gray-500 text-[10px]">Deliver To:</div>
                <div className="text-base font-bold text-black">{orderToPrint.customer.name}</div>
                <div className="text-sm font-semibold">{orderToPrint.customer.phone}</div>
                <div className="text-xs text-gray-800 leading-snug">
                  {orderToPrint.customer.address}, {orderToPrint.customer.city}, {orderToPrint.customer.province}
                </div>
              </div>

              {/* Order Items Packing Slip */}
              <div className="text-xs space-y-1 border-b border-gray-300 pb-3">
                <div className="font-bold uppercase text-gray-500 text-[10px]">Order Contents:</div>
                {orderToPrint.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-gray-800">
                    <span>
                      {i.quantity}x {i.name} {i.model ? `(${i.model})` : ''}
                    </span>
                    <span>Rs. {Number(i.totalAmount || 0).toLocaleString('en-PK')}</span>
                  </div>
                ))}
              </div>

              {/* Shipper Return Address */}
              <div className="text-[11px] text-gray-600">
                <div className="font-bold">Shipper / Return Address:</div>
                <div>Etimad Mart, Abdul Wahab Charpai Store, Mohalla Tariq Abad, Zahir Pir, Khanpur</div>
                <div>Helpline / WhatsApp: 0307-1111832</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Shipping Label
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsLabelModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OnlineOrders;

