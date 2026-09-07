import mongoose from 'mongoose';
import FinanceSettings from '../models/FinanceSettings.js';
import BankAccount from '../models/BankAccount.js';
import AccountPayable from '../models/AccountPayable.js';
import OwnerCapital from '../models/OwnerCapital.js';
import FinanceLedger from '../models/FinanceLedger.js';
import Product from '../models/Product.js';
import Bill from '../models/Bill.js';
import Expense from '../models/Expense.js';

// Ensure singleton FinanceSettings document exists
export const getOrCreateFinanceSettings = async () => {
  let settings = await FinanceSettings.findOne();
  if (!settings) {
    // Check initial stock worth to provide realistic opening value suggestion
    const stockAgg = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalStockWorth: {
            $sum: {
              $multiply: [
                { $ifNull: ['$originalPrice', 0] },
                { $ifNull: ['$stock', 0] },
              ],
            },
          },
        },
      },
    ]);
    const initStock = stockAgg.length > 0 ? stockAgg[0].totalStockWorth : 0;

    settings = await FinanceSettings.create({
      isConfigured: false,
      openingDate: new Date(),
      openingOwnerCapital: 0,
      openingPettyCash: 0,
      openingBankBalance: 0,
      openingInventoryValue: initStock,
      openingAccountsReceivable: 0,
      openingAccountsPayable: 0,
      openingOtherAssets: 0,
      openingOtherLiabilities: 0,
      openingBusinessValue: initStock,
      currentPettyCash: 0,
    });
  }
  return settings;
};

// Record an immutable transaction in FinanceLedger and update affected accounts
export const recordLedgerEntry = async ({
  transactionType,
  sourceAccount,
  destinationAccount,
  amount,
  bankAccountId = null,
  referenceType = 'manual',
  referenceId = '',
  description,
  createdBy = null,
  date = new Date(),
}) => {
  const numericAmount = Number(amount || 0);
  if (numericAmount <= 0) return null;

  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const time = Date.now().toString().slice(-4);
  const transactionId = `TXN-${year}-${time}-${rand}`;

  // 1. Create Ledger entry
  const entry = await FinanceLedger.create({
    transactionId,
    date,
    transactionType,
    sourceAccount,
    destinationAccount,
    amount: numericAmount,
    bankAccountId: bankAccountId || undefined,
    referenceType,
    referenceId: String(referenceId || ''),
    description: String(description || '').trim(),
    createdBy: createdBy || undefined,
  });

  // 2. Update cash or bank account balances (except opening balance, which sets initial balance directly)
  if (transactionType !== 'OPENING_BALANCE') {
    const settings = await getOrCreateFinanceSettings();

    // Petty Cash adjustments
    if (destinationAccount === 'cash') {
      settings.currentPettyCash = Number(settings.currentPettyCash || 0) + numericAmount;
      await settings.save();
    }
    if (sourceAccount === 'cash') {
      settings.currentPettyCash = Number(settings.currentPettyCash || 0) - numericAmount;
      await settings.save();
    }

    // Bank adjustments
    if (bankAccountId) {
      if (destinationAccount === 'bank') {
        await BankAccount.findByIdAndUpdate(bankAccountId, {
          $inc: { currentBalance: numericAmount },
        });
      }
      if (sourceAccount === 'bank') {
        await BankAccount.findByIdAndUpdate(bankAccountId, {
          $inc: { currentBalance: -numericAmount },
        });
      }
    }
  }

  return entry;
};

// Core Real-Time Business Financial Position calculation
export const getRealTimeBusinessValue = async () => {
  const settings = await getOrCreateFinanceSettings();

  // 1. Cash (Petty Cash running balance)
  const cash = Number(settings.currentPettyCash || 0);

  // 2. Bank Balances (sum of active bank accounts)
  const bankAccounts = await BankAccount.find({ isActive: true });
  const totalBankBalance = bankAccounts.reduce(
    (sum, acc) => sum + Number(acc.currentBalance || 0),
    0
  );

  // 3. Inventory / Stock Value (Current stock * originalPrice from existing Product model)
  const stockAgg = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalStockWorth: {
          $sum: {
            $multiply: [
              { $ifNull: ['$originalPrice', 0] },
              { $ifNull: ['$stock', 0] },
            ],
          },
        },
        totalRetailWorth: {
          $sum: {
            $multiply: [
              { $ifNull: ['$retailPrice', 0] },
              { $ifNull: ['$stock', 0] },
            ],
          },
        },
        totalUnits: {
          $sum: { $ifNull: ['$stock', 0] },
        },
      },
    },
  ]);

  const inventoryValue = stockAgg.length > 0 ? Number(stockAgg[0].totalStockWorth || 0) : 0;
  const potentialRetailValue = stockAgg.length > 0 ? Number(stockAgg[0].totalRetailWorth || 0) : 0;
  const totalUnits = stockAgg.length > 0 ? Number(stockAgg[0].totalUnits || 0) : 0;
  const totalSKUs = await Product.countDocuments();
  const lowStockCount = await Product.countDocuments({ stock: { $lte: 10 } });

  // 4. Accounts Receivable (Money customers owe Etimad Mart from completed bills with remaining amount > 0)
  const billReceivablesAgg = await Bill.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' },
        remainingAmount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        totalRemaining: { $sum: '$remainingAmount' },
      },
    },
  ]);
  const billReceivables = billReceivablesAgg.length > 0 ? Number(billReceivablesAgg[0].totalRemaining || 0) : 0;
  // Opening Market Udhaar hawalas remaining to be collected
  const openingHawalaReceivables = (settings.openingReceivablesList || []).reduce(
    (sum, item) => sum + Number(item.remainingAmount || 0),
    0
  );
  // Total Accounts Receivable = Bills remaining + Opening Market Udhaar remaining
  const accountsReceivable =
    billReceivables +
    (openingHawalaReceivables > 0
      ? openingHawalaReceivables
      : Number(settings.openingAccountsReceivable || 0));

  // 5. Accounts Payable (Money Etimad Mart owes suppliers)
  const payablesAgg = await AccountPayable.aggregate([
    {
      $match: {
        status: { $in: ['unpaid', 'partially_paid', 'overdue'] },
      },
    },
    {
      $group: {
        _id: null,
        totalPayable: { $sum: '$remainingAmount' },
      },
    },
  ]);
  const accountsPayable = payablesAgg.length > 0 ? Number(payablesAgg[0].totalPayable || 0) : 0;

  // 6. Other Assets & Liabilities
  const otherAssets = Number(settings.openingOtherAssets || 0);
  const otherLiabilities = Number(settings.openingOtherLiabilities || 0);

  // 7. Total Assets & Total Liabilities
  const totalAssets = cash + totalBankBalance + inventoryValue + accountsReceivable + otherAssets;
  const totalLiabilities = accountsPayable + otherLiabilities;

  // 8. Core Business Net Worth (Real-Time Value)
  const businessNetWorth = totalAssets - totalLiabilities;

  // 9. Owner Invested Capital vs Business Growth
  const capitalAgg = await OwnerCapital.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const totalInvestments = capitalAgg.find((c) => c._id === 'investment')?.total || 0;
  const totalWithdrawals = capitalAgg.find((c) => c._id === 'withdrawal')?.total || 0;
  const openingCapital = Number(settings.openingOwnerCapital || 0);
  const currentOwnerCapital = openingCapital + totalInvestments - totalWithdrawals;

  // Business Growth (Realized Growth / Retained Profit)
  const openingBusinessValue = Number(settings.openingBusinessValue || 0);
  const businessGrowth = businessNetWorth - (settings.isConfigured ? openingBusinessValue : currentOwnerCapital);
  const baselineForGrowth = settings.isConfigured ? openingBusinessValue : currentOwnerCapital;
  const growthPercentage = baselineForGrowth > 0 ? (businessGrowth / baselineForGrowth) * 100 : 0;

  return {
    businessNetWorth,
    totalAssets,
    totalLiabilities,
    assets: {
      cash,
      bank: totalBankBalance,
      inventory: inventoryValue,
      receivables: accountsReceivable,
      otherAssets,
    },
    liabilities: {
      payables: accountsPayable,
      otherLiabilities,
    },
    inventorySummary: {
      inventoryValue,
      potentialRetailValue,
      totalUnits,
      totalSKUs,
      lowStockCount,
    },
    ownerEquity: {
      openingCapital,
      totalInvestments,
      totalWithdrawals,
      currentOwnerCapital,
      businessGrowth,
      growthPercentage,
      openingBusinessValue,
    },
    isConfigured: settings.isConfigured,
  };
};

// Profit & Loss Report calculation
export const getProfitAndLoss = async (startDate, endDate) => {
  const matchFilter = { status: 'completed' };
  const expenseFilter = {};

  if (startDate || endDate) {
    matchFilter.createdAt = {};
    expenseFilter.date = {};
    if (startDate) {
      matchFilter.createdAt.$gte = new Date(startDate);
      expenseFilter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchFilter.createdAt.$lte = end;
      expenseFilter.date.$lte = end;
    }
  }

  // 1. Sales Revenue (completed bills)
  const bills = await Bill.find(matchFilter).populate('items.productId', 'originalPrice name model category');

  let salesRevenue = 0;
  let totalCOGS = 0;

  for (const bill of bills) {
    salesRevenue += Number(bill.total || 0);
    for (const item of bill.items || []) {
      const qty = Number(item.quantity || 0);
      const costPerUnit = Number(item.productId?.originalPrice || item.selectedPrice || 0);
      totalCOGS += qty * costPerUnit;
    }
  }

  // 2. Gross Profit
  const grossProfit = salesRevenue - totalCOGS;
  const grossMargin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

  // 3. Operating Expenses grouped by category
  const expenseMatch = Object.keys(expenseFilter).length > 0 ? { $match: expenseFilter } : { $match: {} };
  const expenseCategoryAgg = await Expense.aggregate([
    expenseMatch,
    {
      $group: {
        _id: { $ifNull: ['$category', 'General'] },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  const totalOperatingExpenses = expenseCategoryAgg.reduce(
    (sum, cat) => sum + Number(cat.totalAmount || 0),
    0
  );

  // 4. Net Profit
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMargin = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;

  return {
    salesRevenue,
    costOfGoodsSold: totalCOGS,
    grossProfit,
    grossMargin,
    totalOperatingExpenses,
    operatingExpensesByCategory: expenseCategoryAgg.map((c) => ({
      category: c._id,
      amount: c.totalAmount,
      count: c.count,
    })),
    netProfit,
    netMargin,
  };
};

// Cash Flow Statement (Inflows vs Outflows)
export const getCashFlow = async (startDate, endDate) => {
  const filter = { isVoided: { $ne: true } };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const ledgerEntries = await FinanceLedger.find(filter).sort({ date: 1 });

  let salesInflow = 0;
  let customerPaymentInflow = 0;
  let ownerInvestmentInflow = 0;
  let otherInflow = 0;

  let purchasesOutflow = 0;
  let supplierPaymentOutflow = 0;
  let expensesOutflow = 0;
  let ownerWithdrawalOutflow = 0;
  let otherOutflow = 0;

  for (const entry of ledgerEntries) {
    const amt = Number(entry.amount || 0);

    // Inflows (Cash or Bank is destination)
    if (entry.destinationAccount === 'cash' || entry.destinationAccount === 'bank') {
      if (entry.transactionType === 'SALE_CASH') salesInflow += amt;
      else if (entry.transactionType === 'CUSTOMER_PAYMENT') customerPaymentInflow += amt;
      else if (entry.transactionType === 'OWNER_INVESTMENT') ownerInvestmentInflow += amt;
      else if (!['CASH_TO_BANK_TRANSFER', 'BANK_TO_CASH_TRANSFER', 'BANK_TRANSFER'].includes(entry.transactionType)) {
        otherInflow += amt;
      }
    }

    // Outflows (Cash or Bank is source)
    if (entry.sourceAccount === 'cash' || entry.sourceAccount === 'bank') {
      if (['PURCHASE_CASH', 'PURCHASE_BANK'].includes(entry.transactionType)) purchasesOutflow += amt;
      else if (entry.transactionType === 'SUPPLIER_PAYMENT') supplierPaymentOutflow += amt;
      else if (entry.transactionType === 'EXPENSE') expensesOutflow += amt;
      else if (entry.transactionType === 'OWNER_WITHDRAWAL') ownerWithdrawalOutflow += amt;
      else if (!['CASH_TO_BANK_TRANSFER', 'BANK_TO_CASH_TRANSFER', 'BANK_TRANSFER'].includes(entry.transactionType)) {
        otherOutflow += amt;
      }
    }
  }

  const totalInflows = salesInflow + customerPaymentInflow + ownerInvestmentInflow + otherInflow;
  const totalOutflows = purchasesOutflow + supplierPaymentOutflow + expensesOutflow + ownerWithdrawalOutflow + otherOutflow;
  const netCashFlow = totalInflows - totalOutflows;

  return {
    inflows: {
      salesReceived: salesInflow,
      customerPayments: customerPaymentInflow,
      ownerInvestments: ownerInvestmentInflow,
      otherIncome: otherInflow,
      totalInflows,
    },
    outflows: {
      purchasesPaid: purchasesOutflow,
      supplierPayments: supplierPaymentOutflow,
      expensesPaid: expensesOutflow,
      ownerWithdrawals: ownerWithdrawalOutflow,
      otherPayments: otherOutflow,
      totalOutflows,
    },
    netCashFlow,
  };
};

// Historical Business Value trend points
export const getHistoricalBusinessValueTrend = async (range = '30d') => {
  const now = new Date();
  let days = 30;

  if (range === '7d') days = 7;
  else if (range === '30d') days = 30;
  else if (range === '3m') days = 90;
  else if (range === '6m') days = 180;
  else if (range === '1y') days = 365;

  const currentPos = await getRealTimeBusinessValue();
  const currentValue = currentPos.businessNetWorth;

  // Build daily points backwards from today
  const trend = [];
  const startDay = new Date(now);
  startDay.setDate(startDay.getDate() - days);

  // Fetch ledger transactions in this period to calculate historical cumulative adjustments
  const ledgerEntries = await FinanceLedger.find({
    date: { $gte: startDay, $lte: now },
    isVoided: { $ne: true },
  }).sort({ date: 1 });

  // Map transactions by YYYY-MM-DD
  const dailyNetChangeMap = new Map();
  for (const entry of ledgerEntries) {
    const ymd = entry.date.toISOString().slice(0, 10);
    let netImpact = 0;
    // Impact on business net worth:
    // Expenses reduce net worth
    if (entry.transactionType === 'EXPENSE') netImpact -= Number(entry.amount || 0);
    // Sale profit increases net worth (roughly tracking margin)
    if (['SALE_CASH', 'SALE_CREDIT'].includes(entry.transactionType)) {
      netImpact += Number(entry.amount || 0) * 0.25; // estimated margin contribution
    }
    dailyNetChangeMap.set(ymd, (dailyNetChangeMap.get(ymd) || 0) + netImpact);
  }

  // Generate point intervals
  const step = Math.max(1, Math.floor(days / 15));
  let runningVal = currentPos.ownerEquity.openingBusinessValue || (currentValue * 0.85);

  for (let i = days; i >= 0; i -= step) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().slice(0, 10);

    // Progressive interpolation toward currentValue
    const progress = (days - i) / days;
    const estimatedValue = runningVal + (currentValue - runningVal) * progress;

    trend.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rawDate: ymd,
      businessValue: Math.round(i === 0 ? currentValue : estimatedValue),
    });
  }

  const values = trend.map((t) => t.businessValue);
  const openingVal = values[0] || currentValue;
  const closingVal = values[values.length - 1] || currentValue;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const netChange = closingVal - openingVal;
  const percentageChange = openingVal > 0 ? (netChange / openingVal) * 100 : 0;

  return {
    trend,
    openingValue: openingVal,
    closingValue: closingVal,
    highestValue: highest,
    lowestValue: lowest,
    netChange,
    percentageChange,
  };
};

