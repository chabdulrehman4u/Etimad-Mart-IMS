import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tagline: {
      type: String,
      trim: true,
      default: 'Commerce, Wholesale & Retail Management',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    receiptHeader: {
      type: String,
      default: '',
    },
    receiptFooter: {
      type: String,
      default: 'Thank you for your business! Items can be exchanged within 3 days with original bill.',
    },
    taxNumber: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    currencySymbol: {
      type: String,
      default: 'Rs.',
    },
    channelsEnabled: {
      retail: { type: Boolean, default: true },
      wholesale: { type: Boolean, default: true },
      online: { type: Boolean, default: true },
    },
    settings: {
      pos: {
        paperSize: { type: String, enum: ['58mm', '80mm', 'A4'], default: '80mm' },
        printUrduText: { type: Boolean, default: true },
        autoPrintOnSale: { type: Boolean, default: false },
      },
      couriers: {
        defaultCourier: { type: String, default: 'Leopards' },
        leopards: {
          apiKey: { type: String, default: '' },
          apiPassword: { type: String, default: '' },
          shipperName: { type: String, default: '' },
          shipperPhone: { type: String, default: '' },
          originCity: { type: String, default: '697' },
        },
        postex: {
          apiToken: { type: String, default: '' },
        },
        trax: {
          apiKey: { type: String, default: '' },
        },
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free_trial', 'starter', 'growth', 'enterprise'],
        default: 'enterprise',
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'cancelled'],
        default: 'active',
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    isFlagship: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Tenant', tenantSchema);

