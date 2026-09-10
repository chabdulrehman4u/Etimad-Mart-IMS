import mongoose from 'mongoose';
import FinanceSettings from '../models/FinanceSettings.js';
import BankAccount from '../models/BankAccount.js';
import AccountPayable from '../models/AccountPayable.js';
import OwnerCapital from '../models/OwnerCapital.js';
import FinanceLedger from '../models/FinanceLedger.js';
import PurchaseBatch from '../models/PurchaseBatch.js';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import Bill from '../models/Bill.js';
import Expense from '../models/Expense.js';
import {
  getOrCreateFinanceSettings,
  recordLedgerEntry,
  getRealTimeBusinessValue,
  getProfitAndLoss,
  getCashFlow,
  getHistoricalBusinessValueTrend,
} from '../services/financeService.js';

// 1. Overview / Executive Dashboard Metrics
export const getFinanceOverview = async (req, res) => {
  try {
    const position = await getRealTimeBusinessValue();

    // Also get Current Month P&L
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const pnl = await getProfitAndLoss(startOfMonth, now);

    res.json({
      ...position,
      currentMonth: {
        revenue: pnl.salesRevenue,
        cogs: pnl.costOfGoodsSold,
        expenses: pnl.totalOperatingExpenses,
        netProfit: pnl.netProfit,
      },
    });
  } catch (error) {
    console.error('Error in getFinanceOverview:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// 2. Finance Setup & Opening Balances
export const getFinanceSetup = async (req, res) => {
  try {
    const settings = await getOrCreateFinanceSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveFinanceSetup = async (req, res) => {
  try {
    const {
      openingOwnerCapital = 0,
      openingPettyCash = 0,
      openingBankBalance = 0,
      openingInventoryValue = 0,
      openingAccountsReceivable = 0,
      openingAccountsPayable = 0,
      openingOtherAssets = 0,
      openingOtherLiabilities = 0,
      openingReceivablesList = [],
      otherAssetsDescription = '',
      otherLiabilitiesDescription = '',
      openingDate = new Date(),
    } = req.body;

    const numCapital = Number(openingOwnerCapital || 0);
    const numCash = Number(openingPettyCash || 0);
    const numBank = Number(openingBankBalance || 0);
    const numInv = Number(openingInventoryValue || 0);
    const numPay = Number(openingAccountsPayable || 0);
    const numOthAss = Number(openingOtherAssets || 0);
    const numOthLiab = Number(openingOtherLiabilities || 0);

    // Normalize openingReceivablesList if provided
    let normalizedReceivablesList = [];
    let totalReceivablesAmount = 0;
    if (Array.isArray(openingReceivablesList) && openingReceivablesList.length > 0) {
      normalizedReceivablesList = openingReceivablesList.map((item) => {
        const amt = Number(item.amount || 0);
        const collected = Number(item.collectedAmount || 0);
        const rem = item.remainingAmount !== undefined
          ? Number(item.remainingAmount || 0)
          : Math.max(0, amt - collected);
        totalReceivablesAmount += rem;
        return {
          partyName: String(item.partyName || '').trim() || 'Market Party',
          phone: String(item.phone || '').trim(),
          amount: amt,
          collectedAmount: collected,
          remainingAmount: rem,
          notes: String(item.notes || '').trim(),
          date: item.date ? new Date(item.date) : new Date(openingDate),
        };
      });
    }

    const numRec = normalizedReceivablesList.length > 0
      ? totalReceivablesAmount
      : Number(openingAccountsReceivable || 0);

    // Cash + Bank + Inventory + Receivables + Other Assets - Payables - Other Liabilities
    const openingBusinessValue =
      numCash + numBank + numInv + numRec + numOthAss - numPay - numOthLiab;

    const settings = await getOrCreateFinanceSettings();
    settings.isConfigured = true;
    settings.openingDate = openingDate ? new Date(openingDate) : new Date();
    settings.openingOwnerCapital = numCapital;
    settings.openingPettyCash = numCash;
    settings.openingBankBalance = numBank;
    settings.openingInventoryValue = numInv;
    settings.openingAccountsReceivable = numRec;
    if (normalizedReceivablesList.length > 0) {
      settings.openingReceivablesList = normalizedReceivablesList;
    }
    settings.openingAccountsPayable = numPay;
    settings.openingOtherAssets = numOthAss;
    settings.openingOtherLiabilities = numOthLiab;
    settings.openingBusinessValue = openingBusinessValue;
    settings.currentPettyCash = numCash; // Set initial running cash
    settings.otherAssetsDescription = String(otherAssetsDescription || '').trim();
    settings.otherLiabilitiesDescription = String(otherLiabilitiesDescription || '').trim();
    settings.configuredBy = req.user?.id;

    await settings.save();

    // Log Opening Balance in ledger if not logged yet
    await recordLedgerEntry({
      transactionType: 'OPENING_BALANCE',
      sourceAccount: 'equity',
      destinationAccount: 'equity',
      amount: Math.abs(openingBusinessValue) || 1,
      description: `Baseline opening setup configured. Opening Business Value: Rs. ${openingBusinessValue.toLocaleString()}`,
      referenceType: 'opening_balance',
      referenceId: String(settings._id),
      createdBy: req.user?.id,
    });

    res.json({
      success: true,
      message: 'Finance baseline setup saved successfully',
      settings,
      openingBusinessValue,
    });
  } catch (error) {
    console.error('Error saving finance setup:', error);
    res.status(500).json({ message: error.message });
  }
};

// 3. Bank Accounts Management
export const getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find().sort({ createdAt: -1 });
    const totalBalance = accounts
      .filter((a) => a.isActive)
      .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

    res.json({
      accounts,
      totalBalance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBankAccount = async (req, res) => {
  try {
    const { bankName, accountTitle, accountNumber, branch, openingBalance = 0, notes } = req.body;

    if (!bankName || !accountTitle || !accountNumber) {
      return res.status(400).json({ message: 'Bank name, title, and account number are required' });
    }

    const initBal = Number(openingBalance || 0);

    const account = await BankAccount.create({
      bankName: bankName.trim(),
      accountTitle: accountTitle.trim(),
      accountNumber: accountNumber.trim(),
      branch: branch ? branch.trim() : '',
      openingBalance: initBal,
      currentBalance: initBal,
      notes: notes ? notes.trim() : '',
      createdBy: req.user?.id,
    });

    if (initBal > 0) {
      await recordLedgerEntry({
        transactionType: 'OPENING_BALANCE',
        sourceAccount: 'equity',
        destinationAccount: 'bank',
        amount: initBal,
        bankAccountId: account._id,
        referenceType: 'manual',
        referenceId: String(account._id),
        description: `Opening balance for ${account.bankName} (${account.accountNumber})`,
        createdBy: req.user?.id,
      });
    }

    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, accountTitle, accountNumber, branch, isActive, notes } = req.body;

    const account = await BankAccount.findByIdAndUpdate(
      id,
      {
        ...(bankName && { bankName: bankName.trim() }),
        ...(accountTitle && { accountTitle: accountTitle.trim() }),
        ...(accountNumber && { accountNumber: accountNumber.trim() }),
        ...(branch !== undefined && { branch: branch.trim() }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes: notes.trim() }),
      },
      { new: true }
    );

    if (!account) return res.status(404).json({ message: 'Bank account not found' });
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Internal Transfers & Bank Transactions
export const addBankTransaction = async (req, res) => {
  try {
    const { type, amount, bankAccountId, toBankAccountId, description, date } = req.body;
    const numAmount = Number(amount || 0);

    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const bank = await BankAccount.findById(bankAccountId);
    if (!bank) return res.status(404).json({ message: 'Bank account not found' });

    const txDate = date ? new Date(date) : new Date();

    if (type === 'transfer_to_cash') {
      // Bank -> Cash
      if (bank.currentBalance < numAmount) {
        return res.status(400).json({ message: 'Insufficient bank balance' });
      }
      await recordLedgerEntry({
        transactionType: 'BANK_TO_CASH_TRANSFER',
        sourceAccount: 'bank',
        destinationAccount: 'cash',
        amount: numAmount,
        bankAccountId: bank._id,
        description: description || `Withdrawal from ${bank.bankName} to Cash`,
        createdBy: req.user?.id,
        date: txDate,
      });
    } else if (type === 'transfer_from_cash') {
      // Cash -> Bank
      const settings = await getOrCreateFinanceSettings();
      if (Number(settings.currentPettyCash || 0) < numAmount) {
        return res.status(400).json({ message: 'Insufficient petty cash balance' });
      }
      await recordLedgerEntry({
        transactionType: 'CASH_TO_BANK_TRANSFER',
        sourceAccount: 'cash',
        destinationAccount: 'bank',
        amount: numAmount,
        bankAccountId: bank._id,
        description: description || `Deposit from Cash to ${bank.bankName}`,
        createdBy: req.user?.id,
        date: txDate,
      });
    } else if (type === 'transfer_to_bank') {
      // Bank A -> Bank B
      if (!toBankAccountId) {
        return res.status(400).json({ message: 'Destination bank account is required' });
      }
      if (String(bankAccountId) === String(toBankAccountId)) {
        return res.status(400).json({ message: 'Source and destination cannot be the same account' });
      }
      const destBank = await BankAccount.findById(toBankAccountId);
      if (!destBank) return res.status(404).json({ message: 'Destination bank not found' });

      if (bank.currentBalance < numAmount) {
        return res.status(400).json({ message: 'Insufficient bank balance' });
      }

      await BankAccount.findByIdAndUpdate(bank._id, { $inc: { currentBalance: -numAmount } });
      await BankAccount.findByIdAndUpdate(destBank._id, { $inc: { currentBalance: numAmount } });

      await recordLedgerEntry({
        transactionType: 'BANK_TRANSFER',
        sourceAccount: 'bank',
        destinationAccount: 'bank',
        amount: numAmount,
        bankAccountId: bank._id,
        description: description || `Transfer from ${bank.bankName} to ${destBank.bankName}`,
        createdBy: req.user?.id,
        date: txDate,
      });
    } else if (type === 'deposit') {
      // Direct external deposit
      await recordLedgerEntry({
        transactionType: 'ADJUSTMENT',
        sourceAccount: 'revenue',
        destinationAccount: 'bank',
        amount: numAmount,
        bankAccountId: bank._id,
        description: description || `Direct deposit to ${bank.bankName}`,
        createdBy: req.user?.id,
        date: txDate,
      });
    } else if (type === 'withdrawal') {
      // Direct withdrawal/charge
      await recordLedgerEntry({
        transactionType: 'EXPENSE',
        sourceAccount: 'bank',
        destinationAccount: 'expense',
        amount: numAmount,
        bankAccountId: bank._id,
        description: description || `Bank charges / withdrawal from ${bank.bankName}`,
        createdBy: req.user?.id,
        date: txDate,
      });
    } else {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    const updatedBank = await BankAccount.findById(bankAccountId);
    const settings = await getOrCreateFinanceSettings();

    res.json({
      success: true,
      message: 'Bank transaction processed successfully',
      bank: updatedBank,
      currentPettyCash: settings.currentPettyCash,
    });
  } catch (error) {
    console.error('Error in addBankTransaction:', error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Petty Cash Management
export const getPettyCash = async (req, res) => {
  try {
    const settings = await getOrCreateFinanceSettings();
    const transactions = await FinanceLedger.find({
      $or: [{ sourceAccount: 'cash' }, { destinationAccount: 'cash' }],
      isVoided: { $ne: true },
    })
      .populate('createdBy', 'username email')
      .populate('bankAccountId', 'bankName accountNumber')
      .sort({ date: -1, createdAt: -1 })
      .limit(100);

    res.json({
      currentPettyCash: settings.currentPettyCash || 0,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addPettyCashTransaction = async (req, res) => {
  try {
    const { type, amount, description, reference, date } = req.body;
    const numAmount = Number(amount || 0);

    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const txDate = date ? new Date(date) : new Date();

    if (type === 'cash_in') {
      await recordLedgerEntry({
        transactionType: 'ADJUSTMENT',
        sourceAccount: 'equity',
        destinationAccount: 'cash',
        amount: numAmount,
        referenceType: 'petty_cash',
        referenceId: reference,
        description: description || 'Cash received into petty cash',
        createdBy: req.user?.id,
        date: txDate,
      });
    } else if (type === 'cash_out') {
      const settings = await getOrCreateFinanceSettings();
      if (Number(settings.currentPettyCash || 0) < numAmount) {
        return res.status(400).json({ message: 'Insufficient petty cash balance' });
      }
      await recordLedgerEntry({
        transactionType: 'EXPENSE',
        sourceAccount: 'cash',
        destinationAccount: 'expense',
        amount: numAmount,
        referenceType: 'petty_cash',
        referenceId: reference,
        description: description || 'Cash paid out',
        createdBy: req.user?.id,
        date: txDate,
      });
    } else if (type === 'adjustment') {
      // Can be positive or negative
      await recordLedgerEntry({
        transactionType: 'ADJUSTMENT',
        sourceAccount: 'equity',
        destinationAccount: 'cash',
        amount: numAmount,
        referenceType: 'petty_cash',
        description: description || 'Petty cash adjustment',
        createdBy: req.user?.id,
        date: txDate,
      });
    } else {
      return res.status(400).json({ message: 'Invalid cash transaction type' });
    }

    const settings = await getOrCreateFinanceSettings();
    res.json({
      success: true,
      currentPettyCash: settings.currentPettyCash,
      message: 'Petty cash transaction recorded',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Accounts Payable (Suppliers)
export const getPayables = async (req, res) => {
  try {
    const payables = await AccountPayable.find()
      .populate('createdBy', 'username email')
      .populate('purchaseBatchId', 'batchNumber supplierName purchaseDate')
      .sort({ createdAt: -1 });

    const totalPayable = payables
      .filter((p) => ['unpaid', 'partially_paid', 'overdue'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.remainingAmount || 0), 0);

    const totalPaid = payables.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);

    res.json({
      payables,
      totalPayable,
      totalPaid,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPayable = async (req, res) => {
  try {
    const { supplierName, billNumber, totalAmount, dueDate, notes, billDate } = req.body;
    const numTotal = Number(totalAmount || 0);

    if (!supplierName || !billNumber || numTotal <= 0) {
      return res.status(400).json({ message: 'Supplier name, bill number, and amount are required' });
    }

    const payable = await AccountPayable.create({
      billNumber: billNumber.trim(),
      supplierName: supplierName.trim(),
      totalAmount: numTotal,
      paidAmount: 0,
      remainingAmount: numTotal,
      billDate: billDate ? new Date(billDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes ? notes.trim() : undefined,
      status: 'unpaid',
      createdBy: req.user?.id,
    });

    res.status(201).json(payable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const payPayable = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'cash', bankAccountId, reference, notes, date } = req.body;
    const payAmount = Number(amount || 0);

    if (payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero' });
    }

    const payable = await AccountPayable.findById(id);
    if (!payable) return res.status(404).json({ message: 'Payable record not found' });

    if (payAmount > payable.remainingAmount) {
      return res.status(400).json({
        message: `Payment amount cannot exceed remaining payable (Rs. ${payable.remainingAmount.toLocaleString()})`,
      });
    }

    // Verify funding source
    if (paymentMethod === 'cash') {
      const settings = await getOrCreateFinanceSettings();
      if (Number(settings.currentPettyCash || 0) < payAmount) {
        return res.status(400).json({ message: 'Insufficient petty cash balance' });
      }
    } else if (paymentMethod === 'bank') {
      if (!bankAccountId) {
        return res.status(400).json({ message: 'Bank account is required for bank payments' });
      }
      const bank = await BankAccount.findById(bankAccountId);
      if (!bank || bank.currentBalance < payAmount) {
        return res.status(400).json({ message: 'Insufficient bank balance' });
      }
    }

    // Update payable document
    payable.paidAmount = Number(payable.paidAmount || 0) + payAmount;
    payable.remainingAmount = Math.max(0, Number(payable.remainingAmount || 0) - payAmount);
    payable.status = payable.remainingAmount === 0 ? 'paid' : 'partially_paid';

    payable.payments.push({
      amount: payAmount,
      paymentMethod,
      bankAccountId: bankAccountId || undefined,
      paymentDate: date ? new Date(date) : new Date(),
      reference: reference ? reference.trim() : '',
      notes: notes ? notes.trim() : '',
      createdBy: req.user?.id,
    });

    await payable.save();

    // Log to immutable ledger:
    // Paying supplier reduces Cash/Bank and reduces Accounts Payable liability.
    // Net Worth is UNCHANGED! (Asset decreases, Liability decreases by same amount)
    await recordLedgerEntry({
      transactionType: 'SUPPLIER_PAYMENT',
      sourceAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
      destinationAccount: 'accounts_payable',
      amount: payAmount,
      bankAccountId: bankAccountId || null,
      referenceType: 'account_payable',
      referenceId: String(payable._id),
      description: `Payment to supplier ${payable.supplierName} for Bill ${payable.billNumber}`,
      createdBy: req.user?.id,
      date: date ? new Date(date) : new Date(),
    });

    res.json({
      success: true,
      message: 'Supplier payment recorded successfully',
      payable,
    });
  } catch (error) {
    console.error('Error paying payable:', error);
    res.status(500).json({ message: error.message });
  }
};

// 6. Accounts Receivable (Customer Credit Bills + Opening Baseline Udhaar Hawalas)
export const getReceivables = async (req, res) => {
  try {
    const { filter = 'all', limit = 200 } = req.query;
    const settings = await getOrCreateFinanceSettings();

    // If filter is 'pending', only bills with remainingAmount > 0
    // If filter is 'all', return all recent bills so user can adjust ANY bill one by one
    const billQuery = filter === 'pending' ? { remainingAmount: { $gt: 0 } } : {};

    const bills = await Bill.find(billQuery)
      .populate('createdBy', 'username email')
      .populate('seller', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 200);

    // Global counts and total pending udhaar across all bills
    const pendingBillsAgg = await Bill.aggregate([
      { $match: { remainingAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' }, count: { $sum: 1 } } },
    ]);
    const billsTotal = pendingBillsAgg.length > 0 ? Number(pendingBillsAgg[0].total || 0) : 0;
    const pendingBillsCount = pendingBillsAgg.length > 0 ? Number(pendingBillsAgg[0].count || 0) : 0;

    const openingReceivables = settings.openingReceivablesList || [];
    const openingTotal = openingReceivables.reduce(
      (sum, r) => sum + Number(r.remainingAmount || 0),
      0
    );

    res.json({
      bills,
      openingReceivables,
      totalReceivable: billsTotal + openingTotal,
      billsTotal,
      pendingBillsCount,
      totalBillsCount: await Bill.countDocuments(),
      openingTotal,
    });
  } catch (error) {
    console.error('Error fetching receivables:', error);
    res.status(500).json({ message: error.message });
  }
};

// Adjust a specific bill's receivable / paid balance one by one
export const adjustBillReceivable = async (req, res) => {
  try {
    const { billId } = req.params;
    const { amountPaid, remainingAmount, reason, notes } = req.body;

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const oldPaid = Number(bill.amountPaid || 0);
    const oldRemaining = Number(bill.remainingAmount || 0);
    const billTotal = Number(bill.total || 0);

    let newPaid = amountPaid !== undefined && amountPaid !== '' ? Math.max(0, Number(amountPaid)) : oldPaid;
    let newRemaining =
      remainingAmount !== undefined && remainingAmount !== ''
        ? Math.max(0, Number(remainingAmount))
        : Math.max(0, billTotal - newPaid);

    bill.amountPaid = newPaid;
    bill.remainingAmount = newRemaining;
    bill.status = newRemaining === 0 ? 'completed' : 'pending';
    await bill.save();

    // Log the adjustment in Finance Ledger if remaining changed
    const diffRemaining = newRemaining - oldRemaining;
    if (diffRemaining !== 0) {
      await recordLedgerEntry({
        transactionType: 'ADJUSTMENT',
        sourceAccount: diffRemaining > 0 ? 'revenue' : 'accounts_receivable',
        destinationAccount: diffRemaining > 0 ? 'accounts_receivable' : 'revenue',
        amount: Math.abs(diffRemaining),
        referenceType: 'bill',
        referenceId: String(bill._id),
        description: `Bill ${bill.billNumber} (${bill.customer?.name || 'Walk-in'}) balance adjusted: Remaining changed from Rs. ${oldRemaining.toLocaleString()} to Rs. ${newRemaining.toLocaleString()}. Reason: ${reason || notes || 'Manual balance adjustment'}`,
        createdBy: req.user?.id,
      });
    }

    res.json({
      success: true,
      message: `Bill ${bill.billNumber} adjusted successfully. Remaining due: Rs. ${newRemaining.toLocaleString()}`,
      bill,
    });
  } catch (error) {
    console.error('Error adjusting bill receivable:', error);
    res.status(500).json({ message: error.message });
  }
};

// Adjust a specific Baseline Market Hawala party one by one
export const adjustOpeningReceivable = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { amount, collectedAmount, remainingAmount, partyName, notes, phone } = req.body;

    const settings = await getOrCreateFinanceSettings();
    const item = settings.openingReceivablesList.id(itemId);
    if (!item) return res.status(404).json({ message: 'Opening receivable party not found' });

    if (partyName) item.partyName = String(partyName).trim();
    if (phone !== undefined) item.phone = String(phone).trim();
    if (notes !== undefined) item.notes = String(notes).trim();
    if (amount !== undefined && amount !== '') item.amount = Math.max(0, Number(amount));
    if (collectedAmount !== undefined && collectedAmount !== '') {
      item.collectedAmount = Math.max(0, Number(collectedAmount));
    }
    if (remainingAmount !== undefined && remainingAmount !== '') {
      item.remainingAmount = Math.max(0, Number(remainingAmount));
    } else if (amount !== undefined || collectedAmount !== undefined) {
      item.remainingAmount = Math.max(0, Number(item.amount || 0) - Number(item.collectedAmount || 0));
    }

    // Recalculate settings.openingAccountsReceivable total
    settings.openingAccountsReceivable = settings.openingReceivablesList.reduce(
      (sum, r) => sum + Number(r.remainingAmount || 0),
      0
    );
    await settings.save();

    res.json({
      success: true,
      message: `Updated hawala details for ${item.partyName}`,
      item,
      settings,
    });
  } catch (error) {
    console.error('Error adjusting opening receivable:', error);
    res.status(500).json({ message: error.message });
  }
};

export const receiveReceivablePayment = async (req, res) => {
  try {
    const { billId } = req.params;
    const { amount, paymentMethod = 'cash', bankAccountId, reference, notes, date } = req.body;
    const receivedAmount = Number(amount || 0);

    if (receivedAmount <= 0) {
      return res.status(400).json({ message: 'Received amount must be greater than zero' });
    }

    if (paymentMethod === 'bank') {
      if (!bankAccountId) {
        return res.status(400).json({ message: 'Please select a destination bank account' });
      }
      const bank = await BankAccount.findById(bankAccountId);
      if (!bank || !bank.isActive) {
        return res.status(404).json({ message: 'Active bank account not found' });
      }
    }

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (receivedAmount > bill.remainingAmount + 0.01) {
      return res.status(400).json({
        message: `Received amount cannot exceed remaining balance (Rs. ${bill.remainingAmount.toLocaleString()})`,
      });
    }

    const actualCollection = Math.min(receivedAmount, bill.remainingAmount);

    bill.amountPaid = Number(bill.amountPaid || 0) + actualCollection;
    bill.remainingAmount = Math.max(0, Number(bill.remainingAmount || 0) - actualCollection);
    await bill.save();

    // Customer payment increases Cash/Bank and reduces Accounts Receivable asset.
    // recordLedgerEntry automatically updates petty cash or bank currentBalance.
    await recordLedgerEntry({
      transactionType: 'CUSTOMER_PAYMENT',
      sourceAccount: 'accounts_receivable',
      destinationAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
      amount: actualCollection,
      bankAccountId: paymentMethod === 'bank' ? bankAccountId : null,
      referenceType: 'bill',
      referenceId: String(bill._id),
      description: `Payment received from customer ${bill.customer?.name || 'Walk-in'} for Bill ${bill.billNumber}${notes ? ` - ${notes}` : ''}`,
      createdBy: req.user?.id,
      date: date ? new Date(date) : new Date(),
    });

    res.json({
      success: true,
      message: 'Customer payment recorded successfully',
      bill,
    });
  } catch (error) {
    console.error('Error receiving receivable payment:', error);
    res.status(500).json({ message: error.message });
  }
};

export const receiveOpeningReceivablePayment = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { amount, paymentMethod = 'cash', bankAccountId, reference, notes, date } = req.body;
    const receivedAmount = Number(amount || 0);

    if (receivedAmount <= 0) {
      return res.status(400).json({ message: 'Received amount must be greater than zero' });
    }

    if (paymentMethod === 'bank') {
      if (!bankAccountId) {
        return res.status(400).json({ message: 'Please select a destination bank account' });
      }
      const bank = await BankAccount.findById(bankAccountId);
      if (!bank || !bank.isActive) {
        return res.status(404).json({ message: 'Active bank account not found' });
      }
    }

    const settings = await getOrCreateFinanceSettings();
    const item = settings.openingReceivablesList.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Opening receivable entry not found' });
    }

    if (receivedAmount > item.remainingAmount + 0.01) {
      return res.status(400).json({
        message: `Received amount cannot exceed remaining balance (Rs. ${item.remainingAmount.toLocaleString()})`,
      });
    }

    const actualCollection = Math.min(receivedAmount, item.remainingAmount);

    item.collectedAmount = Number(item.collectedAmount || 0) + actualCollection;
    item.remainingAmount = Math.max(0, Number(item.remainingAmount || 0) - actualCollection);

    // Update settings.openingAccountsReceivable total remaining
    const totalRemaining = settings.openingReceivablesList.reduce(
      (sum, r) => sum + Number(r.remainingAmount || 0),
      0
    );
    settings.openingAccountsReceivable = totalRemaining;

    await settings.save();

    // Record ledger entry - this automatically updates petty cash or bank currentBalance
    await recordLedgerEntry({
      transactionType: 'CUSTOMER_PAYMENT',
      sourceAccount: 'accounts_receivable',
      destinationAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
      amount: actualCollection,
      bankAccountId: paymentMethod === 'bank' ? bankAccountId : null,
      referenceType: 'opening_receivable',
      referenceId: String(item._id),
      description: `Market Udhaar collected from ${item.partyName}${notes ? ` - ${notes}` : ''}`,
      createdBy: req.user?.id,
      date: date ? new Date(date) : new Date(),
    });

    res.json({
      success: true,
      message: `Payment of Rs. ${actualCollection.toLocaleString()} collected from ${item.partyName}`,
      item,
      settings,
    });
  } catch (error) {
    console.error('Error receiving opening receivable payment:', error);
    res.status(500).json({ message: error.message });
  }
};

export const markAllReceivablesCollected = async (req, res) => {
  try {
    const uncollectedBills = await Bill.find({ remainingAmount: { $gt: 0 } });
    let totalCollected = 0;

    for (const bill of uncollectedBills) {
      const rem = Number(bill.remainingAmount || 0);
      if (rem > 0) {
        totalCollected += rem;
        bill.amountPaid = Number(bill.total || 0);
        bill.remainingAmount = 0;
        await bill.save();
      }
    }

    if (totalCollected > 0) {
      await recordLedgerEntry({
        transactionType: 'CUSTOMER_PAYMENT',
        sourceAccount: 'accounts_receivable',
        destinationAccount: 'cash',
        amount: totalCollected,
        description: `Bulk marked all remaining bill receivables as collected (${uncollectedBills.length} bills)`,
        referenceType: 'bill',
        createdBy: req.user?.id,
      });
    }

    res.json({
      success: true,
      message: `Successfully marked ${uncollectedBills.length} bills as collected (Total: Rs. ${totalCollected.toLocaleString()})`,
      totalCollected,
      count: uncollectedBills.length,
    });
  } catch (error) {
    console.error('Error marking all receivables collected:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getOwnerCapitalData = async (req, res) => {
  try {
    const records = await OwnerCapital.find()
      .populate('createdBy', 'username email')
      .populate('bankAccountId', 'bankName accountNumber')
      .sort({ date: -1, createdAt: -1 });

    const settings = await getOrCreateFinanceSettings();
    const openingCapital = Number(settings.openingOwnerCapital || 0);

    const totalInvestments = records
      .filter((r) => r.type === 'investment')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const totalWithdrawals = records
      .filter((r) => r.type === 'withdrawal')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const currentOwnerCapital = openingCapital + totalInvestments - totalWithdrawals;

    res.json({
      openingCapital,
      totalInvestments,
      totalWithdrawals,
      currentOwnerCapital,
      records,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addOwnerInvestment = async (req, res) => {
  try {
    const { amount, paymentMethod = 'cash', bankAccountId, description, notes, date } = req.body;
    const numAmount = Number(amount || 0);

    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Investment amount must be greater than zero' });
    }

    if (paymentMethod === 'bank' && !bankAccountId) {
      return res.status(400).json({ message: 'Bank account is required for bank deposits' });
    }

    const txDate = date ? new Date(date) : new Date();

    const record = await OwnerCapital.create({
      type: 'investment',
      amount: numAmount,
      paymentMethod,
      bankAccountId: bankAccountId || undefined,
      description: description || 'Owner Capital Investment',
      notes: notes ? notes.trim() : undefined,
      date: txDate,
      createdBy: req.user?.id,
    });

    // Increases Cash/Bank and increases Owner Equity.
    // NOT sales revenue!
    await recordLedgerEntry({
      transactionType: 'OWNER_INVESTMENT',
      sourceAccount: 'equity',
      destinationAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
      amount: numAmount,
      bankAccountId: bankAccountId || null,
      referenceType: 'owner_investment',
      referenceId: String(record._id),
      description: description || `Owner investment of Rs. ${numAmount.toLocaleString()} (${paymentMethod})`,
      createdBy: req.user?.id,
      date: txDate,
    });

    res.status(201).json({
      success: true,
      message: 'Owner investment recorded successfully',
      record,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addOwnerWithdrawal = async (req, res) => {
  try {
    const { amount, account = 'cash', bankAccountId, reason, notes, date } = req.body;
    const numAmount = Number(amount || 0);

    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Withdrawal amount must be greater than zero' });
    }

    // Validate available funds
    if (account === 'cash') {
      const settings = await getOrCreateFinanceSettings();
      if (Number(settings.currentPettyCash || 0) < numAmount) {
        return res.status(400).json({ message: 'Insufficient petty cash balance' });
      }
    } else if (account === 'bank') {
      if (!bankAccountId) {
        return res.status(400).json({ message: 'Bank account is required' });
      }
      const bank = await BankAccount.findById(bankAccountId);
      if (!bank || bank.currentBalance < numAmount) {
        return res.status(400).json({ message: 'Insufficient bank balance' });
      }
    }

    const txDate = date ? new Date(date) : new Date();

    const record = await OwnerCapital.create({
      type: 'withdrawal',
      amount: numAmount,
      paymentMethod: account,
      bankAccountId: bankAccountId || undefined,
      description: reason || 'Owner Capital Withdrawal',
      notes: notes ? notes.trim() : undefined,
      date: txDate,
      createdBy: req.user?.id,
    });

    // Decreases Cash/Bank and decreases Owner Equity.
    // NOT an operating expense!
    await recordLedgerEntry({
      transactionType: 'OWNER_WITHDRAWAL',
      sourceAccount: account === 'cash' ? 'cash' : 'bank',
      destinationAccount: 'equity',
      amount: numAmount,
      bankAccountId: bankAccountId || null,
      referenceType: 'owner_withdrawal',
      referenceId: String(record._id),
      description: reason || `Owner withdrawal of Rs. ${numAmount.toLocaleString()} (${account})`,
      createdBy: req.user?.id,
      date: txDate,
    });

    res.status(201).json({
      success: true,
      message: 'Owner withdrawal recorded successfully',
      record,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. Purchases Integration (Paid with Cash, Paid via Bank, or Credit)
export const getPurchases = async (req, res) => {
  try {
    const batches = await PurchaseBatch.find()
      .populate('items.productId', 'name model category originalPrice stock')
      .populate('bankAccountId', 'bankName accountNumber')
      .populate('payableId', 'billNumber remainingAmount status')
      .sort({ purchaseDate: -1, createdAt: -1 });

    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createPurchaseBatch as createPurchase,
  updatePurchaseBatch as updatePurchase,
  deletePurchaseBatch as deletePurchase,
} from './purchaseBatchController.js';

// 9. Profit & Loss Report
export const getProfitAndLossReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getProfitAndLoss(startDate, endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 10. Cash Flow Report
export const getCashFlowReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getCashFlow(startDate, endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 11. Historical Business Value Trend
export const getBusinessValueTrend = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const trendData = await getHistoricalBusinessValueTrend(range);
    res.json(trendData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 12. Immutable Ledger & Audit Log
export const getFinanceLedger = async (req, res) => {
  try {
    const { type, account, startDate, endDate, search, limit = 100 } = req.query;
    const filter = {};

    if (type) filter.transactionType = type;
    if (account) {
      filter.$or = [{ sourceAccount: account }, { destinationAccount: account }];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { referenceId: { $regex: search, $options: 'i' } },
      ];
    }

    const entries = await FinanceLedger.find(filter)
      .populate('createdBy', 'username email')
      .populate('voidedBy', 'username email')
      .populate('bankAccountId', 'bankName accountNumber')
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit));

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const voidLedgerTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: 'Reason for voiding is required' });
    }

    const entry = await FinanceLedger.findById(id);
    if (!entry) return res.status(404).json({ message: 'Ledger transaction not found' });

    if (entry.isVoided) {
      return res.status(400).json({ message: 'This transaction is already voided' });
    }

    entry.isVoided = true;
    entry.voidReason = String(reason).trim();
    entry.voidedBy = req.user?.id;
    entry.voidedAt = new Date();
    await entry.save();

    // Reverse the balance impact
    const settings = await getOrCreateFinanceSettings();
    if (entry.destinationAccount === 'cash') {
      settings.currentPettyCash -= Number(entry.amount || 0);
      await settings.save();
    }
    if (entry.sourceAccount === 'cash') {
      settings.currentPettyCash += Number(entry.amount || 0);
      await settings.save();
    }
    if (entry.bankAccountId) {
      if (entry.destinationAccount === 'bank') {
        await BankAccount.findByIdAndUpdate(entry.bankAccountId, {
          $inc: { currentBalance: -Number(entry.amount || 0) },
        });
      }
      if (entry.sourceAccount === 'bank') {
        await BankAccount.findByIdAndUpdate(entry.bankAccountId, {
          $inc: { currentBalance: Number(entry.amount || 0) },
        });
      }
    }

    res.json({
      success: true,
      message: 'Transaction successfully voided and reversed',
      entry,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

