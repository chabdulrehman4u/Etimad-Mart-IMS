import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFinancePayables,
  createFinancePayable,
  payFinancePayable,
  getFinanceBanks,
  getFinancePettyCash,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  PlusCircle,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Wallet,
} from 'lucide-react';

const FinancePayables = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);

  // New payable form
  const [newPayable, setNewPayable] = useState({
    supplierName: '',
    billNumber: '',
    totalAmount: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });

  // Pay payable form
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'cash', // cash or bank
    bankAccountId: '',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Queries
  const { data: payablesData = { payables: [], totalPayable: 0, totalPaid: 0 }, isLoading } = useQuery({
    queryKey: ['financePayables'],
    queryFn: async () => {
      const res = await getFinancePayables();
      return res.data;
    },
  });

  const { data: banksData = { accounts: [] } } = useQuery({
    queryKey: ['financeBanks'],
    queryFn: async () => {
      const res = await getFinanceBanks();
      return res.data;
    },
  });

  const { data: pettyCashData = { currentPettyCash: 0 } } = useQuery({
    queryKey: ['financePettyCash'],
    queryFn: async () => {
      const res = await getFinancePettyCash();
      return res.data;
    },
  });

  const payables = payablesData.payables || [];
  const totalPayable = payablesData.totalPayable || 0;
  const accounts = banksData.accounts || [];
  const currentPettyCash = pettyCashData.currentPettyCash || 0;

  // Add mutation
  const addMutation = useMutation({
    mutationFn: (data) => createFinancePayable(data),
    onSuccess: () => {
      toast.success('Supplier payable bill created');
      setIsAddModalOpen(false);
      setNewPayable({
        supplierName: '',
        billNumber: '',
        totalAmount: '',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['financePayables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create payable');
    },
  });

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: ({ id, data }) => payFinancePayable(id, data),
    onSuccess: () => {
      toast.success('Supplier payment recorded successfully!');
      setIsPayModalOpen(false);
      setSelectedPayable(null);
      setPayForm({
        amount: '',
        paymentMethod: 'cash',
        bankAccountId: '',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financePayables'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Payment failed');
    },
  });

  const handleOpenPay = (payable) => {
    setSelectedPayable(payable);
    setPayForm({
      amount: payable.remainingAmount || '',
      paymentMethod: 'cash',
      bankAccountId: accounts[0]?._id || '',
      reference: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsPayModalOpen(true);
  };

  const handleCreatePayable = (e) => {
    e.preventDefault();
    addMutation.mutate({
      ...newPayable,
      totalAmount: Number(newPayable.totalAmount || 0),
    });
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (!selectedPayable) return;
    payMutation.mutate({
      id: selectedPayable._id,
      data: {
        ...payForm,
        amount: Number(payForm.amount || 0),
      },
    });
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const filteredPayables = payables.filter(
    (p) =>
      p.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      p.billNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Accounts Payable (Supplier Udhaar)
          </span>
          <h2 className="text-2xl font-black text-rose-600 mt-0.5">
            {formatCur(totalPayable)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Money owed to vendors and inventory suppliers
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 text-xs bg-rose-600 hover:bg-rose-700 text-white"
        >
          <PlusCircle className="w-4 h-4" />
          Add Supplier Bill
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search supplier or bill #..." />
          <span className="text-xs text-slate-500">
            Showing {filteredPayables.length} supplier bills
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Bill # / Date</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Bill</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Remaining Due</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-slate-400">
                    Loading payables...
                  </td>
                </tr>
              ) : filteredPayables.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-slate-400">
                    No supplier payables found.
                  </td>
                </tr>
              ) : (
                filteredPayables.map((p) => {
                  const isOverdue =
                    p.dueDate && new Date(p.dueDate) < new Date() && p.remainingAmount > 0;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{p.billNumber}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(p.billDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.supplierName}</td>
                      <td className="px-4 py-3 font-mono">
                        {p.dueDate ? (
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {formatDate(p.dueDate)}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                        {formatCur(p.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">
                        {formatCur(p.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 text-sm">
                        {formatCur(p.remainingAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.remainingAmount > 0 ? (
                          <button
                            onClick={() => handleOpenPay(p)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] border border-emerald-200 transition"
                          >
                            Pay Supplier
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Bill Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Direct Supplier Bill">
        <form onSubmit={handleCreatePayable} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={newPayable.supplierName}
                onChange={(e) => setNewPayable({ ...newPayable, supplierName: e.target.value })}
                placeholder="e.g. Master Packaging Ltd"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Bill / Invoice # *
              </label>
              <input
                type="text"
                value={newPayable.billNumber}
                onChange={(e) => setNewPayable({ ...newPayable, billNumber: e.target.value })}
                placeholder="e.g. INV-9042"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Total Bill Amount (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={newPayable.totalAmount}
                onChange={(e) => setNewPayable({ ...newPayable, totalAmount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Bill Date *
              </label>
              <input
                type="date"
                value={newPayable.billDate}
                onChange={(e) => setNewPayable({ ...newPayable, billDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={newPayable.dueDate}
                onChange={(e) => setNewPayable({ ...newPayable, dueDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Notes
              </label>
              <input
                type="text"
                value={newPayable.notes}
                onChange={(e) => setNewPayable({ ...newPayable, notes: e.target.value })}
                placeholder="Optional details"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={addMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {addMutation.isPending ? 'Saving...' : 'Add Payable Bill'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Supplier Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Pay Supplier: ${selectedPayable?.supplierName || ''}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Bill Number:</span>
              <span className="font-bold text-slate-900">{selectedPayable?.billNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Outstanding Payable:</span>
              <span className="font-bold text-rose-600 text-sm">
                {formatCur(selectedPayable?.remainingAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Payment Amount (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                max={selectedPayable?.remainingAmount}
                step="any"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Payment Method *
              </label>
              <select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="cash">Petty Cash (Avail: {formatCur(currentPettyCash)})</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
          </div>

          {payForm.paymentMethod === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Bank Account *
              </label>
              <select
                value={payForm.bankAccountId}
                onChange={(e) => setPayForm({ ...payForm, bankAccountId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                <option value="">Select Bank...</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.bankName} - {a.accountTitle} ({formatCur(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reference / Cheque #
              </label>
              <input
                type="text"
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                placeholder="e.g. Chq 9042, Online ref"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              placeholder="Optional remarks"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={payMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {payMutation.isPending ? 'Processing...' : 'Confirm Supplier Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinancePayables;

