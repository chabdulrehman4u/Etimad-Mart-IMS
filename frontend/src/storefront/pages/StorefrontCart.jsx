import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontCart = () => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    discount,
    shippingFee,
    grandTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState(null);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      setCouponLoading(true);
      setCouponMessage(null);
      const res = await axios.post('/api/coupon/validate', {
        code: couponInput.trim().toUpperCase(),
        cartTotal: subtotal,
      });

      if (res.data?.valid && res.data.coupon) {
        applyCoupon(res.data.coupon);
        setCouponMessage({ type: 'success', text: `Success! Coupon "${res.data.coupon.code}" applied.` });
        setCouponInput('');
      } else {
        setCouponMessage({ type: 'error', text: res.data?.message || 'Invalid or expired coupon.' });
      }
    } catch (err) {
      setCouponMessage({
        type: 'error',
        text: err.response?.data?.message || 'Invalid or expired promo code.',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full">
        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-gray-500 mt-1">Review your items before proceeding to checkout</p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Cart is Currently Empty</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Looks like you haven't added any products yet. Check out our latest deals on trimmers and electronics!
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-blue-700 transition"
            >
              <span>Explore Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Cart Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Item ({cartItems.length})
                </span>
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <div key={item._id} className="py-4 flex gap-4 items-center">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded-xl bg-gray-50 border border-gray-200 shrink-0"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80';
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.slug}`}
                        className="font-bold text-sm text-gray-900 hover:text-blue-600 transition line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      {item.model && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{item.model}</p>
                      )}
                      <p className="text-xs font-bold text-gray-700 mt-1">
                        Rs. {item.price.toLocaleString()} each
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 shrink-0">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="p-1.5 text-gray-600 hover:text-gray-900"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="p-1.5 text-gray-600 hover:text-gray-900"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right shrink-0 w-24">
                      <span className="font-extrabold text-sm text-gray-900 block">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-[11px] text-gray-400 hover:text-rose-600 transition mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 1 Col: Summary & Coupons */}
            <div className="space-y-6">
              {/* Promo Code Box */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-3">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Tag size={16} className="text-emerald-600" />
                  <span>Have a Promo Coupon?</span>
                </h3>

                {appliedCoupon ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-800 font-mono uppercase">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        {appliedCoupon.discountType === 'percentage'
                          ? `${appliedCoupon.discountAmount}% Discount Applied`
                          : `Rs. ${appliedCoupon.discountAmount} Flat Off Applied`}
                      </p>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="p-1 text-emerald-700 hover:text-rose-600 transition"
                      title="Remove coupon"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. ETIMAD10"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3.5 py-2 font-mono uppercase text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition"
                    >
                      {couponLoading ? 'Checking...' : 'Apply'}
                    </button>
                  </form>
                )}

                {couponMessage && (
                  <p
                    className={`text-xs ${
                      couponMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {couponMessage.text}
                  </p>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
                <h3 className="font-bold text-sm text-gray-900 border-b pb-3">Order Summary</h3>

                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Coupon Discount</span>
                      <span>- Rs. {discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Nationwide Shipping</span>
                    <span className="font-bold text-gray-900">
                      {shippingFee === 0 ? (
                        <span className="text-emerald-600 uppercase font-black">Free</span>
                      ) : (
                        `Rs. ${shippingFee}`
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-100">
                    <span>Total Amount</span>
                    <span className="text-blue-600">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={14} />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Cash on Delivery (Pay upon delivery)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontCart;
