import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import { getDispatchRecords, upsertDispatchRecord } from '../services/api';

const DispatchRecords = () => {
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
  const [poParcels, setPoParcels] = useState('');
  const [poCostPerParcel, setPoCostPerParcel] = useState('');
  const [leopardParcels, setLeopardParcels] = useState('');
  const [leopardCostPerParcel, setLeopardCostPerParcel] = useState('');

  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(today || '').slice(0, 7));

  const queryParams = useMemo(() => {
    return {
      date: filterDate || undefined,
      month: filterDate ? undefined : (filterMonth || undefined),
      limit: 5000,
    };
  }, [filterDate, filterMonth]);

  const { data: history = [], isLoading, isFetching } = useQuery({
    queryKey: ['dispatch-records', queryParams],
    queryFn: async () => {
      const res = await getDispatchRecords(queryParams);
      return res.data || [];
    },
    keepPreviousData: true,
  });

  const { mutate: saveRecord, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => {
      const res = await upsertDispatchRecord(payload);
      return res.data;
    },
    onSuccess: async () => {
      setShowEntryForm(false);
      setPoParcels('');
      setPoCostPerParcel('');
      setLeopardParcels('');
      setLeopardCostPerParcel('');
      toast.success('Saved');
      await queryClient.invalidateQueries({ queryKey: ['dispatch-records'] });
    },
    onError: (error) => {
      const msg = error?.response?.data?.message || 'Failed to save';
      toast.error(msg);
    }
  });

  const handleSave = () => {
    const date = String(entryDate || '').trim();
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    const numericPoParcels = Number(poParcels);
    const numericPoCost = Number(poCostPerParcel);
    const numericLeopardParcels = Number(leopardParcels);
    const numericLeopardCost = Number(leopardCostPerParcel);

    const nums = [numericPoParcels, numericPoCost, numericLeopardParcels, numericLeopardCost];
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error('Please enter valid non-negative numbers');
      return;
    }

    saveRecord({
      date,
      poParcels: numericPoParcels,
      poCostPerParcel: numericPoCost,
      leopardParcels: numericLeopardParcels,
      leopardCostPerParcel: numericLeopardCost,
    });
  };

  const totals = useMemo(() => {
    const rows = Array.isArray(history) ? history : [];

    const out = rows.reduce(
      (acc, row) => {
        const poCount = Number(row?.poParcels || 0);
        const poCost = Number(row?.poTotalCost ?? (Number(row?.poCostPerParcel || 0) * poCount));
        const leoCount = Number(row?.leopardParcels || 0);
        const leoCost = Number(row?.leopardTotalCost ?? (Number(row?.leopardCostPerParcel || 0) * leoCount));

        acc.poParcels += poCount;
        acc.poTotalCost += poCost;
        acc.leopardParcels += leoCount;
        acc.leopardTotalCost += leoCost;
        return acc;
      },
      { poParcels: 0, poTotalCost: 0, leopardParcels: 0, leopardTotalCost: 0 }
    );

    out.totalParcels = out.poParcels + out.leopardParcels;
    out.totalCost = out.poTotalCost + out.leopardTotalCost;
    out.poAvgCostPerParcel = out.poParcels > 0 ? out.poTotalCost / out.poParcels : 0;
    out.leopardAvgCostPerParcel = out.leopardParcels > 0 ? out.leopardTotalCost / out.leopardParcels : 0;
    return out;
  }, [history]);

  const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dispatch Records</span>
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
          {showEntryForm && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Parcels</label>
                <input
                  type="number"
                  min="0"
                  value={poParcels}
                  onChange={(e) => setPoParcels(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. 120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Cost/Parcel</label>
                <input
                  type="number"
                  min="0"
                  value={poCostPerParcel}
                  onChange={(e) => setPoCostPerParcel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. 35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leopards/LCS Parcels</label>
                <input
                  type="number"
                  min="0"
                  value={leopardParcels}
                  onChange={(e) => setLeopardParcels(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. 40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leopards Cost/Parcel</label>
                <input
                  type="number"
                  min="0"
                  value={leopardCostPerParcel}
                  onChange={(e) => setLeopardCostPerParcel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. 60"
                />
              </div>

              <div className="md:col-span-5 flex justify-end">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">PO Dispatched Parcels</div>
              <div className="text-lg font-semibold text-slate-800">{Number(totals.poParcels || 0).toLocaleString('en-PK')}</div>
              <div className="text-xs text-slate-500">Avg Cost/Parcel: {formatCurrency(totals.poAvgCostPerParcel || 0)}</div>
            </div>
            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Leopards/LCS Dispatched Parcels</div>
              <div className="text-lg font-semibold text-slate-800">{Number(totals.leopardParcels || 0).toLocaleString('en-PK')}</div>
              <div className="text-xs text-slate-500">Avg Cost/Parcel: {formatCurrency(totals.leopardAvgCostPerParcel || 0)}</div>
            </div>
            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Total Dispatched Parcels</div>
              <div className="text-lg font-semibold text-slate-800">{Number(totals.totalParcels || 0).toLocaleString('en-PK')}</div>
              <div className="text-xs text-slate-500">Total Cost: {formatCurrency(totals.totalCost || 0)}</div>
            </div>
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">PO Parcels</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">PO Cost/Parcel</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">PO Total</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Leopards Parcels</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Leopards Cost/Parcel</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Leopards Total</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Parcels</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm">Loading...</td>
                  </tr>
                ) : (Array.isArray(history) && history.length > 0 ? (
                  history.map((row) => {
                    const poCount = Number(row?.poParcels || 0);
                    const poCpp = Number(row?.poCostPerParcel || 0);
                    const poTotal = Number(row?.poTotalCost ?? (poCount * poCpp));

                    const leoCount = Number(row?.leopardParcels || 0);
                    const leoCpp = Number(row?.leopardCostPerParcel || 0);
                    const leoTotal = Number(row?.leopardTotalCost ?? (leoCount * leoCpp));

                    const totalParcels = Number(row?.totalParcels ?? (poCount + leoCount));
                    const totalCost = Number(row?.totalCost ?? (poTotal + leoTotal));

                    const isRowToday = String(row?.dateYMD || '') === String(today);

                    return (
                      <tr key={row?._id || row?.dateYMD} className={isRowToday ? 'bg-emerald-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{row?.dateYMD || ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{poCount.toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{formatCurrency(poCpp)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{formatCurrency(poTotal)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{leoCount.toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{formatCurrency(leoCpp)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{formatCurrency(leoTotal)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{totalParcels.toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 text-right whitespace-nowrap">{formatCurrency(totalCost)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm">No records found.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default DispatchRecords;
