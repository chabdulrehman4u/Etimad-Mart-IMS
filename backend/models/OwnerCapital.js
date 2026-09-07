import mongoose from 'mongoose';

const ownerCapitalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['investment', 'withdrawal'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank'],
      default: 'cash',
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    description: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('OwnerCapital', ownerCapitalSchema);

