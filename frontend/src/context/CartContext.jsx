import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('etimad_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem('etimad_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('etimad_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem('etimad_coupon', JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem('etimad_coupon');
      }
    } catch (e) {
      console.error('Failed to save coupon to localStorage', e);
    }
  }, [appliedCoupon]);

  const addToCart = (product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      const itemPrice = Number(product.salePrice || product.websitePrice || product.retailPrice || product.price || 0);
      const itemImage = product.images?.[0]?.url || product.image || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80';
      const itemTitle = product.title || product.name || 'Product';
      const itemSlug = product.slug || product._id;

      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: Math.min(item.quantity + quantity, item.stock || 999) }
            : item
        );
      }
      return [
        ...prev,
        {
          _id: product._id,
          title: itemTitle,
          name: product.name,
          model: product.model || '',
          slug: itemSlug,
          price: itemPrice,
          image: itemImage,
          stock: product.stock ?? 999,
          barcode: product.barcode || '',
          quantity,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === productId
          ? { ...item, quantity: Math.min(quantity, item.stock || 999) }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item._id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (couponData) => {
    setAppliedCoupon(couponData);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Delivery: Free for orders >= 3500 PKR, else 200 PKR
  const shippingFee = subtotal >= 3500 || subtotal === 0 ? 0 : 200;

  // Calculate discount
  let discount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.discountType === 'percentage' || appliedCoupon.type === 'percentage') {
      const pct = Number(appliedCoupon.discountAmount || appliedCoupon.amount || 0);
      discount = Math.round((subtotal * pct) / 100);
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
        discount = appliedCoupon.maxDiscount;
      }
    } else {
      discount = Number(appliedCoupon.discountAmount || appliedCoupon.amount || 0);
    }
    if (discount > subtotal) discount = subtotal;
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingFee);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        subtotal,
        discount,
        shippingFee,
        grandTotal,
        appliedCoupon,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
