import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    to: '/materials',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ),
    label: 'Nguyên vật liệu',
  },
  {
    to: '/imports',
    icon: (
      <span className="material-symbols-outlined text-[20px]">local_shipping</span>
    ),
    label: 'Nhập hàng',
  },
  {
    to: '/inventory-checks',
    icon: (
      <span className="material-symbols-outlined text-[20px]">fact_check</span>
    ),
    label: 'Kiểm kho',
  },
  {
    to: '/products',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 16.2A2 2 0 0 0 21 14.5V9.5A2 2 0 0 0 20 7.8L13 3.8a2 2 0 0 0-2 0L4 7.8A2 2 0 0 0 3 9.5v5A2 2 0 0 0 4 16.2l7 4a2 2 0 0 0 2 0l7-4z" />
        <polyline points="3.29 7.8 12 12.7 20.71 7.8" />
        <line x1="12" y1="22" x2="12" y2="12" />
        <line x1="12" y1="12" x2="12" y2="2" />
      </svg>
    ),
    label: 'Sản phẩm',
  },
  {
    to: '/orders',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
    label: 'Đơn hàng',
  },
  {
    to: '/ad-costs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    label: 'Chi phí Quảng cáo',
  },
  {
    to: '/users',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Quản lý tài khoản',
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand flex items-center justify-center">
        <img src="/logo.png" alt="Candlet Shop" className="h-[48px] w-auto object-contain drop-shadow-sm" />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Admin'}</span>
            {user?.isDefaultAdmin && <span className="badge-root">Root Admin</span>}
          </div>
        </div>
        <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
