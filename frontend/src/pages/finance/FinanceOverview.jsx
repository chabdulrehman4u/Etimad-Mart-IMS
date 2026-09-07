import React from 'react';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Package,
  Users,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  Scale,
  Sparkles,
} from 'lucide-react';

const FinanceOverview = ({
  overview,
  onNavigateTab,
  onOpenSetup,
  onOpenInvestment,
  onOpenWithdrawal,
  onOpenPettyCash,
  onOpenTransfer,
}) => {
  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

  const assets = overview?.assets || {};
  const liabilities = overview?.liabilities || {};
  const ownerEquity = overview?.ownerEquity || {};
  const inventory = overview?.inventorySummary || {};
  const currentMonth = overview?.currentMonth || {};

  const totalAssets = Number(overview?.totalAssets || 0);
  const totalLiab = Number(overview?.totalLiabilities || 0);
  const netWorth = Number(overview?.businessNetWorth || 0);
  const investedCapital = Number(ownerEquity?.currentOwnerCapital || 0);
  const businessGrowth = Number(ownerEquity?.businessGrowth || 0);
  const isPositiveGrowth = businessGrowth >= 0;

  // Percentage calculations for balance sheet bar
  const totalBalanceSheet = (totalAssets + totalLiab) || 1;
  const assetsPercent = Math.min(100, Math.round((totalAssets / totalBalanceSheet) * 100));
  const liabPercent = Math.max(0, 100 - assetsPercent);

  return (
    <div className="space-y-6">
      {/* 1. Unconfigured Warning Banner if Setup not completed */}
      {!overview?.isConfigured && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-300 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-bold text-amber-950">
                Baseline Financial Position Not Yet Configured
              </h4>
              <p className="text-xs text-amber-800 mt-1">
                Enter your opening cash, initial owner invested capital, and baseline bank balances to accurately track true business growth.
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={onOpenSetup} className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white">
            Configure Baseline Setup
          </Button>
        </div>
      )}

      {/* 2. Top Executive Business Position Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Scale className="w-24 h-24" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Business Net Worth
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            {formatCur(netWorth)}
          </h2>
          <p className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Total Assets - Total Liabilities
          </p>
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex justify-between text-[11px] text-slate-400">
            <span>Assets: {formatCur(totalAssets)}</span>
            <span>Liab: {formatCur(totalLiab)}</span>
          </div>
        </div>

        {/* Invested Capital */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Owner's Invested Capital
          </span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">
            {formatCur(investedCapital)}
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            Base Equity: {formatCur(ownerEquity.openingCapital)}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
            <span>+ Injected: {formatCur(ownerEquity.totalInvestments)}</span>
            <span>- Drawings: {formatCur(ownerEquity.totalWithdrawals)}</span>
          </div>
        </div>

        {/* Real Business Growth */}
        <div className={`rounded-xl p-5 shadow-sm border ${
          isPositiveGrowth
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Net Business Value Gain
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
              isPositiveGrowth ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isPositiveGrowth ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {ownerEquity.growthPercentage ? `${ownerEquity.growthPercentage}%` : '0%'}
            </span>
          </div>
          <h2 className={`text-2xl font-black mt-1 ${isPositiveGrowth ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCur(businessGrowth)}
          </h2>
          <p className="text-xs text-slate-600 mt-2">
            Net Worth - Invested Capital
          </p>
          <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600">
            {isPositiveGrowth
              ? '✅ Business created positive net value above invested capital.'
              : '⚠️ Net worth is currently below total invested capital.'}
          </div>
        </div>

        {/* Real-time Total Liquid Funds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Cash & Bank Liquidity
          </span>
          <h2 className="text-2xl font-black text-blue-600 mt-1">
            {formatCur((assets.cash || 0) + (assets.bank || 0))}
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            Readily accessible business funds
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-600">
            <span>Cash: {formatCur(assets.cash)}</span>
            <span>Banks: {formatCur(assets.bank)}</span>
          </div>
        </div>
      </div>

      {/* 3. Core Accounting Insight Banner (Explains Business Value != Cash) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800">
              Fundamental Accounting Rule: Stock Purchases & Owner Capital
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              When Etimad Mart spends Rs. 100,000 cash to purchase stock, <strong>business net worth does NOT drop</strong>. Cash drops by Rs. 100,000, but inventory value rises by Rs. 100,000.
              Similarly, when the owner invests Rs. 500,000 capital, it is <strong>equity</strong>, not operational sales revenue.
              This dashboard reflects your true net wealth across stock, cash, receivables, and debts.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Balance Sheet Structure Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets Column */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <h3 className="text-base font-bold text-slate-800">Business Assets</h3>
            </div>
            <span className="text-base font-black text-emerald-600">{formatCur(totalAssets)}</span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div
              onClick={() => onNavigateTab('inventory')}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-800">Inventory Stock Worth</p>
                  <p className="text-[10px] text-slate-500">{inventory.totalSKUs || 0} SKUs ({inventory.totalUnits || 0} units)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{formatCur(assets.inventory)}</p>
                <p className="text-[10px] text-emerald-600">Cost Price</p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('receivables')}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-800">Customer Receivables</p>
                  <p className="text-[10px] text-slate-500">Market Udhaar to collect</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{formatCur(assets.receivables)}</p>
                <p className="text-[10px] text-blue-600">Pending</p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('petty-cash')}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-slate-800">Petty Cash / Counter Cash</p>
                  <p className="text-[10px] text-slate-500">Physical drawer cash</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{formatCur(assets.cash)}</p>
                <p className="text-[10px] text-amber-600">Liquid</p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('banks')}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-semibold text-slate-800">Bank Accounts</p>
                  <p className="text-[10px] text-slate-500">All active business banks</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{formatCur(assets.bank)}</p>
                <p className="text-[10px] text-purple-600">Verified</p>
              </div>
            </div>

            {assets.otherAssets > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">Other Business Assets</p>
                  <p className="text-[10px] text-slate-500">Equipment, shop fittings</p>
                </div>
                <p className="font-bold text-slate-800">{formatCur(assets.otherAssets)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Liabilities Column */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <h3 className="text-base font-bold text-slate-800">Liabilities & Payables</h3>
            </div>
            <span className="text-base font-black text-rose-600">{formatCur(totalLiab)}</span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div
              onClick={() => onNavigateTab('payables')}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-rose-600" />
                <div>
                  <p className="font-semibold text-slate-800">Accounts Payable</p>
                  <p className="text-[10px] text-slate-500">Supplier bills & credit owed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-rose-600">{formatCur(liabilities.payables)}</p>
                <p className="text-[10px] text-slate-500">Supplier Udhaar</p>
              </div>
            </div>

            {liabilities.otherLiabilities > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">Other Liabilities</p>
                  <p className="text-[10px] text-slate-500">External loans / debts</p>
                </div>
                <p className="font-bold text-rose-600">{formatCur(liabilities.otherLiabilities)}</p>
              </div>
            )}

            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl mt-4">
              <h4 className="font-semibold text-amber-900 mb-1">Debt Coverage Ratio</h4>
              <p className="text-[11px] text-amber-800">
                {totalLiab === 0 ? (
                  '🎉 Etimad Mart is currently 100% debt-free with zero supplier payables.'
                ) : (
                  `Liquid assets cover ${(((assets.cash + assets.bank) / (totalLiab || 1)) * 100).toFixed(0)}% of outstanding supplier debt.`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Current Month Operational P&L */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Month-to-Date Performance</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                This Month
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Sales Revenue:</span>
                <span className="font-semibold text-slate-800">{formatCur(currentMonth.revenue)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Cost of Goods Sold (COGS):</span>
                <span className="font-semibold text-slate-700">- {formatCur(currentMonth.cogs)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Gross Margin:</span>
                <span className="font-bold text-emerald-600">
                  {formatCur((currentMonth.revenue || 0) - (currentMonth.cogs || 0))}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Operating Expenses:</span>
                <span className="font-semibold text-rose-600">- {formatCur(currentMonth.expenses)}</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold">
                <span className="text-slate-900">Net Operational Profit:</span>
                <span className={currentMonth.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatCur(currentMonth.netProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              onClick={() => onNavigateTab('pnl')}
              className="w-full text-xs flex items-center justify-center gap-1"
            >
              View Full P&L Statement <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Quick Financial Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Quick Financial Operations
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <button
            onClick={() => onNavigateTab('purchases')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-medium text-center border border-slate-200 transition"
          >
            📦 New Purchase
          </button>
          <button
            onClick={onOpenPettyCash}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-medium text-center border border-slate-200 transition"
          >
            💵 Log Cash In/Out
          </button>
          <button
            onClick={onOpenTransfer}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-medium text-center border border-slate-200 transition"
          >
            🏦 Bank Deposit/Transfer
          </button>
          <button
            onClick={() => onNavigateTab('payables')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-medium text-center border border-slate-200 transition"
          >
            💳 Pay Supplier Udhaar
          </button>
          <button
            onClick={() => onNavigateTab('receivables')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-medium text-center border border-slate-200 transition"
          >
            🤝 Collect Customer Udhaar
          </button>
          <button
            onClick={onOpenInvestment}
            className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-medium text-center border border-blue-200 transition"
          >
            💼 Owner Capital
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceOverview;

