import mongoose from 'mongoose';

const sellerDispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: {
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
      required: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    customerAddress: {
      type: String,
      trim: true,
      default: '',
    },
    customerSaleAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    etimadCostAtDispatch: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedSellerProfit: {
      type: Number,
      required: true,
      default: 0,
    },
    courier: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    dispatchDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    collectionMethod: {
      type: String,
      required: true,
      enum: ['courier_to_etimad', 'seller_collection', 'office_cash'],
      default: 'courier_to_etimad',
      index: true,
    },

    // Lifecycle Statuses
    deliveryStatus: {
      type: String,
      required: true,
      enum: [
        'dispatched',
        'in_transit',
        'delivered',
        'returned',
        'lost',
        'damaged',
        'cancelled',
        'exchange',
        'redispatched',
      ],
      default: 'dispatched',
      index: true,
    },
    deliveryDate: {
      type: Date,
    },

    physicalStockStatus: {
      type: String,
      required: true,
      enum: [
        'with_seller',
        'delivered_to_customer',
        'awaiting_return',
        'returned_to_main_stock',
        'lost_or_damaged',
      ],
      default: 'with_seller',
      index: true,
    },
    stockRestored: {
      type: Boolean,
      default: false,
      index: true,
    },
    stockRestoredAt: {
      type: Date,
    },
    stockRestoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },

    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'received', 'disputed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentReceivedAmount: {
      type: Number,
      default: 0,
    },
    paymentReceivedDate: {
      type: Date,
    },
    paymentAccount: {
      type: String,
      enum: ['cash', 'bank', 'seller_retained', 'other'],
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    paymentConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    paymentNotes: {
      type: String,
      trim: true,
    },

    settlementStatus: {
      type: String,
      required: true,
      enum: ['unsettled', 'settled', 'partially_settled', 'not_applicable'],
      default: 'unsettled',
      index: true,
    },
    settlementTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerTransaction',
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

// Pre-save auto-generate readable dispatchNumber if empty
sellerDispatchSchema.pre('save', function (next) {
  if (!this.dispatchNumber) {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const time = Date.now().toString().slice(-4);
    this.dispatchNumber = `DSP-${year}-${time}-${rand}`;
  }
  next();
});

export default mongoose.model('SellerDispatch', sellerDispatchSchema);

