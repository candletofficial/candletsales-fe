import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
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
    to: '/coupons',
    icon: (
      <span className="material-symbols-outlined text-[20px]">local_offer</span>
    ),
    label: 'Khuyến mãi',
  },
  {
    label: 'Công cụ tính',
    isGroup: true,
    icon: (
      <span className="material-symbols-outlined text-[20px]">calculate</span>
    ),
    children: [
      {
        to: '/tools/shopee',
        icon: (
          <span className="w-5 h-5 rounded flex-shrink-0 overflow-hidden">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="18" fill="#EE4D2D"/>
              <path d="M50 18C43.4 18 38 23.4 38 30H28C26.3 30 25 31.3 25 33L22 72C22 73.7 23.3 75 25 75H75C76.7 75 78 73.7 78 72L75 33C75 31.3 73.7 30 72 30H62C62 23.4 56.6 18 50 18ZM50 24C53.3 24 56 26.7 56 30H44C44 26.7 46.7 24 50 24ZM50 52C46.7 52 44 49.3 44 46C44 42.7 46.7 40 50 40C53.3 40 56 42.7 56 46C56 49.3 53.3 52 50 52Z" fill="white"/>
            </svg>
          </span>
        ),
        label: 'Shopee',
      },
      {
        to: '/tools/tiktok',
        icon: (
          <span className="w-5 h-5 bg-[#010101] rounded flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.23 8.23 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>
          </span>
        ),
        label: 'TikTok Shop',
        comingSoon: true,
      },
    ],
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

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-open if on a tool page
    return location.pathname.startsWith('/tools') ? { 'Công cụ tính': true } : {};
  });

  const toggleGroup = (label) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar z-40 ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand flex items-center justify-center">
        <img src="/logo.png" alt="Candlet Shop" className="h-[48px] w-auto object-contain drop-shadow-sm" />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          if (item.isGroup) {
            const isOpen = !!openGroups[item.label];
            const isChildActive = item.children.some(c => location.pathname === c.to);
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`nav-item w-full text-left ${isChildActive ? 'text-primary font-semibold' : ''}`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {isOpen && (
                  <div className="mt-0.5 mb-1 space-y-0.5">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                            isActive
                              ? 'bg-primary-container text-primary font-semibold'
                              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                          }`
                        }
                      >
                        {child.icon}
                        <span className="flex-1">{child.label}</span>
                        {child.comingSoon && (
                          <span className="text-[10px] font-bold bg-[#fef3c7] text-[#d97706] px-1.5 py-0.5 rounded-full">Soon</span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span>Cài đặt</span>
        </NavLink>
        <button 
          onClick={handleLogout}
          className="nav-item w-full text-left cursor-pointer hover:!bg-[#fee2e2] hover:!text-[#dc2626]"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
