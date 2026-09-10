import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getExpenses,
  createExpense,
  deleteExpense,
  getExpenseStats,
  getFinanceBanks,
  getFinancePettyCash
} from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import {
  AlertTriangle,
  Calendar,
  FileText,
  PlusCircle,
  Wallet,
  Landmark,
  Trash2,
  Tag
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const EXPENSE_CATEGORIES = [
  'Utilities (Electricity, Gas, Net)',
  'Tea, Food & Refreshment',
  'Shop & Office Maintenance',
  'Salaries & Daily Wages',
  'Courier, Packing & Shipping',
  'Rent & Building',
  'Marketing & Advertising',
  'Stationery & Supplies',
  'Miscellaneous / Other'
];

const Expenses = () => {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all'); // 'all', 'cash', 'bank'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    paymentMethod: 'cash', // 'cash' or 'bank'
    bankAccountId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const toast = useToast();

  // 1. Fetch Expenses
  const {
    data: expenses = [],
    isLoading: expensesLoading,
    error: expensesError,
    refetch: refetchExpenses
  } = useQuery({
    queryKey: ['expenses', { startDate: appliedStartDate, endDate: appliedEndDate }],
    queryFn: async () => {
      const params = {};
      if (appliedStartDate) params.startDate = appliedStartDate;
      if (appliedEndDate) params.endDate = appliedEndDate;
      const expensesRes = await getExpenses(params);
      return expensesRes.data || [];
    }
  });

  // 2. Fetch Stats
  const {
    data: stats = { today: {}, week: {}, month: {}, year: {} },
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['expenseStats'],
    queryFn: async () => {
      const res = await getExpenseStats();
      return res.data || { today: {}, week: {}, month: {}, year: {} };
    }
  });

  // 3. Fetch Active Bank Accounts
  const {
    data: banksData = [],
    refetch: refetchBanks
  } = useQuery({
    queryKey: ['financeBanks'],
    queryFn: async () => {
      const res = await getFinanceBanks();
      return res.data?.accounts || [];
    }
  });
  const activeBanks = (banksData || []).filter((b) => b.isActive !== false);

  // 4. Fetch Petty Cash Balance
  const {
    data: pettyCashData,
    refetch: refetchPettyCash
  } = useQuery({
    queryKey: ['financePettyCash'],
    queryFn: async () => {
      const res = await getFinancePettyCash();
      return res.data || { currentPettyCash: 0 };
    }
  });
  const availablePettyCash = Number(pettyCashData?.currentPettyCash || 0);

  const selectedBank = activeBanks.find((b) => String(b._id) === String(formData.bankAccountId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(formData.amount || 0);

    if (numAmount <= 0) {
      toast.error('Expense amount must be greater than zero');
      return;
    }

    if (formData.paymentMethod === 'bank') {
      if (!formData.bankAccountId) {
        toast.error('Please select a bank account to deduct the expense from');
        return;
      }
      if (selectedBank && numAmount > Number(selectedBank.currentBalance || 0)) {
        toast.error(
          `Amount exceeds ${selectedBank.bankName} balance (Rs. ${Number(selectedBank.currentBalance || 0).toLocaleString('en-PK')})`
        );
        return;
      }
    } else {
      if (numAmount > availablePettyCash) {
        toast.error(
          `Amount exceeds available Petty Cash balance (Rs. ${availablePettyCash.toLocaleString('en-PK')})`
        );
        return;
      }
    }

    try {
      const payload = {
        title: formData.title.trim(),
        amount: numAmount,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.paymentMethod === 'bank' ? formData.bankAccountId : undefined,
        notes: formData.notes,
        date: formData.date ? new Date(formData.date) : new Date()
      };

      await createExpense(payload);
      const sourceName =
        formData.paymentMethod === 'bank'
          ? `Bank: ${selectedBank?.bankName || 'Selected Bank'}`
          : 'Petty Cash';

      toast.success(`Expense recorded & deducted from ${sourceName}`);
      setFormData({
        title: '',
        amount: '',
        category: '',
        paymentMethod: 'cash',
        bankAccountId: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });

      await Promise.all([
        refetchExpenses(),
        refetchStats(),
        refetchPettyCash(),
        refetchBanks()
      ]);
    } catch (err) {
      console.error('Error creating expense:', err);
      toast.error(err.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (exp) => {
    const sourceLabel =
      exp.paymentMethod === 'bank'
        ? `Bank Account (${exp.bankAccountId?.bankName || 'Bank'})`
        : 'Petty Cash';

    if (
      !window.confirm(
        `Are you sure you want to delete "${exp.title}" (Rs. ${Number(exp.amount || 0).toLocaleString('en-PK')})?\n\nThis will refund Rs. ${Number(exp.amount || 0).toLocaleString('en-PK')} back into ${sourceLabel}.`
      )
    ) {
      return;
    }

    try {
      await deleteExpense(exp._id);
      toast.success(`Expense deleted and balance refunded to ${sourceLabel}`);
      await Promise.all([
        refetchExpenses(),
        refetchStats(),
        refetchPettyCash(),
        refetchBanks()
      ]);
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Filter by payment method
      if (filterSource === 'cash' && exp.paymentMethod === 'bank') return false;
      if (filterSource === 'bank' && exp.paymentMethod !== 'bank') return false;

      // Filter by search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const titleMatch = exp.title?.toLowerCase().includes(q);
      const notesMatch = exp.notes?.toLowerCase().includes(q);
      const catMatch = exp.category?.toLowerCase().includes(q);
      const bankMatch = exp.bankAccountId?.bankName?.toLowerCase().includes(q);

      return titleMatch || notesMatch || catMatch || bankMatch;
    });
  }, [expenses, search, filterSource]);

  const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

  if (expensesError || statsError) {
    const message =
      expensesError?.response?.data?.message ||
      statsError?.response?.data?.message ||
      'Failed to load expenses. Please try again.';

    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">{message}</p>
          <Button
            onClick={async () => {
              await Promise.all([refetchExpenses(), refetchStats(), refetchPettyCash(), refetchBanks()]);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { key: 'today', label: 'Today', color: 'from-emerald-500 to-emerald-600' },
    { key: 'week', label: 'This Week', color: 'from-sky-500 to-sky-600' },
    { key: 'month', label: 'This Month', color: 'from-amber-500 to-orange-600' },
    { key: 'year', label: 'This Year', color: 'from-purple-500 to-indigo-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Business Expenses</h1>
          <p className="text-gray-600 mt-1">
            Track daily operating expenses with automatic deduction from Petty Cash or Bank Accounts
          </p>
        </div>

        {/* Live Balance Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <Wallet size={18} className="text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600 font-medium">Drawer Petty Cash</p>
              <p className="text-sm font-bold">{formatCurrency(availablePettyCash)}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <Landmark size={18} className="text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Active Banks ({activeBanks.length})</p>
              <p className="text-sm font-bold">
                {formatCurrency(activeBanks.reduce((s, b) => s + Number(b.currentBalance || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const data = stats[card.key] || { totalAmount: 0, count: 0 };
          return (
            <Card key={card.key} className={`bg-gradient-to-r ${card.color} text-white shadow-sm`}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">{card.label} Expense</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(data.totalAmount)}</p>
                  </div>
                  <div className="text-right text-xs opacity-80">
                    <p>{data.count || 0} entries</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Add Expense + Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <PlusCircle size={20} className="text-blue-600" />
              Add Expense
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Payment Source Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deduct Payment From <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'cash', bankAccountId: '' })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      formData.paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-sm">
                      <Wallet size={16} />
                      <span>Petty Cash</span>
                    </div>
                    <span className="text-[11px] font-normal text-emerald-700 mt-1">
                      Bal: {formatCurrency(availablePettyCash)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstBankId = activeBanks[0]?._id || '';
                      setFormData({ ...formData, paymentMethod: 'bank', bankAccountId: firstBankId });
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      formData.paymentMethod === 'bank'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-sm">
                      <Landmark size={16} />
                      <span>Bank Account</span>
                    </div>
                    <span className="text-[11px] font-normal text-blue-700 mt-1">
                      {activeBanks.length} Account(s)
                    </span>
                  </button>
                </div>
              </div>

              {/* If Bank selected, show Bank Dropdown */}
              {formData.paymentMethod === 'bank' && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                  <label className="block text-xs font-semibold text-blue-900">
                    Select Bank Account <span className="text-red-500">*</span>
                  </label>
                  {activeBanks.length > 0 ? (
                    <>
                      <select
                        required
                        value={formData.bankAccountId}
                        onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Choose Bank Account --</option>
                        {activeBanks.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.bankName} - {b.accountTitle} ({b.accountNumber}) — Bal: {formatCurrency(b.currentBalance)}
                          </option>
                        ))}
                      </select>
                      {selectedBank && (
                        <p className="text-xs text-blue-700 font-medium">
                          Available in {selectedBank.bankName}: <span className="font-bold">{formatCurrency(selectedBank.currentBalance)}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      No active bank accounts found. Please add a bank account under Finance ➡️ Bank Accounts first.
                    </div>
                  )}
                </div>
              )}

              {/* Title / Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Detail / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g. Shop Electricity Bill, Office Refreshment"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold"
                  placeholder="0"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">-- Select Category --</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Any additional notes or invoice reference..."
                />
              </div>

              <Button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5">
                <PlusCircle size={18} />
                Save & Deduct Expense
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Search + History */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <FileText size={20} className="text-blue-600" />
                Expense History
              </CardTitle>

              {/* Source Filter Pills */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFilterSource('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterSource === 'all'
                      ? 'bg-white text-gray-800 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  All Sources
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSource('cash')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterSource === 'cash'
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-emerald-700'
                  }`}
                >
                  💵 Petty Cash
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSource('bank')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterSource === 'bank'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-blue-700'
                  }`}
                >
                  🏦 Banks
                </button>
              </div>
            </div>
          </CardHeader>

          <CardBody className="space-y-4 p-4">
            {/* Date Filters */}
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setAppliedStartDate(startDate);
                    setAppliedEndDate(endDate);
                  }}
                  className="px-4 py-2 text-sm"
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setAppliedStartDate('');
                    setAppliedEndDate('');
                  }}
                  className="px-4 py-2 text-sm"
                >
                  Clear
                </Button>
              </div>
            </div>

            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search expenses by detail, category, bank, or notes..."
            />

            <div className="overflow-x-auto max-h-[460px] border border-gray-200 rounded-xl">
              {expensesLoading && (
                <div className="px-4 py-3 text-sm text-gray-500">Loading expenses...</div>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Date & Time</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Detail & Category</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Deducted From</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Amount</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Calendar size={13} className="text-gray-400" />
                            {formatDate(exp.date || exp.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-2.5 text-gray-800">
                          <p className="font-medium text-gray-900">{exp.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {exp.category && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                <Tag size={10} className="text-gray-400" />
                                {exp.category}
                              </span>
                            )}
                            {exp.notes && (
                              <span className="text-xs text-gray-500">{exp.notes}</span>
                            )}
                          </div>
                        </td>

                        {/* Deducted From Source */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {exp.paymentMethod === 'bank' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
                              <Landmark size={13} />
                              {exp.bankAccountId?.bankName || 'Bank'}
                              {exp.bankAccountId?.accountNumber
                                ? ` (${exp.bankAccountId.accountNumber})`
                                : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <Wallet size={13} />
                              Petty Cash
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(exp.amount)}
                        </td>

                        {/* Delete Action */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Expense & Revert Balance"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No expenses found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Expenses;
