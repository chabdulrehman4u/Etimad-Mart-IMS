import Banner from '../models/Banner.js';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Brand from '../models/Brand.js';
import Coupon from '../models/Coupon.js';
import Blog from '../models/Blog.js';
import DynamicPage from '../models/DynamicPage.js';
import Review from '../models/Review.js';
import Popup from '../models/Popup.js';
import Topbar from '../models/Topbar.js';
import Footer from '../models/Footer.js';
import Tenant from '../models/Tenant.js';

// Helper to resolve tenant
const getTenantId = async (req) => {
  if (req.user?.tenantId) return req.user.tenantId;
  const flagship = await Tenant.findOne({ slug: 'etimadmart' });
  return flagship?._id;
};

// ==========================================
// 1. BANNERS
// ==========================================
export const getPublicBanners = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const banners = await Banner.find({ tenantId, isActive: true }).sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAdminBanners = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const banners = await Banner.find({ tenantId }).sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createBanner = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { image, imagePublicId, link, isActive, alt } = req.body;
    const banner = new Banner({
      image: image || req.file?.path,
      imagePublicId: imagePublicId || '',
      link: link || '/',
      isActive: isActive !== false,
      alt: alt || '',
      tenantId,
    });
    await banner.save();
    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await Banner.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 2. COUPONS
// ==========================================
export const validateCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ valid: false, message: 'Coupon code required' });

    const coupon = await Coupon.findOne({
      code: String(code).trim().toUpperCase(),
      active: true,
      tenantId,
    });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid or expired coupon' });
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return res.status(400).json({ valid: false, message: 'Coupon is not active yet' });
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ valid: false, message: 'Coupon usage limit reached' });
    }
    if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order amount of Rs. ${coupon.minOrder} required for this coupon`,
      });
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    res.json({
      valid: true,
      code: coupon.code,
      discount: Math.round(discount),
      discountType: coupon.type,
      message: `Coupon ${coupon.code} applied successfully!`,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
};

export const getAdminCoupons = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupons = await Coupon.find({ tenantId }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupon = new Coupon({
      ...req.body,
      code: String(req.body.code).trim().toUpperCase(),
      tenantId,
    });
    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const toggleCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupon = await Coupon.findOne({ _id: req.params.id, tenantId });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.active = !coupon.active;
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await Coupon.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 3. BLOGS
// ==========================================
export const getPublishedBlogs = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const blogs = await Blog.find({ tenantId, isPublished: true }).sort({ publishedAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBlogBySlug = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const blog = await Blog.findOne({ slug: req.params.slug, tenantId });
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });
    blog.viewCount = (blog.viewCount || 0) + 1;
    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAdminBlogs = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const blogs = await Blog.find({ tenantId }).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createBlog = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const slug = (req.body.slug || req.body.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const blog = new Blog({
      ...req.body,
      slug,
      tenantId,
    });
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await Blog.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 4. DYNAMIC PAGES
// ==========================================
export const getPublishedDynamicPages = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const pages = await DynamicPage.find({ tenantId, isPublished: true });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDynamicPageBySlug = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const page = await DynamicPage.findOne({ slug: req.params.slug, tenantId });
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAdminDynamicPages = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const pages = await DynamicPage.find({ tenantId }).sort({ createdAt: -1 });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createDynamicPage = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const page = new DynamicPage({ ...req.body, tenantId });
    await page.save();
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateDynamicPage = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const page = await DynamicPage.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteDynamicPage = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await DynamicPage.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ success: true, message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 5. POPUPS
// ==========================================
export const getActivePopup = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const popup = await Popup.findOne({ tenantId, isActive: true }).sort({ createdAt: -1 });
    res.json(popup || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAdminPopups = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const popups = await Popup.find({ tenantId }).sort({ createdAt: -1 });
    res.json(popups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createPopup = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const popup = new Popup({ ...req.body, tenantId });
    await popup.save();
    res.status(201).json(popup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePopup = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const popup = await Popup.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!popup) return res.status(404).json({ message: 'Popup not found' });
    res.json(popup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const togglePopup = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const popup = await Popup.findOne({ _id: req.params.id, tenantId });
    if (!popup) return res.status(404).json({ message: 'Popup not found' });
    popup.isActive = !popup.isActive;
    await popup.save();
    res.json(popup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePopup = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await Popup.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ success: true, message: 'Popup deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 6. TOPBAR & FOOTER
// ==========================================
export const getTopbar = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const topbar = await Topbar.findOne({ tenantId });
    res.json(topbar || { text: '🚚 Free Delivery Across Pakistan on Orders Over Rs. 2,999!', isEnable: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTopbar = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const topbar = await Topbar.findOneAndUpdate(
      { tenantId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json(topbar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getFooter = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const footer = await Footer.findOne({ tenantId });
    res.json(footer || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateFooter = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const footer = await Footer.findOneAndUpdate(
      { tenantId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json(footer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// 7. BRANDS & REVIEWS
// ==========================================
export const getBrands = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const brands = await Brand.find({ tenantId }).sort({ name: 1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createBrand = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const slug = req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const brand = new Brand({ ...req.body, slug, tenantId });
    await brand.save();
    res.status(201).json(brand);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await Brand.findOneAndDelete({ _id: req.params.id, tenantId });
    res.json({ success: true, message: 'Brand deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { slug } = req.params;
    const reviews = await Review.find({ productSlug: slug, tenantId, isApproved: true }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProductReview = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const review = new Review({
      ...req.body,
      tenantId,
      isApproved: true,
    });
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
