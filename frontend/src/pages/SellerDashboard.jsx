import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, DollarSign, TrendingUp, ShoppingCart, LogOut, KeyRound } from 'lucide-react';
import axios from 'axios';
import { baseURL } from '../services/baseURL';

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user, userType, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);

  const API_URL = baseURL || 'http://localhost:4000/api';

  useEffect(() => {
    fetchSellerStats();
    fetchSalesHistory();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fetchSellerStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/seller-dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/seller-dashboard/recent-sales?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSales(response.data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.name || 'Seller'}!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm text-gray-500">Role</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Seller
                </span>
              </div>
              <button
                onClick={() => navigate('/seller-change-password')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                title="Change Password"
              >
                <KeyRound size={18} />
                <span className="hidden sm:inline">Change Password</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to Seller Portal! 👋</h2>
          <p className="text-blue-100">Track your sales and manage your performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Sales"
            value={stats?.totalSales || 0}
            icon={ShoppingCart}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Revenue"
            value={`Rs. ${(stats?.totalRevenue || 0).toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            icon={DollarSign}
            color="bg-emerald-500"
          />
          <StatCard
            title="Commission Earned"
            value={`Rs. ${(stats?.totalCommission || 0).toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            icon={TrendingUp}
            color="bg-indigo-500"
          />
          <StatCard
            title="Products Sold"
            value={stats?.totalProductsSold || 0}
            icon={Package}
            color="bg-purple-500"
          />
        </div>

        {/* Sales History */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📋 My Sales History
            </h3>
            <p className="text-sm text-gray-600 mt-1">All sales transactions made by you</p>
          </div>

          <div className="overflow-x-auto">
            {salesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg font-medium">No sales yet</p>
                <p className="text-gray-400 text-sm mt-2">Your sales history will appear here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(sale.createdAt).toLocaleDateString('en-PK', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(sale.createdAt).toLocaleTimeString('en-PK', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{sale.productName}</div>
                        <div className="text-xs text-gray-500">Rs. {sale.unitPrice?.toLocaleString('en-PK')} each</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sale.customerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {sale.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          Rs. {sale.total?.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-emerald-600">
                          Rs. {sale.commission?.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {sales.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Showing {sales.length} sale{sales.length !== 1 ? 's' : ''}
                </span>
                <span className="font-medium text-gray-900">
                  Total Commission: Rs. {sales.reduce((sum, sale) => sum + (sale.commission || 0), 0).toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Account Info Card */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Account Information</h3>
            <p className="text-gray-600 mb-6">
              Your seller account details
            </p>
            <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
              <h4 className="font-semibold text-gray-900 mb-3">Your Details:</h4>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Commission Rate:</span>
                  <span className="font-medium text-gray-900">{user?.commissionRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">{title}</p>
          <p className={`font-bold text-gray-900 ${
            typeof value === 'string' && value.includes('Rs.') 
              ? 'text-lg' 
              : 'text-2xl'
          }`}>
            {value}
          </p>
        </div>
        <div className={`${color} p-3 rounded-lg flex-shrink-0`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
