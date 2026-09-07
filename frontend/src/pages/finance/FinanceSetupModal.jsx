import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { saveFinanceSetup } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Calculator, AlertCircle, Plus, Trash2, Users } from 'lucide-react';

const FinanceSetupModal = ({ isOpen, onClose, initialData, onSaved, currentStockValue = 0 }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    openingOwnerCapital: '',
    openingPettyCash: '',
    openingBankBalance: '',
    openingInventoryValue: '',
    openingAccountsReceivable: '',
    openingAccountsPayable: '',
    openingOtherAssets: '',
    openingOtherLiabilities: '',
    otherAssetsDescription: '',
    otherLiabilitiesDescription: '',
    openingDate: new Date().toISOString().split('T')[0],
  });

  const [openingReceivablesList, setOpeningReceivablesList] = useState([]);
  const [showHawalaList, setShowHawalaList] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        openingOwnerCapital: initialData.openingOwnerCapital ?? '',
        openingPettyCash: initialData.openingPettyCash ?? '',
        openingBankBalance: initialData.openingBankBalance ?? '',
        openingInventoryValue: initialData.openingInventoryValue || (currentStockValue > 0 ? currentStockValue : ''),
        openingAccountsReceivable: initialData.openingAccountsReceivable ?? '',
        openingAccountsPayable: initialData.openingAccountsPayable ?? '',
        openingOtherAssets: initialData.openingOtherAssets ?? '',
        openingOtherLiabilities: initialData.openingOtherLiabilities ?? '',
        otherAssetsDescription: initialData.otherAssetsDescription || '',
        otherLiabilitiesDescription: initialData.otherLiabilitiesDescription || '',
        openingDate: initialData.openingDate
          ? new Date(initialData.openingDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });

      if (initialData.openingReceivablesList && initialData.openingReceivablesList.length > 0) {
        setOpeningReceivablesList(initialData.openingReceivablesList);
        setShowHawalaList(true);
      }
    } else if (currentStockValue > 0) {
      setFormData((prev) => ({
        ...prev,
        openingInventoryValue: currentStockValue,
      }));
    }
  }, [initialData, currentStockValue]);

  const num = (v) => Number(v || 0);

  const addReceivableRow = () => {
    setShowHawalaList(true);
    setOpeningReceivablesList((prev) => [
      ...prev,
      { partyName: `Hawala ${prev.length + 1}`, amount: '', phone: '', notes: '' },
    ]);
  };

  const removeReceivableRow = (idx) => {
    setOpeningReceivablesList((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const sum = next.reduce((s, it) => s + Number(it.amount || 0), 0);
      setFormData((f) => ({ ...f, openingAccountsReceivable: sum > 0 ? sum : '' }));
      return next;
    });
  };

  const updateReceivableRow = (idx, field, val) => {
    setOpeningReceivablesList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      const sum = next.reduce((s, it) => s + Number(it.amount || 0), 0);
      setFormData((f) => ({ ...f, openingAccountsReceivable: sum > 0 ? sum : '' }));
      return next;
    });
  };

  const hawalaTotalSum = openingReceivablesList.reduce(
    (s, it) => s + Number(it.amount || 0),
    0
  );

  const totalOpeningAssets =
    num(formData.openingPettyCash) +
    num(formData.openingBankBalance) +
    num(formData.openingInventoryValue) +
    num(formData.openingAccountsReceivable) +
    num(formData.openingOtherAssets);

  const totalOpeningLiabilities =
    num(formData.openingAccountsPayable) +
    num(formData.openingOtherLiabilities);

  const calculatedOpeningNetWorth = totalOpeningAssets - totalOpeningLiabilities;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validReceivables = openingReceivablesList
        .filter((it) => it.partyName && Number(it.amount || 0) > 0)
        .map((it) => ({
          partyName: it.partyName,
          amount: Number(it.amount),
          phone: it.phone || '',
          notes: it.notes || '',
          collectedAmount: Number(it.collectedAmount || 0),
          remainingAmount:
            it.remainingAmount !== undefined
              ? Number(it.remainingAmount)
              : Number(it.amount) - Number(it.collectedAmount || 0),
        }));

      await saveFinanceSetup({
        openingOwnerCapital: num(formData.openingOwnerCapital),
        openingPettyCash: num(formData.openingPettyCash),
        openingBankBalance: num(formData.openingBankBalance),
        openingInventoryValue: num(formData.openingInventoryValue),
        openingAccountsReceivable: num(formData.openingAccountsReceivable),
        openingReceivablesList: validReceivables,
        openingAccountsPayable: num(formData.openingAccountsPayable),
        openingOtherAssets: num(formData.openingOtherAssets),
        openingOtherLiabilities: num(formData.openingOtherLiabilities),
        otherAssetsDescription: formData.otherAssetsDescription,
        otherLiabilitiesDescription: formData.otherLiabilitiesDescription,
        openingDate: formData.openingDate,
      });

      toast.success('Finance baseline and opening balances configured successfully!');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving finance setup:', err);
      toast.error(err.response?.data?.message || 'Failed to save setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Baseline Financial Position">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Baseline / Opening Balances Setup</p>
            <p className="mt-1 text-blue-800 text-xs leading-relaxed">
              Set the starting capital, baseline assets, and market udhaar of Etimad Mart.
              Future business growth will be calculated relative to the owner's invested capital and this baseline net worth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Baseline / Opening Date
            </label>
            <input
              type="date"
              value={formData.openingDate}
              onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 uppercase mb-1">
              Owner's Total Invested Capital (Rs.) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.openingOwnerCapital}
              onChange={(e) => setFormData({ ...formData, openingOwnerCapital: e.target.value })}
              placeholder="e.g. 5000000"
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm font-semibold text-blue-900 bg-blue-50/40 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <span className="text-[11px] text-gray-500">The total capital the owner has invested into the business.</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Opening Assets (What The Business Owns)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Opening Petty Cash / Counter Cash (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingPettyCash}
                onChange={(e) => setFormData({ ...formData, openingPettyCash: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Opening Bank Balances Total (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingBankBalance}
                onChange={(e) => setFormData({ ...formData, openingBankBalance: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Opening Stock / Inventory Value (Rs.)
                </label>
                {currentStockValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, openingInventoryValue: currentStockValue })}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Use Live Stock (Rs. {Number(currentStockValue).toLocaleString()})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingInventoryValue}
                onChange={(e) => setFormData({ ...formData, openingInventoryValue: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Opening Market Udhaar / Receivables (Rs.)
                </label>
                <button
                  type="button"
                  onClick={addReceivableRow}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Hawala / Party
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingAccountsReceivable}
                onChange={(e) => setFormData({ ...formData, openingAccountsReceivable: e.target.value })}
                placeholder="e.g. 104170"
                className="w-full border border-blue-300 bg-blue-50/20 rounded-lg px-3 py-2 text-sm font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Total amount to collect from the market. You can itemize each party/hawala below.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Other Assets Value (Shop, Equipment, Security) (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingOtherAssets}
                onChange={(e) => setFormData({ ...formData, openingOtherAssets: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Other Assets Description
              </label>
              <input
                type="text"
                value={formData.otherAssetsDescription}
                onChange={(e) => setFormData({ ...formData, otherAssetsDescription: e.target.value })}
                placeholder="e.g. Shop renovation, AC, computers"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Market Udhaar / Hawalas Repeater Table */}
          <div className="mt-4 p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h5 className="font-bold text-xs uppercase text-blue-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Market Udhaar / Hawalay Breakdown ({openingReceivablesList.length} Parties)
                </h5>
                <p className="text-[11px] text-slate-500">
                  Add 8 to 9 parties/references totaling Rs. {hawalaTotalSum > 0 ? hawalaTotalSum.toLocaleString() : '104,170'}. You can record payments as they arrive.
                </p>
              </div>
              <button
                type="button"
                onClick={addReceivableRow}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Party
              </button>
            </div>

            {openingReceivablesList.length === 0 ? (
              <div className="text-center py-4 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-xs text-slate-500">No parties added yet.</p>
                <button
                  type="button"
                  onClick={addReceivableRow}
                  className="mt-1 text-xs text-blue-600 hover:underline font-bold"
                >
                  Click here to add your 8-9 market hawalas
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {openingReceivablesList.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Party / Hawala Name (e.g. Party 1, Ahsan Bhai)"
                        value={item.partyName}
                        onChange={(e) => updateReceivableRow(idx, 'partyName', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="w-28 sm:w-36">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Amount Rs."
                        value={item.amount}
                        onChange={(e) => updateReceivableRow(idx, 'amount', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-bold text-blue-900 text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="hidden sm:block sm:w-44">
                      <input
                        type="text"
                        placeholder="Phone / Notes / Ref"
                        value={item.notes}
                        onChange={(e) => updateReceivableRow(idx, 'notes', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReceivableRow(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition"
                      title="Remove party"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 px-1 text-xs font-bold text-slate-800">
                  <span>Total Hawalas Sum:</span>
                  <span className="text-sm text-blue-700">Rs. {hawalaTotalSum.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Opening Liabilities (What The Business Owes)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Opening Accounts Payable (Supplier Udhaar) (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingAccountsPayable}
                onChange={(e) => setFormData({ ...formData, openingAccountsPayable: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Other Liabilities (Loans / Security Deposits) (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.openingOtherLiabilities}
                onChange={(e) => setFormData({ ...formData, openingOtherLiabilities: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Calculation Summary Banner */}
        <div className="bg-slate-900 text-white rounded-xl p-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold text-slate-200">Calculated Opening Net Worth</span>
            </div>
            <span className="text-xl font-bold text-emerald-400">
              Rs. {calculatedOpeningNetWorth.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Total Assets:</span>
              <p className="font-semibold text-slate-100">Rs. {totalOpeningAssets.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-400">Total Liabilities:</span>
              <p className="font-semibold text-rose-300">Rs. {totalOpeningLiabilities.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-400">Owner Invested:</span>
              <p className="font-semibold text-blue-300">Rs. {num(formData.openingOwnerCapital).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving Setup...' : 'Save Baseline Configuration'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FinanceSetupModal;
