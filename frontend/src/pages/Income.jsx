import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getIncomes, createIncome } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import { Wallet, PlusCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Income = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    type: 'cash',
    expectedAmount: '',
    amount: '',
    from: ''
  });

  const [filters, setFilters] = useState({
    type: '',
    search: '',
    range: 'today'
  });

  const [showForm, setShowForm] = useState(false);

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['incomes', filters],
    queryFn: async () => {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      if (filters.range) {
        const now = new Date();
        let startDate = null;

        if (filters.range === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filters.range === 'week') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const dayOfWeek = startOfDay.getDay(); // 0 = Sun
          const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
          startDate = new Date(startOfDay);
          startDate.setDate(startDate.getDate() - diffToMonday);
        } else if (filters.range === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        if (startDate) {
          params.startDate = startDate.toISOString();
        }
      }
      const res = await getIncomes(params);
      return res.data || [];
    }
  });

  const totalByType = useMemo(() => {
    return incomes.reduce(
      (acc, income) => {
        const key = income.type === 'in_account' ? 'inAccount' : 'cash';
        acc[key] += income.amount || 0; // actual paid
        return acc;
      },
      { cash: 0, inAccount: 0 }
    );
  }, [incomes]);

  const perPersonBalances = useMemo(() => {
    const map = {};

    incomes.forEach((inc) => {
      const name = inc.from || 'Unknown';
      if (!map[name]) {
        map[name] = {
          from: name,
          totalExpected: 0,
          totalPaid: 0,
        };
      }

      const expected = Number(inc.expectedAmount || 0);
      const paid = Number(inc.amount || 0);

      map[name].totalExpected += expected;
      map[name].totalPaid += paid;
    });

    return Object.values(map).map((entry) => {
      const rawRemaining = entry.totalExpected - entry.totalPaid;
      return {
        ...entry,
        // Amount still due should never be negative
        remaining: Math.max(rawRemaining, 0),
      };
    });
  }, [incomes]);

  const incomeBalancesMap = useMemo(() => {
    const result = {};
    const sorted = [...incomes].sort((a, b) => {
      const da = new Date(a.date || a.createdAt).getTime();
      const db = new Date(b.date || b.createdAt).getTime();
      return da - db;
    });

    const runningByPerson = {};

    sorted.forEach((inc) => {
      const name = inc.from || 'Unknown';
      if (runningByPerson[name] == null) {
        runningByPerson[name] = 0;
      }

      const remainingBefore = runningByPerson[name];
      const expected = Number(inc.expectedAmount || 0);
      const paid = Number(inc.amount || 0);
      const rawRemainingAfter = remainingBefore + expected - paid;
      // Clamp per-record running balance so it never goes below 0
      const remainingAfter = Math.max(rawRemainingAfter, 0);

      runningByPerson[name] = remainingAfter;

      result[inc._id] = {
        remainingBefore,
        remainingAfter,
      };
    });

    return result;
  }, [incomes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.expectedAmount || Number(form.expectedAmount) <= 0) {
        toast.error('Please enter how much they should pay (expected amount)');
        return;
      }

      if (form.amount === '' || Number(form.amount) < 0) {
        toast.error('Please enter how much they actually paid (0 or more)');
        return;
      }

      if (!form.from.trim()) {
        toast.error('Please enter who gave / should give this income');
        return;
      }

      await createIncome({
        type: form.type,
        expectedAmount: Number(form.expectedAmount),
        amount: Number(form.amount),
        from: form.from.trim()
      });

      toast.success('Income recorded');
      setForm({ type: 'cash', expectedAmount: '', amount: '', from: '' });

      await queryClient.invalidateQueries({ queryKey: ['incomes'] });
    } catch (error) {
      console.error('Error creating income:', error);
      toast.error(error.response?.data?.message || 'Failed to record income');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-emerald-600" size={20} />
                Income
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Track incoming cash and bank income with source information.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex gap-2 text-xs">
                {[{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }].map((r) => {
                  const isActive = filters.range === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, range: r.key }))}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 text-sm items-center">
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-emerald-100">
                  <p className="text-xs text-gray-500">Total Cash</p>
                  <p className="text-base font-semibold text-emerald-700">
                    Rs. {totalByType.cash.toLocaleString('en-PK')}
                  </p>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-blue-100">
                  <p className="text-xs text-gray-500">Total In Account</p>
                  <p className="text-base font-semibold text-blue-700">
                    Rs. {totalByType.inAccount.toLocaleString('en-PK')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowForm((prev) => !prev)}
                  className="px-4 py-2 flex items-center gap-2 text-sm"
                >
                  <PlusCircle size={18} />
                  {showForm ? 'Hide Form' : 'Add Income'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* New Income Form */}
      {showForm && (
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <PlusCircle size={18} className="text-emerald-600" />
              Add Income
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="in_account">In Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Amount (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.expectedAmount}
                    onChange={(e) => setForm({ ...form, expectedAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Total they should pay (e.g. 5000)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Now (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="How much they gave now (e.g. 2000)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (who gave)</label>
                <input
                  type="text"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  placeholder="Retailer / Customer name"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="px-6 flex items-center gap-2">
                  <PlusCircle size={18} />
                  Save Income
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Per-person balances */}
      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Balances by Person</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {perPersonBalances.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm">No balances yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Should Pay</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Received</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {perPersonBalances.map((p) => (
                    <tr key={p.from} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-800">{p.from}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Rs. {Number(p.totalExpected || 0).toLocaleString('en-PK')}</td>
                      <td className="px-4 py-2 text-sm text-emerald-700">Rs. {Number(p.totalPaid || 0).toLocaleString('en-PK')}</td>
                      <td className={`px-4 py-2 text-sm font-semibold ${Number(p.remaining || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        Rs. {Number(p.remaining || 0).toLocaleString('en-PK')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Income List */}
      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-lg font-semibold text-gray-800">Income Records</CardTitle>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="w-full md:w-64">
              <SearchBar
                value={filters.search}
                onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                placeholder="Search by name (from)..."
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Types</option>
              <option value="cash">Cash</option>
              <option value="in_account">In Account</option>
            </select>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">Loading income records...</div>
          ) : incomes.length === 0 ? (
            <div className="py-10 text-center text-gray-500">No income records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Should Pay</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid Now</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Before</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due After</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incomes.map((inc) => (
                    <tr key={inc._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {new Date(inc.date || inc.createdAt).toLocaleString('en-PK', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold">
                        {inc.type === 'in_account' ? 'In Account' : 'Cash'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        Rs. {Number(inc.expectedAmount || 0).toLocaleString('en-PK')}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-emerald-700">
                        Rs. {Number(inc.amount || 0).toLocaleString('en-PK')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        Rs. {Number(incomeBalancesMap[inc._id]?.remainingBefore || 0).toLocaleString('en-PK')}
                      </td>
                      <td className={`px-4 py-2 text-sm font-semibold ${Number(incomeBalancesMap[inc._id]?.remainingAfter || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        Rs. {Number(incomeBalancesMap[inc._id]?.remainingAfter || 0).toLocaleString('en-PK')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {inc.from}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {inc.createdBy?.username || inc.createdBy?.email || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default Income;