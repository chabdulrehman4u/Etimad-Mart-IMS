import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Sellers = lazy(() => import('./pages/Sellers'));
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
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <Suspense
              fallback={
                <div className="w-full h-screen flex items-center justify-center text-sm text-gray-600">
                  Loading...
                </div>
              }
            >
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected Routes - Admin / Manager area */}
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'superadmin', 'manager']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="admin-management" element={<AdminManagement />} />
                <Route path="products" element={<Products />} />
                <Route path="sellers" element={<Sellers />} />
                <Route path="customers" element={<Customers />} />
                <Route path="billing" element={<Billing />} />
                <Route path="billing/edit/:id" element={<EditBill />} />
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

              {/* Seller Dashboard Route */}
              <Route
                path="/seller-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['seller']}>
                    <SellerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Seller Password Change Route */}
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