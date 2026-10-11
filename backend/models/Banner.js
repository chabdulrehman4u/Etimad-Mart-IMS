import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    imagePublicId: { type: String, default: '' },
    link: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    alt: { type: String, trim: true, default: '' },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);

