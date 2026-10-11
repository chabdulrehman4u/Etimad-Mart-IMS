import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  wholesalePrice: {
    type: Number,
    required: true,
    min: 0
  },
  retailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  websitePrice: {
    type: Number,
    required: true,
    min: 0
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minWholesaleQty: {
    type: Number,
    default: 6,
    min: 1
  },
  isRetailAvailable: {
    type: Boolean,
    default: true
  },
  isWholesaleAvailable: {
    type: Boolean,
    default: true
  },
  isOnlineAvailable: {
    type: Boolean,
    default: true
  },
  // Rich E-Commerce Fields
  title: {
    type: String,
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  longDescription: {
    type: String,
    default: '',
  },
  metaDescription: {
    type: String,
    default: '',
  },
  images: [
    {
      url: { type: String, required: true },
      public_id: { type: String, default: '' },
      alt: { type: String, default: '' },
    },
  ],
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
  },
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
  ],
  freeShipping: {
    type: Boolean,
    default: false,
  },
  deliveryCharges: {
    type: Number,
    default: 0,
  },
  sold: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Product', productSchema);
