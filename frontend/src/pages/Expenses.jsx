import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExpenses, createExpense, getExpenseStats } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import { AlertTriangle, Calendar, FileText, PlusCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Expenses = () => {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    notes: ''
  });
  const toast = useToast();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        amount: Number(formData.amount || 0),
        notes: formData.notes
      };
      await createExpense(payload);
      toast.success('Expense added successfully');
      setFormData({ title: '', amount: '', notes: '' });
      await Promise.all([refetchExpenses(), refetchStats()]);
    } catch (err) {
      console.error('Error creating expense:', err);
      toast.error(err.response?.data?.message || 'Failed to add expense');
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter((exp) =>
      exp.title.toLowerCase().includes(q) ||
      exp.notes?.toLowerCase().includes(q)
    );
  }, [expenses, search]);

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
              await Promise.all([refetchExpenses(), refetchStats()]);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
          <p className="text-gray-600 mt-1">Track and analyze your business expenses</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const data = stats[card.key] || { totalAmount: 0, count: 0 };
          return (
            <Card key={card.key} className={`bg-gradient-to-r ${card.color} text-white`}>
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
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle size={20} />
              Add Expense
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Detail</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Electricity bill, Office tea"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any extra details"
                />
              </div>

              <Button type="submit" className="w-full flex items-center justify-center gap-2">
                <PlusCircle size={18} />
                Save Expense
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Search + History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Expense History
            </CardTitle>
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
              placeholder="Search expenses by detail or notes..."
            />

            <div className="overflow-x-auto max-h-[420px] border border-gray-200 rounded-lg">
              {expensesLoading && (
                <div className="px-4 py-2 text-sm text-gray-500">Loading expenses...</div>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Date & Time</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Detail</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-gray-700 flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDate(exp.date || exp.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-gray-800">
                          {exp.title}
                          {exp.notes && (
                            <p className="text-xs text-gray-500 mt-1">{exp.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No expenses found.
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
