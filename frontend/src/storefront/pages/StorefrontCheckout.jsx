import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowRight,
  Phone,
  MessageCircle,
  ShoppingBag,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Gujranwala',
  'Sialkot',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Gujrat',
  'Sheikhupura',
  'Jhelum',
  'Rahim Yar Khan',
  'Sahiwal',
  'Okara',
  'Wah Cantt',
  'Kasur',
  'Mardan',
  'Abbottabad',
  'Other / Nationwide',
];

const StorefrontCheckout = () => {
  const {
    cartItems,
    subtotal,
    discount,
    shippingFee,
    grandTotal,
    appliedCoupon,
    clearCart,
  } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    altPhone: '',
    city: 'Lahore',
    province: 'Punjab',
    address: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Please fill in your name, phone number, and complete delivery address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          alternatePhone: form.altPhone.trim(),
          city: form.city,
          province: form.province,
          address: form.address.trim(),
        },
        items: cartItems.map((item) => ({
          productId: item._id,
          name: item.title,
          model: item.model || '',
          barcode: item.barcode || '',
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        coupon: appliedCoupon ? { code: appliedCoupon.code, discountAmount: discount } : null,
        shippingFee,
        discount,
        totalAmount: grandTotal,
        paymentMethod: 'cod',
        notes: form.notes.trim(),
      };

      const res = await axios.post('/api/storefront/etimadmart/orders', payload);
      if (res.data?.success && res.data.order) {
        setCompletedOrder(res.data.order);
        clearCart();
      } else {
        setError(res.data?.message || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      setError(err.response?.data?.message || 'An error occurred while creating your order.');
    } finally {
      setLoading(false);
    }
  };

  // If order is completed, display Order Confirmation receipt
  if (completedOrder) {
    const rawPhone = form.phone.replace(/[^0-9]/g, '');
    const waPhone = rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone;
    const waText = encodeURIComponent(
      `Assalam-o-Alaikum Etimad Mart! My order #${completedOrder.orderNumber} of Rs. ${completedOrder.totalAmount?.toLocaleString()} has been placed. Please confirm dispatch.`
    );

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
        <StorefrontHeader />
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 shadow-md text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                Order Placed Successfully
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Shukriya, {completedOrder.customer?.name}!
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                Your order has been recorded in our warehouse. Our representative will verify dispatch via call or WhatsApp.
              </p>
            </div>

            {/* Order Details Card */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 font-sans">Order Number:</span>
                <span className="font-bold text-blue-600 text-sm">{completedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 font-sans">Payment Method:</span>
                <span className="font-bold text-gray-900">Cash on Delivery (COD)</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 font-sans">Delivery City:</span>
                <span className="font-bold text-gray-900">{completedOrder.customer?.city}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-gray-900 font-sans font-bold">Total Amount Payable:</span>
                <span className="font-black text-emerald-600">
                  Rs. {completedOrder.totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://wa.me/923001234567?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle size={16} />
                <span>Confirm on WhatsApp</span>
              </a>
              <Link
                to={`/track-order?id=${completedOrder.orderNumber}`}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md"
              >
                <Truck size={16} />
                <span>Track Order Status</span>
              </Link>
            </div>

            <div>
              <Link to="/" className="text-xs font-bold text-blue-600 hover:underline">
                Return to Home Page
              </Link>
            </div>
          </div>
        </main>
        <StorefrontFooter />
      </div>
    );
  }

  // If cart is empty, redirect to shop
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
        <StorefrontHeader />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <ShoppingBag size={48} className="text-gray-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500">Add products before proceeding to checkout.</p>
          <Link to="/shop" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
            Back to Shop
          </Link>
        </main>
        <StorefrontFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Express Checkout</h1>
          <p className="text-xs text-gray-500 mt-0.5">Cash on Delivery across Pakistan • 100% Secure</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Shipping & Contact Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Contact Information */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="font-bold text-base text-gray-900">Customer Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Usman"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Mobile Phone (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Alternate Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="03211234567"
                    value={form.altPhone}
                    onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="font-bold text-base text-gray-900">Delivery Address</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    City *
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Province
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Punjab">Punjab</option>
                    <option value="Sindh">Sindh</option>
                    <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                    <option value="Balochistan">Balochistan</option>
                    <option value="Islamabad Capital">Islamabad Capital</option>
                    <option value="Azad Kashmir">Azad Kashmir</option>
                    <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Complete Street Address (House #, Street #, Mohalla / Sector) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. House # 14-B, Street 3, Sector G-11/2, Near Jamia Masjid"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Delivery Instructions / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please call before arriving or deliver between 2pm-6pm"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b pb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="font-bold text-base text-gray-900">Payment Option</h2>
              </div>

              <div className="p-4 rounded-2xl border-2 border-blue-600 bg-blue-50/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-4 border-blue-600 bg-white"></div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">Cash on Delivery (COD)</h4>
                    <p className="text-[11px] text-gray-500">Pay cash directly to courier rider upon delivery</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                  Recommended
                </span>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Order Review & Place Order Button */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-gray-900 border-b pb-3">
                Order Items ({cartItems.length})
              </h3>

              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <div key={item._id} className="pt-2 flex gap-3 items-center">
                    <img
                      src={item.image}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg bg-gray-50 border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-gray-500">
                        {item.quantity} × Rs. {item.price.toLocaleString()}
                      </p>
                    </div>
                    <span className="font-bold text-xs text-gray-900 shrink-0">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>- Rs. {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-bold text-gray-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 uppercase font-black">Free</span>
                    ) : (
                      `Rs. ${shippingFee}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-100">
                  <span>Payable Total</span>
                  <span className="text-blue-600">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30"
              >
                {loading ? (
                  <span>Reserving Stock & Placing Order...</span>
                ) : (
                  <>
                    <span>Confirm COD Order</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="text-center space-y-1 pt-1 text-[11px] text-gray-400">
                <p className="flex items-center justify-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Immediate warehouse stock reservation</span>
                </p>
                <p>Delivery in 2-4 working days across Pakistan</p>
              </div>
            </div>
          </div>
        </form>
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontCheckout;
