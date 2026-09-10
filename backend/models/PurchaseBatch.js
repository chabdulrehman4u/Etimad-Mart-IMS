import mongoose from 'mongoose';

const purchaseBatchItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    courierExpensePerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    effectiveCostPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      trim: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    items: {
      type: [purchaseBatchItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one item is required in a purchase batch',
      },
    },
    itemsCost: {
      type: Number,
      min: 0,
    },
    courierExpense: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partially_paid', 'unpaid'],
      default: 'paid',
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'credit'],
      default: 'cash',
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    dueDate: {
      type: Date,
    },
    payableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccountPayable',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('PurchaseBatch', purchaseBatchSchema);
