import PurchaseBatch from '../models/PurchaseBatch.js';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import BankAccount from '../models/BankAccount.js';
import AccountPayable from '../models/AccountPayable.js';
import FinanceLedger from '../models/FinanceLedger.js';
import { getOrCreateFinanceSettings, recordLedgerEntry } from '../services/financeService.js';

export const createPurchaseBatch = async (req, res) => {
  try {
    const {
      batchNumber,
      supplierName,
      purchaseDate,
      notes,
      items,
      courierExpense = 0,
      paymentStatus = 'paid', // 'paid', 'partially_paid', 'unpaid'
      paymentMethod = 'cash', // 'cash', 'bank', 'credit'
      paidAmount = 0,
      bankAccountId,
      dueDate,
    } = req.body || {};

    if (!supplierName || !String(supplierName).trim()) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const normalizedItems = [];
    let totalQuantity = 0;

    for (const rawItem of items) {
      const productId = rawItem?.productId;
      const quantity = Number(rawItem?.quantity || 0);
      const unitPrice = Number(rawItem?.unitPrice || 0);

      if (!productId) {
        return res.status(400).json({ message: 'Each item must have a productId' });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0 for all items' });
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: 'Unit price must be 0 or greater for all items' });
      }

      const product = await Product.findById(productId).select('_id name model originalPrice stock');
      if (!product) {
        return res.status(400).json({ message: 'One or more products were not found' });
      }

      totalQuantity += quantity;
      normalizedItems.push({ productId: product._id, quantity, unitPrice });
    }

    const itemsCost = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const numCourier = Number(courierExpense || 0);
    const courierPerUnit = totalQuantity > 0 ? numCourier / totalQuantity : 0;

    // Distribute courier expense per unit and compute effective cost price
    for (const it of normalizedItems) {
      it.courierExpensePerUnit = Number(courierPerUnit.toFixed(2));
      it.effectiveCostPrice = Number((it.unitPrice + courierPerUnit).toFixed(2));
    }

    const totalAmount = itemsCost + numCourier;

    let actualPaid = 0;
    let actualRemaining = totalAmount;

    if (paymentStatus === 'paid') {
      actualPaid = totalAmount;
      actualRemaining = 0;
    } else if (paymentStatus === 'partially_paid') {
      actualPaid = Math.min(Number(paidAmount || 0), totalAmount);
      actualRemaining = totalAmount - actualPaid;
    } else {
      actualPaid = 0;
      actualRemaining = totalAmount;
    }

    // Verify funding balance if paying cash or bank
    let bank = null;
    if (actualPaid > 0) {
      if (paymentMethod === 'cash') {
        const settings = await getOrCreateFinanceSettings();
        if (Number(settings.currentPettyCash || 0) < actualPaid) {
          return res.status(400).json({
            message: `Insufficient Petty Cash balance. Available: Rs. ${Number(settings.currentPettyCash || 0).toLocaleString('en-PK')}`
          });
        }
      } else if (paymentMethod === 'bank') {
        if (!bankAccountId) {
          return res.status(400).json({ message: 'Bank account is required for bank payment' });
        }
        bank = await BankAccount.findById(bankAccountId);
        if (!bank) {
          return res.status(404).json({ message: 'Selected bank account not found' });
        }
        if (bank.currentBalance < actualPaid) {
          return res.status(400).json({
            message: `Insufficient bank balance in ${bank.bankName}. Available: Rs. ${Number(bank.currentBalance || 0).toLocaleString('en-PK')}`
          });
        }
      }
    }

    const batch = new PurchaseBatch({
      batchNumber: batchNumber ? String(batchNumber).trim() : undefined,
      supplierName: String(supplierName).trim(),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      notes: notes ? String(notes).trim() : undefined,
      items: normalizedItems,
      itemsCost,
      courierExpense: numCourier,
      totalAmount,
      paymentStatus,
      paidAmount: actualPaid,
      remainingAmount: actualRemaining,
      paymentMethod,
      bankAccountId: bankAccountId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // If remaining > 0, generate an AccountPayable record
    if (actualRemaining > 0) {
      const payable = await AccountPayable.create({
        billNumber: batch.batchNumber || `PUR-${Date.now().toString().slice(-6)}`,
        supplierName: batch.supplierName,
        purchaseBatchId: batch._id,
        billDate: batch.purchaseDate,
        dueDate: batch.dueDate,
        totalAmount,
        paidAmount: actualPaid,
        remainingAmount: actualRemaining,
        status: actualPaid > 0 ? 'partially_paid' : 'unpaid',
        notes: `Credit purchase: ${batch.batchNumber || batch._id}`,
        createdBy: req.user?.id,
      });
      batch.payableId = payable._id;
    }

    await batch.save();

    // Update product stock and landed cost price (originalPrice = effectiveCostPrice)
    for (const item of normalizedItems) {
      const product = await Product.findById(item.productId);
      const previousStock = Number(product?.stock || 0);

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
        ...(item.effectiveCostPrice > 0 && { originalPrice: item.effectiveCostPrice }),
      });

      await StockHistory.create({
        productId: item.productId,
        type: 'stock_in',
        quantity: item.quantity,
        previousStock,
        newStock: previousStock + item.quantity,
        reason: 'Purchase batch stock increment',
        notes: `Batch: ${batch.batchNumber || batch._id} (Landed Cost: Rs. ${item.effectiveCostPrice})`,
        createdBy: req.user?.id,
      });
    }

    // Record in immutable ledger
    if (actualPaid > 0) {
      await recordLedgerEntry({
        transactionType: paymentMethod === 'cash' ? 'PURCHASE_CASH' : 'PURCHASE_BANK',
        sourceAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
        destinationAccount: 'inventory',
        amount: actualPaid,
        bankAccountId: bankAccountId || null,
        referenceType: 'purchase_batch',
        referenceId: String(batch._id),
        description: `Purchase from ${batch.supplierName} (Rs. ${actualPaid.toLocaleString('en-PK')} paid via ${paymentMethod === 'bank' ? bank?.bankName || 'Bank' : 'Petty Cash'})`,
        createdBy: req.user?.id,
        date: batch.purchaseDate,
      });
    }

    if (actualRemaining > 0) {
      await recordLedgerEntry({
        transactionType: 'PURCHASE_CREDIT',
        sourceAccount: 'accounts_payable',
        destinationAccount: 'inventory',
        amount: actualRemaining,
        referenceType: 'purchase_batch',
        referenceId: String(batch._id),
        description: `Credit Purchase debt to ${batch.supplierName} (Rs. ${actualRemaining.toLocaleString('en-PK')} pending)`,
        createdBy: req.user?.id,
        date: batch.purchaseDate,
      });
    }

    const populated = await PurchaseBatch.findById(batch._id)
      .populate('items.productId', 'name model category originalPrice stock')
      .populate('bankAccountId', 'bankName accountNumber currentBalance')
      .populate('payableId', 'billNumber remainingAmount status');

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating purchase batch:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPurchaseBatches = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    const filter = {};
    if (req.query.startDate || req.query.endDate) {
      filter.purchaseDate = {};
      if (req.query.startDate) {
        filter.purchaseDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.purchaseDate.$lte = new Date(req.query.endDate);
      }
    }

    const batches = await PurchaseBatch.find(filter)
      .populate('items.productId', 'name model category originalPrice stock')
      .populate('bankAccountId', 'bankName accountNumber currentBalance')
      .populate('payableId', 'billNumber remainingAmount status')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(limit);

    return res.json(batches);
  } catch (error) {
    console.error('Error fetching purchase batches:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Edit / Update Purchase Batch
export const updatePurchaseBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      batchNumber,
      supplierName,
      purchaseDate,
      notes,
      items,
      courierExpense = 0,
      paymentStatus = 'paid',
      paymentMethod = 'cash',
      paidAmount = 0,
      bankAccountId,
      dueDate,
    } = req.body || {};

    const batch = await PurchaseBatch.findById(id);
    if (!batch) {
      return res.status(404).json({ message: 'Purchase batch not found' });
    }

    if (!supplierName || !String(supplierName).trim()) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // 1. REVERT OLD STOCK
    for (const oldItem of batch.items) {
      await Product.findByIdAndUpdate(oldItem.productId, {
        $inc: { stock: -oldItem.quantity },
      });
      await StockHistory.create({
        productId: oldItem.productId,
        type: 'stock_out',
        quantity: oldItem.quantity,
        reason: 'Purchase batch edit reversal',
        notes: `Reversing old batch ${batch.batchNumber || batch._id}`,
        createdBy: req.user?.id,
      });
    }

    // 2. REVERT OLD FINANCIAL DEDUCTION
    if (batch.paidAmount > 0) {
      if (batch.paymentMethod === 'cash') {
        const settings = await getOrCreateFinanceSettings();
        settings.currentPettyCash = Number(settings.currentPettyCash || 0) + batch.paidAmount;
        await settings.save();
      } else if (batch.paymentMethod === 'bank' && batch.bankAccountId) {
        await BankAccount.findByIdAndUpdate(batch.bankAccountId, {
          $inc: { currentBalance: batch.paidAmount },
        });
      }
    }

    // Void existing ledger entries
    await FinanceLedger.updateMany(
      { referenceType: 'purchase_batch', referenceId: String(batch._id) },
      {
        isVoided: true,
        voidReason: 'Purchase batch updated',
        voidedBy: req.user?.id,
        voidedAt: new Date(),
      }
    );

    // 3. NORMALIZE NEW ITEMS & CALCULATE COURIER
    const normalizedItems = [];
    let totalQuantity = 0;

    for (const rawItem of items) {
      const productId = rawItem?.productId;
      const quantity = Number(rawItem?.quantity || 0);
      const unitPrice = Number(rawItem?.unitPrice || 0);

      if (!productId || quantity <= 0 || unitPrice < 0) {
        return res.status(400).json({ message: 'Valid productId, quantity > 0, and unitPrice >= 0 required' });
      }

      totalQuantity += quantity;
      normalizedItems.push({ productId, quantity, unitPrice });
    }

    const itemsCost = normalizedItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const numCourier = Number(courierExpense || 0);
    const courierPerUnit = totalQuantity > 0 ? numCourier / totalQuantity : 0;

    for (const it of normalizedItems) {
      it.courierExpensePerUnit = Number(courierPerUnit.toFixed(2));
      it.effectiveCostPrice = Number((it.unitPrice + courierPerUnit).toFixed(2));
    }

    const totalAmount = itemsCost + numCourier;

    let actualPaid = 0;
    let actualRemaining = totalAmount;

    if (paymentStatus === 'paid') {
      actualPaid = totalAmount;
      actualRemaining = 0;
    } else if (paymentStatus === 'partially_paid') {
      actualPaid = Math.min(Number(paidAmount || 0), totalAmount);
      actualRemaining = totalAmount - actualPaid;
    } else {
      actualPaid = 0;
      actualRemaining = totalAmount;
    }

    // 4. VERIFY NEW FUNDING SOURCE
    let bank = null;
    if (actualPaid > 0) {
      if (paymentMethod === 'cash') {
        const settings = await getOrCreateFinanceSettings();
        if (Number(settings.currentPettyCash || 0) < actualPaid) {
          return res.status(400).json({
            message: `Insufficient Petty Cash balance. Available: Rs. ${Number(settings.currentPettyCash || 0).toLocaleString('en-PK')}`
          });
        }
      } else if (paymentMethod === 'bank') {
        if (!bankAccountId) {
          return res.status(400).json({ message: 'Bank account is required for bank payment' });
        }
        bank = await BankAccount.findById(bankAccountId);
        if (!bank || bank.currentBalance < actualPaid) {
          return res.status(400).json({
            message: `Insufficient bank balance in ${bank?.bankName || 'bank'}. Available: Rs. ${Number(bank?.currentBalance || 0).toLocaleString('en-PK')}`
          });
        }
      }
    }

    // 5. APPLY NEW STOCK
    for (const item of normalizedItems) {
      const product = await Product.findById(item.productId);
      const previousStock = Number(product?.stock || 0);

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
        ...(item.effectiveCostPrice > 0 && { originalPrice: item.effectiveCostPrice }),
      });

      await StockHistory.create({
        productId: item.productId,
        type: 'stock_in',
        quantity: item.quantity,
        previousStock,
        newStock: previousStock + item.quantity,
        reason: 'Purchase batch edit adjustment',
        notes: `Batch: ${batch.batchNumber || batch._id} (Landed Cost: Rs. ${item.effectiveCostPrice})`,
        createdBy: req.user?.id,
      });
    }

    // 6. UPDATE BATCH RECORD
    batch.batchNumber = batchNumber ? String(batchNumber).trim() : batch.batchNumber;
    batch.supplierName = String(supplierName).trim();
    batch.purchaseDate = purchaseDate ? new Date(purchaseDate) : batch.purchaseDate;
    batch.notes = notes ? String(notes).trim() : '';
    batch.items = normalizedItems;
    batch.itemsCost = itemsCost;
    batch.courierExpense = numCourier;
    batch.totalAmount = totalAmount;
    batch.paymentStatus = paymentStatus;
    batch.paidAmount = actualPaid;
    batch.remainingAmount = actualRemaining;
    batch.paymentMethod = paymentMethod;
    batch.bankAccountId = bankAccountId || undefined;
    batch.dueDate = dueDate ? new Date(dueDate) : undefined;

    // 7. MANAGE ACCOUNTPAYABLE
    if (actualRemaining > 0) {
      if (batch.payableId) {
        await AccountPayable.findByIdAndUpdate(batch.payableId, {
          supplierName: batch.supplierName,
          billDate: batch.purchaseDate,
          dueDate: batch.dueDate,
          totalAmount,
          paidAmount: actualPaid,
          remainingAmount: actualRemaining,
          status: actualPaid > 0 ? 'partially_paid' : 'unpaid',
        });
      } else {
        const payable = await AccountPayable.create({
          billNumber: batch.batchNumber || `PUR-${Date.now().toString().slice(-6)}`,
          supplierName: batch.supplierName,
          purchaseBatchId: batch._id,
          billDate: batch.purchaseDate,
          dueDate: batch.dueDate,
          totalAmount,
          paidAmount: actualPaid,
          remainingAmount: actualRemaining,
          status: actualPaid > 0 ? 'partially_paid' : 'unpaid',
          notes: `Credit purchase: ${batch.batchNumber || batch._id}`,
          createdBy: req.user?.id,
        });
        batch.payableId = payable._id;
      }
    } else if (batch.payableId) {
      await AccountPayable.findByIdAndDelete(batch.payableId);
      batch.payableId = undefined;
    }

    await batch.save();

    // 8. RECORD NEW LEDGER ENTRIES
    if (actualPaid > 0) {
      await recordLedgerEntry({
        transactionType: paymentMethod === 'cash' ? 'PURCHASE_CASH' : 'PURCHASE_BANK',
        sourceAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
        destinationAccount: 'inventory',
        amount: actualPaid,
        bankAccountId: bankAccountId || null,
        referenceType: 'purchase_batch',
        referenceId: String(batch._id),
        description: `Updated purchase: ${batch.supplierName} (Rs. ${actualPaid.toLocaleString('en-PK')} paid via ${paymentMethod === 'bank' ? bank?.bankName || 'Bank' : 'Petty Cash'})`,
        createdBy: req.user?.id,
        date: batch.purchaseDate,
      });
    }

    if (actualRemaining > 0) {
      await recordLedgerEntry({
        transactionType: 'PURCHASE_CREDIT',
        sourceAccount: 'accounts_payable',
        destinationAccount: 'inventory',
        amount: actualRemaining,
        referenceType: 'purchase_batch',
        referenceId: String(batch._id),
        description: `Updated credit purchase debt to ${batch.supplierName} (Rs. ${actualRemaining.toLocaleString('en-PK')} pending)`,
        createdBy: req.user?.id,
        date: batch.purchaseDate,
      });
    }

    const populated = await PurchaseBatch.findById(batch._id)
      .populate('items.productId', 'name model category originalPrice stock')
      .populate('bankAccountId', 'bankName accountNumber currentBalance')
      .populate('payableId', 'billNumber remainingAmount status');

    return res.json(populated);
  } catch (error) {
    console.error('Error updating purchase batch:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Purchase Batch
export const deletePurchaseBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await PurchaseBatch.findById(id);
    if (!batch) {
      return res.status(404).json({ message: 'Purchase batch not found' });
    }

    // 1. REVERT STOCK
    for (const item of batch.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
      await StockHistory.create({
        productId: item.productId,
        type: 'stock_out',
        quantity: item.quantity,
        reason: 'Purchase batch deleted',
        notes: `Reversal for deleted batch ${batch.batchNumber || batch._id}`,
        createdBy: req.user?.id,
      });
    }

    // 2. REFUND FINANCIAL DEDUCTION
    if (batch.paidAmount > 0) {
      if (batch.paymentMethod === 'cash') {
        const settings = await getOrCreateFinanceSettings();
        settings.currentPettyCash = Number(settings.currentPettyCash || 0) + batch.paidAmount;
        await settings.save();
      } else if (batch.paymentMethod === 'bank' && batch.bankAccountId) {
        await BankAccount.findByIdAndUpdate(batch.bankAccountId, {
          $inc: { currentBalance: batch.paidAmount },
        });
      }
    }

    // 3. VOID LEDGER ENTRIES
    await FinanceLedger.updateMany(
      { referenceType: 'purchase_batch', referenceId: String(batch._id) },
      {
        isVoided: true,
        voidReason: 'Purchase batch deleted',
        voidedBy: req.user?.id,
        voidedAt: new Date(),
      }
    );

    // 4. DELETE ASSOCIATED ACCOUNTPAYABLE
    if (batch.payableId) {
      await AccountPayable.findByIdAndDelete(batch.payableId);
    }

    // 5. DELETE BATCH
    await PurchaseBatch.findByIdAndDelete(id);

    return res.json({ message: 'Purchase batch deleted and all balances & stock successfully reverted' });
  } catch (error) {
    console.error('Error deleting purchase batch:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
