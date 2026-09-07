import mongoose from 'mongoose';

const financeLedgerSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      trim: true,
      default: () => {
        const year = new Date().getFullYear();
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        const time = Date.now().toString().slice(-4);
        return `TXN-${year}-${time}-${rand}`;
      },
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        'OWNER_INVESTMENT',
        'OWNER_WITHDRAWAL',
        'PURCHASE_CASH',
        'PURCHASE_BANK',
        'PURCHASE_CREDIT',
        'SUPPLIER_PAYMENT',
        'EXPENSE',
        'SALE_CASH',
        'SALE_CREDIT',
        'CUSTOMER_PAYMENT',
        'CASH_TO_BANK_TRANSFER',
        'BANK_TO_CASH_TRANSFER',
        'BANK_TRANSFER',
        'OPENING_BALANCE',
        'ADJUSTMENT',
      ],
      required: true,
    },
    sourceAccount: {
      type: String,
      enum: ['cash', 'bank', 'accounts_receivable', 'accounts_payable', 'inventory', 'equity', 'expense', 'revenue', 'other_assets', 'other_liabilities'],
      required: true,
    },
    destinationAccount: {
      type: String,
      enum: ['cash', 'bank', 'accounts_receivable', 'accounts_payable', 'inventory', 'equity', 'expense', 'revenue', 'other_assets', 'other_liabilities'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    referenceType: {
      type: String,
      enum: ['bill', 'purchase_batch', 'expense', 'owner_investment', 'owner_withdrawal', 'account_payable', 'account_receivable', 'opening_receivable', 'petty_cash', 'manual', 'opening_balance'],
      default: 'manual',
    },
    referenceId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    isVoided: {
      type: Boolean,
      default: false,
    },
    voidReason: {
      type: String,
      trim: true,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    voidedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate transaction ID before validation if missing
financeLedgerSchema.pre('validate', function (next) {
  if (!this.transactionId) {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const time = Date.now().toString().slice(-4);
    this.transactionId = `TXN-${year}-${time}-${rand}`;
  }
  next();
});

export default mongoose.model('FinanceLedger', financeLedgerSchema);

