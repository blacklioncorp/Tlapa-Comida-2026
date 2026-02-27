import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { OrderProvider } from './contexts/OrderContext';
import { PromotionProvider } from './contexts/PromotionContext';
import { SmartDeliveryProvider } from './contexts/SmartDeliveryContext';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Client Pages
import ClientHome from './pages/client/Home';
import RestaurantDetail from './pages/client/RestaurantDetail';
import Checkout from './pages/client/Checkout';
import OrderTracking from './pages/client/OrderTracking';
import Promotions from './pages/client/Promotions';
import OrderRating from './pages/client/OrderRating';
import ClientOrders from './pages/client/ClientOrders';

// Merchant Pages
import MerchantDashboard from './pages/merchant/Dashboard';
import MenuManager from './pages/merchant/MenuManager';
import MerchantOrderHistory from './pages/merchant/OrderHistory';
import MerchantSettings from './pages/merchant/MerchantSettings';

// Delivery Pages
import DriverHome from './pages/delivery/AvailableOrders';
import ActiveDelivery from './pages/delivery/ActiveDelivery';
import DriverWallet from './pages/delivery/Wallet';
import DriverProfile from './pages/delivery/DriverProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import MerchantManagement from './pages/admin/MerchantManagement';
import UserManagement from './pages/admin/UserManagement';
import OrdersManagement from './pages/admin/OrdersManagement';
import AdminSettings from './pages/admin/AdminSettings';
import FinanceDashboard from './pages/admin/FinanceDashboard';
import CategoryManagement from './pages/admin/CategoryManagement';
import AdminPromotions from './pages/admin/AdminPromotions';
import DeliveryManagement from './pages/admin/DeliveryManagement';

import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid var(--color-primary-bg)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Cargando...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={
        user.role === 'admin' ? '/admin' :
          user.role === 'merchant' ? '/merchant' :
            user.role === 'driver' ? '/delivery' :
              '/'
      } replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

      {/* Client Routes */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['client', 'merchant', 'driver', 'admin']}>
          {user?.role === 'merchant' ? <Navigate to="/merchant" replace /> :
            user?.role === 'driver' ? <Navigate to="/delivery" replace /> :
              <ClientHome />}
        </ProtectedRoute>
      } />
      <Route path="/restaurant/:id" element={<ProtectedRoute allowedRoles={['client']}><RestaurantDetail /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute allowedRoles={['client']}><Checkout /></ProtectedRoute>} />
      <Route path="/tracking/:orderId" element={<ProtectedRoute allowedRoles={['client', 'driver', 'merchant', 'admin']}><OrderTracking /></ProtectedRoute>} />
      <Route path="/promotions" element={<ProtectedRoute allowedRoles={['client']}><Promotions /></ProtectedRoute>} />
      <Route path="/rating/:orderId" element={<ProtectedRoute allowedRoles={['client']}><OrderRating /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute allowedRoles={['client']}><ClientOrders /></ProtectedRoute>} />

      {/* Merchant Routes */}
      <Route path="/merchant" element={<ProtectedRoute allowedRoles={['merchant']}><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/merchant/menu" element={<ProtectedRoute allowedRoles={['merchant']}><MenuManager /></ProtectedRoute>} />
      <Route path="/merchant/orders" element={<ProtectedRoute allowedRoles={['merchant']}><MerchantOrderHistory /></ProtectedRoute>} />
      <Route path="/merchant/settings" element={<ProtectedRoute allowedRoles={['merchant']}><MerchantSettings /></ProtectedRoute>} />

      {/* Delivery Routes */}
      <Route path="/delivery" element={<ProtectedRoute allowedRoles={['driver']}><DriverHome /></ProtectedRoute>} />
      <Route path="/delivery/active/:orderId" element={<ProtectedRoute allowedRoles={['driver']}><ActiveDelivery /></ProtectedRoute>} />
      <Route path="/delivery/wallet" element={<ProtectedRoute allowedRoles={['driver']}><DriverWallet /></ProtectedRoute>} />
      <Route path="/delivery/profile" element={<ProtectedRoute allowedRoles={['driver']}><DriverProfile /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/merchants" element={<ProtectedRoute allowedRoles={['admin']}><MerchantManagement /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['admin']}><CategoryManagement /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="/admin/delivery" element={<ProtectedRoute allowedRoles={['admin']}><DeliveryManagement /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><OrdersManagement /></ProtectedRoute>} />
      <Route path="/admin/promotions" element={<ProtectedRoute allowedRoles={['admin']}><AdminPromotions /></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={['admin']}><FinanceDashboard /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
            <PromotionProvider>
              <SmartDeliveryProvider>
                <AppRoutes />
              </SmartDeliveryProvider>
            </PromotionProvider>
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
