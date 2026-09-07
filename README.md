# 🛒 Etimad Mart — Inventory & Business Financial Management System (IMS)

A full-stack enterprise inventory, billing, courier (LCS), and real-time business financial accounting system designed for Etimad Mart.

---

## 🌟 Key Features

* **Inventory & Products**: Real-time stock tracking, purchase batches, suppliers/sellers, cost vs selling prices.
* **Billing & POS**: Fast barcode scanning, customer udhaar tracking, thermal & A4 invoice printing.
* **Accounting & Real-Time Business Valuation**:
  * Owner Invested Capital tracking
  * Cash / Petty Cash management
  * Multi-Bank Accounts & Balances
  * Market Receivables & Hawala collections
  * Accounts Payable (Vendor debts)
  * Real-Time Business Net Worth calculation
  * Profit & Loss (P&L) statements
* **Couriers & Logistics**: Integrated LCS courier dispatch, tracking, and parcel reconciliation.

---

## 🏗️ Project Architecture

```
Inventory/
├── backend/               # Node.js + Express + MongoDB
│   ├── api/index.js       # Vercel serverless entry point
│   ├── controllers/       # Route controllers (Finance, Sales, Stock, etc.)
│   ├── models/            # Mongoose Schemas (FinanceLedger, BankAccount, etc.)
│   ├── routes/            # API endpoints (/api/finance, /api/products, etc.)
│   ├── services/          # Accounting & Ledger transaction services
│   └── vercel.json        # Backend deployment configuration
└── frontend/              # React (Vite) + Tailwind CSS
    ├── src/pages/finance/ # Finance & Accounting UI module
    ├── src/components/    # Reusable UI components
    └── vercel.json        # Frontend SPA routing configuration
```

---

## 🚀 Local Development Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Deployment

* **Backend**: Deploy on [Vercel](https://vercel.com) or [Render](https://render.com) using root directory `backend`.
* **Frontend**: Deploy on [Vercel](https://vercel.com) using root directory `frontend`.
* **Database**: Hosted on [MongoDB Atlas](https://mongodb.com/atlas).
