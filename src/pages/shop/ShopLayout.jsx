import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuth } from '../../hooks/useAuth';
import systemConfigService from '../../services/systemConfigService';
import { orderService } from '../../services/orderService';
import { useWebsiteTheme } from '../../hooks/useWebsiteTheme';
import HalloweenDecor from '../../components/shop/HalloweenDecor';

const HalloweenBatMark = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 64 28" fill="none" aria-hidden="true">
    <path d="M32 13C27 5 18 2 8 4c3 3 4 6 4 9-4-2-8-2-12 0 6 2 10 6 13 11 5-4 10-4 15-2 1-4 2-7 4-9Zm0 0C37 5 46 2 56 4c-3 3-4 6-4 9 4-2 8-2 12 0-6 2-10 6-13 11-5-4-10-4-15-2-1-4-2-7-4-9Z" fill="currentColor" />
    <ellipse cx="32" cy="15" rx="4" ry="9" fill="currentColor" />
  </svg>
);

const HalloweenPumpkinMark = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 76 68" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="pumpkin-body" x1="11" y1="13" x2="65" y2="61" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFB13B" />
        <stop offset="0.48" stopColor="#F47616" />
        <stop offset="1" stopColor="#B9360A" />
      </linearGradient>
      <linearGradient id="pumpkin-glow" x1="23" y1="27" x2="54" y2="49" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE19A" />
        <stop offset="1" stopColor="#FF9D2E" />
      </linearGradient>
      <filter id="pumpkin-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#16091D" floodOpacity=".38" />
      </filter>
    </defs>
    <g filter="url(#pumpkin-shadow)">
      <path d="M36 16c-1-7 2-12 7-15 2 6 1 11-2 16" fill="#547044" />
      <path d="M39 12c7-5 13-4 18-1-6 1-9 4-13 8" fill="#6F8A4F" />
      <path d="M38 14C18 11 7 24 9 41c2 17 17 23 29 23s27-6 29-23C69 24 58 11 38 14Z" fill="url(#pumpkin-body)" />
      <path d="M37 15C24 15 20 28 21 41c1 13 7 21 17 23" stroke="#B9400D" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <path d="M40 15c13 0 17 13 16 26-1 13-7 21-17 23" stroke="#8E2A0C" strokeWidth="3" strokeLinecap="round" opacity=".5" />
      <path d="M38 16v46" stroke="#FFB54C" strokeWidth="2" strokeLinecap="round" opacity=".45" />
      <path d="m20 31 14 4-12 9-5-5 3-8Zm36 0-14 4 12 9 5-5-3-8Z" fill="#26102D" />
      <path d="M22 49c9 4 23 4 32 0l-4 10-6-4-6 6-6-6-6 4-4-10Z" fill="#26102D" />
      <path d="m24 50 5 2-3 3m24-5-5 2 3 3" stroke="url(#pumpkin-glow)" strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
      <path d="M17 24c5-6 12-8 18-8" stroke="#FFD27A" strokeWidth="2.2" strokeLinecap="round" opacity=".62" />
    </g>
  </svg>
);

export default function ShopLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopAddress, setShopAddress] = useState('');
  const [unfinishedOrderCount, setUnfinishedOrderCount] = useState(0);
  const dropdownRef = useRef(null);

  const { cartItemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const { config: websiteTheme } = useWebsiteTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?._id || user?.id;

  // Ẩn thanh Bottom Nav 5 tab ở trang chi tiết sản phẩm, giỏ hàng và thanh toán
  const isBottomNavHidden = location.pathname.startsWith('/product/')
    || location.pathname.startsWith('/order-success/')
    || location.pathname.startsWith('/payment/')
    || location.pathname === '/cart'
    || location.pathname === '/checkout';

  // Dùng cùng cấu hình địa chỉ shop với trang Cài đặt website của admin.
  useEffect(() => {
    let active = true;
    systemConfigService.getConfig('shop_address')
      .then((response) => {
        const address = response?.data?.value;
        if (active && typeof address === 'string' && address.trim()) {
          setShopAddress(address.trim());
        }
      })
      .catch(() => {
        // Footer vẫn hiển thị trạng thái trung tính nếu API cấu hình tạm lỗi.
      });
    return () => { active = false; };
  }, []);

  // Hiển thị số đơn còn đang xử lý trên nút theo dõi đơn hàng ở header.
  useEffect(() => {
    let active = true;

    if (!userId) {
      setUnfinishedOrderCount(0);
      return () => { active = false; };
    }

    orderService.getShopOrders({ user_id: userId })
      .then((response) => {
        if (!active) return;
        const orderList = response?.data?.data || [];
        const count = orderList.filter((order) => {
          const status = order.delivery_status || (order.source === 'website' ? 'pending' : 'delivered');
          return !['delivered', 'cancelled', 'failed'].includes(status) && order.status !== 'returned';
        }).length;
        setUnfinishedOrderCount(count);
      })
      .catch(() => {
        if (active) setUnfinishedOrderCount(0);
      });

    return () => { active = false; };
  }, [userId, location.pathname]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý sự kiện scroll và tính toán thanh tiến trình cuộn trang
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 30);

      const winHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (winHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / winHeight) * 100));
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Đóng mobile menu khi chuyển trang
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Trang Chủ', path: '/' },
    { label: 'Cửa Hàng Nến', path: '/shop' },
    { label: 'Cẩm Nang', path: '/guide' },
    { label: 'Câu Chuyện', path: '/stories' },
  ];

  return (
    <div className={`shop-theme-scope font-jakarta bg-brand-cream text-brand-charcoal antialiased selection:bg-brand-burgundy selection:text-white min-h-screen flex flex-col ${websiteTheme.halloweenEnabled ? 'halloween-shop' : ''}`}>

      {websiteTheme.halloweenEnabled && <HalloweenDecor />}

      {/* 1. TOP ANNOUNCEMENT BAR (Cuộn tự nhiên cùng trang, không giật layout) */}
      <aside
        className="bg-brand-deepWine text-[#F3E8E2] text-xs py-2 px-3 sm:px-4 border-b border-brand-burgundy/40 relative z-30"
        data-purpose="top-announcement"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10.5px] sm:text-xs">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-amber-200/95 font-medium truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">
              {websiteTheme.halloweenEnabled ? 'Halloween huyền bí · Miễn phí giao hàng đơn từ 100K' : 'Miễn phí giao hàng toàn quốc đơn từ 100K'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-stone-300">
            <i className="ph-fill ph-flame text-amber-400 text-sm"></i>
            <span className="tracking-wider uppercase text-[10.5px] font-semibold text-amber-100">
              Nến thơm thủ công từ 100% sáp đậu nành & sáp ong tinh khiết
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
            <span className="hidden sm:inline text-stone-300">Hotline: <strong className="text-white">032.862.4761</strong></span>
            <Link to="/order-lookup" className="text-amber-200 sm:hover:text-white font-medium transition-colors underline-offset-2 sm:hover:underline">
              Tra cứu đơn
            </Link>
          </div>
        </div>
      </aside>

      {/* 2. MAIN HEADER (Chuyển động mượt mà, viền cố định không bao giờ nhấp nháy) */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ease-out border-b relative ${isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_25px_rgba(44,24,16,0.06)] border-stone-200/90 py-0'
          : 'bg-[#fbf9f6]/95 backdrop-blur-md border-stone-200/50 py-0'
          }`}
        data-purpose="site-navigation"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-8">
          <div
            className={`flex items-center justify-between transition-all duration-300 ease-out ${isScrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-22'
              }`}
          >

            {/* BRAND LOGO (Cánh trái) */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none">
                <div className="relative shrink-0 flex items-center">
                  <img
                    src="/logo.png"
                    alt="Candlet"
                    className={`h-10 w-auto object-contain transition-transform duration-300 sm:group-hover:scale-105 ${isScrolled ? 'sm:h-10' : 'sm:h-12'
                      }`}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-brand-terracotta font-semibold mt-0.5 opacity-80 sm:group-hover:opacity-100 transition-opacity hidden xs:inline">
                    Botanical Candles
                  </span>
                </div>
              </Link>
            </div>

            {/* NAVIGATION MENU (Ở giữa - Layout căn giữa tinh tế với Pill hover) */}
            <nav className="hidden lg:flex items-center space-x-1.5 xl:space-x-2 text-xs font-semibold tracking-wider uppercase">
              {navLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    className={`relative px-4 py-2 rounded-full transition-all duration-300 ${isActive
                      ? 'text-brand-burgundy bg-brand-burgundy/8 font-bold shadow-2xs'
                      : 'text-stone-700 sm:hover:text-brand-burgundy sm:hover:bg-stone-100/80'
                      }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* ACTIONS & ACCOUNT (Cánh phải) */}
            <div className="flex items-center space-x-1 sm:space-x-3">

              {/* Nút Tìm kiếm nhanh / Khám phá trên mobile */}
              {user && (
                <Link
                  to="/shop"
                  className="p-2 sm:p-2.5 text-brand-charcoal sm:hover:text-brand-burgundy sm:hover:bg-stone-100/80 rounded-full transition-all lg:hidden"
                  title="Khám phá nến thơm"
                >
                  <i className="ph ph-magnifying-glass text-[22px]"></i>
                </Link>
              )}

              {/* Nút Yêu Thích (Wishlist) - Hiển thị từ màn hình sm trở lên (mobile dùng Bottom Nav) */}
              <Link
                to="/wishlist"
                className="hidden sm:flex relative p-2.5 text-brand-charcoal sm:hover:text-rose-600 sm:hover:bg-rose-50 rounded-full transition-all group focus:outline-none"
                title="Sản phẩm yêu thích"
              >
                <i className="ph ph-heart text-[24px] sm:text-[26px] sm:group-hover:scale-110 transition-transform"></i>
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[19px] h-[19px] bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1 animate-[scaleIn_0.2s_ease-out]">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Nút theo dõi đơn hàng */}
              <Link
                to="/orders"
                className={`relative rounded-full p-2 transition-all focus:outline-none sm:p-2.5 ${!user ? 'hidden lg:inline-flex' : ''} ${
                  location.pathname === '/orders'
                    ? 'bg-brand-burgundy/8 text-brand-terracotta'
                    : 'text-brand-charcoal sm:hover:bg-brand-burgundy/5 sm:hover:text-brand-burgundy'
                }`}
                title="Theo dõi đơn hàng"
                aria-label="Theo dõi đơn hàng"
              >
                <i className={`text-[22px] transition-transform sm:text-[26px] ${location.pathname === '/orders' ? 'ph-fill ph-package' : 'ph ph-package'}`}></i>
                {unfinishedOrderCount > 0 && (
                  <span className="absolute right-0 top-0 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm sm:right-0.5 sm:top-0.5 sm:min-h-[19px] sm:min-w-[19px] sm:text-[10px]">
                    {unfinishedOrderCount > 99 ? '99+' : unfinishedOrderCount}
                  </span>
                )}
              </Link>

              {/* Phân cách mảnh */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="hidden xl:inline-flex min-h-10 items-center gap-2 rounded-full bg-[#1f2937] px-4 text-xs font-bold text-white shadow-sm transition-all sm:hover:-translate-y-0.5 sm:hover:bg-[#111827] sm:hover:shadow-md"
                  title="Vào trang quản trị"
                >
                  <i className="ph-bold ph-gauge text-base"></i>
                  <span>Quản trị</span>
                </Link>
              )}

              <span className="w-px h-6 bg-stone-200 hidden sm:inline-block"></span>

              {/* Nút Đăng nhập / User Profile Avatar */}
              {user ? (
                <div className="relative hidden sm:block" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 p-1 sm:pr-3 rounded-full sm:hover:bg-stone-100 transition-colors border border-stone-200/80 focus:outline-none shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-burgundy to-[#6A382C] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {user.name ? user.name.charAt(0).toUpperCase() : <i className="ph-bold ph-user text-sm"></i>}
                    </div>
                    <span className="text-xs font-bold text-stone-800 max-w-[100px] truncate hidden sm:inline">
                      {user.name}
                    </span>
                    <i className="ph-bold ph-caret-down text-xs text-stone-400 hidden sm:inline"></i>
                  </button>

                  {/* Dropdown Menu Membership VIP */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-xl border border-stone-100 py-2.5 z-50 animate-[modalIn_0.2s_ease-out]">
                      <div className="px-4 py-2.5 border-b border-stone-100 mb-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-800">Thành viên Candlet</p>
                        <p className="text-sm font-bold text-brand-burgundy truncate">{user.name}</p>
                        <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
                      </div>

                      {user.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setShowDropdown(false)}
                          className="mx-2 mb-1 flex items-center gap-3 rounded-xl bg-stone-900 px-3 py-2.5 text-xs font-bold text-white transition-colors sm:hover:bg-stone-800"
                        >
                          <i className="ph-bold ph-gauge text-base text-amber-300"></i>
                          Vào trang quản trị
                          <i className="ph-bold ph-arrow-right ml-auto text-xs text-stone-400"></i>
                        </Link>
                      )}

                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-stone-700 sm:hover:text-brand-terracotta sm:hover:bg-[#FAF5EE] transition-colors"
                      >
                        <i className="ph-bold ph-user-circle text-base text-brand-terracotta"></i>
                        Tài khoản của tôi
                      </Link>

                      <Link
                        to="/orders"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-stone-700 sm:hover:text-brand-terracotta sm:hover:bg-[#FAF5EE] transition-colors"
                      >
                        <i className="ph-bold ph-receipt text-base text-brand-terracotta"></i>
                        Lịch sử đơn hàng
                      </Link>

                      <Link
                        to="/wishlist"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-stone-700 sm:hover:text-rose-600 sm:hover:bg-rose-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <i className="ph-bold ph-heart text-base text-rose-500"></i>
                          <span>Sản phẩm yêu thích</span>
                        </div>
                        {wishlistCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>

                      <div className="h-px bg-stone-100 my-1.5"></div>

                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-red-600 sm:hover:bg-red-50 transition-colors text-left"
                      >
                        <i className="ph-bold ph-sign-out text-base"></i>
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-burgundy to-[#6A382C] sm:hover:from-[#3D1E1C] sm:hover:to-[#552B23] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider py-2.5 px-4 sm:px-5 rounded-full shadow-sm sm:hover:shadow-md sm:hover:scale-[1.02] active:scale-98 transition-all group"
                >
                  <span>Đăng nhập</span>
                  <i className="ph-bold ph-arrow-right text-xs sm:group-hover:translate-x-0.5 transition-transform"></i>
                </Link>
              )}

              {/* Nút Hamburger Menu (Mobile/Tablet) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-stone-700 sm:hover:text-brand-burgundy rounded-xl sm:hover:bg-stone-100 transition-colors focus:outline-none"
                aria-label="Menu"
              >
                <i className={`ph-bold ${mobileMenuOpen ? 'ph-x' : 'ph-list'} text-2xl`}></i>
              </button>

            </div>

          </div>
        </div>

        {/* 3. SCROLL PROGRESS BAR (Ghim sát đáy header mượt mà, không giật layout, không chớp viền) */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-brand-terracotta to-brand-burgundy transition-all duration-75 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {websiteTheme.halloweenEnabled && (
          <div className="halloween-header-garland" aria-hidden="true">
            <svg className="halloween-garland-line" viewBox="0 0 400 30" preserveAspectRatio="none">
              <path d="M1 3C104 20 296 20 399 3" />
            </svg>
            <span className="halloween-garland-pin pin-left" />
            <span className="halloween-garland-pin pin-right" />
            <span className="halloween-garland-charm charm-bat-left"><HalloweenBatMark /></span>
            <span className="halloween-garland-charm charm-star">✦</span>
            <span className="halloween-garland-charm charm-moon" />
            <span className="halloween-garland-charm charm-bat-right"><HalloweenBatMark /></span>
          </div>
        )}
      </header>

      {websiteTheme.halloweenEnabled && (
        <section className="halloween-season-banner" aria-label="Chủ đề Halloween Candlet">
          <div className="halloween-season-banner-inner">
            <div className="halloween-banner-motifs">
              <HalloweenBatMark className="halloween-banner-bat halloween-banner-bat-one" />
              <HalloweenBatMark className="halloween-banner-bat halloween-banner-bat-two" />
              <span className="halloween-banner-star halloween-banner-star-one">✦</span>
              <span className="halloween-banner-star halloween-banner-star-two">✧</span>
            </div>
            <HalloweenPumpkinMark className="halloween-mini-pumpkin" />
            <div className="min-w-0 flex-1">
              <p className="halloween-season-eyebrow">Halloween Seasonal Edition</p>
              <p className="halloween-season-title">Thắp một đêm hương thật huyền bí</p>
              <p className="halloween-season-copy">Ánh nến ấm, sắc cam bí ngô và những tầng hương dành cho đêm thu.</p>
            </div>
            <Link to="/shop" className="halloween-season-action">
              Khám phá ngay
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </section>
      )}

      {/* 4. MOBILE DRAWER MENU (Giao diện trượt mềm mại trên thiết bị di động) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between pb-5 border-b border-stone-100">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center"
              >
                <img src="/logo.png" alt="Candlet" className="h-8 w-auto object-contain" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 sm:hover:text-stone-800 cursor-pointer"
                aria-label="Đóng menu"
              >
                <i className="ph-bold ph-x text-base"></i>
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="py-6 space-y-2 flex-1">
              {navLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive
                      ? 'bg-[#FAF5EE] text-brand-burgundy font-bold border border-amber-200/60'
                      : 'text-stone-700 sm:hover:bg-stone-50'
                      }`}
                  >
                    <span>{link.label}</span>
                    <i className="ph-bold ph-caret-right text-xs text-stone-400"></i>
                  </Link>
                );
              })}

              {/* Mục Tài Khoản Của Tôi */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors sm:hover:bg-stone-800"
                >
                  <span className="flex items-center gap-2.5">
                    <i className="ph-bold ph-gauge text-base text-amber-300"></i>
                    Vào trang quản trị
                  </span>
                  <i className="ph-bold ph-arrow-right text-xs text-stone-400"></i>
                </Link>
              )}

              <Link
                to={user ? "/profile" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  location.pathname === '/profile'
                    ? 'bg-[#FAF5EE] text-brand-burgundy font-bold border border-amber-200/60'
                    : 'text-stone-700 sm:hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <i className="ph-bold ph-user-circle text-base text-brand-burgundy"></i>
                  <span>Tài Khoản Của Tôi</span>
                </div>
                <i className="ph-bold ph-caret-right text-xs text-stone-400"></i>
              </Link>

              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-stone-700 sm:hover:bg-stone-50 transition-colors"
              >
                <span>Tra Cứu Đơn Hàng</span>
                <i className="ph-bold ph-receipt text-base text-stone-400"></i>
              </Link>

              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-stone-700 sm:hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <i className="ph-bold ph-heart text-base text-rose-500"></i>
                  <span>Sản Phẩm Yêu Thích</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Footer Area */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
              {user ? (
                <div className="space-y-3">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 bg-stone-50 sm:hover:bg-[#FAF5EE] active:scale-98 p-3 rounded-xl border border-stone-200/80 transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-burgundy to-[#6A382C] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-stone-900 truncate sm:group-hover:text-brand-burgundy transition-colors">{user.name}</p>
                        <span className="text-[10px] text-amber-800 font-bold sm:group-hover:underline flex items-center gap-0.5">
                          Hồ sơ <i className="ph-bold ph-caret-right text-[10px]"></i>
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full bg-stone-100 sm:hover:bg-red-50 sm:hover:text-red-600 text-stone-700 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="ph-bold ph-sign-out text-sm"></i>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-brand-burgundy text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                >
                  <i className="ph-bold ph-user"></i>
                  <span>Đăng nhập ngay</span>
                </Link>
              )}

              <p className="text-center text-[11px] text-stone-400">
                Candlet • Nến thơm thủ công & nghệ thuật
              </p>
            </div>
          </div>
        </div>
      )}

      <main
        className={`relative z-10 flex-1 isolate ${
          isBottomNavHidden
            ? 'pb-0'
            : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0'
        }`}
      >
        <div className="relative z-10 min-h-full" data-purpose="shop-page-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile footer */}
      {location.pathname !== '/checkout' && (
        <footer
          className="hidden"
          data-purpose="mobile-footer"
        >
        <div className="h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"></div>

        <div className="px-4 pb-4 pt-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <Link to="/" className="min-w-0">
              <img
                src="/logo.png"
                alt="Candlet"
                className="h-8 w-auto object-contain brightness-0 invert"
              />
              <p className="mt-1 truncate text-[10px] text-stone-400">
                Nến thơm thủ công · Thắp hương thơm, giữ khoảnh khắc
              </p>
            </Link>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-amber-200 transition-colors active:bg-white/10"
              aria-label="Lên đầu trang"
            >
              <i className="ph-bold ph-arrow-up text-sm"></i>
            </button>
          </div>

          <nav className="grid grid-cols-2 gap-1.5 border-b border-white/10 py-3.5 text-[10.5px] font-semibold" aria-label="Liên kết cuối trang">
            <Link to="/shop" className="flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-stone-100 transition-colors active:bg-white/15">
              <i className="ph-bold ph-storefront text-sm text-amber-300"></i>
              <span>Cửa hàng</span>
            </Link>
            <Link to="/order-lookup" className="flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-stone-100 transition-colors active:bg-white/15">
              <i className="ph-bold ph-package text-sm text-amber-300"></i>
              <span>Tra cứu đơn</span>
            </Link>
            <Link to="/guide" className="flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-stone-100 transition-colors active:bg-white/15">
              <i className="ph-bold ph-book-open text-sm text-amber-300"></i>
              <span>Cẩm nang</span>
            </Link>
            <Link to="/stories" className="flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-stone-100 transition-colors active:bg-white/15">
              <i className="ph-bold ph-article text-sm text-amber-300"></i>
              <span>Câu chuyện</span>
            </Link>
          </nav>

          <address className="border-b border-white/10 py-3.5 text-[10.5px] not-italic text-stone-300">
            <div className="grid grid-cols-2 gap-3">
              <a href="tel:0328624761" className="flex items-center gap-2">
                <i className="ph-bold ph-phone text-sm text-amber-300"></i>
                <span>032.862.4761</span>
              </a>
              <a href="mailto:candlet.official@gmail.com" className="flex items-center justify-end gap-2">
                <i className="ph-bold ph-envelope-simple text-sm text-amber-300"></i>
                <span>Gửi email</span>
              </a>
            </div>
            <div className="mt-2.5 flex min-w-0 items-center gap-2 text-stone-400">
              <i className="ph-bold ph-map-pin shrink-0 text-sm text-amber-300"></i>
              <span className="truncate">{shopAddress || 'Địa chỉ cửa hàng đang được cập nhật'}</span>
            </div>
          </address>

          <div className="flex items-center justify-between gap-3 pt-3.5">
            <p className="text-[10px] text-stone-400">© 2026 Candlet Vietnam</p>
            <div className="flex items-center gap-3 text-lg text-amber-200">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <i className="ph ph-facebook-logo"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                <i className="ph ph-instagram-logo"></i>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
                <i className="ph ph-tiktok-logo"></i>
              </a>
            </div>
          </div>
        </div>
        </footer>
      )}

      {/* BEGIN: MainFooter (Thiết kế sang trọng, ấm áp phong cách Atelier Nến Thủ Công) */}
      <footer className="relative z-10 mt-auto hidden overflow-hidden bg-gradient-to-b from-[#2B0C10] via-[#21070A] to-[#150406] text-xs text-[#E8D9D5] lg:block" data-purpose="main-footer">
        {/* Họa tiết quầng sáng vàng ấm nghệ thuật */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* 1. DẢI GIÁ TRỊ CAM KẾT THỦ CÔNG (TRUST & ARTISAN VALUES BAR) */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">

              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-300 sm:group-hover:scale-110 sm:group-hover:border-amber-400/50 sm:group-hover:bg-amber-400/10 transition-all duration-300">
                  <i className="ph-duotone ph-plant text-xl"></i>
                </div>
                <div>
                  <h5 className="font-semibold text-white text-xs sm:text-[13px] tracking-wide mb-1">100% Sáp Thực Vật</h5>
                  <p className="text-[11px] text-stone-400 leading-relaxed">Sáp đậu nành & sáp cọ tự nhiên, bấc cotton không chì, đốt sạch an toàn.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-300 sm:group-hover:scale-110 sm:group-hover:border-amber-400/50 sm:group-hover:bg-amber-400/10 transition-all duration-300">
                  <i className="ph-duotone ph-envelope-open text-xl"></i>
                </div>
                <div>
                  <h5 className="font-semibold text-white text-xs sm:text-[13px] tracking-wide mb-1">Thông Điệp Ẩn Độc Bản</h5>
                  <p className="text-[11px] text-stone-400 leading-relaxed">Lời nhắn bí mật hiện dần sau khi thắp nến, lưu giữ kỷ niệm sâu sắc.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-300 sm:group-hover:scale-110 sm:group-hover:border-amber-400/50 sm:group-hover:bg-amber-400/10 transition-all duration-300">
                  <i className="ph-duotone ph-drop text-xl"></i>
                </div>
                <div>
                  <h5 className="font-semibold text-white text-xs sm:text-[13px] tracking-wide mb-1">Hương Thơm Trị Liệu</h5>
                  <p className="text-[11px] text-stone-400 leading-relaxed">Tinh dầu thiên nhiên tinh khiết chuẩn IFRA, nuôi dưỡng tâm trí an yên.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-300 sm:group-hover:scale-110 sm:group-hover:border-amber-400/50 sm:group-hover:bg-amber-400/10 transition-all duration-300">
                  <i className="ph-duotone ph-gift text-xl"></i>
                </div>
                <div>
                  <h5 className="font-semibold text-white text-xs sm:text-[13px] tracking-wide mb-1">Đóng Gói Quà Nghệ Thuật</h5>
                  <p className="text-[11px] text-stone-400 leading-relaxed">Hộp quà vintage, tặng kèm diêm dài và thiệp viết tay theo yêu cầu.</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 2. KHỐI THÔNG TIN CHÍNH (4 CỘT HIỆN ĐẠI & CHI TIẾT) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-14 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-white/10">

            {/* Cột 1: Câu chuyện & Triết lý thương hiệu (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-4">
              <Link to="/" className="inline-flex items-center gap-3 group focus:outline-none">
                <img
                  src="/logo.png"
                  alt="CandletShop"
                  className="h-10 sm:h-11 w-auto object-contain brightness-0 invert opacity-95 sm:group-hover:opacity-100 transition-opacity"
                />
                <div className="flex flex-col">
                  <span className="font-serif-display text-xl font-bold tracking-wider text-amber-100">CANDLETSHOP</span>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-amber-300/70 font-medium">Artisan Botanical Studio</span>
                </div>
              </Link>

              <p className="text-[12px] sm:text-[12.5px] text-[#CBB9B4] leading-relaxed max-w-sm">
                Candlet thắp lên sự bình yên qua những ngọn nến thơm thuần chay và nghệ thuật giấu thông điệp dưới tầng sáp đậu nành ấm áp. Mỗi tác phẩm là một lời sẻ chia chân thành gửi đến người trân quý.
              </p>

              {/* Huy hiệu cam kết thủ công */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10.5px] text-amber-200/90 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>Rót tay tỉ mỉ tại xưởng Sài Gòn</span>
              </div>

              {/* Thông tin hotline trực tiếp */}
              <div className="pt-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <i className="ph-bold ph-phone-call text-sm"></i>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-medium">Hotline tư vấn hương:</span>
                  <a href="tel:0328624761" className="text-sm font-bold text-white sm:hover:text-amber-300 transition-colors font-mono">
                    032.862.4761
                  </a>
                </div>
              </div>
            </div>

            {/* Cột 2: Cửa Hàng & Bộ Sưu Tập (lg:col-span-3) */}
            <div className="lg:col-span-3 space-y-3.5">
              <h4 className="font-serif-display text-base font-bold text-amber-100 uppercase tracking-widest flex items-center gap-2">
                <span className="w-4 h-px bg-amber-400/60"></span>
                Bộ Sưu Tập Nến
              </h4>
              <ul className="space-y-2.5 text-[12px]">
                <li>
                  <Link to="/shop" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrow-right text-[10px] text-amber-400/60 sm:group-hover:translate-x-1 transition-transform"></i>
                    <span>Nến Thông Điệp Ẩn Giấu</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase ml-1">Signature</span>
                  </Link>
                </li>
                <li>
                  <Link to="/shop?tag=Mới" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrow-right text-[10px] text-amber-400/60 sm:group-hover:translate-x-1 transition-transform"></i>
                    <span>Bộ Sưu Tập Mùa Đông (Winter)</span>
                  </Link>
                </li>
                <li>
                  <Link to="/shop" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrow-right text-[10px] text-amber-400/60 sm:group-hover:translate-x-1 transition-transform"></i>
                    <span>Nến Ly Hổ Phách Cổ Điển</span>
                  </Link>
                </li>
                <li>
                  <Link to="/shop" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrow-right text-[10px] text-amber-400/60 sm:group-hover:translate-x-1 transition-transform"></i>
                    <span>Tinh Dầu Tán Hương & Xịt Phòng</span>
                  </Link>
                </li>
                <li>
                  <Link to="/shop" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrow-right text-[10px] text-amber-400/60 sm:group-hover:translate-x-1 transition-transform"></i>
                    <span>Phụ Kiện Chăm Sóc Nến (Kéo & Dập)</span>
                  </Link>
                </li>
                <li>
                  <Link to="/shop" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrow-right text-[10px] text-amber-400/60 sm:group-hover:translate-x-1 transition-transform"></i>
                    <span>Hộp Quà Doanh Nghiệp & Đám Cưới</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cột 3: Hỗ Trợ Khách Hàng & Trải Nghiệm (lg:col-span-2) */}
            <div className="lg:col-span-2 space-y-3.5">
              <h4 className="font-serif-display text-base font-bold text-amber-100 uppercase tracking-widest flex items-center gap-2">
                <span className="w-4 h-px bg-amber-400/60"></span>
                Chăm Sóc & Trợ Giúp
              </h4>
              <ul className="space-y-2.5 text-[12px]">
                <li>
                  <Link to="/order-lookup" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-receipt text-xs text-amber-400/60"></i>
                    <span>Tra Cứu Đơn Hàng</span>
                  </Link>
                </li>
                <li>
                  <Link to="/guide" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-book-open text-xs text-amber-400/60"></i>
                    <span>Cẩm Nang Chăm Sóc Nến</span>
                  </Link>
                </li>
                <li>
                  <Link to="/stories" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-article text-xs text-amber-400/60"></i>
                    <span>Câu Chuyện & Blog Nến Thơm</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-arrows-clockwise text-xs text-amber-400/60"></i>
                    <span>Chính Sách Đổi Trả 1 - 1</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-truck text-xs text-amber-400/60"></i>
                    <span>Vận Chuyển Toàn Quốc</span>
                  </Link>
                </li>
                <li>
                  <Link to="/" className="text-stone-300 sm:hover:text-amber-200 transition-colors flex items-center gap-1.5 group">
                    <i className="ph ph-question text-xs text-amber-400/60"></i>
                    <span>Câu Hỏi Thường Gặp (FAQ)</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cột 4: Atelier & Kết Nối (lg:col-span-3) */}
            <div className="lg:col-span-3 space-y-3.5">
              <h4 className="font-serif-display text-base font-bold text-amber-100 uppercase tracking-widest flex items-center gap-2">
                <span className="w-4 h-px bg-amber-400/60"></span>
                Atelier & Ghé Thăm
              </h4>
              <div className="space-y-3 text-[12px] text-stone-300">
                <div className="flex items-start gap-2.5">
                  <i className="ph ph-map-pin text-amber-300 text-base mt-0.5 shrink-0"></i>
                  <span>{shopAddress || 'Địa chỉ shop đang được cập nhật'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <i className="ph ph-envelope-simple text-amber-300 text-base shrink-0"></i>
                  <a href="mailto:hello@candlet.vn" className="sm:hover:text-amber-200 transition-colors font-mono">
                    candlet.official@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <i className="ph ph-clock text-amber-300 text-base shrink-0"></i>
                  <span>Mở cửa: 09:00 - 21:00 (Thứ 2 - CN)</span>
                </div>
              </div>

              {/* Phương thức thanh toán được hỗ trợ */}
              <div className="pt-3 border-t border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-2 font-medium">Thanh toán an toàn tiện lợi</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-amber-100">VietQR</span>
                  <span className="px-2 py-1 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-amber-100">MoMo</span>
                  <span className="px-2 py-1 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-amber-100">COD</span>
                  <span className="px-2 py-1 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-amber-100">Visa / Master</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. DÒNG BẢN QUYỀN & MẠNG XÃ HỘI (BOTTOM BAR) */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-4">
            <div className="text-center sm:text-left">
              © 2026 Candlet Vietnam. Bảo lưu mọi quyền. Nghệ thuật nến thơm chánh niệm & thông điệp cảm xúc.
            </div>

            {/* Các icon Mạng xã hội với hiệu ứng hover sang trọng */}
            <div className="flex items-center space-x-3 text-lg">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-200/80 sm:hover:text-white sm:hover:bg-amber-500/20 sm:hover:border-amber-400/40 sm:hover:scale-110 transition-all"
                title="Theo dõi Candlet trên Instagram"
              >
                <i className="ph ph-instagram-logo"></i>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-200/80 sm:hover:text-white sm:hover:bg-amber-500/20 sm:hover:border-amber-400/40 sm:hover:scale-110 transition-all"
                title="Theo dõi Candlet trên Facebook"
              >
                <i className="ph ph-facebook-logo"></i>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-200/80 sm:hover:text-white sm:hover:bg-amber-500/20 sm:hover:border-amber-400/40 sm:hover:scale-110 transition-all"
                title="Theo dõi Candlet trên TikTok"
              >
                <i className="ph ph-tiktok-logo"></i>
              </a>
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-200/80 sm:hover:text-white sm:hover:bg-amber-500/20 sm:hover:border-amber-400/40 sm:hover:scale-110 transition-all"
                title="Khám phá cảm hứng trên Pinterest"
              >
                <i className="ph ph-pinterest-logo"></i>
              </a>

              {/* Nút cuộn nhanh lên đầu trang */}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300 sm:hover:text-white sm:hover:bg-amber-500/30 sm:hover:scale-110 transition-all ml-2"
                title="Cuộn lên đầu trang"
              >
                <i className="ph-bold ph-arrow-up text-xs"></i>
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION TAB BAR (Thanh điều hướng đáy) - Ẩn khi ở trang chi tiết sản phẩm / giỏ hàng / thanh toán */}
      {!isBottomNavHidden && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200/90 shadow-[0_-4px_25px_rgba(44,24,16,0.08)] lg:hidden"
          data-purpose="mobile-bottom-navigation"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Điều hướng di động"
        >
        <div className="grid grid-cols-5 h-15 max-w-lg mx-auto px-1 items-center">
          {/* 1. Trang chủ */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              location.pathname === '/' ? 'text-brand-burgundy font-bold' : 'text-stone-500 sm:hover:text-stone-800'
            }`}
          >
            <i className={`text-xl transition-transform ${location.pathname === '/' ? 'ph-fill ph-house scale-110 text-brand-burgundy' : 'ph ph-house'}`}></i>
            <span className="text-[10px] mt-0.5 tracking-tight">Trang chủ</span>
          </Link>

          {/* 2. Cửa hàng */}
          <Link
            to="/shop"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              location.pathname.startsWith('/shop') ? 'text-brand-burgundy font-bold' : 'text-stone-500 sm:hover:text-stone-800'
            }`}
          >
            <i className={`text-xl transition-transform ${location.pathname.startsWith('/shop') ? 'ph-fill ph-flame scale-110 text-amber-700' : 'ph ph-flame'}`}></i>
            <span className="text-[10px] mt-0.5 tracking-tight">Cửa hàng</span>
          </Link>

          {/* 3. Yêu thích */}
          <Link
            to="/wishlist"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              location.pathname === '/wishlist' ? 'text-rose-600 font-bold' : 'text-stone-500 sm:hover:text-stone-800'
            }`}
          >
            <div className="relative">
              <i className={`text-xl transition-transform ${location.pathname === '/wishlist' ? 'ph-fill ph-heart scale-110 text-rose-500' : 'ph ph-heart'}`}></i>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white shadow-xs px-0.5">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Yêu thích</span>
          </Link>

          {/* 4. Giỏ hàng */}
          <Link
            to="/cart"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              location.pathname === '/cart' ? 'text-brand-burgundy font-bold' : 'text-stone-500 sm:hover:text-stone-800'
            }`}
          >
            <div className="relative">
              <i className={`text-xl transition-transform ${location.pathname === '/cart' ? 'ph-fill ph-shopping-bag scale-110 text-brand-burgundy' : 'ph ph-shopping-bag-open'}`}></i>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-gradient-to-tr from-brand-terracotta to-[#B45309] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white shadow-xs px-0.5">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Giỏ hàng</span>
          </Link>

          {/* 5. Tài khoản */}
          <Link
            to={user ? '/profile' : '/login'}
            className={`flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 ${
              location.pathname === '/profile' || location.pathname === '/login' ? 'text-brand-burgundy font-bold' : 'text-stone-500 sm:hover:text-stone-800'
            }`}
          >
            <i className={`text-xl transition-transform ${location.pathname === '/profile' || location.pathname === '/login' ? 'ph-fill ph-user-circle scale-110 text-brand-burgundy' : 'ph ph-user'}`}></i>
            <span className="text-[10px] mt-0.5 tracking-tight">{user ? 'Tài khoản' : 'Đăng nhập'}</span>
          </Link>
        </div>
      </nav>
      )}
    </div>
  );
}
