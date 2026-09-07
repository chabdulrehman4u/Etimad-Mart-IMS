import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFinancePnL } from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
} from 'lucide-react';

const FinancePnL = () => {
  const [datePreset, setDatePreset] = useState('all'); // this_month, last_month, this_year, all, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const computeDates = () => {
    const now = new Date();
    if (datePreset === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      return { startDate: first, endDate: today };
    }
    if (datePreset === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { startDate: first, endDate: last };
    }
    if (datePreset === 'this_year') {
      const first = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      return { startDate: first, endDate: today };
    }
    if (datePreset === 'custom') {
      return { startDate, endDate };
    }
    return {}; // all time
  };

  const activeDates = computeDates();

  const { data: pnl = {}, isLoading } = useQuery({
    queryKey: ['financePnL', activeDates.startDate, activeDates.endDate, datePreset],
    queryFn: async () => {
      const res = await getFinancePnL({
        startDate: activeDates.startDate || undefined,
        endDate: activeDates.endDate || undefined,
      });
      return res.data;
    },
  });

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

  const revenue = Number(pnl.salesRevenue || 0);
  const cogs = Number(pnl.costOfGoodsSold || 0);
  const grossProfit = Number(pnl.grossProfit || 0);
  const expenses = Number(pnl.totalOperatingExpenses || 0);
  const netProfit = Number(pnl.netProfit || 0);
  const grossMargin = pnl.grossMargin ? Number(pnl.grossMargin).toFixed(1) : 0;
  const netMargin = pnl.netMargin ? Number(pnl.netMargin).toFixed(1) : 0;
  const expenseCategories = pnl.operatingExpensesByCategory || [];

  return (
    <div className="space-y-6">
      {/* Controls & Filter */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Profit & Loss Income Statement</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational performance: Sales Revenue − Cost of Goods Sold (COGS) − Operating Expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                datePreset === preset.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {datePreset === 'custom' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Main Income Statement Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Top 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold uppercase text-slate-500">Gross Trading Profit</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCur(grossProfit)}</h3>
            <span className="text-xs font-medium text-emerald-600 mt-1 inline-block">
              {grossMargin}% Gross Margin
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200">
            <span className="text-xs font-semibold uppercase text-rose-700">Operating Expenses</span>
            <h3 className="text-2xl font-bold text-rose-700 mt-1">{formatCur(expenses)}</h3>
            <span className="text-xs text-rose-600 mt-1 inline-block">
              {expenseCategories.length} expense categories
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              netProfit >= 0
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-rose-50/60 border-rose-200'
            }`}
          >
            <span
              className={`text-xs font-semibold uppercase ${
                netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              Net Operational Profit
            </span>
            <h3
              className={`text-2xl font-black mt-1 ${
                netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCur(netProfit)}
            </h3>
            <span
              className={`text-xs font-bold mt-1 inline-block ${
                netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {netMargin}% Net Margin
            </span>
          </div>
        </div>

        {/* Detailed Financial Statement Ledger Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
          <div className="bg-slate-900 text-white px-5 py-3 font-bold text-xs uppercase tracking-wider">
            Statement of Profit or Loss
          </div>

          <div className="divide-y divide-slate-100">
            {/* Revenue */}
            <div className="flex justify-between items-center px-5 py-3.5 bg-slate-50/50 hover:bg-slate-50">
              <span className="font-semibold text-slate-900">Total Sales Revenue (Turnover)</span>
              <span className="font-bold text-slate-900 font-mono text-base">
                {formatCur(revenue)}
              </span>
            </div>

            {/* COGS */}
            <div className="flex justify-between items-center px-5 py-3 text-slate-700 hover:bg-slate-50">
              <span className="pl-4 text-xs text-slate-600">
                Less: Cost of Goods Sold (COGS - Purchase Cost of Items Sold)
              </span>
              <span className="font-semibold text-rose-600 font-mono">
                - {formatCur(cogs)}
              </span>
            </div>

            {/* Gross Profit Bar */}
            <div className="flex justify-between items-center px-5 py-3.5 bg-blue-50/50 font-bold border-t-2 border-slate-300">
              <span className="text-blue-950">GROSS PROFIT</span>
              <div className="text-right">
                <span className="font-mono text-base text-blue-900">{formatCur(grossProfit)}</span>
                <span className="text-xs font-normal text-blue-700 ml-2">({grossMargin}%)</span>
              </div>
            </div>

            {/* Operating Expenses Heading */}
            <div className="px-5 py-2.5 bg-slate-100 text-xs font-bold uppercase text-slate-600">
              Operating Expenses
            </div>

            {expenseCategories.length === 0 ? (
              <div className="px-5 py-3 text-xs text-slate-400 italic">No operating expenses in this period.</div>
            ) : (
              expenseCategories.map((cat) => (
                <div key={cat.category} className="flex justify-between items-center px-5 py-2 text-xs text-slate-600 hover:bg-slate-50">
                  <span className="pl-4">
                    {cat.category} ({cat.count} records)
                  </span>
                  <span className="font-mono font-medium text-rose-600">
                    - {formatCur(cat.amount)}
                  </span>
                </div>
              ))
            )}

            <div className="flex justify-between items-center px-5 py-3 bg-slate-50 font-semibold text-xs border-t border-slate-200">
              <span>Total Operating Expenses</span>
              <span className="font-mono text-rose-700 font-bold text-sm">
                - {formatCur(expenses)}
              </span>
            </div>

            {/* NET OPERATIONAL PROFIT */}
            <div
              className={`flex justify-between items-center px-5 py-4 font-black border-t-2 border-slate-900 ${
                netProfit >= 0 ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {netProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                )}
                <span className="text-base uppercase">NET PROFIT / (LOSS)</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl font-mono ${
                    netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCur(netProfit)}
                </span>
                <span className="text-xs font-semibold ml-2">({netMargin}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informative Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Accounting Clarity:</strong> Net Profit reflects trading profit earned from sales margins minus utility/operational expenses.
            It does <strong>not</strong> deduct stock purchases because inventory remains an asset of the business.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancePnL;

