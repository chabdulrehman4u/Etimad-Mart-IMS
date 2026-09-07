import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct, getLowStockProducts, getCategories, addProductStockByBarcode, getPurchaseBatches } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import CategoryManager from '../components/CategoryManager';
import { Plus, Edit, Trash2, AlertTriangle, Package, Download, Filter, FolderPlus, Grid, List, History, TrendingUp, Eye, PackagePlus } from 'lucide-react';
import { exportToExcel, formatForExport } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { baseURL } from '../services/baseURL';
import ScanInput from '../components/ScanInput';

const Products = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [stockFormData, setStockFormData] = useState({
    quantity: '',
    reason: '',
    notes: ''
  });
  const [activeBatchId, setActiveBatchId] = useState('');
  const itemsPerPage = 12;
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    category: '',
    originalPrice: '',
    wholesalePrice: '',
    retailPrice: '',
    websitePrice: '',
    stock: '',
    barcode: ''
  });
  const [categories, setCategories] = useState([]); // local copy for CategoryManager integration
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await getProducts();
      return response.data;
    }
  });

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['lowStockProducts'],
    queryFn: async () => {
      const response = await getLowStockProducts();
      return response.data;
    }
  });

  const { data: categoryData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await getCategories();
      return response.data;
    }
  });

  const { data: purchaseBatches = [] } = useQuery({
    queryKey: ['purchase-batches-for-scan'],
    queryFn: async () => {
      const response = await getPurchaseBatches({ limit: 50 });
      return response.data || [];
    }
  });

  useEffect(() => {
    setCategories(categoryData);
  }, [categoryData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, formData);
        toast.success('Product updated successfully');
      } else {
        await createProduct(formData);
        toast.success('Product created successfully');
      }
      setIsModalOpen(false);
      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      ]);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleScanInventoryAdd = async (value) => {
    const raw = String(value || '').trim();
    if (!raw) return;

    try {
      const res = await addProductStockByBarcode({
        barcode: raw,
        batchId: activeBatchId || undefined,
      });
      const data = res?.data || {};
      const product = data.product || {};
      const productName = product.name || 'product';
      const productModal = product.model || '';
      const newStock = data.newStock;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      ]);
      if (Number.isFinite(newStock)) {
        toast.success(`+1 stock for ${productName}-${productModal}. New stock: ${newStock}`);
      } else {
        toast.success(`Stock added via barcode scan for ${productName}`);
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        toast.error('No product found for this barcode');
      } else {
        console.error('Error adding stock via barcode scan:', error);
        toast.error(error.response?.data?.message || 'Failed to add stock via barcode scan');
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      model: product.model,
      category: product.category,
      originalPrice: product.originalPrice,
      wholesalePrice: product.wholesalePrice,
      retailPrice: product.retailPrice,
      websitePrice: product.websitePrice,
      stock: product.stock,
      barcode: product.barcode || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['products'] }),
          queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
        ]);
        toast.success('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      category: '',
      originalPrice: '',
      wholesalePrice: '',
      retailPrice: '',
      websitePrice: '',
      stock: '',
      barcode: ''
    });
    setEditingProduct(null);
  };

  // Auto-calculate prices from original price
  const handleOriginalPriceChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, originalPrice: value };
      const base = parseFloat(value);

      if (!isNaN(base)) {
        // Always recalc margins so user sees live prices
        updated.wholesalePrice = Math.round(base * 1.15);
        updated.retailPrice = Math.round(base * 1.25);
        updated.websitePrice = Math.round(base * 1.35);
      }

      return updated;
    });
  };

  // Get unique categories for filter
  const filterCategories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return ['all', ...cats];
  }, [products]);

  // Filter and search products (optionally restricted to low stock)
  const filteredProducts = useMemo(() => {
    const source = showLowStockOnly ? lowStockProducts : products;

    return source.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, lowStockProducts, searchQuery, categoryFilter, showLowStockOnly]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Handle export
  const handleExport = () => {
    const formattedData = formatForExport(filteredProducts, 'products');
    exportToExcel(formattedData, 'products');
  };

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, showLowStockOnly]);

  // Stock management functions
  const fetchStockHistory = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${baseURL}/products/${productId}/stock-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockHistory(response.data);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  const handleStockManagement = (product) => {
    setSelectedProduct(product);
    setStockModalOpen(true);
    fetchStockHistory(product._id);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${baseURL}/products/${selectedProduct._id}/add-stock`,
        stockFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      ]);
      fetchStockHistory(selectedProduct._id);
      setStockFormData({ quantity: '', reason: '', notes: '' });

      // Update selected product stock
      const updatedProduct = { ...selectedProduct, stock: selectedProduct.stock + parseInt(stockFormData.quantity) };
      setSelectedProduct(updatedProduct);
      toast.success('Stock added successfully');
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error(error.response?.data?.message || 'Error adding stock');
    }
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
    setSelectedProduct(null);
    setStockHistory([]);
    setStockFormData({ quantity: '', reason: '', notes: '' });
  };

  return (
    <div className="space-y-5">
      {/* Low Stock Alert (slim banner) */}
      {lowStockProducts.length > 0 && (
        <Card className="border-l-4 border-rose-300 bg-rose-50/70 shadow-sm">
          <CardBody className="py-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                <div>
                  <p className="text-sm font-semibold text-rose-700">Low Stock Alert</p>
                  <p className="text-xs text-gray-600">
                    {lowStockProducts.length} product(s) are running low on stock
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Scan to Add Inventory */}
      <Card className="shadow-sm border border-emerald-100 bg-white">
        <CardBody className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
              <PackagePlus size={16} className="text-emerald-600" />
              Scan to Add Inventory
            </CardTitle>
            <p className="text-xs text-emerald-800 mt-1 max-w-xl">
              Scan a mapped product barcode to instantly add <span className="font-semibold">+1 unit</span> to stock and create a history entry.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-900">
              <span className="font-semibold">Active Batch:</span>
              <select
                value={activeBatchId}
                onChange={(e) => setActiveBatchId(e.target.value)}
                className="px-2 py-1 border border-emerald-300 rounded-md bg-white text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">None (no batch)</option>
                {purchaseBatches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {(b.batchNumber || 'No batch #') + ' • ' + (b.supplierName || '')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full md:w-80">
            <ScanInput
              label="Inventory Scan (per scan +1)"
              placeholder="Scan product barcode to add 1 to stock"
              helperText="If a barcode is not yet linked to any product, first save it in the product form."
              onScan={handleScanInventoryAdd}
            />
          </div>
        </CardBody>
      </Card>
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">Product Inventory</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Add, edit, and manage your products</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLowStockOnly((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors shadow-sm ${showLowStockOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                title="Toggle low stock filter"
              >
                <AlertTriangle size={14} className={showLowStockOnly ? 'text-rose-500' : 'text-amber-500'} />
                {showLowStockOnly ? 'Showing Low Stock' : 'Low Stock Only'}
                {lowStockProducts.length > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>
              <Button variant="secondary" onClick={handleExport} className="shadow-sm">
                <Download size={20} />
                Export
              </Button>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="shadow-sm">
                <Plus size={20} />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Search and Filter */}
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search products by name, model, or category..."
              />
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="text-gray-400" size={20} />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
                >
                  {filterCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {searchQuery || categoryFilter !== 'all' ? (
            <div className="mt-3 text-sm text-gray-600">
              Found {filteredProducts.length} product(s)
            </div>
          ) : null}
        </CardBody>
      </Card>


      {/* Products Display */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-gray-600" size={20} />
              {searchQuery || categoryFilter !== 'all'
                ? `Filtered Products (${filteredProducts.length})`
                : `All Products (${products.length})`}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-white rounded-md shadow-sm">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {false ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.length > 0 ? paginatedProducts.map((product) => (
                <div key={product._id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                  {/* Product Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                          <p className="text-xs text-gray-500">Model: {product.model}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.stock <= 10
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        {product.stock}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Category</p>
                      <p className="text-sm font-medium text-gray-900">{product.category}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-2">Pricing</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Retail:</span>
                          <span className="font-medium">Rs. {product.retailPrice?.toLocaleString('en-PK') || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Wholesale:</span>
                          <span className="font-medium">Rs. {product.wholesalePrice?.toLocaleString('en-PK') || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Website:</span>
                          <span className="font-medium">Rs. {product.websitePrice?.toLocaleString('en-PK') || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Actions */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStockManagement(product)}
                        className="flex-1 text-xs"
                      >
                        <PackagePlus size={14} />
                        Stock
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1 text-xs"
                      >
                        <Edit size={14} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(product._id)}
                        className="text-xs"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center text-gray-500">
                  <Package size={48} className="mx-auto text-gray-300 mb-4" />
                  <p>No products found. {searchQuery && 'Try adjusting your search.'}</p>
                </div>
              )}
            </div>
          ) : (
            /* Enhanced Professional Table View */
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                      <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Package className="text-blue-400" size={16} />
                          Product Name
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📱</span>
                          Model
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Filter className="text-purple-400" size={16} />
                          Category
                        </div>
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider min-w-[130px]">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-orange-400">💰</span>
                          Original Price
                        </div>
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider min-w-[130px]">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-blue-400">🏪</span>
                          Wholesale
                        </div>
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider min-w-[130px]">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-emerald-400">🛒</span>
                          Retail Price
                        </div>
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider min-w-[130px]">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-indigo-400">🌐</span>
                          Website Price
                        </div>
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider min-w-[100px]">
                        <div className="flex items-center justify-center gap-2">
                          <AlertTriangle className="text-amber-400" size={16} />
                          Stock
                        </div>
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider w-[180px] sticky right-0 bg-slate-800">
                        <div className="flex items-center justify-center gap-2">
                          <Edit className="text-gray-400" size={16} />
                          Actions
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedProducts.length > 0 ? paginatedProducts.map((product, index) => (
                      <tr
                        key={product._id}
                        className={`group hover:bg-blue-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                      >
                        {/* Product Name */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-200">
                              <Package className="text-white" size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 truncate">{product.name}</div>
                              <div className="text-xs text-gray-500">ID: {product._id.slice(-6)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Model */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                            {product.model}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            {product.category}
                          </span>
                        </td>

                        {/* Original Price */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-semibold text-gray-900">
                            Rs. {product.originalPrice?.toLocaleString('en-PK') || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">Original</div>
                        </td>

                        {/* Wholesale Price */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-semibold text-blue-600">
                            Rs. {product.wholesalePrice?.toLocaleString('en-PK') || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">Wholesale</div>
                        </td>

                        {/* Retail Price */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-emerald-600 text-lg">
                            Rs. {product.retailPrice?.toLocaleString('en-PK') || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">Retail</div>
                        </td>

                        {/* Website Price */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-semibold text-indigo-600">
                            Rs. {product.websitePrice?.toLocaleString('en-PK') || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">Website</div>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold shadow-md ${product.stock <= 10
                              ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                              : product.stock <= 50
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                                : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                              }`}>
                              {product.stock}
                            </span>
                            <span className="text-xs text-gray-500">units</span>
                            {product.stock <= 10 && (
                              <span className="text-xs text-rose-600 font-medium">Critical</span>
                            )}
                          </div>
                        </td>

                        {/* Actions - Sticky */}
                        <td className="px-4 py-4 sticky right-0 bg-white group-hover:bg-blue-50 transition-colors duration-200">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStockManagement(product)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Manage Stock"
                            >
                              <PackagePlus size={14} />
                              Stock
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 shadow-sm"
                              title="Edit Product"
                            >
                              <Edit size={14} />
                            </button>
                            {(role === 'admin' || role === 'superadmin') && (
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="inline-flex items-center gap-1 px-2 py-2 text-xs font-medium text-rose-700 bg-rose-100 rounded-lg hover:bg-rose-200 transition-all duration-200 shadow-sm"
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Package size={32} className="text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">No products found</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProducts.length}
            />
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Barcode (optional)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Scan or type barcode for this product"
              />
              <p className="mt-1 text-xs text-gray-500">
                This links the physical barcode to this product. Later, use the inventory scan above to add stock by scanning.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex gap-2">
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCategoryManagerOpen(true)}
                title="Manage Categories"
              >
                <FolderPlus size={18} />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Don't see your category? Click the folder button to manage categories.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (PKR)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.originalPrice}
                onChange={handleOriginalPriceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Price (PKR)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.wholesalePrice}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price (PKR)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.retailPrice}
                onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website Price (PKR)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.websitePrice}
                onChange={(e) => setFormData({ ...formData, websitePrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
            <input
              type="number"
              required
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      {categoryManagerOpen && (
        <CategoryManager
          selectedCategory={formData.category}
          onCategorySelect={(category) => setFormData({ ...formData, category })}
          onClose={() => {
            setCategoryManagerOpen(false);
            queryClient.invalidateQueries({ queryKey: ['categories'] }); // Refresh categories after closing
          }}
        />
      )}

      {/* Stock Management Modal */}
      <Modal
        isOpen={stockModalOpen}
        onClose={closeStockModal}
        title={`Stock Management - ${selectedProduct?.name}`}
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="text-blue-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedProduct.name}</h3>
                  <p className="text-sm text-gray-600">Model: {selectedProduct.model}</p>
                  <p className="text-sm text-gray-600">Category: {selectedProduct.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Current Stock</p>
                  <p className={`text-2xl font-bold ${selectedProduct.stock <= 10 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                    {selectedProduct.stock}
                  </p>
                  <p className="text-sm text-gray-500">units</p>
                </div>
              </div>
            </div>

            {/* Add Stock Form */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Add Stock</h4>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={stockFormData.quantity}
                      onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter quantity to add"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <select
                      required
                      value={stockFormData.reason}
                      onChange={(e) => setStockFormData({ ...stockFormData, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select reason</option>
                      <option value="New shipment">New shipment</option>
                      <option value="Restocking">Restocking</option>
                      <option value="Return from customer">Return from customer</option>
                      <option value="Inventory adjustment">Inventory adjustment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={stockFormData.notes}
                    onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Additional notes about this stock addition..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    <PackagePlus size={20} />
                    Add Stock
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStockFormData({ quantity: '', reason: '', notes: '' })}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>

            {/* Stock History */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History size={20} />
                Stock History
              </h4>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {stockHistory.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {stockHistory.map((entry, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.type === 'stock_in'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-rose-100 text-rose-600'
                              }`}>
                              {entry.type === 'stock_in' ? <TrendingUp size={16} /> : <TrendingUp size={16} className="rotate-180" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {entry.type === 'stock_in' ? 'Stock Added' : 'Stock Removed'}
                              </p>
                              <p className="text-xs text-gray-500">{entry.reason}</p>
                              {entry.notes && <p className="text-xs text-gray-400">{entry.notes}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${entry.type === 'stock_in' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                              {entry.type === 'stock_in' ? '+' : '-'}{entry.quantity}
                            </p>
                            <p className="text-xs text-gray-500">
                              {entry.previousStock} → {entry.newStock}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(entry.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p>No stock history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;
