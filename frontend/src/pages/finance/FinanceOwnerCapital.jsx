import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFinanceOwnerCapital,
  addFinanceOwnerInvestment,
  addFinanceOwnerWithdrawal,
  getFinanceBanks,
  getFinancePettyCash,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import {
  Briefcase,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Building2,
  Wallet,
} from 'lucide-react';

const FinanceOwnerCapital = ({ currentBusinessNetWorth = 0 }) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Forms
  const [investForm, setInvestForm] = useState({
    amount: '',
    paymentMethod: 'cash', // cash or bank
    bankAccountId: '',
    description: 'Owner Capital Injection',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    account: 'cash', // cash or bank
    bankAccountId: '',
    reason: 'Owner Personal Drawing',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Queries
  const { data: capitalData = {}, isLoading } = useQuery({
    queryKey: ['financeOwnerCapital'],
    queryFn: async () => {
      const res = await getFinanceOwnerCapital();
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

  const records = capitalData.records || [];
  const openingCapital = Number(capitalData.openingCapital || 0);
  const totalInvestments = Number(capitalData.totalInvestments || 0);
  const totalWithdrawals = Number(capitalData.totalWithdrawals || 0);
  const currentOwnerCapital = Number(capitalData.currentOwnerCapital || 0);

  const accounts = banksData.accounts || [];
  const currentPettyCash = pettyCashData.currentPettyCash || 0;

  // Real Gain calculation
  const businessGrowth = currentBusinessNetWorth - currentOwnerCapital;
  const growthPercent = currentOwnerCapital > 0 ? ((businessGrowth / currentOwnerCapital) * 100).toFixed(1) : 0;

  // Mutations
  const investMutation = useMutation({
    mutationFn: (data) => addFinanceOwnerInvestment(data),
    onSuccess: () => {
      toast.success('Owner capital injection recorded successfully');
      setIsInvestModalOpen(false);
      setInvestForm({
        amount: '',
        paymentMethod: 'cash',
        bankAccountId: '',
        description: 'Owner Capital Injection',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financeOwnerCapital'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record investment');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (data) => addFinanceOwnerWithdrawal(data),
    onSuccess: () => {
      toast.success('Owner withdrawal / drawing recorded successfully');
      setIsWithdrawModalOpen(false);
      setWithdrawForm({
        amount: '',
        account: 'cash',
        bankAccountId: '',
        reason: 'Owner Personal Drawing',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financeOwnerCapital'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record withdrawal');
    },
  });

  const handleInvestSubmit = (e) => {
    e.preventDefault();
    investMutation.mutate({
      ...investForm,
      amount: Number(investForm.amount || 0),
    });
  };

  const handleWithdrawSubmit = (e) => {
    e.preventDefault();
    withdrawMutation.mutate({
      ...withdrawForm,
      amount: Number(withdrawForm.amount || 0),
    });
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invested Capital Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Invested Owner Equity
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-1">
              {formatCur(currentOwnerCapital)}
            </h2>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400">Baseline Capital:</span>
                <p className="font-bold text-slate-700">{formatCur(openingCapital)}</p>
              </div>
              <div>
                <span className="text-slate-400">New Injections:</span>
                <p className="font-bold text-emerald-600">+{formatCur(totalInvestments)}</p>
              </div>
              <div>
                <span className="text-slate-400">Drawings:</span>
                <p className="font-bold text-rose-600">-{formatCur(totalWithdrawals)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
            <Button
              variant="primary"
              onClick={() => setIsInvestModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusCircle className="w-4 h-4" /> Inject Capital
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsWithdrawModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
            >
              <MinusCircle className="w-4 h-4 text-rose-600" /> Withdraw Drawing
            </Button>
          </div>
        </div>

        {/* Real Business Growth Comparison Card */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Business Value vs. Invested Capital
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-400/20 text-emerald-300">
                +{growthPercent}% Growth
              </span>
            </div>
            <h2 className="text-3xl font-black text-emerald-400 mt-1">
              {formatCur(businessGrowth)}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Net wealth created above total owner invested capital
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Current Business Worth:</span>
              <p className="font-bold text-slate-100 text-sm">{formatCur(currentBusinessNetWorth)}</p>
            </div>
            <div>
              <span className="text-slate-400">Owner Capital:</span>
              <p className="font-bold text-blue-300 text-sm">{formatCur(currentOwnerCapital)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting Clarification */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Owner Equity Accounting Rule</p>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            Owner capital injections increase cash/bank and increase owner equity — they are <strong>never treated as sales revenue</strong>.
            Conversely, personal drawings reduce cash and reduce equity — they are <strong>never treated as business operating expenses</strong>.
            This ensures your operational profit & loss statement remains 100% pure and accurate.
          </p>
        </div>
      </div>

      {/* Capital History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Owner Capital History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Transaction Type</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400">
                    Loading capital history...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400">
                    No owner investments or drawings recorded yet.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isInvestment = r.type === 'investment';
                  return (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isInvestment
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isInvestment ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {isInvestment ? 'CAPITAL INJECTION' : 'OWNER DRAWING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 uppercase text-[11px] font-semibold text-slate-600">
                        {r.paymentMethod}
                        {r.bankAccountId?.bankName && ` (${r.bankAccountId.bankName})`}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.description}</p>
                        {r.notes && <p className="text-[10px] text-slate-400">{r.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sm">
                        <span className={isInvestment ? 'text-emerald-600' : 'text-rose-600'}>
                          {isInvestment ? '+' : '-'} {formatCur(r.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.createdBy?.username || 'Admin'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inject Capital Modal */}
      <Modal isOpen={isInvestModalOpen} onClose={() => setIsInvestModalOpen(false)} title="Record Owner Capital Injection">
        <form onSubmit={handleInvestSubmit} className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-lg text-xs">
            This records funds injected by the owner into the business. It increases available cash/bank and increases owner equity.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Investment Amount (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={investForm.amount}
                onChange={(e) => setInvestForm({ ...investForm, amount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Deposit Into *
              </label>
              <select
                value={investForm.paymentMethod}
                onChange={(e) => setInvestForm({ ...investForm, paymentMethod: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="cash">Petty Cash / Counter Drawer</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
          </div>

          {investForm.paymentMethod === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Destination Bank Account *
              </label>
              <select
                value={investForm.bankAccountId}
                onChange={(e) => setInvestForm({ ...investForm, bankAccountId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                Date *
              </label>
              <input
                type="date"
                value={investForm.date}
                onChange={(e) => setInvestForm({ ...investForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Description
              </label>
              <input
                type="text"
                value={investForm.description}
                onChange={(e) => setInvestForm({ ...investForm, description: e.target.value })}
                placeholder="e.g. Owner Capital Injection"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              value={investForm.notes}
              onChange={(e) => setInvestForm({ ...investForm, notes: e.target.value })}
              placeholder="Optional remarks"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsInvestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={investMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {investMutation.isPending ? 'Recording...' : 'Confirm Injection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Withdraw Capital Modal */}
      <Modal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} title="Record Owner Withdrawal / Drawing">
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-lg text-xs">
            This records funds withdrawn by the owner for personal use. It reduces business cash/bank and reduces invested equity without affecting operational P&L.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Withdrawal Amount (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Withdraw From *
              </label>
              <select
                value={withdrawForm.account}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, account: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="cash">Petty Cash (Avail: {formatCur(currentPettyCash)})</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
          </div>

          {withdrawForm.account === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Bank Account *
              </label>
              <select
                value={withdrawForm.bankAccountId}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccountId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                Date *
              </label>
              <input
                type="date"
                value={withdrawForm.date}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reason / Drawing Purpose
              </label>
              <input
                type="text"
                value={withdrawForm.reason}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, reason: e.target.value })}
                placeholder="e.g. Owner personal drawing"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsWithdrawModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={withdrawMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {withdrawMutation.isPending ? 'Processing...' : 'Confirm Withdrawal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceOwnerCapital;

