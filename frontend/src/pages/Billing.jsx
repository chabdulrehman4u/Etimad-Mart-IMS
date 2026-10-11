import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  DollarSign,
  History,
  Minus,
  Package,
  Plus,
  Receipt,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  Truck,
  User,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BillingHistory from '../components/BillingHistory';
import BillReceipt from '../components/BillReceipt';
import Button from '../components/Button';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Modal from '../components/Modal';
import ScanInput from '../components/ScanInput';
import SearchBar from '../components/SearchBar';
import { useToast } from '../context/ToastContext';
import { createBill, createCustomer, getCustomerHistory, getCustomerLastProductPrice, getCustomers, getProducts, getSellers } from '../services/api';

const Billing = () => {
  const [billItems, setBillItems] = useState([]);
  const [billingChannel, setBillingChannel] = useState('retail'); // 'retail' or 'wholesale'
  const [cashReceived, setCashReceived] = useState('');
  const [wholesaleDueDate, setWholesaleDueDate] = useState('');
  const [deliveryChallanNumber, setDeliveryChallanNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState(1);
  const [lineUnitPrice, setLineUnitPrice] = useState('');
  const [productSearch, setProductSearch] = useState(''); // no longer used for popup, kept for potential filtering
  const [customerSearch, setCustomerSearch] = useState('');
  const [sellerSearch, setSellerSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showSellerSearch, setShowSellerSearch] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [amountPaid, setAmountPaid] = useState(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [customerPreviousRemaining, setCustomerPreviousRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState('billing'); // 'billing' or 'history'
  const [generatedBill, setGeneratedBill] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    type: 'offline',
    phone: '',
    address: '',
  });
  const [customerStats, setCustomerStats] = useState(null);
  const [customerHistoryBills, setCustomerHistoryBills] = useState([]);
  const [customerHistoryPagination, setCustomerHistoryPagination] = useState(null);
  const [customerHistoryPage, setCustomerHistoryPage] = useState(1);
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false);
  const [selectedHistoryBill, setSelectedHistoryBill] = useState(null);
  const [offlineSearch, setOfflineSearch] = useState('');
  const [offlinePage, setOfflinePage] = useState(1);
  const [lastPriceInfo, setLastPriceInfo] = useState(null);

  // Refs for click-outside detection
  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);
  const sellerSearchRef = useRef(null);

  const queryClient = useQueryClient();
  const location = useLocation();
  const toast = useToast();

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await getProducts();
      return response.data || [];
    }
  });

  const {
    data: customers = [],
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await getCustomers();
      return response.data || [];
    }
  });

  const {
    data: sellers = [],
    isLoading: sellersLoading,
    error: sellersError,
    refetch: refetchSellers
  } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const response = await getSellers();
      return response.data || [];
    }
  });

  const loading = productsLoading || customersLoading || sellersLoading;
  const error = productsError || customersError || sellersError;

  const handleCreateCustomerFromBilling = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      toast.error('Please enter a customer name');
      return;
    }

    try {
      const payload = {
        name: newCustomerForm.name.trim(),
        type: newCustomerForm.type,
        phone: newCustomerForm.phone.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined,
      };

      const response = await createCustomer(payload);
      const created = response.data;

      await queryClient.invalidateQueries({ queryKey: ['customers'] });

      setSelectedCustomer(created);
      setCustomerPreviousRemaining(0);
      setIsAddCustomerOpen(false);
      setNewCustomerForm({ name: '', type: 'offline', phone: '', address: '' });
      toast.success('Customer created successfully');
    } catch (error) {
      console.error('Error creating customer from billing page:', error);
      const message = error.response?.data?.message || 'Failed to create customer';
      toast.error(message);
    }
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowCustomerSearch(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target)) {
        setShowProductSearch(false);
      }
      if (sellerSearchRef.current && !sellerSearchRef.current.contains(event.target)) {
        setShowSellerSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load per-customer stats and history when a customer is selected or page changes
  useEffect(() => {
    const loadCustomerSummary = async () => {
      if (activeTab !== 'customer-summary') {
        return;
      }

      if (!selectedCustomer || (!selectedCustomer.id && !selectedCustomer._id)) {
        setCustomerStats(null);
        setCustomerHistoryBills([]);
        setCustomerHistoryPagination(null);
        return;
      }

      try {
        const customerId = selectedCustomer.id || selectedCustomer._id;
        const response = await getCustomerHistory(customerId, { page: customerHistoryPage, limit: 10 });
        const data = response.data || {};
        setCustomerStats(data.stats || null);
        setCustomerHistoryBills(data.bills || []);
        setCustomerHistoryPagination(data.pagination || null);
      } catch (err) {
        console.error('Error loading customer summary:', err);
        toast.error('Failed to load customer summary');
      }
    };

    loadCustomerSummary();
  }, [activeTab, selectedCustomer, customerHistoryPage, toast]);

  // When opening Customer Summary with no selected customer, default to first offline customer
  useEffect(() => {
    if (activeTab !== 'customer-summary') return;
    if (selectedCustomer) return;
    if (!customers || customers.length === 0) return;

    const offlineCustomer = customers.find((c) => c.type === 'offline');
    const fallback = offlineCustomer || customers[0];
    if (fallback) {
      setSelectedCustomer(fallback);
    }
  }, [activeTab, selectedCustomer, customers]);

  // Derived offline customers for summary tab (search + pagination)
  const offlineCustomers = useMemo(
    () => customers.filter((c) => c.type === 'offline'),
    [customers]
  );

  const filteredOfflineCustomers = useMemo(() => {
    const term = offlineSearch.trim().toLowerCase();
    if (!term) return offlineCustomers;
    return offlineCustomers.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
    );
  }, [offlineCustomers, offlineSearch]);

  const offlinePerPage = 10;
  const offlineTotalPages = Math.max(1, Math.ceil(filteredOfflineCustomers.length / offlinePerPage));
  const currentOfflinePage = Math.min(offlinePage, offlineTotalPages);
  const paginatedOfflineCustomers = useMemo(() => {
    const start = (currentOfflinePage - 1) * offlinePerPage;
    return filteredOfflineCustomers.slice(start, start + offlinePerPage);
  }, [filteredOfflineCustomers, currentOfflinePage]);

  // Filter products for dropdown (optional text filter by name/model/category)
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) {
      return products;
    }
    return products.filter((product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.model.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Filter customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) {
      return customers; // Show all customers when search is empty
    }
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const filteredSellers = useMemo(() => {
    if (!sellerSearch.trim()) {
      return sellers;
    }
    return sellers.filter((seller) =>
      seller.name.toLowerCase().includes(sellerSearch.toLowerCase()) ||
      seller.phone?.includes(sellerSearch)
    );
  }, [sellers, sellerSearch]);

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) || null,
    [products, selectedProductId]
  );

  // Load last price this customer paid for the selected product (if any)
  useEffect(() => {
    setLastPriceInfo(null);

    if (!selectedCustomer || !selectedProduct) return;

    const customerId = selectedCustomer.id || selectedCustomer._id;
    if (!customerId) return;

    let cancelled = false;
    const fetchLastPrice = async () => {
      try {
        const response = await getCustomerLastProductPrice(customerId, selectedProduct._id);
        const data = response.data;
        if (!cancelled && data?.found) {
          setLastPriceInfo({ unitPrice: Number(data.unitPrice || 0), date: data.date });
        }
      } catch (err) {
        console.error('Error fetching last price for customer/product:', err);
      }
    };

    fetchLastPrice();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomer, selectedProduct]);

  // Respect navigation state for initial tab (e.g., from EditBill redirect)
  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Auto-select first seller if none selected
  useEffect(() => {
    if (!selectedSeller && sellers && sellers.length > 0) {
      setSelectedSeller(sellers[0]);
    }
  }, [sellers, selectedSeller]);

  // Handle switching between Retail POS and Wholesale B2B channels
  const handleChannelChange = (newChannel) => {
    setBillingChannel(newChannel);
    // Recalculate cart item prices according to selected channel
    setBillItems((prevItems) =>
      prevItems.map((item) => {
        const minQty = item.minWholesaleQty || 6;
        if (newChannel === 'wholesale') {
          return {
            ...item,
            selectedPrice: item.wholesalePrice || item.selectedPrice,
            selectedPriceType: 'wholesalePrice',
          };
        } else {
          // Retail channel: apply wholesale price only if qty meets minWholesaleQty
          const isTier = item.quantity >= minQty;
          return {
            ...item,
            selectedPrice: isTier ? (item.wholesalePrice || item.retailPrice) : (item.retailPrice || item.selectedPrice),
            selectedPriceType: isTier ? 'wholesalePrice' : 'retailPrice',
          };
        }
      })
    );
    toast.info(`Switched to ${newChannel === 'wholesale' ? 'Wholesale B2B Billing' : 'Retail POS Counter'}`);
  };

  // Instant barcode scanner handler (supports hardware scanner gun and manual Enter)
  const handleBarcodeScan = (scannedCode) => {
    const raw = String(scannedCode || '').trim();
    if (!raw) return;

    const query = raw.toLowerCase();
    const product = products.find(
      (p) =>
        (p.barcode && p.barcode.trim().toLowerCase() === query) ||
        (p.model && p.model.trim().toLowerCase() === query) ||
        (p._id && p._id.toLowerCase() === query) ||
        (p.name && p.name.trim().toLowerCase() === query)
    );

    if (!product) {
      toast.error(`No product found for barcode / model: "${raw}"`);
      return;
    }

    if (billingChannel === 'retail' && product.isRetailAvailable === false) {
      toast.error(`${product.name} is not enabled for Retail POS`);
      return;
    }
    if (billingChannel === 'wholesale' && product.isWholesaleAvailable === false) {
      toast.error(`${product.name} is not enabled for Wholesale B2B`);
      return;
    }

    const minQty = product.minWholesaleQty || 6;
    const existingIndex = billItems.findIndex((item) => item.productId === product._id);

    if (existingIndex >= 0) {
      const existing = billItems[existingIndex];
      const newQty = existing.quantity + 1;
      updateQuantity(product._id, newQty);
      toast.success(`+1 ${product.name} (Total Qty: ${newQty})`);
    } else {
      const isWholesale = billingChannel === 'wholesale';
      const initialPrice = isWholesale
        ? Number(product.wholesalePrice || product.retailPrice || 0)
        : Number(product.retailPrice || 0);

      const newItem = {
        productId: product._id,
        name: product.name || 'Unknown Product',
        model: product.model || 'N/A',
        category: product.category || 'Uncategorized',
        selectedPriceType: isWholesale ? 'wholesalePrice' : 'retailPrice',
        selectedPrice: initialPrice,
        wholesalePrice: Number(product.wholesalePrice || 0),
        retailPrice: Number(product.retailPrice || 0),
        minWholesaleQty: minQty,
        originalPrice: Number(product.originalPrice) || 0,
        quantity: 1,
        stock: Number(product.stock) || 0,
      };

      setBillItems((prev) => [...prev, newItem]);
      toast.success(`Added ${product.name} (${product.model})`);
    }
  };

  // Add product to bill via manual form
  const addProductToBill = () => {
    const product = products.find((p) => p._id === selectedProductId);
    if (!product) {
      toast.error('Please select a product');
      return;
    }
    const qty = Number(lineQuantity || 0);
    const unitPrice = Number(lineUnitPrice || 0);
    if (qty <= 0 || unitPrice < 0) {
      toast.error('Please enter a valid quantity and unit price');
      return;
    }

    const minQty = product.minWholesaleQty || 6;
    const isWholesale = billingChannel === 'wholesale' || qty >= minQty;
    const existingItem = billItems.find((item) => item.productId === product._id);

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      let newPrice = unitPrice;
      let newPriceType = existingItem.selectedPriceType;

      if (billingChannel === 'wholesale' || newQty >= minQty) {
        newPrice = product.wholesalePrice || unitPrice;
        newPriceType = 'wholesalePrice';
      }

      setBillItems(
        billItems.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: newQty, selectedPrice: newPrice, selectedPriceType: newPriceType }
            : item
        )
      );
    } else {
      const newItem = {
        productId: product._id,
        name: product.name || 'Unknown Product',
        model: product.model || 'N/A',
        category: product.category || 'Uncategorized',
        selectedPriceType: isWholesale ? 'wholesalePrice' : 'retailPrice',
        selectedPrice: unitPrice,
        wholesalePrice: Number(product.wholesalePrice || 0),
        retailPrice: Number(product.retailPrice || 0),
        minWholesaleQty: minQty,
        originalPrice: Number(product.originalPrice) || 0,
        quantity: qty,
        stock: Number(product.stock) || 0,
      };

      setBillItems([...billItems, newItem]);
    }

    // Reset form fields
    setSelectedProductId('');
    setLineQuantity(1);
    setLineUnitPrice('');
    setProductSearch('');
  };

  // Update item quantity with wholesale tier auto-pricing
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    setBillItems(
      billItems.map((item) => {
        if (item.productId !== productId) return item;

        let newPrice = item.selectedPrice;
        let newPriceType = item.selectedPriceType;
        const minQty = item.minWholesaleQty || 6;

        if (billingChannel === 'wholesale') {
          newPrice = item.wholesalePrice || item.selectedPrice;
          newPriceType = 'wholesalePrice';
        } else {
          // Retail channel auto-tiering
          if (newQuantity >= minQty && item.wholesalePrice) {
            if (item.selectedPrice === item.retailPrice || item.selectedPriceType === 'retailPrice') {
              newPrice = item.wholesalePrice;
              newPriceType = 'wholesalePrice';
              toast.info(`Wholesale rate auto-applied for ${item.name} (≥${minQty} pcs)`);
            }
          } else if (newQuantity < minQty && item.retailPrice) {
            if (item.selectedPrice === item.wholesalePrice || item.selectedPriceType === 'wholesalePrice') {
              newPrice = item.retailPrice;
              newPriceType = 'retailPrice';
            }
          }
        }

        return {
          ...item,
          quantity: newQuantity,
          selectedPrice: newPrice,
          selectedPriceType: newPriceType,
        };
      })
    );
  };

  // Update item price manually
  const updateItemPrice = (productId, newPrice, priceType) => {
    const price = Number(newPrice || 0);
    setBillItems(
      billItems.map((item) =>
        item.productId === productId
          ? { ...item, selectedPrice: price, ...(priceType ? { selectedPriceType: priceType } : {}) }
          : item
      )
    );
  };

  // Remove item from bill
  const removeItem = (productId) => {
    setBillItems(billItems.filter((item) => item.productId !== productId));
  };

  // Calculate totals
  const subtotal = billItems.reduce((sum, item) => {
    const price = Number(item.selectedPrice || 0);
    const quantity = Number(item.quantity || 0);
    return sum + price * quantity;
  }, 0);

  const discountAmount = 0;
  const total = Math.max(0, subtotal);

  // Amount paid and remaining balance
  const numericAmountPaid = Number(amountPaid || 0);
  const remainingAmount = Math.max(0, total - numericAmountPaid);

  // Cashier quick cash calculator handlers
  const handleQuickCash = (amount) => {
    setCashReceived(amount);
    if (amount >= total) {
      setAmountPaid(total);
      setIsFullyPaid(true);
    } else {
      setAmountPaid(amount);
      setIsFullyPaid(false);
    }
  };

  const handleCashReceivedChange = (value) => {
    setCashReceived(value);
    const num = parseFloat(value) || 0;
    if (num >= total && total > 0) {
      setAmountPaid(total);
      setIsFullyPaid(true);
    } else if (num > 0) {
      setAmountPaid(Math.min(num, total));
      setIsFullyPaid(false);
    } else {
      setAmountPaid(0);
      setIsFullyPaid(false);
    }
  };

  // Keep amountPaid in sync when bill is marked as fully paid
  useEffect(() => {
    if (isFullyPaid) {
      setAmountPaid(total);
    }
  }, [isFullyPaid, total]);

  // Clear bill
  const clearBill = () => {
    setBillItems([]);
    setDiscount(0);
    setAmountPaid(0);
    setCashReceived('');
    setWholesaleDueDate('');
    setDeliveryChallanNumber('');
    setIsFullyPaid(false);
    setCustomerPreviousRemaining(0);
    setProductSearch('');
    setCustomerSearch('');
    setSelectedProductId('');
    setLineQuantity(1);
    setLineUnitPrice('');
  };

  // Generate bill
  const generateBill = async () => {
    if (billItems.length === 0) {
      toast.error('Please add items to the bill');
      return;
    }

    if (billingChannel === 'wholesale' && !selectedCustomer) {
      toast.error('Wholesale B2B bills must be linked to a Customer for Khata ledger tracking');
      return;
    }

    const finalSeller = selectedSeller || (sellers.length > 0 ? sellers[0] : null);
    if (billingChannel === 'wholesale' && !finalSeller) {
      toast.error('Please select a seller or representative for wholesale billing');
      return;
    }

    setIsGenerating(true);

    try {
      const cashReceivedNum = Number(cashReceived || 0);
      const changeReturnedNum = Math.max(0, cashReceivedNum - total);

      const billData = {
        customer: selectedCustomer,
        sellerId: finalSeller ? finalSeller._id : undefined,
        items: billItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          model: item.model,
          category: item.category,
          selectedPriceType: item.selectedPriceType || 'retailPrice',
          selectedPrice: Number(item.selectedPrice),
          quantity: Number(item.quantity),
          totalAmount: Number(item.selectedPrice) * Number(item.quantity),
        })),
        subtotal: Number(subtotal),
        discount: Number(discountAmount),
        discountType,
        total: Number(total),
        amountPaid: numericAmountPaid,
        previousRemaining: Number(customerPreviousRemaining || 0),
        remainingAmount: remainingAmount,
        paymentMethod: 'cash',
        notes: '',
        channel: billingChannel,
        cashReceived: cashReceivedNum,
        changeReturned: changeReturnedNum,
        dueDate: wholesaleDueDate || undefined,
        deliveryChallanNumber: deliveryChallanNumber || undefined,
      };

      const response = await createBill(billData);
      setGeneratedBill(response.data);
      setShowReceipt(true);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['sellers'] }),
        queryClient.invalidateQueries({ queryKey: ['bills'] }),
        queryClient.invalidateQueries({ queryKey: ['billingStats'] }),
      ]);

      clearBill();
      toast.success('Bill generated successfully!');
      setActiveTab('history');
    } catch (error) {
      console.error('Error generating bill:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to generate bill. Please try again.';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing system...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    const errorMessage =
      productsError?.response?.data?.message ||
      customersError?.response?.data?.message ||
      sellersError?.response?.data?.message ||
      error?.message ||
      'Failed to load data. Please refresh the page.';
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <Button
            onClick={() => {
              refetchProducts();
              refetchCustomers();
              refetchSellers();
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl shadow-xl text-white">
        <div className="p-8 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">🏪 Etimad Mart POS</h1>
              <p className="text-slate-300 text-lg">Professional Point of Sale & Billing System</p>
            </div>
            <div className="hidden md:block">
              <Receipt size={80} className="text-slate-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-slate-600">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'billing'
              ? 'bg-white text-amber-700 '
              : 'text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calculator size={20} />
              Live Billing
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'history'
              ? 'bg-white text-amber-700 '
              : 'text-slate-300 hover:text-white  hover:bg-slate-600'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={20} />
              Billing History
            </div>
          </button>
          <button
            onClick={() => setActiveTab('customer-summary')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'customer-summary'
              ? 'bg-white text-amber-700 '
              : 'text-slate-300 hover:text-white  hover:bg-slate-600'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User size={20} />
              Customer Summary
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'billing' ? (
        <div className="space-y-6">
          {/* Omnichannel Mode Selector */}
          <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleChannelChange('retail')}
                className={`flex-1 p-4 rounded-xl flex items-center gap-3 transition-all text-left ${
                  billingChannel === 'retail'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg ring-2 ring-emerald-500'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    billingChannel === 'retail' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Store size={24} />
                </div>
                <div>
                  <div className="font-bold text-base flex items-center gap-2">
                    🛒 Retail POS Counter
                    {billingChannel === 'retail' && (
                      <span className="text-[10px] uppercase font-extrabold bg-white text-emerald-800 px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      billingChannel === 'retail' ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    Walk-in sales • Hardware scanner • Cashier change calculator
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChannelChange('wholesale')}
                className={`flex-1 p-4 rounded-xl flex items-center gap-3 transition-all text-left ${
                  billingChannel === 'wholesale'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg ring-2 ring-blue-500'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    billingChannel === 'wholesale' ? 'bg-white/20' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="font-bold text-base flex items-center gap-2">
                    🏢 Wholesale B2B Billing
                    {billingChannel === 'wholesale' && (
                      <span className="text-[10px] uppercase font-extrabold bg-white text-blue-800 px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      billingChannel === 'wholesale' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    Bulk tier auto-pricing • Khata credit ledger • Delivery challans
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Instant Barcode & Model Scanner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-300 rounded-2xl p-4 shadow-sm">
            <ScanInput
              label="Instant Barcode & Model Scanner (بار کوڈ اسکینر)"
              placeholder="Scan barcode with scanner gun or type product model / name and press Enter..."
              helperText="Hardware scanner ready: scan barcode directly to instantly add items to the cart."
              onScan={handleBarcodeScan}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Product Selection & Customer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-visible">
                <CardHeader className="bg-gradient-to-r from-stone-50 via-stone-100 to-amber-50 border-b border-stone-200">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-amber-600 rounded-lg">
                      <User className="text-white" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span>Customer Selection</span>
                        {billingChannel === 'wholesale' && (
                          <span className="text-xs bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-semibold">
                            Required for Wholesale
                          </span>
                        )}
                        {billingChannel === 'retail' && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                            Optional (Walk-in)
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-normal text-amber-700">Choose or search for a customer</div>
                    </div>
                  </CardTitle>
                </CardHeader>
              <CardBody className="p-6">
                <div className="relative" ref={customerSearchRef}>
                  <div className="flex items-center gap-3">
                    {selectedCustomer ? (
                      <div className="flex-1 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div>
                          <div className="font-semibold text-amber-800">{selectedCustomer.name}</div>
                          <div className="text-sm text-amber-700">
                            {selectedCustomer.type} • {selectedCustomer.phone || 'No phone'}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedCustomer(null)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <SearchBar
                              value={customerSearch}
                              onChange={(value) => {
                                setCustomerSearch(value);
                                setShowCustomerSearch(true);
                              }}
                              placeholder="Search customers by name, email, or phone..."
                              onFocus={() => setShowCustomerSearch(true)}
                            />
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => {
                              setShowCustomerSearch(true);
                              setCustomerSearch('');
                            }}
                            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-6 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
                          >
                            <User size={16} />
                            Browse
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddCustomerOpen(true)}
                            className="px-4 py-2 text-sm"
                          >
                            Add New
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          Click "Browse" to see all customers or start typing to search
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Search Results */}
                  {showCustomerSearch && (customerSearch || customers.length > 0) && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-stone-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto backdrop-blur-sm">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.slice(0, 5).map((customer) => (
                          <button
                            key={customer._id}
                            onClick={async () => {
                              setSelectedCustomer(customer);
                              setCustomerSearch('');
                              setShowCustomerSearch(false);

                              try {
                                const historyResponse = await getCustomerHistory(customer._id, { page: 1, limit: 1 });
                                const stats = historyResponse.data?.stats;
                                setCustomerPreviousRemaining(Number(stats?.totalRemaining || 0));
                              } catch (err) {
                                console.error('Error fetching customer remaining balance:', err);
                                setCustomerPreviousRemaining(0);
                              }
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">
                              {customer.type} • {customer.phone || 'No phone'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          {customers.length === 0 ? 'No customers available' : 'No customers found'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2 text-xs text-gray-500">
                      Debug: {customers.length} customers loaded, {filteredCustomers.length} filtered
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
            {/* Product Selection via searchable input */}
            <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-visible">
              <CardHeader className="bg-gradient-to-r from-slate-50 via-slate-100 to-stone-50 border-b border-slate-200">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-slate-600 rounded-lg">
                    <Package className="text-white" size={20} />
                  </div>
                  <div>
                    <div>Add Products to Bill</div>
                    <div className="text-sm font-normal text-slate-600">Search product and set quantity & price</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative" ref={productSearchRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <SearchBar
                      value={productSearch}
                      onChange={(value) => {
                        setProductSearch(value);
                        setShowProductSearch(true);
                      }}
                      placeholder="Search by name, model, or category..."
                      onFocus={() => setShowProductSearch(true)}
                    />
                    {showProductSearch && filteredProducts.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        {filteredProducts.map((product) => (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => {
                              setSelectedProductId(product._id);
                              setProductSearch(`${product.name} (${product.model})`);
                              setShowProductSearch(false);
                              const suggested =
                                billingChannel === 'wholesale'
                                  ? product.wholesalePrice || product.retailPrice || ''
                                  : product.retailPrice || '';
                              setLineUnitPrice(suggested);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                          >
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-600">
                              Model: {product.model} • {product.category} • Retail: Rs. {product.retailPrice || 0} • Wholesale: Rs. {product.wholesalePrice || 0}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={lineQuantity}
                      onChange={(e) => setLineQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      value={lineUnitPrice}
                      onChange={(e) => setLineUnitPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {selectedProduct ? (
                    <>
                      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                        <span className="font-medium">Stock:</span>{' '}
                        <span className="font-semibold">{selectedProduct.stock ?? 0}</span>
                      </div>
                      <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                        <span className="font-medium">Original:</span>{' '}
                        <span>Rs. {selectedProduct.originalPrice ?? 0}</span>
                      </div>
                      <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                        <span className="font-medium">Wholesale:</span>{' '}
                        <span>Rs. {selectedProduct.wholesalePrice ?? 0}</span>
                        <span className="text-blue-600 font-semibold ml-1">
                          (≥{selectedProduct.minWholesaleQty || 6} pcs)
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                        <span className="font-medium">Retail:</span>{' '}
                        <span>Rs. {selectedProduct.retailPrice ?? 0}</span>
                      </div>
                      <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                        <span className="font-medium">Website:</span>{' '}
                        <span>Rs. {selectedProduct.websitePrice ?? 0}</span>
                      </div>
                      {lastPriceInfo ? (
                        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                          <span className="font-medium">Last for this customer:</span>{' '}
                          <span>Rs. {lastPriceInfo.unitPrice}</span>
                          {lastPriceInfo.date && (
                            <span className="ml-2 text-[11px] text-emerald-800/80">
                              ({new Date(lastPriceInfo.date).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      ) : selectedCustomer ? (
                        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <span className="font-medium">First purchase for this customer</span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Select a product to see stock and price details
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={addProductToBill}
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Item
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Seller Selection */}
            <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-visible">
              <CardHeader className="bg-gradient-to-r from-sky-50 via-sky-100 to-blue-50 border-b border-sky-200">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-sky-600 rounded-lg">
                    <User className="text-white" size={20} />
                  </div>
                  <div>
                    <div>Seller Selection</div>
                    <div className="text-sm font-normal text-sky-700">Select the seller for this bill</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="p-6">
                <div className="relative" ref={sellerSearchRef}>
                  <div className="flex items-center gap-3">
                    {selectedSeller ? (
                      <div className="flex-1 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg p-3">
                        <div>
                          <div className="font-semibold text-sky-800">{selectedSeller.name}</div>
                          <div className="text-sm text-sky-700">{selectedSeller.phone || 'No phone'}</div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedSeller(null)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 flex-1">
                        <SearchBar
                          value={sellerSearch}
                          onChange={(value) => {
                            setSellerSearch(value);
                            setShowSellerSearch(true);
                          }}
                          placeholder="Search sellers by name or phone..."
                          onFocus={() => setShowSellerSearch(true)}
                        />
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                          Click and start typing to search sellers
                        </div>
                      </div>
                    )}
                  </div>

                  {showSellerSearch && sellers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-sky-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto backdrop-blur-sm">
                      {filteredSellers.length > 0 ? (
                        filteredSellers.slice(0, 5).map((seller) => (
                          <button
                            key={seller._id}
                            onClick={() => {
                              setSelectedSeller(seller);
                              setSellerSearch('');
                              setShowSellerSearch(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{seller.name}</div>
                            <div className="text-sm text-gray-600">{seller.phone || 'No phone'}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          {sellers.length === 0 ? 'No sellers available' : 'No sellers found'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column - Bill Summary */}
          <div className="space-y-6">
            {/* Bill Items */}
            <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 via-orange-100 to-amber-50 border-b border-orange-200">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-orange-600 rounded-lg">
                    <ShoppingCart className="text-white" size={20} />
                  </div>
                  <div>
                    <div>Bill Items ({billItems.length})</div>
                    <div className="text-sm font-normal text-orange-700">
                      {billItems.length === 0 ? 'No items added yet' : `${billItems.reduce((sum, item) => sum + item.quantity, 0)} total quantity`}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {billItems.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {billItems.map((item) => (
                        <div key={item.productId} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                {item.selectedPriceType === 'wholesalePrice' ||
                                (billingChannel === 'retail' && item.quantity >= (item.minWholesaleQty || 6)) ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                    🏢 Wholesale Rate (≥{item.minWholesaleQty || 6} pcs)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    🛒 Retail Rate
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">Model: {item.model}</div>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => removeItem(item.productId)}
                              className="ml-2"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          {/* Unit Price Editing & Rate Presets */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-medium text-gray-600">Unit Price (Rs.)</label>
                              <div className="flex gap-1.5">
                                {item.retailPrice > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => updateItemPrice(item.productId, item.retailPrice, 'retailPrice')}
                                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                      item.selectedPrice === item.retailPrice
                                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    Retail (Rs. {item.retailPrice})
                                  </button>
                                )}
                                {item.wholesalePrice > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => updateItemPrice(item.productId, item.wholesalePrice, 'wholesalePrice')}
                                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                      item.selectedPrice === item.wholesalePrice
                                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    Wholesale (Rs. {item.wholesalePrice})
                                  </button>
                                )}
                              </div>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={item.selectedPrice}
                              onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {Number(item.originalPrice || 0) > 0 && Number(item.selectedPrice || 0) < Number(item.originalPrice || 0) && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>
                                  Entered price (Rs. {Number(item.selectedPrice || 0).toLocaleString('en-PK')}) is lower than original price
                                  (Rs. {Number(item.originalPrice || 0).toLocaleString('en-PK')}).
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={14} />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">
                                Rs. {(Number(item.selectedPrice || 0) * Number(item.quantity || 0)).toLocaleString('en-PK')}
                              </div>
                              <div className="text-xs text-gray-500">
                                Rs. {Number(item.selectedPrice || 0).toLocaleString('en-PK')} each
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                      <p>No items in bill</p>
                      <p className="text-sm">Search and add products above</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Bill Summary */}
            <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-b border-emerald-200">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-emerald-700 rounded-lg">
                    <Calculator className="text-white" size={20} />
                  </div>
                  <div>
                    <div>Bill Summary</div>
                    <div className="text-sm font-normal text-emerald-700">
                      {billItems.length === 0 ? 'Add items to calculate total' : `Total: Rs. ${total.toLocaleString('en-PK')}`}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                {/* Totals */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">Rs. {subtotal.toLocaleString('en-PK')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">- Rs. {discountAmount.toLocaleString('en-PK')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">Rs. {total.toLocaleString('en-PK')}</span>
                  </div>
                </div>

                {/* Retail POS Cashier Calculator */}
                {billingChannel === 'retail' && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <DollarSign size={15} /> Cash Tendered (گاہک سے وصول شدہ رقم)
                      </span>
                      {Number(cashReceived || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCashReceived('');
                            setAmountPaid(0);
                            setIsFullyPaid(false);
                          }}
                          className="text-[11px] text-gray-500 hover:text-rose-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Quick PKR Cash Buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(total)}
                        className="px-2 py-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded hover:bg-emerald-100 text-emerald-800 transition-colors shadow-xs"
                      >
                        Exact
                      </button>
                      {[500, 1000, 2000, 5000].map((denom) => (
                        <button
                          key={denom}
                          type="button"
                          onClick={() => handleQuickCash(denom)}
                          className={`px-1.5 py-1.5 text-xs font-semibold border rounded transition-colors ${
                            Number(cashReceived) === denom
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50'
                          }`}
                        >
                          {denom >= 1000 ? `${denom / 1000}k` : denom}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min="0"
                      placeholder="Type cash tendered (Rs.)..."
                      value={cashReceived}
                      onChange={(e) => handleCashReceivedChange(e.target.value)}
                      className="w-full px-3 py-2 text-base font-bold text-gray-800 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />

                    {/* Live Change Calculation Box */}
                    {Number(cashReceived || 0) >= total && total > 0 ? (
                      <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-sm">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-100">
                          Change to Return (واپسی رقم)
                        </div>
                        <div className="text-2xl font-black mt-0.5">
                          Rs. {(Number(cashReceived) - total).toLocaleString('en-PK')}
                        </div>
                      </div>
                    ) : Number(cashReceived || 0) > 0 && Number(cashReceived) < total ? (
                      <div className="p-2.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center justify-between">
                        <span>Short by (بقایا رقم):</span>
                        <span className="font-bold text-sm text-amber-900">
                          Rs. {(total - Number(cashReceived)).toLocaleString('en-PK')}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Wholesale B2B Credit & Challan Fields */}
                {billingChannel === 'wholesale' && (
                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <Building2 size={15} /> Wholesale B2B Terms & Khata
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Truck size={13} className="text-blue-600" /> Delivery Challan #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DC-1085"
                        value={deliveryChallanNumber}
                        onChange={(e) => setDeliveryChallanNumber(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Calendar size={13} className="text-blue-600" /> Payment Due Date (ادائیگی کی تاریخ)
                      </label>
                      <input
                        type="date"
                        value={wholesaleDueDate}
                        onChange={(e) => setWholesaleDueDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {selectedCustomer && (
                      <div className="mt-2 pt-2 border-t border-blue-200 text-xs space-y-1">
                        <div className="flex justify-between text-gray-600">
                          <span>Previous Khata Due:</span>
                          <span className="font-semibold text-gray-800">
                            Rs. {customerPreviousRemaining.toLocaleString('en-PK')}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Current Bill Unpaid:</span>
                          <span className="font-semibold text-rose-600">
                            Rs. {remainingAmount.toLocaleString('en-PK')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-blue-900 pt-1 border-t border-blue-200">
                          <span>Total Outstanding:</span>
                          <span>Rs. {(customerPreviousRemaining + remainingAmount).toLocaleString('en-PK')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount Paid & Remaining */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={isFullyPaid}
                          onChange={(e) => setIsFullyPaid(e.target.checked)}
                        />
                        <span>Full paid</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      value={amountPaid}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAmountPaid(val);
                        if (val !== total) {
                          setIsFullyPaid(false);
                        }
                      }}
                      disabled={isFullyPaid}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isFullyPaid ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                        }`}
                      placeholder="Enter amount paid by customer"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <span className={`text-base font-bold ${remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      Rs. {remainingAmount.toLocaleString('en-PK')}
                    </span>
                  </div>
                  {selectedCustomer && (
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Previous remaining for this customer:</span>
                      <span className="font-medium text-gray-700">
                        Rs. {customerPreviousRemaining.toLocaleString('en-PK')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={generateBill}
                    disabled={billItems.length === 0 || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Receipt size={20} />
                        Generate Bill
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={clearBill}
                    disabled={billItems.length === 0}
                    className="w-full"
                  >
                    Clear Bill
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
        </div>
      ) : activeTab === 'history' ? (
        <BillingHistory />
      ) : (
        <div className="space-y-6">
          {/* Customer Summary Tab */}
          <div className="space-y-6">
            {/* Customer Summary Content */}
            <div className="space-y-6">
              {!selectedCustomer ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-600">
                  <p className="text-lg font-medium mb-2">No customer selected</p>
                  <p className="text-sm">Select an offline customer from the list on the left to view their summary.</p>
                </div>
              ) : (
                <>
                  {customerStats ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
                        <CardBody className="p-5">
                          <p className="text-blue-100 text-sm">Total Bills</p>
                          <p className="text-3xl font-bold mt-1">{customerStats.totalPurchases}</p>
                          <p className="text-blue-100 text-xs mt-1">Number of invoices for this customer</p>
                        </CardBody>
                      </Card>

                      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg">
                        <CardBody className="p-5">
                          <p className="text-emerald-100 text-sm">Total Purchased</p>
                          <p className="text-3xl font-bold mt-1">Rs. {Number(customerStats.totalAmount || 0).toLocaleString('en-PK')}</p>
                          <p className="text-emerald-100 text-xs mt-1">Sum of all bill totals</p>
                        </CardBody>
                      </Card>

                      <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg">
                        <CardBody className="p-5">
                          <p className="text-indigo-100 text-sm">Total Paid</p>
                          <p className="text-3xl font-bold mt-1">Rs. {Number(customerStats.totalPaid || 0).toLocaleString('en-PK')}</p>
                          <p className="text-indigo-100 text-xs mt-1">All payments received</p>
                        </CardBody>
                      </Card>

                      <Card className="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl shadow-lg">
                        <CardBody className="p-5">
                          <p className="text-rose-100 text-sm">Total Remaining</p>
                          <p className="text-3xl font-bold mt-1">Rs. {Number(customerStats.totalRemaining || 0).toLocaleString('en-PK')}</p>
                          <p className="text-rose-100 text-xs mt-1">Current outstanding balance</p>
                        </CardBody>
                      </Card>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-inner p-6 text-center text-gray-500">
                      Loading customer summary...
                    </div>
                  )}

                  {/* Offline customers search (for summary view) */}
                  <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between gap-4">
                    <div className="w-full md:w-1/2">
                      <SearchBar
                        value={offlineSearch}
                        onChange={setOfflineSearch}
                        placeholder="Search offline customers..."
                      />
                    </div>
                    <div className="hidden md:flex text-xs text-gray-500">
                      Filter offline customers shown below.
                    </div>
                  </div>

                  {/* Offline customers list under search */}
                  <div className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
                    <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                      {paginatedOfflineCustomers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          No offline customers found.
                        </div>
                      ) : (
                        paginatedOfflineCustomers.map((customer) => (
                          <button
                            key={customer._id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerHistoryPage(1);
                            }}
                            className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${selectedCustomer?._id === customer._id
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : ''
                              }`}
                          >
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {customer.phone || 'No phone'}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {offlineTotalPages > 1 && (
                      <div className="flex items-center justify-between text-sm text-gray-600 pt-1">
                        <button
                          onClick={() => setOfflinePage((prev) => Math.max(1, prev - 1))}
                          disabled={currentOfflinePage === 1}
                          className="px-3 py-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="font-medium">
                          Page {currentOfflinePage} of {offlineTotalPages}
                        </span>
                        <button
                          onClick={() => setOfflinePage((prev) => Math.min(offlineTotalPages, prev + 1))}
                          disabled={currentOfflinePage === offlineTotalPages}
                          className="px-3 py-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <User size={22} />
                        {selectedCustomer.name || 'Customer'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedCustomer.type ? `${selectedCustomer.type} customer` : 'Customer details summary'}
                      </p>
                      {selectedCustomer.phone && (
                        <p className="text-sm text-gray-500 mt-1">Phone: {selectedCustomer.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 justify-end items-center">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCustomerHistoryPage(1)}
                        className="text-sm"
                      >
                        Refresh Summary
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowCustomerHistoryModal(true)}
                        className="text-sm flex items-center gap-2"
                      >
                        <History size={18} />
                        View Full History
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => {
          setIsAddCustomerOpen(false);
          setNewCustomerForm({ name: '', type: 'offline', phone: '', address: '' });
        }}
        title="Add New Customer"
      >
        <form onSubmit={handleCreateCustomerFromBilling} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              required
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              required
              value={newCustomerForm.type}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, type: e.target.value })}
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
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
            <textarea
              rows={3}
              value={newCustomerForm.address}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button type="submit" className="flex-1">
              Create Customer
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddCustomerOpen(false);
                setNewCustomerForm({ name: '', type: 'offline', phone: '', address: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer history modal */}
      <Modal
        isOpen={showCustomerHistoryModal}
        onClose={() => {
          setShowCustomerHistoryModal(false);
          setSelectedHistoryBill(null);
        }}
        title={selectedCustomer ? `Billing History - ${selectedCustomer.name}` : 'Billing History'}
      >
        {!selectedCustomer ? (
          <div className="text-sm text-gray-600">Select a customer to view history.</div>
        ) : customerHistoryBills.length === 0 ? (
          <div className="text-sm text-gray-600">No bills found for this customer.</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Bill #</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Items</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Total</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Paid</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Remaining</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerHistoryBills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-blue-700 font-semibold">{bill.billNumber}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {new Date(bill.createdAt).toLocaleString('en-PK')}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-700">{bill.items?.length || 0}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">Rs. {Number(bill.total || 0).toLocaleString('en-PK')}</td>
                      <td className="px-4 py-2 text-right text-emerald-700">Rs. {Number(bill.amountPaid || 0).toLocaleString('en-PK')}</td>
                      <td className="px-4 py-2 text-right text-rose-700">Rs. {Number(bill.remainingAmount || 0).toLocaleString('en-PK')}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryBill(bill)}
                          className="text-xs px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedHistoryBill && (
              <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">
                      Bill #{selectedHistoryBill.billNumber}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {new Date(selectedHistoryBill.createdAt).toLocaleString('en-PK')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-600 text-right">
                    <div>
                      Total: <span className="font-semibold text-gray-900">Rs. {Number(selectedHistoryBill.total || 0).toLocaleString('en-PK')}</span>
                    </div>
                    <div>
                      Paid: <span className="font-semibold text-emerald-700">Rs. {Number(selectedHistoryBill.amountPaid || 0).toLocaleString('en-PK')}</span>
                    </div>
                    <div>
                      Remaining: <span className="font-semibold text-rose-700">Rs. {Number(selectedHistoryBill.remainingAmount || 0).toLocaleString('en-PK')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 border-t border-gray-200 pt-2 max-h-56 overflow-y-auto bg-white rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-700">Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700">Unit</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedHistoryBill.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1 text-gray-800">
                            <div className="font-medium">{item.name}</div>
                            {item.model && (
                              <div className="text-[11px] text-gray-500">Model: {item.model}</div>
                            )}
                          </td>
                          <td className="px-3 py-1 text-center text-gray-700">{item.quantity}</td>
                          <td className="px-3 py-1 text-right text-gray-700">Rs. {Number(item.selectedPrice || 0).toLocaleString('en-PK')}</td>
                          <td className="px-3 py-1 text-right font-semibold text-gray-900">Rs. {Number(item.totalAmount || (item.selectedPrice || 0) * (item.quantity || 0)).toLocaleString('en-PK')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {customerStats && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">Total Billed</span>
                  <span className="font-semibold text-gray-900">
                    Rs. {Number(customerStats.totalAmount || 0).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-semibold text-emerald-700">
                    Rs. {Number(customerStats.totalPaid || 0).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">Total Remaining</span>
                  <span className="font-semibold text-rose-700">
                    Rs. {Number(customerStats.totalRemaining || 0).toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            )}

            {customerHistoryPagination && customerHistoryPagination.pages > 1 && (
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div>
                  Page {customerHistoryPagination.current} of {customerHistoryPagination.pages} ({customerHistoryPagination.total} bills)
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerHistoryPage((prev) => Math.max(1, prev - 1))}
                    disabled={customerHistoryPagination.current === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerHistoryPage((prev) => Math.min(customerHistoryPagination.pages, prev + 1))}
                    disabled={customerHistoryPagination.current === customerHistoryPagination.pages}
                    className="px-3 py-1 border border-gray-300 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Bill Receipt Modal */}
      {showReceipt && generatedBill && (
        <BillReceipt
          bill={generatedBill}
          onClose={() => {
            setShowReceipt(false);
            setGeneratedBill(null);
          }}
          onPrint={() => {
            window.print();
          }}
        />
      )}
    </div>
  );
};

export default Billing;