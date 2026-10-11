import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';

// Storefront Pages (Public Customer Facing)
const StorefrontHome = lazy(() => import('./storefront/pages/StorefrontHome'));
const StorefrontShop = lazy(() => import('./storefront/pages/StorefrontShop'));
const StorefrontProductDetail = lazy(() => import('./storefront/pages/StorefrontProductDetail'));
const StorefrontCart = lazy(() => import('./storefront/pages/StorefrontCart'));
const StorefrontCheckout = lazy(() => import('./storefront/pages/StorefrontCheckout'));
const StorefrontTrackOrder = lazy(() => import('./storefront/pages/StorefrontTrackOrder'));
const StorefrontBlog = lazy(() => import('./storefront/pages/StorefrontBlog'));
const StorefrontBlogPost = lazy(() => import('./storefront/pages/StorefrontBlogPost'));
const StorefrontDynamicPage = lazy(() => import('./storefront/pages/StorefrontDynamicPage'));

// Admin & IMS Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
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

// New Single Dashboard CMS UI Pages
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
            <CartProvider>
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
                  {/* ===== PUBLIC STOREFRONT ROUTES ===== */}
                  <Route path="/" element={<StorefrontHome />} />
                  <Route path="/shop" element={<StorefrontShop />} />
                  <Route path="/product/:slug" element={<StorefrontProductDetail />} />
                  <Route path="/cart" element={<StorefrontCart />} />
                  <Route path="/checkout" element={<StorefrontCheckout />} />
                  <Route path="/track-order" element={<StorefrontTrackOrder />} />
                  <Route path="/blogs" element={<StorefrontBlog />} />
                  <Route path="/blogs/:slug" element={<StorefrontBlogPost />} />
                  <Route path="/page/:slug" element={<StorefrontDynamicPage />} />

                  {/* ===== AUTH ROUTES ===== */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />

                  {/* Quick Admin Aliases */}
                  <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />

                  {/* ===== PROTECTED ADMIN & IMS SUITE ROUTES ===== */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'superadmin', 'manager']}>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/business-settings" element={<BusinessSettings />} />
                    <Route path="/admin-management" element={<AdminManagement />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/sellers" element={<SellerWorkspace />} />
                    <Route path="/sellers/*" element={<SellerWorkspace />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/billing/edit/:id" element={<EditBill />} />
                    <Route path="/online-orders" element={<OnlineOrders />} />
                    
                    {/* CMS Management Views in Single Dashboard */}
                    <Route path="/banners-cms" element={<BannersCMS />} />
                    <Route path="/coupons-cms" element={<CouponsCMS />} />
                    <Route path="/categories-cms" element={<CategoriesCMS />} />
                    <Route path="/blogs-cms" element={<BlogsCMS />} />
                    <Route path="/storefront-cms" element={<StorefrontCMS />} />
                    <Route path="/brands-reviews-cms" element={<BrandsReviewsCMS />} />

                    {/* Finance & Logistics */}
                    <Route path="/finance" element={<FinanceDashboard />} />
                    <Route path="/finance/*" element={<FinanceDashboard />} />
                    <Route path="/purchase-batches" element={<PurchaseBatches />} />
                    <Route path="/book-po" element={<BookPO />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/income" element={<Income />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/adspend" element={<AdSpend />} />
                    <Route path="/po" element={<PO />} />
                    <Route path="/lcs" element={<LCS />} />
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

                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </CartProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;