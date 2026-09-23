import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
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
import PostManagement from './pages/PostManagement';

import ShopLayout from './pages/shop/ShopLayout';
import ShopHome from './pages/shop/ShopHome';
import ShopPage from './pages/shop/ShopPage';
import ProductDetail from './pages/shop/ProductDetail';
import Cart from './pages/shop/Cart';
import Checkout from './pages/shop/Checkout';
import OrderSuccess from './pages/shop/OrderSuccess';
import ShopOrders from './pages/shop/ShopOrders';
import ShopProfile from './pages/shop/ShopProfile';
import ShopLogin from './pages/shop/ShopLogin';
import FacebookLoginCallback from './pages/shop/FacebookLoginCallback';
import GoogleLoginCallback from './pages/shop/GoogleLoginCallback';
import ShopRegister from './pages/shop/ShopRegister';
import ShopProtectedRoute from './components/shop/ShopProtectedRoute';
import { CartProvider } from './hooks/useCart';
import { WishlistProvider } from './hooks/useWishlist';
import ShopWishlist from './pages/shop/ShopWishlist';
import ShopGuide from './pages/shop/ShopGuide';
import ShopStories from './pages/shop/ShopStories';
import ShopStoryDetail from './pages/shop/ShopStoryDetail';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Routes>
            <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/register" element={<Register />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/materials" element={<ProtectedRoute><MaterialManagement /></ProtectedRoute>} />
          <Route path="/admin/imports" element={<ProtectedRoute><ImportManagement /></ProtectedRoute>} />
          <Route path="/admin/inventory-checks" element={<ProtectedRoute><InventoryCheckManagement /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><ProductManagement /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
          <Route path="/admin/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/admin/ad-costs" element={<ProtectedRoute><AdCostManagement /></ProtectedRoute>} />
          <Route path="/admin/coupons" element={<ProtectedRoute><CouponManagement /></ProtectedRoute>} />
          <Route path="/admin/fund" element={<ProtectedRoute><FundManagement /></ProtectedRoute>} />
          <Route path="/admin/expenses" element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>} />
          <Route path="/admin/tools/shopee" element={<ProtectedRoute><ShopeeCalculator /></ProtectedRoute>} />
          <Route path="/admin/tools/tiktok" element={<ProtectedRoute><TiktokCalculator /></ProtectedRoute>} />
          <Route path="/admin/posts" element={<ProtectedRoute><PostManagement /></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Shop Public Routes */}
          <Route path="/" element={<ShopLayout />}>
            <Route index element={<ShopHome />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<ShopProtectedRoute><Checkout /></ShopProtectedRoute>} />
            <Route path="payment/:orderId" element={<OrderSuccess paymentFlow />} />
            <Route path="order-success/:orderId" element={<OrderSuccess />} />
            <Route path="orders" element={<ShopOrders />} />
            <Route path="guide" element={<ShopGuide />} />
            <Route path="cam-nang" element={<ShopGuide />} />
            <Route path="stories" element={<ShopStories />} />
            <Route path="stories/:slug" element={<ShopStoryDetail />} />
            <Route path="about" element={<ShopStories />} />
            <Route path="profile" element={<ShopProtectedRoute><ShopProfile /></ShopProtectedRoute>} />
            <Route path="wishlist" element={<ShopProtectedRoute><ShopWishlist /></ShopProtectedRoute>} />
          </Route>

          {/* Shop Auth Routes (No layout wrapper) */}
          <Route path="/login" element={<ShopLogin />} />
          <Route path="/login/facebook/callback" element={<FacebookLoginCallback />} />
          <Route path="/login/google/callback" element={<GoogleLoginCallback />} />
          <Route path="/register" element={<ShopRegister />} />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
