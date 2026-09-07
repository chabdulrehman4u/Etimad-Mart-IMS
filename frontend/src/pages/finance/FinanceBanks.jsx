import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFinanceBanks,
  createFinanceBank,
  updateFinanceBank,
  addFinanceBankTransaction,
} from '../../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import {
  Building2,
  PlusCircle,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Wallet,
} from 'lucide-react';

const FinanceBanks = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

  // Form states
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    branch: '',
    openingBalance: '',
    notes: '',
  });

  const [txForm, setTxForm] = useState({
    type: 'transfer_to_cash', // transfer_to_cash, transfer_from_cash, transfer_to_bank, deposit, withdrawal
    amount: '',
    bankAccountId: '',
    toBankAccountId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Query banks
  const { data: banksData = { accounts: [], totalBalance: 0 }, isLoading } = useQuery({
    queryKey: ['financeBanks'],
    queryFn: async () => {
      const res = await getFinanceBanks();
      return res.data;
    },
  });

  const accounts = banksData.accounts || [];
  const totalBalance = banksData.totalBalance || 0;

  // Add bank mutation
  const addBankMutation = useMutation({
    mutationFn: (data) => createFinanceBank(data),
    onSuccess: () => {
      toast.success('Bank account created successfully');
      setIsAddModalOpen(false);
      setBankForm({ bankName: '', accountTitle: '', accountNumber: '', branch: '', openingBalance: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add bank account');
    },
  });

  // Transaction mutation
  const txMutation = useMutation({
    mutationFn: (data) => addFinanceBankTransaction(data),
    onSuccess: () => {
      toast.success('Bank transaction completed successfully');
      setIsTransferModalOpen(false);
      setTxForm({
        type: 'transfer_to_cash',
        amount: '',
        bankAccountId: '',
        toBankAccountId: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
      queryClient.invalidateQueries({ queryKey: ['financeOverview'] });
      queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
      queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to process bank transaction');
    },
  });

  const handleCreateBank = (e) => {
    e.preventDefault();
    addBankMutation.mutate({
      ...bankForm,
      openingBalance: Number(bankForm.openingBalance || 0),
    });
  };

  const handleProcessTransaction = (e) => {
    e.preventDefault();
    txMutation.mutate({
      ...txForm,
      amount: Number(txForm.amount || 0),
    });
  };

  const formatCur = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Bank Balance
          </span>
          <h2 className="text-2xl font-black text-purple-700 mt-0.5">
            {formatCur(totalBalance)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Across {accounts.filter((a) => a.isActive).length} active corporate & business bank accounts
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (accounts.length > 0) {
                setTxForm((prev) => ({ ...prev, bankAccountId: accounts[0]._id }));
              }
              setIsTransferModalOpen(true);
            }}
            className="flex items-center gap-2 text-xs"
            disabled={accounts.length === 0}
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-600" />
            Transfer / Move Money
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 text-xs bg-purple-600 hover:bg-purple-700"
          >
            <PlusCircle className="w-4 h-4" />
            Add Bank Account
          </Button>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-sm text-gray-500">
            Loading bank accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No Bank Accounts Added Yet</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Add your Meezan Bank, HBL, Bank Alfalah, or other business accounts.
            </p>
            <Button
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs bg-purple-600 hover:bg-purple-700"
            >
              Add Your First Bank Account
            </Button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account._id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{account.bankName}</h4>
                      <p className="text-xs text-slate-500">{account.accountTitle}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                      account.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono tracking-wider">
                    {account.accountNumber}
                  </span>
                  {account.branch && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Branch: {account.branch}</p>
                  )}
                  <div className="mt-3">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Current Verified Balance
                    </span>
                    <h3 className="text-xl font-black text-slate-900">
                      {formatCur(account.currentBalance)}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between gap-2 text-xs">
                <button
                  onClick={() => {
                    setTxForm((prev) => ({
                      ...prev,
                      type: 'transfer_from_cash',
                      bankAccountId: account._id,
                    }));
                    setIsTransferModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium text-center transition"
                >
                  + Deposit Cash
                </button>
                <button
                  onClick={() => {
                    setTxForm((prev) => ({
                      ...prev,
                      type: 'transfer_to_cash',
                      bankAccountId: account._id,
                    }));
                    setIsTransferModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-center transition"
                >
                  Withdraw to Cash
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Bank Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Bank Account">
        <form onSubmit={handleCreateBank} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              placeholder="e.g. Meezan Bank / HBL / Bank Alfalah"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Account Title *
              </label>
              <input
                type="text"
                value={bankForm.accountTitle}
                onChange={(e) => setBankForm({ ...bankForm, accountTitle: e.target.value })}
                placeholder="e.g. Etimad Mart Corporate"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Account / IBAN Number *
              </label>
              <input
                type="text"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                placeholder="PK00 MEZN 0000 0000 0000 0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Branch / Code
              </label>
              <input
                type="text"
                value={bankForm.branch}
                onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                placeholder="e.g. Main Market Branch"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Opening Balance (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={bankForm.openingBalance}
                onChange={(e) => setBankForm({ ...bankForm, openingBalance: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Notes
            </label>
            <input
              type="text"
              value={bankForm.notes}
              onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })}
              placeholder="Optional remarks"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={addBankMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
              {addBankMutation.isPending ? 'Adding...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer / Move Money Modal */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Bank Money Transfer & Movement">
        <form onSubmit={handleProcessTransaction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Transaction Type *
            </label>
            <select
              value={txForm.type}
              onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="transfer_from_cash">📥 Cash Deposit to Bank (Cash Drawer ➔ Bank)</option>
              <option value="transfer_to_cash">📤 Cash Withdrawal from Bank (Bank ➔ Cash Drawer)</option>
              <option value="transfer_to_bank">🔁 Inter-Bank Transfer (Bank A ➔ Bank B)</option>
              <option value="deposit">➕ Direct Deposit / External Credit</option>
              <option value="withdrawal">➖ Bank Charges / Fee / Direct Debit</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                {txForm.type === 'transfer_from_cash' ? 'Target Bank Account *' : 'Source Bank Account *'}
              </label>
              <select
                value={txForm.bankAccountId}
                onChange={(e) => setTxForm({ ...txForm, bankAccountId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              >
                <option value="">Select Bank Account</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.bankName} - {a.accountTitle} ({formatCur(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            {txForm.type === 'transfer_to_bank' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Destination Bank Account *
                </label>
                <select
                  value={txForm.toBankAccountId}
                  onChange={(e) => setTxForm({ ...txForm, toBankAccountId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                >
                  <option value="">Select Destination Bank</option>
                  {accounts
                    .filter((a) => a._id !== txForm.bankAccountId)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.bankName} - {a.accountTitle} ({formatCur(a.currentBalance)})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Amount (Rs.) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Date *
              </label>
              <input
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Description / Reference
              </label>
              <input
                type="text"
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="e.g. Deposit slip #4829"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={txMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
              {txMutation.isPending ? 'Processing...' : 'Execute Transaction'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceBanks;

