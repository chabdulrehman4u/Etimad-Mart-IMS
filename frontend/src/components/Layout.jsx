import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  UserCircle,
  ShoppingCart,
  Receipt,
  LogOut,
  Menu,
  X,
  Settings,
  Wallet,
  Truck,
  RotateCcw,
  DollarSign,
  BookOpen,
  Shield,
  Megaphone,
  PawPrint,
  Boxes,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import PasswordResetModal from './PasswordResetModal';
import NotificationCenter from './NotificationCenter';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [sidebarTooltip, setSidebarTooltip] = useState({ visible: false, label: '', top: 0 });
  const { user, logout, role } = useAuth();
  const { notifications, dismissNotification, clearAllNotifications } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'superadmin'] },
    { path: '/admin-management', icon: Shield, label: 'Admins', roles: ['admin', 'superadmin'] },
    { path: '/products', icon: Package, label: 'Products', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/purchase-batches', icon: Boxes, label: 'Purchase Batches', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/sellers', icon: Users, label: 'Sellers', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/customers', icon: UserCircle, label: 'Customers', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/billing', icon: Receipt, label: 'Billing', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/finance', icon: Landmark, label: 'Finance & Accounts', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/sales', icon: ShoppingCart, label: 'Sales', roles: ['admin', 'superadmin'] },
    { path: '/expenses', icon: Wallet, label: 'Expenses', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/income', icon: DollarSign, label: 'Income', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/returns', icon: RotateCcw, label: 'Returns', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/adspend', icon: Megaphone, label: 'AdSpend', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/lcs', icon: PawPrint, label: 'LCS', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/po', icon: Truck, label: 'PO', roles: ['admin', 'superadmin', 'manager'] },
    { path: '/book-po', icon: BookOpen, label: 'Book PO', roles: ['admin', 'superadmin', 'manager'] },
  ];

  const navItems = allNavItems.filter(item => !item.roles || item.roles.includes(role));

  const getRoleLabel = () => {
    if (role === 'seller') return 'Seller';
    if (role === 'manager') return 'Manager';
    if (role === 'superadmin') return 'Super Admin';
    return 'Admin';
  };

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-700">
          {isSidebarOpen ? (
            <h1 className="text-2xl font-bold text-white">Etimad Mart</h1>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto sidebar-scroll">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const baseClasses = isActive
              ? 'bg-blue-600 shadow-lg text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white';

            const layoutClasses = isSidebarOpen
              ? 'flex items-center gap-3 px-4 py-3'
              : 'flex items-center justify-center px-0 py-3';

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${layoutClasses} rounded-lg transition-all ${baseClasses}`}
                onMouseEnter={(e) => {
                  if (!isSidebarOpen) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSidebarTooltip({
                      visible: true,
                      label: item.label,
                      top: rect.top + rect.height / 2
                    });
                  }
                }}
                onMouseLeave={() => {
                  if (!isSidebarOpen) {
                    setSidebarTooltip((prev) => ({ ...prev, visible: false }));
                  }
                }}
              >
                <div className="relative flex items-center justify-center">
                  <item.icon size={20} />
                </div>
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-700">
          {isSidebarOpen ? (
            <div className="p-4 space-y-3">
              {/* User Info */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Logged in as</p>
                <p className="text-sm font-semibold text-white">{user?.username || getRoleLabel()}</p>
                {/* <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p> */}
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all"
              >
                <Settings size={18} />
                <span className="font-medium">Change Password</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-400 hover:bg-rose-600/20 hover:text-rose-300 rounded-lg transition-all"
              >
                <LogOut size={18} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="w-full flex items-center justify-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all"
                title="Change Password"
              >
                <Settings size={22} />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 text-rose-400 hover:bg-rose-600/20 hover:text-rose-300 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut size={22} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <Menu size={24} />
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                {getRoleLabel()}
              </div>
              <NotificationCenter
                notifications={notifications}
                onDismiss={dismissNotification}
                onClearAll={clearAllNotifications}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* Collapsed sidebar tooltip (fixed, outside sidebar) */}
      {!isSidebarOpen && sidebarTooltip.visible && (
        <div
          className="fixed left-20 z-50 -translate-y-1/2"
          style={{ top: sidebarTooltip.top }}
        >
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900 text-white shadow-lg whitespace-nowrap">
            {sidebarTooltip.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default Layout;
