import mongoose from 'mongoose';
import SellerDispatch from '../models/SellerDispatch.js';
import SellerTransaction from '../models/SellerTransaction.js';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import BankAccount from '../models/BankAccount.js';
import Admin from '../models/Admin.js';
import { getOrCreateFinanceSettings, recordLedgerEntry } from '../services/financeService.js';

// Helper to resolve current user/admin ID
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

// 1. CREATE SELLER DISPATCH (Main Stock -> Seller Stock)
export const createDispatch = async (req, res) => {
  try {
    const {
      sellerId,
      productId,
      quantity = 1,
      customerName,
      customerPhone,
      customerAddress,
      customerSaleAmount,
      etimadCostAtDispatch,
      courier,
      trackingNumber,
      dispatchDate,
      collectionMethod = 'courier_to_etimad',
      notes,
    } = req.body || {};

    if (!sellerId) return res.status(400).json({ message: 'Seller is required' });
    if (!productId) return res.status(400).json({ message: 'Product is required' });
    if (!courier || !String(courier).trim()) return res.status(400).json({ message: 'Courier is required' });
    if (!trackingNumber || !String(trackingNumber).trim()) return res.status(400).json({ message: 'CN / Tracking number is required' });

    const numQty = Number(quantity || 1);
    if (!Number.isFinite(numQty) || numQty <= 0) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const cleanCN = String(trackingNumber).trim().toUpperCase();

    // Check duplicate tracking number
    const existingCN = await SellerDispatch.findOne({ trackingNumber: cleanCN });
    if (existingCN) {
      return res.status(400).json({
        message: `Tracking number (CN) "${cleanCN}" already exists in the system under dispatch ${existingCN.dispatchNumber}.`,
      });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: 'Selected seller not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Selected product not found' });

    // Verify stock availability in main stock
    const currentStock = Number(product.stock || 0);
    if (currentStock < numQty) {
      return res.status(400).json({
        message: `Insufficient stock in Main Inventory. Available: ${currentStock}, Requested: ${numQty}.`,
      });
    }

    // Determine unit product cost (snapshot at dispatch)
    const unitCost = Number(etimadCostAtDispatch !== undefined && etimadCostAtDispatch !== null ? etimadCostAtDispatch : product.originalPrice || 0);
    const saleAmt = Number(customerSaleAmount || 0);
    const totalCost = unitCost * numQty;
    const expectedProfit = saleAmt - totalCost;

    const currentUserId = await resolveUserId(req);

    // 1. DEDUCT FROM MAIN STOCK
    const newStock = currentStock - numQty;
    await Product.findByIdAndUpdate(productId, { stock: newStock });

    // 2. RECORD AUDIT IN STOCK HISTORY
    try {
      await StockHistory.create({
        productId,
        type: 'stock_out',
        quantity: numQty,
        previousStock: currentStock,
        newStock,
        reason: 'SELLER_DISPATCH',
        notes: `Dispatched to ${seller.name} (${courier} - ${cleanCN})`,
        createdBy: currentUserId,
      });
    } catch (shErr) {
      console.warn('StockHistory warning on seller dispatch:', shErr.message);
    }

    // 3. CREATE SELLER DISPATCH RECORD
    const dispatch = new SellerDispatch({
      sellerId,
      productId,
      quantity: numQty,
      customerName: customerName ? String(customerName).trim() : '',
      customerPhone: customerPhone ? String(customerPhone).trim() : '',
      customerAddress: customerAddress ? String(customerAddress).trim() : '',
      customerSaleAmount: saleAmt,
      etimadCostAtDispatch: unitCost,
      expectedSellerProfit: expectedProfit,
      courier: String(courier).trim(),
      trackingNumber: cleanCN,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      collectionMethod,
      deliveryStatus: 'dispatched',
      physicalStockStatus: 'with_seller',
      stockRestored: false,
      paymentStatus: 'pending',
      settlementStatus: 'unsettled',
      notes: notes ? String(notes).trim() : '',
      createdBy: currentUserId,
    });

    await dispatch.save();

    const populated = await SellerDispatch.findById(dispatch._id)
      .populate('sellerId', 'name phone')
      .populate('productId', 'name model category originalPrice stock');

    return res.status(201).json({
      success: true,
      message: `Product dispatched to ${seller.name}. Main stock updated from ${currentStock} to ${newStock}.`,
      dispatch: populated,
    });
  } catch (error) {
    console.error('Error in createDispatch:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. GET DISPATCHES (With multi-faceted filtering & search)
export const getDispatches = async (req, res) => {
  try {
    const {
      sellerId,
      courier,
      deliveryStatus,
      paymentStatus,
      settlementStatus,
      collectionMethod,
      physicalStockStatus,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      filter.sellerId = sellerId;
    }
    if (courier && courier !== 'all') {
      filter.courier = courier;
    }
    if (deliveryStatus && deliveryStatus !== 'all') {
      filter.deliveryStatus = deliveryStatus;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }
    if (settlementStatus && settlementStatus !== 'all') {
      filter.settlementStatus = settlementStatus;
    }
    if (collectionMethod && collectionMethod !== 'all') {
      filter.collectionMethod = collectionMethod;
    }
    if (physicalStockStatus && physicalStockStatus !== 'all') {
      filter.physicalStockStatus = physicalStockStatus;
    }

    if (startDate || endDate) {
      filter.dispatchDate = {};
      if (startDate) filter.dispatchDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.dispatchDate.$lte = end;
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [
        { trackingNumber: { $regex: q, $options: 'i' } },
        { dispatchNumber: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(200, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [dispatches, total] = await Promise.all([
      SellerDispatch.find(filter)
        .populate('sellerId', 'name phone')
        .populate('productId', 'name model category originalPrice stock')
        .populate('bankAccountId', 'bankName accountNumber')
        .populate('createdBy', 'name email')
        .sort({ dispatchDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SellerDispatch.countDocuments(filter),
    ]);

    return res.json({
      dispatches,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error in getDispatches:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. GET SINGLE DISPATCH
export const getDispatchById = async (req, res) => {
  try {
    const dispatch = await SellerDispatch.findById(req.params.id)
      .populate('sellerId', 'name phone')
      .populate('productId', 'name model category originalPrice stock')
      .populate('bankAccountId', 'bankName accountNumber currentBalance')
      .populate('paymentConfirmedBy', 'name email')
      .populate('stockRestoredBy', 'name email')
      .populate('createdBy', 'name email');

    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });
    return res.json(dispatch);
  } catch (error) {
    console.error('Error in getDispatchById:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. UPDATE DELIVERY STATUS (Dispatched -> In Transit -> Delivered / Returned / Lost / Damaged)
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus, deliveryDate, notes } = req.body || {};

    const dispatch = await SellerDispatch.findById(id);
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });

    if (!deliveryStatus) return res.status(400).json({ message: 'Delivery status is required' });

    dispatch.deliveryStatus = deliveryStatus;
    if (notes) {
      dispatch.notes = dispatch.notes ? `${dispatch.notes}\n${notes}` : notes;
    }

    if (deliveryStatus === 'delivered') {
      dispatch.deliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();
      dispatch.physicalStockStatus = 'delivered_to_customer';
    } else if (deliveryStatus === 'returned') {
      // NOTE: Stock is NOT restored yet. Must wait for physical arrival at office!
      dispatch.physicalStockStatus = 'awaiting_return';
    } else if (deliveryStatus === 'lost' || deliveryStatus === 'damaged') {
      dispatch.physicalStockStatus = 'lost_or_damaged';
    } else if (deliveryStatus === 'in_transit') {
      dispatch.physicalStockStatus = 'with_seller';
    }

    await dispatch.save();

    const populated = await SellerDispatch.findById(dispatch._id)
      .populate('sellerId', 'name phone')
      .populate('productId', 'name model category originalPrice stock');

    return res.json({
      success: true,
      message: `Parcel status updated to ${deliveryStatus.toUpperCase()}.${deliveryStatus === 'returned' ? ' Awaiting physical return to office before restoring stock.' : ''}`,
      dispatch: populated,
    });
  } catch (error) {
    console.error('Error in updateDeliveryStatus:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 5. RESTORE STOCK FOR RETURNED PRODUCT ("Product Received / Restore Stock")
export const restoreStockForReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    const dispatch = await SellerDispatch.findById(id).populate('sellerId', 'name');
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });

    // Guard: Prevent double stock restoration
    if (dispatch.stockRestored) {
      return res.status(400).json({
        message: 'Stock has already been restored for this returned parcel.',
      });
    }

    // Must be marked as returned or awaiting return
    if (dispatch.deliveryStatus !== 'returned' && dispatch.physicalStockStatus !== 'awaiting_return') {
      return res.status(400).json({
        message: 'Parcel must be marked as Returned by courier before stock can be received and restored.',
      });
    }

    const currentUserId = await resolveUserId(req);
    const product = await Product.findById(dispatch.productId);
    if (!product) return res.status(404).json({ message: 'Product record not found' });

    const prevStock = Number(product.stock || 0);
    const qty = Number(dispatch.quantity || 1);
    const nextStock = prevStock + qty;

    // Restore stock to main inventory
    await Product.findByIdAndUpdate(dispatch.productId, { stock: nextStock });

    // Record audit entry in StockHistory
    try {
      await StockHistory.create({
        productId: dispatch.productId,
        type: 'stock_in',
        quantity: qty,
        previousStock: prevStock,
        newStock: nextStock,
        reason: 'SELLER_RETURN_RECEIVED',
        notes: `Physical return received for ${dispatch.sellerId?.name || 'Seller'} - CN: ${dispatch.trackingNumber}`,
        createdBy: currentUserId,
      });
    } catch (shErr) {
      console.warn('StockHistory warning on return receive:', shErr.message);
    }

    dispatch.stockRestored = true;
    dispatch.stockRestoredAt = new Date();
    dispatch.stockRestoredBy = currentUserId;
    dispatch.physicalStockStatus = 'returned_to_main_stock';
    dispatch.settlementStatus = 'not_applicable';
    if (notes) {
      dispatch.notes = dispatch.notes ? `${dispatch.notes}\nReturn Received: ${notes}` : `Return Received: ${notes}`;
    }

    await dispatch.save();

    const populated = await SellerDispatch.findById(dispatch._id)
      .populate('sellerId', 'name phone')
      .populate('productId', 'name model category originalPrice stock')
      .populate('stockRestoredBy', 'name email');

    return res.json({
      success: true,
      message: `Product physically received! Main stock restored from ${prevStock} to ${nextStock}.`,
      dispatch: populated,
    });
  } catch (error) {
    console.error('Error in restoreStockForReturn:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 6. CONFIRM PAYMENT RECEIVED
export const confirmPaymentReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amountReceived,
      paymentDate,
      paymentAccount = 'cash',
      bankAccountId,
      reference,
      notes,
    } = req.body || {};

    const dispatch = await SellerDispatch.findById(id).populate('sellerId', 'name');
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });

    if (dispatch.paymentStatus === 'received') {
      return res.status(400).json({ message: 'Payment for this parcel is already confirmed.' });
    }

    if (dispatch.deliveryStatus !== 'delivered') {
      return res.status(400).json({
        message: 'Payment can only be confirmed after the parcel is marked Delivered to customer.',
      });
    }

    const currentUserId = await resolveUserId(req);
    const actualReceived = Number(amountReceived !== undefined ? amountReceived : dispatch.customerSaleAmount);
    const txDate = paymentDate ? new Date(paymentDate) : new Date();

    dispatch.paymentStatus = 'received';
    dispatch.paymentReceivedAmount = actualReceived;
    dispatch.paymentReceivedDate = txDate;
    dispatch.paymentAccount = paymentAccount;
    dispatch.bankAccountId = bankAccountId || undefined;
    dispatch.paymentReference = reference ? String(reference).trim() : '';
    dispatch.paymentConfirmedBy = currentUserId;
    dispatch.paymentNotes = notes ? String(notes).trim() : '';

    const totalProductCost = Number(dispatch.etimadCostAtDispatch || 0) * Number(dispatch.quantity || 1);
    const sellerMargin = actualReceived - totalProductCost;

    // ACCOUNTING RULES ENFORCEMENT:
    // CASE A: Courier or Office Cash deposited into Etimad Account:
    // Etimad keeps product cost, seller is owed the margin -> Credit Seller Payable
    if (dispatch.collectionMethod === 'courier_to_etimad' || dispatch.collectionMethod === 'office_cash') {
      if (sellerMargin > 0) {
        await SellerTransaction.create({
          sellerId: dispatch.sellerId._id,
          dispatchId: dispatch._id,
          date: txDate,
          type: 'EARNING_PAYABLE',
          amount: sellerMargin,
          notes: `Earning from delivered parcel CN: ${dispatch.trackingNumber} (${dispatch.courier}). Sale: Rs. ${actualReceived.toLocaleString()} - Cost: Rs. ${totalProductCost.toLocaleString()}`,
          createdBy: currentUserId,
        });
      }

      // Record in main finance ledger (incoming revenue into Etimad cash or bank)
      if (actualReceived > 0 && (paymentAccount === 'cash' || paymentAccount === 'bank')) {
        try {
          await recordLedgerEntry({
            transactionType: 'CUSTOMER_PAYMENT',
            sourceAccount: 'accounts_receivable',
            destinationAccount: paymentAccount,
            amount: actualReceived,
            bankAccountId: paymentAccount === 'bank' ? bankAccountId : null,
            referenceType: 'seller_dispatch',
            referenceId: String(dispatch._id),
            description: `COD received from ${dispatch.courier} for parcel ${dispatch.trackingNumber} (${dispatch.sellerId?.name})`,
            createdBy: currentUserId,
            date: txDate,
          });
        } catch (fErr) {
          console.warn('Finance ledger record warning:', fErr.message);
        }
      }
    } else if (dispatch.collectionMethod === 'seller_collection') {
      // CASE B: Seller collected COD directly from Pakistan Post / customer:
      // Seller retains the full COD and their margin, and now OWES Etimad the Product Cost!
      // -> Debit Seller Receivable (Seller owes Etimad)
      if (totalProductCost > 0) {
        await SellerTransaction.create({
          sellerId: dispatch.sellerId._id,
          dispatchId: dispatch._id,
          date: txDate,
          type: 'SELLER_RECEIVABLE_INCURRED',
          amount: totalProductCost,
          notes: `Seller collected COD on CN: ${dispatch.trackingNumber}. Etimad product cost receivable: Rs. ${totalProductCost.toLocaleString()}`,
          createdBy: currentUserId,
        });
      }
    }

    await dispatch.save();

    const populated = await SellerDispatch.findById(dispatch._id)
      .populate('sellerId', 'name phone')
      .populate('productId', 'name model category originalPrice stock')
      .populate('bankAccountId', 'bankName accountNumber')
      .populate('paymentConfirmedBy', 'name email');

    return res.json({
      success: true,
      message: `Payment confirmed successfully! Financial accounts updated for ${dispatch.sellerId?.name}.`,
      dispatch: populated,
    });
  } catch (error) {
    console.error('Error in confirmPaymentReceived:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 7. SETTLE SELLER (Admin Payout to Seller — Reduces Seller Payable)
export const settleSeller = async (req, res) => {
  try {
    const {
      sellerId,
      amount,
      paymentMethod = 'cash',
      bankAccountId,
      reference,
      notes,
      date,
    } = req.body || {};

    if (!sellerId) return res.status(400).json({ message: 'Seller is required' });
    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Settlement amount must be greater than zero' });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    // Validate available cash/bank balance
    if (paymentMethod === 'cash') {
      const settings = await getOrCreateFinanceSettings();
      if (Number(settings.currentPettyCash || 0) < numAmount) {
        return res.status(400).json({
          message: `Insufficient Petty Cash to pay seller. Available: Rs. ${Number(settings.currentPettyCash || 0).toLocaleString()}`,
        });
      }
    } else if (paymentMethod === 'bank') {
      if (!bankAccountId) return res.status(400).json({ message: 'Bank account is required for bank payment' });
      const bank = await BankAccount.findById(bankAccountId);
      if (!bank || Number(bank.currentBalance || 0) < numAmount) {
        return res.status(400).json({
          message: `Insufficient bank balance in ${bank?.bankName || 'bank'}. Available: Rs. ${Number(bank?.currentBalance || 0).toLocaleString()}`,
        });
      }
    }

    const currentUserId = await resolveUserId(req);
    const txDate = date ? new Date(date) : new Date();

    // 1. Record in Seller Ledger as SELLER_PAYOUT
    const stxn = await SellerTransaction.create({
      sellerId,
      date: txDate,
      type: 'SELLER_PAYOUT',
      amount: numAmount,
      paymentMethod,
      bankAccountId: bankAccountId || undefined,
      reference: reference ? String(reference).trim() : '',
      notes: notes ? String(notes).trim() : `Settlement payout to ${seller.name}`,
      createdBy: currentUserId,
    });

    // 2. Record in main Finance Ledger
    try {
      await recordLedgerEntry({
        transactionType: 'EXPENSE',
        sourceAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
        destinationAccount: 'accounts_payable',
        amount: numAmount,
        bankAccountId: paymentMethod === 'bank' ? bankAccountId : null,
        referenceType: 'seller_settlement',
        referenceId: String(stxn._id),
        description: `Seller profit settlement paid to ${seller.name} (Rs. ${numAmount.toLocaleString()} via ${paymentMethod})`,
        createdBy: currentUserId,
        date: txDate,
      });
    } catch (fErr) {
      console.warn('Finance ledger payout warning:', fErr.message);
    }

    // Mark settled dispatches
    await SellerDispatch.updateMany(
      { sellerId, paymentStatus: 'received', settlementStatus: 'unsettled' },
      { settlementStatus: 'settled', settlementTransactionId: stxn._id }
    );

    return res.status(201).json({
      success: true,
      message: `Settlement of Rs. ${numAmount.toLocaleString()} paid to ${seller.name} successfully.`,
      transaction: stxn,
    });
  } catch (error) {
    console.error('Error in settleSeller:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 8. RECORD SELLER REMITTANCE (Seller gives Etimad product cost for direct COD collections)
export const recordSellerRemittance = async (req, res) => {
  try {
    const {
      sellerId,
      amount,
      paymentMethod = 'cash',
      bankAccountId,
      reference,
      notes,
      date,
    } = req.body || {};

    if (!sellerId) return res.status(400).json({ message: 'Seller is required' });
    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Remittance amount must be greater than zero' });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    const currentUserId = await resolveUserId(req);
    const txDate = date ? new Date(date) : new Date();

    // 1. Record in Seller Ledger as SELLER_REMITTANCE
    const stxn = await SellerTransaction.create({
      sellerId,
      date: txDate,
      type: 'SELLER_REMITTANCE',
      amount: numAmount,
      paymentMethod,
      bankAccountId: bankAccountId || undefined,
      reference: reference ? String(reference).trim() : '',
      notes: notes ? String(notes).trim() : `COD remittance received from ${seller.name}`,
      createdBy: currentUserId,
    });

    // 2. Deposit into Etimad Petty Cash or Bank in main Finance Ledger
    try {
      await recordLedgerEntry({
        transactionType: 'CUSTOMER_PAYMENT',
        sourceAccount: 'accounts_receivable',
        destinationAccount: paymentMethod === 'cash' ? 'cash' : 'bank',
        amount: numAmount,
        bankAccountId: paymentMethod === 'bank' ? bankAccountId : null,
        referenceType: 'seller_remittance',
        referenceId: String(stxn._id),
        description: `COD remittance received from ${seller.name} (Rs. ${numAmount.toLocaleString()} via ${paymentMethod})`,
        createdBy: currentUserId,
        date: txDate,
      });
    } catch (fErr) {
      console.warn('Finance ledger remittance warning:', fErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Remittance of Rs. ${numAmount.toLocaleString()} received from ${seller.name} successfully.`,
      transaction: stxn,
    });
  } catch (error) {
    console.error('Error in recordSellerRemittance:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 9. GET SELLER FINANCIAL SUMMARY (Both separate ledgers & net position)
export const getSellerFinancialSummary = async (req, res) => {
  try {
    const { sellerId } = req.query;

    const sellerFilter = {};
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      sellerFilter._id = sellerId;
    }

    const sellers = await Seller.find(sellerFilter).select('_id name phone isActive joiningDate');

    const summaries = await Promise.all(
      sellers.map(async (seller) => {
        const sId = seller._id;

        // 1. Dispatches count & status aggregation
        const dispatches = await SellerDispatch.find({ sellerId: sId });

        let totalDispatched = 0;
        let inTransit = 0;
        let delivered = 0;
        let returned = 0;
        let paymentPending = 0;
        let paymentReceived = 0;
        let stockWithSellerUnits = 0;
        let returnedStockPendingUnits = 0;
        let totalSales = 0;
        let totalCost = 0;
        let totalEarnings = 0;

        dispatches.forEach((d) => {
          totalDispatched += 1;
          const qty = Number(d.quantity || 1);

          if (d.deliveryStatus === 'in_transit' || d.deliveryStatus === 'dispatched') {
            inTransit += 1;
          }
          if (d.deliveryStatus === 'delivered') {
            delivered += 1;
          }
          if (d.deliveryStatus === 'returned') {
            returned += 1;
          }

          if (d.physicalStockStatus === 'with_seller') {
            stockWithSellerUnits += qty;
          }
          if (d.deliveryStatus === 'returned' && !d.stockRestored) {
            returnedStockPendingUnits += qty;
          }

          if (d.paymentStatus === 'pending' && d.deliveryStatus === 'delivered') {
            paymentPending += 1;
          }
          if (d.paymentStatus === 'received') {
            paymentReceived += 1;
          }

          if (d.deliveryStatus === 'delivered') {
            totalSales += Number(d.customerSaleAmount || 0);
            totalCost += Number(d.etimadCostAtDispatch || 0) * qty;
            totalEarnings += Number(d.expectedSellerProfit || 0);
          }
        });

        // 2. Ledger Transaction aggregation for Separate Balances
        const txns = await SellerTransaction.find({ sellerId: sId });

        let totalEarningPayable = 0;
        let totalSellerPayouts = 0;
        let totalReceivableIncurred = 0;
        let totalSellerRemittances = 0;

        txns.forEach((t) => {
          const amt = Number(t.amount || 0);
          if (t.type === 'EARNING_PAYABLE' || t.type === 'MANUAL_PAYABLE_ADJUSTMENT') {
            totalEarningPayable += amt;
          } else if (t.type === 'SELLER_PAYOUT') {
            totalSellerPayouts += amt;
          } else if (t.type === 'SELLER_RECEIVABLE_INCURRED' || t.type === 'MANUAL_RECEIVABLE_ADJUSTMENT') {
            totalReceivableIncurred += amt;
          } else if (t.type === 'SELLER_REMITTANCE') {
            totalSellerRemittances += amt;
          }
        });

        // 🟢 SELLER PAYABLE (Etimad owes Seller)
        const currentPayable = Math.max(0, totalEarningPayable - totalSellerPayouts);

        // 🔴 SELLER RECEIVABLE (Seller owes Etimad)
        const currentReceivable = Math.max(0, totalReceivableIncurred - totalSellerRemittances);

        // ⚖️ NET BALANCE: Positive = Etimad owes Seller, Negative = Seller owes Etimad
        const netBalance = currentPayable - currentReceivable;

        return {
          seller: {
            _id: seller._id,
            name: seller.name,
            phone: seller.phone,
            isActive: seller.isActive,
            joiningDate: seller.joiningDate || seller.createdAt,
          },
          dispatches: {
            total: totalDispatched,
            inTransit,
            delivered,
            returned,
            paymentPending,
            paymentReceived,
          },
          stock: {
            unitsWithSeller: stockWithSellerUnits,
            returnedStockPendingUnits,
          },
          sales: {
            totalSales,
            totalCost,
            totalEarnings,
          },
          balances: {
            // 🟢 Etimad Owes Seller
            totalEarningPayable,
            totalSellerPayouts,
            currentPayable,

            // 🔴 Seller Owes Etimad
            totalReceivableIncurred,
            totalSellerRemittances,
            currentReceivable,

            // ⚖️ Net
            netBalance,
            netStatus: netBalance >= 0 ? 'etimad_owes_seller' : 'seller_owes_etimad',
          },
        };
      })
    );

    return res.json(summaries);
  } catch (error) {
    console.error('Error in getSellerFinancialSummary:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 10. GET SELLER TRANSACTION LEDGER
export const getSellerLedger = async (req, res) => {
  try {
    const { sellerId, page = 1, limit = 50 } = req.query;
    if (!sellerId) return res.status(400).json({ message: 'sellerId is required' });

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(200, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      SellerTransaction.find({ sellerId })
        .populate('dispatchId', 'dispatchNumber trackingNumber courier customerSaleAmount expectedSellerProfit')
        .populate('bankAccountId', 'bankName accountNumber')
        .populate('createdBy', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SellerTransaction.countDocuments({ sellerId }),
    ]);

    return res.json({
      transactions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error in getSellerLedger:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 11. GET SPECIALIZED REPORTS
export const getSellerReports = async (req, res) => {
  try {
    const { reportType, sellerId, courier, startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.dispatchDate = {};
      if (startDate) dateFilter.dispatchDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.dispatchDate.$lte = end;
      }
    }

    if (reportType === 'courier_payment_pending') {
      // Delivered parcels awaiting COD confirmation
      const parcels = await SellerDispatch.find({
        deliveryStatus: 'delivered',
        paymentStatus: 'pending',
        ...(sellerId && { sellerId }),
        ...(courier && courier !== 'all' && { courier }),
        ...dateFilter,
      })
        .populate('sellerId', 'name phone')
        .populate('productId', 'name model originalPrice')
        .sort({ deliveryDate: -1, dispatchDate: -1 });
      return res.json(parcels);
    }

    if (reportType === 'seller_collection_pending') {
      // Parcels where seller collected COD and Etimad hasn't received product cost
      const parcels = await SellerDispatch.find({
        collectionMethod: 'seller_collection',
        deliveryStatus: 'delivered',
        ...(sellerId && { sellerId }),
        ...dateFilter,
      })
        .populate('sellerId', 'name phone')
        .populate('productId', 'name model originalPrice')
        .sort({ deliveryDate: -1 });
      return res.json(parcels);
    }

    if (reportType === 'stock_with_sellers') {
      // Products currently allocated to sellers
      const parcels = await SellerDispatch.find({
        physicalStockStatus: { $in: ['with_seller', 'awaiting_return'] },
        ...(sellerId && { sellerId }),
        ...(courier && courier !== 'all' && { courier }),
        ...dateFilter,
      })
        .populate('sellerId', 'name phone')
        .populate('productId', 'name model originalPrice stock')
        .sort({ dispatchDate: -1 });
      return res.json(parcels);
    }

    if (reportType === 'returned_stock_pending') {
      // Returned parcels awaiting physical receipt at office
      const parcels = await SellerDispatch.find({
        deliveryStatus: 'returned',
        stockRestored: false,
        ...(sellerId && { sellerId }),
        ...dateFilter,
      })
        .populate('sellerId', 'name phone')
        .populate('productId', 'name model originalPrice stock')
        .sort({ updatedAt: -1 });
      return res.json(parcels);
    }

    // Default: Seller Sales Overview Report
    const parcels = await SellerDispatch.find({
      ...(sellerId && { sellerId }),
      ...(courier && courier !== 'all' && { courier }),
      ...dateFilter,
    })
      .populate('sellerId', 'name phone')
      .populate('productId', 'name model originalPrice')
      .sort({ dispatchDate: -1 });

    return res.json(parcels);
  } catch (error) {
    console.error('Error in getSellerReports:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 12. GET DASHBOARD ALERTS
export const getDashboardAlerts = async (req, res) => {
  try {
    const [
      paymentPendingCount,
      sellerCollectionPendingCount,
      stockWithSellersCountAgg,
      pendingReturnsCount,
    ] = await Promise.all([
      SellerDispatch.countDocuments({ deliveryStatus: 'delivered', paymentStatus: 'pending' }),
      SellerDispatch.countDocuments({ collectionMethod: 'seller_collection', deliveryStatus: 'delivered', paymentStatus: 'pending' }),
      SellerDispatch.aggregate([
        { $match: { physicalStockStatus: { $in: ['with_seller', 'awaiting_return'] } } },
        { $group: { _id: null, totalUnits: { $sum: '$quantity' } } },
      ]),
      SellerDispatch.countDocuments({ deliveryStatus: 'returned', stockRestored: false }),
    ]);

    const unitsOutside = stockWithSellersCountAgg.length > 0 ? stockWithSellersCountAgg[0].totalUnits : 0;

    return res.json({
      paymentPendingCount,
      sellerCollectionPendingCount,
      unitsOutside,
      pendingReturnsCount,
    });
  } catch (error) {
    console.error('Error in getDashboardAlerts:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

