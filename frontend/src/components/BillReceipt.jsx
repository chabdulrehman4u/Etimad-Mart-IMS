import React, { useState } from 'react';
import { Calendar, Phone, Mail, MapPin, Hash, User, Package, Receipt, Download, Share2, CheckCircle, Clock, X } from 'lucide-react';
import { addBillPayment } from '../services/api';
import { useToast } from '../context/ToastContext';

const BillReceipt = ({ bill, onClose, onPrint, onPaymentUpdated }) => {
  const toast = useToast();
  const [paidNow, setPaidNow] = useState('');
  const [note, setNote] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return ` ${Number(amount || 0).toLocaleString('en-PK')}`;
  };

  const alreadyPaid = Number(bill.amountPaid || 0);
  const remainingBefore = bill.remainingAmount != null
    ? Number(bill.remainingAmount || 0)
    : Math.max(0, Number(bill.total || 0) - alreadyPaid);
  const numericPaidNow = Number(paidNow || 0);
  const remainingAfter = Math.max(0, remainingBefore - (Number.isNaN(numericPaidNow) ? 0 : numericPaidNow));

  const itemCount = Array.isArray(bill.items) ? bill.items.length : 0;
  const totalQuantity = Array.isArray(bill.items)
    ? bill.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0;

  const handlePrintInvoice = () => {
    try {
      const sourceNode = document.querySelector('.print-root');
      if (!sourceNode) {
        window.print?.();
        return;
      }
      // Clone only the invoice content so printed layout matches the on-screen preview exactly
      const printRoot = sourceNode.cloneNode(true);
      printRoot.classList.add('print-root-clone');

      // Remove any UI-only elements from the cloned node
      printRoot.querySelectorAll('.no-print').forEach((el) => el.parentNode?.removeChild(el));

      const originalHtml = document.body.innerHTML;

      document.body.innerHTML = '';
      document.body.appendChild(printRoot);

      window.focus();
      window.print?.();

      // Restore original UI after printing
      setTimeout(() => {
        document.body.innerHTML = originalHtml;
        window.location.reload();
      }, 300);
    } catch (err) {
      console.error('Error printing invoice:', err);
      window.print?.();
    }
  };

  const handleSavePayment = async () => {
    const amount = Number(paidNow || 0);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }

    if (amount > remainingBefore) {
      toast.error('Payment cannot be more than current remaining balance');
      return;
    }

    try {
      setIsSavingPayment(true);
      const response = await addBillPayment(bill._id, { amount, note: note.trim() });
      const updatedBill = response.data;

      toast.success('Payment recorded successfully');
      setPaidNow('');
      setNote('');

      if (onPaymentUpdated) {
        onPaymentUpdated(updatedBill);
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print-wrapper">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden print-root">
        {/* Header Actions (compact, invoice style) */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white px-6 py-4 no-print">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-10 rounded-md">
                <Receipt size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[0.25em] uppercase">Invoice</h2>
                <p className="text-slate-200 text-xs">Invoice No: {bill.billNumber}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrintInvoice}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
              >
                <Download size={16} />
                Print Invoice
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all duration-200 flex items-center gap-1 text-sm"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bill Content */}
        <div id="bill-content" className="relative overflow-y-auto max-h-[calc(95vh-120px)] bg-white">
          <div className="bill-watermark">Etimad Mart</div>
          {/* Company Header (compact) */}
          <div className="bg-gray-50 px-8 pt-3 pb-2 border-b border-gray-300">
            <div className="text-center mb-2">
              <h1 className="text-xl font-bold text-gray-900 mb-1 tracking-wide">ETIMAD MART</h1>
              <p className="text-xs text-gray-700 mb-1">Retail &amp; Mart Billing Invoice</p>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto text-xs">
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  {/* <div className="p-2 bg-gray-200 rounded-lg">
                    <Phone size={16} className="text-gray-700" />
                  </div> */}
                  <span className="font-medium">0307-1111832</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  {/* <div className="p-2 bg-gray-200 rounded-lg">
                    <MapPin size={16} className="text-gray-700" />
                  </div> */}
                  <span className="font-medium">Zahir Pir , Pakistan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill & Customer Information */}
          <div className="px-8 pt-3 pb-2 bg-white bill-info-section">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

              {/* Bill Details Card - simple form style */}
              <div className="bg-gray-50  p-4  text-xs">
                <h3 className="text-sm font-semibold text-gray-900 text-center mb-3 border-b border-gray-200 pb-2">Invoice Details</h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 whitespace-nowrap">Bill Number:</span>
                    <span className="font-semibold text-gray-900 flex-1 text-right">{bill.billNumber}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 whitespace-nowrap">Date &amp; Time:</span>
                    <span className="font-medium text-gray-800 flex-1 text-right">{formatDate(bill.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Details Card - simple form style */}
              <div className="bg-gray-50 p-4 text-xs">
                <h3 className="text-sm text-center font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Bill To</h3>

                {bill.customer ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 whitespace-nowrap">Name:</span>
                      <span className="font-semibold text-gray-900 flex-1 text-right text-sm">{bill.customer.name}</span>
                    </div>
                    {bill.customer.phone && (
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-600 whitespace-nowrap">Phone:</span>
                        <span className="font-medium text-gray-900 flex-1 text-right">{bill.customer.phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-5 text-xs">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Walk-in Customer</h4>
                    <p className="text-gray-600">No customer information provided</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table - compact invoice style */}
          <div className="px-8 pt-2 pb-4 bg-white items-section">
            <div className="bg-white shadow-sm border border-gray-300 overflow-hidden mb-6">
              <div className="bg-white text-black px-5 py-3 flex items-center justify-between">
                <div className="font-bold">
                  <h3 className="text-[1rem] font-semibold tracking-wide">Invoice Items</h3>
                </div>
                <div className="text-[11px] text-gray-700 flex items-center gap-3">
                  <span>
                    Items: <span className="font-semibold">{itemCount}</span>
                  </span>
                  <span>
                    Total Qty: <span className="font-semibold">{totalQuantity}</span>
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-800">Item / Description</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-800">Rate</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-800">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-800">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bill.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 align-top">
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">{item.name}-{item.model}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-medium text-gray-800">
                          {formatCurrency(item.selectedPrice)}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="px-8 pb-6 pt-2">
            <div className="bg-gray-50 border border-gray-300 p-4 text-xs mb-3 space-y-1.5">
              {bill.discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Discount ({bill.discountType === 'percentage' ? '%' : 'Fixed'})</span>
                  <span className="font-semibold text-gray-700">- {formatCurrency(bill.discount)}</span>
                </div>
              )}

              {/* Totals row + dotted lines for paid / remaining */}
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center w-full text-sm font-bold">
                  <span className="text-gray-800">Total:</span>
                  <span className="text-gray-900">Rs.{formatCurrency(bill.total)}</span>
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-gray-700 mr-2">Amount Paid</span>
                  <span className="flex-1 border-b border-dashed border-gray-400 h-4 invoice-dotted-line" />
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-gray-700 mr-2">Remaining</span>
                  <span className="flex-1 border-b border-dashed border-gray-400 h-4 invoice-dotted-line" />
                </div>
              </div>
            </div>
          </div>

          {/* Payments Management (system only, not printed) */}
          <div className="px-8 pb-6 no-print">
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 text-xs shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Manage Payments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 text-xs">
                <div>
                  <div className="text-gray-500">Bill Total</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(bill.total)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Already Paid</div>
                  <div className="font-semibold text-emerald-700">{formatCurrency(alreadyPaid)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Remaining Before</div>
                  <div className="font-semibold text-red-600">{formatCurrency(remainingBefore)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Remaining After</div>
                  <div className={`font-semibold ${remainingAfter > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatCurrency(remainingAfter)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paid Now (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={paidNow}
                    onChange={(e) => setPaidNow(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                    placeholder="e.g. 2000"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                    placeholder="Cash / Bank / Reference..."
                  />
                </div>
                <div className="flex justify-end sm:justify-start mt-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={handleSavePayment}
                    disabled={isSavingPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium shadow-sm flex items-center gap-2"
                  >
                    {isSavingPayment ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-2">Notes:</h4>
              <p className="text-gray-700">{bill.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 border-t border-slate-200 pt-4 bg-white rounded-2xl px-6 pb-5">
            <div className="flex flex-row items-center justify-center gap-3 text-[11px] text-slate-600 whitespace-nowrap">
              <p className="font-semibold text-emerald-600">
                Thank you for your business!
              </p>
              <p>📞 For support: +92307-1111832</p>
              <p>🌐 Visit: www.etimadmart.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillReceipt;
