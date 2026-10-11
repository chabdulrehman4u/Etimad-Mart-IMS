import OnlineOrder from '../models/OnlineOrder.js';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import Bill from '../models/Bill.js';
import Seller from '../models/Seller.js';
import Tenant from '../models/Tenant.js';
import LcsParcel from '../models/LcsParcel.js';

// Helper to get tenant ID
const getTenantId = async (req) => {
  if (req.tenantId) return req.tenantId;
  if (req.user?.tenantId) return req.user.tenantId;
  const tenant = (await Tenant.findOne({ isFlagship: true })) || (await Tenant.findOne());
  return tenant?._id;
};

// 1. Get Paginated List of Online Orders
export const getOnlineOrders = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { status, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { tenantId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const term = String(search).trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { 'customer.name': { $regex: term, $options: 'i' } },
        { 'customer.phone': { $regex: term, $options: 'i' } },
        { 'customer.city': { $regex: term, $options: 'i' } },
        { 'courier.trackingNumber': { $regex: term, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total, counts] = await Promise.all([
      OnlineOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('items.productId', 'name model stock retailPrice websitePrice barcode'),
      OnlineOrder.countDocuments(query),
      OnlineOrder.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = {
      all: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      dispatched: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };

    counts.forEach((c) => {
      if (statusCounts[c._id] !== undefined) {
        statusCounts[c._id] = c.count;
      }
      statusCounts.all += c.count;
    });

    res.json({
      orders,
      statusCounts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)) || 1,
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('Error fetching online orders:', err);
    res.status(500).json({ message: 'Failed to fetch online orders' });
  }
};

// 2. Get Online Orders Statistics
export const getOnlineOrderStats = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [aggregateResult, todayCount, totalCount] = await Promise.all([
      OnlineOrder.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $in: ['$status', ['delivered', 'dispatched', 'confirmed', 'pending']] }, '$total', 0],
              },
            },
            deliveredRevenue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0],
              },
            },
            pendingCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0],
              },
            },
            dispatchedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'dispatched'] }, 1, 0],
              },
            },
            deliveredCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
              },
            },
            returnedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'returned'] }, 1, 0],
              },
            },
          },
        },
      ]),
      OnlineOrder.countDocuments({ tenantId, createdAt: { $gte: todayStart } }),
      OnlineOrder.countDocuments({ tenantId }),
    ]);

    const stats = aggregateResult[0] || {
      totalRevenue: 0,
      deliveredRevenue: 0,
      pendingCount: 0,
      dispatchedCount: 0,
      deliveredCount: 0,
      returnedCount: 0,
    };

    res.json({
      totalOrders: totalCount,
      todayOrders: todayCount,
      pendingCount: stats.pendingCount,
      dispatchedCount: stats.dispatchedCount,
      deliveredCount: stats.deliveredCount,
      returnedCount: stats.returnedCount,
      totalRevenue: stats.totalRevenue,
      deliveredRevenue: stats.deliveredRevenue,
    });
  } catch (err) {
    console.error('Error fetching online order stats:', err);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

// 3. Get Single Online Order by ID
export const getOnlineOrderById = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const order = await OnlineOrder.findOne({ _id: req.params.id, tenantId }).populate(
      'items.productId',
      'name model stock retailPrice websitePrice barcode'
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
};

// 4. Update Online Order Status (with restock safeguard)
export const updateOnlineOrderStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { status, adminNotes } = req.body;

    const order = await OnlineOrder.findOne({ _id: req.params.id, tenantId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const prevStatus = order.status;
    order.status = status;

    if (adminNotes !== undefined) {
      order.adminNotes = adminNotes;
    }

    if (status === 'confirmed') order.confirmedAt = new Date();
    if (status === 'dispatched') order.dispatchedAt = new Date();
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }
    if (status === 'cancelled') order.cancelledAt = new Date();

    // Inventory safeguard: Restock if order is cancelled/returned and stock was previously deducted
    if (['cancelled', 'returned'].includes(status) && order.inventoryDeducted) {
      for (const item of order.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          prod.stock = Number(prod.stock || 0) + Number(item.quantity || 0);
          await prod.save();

          const history = new StockHistory({
            product: prod._id,
            changeQuantity: item.quantity,
            remainingStock: prod.stock,
            reason: `Restocked from ${status} Online Order #${order.orderNumber}`,
            type: 'return',
            tenantId,
          });
          await history.save().catch((e) => console.error('Restock history error:', e));
        }
      }
      order.inventoryDeducted = false;
    }

    // If order was restored from cancelled back to active, deduct stock again
    if (!['cancelled', 'returned'].includes(status) && !order.inventoryDeducted) {
      for (const item of order.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          prod.stock = Math.max(0, Number(prod.stock || 0) - Number(item.quantity || 0));
          await prod.save();

          const history = new StockHistory({
            product: prod._id,
            changeQuantity: -item.quantity,
            remainingStock: prod.stock,
            reason: `Deducted for Reopened Online Order #${order.orderNumber}`,
            type: 'sale',
            tenantId,
          });
          await history.save().catch((e) => console.error('Restock history error:', e));
        }
      }
      order.inventoryDeducted = true;
    }

    await order.save();

    res.json({
      message: `Order status updated from ${prevStatus} to ${status}`,
      order,
    });
  } catch (err) {
    console.error('Error updating online order status:', err);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// 5. Book Courier for Online Order
export const bookOrderCourier = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { provider = 'Leopards', trackingNumber, weightKg = 0.5, pieces = 1 } = req.body;

    const order = await OnlineOrder.findOne({ _id: req.params.id, tenantId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let finalCn = trackingNumber?.trim();

    // If no manual CN provided, auto-generate standard courier tracking format
    if (!finalCn) {
      const prefix = provider === 'Leopards' ? 'LEO' : provider === 'PostEx' ? 'PEX' : 'TRX';
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      finalCn = `${prefix}${Date.now().toString().slice(-4)}${randomDigits}`;
    }

    order.courier = {
      provider,
      trackingNumber: finalCn,
      bookedAt: new Date(),
      weightKg: Number(weightKg || 0.5),
      pieces: Number(pieces || 1),
    };
    order.status = 'dispatched';
    order.dispatchedAt = new Date();

    await order.save();

    // Auto-create matching record in LcsParcel for automatic courier dispatch tracking
    try {
      const existingLcs = await LcsParcel.findOne({ trackingNumber: finalCn });
      if (!existingLcs) {
        const lcsRecord = new LcsParcel({
          trackingNumber: finalCn,
          customerName: order.customer.name,
          phone: order.customer.phone,
          address: order.customer.address,
          cityName: order.customer.city,
          codAmount: order.total,
          weight: Number(weightKg || 0.5),
          pieces: Number(pieces || 1),
          status: 'Booked',
          bookedDate: new Date(),
          tenantId,
        });
        await lcsRecord.save();
      }
    } catch (lcsErr) {
      console.warn('LcsParcel auto-create non-critical warning:', lcsErr.message);
    }

    res.json({
      message: `Courier booked successfully via ${provider}. Tracking CN: ${finalCn}`,
      trackingNumber: finalCn,
      order,
    });
  } catch (err) {
    console.error('Error booking courier for online order:', err);
    res.status(500).json({ message: 'Failed to book courier' });
  }
};

// 6. Convert Online Order to Store Bill
export const convertOrderToBill = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const order = await OnlineOrder.findOne({ _id: req.params.id, tenantId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.billId) {
      const existingBill = await Bill.findById(order.billId);
      if (existingBill) {
        return res.json({ message: 'Bill already exists for this order', bill: existingBill });
      }
    }

    const defaultSeller = (await Seller.findOne({ isActive: true })) || null;

    const bill = new Bill({
      seller: defaultSeller?._id,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        address: `${order.customer.address}, ${order.customer.city}`,
        type: 'online',
      },
      channel: 'online',
      items: order.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        model: i.model,
        category: i.category,
        selectedPriceType: 'websitePrice',
        selectedPrice: i.unitPrice,
        quantity: i.quantity,
        totalAmount: i.totalAmount,
      })),
      subtotal: order.subtotal,
      discount: order.discount || 0,
      total: order.total,
      amountPaid: order.paymentStatus === 'paid' ? order.total : 0,
      remainingAmount: order.paymentStatus === 'paid' ? 0 : order.total,
      paymentMethod: order.paymentMethod === 'cod' ? 'cash' : 'bank_transfer',
      status: order.status === 'delivered' ? 'completed' : 'pending',
      notes: `Online Order #${order.orderNumber} - Shipping City: ${order.customer.city}`,
      tenantId,
    });

    await bill.save();
    order.billId = bill._id;
    await order.save();

    res.status(201).json({
      message: `Converted to Bill #${bill.billNumber}`,
      bill,
    });
  } catch (err) {
    console.error('Error converting order to bill:', err);
    res.status(500).json({ message: 'Failed to convert online order to bill' });
  }
};

