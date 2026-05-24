import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { materialService } from '../services/materialService';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lowStockMaterials, setLowStockMaterials] = useState([]);
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await materialService.getMaterials();
        const lowStock = res.data.data.filter(m => m.status === 'low_stock' || m.status === 'out_of_stock' || m.actualStock <= m.minStock);
        setLowStockMaterials(lowStock);
      } catch (err) {
        console.error('Lỗi khi tải thông báo nguyên liệu:', err);
      }
    };
    
    fetchLowStock();
    
    const interval = setInterval(fetchLowStock, 5000); // Polling every 5 seconds
    
    // Listen for custom event for immediate updates
    window.addEventListener('materialsChanged', fetchLowStock);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('materialsChanged', fetchLowStock);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (localSearch) {
        newParams.set('q', localSearch);
      } else {
        newParams.delete('q');
      }
      setSearchParams(newParams, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let placeholder = "Tìm kiếm...";
  if (location.pathname.includes('/products')) placeholder = "Tìm kiếm sản phẩm...";
  if (location.pathname.includes('/materials')) placeholder = "Tìm kiếm nguyên vật liệu...";
  if (location.pathname.includes('/orders')) placeholder = "Tìm kiếm đơn hàng...";
  if (location.pathname.includes('/users')) placeholder = "Tìm kiếm người dùng...";

  const displayName = user?.name || 'Admin';

  return (
    <header className="bg-white border-b border-outline-variant/30 px-4 lg:px-[60px] py-3 flex items-center justify-between sticky top-0 z-30 gap-2 sm:gap-4">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 sm:min-w-[200px]">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full flex items-center justify-center -ml-2">
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <h1 className="text-[18px] font-bold text-[#003366] hidden sm:block">Quản lý Kho & Bán hàng</h1>
      </div>

      {/* Middle - Search */}
      <div className="flex-1 max-w-[600px] px-2 sm:px-8">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
          <input 
            type="text" 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={placeholder} 
            className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-lg pl-10 pr-4 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-[#4b5563] hover:text-primary transition-colors flex p-1 relative"
          >
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            {lowStockMaterials.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-error rounded-full animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute right-0 mt-3 w-80 bg-white border border-outline-variant/30 rounded-xl shadow-xl py-2 z-50 animate-[fadeIn_0.15s_ease-out] -mr-16 sm:mr-0">
                <div className="px-4 py-2 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
                  <h4 className="font-bold text-[14px] text-on-surface">Thông báo</h4>
                  {lowStockMaterials.length > 0 && (
                    <span className="bg-error-container text-error text-[11px] font-bold px-2 py-0.5 rounded-full">{lowStockMaterials.length} mới</span>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {lowStockMaterials.length === 0 ? (
                    <div className="px-4 py-6 text-center text-on-surface-variant text-[13px]">
                      <span className="material-symbols-outlined text-[32px] opacity-30 mb-2 block">check_circle</span>
                      Tất cả nguyên liệu đều đủ hàng
                    </div>
                  ) : (
                    lowStockMaterials.map(m => (
                      <div key={m._id} className="px-4 py-3 border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors cursor-pointer" onClick={() => { setShowNotifications(false); navigate('/imports', { state: { autoOpenImport: true, materialId: m._id } }); }}>
                        <div className="flex gap-3 items-start">
                          <div className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === 'out_of_stock' || m.actualStock === 0 ? 'bg-error-container text-error' : 'bg-[#fef3c7] text-[#d97706]'}`}>
                            <span className="material-symbols-outlined text-[20px]">
                              {m.status === 'out_of_stock' || m.actualStock === 0 ? 'remove_shopping_cart' : 'warning'}
                            </span>
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-on-surface leading-tight mb-1">{m.name}</p>
                            <p className="text-[12px] text-on-surface-variant">Tồn kho: <span className={`font-bold ${m.status === 'out_of_stock' || m.actualStock === 0 ? 'text-error' : 'text-[#d97706]'}`}>{m.actualStock} {m.unit}</span> (Tối thiểu: {m.minStock})</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <button className="text-[#4b5563] hover:text-primary transition-colors p-1 hidden sm:flex">
          <span className="material-symbols-outlined text-[24px]">help</span>
        </button>
        
        <div className="w-[1px] h-8 bg-outline-variant/40 mx-1 sm:mx-2 hidden sm:block"></div>

        <div className="relative">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="text-right hidden sm:flex flex-col justify-center mt-0.5">
              <span className="text-[14px] font-bold text-[#0056b3] group-hover:opacity-80 transition-opacity leading-none mb-1">{displayName}</span>
              <span className="text-[11px] text-on-surface-variant leading-none">{user?.isDefaultAdmin ? 'Root Admin' : 'Quản trị viên'}</span>
            </div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
              alt="Avatar" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-low border border-outline-variant/30"
            />
          </div>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
              <div className="absolute right-0 mt-3 w-48 bg-white border border-outline-variant/30 rounded-lg shadow-lg py-1 z-50">
                <button 
                  onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Cài đặt
                </button>
                <div className="h-[1px] bg-outline-variant/30 w-full my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#dc2626] hover:bg-[#fee2e2] flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
