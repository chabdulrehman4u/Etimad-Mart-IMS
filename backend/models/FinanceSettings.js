import mongoose from 'mongoose';

const financeSettingsSchema = new mongoose.Schema(
  {
    isConfigured: {
      type: Boolean,
      default: false,
    },
    openingDate: {
      type: Date,
      default: Date.now,
    },
    openingOwnerCapital: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingPettyCash: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingBankBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingInventoryValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingAccountsReceivable: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingReceivablesList: [
      {
        partyName: {
          type: String,
          required: true,
          trim: true,
        },
        phone: {
          type: String,
          trim: true,
          default: '',
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        collectedAmount: {
          type: Number,
          default: 0,
          min: 0,
        },
        remainingAmount: {
          type: Number,
          default: 0,
          min: 0,
        },
        notes: {
          type: String,
          trim: true,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    openingAccountsPayable: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingOtherAssets: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingOtherLiabilities: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingBusinessValue: {
      type: Number,
      default: 0,
    },
    currentPettyCash: {
      type: Number,
      default: 0,
    },
    otherAssetsDescription: {
      type: String,
      trim: true,
      default: '',
    },
    otherLiabilitiesDescription: {
      type: String,
      trim: true,
      default: '',
    },
    configuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('FinanceSettings', financeSettingsSchema);

