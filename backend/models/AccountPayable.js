import mongoose from 'mongoose';

const payablePaymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank'],
      default: 'cash',
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
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
  { _id: true, timestamps: true }
);

const accountPayableSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      trim: true,
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    purchaseBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseBatch',
    },
    billDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'overdue'],
      default: 'unpaid',
    },
    payments: [payablePaymentSchema],
    notes: {
      type: String,
      trim: true,
    },
    isOpeningBalance: {
      type: Boolean,
      default: false,
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

export default mongoose.model('AccountPayable', accountPayableSchema);

