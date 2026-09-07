import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import { getAdSpends, upsertAdSpend } from '../services/api';
import DispatchRecords from './DispatchRecords';

const AdSpendPage = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const toLocalDateInputValue = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  const today = toLocalDateInputValue(new Date());

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryDate, setEntryDate] = useState(today);
  const [entryTotal, setEntryTotal] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(today || '').slice(0, 7));
  const [lastSave, setLastSave] = useState(null);
  const [activeTab, setActiveTab] = useState('adspend');

  const queryParams = useMemo(() => {
    return {
      date: filterDate || undefined,
      month: filterDate ? undefined : (filterMonth || undefined),
      limit: 5000,
    };
  }, [filterDate, filterMonth]);

  const { data: history = [], isLoading, isFetching } = useQuery({
    queryKey: ['adspend-history', queryParams],
    queryFn: async () => {
      const res = await getAdSpends(queryParams);
      return res.data || [];
    },
    keepPreviousData: true,
  });

  const { mutate: saveAdSpend, isPending: isSaving } = useMutation({
    mutationFn: async ({ date, total }) => {
      const res = await upsertAdSpend({ date, total });
      return res.data;
    },
    onSuccess: async (data) => {
      setLastSave(data);
      setShowEntryForm(false);
      setEntryTotal('');
      toast.success('Saved');
      await queryClient.invalidateQueries({ queryKey: ['adspend-history'] });
    },
    onError: (error) => {
      const msg = error?.response?.data?.message || 'Failed to save';
      toast.error(msg);
    }
  });

  const latestEntry = history?.[0] || null;
  const hasToday = (Array.isArray(history) ? history : []).some((x) => String(x?.dateYMD || '') === String(today));

  const selectedSummary = useMemo(() => {
    if (lastSave?.entry?.dateYMD && String(lastSave.entry.dateYMD) === String(entryDate)) {
      return {
        dateYMD: lastSave.entry.dateYMD,
        total: Number(lastSave?.entry?.total || 0),
        previousTotal: Number(lastSave?.previousTotal || 0),
        dailySpend: Number(lastSave?.todaySpend || 0),
      };
    }

    const row = (Array.isArray(history) ? history : []).find((x) => String(x?.dateYMD || '') === String(entryDate));
    if (!row) return null;

    return {
      dateYMD: row.dateYMD,
      total: Number(row?.total || 0),
      previousTotal: Number(row?.previousTotal || 0),
      dailySpend: Number(row?.dailySpend || 0),
    };
  }, [entryDate, history, lastSave]);

  const handleSave = () => {
    const date = String(entryDate || '').trim();
    const total = Number(entryTotal);

    if (!date) {
      toast.error('Please select a date');
      return;
    }
    if (!Number.isFinite(total) || total < 0) {
      toast.error('Please enter a valid total amount');
      return;
    }

    saveAdSpend({ date, total });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('adspend')}
          className={
            activeTab === 'adspend'
              ? 'px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white'
              : 'px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }
        >
          AdSpend
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dispatch')}
          className={
            activeTab === 'dispatch'
              ? 'px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white'
              : 'px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }
        >
          Dispatched Parcels
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        <DispatchRecords />
      ) : (
        <>
          <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AdSpend</span>
                <Button
                  type="button"
                  className="text-sm px-3 py-1"
                  onClick={() => setShowEntryForm((prev) => !prev)}
                >
                  {showEntryForm ? 'Hide' : 'Add'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {!hasToday && (
                <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                  Today entry not found. Please add today cumulative total.
                </div>
              )}

              {showEntryForm && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cumulative Total (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={entryTotal}
                      onChange={(e) => setEntryTotal(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. 10000"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Previous Total</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {Number(selectedSummary?.previousTotal || 0).toLocaleString('en-PK')}
                  </div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Today Spend</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {Number(selectedSummary?.dailySpend || 0).toLocaleString('en-PK')}
                  </div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Cumulative Total</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {Number(selectedSummary?.total || 0).toLocaleString('en-PK')}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Latest recorded: {latestEntry?.dateYMD || '-'} • Total: {Number(latestEntry?.total || 0).toLocaleString('en-PK')} • Daily: {Number(latestEntry?.dailySpend || 0).toLocaleString('en-PK')}
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>History</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      if (e.target.value) {
                        setFilterMonth('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter by date"
                  />
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(e.target.value);
                      if (e.target.value) {
                        setFilterDate('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter by month"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Previous Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cumulative Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Today Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading || isFetching ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">
                          Loading...
                        </td>
                      </tr>
                    ) : (Array.isArray(history) && history.length > 0 ? (
                      history.map((row) => {
                        const isRowToday = String(row?.dateYMD || '') === String(today);
                        return (
                          <tr key={row?._id || row?.dateYMD} className={isRowToday ? 'bg-emerald-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{row?.dateYMD || ''}</td>
                            <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{Number(row?.previousTotal || 0).toLocaleString('en-PK')}</td>
                            <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{Number(row?.total || 0).toLocaleString('en-PK')}</td>
                            <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{Number(row?.dailySpend || 0).toLocaleString('en-PK')}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">
                          No records found.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdSpendPage;
