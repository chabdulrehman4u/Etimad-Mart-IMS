import Tenant from '../models/Tenant.js';
import Admin from '../models/Admin.js';
import Product from '../models/Product.js';
import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import { getFlagshipTenant } from '../middleware/tenant.js';

/**
 * GET /api/tenant/current
 * Fetch current authenticated business tenant details
 */
export const getCurrentTenant = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    let tenant = null;

    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    }

    if (!tenant) {
      tenant = await getFlagshipTenant();
    }

    res.json({
      success: true,
      tenant,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/tenant/current
 * Update current business profile, branding, and channel settings
 */
export const updateCurrentTenant = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    let tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      tenant = await getFlagshipTenant();
    }

    const {
      name,
      tagline,
      phone,
      email,
      address,
      city,
      logoUrl,
      receiptHeader,
      receiptFooter,
      taxNumber,
      currency,
      currencySymbol,
      channelsEnabled,
      settings,
    } = req.body;

    if (name) tenant.name = String(name).trim();
    if (tagline !== undefined) tenant.tagline = String(tagline).trim();
    if (phone !== undefined) tenant.phone = String(phone).trim();
    if (email !== undefined) tenant.email = String(email).trim().toLowerCase();
    if (address !== undefined) tenant.address = String(address).trim();
    if (city !== undefined) tenant.city = String(city).trim();
    if (logoUrl !== undefined) tenant.logoUrl = String(logoUrl).trim();
    if (receiptHeader !== undefined) tenant.receiptHeader = String(receiptHeader).trim();
    if (receiptFooter !== undefined) tenant.receiptFooter = String(receiptFooter).trim();
    if (taxNumber !== undefined) tenant.taxNumber = String(taxNumber).trim();
    if (currency) tenant.currency = String(currency).trim();
    if (currencySymbol) tenant.currencySymbol = String(currencySymbol).trim();

    if (channelsEnabled) {
      tenant.channelsEnabled = {
        retail: channelsEnabled.retail !== undefined ? Boolean(channelsEnabled.retail) : tenant.channelsEnabled.retail,
        wholesale: channelsEnabled.wholesale !== undefined ? Boolean(channelsEnabled.wholesale) : tenant.channelsEnabled.wholesale,
        online: channelsEnabled.online !== undefined ? Boolean(channelsEnabled.online) : tenant.channelsEnabled.online,
      };
    }

    if (settings) {
      if (settings.pos) {
        tenant.settings.pos = {
          ...tenant.settings.pos,
          ...settings.pos,
        };
      }
      if (settings.couriers) {
        tenant.settings.couriers = {
          ...tenant.settings.couriers,
          ...settings.couriers,
        };
      }
    }

    await tenant.save();

    res.json({
      success: true,
      message: 'Business profile and settings updated successfully',
      tenant,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/tenant/public/:slug
 * Public profile used by Online Storefront to display store branding and active channels
 */
export const getTenantPublicProfile = async (req, res) => {
  try {
    const slug = String(req.params.slug || 'etimadmart').toLowerCase().trim();
    let tenant = await Tenant.findOne({ slug });

    if (!tenant) {
      tenant = await getFlagshipTenant();
    }

    res.json({
      success: true,
      store: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        tagline: tenant.tagline,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        city: tenant.city,
        logoUrl: tenant.logoUrl,
        currency: tenant.currency,
        currencySymbol: tenant.currencySymbol,
        channelsEnabled: tenant.channelsEnabled,
        settings: {
          defaultCourier: tenant.settings?.couriers?.defaultCourier || 'Leopards',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/tenant/all
 * Superadmin view: List all tenant merchants and their metrics
 */
export const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });

    const tenantsWithStats = await Promise.all(
      tenants.map(async (t) => {
        const [productsCount, ordersCount, customersCount, staffCount] = await Promise.all([
          Product.countDocuments({ tenantId: t._id }),
          Bill.countDocuments({ tenantId: t._id }),
          Customer.countDocuments({ tenantId: t._id }),
          Admin.countDocuments({ tenantId: t._id }),
        ]);

        return {
          ...t.toObject(),
          stats: {
            productsCount,
            ordersCount,
            customersCount,
            staffCount,
          },
        };
      })
    );

    res.json({
      success: true,
      tenants: tenantsWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/tenant
 * Superadmin: Provision a new merchant tenant
 */
export const createTenant = async (req, res) => {
  try {
    const {
      name,
      slug,
      tagline,
      phone,
      email,
      address,
      city,
      adminEmail,
      adminUsername,
      adminPassword,
      plan = 'growth',
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Store Name and URL Slug are required' });
    }

    const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const existing = await Tenant.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ message: `A store with URL slug '${cleanSlug}' already exists.` });
    }

    const tenant = await Tenant.create({
      name: String(name).trim(),
      slug: cleanSlug,
      tagline: tagline || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      city: city || '',
      receiptHeader: `${name}\n${city || ''}`,
      subscription: {
        plan,
        status: 'active',
      },
      isFlagship: false,
    });

    // Optionally create the initial admin user for this merchant
    let createdAdmin = null;
    if (adminEmail && adminPassword) {
      const existingAdmin = await Admin.findOne({ email: adminEmail });
      if (!existingAdmin) {
        createdAdmin = new Admin({
          username: adminUsername || name,
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          tenantId: tenant._id,
        });
        await createdAdmin.save();
      }
    }

    res.status(201).json({
      success: true,
      message: `Tenant '${tenant.name}' provisioned successfully`,
      tenant,
      admin: createdAdmin ? { email: createdAdmin.email, username: createdAdmin.username } : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

