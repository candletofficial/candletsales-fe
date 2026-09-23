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
  }, []);

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
    'Tất cả',
    'Nến Hũ Đơn',
    'Tinh Dầu Khuếch Tán',
    'Bộ Quà Tặng Giftset',
    'Phụ Kiện Chăm Sóc Nến'
  ];

  const toggleFilter = (setState, value) => {
    setState(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
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

    // Lấy SKU đầu tiên nếu sản phẩm có danh sách biến thể
    const defaultSkuId = (product.skus && product.skus.length > 0) ? product.skus[0].id : undefined;

    const buyItem = {
      product_id: product,
      sku_id: defaultSkuId,
      quantity: 1
    };

    navigate('/checkout', { state: { selectedItems: [buyItem] } });
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen pb-20">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-6 border-b border-dashed border-stone-300">
        <div className="flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-500 mb-4">
          <Link to="/" className="hover:text-brand-burgundy transition-colors">Trang Chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-charcoal">Cửa Hàng Nến Thơm Nghệ Thuật</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-8 lg:col-span-8">
            <div className="flex items-center text-xs font-bold uppercase tracking-widest text-brand-gold mb-3">
              <i className="ph ph-heart mr-1.5 text-sm"></i>
              Handcrafted Botanical Candles
            </div>
            <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl text-brand-charcoal leading-tight mb-4">
              Thư Viện Mùi Hương & Nến Thơm Nghệ Thuật
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed pr-4">
              Khám phá các sáng tạo mùi hương thủ công từ 100% sáp thực vật tự nhiên, khơi gợi xúc cảm an yên và chánh niệm trong từng khoảnh khắc sống.
            </p>
          </div>
          
          <div className="md:col-span-4 lg:col-span-4 flex justify-start md:justify-end">
            <div className="bg-[#FFF9F2] border border-amber-200/50 rounded-lg p-4 flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <i className="ph-fill ph-seal-check text-xl"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800 uppercase tracking-wide">100% Thuần Thực Vật</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Tinh dầu chuẩn IFRA & bấc gỗ tự nhiên</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 border-b border-dashed border-stone-300 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-3 min-w-max">
          {CATEGORIES.map(cat => {
            const count = cat === 'Tất cả' ? products.length : products.filter(p => (p.category || 'Nến Hũ Đơn').toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory === cat;
            return (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`${isSelected ? 'bg-[#4A2C2A] text-white' : 'bg-[#F5EFE6] text-stone-700 hover:bg-[#EBE3D5]'} transition-colors px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase flex items-center`}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-white/50 mr-2"></span>}
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 border-b border-dashed border-stone-300 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <p className="text-xs text-stone-500">
            Đang hiển thị <span className="font-bold text-stone-800">{filteredProducts.length}</span> trên <span className="font-bold text-stone-800">{products.length}</span> sản phẩm |
          </p>
          <div className="flex items-center space-x-1 border border-stone-200 rounded p-0.5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[#4A2C2A] text-white' : 'text-stone-400 hover:bg-stone-100'}`}
            >
              <i className="ph-fill ph-squares-four text-lg"></i>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#4A2C2A] text-white' : 'text-stone-400 hover:bg-stone-100'}`}
            >
              <i className="ph-bold ph-list text-lg"></i>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên nến, nốt hương..." 
              className="w-full bg-[#F5EFE6] border-none text-xs py-2 pl-9 pr-8 rounded focus:ring-1 focus:ring-brand-burgundy outline-none placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <i className="ph ph-x text-xs"></i>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xs text-stone-500">Sắp xếp:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#F5EFE6] border-none text-xs py-2 px-3 rounded focus:ring-1 focus:ring-brand-burgundy outline-none font-medium text-stone-800 cursor-pointer"
            >
              <option value="popular">Bán chạy nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar - Filters */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">

          {/* Volume Filter */}
          <div className="bg-white border border-stone-200 rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 cursor-pointer">
              <h3 className="font-serif-display font-bold text-brand-charcoal text-lg">
                Dung Tích & Cháy
              </h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="radio" name="volume" 
                  checked={selectedVolume === ''} 
                  onChange={() => setSelectedVolume('')}
                  className="w-4 h-4 border-stone-300 text-brand-burgundy focus:ring-brand-burgundy" 
                />
                <span className="text-xs text-stone-700 group-hover:text-brand-charcoal">Tất cả dung tích</span>
              </label>
              {VOLUME_OPTIONS.map(vol => (
                <label key={vol} className="flex items-center space-x-3 cursor-pointer group">
                  <input type="radio" name="volume" 
                    checked={selectedVolume === vol}
                    onChange={() => setSelectedVolume(vol)}
                    className="w-4 h-4 border-stone-300 text-brand-burgundy focus:ring-brand-burgundy" 
                  />
                  <span className={`text-xs ${selectedVolume === vol ? 'font-bold text-stone-900' : 'text-stone-700'} group-hover:text-brand-charcoal`}>{vol}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="bg-white border border-stone-200 rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 cursor-pointer">
              <h3 className="font-serif-display font-bold text-brand-charcoal text-lg">
                Khoảng Giá
              </h3>
            </div>
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
              <div className="flex justify-between text-[10px] text-stone-400 mt-3 font-mono">
                <span className="text-stone-800 font-bold">{priceRange[0].toLocaleString('vi-VN')}đ</span>
                <span className="text-stone-800 font-bold">{priceRange[1].toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setPriceRange([0, 350000])}
                className={`${priceRange[0] === 0 && priceRange[1] === 350000 ? 'bg-[#FFF9F2] text-[#B45309] border border-amber-200/50' : 'bg-[#F5EFE6] text-stone-600 border border-transparent hover:bg-stone-200'} text-[11px] font-medium py-1.5 rounded transition-colors`}
              >
                Dưới 350k
              </button>
              <button 
                onClick={() => setPriceRange([350000, 600000])}
                className={`${priceRange[0] === 350000 && priceRange[1] === 600000 ? 'bg-[#FFF9F2] text-[#B45309] border border-amber-200/50' : 'bg-[#F5EFE6] text-stone-600 border border-transparent hover:bg-stone-200'} text-[11px] font-medium py-1.5 rounded transition-colors`}
              >
                350k - 600k
              </button>
            </div>
          </div>

          {/* Wax & Wick Filter */}
          <div className="bg-white border border-stone-200 rounded p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 cursor-pointer">
              <h3 className="font-serif-display font-bold text-brand-charcoal text-lg">
                Loại Sáp & Bấc
              </h3>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2 mb-1">Loại sáp</p>
              {WAX_OPTIONS.map((wax) => (
                <label key={wax} className="flex items-start space-x-3 cursor-pointer group">
                  <input type="checkbox" 
                    checked={selectedWaxes.includes(wax)}
                    onChange={() => toggleFilter(setSelectedWaxes, wax)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy mt-0.5" 
                  />
                  <span className={`text-xs ${selectedWaxes.includes(wax) ? 'font-bold text-stone-900' : 'text-stone-700'} group-hover:text-brand-charcoal transition-colors`}>{wax}</span>
                </label>
              ))}
              
              <div className="pt-2 border-t border-dashed border-stone-200 mt-3 mb-1"></div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2 mb-1">Loại bấc</p>
              {WICK_OPTIONS.map((wick) => (
                <label key={wick} className="flex items-start space-x-3 cursor-pointer group">
                  <input type="checkbox" 
                    checked={selectedWicks.includes(wick)}
                    onChange={() => toggleFilter(setSelectedWicks, wick)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy mt-0.5" 
                  />
                  <span className={`text-xs ${selectedWicks.includes(wick) ? 'font-bold text-stone-900' : 'text-stone-700'} group-hover:text-brand-charcoal transition-colors`}>{wick}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Promo Banners */}
          {(() => {
            if (activeCoupons.length === 0) return null;
            
            // Tìm voucher tốt nhất: ưu tiên khả dụng, sau đó ưu tiên theo giá trị (đơn giản hoá: ưu tiên % rồi đến cố định, hoặc ưu tiên giá trị lớn)
            const sortedCoupons = [...activeCoupons].sort((a, b) => {
              const aEligible = a.is_eligible !== false;
              const bEligible = b.is_eligible !== false;
              
              if (aEligible && !bEligible) return -1;
              if (!aEligible && bEligible) return 1;
              
              if (a.type !== b.type) {
                 // Ưu tiên percent (thường mang lại cảm giác giảm giá sâu hơn cho marketing)
                 return a.type === 'percent' ? -1 : 1;
              }
              return b.value - a.value;
            });
            
            const coupon = sortedCoupons[0];
            const isApplicable = coupon.is_eligible !== false;
            
            return (
              <div 
                key={coupon._id} 
                className={`relative flex bg-white rounded-lg shadow-sm hover:shadow-md mb-6 border ${isApplicable ? 'border-amber-200' : 'border-stone-200 opacity-80'} overflow-hidden transition-all`}
              >
                {/* Left Ticket Stub (Fixed Width) */}
                <div className={`w-[90px] flex-shrink-0 flex flex-col items-center justify-center p-2 text-white relative ${isApplicable ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706]' : 'bg-stone-400'}`}>
                  {/* Decorative faint circles */}
                  <div className="absolute top-[-10px] left-[-10px] w-12 h-12 bg-white/10 rounded-full"></div>
                  <div className="absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-white/10 rounded-full"></div>

                  <span className="text-2xl font-bold font-serif-display leading-none z-10 text-center">
                    {coupon.type === 'percent' ? `${coupon.value}%` : `${new Intl.NumberFormat('vi-VN').format(coupon.value / 1000)}K`}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest font-bold opacity-90 mt-1 z-10 text-center">Giảm</span>
                  
                  {/* Jagged / dotted divider line on right edge of stub */}
                  <div className="absolute top-0 right-0 bottom-0 border-r-[3px] border-dotted border-white/50"></div>
                  
                  {/* Top and Bottom cutouts for the stub */}
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-white rounded-full border-b border-l border-transparent z-10 shadow-inner"></div>
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white rounded-full border-t border-l border-transparent z-10 shadow-inner"></div>
                </div>

                {/* Right Content */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0 bg-white">
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="bg-brand-burgundy/10 text-brand-burgundy text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Voucher
                      </span>
                    </div>
                    <h4 className={`text-[13px] font-bold leading-tight truncate ${isApplicable ? 'text-brand-charcoal' : 'text-stone-500'}`} title={coupon.name}>
                      {coupon.name}
                    </h4>
                    <p className="text-[10px] text-stone-500 leading-snug line-clamp-1 mt-0.5" title={isApplicable ? (coupon.max_discount ? `Giảm tối đa ${coupon.max_discount.toLocaleString('vi-VN')}đ` : 'Áp dụng tại giỏ hàng') : coupon.eligibility_error}>
                      {isApplicable 
                        ? (coupon.max_discount ? `Giảm tối đa ${coupon.max_discount.toLocaleString('vi-VN')}đ` : 'Áp dụng tại giỏ hàng')
                        : coupon.eligibility_error}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <div className="bg-stone-50 border border-stone-200 text-stone-700 px-2 py-1 rounded text-[10px] font-mono font-bold truncate select-all flex-1 text-center">
                      {coupon.code}
                    </div>
                    {isApplicable ? (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(coupon.code);
                          alert(`Đã sao chép mã: ${coupon.code}`);
                        }}
                        className="bg-brand-charcoal text-white text-[9px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors px-2.5 py-1.5 rounded hover:bg-[#3A2220] flex-shrink-0"
                      >
                        Lấy mã
                      </button>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap cursor-not-allowed px-2 py-1 rounded flex-shrink-0">
                        Không đạt
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Area - Product Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-stone-500">Đang tải sản phẩm...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-500 space-y-4">
              <i className="ph-duotone ph-magnifying-glass text-4xl text-stone-300"></i>
              <p>Không tìm thấy sản phẩm nào phù hợp với bộ lọc.</p>
              <button 
                onClick={() => {
                  setSelectedVolume('');
                  setSelectedWaxes([]);
                  setSelectedWicks([]);
                }}
                className="text-xs font-bold text-brand-burgundy uppercase tracking-widest hover:underline"
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* =================== DẠNG LƯỚI (GRID VIEW) =================== */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                return (
                  <div key={product._id} className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                    
                    {/* Image Area */}
                    <div className="relative aspect-square rounded bg-[#F5EFE6] mb-4 overflow-hidden">
                      {product.tag && (
                        <div 
                          className="absolute top-2 left-2 text-white text-[9px] font-bold tracking-widest px-2 py-1 uppercase z-20 rounded-sm shadow-sm"
                          style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                        >
                          {product.tag}
                        </div>
                      )}
                      
                      <button 
                        aria-label="Yêu thích" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product, navigate);
                        }} 
                        className="absolute top-2 right-2 w-8 h-8 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center shadow-sm z-20 hover:scale-110 transition-all focus:outline-none cursor-pointer"
                        title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
                      >
                        <i className={`text-base transition-colors ${
                          isInWishlist(product._id)
                            ? 'ph-fill ph-heart text-rose-500'
                            : 'ph-bold ph-heart text-stone-400 hover:text-rose-500'
                        }`}></i>
                      </button>
                      
                      <Link to={`/product/${product._id}`} className="block w-full h-full">
                        {product.image ? (
                          <img alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={getImageUrl(product.image)}/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Image</div>
                        )}
                      </Link>
                    </div>
                    
                    {/* Info Area */}
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">
                          {product.category || 'Nến Hũ Đơn'}
                        </span>
                        <div className="flex items-center text-[10px] text-stone-500 font-medium">
                          <i className="ph-fill ph-star text-amber-400 mr-0.5 text-xs"></i> 
                          {product.avgRating || '5.0'} <span className="text-stone-400 font-normal ml-0.5">({product.reviewCount || 0})</span>
                        </div>
                      </div>
                      
                      <Link to={`/product/${product._id}`} className="block mb-1.5">
                        <h3 className="font-serif-display text-xl font-bold text-brand-charcoal group-hover:text-brand-burgundy transition-colors">{product.name}</h3>
                      </Link>
                      
                      <p className="text-xs text-stone-500 italic leading-relaxed mb-4 line-clamp-2">
                        Nốt hương: {product.description || 'Oải hương Provence, Xô thơm Clary Sage, Gỗ tuyết tùng trầm ấm.'}
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-dashed border-stone-200 flex items-center justify-between">
                        <div className="flex items-baseline space-x-2">
                          <span className="font-serif-display font-bold text-lg text-[#1A1A1A]">
                            {product.base_price?.toLocaleString('vi-VN')}đ
                          </span>
                          {product.original_price > 0 && (
                            <span className="text-[10px] text-stone-400 line-through">
                              {product.original_price.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>
                        
                        <button 
                          onClick={(e) => handleBuyNow(e, product)}
                          className="bg-[#3D2523] hover:bg-[#2A1918] text-white text-[11px] font-bold tracking-widest px-3.5 py-2 rounded transition-colors flex items-center uppercase cursor-pointer"
                        >
                          <i className="ph-bold ph-tote mr-1.5"></i> Mua ngay
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =================== DẠNG DANH SÁCH (LIST VIEW) =================== */
            <div className="flex flex-col space-y-5">
              {filteredProducts.map((product) => {
                return (
                  <div 
                    key={product._id} 
                    className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all group flex flex-col sm:flex-row gap-6 items-stretch"
                  >
                    {/* Image Area (Left) */}
                    <div className="relative w-full sm:w-56 md:w-60 aspect-square sm:aspect-auto rounded-lg bg-[#F5EFE6] overflow-hidden shrink-0">
                      {product.tag && (
                        <div 
                          className="absolute top-3 left-3 text-white text-[10px] font-bold tracking-widest px-2.5 py-1 uppercase z-20 rounded shadow-xs"
                          style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                        >
                          {product.tag}
                        </div>
                      )}

                      <button 
                        aria-label="Yêu thích" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product, navigate);
                        }} 
                        className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs z-20 hover:scale-110 transition-all focus:outline-none cursor-pointer"
                        title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
                      >
                        <i className={`text-base transition-colors ${
                          isInWishlist(product._id)
                            ? 'ph-fill ph-heart text-rose-500'
                            : 'ph-bold ph-heart text-stone-400 hover:text-rose-500'
                        }`}></i>
                      </button>

                      <Link to={`/product/${product._id}`} className="block w-full h-full min-h-[190px]">
                        {product.image ? (
                          <img 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            src={getImageUrl(product.image)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Image</div>
                        )}
                      </Link>
                    </div>

                    {/* Info Area (Right) */}
                    <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
                      <div>
                        {/* Top metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#B45309] bg-[#FFF9F2] px-2.5 py-0.5 rounded-full border border-amber-200/60">
                            {product.category || 'Nến Hũ Đơn'}
                          </span>
                          <div className="flex items-center text-xs text-stone-600 font-medium">
                            <i className="ph-fill ph-star text-amber-500 mr-1 text-sm"></i> 
                            <span className="font-bold text-stone-800">{product.avgRating || '5.0'}</span>
                            <span className="text-stone-400 font-normal ml-1">({product.reviewCount || 0} đánh giá)</span>
                          </div>
                        </div>

                        {/* Title */}
                        <Link to={`/product/${product._id}`} className="block mb-2">
                          <h3 className="font-serif-display text-2xl font-bold text-brand-charcoal group-hover:text-brand-burgundy transition-colors leading-snug">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Description */}
                        <p className="text-xs text-stone-600 leading-relaxed mb-4 line-clamp-2">
                          <span className="font-semibold text-stone-700">Nốt hương chính: </span>
                          {product.description || 'Hương thơm thanh tao từ tinh dầu tự nhiên, kết hợp sáp thực vật cao cấp giúp thanh lọc không khí và mang lại cảm giác thư thái.'}
                        </p>

                        {/* Specifications Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-stone-500">
                          {product.volume && (
                            <span className="inline-flex items-center gap-1 bg-stone-100/90 text-stone-600 px-2.5 py-1 rounded-md">
                              <i className="ph ph-hourglass-simple text-xs"></i> {product.volume}
                            </span>
                          )}
                          {product.wax_type && product.wax_type.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-stone-100/90 text-stone-600 px-2.5 py-1 rounded-md">
                              <i className="ph ph-drop text-xs"></i> {product.wax_type.join(', ')}
                            </span>
                          )}
                          {product.wick_type && product.wick_type.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-stone-100/90 text-stone-600 px-2.5 py-1 rounded-md">
                              <i className="ph ph-flame text-xs text-amber-600"></i> {product.wick_type.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-4 border-t border-dashed border-stone-200 flex flex-wrap items-center justify-between gap-4 mt-auto">
                        <div className="flex items-baseline space-x-2">
                          <span className="font-serif-display font-bold text-2xl text-[#1A1A1A]">
                            {product.base_price?.toLocaleString('vi-VN')}đ
                          </span>
                          {product.original_price > 0 && (
                            <span className="text-xs text-stone-400 line-through">
                              {product.original_price.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3">
                          <Link
                            to={`/product/${product._id}`}
                            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:border-stone-800 hover:text-stone-900 text-xs font-bold uppercase tracking-wider transition-colors"
                          >
                            Chi tiết
                          </Link>
                          <button 
                            onClick={(e) => handleBuyNow(e, product)}
                            className="bg-[#3D2523] hover:bg-[#2A1918] text-white text-xs font-bold tracking-wider px-5 py-2 rounded-lg transition-colors flex items-center uppercase cursor-pointer shadow-xs"
                          >
                            <i className="ph-bold ph-tote mr-2"></i> Mua ngay
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
