import mongoose from 'mongoose';

const onlineOrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    default: 'General',
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
});

const onlineOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      province: {
        type: String,
        trim: true,
        default: 'Punjab',
      },
      postalCode: {
        type: String,
        trim: true,
        default: '',
      },
    },
    items: [onlineOrderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 200,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'bank_transfer', 'online', 'card'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'returned', 'cancelled'],
      default: 'pending',
      index: true,
    },
    courier: {
      provider: {
        type: String,
        enum: ['Leopards', 'PostEx', 'Trax', 'TCS', 'CallCourier', 'Pakistan Post', 'Self'],
        default: 'Leopards',
      },
      trackingNumber: {
        type: String,
        trim: true,
        default: '',
        index: true,
      },
      bookedAt: {
        type: Date,
      },
      destinationCityId: {
        type: String,
        default: '',
      },
      weightKg: {
        type: Number,
        default: 0.5,
      },
      pieces: {
        type: Number,
        default: 1,
      },
    },
    source: {
      type: String,
      enum: ['storefront', 'whatsapp', 'facebook', 'manual', 'shopify', 'woocommerce'],
      default: 'storefront',
    },
    inventoryDeducted: {
      type: Boolean,
      default: true,
    },
    customerNotes: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
    },
    confirmedAt: Date,
    dispatchedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
  }
);

// Auto-generate order sequence like WEB-1001 or ETM-1001
onlineOrderSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.orderNumber) {
      const lastOrder = await this.constructor.findOne({ tenantId: this.tenantId }).sort({ createdAt: -1 });

      let sequence = 1001;
      if (lastOrder && lastOrder.orderNumber) {
        const parts = String(lastOrder.orderNumber).split('-');
        const lastPart = parts[parts.length - 1];
        const lastSeq = parseInt(lastPart, 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }

      this.orderNumber = `WEB-${sequence}`;
    }
    next();
  } catch (err) {
    console.error('Error generating online order sequence:', err);
    next(err);
  }
});

export default mongoose.model('OnlineOrder', onlineOrderSchema);

