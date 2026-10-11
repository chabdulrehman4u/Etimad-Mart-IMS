import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Calendar, User, ArrowLeft, BookOpen } from 'lucide-react';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontBlogPost = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`/api/blog/${slug}`)
      .then((res) => {
        if (res.data) setBlog(res.data);
      })
      .catch((err) => console.error('Error fetching blog post:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800">
      <StorefrontHeader />
      <CartDrawer />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight size={12} />
          <Link to="/blogs" className="hover:text-blue-600">Blogs</Link>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium truncate max-w-xs">{blog?.title || slug}</span>
        </div>

        {loading ? (
          <div className="h-96 bg-gray-200/60 rounded-3xl animate-pulse"></div>
        ) : !blog ? (
          <div className="bg-white rounded-3xl p-12 text-center space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Article Not Found</h2>
            <Link to="/blogs" className="inline-block text-xs font-bold text-blue-600">
              Return to Blogs
            </Link>
          </div>
        ) : (
          <article className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-12 shadow-md space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-wider">
                {blog.category || 'Grooming Guide'}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight">
                {blog.title}
              </h1>
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1 font-semibold text-gray-700">
                  <User size={13} />
                  {blog.author || 'Etimad Editorial'}
                </span>
                <span>•</span>
                <span>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'Recent'}</span>
              </div>
            </div>

            {blog.featuredImage && (
              <div className="aspect-[16/8] rounded-2xl overflow-hidden bg-gray-100">
                <img src={blog.featuredImage} alt={blog.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed whitespace-pre-line pt-2">
              {blog.content}
            </div>

            <div className="pt-8 border-t border-gray-100 flex justify-between items-center">
              <Link
                to="/blogs"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
              >
                <ArrowLeft size={14} />
                <span>Back to All Articles</span>
              </Link>
              <Link
                to="/shop"
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
              >
                Shop Recommended Products
              </Link>
            </div>
          </article>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontBlogPost;
