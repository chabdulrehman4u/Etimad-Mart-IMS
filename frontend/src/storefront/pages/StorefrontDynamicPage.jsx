import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, FileText, ArrowLeft } from 'lucide-react';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';
import CartDrawer from '../components/CartDrawer';

const StorefrontDynamicPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`/api/dynamic-page/${slug}`)
      .then((res) => {
        if (res.data) setPage(res.data);
      })
      .catch(() => {
        // Fallback default templates if not in DB
        const fallbackTitles = {
          'return-policy': 'Returns & Replacement Warranty Policy',
          'shipping-policy': 'Shipping & Delivery Nationwide',
          'privacy-policy': 'Customer Privacy & Data Protection',
          terms: 'Terms & Conditions of Service',
          'about-us': 'About Etimad Mart',
        };
        const fallbackContent = {
          'return-policy': 'We offer a 7-day checking warranty on all grooming electronics and trimmers across Pakistan. If an item arrives damaged or defective, contact our customer helpline immediately on WhatsApp (0300-1234567) with unboxing photos for a quick replacement.',
          'shipping-policy': 'Orders are dispatched within 24 hours from our central warehouse via Leopards Courier Service, PostEx, or Trax. Standard delivery takes 2 to 4 working days. Cash on Delivery is available for all destinations.',
          'privacy-policy': 'Your personal details, contact numbers, and delivery addresses are kept strictly confidential and only shared with verified courier logistics partners for parcel delivery.',
          terms: 'By ordering from Etimad Mart, you agree to our fair usage, returns, and delivery terms. All prices are in PKR (Pakistani Rupee) inclusive of applicable taxes.',
          'about-us': 'Etimad Mart is Pakistan’s trusted omnichannel store providing high quality authentic grooming tech, shavers, and daily lifestyle essentials.',
        };

        if (fallbackTitles[slug]) {
          setPage({
            title: fallbackTitles[slug],
            content: fallbackContent[slug],
          });
        }
      })
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
          <span className="text-gray-700 font-medium capitalize">{page?.title || slug}</span>
        </div>

        {loading ? (
          <div className="h-64 bg-gray-200/60 rounded-3xl animate-pulse"></div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-12 shadow-md space-y-6">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 border-b pb-4">
              {page?.title || 'Store Information'}
            </h1>

            <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
              {page?.content || 'Content is being updated. Please check back shortly.'}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
                <ArrowLeft size={14} />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
};

export default StorefrontDynamicPage;
