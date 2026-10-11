import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = '/api';

const BlogsCMS = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    author: 'Etimad Editorial',
    category: 'Grooming & Lifestyle',
    tags: '',
    isPublished: true,
  });

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/blog/admin/all`, { withCredentials: true });
      setBlogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      showToast('Failed to load blog posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleTitleChange = (title) => {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setForm((prev) => ({ ...prev, title, slug: editingBlog ? prev.slug : slug }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Title and content are required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : form.tags,
      };

      if (editingBlog) {
        await axios.put(`${API_BASE}/blog/${editingBlog._id}`, payload, { withCredentials: true });
        showToast('Blog post updated successfully!', 'success');
      } else {
        await axios.post(`${API_BASE}/blog`, payload, { withCredentials: true });
        showToast('Blog post published!', 'success');
      }

      setShowModal(false);
      setEditingBlog(null);
      setForm({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        author: 'Etimad Editorial',
        category: 'Grooming & Lifestyle',
        tags: '',
        isPublished: true,
      });
      fetchBlogs();
    } catch (err) {
      console.error('Error saving blog:', err);
      showToast(err.response?.data?.message || 'Failed to save blog post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      featuredImage: blog.featuredImage || blog.image || '',
      author: blog.author || 'Etimad Editorial',
      category: blog.category || 'Grooming & Lifestyle',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      isPublished: blog.isPublished !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await axios.delete(`${API_BASE}/blog/${id}`, { withCredentials: true });
      showToast('Blog post deleted', 'success');
      fetchBlogs();
    } catch (err) {
      showToast('Failed to delete blog', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Articles & Blog Posts</h1>
            <p className="text-sm text-gray-500">
              Publish SEO guides, product reviews, and customer grooming advice
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBlogs}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingBlog(null);
              setForm({
                title: '',
                slug: '',
                excerpt: '',
                content: '',
                featuredImage: '',
                author: 'Etimad Editorial',
                category: 'Grooming & Lifestyle',
                tags: '',
                isPublished: true,
              });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Write Article
          </button>
        </div>
      </div>

      {/* Blog Posts Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Blog Posts Written</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Create educational articles for your customers to boost SEO rankings and store traffic.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> Write First Article
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-700">
                <tr>
                  <th className="px-6 py-4">Article</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Published Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {blogs.map((blog) => (
                  <tr key={blog._id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {blog.featuredImage ? (
                          <img
                            src={blog.featuredImage}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                            <BookOpen className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0 max-w-md">
                          <h4 className="font-bold text-gray-900 truncate">{blog.title}</h4>
                          <p className="text-xs text-gray-400 font-mono truncate">/blogs/{blog.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md">
                        {blog.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700 font-medium">
                      {blog.author || 'Etimad Mart'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          blog.isPublished
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {blog.isPublished ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {blog.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(blog)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="Edit Article"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(blog._id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Article"
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

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingBlog ? 'Edit Blog Article' : 'Write New Article'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Best VGR Trimmers in Pakistan: Buyer Guide 2026"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Featured Cover Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/.../blog-cover.jpg"
                  value={form.featuredImage}
                  onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Short Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Catchy teaser shown on the blog cards..."
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Article Content (Markdown / HTML supported) *
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Write your article body here..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 font-sans text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublishedBlog"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <label htmlFor="isPublishedBlog" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Publish article live immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogsCMS;
