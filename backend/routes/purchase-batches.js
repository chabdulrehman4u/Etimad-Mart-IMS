import express from 'express';
import { authenticate, authorizeManagerOrAdmin } from '../middleware/auth.js';
import {
  createPurchaseBatch,
  getPurchaseBatches,
  updatePurchaseBatch,
  deletePurchaseBatch
} from '../controllers/purchaseBatchController.js';

const router = express.Router();

router.use(authenticate, authorizeManagerOrAdmin);

router.post('/', createPurchaseBatch);
router.get('/', getPurchaseBatches);
router.put('/:id', updatePurchaseBatch);
router.delete('/:id', deletePurchaseBatch);

export default router;
