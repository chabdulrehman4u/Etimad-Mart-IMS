import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productSlug: {
      type: String,
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    reviewerName: {
      type: String,
      default: 'Customer',
    },
    email: {
      type: String,
      default: '',
    },
    reviewText: {
      type: String,
      required: true,
      minlength: 2,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    images: [
      {
        type: String,
        default: '',
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema);

