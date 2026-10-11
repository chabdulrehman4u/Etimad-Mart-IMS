import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  FolderTree,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = '/api';

const CategoriesCMS = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    Image: '',
    menu: true,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/categories`, { withCredentials: true });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setForm((prev) => ({ ...prev, name, slug: editingCategory ? prev.slug : slug }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Category name is required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        await axios.put(`${API_BASE}/categories/${editingCategory._id}`, form, { withCredentials: true });
        showToast('Category updated successfully!', 'success');
      } else {
        await axios.post(`${API_BASE}/categories`, form, { withCredentials: true });
        showToast('Category created successfully!', 'success');
      }
      setShowAddModal(false);
      setEditingCategory(null);
      setForm({ name: '', slug: '', description: '', Image: '', menu: true });
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      slug: cat.slug || '',
      description: cat.description || '',
      Image: cat.Image || cat.image || '',
      menu: cat.menu !== false,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`${API_BASE}/categories/${id}`, { withCredentials: true });
      showToast('Category deleted successfully', 'success');
      fetchCategories();
    } catch (err) {
      showToast('Failed to delete category', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories & Menus</h1>
            <p className="text-sm text-gray-500">
              Organize storefront collections, navigation categories, and product classifications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingCategory(null);
              setForm({ name: '', slug: '', description: '', Image: '', menu: true });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Categories Found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Add categories like Electronics, Personal Care, and Household for your catalog.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Create First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {cat.Image || cat.image ? (
                    <img
                      src={cat.Image || cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <FolderTree className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{cat.name}</h3>
                  <p className="text-xs text-gray-400 font-mono truncate">{cat.slug || cat._id}</p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        cat.menu !== false
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.menu !== false ? 'Shown in Header Menu' : 'Hidden from Menu'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleEdit(cat)}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat._id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trimmers and Shavers"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  placeholder="trimmers-and-shavers"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3.5 py-2.5 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Image URL / Icon (Cloudinary or Direct Link)
                </label>
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/.../cat.png"
                  value={form.Image}
                  onChange={(e) => setForm({ ...form, Image: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description for SEO and category page"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="menuShow"
                  checked={form.menu}
                  onChange={(e) => setForm({ ...form, menu: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="menuShow" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Show in Top Navigation Menu
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
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesCMS;

