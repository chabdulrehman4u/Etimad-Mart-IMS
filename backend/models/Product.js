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
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Product', productSchema);
