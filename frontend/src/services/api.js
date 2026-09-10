import axios from 'axios';
import {baseURL} from './baseURL'


const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

const API_URL = baseURL;

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Products
export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getLowStockProducts = () => api.get('/products/low-stock');
export const addProductStockByBarcode = (data) => api.post('/products/add-stock-by-barcode', data);

// Sellers
export const getSellers = () => api.get('/sellers');
export const getSeller = (id) => api.get(`/sellers/${id}`);
export const createSeller = (data) => api.post('/sellers', data);
export const updateSeller = (id, data) => api.put(`/sellers/${id}`, data);
export const deleteSeller = (id) => api.delete(`/sellers/${id}`);
export const getSellerLeaderboard = () => api.get('/sellers/leaderboard');

// Customers
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Sales
export const getSales = () => api.get('/sales');
export const getSale = (id) => api.get(`/sales/${id}`);
export const createSale = (data) => api.post('/sales', data);
export const deleteSale = (id) => api.delete(`/sales/${id}`);

// Dashboard 
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getChartData = () => api.get('/dashboard/chart-data');

// PDF
export const generateInvoice = (id) => `${API_URL}/pdf/invoice/${id}`;

// Auth
export const changePassword = (data) => api.put('/auth/change-password', data);
export const forgotPassword = (email) => axios.post(`${API_URL}/auth/forgot-password`, { email });
export const resetPassword = (data) => axios.put(`${API_URL}/auth/reset-password`, data);
export const getInviteCode = () => api.get('/auth/invite-code');

// Categories
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Bills
export const getBills = (params) => api.get('/bills', { params });
export const getBill = (id) => api.get(`/bills/${id}`);
export const createBill = (data) => api.post('/bills', data);
export const updateBill = (id, data) => api.put(`/bills/${id}`, data);
export const updateBillStatus = (id, status) => api.patch(`/bills/${id}/status`, { status });
export const deleteBill = (id) => api.delete(`/bills/${id}`);
export const getBillStockMovements = (id) => api.get(`/bills/${id}/stock-movements`);
export const getCustomerHistory = (customerId, params) => api.get(`/bills/customer/${customerId}/history`, { params });
export const getBillingStats = () => api.get('/bills/stats/overview');
export const getCustomerLastProductPrice = (customerId, productId) =>
  api.get(`/bills/customer/${customerId}/last-price`, { params: { productId } });
export const addBillPayment = (id, data) => api.post(`/bills/${id}/payments`, data);

// Expenses
export const getExpenses = (params) => api.get('/expenses', { params });
export const createExpense = (data) => api.post('/expenses', data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
export const getExpenseStats = () => api.get('/expenses/stats/overview');

// Income
export const getIncomes = (params) => api.get('/incomes', { params });
export const createIncome = (data) => api.post('/incomes', data);

// Admin management
export const getAdmins = () => api.get('/admins');
export const updateAdminRole = (id, role) => api.put(`/admins/${id}/role`, { role });

// Returns
export const getReturns = (params) => api.get('/returns', { params });
export const createReturn = (data) => api.post('/returns', data);

// Parcels (PO)
export const getParcels = (params) => api.get('/parcels', { params });
export const createParcel = (data) => api.post('/parcels', data);
export const updateParcelStatus = (id, data) => api.patch(`/parcels/${id}/status`, data);
export const updateParcel = (id, data) => api.put(`/parcels/${id}`, data);
export const deleteParcel = (id) => api.delete(`/parcels/${id}`);

// Book PO orders (Urdu chits)
export const getBookPOs = (params) => api.get('/book-po', { params });
export const createBookPO = (data) => api.post('/book-po', data);
export const updateBookPO = (id, data) => api.put(`/book-po/${id}`, data);
export const lookupBookPO = (value) => api.get(`/book-po/lookup/${encodeURIComponent(value)}`);

// AdSpend
export const getAdSpends = (params) => api.get('/adspend', { params });
export const upsertAdSpend = (data) => api.post('/adspend', data);

// Dispatch Records
export const getDispatchRecords = (params) => api.get('/dispatch-records', { params });
export const upsertDispatchRecord = (data) => api.post('/dispatch-records', data);

// Purchase Batches
export const getPurchaseBatches = (params) => api.get('/purchase-batches', { params });
export const createPurchaseBatch = (data) => api.post('/purchase-batches', data);
export const updatePurchaseBatch = (id, data) => api.put(`/purchase-batches/${id}`, data);
export const deletePurchaseBatch = (id) => api.delete(`/purchase-batches/${id}`);

// LCS
export const getLcsBookedPacketLastStatus = (params) => api.get('/lcs/booked-packets/last-status', { params });

// LCS Parcels (local DB)
export const getLcsParcels = (params) => api.get('/lcs-parcels', { params });
export const syncLcsParcels = (data) => api.post('/lcs-parcels/sync', data);
export const updateLcsParcelProducts = (id, data) => api.patch(`/lcs-parcels/${id}/products`, data);
export const getLcsParcelByCn = (cn) => api.get(`/lcs-parcels/by-cn/${encodeURIComponent(cn)}`);

// Finance & Accounting Module
export const getFinanceOverview = () => api.get('/finance/overview');
export const getFinanceSetup = () => api.get('/finance/setup');
export const saveFinanceSetup = (data) => api.post('/finance/setup', data);
export const getFinanceBanks = () => api.get('/finance/banks');
export const createFinanceBank = (data) => api.post('/finance/banks', data);
export const updateFinanceBank = (id, data) => api.put(`/finance/banks/${id}`, data);
export const addFinanceBankTransaction = (data) => api.post('/finance/banks/transactions', data);
export const getFinancePettyCash = () => api.get('/finance/petty-cash');
export const addFinancePettyCashTransaction = (data) => api.post('/finance/petty-cash', data);
export const getFinancePayables = (params) => api.get('/finance/payables', { params });
export const createFinancePayable = (data) => api.post('/finance/payables', data);
export const payFinancePayable = (id, data) => api.post(`/finance/payables/${id}/pay`, data);
export const getFinanceReceivables = (params) => api.get('/finance/receivables', { params });
export const receiveFinanceReceivablePayment = (billId, data) => api.post(`/finance/receivables/${billId}/pay`, data);
export const adjustFinanceBillReceivable = (billId, data) => api.post(`/finance/receivables/${billId}/adjust`, data);
export const receiveFinanceOpeningReceivablePayment = (itemId, data) => api.post(`/finance/receivables/opening/${itemId}/pay`, data);
export const adjustFinanceOpeningReceivable = (itemId, data) => api.put(`/finance/receivables/opening/${itemId}/adjust`, data);
export const markAllFinanceReceivablesCollected = () => api.post('/finance/receivables/mark-all-collected');
export const getFinanceOwnerCapital = () => api.get('/finance/owner-capital');
export const addFinanceOwnerInvestment = (data) => api.post('/finance/owner-capital/investment', data);
export const addFinanceOwnerWithdrawal = (data) => api.post('/finance/owner-capital/withdrawal', data);
export const getFinancePurchases = (params) => api.get('/finance/purchases', { params });
export const createFinancePurchase = (data) => api.post('/finance/purchases', data);
export const updateFinancePurchase = (id, data) => api.put(`/finance/purchases/${id}`, data);
export const deleteFinancePurchase = (id) => api.delete(`/finance/purchases/${id}`);
export const getFinancePnL = (params) => api.get('/finance/pnl', { params });
export const getFinanceCashFlow = (params) => api.get('/finance/cash-flow', { params });
export const getFinanceTrend = (params) => api.get('/finance/trend', { params });
export const getFinanceLedger = (params) => api.get('/finance/ledger', { params });
export const voidFinanceLedger = (id, data) => api.post(`/finance/ledger/${id}/void`, data);

export default api;
