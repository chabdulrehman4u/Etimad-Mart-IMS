import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';

// Authentication & Account Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Core IMS & Omnichannel Operations
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const SellerWorkspace = lazy(() => import('./pages/sellers/SellerWorkspace'));
const Customers = lazy(() => import('./pages/Customers'));
const Billing = lazy(() => import('./pages/Billing'));
const EditBill = lazy(() => import('./pages/EditBill'));
const PurchaseBatches = lazy(() => import('./pages/PurchaseBatches'));
const BookPO = lazy(() => import('./pages/BookPO'));
const Sales = lazy(() => import('./pages/Sales'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const Returns = lazy(() => import('./pages/Returns'));
const PO = lazy(() => import('./pages/PO'));
const AdSpend = lazy(() => import('./pages/AdSpend'));
const LCS = lazy(() => import('./pages/LCS'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const SellerPasswordChange = lazy(() => import('./pages/SellerPasswordChange'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const BusinessSettings = lazy(() => import('./pages/BusinessSettings'));
const OnlineOrders = lazy(() => import('./pages/OnlineOrders'));
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));

// Merged E-Commerce CMS Management Modules
const BannersCMS = lazy(() => import('./pages/BannersCMS'));
const CouponsCMS = lazy(() => import('./pages/CouponsCMS'));
const CategoriesCMS = lazy(() => import('./pages/CategoriesCMS'));
const BlogsCMS = lazy(() => import('./pages/BlogsCMS'));
const StorefrontCMS = lazy(() => import('./pages/StorefrontCMS'));
const BrandsReviewsCMS = lazy(() => import('./pages/BrandsReviewsCMS'));

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <Suspense
              fallback={
                <div className="w-full h-screen flex items-center justify-center text-sm font-semibold text-gray-500 bg-slate-50">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading Etimad Suite...</p>
                  </div>
                </div>
              }
            >
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                {/* Protected Single Command Center - Admin / SuperAdmin / Manager */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'superadmin', 'manager']}>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="business-settings" element={<BusinessSettings />} />
                  <Route path="admin-management" element={<AdminManagement />} />
                  <Route path="products" element={<Products />} />
                  <Route path="sellers" element={<SellerWorkspace />} />
                  <Route path="sellers/*" element={<SellerWorkspace />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="billing/edit/:id" element={<EditBill />} />
                  <Route path="online-orders" element={<OnlineOrders />} />

                  {/* Merged E-Commerce CMS Modules */}
                  <Route path="banners-cms" element={<BannersCMS />} />
                  <Route path="coupons-cms" element={<CouponsCMS />} />
                  <Route path="categories-cms" element={<CategoriesCMS />} />
                  <Route path="blogs-cms" element={<BlogsCMS />} />
                  <Route path="storefront-cms" element={<StorefrontCMS />} />
                  <Route path="brands-reviews-cms" element={<BrandsReviewsCMS />} />

                  {/* Finance & Physical Warehouse Dispatches */}
                  <Route path="finance" element={<FinanceDashboard />} />
                  <Route path="finance/*" element={<FinanceDashboard />} />
                  <Route path="purchase-batches" element={<PurchaseBatches />} />
                  <Route path="book-po" element={<BookPO />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="income" element={<Income />} />
                  <Route path="returns" element={<Returns />} />
                  <Route path="adspend" element={<AdSpend />} />
                  <Route path="po" element={<PO />} />
                  <Route path="lcs" element={<LCS />} />
                </Route>

                {/* Seller Dashboard Routes */}
                <Route
                  path="/seller-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['seller']}>
                      <SellerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seller-change-password"
                  element={
                    <ProtectedRoute allowedRoles={['seller']}>
                      <SellerPasswordChange />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;