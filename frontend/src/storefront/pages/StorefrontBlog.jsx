import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Calendar, ArrowRight, User } from 'lucide-react';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontBlog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/blog/published')
      .then((res) => {
        if (Array.isArray(res.data)) setBlogs(res.data);
      })
      .catch((err) => console.error('Error fetching blogs:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Grooming Guides & Lifestyle Articles
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
            Expert recommendations on choosing the right trimmers, shavers, maintenance tips, and personal grooming.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200/60 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-16 text-center space-y-2">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-bold text-gray-900">Articles Coming Soon</h3>
            <p className="text-xs text-gray-500">Check back shortly for newly published guides.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((b) => (
              <Link
                key={b._id}
                to={`/blogs/${b.slug}`}
                className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-2xs hover:shadow-lg transition flex flex-col group"
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
                <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {b.category || 'Grooming'}
                    </span>
                    <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition mt-2 leading-snug line-clamp-2">
                      {b.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {b.excerpt || 'Read our in-depth advice and comparison details...'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                      <User size={13} />
                      {b.author || 'Etimad Editorial'}
                    </span>
                    <span>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Recent'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontBlog;
