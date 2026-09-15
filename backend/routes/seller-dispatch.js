import express from 'express';
import {
  createDispatch,
  getDispatches,
  getDispatchById,
  updateDeliveryStatus,
  restoreStockForReturn,
  confirmPaymentReceived,
  settleSeller,
  recordSellerRemittance,
  getSellerFinancialSummary,
  getSellerLedger,
  getSellerReports,
  getDashboardAlerts,
} from '../controllers/sellerDispatchController.js';
import { authorizeManagerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Financial and summary queries
router.get('/summary', getSellerFinancialSummary);
router.get('/alerts', getDashboardAlerts);
router.get('/ledger', getSellerLedger);
router.get('/reports', getSellerReports);

// Financial settlements & remittances (Manager/Admin only)
router.post('/settle', authorizeManagerOrAdmin, settleSeller);
router.post('/remittance', authorizeManagerOrAdmin, recordSellerRemittance);

// Dispatch CRUD & lifecycle actions
router.post('/', createDispatch);
router.get('/', getDispatches);
router.get('/:id', getDispatchById);
router.patch('/:id/delivery-status', updateDeliveryStatus);
router.post('/:id/restore-stock', authorizeManagerOrAdmin, restoreStockForReturn);
router.post('/:id/confirm-payment', authorizeManagerOrAdmin, confirmPaymentReceived);

export default router;

