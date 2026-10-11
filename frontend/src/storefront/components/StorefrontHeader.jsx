import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  Phone,
  Truck,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Tag,
  BookOpen,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const StorefrontHeader = () => {
  const { cartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [topbar, setTopbar] = useState({
    message: '🚚 Free Delivery Nationwide on orders above Rs. 3,500 | 100% Original Products Guaranteed!',
    phone: '0300-1234567',
    isActive: true,
  });
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch active topbar
    axios
      .get('/api/topbar')
      .then((res) => {
        if (res.data) setTopbar(res.data);
      })
      .catch(() => {});

    // Fetch categories for menu
    axios
      .get('/api/category/all')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCategories(res.data.filter((c) => c.menu !== false).slice(0, 8));
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
      {/* 1. Top Announcement Bar */}
      {topbar.isActive && (
        <div className="bg-slate-900 text-white text-xs py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 truncate">
              <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-600 rounded text-[10px] font-bold tracking-wider uppercase">
                Notice
              </span>
              <p className="truncate font-medium">{topbar.message}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {topbar.phone && (
                <a
                  href={`tel:${topbar.phone}`}
                  className="hidden md:flex items-center gap-1.5 text-slate-300 hover:text-white transition"
                >
                  <Phone size={12} className="text-emerald-400" />
                  <span>{topbar.phone}</span>
                </a>
              )}
              <Link
                to="/track-order"
                className="text-slate-300 hover:text-white font-medium transition flex items-center gap-1"
              >
                <Truck size={12} />
                <span>Track Order</span>
              </Link>
              {user && (
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <span>⚡ Admin Suite</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Mobile Menu Button & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
              E
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-gray-900">Etimad</span>
                <span className="font-extrabold text-xl tracking-tight text-blue-600">Mart</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase -mt-1">
                Official Store
              </p>
            </div>
          </Link>
        </div>

        {/* Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4 relative">
          <input
            type="text"
            placeholder="Search trimmers, shavers, hair clippers, electronics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <button
            type="submit"
            className="absolute right-1.5 top-1 bottom-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition"
          >
            Search
          </button>
        </form>

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          <Link
            to="/shop"
            className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg transition"
          >
            <span>All Products</span>
          </Link>
          <Link
            to="/blogs"
            className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg transition"
          >
            <span>Blogs</span>
          </Link>

          {/* Cart Icon */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-gray-800 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition flex items-center gap-2"
            aria-label="View shopping cart"
          >
            <div className="relative">
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline-block text-xs font-bold text-gray-700">Cart</span>
          </button>
        </div>
      </div>

      {/* 3. Categories Bar (Desktop) */}
      <div className="hidden md:block bg-gray-50/80 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-medium text-gray-700 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-6 shrink-0">
            <Link to="/shop" className="hover:text-blue-600 font-bold text-gray-900 transition">
              ⚡ Flash Deals
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="hover:text-blue-600 transition whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 text-emerald-700 font-semibold pl-4">
            <ShieldCheck size={14} />
            <span>7 Days Check Warranty</span>
          </div>
        </div>
      </div>

      {/* 4. Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-4 shadow-xl">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 text-white rounded text-xs font-semibold"
            >
              Search
            </button>
          </form>

          <div className="space-y-1">
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg"
            >
              <span>Explore All Products</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
            <Link
              to="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg"
            >
              <span>Track Your Order</span>
              <Truck size={16} className="text-gray-400" />
            </Link>
            <Link
              to="/blogs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg"
            >
              <span>Grooming Guides & Blogs</span>
              <BookOpen size={16} className="text-gray-400" />
            </Link>
            {user && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg"
              >
                <span>Switch to Admin Command Center</span>
                <ExternalLink size={16} />
              </Link>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Popular Categories</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 truncate"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default StorefrontHeader;
