import express from 'express';
import {
  getCurrentTenant,
  updateCurrentTenant,
  getTenantPublicProfile,
  getAllTenants,
  createTenant,
} from '../controllers/tenantController.js';
import { authenticate, authorizeSuperAdmin, authorizeAdmin } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';

const router = express.Router();

// Public route for storefront
router.get('/public/:slug', getTenantPublicProfile);

// Protected routes (Tenant Admin)
router.get('/current', authenticate, resolveTenant, getCurrentTenant);
router.put('/current', authenticate, authorizeAdmin, resolveTenant, updateCurrentTenant);

// Superadmin platform management
router.get('/all', authenticate, authorizeSuperAdmin, getAllTenants);
router.post('/', authenticate, authorizeSuperAdmin, createTenant);

export default router;

