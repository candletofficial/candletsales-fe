import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  // JWT của khách hàng vẫn hợp lệ cho các API shop, nhưng không được phép
  // hiển thị bất kỳ màn hình quản trị nào ở frontend.
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
}
