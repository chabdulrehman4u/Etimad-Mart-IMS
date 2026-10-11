import express from 'express';
import {
  getPublicBanners,
  getAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  validateCoupon,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
  getPublishedBlogs,
  getBlogBySlug,
  getAdminBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  getPublishedDynamicPages,
  getDynamicPageBySlug,
  getAdminDynamicPages,
  createDynamicPage,
  updateDynamicPage,
  deleteDynamicPage,
  getActivePopup,
  getAdminPopups,
  createPopup,
  updatePopup,
  togglePopup,
  deletePopup,
  getTopbar,
  updateTopbar,
  getFooter,
  updateFooter,
  getBrands,
  createBrand,
  deleteBrand,
  getProductReviews,
  createProductReview,
} from '../controllers/cmsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ===== BANNERS =====
router.get('/banner/all', getPublicBanners);
router.get('/banner/admin/all', authenticate, getAdminBanners);
router.post('/banner/add', authenticate, createBanner);
router.put('/banner/:id', authenticate, updateBanner);
router.delete('/banner/:id', authenticate, deleteBanner);

// ===== COUPONS =====
router.post('/coupon/validate', validateCoupon);
router.get('/coupon/admin', authenticate, getAdminCoupons);
router.post('/coupon/admin', authenticate, createCoupon);
router.patch('/coupon/admin/:id', authenticate, updateCoupon);
router.patch('/coupon/admin/:id/toggle', authenticate, toggleCoupon);
router.delete('/coupon/admin/:id', authenticate, deleteCoupon);

// ===== BLOGS =====
router.get('/blog/published', getPublishedBlogs);
router.get('/blog/admin/all', authenticate, getAdminBlogs);
router.get('/blog/:slug', getBlogBySlug);
router.post('/blog', authenticate, createBlog);
router.put('/blog/:id', authenticate, updateBlog);
router.delete('/blog/:id', authenticate, deleteBlog);

// ===== DYNAMIC PAGES =====
router.get('/dynamic-page/published', getPublishedDynamicPages);
router.get('/dynamic-page/admin/all', authenticate, getAdminDynamicPages);
router.get('/dynamic-page/:slug', getDynamicPageBySlug);
router.post('/dynamic-page', authenticate, createDynamicPage);
router.put('/dynamic-page/:id', authenticate, updateDynamicPage);
router.delete('/dynamic-page/:id', authenticate, deleteDynamicPage);

// ===== POPUPS =====
router.get('/popup/active', getActivePopup);
router.get('/popup', authenticate, getAdminPopups);
router.post('/popup', authenticate, createPopup);
router.put('/popup/:id', authenticate, updatePopup);
router.patch('/popup/:id/toggle', authenticate, togglePopup);
router.delete('/popup/:id', authenticate, deletePopup);

// ===== TOPBAR & FOOTER =====
router.get('/topbar', getTopbar);
router.put('/topbar', authenticate, updateTopbar);
router.get('/footer', getFooter);
router.put('/footer', authenticate, updateFooter);

// ===== BRANDS =====
router.get('/brand/all', getBrands);
router.post('/brand/add', authenticate, createBrand);
router.delete('/brand/:id', authenticate, deleteBrand);

// ===== REVIEWS =====
router.get('/review/:slug', getProductReviews);
router.post('/review/create/:productSlug/:reviewerId', createProductReview);
router.post('/review/create', createProductReview);

export default router;
