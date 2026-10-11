import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag,
  Search,
  Filter,
  SlidersHorizontal,
  Star,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontShop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const activeCategory = searchParams.get('category') || 'all';
  const activeSearch = searchParams.get('search') || '';
  const [sortBy, setSortBy] = useState('popular');
  const [inStockOnly, setInStockOnly] = useState(false);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: activeSearch || undefined,
        inStockOnly: inStockOnly ? 'true' : undefined,
      };

      const res = await axios.get('/api/storefront/etimadmart/catalog', { params });
      if (res.data?.products) {
        let list = [...res.data.products];
        if (sortBy === 'price-low') {
          list.sort((a, b) => a.salePrice - b.salePrice);
        } else if (sortBy === 'price-high') {
          list.sort((a, b) => b.salePrice - a.salePrice);
        } else if (sortBy === 'newest') {
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        setProducts(list);
        setTotal(res.data.pagination?.total || list.length);
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch categories
    axios
      .get('/api/category/all')
      .then((res) => {
        if (Array.isArray(res.data)) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [activeCategory, activeSearch, inStockOnly, sortBy]);

  const handleCategorySelect = (catName) => {
    const next = new URLSearchParams(searchParams);
    if (catName === 'all') {
      next.delete('category');
    } else {
      next.set('category', catName);
    }
    setSearchParams(next);
  };

  const handleSearchChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (!val) {
      next.delete('search');
    } else {
      next.set('search', val);
    }
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 w-full">
        {/* Breadcrumb & Title */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Link to="/" className="hover:text-blue-600">Home</Link>
              <span>/</span>
              <span className="text-gray-700 font-medium capitalize">
                {activeCategory !== 'all' ? activeCategory : 'All Products'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {activeCategory !== 'all' ? activeCategory : 'Online Product Catalog'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Showing {products.length} {products.length === 1 ? 'item' : 'items'} available for delivery
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-3 pr-8 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>

            <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </div>

        {/* Categories Bar Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => handleCategorySelect(c.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeCategory === c.name
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-80 bg-gray-200/60 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-16 text-center space-y-3">
            <Search className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-bold text-gray-900">No Products Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              We couldn't find any products matching your search criteria. Try clearing filters or searching for something else.
            </p>
            <button
              onClick={() => {
                setSearchParams({});
                setInStockOnly(false);
              }}
              className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => {
              const saveAmount = (product.price || product.salePrice) - product.salePrice;
              return (
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
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                      {saveAmount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-sm">
                          Save Rs. {saveAmount.toLocaleString()}
                        </span>
                      )}
                      {!product.inStock && (
                        <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-md shadow-sm">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

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
                        disabled={!product.inStock}
                        className="p-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
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
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontShop;
