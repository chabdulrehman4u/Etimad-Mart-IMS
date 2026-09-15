import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  LayoutDashboard,
  Send,
  Truck,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Clock,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Download,
  Building2,
  Package,
  Calendar,
  Phone,
  CreditCard,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Edit,
  Trash2,
  Lock,
} from 'lucide-react';
import {
  getSellers,
  createSeller,
  updateSeller,
  deleteSeller,
  getProducts,
  getBanks,
  getPettyCash,
  createSellerDispatch,
  getSellerDispatches,
  updateSellerDeliveryStatus,
  restoreSellerReturnedStock,
  confirmSellerPayment,
  settleSellerPayout,
  recordSellerRemittance,
  getSellerFinancialSummary,
  getSellerLedger,
  getSellerReports,
  getDashboardAlerts,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import SearchableSelect from '../../components/SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/exportUtils';

const COURIER_OPTIONS = [
  'Leopards',
  'TCS',
  'Pakistan Post',
  'Trax',
  'MNP',
  'Call Courier',
  'PostEx',
  'Other',
];

const COLLECTION_METHODS = [
  { id: 'courier_to_etimad', label: 'Courier → Etimad Account', desc: 'Courier deposits COD into Etimad account. Etimad owes seller margin.' },
  { id: 'seller_collection', label: 'Seller Collects COD (Post Office)', desc: 'Seller receives cash directly. Seller owes Etimad product cost.' },
  { id: 'office_cash', label: 'Office / Walk-in Cash → Etimad', desc: 'Cash paid at Etimad office. Etimad owes seller margin.' },
];

const DELIVERY_STATUSES = [
  { id: 'dispatched', label: 'Dispatched', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'in_transit', label: 'In Transit', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'returned', label: 'Returned', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'damaged', label: 'Damaged', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-800 border-slate-200' },
];

const SellerWorkspace = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'dispatch', 'parcels', 'settlements', 'reports', 'roster'

  // Common Queries
  const { data: sellers = [], isLoading: isSellersLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const res = await getSellers();
      return res.data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return res.data || [];
    },
  });

  const { data: banksData = { accounts: [] } } = useQuery({
    queryKey: ['financeBanks'],
    queryFn: async () => {
      const res = await getBanks();
      return res.data || { accounts: [] };
    },
  });

  const { data: pettyCashData = { currentPettyCash: 0 } } = useQuery({
    queryKey: ['financePettyCash'],
    queryFn: async () => {
      const res = await getPettyCash();
      return res.data || { currentPettyCash: 0 };
    },
  });

  const { data: summaries = [], isLoading: isSummariesLoading } = useQuery({
    queryKey: ['sellerSummary'],
    queryFn: async () => {
      const res = await getSellerFinancialSummary();
      return res.data || [];
    },
  });

  const { data: alerts = { paymentPendingCount: 0, sellerCollectionPendingCount: 0, unitsOutside: 0, pendingReturnsCount: 0 } } = useQuery({
    queryKey: ['sellerAlerts'],
    queryFn: async () => {
      const res = await getDashboardAlerts();
      return res.data || {};
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sellerSummary'] });
    queryClient.invalidateQueries({ queryKey: ['sellerAlerts'] });
    queryClient.invalidateQueries({ queryKey: ['sellerDispatches'] });
    queryClient.invalidateQueries({ queryKey: ['sellerLedger'] });
    queryClient.invalidateQueries({ queryKey: ['sellerReports'] });
    queryClient.invalidateQueries({ queryKey: ['sellers'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
    queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
  };

  // -------------------------------------------------------------
  // TAB 2: DISPATCH PRODUCT FORM STATE
  // -------------------------------------------------------------
  const [dispatchForm, setDispatchForm] = useState({
    sellerId: '',
    productId: '',
    quantity: 1,
    customerSaleAmount: '',
    etimadCostAtDispatch: '',
    costOverridden: false,
    courier: 'Leopards',
    customCourier: '',
    trackingNumber: '',
    dispatchDate: new Date().toISOString().slice(0, 10),
    collectionMethod: 'courier_to_etimad',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
  });

  const selectedProduct = useMemo(() => {
    if (!dispatchForm.productId) return null;
    return products.find((p) => String(p._id) === String(dispatchForm.productId));
  }, [products, dispatchForm.productId]);

  const handleProductSelect = (pId) => {
    const prod = products.find((p) => String(p._id) === String(pId));
    if (prod) {
      const defaultCost = Number(prod.originalPrice || 0);
      setDispatchForm((prev) => ({
        ...prev,
        productId: prod._id,
        etimadCostAtDispatch: defaultCost,
        costOverridden: false,
      }));
    } else {
      setDispatchForm((prev) => ({ ...prev, productId: '', etimadCostAtDispatch: '' }));
    }
  };

  const dispatchCalculations = useMemo(() => {
    const qty = Math.max(1, Number(dispatchForm.quantity || 1));
    const unitCost = Number(dispatchForm.etimadCostAtDispatch || 0);
    const saleAmt = Number(dispatchForm.customerSaleAmount || 0);
    const totalCost = unitCost * qty;
    const profit = saleAmt - totalCost;
    return { qty, unitCost, totalCost, saleAmt, profit };
  }, [dispatchForm.quantity, dispatchForm.etimadCostAtDispatch, dispatchForm.customerSaleAmount]);

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!dispatchForm.sellerId) return toast.error('Please select a seller');
    if (!dispatchForm.productId) return toast.error('Please select a product');
    if (!dispatchForm.trackingNumber.trim()) return toast.error('CN / Tracking Number is required');
    if (dispatchCalculations.saleAmt <= 0) return toast.error('Please enter a valid Customer Sale Amount');

    const courierName = dispatchForm.courier === 'Other'
      ? dispatchForm.customCourier.trim() || 'Other'
      : dispatchForm.courier;

    try {
      await createSellerDispatch({
        sellerId: dispatchForm.sellerId,
        productId: dispatchForm.productId,
        quantity: dispatchCalculations.qty,
        customerSaleAmount: dispatchCalculations.saleAmt,
        etimadCostAtDispatch: dispatchCalculations.unitCost,
        courier: courierName,
        trackingNumber: dispatchForm.trackingNumber.trim().toUpperCase(),
        dispatchDate: dispatchForm.dispatchDate,
        collectionMethod: dispatchForm.collectionMethod,
        customerName: dispatchForm.customerName,
        customerPhone: dispatchForm.customerPhone,
        customerAddress: dispatchForm.customerAddress,
        notes: dispatchForm.notes,
      });

      toast.success('Product dispatched successfully! Main inventory updated.');
      setDispatchForm({
        sellerId: dispatchForm.sellerId, // keep seller for fast repeated entry
        productId: '',
        quantity: 1,
        customerSaleAmount: '',
        etimadCostAtDispatch: '',
        costOverridden: false,
        courier: dispatchForm.courier,
        customCourier: '',
        trackingNumber: '',
        dispatchDate: new Date().toISOString().slice(0, 10),
        collectionMethod: dispatchForm.collectionMethod,
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        notes: '',
      });
      invalidateAll();
      setActiveTab('parcels');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to dispatch product');
    }
  };

  // -------------------------------------------------------------
  // TAB 3: PARCELS & TRACKING STATE
  // -------------------------------------------------------------
  const [parcelFilters, setParcelFilters] = useState({
    sellerId: 'all',
    courier: 'all',
    deliveryStatus: 'all',
    paymentStatus: 'all',
    collectionMethod: 'all',
    search: '',
    page: 1,
  });

  const { data: dispatchesData = { dispatches: [], total: 0, page: 1, totalPages: 1 }, isLoading: isDispatchesLoading } = useQuery({
    queryKey: ['sellerDispatches', parcelFilters],
    queryFn: async () => {
      const params = {
        page: parcelFilters.page,
        limit: 25,
        ...(parcelFilters.sellerId !== 'all' && { sellerId: parcelFilters.sellerId }),
        ...(parcelFilters.courier !== 'all' && { courier: parcelFilters.courier }),
        ...(parcelFilters.deliveryStatus !== 'all' && { deliveryStatus: parcelFilters.deliveryStatus }),
        ...(parcelFilters.paymentStatus !== 'all' && { paymentStatus: parcelFilters.paymentStatus }),
        ...(parcelFilters.collectionMethod !== 'all' && { collectionMethod: parcelFilters.collectionMethod }),
        ...(parcelFilters.search && { search: parcelFilters.search }),
      };
      const res = await getSellerDispatches(params);
      return res.data || { dispatches: [], total: 0, page: 1, totalPages: 1 };
    },
  });

  // Action Modals
  const [statusModal, setStatusModal] = useState({ isOpen: false, dispatch: null, deliveryStatus: '', notes: '' });
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    dispatch: null,
    amountReceived: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentAccount: 'cash',
    bankAccountId: '',
    reference: '',
    notes: '',
  });
  const [returnStockModal, setReturnStockModal] = useState({ isOpen: false, dispatch: null, notes: '' });

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSellerDeliveryStatus(statusModal.dispatch._id, {
        deliveryStatus: statusModal.deliveryStatus,
        notes: statusModal.notes,
      });
      toast.success(`Status updated to ${statusModal.deliveryStatus.toUpperCase()}`);
      setStatusModal({ isOpen: false, dispatch: null, deliveryStatus: '', notes: '' });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConfirmPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await confirmSellerPayment(paymentModal.dispatch._id, {
        amountReceived: Number(paymentModal.amountReceived || paymentModal.dispatch.customerSaleAmount),
        paymentDate: paymentModal.paymentDate,
        paymentAccount: paymentModal.paymentAccount,
        bankAccountId: paymentModal.paymentAccount === 'bank' ? paymentModal.bankAccountId : undefined,
        reference: paymentModal.reference,
        notes: paymentModal.notes,
      });
      toast.success('COD payment confirmed & seller ledger updated!');
      setPaymentModal({ isOpen: false, dispatch: null, amountReceived: '', paymentDate: '', paymentAccount: 'cash', bankAccountId: '', reference: '', notes: '' });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm payment');
    }
  };

  const handleRestoreStockSubmit = async (e) => {
    e.preventDefault();
    try {
      await restoreSellerReturnedStock(returnStockModal.dispatch._id, {
        notes: returnStockModal.notes,
      });
      toast.success('Product physically received! Stock restored to Main Inventory.');
      setReturnStockModal({ isOpen: false, dispatch: null, notes: '' });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore stock');
    }
  };

  // -------------------------------------------------------------
  // TAB 4: SETTLEMENTS & REMITTANCES
  // -------------------------------------------------------------
  const [selectedSellerForLedger, setSelectedSellerForLedger] = useState('all');
  const [settleModal, setSettleModal] = useState({
    isOpen: false,
    sellerId: '',
    amount: '',
    paymentMethod: 'cash',
    bankAccountId: '',
    reference: '',
    notes: '',
  });

  const [remittanceModal, setRemittanceModal] = useState({
    isOpen: false,
    sellerId: '',
    amount: '',
    paymentMethod: 'cash',
    bankAccountId: '',
    reference: '',
    notes: '',
  });

  const { data: ledgerData = { transactions: [], total: 0 }, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['sellerLedger', selectedSellerForLedger],
    queryFn: async () => {
      if (selectedSellerForLedger === 'all') return { transactions: [], total: 0 };
      const res = await getSellerLedger({ sellerId: selectedSellerForLedger, limit: 100 });
      return res.data || { transactions: [], total: 0 };
    },
    enabled: selectedSellerForLedger !== 'all',
  });

  const handleSettlePayoutSubmit = async (e) => {
    e.preventDefault();
    if (!settleModal.sellerId) return toast.error('Please select a seller');
    if (!settleModal.amount || Number(settleModal.amount) <= 0) return toast.error('Please enter a valid payout amount');

    try {
      await settleSellerPayout({
        sellerId: settleModal.sellerId,
        amount: Number(settleModal.amount),
        paymentMethod: settleModal.paymentMethod,
        bankAccountId: settleModal.paymentMethod === 'bank' ? settleModal.bankAccountId : undefined,
        reference: settleModal.reference,
        notes: settleModal.notes,
      });
      toast.success('Seller payout recorded successfully!');
      setSettleModal({ isOpen: false, sellerId: '', amount: '', paymentMethod: 'cash', bankAccountId: '', reference: '', notes: '' });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payout');
    }
  };

  const handleRemittanceSubmit = async (e) => {
    e.preventDefault();
    if (!remittanceModal.sellerId) return toast.error('Please select a seller');
    if (!remittanceModal.amount || Number(remittanceModal.amount) <= 0) return toast.error('Please enter a valid remittance amount');

    try {
      await recordSellerRemittance({
        sellerId: remittanceModal.sellerId,
        amount: Number(remittanceModal.amount),
        paymentMethod: remittanceModal.paymentMethod,
        bankAccountId: remittanceModal.paymentMethod === 'bank' ? remittanceModal.bankAccountId : undefined,
        reference: remittanceModal.reference,
        notes: remittanceModal.notes,
      });
      toast.success('Seller COD remittance recorded into Etimad account!');
      setRemittanceModal({ isOpen: false, sellerId: '', amount: '', paymentMethod: 'cash', bankAccountId: '', reference: '', notes: '' });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record remittance');
    }
  };

  // -------------------------------------------------------------
  // TAB 5: REPORTS STATE
  // -------------------------------------------------------------
  const [reportType, setReportType] = useState('seller_sales');
  const [reportSellerId, setReportSellerId] = useState('all');
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  const { data: reportData = [], isLoading: isReportLoading } = useQuery({
    queryKey: ['sellerReports', reportType, reportSellerId, reportDateRange],
    queryFn: async () => {
      const params = {
        reportType,
        ...(reportSellerId !== 'all' && { sellerId: reportSellerId }),
        ...(reportDateRange.start && { startDate: reportDateRange.start }),
        ...(reportDateRange.end && { endDate: reportDateRange.end }),
      };
      const res = await getSellerReports(params);
      return res.data || [];
    },
  });

  const handleExportReport = () => {
    if (!reportData || reportData.length === 0) return toast.error('No report data to export');
    const rows = reportData.map((d) => ({
      'Dispatch #': d.dispatchNumber,
      'Seller': d.sellerId?.name || '-',
      'Product': d.productId?.name || '-',
      'Quantity': d.quantity,
      'Courier': d.courier,
      'Tracking # (CN)': d.trackingNumber,
      'Dispatch Date': d.dispatchDate ? d.dispatchDate.slice(0, 10) : '',
      'Customer Sale (Rs)': d.customerSaleAmount,
      'Etimad Cost (Rs)': d.etimadCostAtDispatch * d.quantity,
      'Seller Profit (Rs)': d.expectedSellerProfit,
      'Collection Method': d.collectionMethod,
      'Delivery Status': d.deliveryStatus,
      'Payment Status': d.paymentStatus,
      'Stock Restored': d.stockRestored ? 'Yes' : 'No',
    }));
    exportToExcel(rows, `Seller_Report_${reportType}_${new Date().toISOString().slice(0, 10)}`);
  };

  // -------------------------------------------------------------
  // TAB 6: ROSTER STATE (Add/Edit Sellers)
  // -------------------------------------------------------------
  const [rosterModal, setRosterModal] = useState({ isOpen: false, editingSeller: null, name: '', phone: '', basicSalary: 0, commissionRate: 5, notes: '', isActive: true });
  const [tempCredsModal, setTempCredsModal] = useState({ isOpen: false, name: '', password: '' });

  const handleSaveRoster = async (e) => {
    e.preventDefault();
    try {
      if (rosterModal.editingSeller) {
        await updateSeller(rosterModal.editingSeller._id, {
          name: rosterModal.name,
          phone: rosterModal.phone,
          basicSalary: Number(rosterModal.basicSalary || 0),
          commissionRate: Number(rosterModal.commissionRate || 0),
          notes: rosterModal.notes,
          isActive: rosterModal.isActive,
        });
        toast.success('Seller updated successfully!');
      } else {
        const res = await createSeller({
          name: rosterModal.name,
          phone: rosterModal.phone,
          basicSalary: Number(rosterModal.basicSalary || 0),
          commissionRate: Number(rosterModal.commissionRate || 0),
          notes: rosterModal.notes,
        });
        toast.success('Seller added successfully!');
        if (res.data?.temporaryPassword) {
          setTempCredsModal({
            isOpen: true,
            name: rosterModal.name,
            password: res.data.temporaryPassword,
          });
        }
      }
      setRosterModal({ isOpen: false, editingSeller: null, name: '', phone: '', basicSalary: 0, commissionRate: 5, notes: '', isActive: true });
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save seller');
    }
  };

  const handleDeleteSeller = async (seller) => {
    if (!window.confirm(`Are you sure you want to remove seller "${seller.name}"?`)) return;
    try {
      await deleteSeller(seller._id);
      toast.success('Seller removed successfully');
      invalidateAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove seller');
    }
  };

  // -------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------
  const formatRs = (val) => `Rs. ${Number(val || 0).toLocaleString('en-PK')}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Seller Dispatch & Settlements</h1>
              <p className="text-xs text-slate-500 font-medium">
                Reseller product dispatches, courier COD reconciliation, and separate payable/receivable ledgers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setActiveTab('dispatch')}
            className="flex items-center gap-2 shadow-md"
          >
            <Send size={16} />
            Dispatch Product
          </Button>
          <Button
            variant="secondary"
            onClick={invalidateAll}
            className="flex items-center gap-1.5"
            title="Refresh All Data"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-xl text-xs font-bold border border-slate-300">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'dashboard'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <LayoutDashboard size={15} />
          Dashboard & Alerts
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'dispatch'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Send size={15} />
          Dispatch Product
        </button>
        <button
          onClick={() => setActiveTab('parcels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'parcels'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Truck size={15} />
          Parcels & Tracking
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'settlements'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <DollarSign size={15} />
          Settlements & Ledgers
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'reports'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <FileText size={15} />
          Reports
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'roster'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Users size={15} />
          Seller Roster
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DASHBOARD & ALERTS */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Actionable Alert Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-amber-500 rounded-lg text-white mt-0.5">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase">Payment Pending</p>
                <p className="text-2xl font-black text-amber-950 mt-1">{alerts.paymentPendingCount}</p>
                <p className="text-[11px] text-amber-700 font-medium">Delivered parcels awaiting COD receipt confirmation</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-rose-500 rounded-lg text-white mt-0.5">
                <ArrowDownLeft size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-900 uppercase">Seller Collections</p>
                <p className="text-2xl font-black text-rose-950 mt-1">{alerts.sellerCollectionPendingCount}</p>
                <p className="text-[11px] text-rose-700 font-medium">Parcels where seller collected COD & owes Etimad</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-blue-500 rounded-lg text-white mt-0.5">
                <Package size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase">Stock With Sellers</p>
                <p className="text-2xl font-black text-blue-950 mt-1">{alerts.unitsOutside} units</p>
                <p className="text-[11px] text-blue-700 font-medium">Allocated units currently outside main inventory</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-purple-500 rounded-lg text-white mt-0.5">
                <RotateCcw size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-900 uppercase">Pending Returns</p>
                <p className="text-2xl font-black text-purple-950 mt-1">{alerts.pendingReturnsCount}</p>
                <p className="text-[11px] text-purple-700 font-medium">Returned parcels awaiting physical receipt at office</p>
              </div>
            </div>
          </div>

          {/* Seller Cards */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Sellers Overview & Real-Time Balances
            </h2>

            {summaries.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                No sellers found. Add sellers in the "Seller Roster" tab to begin dispatching products.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {summaries.map((s) => {
                  const b = s.balances || {};
                  return (
                    <div
                      key={s.seller._id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 space-y-4"
                    >
                      {/* Seller Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-black flex items-center justify-center text-base">
                            {s.seller.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{s.seller.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone size={11} /> {s.seller.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.seller.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {s.seller.isActive ? 'Active Seller' : 'Inactive'}
                        </span>
                      </div>

                      {/* Dispatches & Stock Mini Bar */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Dispatched</p>
                          <p className="font-bold text-slate-900 text-sm mt-0.5">{s.dispatches.total}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-amber-700 uppercase">In Transit</p>
                          <p className="font-bold text-amber-700 text-sm mt-0.5">{s.dispatches.inTransit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-700 uppercase">Delivered</p>
                          <p className="font-bold text-emerald-700 text-sm mt-0.5">{s.dispatches.delivered}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-rose-700 uppercase">Returned</p>
                          <p className="font-bold text-rose-700 text-sm mt-0.5">{s.dispatches.returned}</p>
                        </div>
                      </div>

                      {/* Separate Accounting Balances */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* 🟢 Seller Payable */}
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase">
                            <ArrowUpRight size={13} />
                            <span>Etimad Owes {s.seller.name}</span>
                          </div>
                          <p className="text-lg font-black text-emerald-900 mt-1">
                            {formatRs(b.currentPayable)}
                          </p>
                          <p className="text-[10px] text-emerald-700 mt-0.5">
                            Earned: {formatRs(b.totalEarningPayable)} | Paid: {formatRs(b.totalSellerPayouts)}
                          </p>
                        </div>

                        {/* 🔴 Seller Receivable */}
                        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 text-rose-800 text-[11px] font-bold uppercase">
                            <ArrowDownLeft size={13} />
                            <span>{s.seller.name} Owes Etimad</span>
                          </div>
                          <p className="text-lg font-black text-rose-900 mt-1">
                            {formatRs(b.currentReceivable)}
                          </p>
                          <p className="text-[10px] text-rose-700 mt-0.5">
                            COD Incurred: {formatRs(b.totalReceivableIncurred)} | Remitted: {formatRs(b.totalSellerRemittances)}
                          </p>
                        </div>
                      </div>

                      {/* Net Position */}
                      <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs font-semibold">
                        <span className="text-slate-600">Net Balance Position:</span>
                        {b.netBalance >= 0 ? (
                          <span className="text-emerald-700 font-black">
                            🟢 Etimad owes {s.seller.name} {formatRs(b.netBalance)}
                          </span>
                        ) : (
                          <span className="text-rose-700 font-black">
                            🔴 {s.seller.name} owes Etimad {formatRs(Math.abs(b.netBalance))}
                          </span>
                        )}
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            setSettleModal({
                              isOpen: true,
                              sellerId: s.seller._id,
                              amount: b.currentPayable > 0 ? b.currentPayable : '',
                              paymentMethod: 'cash',
                              bankAccountId: '',
                              reference: '',
                              notes: '',
                            });
                          }}
                          className="flex-1 text-xs"
                        >
                          Pay / Settle
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRemittanceModal({
                              isOpen: true,
                              sellerId: s.seller._id,
                              amount: b.currentReceivable > 0 ? b.currentReceivable : '',
                              paymentMethod: 'cash',
                              bankAccountId: '',
                              reference: '',
                              notes: '',
                            });
                          }}
                          className="flex-1 text-xs"
                        >
                          Receive COD Remittance
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedSellerForLedger(s.seller._id);
                            setActiveTab('settlements');
                          }}
                          className="text-xs"
                        >
                          Ledger
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DISPATCH PRODUCT TO SELLER */}
      {/* ========================================================= */}
      {activeTab === 'dispatch' && (
        <Card className="max-w-4xl mx-auto shadow-md">
          <CardHeader className="border-b bg-slate-50/80">
            <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
              <Send size={18} className="text-blue-600" />
              Dispatch Product to Seller / Book Courier Parcel
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Main inventory will be safely decremented upon dispatch. A permanent price snapshot will be recorded.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleDispatchSubmit} className="space-y-5">
              {/* Row 1: Seller & Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Seller / Reseller <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dispatchForm.sellerId}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, sellerId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Seller (Ali, Bilal, etc.) --</option>
                    {sellers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Product from Main Stock <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={products}
                    value={dispatchForm.productId}
                    onChange={handleProductSelect}
                    placeholder="Search product by name, model, barcode..."
                    displayField="name"
                    valueField="_id"
                    searchFields={['name', 'model', 'category', 'barcode']}
                    renderOption={(p) => (
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold">{p.name}</span>
                          {p.model && <span className="text-slate-500 ml-1">({p.model})</span>}
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Stock: {p.stock || 0} • Cost: Rs. {p.originalPrice || 0}
                        </span>
                      </div>
                    )}
                  />
                  {selectedProduct && (
                    <div className="flex justify-between items-center text-[11px] text-slate-600 mt-1 px-1">
                      <span>Available Main Stock: <strong className="text-blue-600 font-bold">{selectedProduct.stock || 0} units</strong></span>
                      <span>Default Landed Cost: <strong>Rs. {selectedProduct.originalPrice || 0}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Quantity, Customer Amount, Etimad Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stock : 9999}
                    value={dispatchForm.quantity}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, quantity: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Customer Sale Price (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dispatchForm.customerSaleAmount}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, customerSaleAmount: e.target.value })}
                    placeholder="e.g. 2499"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Etimad Unit Cost (Rs.) <span className="text-red-500">*</span>
                    </label>
                    {dispatchForm.costOverridden && (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                        Admin Override
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dispatchForm.etimadCostAtDispatch}
                    onChange={(e) =>
                      setDispatchForm({
                        ...dispatchForm,
                        etimadCostAtDispatch: e.target.value,
                        costOverridden: true,
                      })
                    }
                    placeholder="e.g. 1250"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Profit Preview Banner */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs flex flex-wrap justify-between items-center gap-2">
                <span className="text-blue-900 font-medium">
                  Total Customer Sale: <strong className="text-slate-900 font-black">{formatRs(dispatchCalculations.saleAmt)}</strong>
                </span>
                <span className="text-blue-900 font-medium">
                  Total Etimad Cost: <strong className="text-slate-900 font-black">{formatRs(dispatchCalculations.totalCost)}</strong>
                </span>
                <span className="text-emerald-900 font-bold bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Expected Seller Earning: {formatRs(dispatchCalculations.profit)}
                </span>
              </div>

              {/* Row 3: Courier & Tracking Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Courier Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dispatchForm.courier}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, courier: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {dispatchForm.courier === 'Other' && (
                    <input
                      type="text"
                      value={dispatchForm.customCourier}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, customCourier: e.target.value })}
                      placeholder="Enter courier name"
                      className="w-full mt-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    CN / Tracking Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dispatchForm.trackingNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
                    placeholder="e.g. 123456789 / ABC123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Dispatch Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dispatchForm.dispatchDate}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Payment Collection Method (Critical Concept) */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  Payment Collection Method & Destination *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {COLLECTION_METHODS.map((m) => (
                    <label
                      key={m.id}
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition ${
                        dispatchForm.collectionMethod === m.id
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="collectionMethod"
                          value={m.id}
                          checked={dispatchForm.collectionMethod === m.id}
                          onChange={(e) => setDispatchForm({ ...dispatchForm, collectionMethod: e.target.value })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-bold text-xs text-slate-900">{m.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">{m.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={dispatchForm.customerName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, customerName: e.target.value })}
                    placeholder="Customer Name"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Phone (Optional)</label>
                  <input
                    type="text"
                    value={dispatchForm.customerPhone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, customerPhone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer City/Address (Optional)</label>
                  <input
                    type="text"
                    value={dispatchForm.customerAddress}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, customerAddress: e.target.value })}
                    placeholder="Lahore / Karachi..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dispatch Notes</label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  placeholder="Optional remarks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button type="submit" variant="primary" className="px-6 py-2.5 flex items-center gap-2">
                  <Send size={16} />
                  Confirm & Dispatch Product
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PARCELS & TRACKING LEDGER */}
      {/* ========================================================= */}
      {activeTab === 'parcels' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Search CN / Customer</label>
                <input
                  type="text"
                  value={parcelFilters.search}
                  onChange={(e) => setParcelFilters({ ...parcelFilters, search: e.target.value, page: 1 })}
                  placeholder="Search CN, phone..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Seller</label>
                <select
                  value={parcelFilters.sellerId}
                  onChange={(e) => setParcelFilters({ ...parcelFilters, sellerId: e.target.value, page: 1 })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Sellers</option>
                  {sellers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Courier</label>
                <select
                  value={parcelFilters.courier}
                  onChange={(e) => setParcelFilters({ ...parcelFilters, courier: e.target.value, page: 1 })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Couriers</option>
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Delivery Status</label>
                <select
                  value={parcelFilters.deliveryStatus}
                  onChange={(e) => setParcelFilters({ ...parcelFilters, deliveryStatus: e.target.value, page: 1 })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Delivery Statuses</option>
                  {DELIVERY_STATUSES.map((st) => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Payment Status</label>
                <select
                  value={parcelFilters.paymentStatus}
                  onChange={(e) => setParcelFilters({ ...parcelFilters, paymentStatus: e.target.value, page: 1 })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="received">Payment Received</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Collection Mode</label>
                <select
                  value={parcelFilters.collectionMethod}
                  onChange={(e) => setParcelFilters({ ...parcelFilters, collectionMethod: e.target.value, page: 1 })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Collection Modes</option>
                  <option value="courier_to_etimad">Courier → Etimad</option>
                  <option value="seller_collection">Seller Collects</option>
                  <option value="office_cash">Office Cash</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left">Date / Dispatch #</th>
                    <th className="px-3 py-3 text-left">Seller</th>
                    <th className="px-3 py-3 text-left">Product</th>
                    <th className="px-3 py-3 text-left">Courier & CN</th>
                    <th className="px-3 py-3 text-right">Sale Amount</th>
                    <th className="px-3 py-3 text-right">Etimad Cost</th>
                    <th className="px-3 py-3 text-right">Seller Margin</th>
                    <th className="px-3 py-3 text-center">Collection Mode</th>
                    <th className="px-3 py-3 text-center">Delivery Status</th>
                    <th className="px-3 py-3 text-center">Payment Status</th>
                    <th className="px-3 py-3 text-center">Physical Stock</th>
                    <th className="px-3 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchesData.dispatches.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-slate-500 italic">
                        No dispatches found matching filters.
                      </td>
                    </tr>
                  ) : (
                    dispatchesData.dispatches.map((d) => {
                      const st = DELIVERY_STATUSES.find((s) => s.id === d.deliveryStatus) || { label: d.deliveryStatus, color: 'bg-slate-100 text-slate-800' };
                      return (
                        <tr key={d._id} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2.5 font-mono text-[11px]">
                            <div>{d.dispatchDate ? d.dispatchDate.slice(0, 10) : '-'}</div>
                            <div className="text-slate-400 text-[10px]">{d.dispatchNumber}</div>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            {d.sellerId?.name || 'Unknown'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-800">{d.productId?.name}</div>
                            <div className="text-[10px] text-slate-500">{d.quantity} unit(s)</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-700">{d.courier}</div>
                            <div className="font-mono text-[11px] font-bold text-blue-700 tracking-wider">
                              {d.trackingNumber}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-slate-900">
                            {formatRs(d.customerSaleAmount)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-600 font-semibold">
                            {formatRs(d.etimadCostAtDispatch * d.quantity)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                            {formatRs(d.expectedSellerProfit)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {d.collectionMethod === 'courier_to_etimad' ? 'Courier → Etimad' : d.collectionMethod === 'seller_collection' ? 'Seller Collects' : 'Office Cash'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              d.paymentStatus === 'received'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {d.paymentStatus === 'received' ? 'Received' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.stockRestored ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 justify-center">
                                <CheckCircle size={10} /> Restored
                              </span>
                            ) : d.deliveryStatus === 'returned' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                Awaiting Office
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {d.physicalStockStatus.replace(/_/g, ' ')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* 1. Update Status Button */}
                              <button
                                type="button"
                                onClick={() => setStatusModal({ isOpen: true, dispatch: d, deliveryStatus: d.deliveryStatus, notes: '' })}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                                title="Update Delivery Status"
                              >
                                Status
                              </button>

                              {/* 2. Confirm Payment Button (Delivered + Pending) */}
                              {d.deliveryStatus === 'delivered' && d.paymentStatus === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentModal({
                                    isOpen: true,
                                    dispatch: d,
                                    amountReceived: d.customerSaleAmount,
                                    paymentDate: new Date().toISOString().slice(0, 10),
                                    paymentAccount: 'cash',
                                    bankAccountId: '',
                                    reference: '',
                                    notes: '',
                                  })}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition shadow-sm"
                                  title="Confirm Payment Received"
                                >
                                  Pay COD
                                </button>
                              )}

                              {/* 3. Product Received / Restore Stock (Returned + not restored) */}
                              {d.deliveryStatus === 'returned' && !d.stockRestored && (
                                <button
                                  type="button"
                                  onClick={() => setReturnStockModal({ isOpen: true, dispatch: d, notes: '' })}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold transition shadow-sm flex items-center gap-1"
                                  title="Physically Received at Office -> Restore Main Stock"
                                >
                                  <RotateCcw size={11} /> Stock +{d.quantity}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {dispatchesData.totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 flex justify-center">
                <Pagination
                  currentPage={dispatchesData.page}
                  totalPages={dispatchesData.totalPages}
                  onPageChange={(p) => setParcelFilters({ ...parcelFilters, page: p })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SETTLEMENTS & REMITTANCES */}
      {/* ========================================================= */}
      {activeTab === 'settlements' && (
        <div className="space-y-5">
          {/* Quick Actions & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-700">Filter Ledger by Seller:</label>
              <select
                value={selectedSellerForLedger}
                onChange={(e) => setSelectedSellerForLedger(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
              >
                <option value="all">-- Select a Seller to View Transactions --</option>
                {sellers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="success"
                size="sm"
                onClick={() => setSettleModal({
                  isOpen: true,
                  sellerId: selectedSellerForLedger !== 'all' ? selectedSellerForLedger : '',
                  amount: '',
                  paymentMethod: 'cash',
                  bankAccountId: '',
                  reference: '',
                  notes: '',
                })}
                className="flex items-center gap-1.5 text-xs shadow-sm"
              >
                <ArrowUpRight size={14} />
                Pay / Settle Seller
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setRemittanceModal({
                  isOpen: true,
                  sellerId: selectedSellerForLedger !== 'all' ? selectedSellerForLedger : '',
                  amount: '',
                  paymentMethod: 'cash',
                  bankAccountId: '',
                  reference: '',
                  notes: '',
                })}
                className="flex items-center gap-1.5 text-xs shadow-sm"
              >
                <ArrowDownLeft size={14} />
                Receive Seller COD Remittance
              </Button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Transaction History & Audit Ledger
            </div>
            {selectedSellerForLedger === 'all' ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                Please choose a seller from the dropdown above to view their detailed transaction ledger.
              </div>
            ) : ledgerData.transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No financial transactions recorded for this seller yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Date / TXN ID</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5 text-center">Payment Method</th>
                      <th className="px-3 py-2.5 text-left">Linked CN / Parcel</th>
                      <th className="px-3 py-2.5 text-left">Description / Notes</th>
                      <th className="px-3 py-2.5 text-left">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerData.transactions.map((t) => {
                      const isPayableCredit = t.type === 'EARNING_PAYABLE';
                      const isPayout = t.type === 'SELLER_PAYOUT';
                      const isReceivableDebit = t.type === 'SELLER_RECEIVABLE_INCURRED';
                      const isRemittance = t.type === 'SELLER_REMITTANCE';

                      return (
                        <tr key={t._id} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2 font-mono text-[11px]">
                            <div>{t.date ? t.date.slice(0, 10) : '-'}</div>
                            <div className="text-[10px] text-slate-400">{t.transactionId}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isPayableCredit ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              isPayout ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              isReceivableDebit ? 'bg-rose-100 text-rose-800 border-rose-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {t.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right font-black ${
                            isPayableCredit || isRemittance ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isPayout || isReceivableDebit ? '-' : '+'} {formatRs(t.amount)}
                          </td>
                          <td className="px-3 py-2 text-center uppercase font-bold text-[10px] text-slate-600">
                            {t.paymentMethod} {t.bankAccountId?.bankName ? `(${t.bankAccountId.bankName})` : ''}
                          </td>
                          <td className="px-3 py-2 font-mono text-blue-700 font-bold">
                            {t.dispatchId?.trackingNumber ? `${t.dispatchId.trackingNumber} (${t.dispatchId.courier})` : '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{t.notes || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{t.createdBy?.name || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: REPORTS */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Report Type:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="seller_sales">Seller Sales & Earnings Overview</option>
                  <option value="courier_payment_pending">Courier Payment Pending (Delivered)</option>
                  <option value="seller_collection_pending">Seller Collection Pending (Seller COD)</option>
                  <option value="stock_with_sellers">Stock Allocated With Sellers</option>
                  <option value="returned_stock_pending">Returned Stock Pending Physical Receipt</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Filter Seller:</label>
                <select
                  value={reportSellerId}
                  onChange={(e) => setReportSellerId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="all">All Sellers</option>
                  {sellers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date:</label>
                <input
                  type="date"
                  value={reportDateRange.start}
                  onChange={(e) => setReportDateRange({ ...reportDateRange, start: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date:</label>
                <input
                  type="date"
                  value={reportDateRange.end}
                  onChange={(e) => setReportDateRange({ ...reportDateRange, end: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportReport}
              className="flex items-center gap-1.5 text-xs self-end md:self-auto"
            >
              <Download size={14} />
              Export to Excel
            </Button>
          </div>

          {/* Report Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
              <span>Report Results ({reportData.length} entries)</span>
            </div>
            {reportData.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No records found for this report criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Date / Dispatch</th>
                      <th className="px-3 py-2.5 text-left">Seller</th>
                      <th className="px-3 py-2.5 text-left">Product</th>
                      <th className="px-3 py-2.5 text-left">Courier & CN</th>
                      <th className="px-3 py-2.5 text-right">Customer Sale</th>
                      <th className="px-3 py-2.5 text-right">Etimad Cost</th>
                      <th className="px-3 py-2.5 text-right">Seller Earning</th>
                      <th className="px-3 py-2.5 text-center">Collection Mode</th>
                      <th className="px-3 py-2.5 text-center">Delivery Status</th>
                      <th className="px-3 py-2.5 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((d) => (
                      <tr key={d._id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-[11px]">{d.dispatchDate ? d.dispatchDate.slice(0, 10) : '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{d.sellerId?.name}</td>
                        <td className="px-3 py-2">{d.productId?.name} ({d.quantity}x)</td>
                        <td className="px-3 py-2 font-mono font-semibold text-blue-700">{d.trackingNumber} ({d.courier})</td>
                        <td className="px-3 py-2 text-right font-bold">{formatRs(d.customerSaleAmount)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatRs(d.etimadCostAtDispatch * d.quantity)}</td>
                        <td className="px-3 py-2 text-right font-black text-emerald-700">{formatRs(d.expectedSellerProfit)}</td>
                        <td className="px-3 py-2 text-center text-[10px] uppercase">{d.collectionMethod.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-center uppercase font-bold text-[10px]">{d.deliveryStatus}</td>
                        <td className="px-3 py-2 text-center uppercase font-bold text-[10px]">{d.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: SELLER ROSTER (Add & Manage Sellers) */}
      {/* ========================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="font-black text-slate-900 text-sm">Active Office Sellers / Resellers</h2>
              <p className="text-xs text-slate-500">Manage seller profiles, contact information, and joining records</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setRosterModal({ isOpen: true, editingSeller: null, name: '', phone: '', basicSalary: 0, commissionRate: 5, notes: '', isActive: true })}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus size={14} /> Add New Seller
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Seller Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Joining Date</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                      No sellers found. Add your first seller (Ali, Bilal, etc.) using the button above.
                    </td>
                  </tr>
                ) : (
                  sellers.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900 text-sm">{s.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{s.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{s.joiningDate ? s.joiningDate.slice(0, 10) : s.createdAt?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-slate-600">{s.notes || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRosterModal({
                              isOpen: true,
                              editingSeller: s,
                              name: s.name,
                              phone: s.phone || '',
                              basicSalary: s.basicSalary || 0,
                              commissionRate: s.commissionRate || 5,
                              notes: s.notes || '',
                              isActive: s.isActive !== false,
                            })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Seller"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSeller(s)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Seller"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* 1. UPDATE DELIVERY STATUS MODAL */}
      <Modal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, dispatch: null, deliveryStatus: '', notes: '' })}
        title={`Update Delivery Status — ${statusModal.dispatch?.trackingNumber || ''}`}
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">New Delivery Status *</label>
            <select
              value={statusModal.deliveryStatus}
              onChange={(e) => setStatusModal({ ...statusModal, deliveryStatus: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
              required
            >
              {DELIVERY_STATUSES.map((st) => (
                <option key={st.id} value={st.id}>{st.label}</option>
              ))}
            </select>
            {statusModal.deliveryStatus === 'returned' && (
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                ⚠️ Marking "Returned" will flag this parcel as <strong>Awaiting Return</strong>. Main stock will NOT be restored until physically received at the office.
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status Notes (Optional)</label>
            <textarea
              rows={2}
              value={statusModal.notes}
              onChange={(e) => setStatusModal({ ...statusModal, notes: e.target.value })}
              placeholder="e.g. Courier updated tracking status to Delivered..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" size="sm" onClick={() => setStatusModal({ isOpen: false, dispatch: null, deliveryStatus: '', notes: '' })}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Update Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. CONFIRM COD PAYMENT MODAL */}
      <Modal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, dispatch: null, amountReceived: '', paymentDate: '', paymentAccount: 'cash', bankAccountId: '', reference: '', notes: '' })}
        title="Confirm COD Payment Received"
      >
        <form onSubmit={handleConfirmPaymentSubmit} className="space-y-4 text-xs">
          {paymentModal.dispatch && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Seller:</span>
                <span className="font-bold text-slate-900">{paymentModal.dispatch.sellerId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-semibold text-slate-800">{paymentModal.dispatch.productId?.name} ({paymentModal.dispatch.quantity}x)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Courier & Tracking:</span>
                <span className="font-mono font-bold text-blue-700">{paymentModal.dispatch.trackingNumber} ({paymentModal.dispatch.courier})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-600 font-semibold">Expected Customer COD:</span>
                <span className="font-black text-slate-900">{formatRs(paymentModal.dispatch.customerSaleAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Etimad Product Cost:</span>
                <span className="font-semibold text-slate-800">{formatRs(paymentModal.dispatch.etimadCostAtDispatch * paymentModal.dispatch.quantity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800 font-bold">Expected Seller Margin:</span>
                <span className="font-black text-emerald-700">{formatRs(paymentModal.dispatch.expectedSellerProfit)}</span>
              </div>
              <div className="text-[11px] text-blue-800 bg-blue-100/60 p-2 rounded mt-1 font-medium">
                {paymentModal.dispatch.collectionMethod === 'courier_to_etimad'
                  ? '🚚 Courier deposit: Etimad keeps product cost, seller earns Rs. ' + paymentModal.dispatch.expectedSellerProfit.toLocaleString() + ' as Payable.'
                  : paymentModal.dispatch.collectionMethod === 'seller_collection'
                  ? '👤 Seller collected COD: Seller owes Etimad product cost Rs. ' + (paymentModal.dispatch.etimadCostAtDispatch * paymentModal.dispatch.quantity).toLocaleString() + ' as Receivable.'
                  : '🏢 Office Cash deposit: Etimad owes seller margin as Payable.'}
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Amount Actually Received (Rs.) *</label>
            <input
              type="number"
              min="0"
              step="any"
              value={paymentModal.amountReceived}
              onChange={(e) => setPaymentModal({ ...paymentModal, amountReceived: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-base bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deposit Account *</label>
              <select
                value={paymentModal.paymentAccount}
                onChange={(e) => setPaymentModal({ ...paymentModal, paymentAccount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="cash">Petty Cash Drawer (Avail: {formatRs(pettyCashData.currentPettyCash)})</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentModal.paymentDate}
                onChange={(e) => setPaymentModal({ ...paymentModal, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
          </div>

          {paymentModal.paymentAccount === 'bank' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Bank Account *</label>
              <select
                value={paymentModal.bankAccountId}
                onChange={(e) => setPaymentModal({ ...paymentModal, bankAccountId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                required
              >
                <option value="">-- Choose Bank --</option>
                {banksData.accounts.map((b) => (
                  <option key={b._id} value={b._id}>{b.bankName} ({b.accountNumber}) — Bal: {formatRs(b.currentBalance)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Tx ID (Optional)</label>
            <input
              type="text"
              value={paymentModal.reference}
              onChange={(e) => setPaymentModal({ ...paymentModal, reference: e.target.value })}
              placeholder="e.g. Courier Cheque # or Bank Ref"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={paymentModal.notes}
              onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" size="sm" onClick={() => setPaymentModal({ isOpen: false, dispatch: null, amountReceived: '', paymentDate: '', paymentAccount: 'cash', bankAccountId: '', reference: '', notes: '' })}>
              Cancel
            </Button>
            <Button variant="success" size="sm" type="submit">
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. PRODUCT RECEIVED / RESTORE STOCK MODAL */}
      <Modal
        isOpen={returnStockModal.isOpen}
        onClose={() => setReturnStockModal({ isOpen: false, dispatch: null, notes: '' })}
        title="Physically Received Return — Restore Main Inventory"
      >
        <form onSubmit={handleRestoreStockSubmit} className="space-y-4 text-xs">
          {returnStockModal.dispatch && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-1">
              <p className="font-bold text-purple-900">
                Confirm physical arrival of {returnStockModal.dispatch.quantity} unit(s) of{' '}
                <strong>{returnStockModal.dispatch.productId?.name}</strong> at Etimad office.
              </p>
              <p className="text-[11px] text-purple-700">
                Seller: <strong>{returnStockModal.dispatch.sellerId?.name}</strong> | CN: <strong>{returnStockModal.dispatch.trackingNumber}</strong>
              </p>
              <p className="text-[11px] text-slate-600 mt-2">
                Action: Main stock will immediately increase by <strong>+{returnStockModal.dispatch.quantity} units</strong>, and the parcel will be permanently locked against duplicate stock restoration. No seller earnings generated.
              </p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Return Inspection Notes (Optional)</label>
            <input
              type="text"
              value={returnStockModal.notes}
              onChange={(e) => setReturnStockModal({ ...returnStockModal, notes: e.target.value })}
              placeholder="e.g. Parcel received intact in original box..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" size="sm" onClick={() => setReturnStockModal({ isOpen: false, dispatch: null, notes: '' })}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-purple-600 hover:bg-purple-700">
              Confirm Physical Receipt & Restore Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. SETTLE SELLER (PAYOUT) MODAL */}
      <Modal
        isOpen={settleModal.isOpen}
        onClose={() => setSettleModal({ isOpen: false, sellerId: '', amount: '', paymentMethod: 'cash', bankAccountId: '', reference: '', notes: '' })}
        title="Pay / Settle Seller Margin (Payout)"
      >
        <form onSubmit={handleSettlePayoutSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Seller *</label>
            <select
              value={settleModal.sellerId}
              onChange={(e) => setSettleModal({ ...settleModal, sellerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
              required
            >
              <option value="">-- Choose Seller --</option>
              {sellers.map((s) => {
                const summ = summaries.find((sm) => String(sm.seller._id) === String(s._id));
                const payable = summ?.balances?.currentPayable || 0;
                return (
                  <option key={s._id} value={s._id}>
                    {s.name} (Current Payable: {formatRs(payable)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Settlement Payout Amount (Rs.) *</label>
            <input
              type="number"
              min="1"
              step="any"
              value={settleModal.amount}
              onChange={(e) => setSettleModal({ ...settleModal, amount: e.target.value })}
              placeholder="e.g. 6000 (Partial settlement supported)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-base bg-white"
              required
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              Partial settlement is fully supported. Does not force full payment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pay From *</label>
              <select
                value={settleModal.paymentMethod}
                onChange={(e) => setSettleModal({ ...settleModal, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="cash">Petty Cash (Avail: {formatRs(pettyCashData.currentPettyCash)})</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>

            {settleModal.paymentMethod === 'bank' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Bank *</label>
                <select
                  value={settleModal.bankAccountId}
                  onChange={(e) => setSettleModal({ ...settleModal, bankAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  <option value="">-- Choose Bank --</option>
                  {banksData.accounts.map((b) => (
                    <option key={b._id} value={b._id}>{b.bankName} — Bal: {formatRs(b.currentBalance)}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference (Optional)</label>
                <input
                  type="text"
                  value={settleModal.reference}
                  onChange={(e) => setSettleModal({ ...settleModal, reference: e.target.value })}
                  placeholder="Receipt / Voucher #"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Settlement Notes (Optional)</label>
            <input
              type="text"
              value={settleModal.notes}
              onChange={(e) => setSettleModal({ ...settleModal, notes: e.target.value })}
              placeholder="e.g. Paid weekly seller margin..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" size="sm" onClick={() => setSettleModal({ isOpen: false, sellerId: '', amount: '', paymentMethod: 'cash', bankAccountId: '', reference: '', notes: '' })}>
              Cancel
            </Button>
            <Button variant="success" size="sm" type="submit">
              Confirm Settlement Payout
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. RECORD SELLER REMITTANCE MODAL */}
      <Modal
        isOpen={remittanceModal.isOpen}
        onClose={() => setRemittanceModal({ isOpen: false, sellerId: '', amount: '', paymentMethod: 'cash', bankAccountId: '', reference: '', notes: '' })}
        title="Receive Seller COD Remittance (Etimad Product Cost)"
      >
        <form onSubmit={handleRemittanceSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Seller *</label>
            <select
              value={remittanceModal.sellerId}
              onChange={(e) => setRemittanceModal({ ...remittanceModal, sellerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
              required
            >
              <option value="">-- Choose Seller --</option>
              {sellers.map((s) => {
                const summ = summaries.find((sm) => String(sm.seller._id) === String(s._id));
                const receivable = summ?.balances?.currentReceivable || 0;
                return (
                  <option key={s._id} value={s._id}>
                    {s.name} (Current Receivable: {formatRs(receivable)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Remittance Amount (Rs.) *</label>
            <input
              type="number"
              min="1"
              step="any"
              value={remittanceModal.amount}
              onChange={(e) => setRemittanceModal({ ...remittanceModal, amount: e.target.value })}
              placeholder="e.g. 1500"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-base bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deposit Into *</label>
              <select
                value={remittanceModal.paymentMethod}
                onChange={(e) => setRemittanceModal({ ...remittanceModal, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="cash">Petty Cash Drawer</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>

            {remittanceModal.paymentMethod === 'bank' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Bank *</label>
                <select
                  value={remittanceModal.bankAccountId}
                  onChange={(e) => setRemittanceModal({ ...remittanceModal, bankAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  <option value="">-- Choose Bank --</option>
                  {banksData.accounts.map((b) => (
                    <option key={b._id} value={b._id}>{b.bankName} ({b.accountNumber})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference (Optional)</label>
                <input
                  type="text"
                  value={remittanceModal.reference}
                  onChange={(e) => setRemittanceModal({ ...remittanceModal, reference: e.target.value })}
                  placeholder="Slip # / Notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remittance Notes (Optional)</label>
            <input
              type="text"
              value={remittanceModal.notes}
              onChange={(e) => setRemittanceModal({ ...remittanceModal, notes: e.target.value })}
              placeholder="e.g. Handed over Post Office COD cash..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" size="sm" onClick={() => setRemittanceModal({ isOpen: false, sellerId: '', amount: '', paymentMethod: 'cash', bankAccountId: '', reference: '', notes: '' })}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit">
              Confirm COD Remittance
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. SELLER ROSTER MODAL (Add/Edit Seller) */}
      <Modal
        isOpen={rosterModal.isOpen}
        onClose={() => setRosterModal({ isOpen: false, editingSeller: null, name: '', phone: '', basicSalary: 0, commissionRate: 5, notes: '', isActive: true })}
        title={rosterModal.editingSeller ? `Edit Seller — ${rosterModal.editingSeller.name}` : 'Add New Seller / Reseller'}
      >
        <form onSubmit={handleSaveRoster} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Seller Name *</label>
            <input
              type="text"
              value={rosterModal.name}
              onChange={(e) => setRosterModal({ ...rosterModal, name: e.target.value })}
              placeholder="e.g. Ali / Bilal"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={rosterModal.phone}
              onChange={(e) => setRosterModal({ ...rosterModal, phone: e.target.value })}
              placeholder="03001234567"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Basic Salary (Rs.)</label>
              <input
                type="number"
                min="0"
                value={rosterModal.basicSalary}
                onChange={(e) => setRosterModal({ ...rosterModal, basicSalary: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Commission Rate (%)</label>
              <input
                type="number"
                min="0"
                value={rosterModal.commissionRate}
                onChange={(e) => setRosterModal({ ...rosterModal, commissionRate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
            <textarea
              rows={2}
              value={rosterModal.notes}
              onChange={(e) => setRosterModal({ ...rosterModal, notes: e.target.value })}
              placeholder="Office reseller agreements, ad account notes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sellerActiveToggle"
              checked={rosterModal.isActive}
              onChange={(e) => setRosterModal({ ...rosterModal, isActive: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sellerActiveToggle" className="font-bold text-slate-700 cursor-pointer">
              Active Seller (Can receive product dispatches)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" size="sm" onClick={() => setRosterModal({ isOpen: false, editingSeller: null, name: '', phone: '', basicSalary: 0, commissionRate: 5, notes: '', isActive: true })}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Seller
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. TEMPORARY CREDENTIALS MODAL (When new seller created) */}
      <Modal
        isOpen={tempCredsModal.isOpen}
        onClose={() => setTempCredsModal({ isOpen: false, name: '', password: '' })}
        title="Seller Account Created"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Account for <strong>{tempCredsModal.name}</strong> was created. If this seller needs portal login, provide these credentials:
          </p>
          <div className="bg-slate-100 p-3 rounded-lg font-mono text-sm space-y-1">
            <div>User: <strong>{tempCredsModal.name}</strong></div>
            <div>Temporary Password: <strong className="text-blue-700">{tempCredsModal.password}</strong></div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setTempCredsModal({ isOpen: false, name: '', password: '' })}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SellerWorkspace;

