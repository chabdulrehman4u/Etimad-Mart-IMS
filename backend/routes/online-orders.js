import express from 'express';
import { authenticate, authorizeManagerOrAdmin } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import {
  getOnlineOrders,
  getOnlineOrderStats,
  getOnlineOrderById,
  updateOnlineOrderStatus,
  bookOrderCourier,
  convertOrderToBill,
} from '../controllers/onlineOrderController.js';

const router = express.Router();

router.use(authenticate, authorizeManagerOrAdmin, tenantMiddleware);

router.get('/', getOnlineOrders);
router.get('/stats', getOnlineOrderStats);
router.get('/:id', getOnlineOrderById);
router.patch('/:id/status', updateOnlineOrderStatus);
router.post('/:id/book-courier', bookOrderCourier);
router.post('/:id/convert-to-bill', convertOrderToBill);

export default router;

