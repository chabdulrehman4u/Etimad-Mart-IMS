import Tenant from '../models/Tenant.js';

let cachedFlagshipTenant = null;

/**
 * Helper to get or cache the default flagship tenant (Etimad Mart)
 */
export const getFlagshipTenant = async () => {
  if (cachedFlagshipTenant) {
    return cachedFlagshipTenant;
  }

  let tenant = await Tenant.findOne({ isFlagship: true });
  if (!tenant) {
    tenant = await Tenant.findOne({ slug: 'etimadmart' });
  }

  if (!tenant) {
    // Auto-create flagship Etimad Mart tenant if not present
    tenant = await Tenant.create({
      name: 'Etimad Mart',
      slug: 'etimadmart',
      tagline: 'Your Trusted Online Shopping Store in Pakistan',
      phone: '03071111832',
      email: 'chabdulrehman4u@gmail.com',
      address: 'Abdul Wahab Charpai Store, Mohalla Tariq Abad, Zahir Pir, Tehsil Khanpur',
      city: 'Zahir Pir',
      currency: 'PKR',
      currencySymbol: 'Rs.',
      receiptHeader: 'ETIMAD MART\nZahir Pir, Khanpur',
      receiptFooter: 'Thank you for shopping with Etimad Mart!\nExchange possible within 3 days with bill.',
      channelsEnabled: {
        retail: true,
        wholesale: true,
        online: true,
      },
      settings: {
        pos: {
          paperSize: '80mm',
          printUrduText: true,
          autoPrintOnSale: false,
        },
        couriers: {
          defaultCourier: 'Leopards',
        },
      },
      subscription: {
        plan: 'enterprise',
        status: 'active',
      },
      isFlagship: true,
    });
  }

  cachedFlagshipTenant = tenant;
  return tenant;
};

/**
 * Tenant resolution middleware.
 * Attaches req.tenant and req.tenantId to Express request.
 */
export const resolveTenant = async (req, res, next) => {
  try {
    let tenant = null;

    // 1. From authenticated user
    if (req.user?.tenantId) {
      tenant = await Tenant.findById(req.user.tenantId);
    }

    // 2. From header override (e.g. multi-tenant frontend or admin switcher)
    if (!tenant && req.headers['x-tenant-slug']) {
      const slug = String(req.headers['x-tenant-slug']).trim().toLowerCase();
      tenant = await Tenant.findOne({ slug });
    }

    if (!tenant && req.headers['x-tenant-id']) {
      tenant = await Tenant.findById(req.headers['x-tenant-id']);
    }

    // 3. Fallback to flagship tenant (Etimad Mart)
    if (!tenant) {
      tenant = await getFlagshipTenant();
    }

    req.tenant = tenant;
    req.tenantId = tenant?._id;

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    next(error);
  }
};

export const tenantMiddleware = resolveTenant;

