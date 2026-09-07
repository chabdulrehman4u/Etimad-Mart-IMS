import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JsBarcode from 'jsbarcode';
import { getProducts, getParcels, createParcel, updateParcelStatus, updateParcel, deleteParcel, getBookPOs, lookupBookPO } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useToast } from '../context/ToastContext';
import ScanInput from '../components/ScanInput';
import { Package, Truck, MapPin, Hash, CheckCircle, Edit, Trash2, Printer, ExternalLink } from 'lucide-react';

const makeBarcodeSvg = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, text, {
      format: 'CODE128',
      width: 0.8,
      height: 25,
      displayValue: true,
      margin: 0,
    });
    return svg.outerHTML || '';
  } catch (e) {
    console.error('Error generating PO loadsheet barcode:', e);
    return '';
  }
};

const PO = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const toLocalDateInputValue = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  const [showForm, setShowForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [primaryQuantity, setPrimaryQuantity] = useState(1);
  const today = toLocalDateInputValue(new Date());
  const [bookPOSearch, setBookPOSearch] = useState('');
  const [showBookPOSearch, setShowBookPOSearch] = useState(false);
  const [isBookPOModalOpen, setIsBookPOModalOpen] = useState(false);
  const [selectedBookPO, setSelectedBookPO] = useState(null);
  const [isBookPOScanLoading, setIsBookPOScanLoading] = useState(false);
  const [showReturnScan, setShowReturnScan] = useState(false);
  const [isReturnScanLoading, setIsReturnScanLoading] = useState(false);
  const [form, setForm] = useState({
    trackingNumber: '',
    customerName: '',
    phone: '',
    address: '',
    codAmount: '',
    parcelDate: today,
    status: 'processing',
    paymentStatus: 'unpaid',
    notes: '',
    barcodeValue: '',
  });
  const [filterTracking, setFilterTracking] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [loadsheetDay, setLoadsheetDay] = useState('');
  const [isPrintingLoadsheet, setIsPrintingLoadsheet] = useState(false);

  const formatDateUTC = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { timeZone: 'UTC' });
  };

  const [editModal, setEditModal] = useState({
    isOpen: false,
    parcelId: null,
    productSearch: '',
    showProductSearch: false,
    bookPOSearch: '',
    showBookPOSearch: false,
    selectedProductId: '',
    selectedProducts: [],
    primaryQuantity: 1,
    originalProducts: [],
    form: {
      trackingNumber: '',
      customerName: '',
      phone: '',
      address: '',
      codAmount: '',
      parcelDate: today,
      status: 'processing',
      paymentStatus: 'unpaid',
      notes: ''
    }
  });

  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [productsModalParcel, setProductsModalParcel] = useState(null);

  // Products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await getProducts();
      return res.data || [];
    }
  });

  const { data: bookPOOrders = [] } = useQuery({
    queryKey: ['book-po-orders', 'po-lookup'],
    queryFn: async () => {
      const res = await getBookPOs({ limit: 200 });
      return res.data || [];
    },
  });

  const normalizeSearchText = (input) => {
    if (input == null) return '';

    const s = String(input)
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/\u0640/g, '')
      .replace(/[\u064A\u0649]/g, 'ی')
      .replace(/\u0643/g, 'ک')
      .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

    return s.toLowerCase();
  };

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handlePrintLoadsheet = async () => {
    const buildDateFromMonthDay = (month, day) => {
      if (!month || !day) return '';
      const [yRaw, mRaw] = String(month).split('-');
      const y = Number(yRaw);
      const m = Number(mRaw);
      const d = Number(day);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || y <= 0 || m <= 0 || m > 12) return '';
      const lastDay = new Date(y, m, 0).getDate();
      if (d < 1 || d > lastDay) return null;
      return `${String(month)}-${String(d).padStart(2, '0')}`;
    };

    let selectedDate = filterDate || '';
    if (!selectedDate && loadsheetDay) {
      const monthBase = filterMonth || String(today).slice(0, 7);
      const built = buildDateFromMonthDay(monthBase, loadsheetDay);
      if (built === null) {
        toast.error('Invalid day for selected month');
        return;
      }
      selectedDate = built || '';
    }

    const headerDateLabel = selectedDate
      ? selectedDate
      : (filterMonth ? filterMonth : 'All');

    let iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const w = iframe.contentWindow;
    if (!w || !w.document) {
      toast.error('Unable to open print window');
      try {
        iframe.remove();
      } catch (e) {
        // ignore
      }
      return;
    }

    const cleanupIframe = () => {
      if (!iframe) return;
      try {
        iframe.remove();
      } catch (e) {
        // ignore
      }
      iframe = null;
    };

    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Loading...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Loading loadsheet...</body></html>`);
    w.document.close();

    try {
      setIsPrintingLoadsheet(true);

      const res = await getParcels({
        page: 1,
        limit: 5000,
        date: selectedDate || undefined,
        month: filterMonth || undefined,
        search: filterSearch || undefined,
        tracking: filterTracking || undefined,
        status: filterStatus || undefined,
        paymentStatus: filterPayment || undefined,
      });

      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const piecesTotal = rows.reduce((sum, p) => {
        if (Array.isArray(p?.productsInfo) && p.productsInfo.length > 0) {
          return sum + p.productsInfo.reduce((s, x) => s + Number(x?.quantity || 0), 0);
        }
        return sum + 1;
      }, 0);

      const codTotal = rows.reduce((sum, p) => sum + Number(p?.codAmount || 0), 0);

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Loadsheet - ${escapeHtml(headerDateLabel)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .title { font-size: 16px; font-weight: 700; }
    .sub { font-size: 12px; color: #333; margin-top: 2px; }
    .meta { font-size: 12px; line-height: 1.4; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 700; }
    .right { text-align: right; }
    .center { text-align: center; }
    .nowrap { white-space: nowrap; }
    .summary td { font-size: 12px; font-weight: 700; }
    .summary-line { display: flex; justify-content: space-between; gap: 10px; }
    .muted { color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Courier Copy</div>
      <div class="sub">Daily Loadsheet</div>
      <div class="sub muted">Company: Etimad Mart</div>
    </div>
    <div class="meta">
      <div><b>Date:</b> ${escapeHtml(headerDateLabel)}</div>
      <div><b>Printed:</b> ${escapeHtml(new Date().toLocaleString())}</div>
      <div><b>Total Records:</b> ${rows.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center nowrap">Sr</th>
        <th class="nowrap">Tracking #</th>
        <th>Customer</th>
        <th class="nowrap">Phone</th>
        <th>Product</th>
        <th class="nowrap">Date</th>
        <th class="center nowrap">Pieces</th>
        <th class="right nowrap">COD</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((p, idx) => {
        const pieces = Array.isArray(p?.productsInfo) && p.productsInfo.length > 0
          ? p.productsInfo.reduce((s, x) => s + Number(x?.quantity || 0), 0)
          : 1;

        const cod = Number(p?.codAmount || 0);

        const trackingText = p?.barcodeValue || p?.trackingNumber || '';
        const barcodeSvg = makeBarcodeSvg(trackingText);

        const productText = Array.isArray(p?.productsInfo) && p.productsInfo.length > 0
          ? p.productsInfo
            .map((x) => {
              const name = x?.name || x?.productName || '';
              const qty = Number(x?.quantity || 0);
              return qty > 0 ? `${name} (${qty})` : String(name);
            })
            .filter(Boolean)
            .join(', ')
          : (p?.productName || p?.product?.name || p?.productId?.name || '');

        const rowDateRaw = p?.parcelDate || p?.createdAt;
        const rowDateObj = rowDateRaw ? new Date(rowDateRaw) : null;
        const rowDateText = rowDateObj && !Number.isNaN(rowDateObj.getTime())
          ? rowDateObj.toLocaleDateString('en-GB')
          : '';

        return `
          <tr>
            <td class="center nowrap">${idx + 1}</td>
            <td class="nowrap">
              ${barcodeSvg ? `<div style="margin-bottom:4px;">${barcodeSvg}</div>` : ''}
              <div>${escapeHtml(p?.trackingNumber || '')}</div>
            </td>
            <td>${escapeHtml(p?.customerName || '')}</td>
            <td class="nowrap">${escapeHtml(p?.phone || '')}</td>
            <td>${escapeHtml(productText || '')}</td>
            <td class="nowrap">${escapeHtml(rowDateText)}</td>
            <td class="center nowrap">${pieces}</td>
            <td class="right nowrap">${cod.toLocaleString('en-PK')}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
    <tfoot class="summary">
      <tr>
        <td colspan="8"><div class="summary-line"><span>Total No. Of Pieces</span><span>${piecesTotal}</span></div></td>
      </tr>
      <tr>
        <td colspan="8"><div class="summary-line"><span>Total No. Of Packets</span><span>${rows.length}</span></div></td>
      </tr>
      <tr>
        <td colspan="8"><div class="summary-line"><span>Total COD Amount</span><span>${codTotal.toLocaleString('en-PK')}</span></div></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

      w.document.open();
      w.document.write(html);
      w.document.close();

      try {
        if (iframe && w.addEventListener) {
          w.addEventListener('afterprint', cleanupIframe, { once: true });
        }
      } catch (e) {
        // ignore
      }
      setTimeout(() => {
        try {
          w.print();
        } finally {
          setTimeout(() => cleanupIframe(), 1500);
        }
      }, 400);
    } catch (e) {
      console.error(e);
      toast.error('Failed to print loadsheet');
      cleanupIframe();
    } finally {
      setIsPrintingLoadsheet(false);
    }
  };

  const handleScanReturnParcel = async (value) => {
    const raw = String(value || '').trim();
    if (!raw) return;

    try {
      setIsReturnScanLoading(true);

      // Find parcel by tracking number using existing getParcels API
      const res = await getParcels({ tracking: raw, page: 1, limit: 1 });
      const payload = res?.data;
      const list = Array.isArray(payload?.data) ? payload.data : [];

      if (!list.length) {
        toast.error('Parcel not found for scanned tracking');
        return;
      }

      const parcel = list[0];
      if (String(parcel.status || '').toLowerCase() === 'return') {
        toast.success('This parcel is already marked as return');
        return;
      }

      await handleUpdateStatus(parcel._id, 'status', 'return');
    } catch (error) {
      console.error('Error handling return parcel scan:', error);
      const msg = error?.response?.data?.message || 'Failed to mark parcel as return';
      toast.error(msg);
    } finally {
      setIsReturnScanLoading(false);
    }
  };

  const handleScanBookPO = async (value) => {
    const raw = String(value || '').trim();
    if (!raw) return;

    try {
      setIsBookPOScanLoading(true);
      const res = await lookupBookPO(raw);
      const order = res?.data;
      if (!order) {
        toast.error('Book PO not found');
        return;
      }

      setForm((prev) => ({
        ...prev,
        customerName: order.toName || prev.customerName,
        phone: order.toPhone || prev.phone,
        address: order.toAddress || prev.address,
        codAmount:
          prev.codAmount === '' || prev.codAmount == null
            ? (order.amount != null ? String(order.amount) : prev.codAmount)
            : prev.codAmount,
        // Store EM code into barcodeValue so prints and searches can use it
        barcodeValue: order.code || prev.barcodeValue,
      }));

      toast.success('Book PO details applied');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        toast.error('No Book PO found for this code');
      } else {
        console.error('Error looking up Book PO:', error);
        const msg = error.response?.data?.message || 'Failed to lookup Book PO';
        toast.error(msg);
      }
    } finally {
      setIsBookPOScanLoading(false);
    }
  };

  const filteredBookPOOrders = useMemo(() => {
    const q = normalizeSearchText(bookPOSearch.trim());
    if (!q) return [];

    const flatten = (value) => {
      if (value == null) return [];
      if (value instanceof Date) return [value.toISOString()];
      if (Array.isArray(value)) return value.flatMap(flatten);
      if (typeof value === 'object') return Object.values(value).flatMap(flatten);
      return [String(value)];
    };

    return (Array.isArray(bookPOOrders) ? bookPOOrders : [])
      .filter((order) => {
        const haystack = normalizeSearchText(flatten(order).join(' '));
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [bookPOOrders, bookPOSearch]);

  const filteredEditBookPOOrders = useMemo(() => {
    const q = normalizeSearchText(String(editModal.bookPOSearch || '').trim());
    if (!q) return [];

    const flatten = (value) => {
      if (value == null) return [];
      if (value instanceof Date) return [value.toISOString()];
      if (Array.isArray(value)) return value.flatMap(flatten);
      if (typeof value === 'object') return Object.values(value).flatMap(flatten);
      return [String(value)];
    };

    return (Array.isArray(bookPOOrders) ? bookPOOrders : [])
      .filter((order) => {
        const haystack = normalizeSearchText(flatten(order).join(' '));
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [bookPOOrders, editModal.bookPOSearch]);

  const copyToClipboard = async (text) => {
    const value = String(text || '');
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch (error) {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Copied');
      } catch (e) {
        toast.error('Copy failed');
      }
    }
  };

  const handleCheckTrackingStatus = async (trackingNumber) => {
    if (!trackingNumber) {
      toast.error('No tracking number available');
      return;
    }
    
    try {
      // First, copy the tracking number to clipboard as backup
      await navigator.clipboard.writeText(trackingNumber);
      
      // Create a hidden form to submit the tracking request
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://ep.gov.pk/track.asp';
      form.target = '_blank';
      
      // Add the tracking number field with the exact parameter name
      const trackingField = document.createElement('input');
      trackingField.type = 'hidden';
      trackingField.name = 'textfieldz';
      trackingField.value = trackingNumber;
      
      form.appendChild(trackingField);
      document.body.appendChild(form);
      
      toast.success('Opening tracking portal...');
      
      // Submit the form to open with tracking results
      form.submit();
      
      // Clean up the form
      setTimeout(() => {
        document.body.removeChild(form);
      }, 1000);
      
    } catch (error) {
      // Fallback: just open the portal and show instructions
      const trackingUrl = `https://ep.gov.pk/track.asp`;
      window.open(trackingUrl, '_blank');
      toast.success(`Tracking number: ${trackingNumber} - paste in portal`);
    }
  };

  const findBookPOByExactName = (name) => {
    const q = normalizeSearchText(String(name || '').trim());
    if (!q) return null;
    return (Array.isArray(bookPOOrders) ? bookPOOrders : []).find((o) =>
      normalizeSearchText(o?.toName || '') === q
    ) || null;
  };

  const normalizePhone = (phone) => {
    const raw = normalizeSearchText(String(phone || '').trim());
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    let d = digits;
    if (d.startsWith('0092')) {
      d = `0${d.slice(4)}`;
    } else if (d.startsWith('92')) {
      d = `0${d.slice(2)}`;
    } else if (d.length === 10 && d.startsWith('3')) {
      d = `0${d}`;
    }

    return d;
  };

  const findBookPOByExactPhone = (phone) => {
    const q = normalizePhone(phone);
    if (!q) return null;
    return (Array.isArray(bookPOOrders) ? bookPOOrders : []).find((o) =>
      normalizePhone(o?.toPhone || '') === q
    ) || null;
  };

  const productsById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p?._id) {
        map[String(p._id)] = p;
      }
    });
    return map;
  }, [products]);

  const syncSelectedProductsWithPrimary = (nextPrimaryId, nextPrimaryName, nextPrimaryModel, nextPrimaryQty) => {
    if (!nextPrimaryId) {
      setSelectedProducts([]);
      return;
    }

    setSelectedProducts((prev) => {
      const rest = prev.filter((x) => String(x.productId) !== String(nextPrimaryId));
      return [
        {
          productId: nextPrimaryId,
          name: nextPrimaryName,
          model: nextPrimaryModel,
          quantity: Math.max(1, Number(nextPrimaryQty) || 1)
        },
        ...rest
      ];
    });
  };

  const addAdditionalProduct = (product) => {
    if (!product?._id) return;
    if (Number(product.stock || 0) <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    setSelectedProducts((prev) => {
      const existing = prev.find((x) => String(x.productId) === String(product._id));
      if (existing) {
        return prev.map((x) =>
          String(x.productId) === String(product._id)
            ? { ...x, quantity: Math.max(1, Number(x.quantity || 1) + 1) }
            : x
        );
      }
      return [...prev, { productId: product._id, name: product.name, model: product.model, quantity: 1 }];
    });
  };

  // Parcels list with server-side pagination & filters
  const { data: parcelsResponse, isLoading: isParcelsLoading, isFetching: isParcelsFetching } = useQuery({
    queryKey: ['parcels', { page: currentPage, limit: itemsPerPage, search: filterSearch, tracking: filterTracking, status: filterStatus, paymentStatus: filterPayment, date: filterDate, month: filterMonth }],
    queryFn: async () => {
      const res = await getParcels({
        page: currentPage,
        limit: itemsPerPage,
        search: filterSearch || undefined,
        tracking: filterTracking || undefined,
        status: filterStatus || undefined,
        paymentStatus: filterPayment || undefined,
        date: filterDate || undefined,
        month: filterMonth || undefined,
      });
      return res.data;
    },
    keepPreviousData: true,
  });

  const parcels = parcelsResponse?.data || [];
  const totalParcels = parcelsResponse?.total || 0;
  const totalPages = parcelsResponse?.totalPages || 1;
  const totalProductUnits = parcelsResponse?.totalProductUnits || 0;
  const pageProductUnits = useMemo(() => {
    return (Array.isArray(parcels) ? parcels : []).reduce((sum, p) => {
      if (Array.isArray(p?.productsInfo) && p.productsInfo.length > 0) {
        return sum + p.productsInfo.reduce((s, x) => s + Number(x?.quantity || 0), 0);
      }
      return sum + 1;
    }, 0);
  }, [parcels]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const filteredEditProducts = useMemo(() => {
    if (!editModal.productSearch.trim()) return products;
    const q = editModal.productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, editModal.productSearch]);

  // Parcels already paginated from backend
  const filteredParcels = parcels;
  const paginatedParcels = parcels;

  const handleUpdateStatus = async (parcelId, field, value) => {
    try {
      await updateParcelStatus(parcelId, { [field]: value });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      toast.success('Parcel updated');
    } catch (error) {
      console.error('Error updating parcel status:', error);
      const msg = error.response?.data?.message || 'Failed to update parcel';
      toast.error(msg);
    }
  };

  const openEdit = (parcel) => {
    const productLabel = parcel.product
      ? `${parcel.product.name} (${parcel.product.model})`
      : '';

    const existingProductsInfo = Array.isArray(parcel.productsInfo) && parcel.productsInfo.length > 0
      ? parcel.productsInfo
      : (parcel.product?._id ? [{ productId: parcel.product._id, name: parcel.product.name, model: parcel.product.model, quantity: 1 }] : []);

    const normalizedSelected = existingProductsInfo
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        model: p.model,
        quantity: Number(p.quantity || 1),
      }))
      .filter((p) => p.productId);

    const primaryIdStr = parcel.product?._id ? String(parcel.product._id) : '';
    const orderedSelected = primaryIdStr
      ? (() => {
        const primary = normalizedSelected.find((p) => String(p.productId) === primaryIdStr);
        const rest = normalizedSelected.filter((p) => String(p.productId) !== primaryIdStr);
        return primary ? [primary, ...rest] : normalizedSelected;
      })()
      : normalizedSelected;

    const dateValue = parcel.parcelDate ? toLocalDateInputValue(parcel.parcelDate) : today;

    setEditModal({
      isOpen: true,
      parcelId: parcel._id,
      productSearch: '',
      showProductSearch: false,
      selectedProductId: parcel.product?._id ? String(parcel.product._id) : '',
      selectedProducts: orderedSelected,
      primaryQuantity: orderedSelected[0]?.quantity || 1,
      originalProducts: orderedSelected,
      form: {
        trackingNumber: parcel.trackingNumber || '',
        customerName: parcel.customerName || '',
        phone: parcel.phone || '',
        address: parcel.address || '',
        codAmount: typeof parcel.codAmount === 'number' ? String(parcel.codAmount) : '',
        parcelDate: dateValue,
        status: parcel.status || 'processing',
        paymentStatus: parcel.paymentStatus || 'unpaid',
        notes: parcel.notes || ''
      }
    });
  };

  const closeEdit = () => {
    setEditModal({
      isOpen: false,
      parcelId: null,
      productSearch: '',
      showProductSearch: false,
      selectedProductId: '',
      selectedProducts: [],
      primaryQuantity: 1,
      originalProducts: [],
      form: {
        trackingNumber: '',
        customerName: '',
        phone: '',
        address: '',
        codAmount: '',
        parcelDate: today,
        status: 'processing',
        paymentStatus: 'unpaid',
        notes: ''
      }
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const productsInfo = (Array.isArray(editModal.selectedProducts) ? editModal.selectedProducts : [])
      .map((x) => ({
        productId: x.productId,
        quantity: Number(x.quantity || 1),
      }))
      .filter((x) => x.productId && Number(x.quantity || 0) > 0);

    if (productsInfo.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const prevMap = new Map(
      (Array.isArray(editModal.originalProducts) ? editModal.originalProducts : [])
        .map((p) => ({ id: p?.productId ? String(p.productId) : '', qty: Number(p?.quantity || 0) }))
        .filter((x) => x.id)
        .map((x) => [x.id, x.qty])
    );

    for (const item of productsInfo) {
      const productDoc = productsById[String(item.productId)];
      const available = Number(productDoc?.stock || 0);
      const requested = Number(item.quantity || 0);
      if (!productDoc) {
        toast.error('Product not found');
        return;
      }
      if (requested < 1 || !Number.isFinite(requested)) {
        toast.error('Quantity must be at least 1');
        return;
      }
      const prevQty = Number(prevMap.get(String(item.productId)) || 0);
      const delta = requested - prevQty;
      if (delta > 0 && available < delta) {
        toast.error(`Insufficient stock for ${productDoc.name}. Available: ${available}, Requested: ${delta}`);
        return;
      }
    }

    if (!editModal.form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!editModal.form.trackingNumber.trim() || !editModal.form.address.trim()) {
      toast.error('Tracking number and address are required');
      return;
    }

    try {
      await updateParcel(editModal.parcelId, {
        productsInfo,
        customerName: editModal.form.customerName.trim(),
        phone: editModal.form.phone ? editModal.form.phone.trim() : '',
        trackingNumber: editModal.form.trackingNumber.trim(),
        address: editModal.form.address.trim(),
        codAmount: Number(editModal.form.codAmount || 0),
        parcelDate: editModal.form.parcelDate || today,
        status: editModal.form.status,
        paymentStatus: editModal.form.paymentStatus,
        notes: editModal.form.notes.trim()
      });

      toast.success('Parcel updated');
      closeEdit();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] })
      ]);
    } catch (error) {
      console.error('Error updating parcel:', error);
      const msg = error.response?.data?.message || 'Failed to update parcel';
      toast.error(msg);
    }
  };

  const handleDelete = async (parcel) => {
    const ok = window.confirm('Delete this parcel?');
    if (!ok) return;
    try {
      await deleteParcel(parcel._id);
      toast.success('Parcel deleted');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] })
      ]);
    } catch (error) {
      console.error('Error deleting parcel:', error);
      const msg = error.response?.data?.message || 'Failed to delete parcel';
      toast.error(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productsInfo = (Array.isArray(selectedProducts) ? selectedProducts : [])
      .map((x) => ({
        productId: x.productId,
        quantity: Number(x.quantity || 1),
      }))
      .filter((x) => x.productId && Number(x.quantity || 0) > 0);

    if (productsInfo.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    for (const item of productsInfo) {
      const productDoc = productsById[String(item.productId)];
      const available = Number(productDoc?.stock || 0);
      const requested = Number(item.quantity || 0);
      if (!productDoc) {
        toast.error('Product not found');
        return;
      }
      if (requested < 1 || !Number.isFinite(requested)) {
        toast.error('Quantity must be at least 1');
        return;
      }
      if (available < requested) {
        toast.error(`Insufficient stock for ${productDoc.name}. Available: ${available}, Requested: ${requested}`);
        return;
      }
    }

    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.trackingNumber.trim() || !form.address.trim()) {
      toast.error('Tracking number and address are required');
      return;
    }

    try {
      await createParcel({
        productsInfo,
        customerName: form.customerName.trim(),
        phone: form.phone ? form.phone.trim() : '',
        trackingNumber: form.trackingNumber.trim(),
        address: form.address.trim(),
        codAmount: Number(form.codAmount || 0),
        parcelDate: form.parcelDate || today,
        status: form.status,
        paymentStatus: form.paymentStatus,
        notes: form.notes.trim(),
        barcodeValue: form.barcodeValue ? String(form.barcodeValue).trim() : undefined,
      });
      toast.success('Parcel recorded successfully');
      setForm({ trackingNumber: '', customerName: '', phone: '', address: '', codAmount: '', parcelDate: today, status: 'processing', paymentStatus: 'unpaid', notes: '', barcodeValue: '' });
      setSelectedProductId('');
      setProductSearch('');
      setShowProductSearch(false);
      setSelectedProducts([]);
      setPrimaryQuantity(1);
      await queryClient.invalidateQueries({ queryKey: ['parcels'] });
    } catch (error) {
      console.error('Error creating parcel:', error);
      const msg = error.response?.data?.message || 'Failed to create parcel';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Truck size={26} className="text-emerald-600" />
            Post Office
          </h1>
          <p className="text-gray-600 mt-1">Track parcels sent via post office with status and payment info.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowForm((prev) => {
                const next = !prev;
                if (next) setShowReturnScan(false);
                return next;
              });
            }}
            className="shadow-sm flex items-center gap-2"
          >
            <Package size={18} />
            {showForm ? 'Hide Form' : 'Add Parcel'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowReturnScan((prev) => {
                const next = !prev;
                if (next) setShowForm(false);
                return next;
              });
            }}
            className="shadow-sm flex items-center gap-2"
          >
            <Package size={18} />
            {showReturnScan ? 'Hide Return Scan' : 'Add Return'}
          </Button>
        </div>
      </div>

      {showReturnScan && (
        <Card className="shadow-sm border border-amber-300 bg-amber-50 rounded-2xl">
          <CardBody className="space-y-2">
            <ScanInput
              label="Scan Returned PO Parcel"
              placeholder="Scan or type tracking number, then press Enter"
              helperText="This will find the existing PO parcel and mark its status as return."
              disabled={isReturnScanLoading}
              onScan={handleScanReturnParcel}
            />
          </CardBody>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Package size={20} />
              New Parcel Record
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scan / Book PO code input */}
                <div className="md:col-span-2">
                  <ScanInput
                    label="Scan Book PO Code (optional)"
                    placeholder="Scan barcode or type Book PO code, then press Enter"
                    helperText="Use the scanner to load Book PO details into the parcel form."
                    disabled={isBookPOScanLoading}
                    onScan={handleScanBookPO}
                  />
                </div>

                {/* Product */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSearch(true);
                    }}
                    placeholder="Search by name, model, or category..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {showProductSearch && productSearch && filteredProducts.length > 0 && (
                    <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg text-sm">
                      {filteredProducts.map((p) => (
                        <button
                          type="button"
                          key={p._id}
                          onClick={() => {
                            if (Number(p.stock || 0) <= 0) {
                              toast.error('Product is out of stock');
                              return;
                            }

                            if (!selectedProductId) {
                              setSelectedProductId(p._id);
                              setPrimaryQuantity(1);
                              syncSelectedProductsWithPrimary(p._id, p.name, p.model, 1);
                            } else {
                              addAdditionalProduct(p);
                            }

                            setProductSearch('');
                            setShowProductSearch(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-600">Model: {p.model} • {p.category}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="md:col-span-2 space-y-2">
                    {selectedProducts.map((p, idx) => (
                      <div key={String(p.productId)} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{p.name}{p.model ? ` (${p.model})` : ''}</div>
                          <div className="text-xs text-gray-500">Stock: {Number(productsById[String(p.productId)]?.stock ?? 0)}</div>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="1"
                            value={p.quantity}
                            onChange={(e) => {
                              const v = Math.max(1, Number(e.target.value || 1));
                              const available = Number(productsById[String(p.productId)]?.stock || 0);
                              if (available && v > available) {
                                toast.error(`Insufficient stock. Available: ${available}`);
                              }
                              setSelectedProducts((prev) => prev.map((x) =>
                                String(x.productId) === String(p.productId) ? { ...x, quantity: v } : x
                              ));
                              if (idx === 0) {
                                setPrimaryQuantity(v);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (idx === 0) {
                              if (selectedProducts.length <= 1) {
                                setSelectedProductId('');
                                setProductSearch('');
                                setSelectedProducts([]);
                                setPrimaryQuantity(1);
                                return;
                              }

                              const remaining = selectedProducts.filter((_, i) => i !== 0);
                              const nextPrimary = remaining[0];
                              const nextPrimaryId = String(nextPrimary.productId);
                              const live = productsById[nextPrimaryId];
                              const nextName = nextPrimary.name || live?.name || '';
                              const nextModel = nextPrimary.model || live?.model;
                              const nextQty = Math.max(1, Number(nextPrimary.quantity || 1));

                              setSelectedProductId(nextPrimaryId);
                              setPrimaryQuantity(nextQty);
                              setProductSearch('');
                              setSelectedProducts([
                                { ...nextPrimary, productId: nextPrimaryId, name: nextName, model: nextModel, quantity: nextQty },
                                ...remaining.slice(1),
                              ]);
                              return;
                            }

                            setSelectedProducts((prev) => prev.filter((x) => String(x.productId) !== String(p.productId)));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* COD Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">COD Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.codAmount}
                    onChange={(e) => setForm({ ...form, codAmount: e.target.value })}
                    placeholder="Enter COD amount for this parcel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Parcel Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.parcelDate}
                    onChange={(e) => setForm({ ...form, parcelDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setForm((prev) => {
                        const match = findBookPOByExactName(nextName);
                        if (!match) {
                          return { ...prev, customerName: nextName };
                        }

                        const next = { ...prev, customerName: nextName };
                        if (!String(next.phone || '').trim()) {
                          next.phone = match.toPhone || '';
                        }
                        if (!String(next.address || '').trim()) {
                          next.address = match.toAddress || '';
                        }
                        if (prev.codAmount === '' || prev.codAmount == null) {
                          next.codAmount = match.amount != null ? String(match.amount) : prev.codAmount;
                        }
                        return next;
                      });
                    }}
                    placeholder="Enter customer name for this parcel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Book PO Lookup (optional)</label>
                  <div className="relative">
                    <SearchBar
                      value={bookPOSearch}
                      onChange={(value) => {
                        setBookPOSearch(value);
                        setShowBookPOSearch(true);
                      }}
                      onFocus={() => setShowBookPOSearch(true)}
                      placeholder="Search saved Book PO by name / phone / address..."
                      className="w-full"
                    />

                    {showBookPOSearch && filteredBookPOOrders.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                        {filteredBookPOOrders.map((order) => (
                          <button
                            key={order._id}
                            type="button"
                            onClick={() => {
                              setSelectedBookPO(order);
                              setIsBookPOModalOpen(true);
                              setShowBookPOSearch(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                          >
                            <div className="font-medium text-gray-900">{order.toName}</div>
                            <div className="text-xs text-gray-600">{order.toPhone} • {order.toAddress}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => {
                      const nextPhone = e.target.value;
                      setForm((prev) => {
                        const match = findBookPOByExactPhone(nextPhone);
                        if (!match) {
                          return { ...prev, phone: nextPhone };
                        }

                        const next = { ...prev, phone: nextPhone };
                        if (!String(next.customerName || '').trim()) {
                          next.customerName = match.toName || next.customerName;
                        }
                        if (!String(next.address || '').trim()) {
                          next.address = match.toAddress || next.address;
                        }
                        if (prev.codAmount === '' || prev.codAmount == null) {
                          next.codAmount = match.amount != null ? String(match.amount) : prev.codAmount;
                        }
                        return next;
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="03xxxxxxxxx"
                  />
                </div>

                {/* Tracking number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={form.trackingNumber}
                    onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter tracking ID"
                    required
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={2}
                    placeholder="Customer address for this parcel"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="processing">Processing</option>
                    <option value="delivered">Delivered</option>
                    <option value="return">Return</option>
                  </select>
                </div>

                {/* Payment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                  <select
                    value={form.paymentStatus}
                    onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Any extra info e.g. courier, special instructions"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="flex items-center gap-2">
                  <CheckCircle size={18} />
                  Save Parcel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Filters + Table */}
      <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Parcel Records</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{totalParcels} record(s) • {totalProductUnits} product(s)</span>
              <select
                value={String(loadsheetDay)}
                onChange={(e) => setLoadsheetDay(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                title="Loadsheet day (uses Month filter if set)"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrintLoadsheet}
                disabled={isPrintingLoadsheet}
              >
                <span className="flex items-center gap-2">
                  <Printer size={16} />
                  {isPrintingLoadsheet ? 'Loading...' : 'Print Loadsheet'}
                </span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-3 border-b border-gray-100">
            {/* Row 1: Search (wide) + Date + Status */}
            <div className="lg:col-span-2 lg:row-start-1">
              <SearchBar
                value={filterSearch}
                onChange={(v) => {
                  setFilterSearch(v);
                  setCurrentPage(1);
                }}
                placeholder="Search parcels (English/Urdu) ..."
              />
            </div>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (e.target.value) {
                  setFilterMonth('');
                }
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm lg:row-start-1"
              title="Filter by exact date"
            />

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm lg:row-start-1"
            >
              <option value="">All Status</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="return">Return</option>
            </select>

            {/* Row 2: Tracking + Month + Payment + Rows per page */}
            <input
              type="text"
              value={filterTracking}
              onChange={(e) => {
                setFilterTracking(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm lg:row-start-2"
              placeholder="Tracking #"
              title="Filter by tracking number"
            />

            <input
              type="month"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                if (e.target.value) {
                  setFilterDate('');
                }
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm lg:row-start-2"
              title="Filter by month"
            />

            <select
              value={filterPayment}
              onChange={(e) => {
                setFilterPayment(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm lg:row-start-2"
            >
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <select
              value={String(itemsPerPage)}
              onChange={(e) => {
                const next = Number(e.target.value);
                setItemsPerPage(Number.isFinite(next) && next > 0 ? next : 50);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm lg:row-start-2"
              title="Rows per page"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="250">250</option>
            </select>
          </div>

          <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-100">
            Showing this page: {pageProductUnits} product(s)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tracking #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">COD</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[320px] w-[420px]">Address</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-20 border-l border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isParcelsLoading || (isParcelsFetching && paginatedParcels.length === 0) ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-gray-500 text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedParcels.length > 0 ? (
                  paginatedParcels.map((p) => (
                    <tr
                      key={p._id}
                      className={
                        p.status === 'delivered'
                          ? 'bg-green-200 hover:bg-green-300'
                          : p.status === 'return'
                            ? 'bg-red-200 hover:bg-red-300'
                            : 'bg-white'
                      }
                    >
                      <td className="px-4 py-2 font-medium text-gray-800 flex items-center gap-2">
                        <Hash size={14} className="text-gray-400" />
                        <span>{p.trackingNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCheckTrackingStatus(p.trackingNumber)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Check tracking status on Pakistan Post"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-2 text-gray-800">
                        {p.product ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (Array.isArray(p.productsInfo) && p.productsInfo.length > 1) {
                                setProductsModalParcel(p);
                                setIsProductsModalOpen(true);
                              }
                            }}
                            className={`text-left w-full ${Array.isArray(p.productsInfo) && p.productsInfo.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div>
                              <div className="font-semibold text-xs">{p.product.name}</div>
                              <div className="text-[10px] text-gray-500">{p.product.model} • {p.product.category}</div>
                              {Array.isArray(p.productsInfo) && p.productsInfo.length > 1 && (
                                <div className="text-[10px] text-blue-600 underline">+{p.productsInfo.length - 1} more</div>
                              )}
                            </div>
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-800">
                        {p.customerName || '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-800">
                        {p.phone || '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-right text-gray-800">
                        {typeof p.codAmount === 'number' ? p.codAmount.toLocaleString('en-PK') : '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {formatDateUTC(p.parcelDate || p.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700 min-w-[250px] w-[300px] max-w-[400px] break-words">
                        <div className="flex items-start gap-1">
                          <MapPin size={12} className="mt-0.5 text-gray-400" />
                          <span>{p.address}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <select
                          value={p.status}
                          onChange={(e) => handleUpdateStatus(p._id, 'status', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-full text-xs font-semibold bg-white"
                        >
                          <option value="processing">Processing</option>
                          <option value="delivered">Delivered</option>
                          <option value="return">Return</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <select
                          value={p.paymentStatus}
                          onChange={(e) => handleUpdateStatus(p._id, 'paymentStatus', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-full text-xs font-semibold bg-white"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {p.createdBy ? p.createdBy.username || p.createdBy.email : '-'}
                      </td>
                      <td className="px-4 py-2 text-center sticky right-0 bg-inherit z-10 border-l border-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(p)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-gray-500 text-sm">
                      No parcels found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalParcels > itemsPerPage && (
            <div className="p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalParcels}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setProductsModalParcel(null);
        }}
        title={productsModalParcel ? `Products - ${productsModalParcel.customerName || ''}` : 'Products'}
      >
        <div className="space-y-3">
          {productsModalParcel && Array.isArray(productsModalParcel.productsInfo) && productsModalParcel.productsInfo.length > 0 ? (
            <div className="space-y-2">
              {productsModalParcel.productsInfo.map((item, idx) => (
                <div
                  key={`${String(item.productId || idx)}-${idx}`}
                  className="flex items-start justify-between gap-3 p-2 border border-gray-200 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.name || 'Product'}{item.model ? ` (${item.model})` : ''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Qty: {Number(item.quantity || 1)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600">No products found.</div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isBookPOModalOpen}
        onClose={() => {
          setIsBookPOModalOpen(false);
          setSelectedBookPO(null);
        }}
        title={selectedBookPO ? `Book PO - ${selectedBookPO.toName || ''}` : 'Book PO'}
      >
        {selectedBookPO ? (
          <div className="space-y-3">
            <div className="p-2 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500">Name</div>
              <div className="text-sm font-medium text-gray-900 break-words">{selectedBookPO.toName || '-'}</div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => copyToClipboard(selectedBookPO.toName)}>
                  Copy Name
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, customerName: selectedBookPO.toName || prev.customerName }));
                    toast.success('Name filled');
                  }}
                >
                  Use Name
                </Button>
              </div>
            </div>

            <div className="p-2 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500">Phone</div>
              <div className="text-sm font-medium text-gray-900 break-words">{selectedBookPO.toPhone || '-'}</div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => copyToClipboard(selectedBookPO.toPhone)}>
                  Copy Phone
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, phone: selectedBookPO.toPhone || prev.phone }));
                    toast.success('Phone filled');
                  }}
                >
                  Use Phone
                </Button>
              </div>
            </div>

            <div className="p-2 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500">Address</div>
              <div className="text-sm font-medium text-gray-900 break-words">{selectedBookPO.toAddress || '-'}</div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => copyToClipboard(selectedBookPO.toAddress)}>
                  Copy Address
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, address: selectedBookPO.toAddress || prev.address }));
                    toast.success('Address filled');
                  }}
                >
                  Use Address
                </Button>
              </div>
            </div>

            <div className="p-2 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500">COD</div>
              <div className="text-sm font-medium text-gray-900 break-words">{selectedBookPO.amount != null ? String(selectedBookPO.amount) : '-'}</div>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(selectedBookPO.amount != null ? String(selectedBookPO.amount) : '')}
                >
                  Copy COD
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, codAmount: selectedBookPO.amount != null ? String(selectedBookPO.amount) : prev.codAmount }));
                    toast.success('COD filled');
                  }}
                >
                  Use COD
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No record selected.</div>
        )}
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={closeEdit} title="Edit Parcel">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <input
                type="text"
                value={editModal.productSearch}
                onChange={(e) => setEditModal((prev) => ({ ...prev, productSearch: e.target.value, showProductSearch: true }))}
                placeholder="Search by name, model, or category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {editModal.showProductSearch && editModal.productSearch && filteredEditProducts.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg text-sm">
                  {filteredEditProducts.map((p) => (
                    <button
                      type="button"
                      key={p._id}
                      onClick={() => {
                        if (Number(p.stock || 0) <= 0) {
                          toast.error('Product is out of stock');
                          return;
                        }

                        setEditModal((prev) => {
                          if (!prev.selectedProductId) {
                            return {
                              ...prev,
                              selectedProductId: p._id,
                              primaryQuantity: 1,
                              selectedProducts: [{ productId: p._id, name: p.name, model: p.model, quantity: 1 }],
                              productSearch: '',
                              showProductSearch: false,
                            };
                          }

                          const existing = (Array.isArray(prev.selectedProducts) ? prev.selectedProducts : [])
                            .find((x) => String(x.productId) === String(p._id));
                          if (existing) {
                            return {
                              ...prev,
                              selectedProducts: prev.selectedProducts.map((x) =>
                                String(x.productId) === String(p._id)
                                  ? { ...x, quantity: Math.max(1, Number(x.quantity || 1) + 1) }
                                  : x
                              ),
                              productSearch: '',
                              showProductSearch: false,
                            };
                          }

                          return {
                            ...prev,
                            selectedProducts: [...(prev.selectedProducts || []), { productId: p._id, name: p.name, model: p.model, quantity: 1 }],
                            productSearch: '',
                            showProductSearch: false,
                          };
                        });
                      }}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 ${Number(p.stock || 0) <= 0 && String(p._id) !== String(editModal.selectedProductId) ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-600">Model: {p.model} • {p.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {Array.isArray(editModal.selectedProducts) && editModal.selectedProducts.length > 0 && (
              <div className="md:col-span-2 space-y-2">
                {editModal.selectedProducts.map((p, idx) => (
                  <div key={String(p.productId)} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.name}{p.model ? ` (${p.model})` : ''}</div>
                      <div className="text-xs text-gray-500">Stock: {Number(productsById[String(p.productId)]?.stock ?? 0)}</div>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={p.quantity}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value || 1));
                          const available = Number(productsById[String(p.productId)]?.stock || 0);
                          if (available && v > available) {
                            toast.error(`Insufficient stock. Available: ${available}`);
                          }
                          setEditModal((prev) => ({
                            ...prev,
                            selectedProducts: (prev.selectedProducts || []).map((x) =>
                              String(x.productId) === String(p.productId) ? { ...x, quantity: v } : x
                            ),
                            primaryQuantity: idx === 0 ? v : prev.primaryQuantity,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditModal((prev) => {
                          const current = Array.isArray(prev.selectedProducts) ? prev.selectedProducts : [];
                          if (idx === 0) {
                            if (current.length <= 1) {
                              return { ...prev, selectedProductId: '', selectedProducts: [], primaryQuantity: 1 };
                            }

                            const remaining = current.filter((_, i) => i !== 0);
                            const nextPrimary = remaining[0];
                            const nextPrimaryId = String(nextPrimary.productId);
                            const live = productsById[nextPrimaryId];
                            const nextName = nextPrimary.name || live?.name || '';
                            const nextModel = nextPrimary.model || live?.model;
                            const nextQty = Math.max(1, Number(nextPrimary.quantity || 1));

                            return {
                              ...prev,
                              selectedProductId: nextPrimaryId,
                              primaryQuantity: nextQty,
                              selectedProducts: [
                                { ...nextPrimary, productId: nextPrimaryId, name: nextName, model: nextModel, quantity: nextQty },
                                ...remaining.slice(1),
                              ],
                            };
                          }

                          return {
                            ...prev,
                            selectedProducts: current.filter((x) => String(x.productId) !== String(p.productId)),
                          };
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">COD Amount</label>
              <input
                type="number"
                min="0"
                step="1"
                value={editModal.form.codAmount}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, codAmount: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={editModal.form.parcelDate}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, parcelDate: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={editModal.form.customerName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setEditModal((prev) => {
                    const match = findBookPOByExactName(nextName);
                    if (!match) {
                      return { ...prev, form: { ...prev.form, customerName: nextName } };
                    }

                    const nextForm = { ...prev.form, customerName: nextName };
                    if (!String(nextForm.phone || '').trim()) {
                      nextForm.phone = match.toPhone || '';
                    }
                    if (!String(nextForm.address || '').trim()) {
                      nextForm.address = match.toAddress || '';
                    }
                    if (nextForm.codAmount === '' || nextForm.codAmount == null) {
                      nextForm.codAmount = match.amount != null ? String(match.amount) : nextForm.codAmount;
                    }
                    return { ...prev, form: nextForm };
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Book PO Lookup (optional)</label>
              <div className="relative">
                <SearchBar
                  value={editModal.bookPOSearch}
                  onChange={(value) => setEditModal((prev) => ({ ...prev, bookPOSearch: value, showBookPOSearch: true }))}
                  onFocus={() => setEditModal((prev) => ({ ...prev, showBookPOSearch: true }))}
                  placeholder="Search saved Book PO by name / phone / address..."
                  className="w-full"
                />

                {editModal.showBookPOSearch && filteredEditBookPOOrders.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                    {filteredEditBookPOOrders.map((order) => (
                      <button
                        key={order._id}
                        type="button"
                        onClick={() => {
                          setEditModal((prev) => ({
                            ...prev,
                            showBookPOSearch: false,
                            bookPOSearch: '',
                            form: {
                              ...prev.form,
                              customerName: order.toName || prev.form.customerName,
                              address: order.toAddress || prev.form.address,
                              phone: order.toPhone || prev.form.phone,
                              codAmount: order.amount != null ? String(order.amount) : prev.form.codAmount,
                            },
                          }));
                          toast.success('Filled from Book PO');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                      >
                        <div className="font-medium text-gray-900">{order.toName}</div>
                        <div className="text-xs text-gray-600">{order.toPhone} • {order.toAddress}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input
                type="text"
                value={editModal.form.phone}
                onChange={(e) => {
                  const nextPhone = e.target.value;
                  setEditModal((prev) => {
                    const match = findBookPOByExactPhone(nextPhone);
                    if (!match) {
                      return { ...prev, form: { ...prev.form, phone: nextPhone } };
                    }

                    const nextForm = { ...prev.form, phone: nextPhone };
                    if (!String(nextForm.customerName || '').trim()) {
                      nextForm.customerName = match.toName || nextForm.customerName;
                    }
                    if (!String(nextForm.address || '').trim()) {
                      nextForm.address = match.toAddress || nextForm.address;
                    }
                    if (nextForm.codAmount === '' || nextForm.codAmount == null) {
                      nextForm.codAmount = match.amount != null ? String(match.amount) : nextForm.codAmount;
                    }
                    return { ...prev, form: nextForm };
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="03xxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
              <input
                type="text"
                value={editModal.form.trackingNumber}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, trackingNumber: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={editModal.form.address}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, address: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editModal.form.status}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="processing">Processing</option>
                <option value="delivered">Delivered</option>
                <option value="return">Return</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
              <select
                value={editModal.form.paymentStatus}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, paymentStatus: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={editModal.form.notes}
                onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, notes: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PO;
