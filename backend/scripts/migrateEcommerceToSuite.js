import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Tenant from '../models/Tenant.js';
import Product from '../models/Product.js';
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

const BACKUP_DIR = 'C:/Users/ETIMAD MART/Downloads/Etimad Mart/Etimad Mart/database_backup';

const readBackupJson = (filename) => {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File ${filename} not found in backup directory.`);
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error parsing ${filename}:`, err.message);
    return [];
  }
};

const runMigration = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database:', mongoose.connection.name);

    // 1. Locate Flagship Tenant (Etimad Mart)
    const tenant = await Tenant.findOne({ slug: 'etimadmart' });
    if (!tenant) {
      console.error('Tenant Etimad Mart not found! Run migrateFlagshipTenant.js first.');
      process.exit(1);
    }
    const tenantId = tenant._id;
    console.log(`Target Tenant: ${tenant.name} (${tenant.slug}) [ID: ${tenantId}]`);

    // 2. Migrate Categories
    const categoriesData = readBackupJson('categories.json');
    console.log(`\nMigrating Categories (${categoriesData.length} records)...`);
    let catCount = 0;
    for (const item of categoriesData) {
      const exists = await Category.findOne({
        $or: [{ _id: item._id }, { name: item.name }],
        tenantId,
      });
      if (!exists) {
        await Category.create({
          _id: item._id,
          name: item.name,
          slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          Image: item.Image || '',
          imagePublicId: item.imagePublicId || '',
          alt: item.alt || '',
          menu: Boolean(item.menu),
          metaDescription: item.metaDescription || '',
          tenantId,
        });
        catCount++;
      }
    }
    console.log(`-> Inserted ${catCount} categories`);

    // 3. Migrate SubCategories
    const subCategoriesData = readBackupJson('subcategories.json');
    console.log(`\nMigrating SubCategories (${subCategoriesData.length} records)...`);
    let subCatCount = 0;
    for (const item of subCategoriesData) {
      const exists = await SubCategory.findOne({
        $or: [{ _id: item._id }, { name: item.name }],
        tenantId,
      });
      if (!exists) {
        await SubCategory.create({
          _id: item._id,
          name: item.name,
          slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category: item.category,
          image: item.image || '',
          imagePublicId: item.imagePublicId || '',
          metaDescription: item.metaDescription || '',
          tenantId,
        });
        subCatCount++;
      }
    }
    console.log(`-> Inserted ${subCatCount} subcategories`);

    // 4. Migrate Brands
    const brandsData = readBackupJson('brands.json');
    console.log(`\nMigrating Brands (${brandsData.length} records)...`);
    let brandCount = 0;
    for (const item of brandsData) {
      const exists = await Brand.findOne({
        $or: [{ _id: item._id }, { name: item.name }],
        tenantId,
      });
      if (!exists) {
        await Brand.create({
          _id: item._id,
          name: item.name,
          slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          logo: item.logo || '',
          logo_public_id: item.logo_public_id || '',
          alt: item.alt || '',
          tenantId,
        });
        brandCount++;
      }
    }
    console.log(`-> Inserted ${brandCount} brands`);

    // 5. Migrate Banners
    const bannersData = readBackupJson('banners.json');
    console.log(`\nMigrating Banners (${bannersData.length} records)...`);
    let bannerCount = 0;
    for (const item of bannersData) {
      const exists = await Banner.findOne({
        $or: [{ _id: item._id }, { image: item.image }],
        tenantId,
      });
      if (!exists) {
        await Banner.create({
          _id: item._id,
          image: item.image,
          imagePublicId: item.imagePublicId || '',
          link: item.link || '/',
          isActive: item.isActive !== false,
          alt: item.alt || '',
          tenantId,
        });
        bannerCount++;
      }
    }
    console.log(`-> Inserted ${bannerCount} banners`);

    // 6. Migrate Coupons
    const couponsData = readBackupJson('coupons.json');
    console.log(`\nMigrating Coupons (${couponsData.length} records)...`);
    let couponCount = 0;
    for (const item of couponsData) {
      const exists = await Coupon.findOne({ code: item.code.toUpperCase(), tenantId });
      if (!exists) {
        await Coupon.create({
          _id: item._id,
          code: item.code.toUpperCase(),
          type: item.type || 'fixed',
          value: Number(item.value || 0),
          maxDiscount: Number(item.maxDiscount || 0),
          minOrder: Number(item.minOrder || 0),
          startsAt: item.startsAt ? new Date(item.startsAt) : null,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          usageLimit: Number(item.usageLimit || 0),
          perUserLimit: Number(item.perUserLimit || 0),
          active: item.active !== false,
          notes: item.notes || '',
          usedCount: Number(item.usedCount || 0),
          tenantId,
        });
        couponCount++;
      }
    }
    console.log(`-> Inserted ${couponCount} coupons`);

    // 7. Migrate Blogs
    const blogsData = readBackupJson('blogs.json');
    console.log(`\nMigrating Blogs (${blogsData.length} records)...`);
    let blogCount = 0;
    for (const item of blogsData) {
      const exists = await Blog.findOne({ slug: item.slug, tenantId });
      if (!exists) {
        await Blog.create({
          _id: item._id,
          title: item.title,
          slug: item.slug,
          content: item.content || '',
          excerpt: item.excerpt || '',
          metaDescription: item.metaDescription || '',
          featuredImage: item.featuredImage || '',
          author: item.author || 'Etimad Mart',
          category: item.category || 'Grooming & Tech',
          tags: item.tags || [],
          isPublished: item.isPublished !== false,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          viewCount: Number(item.viewCount || 0),
          tenantId,
        });
        blogCount++;
      }
    }
    console.log(`-> Inserted ${blogCount} blogs`);

    // 8. Migrate Dynamic Pages
    const pagesData = readBackupJson('dynamicpages.json');
    console.log(`\nMigrating Dynamic Pages (${pagesData.length} records)...`);
    let pageCount = 0;
    for (const item of pagesData) {
      const exists = await DynamicPage.findOne({ slug: item.slug, tenantId });
      if (!exists) {
        await DynamicPage.create({
          _id: item._id,
          title: item.title,
          slug: item.slug,
          content: item.content || '',
          metaDescription: item.metaDescription || '',
          isPublished: item.isPublished !== false,
          tenantId,
        });
        pageCount++;
      }
    }
    console.log(`-> Inserted ${pageCount} dynamic pages`);

    // 9. Migrate Reviews
    const reviewsData = readBackupJson('reviews.json');
    console.log(`\nMigrating Reviews (${reviewsData.length} records)...`);
    let reviewCount = 0;
    for (const item of reviewsData) {
      const exists = await Review.findOne({
        _id: item._id,
        tenantId,
      });
      if (!exists && item.productSlug) {
        await Review.create({
          _id: item._id,
          productSlug: item.productSlug,
          reviewerName: item.reviewerName || 'Customer',
          email: item.email || '',
          reviewText: item.reviewText || 'Great product!',
          rating: Number(item.rating || 5),
          images: item.images || [],
          isApproved: true,
          tenantId,
        });
        reviewCount++;
      }
    }
    console.log(`-> Inserted ${reviewCount} reviews`);

    // 10. Migrate Popups
    const popupsData = readBackupJson('popups.json');
    console.log(`\nMigrating Popups (${popupsData.length} records)...`);
    let popupCount = 0;
    for (const item of popupsData) {
      const exists = await Popup.findOne({ _id: item._id, tenantId });
      if (!exists) {
        await Popup.create({
          _id: item._id,
          title: item.title,
          content: item.content || '',
          image: item.image || '',
          imagePublicId: item.imagePublicId || '',
          productLink: item.productLink || '/',
          buttonText: item.buttonText || 'Shop Now',
          isActive: item.isActive !== false,
          displaySettings: item.displaySettings || {
            delay: 3000,
            frequency: 'once',
            showOnMobile: true,
            showOnDesktop: true,
          },
          tenantId,
        });
        popupCount++;
      }
    }
    console.log(`-> Inserted ${popupCount} popups`);

    // 11. Migrate Topbar
    const topbarsData = readBackupJson('topbars.json');
    if (topbarsData.length > 0) {
      const tb = topbarsData[0];
      const exists = await Topbar.findOne({ tenantId });
      if (!exists) {
        await Topbar.create({
          _id: tb._id,
          text: tb.text || '🚚 Free Delivery Across Pakistan on Orders Over Rs. 2,999!',
          isEnable: tb.isEnable !== false,
          tenantId,
        });
        console.log('-> Inserted announcement Topbar');
      }
    }

    // 12. Migrate Footer
    const footersData = readBackupJson('footers.json');
    if (footersData.length > 0) {
      const ft = footersData[0];
      const exists = await Footer.findOne({ tenantId });
      if (!exists) {
        await Footer.create({
          _id: ft._id,
          logoUrl: ft.logoUrl || '',
          aboutText: ft.aboutText || 'Etimad Mart is Pakistan’s leading online destination for premium trimmers, grooming tools, and electronics.',
          quickLinks: ft.quickLinks || [
            { label: 'About Us', url: '/page/about-us' },
            { label: 'Shipping Policy', url: '/page/shipping-policy' },
            { label: 'Return Policy', url: '/page/return-policy' },
            { label: 'Contact Us', url: '/page/contact-us' },
          ],
          contactInfo: ft.contactInfo || {
            address: 'Zahir Pir, Tehsil Khanpur, Rahim Yar Khan, Punjab',
            whatsapp: '03071111832',
            phone: '03071111832',
            email: 'info@etimadmart.com',
          },
          socialLinks: ft.socialLinks || [
            { icon: 'facebook', url: 'https://facebook.com/etimadmart' },
            { icon: 'instagram', url: 'https://instagram.com/etimadmart' },
            { icon: 'tiktok', url: 'https://tiktok.com/@etimadmart' },
          ],
          copyright: ft.copyright || '© 2026 Etimad Mart. All rights reserved.',
          tenantId,
        });
        console.log('-> Inserted Footer configuration');
      }
    }

    // 13. Enrich Existing IMS Products with Cloudinary Photos & Rich Descriptions
    const backupProducts = readBackupJson('products.json');
    console.log(`\nEnriching & Synchronizing Products (${backupProducts.length} in backup)...`);

    const imsProducts = await Product.find({ tenantId });
    console.log(`Current IMS Products count: ${imsProducts.length}`);

    let enrichedCount = 0;
    let newlyCreatedCount = 0;

    for (const bp of backupProducts) {
      const bTitle = (bp.title || '').trim();
      const bSlug = (bp.slug || '').trim();

      // Find match in IMS by model or title
      let matched = imsProducts.find((ip) => {
        const iModel = (ip.model || '').toLowerCase().trim();
        const iName = (ip.name || '').toLowerCase().trim();
        if (iModel && bTitle.toLowerCase().includes(iModel)) return true;
        if (iModel && bSlug.toLowerCase().includes(iModel.replace(/\s+/g, '-'))) return true;
        return false;
      });

      if (matched) {
        // Enrich matched product with Cloudinary images & web details
        matched.title = bp.title;
        matched.slug = bp.slug;
        matched.description = bp.description || matched.description;
        matched.longDescription = bp.longDescription || matched.longDescription;
        matched.metaDescription = bp.metaDescription || '';
        if (Array.isArray(bp.images) && bp.images.length > 0) {
          matched.images = bp.images.map((im) => ({
            url: im.url,
            public_id: im.public_id || '',
            alt: im.alt || bp.title,
          }));
        }
        matched.freeShipping = Boolean(bp.freeShipping);
        matched.sold = Number(bp.sold || 0);
        if (bp.brand) matched.brand = bp.brand;
        if (bp.subCategory) matched.subCategory = bp.subCategory;
        if (Array.isArray(bp.categories)) matched.categories = bp.categories;

        await matched.save();
        enrichedCount++;
      } else {
        // If product from backup doesn't exist in IMS, create it
        const price = Number(bp.salePrice || bp.price || 1500);
        const newProd = new Product({
          name: bp.title.split(' ')[0] || 'Product',
          model: (bp.title.match(/[A-Za-z0-9]+-[A-Za-z0-9]+|[A-Z]{1,3}\s?[0-9]{3,4}/) || [bp.slug.slice(0, 10)])[0],
          category: 'E-Commerce',
          originalPrice: Math.round(price * 0.7),
          wholesalePrice: Math.round(price * 0.85),
          retailPrice: price,
          websitePrice: price,
          stock: Number(bp.stock || 5),
          isRetailAvailable: true,
          isWholesaleAvailable: true,
          isOnlineAvailable: true,
          title: bp.title,
          slug: bp.slug,
          description: bp.description || '',
          longDescription: bp.longDescription || '',
          metaDescription: bp.metaDescription || '',
          images: Array.isArray(bp.images)
            ? bp.images.map((im) => ({
                url: im.url,
                public_id: im.public_id || '',
                alt: im.alt || bp.title,
              }))
            : [],
          freeShipping: Boolean(bp.freeShipping),
          deliveryCharges: Number(bp.deliveryCharges || 0),
          sold: Number(bp.sold || 0),
          tenantId,
        });

        await newProd.save();
        newlyCreatedCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`🎉 MIGRATION COMPLETED SUCCESSFULLY!`);
    console.log(`========================================`);
    console.log(`- Categories imported: ${catCount}`);
    console.log(`- Subcategories imported: ${subCatCount}`);
    console.log(`- Brands imported: ${brandCount}`);
    console.log(`- Banners imported: ${bannerCount}`);
    console.log(`- Coupons imported: ${couponCount}`);
    console.log(`- Blogs imported: ${blogCount}`);
    console.log(`- Dynamic Pages imported: ${pageCount}`);
    console.log(`- Reviews imported: ${reviewCount}`);
    console.log(`- Popups imported: ${popupCount}`);
    console.log(`- Products enriched with Cloudinary galleries: ${enrichedCount}`);
    console.log(`- New products added from backup: ${newlyCreatedCount}`);
    console.log(`- Total live products now in Atlas: ${await Product.countDocuments({ tenantId })}`);
    console.log(`========================================\n`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal migration error:', err);
    process.exit(1);
  }
};

runMigration();

