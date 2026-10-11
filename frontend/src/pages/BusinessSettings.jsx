import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Store,
  Phone,
  Mail,
  MapPin,
  Printer,
  Truck,
  CheckCircle,
  Save,
  Globe,
  ShoppingBag,
  Briefcase,
  FileText,
  BadgeCheck,
  Percent,
  Copy,
  Check,
  ExternalLink,
  Code2,
} from 'lucide-react';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import { getCurrentTenant, updateCurrentTenant } from '../services/api';
import { baseURL } from '../services/baseURL';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const BusinessSettings = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    logoUrl: '',
    receiptHeader: '',
    receiptFooter: '',
    taxNumber: '',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    channelsEnabled: {
      retail: true,
      wholesale: true,
      online: true,
    },
    settings: {
      pos: {
        paperSize: '80mm',
        printUrduText: true,
        autoPrintOnSale: false,
      },
      couriers: {
        defaultCourier: 'Leopards',
        leopards: {
          apiKey: '',
          shipperName: '',
          shipperPhone: '',
          originCity: '697',
        },
      },
    },
  });

  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['currentTenant'],
    queryFn: async () => {
      const res = await getCurrentTenant();
      return res.data?.tenant || null;
    },
  });

  useEffect(() => {
    if (tenantData) {
      setFormData({
        name: tenantData.name || '',
        slug: tenantData.slug || '',
        tagline: tenantData.tagline || '',
        phone: tenantData.phone || '',
        email: tenantData.email || '',
        address: tenantData.address || '',
        city: tenantData.city || '',
        logoUrl: tenantData.logoUrl || '',
        receiptHeader: tenantData.receiptHeader || '',
        receiptFooter: tenantData.receiptFooter || '',
        taxNumber: tenantData.taxNumber || '',
        currency: tenantData.currency || 'PKR',
        currencySymbol: tenantData.currencySymbol || 'Rs.',
        channelsEnabled: {
          retail: tenantData.channelsEnabled?.retail ?? true,
          wholesale: tenantData.channelsEnabled?.wholesale ?? true,
          online: tenantData.channelsEnabled?.online ?? true,
        },
        settings: {
          pos: {
            paperSize: tenantData.settings?.pos?.paperSize || '80mm',
            printUrduText: tenantData.settings?.pos?.printUrduText ?? true,
            autoPrintOnSale: tenantData.settings?.pos?.autoPrintOnSale ?? false,
          },
          couriers: {
            defaultCourier: tenantData.settings?.couriers?.defaultCourier || 'Leopards',
            leopards: {
              apiKey: tenantData.settings?.couriers?.leopards?.apiKey || '',
              shipperName: tenantData.settings?.couriers?.leopards?.shipperName || '',
              shipperPhone: tenantData.settings?.couriers?.leopards?.shipperPhone || '',
              originCity: tenantData.settings?.couriers?.leopards?.originCity || '697',
            },
          },
        },
      });
    }
  }, [tenantData]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateCurrentTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTenant'] });
      toast.success('Business settings saved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-gray-500 text-sm animate-pulse">Loading Etimad Suite business profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Etimad Suite SaaS
            </span>
            {tenantData?.isFlagship && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <BadgeCheck size={13} /> Flagship Store
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{formData.name || 'Store Settings'}</h1>
          <p className="text-sm text-slate-300 mt-1">
            Configure omnichannel selling channels (Retail POS, Wholesale, Online Storefront), receipt branding, and logistics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            form="business-settings-form"
            disabled={updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 shadow-lg"
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <form id="business-settings-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Omnichannel Commerce Switches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="text-indigo-600" size={18} />
              Omnichannel Sales Channels
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Retail POS */}
              <div
                onClick={() =>
                  setFormData({
                    ...formData,
                    channelsEnabled: {
                      ...formData.channelsEnabled,
                      retail: !formData.channelsEnabled.retail,
                    },
                  })
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.channelsEnabled.retail
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <ShoppingBag size={20} />
                    </div>
                    <span className="font-semibold text-gray-900">Retail POS</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.channelsEnabled.retail}
                    onChange={() => {}}
                    className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Barcode scanner counter sales, fast cashier checkout, and thermal cash till receipts.
                </p>
              </div>

              {/* Wholesale B2B */}
              <div
                onClick={() =>
                  setFormData({
                    ...formData,
                    channelsEnabled: {
                      ...formData.channelsEnabled,
                      wholesale: !formData.channelsEnabled.wholesale,
                    },
                  })
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.channelsEnabled.wholesale
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Briefcase size={20} />
                    </div>
                    <span className="font-semibold text-gray-900">Wholesale B2B</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.channelsEnabled.wholesale}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Bulk order pricing tiers, customer credit ledgers, delivery challans, and PO tracking.
                </p>
              </div>

              {/* Online Storefront */}
              <div
                onClick={() =>
                  setFormData({
                    ...formData,
                    channelsEnabled: {
                      ...formData.channelsEnabled,
                      online: !formData.channelsEnabled.online,
                    },
                  })
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.channelsEnabled.online
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <Globe size={20} />
                    </div>
                    <span className="font-semibold text-gray-900">Online Storefront</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.channelsEnabled.online}
                    onChange={() => {}}
                    className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Direct customer web store, shopping cart, cash-on-delivery (COD), and automated courier bookings.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Business Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="text-indigo-600" size={18} />
                Business Identity
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Store / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Etimad Mart"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Store URL Slug (Unique Identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    disabled
                    className="w-full text-sm bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-500"
                  />
                  <span className="text-[11px] text-gray-400">Used for storefront routing and APIs</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    National Tax Number (NTN / STRN)
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    placeholder="e.g. 1234567-8"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tagline / Slogan</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Trusted Online Shopping Store in Pakistan"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Contact & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="text-indigo-600" size={18} />
                Contact & Warehouse Location
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Official Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="03071111832"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@etimadmart.com"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City / Region</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Zahir Pir / Khanpur"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Warehouse / Shop Physical Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street / Market address for invoices & courier pick-up"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Thermal Receipt & Hardware Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="text-indigo-600" size={18} />
                Thermal Printer & Bill Formatting
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Thermal Paper Size</label>
                  <select
                    value={formData.settings.pos.paperSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: {
                          ...formData.settings,
                          pos: { ...formData.settings.pos, paperSize: e.target.value },
                        },
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="80mm">80mm (Standard POS)</option>
                    <option value="58mm">58mm (Compact Receipt)</option>
                    <option value="A4">A4 Full Page Invoice</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.pos.printUrduText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            pos: { ...formData.settings.pos, printUrduText: e.target.checked },
                          },
                        })
                      }
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    Enable Urdu Nastaleeq on Receipts
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Header Text</label>
                <input
                  type="text"
                  value={formData.receiptHeader}
                  onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                  placeholder="e.g. ETIMAD MART - Zahir Pir Branch"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Footer / Policy Note</label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="Thank you for shopping! Exchange allowed within 3 days."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </CardBody>
          </Card>

          {/* Courier & Shipping Hub */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="text-indigo-600" size={18} />
                Logistics & Default Couriers
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Courier Partner</label>
                <select
                  value={formData.settings.couriers.defaultCourier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        couriers: { ...formData.settings.couriers, defaultCourier: e.target.value },
                      },
                    })
                  }
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="Leopards">Leopards Courier Service (LCS)</option>
                  <option value="PostEx">PostEx</option>
                  <option value="Trax">Trax Logistics</option>
                  <option value="TCS">TCS Express</option>
                  <option value="CallCourier">CallCourier</option>
                  <option value="PakistanPost">Pakistan Post</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-600" />
                  Active Couriers in Pakistan
                </div>
                <p>
                  Integrated couriers generate automated tracking numbers (CNs) and support physical return check-ins
                  with strict stock restoration locks.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Online Storefront & Web Bridge Card */}
        <Card className="border-indigo-200/80 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 border-b border-indigo-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                  <Globe size={18} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">
                    Online Storefront & Web Bridge (REST API Integration)
                  </CardTitle>
                  <p className="text-xs text-gray-500">
                    Connect your public e-commerce store (<code className="text-indigo-600 font-semibold">etimadmart.com</code>) to central IMS stock in real-time.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Real-Time Stock Sync Active
              </span>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Public Tenant Slug</span>
                <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{formData.slug || 'etimadmart'}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Live Customer Storefront</span>
                <p className="text-sm font-bold text-indigo-600 mt-0.5">
                  <a href="https://etimadmart.com" target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                    https://etimadmart.com <ExternalLink size={12} />
                  </a>
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Public API Root</span>
                <p className="text-xs font-medium text-slate-600 font-mono mt-0.5 truncate" title={`${baseURL}/storefront/${formData.slug || 'etimadmart'}`}>
                  {`${baseURL}/storefront/${formData.slug || 'etimadmart'}`}
                </p>
              </div>
            </div>

            {/* Endpoints Table / Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Code2 size={15} className="text-indigo-600" />
                Storefront API Endpoints
              </h4>

              <div className="space-y-3">
                {/* 1. Catalog API */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GET</span>
                      <code className="text-xs font-mono font-semibold text-gray-900 break-all">
                        {`${baseURL}/storefront/${formData.slug || 'etimadmart'}/catalog`}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy('catalog', `${baseURL}/storefront/${formData.slug || 'etimadmart'}/catalog`)}
                        className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition"
                      >
                        {copiedKey === 'catalog' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        {copiedKey === 'catalog' ? 'Copied' : 'Copy URL'}
                      </button>
                      <a
                        href={`${baseURL}/storefront/${formData.slug || 'etimadmart'}/catalog`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition"
                      >
                        <ExternalLink size={12} /> Test Live
                      </a>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Returns public inventory catalog with real-time stock balances and online pricing. Use this to render product listings on <code className="text-slate-800">etimadmart.com</code>.
                  </p>
                </div>

                {/* 2. Place Order API */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">POST</span>
                      <code className="text-xs font-mono font-semibold text-gray-900 break-all">
                        {`${baseURL}/storefront/${formData.slug || 'etimadmart'}/orders`}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('orders', `${baseURL}/storefront/${formData.slug || 'etimadmart'}/orders`)}
                      className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition"
                    >
                      {copiedKey === 'orders' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copiedKey === 'orders' ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Direct COD checkout endpoint. Automatically verifies physical stock, decrements central inventory, creates an Online Order (<code className="text-slate-800">WEB-1001</code>), and alerts the warehouse dispatch team.
                  </p>
                </div>

                {/* 3. Order Tracking API */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GET</span>
                      <code className="text-xs font-mono font-semibold text-gray-900 break-all">
                        {`${baseURL}/storefront/${formData.slug || 'etimadmart'}/track/:orderNumberOrPhone`}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('track', `${baseURL}/storefront/${formData.slug || 'etimadmart'}/track/WEB-1001`)}
                      className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition"
                    >
                      {copiedKey === 'track' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copiedKey === 'track' ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Live parcel tracking endpoint for customers to track order verification, dispatch, and courier CN (Leopards / PostEx / Trax) on <code className="text-slate-800">etimadmart.com</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Integration Instructions */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-indigo-900">
                <CheckCircle size={15} className="text-indigo-600" />
                How Real-Time Sync Works:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>When a sale is made in retail POS or wholesale, central inventory decrements immediately, reflecting instantaneously in the online catalog API.</li>
                <li>When an online shopper places an order on <span className="font-medium text-slate-900">etimadmart.com</span>, stock is decremented immediately to prevent overselling.</li>
                <li>Dispatch teams view incoming orders under <span className="font-semibold text-indigo-700">Online Store Orders</span> in the IMS, verify via WhatsApp, and generate thermal courier shipping labels.</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
};

export default BusinessSettings;

