import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import Admin from '../models/Admin.js';

dotenv.config();

const runMigration = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set in environment.');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // 1. Ensure Flagship Tenant exists
    let flagshipTenant = await Tenant.findOne({ isFlagship: true });
    if (!flagshipTenant) {
      flagshipTenant = await Tenant.findOne({ slug: 'etimadmart' });
    }

    if (!flagshipTenant) {
      console.log('🌱 Creating Flagship Tenant: Etimad Mart...');
      flagshipTenant = await Tenant.create({
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
      console.log(`✅ Created Flagship Tenant with ID: ${flagshipTenant._id}`);
    } else {
      flagshipTenant.isFlagship = true;
      await flagshipTenant.save();
      console.log(`ℹ️ Existing Flagship Tenant found: ${flagshipTenant.name} (${flagshipTenant._id})`);
    }

    const tenantId = flagshipTenant._id;

    // 2. Set Superadmin
    const superAdmin = await Admin.findOne({ email: 'chabdulrehman4u@gmail.com' });
    if (superAdmin) {
      superAdmin.isSuperAdmin = true;
      superAdmin.role = 'superadmin';
      superAdmin.tenantId = tenantId;
      await superAdmin.save();
      console.log(`⭐ Set chabdulrehman4u@gmail.com as SuperAdmin linked to ${flagshipTenant.name}`);
    }

    // 3. Migrate all database collections to default tenant
    const collectionsToMigrate = [
      'admins',
      'sellers',
      'products',
      'customers',
      'bills',
      'purchasebatches',
      'expenses',
      'incomes',
      'bankaccounts',
      'stockhistories',
      'sellerdispatches',
      'sellertransactions',
      'financesettings',
      'financeledgers',
      'categories',
      'returns',
      'parcels',
      'bookpos',
      'adspends',
      'dispatchrecords',
      'lcsparcels',
      'accountpayables',
      'ownercapitals',
    ];

    console.log('\n📦 Migrating collections to Flagship Tenant...');
    const db = mongoose.connection.db;

    for (const collName of collectionsToMigrate) {
      try {
        const collections = await db.listCollections({ name: collName }).toArray();
        if (collections.length === 0) continue;

        const coll = db.collection(collName);
        const result = await coll.updateMany(
          { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
          { $set: { tenantId } }
        );

        if (result.matchedCount > 0) {
          console.log(`  ✓ ${collName}: updated ${result.modifiedCount} / ${result.matchedCount} records.`);
        } else {
          const total = await coll.countDocuments();
          console.log(`  ✓ ${collName}: ${total} records already tagged with tenantId.`);
        }
      } catch (collErr) {
        console.warn(`  ⚠️ Could not update ${collName}:`, collErr.message);
      }
    }

    console.log('\n🎉 Multi-Tenant Migration to Tenant #1 (Etimad Mart) completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();

