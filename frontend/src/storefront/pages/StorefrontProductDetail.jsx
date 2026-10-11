import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Plus,
  Minus,
  MessageCircle,
  Share2,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ reviewerName: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`/api/storefront/etimadmart/product/${slug}`)
      .then((res) => {
        if (res.data) {
          setProduct(res.data);
          setSelectedImage(0);
        }
      })
      .catch((err) => console.error('Error loading product:', err))
      .finally(() => setLoading(false));

    // Fetch customer reviews
    axios
      .get(`/api/review/${slug}`)
      .then((res) => {
        if (Array.isArray(res.data)) setReviews(res.data);
      })
      .catch(() => {});
  }, [slug]);

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity);
    navigate('/checkout');
  };

  const handleWhatsAppOrder = () => {
    if (!product) return;
    const msg = encodeURIComponent(
      `Assalam-o-Alaikum! I want to order:\n*${product.title}*\nPrice: Rs. ${product.salePrice.toLocaleString()}\nQuantity: ${quantity}\nLink: ${window.location.href}`
    );
    window.open(`https://wa.me/923001234567?text=${msg}`, '_blank');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.reviewerName.trim() || !newReview.comment.trim()) return;
    try {
      setSubmittingReview(true);
      await axios.post('/api/review/create', {
        ...newReview,
        productSlug: slug,
        productId: product?._id,
      });
      setReviews([
        { ...newReview, createdAt: new Date().toISOString() },
        ...reviews,
      ]);
      setNewReview({ reviewerName: '', rating: 5, comment: '' });
      alert('Thank you! Your review has been submitted.');
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <StorefrontHeader />
        <div className="flex-1 max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <StorefrontFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <StorefrontHeader />
        <div className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
          <p className="text-xs text-gray-500">The product you are looking for is currently unavailable.</p>
          <Link to="/shop" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
            Back to Shop
          </Link>
        </div>
        <StorefrontFooter />
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [{ url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', alt: product.title }];
  const saveAmount = (product.price || product.salePrice) - product.salePrice;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight size={12} />
          <Link to="/shop" className="hover:text-blue-600">Shop</Link>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium truncate max-w-xs">{product.title}</span>
        </div>

        {/* Product Hero Section */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-10 shadow-2xs grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Gallery */}
          <div className="space-y-4">
            {/* Main Active Image */}
            <div className="relative aspect-square rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden group">
              <img
                src={images[selectedImage]?.url || images[0]?.url}
                alt={product.title}
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition duration-300"
              />
              {saveAmount > 0 && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-rose-600 text-white text-xs font-black rounded-lg uppercase shadow-sm">
                  Save Rs. {saveAmount.toLocaleString()}
                </span>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-18 h-18 rounded-xl border-2 overflow-hidden bg-gray-50 shrink-0 transition ${
                      selectedImage === idx ? 'border-blue-600 shadow-xs' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info & Purchase Controls */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              {product.brand && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Brand: {product.brand}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                {product.title}
              </h1>

              {/* Ratings */}
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-700">5.0</span>
                <span className="text-xs text-gray-400">• ({reviews.length} Verified Reviews)</span>
              </div>

              {/* Price Block */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-gray-900">
                    Rs. {product.salePrice.toLocaleString()}
                  </span>
                  {product.price > product.salePrice && (
                    <span className="text-base text-gray-400 line-through">
                      Rs. {product.price.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>Nationwide Cash on Delivery Available</span>
                </p>
              </div>

              {/* Availability */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-gray-700">Availability:</span>
                {product.inStock ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold">
                    In Stock ({product.stock} units available)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold">
                    Temporarily Out of Stock
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.description && (
                <p className="text-xs text-gray-600 leading-relaxed pt-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Purchase Buttons */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-700 uppercase">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 text-gray-600 hover:text-gray-900"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                    className="p-2 text-gray-600 hover:text-gray-900"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => addToCart(product, quantity)}
                  disabled={!product.inStock}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingBag size={16} />
                  <span>Add To Cart</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!product.inStock}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <span>Buy Now (COD)</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* WhatsApp Quick Order Button */}
              <button
                onClick={handleWhatsAppOrder}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle size={16} />
                <span>Order via WhatsApp (0300-1234567)</span>
              </button>

              {/* Guarantees Box */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-center text-[11px] text-gray-500">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center">
                  <ShieldCheck size={18} className="text-emerald-500 mb-1" />
                  <span className="font-semibold text-gray-800">100% Original</span>
                  <span>Brand Sourced</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center">
                  <RotateCcw size={18} className="text-blue-500 mb-1" />
                  <span className="font-semibold text-gray-800">7 Days Check</span>
                  <span>Warranty</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center">
                  <Truck size={18} className="text-amber-500 mb-1" />
                  <span className="font-semibold text-gray-800">Fast 2-4 Days</span>
                  <span>COD Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Description & Specs */}
        {product.longDescription && (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
            <h3 className="text-lg font-black text-gray-900 border-b pb-3">Product Overview & Features</h3>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
              {product.longDescription}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Customer Reviews</h3>
              <p className="text-xs text-gray-500">Real feedback from verified purchasers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-4">
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No reviews yet. Be the first to share your experience!</p>
              ) : (
                reviews.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{r.reviewerName || 'Customer'}</span>
                      <span className="text-[10px] text-gray-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Verified'}
                      </span>
                    </div>
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={12}
                          className={idx < (r.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{r.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Write Review Form */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-4 h-fit">
              <h4 className="font-bold text-sm text-gray-900">Write a Review</h4>
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ali Raza"
                    value={newReview.reviewerName}
                    onChange={(e) => setNewReview({ ...newReview, reviewerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Rating</label>
                  <select
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                    <option value={3}>⭐⭐⭐ (3 - Average)</option>
                    <option value={2}>⭐⭐ (2 - Poor)</option>
                    <option value={1}>⭐ (1 - Terrible)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Your Feedback *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="How was the product quality and packaging?"
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontProductDetail;
