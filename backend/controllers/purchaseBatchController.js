import PurchaseBatch from '../models/PurchaseBatch.js';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import BankAccount from '../models/BankAccount.js';
import AccountPayable from '../models/AccountPayable.js';
import FinanceLedger from '../models/FinanceLedger.js';
import Admin from '../models/Admin.js';
import { getOrCreateFinanceSettings, recordLedgerEntry } from '../services/financeService.js';

// Helper to reliably resolve an admin/user ObjectId for auditing
const resolveUserId = async (req) => {
  let id = req.user?._id || req.user?.id || req.admin?._id || req.admin?.id;
  if (!id) {
    try {
      const fallback = await Admin.findOne().select('_id');
      if (fallback) id = fallback._id;
    } catch (e) {}
  }
  return id;
};

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

    const currentUserId = await resolveUserId(req);

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
      createdBy: currentUserId,
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
        createdBy: currentUserId,
      });
      batch.payableId = payable._id;
    }

    await batch.save();

    // Update product stock and landed cost price (originalPrice = effectiveCostPrice)
    for (const item of normalizedItems) {
      const product = await Product.findById(item.productId);
      const previousStock = Number(product?.stock || 0);
      const newStock = previousStock + item.quantity;

      await Product.findByIdAndUpdate(item.productId, {
        stock: newStock,
        ...(item.effectiveCostPrice > 0 && { originalPrice: item.effectiveCostPrice }),
      });

      try {
        await StockHistory.create({
          productId: item.productId,
          type: 'stock_in',
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: 'Purchase batch stock increment',
          notes: `Batch: ${batch.batchNumber || batch._id} (Landed Cost: Rs. ${item.effectiveCostPrice})`,
          createdBy: currentUserId,
        });
      } catch (shErr) {
        console.warn('StockHistory warning on batch create:', shErr.message);
      }
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
        createdBy: currentUserId,
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
        createdBy: currentUserId,
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

    const currentUserId = await resolveUserId(req);

    // 1. REVERT OLD STOCK SAFELY
    if (Array.isArray(batch.items)) {
      for (const oldItem of batch.items) {
        const prodId = oldItem.productId?._id || oldItem.productId;
        if (!prodId) continue;
        const oldQty = Number(oldItem.quantity || 0);
        if (oldQty <= 0) continue;

        const product = await Product.findById(prodId);
        if (product) {
          const prevStock = Number(product.stock || 0);
          const nextStock = Math.max(0, prevStock - oldQty);
          await Product.findByIdAndUpdate(prodId, { stock: nextStock });

          try {
            await StockHistory.create({
              productId: prodId,
              type: 'stock_out',
              quantity: oldQty,
              previousStock: prevStock,
              newStock: nextStock,
              reason: 'Purchase batch edit reversal',
              notes: `Reversing old batch ${batch.batchNumber || batch._id}`,
              createdBy: currentUserId,
            });
          } catch (shErr) {
            console.warn('StockHistory warning on batch edit reversal:', shErr.message);
          }
        }
      }
    }

    // 2. NORMALIZE NEW ITEMS & CALCULATE COURIER PER-UNIT ALLOCATION
    const normalizedItems = [];
    let totalQuantity = 0;

    for (const rawItem of items) {
      const productId = rawItem?.productId?._id || rawItem?.productId;
      const quantity = Number(rawItem?.quantity || 0);
      const unitPrice = Number(rawItem?.unitPrice || 0);

      if (!productId) {
        return res.status(400).json({ message: 'Valid productId required for all items' });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: 'Unit price must be 0 or greater' });
      }

      totalQuantity += quantity;
      normalizedItems.push({ productId, quantity, unitPrice });
    }

    const itemsCost = normalizedItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const numCourier = Math.max(0, Number(courierExpense || 0));
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

    // 3. APPLY NEW STOCK & LANDED COST (originalPrice = effectiveCostPrice)
    for (const item of normalizedItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        const prevStock = Number(product.stock || 0);
        const nextStock = prevStock + item.quantity;

        await Product.findByIdAndUpdate(item.productId, {
          stock: nextStock,
          ...(item.effectiveCostPrice > 0 && { originalPrice: item.effectiveCostPrice }),
        });

        try {
          await StockHistory.create({
            productId: item.productId,
            type: 'stock_in',
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: nextStock,
            reason: 'Purchase batch edit adjustment',
            notes: `Batch: ${batch.batchNumber || batch._id} (Landed Cost: Rs. ${item.effectiveCostPrice})`,
            createdBy: currentUserId,
          });
        } catch (shErr) {
          console.warn('StockHistory warning on batch edit apply:', shErr.message);
        }
      }
    }

    // 4. FINANCIAL DIFFERENCE MANAGEMENT:
    // Determine old paid amount (handling legacy batches where paidAmount was not explicitly set)
    let oldPaid = 0;
    if (batch.paidAmount !== undefined && batch.paidAmount !== null) {
      oldPaid = Number(batch.paidAmount || 0);
    } else if (batch.paymentStatus === 'paid') {
      oldPaid = Number(batch.totalAmount || 0);
    } else if (batch.paymentStatus === 'partially_paid') {
      oldPaid = Number(batch.paidAmount || 0);
    } else {
      oldPaid = 0;
    }

    const oldMethod = batch.paymentMethod || 'cash';
    const oldBankId = batch.bankAccountId ? String(batch.bankAccountId?._id || batch.bankAccountId) : null;
    const newBankId = (paymentMethod === 'bank' && bankAccountId) ? String(bankAccountId) : null;

    const isSameSource = (oldMethod === paymentMethod) && (paymentMethod !== 'bank' || oldBankId === newBankId);

    if (isSameSource) {
      // SAME PAYMENT SOURCE: JUST ADD OR REMOVE THE DIFFERENCE
      const diff = actualPaid - oldPaid;

      if (diff > 0) {
        // Additional payment needed (e.g. added courier expense)
        if (paymentMethod === 'cash') {
          const settings = await getOrCreateFinanceSettings();
          const currentCash = Number(settings.currentPettyCash || 0);
          if (currentCash < diff) {
            return res.status(400).json({
              message: `Insufficient Petty Cash balance to pay additional Rs. ${diff.toLocaleString('en-PK')}. Available: Rs. ${currentCash.toLocaleString('en-PK')}`
            });
          }
        } else if (paymentMethod === 'bank') {
          if (!bankAccountId) {
            return res.status(400).json({ message: 'Bank account is required for bank payment' });
          }
          const bank = await BankAccount.findById(bankAccountId);
          if (!bank) {
            return res.status(404).json({ message: 'Selected bank account not found' });
          }
          if (Number(bank.currentBalance || 0) < diff) {
            return res.status(400).json({
              message: `Insufficient bank balance in ${bank.bankName} to pay additional Rs. ${diff.toLocaleString('en-PK')}. Available: Rs. ${Number(bank.currentBalance || 0).toLocaleString('en-PK')}`
            });
          }
        }

        // Deduct only the positive difference from petty cash or bank via recordLedgerEntry
        await recordLedgerEntry({
          transactionType: paymentMethod === 'cash' ? 'PURCHASE_CASH' : 'PURCHASE_BANK',
          sourceAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
          destinationAccount: 'inventory',
          amount: diff,
          bankAccountId: bankAccountId || null,
          referenceType: 'purchase_batch',
          referenceId: String(batch._id),
          description: `Additional courier/purchase cost for batch ${batch.batchNumber || batch.supplierName} (+Rs. ${diff.toLocaleString('en-PK')})`,
          createdBy: currentUserId,
          date: new Date(),
        });
      } else if (diff < 0) {
        // Cost was reduced: refund difference back to source
        const refundAmount = Math.abs(diff);
        await recordLedgerEntry({
          transactionType: 'PURCHASE_REFUND',
          sourceAccount: 'inventory',
          destinationAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
          amount: refundAmount,
          bankAccountId: bankAccountId || null,
          referenceType: 'purchase_batch',
          referenceId: String(batch._id),
          description: `Refund for cost reduction on batch ${batch.batchNumber || batch.supplierName} (Refund: Rs. ${refundAmount.toLocaleString('en-PK')})`,
          createdBy: currentUserId,
          date: new Date(),
        });
      }
      // If diff === 0: no money moves, balances remain untouched
    } else {
      // PAYMENT SOURCE CHANGED (e.g. from Cash to Bank)
      // 1. Refund old payment back to previous source
      if (oldPaid > 0) {
        await recordLedgerEntry({
          transactionType: 'PURCHASE_REFUND',
          sourceAccount: 'inventory',
          destinationAccount: oldMethod === 'bank' ? 'bank' : 'cash',
          amount: oldPaid,
          bankAccountId: oldBankId || null,
          referenceType: 'purchase_batch',
          referenceId: String(batch._id),
          description: `Reversal of old payment on method switch for batch ${batch.batchNumber || batch.supplierName}`,
          createdBy: currentUserId,
          date: new Date(),
        });
      }

      // 2. Deduct new amount from new source
      if (actualPaid > 0) {
        if (paymentMethod === 'cash') {
          const settings = await getOrCreateFinanceSettings();
          const currentCash = Number(settings.currentPettyCash || 0);
          if (currentCash < actualPaid) {
            return res.status(400).json({
              message: `Insufficient Petty Cash balance. Available: Rs. ${currentCash.toLocaleString('en-PK')}`
            });
          }
        } else if (paymentMethod === 'bank') {
          if (!bankAccountId) {
            return res.status(400).json({ message: 'Bank account is required for bank payment' });
          }
          const bank = await BankAccount.findById(bankAccountId);
          if (!bank || Number(bank.currentBalance || 0) < actualPaid) {
            return res.status(400).json({
              message: `Insufficient bank balance in ${bank?.bankName || 'bank'}. Available: Rs. ${Number(bank?.currentBalance || 0).toLocaleString('en-PK')}`
            });
          }
        }

        await recordLedgerEntry({
          transactionType: paymentMethod === 'cash' ? 'PURCHASE_CASH' : 'PURCHASE_BANK',
          sourceAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
          destinationAccount: 'inventory',
          amount: actualPaid,
          bankAccountId: bankAccountId || null,
          referenceType: 'purchase_batch',
          referenceId: String(batch._id),
          description: `Payment via ${paymentMethod === 'bank' ? 'Bank' : 'Petty Cash'} for batch ${batch.batchNumber || batch.supplierName}`,
          createdBy: currentUserId,
          date: new Date(),
        });
      }
    }

    // 5. UPDATE ACCOUNTPAYABLE (Credit tracking)
    if (actualRemaining > 0) {
      if (batch.payableId) {
        await AccountPayable.findByIdAndUpdate(batch.payableId, {
          supplierName: String(supplierName).trim(),
          billDate: purchaseDate ? new Date(purchaseDate) : batch.purchaseDate,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          totalAmount,
          paidAmount: actualPaid,
          remainingAmount: actualRemaining,
          status: actualPaid > 0 ? 'partially_paid' : 'unpaid',
        });
      } else {
        const payable = await AccountPayable.create({
          billNumber: batch.batchNumber || `PUR-${Date.now().toString().slice(-6)}`,
          supplierName: String(supplierName).trim(),
          purchaseBatchId: batch._id,
          billDate: purchaseDate ? new Date(purchaseDate) : batch.purchaseDate,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          totalAmount,
          paidAmount: actualPaid,
          remainingAmount: actualRemaining,
          status: actualPaid > 0 ? 'partially_paid' : 'unpaid',
          notes: `Credit purchase: ${batch.batchNumber || batch._id}`,
          createdBy: currentUserId,
        });
        batch.payableId = payable._id;
      }
    } else if (batch.payableId) {
      await AccountPayable.findByIdAndDelete(batch.payableId);
      batch.payableId = undefined;
    }

    // 6. UPDATE PURCHASE BATCH RECORD
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
    batch.bankAccountId = (paymentMethod === 'bank' && bankAccountId) ? bankAccountId : undefined;
    batch.dueDate = dueDate ? new Date(dueDate) : undefined;

    await batch.save();

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

    const currentUserId = await resolveUserId(req);

    // 1. REVERT STOCK SAFELY
    if (Array.isArray(batch.items)) {
      for (const item of batch.items) {
        const prodId = item.productId?._id || item.productId;
        if (!prodId) continue;
        const qty = Number(item.quantity || 0);
        if (qty <= 0) continue;

        const product = await Product.findById(prodId);
        if (product) {
          const prevStock = Number(product.stock || 0);
          const nextStock = Math.max(0, prevStock - qty);
          await Product.findByIdAndUpdate(prodId, { stock: nextStock });

          try {
            await StockHistory.create({
              productId: prodId,
              type: 'stock_out',
              quantity: qty,
              previousStock: prevStock,
              newStock: nextStock,
              reason: 'Purchase batch deleted',
              notes: `Reversal for deleted batch ${batch.batchNumber || batch._id}`,
              createdBy: currentUserId,
            });
          } catch (shErr) {
            console.warn('StockHistory warning on delete:', shErr.message);
          }
        }
      }
    }

    // 2. REFUND FINANCIAL DEDUCTIONS
    let oldPaid = 0;
    if (batch.paidAmount !== undefined && batch.paidAmount !== null) {
      oldPaid = Number(batch.paidAmount || 0);
    } else if (batch.paymentStatus === 'paid') {
      oldPaid = Number(batch.totalAmount || 0);
    } else if (batch.paymentStatus === 'partially_paid') {
      oldPaid = Number(batch.paidAmount || 0);
    }

    const oldMethod = batch.paymentMethod || 'cash';
    if (oldPaid > 0) {
      await recordLedgerEntry({
        transactionType: 'PURCHASE_REFUND',
        sourceAccount: 'inventory',
        destinationAccount: oldMethod === 'bank' ? 'bank' : 'cash',
        amount: oldPaid,
        bankAccountId: batch.bankAccountId || null,
        referenceType: 'purchase_batch',
        referenceId: String(batch._id),
        description: `Refund for deleted purchase batch ${batch.batchNumber || batch.supplierName}`,
        createdBy: currentUserId,
        date: new Date(),
      });
    }

    // 3. DELETE ASSOCIATED ACCOUNTPAYABLE
    if (batch.payableId) {
      await AccountPayable.findByIdAndDelete(batch.payableId);
    }

    // 4. VOID ASSOCIATED OLD LEDGER ENTRIES
    await FinanceLedger.updateMany(
      { referenceType: 'purchase_batch', referenceId: String(batch._id) },
      {
        isVoided: true,
        voidReason: 'Purchase batch deleted',
        voidedBy: currentUserId,
        voidedAt: new Date(),
      }
    );

    // 5. DELETE BATCH RECORD
    await PurchaseBatch.findByIdAndDelete(id);

    return res.json({ message: 'Purchase batch deleted, stock reversed, and payment refunded successfully' });
  } catch (error) {
    console.error('Error deleting purchase batch:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
