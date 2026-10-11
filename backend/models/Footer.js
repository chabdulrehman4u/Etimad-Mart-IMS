import mongoose from 'mongoose';

const footerSchema = new mongoose.Schema(
  {
    logoUrl: { type: String, default: '' },
    aboutText: { type: String, default: '' },
    quickLinks: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    contactInfo: {
      address: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    socialLinks: [
      {
        icon: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    copyright: { type: String, default: '© 2026 Etimad Mart. All rights reserved.' },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Footer', footerSchema);

