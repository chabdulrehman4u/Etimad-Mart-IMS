import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = '/api';

const BannersCMS = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    image: '',
    link: '/shop',
    alt: '',
    isActive: true,
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/banner/admin/all`, { withCredentials: true });
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      showToast('Failed to load banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image.trim()) {
      showToast('Image URL is required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/banner/add`, form, { withCredentials: true });
      showToast('Banner created successfully!', 'success');
      setShowAddModal(false);
      setForm({ image: '', link: '/shop', alt: '', isActive: true });
      fetchBanners();
    } catch (err) {
      console.error('Error creating banner:', err);
      showToast(err.response?.data?.message || 'Failed to create banner', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (banner) => {
    try {
      await axios.put(
        `${API_BASE}/banner/${banner._id}`,
        { ...banner, isActive: !banner.isActive },
        { withCredentials: true }
      );
      showToast(`Banner marked as ${!banner.isActive ? 'Active' : 'Inactive'}`, 'success');
      fetchBanners();
    } catch (err) {
      showToast('Failed to update banner status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await axios.delete(`${API_BASE}/banner/${id}`, { withCredentials: true });
      showToast('Banner deleted successfully', 'success');
      fetchBanners();
    } catch (err) {
      showToast('Failed to delete banner', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hero Banners & Sliders</h1>
              <p className="text-sm text-gray-500">
                Manage promotional homepage carousels and store campaign sliders
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBanners}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Banner
          </button>
        </div>
      </div>

      {/* Grid of Banners */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Hero Banners Found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Upload your first hero slider image to display on the storefront homepage.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner, index) => (
            <div
              key={banner._id || index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[16/7] bg-gray-900 overflow-hidden group">
                <img
                  src={banner.image}
                  alt={banner.alt || 'Storefront banner'}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute top-3 left-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${
                      banner.isActive
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-rose-500/90 text-white'
                    }`}
                  >
                    {banner.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {banner.isActive ? 'Active on Store' : 'Inactive'}
                  </span>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                  <a
                    href={banner.image}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg inline-flex"
                    title="View Full Image"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Banner Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Banner #{index + 1}</span>
                    <span>{banner.createdAt ? new Date(banner.createdAt).toLocaleDateString() : 'Active'}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {banner.alt || 'Main Storefront Hero Promotion'}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg truncate">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{banner.link || '/shop'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleToggle(banner)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition border ${
                      banner.isActive
                        ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {banner.isActive ? 'Deactivate' : 'Publish to Store'}
                  </button>

                  <button
                    onClick={() => handleDelete(banner._id)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add New Hero Banner</h2>
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
                  Image URL (Cloudinary or Direct Web Link) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://res.cloudinary.com/.../banner.webp"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended aspect ratio: 1920x600 px or 1366x500 px (WEBP or JPG)
                </p>
              </div>

              {form.image && (
                <div className="rounded-lg overflow-hidden border border-gray-200 h-32 bg-gray-50">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Destination Link
                </label>
                <input
                  type="text"
                  placeholder="/shop or /category/trimmers-and-shavers"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Alt / Title Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mega Summer Sale up to 40% OFF"
                  value={form.alt}
                  onChange={(e) => setForm({ ...form, alt: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Activate banner immediately on the live storefront
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
                  className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannersCMS;

