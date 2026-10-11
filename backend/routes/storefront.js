import express from 'express';
import {
  getStorefrontProfile,
  getStorefrontCatalog,
  getStorefrontProduct,
  createStorefrontOrder,
  trackStorefrontOrder,
  getStorefrontHomepageData,
} from '../controllers/storefrontController.js';

const router = express.Router();

// Public Storefront Endpoints
router.get('/:slug/profile', getStorefrontProfile);
router.get('/:slug/catalog', getStorefrontCatalog);
router.get('/:slug/product/getAll', getStorefrontCatalog); // Alias
router.get('/:slug/homepage', getStorefrontHomepageData);
router.get('/:slug/homepage-data', getStorefrontHomepageData);
router.get('/:slug/product/:idOrModel', getStorefrontProduct);
router.post('/:slug/orders', createStorefrontOrder);
router.post('/:slug/order/create', createStorefrontOrder); // Alias
router.get('/:slug/track/:identifier', trackStorefrontOrder);

export default router;

