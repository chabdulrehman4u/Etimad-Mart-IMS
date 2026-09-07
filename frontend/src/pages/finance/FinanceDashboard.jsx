import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFinanceOverview, getFinanceSetup } from '../../services/api';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import {
  Landmark,
  LayoutDashboard,
  Building2,
  Wallet,
  Package,
  Boxes,
  CreditCard,
  Users,
  FileSpreadsheet,
  Briefcase,
  BookOpen,
  Settings,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

import FinanceOverview from './FinanceOverview';
import FinanceBanks from './FinanceBanks';
import FinancePettyCash from './FinancePettyCash';
import FinanceInventory from './FinanceInventory';
import FinancePurchases from './FinancePurchases';
import FinancePayables from './FinancePayables';
import FinanceReceivables from './FinanceReceivables';
import FinancePnL from './FinancePnL';
import FinanceOwnerCapital from './FinanceOwnerCapital';
import FinanceLedger from './FinanceLedger';
import FinanceSetupModal from './FinanceSetupModal';

const FinanceDashboard = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Queries
  const {
    data: overview,
    isLoading: overviewLoading,
    isRefetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['financeOverview'],
    queryFn: async () => {
      const res = await getFinanceOverview();
      return res.data;
    },
  });

  const { data: setupData, refetch: refetchSetup } = useQuery({
    queryKey: ['financeSetup'],
    queryFn: async () => {
      const res = await getFinanceSetup();
      return res.data;
    },
  });

  const handleRefresh = async () => {
    await Promise.all([refetchOverview(), refetchSetup()]);
    queryClient.invalidateQueries({ queryKey: ['financeBanks'] });
    queryClient.invalidateQueries({ queryKey: ['financePettyCash'] });
    queryClient.invalidateQueries({ queryKey: ['financePayables'] });
    queryClient.invalidateQueries({ queryKey: ['financeReceivables'] });
    queryClient.invalidateQueries({ queryKey: ['financePurchases'] });
    queryClient.invalidateQueries({ queryKey: ['financePnL'] });
    queryClient.invalidateQueries({ queryKey: ['financeOwnerCapital'] });
    queryClient.invalidateQueries({ queryKey: ['financeLedger'] });
    toast.success('Financial data refreshed');
  };

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'banks', label: 'Bank Accounts', icon: Building2 },
    { id: 'petty-cash', label: 'Petty Cash', icon: Wallet },
    { id: 'inventory', label: 'Stock Valuation', icon: Package },
    { id: 'purchases', label: 'Purchases', icon: Boxes },
    { id: 'payables', label: 'Accounts Payable', icon: CreditCard },
    { id: 'receivables', label: 'Receivables', icon: Users },
    { id: 'pnl', label: 'Profit & Loss', icon: FileSpreadsheet },
    { id: 'owner-capital', label: 'Owner Capital', icon: Briefcase },
    { id: 'ledger', label: 'Audit Ledger', icon: BookOpen },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Business Financial Position & Real-Time Value
              </h1>
              <p className="text-xs text-slate-500">
                Etimad Mart Accounting & Wealth Tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsSetupModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Settings className="w-3.5 h-3.5" />
            {overview?.isConfigured ? 'Edit Baseline Setup' : 'Configure Opening Setup'}
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="flex overflow-x-auto gap-1 border-b border-slate-200 pb-px scrollbar-thin">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      {overviewLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Loading financial metrics...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <FinanceOverview
              overview={overview}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenSetup={() => setIsSetupModalOpen(true)}
              onOpenInvestment={() => setActiveTab('owner-capital')}
              onOpenWithdrawal={() => setActiveTab('owner-capital')}
              onOpenPettyCash={() => setActiveTab('petty-cash')}
              onOpenTransfer={() => setActiveTab('banks')}
            />
          )}

          {activeTab === 'banks' && <FinanceBanks />}
          {activeTab === 'petty-cash' && <FinancePettyCash />}
          {activeTab === 'inventory' && <FinanceInventory />}
          {activeTab === 'purchases' && <FinancePurchases />}
          {activeTab === 'payables' && <FinancePayables />}
          {activeTab === 'receivables' && <FinanceReceivables />}
          {activeTab === 'pnl' && <FinancePnL />}
          {activeTab === 'owner-capital' && (
            <FinanceOwnerCapital currentBusinessNetWorth={overview?.businessNetWorth || 0} />
          )}
          {activeTab === 'ledger' && <FinanceLedger />}
        </>
      )}

      {/* Setup & Baseline Modal */}
      <FinanceSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        initialData={setupData}
        currentStockValue={overview?.inventorySummary?.inventoryValue || 0}
        onSaved={() => {
          refetchOverview();
          refetchSetup();
        }}
      />
    </div>
  );
};

export default FinanceDashboard;

