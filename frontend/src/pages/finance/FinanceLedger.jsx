import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinanceLedger, voidFinanceLedger } from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Filter,
  Ban,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

const FinanceLedger = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { role } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(role);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const { data: ledgerEntries = [], isLoading } = useQuery({
    queryKey: ['financeLedger', typeFilter, accountFilter, startDate, endDate, search],
    queryFn: async () => {
      const res = await getFinanceLedger({
        type: typeFilter || undefined,
        account: accountFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      });
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }) => voidFinanceLedger(id, { reason }),
    onSuccess: () => {
      toast.success('Transaction voided and balances reversed successfully');
      setIsVoidModalOpen(false);
      setSelectedTx(null);
      setVoidReason('');
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financePayables'] });
      queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
      queryClient.invalidateQueries({ queryKey: ['financePnL'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to void transaction');
    },
  });

  const handleOpenVoid = (tx) => {
    setSelectedTx(tx);
    setVoidReason('');
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = (e) => {
    e.preventDefault();
    if (!selectedTx || !voidReason.trim()) {
      return toast.error('Please specify the reason for voiding');
    }
    voidMutation.mutate({
      id: selectedTx._id,
      reason: voidReason,
    });
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Immutable Financial Journal & Double-Entry Ledger
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-0.5">
            Audit Trail & Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every movement across cash, bank, stock, payables, receivables, and equity
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <SearchBar value={search} onChange={setSearch} placeholder="Search tx ID, description..." />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Transaction Types</option>
              <option value="SALE">SALE (Customer Order)</option>
              <option value="PURCHASE_CASH">PURCHASE (Cash)</option>
              <option value="PURCHASE_BANK">PURCHASE (Bank)</option>
              <option value="PURCHASE_CREDIT">PURCHASE (Credit / Payable)</option>
              <option value="SUPPLIER_PAYMENT">SUPPLIER PAYMENT</option>
              <option value="CUSTOMER_PAYMENT">CUSTOMER UDHAAR PAYMENT</option>
              <option value="EXPENSE">EXPENSE</option>
              <option value="OWNER_INVESTMENT">OWNER INVESTMENT</option>
              <option value="OWNER_WITHDRAWAL">OWNER WITHDRAWAL</option>
              <option value="BANK_TO_CASH_TRANSFER">BANK TO CASH TRANSFER</option>
              <option value="CASH_TO_BANK_TRANSFER">CASH TO BANK TRANSFER</option>
              <option value="BANK_TRANSFER">INTER-BANK TRANSFER</option>
              <option value="OPENING_BALANCE">OPENING BALANCE</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>
          </div>

          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Account Ledgers</option>
              <option value="cash">Petty Cash</option>
              <option value="bank">Bank Accounts</option>
              <option value="inventory">Inventory Asset</option>
              <option value="accounts_receivable">Accounts Receivable</option>
              <option value="accounts_payable">Accounts Payable</option>
              <option value="equity">Owner Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none"
              placeholder="From"
            />
            <span className="text-slate-400 text-xs">➔</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-4 py-3">Tx ID / Date</th>
                <th className="px-4 py-3">Transaction Type</th>
                <th className="px-4 py-3">Double-Entry Flow</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount (Debit/Credit)</th>
                <th className="px-4 py-3 text-center">Status</th>
                {isAdmin && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-6 text-slate-400">
                    Loading ledger journal...
                  </td>
                </tr>
              ) : ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-6 text-slate-400">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr
                    key={entry._id}
                    className={`hover:bg-slate-50/80 transition ${
                      entry.isVoided ? 'bg-rose-50/40 line-through text-slate-400' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-slate-900">{entry.transactionId}</span>
                      <p className="text-[10px] text-slate-400">{formatDate(entry.date)}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {entry.transactionType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px]">
                      <span className="text-rose-600 font-semibold">{entry.sourceAccount}</span>
                      <span className="text-slate-400 mx-1.5">➔</span>
                      <span className="text-emerald-600 font-semibold">{entry.destinationAccount}</span>
                      {entry.bankAccountId?.bankName && (
                        <p className="text-[10px] text-slate-400 font-sans">
                          {entry.bankAccountId.bankName}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="font-medium text-slate-800 truncate">{entry.description}</p>
                      {entry.referenceId && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ref: {entry.referenceId}
                        </span>
                      )}
                      {entry.isVoided && entry.voidReason && (
                        <p className="text-[10px] text-rose-600 italic no-underline">
                          Voided: {entry.voidReason}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCur(entry.amount)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.isVoided
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {entry.isVoided ? 'VOIDED' : 'POSTED'}
                      </span>
                    </td>

                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        {!entry.isVoided && entry.transactionType !== 'OPENING_BALANCE' && (
                          <button
                            onClick={() => handleOpenVoid(entry)}
                            title="Void and reverse transaction"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Modal */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title="Void & Reverse Transaction"
      >
        <form onSubmit={handleConfirmVoid} className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Permanent Reversal Notice
            </div>
            <p className="leading-relaxed">
              Voiding transaction <strong>{selectedTx?.transactionId}</strong> ({formatCur(selectedTx?.amount)})
              will automatically reverse all associated ledger debits and credits, updating your cash, bank, or inventory balances accordingly.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Audit Reason for Voiding *
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate entry entered by mistake, transaction cancelled by supplier..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsVoidModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={voidMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {voidMutation.isPending ? 'Reversing...' : 'Confirm Void & Reverse'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceLedger;

