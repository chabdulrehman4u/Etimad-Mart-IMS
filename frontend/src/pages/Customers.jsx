import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getProducts, getSellers, getLcsParcelByCn } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { Plus, Edit, Trash2, UserCircle, Globe, MapPin, Download, Filter, Users, Monitor } from 'lucide-react';
import { exportToExcel, formatForExport } from '../utils/exportUtils';
import ScanInput from '../components/ScanInput';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Customers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [productsModalCustomer, setProductsModalCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'online', 'offline'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    name: '',
    type: 'online',
    price: '',
    phone: '',
    address: '',
    trackingNumber: '',
    product: '', // optional associated product
    productId: '',
    customDate: '',
    seller: ''
  });
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [primaryQuantity, setPrimaryQuantity] = useState(1);
  const [sellerSearch, setSellerSearch] = useState('');
  const [showSellerSearch, setShowSellerSearch] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const handleScanLcsBarcode = async (value) => {
    const raw = String(value || '').trim();
    if (!raw) return;

    try {
      const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
      const cn = parts[0] || '';
      const codStr = parts[2] || '';
      const parsedCod = codStr ? Number(codStr.replace(/[^0-9.]/g, '')) : NaN;
      const codFromScan = Number.isFinite(parsedCod) && parsedCod > 0 ? parsedCod : undefined;

      if (!cn) {
        toast.error('Invalid scan: CN number is missing');
        return;
      }

      // Set CN immediately; price will be set after we know COD (from scan or parcel)
      setFormData((prev) => ({
        ...prev,
        trackingNumber: cn,
      }));

      try {
        const res = await getLcsParcelByCn(cn);
        const parcel = res.data;
        if (!parcel) {
          toast.error('Parcel not found for scanned CN');
          return;
        }

        const consigneeName = parcel.consigneeName || '';
        const consigneeAddress = parcel.consigneeAddress || '';
        const consigneePhone = parcel.consigneePhone || '';
        const bookingDate = parcel.bookingDate ? new Date(parcel.bookingDate) : null;
        const bookingYmd = bookingDate && !Number.isNaN(bookingDate.getTime())
          ? bookingDate.toISOString().slice(0, 10)
          : '';

        const parcelCodRaw = parcel.codValue != null ? Number(parcel.codValue) : NaN;
        const codFromParcel = Number.isFinite(parcelCodRaw) ? parcelCodRaw : undefined;
        const finalCod = codFromScan ?? codFromParcel;

        setFormData((prev) => ({
          ...prev,
          name: prev.name || consigneeName || prev.name,
          address: prev.address || consigneeAddress || prev.address,
          phone: prev.phone || consigneePhone || prev.phone,
          customDate: prev.customDate || bookingYmd || prev.customDate,
          trackingNumber: cn,
          price: finalCod !== undefined ? finalCod : prev.price,
        }));

        toast.success('Customer details loaded from LCS');
      } catch (err) {
        if (err?.response?.status === 404) {
          toast.error('Parcel not found for scanned CN');
        } else {
          console.error('Error looking up LCS parcel by CN:', err);
          toast.error('Failed to lookup LCS parcel');
        }
      }
    } catch (error) {
      console.error('Error processing scanned LCS barcode:', error);
      toast.error('Failed to process scanned LCS barcode');
    }
  };

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await getCustomers();
      return response.data;
    }
  });

  // Load products for optional customer-product association
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await getProducts();
      return response.data;
    }
  });

  // Quick lookup map for products by name (to show model in customer list)
  const productsByName = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p?.name) {
        map[p.name.toLowerCase()] = p;
      }
    });
    return map;
  }, [products]);

  // Quick lookup map for products by id (authoritative)
  const productsById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p?._id) {
        map[String(p._id)] = p;
      }
    });
    return map;
  }, [products]);

  // Load sellers for optional customer-seller association
  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers-for-customers'],
    queryFn: async () => {
      const response = await getSellers();
      return response.data;
    }
  });

  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase();
    if (!query) return products.slice(0, 8);
    return products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.model?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [products, productSearch]);

  const syncSelectedProductsWithPrimary = (nextPrimaryId, nextPrimaryName, nextPrimaryModel, nextPrimaryQty) => {
    if (!nextPrimaryId) {
      setSelectedProducts([]);
      return;
    }

    setSelectedProducts((prev) => {
      const rest = prev.filter((x) => String(x.productId) !== String(nextPrimaryId));
      return [
        {
          productId: nextPrimaryId,
          name: nextPrimaryName,
          model: nextPrimaryModel,
          quantity: Math.max(1, Number(nextPrimaryQty) || 1)
        },
        ...rest
      ];
    });
  };

  const addAdditionalProduct = (product) => {
    if (!product?._id) return;
    if (Number(product.stock || 0) <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    setSelectedProducts((prev) => {
      const existing = prev.find((x) => String(x.productId) === String(product._id));
      if (existing) {
        return prev.map((x) =>
          String(x.productId) === String(product._id)
            ? { ...x, quantity: Math.max(1, Number(x.quantity || 1) + 1) }
            : x
        );
      }
      return [...prev, { productId: product._id, name: product.name, model: product.model, quantity: 1 }];
    });
  };

  const filteredSellers = useMemo(() => {
    const query = sellerSearch.toLowerCase();
    if (!query) return sellers.slice(0, 8);
    return sellers.filter((s) =>
      s.name.toLowerCase().includes(query) ||
      s.phone?.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [sellers, sellerSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build payload and ensure optional seller is not sent as an empty string
      const payload = { ...formData };
      if (!payload.seller) {
        delete payload.seller;
      }

      if (!payload.product) {
        delete payload.product;
      }

      if (!payload.productId) {
        delete payload.productId;
      }

      if (!payload.customDate) {
        delete payload.customDate;
      }

      // Prevent duplicate tracking numbers across customers
      const tracking = String(payload.trackingNumber || '').trim();
      if (tracking) {
        const existingWithSameTracking = customers.find((c) => {
          const t = String(c.trackingNumber || '').trim();
          if (!t) return false;
          if (t !== tracking) return false;
          // Allow same record when editing the same customer
          if (editingCustomer && String(c._id) === String(editingCustomer._id)) return false;
          return true;
        });

        if (existingWithSameTracking) {
          toast.error('This tracking / CN is already assigned to another customer');
          return;
        }
      }

      const productsInfo = selectedProducts
        .map((x) => ({
          productId: x.productId,
          quantity: Number(x.quantity || 1)
        }))
        .filter((x) => x.productId && Number(x.quantity || 0) > 0);

      if (productsInfo.length > 0) {
        const prevProductsInfo = editingCustomer
          ? (
            Array.isArray(editingCustomer.productsInfo) && editingCustomer.productsInfo.length > 0
              ? editingCustomer.productsInfo
              : (editingCustomer.productInfo?.productId
                ? [{ productId: editingCustomer.productInfo.productId, quantity: 1 }]
                : [])
          )
          : [];

        const prevMap = new Map(
          prevProductsInfo
            .map((p) => ({ id: p?.productId ? String(p.productId) : '', qty: Number(p?.quantity || 0) }))
            .filter((x) => x.id)
            .map((x) => [x.id, x.qty])
        );

        for (const item of productsInfo) {
          const productDoc = productsById[String(item.productId)];
          const available = Number(productDoc?.stock || 0);
          const requested = Number(item.quantity || 0);
          if (!productDoc) {
            toast.error('Product not found');
            return;
          }
          if (requested < 1 || !Number.isFinite(requested)) {
            toast.error('Quantity must be at least 1');
            return;
          }

          const prevQty = editingCustomer ? Number(prevMap.get(String(item.productId)) || 0) : 0;
          const delta = requested - prevQty;
          if (delta > 0 && available < delta) {
            toast.error(`Insufficient stock for ${productDoc.name}. Available: ${available}, Requested: ${delta}`);
            return;
          }
        }
        payload.productsInfo = productsInfo;
      } else if (editingCustomer) {
        // Explicitly clear productsInfo for existing customer when all products are removed
        payload.productsInfo = [];
      }

      if (editingCustomer) {
        await updateCustomer(editingCustomer._id, payload);
        toast.success('Customer updated successfully');
      } else {
        await createCustomer(payload);
        toast.success('Customer created successfully');
      }
      setIsModalOpen(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    const productNameForForm = customer.productInfo?.name || customer.product || '';
    const productIdForForm =
      customer.productInfo?.productId ||
      (productNameForForm ? productsByName[productNameForForm.toLowerCase()]?._id : '') ||
      '';

    const liveProductForForm = productIdForForm ? productsById[String(productIdForForm)] : undefined;
    const productModelForForm = liveProductForForm?.model || customer.productInfo?.model;

    const existingProductsInfo = Array.isArray(customer.productsInfo) && customer.productsInfo.length > 0
      ? customer.productsInfo
      : (productIdForForm ? [{ productId: productIdForForm, name: productNameForForm, model: productModelForForm, quantity: 1 }] : []);

    const normalizedSelected = existingProductsInfo
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        model: p.model,
        quantity: Number(p.quantity || 1)
      }))
      .filter((p) => p.productId);

    const primaryIdStr = productIdForForm ? String(productIdForForm) : '';
    const orderedSelected = primaryIdStr
      ? (() => {
        const primary = normalizedSelected.find((p) => String(p.productId) === primaryIdStr);
        const rest = normalizedSelected.filter((p) => String(p.productId) !== primaryIdStr);
        return primary ? [primary, ...rest] : normalizedSelected;
      })()
      : normalizedSelected;

    setSelectedProducts(orderedSelected);
    setPrimaryQuantity(orderedSelected[0]?.quantity || 1);

    setFormData({
      name: customer.name,
      type: customer.type,
      price: customer.price ?? '',
      phone: customer.phone || '',
      address: customer.address || '',
      product: productNameForForm,
      productId: productIdForForm,
      trackingNumber: customer.trackingNumber || '',
      customDate: customer.customDate
        ? new Date(customer.customDate).toISOString().slice(0, 10)
        : '',
      seller: customer.seller?._id || ''
    });
    setProductSearch('');
    setSellerSearch(customer.seller?.name || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        toast.success('Customer deleted successfully');
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  const resetForm = () => {
    // Default to current tab type, or 'online' if 'all' is selected
    const defaultType = activeTab === 'all' ? 'online' : activeTab;
    setFormData({ name: '', type: defaultType, price: '', phone: '', address: '', trackingNumber: '', product: '', productId: '', customDate: '', seller: '' });
    setProductSearch('');
    setShowProductSearch(false);
    setSelectedProducts([]);
    setPrimaryQuantity(1);
    setSellerSearch('');
    setShowSellerSearch(false);
    setEditingCustomer(null);
  };

  // Filter and search customers based on active tab
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        customer.name.toLowerCase().includes(q) ||
        customer.phone?.includes(searchQuery) ||
        customer.address?.toLowerCase().includes(q) ||
        customer.productInfo?.name?.toLowerCase?.().includes(q) ||
        customer.productInfo?.model?.toLowerCase?.().includes(q) ||
        customer.product?.toLowerCase?.().includes(q);
      const matchesTab = activeTab === 'all' || customer.type === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [customers, searchQuery, activeTab]);

  // Paginate customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Handle export
  const handleExport = () => {
    const formattedData = formatForExport(filteredCustomers, 'customers');
    exportToExcel(formattedData, 'customers');
  };

  // Reset to page 1 when search/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const onlineCount = customers.filter(c => c.type === 'online').length;
  const offlineCount = customers.filter(c => c.type === 'offline').length;

  const productsForModal = useMemo(() => {
    const customer = productsModalCustomer;
    if (!customer) return [];

    const list = Array.isArray(customer.productsInfo) && customer.productsInfo.length > 0
      ? customer.productsInfo
      : (customer.productInfo?.productId
        ? [{
          productId: customer.productInfo.productId,
          name: customer.productInfo?.name || customer.product,
          model: customer.productInfo?.model,
          quantity: 1
        }]
        : []);

    return list
      .map((p) => {
        const productId = p?.productId ? String(p.productId) : '';
        const live = productId ? productsById[productId] : undefined;
        const name = p?.name || live?.name || '';
        const model = p?.model || live?.model || '';
        const quantity = Number(p?.quantity || 1);

        return {
          productId,
          name,
          model,
          quantity,
          retailPrice: live?.retailPrice,
          wholesalePrice: live?.wholesalePrice,
          websitePrice: live?.websitePrice,
        };
      })
      .filter((x) => x.productId);
  }, [productsModalCustomer, productsById]);

  const productsModalGrandTotal = useMemo(() => {
    if (!productsModalCustomer) return undefined;
    if (!productsForModal || productsForModal.length === 0) return undefined;

    const hasCustomerUnitPrice = typeof productsModalCustomer.price === 'number';
    const sum = productsForModal.reduce((acc, p) => {
      const unit = hasCustomerUnitPrice
        ? productsModalCustomer.price
        : (typeof p.retailPrice === 'number' ? p.retailPrice : undefined);
      const qty = Number(p.quantity || 0);
      if (typeof unit !== 'number' || !Number.isFinite(qty)) return acc;
      return acc + unit * qty;
    }, 0);

    return sum;
  }, [productsModalCustomer, productsForModal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-600 mt-1">Manage customer information and purchase history</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={20} />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus size={20} />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-3 rounded-lg">
                <UserCircle className="text-slate-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Globe className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Online Customers</p>
                <p className="text-2xl font-bold text-gray-800">{onlineCount}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-3 rounded-lg">
                <MapPin className="text-teal-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Offline Customers</p>
                <p className="text-2xl font-bold text-gray-800">{offlineCount}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs and Search */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <CardTitle className="text-xl font-bold text-gray-800">Customer Management</CardTitle>

              {/* Tab Navigation */}
              <div className="flex bg-white rounded-xl p-1 shadow-sm border">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Users size={16} />
                  All ({customers.length})
                </button>
                <button
                  onClick={() => setActiveTab('online')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'online'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Globe size={16} />
                  Online ({onlineCount})
                </button>
                <button
                  onClick={() => setActiveTab('offline')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'offline'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <MapPin size={16} />
                  Offline ({offlineCount})
                </button>
              </div>
            </div>


            <div className="flex items-center gap-3">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search customers..."
                className="w-80"
              />
            </div>
          </div>

          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              Found {filteredCustomers.length} customer(s) in {activeTab === 'all' ? 'all categories' : `${activeTab} customers`}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Customers Table */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'all' && <Users className="text-gray-600" size={20} />}
              {activeTab === 'online' && <Globe className="text-emerald-600" size={20} />}
              {activeTab === 'offline' && <MapPin className="text-teal-600" size={20} />}
              {activeTab === 'all' ? 'All Customers' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Customers`} ({filteredCustomers.length})
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-white rounded-md shadow-sm">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCustomers.length > 0 ? paginatedCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {(() => {
                        const sourceDate = customer.customDate || customer.updatedAt || customer.createdAt;
                        if (!sourceDate) return '-';
                        const d = new Date(sourceDate);
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const yyyy = String(d.getFullYear());
                        return `${dd}-${mm}-${yyyy}`;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-800">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${customer.type === 'online'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-teal-100 text-teal-700'
                        }`}>
                        {customer.type === 'online' ? '🌐 Online' : '📍 Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {typeof customer.price === 'number' ? customer.price.toLocaleString('en-PK') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(() => {
                        const primary = customer.productInfo?.name || customer.product || '';
                        const count = Array.isArray(customer.productsInfo) ? customer.productsInfo.length : 0;
                        if (!primary) return '-';
                        const label = count > 1 ? `${primary} (+${count - 1})` : primary;

                        if (count > 1) {
                          return (
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={() => {
                                setProductsModalCustomer(customer);
                                setIsProductsModalOpen(true);
                              }}
                            >
                              {label}
                            </button>
                          );
                        }

                        return label;
                      })()}
                      {/* Prefer live product model from products list so model changes reflect immediately */}
                      {(() => {
                        const idKey = customer.productInfo?.productId
                          ? String(customer.productInfo.productId)
                          : undefined;
                        const liveModelById = idKey ? productsById[idKey]?.model : undefined;
                        const nameKey = (customer.productInfo?.name || customer.product)?.toLowerCase?.();
                        const liveModelByName = nameKey ? productsByName[nameKey]?.model : undefined;
                        const modelToShow = liveModelById || liveModelByName || customer.productInfo?.model;
                        return modelToShow ? ` (${modelToShow})` : '';
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.seller?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.address || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(customer)}>
                          <Edit size={16} />
                        </Button>
                        {(role === 'admin' || role === 'superadmin') && (
                          <Button variant="danger" size="sm" onClick={() => handleDelete(customer._id)}>
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      No customers found. {searchQuery && 'Try adjusting your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredCustomers.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCustomers.length}
            />
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ScanInput
            label="LCS Scan (optional)"
            placeholder="Scan LCS barcode (CN, city code, COD)"
            helperText="Use the barcode scanner only; press Enter to trigger lookup."
            onScan={handleScanLcsBarcode}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking / CN (optional)</label>
            <input
              type="text"
              value={formData.trackingNumber}
              onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter or scan CN number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter price for this customer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date (optional)</label>
            <input
              type="date"
              value={formData.customDate}
              onChange={(e) => setFormData({ ...formData, customDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Optional associated product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product (optional)</label>
            <div className="relative">
              <SearchBar
                value={productSearch}
                onChange={(value) => {
                  setProductSearch(value);
                  if (!value) {
                    // Clearing the search should also clear the selected product
                    if (!formData.productId) {
                      setFormData((prev) => ({ ...prev, product: '', productId: '' }));
                      setSelectedProducts([]);
                      setPrimaryQuantity(1);
                    }
                    setShowProductSearch(false);
                  } else {
                    const parsedName = value.split(' (')[0];
                    // Only update legacy product string if no primary product is selected yet
                    if (!formData.productId) {
                      setFormData((prev) => ({ ...prev, product: parsedName, productId: '' }));
                    }
                    setShowProductSearch(true);
                  }
                }}
                placeholder="Search products by name, model, or category..."
                onFocus={() => setShowProductSearch(true)}
              />

              {showProductSearch && filteredProducts.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  {filteredProducts.map((product) => (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => {
                        if (Number(product.stock || 0) <= 0) {
                          toast.error('Product is out of stock');
                          return;
                        }

                        if (!formData.productId) {
                          // First selection becomes primary product
                          setFormData((prev) => ({ ...prev, product: product.name, productId: product._id }));
                          setPrimaryQuantity(1);
                          syncSelectedProductsWithPrimary(product._id, product.name, product.model, 1);
                        } else {
                          // If primary is already selected, selection adds another product
                          addAdditionalProduct(product);
                        }

                        setProductSearch('');
                        setShowProductSearch(false);
                      }}
                      className={`w-full px-3 py-2 text-left border-b last:border-b-0 border-gray-100 ${Number(product.stock || 0) <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-600">Model: {product.model} • {product.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.productId && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primary Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={primaryQuantity}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value || 1));
                      setPrimaryQuantity(v);
                      const productDoc = productsById[String(formData.productId)];
                      const available = Number(productDoc?.stock || 0);
                      if (available && v > available) {
                        toast.error(`Insufficient stock. Available: ${available}`);
                      }
                      syncSelectedProductsWithPrimary(formData.productId, formData.product, productDoc?.model, v);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedProducts.map((p, idx) => (
                  <div key={String(p.productId)} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.name}{p.model ? ` (${p.model})` : ''}</div>
                      <div className="text-xs text-gray-500">Stock: {Number(productsById[String(p.productId)]?.stock ?? 0)}</div>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={p.quantity}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value || 1));
                          const available = Number(productsById[String(p.productId)]?.stock || 0);
                          if (available && v > available) {
                            toast.error(`Insufficient stock. Available: ${available}`);
                          }
                          setSelectedProducts((prev) => prev.map((x) =>
                            String(x.productId) === String(p.productId) ? { ...x, quantity: v } : x
                          ));
                          if (idx === 0) {
                            setPrimaryQuantity(v);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (idx === 0) {
                          if (selectedProducts.length <= 1) {
                            setFormData((prev) => ({ ...prev, product: '', productId: '' }));
                            setProductSearch('');
                            setSelectedProducts([]);
                            setPrimaryQuantity(1);
                            return;
                          }

                          const remaining = selectedProducts.filter((_, i) => i !== 0);
                          const nextPrimary = remaining[0];
                          const nextPrimaryId = String(nextPrimary.productId);
                          const live = productsById[nextPrimaryId];
                          const nextName = nextPrimary.name || live?.name || '';
                          const nextModel = nextPrimary.model || live?.model;
                          const nextQty = Math.max(1, Number(nextPrimary.quantity || 1));

                          setFormData((prev) => ({
                            ...prev,
                            product: nextName,
                            productId: nextPrimaryId,
                          }));
                          setPrimaryQuantity(nextQty);
                          setProductSearch('');
                          setSelectedProducts([
                            { ...nextPrimary, productId: nextPrimaryId, name: nextName, model: nextModel, quantity: nextQty },
                            ...remaining.slice(1),
                          ]);
                          return;
                        }

                        setSelectedProducts((prev) => prev.filter((x) => String(x.productId) !== String(p.productId)));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-1 text-xs text-gray-500">Optional: use the search above to select the primary product and also add more products. Stock is validated before saving.</p>
          </div>

          {/* Optional seller */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seller (optional)</label>
            <div className="relative">
              <SearchBar
                value={sellerSearch}
                onChange={(value) => {
                  setSellerSearch(value);
                  setShowSellerSearch(true);
                }}
                placeholder="Search sellers by name or phone..."
                onFocus={() => setShowSellerSearch(true)}
              />

              {showSellerSearch && filteredSellers.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  {filteredSellers.map((seller) => (
                    <button
                      key={seller._id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, seller: seller._id });
                        setSellerSearch(seller.name);
                        setShowSellerSearch(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                    >
                      <div className="font-medium text-gray-900">{seller.name}</div>
                      {seller.phone && (
                        <div className="text-xs text-gray-600">{seller.phone}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Optional: link the customer to a preferred seller.</p>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1">
              {editingCustomer ? 'Update Customer' : 'Create Customer'}
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

      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setProductsModalCustomer(null);
        }}
        title={productsModalCustomer ? `Products - ${productsModalCustomer.name}` : 'Products'}
      >
        <div className="space-y-4">
          {productsModalCustomer && typeof productsModalCustomer.price === 'number' && (
            <div className="text-sm text-gray-700">
              Customer Unit Price: {productsModalCustomer.price.toLocaleString('en-PK')}
            </div>
          )}

          {productsForModal.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Retail</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Website</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productsForModal.map((p) => {
                    const unit = typeof productsModalCustomer?.price === 'number'
                      ? productsModalCustomer.price
                      : (typeof p.retailPrice === 'number' ? p.retailPrice : undefined);
                    const total = typeof unit === 'number' ? unit * Number(p.quantity || 0) : undefined;
                    return (
                      <tr key={p.productId}>
                        <td className="px-3 py-2 text-gray-800">
                          <div className="font-medium">{p.name || '-'}</div>
                          {p.model ? <div className="text-xs text-gray-500">Model: {p.model}</div> : null}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{Number(p.quantity || 0)}</td>
                        <td className="px-3 py-2 text-gray-700">{typeof p.retailPrice === 'number' ? p.retailPrice.toLocaleString('en-PK') : '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{typeof p.wholesalePrice === 'number' ? p.wholesalePrice.toLocaleString('en-PK') : '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{typeof p.websitePrice === 'number' ? p.websitePrice.toLocaleString('en-PK') : '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{typeof total === 'number' ? total.toLocaleString('en-PK') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {typeof productsModalGrandTotal === 'number' && (
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td className="px-3 py-2 font-medium text-gray-900" colSpan="5">Grand Total</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{productsModalGrandTotal.toLocaleString('en-PK')}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No products linked to this customer.</div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setIsProductsModalOpen(false);
                setProductsModalCustomer(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
