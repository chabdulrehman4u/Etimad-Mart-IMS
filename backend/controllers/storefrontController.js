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
        .select('name model category websitePrice retailPrice stock barcode originalPrice')
        .sort({ stock: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    const formatted = products.map((p) => {
      const price = Number(p.websitePrice || p.retailPrice || 0);
      return {
        _id: p._id,
        name: p.name,
        model: p.model,
        category: p.category,
        price,
        websitePrice: Number(p.websitePrice || 0),
        retailPrice: Number(p.retailPrice || 0),
        inStock: Number(p.stock || 0) > 0,
        stock: Number(p.stock || 0),
        barcode: p.barcode || '',
      };
    });

    res.json({
      store: {
        name: tenant.name,
        slug: tenant.slug,
        currencySymbol: tenant.currencySymbol || 'Rs.',
      },
      products: formatted,
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
    const { slug, idOrModel } = req.params;
    const tenant = await resolveTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const query = { tenantId: tenant._id, isOnlineAvailable: { $ne: false } };
    if (idOrModel.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = idOrModel;
    } else {
      query.$or = [{ model: idOrModel }, { barcode: idOrModel }];
    }

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const price = Number(product.websitePrice || product.retailPrice || 0);

    res.json({
      _id: product._id,
      name: product.name,
      model: product.model,
      category: product.category,
      price,
      websitePrice: Number(product.websitePrice || 0),
      retailPrice: Number(product.retailPrice || 0),
      inStock: Number(product.stock || 0) > 0,
      stock: Number(product.stock || 0),
      barcode: product.barcode || '',
    });
  } catch (err) {
    console.error('Error fetching storefront product:', err);
    res.status(500).json({ message: 'Failed to load product' });
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

    const {
      customer,
      items = [],
      shippingFee = 200,
      discount = 0,
      paymentMethod = 'cod',
      customerNotes = '',
    } = req.body;

    if (!customer || !customer.name || !customer.phone || !customer.address || !customer.city) {
      return res.status(400).json({
        message: 'Customer name, phone, address, and city are required for shipping',
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must include at least one item' });
    }

    // Validate inventory and prepare items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const qty = Number(item.quantity || 1);
      if (qty <= 0) continue;

      const product = await Product.findOne({
        _id: item.productId,
        tenantId: tenant._id,
      });

      if (!product) {
        return res.status(400).json({
          message: `Product ${item.name || item.productId} was not found`,
        });
      }

      if (Number(product.stock || 0) < qty) {
        return res.status(400).json({
          message: `Insufficient warehouse stock for ${product.name} (${product.model}). Available: ${product.stock}, requested: ${qty}`,
        });
      }

      const unitPrice = Number(item.unitPrice || product.websitePrice || product.retailPrice || 0);
      const lineTotal = unitPrice * qty;

      subtotal += lineTotal;
      orderItems.push({
        productId: product._id,
        name: product.name,
        model: product.model || '',
        category: product.category || 'General',
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

