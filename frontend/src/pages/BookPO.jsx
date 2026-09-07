import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBookPO, getBookPOs, updateBookPO } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import { useToast } from '../context/ToastContext';
import { Printer, CheckCircle, User, Phone, MapPin } from 'lucide-react';
import JsBarcode from 'jsbarcode';

const BookPO = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    toName: '',
    toPhone: '',
    toAddress: '',
    weight: '',
    amount: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [ordersToPrint, setOrdersToPrint] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: orders = [] } = useQuery({
    queryKey: ['book-po-orders'],
    queryFn: async () => {
      const res = await getBookPOs({ limit: 2000 });
      return res.data || [];
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.toName.trim() || !form.toPhone.trim() || !form.toAddress.trim() || !form.weight.trim() || !form.amount) {
      toast.error('براہ کرم تمام خانے مکمل پُر کریں');
      return;
    }

    try {
      if (editingOrder) {
        await updateBookPO(editingOrder._id, {
          toName: form.toName.trim(),
          toPhone: form.toPhone.trim(),
          toAddress: form.toAddress.trim(),
          weight: form.weight.trim(),
          amount: Number(form.amount),
        });
        toast.success('Order updated successfully');
      } else {
        await createBookPO({
          toName: form.toName.trim(),
          toPhone: form.toPhone.trim(),
          toAddress: form.toAddress.trim(),
          weight: form.weight.trim(),
          amount: Number(form.amount),
        });
        toast.success('Order saved successfully');
      }

      setForm({ toName: '', toPhone: '', toAddress: '', weight: '', amount: '' });
      setEditingOrder(null);
      await queryClient.invalidateQueries({ queryKey: ['book-po-orders'] });
    } catch (error) {
      console.error('Error creating Book PO order:', error);
      const msg = error.response?.data?.message || 'Error in saving bill.';
      toast.error(msg);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setForm({
      toName: order.toName || '',
      toPhone: order.toPhone || '',
      toAddress: order.toAddress || '',
      weight: order.weight || '',
      amount: order.amount != null ? String(order.amount) : '',
    });
    setShowForm(true);
    const topEl = document.getElementById('book-po-top');
    if (topEl) {
      topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }

      // Limit to maximum 2 selected orders
      if (prev.length >= 2) {
        return prev;
      }

      return [...prev, id];
    });
  };

  const handlePrintSingle = (order) => {
    setOrdersToPrint([order]);
    setTimeout(() => {
      window.print();
    }, 0);
  };

  const handlePrintSelected = () => {
    const selected = orders.filter((o) => selectedIds.includes(o._id)).slice(0, 2);
    if (selected.length === 0) {
      toast.error('Select atleast 1 order.');
      return;
    }
    setOrdersToPrint(selected);
    setTimeout(() => {
      window.print();
    }, 0);
  };

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
      console.error('Error generating Book PO barcode:', e);
      return '';
    }
  };

  const filteredOrders = useMemo(() => {
    const normalizeText = (input) => {
      if (input == null) return '';

      const s = String(input)
        .normalize('NFKC')
        .replace(/[\u200C\u200D\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, '')
        // Remove Arabic diacritics
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
        // Remove tatweel
        .replace(/\u0640/g, '')
        // Normalize common Arabic -> Urdu/Persian letter variants
        .replace(/[\u064A\u0649]/g, 'ی')
        .replace(/\u0643/g, 'ک')
        // Normalize Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        // Normalize Eastern Arabic-Indic digits ۰۱۲۳۴۵۶۷۸۹
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
        .replace(/\s+/g, ' ')
        .trim();

      return s.toLowerCase();
    };

    const q = normalizeText(searchQuery.trim());
    if (!q) return orders;

    const flatten = (value) => {
      if (value == null) return [];
      if (value instanceof Date) return [value.toISOString()];
      if (Array.isArray(value)) return value.flatMap(flatten);
      if (typeof value === 'object') return Object.values(value).flatMap(flatten);
      return [String(value)];
    };

    return orders.filter((order) => {
      const haystack = normalizeText(flatten(order).join(' '));
      return haystack.includes(q);
    });
  }, [orders, searchQuery]);

  return (
    <>
      <div id="book-po-top" className="space-y-6 no-print">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Printer size={26} className="text-emerald-600" />
              Book PO
            </h1>
            <p className="text-gray-600 mt-1">Print orders on A4 paper (maximum 2 orders per page).</p>
          </div>
          <div className="mt-2 md:mt-0 flex justify-end">
            <Button
              type="button"
              className="text-sm px-3 py-1"
              onClick={() => {
                setShowForm((prev) => !prev);
                if (showForm) {
                  setEditingOrder(null);
                  setForm({ toName: '', toPhone: '', toAddress: '', weight: '', amount: '' });
                }
              }}
            >
              {editingOrder ? 'Cancel edit' : showForm ? 'Hide form' : 'Add order'}
            </Button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <User size={20} />
                {editingOrder ? 'آرڈر میں ترمیم کریں (Edit Order)' : 'نیا آرڈر فارم'}
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نام (Name)</label>
                    <input
                      type="text"
                      value={form.toName}
                      onChange={(e) => setForm({ ...form, toName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="نام درج کریں"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">فون نمبر (Phone)</label>
                    <input
                      type="text"
                      value={form.toPhone}
                      onChange={(e) => setForm({ ...form, toPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="فون نمبر درج کریں"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">پتہ (Address)</label>
                    <textarea
                      value={form.toAddress}
                      onChange={(e) => setForm({ ...form, toAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={2}
                      placeholder="مکمل پتہ درج کریں"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وزن (Weight)</label>
                    <input
                      type="text"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="مثال: 500 گرام / 1 کلو"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="کل رقم"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="flex items-center gap-2">
                    <CheckCircle size={18} />
                    {editingOrder ? 'Update Order' : 'Save Order'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Orders List */}
        <Card className="shadow-lg border-0 bg-white rounded-2xl overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Orders list</CardTitle>
              <div className="flex items-center gap-3">
                <div className="w-64">
                  <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search orders..." />
                </div>
                <span className="text-sm text-gray-500">Total: {filteredOrders.length}</span>
                <Button type="button" className="flex items-center text-xs gap-2" onClick={handlePrintSelected}>
                  <Printer size={16} />
                  Print selected orders
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(order._id)}
                            onChange={() => toggleSelect(order._id)}
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-800">
                          <div className="font-semibold">{order.toName}</div>
                          <div className="text-gray-600 flex items-center gap-1 text-[11px]">
                            <Phone size={11} />
                            <span>{order.toPhone}</span>
                          </div>
                          <div className="text-gray-600 flex items-start gap-1 text-[11px]">
                            <MapPin size={11} className="mt-0.5" />
                            <span className='urdu-text text-[14px]'>{order.toAddress}</span>
                          </div>
                        </td>
                        <td
                          style={{ fontFamily: 'JameelNooriNastaleeq, serif' }}
                          className="px-4 py-2 text-xs text-gray-800"
                          dir="rtl"
                        >
                          {order.weight} گرام
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-800">Rs. {Number(order.amount || 0).toLocaleString('en-PK')}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">
                          {new Date(order.createdAt).toLocaleString('en-PK')}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              className="flex items-center gap-1 text-xs px-3 py-1"
                              onClick={() => handlePrintSingle(order)}
                            >
                              <Printer size={14} />
                              Print
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="flex items-center gap-1 text-xs px-3 py-1"
                              onClick={() => handleEditOrder(order)}
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Print Template */}
      <div className="book-po-print-root" aria-hidden="true">
        {ordersToPrint.map((order, index) => {
          const barcodeValue = order?.code || '';
          const barcodeSvg = makeBarcodeSvg(barcodeValue);

          return (
            <div
              key={order._id}
              className="p-8 min-h-[29.7cm] border border-gray-300 book-po-chit"
              style={{
                pageBreakInside: 'avoid',
                pageBreakAfter: index % 2 === 1 ? 'always' : 'auto',
              }}
            >
              <div className="book-po-watermark">Etimad Mart</div>

              <div className="relative z-10 text-lg leading-relaxed w-full">


                <h3 className='text-center font-bold'>BU = 202</h3>

                {/* To section: heading on its own line, details below on right */}
                <div className="mb-4 urdu-text">
                  <div className="font-bold text-lg text-left">To</div>
                  <div className="mt-1 text-right urdu-text" dir="rtl">
                    <div>نام: {order.toName}</div>
                    <div>
                      فون نمبر: <span dir="ltr">{order.toPhone}</span>
                    </div>
                    <div>پتہ: {order.toAddress}</div>
                    <div dir="rtl">وزن: {order.weight} گرام</div>
                    <div>
                      رقم: Rs. {Number(order.amount || 0).toLocaleString('en-PK')}
                    </div>
                  </div>
                </div>

                <hr className="my-3 border-dashed" />

                {/* From section: left column with barcode under From, right column with details */}
                <div className="mt-5 urdu-text">
                  <div className="font-bold text-lg text-left">From</div>
                  <div className="mt-1 flex">
                    {/* Left column: label then barcode under From */}
                    <div className="w-24 flex flex-col items-start" dir="ltr">
                      {barcodeSvg && (
                        <>
                          <span className="text-[10px] font-semibold mb-0.5 text-center">From Etimad</span>
                          <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                        </>
                      )}
                    </div>

                    {/* Right column: sender details, line, and note */}
                    <div className="flex-1 text-right ml-4" dir="rtl">
                      <div>اعتماد مارٹ</div>
                      <div>
                        فون نمبر: <span dir="ltr">0307-1111832</span>
                      </div>
                      <div>
                        پتہ: HashStack Technologies چاچڑاں روڈ ظاہر پیر، تحصیل خان پور، ضلع رحیم یار خان
                      </div>

                      <hr className="my-2 border-t border-gray-400" />

                      <div className='font-bold' dir="rtl">
                        نوٹ: پارسل واپس بھیجنے سے پہلے <span dir="ltr" className='mx-1'>0307-1111832</span> پر رابطہ کرنے کی کوشش ضرورکریں -شکریہ
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default BookPO;