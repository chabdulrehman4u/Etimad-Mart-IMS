import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Megaphone,
  Bell,
  Sliders,
  Save,
  RefreshCw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = '/api';

const StorefrontCMS = () => {
  const [activeTab, setActiveTab] = useState('popup'); // 'popup' | 'topbar' | 'footer'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Popup State
  const [popup, setPopup] = useState({
    title: 'Special Ramadan & Eid Offer!',
    content: 'Get 10% instant discount on your order today using code ETIMAD10',
    couponCode: 'ETIMAD10',
    image: '',
    isActive: true,
  });

  // Topbar State
  const [topbar, setTopbar] = useState({
    message: '🚚 Free Delivery Nationwide on orders above Rs. 3,500 | 100% Original Products Guaranteed!',
    phone: '0300-1234567',
    isActive: true,
  });

  // Footer State
  const [footer, setFooter] = useState({
    description: 'Etimad Mart is Pakistan leading online and retail store for trimmers, shavers, electronics, and daily essentials with fast nationwide cash on delivery.',
    phone: '0300-1234567',
    whatsapp: '0300-1234567',
    email: 'info@etimadmart.com',
    address: 'Main Commercial Market, Lahore, Pakistan',
    copyright: '© 2026 Etimad Mart. All rights reserved. Powered by Etimad Suite.',
    facebook: 'https://facebook.com/etimadmart',
    instagram: 'https://instagram.com/etimadmart',
    tiktok: 'https://tiktok.com/@etimadmart',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [popupRes, topbarRes, footerRes] = await Promise.all([
        axios.get(`${API_BASE}/popup/active`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/topbar`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/footer`).catch(() => ({ data: null })),
      ]);

      if (popupRes.data) {
        setPopup((prev) => ({
          ...prev,
          title: popupRes.data.title || prev.title,
          content: popupRes.data.content || prev.content,
          couponCode: popupRes.data.couponCode || prev.couponCode,
          image: popupRes.data.image || '',
          isActive: popupRes.data.isActive !== false,
        }));
      }

      if (topbarRes.data) {
        setTopbar((prev) => ({
          ...prev,
          message: topbarRes.data.message || prev.message,
          phone: topbarRes.data.phone || prev.phone,
          isActive: topbarRes.data.isActive !== false,
        }));
      }

      if (footerRes.data) {
        setFooter((prev) => ({
          ...prev,
          description: footerRes.data.description || prev.description,
          phone: footerRes.data.phone || prev.phone,
          whatsapp: footerRes.data.whatsapp || prev.whatsapp,
          email: footerRes.data.email || prev.email,
          address: footerRes.data.address || prev.address,
          copyright: footerRes.data.copyright || prev.copyright,
          facebook: footerRes.data.facebook || prev.facebook,
          instagram: footerRes.data.instagram || prev.instagram,
          tiktok: footerRes.data.tiktok || prev.tiktok,
        }));
      }
    } catch (err) {
      console.error('Error fetching storefront settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePopup = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.post(`${API_BASE}/popup`, popup, { withCredentials: true });
      showToast('Announcement popup saved and updated!', 'success');
    } catch (err) {
      showToast('Failed to save popup', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTopbar = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/topbar`, topbar, { withCredentials: true });
      showToast('Top Bar ticker saved and published!', 'success');
    } catch (err) {
      showToast('Failed to update Top Bar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFooter = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/footer`, footer, { withCredentials: true });
      showToast('Storefront footer settings saved!', 'success');
    } catch (err) {
      showToast('Failed to update Footer', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Storefront Appearance & Popups</h1>
            <p className="text-sm text-gray-500">
              Configure visitor announcements, promotional top ticker, and store contact footer
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200 self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('popup')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'popup'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          Announcement Popup
        </button>
        <button
          onClick={() => setActiveTab('topbar')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'topbar'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Top Bar Ticker
        </button>
        <button
          onClick={() => setActiveTab('footer')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'footer'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Footer & Social Links
        </button>
      </div>

      {/* Tab 1: Announcement Popup */}
      {activeTab === 'popup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <form onSubmit={handleSavePopup} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Storefront Announcement Popup</h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Popup Headline Title *
                </label>
                <input
                  type="text"
                  required
                  value={popup.title}
                  onChange={(e) => setPopup({ ...popup, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Announcement Message Body
                </label>
                <textarea
                  rows={3}
                  value={popup.content}
                  onChange={(e) => setPopup({ ...popup, content: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Featured Coupon Code
                  </label>
                  <input
                    type="text"
                    value={popup.couponCode}
                    onChange={(e) => setPopup({ ...popup, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Popup Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={popup.image}
                    onChange={(e) => setPopup({ ...popup, image: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="popupActive"
                  checked={popup.isActive}
                  onChange={(e) => setPopup({ ...popup, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="popupActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Display announcement modal to new store visitors
                </label>
              </div>

              <div className="pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save & Publish Popup'}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 flex flex-col justify-center items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Live Preview</span>
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">{popup.title || 'Special Offer!'}</h3>
              <p className="text-xs text-gray-600">{popup.content || 'Get discount on your order today.'}</p>
              {popup.couponCode && (
                <div className="py-2 px-4 bg-emerald-50 border border-dashed border-emerald-300 text-emerald-800 font-mono font-bold rounded-lg text-sm">
                  {popup.couponCode}
                </div>
              )}
              <div className="pt-2">
                <span className="block w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">
                  Shop Now
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Top Bar Ticker */}
      {activeTab === 'topbar' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-3xl">
          <form onSubmit={handleSaveTopbar} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Storefront Announcement Bar</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Scrolling / Header Announcement Ticker Text *
              </label>
              <textarea
                rows={3}
                required
                value={topbar.message}
                onChange={(e) => setTopbar({ ...topbar, message: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Customer Support Helpline (Shown in Header)
              </label>
              <input
                type="text"
                value={topbar.phone}
                onChange={(e) => setTopbar({ ...topbar, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="topbarActive"
                checked={topbar.isActive}
                onChange={(e) => setTopbar({ ...topbar, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="topbarActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                Show announcement ticker at the top of the website
              </label>
            </div>

            <div className="pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Publish Top Bar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Footer Settings */}
      {activeTab === 'footer' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-3xl">
          <form onSubmit={handleSaveFooter} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Footer Details & Contact Info</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Store About Description
              </label>
              <textarea
                rows={3}
                value={footer.description}
                onChange={(e) => setFooter({ ...footer, description: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Support Phone
                </label>
                <input
                  type="text"
                  value={footer.phone}
                  onChange={(e) => setFooter({ ...footer, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  WhatsApp Contact
                </label>
                <input
                  type="text"
                  value={footer.whatsapp}
                  onChange={(e) => setFooter({ ...footer, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={footer.email}
                  onChange={(e) => setFooter({ ...footer, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Showroom / Warehouse Address
                </label>
                <input
                  type="text"
                  value={footer.address}
                  onChange={(e) => setFooter({ ...footer, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Facebook Page
                </label>
                <input
                  type="url"
                  value={footer.facebook}
                  onChange={(e) => setFooter({ ...footer, facebook: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Instagram
                </label>
                <input
                  type="url"
                  value={footer.instagram}
                  onChange={(e) => setFooter({ ...footer, instagram: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  TikTok
                </label>
                <input
                  type="url"
                  value={footer.tiktok}
                  onChange={(e) => setFooter({ ...footer, tiktok: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Copyright Note
              </label>
              <input
                type="text"
                value={footer.copyright}
                onChange={(e) => setFooter({ ...footer, copyright: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Footer Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StorefrontCMS;

