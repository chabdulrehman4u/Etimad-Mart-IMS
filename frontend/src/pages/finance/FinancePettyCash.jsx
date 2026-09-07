import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinancePettyCash, addFinancePettyCashTransaction } from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';

const FinancePettyCash = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('cash_in'); // cash_in or cash_out
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['financePettyCash'],
    queryFn: async () => {
      const res = await getFinancePettyCash();
      return res.data || { currentPettyCash: 0, transactions: [] };
    },
  });

  const currentPettyCash = data?.currentPettyCash || 0;
  const transactions = data?.transactions || [];

  const txMutation = useMutation({
    mutationFn: (payload) => addFinancePettyCashTransaction(payload),
    onSuccess: () => {
      toast.success(
        modalType === 'cash_in'
          ? 'Cash logged into drawer successfully'
          : 'Cash disbursement logged successfully'
      );
      setIsModalOpen(false);
      setFormData({
        amount: '',
        description: '',
        reference: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Transaction failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    txMutation.mutate({
      type: modalType,
      amount: Number(formData.amount || 0),
      description: formData.description,
      reference: formData.reference,
      date: formData.date,
    });
  };

  const openModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Petty Cash / Counter Cash in Hand
            </span>
            <h2 className="text-2xl font-black text-amber-600 mt-0.5">
              {formatCur(currentPettyCash)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time physical cash available for daily store operations
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => openModal('cash_out')}
            className="flex items-center gap-1.5 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
          >
            <MinusCircle className="w-4 h-4 text-rose-600" />
            Cash Out / Disburse
          </Button>
          <Button
            variant="primary"
            onClick={() => openModal('cash_in')}
            className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Cash In / Receive
          </Button>
        </div>
      </div>

      {/* Cash Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Petty Cash Movement Log</h3>
          <span className="text-xs text-slate-500">{transactions.length} recent entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Flow</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400">
                    Loading cash movement history...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400">
                    No cash transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCashIn = tx.destinationAccount === 'cash';
                  return (
                    <tr key={tx._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCashIn
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isCashIn ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {tx.transactionType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{tx.description}</p>
                        {tx.referenceId && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref: {tx.referenceId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {tx.sourceAccount} ➔ {tx.destinationAccount}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sm">
                        <span className={isCashIn ? 'text-emerald-600' : 'text-rose-600'}>
                          {isCashIn ? '+' : '-'} {formatCur(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{tx.createdBy?.username || 'System'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash In / Out Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === 'cash_in' ? 'Log Cash Into Counter Drawer' : 'Log Cash Out / Disburse'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`p-3 rounded-lg text-xs ${
              modalType === 'cash_in'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            {modalType === 'cash_in'
              ? 'Cash will be added to the physical counter balance.'
              : `Current available cash: ${formatCur(currentPettyCash)}. Cash out cannot exceed this.`}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Amount (Rs.) *
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Reason / Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={modalType === 'cash_in' ? 'e.g. Daily cash float, loose change' : 'e.g. Tea, shop supplies, courier fee'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reference / Receipt #
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Optional receipt # or slip #"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={txMutation.isPending}
              className={
                modalType === 'cash_in'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }
            >
              {txMutation.isPending ? 'Logging...' : modalType === 'cash_in' ? 'Log Cash In' : 'Disburse Cash'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinancePettyCash;

