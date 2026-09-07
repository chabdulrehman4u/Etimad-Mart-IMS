import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import Button from './Button';
import { Plus, Edit, Trash2, X, Check, FolderPlus } from 'lucide-react';

const CategoryManager = ({ selectedCategory, onCategorySelect, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      if (editingId) {
        await updateCategory(editingId, formData);
      } else {
        await createCategory(formData);
      }
      setFormData({ name: '', description: '' });
      setIsAdding(false);
      setEditingId(null);
      setError('');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setFormData({ name: category.name, description: category.description || '' });
    setEditingId(category._id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        fetchCategories();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderPlus size={24} />
            Manage Categories
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Add/Edit Form */}
          {isAdding ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-emerald-900 mb-3">
                {editingId ? 'Edit Category' : 'Add New Category'}
              </h3>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded mb-3 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Electronics, Clothing"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Brief description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} size="sm">
                    <Check size={16} />
                    {editingId ? 'Update' : 'Add'}
                  </Button>
                  <Button variant="secondary" onClick={handleCancel} size="sm">
                    <X size={16} />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="mb-4">
              <Plus size={18} />
              Add New Category
            </Button>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700 mb-2">Existing Categories ({categories.length})</h3>
            {categories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No categories yet. Add one to get started!</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category._id}
                    className={`p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition ${
                      selectedCategory === category.name ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-gray-500">{category.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded transition"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
