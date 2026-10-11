import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

const CartDrawer = () => {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingFee,
    grandTotal,
    discount,
  } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Your Shopping Cart</h2>
                <p className="text-xs text-gray-500">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Your Cart is Empty</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Browse our best-selling trimmers, shavers, and electronics to add items to your cart.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/shop');
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-3.5 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg bg-white border border-gray-200 shrink-0"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80';
                    }}
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${item.slug}`}
                          onClick={() => setIsCartOpen(false)}
                          className="font-semibold text-xs text-gray-900 hover:text-blue-600 line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-gray-400 hover:text-rose-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {item.model && (
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{item.model}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm text-gray-900">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="p-1 text-gray-500 hover:text-gray-900"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="p-1 text-gray-500 hover:text-gray-900"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 space-y-3.5">
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount</span>
                    <span>- Rs. {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-gray-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 uppercase font-bold text-[10px]">Free</span>
                    ) : (
                      `Rs. ${shippingFee}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total (Cash on Delivery)</span>
                  <span className="text-blue-600 text-base">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {subtotal < 3500 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg text-center font-medium">
                  Add <span className="font-bold">Rs. {(3500 - subtotal).toLocaleString()}</span> more for <span className="font-bold uppercase">Free Nationwide Shipping</span>!
                </p>
              )}

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/cart');
                  }}
                  className="w-full py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs border border-gray-200 transition"
                >
                  View Full Cart & Apply Coupons
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Cash on Delivery across Pakistan</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
