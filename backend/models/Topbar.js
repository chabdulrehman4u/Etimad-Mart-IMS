import mongoose from 'mongoose';

const topbarSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: '',
    },
    isEnable: {
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

export default mongoose.model('Topbar', topbarSchema);

