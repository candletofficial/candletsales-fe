import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopService } from '../../services/shopService';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { resolveTagColor } from '../../utils/productTagUtils';
import { getImageUrl } from '../../utils/imageUtils';

export default function ShopPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [copiedCouponId, setCopiedCouponId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, couponRes] = await Promise.all([
          shopService.getProducts(),
          shopService.getActiveCoupons(user?._id).catch(() => ({ data: [] }))
        ]);

        if (productRes && productRes.data) {
          setProducts(productRes.data);
        } else if (Array.isArray(productRes)) {
          setProducts(productRes);
        }

        if (couponRes && couponRes.data) {
          setActiveCoupons(couponRes.data);
        } else if (Array.isArray(couponRes)) {
          setActiveCoupons(couponRes);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu cửa hàng:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?._id]);

  // Khóa cuộn trang khi mở drawer bộ lọc trên mobile
  useEffect(() => {
    if (isMobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileFilterOpen]);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedVolume, setSelectedVolume] = useState('');
  const [selectedWaxes, setSelectedWaxes] = useState([]);
  const [selectedWicks, setSelectedWicks] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1500000]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  // Dynamic options derived from products
  const VOLUME_OPTIONS = useMemo(() => [...new Set(products.map(p => p.volume).filter(Boolean))], [products]);
  const WAX_OPTIONS = useMemo(() => [...new Set(products.flatMap(p => p.wax_type || []))], [products]);
  const WICK_OPTIONS = useMemo(() => [...new Set(products.flatMap(p => p.wick_type || []))], [products]);

  const CATEGORIES = [
    { name: 'Tất cả', icon: 'ph-squares-four' },
    { name: 'Nến Hũ Đơn', icon: 'ph-flame' },
    { name: 'Tinh Dầu Khuếch Tán', icon: 'ph-drop' },
    { name: 'Bộ Quà Tặng Giftset', icon: 'ph-gift' },
    { name: 'Phụ Kiện Chăm Sóc Nến', icon: 'ph-scissors' }
  ];

  const toggleFilter = (setState, value) => {
    setState(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  // Đếm số lượng bộ lọc đang được kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'Tất cả') count++;
    if (selectedVolume) count++;
    count += selectedWaxes.length;
    count += selectedWicks.length;
    if (priceRange[0] > 0 || priceRange[1] < 1500000) count++;
    return count;
  }, [selectedCategory, selectedVolume, selectedWaxes, selectedWicks, priceRange]);

  const resetAllFilters = () => {
    setSelectedCategory('Tất cả');
    setSelectedVolume('');
    setSelectedWaxes([]);
    setSelectedWicks([]);
    setPriceRange([0, 1500000]);
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => {
      const productCat = p.category || 'Nến Hũ Đơn';
      if (selectedCategory !== 'Tất cả' && productCat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (selectedVolume && p.volume !== selectedVolume) return false;
      if (selectedWaxes.length > 0 && !(p.wax_type || []).some(w => selectedWaxes.includes(w))) return false;
      if (selectedWicks.length > 0 && !(p.wick_type || []).some(w => selectedWicks.includes(w))) return false;
      if (p.base_price < priceRange[0] || p.base_price > priceRange[1]) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.avgRating) || 5) - (Number(a.avgRating) || 5));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [products, selectedCategory, selectedVolume, selectedWaxes, selectedWicks, priceRange, searchQuery, sortBy]);

  const handleBuyNow = (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock === 0) {
      alert('Sản phẩm hiện đã hết hàng');
      return;
    }

    const defaultSku = product.skus?.find((sku) => sku.stock === null || sku.stock === undefined || sku.stock > 0);
    const defaultSkuId = defaultSku?.id;

    const buyItem = {
      product_id: product,
      sku_id: defaultSkuId,
      quantity: 1
    };

    navigate('/checkout', { state: { selectedItems: [buyItem] } });
  };

  const handleCopyCoupon = (code, id) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCouponId(id);
    setTimeout(() => {
      setCopiedCouponId(prev => (prev === id ? null : prev));
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-[#F6F2ED] sm:bg-[#f9f9f9]">
      {/* Header Area (Thiết kế tinh gọn cho Mobile & trang nhã cho Desktop) */}
      <div className="mx-auto hidden max-w-7xl border-b border-dashed border-stone-300 px-8 pb-6 pt-8 md:block">
        <div className="flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 sm:mb-4">
          <Link to="/" className="sm:hover:text-brand-burgundy transition-colors">Trang Chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-charcoal">Cửa Hàng</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-end">
          <div className="md:col-span-8 lg:col-span-8">
            <div className="flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand-gold mb-1.5 sm:mb-2">
              <i className="ph ph-sparkle mr-1.5 text-xs sm:text-sm"></i>
              Nến Thơm Thủ Công & Nghệ Thuật
            </div>
            <h1 className="font-serif-display text-2xl sm:text-5xl lg:text-6xl text-brand-charcoal leading-tight mb-2 sm:mb-3">
              Thư Viện Mùi Hương Candlet
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pr-0 sm:pr-4 line-clamp-2 sm:line-clamp-none">
              Khám phá các sáng tạo mùi hương thủ công từ 100% sáp thực vật tự nhiên, khơi gợi xúc cảm an yên và chữa lành.
            </p>
          </div>
          
          <div className="hidden md:flex md:col-span-4 lg:col-span-4 justify-end">
            <div className="bg-[#FFF9F2] border border-amber-200/50 rounded-xl p-3.5 flex items-center space-x-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <i className="ph-fill ph-seal-check text-xl"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800 uppercase tracking-wide">100% Thuần Thực Vật</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Tinh dầu chuẩn IFRA & bấc cotton sạch</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Navigation Bar (Pills cuộn ngang mượt mà với icon sinh động) */}
      <section className="mx-auto max-w-7xl border-b border-stone-200 bg-[#FFFCF8] px-3 py-3 sm:bg-transparent sm:px-8 sm:py-5">
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {CATEGORIES.map(cat => {
            const count = cat.name === 'Tất cả' 
              ? products.length 
              : products.filter(p => (p.category || 'Nến Hũ Đơn').toLowerCase() === cat.name.toLowerCase()).length;
            const isSelected = selectedCategory === cat.name;
            return (
              <button 
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`transition-all duration-200 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs select-none active:scale-95 ${
                  isSelected 
                    ? 'bg-brand-charcoal text-white border border-brand-charcoal' 
                    : 'bg-white text-stone-600 sm:hover:text-stone-900 border border-stone-200/80 sm:hover:bg-stone-50'
                }`}
              >
                <i className={`ph-bold ${cat.icon} text-xs ${isSelected ? 'text-amber-300' : 'text-stone-400'}`}></i>
                <span>{cat.name}</span>
                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Promo Voucher Alert trên Mobile (Nếu có coupon) */}
      {activeCoupons.length > 0 && (
        <section className="mx-auto max-w-7xl border-b-[8px] border-[#F6F2ED] bg-white px-4 py-3 lg:hidden">
          {(() => {
            const bestCoupon = activeCoupons[0];
            return (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300/60 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs shadow-2xs">
                    <i className="ph-fill ph-ticket"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-amber-950 truncate">
                      {bestCoupon.name || 'Ưu đãi dành cho bạn'}
                    </p>
                    <p className="text-[10px] text-amber-800/80 font-mono">
                      Mã: <strong className="text-brand-burgundy font-bold">{bestCoupon.code}</strong>
                      {bestCoupon.type === 'percent' ? ` (Giảm ${bestCoupon.value}%)` : ` (Giảm ${new Intl.NumberFormat('vi-VN').format(bestCoupon.value)}đ)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon(bestCoupon.code, bestCoupon._id || 'promo')}
                  className="px-2.5 py-1 rounded-lg bg-brand-charcoal text-amber-200 text-[10px] font-bold tracking-wider uppercase shrink-0 transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  {copiedCouponId === (bestCoupon._id || 'promo') ? 'Đã sao chép' : 'Lấy mã'}
                </button>
              </div>
            );
          })()}
        </section>
      )}

      {/* Toolbar (Tìm kiếm & Sắp xếp & Nút Mở Bộ Lọc Mobile) */}
      <section className="mx-auto max-w-7xl border-b border-stone-200 bg-white px-3 py-2.5 sm:border-dashed sm:border-stone-300 sm:bg-transparent sm:px-8 sm:py-4">
        {/* Hàng tìm kiếm (Full width trên mobile) */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <i className="ph ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full rounded-xl border border-stone-200/90 bg-white py-2.5 pl-9 pr-8 text-xs outline-none placeholder:text-stone-400 focus:border-brand-burgundy focus:ring-1 focus:ring-brand-burgundy sm:shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 sm:hover:text-stone-700 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <i className="ph-bold ph-x text-xs"></i>
              </button>
            )}
          </div>

          {/* Hàng nút công cụ điều khiển: Nút Bộ Lọc Mobile + Sắp Xếp + Đổi View */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            {/* Nút Bộ Lọc (Hiển thị nổi bật trên Mobile/Tablet) */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 lg:hidden sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:shadow-2xs ${
                activeFiltersCount > 0
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-950 font-bold'
                  : 'bg-white border-stone-200/90 text-stone-700 sm:hover:bg-stone-50'
              }`}
            >
              <i className="ph-bold ph-sliders-horizontal text-xs text-amber-700"></i>
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-burgundy px-1 font-mono text-[9px] font-bold text-white sm:static sm:px-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Dropdown Sắp xếp */}
            <div className="flex h-9 items-center gap-1 rounded-xl border border-stone-200/90 bg-white px-2 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:shadow-2xs">
              <span className="text-[11px] text-stone-400 font-medium hidden xs:inline">Xếp:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="max-w-[112px] cursor-pointer border-none bg-transparent pr-0 text-[11px] font-semibold text-stone-800 outline-none sm:max-w-none sm:pr-1 sm:text-xs"
              >
                <option value="popular">Bán chạy nhất</option>
                <option value="price-asc">Giá: Thấp → Cao</option>
                <option value="price-desc">Giá: Cao → Thấp</option>
                <option value="rating">Đánh giá cao</option>
                <option value="newest">Mới nhất</option>
              </select>
            </div>

            {/* Nút chuyển đổi View Mode (Grid / List) */}
            <div className="hidden items-center rounded-xl border border-stone-200/90 bg-white p-0.5 shadow-2xs sm:flex">
              <button 
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-brand-charcoal text-white' : 'text-stone-400 sm:hover:text-stone-700'}`}
                title="Xem dạng lưới"
              >
                <i className="ph-fill ph-squares-four text-base block"></i>
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-brand-charcoal text-white' : 'text-stone-400 sm:hover:text-stone-700'}`}
                title="Xem dạng danh sách"
              >
                <i className="ph-bold ph-list text-base block"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Dải Chip Bộ Lọc Đang Chọn (Active Filter Pills Bar - Dễ dàng gỡ bỏ từng bộ lọc trên mobile) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <span className="text-[11px] text-stone-500 font-medium">Đang lọc:</span>
            
            {selectedCategory !== 'Tất cả' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[11px]">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('Tất cả')} className="sm:hover:text-red-500 cursor-pointer">
                  <i className="ph-bold ph-x text-[10px]"></i>
                </button>
              </span>
            )}

            {selectedVolume && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[11px]">
                {selectedVolume}
                <button onClick={() => setSelectedVolume('')} className="sm:hover:text-red-500 cursor-pointer">
                  <i className="ph-bold ph-x text-[10px]"></i>
                </button>
              </span>
            )}

            {selectedWaxes.map(wax => (
              <span key={wax} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[11px]">
                {wax}
                <button onClick={() => toggleFilter(setSelectedWaxes, wax)} className="sm:hover:text-red-500 cursor-pointer">
                  <i className="ph-bold ph-x text-[10px]"></i>
                </button>
              </span>
            ))}

            {selectedWicks.map(wick => (
              <span key={wick} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[11px]">
                {wick}
                <button onClick={() => toggleFilter(setSelectedWicks, wick)} className="sm:hover:text-red-500 cursor-pointer">
                  <i className="ph-bold ph-x text-[10px]"></i>
                </button>
              </span>
            ))}

            {(priceRange[0] > 0 || priceRange[1] < 1500000) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[11px]">
                {priceRange[0].toLocaleString('vi-VN')}đ - {priceRange[1].toLocaleString('vi-VN')}đ
                <button onClick={() => setPriceRange([0, 1500000])} className="sm:hover:text-red-500 cursor-pointer">
                  <i className="ph-bold ph-x text-[10px]"></i>
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[11px] font-bold text-brand-burgundy sm:hover:underline ml-1 cursor-pointer"
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </section>

      {/* Main Layout Grid */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 bg-[#FFFCF8] px-3 py-4 sm:gap-8 sm:bg-transparent sm:px-8 sm:py-8 lg:grid-cols-4">
        
        {/* Left Sidebar - Filters (Desktop Chỉ Định) */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">

          {/* Volume Filter */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
            <h3 className="font-serif-display font-bold text-brand-charcoal text-lg mb-4">
              Dung Tích & Trọng Lượng
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  type="radio" 
                  name="volume-desktop" 
                  checked={selectedVolume === ''} 
                  onChange={() => setSelectedVolume('')}
                  className="w-4 h-4 border-stone-300 text-brand-burgundy focus:ring-brand-burgundy" 
                />
                <span className="text-xs text-stone-700 sm:group-hover:text-brand-charcoal">Tất cả dung tích</span>
              </label>
              {VOLUME_OPTIONS.map(vol => (
                <label key={vol} className="flex items-center space-x-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="volume-desktop" 
                    checked={selectedVolume === vol}
                    onChange={() => setSelectedVolume(vol)}
                    className="w-4 h-4 border-stone-300 text-brand-burgundy focus:ring-brand-burgundy" 
                  />
                  <span className={`text-xs ${selectedVolume === vol ? 'font-bold text-stone-900' : 'text-stone-700'} sm:group-hover:text-brand-charcoal`}>
                    {vol}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
            <h3 className="font-serif-display font-bold text-brand-charcoal text-lg mb-4">
              Khoảng Giá
            </h3>
            <div className="px-2 mb-6">
              <div className="h-1.5 w-full bg-stone-200 rounded-full relative">
                <div 
                  className="absolute h-full bg-[#4A2C2A] rounded-full"
                  style={{ left: `${(priceRange[0] / 1500000) * 100}%`, right: `${100 - (priceRange[1] / 1500000) * 100}%` }}
                ></div>
                <input 
                  type="range" min="0" max="1500000" step="10000"
                  value={priceRange[0]}
                  onChange={e => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
                  className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none z-10" 
                />
                <input 
                  type="range" min="0" max="1500000" step="10000"
                  value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
                  className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none z-20" 
                />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#4A2C2A] rounded-full shadow pointer-events-none z-0" style={{ left: `calc(${(priceRange[0] / 1500000) * 100}% - 7px)` }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#4A2C2A] rounded-full shadow pointer-events-none z-0" style={{ left: `calc(${(priceRange[1] / 1500000) * 100}% - 7px)` }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-stone-500 mt-3 font-mono">
                <span className="text-stone-800 font-bold">{priceRange[0].toLocaleString('vi-VN')}đ</span>
                <span className="text-stone-800 font-bold">{priceRange[1].toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => setPriceRange([0, 350000])}
                className={`${priceRange[0] === 0 && priceRange[1] === 350000 ? 'bg-[#FFF9F2] text-[#B45309] border border-amber-300' : 'bg-stone-50 text-stone-600 border border-stone-200/80 sm:hover:bg-stone-100'} text-[11px] font-medium py-1.5 rounded-lg transition-colors cursor-pointer`}
              >
                Dưới 350k
              </button>
              <button 
                type="button"
                onClick={() => setPriceRange([350000, 600000])}
                className={`${priceRange[0] === 350000 && priceRange[1] === 600000 ? 'bg-[#FFF9F2] text-[#B45309] border border-amber-300' : 'bg-stone-50 text-stone-600 border border-stone-200/80 sm:hover:bg-stone-100'} text-[11px] font-medium py-1.5 rounded-lg transition-colors cursor-pointer`}
              >
                350k - 600k
              </button>
            </div>
          </div>

          {/* Wax & Wick Filter */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
            <h3 className="font-serif-display font-bold text-brand-charcoal text-lg mb-4">
              Loại Sáp & Bấc Nến
            </h3>
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1 mb-1">Loại sáp</p>
              {WAX_OPTIONS.map((wax) => (
                <label key={wax} className="flex items-start space-x-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={selectedWaxes.includes(wax)}
                    onChange={() => toggleFilter(setSelectedWaxes, wax)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy mt-0.5" 
                  />
                  <span className={`text-xs ${selectedWaxes.includes(wax) ? 'font-bold text-stone-900' : 'text-stone-700'} sm:group-hover:text-brand-charcoal transition-colors`}>
                    {wax}
                  </span>
                </label>
              ))}
              
              <div className="pt-2 border-t border-dashed border-stone-200 mt-3 mb-1"></div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1 mb-1">Loại bấc</p>
              {WICK_OPTIONS.map((wick) => (
                <label key={wick} className="flex items-start space-x-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={selectedWicks.includes(wick)}
                    onChange={() => toggleFilter(setSelectedWicks, wick)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy mt-0.5" 
                  />
                  <span className={`text-xs ${selectedWicks.includes(wick) ? 'font-bold text-stone-900' : 'text-stone-700'} sm:group-hover:text-brand-charcoal transition-colors`}>
                    {wick}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Desktop Promo Coupon Banner */}
          {(() => {
            if (activeCoupons.length === 0) return null;
            const coupon = activeCoupons[0];
            const isApplicable = coupon.is_eligible !== false;
            
            return (
              <div className="bg-white rounded-2xl shadow-2xs border border-amber-200/90 overflow-hidden p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-amber-900">
                    Phiếu Giảm Giá Độc Quyền
                  </span>
                </div>
                <h4 className="font-bold text-xs text-brand-charcoal mb-1">{coupon.name}</h4>
                <p className="text-[11px] text-stone-500 mb-3 line-clamp-2">
                  {coupon.special_condition || 'Áp dụng khi thanh toán trực tuyến'}
                </p>
                <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200/80 rounded-xl p-1.5">
                  <span className="font-mono font-bold text-xs text-amber-900 pl-2">
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCoupon(coupon.code, coupon._id || 'side')}
                    className="px-2.5 py-1 bg-brand-charcoal sm:hover:bg-black text-amber-200 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    {copiedCouponId === (coupon._id || 'side') ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Area - Products Showcase */}
        <div className="lg:col-span-3">
          {loading ? (
            /* Skeleton Loading Grid (2 cột mobile, 3 cột desktop) */
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <article key={n} className="flex flex-col justify-between overflow-hidden rounded-[18px] border border-stone-200/80 bg-white animate-pulse sm:p-4">
                  <div className="mb-3 aspect-square w-full bg-stone-200/70 sm:rounded-xl"></div>
                  <div className="px-3 pb-3 sm:p-0">
                    <div className="mb-2 h-3 w-1/2 rounded bg-stone-200/70"></div>
                    <div className="mb-3 h-4 w-3/4 rounded bg-stone-200/70"></div>
                    <div className="mt-2 h-8 rounded-full bg-stone-200/50"></div>
                  </div>
                </article>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Không tìm thấy sản phẩm */
            <div className="p-8 sm:p-14 rounded-2xl sm:rounded-3xl bg-white border border-dashed border-stone-300 text-center max-w-md mx-auto my-6 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                <i className="ph-duotone ph-magnifying-glass text-2xl"></i>
              </div>
              <h3 className="font-serif-display text-lg sm:text-xl text-stone-800 font-bold mb-1.5">
                Không tìm thấy nến thơm phù hợp
              </h3>
              <p className="text-xs text-stone-500 mb-5 leading-relaxed">
                Hãy thử chọn từ khóa khác hoặc thiết lập lại bộ lọc để xem các sản phẩm hiện có.
              </p>
              <button 
                type="button"
                onClick={resetAllFilters}
                className="px-5 py-2.5 rounded-full bg-brand-charcoal text-white text-xs font-bold tracking-widest uppercase transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Đặt Lại Bộ Lọc
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* =================== CHẾ ĐỘ LƯỚI (GRID VIEW - 2 CỘT MOBILE, 3 CỘT DESKTOP) =================== */
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
              {filteredProducts.map((product) => {
                return (
                  <article
                    key={product._id} 
                    className="group flex flex-col justify-between overflow-hidden rounded-[18px] border border-[#E8DED5] bg-white shadow-[0_3px_14px_rgba(74,44,42,0.06)] transition-all sm:hover:-translate-y-0.5 sm:hover:shadow-md sm:p-4"
                  >
                    {/* Image Area with badges & wishlist button */}
                    <div className="relative mb-2.5 aspect-square overflow-hidden bg-[#F5EFE6] sm:mb-3.5 sm:rounded-xl">
                      {/* Product Tag */}
                      {product.tag && (
                        <div 
                          className="absolute top-2 left-2 text-white text-[8px] sm:text-[9px] font-bold tracking-widest px-1.5 sm:px-2 py-0.5 sm:py-1 uppercase z-20 rounded shadow-xs"
                          style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                        >
                          {product.tag}
                        </div>
                      )}
                      
                      {/* Nút Trái Tim Yêu Thích */}
                      <button 
                        type="button"
                        aria-label="Yêu thích" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product, navigate);
                        }} 
                        className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs z-20 sm:hover:scale-110 active:scale-90 transition-all cursor-pointer"
                        title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
                      >
                        <i className={`text-sm sm:text-base transition-colors ${
                          isInWishlist(product._id)
                            ? 'ph-fill ph-heart text-rose-500'
                            : 'ph-bold ph-heart text-stone-400 sm:hover:text-rose-500'
                        }`}></i>
                      </button>
                      
                      {/* Ảnh Sản Phẩm */}
                      <Link to={`/product/${product._id}`} className="block w-full h-full">
                        {product.image ? (
                          <img 
                            alt={product.name} 
                            className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500" 
                            src={getImageUrl(product.image)}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Image</div>
                        )}
                      </Link>
                    </div>
                    
                    {/* Info Area */}
                    <div className="flex flex-1 flex-col px-3 pb-3 sm:p-0">
                      {/* Category & Star Rating */}
                      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono uppercase tracking-wider text-stone-500 truncate">
                          {product.category || 'Nến Hũ Đơn'}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0 text-[9.5px] sm:text-[10.5px] text-stone-700 font-semibold font-mono">
                          <i className="ph-fill ph-star text-amber-500 text-[10px] sm:text-xs"></i> 
                          <span>{product.avgRating || '5.0'}</span>
                        </div>
                      </div>
                      
                      {/* Tên Sản Phẩm (Line clamp 2 dòng cố định chiều cao) */}
                      <Link to={`/product/${product._id}`} className="block mb-1 sm:mb-2 sm:group-hover:text-brand-burgundy transition-colors">
                        <h3 
                          className="font-serif-display text-xs sm:text-base font-bold text-brand-charcoal leading-snug line-clamp-2 h-[32px] sm:h-[44px] overflow-hidden" 
                          title={product.name}
                        >
                          {product.name}
                        </h3>
                      </Link>
                      
                      {/* Footer: Giá & Nút Mua Ngay */}
                      <div className="mt-auto pt-2 sm:pt-3 border-t border-stone-200/80 flex flex-col gap-1.5 sm:gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                            Giá
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-serif-display font-bold text-xs sm:text-base text-brand-charcoal sm:group-hover:text-brand-burgundy transition-colors">
                              {product.base_price?.toLocaleString('vi-VN')}đ
                            </span>
                            {product.original_price > product.base_price && (
                              <span className="text-[9px] text-stone-400 line-through hidden xs:inline">
                                {product.original_price?.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Nút Mua Ngay Full Width Thumb-friendly */}
                        <button 
                          type="button"
                          onClick={(e) => handleBuyNow(e, product)}
                          className="w-full py-2 px-2.5 rounded-full bg-brand-charcoal sm:hover:bg-brand-burgundy text-white text-[9.5px] sm:text-[11px] font-semibold tracking-wider uppercase transition-all duration-200 shadow-2xs sm:hover:shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <i className="ph-bold ph-shopping-bag-open text-xs"></i>
                          <span>Mua Ngay</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* =================== CHẾ ĐỘ DANH SÁCH (LIST VIEW - MOBILE COMPACT ROW) =================== */
            <div className="flex flex-col space-y-3 sm:space-y-4">
              {filteredProducts.map((product) => {
                return (
                  <article
                    key={product._id} 
                    className="group flex items-stretch gap-3 overflow-hidden rounded-[18px] border border-[#E8DED5] bg-white p-2.5 shadow-[0_3px_14px_rgba(74,44,42,0.06)] transition-all sm:hover:shadow-md sm:gap-5 sm:p-4"
                  >
                    {/* Image Area (Compact Square on Mobile) */}
                    <div className="relative w-24 sm:w-44 md:w-52 aspect-square rounded-xl bg-[#F5EFE6] overflow-hidden shrink-0">
                      {product.tag && (
                        <div 
                          className="absolute top-1.5 left-1.5 text-white text-[8px] sm:text-[9px] font-bold tracking-widest px-1.5 py-0.5 uppercase z-20 rounded shadow-xs"
                          style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                        >
                          {product.tag}
                        </div>
                      )}

                      <button 
                        type="button"
                        aria-label="Yêu thích" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product, navigate);
                        }} 
                        className="absolute top-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs z-20 sm:hover:scale-110 active:scale-90 transition-all cursor-pointer"
                        title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
                      >
                        <i className={`text-xs sm:text-sm transition-colors ${
                          isInWishlist(product._id)
                            ? 'ph-fill ph-heart text-rose-500'
                            : 'ph-bold ph-heart text-stone-400 sm:hover:text-rose-500'
                        }`}></i>
                      </button>

                      <Link to={`/product/${product._id}`} className="block w-full h-full">
                        {product.image ? (
                          <img 
                            alt={product.name} 
                            className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500" 
                            src={getImageUrl(product.image)}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Image</div>
                        )}
                      </Link>
                    </div>

                    {/* Info Area (Right) */}
                    <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                      <div>
                        {/* Top Category & Rating */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-amber-900 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold truncate">
                            {product.category || 'Nến Hũ Đơn'}
                          </span>
                          <div className="flex items-center text-[10px] sm:text-xs text-stone-600 font-mono font-medium">
                            <i className="ph-fill ph-star text-amber-500 mr-0.5 text-xs"></i> 
                            <span>{product.avgRating || '5.0'}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <Link to={`/product/${product._id}`} className="block mb-1 sm:group-hover:text-brand-burgundy transition-colors">
                          <h3 className="font-serif-display text-sm sm:text-xl font-bold text-brand-charcoal leading-snug line-clamp-1 sm:line-clamp-2">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Specs Badges (Desktop) */}
                        <div className="hidden sm:flex flex-wrap items-center gap-1.5 mb-2 text-[10.5px] text-stone-500">
                          {product.volume && (
                            <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                              <i className="ph ph-hourglass-simple text-xs"></i> {product.volume}
                            </span>
                          )}
                          {product.wax_type && product.wax_type.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                              <i className="ph ph-drop text-xs"></i> {product.wax_type[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions & Price */}
                      <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif-display font-bold text-sm sm:text-xl text-brand-charcoal">
                            {product.base_price?.toLocaleString('vi-VN')}đ
                          </span>
                          {product.original_price > product.base_price && (
                            <span className="text-[10px] text-stone-400 line-through hidden sm:inline">
                              {product.original_price?.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>

                        <button 
                          type="button"
                          onClick={(e) => handleBuyNow(e, product)}
                          className="bg-brand-charcoal sm:hover:bg-brand-burgundy text-white text-[10px] sm:text-xs font-bold tracking-wider px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <i className="ph-bold ph-shopping-bag-open text-xs"></i>
                          <span>Mua ngay</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =================== MOBILE FILTER DRAWER (MODAL TRƯỢT TỪ ĐÁY) =================== */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop tối mờ */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileFilterOpen(false)}
          ></div>

          {/* Drawer Panel trượt lên */}
          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
            {/* Thanh gạt drag indicator */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-3 shrink-0"></div>

            {/* Header Drawer */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-stone-200 shrink-0">
              <div className="flex items-center gap-2">
                <i className="ph-bold ph-sliders-horizontal text-amber-700"></i>
                <h3 className="font-serif-display font-bold text-lg text-brand-charcoal">
                  Bộ Lọc Sản Phẩm
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs font-bold text-brand-burgundy sm:hover:underline cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 sm:hover:text-stone-800 flex items-center justify-center cursor-pointer"
                >
                  <i className="ph-bold ph-x text-sm"></i>
                </button>
              </div>
            </div>

            {/* Nội dung lọc cuộn mượt bên trong */}
            <div className="overflow-y-auto p-5 space-y-6 flex-1 no-scrollbar">
              
              {/* Khoảng Giá */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-stone-700 mb-3 flex items-center justify-between">
                  <span>Khoảng Giá</span>
                  <span className="font-mono text-amber-900 font-bold lowercase">
                    {priceRange[0].toLocaleString('vi-VN')}đ - {priceRange[1].toLocaleString('vi-VN')}đ
                  </span>
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPriceRange([0, 350000])}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all ${
                      priceRange[0] === 0 && priceRange[1] === 350000
                        ? 'bg-brand-charcoal text-amber-300 border-brand-charcoal shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    Dưới 350k
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceRange([350000, 600000])}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all ${
                      priceRange[0] === 350000 && priceRange[1] === 600000
                        ? 'bg-brand-charcoal text-amber-300 border-brand-charcoal shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    350k - 600k
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceRange([600000, 1500000])}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all ${
                      priceRange[0] === 600000 && priceRange[1] === 1500000
                        ? 'bg-brand-charcoal text-amber-300 border-brand-charcoal shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    Trên 600k
                  </button>
                </div>
              </div>

              {/* Dung Tích */}
              {VOLUME_OPTIONS.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-700 mb-2.5">
                    Dung Tích Hũ Nến
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVolume('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selectedVolume === ''
                          ? 'bg-brand-charcoal text-white border-brand-charcoal'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Tất cả
                    </button>
                    {VOLUME_OPTIONS.map(vol => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() => setSelectedVolume(selectedVolume === vol ? '' : vol)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selectedVolume === vol
                            ? 'bg-brand-charcoal text-white border-brand-charcoal'
                            : 'bg-stone-50 border-stone-200 text-stone-600'
                        }`}
                      >
                        {vol}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loại Sáp */}
              {WAX_OPTIONS.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-700 mb-2.5">
                    Loại Sáp Nến Hữu Cơ
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {WAX_OPTIONS.map(wax => {
                      const isChecked = selectedWaxes.includes(wax);
                      return (
                        <button
                          key={wax}
                          type="button"
                          onClick={() => toggleFilter(setSelectedWaxes, wax)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-brand-burgundy text-white border-brand-burgundy'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                          }`}
                        >
                          <i className={`ph-bold ${isChecked ? 'ph-check' : 'ph-drop'} text-xs`}></i>
                          <span>{wax}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loại Bấc */}
              {WICK_OPTIONS.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-700 mb-2.5">
                    Loại Bấc Nến
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {WICK_OPTIONS.map(wick => {
                      const isChecked = selectedWicks.includes(wick);
                      return (
                        <button
                          key={wick}
                          type="button"
                          onClick={() => toggleFilter(setSelectedWicks, wick)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-brand-burgundy text-white border-brand-burgundy'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                          }`}
                        >
                          <i className={`ph-bold ${isChecked ? 'ph-check' : 'ph-flame'} text-xs`}></i>
                          <span>{wick}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Cố Định Nút Áp Dụng */}
            <div className="p-4 border-t border-stone-200 shrink-0 bg-white pb-6">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3.5 px-4 rounded-full bg-brand-charcoal text-white sm:hover:bg-black text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Xem {filteredProducts.length} Sản Phẩm</span>
                <i className="ph-bold ph-arrow-right text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
