import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    notes: { type: String, default: '' },
    usedCount: { type: Number, default: 0 },
    allowedCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Coupon', couponSchema);

