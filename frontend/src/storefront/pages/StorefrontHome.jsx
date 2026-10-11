import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';
import StorefrontPopup from '../components/StorefrontPopup';

const StorefrontHome = () => {
  const { addToCart } = useCart();

  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch aggregated homepage data in ONE single fast call!
    axios
      .get('/api/storefront/etimadmart/homepage')
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setBanners(d.banners || []);
          setCategories(d.categories || []);
          setFeaturedProducts(d.featuredProducts || []);
          setNewProducts(d.newProducts || []);
          setBestSellers(d.bestSellers || []);
        }
      })
      .catch((err) => console.error('Error fetching storefront homepage:', err))
      .finally(() => setLoading(false));

    // Fetch published blogs
    axios
      .get('/api/blog/published')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setBlogs(res.data.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  // Hero carousel auto-timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />
      <StorefrontPopup />

      <main className="flex-1 space-y-12">
        {/* 1. Hero Banner Slider */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden aspect-[16/7] md:aspect-[16/6] bg-slate-900 shadow-md">
            {banners.length > 0 ? (
              banners.map((b, idx) => (
                <div
                  key={b._id || idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <Link to={b.link || '/shop'} className="block w-full h-full">
                    <img
                      src={b.image}
                      alt={b.alt || 'Storefront Promotion'}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://res.cloudinary.com/dmcgfwmuf/image/upload/v1761894276/banners/etanztngb40zfk57dap3.webp';
                      }}
                    />
                  </Link>
                </div>
              ))
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 flex items-center justify-center p-8 text-center text-white">
                <div className="space-y-4 max-w-lg">
                  <span className="inline-block px-3 py-1 bg-blue-500/30 text-blue-300 text-xs font-bold rounded-full border border-blue-400/30">
                    Grand Summer Deals 2026
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                    Premium Grooming & Personal Tech
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Original VGR, Kemei & Dingling trimmers with fast Cash on Delivery across Pakistan.
                  </p>
                  <div>
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-500/30"
                    >
                      <span>Explore Catalog</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Slider navigation buttons */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-xs transition"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-xs transition"
                  aria-label="Next Slide"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/50'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 2. Category Browse Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Shop by Category
              </h2>
              <p className="text-xs text-gray-500">Explore authentic products by department</p>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat._id}
                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="group bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition text-center flex flex-col items-center justify-center space-y-2.5"
              >
                <div className="w-16 h-16 rounded-xl bg-blue-50/50 flex items-center justify-center p-2 group-hover:scale-105 transition overflow-hidden">
                  {cat.Image || cat.image ? (
                    <img
                      src={cat.Image || cat.image}
                      alt={cat.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                  ) : (
                    <Sparkles className="w-8 h-8 text-blue-500" />
                  )}
                </div>
                <h3 className="font-bold text-xs text-gray-900 group-hover:text-blue-600 truncate w-full transition">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Featured Products Showcase */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Featured Products
                </h2>
                <p className="text-xs text-gray-500">Hand-picked top rated models in stock right now</p>
              </div>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
            >
              <span>See More</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product) => {
              const saveAmount = (product.price || product.salePrice) - product.salePrice;
              return (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-lg transition flex flex-col justify-between overflow-hidden group"
                >
                  {/* Image & Discount Badge */}
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <Link to={`/product/${product.slug}`} className="block w-full h-full">
                      <img
                        src={product.images?.[0]?.url || product.image}
                        alt={product.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </Link>
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                      {saveAmount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-sm">
                          Save Rs. {saveAmount.toLocaleString()}
                        </span>
                      )}
                      {product.inStock && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md shadow-sm">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body & Pricing */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {product.brand && (
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                          {product.brand}
                        </p>
                      )}
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-bold text-xs sm:text-sm text-gray-900 hover:text-blue-600 line-clamp-2 transition leading-snug"
                      >
                        {product.title}
                      </Link>
                      <div className="flex items-center gap-1 mt-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-[10px] text-gray-400 font-semibold ml-1">
                          ({product.averageRating || 5}.0)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-extrabold text-sm sm:text-base text-gray-900">
                            Rs. {product.salePrice.toLocaleString()}
                          </span>
                          {product.price > product.salePrice && (
                            <span className="text-[11px] text-gray-400 line-through">
                              Rs. {product.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(product, 1)}
                        className="p-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                        title="Add to Cart"
                      >
                        <ShoppingBag size={14} />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Value Proposition Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left max-w-xl">
              <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
                Safe Online Shopping In Pakistan
              </span>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight">
                Cash On Delivery Available Nationwide!
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Pay only when the package arrives at your doorstep. Verified authentic products, instant tracking via Leopards & PostEx, and 7-day hassle-free replacement warranty.
              </p>
            </div>
            <div className="shrink-0 flex gap-3">
              <Link
                to="/shop"
                className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md"
              >
                Shop Now
              </Link>
              <Link
                to="/track-order"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition border border-white/20"
              >
                Track Order
              </Link>
            </div>
          </div>
        </section>

        {/* 5. New Arrivals Grid */}
        {newProducts.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    New Arrivals
                  </h2>
                  <p className="text-xs text-gray-500">Fresh stock just added to our central warehouse</p>
                </div>
              </div>
              <Link
                to="/shop"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
              >
                <span>Browse All</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {newProducts.slice(0, 4).map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-lg transition flex flex-col justify-between overflow-hidden group"
                >
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <Link to={`/product/${product.slug}`} className="block w-full h-full">
                      <img
                        src={product.images?.[0]?.url || product.image}
                        alt={product.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </Link>
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-sm">
                      NEW
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-bold text-xs sm:text-sm text-gray-900 hover:text-blue-600 line-clamp-2 transition leading-snug"
                      >
                        {product.title}
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-gray-900">
                        Rs. {product.salePrice.toLocaleString()}
                      </span>
                      <button
                        onClick={() => addToCart(product, 1)}
                        className="p-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <ShoppingBag size={14} />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Blog & Grooming Guides */}
        {blogs.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Grooming Guides & Articles
                </h2>
                <p className="text-xs text-gray-500">Expert tips on hair clippers, shavers, and styling</p>
              </div>
              <Link
                to="/blogs"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
              >
                <span>Read All Articles</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogs.map((b) => (
                <Link
                  key={b._id}
                  to={`/blogs/${b.slug}`}
                  className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col group"
                >
                  <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                    <img
                      src={b.featuredImage || b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {b.category || 'Lifestyle'}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition mt-2 line-clamp-2">
                        {b.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                        {b.excerpt || 'Read more in our comprehensive grooming buyer guide...'}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{b.author || 'Etimad Editorial'}</span>
                      <span>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontHome;
