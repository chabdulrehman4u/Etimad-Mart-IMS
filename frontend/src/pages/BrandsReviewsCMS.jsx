import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Award,
  Star,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = '/api';

const BrandsReviewsCMS = () => {
  const [activeTab, setActiveTab] = useState('brands'); // 'brands' | 'reviews'
  const [brands, setBrands] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', logo: '', slug: '' });
  const { showToast } = useToast();

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/brand/all`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.brands || []);
      setBrands(list);
    } catch (err) {
      console.error('Error fetching brands:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/review/admin/all`, { withCredentials: true });
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'brands') fetchBrands();
    else fetchReviews();
  }, [activeTab]);

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrand.name.trim()) return;
    try {
      const slug = newBrand.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      await axios.post(`${API_BASE}/brand/add`, { ...newBrand, slug }, { withCredentials: true });
      showToast('Brand added successfully!', 'success');
      setShowAddBrand(false);
      setNewBrand({ name: '', logo: '', slug: '' });
      fetchBrands();
    } catch (err) {
      showToast('Failed to add brand', 'error');
    }
  };

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('Delete this brand?')) return;
    try {
      await axios.delete(`${API_BASE}/brand/${id}`, { withCredentials: true });
      showToast('Brand deleted', 'success');
      fetchBrands();
    } catch (err) {
      showToast('Failed to delete brand', 'error');
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/review/admin/${id}`, { withCredentials: true });
      showToast('Review removed', 'success');
      fetchReviews();
    } catch (err) {
      showToast('Failed to delete review', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brands & Customer Reviews</h1>
            <p className="text-sm text-gray-500">
              Manage brand partnerships and moderate customer ratings & feedback
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => (activeTab === 'brands' ? fetchBrands() : fetchReviews())}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'brands' && (
            <button
              onClick={() => setShowAddBrand(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Brand
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('brands')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'brands'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Partner Brands ({brands.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Reviews Moderation ({reviews.length})
        </button>
      </div>

      {/* Tab: Brands */}
      {activeTab === 'brands' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : brands.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No Brands Added</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">Add brands like VGR, Kemei, Philips, and Dingling.</p>
              <button
                onClick={() => setShowAddBrand(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
              >
                <Plus className="w-4 h-4" /> Add First Brand
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.map((b) => (
                <div
                  key={b._id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition flex flex-col items-center justify-between text-center relative group"
                >
                  <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center p-2 mb-2 overflow-hidden">
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Award className="w-8 h-8 text-amber-500" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 truncate w-full">{b.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono truncate w-full">{b.slug}</p>
                  <button
                    onClick={() => handleDeleteBrand(b._id)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-rose-600 rounded-md opacity-0 group-hover:opacity-100 transition"
                    title="Delete Brand"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Reviews */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No Customer Reviews Yet</h3>
              <p className="text-sm mt-1">Customer ratings submitted on product pages will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-700">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Comment</th>
                    <th className="px-6 py-4">Product Slug</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900">{r.reviewerName || 'Customer'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (r.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 max-w-sm truncate">{r.comment || 'Verified purchase'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-blue-600 truncate max-w-xs">{r.productSlug}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteReview(r._id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Brand</h2>
              <button onClick={() => setShowAddBrand(false)} className="text-gray-400 hover:text-gray-600 p-1">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VGR or Kemei"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Logo Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newBrand.logo}
                  onChange={(e) => setNewBrand({ ...newBrand, logo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBrand(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandsReviewsCMS;

