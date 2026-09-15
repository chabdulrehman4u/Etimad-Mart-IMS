import mongoose from 'mongoose';

const sellerTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerDispatch',
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'EARNING_PAYABLE', // + to Seller Payable (Etimad received COD; owes seller margin)
        'SELLER_PAYOUT', // - to Seller Payable (Etimad paid the seller their margin)
        'SELLER_RECEIVABLE_INCURRED', // + to Seller Receivable (Seller collected COD; owes Etimad product cost)
        'SELLER_REMITTANCE', // - to Seller Receivable (Seller paid Etimad the product cost)
        'MANUAL_PAYABLE_ADJUSTMENT', // Manual +/- to Seller Payable
        'MANUAL_RECEIVABLE_ADJUSTMENT', // Manual +/- to Seller Receivable
      ],
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'adjustment', 'other'],
      default: 'cash',
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Pre-save auto-generate transactionId if empty
sellerTransactionSchema.pre('save', function (next) {
  if (!this.transactionId) {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const time = Date.now().toString().slice(-4);
    this.transactionId = `STXN-${year}-${time}-${rand}`;
  }
  next();
});

export default mongoose.model('SellerTransaction', sellerTransactionSchema);

