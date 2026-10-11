import express from 'express';
import {
  getStorefrontProfile,
  getStorefrontCatalog,
  getStorefrontProduct,
  createStorefrontOrder,
  trackStorefrontOrder,
} from '../controllers/storefrontController.js';

const router = express.Router();

// Public Storefront Endpoints
router.get('/:slug/profile', getStorefrontProfile);
router.get('/:slug/catalog', getStorefrontCatalog);
router.get('/:slug/product/:idOrModel', getStorefrontProduct);
router.post('/:slug/orders', createStorefrontOrder);
router.get('/:slug/track/:identifier', trackStorefrontOrder);

export default router;

