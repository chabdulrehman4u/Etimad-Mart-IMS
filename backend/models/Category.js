import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    Image: {
      type: String,
      default: '',
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
    menu: {
      type: Boolean,
      default: false,
    },
    metaDescription: {
      type: String,
      default: '',
      trim: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
