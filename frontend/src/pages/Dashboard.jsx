import React, { useEffect, useState } from 'react';
import { getDashboardStats, getChartData } from '../services/api';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import { Package, Users, UserCircle, ShoppingCart, AlertTriangle, DollarSign, TrendingUp, Globe, MapPin, Boxes, Wallet, Coins } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        getDashboardStats(),
        getChartData()
      ]);

      setStats(statsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Whole Stock Worth',
      value: `Rs. ${stats?.totalStockWorth?.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      subtitle: 'Original Price × Stock',
      icon: Wallet,
      color: 'bg-emerald-600',
      change: `${stats?.totalStockQuantity?.toLocaleString('en-PK') || 0} units`
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      subtitle: `${stats?.totalStockQuantity?.toLocaleString('en-PK') || 0} units in stock`,
      icon: Package,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Total Revenue',
      value: `Rs. ${stats?.totalRevenue?.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-blue-700',
      change: '+15%'
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales || 0,
      icon: ShoppingCart,
      color: 'bg-indigo-500',
      change: '+23%'
    },
    {
      title: 'Total Sellers',
      value: stats?.totalSellers || 0,
      icon: Users,
      color: 'bg-purple-600',
      change: '+5%'
    },
    {
      title: 'Online Customers',
      value: stats?.onlineCustomers || 0,
      icon: Globe,
      color: 'bg-sky-500',
      change: '+22%'
    },
    {
      title: 'Offline Customers',
      value: stats?.offlineCustomers || 0,
      icon: MapPin,
      color: 'bg-cyan-500',
      change: '+15%'
    },
    {
      title: 'Low Stock Alerts',
      value: stats?.lowStockProducts || 0,
      icon: AlertTriangle,
      color: 'bg-rose-500',
      change: 'Action needed'
    },
  ];

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#64748b', '#f43f5e'];

  return (
    <div className="space-y-8">
      {/* Whole Stock Worth Highlight Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-2.5 text-emerald-200">
              <Boxes size={14} />
              Whole Stock Worth
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Rs. {stats?.totalStockWorth?.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </h2>
            <p className="text-emerald-100/90 text-sm mt-1.5 flex flex-wrap items-center gap-2">
              <span>Calculation:</span>
              <span className="font-semibold text-white bg-emerald-800/60 px-2 py-0.5 rounded border border-emerald-600/40">
                Original Price × Available Quantity
              </span>
              <span className="text-emerald-200 text-xs">
                ({stats?.totalProducts || 0} products, {stats?.totalStockQuantity?.toLocaleString('en-PK') || 0} total units in stock)
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-emerald-500/30 pt-4 lg:pt-0 lg:pl-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
              <p className="text-xs text-emerald-200 font-medium">Catalog Products</p>
              <p className="text-2xl font-bold mt-0.5 text-white">{stats?.totalProducts || 0}</p>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">Active in portal</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
              <p className="text-xs text-emerald-200 font-medium">Available Units</p>
              <p className="text-2xl font-bold mt-0.5 text-white">{stats?.totalStockQuantity?.toLocaleString('en-PK') || 0}</p>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">Physical units in stock</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10 col-span-2 sm:col-span-1">
              <p className="text-xs text-emerald-200 font-medium">Potential Retail Value</p>
              <p className="text-2xl font-bold mt-0.5 text-white">
                Rs. {stats?.totalRetailWorth?.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
              </p>
              <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                Margin: +Rs. {((stats?.totalRetailWorth || 0) - (stats?.totalStockWorth || 0)).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-xl transition-shadow duration-300 border-0 shadow-lg overflow-hidden">
            <CardBody className="relative">
              {/* Decorative gradient background */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-10 rounded-full -mr-16 -mt-16`}></div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{stat.title}</p>
                  <p className={`font-bold text-gray-900 mt-1 ${typeof stat.value === 'string' && stat.value.includes('Rs.')
                      ? 'text-xl'
                      : 'text-3xl'
                    }`}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString('en-PK') : stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-xl shadow-lg flex-shrink-0`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Revenue & Orders Trend */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📈</span>
            </div>
            Revenue & Orders Trend (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardBody className="p-6">
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 'dataMax + 1000']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                  formatter={(value, name) => [
                    name === 'Revenue (PKR)'
                      ? `Rs. ${value.toLocaleString('en-PK')}`
                      : value,
                    name
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="totalSales"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue (PKR)"
                  dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                  name="Orders"
                  dot={{ fill: '#6366f1', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="text-4xl mb-2 block">📊</span>
                <p>No sales data yet</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🏆</span>
              </div>
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stats.topProducts} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="_id"
                    tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 500 }}
                    angle={-35}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[12, 12, 0, 0]}
                    name="Units Sold"
                  >
                    {stats.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">🏆</span>
                  <p>No sales data yet</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Category Distribution */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📊</span>
              </div>
              Sales by Category
            </CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            {stats?.salesByCategory && stats.salesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={stats.salesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry) => {
                      const percent = ((entry.totalSales / stats?.totalRevenue) * 100).toFixed(1);
                      return `${entry._id} ${percent}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalSales"
                    paddingAngle={2}
                  >
                    {stats.salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `Rs. ${value.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📊</span>
                  <p>No category data yet</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent Sales & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🛒</span>
              </div>
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {stats?.recentSales && stats.recentSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stats.recentSales.slice(0, 5).map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{sale.productName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{sale.customerName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-emerald-600">
                            Rs. {sale.total.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">🛒</span>
                  <p>No recent sales</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Low Stock Items */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-red-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">⚠️</span>
              </div>
              Low Stock Alert
              {stats?.lowStockItems && stats.lowStockItems.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-full">
                  {stats.lowStockItems.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alert At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stats.lowStockItems.slice(0, 5).map((product) => (
                      <tr key={product._id} className="hover:bg-rose-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.category}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stock === 0
                                ? 'bg-rose-100 text-rose-800'
                                : product.stock < product.lowStockAlert / 2
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                              {product.stock === 0 ? 'Out of Stock' : `${product.stock} units`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{product.lowStockAlert || 10} units</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">✅</span>
                  <p className="font-medium text-emerald-600">All products are well stocked!</p>
                  <p className="text-sm text-gray-500 mt-1">No low stock alerts</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
