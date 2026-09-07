import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getFinanceReceivables,
  receiveFinanceReceivablePayment,
  adjustFinanceBillReceivable,
  receiveFinanceOpeningReceivablePayment,
  adjustFinanceOpeningReceivable,
  markAllFinanceReceivablesCollected,
  getFinanceBanks,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building2,
  Wallet,
  ArrowDownLeft,
  FileSpreadsheet,
  Clock,
  Layers,
  SlidersHorizontal,
  Edit3,
  Filter,
  ExternalLink,
} from 'lucide-react';

const FinanceReceivables = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeSubTab, setActiveSubTab] = useState('bills'); // 'bills' or 'hawalas'
  const [billFilter, setBillFilter] = useState('all'); // 'all' or 'pending'
  const [search, setSearch] = useState('');

  // Bill collect modal state
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [collectForm, setCollectForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    bankAccountId: '',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Bill adjust modal state
  const [isAdjustBillModalOpen, setIsAdjustBillModalOpen] = useState(false);
  const [selectedBillForAdjust, setSelectedBillForAdjust] = useState(null);
  const [billAdjustForm, setBillAdjustForm] = useState({
    amountPaid: '',
    remainingAmount: '',
    reason: '',
  });

  // Hawala collect modal state
  const [isCollectHawalaModalOpen, setIsCollectHawalaModalOpen] = useState(false);
  const [selectedHawala, setSelectedHawala] = useState(null);
  const [hawalaCollectForm, setHawalaCollectForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    bankAccountId: '',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Hawala adjust modal state
  const [isAdjustHawalaModalOpen, setIsAdjustHawalaModalOpen] = useState(false);
  const [selectedHawalaForAdjust, setSelectedHawalaForAdjust] = useState(null);
  const [hawalaAdjustForm, setHawalaAdjustForm] = useState({
    partyName: '',
    amount: '',
    collectedAmount: '',
    remainingAmount: '',
    phone: '',
    notes: '',
  });

  // Queries
  const {
    data: receivablesData = {
      bills: [],
      openingReceivables: [],
      totalReceivable: 0,
      billsTotal: 0,
      pendingBillsCount: 0,
      totalBillsCount: 0,
      openingTotal: 0,
    },
    isLoading,
  } = useQuery({
    queryKey: ['financeReceivables', billFilter],
    queryFn: async () => {
      const res = await getFinanceReceivables({ filter: billFilter });
      return res.data;
    },
  });

  const { data: banksData = { accounts: [] } } = useQuery({
    queryKey: ['financeBanks'],
    queryFn: async () => {
      const res = await getFinanceBanks();
      return res.data;
    },
  });

  const bills = receivablesData.bills || [];
  const openingReceivables = receivablesData.openingReceivables || [];
  const totalReceivable = receivablesData.totalReceivable || 0;
  const billsTotal = receivablesData.billsTotal || 0;
  const pendingBillsCount = receivablesData.pendingBillsCount || 0;
  const totalBillsCount = receivablesData.totalBillsCount || bills.length;
  const openingTotal = receivablesData.openingTotal || 0;
  const accounts = banksData.accounts || [];

  // Bill Collect Mutation
  const collectMutation = useMutation({
    mutationFn: ({ billId, data }) => receiveFinanceReceivablePayment(billId, data),
    onSuccess: () => {
      toast.success('Customer payment received and recorded successfully!');
      setIsCollectModalOpen(false);
      setSelectedBill(null);
      setCollectForm({
        amount: '',
        paymentMethod: 'cash',
        bankAccountId: '',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record customer payment');
    },
  });

  // Bill Adjust Mutation
  const adjustBillMutation = useMutation({
    mutationFn: ({ billId, data }) => adjustFinanceBillReceivable(billId, data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Bill balance adjusted successfully');
      setIsAdjustBillModalOpen(false);
      setSelectedBillForAdjust(null);
      queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to adjust bill');
    },
  });

  // Hawala Collect Mutation
  const collectHawalaMutation = useMutation({
    mutationFn: ({ itemId, data }) => receiveFinanceOpeningReceivablePayment(itemId, data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Hawala payment collected successfully');
      setIsCollectHawalaModalOpen(false);
      setSelectedHawala(null);
      setHawalaCollectForm({
        amount: '',
        paymentMethod: 'cash',
        bankAccountId: '',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
      queryClient.invalidateQueries({ queryKey: ['financeSetup'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to collect payment');
    },
  });

  // Hawala Adjust Mutation
  const adjustHawalaMutation = useMutation({
    mutationFn: ({ itemId, data }) => adjustFinanceOpeningReceivable(itemId, data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Hawala party updated successfully');
      setIsAdjustHawalaModalOpen(false);
      setSelectedHawalaForAdjust(null);
      queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeSetup'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update hawala');
    },
  });

  // Mark all bills collected mutation
  const markAllMutation = useMutation({
    mutationFn: () => markAllFinanceReceivablesCollected(),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'All customer bills marked as collected');
      queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeSetup'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update bills');
    },
  });

  const handleOpenCollect = (bill) => {
    setSelectedBill(bill);
    setCollectForm({
      amount: bill.remainingAmount || '',
      paymentMethod: 'cash',
      bankAccountId: accounts[0]?._id || '',
      reference: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsCollectModalOpen(true);
  };

  const handleOpenAdjustBill = (b) => {
    setSelectedBillForAdjust(b);
    setBillAdjustForm({
      amountPaid: b.amountPaid ?? 0,
      remainingAmount: b.remainingAmount ?? 0,
      reason: '',
    });
    setIsAdjustBillModalOpen(true);
  };

  const handleAdjustBillSubmit = (e) => {
    e.preventDefault();
    if (!selectedBillForAdjust) return;
    const paid = Number(billAdjustForm.amountPaid || 0);
    const rem = Number(billAdjustForm.remainingAmount || 0);
    if (paid < 0 || rem < 0) {
      toast.error('Amounts cannot be negative');
      return;
    }
    adjustBillMutation.mutate({
      billId: selectedBillForAdjust._id,
      data: {
        amountPaid: paid,
        remainingAmount: rem,
        reason: billAdjustForm.reason,
      },
    });
  };

  const handleOpenAdjustHawala = (item) => {
    setSelectedHawalaForAdjust(item);
    setHawalaAdjustForm({
      partyName: item.partyName || '',
      amount: item.amount ?? 0,
      collectedAmount: item.collectedAmount ?? 0,
      remainingAmount: item.remainingAmount ?? 0,
      phone: item.phone || '',
      notes: item.notes || '',
    });
    setIsAdjustHawalaModalOpen(true);
  };

  const handleAdjustHawalaSubmit = (e) => {
    e.preventDefault();
    if (!selectedHawalaForAdjust) return;
    adjustHawalaMutation.mutate({
      itemId: selectedHawalaForAdjust._id,
      data: {
        ...hawalaAdjustForm,
        amount: Number(hawalaAdjustForm.amount || 0),
        collectedAmount: Number(hawalaAdjustForm.collectedAmount || 0),
        remainingAmount: Number(hawalaAdjustForm.remainingAmount || 0),
      },
    });
  };

  const handleOpenCollectHawala = (item) => {
    setSelectedHawala(item);
    setHawalaCollectForm({
      amount: item.remainingAmount || '',
      paymentMethod: 'cash',
      bankAccountId: accounts[0]?._id || '',
      reference: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsCollectHawalaModalOpen(true);
  };

  const handleCollectSubmit = (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    const numAmount = Number(collectForm.amount || 0);
    if (numAmount <= 0) {
      toast.error('Please enter an amount greater than zero');
      return;
    }
    if (numAmount > selectedBill.remainingAmount + 0.01) {
      toast.error(`Received amount cannot exceed remaining balance (Rs. ${selectedBill.remainingAmount.toLocaleString()})`);
      return;
    }
    if (collectForm.paymentMethod === 'bank' && !collectForm.bankAccountId) {
      toast.error('Please select a destination bank account');
      return;
    }
    collectMutation.mutate({
      billId: selectedBill._id,
      data: {
        ...collectForm,
        amount: Math.min(numAmount, selectedBill.remainingAmount),
      },
    });
  };

  const handleCollectHawalaSubmit = (e) => {
    e.preventDefault();
    if (!selectedHawala) return;
    const numAmount = Number(hawalaCollectForm.amount || 0);
    if (numAmount <= 0) {
      toast.error('Please enter an amount greater than zero');
      return;
    }
    if (numAmount > selectedHawala.remainingAmount + 0.01) {
      toast.error(`Received amount cannot exceed remaining balance (Rs. ${selectedHawala.remainingAmount.toLocaleString()})`);
      return;
    }
    if (hawalaCollectForm.paymentMethod === 'bank' && !hawalaCollectForm.bankAccountId) {
      toast.error('Please select a destination bank account');
      return;
    }
    collectHawalaMutation.mutate({
      itemId: selectedHawala._id,
      data: {
        ...hawalaCollectForm,
        amount: Math.min(numAmount, selectedHawala.remainingAmount),
      },
    });
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const filteredBills = bills.filter(
    (b) =>
      b.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.billNumber?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.phone?.includes(search)
  );

  const filteredHawalas = openingReceivables.filter(
    (h) =>
      h.partyName?.toLowerCase().includes(search.toLowerCase()) ||
      h.notes?.toLowerCase().includes(search.toLowerCase()) ||
      h.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Market Receivables (Udhaar)
          </span>
          <h2 className="text-2xl font-black text-blue-600 mt-1">
            {formatCur(totalReceivable)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Active business assets pending collection
          </p>
        </div>

        {/* Baseline Hawalas */}
        <div
          onClick={() => setActiveSubTab('hawalas')}
          className={`p-5 rounded-xl border shadow-sm cursor-pointer transition ${
            activeSubTab === 'hawalas'
              ? 'bg-blue-50/50 border-blue-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              Baseline Market Hawalay
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
              {openingReceivables.length} Parties
            </span>
          </div>
          <h2 className="text-2xl font-black text-blue-900 mt-1">
            {formatCur(openingTotal)}
          </h2>
          <p className="text-xs text-blue-800 mt-1">
            {openingReceivables.filter((h) => h.remainingAmount > 0).length} pending collection
          </p>
        </div>

        {/* Customer Bills Credit */}
        <div
          onClick={() => setActiveSubTab('bills')}
          className={`p-5 rounded-xl border shadow-sm cursor-pointer transition ${
            activeSubTab === 'bills'
              ? 'bg-purple-50/50 border-purple-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Customer Bills Credit
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
              {bills.length} Bills
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mt-1">
            {formatCur(billsTotal)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            From portal sales and customer invoices
          </p>
        </div>
      </div>

      {/* Accounting Clarification */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Asset Consideration:</strong> These market udhaar entries are counted as real business assets in your Net Worth.
          When you collect payment against any hawala or bill, <strong>business net worth does not decrease</strong>;
          the asset safely transforms from an IOU (Udhaar) into liquid Cash/Bank in your counter or bank account.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('hawalas')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 ${
            activeSubTab === 'hawalas'
              ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Baseline Market Udhaar (Hawalay) ({openingReceivables.length})
        </button>

        <button
          onClick={() => setActiveSubTab('bills')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 ${
            activeSubTab === 'bills'
              ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50/40'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Customer Invoices & Bills ({bills.length})
        </button>
      </div>

      {/* VIEW A: Baseline Market Udhaar (Hawalas) */}
      {activeSubTab === 'hawalas' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search hawala party, phone, notes..."
            />
            <span className="text-xs text-slate-500">
              Showing {filteredHawalas.length} of {openingReceivables.length} parties
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Party / Hawala Reference</th>
                  <th className="px-4 py-3">Contact & Notes</th>
                  <th className="px-4 py-3 text-right">Original Udhaar</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Remaining Receivable</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-slate-400">
                      Loading market hawalas...
                    </td>
                  </tr>
                ) : filteredHawalas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      <p className="font-semibold text-slate-600">No baseline market hawalas configured.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Click "Configure Baseline Setup" at the top right to enter your 8-9 market references.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHawalas.map((item) => {
                    const isFullyCollected = Number(item.remainingAmount || 0) === 0;
                    const isPartial =
                      Number(item.collectedAmount || 0) > 0 && Number(item.remainingAmount || 0) > 0;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.partyName}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {item.notes || '-'}
                          {item.phone && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {item.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                          {formatCur(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                          {formatCur(item.collectedAmount || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 text-sm">
                          {formatCur(item.remainingAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFullyCollected
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isFullyCollected
                              ? 'COLLECTED'
                              : isPartial
                              ? 'PARTIAL'
                              : 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isFullyCollected ? (
                              <button
                                onClick={() => handleOpenCollectHawala(item)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-[11px] border border-blue-200 transition"
                              >
                                Collect
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenAdjustHawala(item)}
                              title="Edit / Adjust Party Details & Remaining Balance"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] border border-slate-300 transition flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: Customer Bills Credit */}
      {activeSubTab === 'bills' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <SearchBar value={search} onChange={setSearch} placeholder="Search customer, bill #, phone..." />
              {/* Filter Tabs: All vs Pending */}
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setBillFilter('all')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    billFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Invoices & Bills ({totalBillsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBillFilter('pending')}
                  className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                    billFilter === 'pending'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending Udhaar Only
                  {pendingBillsCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                      {pendingBillsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Showing {filteredBills.length} bills
              </span>
              {pendingBillsCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to mark all remaining customer credit bills as collected?')) {
                      markAllMutation.mutate();
                    }
                  }}
                  disabled={markAllMutation.isPending}
                  className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  {markAllMutation.isPending ? 'Updating...' : 'Mark All As Collected'}
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Bill # / Date</th>
                  <th className="px-4 py-3">Customer Details</th>
                  <th className="px-4 py-3">Salesperson</th>
                  <th className="px-4 py-3 text-right">Total Bill</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Receivable Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action / Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-6 text-slate-400">
                      Loading receivables...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">
                      <p className="font-semibold text-slate-600">No bills found for current filter.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {billFilter === 'pending'
                          ? "All regular bills are settled. Switch filter to 'All Invoices & Bills' to view or adjust any bill."
                          : 'No bills recorded yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => {
                    const isSettled = Number(b.remainingAmount || 0) === 0;
                    const isPartial =
                      Number(b.remainingAmount || 0) > 0 && Number(b.amountPaid || 0) > 0;
                    const billTotal = Number(b.total || b.grandTotal || b.totalAmount || 0);

                    return (
                      <tr key={b._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 flex items-center gap-1">
                            {b.billNumber}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(b.billDate || b.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{b.customer?.name || 'Walk-in Customer'}</p>
                          {b.customer?.phone && (
                            <p className="text-[10px] text-slate-400 font-mono">{b.customer.phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{b.seller?.name || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                          {formatCur(billTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                          {formatCur(b.amountPaid)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 text-sm">
                          {formatCur(b.remainingAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSettled
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isSettled
                              ? 'SETTLED'
                              : isPartial
                              ? 'PARTIAL UDHAAR'
                              : 'FULL UDHAAR'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isSettled && (
                              <button
                                onClick={() => handleOpenCollect(b)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] border border-emerald-200 transition"
                              >
                                Collect
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenAdjustBill(b)}
                              title="Adjust amount paid or remaining udhaar for this bill"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] border border-slate-300 transition flex items-center gap-1"
                            >
                              <SlidersHorizontal className="w-3 h-3" /> Adjust
                            </button>
                            <Link
                              to="/bills"
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                              title="View in Bills Module"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Payment for Hawala Modal */}
      <Modal
        isOpen={isCollectHawalaModalOpen}
        onClose={() => setIsCollectHawalaModalOpen(false)}
        title={`Collect Market Udhaar: ${selectedHawala?.partyName || ''}`}
      >
        <form onSubmit={handleCollectHawalaSubmit} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs space-y-1">
            <div className="flex justify-between text-blue-900">
              <span>Party / Hawala:</span>
              <span className="font-bold">{selectedHawala?.partyName}</span>
            </div>
            <div className="flex justify-between text-blue-900">
              <span>Remaining Market Udhaar:</span>
              <span className="font-bold text-blue-700 text-sm">
                {formatCur(selectedHawala?.remainingAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Amount Received (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                max={selectedHawala?.remainingAmount}
                step="any"
                value={hawalaCollectForm.amount}
                onChange={(e) => setHawalaCollectForm({ ...hawalaCollectForm, amount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Deposit Destination *
              </label>
              <select
                value={hawalaCollectForm.paymentMethod}
                onChange={(e) => setHawalaCollectForm({ ...hawalaCollectForm, paymentMethod: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="cash">Petty Cash / Counter Drawer</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
          </div>

          {hawalaCollectForm.paymentMethod === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Destination Bank Account *
              </label>
              <select
                value={hawalaCollectForm.bankAccountId}
                onChange={(e) => setHawalaCollectForm({ ...hawalaCollectForm, bankAccountId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select Bank...</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.bankName} - {a.accountTitle} ({formatCur(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Received Date *
              </label>
              <input
                type="date"
                value={hawalaCollectForm.date}
                onChange={(e) => setHawalaCollectForm({ ...hawalaCollectForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Receipt / Reference #
              </label>
              <input
                type="text"
                value={hawalaCollectForm.reference}
                onChange={(e) => setHawalaCollectForm({ ...hawalaCollectForm, reference: e.target.value })}
                placeholder="Optional receipt # or slip"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              value={hawalaCollectForm.notes}
              onChange={(e) => setHawalaCollectForm({ ...hawalaCollectForm, notes: e.target.value })}
              placeholder="Optional payment notes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsCollectHawalaModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={collectHawalaMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {collectHawalaMutation.isPending ? 'Saving...' : 'Confirm Received Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Collect Payment for Bill Modal */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title={`Collect Payment: ${selectedBill?.customer?.name || selectedBill?.billNumber}`}
      >
        <form onSubmit={handleCollectSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Bill Number:</span>
              <span className="font-bold text-slate-900">{selectedBill?.billNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Outstanding Receivable:</span>
              <span className="font-bold text-blue-700 text-sm">
                {formatCur(selectedBill?.remainingAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Amount Received (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                max={selectedBill?.remainingAmount}
                step="any"
                value={collectForm.amount}
                onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Deposit Destination *
              </label>
              <select
                value={collectForm.paymentMethod}
                onChange={(e) => setCollectForm({ ...collectForm, paymentMethod: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="cash">Petty Cash / Counter Drawer</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
          </div>

          {collectForm.paymentMethod === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Destination Bank Account *
              </label>
              <select
                value={collectForm.bankAccountId}
                onChange={(e) => setCollectForm({ ...collectForm, bankAccountId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select Bank...</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.bankName} - {a.accountTitle} ({formatCur(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Received Date *
              </label>
              <input
                type="date"
                value={collectForm.date}
                onChange={(e) => setCollectForm({ ...collectForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Receipt / Reference #
              </label>
              <input
                type="text"
                value={collectForm.reference}
                onChange={(e) => setCollectForm({ ...collectForm, reference: e.target.value })}
                placeholder="e.g. Cash receipt #1024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              value={collectForm.notes}
              onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })}
              placeholder="Optional payment notes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsCollectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={collectMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {collectMutation.isPending ? 'Saving...' : 'Confirm Received Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Bill Balance Modal */}
      <Modal
        isOpen={isAdjustBillModalOpen}
        onClose={() => setIsAdjustBillModalOpen(false)}
        title={`Adjust Bill Balance: ${selectedBillForAdjust?.billNumber || ''}`}
      >
        <form onSubmit={handleAdjustBillSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-700">
              <span className="font-medium">Bill Number:</span>
              <span className="font-bold text-slate-900">{selectedBillForAdjust?.billNumber}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="font-medium">Customer:</span>
              <span className="font-semibold text-slate-800">
                {selectedBillForAdjust?.customer?.name || 'Walk-in Customer'}
              </span>
            </div>
            <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5">
              <span className="font-medium">Total Bill Amount:</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatCur(selectedBillForAdjust?.total || selectedBillForAdjust?.grandTotal || selectedBillForAdjust?.totalAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Amount Paid (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={billAdjustForm.amountPaid}
                onChange={(e) => {
                  const paid = Number(e.target.value || 0);
                  const total = Number(selectedBillForAdjust?.total || selectedBillForAdjust?.grandTotal || selectedBillForAdjust?.totalAmount || 0);
                  setBillAdjustForm({
                    ...billAdjustForm,
                    amountPaid: e.target.value,
                    remainingAmount: Math.max(0, total - paid),
                  });
                }}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-400">Total collected from customer</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Remaining Udhaar Due (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={billAdjustForm.remainingAmount}
                onChange={(e) => setBillAdjustForm({ ...billAdjustForm, remainingAmount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-700"
                required
              />
              <span className="text-[10px] text-slate-400">Active receivable for this bill</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Adjustment Reason / Notes
            </label>
            <input
              type="text"
              value={billAdjustForm.reason}
              onChange={(e) => setBillAdjustForm({ ...billAdjustForm, reason: e.target.value })}
              placeholder="e.g. Sold on credit / Customer paid later / Balance adjustment"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsAdjustBillModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={adjustBillMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {adjustBillMutation.isPending ? 'Saving...' : 'Save Bill Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Hawala Details Modal */}
      <Modal
        isOpen={isAdjustHawalaModalOpen}
        onClose={() => setIsAdjustHawalaModalOpen(false)}
        title={`Adjust Hawala Party: ${selectedHawalaForAdjust?.partyName || ''}`}
      >
        <form onSubmit={handleAdjustHawalaSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Party / Reference Name *
              </label>
              <input
                type="text"
                value={hawalaAdjustForm.partyName}
                onChange={(e) => setHawalaAdjustForm({ ...hawalaAdjustForm, partyName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Phone / Contact
              </label>
              <input
                type="text"
                value={hawalaAdjustForm.phone}
                onChange={(e) => setHawalaAdjustForm({ ...hawalaAdjustForm, phone: e.target.value })}
                placeholder="0300-XXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Original Udhaar (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={hawalaAdjustForm.amount}
                onChange={(e) => {
                  const amt = Number(e.target.value || 0);
                  const collected = Number(hawalaAdjustForm.collectedAmount || 0);
                  setHawalaAdjustForm({
                    ...hawalaAdjustForm,
                    amount: e.target.value,
                    remainingAmount: Math.max(0, amt - collected),
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Collected (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={hawalaAdjustForm.collectedAmount}
                onChange={(e) => {
                  const collected = Number(e.target.value || 0);
                  const amt = Number(hawalaAdjustForm.amount || 0);
                  setHawalaAdjustForm({
                    ...hawalaAdjustForm,
                    collectedAmount: e.target.value,
                    remainingAmount: Math.max(0, amt - collected),
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-emerald-700 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Remaining Due (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={hawalaAdjustForm.remainingAmount}
                onChange={(e) => setHawalaAdjustForm({ ...hawalaAdjustForm, remainingAmount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Notes / Remarks
            </label>
            <input
              type="text"
              value={hawalaAdjustForm.notes}
              onChange={(e) => setHawalaAdjustForm({ ...hawalaAdjustForm, notes: e.target.value })}
              placeholder="e.g. Market party reference note"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsAdjustHawalaModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={adjustHawalaMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {adjustHawalaMutation.isPending ? 'Saving...' : 'Save Hawala Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceReceivables;
