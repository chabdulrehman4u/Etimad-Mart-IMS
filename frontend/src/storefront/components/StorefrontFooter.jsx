import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Truck,
  ShieldCheck,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';
import axios from 'axios';

const StorefrontFooter = () => {
  const [footer, setFooter] = useState({
    description: 'Etimad Mart is Pakistan’s leading online and retail store for authentic hair trimmers, shavers, styling tools, electronics, and daily essentials with fast nationwide cash on delivery.',
    phone: '0300-1234567',
    whatsapp: '0300-1234567',
    email: 'info@etimadmart.com',
    address: 'Main Commercial Market, Lahore, Pakistan',
    copyright: '© 2026 Etimad Mart. All rights reserved. Powered by Etimad Suite.',
    facebook: 'https://facebook.com/etimadmart',
    instagram: 'https://instagram.com/etimadmart',
    tiktok: 'https://tiktok.com/@etimadmart',
  });

  useEffect(() => {
    axios
      .get('/api/footer')
      .then((res) => {
        if (res.data) setFooter((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-900 mt-16">
      {/* 1. Value Proposition Pillars */}
      <div className="border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-900/50">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Nationwide Delivery</h4>
              <p className="text-xs text-slate-500">Fast 2-4 days COD via Leopards & PostEx</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-900/50">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">100% Original</h4>
              <p className="text-xs text-slate-500">Directly sourced brand authentic stock</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-900/50">
              <RotateCcw size={22} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">7 Days Check Warranty</h4>
              <p className="text-xs text-slate-500">Hassle-free replacement guarantee</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-950/60 text-purple-400 rounded-xl border border-purple-900/50">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Quick Support</h4>
              <p className="text-xs text-slate-500">Instant WhatsApp order confirmation</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Bio */}
        <div className="lg:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
              E
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl text-white">Etimad</span>
                <span className="font-extrabold text-xl text-blue-500">Mart</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                Pakistan’s Trusted Commerce
              </p>
            </div>
          </Link>
          <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
            {footer.description}
          </p>

          <div className="pt-2 space-y-2 text-xs">
            {footer.address && (
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <span>{footer.address}</span>
              </div>
            )}
            {footer.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-emerald-500 shrink-0" />
                <a href={`tel:${footer.phone}`} className="hover:text-white transition">
                  {footer.phone}
                </a>
              </div>
            )}
            {footer.email && (
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-amber-500 shrink-0" />
                <a href={`mailto:${footer.email}`} className="hover:text-white transition">
                  {footer.email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/shop" className="hover:text-blue-400 transition">
                All Products Catalog
              </Link>
            </li>
            <li>
              <Link to="/track-order" className="hover:text-blue-400 transition">
                Track Online Order
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-blue-400 transition">
                Shopping Cart
              </Link>
            </li>
            <li>
              <Link to="/blogs" className="hover:text-blue-400 transition">
                Buyer Guides & Articles
              </Link>
            </li>
          </ul>
        </div>

        {/* Popular Categories */}
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Categories</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/shop?category=Trimmers+and+Shavers" className="hover:text-blue-400 transition">
                Trimmers & Shavers
              </Link>
            </li>
            <li>
              <Link to="/shop?category=Personal+Care" className="hover:text-blue-400 transition">
                Personal Care & Grooming
              </Link>
            </li>
            <li>
              <Link to="/shop?category=Electronics" className="hover:text-blue-400 transition">
                Electronics & Gadgets
              </Link>
            </li>
            <li>
              <Link to="/shop?category=Mehndi+Stickers" className="hover:text-blue-400 transition">
                Mehndi Stickers
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Care & Policies */}
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Customer Care</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/page/return-policy" className="hover:text-blue-400 transition">
                Returns & Refund Policy
              </Link>
            </li>
            <li>
              <Link to="/page/shipping-policy" className="hover:text-blue-400 transition">
                Shipping & Delivery Terms
              </Link>
            </li>
            <li>
              <Link to="/page/privacy-policy" className="hover:text-blue-400 transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/page/terms" className="hover:text-blue-400 transition">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 3. Bottom Bar */}
      <div className="border-t border-slate-900 bg-black/40 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>{footer.copyright}</p>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Cash on Delivery (COD)</span>
            <span>•</span>
            <span>Leopards Courier</span>
            <span>•</span>
            <span>PostEx Logistics</span>
            <span>•</span>
            <span>Trax</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StorefrontFooter;
