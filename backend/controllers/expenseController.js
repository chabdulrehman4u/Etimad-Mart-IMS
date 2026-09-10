import Expense from '../models/Expense.js';
import BankAccount from '../models/BankAccount.js';
import FinanceLedger from '../models/FinanceLedger.js';
import { getOrCreateFinanceSettings, recordLedgerEntry } from '../services/financeService.js';

// Create new expense
export const createExpense = async (req, res) => {
  try {
    const { title, amount, category, whereSpent, notes, date, paymentMethod = 'cash', bankAccountId } = req.body;
    const numAmount = Number(amount || 0);

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Expense title / detail is required' });
    }
    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Expense amount must be greater than zero' });
    }

    const expenseDate = date ? new Date(date) : new Date();
    const method = paymentMethod === 'bank' ? 'bank' : 'cash';

    let bank = null;
    if (method === 'bank') {
      if (!bankAccountId) {
        return res.status(400).json({ message: 'Please select a bank account' });
      }
      bank = await BankAccount.findById(bankAccountId);
      if (!bank) {
        return res.status(404).json({ message: 'Selected bank account not found' });
      }
      if (!bank.isActive) {
        return res.status(400).json({ message: 'Selected bank account is inactive' });
      }
      if (bank.currentBalance < numAmount) {
        return res.status(400).json({
          message: `Insufficient bank balance in ${bank.bankName}. Current balance: Rs. ${Number(bank.currentBalance || 0).toLocaleString('en-PK')}`
        });
      }
    } else {
      // Check Petty Cash balance
      const settings = await getOrCreateFinanceSettings();
      if (Number(settings.currentPettyCash || 0) < numAmount) {
        return res.status(400).json({
          message: `Insufficient Petty Cash balance. Current available: Rs. ${Number(settings.currentPettyCash || 0).toLocaleString('en-PK')}`
        });
      }
    }

    // 1. Create Expense
    const expense = new Expense({
      title: title.trim(),
      amount: numAmount,
      category: category ? category.trim() : '',
      whereSpent: whereSpent ? whereSpent.trim() : '',
      notes: notes ? notes.trim() : '',
      paymentMethod: method,
      bankAccountId: method === 'bank' ? bank._id : undefined,
      date: expenseDate,
      createdBy: req.user.id
    });

    const saved = await expense.save();

    // 2. Record in FinanceLedger and deduct from Petty Cash or Bank Account
    if (method === 'bank') {
      await recordLedgerEntry({
        transactionType: 'EXPENSE',
        sourceAccount: 'bank',
        destinationAccount: 'expense',
        amount: numAmount,
        bankAccountId: bank._id,
        referenceType: 'expense',
        referenceId: String(saved._id),
        description: `Expense: ${saved.title}${saved.category ? ' (' + saved.category + ')' : ''} via ${bank.bankName} (${bank.accountNumber})`,
        createdBy: req.user.id,
        date: expenseDate,
      });
    } else {
      await recordLedgerEntry({
        transactionType: 'EXPENSE',
        sourceAccount: 'cash',
        destinationAccount: 'expense',
        amount: numAmount,
        referenceType: 'expense',
        referenceId: String(saved._id),
        description: `Expense: ${saved.title}${saved.category ? ' (' + saved.category + ')' : ''} (Petty Cash)`,
        createdBy: req.user.id,
        date: expenseDate,
      });
    }

    const populated = await Expense.findById(saved._id)
      .populate('createdBy', 'username email')
      .populate('bankAccountId', 'bankName accountTitle accountNumber');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error in createExpense:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get expenses with optional date range and search
export const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, search, paymentMethod } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { whereSpent: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'username email')
      .populate('bankAccountId', 'bankName accountTitle accountNumber')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete expense and revert balance
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Revert deduction
    if (expense.paymentMethod === 'bank' && expense.bankAccountId) {
      await BankAccount.findByIdAndUpdate(expense.bankAccountId, {
        $inc: { currentBalance: expense.amount }
      });
      // Void ledger entry
      await FinanceLedger.updateMany(
        { referenceType: 'expense', referenceId: String(expense._id) },
        {
          isVoided: true,
          voidReason: 'Expense deleted',
          voidedBy: req.user.id,
          voidedAt: new Date()
        }
      );
    } else {
      // Revert petty cash
      const settings = await getOrCreateFinanceSettings();
      settings.currentPettyCash = Number(settings.currentPettyCash || 0) + expense.amount;
      await settings.save();
      // Void ledger entry
      await FinanceLedger.updateMany(
        { referenceType: 'expense', referenceId: String(expense._id) },
        {
          isVoided: true,
          voidReason: 'Expense deleted',
          voidedBy: req.user.id,
          voidedAt: new Date()
        }
      );
    }

    await Expense.findByIdAndDelete(id);
    res.json({ message: 'Expense deleted and balance restored successfully' });
  } catch (error) {
    console.error('Error in deleteExpense:', error);
    res.status(500).json({ message: error.message });
  }
};

// Expense stats: today, week, month, year
export const getExpenseStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const startOfWeek = new Date(startOfDay);
    const dayOfWeek = startOfDay.getDay(); // 0=Sun
    const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [todayStats, weekStats, monthStats, yearStats] = await Promise.all([
      Expense.aggregate([
        { $match: { date: { $gte: startOfDay } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfWeek } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfYear } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      today: todayStats[0] || { totalAmount: 0, count: 0 },
      week: weekStats[0] || { totalAmount: 0, count: 0 },
      month: monthStats[0] || { totalAmount: 0, count: 0 },
      year: yearStats[0] || { totalAmount: 0, count: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
