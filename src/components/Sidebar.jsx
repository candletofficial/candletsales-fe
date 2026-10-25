import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  {
    isSection: true,
    label: 'Tổng quan',
  },
  {
    to: '/admin/dashboard',
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
    isSection: true,
    label: 'Quản lý Kho',
  },
  {
    to: '/admin/materials',
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
    to: '/admin/imports',
    icon: (
      <span className="material-symbols-outlined text-[20px]">local_shipping</span>
    ),
    label: 'Nhập hàng',
  },
  {
    to: '/admin/inventory-checks',
    icon: (
      <span className="material-symbols-outlined text-[20px]">fact_check</span>
    ),
    label: 'Kiểm kho',
  },
  {
    isSection: true,
    label: 'Bán hàng',
  },
  {
    to: '/admin/products',
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
    to: '/admin/pos',
    icon: (
      <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
    ),
    label: 'POS Bán hàng',
  },
  {
    to: '/admin/orders',
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
    to: '/admin/messenger-bot',
    icon: (
      <span className="material-symbols-outlined text-[20px]">smart_toy</span>
    ),
    label: 'Bot Messenger',
  },
  {
    isSection: true,
    label: 'Tài chính & Marketing',
  },
  {
    to: '/admin/fund',
    icon: (
      <span className="material-symbols-outlined text-[20px]">account_balance</span>
    ),
    label: 'Tài sản chung',
  },
  {
    to: '/admin/expenses',
    icon: (
      <span className="material-symbols-outlined text-[20px]">receipt_long</span>
    ),
    label: 'Chi tiêu',
  },
  {
    to: '/admin/ad-costs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    label: 'Chi phí Quảng cáo',
  },
  {
    to: '/admin/coupons',
    icon: (
      <span className="material-symbols-outlined text-[20px]">local_offer</span>
    ),
    label: 'Khuyến mãi',
  },
  {
    to: '/admin/posts',
    icon: (
      <span className="material-symbols-outlined text-[20px]">auto_stories</span>
    ),
    label: 'Bài viết & Câu chuyện',
  },
  {
    isSection: true,
    label: 'Công cụ',
  },
  {
    label: 'Công cụ tính',
    isGroup: true,
    icon: (
      <span className="material-symbols-outlined text-[20px]">calculate</span>
    ),
    children: [
      {
        to: '/admin/tools/shopee',
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
        to: '/admin/tools/tiktok',
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
    isSection: true,
    label: 'Hệ thống',
  },
  {
    to: '/admin/users',
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

const QUICK_ACCESS_KEY = 'candlet-admin-quick-access';
const NAV_LINKS = NAV_ITEMS.flatMap((item) => item.isGroup ? item.children : item.to ? [item] : []);

const readQuickAccess = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_ACCESS_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((path) => NAV_LINKS.some((item) => item.to === path)).slice(0, 8) : [];
  } catch { return []; }
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-open if on a tool page
    return location.pathname.startsWith('/admin/tools') ? { 'Công cụ tính': true } : {};
  });
  const [quickAccess, setQuickAccess] = useState(readQuickAccess);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => { localStorage.setItem(QUICK_ACCESS_KEY, JSON.stringify(quickAccess)); }, [quickAccess]);
  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const toggleGroup = (label) => setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const displayName = user?.name || 'Quản trị viên';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const linkClass = (isActive) => `group relative mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${isActive
    ? 'bg-[#F5EFE6] text-[#4A2C2A] shadow-[0_5px_16px_rgba(91,48,40,.08)]'
    : 'text-[#665a56] hover:translate-x-0.5 hover:bg-white hover:text-[#2C1810] hover:shadow-sm'}`;
  const quickItems = quickAccess.map((path) => NAV_LINKS.find((item) => item.to === path)).filter(Boolean);
  const openContextMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 230; const menuHeight = 104;
    setContextMenu({ item, x: Math.min(event.clientX, window.innerWidth - menuWidth - 10), y: Math.min(event.clientY, window.innerHeight - menuHeight - 10) });
  };
  const toggleQuickAccess = (item) => {
    setQuickAccess((current) => current.includes(item.to) ? current.filter((path) => path !== item.to) : [...current, item.to].slice(-8));
    setContextMenu(null);
  };

  return (
    <aside aria-label="Điều hướng quản trị" className={`sidebar z-40 overflow-hidden border-r border-[#e8dfdb] bg-[#FAF7F2] shadow-[8px_0_30px_rgba(50,35,30,.035)] ${isOpen ? 'open' : ''}`}>
      <div className="relative flex h-[88px] shrink-0 items-center border-b border-[#ebe2de] bg-white px-5">
        <div className="absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#ead4ca]/35 blur-2xl" />
        <div className="relative flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FFF9F2] to-[#f1dfd7] shadow-sm"><img src="/logo.png" alt="CandletShop" className="h-9 w-9 object-contain" /></div>
          <div className="min-w-0"><p className="truncate text-[15px] font-black tracking-tight text-[#2C1810]">Candlet Admin</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.18em] text-[#a27666]">Management workspace</p></div>
        </div>
        <button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#806e68] transition hover:bg-[#f3e9e5] lg:hidden" aria-label="Đóng thanh điều hướng"><span className="material-symbols-outlined text-[20px]">close</span></button>
      </div>

      <nav className="sidebar-nav overflow-y-auto overflow-x-hidden py-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#dccbc4]">
        {quickItems.length > 0 && <div className="mb-2 rounded-2xl border border-[#EAE1D2] bg-white/80 py-2 shadow-[0_4px_16px_rgba(70,45,38,.04)]"><div className="flex items-center justify-between px-4 pb-1.5"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8C4A32]">Truy cập nhanh</p><span className="material-symbols-outlined text-[15px] text-[#b17864]">star</span></div><div className="space-y-0.5">{quickItems.map((item) => <NavLink key={`quick-${item.to}`} to={item.to} onClick={onClose} onContextMenu={(event) => openContextMenu(event, item)} className={({ isActive }) => `group mx-2 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-bold transition ${isActive ? 'bg-[#4A2C2A] text-white shadow-sm' : 'text-[#62534e] hover:bg-[#F5EFE6] hover:text-[#381B18]'}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#F5EFE6] text-[#4A2C2A] [&_.material-symbols-outlined]:text-[17px] [&_svg]:h-[17px] [&_svg]:w-[17px]">{item.icon}</span><span className="truncate">{item.label}</span><span className="material-symbols-outlined ml-auto text-[14px] opacity-0 transition group-hover:opacity-60">more_horiz</span></NavLink>)}</div></div>}
        {NAV_ITEMS.map((item, idx) => {
          if (item.isSection) {
            return (
              <div key={`sec-${idx}`} className="flex items-center gap-2 px-4 pb-1.5 pt-4 first:pt-1">
                <p className="shrink-0 text-[9px] font-black uppercase tracking-[.18em] text-[#a28f88]">{item.label}</p><span className="h-px flex-1 bg-gradient-to-r from-[#e5d9d4] to-transparent" />
              </div>
            );
          }
          if (item.isGroup) {
            const isOpen = !!openGroups[item.label];
            const isChildActive = item.children.some(c => location.pathname === c.to);
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`${linkClass(isChildActive)} w-[calc(100%_-_1rem)] text-left`}
                >
                  {isChildActive && <span className="absolute -left-2 h-6 w-1 rounded-r-full bg-[#4A2C2A]" />}
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${isChildActive ? 'bg-[#4A2C2A] text-white shadow-sm' : 'bg-white text-[#806d66] shadow-[0_2px_8px_rgba(50,35,30,.06)] group-hover:text-[#4A2C2A]'}`}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <span className={`material-symbols-outlined text-[17px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="min-h-0 overflow-hidden"><div className="mb-1 ml-7 mt-1 space-y-1 border-l border-[#E3D8C7] pl-2">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={onClose}
                        onContextMenu={(event) => openContextMenu(event, child)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all ${
                            isActive
                              ? 'bg-white text-[#4A2C2A] shadow-sm'
                              : 'text-[#756660] hover:bg-white hover:text-[#2C1810]'
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
                  </div></div>
                </div>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              onContextMenu={(event) => openContextMenu(event, item)}
              className={({ isActive }) => linkClass(isActive)}
            >
              {({ isActive }) => <><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${isActive ? 'bg-[#4A2C2A] text-white shadow-sm' : 'bg-white text-[#806d66] shadow-[0_2px_8px_rgba(50,35,30,.06)] group-hover:text-[#4A2C2A]'}`}>{item.icon}</span><span className="truncate">{item.label}</span>{isActive && <><span className="absolute -left-2 h-6 w-1 rounded-r-full bg-[#4A2C2A]" /><span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#a96650]" /></>}</>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer shrink-0 border-t border-[#e8dfdb] bg-white p-3">
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-[#f8f3f1] p-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#4A2C2A] to-[#8C4A32] text-xs font-black text-white shadow-sm">{initials || 'AD'}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#3c2e2a]">{displayName}</span><span className="mt-0.5 block text-[9px] font-semibold text-[#927d75]">{user?.isDefaultAdmin ? 'Quản trị viên chính' : 'Quản trị viên'}</span></span><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_#d1fae5]" /></div>
        <div className="grid grid-cols-2 gap-2"><NavLink to="/admin/settings" onClick={onClose} className={({ isActive }) => `flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-[11px] font-bold transition ${isActive ? 'bg-[#F5EFE6] text-[#4A2C2A]' : 'bg-[#FAF7F2] text-[#6f605b] hover:bg-[#F5EFE6] hover:text-[#4A2C2A]'}`}><span className="material-symbols-outlined text-[17px]">settings</span>Cài đặt</NavLink><button onClick={handleLogout} className="flex items-center justify-center gap-2 rounded-xl bg-[#FAF7F2] px-2 py-2.5 text-[11px] font-bold text-[#6f605b] transition hover:bg-red-50 hover:text-red-700"><span className="material-symbols-outlined text-[17px]">logout</span>Đăng xuất</button></div>
      </div>
      {contextMenu && <div role="menu" className="fixed z-[100] w-[230px] overflow-hidden rounded-2xl border border-[#E3D8C7] bg-white p-1.5 shadow-[0_18px_50px_rgba(45,28,24,.22)]" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}><div className="border-b border-[#eee5e1] px-3 py-2"><p className="truncate text-[10px] font-black uppercase tracking-[.12em] text-[#a0857c]">{contextMenu.item.label}</p></div><button type="button" role="menuitem" onClick={() => toggleQuickAccess(contextMenu.item)} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-[#4d3933] transition hover:bg-[#F5EFE6] hover:text-[#4A2C2A]"><span className="material-symbols-outlined text-[18px]">{quickAccess.includes(contextMenu.item.to) ? 'star' : 'star_outline'}</span>{quickAccess.includes(contextMenu.item.to) ? 'Gỡ khỏi truy cập nhanh' : 'Thêm vào truy cập nhanh'}</button></div>}
    </aside>
  );
}
