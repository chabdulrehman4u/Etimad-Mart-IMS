import mongoose from 'mongoose';

const popupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    productLink: {
      type: String,
      trim: true,
      default: '',
    },
    buttonText: {
      type: String,
      default: 'Shop Now',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displaySettings: {
      delay: {
        type: Number,
        default: 3000,
      },
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'always'],
        default: 'once',
      },
      showOnMobile: {
        type: Boolean,
        default: true,
      },
      showOnDesktop: {
        type: Boolean,
        default: true,
      },
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Popup', popupSchema);

