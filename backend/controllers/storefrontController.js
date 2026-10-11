import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import Product from '../models/Product.js';
import OnlineOrder from '../models/OnlineOrder.js';
import StockHistory from '../models/StockHistory.js';
import Customer from '../models/Customer.js';

// Helper to resolve tenant from slug or fallback to flagship
const resolveTenantBySlug = async (slug) => {
  let tenant = null;
  if (slug && slug !== 'default' && slug !== 'current') {
    tenant = await Tenant.findOne({ slug: String(slug).toLowerCase() });
  }
  if (!tenant) {
    tenant = await Tenant.findOne({ isFlagship: true }) || await Tenant.findOne();
  }
  return tenant;
};

// 1. Get Public Storefront Profile
export const getStorefrontProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await resolveTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json({
      name: tenant.name,
      slug: tenant.slug,
      tagline: tenant.tagline,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      city: tenant.city,
      logoUrl: tenant.logoUrl,
      receiptFooter: tenant.receiptFooter,
      currency: tenant.currency || 'PKR',
      currencySymbol: tenant.currencySymbol || 'Rs.',
      channelsEnabled: tenant.channelsEnabled,
    });
  } catch (err) {
    console.error('Error fetching storefront profile:', err);
    res.status(500).json({ message: 'Failed to load storefront profile' });
  }
};

// 2. Get Public Product Catalog
export const getStorefrontCatalog = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await resolveTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const { category, search, inStockOnly, page = 1, limit = 50 } = req.query;

    const query = {
      tenantId: tenant._id,
      isOnlineAvailable: { $ne: false }, // Available if true or omitted
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      const term = String(search).trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { model: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    if (inStockOnly === 'true') {
      query.stock = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .select('name model category websitePrice retailPrice stock barcode originalPrice images slug description longDescription brand subCategory sold averageRating freeShipping')
        .sort({ stock: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    const formatted = products.map((p) => {
      const price = Number(p.websitePrice || p.retailPrice || 0);
      const title = p.model ? `${p.name} ${p.model}` : p.name;
      const productSlug = p.slug || (p.model ? `${p.name}-${p.model}` : p.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const productImages = (p.images && p.images.length > 0)
        ? p.images
        : [
            {
              url: `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80`,
              alt: title,
            },
          ];

      return {
        _id: p._id,
        id: p._id,
        name: p.name,
        title,
        model: p.model,
        slug: productSlug,
        category: p.category,
        brand: p.brand || '',
        subCategory: p.subCategory || '',
        description: p.description || '',
        longDescription: p.longDescription || '',
        price: Math.round(price * 1.15), // Crossed-out MSRP anchor
        salePrice: price,
        websitePrice: Number(p.websitePrice || 0),
        retailPrice: Number(p.retailPrice || 0),
        inStock: Number(p.stock || 0) > 0,
        stock: Number(p.stock || 0),
        barcode: p.barcode || '',
        freeShipping: p.freeShipping || false,
        sold: p.sold || 0,
        averageRating: p.averageRating || 5,
        images: productImages,
      };
    });

    res.json({
      success: true,
      store: {
        name: tenant.name,
        slug: tenant.slug,
        currencySymbol: tenant.currencySymbol || 'Rs.',
      },
      products: formatted,
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
      currentPage: Number(page),
      totalProducts: totalCount,
      pagination: {
        total: totalCount,
        page: Number(page),
        pages: Math.ceil(totalCount / Number(limit)) || 1,
      },
    });
  } catch (err) {
    console.error('Error fetching storefront catalog:', err);
    res.status(500).json({ message: 'Failed to load product catalog' });
  }
};

// 3. Get Single Product
export const getStorefrontProduct = async (req, res) => {
  try {
    const { slug, idOrModel, identifier } = req.params;
    const targetProduct = idOrModel || identifier || (slug && !idOrModel ? slug : null);
    const tenantSlug = (idOrModel || identifier) ? slug : undefined;
    const tenant = await resolveTenantBySlug(tenantSlug);

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const query = { tenantId: tenant._id, isOnlineAvailable: { $ne: false } };
    if (targetProduct && targetProduct.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = targetProduct;
    } else if (targetProduct) {
      query.$or = [{ slug: targetProduct }, { model: targetProduct }, { barcode: targetProduct }];
    }

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const price = Number(product.websitePrice || product.retailPrice || 0);
    const title = product.model ? `${product.name} ${product.model}` : product.name;
    const productSlug = product.slug || (product.model ? `${product.name}-${product.model}` : product.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const productImages = (product.images && product.images.length > 0)
      ? product.images
      : [
          {
            url: `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80`,
            alt: title,
          },
        ];

    const productPayload = {
      _id: product._id,
      id: product._id,
      name: product.name,
      title,
      model: product.model,
      slug: productSlug,
      category: product.category,
      brand: product.brand || '',
      subCategory: product.subCategory || '',
      description: product.description || '',
      longDescription: product.longDescription || '',
      price: Math.round(price * 1.15),
      salePrice: price,
      websitePrice: Number(product.websitePrice || 0),
      retailPrice: Number(product.retailPrice || 0),
      inStock: Number(product.stock || 0) > 0,
      stock: Number(product.stock || 0),
      barcode: product.barcode || '',
      freeShipping: product.freeShipping || false,
      sold: product.sold || 0,
      averageRating: product.averageRating || 5,
      images: productImages,
      variants: product.variants || [],
    };

    res.json({
      success: true,
      product: productPayload,
      ...productPayload,
    });
  } catch (err) {
    console.error('Error fetching storefront product:', err);
    res.status(500).json({ message: 'Failed to load product' });
  }
};

// 3a. Related Products
export const getRelatedStorefrontProducts = async (req, res) => {
  try {
    const { categoryId, excludeProductId } = req.params;
    const tenant = await resolveTenantBySlug();
    const query = {
      tenantId: tenant._id,
      isOnlineAvailable: { $ne: false },
      category: categoryId,
    };
    if (mongoose.Types.ObjectId.isValid(excludeProductId)) {
      query._id = { $ne: excludeProductId };
    }
    const products = await Product.find(query).limit(8).lean();
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load related products' });
  }
};

// 3b. Products by Subcategory
export const getStorefrontProductsBySub = async (req, res) => {
  try {
    const { subCategory } = req.params;
    const { page = 1, limit = 16 } = req.query;
    const tenant = await resolveTenantBySlug();
    const query = {
      tenantId: tenant._id,
      isOnlineAvailable: { $ne: false },
      subCategory: new RegExp(`^${subCategory}$`, 'i'),
    };
    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(query),
    ]);
    res.json({
      success: true,
      products,
      totalPages: Math.ceil(total / Number(limit)) || 1,
      currentPage: Number(page),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load products' });
  }
};

// 3c. Min-Max Price
export const getStorefrontMinMaxPrice = async (req, res) => {
  try {
    const tenant = await resolveTenantBySlug();
    const minMax = await Product.aggregate([
      { $match: { tenantId: tenant._id, isOnlineAvailable: { $ne: false } } },
      {
        $group: {
          _id: null,
          minPrice: { $min: { $ifNull: ['$websitePrice', '$retailPrice'] } },
          maxPrice: { $max: { $ifNull: ['$websitePrice', '$retailPrice'] } },
        },
      },
    ]);
    res.json({
      success: true,
      minPrice: minMax[0]?.minPrice || 0,
      maxPrice: minMax[0]?.maxPrice || 10000,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate price range' });
  }
};

// 3d. Search & Filter Combined
export const searchStorefrontProducts = async (req, res) => {
  try {
    const tenant = await resolveTenantBySlug();
    const {
      page = 1,
      limit = 16,
      categories,
      categoryName,
      subcategory,
      subcategoryName,
      brand,
      rating,
      minPrice,
      maxPrice,
      sort,
      keyword,
      query: qParam,
    } = req.query;

    const query = { tenantId: tenant._id, isOnlineAvailable: { $ne: false } };

    const searchKeyword = keyword || qParam;
    if (searchKeyword) {
      const term = String(searchKeyword).trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { model: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    const catParam = categories || categoryName;
    if (catParam) {
      const catList = Array.isArray(catParam) ? catParam : [catParam];
      query.category = { $in: catList.map((c) => new RegExp(`^${c}$`, 'i')) };
    }

    const subParam = subcategory || subcategoryName;
    if (subParam) {
      const SubCategoryModel = (await import('../models/SubCategory.js')).default;
      const foundSub = await SubCategoryModel.findOne({
        $or: [{ name: new RegExp(`^${subParam}$`, 'i') }, { slug: new RegExp(`^${subParam}$`, 'i') }],
      });
      if (foundSub) {
        query.subCategory = foundSub._id;
      }
    }

    if (brand) {
      const BrandModel = (await import('../models/Brand.js')).default;
      const foundBrand = await BrandModel.findOne({
        $or: [{ name: new RegExp(`^${brand}$`, 'i') }, { slug: new RegExp(`^${brand}$`, 'i') }],
      });
      if (foundBrand) {
        query.brand = foundBrand._id;
      }
    }

    if (rating) {
      const r = Number(rating);
      if (!isNaN(r)) query.averageRating = { $gte: r };
    }

    const pMin = minPrice != null && minPrice !== '' ? Number(minPrice) : null;
    const pMax = maxPrice != null && maxPrice !== '' ? Number(maxPrice) : null;
    if (pMin !== null || pMax !== null) {
      query.websitePrice = {};
      if (pMin !== null && !isNaN(pMin)) query.websitePrice.$gte = pMin;
      if (pMax !== null && !isNaN(pMax)) query.websitePrice.$lte = pMax;
    }

    const sortMap = {
      price_asc: { websitePrice: 1, retailPrice: 1 },
      price_desc: { websitePrice: -1, retailPrice: -1 },
      asc: { websitePrice: 1 },
      desc: { websitePrice: -1 },
      newest: { createdAt: -1 },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, totalCount] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(query),
    ]);

    const formatted = products.map((p) => {
      const price = Number(p.websitePrice || p.retailPrice || 0);
      const title = p.model ? `${p.name} ${p.model}` : p.name;
      const pSlug = p.slug || (p.model ? `${p.name}-${p.model}` : p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const pImages = p.images && p.images.length > 0 ? p.images : [{ url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80', alt: title }];
      return {
        _id: p._id,
        id: p._id,
        name: p.name,
        title,
        model: p.model,
        slug: pSlug,
        category: p.category,
        brand: p.brand || '',
        price: Math.round(price * 1.15),
        salePrice: price,
        websitePrice: Number(p.websitePrice || 0),
        retailPrice: Number(p.retailPrice || 0),
        inStock: Number(p.stock || 0) > 0,
        stock: Number(p.stock || 0),
        images: pImages,
        averageRating: p.averageRating || 5,
        sold: p.sold || 0,
      };
    });

    res.json({
      success: true,
      products: formatted,
      totalProducts: totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
      currentPage: Number(page),
    });
  } catch (err) {
    console.error('Search storefront products error:', err);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
};

// 3b. Storefront Homepage Aggregation API
export const getStorefrontHomepageData = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await resolveTenantBySlug(slug || 'etimadmart');
    const tenantId = tenant ? tenant._id : null;

    const BannerModel = (await import('../models/Banner.js')).default;
    const CategoryModel = (await import('../models/Category.js')).default;
    const BrandModel = (await import('../models/Brand.js')).default;
    const TopbarModel = (await import('../models/Topbar.js')).default;

    const [banners, categories, brands, products, topbar] = await Promise.all([
      BannerModel.find({ ...(tenantId ? { tenantId } : {}), isActive: true }).sort({ createdAt: -1 }).limit(6).lean(),
      CategoryModel.find(tenantId ? { tenantId } : {}).sort({ name: 1 }).limit(16).lean(),
      BrandModel.find(tenantId ? { tenantId } : {}).limit(12).lean(),
      Product.find({ ...(tenantId ? { tenantId } : {}), isOnlineAvailable: { $ne: false } })
        .select('name model category websitePrice retailPrice stock barcode images slug description brand sold averageRating')
        .sort({ stock: -1, createdAt: -1 })
        .limit(24)
        .lean(),
      TopbarModel.findOne({ ...(tenantId ? { tenantId } : {}), isActive: true }).lean(),
    ]);

    const formattedProducts = products.map((p) => {
      const price = Number(p.websitePrice || p.retailPrice || 0);
      const title = p.model ? `${p.name} ${p.model}` : p.name;
      const pSlug = p.slug || (p.model ? `${p.name}-${p.model}` : p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const pImages = (p.images && p.images.length > 0)
        ? p.images
        : [{ url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80', alt: title }];

      return {
        _id: p._id,
        id: p._id,
        name: p.name,
        title,
        model: p.model,
        slug: pSlug,
        category: p.category,
        brand: p.brand || '',
        price: Math.round(price * 1.15),
        salePrice: price,
        websitePrice: Number(p.websitePrice || 0),
        retailPrice: Number(p.retailPrice || 0),
        inStock: Number(p.stock || 0) > 0,
        stock: Number(p.stock || 0),
        images: pImages,
        averageRating: p.averageRating || 5,
        sold: p.sold || 0,
      };
    });

    const featuredProducts = formattedProducts.slice(0, 8);
    const newProducts = formattedProducts.slice(8, 16);
    const bestSellers = formattedProducts.slice(16, 24).length ? formattedProducts.slice(16, 24) : formattedProducts.slice(0, 8);

    res.json({
      success: true,
      data: {
        banners,
        categories,
        brands,
        featuredProducts,
        newProducts,
        bestSellers,
        activeTopbar: topbar,
      },
    });
  } catch (err) {
    console.error('Error fetching storefront homepage data:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Create Online Storefront Order (Customer Checkout)
export const createStorefrontOrder = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await resolveTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Support both Etimad Suite schema and legacy etimadmart.com checkout schema
    const rawCustomer = req.body.customer || req.body.shippingAddress || {};
    const customer = {
      name: (rawCustomer.name || rawCustomer.fullName || '').trim(),
      phone: (rawCustomer.phone || rawCustomer.mobile || '').trim(),
      address: (rawCustomer.address || rawCustomer.streetAddress || '').trim(),
      city: (rawCustomer.city || '').trim(),
      province: (rawCustomer.province || 'Punjab').trim(),
      postalCode: (rawCustomer.postalCode || '').trim(),
      email: (rawCustomer.email || '').trim(),
    };

    const rawItems = req.body.items || req.body.cartSummary || [];
    const shippingFee = req.body.shippingFee != null ? Number(req.body.shippingFee) : Number(req.body.deliveryCharges ?? 200);
    const discount = req.body.discount != null ? Number(req.body.discount) : Number(req.body.discountAmount ?? 0);
    const paymentMethod = req.body.paymentMethod || 'cod';
    const customerNotes = (req.body.customerNotes || req.body.additionalInstructions || '').trim();

    if (!customer.name || !customer.phone || !customer.address || !customer.city) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, address, and city are required for shipping',
      });
    }

    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must include at least one item' });
    }

    // Validate inventory and prepare items
    const orderItems = [];
    let subtotal = 0;

    for (const raw of rawItems) {
      const qty = Number(raw.quantity || raw.count || 1);
      if (qty <= 0) continue;

      let product = null;
      const prodId = raw.productId || raw._id || raw.product?._id;
      if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
        product = await Product.findOne({ _id: prodId, tenantId: tenant._id });
      }

      if (!product && raw.model) {
        product = await Product.findOne({
          model: new RegExp(`^${raw.model.trim()}$`, 'i'),
          tenantId: tenant._id,
        });
      }

      const searchTitle = raw.title || raw.name || '';
      if (!product && searchTitle) {
        const words = searchTitle.split(/\s+/);
        for (const word of words) {
          if (word.length >= 3 && !['THE', 'FOR', 'AND', 'WITH', 'HAIR', 'BEST', 'PRO'].includes(word.toUpperCase())) {
            product = await Product.findOne({
              tenantId: tenant._id,
              model: new RegExp(word, 'i'),
            });
            if (product) break;
          }
        }
      }

      if (!product && searchTitle) {
        product = await Product.findOne({
          tenantId: tenant._id,
          name: new RegExp(searchTitle.slice(0, 8), 'i'),
        });
      }

      const itemName = product ? product.name : (raw.title || raw.name || 'Online Item');
      const itemModel = product ? product.model : (raw.model || '');
      const itemCategory = product ? product.category : 'General';
      const unitPrice = Number(raw.unitPrice || raw.price || (product ? (product.websitePrice || product.retailPrice) : 0));
      const lineTotal = unitPrice * qty;

      subtotal += lineTotal;
      orderItems.push({
        productId: product ? product._id : (mongoose.Types.ObjectId.isValid(prodId) ? prodId : new mongoose.Types.ObjectId()),
        name: itemName,
        model: itemModel,
        category: itemCategory,
        quantity: qty,
        unitPrice,
        totalAmount: lineTotal,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'No valid items in order' });
    }

    const numericShipping = Number(shippingFee || 0);
    const numericDiscount = Number(discount || 0);
    const grandTotal = Math.max(0, subtotal + numericShipping - numericDiscount);

    // Save online order
    const order = new OnlineOrder({
      tenantId: tenant._id,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email?.trim() || '',
        address: customer.address.trim(),
        city: customer.city.trim(),
        province: customer.province?.trim() || 'Punjab',
        postalCode: customer.postalCode?.trim() || '',
      },
      items: orderItems,
      subtotal,
      shippingFee: numericShipping,
      discount: numericDiscount,
      total: grandTotal,
      paymentMethod,
      paymentStatus: 'unpaid',
      status: 'pending',
      courier: {
        provider: tenant.settings?.couriers?.defaultCourier || 'Leopards',
        trackingNumber: '',
        destinationCityId: '',
      },
      source: 'storefront',
      inventoryDeducted: true,
      customerNotes: customerNotes.trim(),
    });

    await order.save();

    // Deduct physical inventory & record audit history
    for (const item of orderItems) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        const prevStock = prod.stock;
        prod.stock = Math.max(0, prod.stock - item.quantity);
        await prod.save();

        const stockHistory = new StockHistory({
          product: prod._id,
          changeQuantity: -item.quantity,
          remainingStock: prod.stock,
          reason: `Online Storefront Order #${order.orderNumber} (${customer.city})`,
          type: 'sale',
          tenantId: tenant._id,
        });
        await stockHistory.save().catch((e) => console.error('Error saving stock history for online order:', e));
      }
    }

    // Auto-upsert customer record for khata/history
    try {
      const cleanPhone = customer.phone.trim();
      let cust = await Customer.findOne({ phone: cleanPhone, tenantId: tenant._id });
      if (!cust) {
        cust = new Customer({
          name: customer.name.trim(),
          phone: cleanPhone,
          address: `${customer.address.trim()}, ${customer.city.trim()}`,
          type: 'online',
          tenantId: tenant._id,
        });
        await cust.save();
      }
    } catch (custErr) {
      console.warn('Customer upsert non-critical warning:', custErr.message);
    }

    res.status(201).json({
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
      },
      orderNumber: order.orderNumber,
      orderId: order._id,
      total: order.total,
      currency: tenant.currencySymbol || 'Rs.',
      message: 'Order placed successfully! You will receive a confirmation call or WhatsApp message.',
    });
  } catch (err) {
    console.error('Error creating storefront order:', err);
    res.status(500).json({ message: err.message || 'Failed to place order' });
  }
};

// 5. Track Storefront Order by Order Number or Phone
export const trackStorefrontOrder = async (req, res) => {
  try {
    const { slug, identifier } = req.params;
    const tenant = await resolveTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const term = String(identifier).trim();
    const order = await OnlineOrder.findOne({
      tenantId: tenant._id,
      $or: [{ orderNumber: term }, { 'customer.phone': term }],
    }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({ message: 'No order found with the provided details' });
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        customer: {
          name: order.customer.name,
          city: order.customer.city,
          province: order.customer.province,
          address: order.customer.address,
        },
        status: order.status,
        items: order.items,
        itemsCount: order.items.length,
        totalAmount: order.total,
        paymentMethod: order.paymentMethod,
        courier: {
          provider: order.courier?.provider,
          trackingNumber: order.courier?.trackingNumber || null,
        },
        createdAt: order.createdAt,
      },
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      city: order.customer.city,
      status: order.status,
      itemsCount: order.items.length,
      total: order.total,
      paymentMethod: order.paymentMethod,
      courier: {
        provider: order.courier?.provider,
        trackingNumber: order.courier?.trackingNumber || null,
      },
      createdAt: order.createdAt,
    });
  } catch (err) {
    console.error('Error tracking storefront order:', err);
    res.status(500).json({ message: 'Failed to track order' });
  }
};

