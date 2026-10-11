import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Percent,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = '/api';

const CouponsCMS = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    code: '',
    discountType: 'percentage',
    discountAmount: 10,
    minOrderAmount: 1000,
    maxDiscount: 1000,
    expiresAt: '',
    isActive: true,
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/coupon/admin`, { withCredentials: true });
      setCoupons(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      showToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      showToast('Coupon code is required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/coupon/admin`,
        { ...form, code: form.code.trim().toUpperCase() },
        { withCredentials: true }
      );
      showToast('Coupon created successfully!', 'success');
      setShowAddModal(false);
      setForm({
        code: '',
        discountType: 'percentage',
        discountAmount: 10,
        minOrderAmount: 1000,
        maxDiscount: 1000,
        expiresAt: '',
        isActive: true,
      });
      fetchCoupons();
    } catch (err) {
      console.error('Error creating coupon:', err);
      showToast(err.response?.data?.message || 'Failed to create coupon', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (coupon) => {
    try {
      await axios.patch(`${API_BASE}/coupon/admin/${coupon._id}/toggle`, {}, { withCredentials: true });
      showToast(`Coupon ${!coupon.isActive ? 'Activated' : 'Deactivated'}`, 'success');
      fetchCoupons();
    } catch (err) {
      showToast('Failed to toggle coupon', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon code permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/coupon/admin/${id}`, { withCredentials: true });
      showToast('Coupon deleted', 'success');
      fetchCoupons();
    } catch (err) {
      showToast('Failed to delete coupon', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupons & Promo Codes</h1>
            <p className="text-sm text-gray-500">
              Manage promotional discount vouchers and seasonal checkout campaigns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCoupons}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Coupon List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Active Coupons</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Create discount codes like <span className="font-semibold text-emerald-600">ETIMAD10</span> for online shoppers.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Add First Coupon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-700">
                <tr>
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Discount Value</th>
                  <th className="px-6 py-4">Min Order Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md border border-gray-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{coupon.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountAmount}% OFF`
                        : `Rs. ${coupon.discountAmount} FLAT OFF`}
                    </td>
                    <td className="px-6 py-4">
                      {coupon.minOrderAmount ? `Rs. ${coupon.minOrderAmount.toLocaleString()}` : 'No minimum'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          coupon.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {coupon.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {coupon.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggle(coupon)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                          coupon.isActive
                            ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {coupon.isActive ? 'Deactivate' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(coupon._id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Create New Coupon</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ETIMAD10 or EIDMUBARAK"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 font-mono text-sm uppercase border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed PKR (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Discount Amount *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.discountAmount}
                    onChange={(e) => setForm({ ...form, discountAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Min Order PKR
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1000"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCoupon"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveCoupon" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Activate coupon immediately for checkout
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsCMS;

