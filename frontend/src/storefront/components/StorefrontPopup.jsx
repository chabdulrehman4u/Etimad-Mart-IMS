import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StorefrontPopup = () => {
  const [popup, setPopup] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only display once per session
    const seen = sessionStorage.getItem('etimad_popup_seen');
    if (seen) return;

    axios
      .get('/api/popup/active')
      .then((res) => {
        if (res.data && res.data.isActive) {
          setPopup(res.data);
          // Show popup after 1.5s delay
          const timer = setTimeout(() => {
            setIsOpen(true);
            sessionStorage.setItem('etimad_popup_seen', 'true');
          }, 1500);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen || !popup) return null;

  const handleCopy = () => {
    if (popup.couponCode) {
      navigator.clipboard.writeText(popup.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-700 bg-white/80 hover:bg-white rounded-full transition shadow-sm"
        >
          <X size={18} />
        </button>

        {popup.image ? (
          <div className="h-44 w-full bg-slate-900 overflow-hidden">
            <img src={popup.image} alt={popup.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center text-white">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-amber-300">
              <Sparkles size={28} />
            </div>
          </div>
        )}

        <div className="p-6 text-center space-y-4">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">{popup.title || 'Exclusive Discount!'}</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{popup.content}</p>
          </div>

          {popup.couponCode && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 border-dashed rounded-xl flex items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Use Promo Code</p>
                <p className="font-mono font-black text-emerald-900 text-base">{popup.couponCode}</p>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/shop');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <span>Explore Deals & Claim Offer</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPopup;
