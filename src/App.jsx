import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import MaterialManagement from './pages/MaterialManagement';
import ProductManagement from './pages/ProductManagement';
import OrderManagement from './pages/OrderManagement';
import AdCostManagement from './pages/AdCostManagement';
import ImportManagement from './pages/ImportManagement';
import InventoryCheckManagement from './pages/InventoryCheckManagement';
import ShopeeCalculator from './pages/ShopeeCalculator';
import TiktokCalculator from './pages/TiktokCalculator';
import CouponManagement from './pages/CouponManagement';
import FundManagement from './pages/FundManagement';
import ExpenseManagement from './pages/ExpenseManagement';
import POS from './pages/POS';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/materials" element={<ProtectedRoute><MaterialManagement /></ProtectedRoute>} />
          <Route path="/imports" element={<ProtectedRoute><ImportManagement /></ProtectedRoute>} />
          <Route path="/inventory-checks" element={<ProtectedRoute><InventoryCheckManagement /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><ProductManagement /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/ad-costs" element={<ProtectedRoute><AdCostManagement /></ProtectedRoute>} />
          <Route path="/coupons" element={<ProtectedRoute><CouponManagement /></ProtectedRoute>} />
          <Route path="/fund" element={<ProtectedRoute><FundManagement /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>} />
          <Route path="/tools/shopee" element={<ProtectedRoute><ShopeeCalculator /></ProtectedRoute>} />
          <Route path="/tools/tiktok" element={<ProtectedRoute><TiktokCalculator /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
