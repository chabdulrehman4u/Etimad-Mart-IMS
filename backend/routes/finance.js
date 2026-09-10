import express from 'express';
import { authenticate, authorizeAdmin, authorizeManagerOrAdmin } from '../middleware/auth.js';
import {
  getFinanceOverview,
  getFinanceSetup,
  saveFinanceSetup,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  addBankTransaction,
  getPettyCash,
  addPettyCashTransaction,
  getPayables,
  createPayable,
  payPayable,
  getReceivables,
  receiveReceivablePayment,
  adjustBillReceivable,
  receiveOpeningReceivablePayment,
  adjustOpeningReceivable,
  markAllReceivablesCollected,
  getOwnerCapitalData,
  addOwnerInvestment,
  addOwnerWithdrawal,
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getProfitAndLossReport,
  getCashFlowReport,
  getBusinessValueTrend,
  getFinanceLedger,
  voidLedgerTransaction,
} from '../controllers/financeController.js';

const router = express.Router();

// All finance routes require authenticated admin/manager
router.use(authenticate, authorizeManagerOrAdmin);

// 1. Overview & Setup
router.get('/overview', getFinanceOverview);
router.get('/setup', getFinanceSetup);
router.post('/setup', authorizeAdmin, saveFinanceSetup);

// 2. Bank Accounts
router.get('/banks', getBankAccounts);
router.post('/banks', authorizeAdmin, createBankAccount);
router.put('/banks/:id', authorizeAdmin, updateBankAccount);
router.post('/banks/transactions', addBankTransaction);

// 3. Petty Cash
router.get('/petty-cash', getPettyCash);
router.post('/petty-cash', addPettyCashTransaction);

// 4. Accounts Payable (Suppliers)
router.get('/payables', getPayables);
router.post('/payables', createPayable);
router.post('/payables/:id/pay', payPayable);

// 5. Accounts Receivable (Customers)
router.get('/receivables', getReceivables);
router.post('/receivables/:billId/pay', receiveReceivablePayment);
router.post('/receivables/:billId/adjust', authorizeAdmin, adjustBillReceivable);
router.post('/receivables/opening/:itemId/pay', receiveOpeningReceivablePayment);
router.put('/receivables/opening/:itemId/adjust', authorizeAdmin, adjustOpeningReceivable);
router.post('/receivables/mark-all-collected', authorizeAdmin, markAllReceivablesCollected);

// 6. Owner Capital
router.get('/owner-capital', getOwnerCapitalData);
router.post('/owner-capital/investment', authorizeAdmin, addOwnerInvestment);
router.post('/owner-capital/withdrawal', authorizeAdmin, addOwnerWithdrawal);

// 7. Purchases
router.get('/purchases', getPurchases);
router.post('/purchases', createPurchase);
router.put('/purchases/:id', updatePurchase);
router.delete('/purchases/:id', deletePurchase);

// 8. Reports
router.get('/pnl', getProfitAndLossReport);
router.get('/cash-flow', getCashFlowReport);
router.get('/trend', getBusinessValueTrend);

// 9. Ledger & Audit Log
router.get('/ledger', getFinanceLedger);
router.post('/ledger/:id/void', authorizeAdmin, voidLedgerTransaction);

export default router;

