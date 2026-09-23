import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopService } from '../../services/shopService';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import ProductReviews from '../../components/shop/ProductReviews';
import { resolveTagColor } from '../../utils/productTagUtils';
import { getImageUrl } from '../../utils/imageUtils';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCoupons, setActiveCoupons] = useState([]);

  // State cho variant, giỏ hàng, và gallery
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [activeTab, setActiveTab] = useState('description');

  const thumbRef = useRef(null);
  const [thumbOffset, setThumbOffset] = useState(0);

  useEffect(() => {
    const updateOffset = () => {
      if (thumbRef.current && window.innerWidth >= 768) {
        // gap-4 is 16px
        setThumbOffset(thumbRef.current.offsetWidth + 16);
      } else {
        setThumbOffset(0);
      }
    };

    // Đợi layout render xong
    setTimeout(updateOffset, 100);

    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [product]);

  const fetchProductDetail = async () => {
    try {
      const [res, couponRes] = await Promise.all([
        shopService.getProductById(id),
        shopService.getActiveCoupons().catch(() => ({ data: [] }))
      ]);

      if (couponRes && couponRes.data) {
        setActiveCoupons(couponRes.data);
      } else if (Array.isArray(couponRes)) {
        setActiveCoupons(couponRes);
      }

      if (res.success) {
        setProduct(res.data);
        if (res.data?.name) {
          document.title = `${res.data.name} | Candlet`;
        }
        const images = [res.data.image, ...(res.data.images || [])].filter(Boolean);
        if (images.length > 0) setActiveImage(images[0]);

        // Mặc định chọn option đầu tiên cho mỗi nhóm
        if (res.data.variant_groups && res.data.variant_groups.length > 0) {
          const defaults = {};
          res.data.variant_groups.forEach(group => {
            if (group.options.length > 0) {
              defaults[group.id] = group.options[0].id;
            }
          });
          setSelectedOptions(defaults);
        }
      }
    } catch (error) {
      console.error('Failed to fetch product', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  // Moved fetchProductDetail above

  const handleOptionSelect = (groupId, optionId) => {
    setSelectedOptions(prev => ({ ...prev, [groupId]: optionId }));
  };

  const currentSku = () => {
    if (!product || !product.skus || product.skus.length === 0) return null;
    const selectedCombo = Object.values(selectedOptions).sort().join(',');

    return product.skus.find(sku => {
      const skuCombo = [...sku.combination].sort().join(',');
      return skuCombo === selectedCombo;
    });
  };

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = async () => {
    if (!product) return;

    const selectedSku = currentSku();
    // Nếu có biến thể (skus) nhưng chưa chọn
    if (product.skus && product.skus.length > 0 && !selectedSku) {
      alert('Vui lòng chọn loại sản phẩm');
      return;
    }

    try {
      setIsAdding(true);
      const payload = {
        product_id: product._id,
        quantity,
        sku_id: selectedSku ? selectedSku.id : undefined
      };

      const res = await addToCart(payload);
      if (res.success) {
        alert('Đã thêm vào giỏ hàng thành công!');
      }
    } catch (error) {
      console.error('Failed to add to cart', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;

    const selectedSku = currentSku();
    if (product.skus && product.skus.length > 0 && !selectedSku) {
      alert('Vui lòng chọn loại sản phẩm');
      return;
    }

    const buyItem = {
      product_id: product,
      sku_id: selectedSku ? selectedSku.id : undefined,
      quantity: quantity
    };

    // Chuyển thẳng sang trang thanh toán luôn với sản phẩm này
    navigate('/checkout', { state: { selectedItems: [buyItem] } });
  };

  const activeSku = currentSku();
  const basePrice = activeSku && activeSku.price > 0 ? activeSku.price : (product?.base_price || 0);

  // Tính toán voucher tốt nhất (Phải gọi trước các lệnh return)
  const bestCoupon = useMemo(() => {
    if (!product || !activeCoupons.length) return null;

    let best = null;
    let maxDiscount = 0;

    activeCoupons.forEach(coupon => {
      // Kiểm tra sản phẩm có được áp dụng mã không
      const isApplicable = coupon.applicable_products === 'all' ||
        (coupon.applicable_products === 'specific' && coupon.product_ids?.includes(product._id));

      if (!isApplicable) return;

      let discountAmount = 0;
      if (coupon.type === 'percent') {
        discountAmount = (basePrice * coupon.value) / 100;
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount;
        }
      } else if (coupon.type === 'fixed') {
        discountAmount = coupon.value;
      }

      if (discountAmount > maxDiscount) {
        maxDiscount = discountAmount;
        best = { ...coupon, discountAmount };
      }
    });

    return best;
  }, [activeCoupons, basePrice, product]);

  // Thông tin Thành Phần & Xuất Xứ theo đúng sản phẩm thực tế
  const ingredientDetails = useMemo(() => {
    if (!product) return null;

    // 1. Lọc và chuẩn hóa danh sách Sáp (Wax)
    // Loại bỏ các tag không phải sáp (nếu người dùng lỡ nhập lẫn bấc, hũ, ly...)
    const rawWaxes = (product.wax_type || []).filter(Boolean);
    let cleanWaxes = rawWaxes.filter(w => {
      const lower = w.toLowerCase();
      return !lower.includes('bấc') && !lower.includes('tim') && !lower.includes('hũ') && !lower.includes('ly') && !lower.includes('hộp');
    });

    if (cleanWaxes.length === 0) {
      cleanWaxes = ['Sáp Ong', 'Sáp Đậu Nành'];
    }

    let waxTitle = cleanWaxes.join(' & ');
    if (!waxTitle.toLowerCase().includes('tự nhiên') && !waxTitle.toLowerCase().includes('thuần khiết')) {
      waxTitle = `${waxTitle} Tự Nhiên`;
    }

    let waxDesc = 'Độ tan chảy chậm, bề mặt nến láng mịn sau khi đông kết, hoàn toàn không chứa paraffin hay tỏa muội than độc hại.';
    const waxLower = cleanWaxes.join(' ').toLowerCase();
    if (waxLower.includes('ong') && waxLower.includes('đậu nành')) {
      waxDesc = 'Sự kết hợp hoàn hảo giữa sáp ong tinh khiết và sáp đậu nành thực vật giúp nến cháy lâu hơn, tỏa hương êm dịu và thanh lọc không khí tự nhiên.';
    } else if (waxLower.includes('ong')) {
      waxDesc = 'Sáp ong tự nhiên tinh khiết với khả năng thanh lọc không khí, kéo dài thời gian cháy và tạo ánh sáng ngọn lửa ấm áp.';
    } else if (waxLower.includes('đậu nành')) {
      waxDesc = '100% sáp đậu nành thiên nhiên nhập khẩu, bề mặt láng mịn, độ tan chảy đều và không sinh muội than độc hại.';
    } else if (waxLower.includes('dừa') || waxLower.includes('cọ')) {
      waxDesc = 'Nguồn gốc thực vật tự nhiên lành tính, bề mặt nến bóng mịn và giữ trọn vẹn các tầng hương tinh dầu.';
    }

    // 2. Lọc và chuẩn hóa danh sách Bấc (Wick)
    // Loại bỏ các tag không phải bấc (nếu người dùng lỡ nhập lẫn sáp, wax, hũ...)
    const rawWicks = (product.wick_type || []).filter(Boolean);
    let cleanWicks = rawWicks.filter(w => {
      const lower = w.toLowerCase();
      return !lower.includes('sáp') && !lower.includes('wax') && !lower.includes('hũ') && !lower.includes('ly') && !lower.includes('hộp');
    });

    let wickTitle = 'Bấc Cotton Hữu Cơ Không Chì';
    let wickDesc = 'Không chì, không kẽm, ngọn lửa cháy êm dịu, không sinh khói đen và an toàn cho phòng kín.';

    if (cleanWicks.length > 0) {
      const wickStr = cleanWicks.join(' & ');
      const lower = wickStr.toLowerCase();

      if (lower.includes('vân') || lower.includes('gỗ')) {
        wickTitle = lower.includes('bấc')
          ? (lower.includes('vân') && !lower.includes('gỗ') ? `${wickStr} Gỗ Tự Nhiên` : wickStr)
          : `Bấc ${wickStr} Gỗ`;
        wickDesc = 'Sợi vân gỗ tự nhiên không qua xử lý hóa chất, tạo ngọn lửa dải ruy-băng ổn định và âm thanh tí tách êm tai như than hồng sưởi ấm.';
      } else if (lower.includes('cotton')) {
        wickTitle = lower.includes('bấc')
          ? (lower.includes('chì') ? wickStr : `${wickStr} Không Chì`)
          : `Bấc ${wickStr} Không Chì`;
        wickDesc = 'Sợi bông hữu cơ bện sợi đôi không chì, không kim loại nặng, duy trì ngọn lửa nhỏ đều và sạch muội than.';
      } else {
        wickTitle = lower.startsWith('bấc') ? wickStr : `Bấc ${wickStr}`;
        wickDesc = 'Chất liệu tuyển chọn an toàn không chì, tạo ngọn lửa cháy ổn định và không tỏa khói độc.';
      }
    }

    // 3. Tinh dầu & Mùi hương
    const scentTitle = 'Tinh Dầu Thơm & Chiết Xuất Thực Vật';
    let scentDesc = 'Pha trộn tinh dầu thực vật lành tính đạt tiêu chuẩn IFRA quốc tế, khuếch tán hương thơm nhẹ nhàng, không gây đau đầu hay kích ứng khứu giác.';
    if (product.scent_group) {
      scentDesc = `Thuộc nhóm hương ${product.scent_group}, tinh dầu thực vật đạt chuẩn an toàn IFRA quốc tế, khuếch tán dịu nhẹ và thư thái.`;
    }

    // 4. Quy cách, Hũ chứa & Xuất xứ
    const vesselTitle = 'Hũ Chứa & Xuất Xứ Sản Phẩm';
    const volumeInfo = product.volume ? `Dung tích ${product.volume}. ` : '';
    const vesselDesc = `${volumeInfo}Chế tác thủ công tại Việt Nam (Handmade by Candlet), hũ chứa chịu nhiệt an toàn và dễ dàng tái chế làm vật dụng trang trí sau khi dùng hết.`;

    return {
      waxSummary: cleanWaxes.join(' & '),
      items: [
        { title: waxTitle, desc: waxDesc },
        { title: wickTitle, desc: wickDesc },
        { title: scentTitle, desc: scentDesc },
        { title: vesselTitle, desc: vesselDesc }
      ]
    };
  }, [product]);

  const displayPrice = bestCoupon ? Math.max(0, basePrice - bestCoupon.discountAmount) : basePrice;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] bg-[#f9f9f9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A2C2A]"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 bg-[#f9f9f9]">Không tìm thấy sản phẩm.</div>;
  }

  const allImages = [product.image, ...(product.images || [])].filter(Boolean);

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-16">
        <div className="flex items-center flex-wrap text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-500 mb-8">
          <button onClick={() => navigate('/')} className="hover:text-brand-burgundy transition-colors whitespace-nowrap">
            TRANG CHỦ
          </button>
          <span className="mx-2">/</span>
          <button onClick={() => navigate('/shop')} className="hover:text-brand-burgundy transition-colors whitespace-nowrap">
            CỬA HÀNG NẾN THƠM NGHỆ THUẬT
          </button>
          <span className="mx-2">/</span>
          <span className="text-brand-charcoal">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Cột Trái: Image Gallery */}
          <div className="lg:col-span-7 h-fit flex flex-col md:flex-row-reverse gap-4">
            {/* Ảnh chính */}
            <div className="w-full md:w-5/6 aspect-square bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden relative">
              {product.tag && (
                <div
                  className="absolute top-3 left-3 text-white text-[10px] font-bold tracking-widest px-3 py-1.5 uppercase z-20 rounded-sm shadow-md"
                  style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                >
                  {product.tag}
                </div>
              )}

              {/* Nút Yêu Thích trên ảnh lớn */}
              <button
                onClick={() => toggleWishlist(product, navigate)}
                className="absolute top-3 right-3 w-10 h-10 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center shadow-md z-20 hover:scale-110 transition-all focus:outline-none"
                title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Thêm vào danh sách yêu thích"}
              >
                <i className={`text-xl transition-colors ${isInWishlist(product._id)
                    ? 'ph-fill ph-heart text-rose-500'
                    : 'ph-bold ph-heart text-stone-400 hover:text-rose-500'
                  }`}></i>
              </button>
              {activeImage ? (
                <img
                  src={getImageUrl(activeImage)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
                  <i className="ph ph-image text-4xl"></i>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <>
                {/* Mobile: Horizontal Scroll */}
                <div className="w-full md:hidden flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                  {allImages.map((img, index) => (
                    <button
                      key={`mob-${index}`}
                      onClick={() => setActiveImage(img)}
                      className={`shrink-0 w-20 aspect-square rounded bg-white border overflow-hidden transition-all ${activeImage === img
                          ? 'border-[#4A2C2A] shadow-md'
                          : 'border-stone-200 opacity-60 hover:opacity-100'
                        }`}
                    >
                      <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`${product.name} ${index}`} />
                    </button>
                  ))}
                </div>

                {/* Desktop: Vertical Scroll matching main image height */}
                <div ref={thumbRef} className="hidden md:block w-1/6 relative">
                  <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                    {allImages.map((img, index) => (
                      <button
                        key={`desk-${index}`}
                        onClick={() => setActiveImage(img)}
                        className={`shrink-0 w-full aspect-square rounded bg-white border overflow-hidden transition-all ${activeImage === img
                            ? 'border-[#4A2C2A] shadow-md'
                            : 'border-stone-200 opacity-60 hover:opacity-100'
                          }`}
                      >
                        <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`${product.name} ${index}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Cột Phải: Thông tin sản phẩm */}
          <div className="lg:col-span-5 flex flex-col">
            {product.category && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
                {product.category}
              </p>
            )}
            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl text-brand-charcoal leading-tight mb-2">
              {product.name}
            </h1>

            {/* Hàng Đánh Giá Sao & Số lượt review */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-amber-500 text-sm">
                {[1, 2, 3, 4, 5].map((s) => (
                  <i key={s} className={`${s <= Math.round(Number(product.avgRating || 5)) ? 'ph-fill' : 'ph'} ph-star`}></i>
                ))}
              </div>
              <span className="text-xs font-bold text-stone-700">{product.avgRating || '5.0'}</span>
              <span className="text-xs text-stone-300">·</span>
              <a
                href="#reviews-section"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs text-[#B45309] font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{product.reviewCount || 0} đánh giá</span>
                <i className="ph-bold ph-arrow-down text-[10px]"></i>
              </a>
            </div>
            <div className="mb-6 flex flex-col gap-1">
              {bestCoupon ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl font-bold text-[#B45309]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
                    </span>
                    <span className="text-sm sm:text-base text-stone-400 line-through">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.original_price > basePrice ? product.original_price : basePrice)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xl sm:text-2xl font-bold text-[#B45309]">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
                  </span>
                  {product.original_price > displayPrice && (
                    <span className="text-sm sm:text-base text-stone-400 line-through">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.original_price)}
                    </span>
                  )}
                </div>
              )}
            </div>


            <div className="space-y-6 flex-1 mb-8">
              {/* Phân loại (Mùi hương) */}
              {product.variant_groups?.map((group) => (
                <div key={group.id} className="space-y-3">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest block">{group.name}</label>
                  <div className="flex flex-wrap gap-2.5">
                    {group.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionSelect(group.id, opt.id)}
                        className={`px-4 py-2 rounded text-xs font-medium transition-all duration-300 border ${selectedOptions[group.id] === opt.id
                            ? 'bg-[#FFF9F2] text-[#B45309] border-amber-200 shadow-sm'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Voucher Banner (if best coupon exists) */}
            {bestCoupon && (
              <div className="mb-6 bg-[#FFF9F2] border border-amber-200 rounded-lg p-3 flex items-start gap-3 shadow-sm">
                <div className="bg-[#F59E0B] text-white p-2 rounded flex-shrink-0">
                  <i className="ph-fill ph-ticket text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#D97706] uppercase tracking-wide flex items-center gap-2">
                    {bestCoupon.name}
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full border border-amber-200">
                      {bestCoupon.code}
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                    Giảm <span className="font-bold text-[#B45309]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bestCoupon.discountAmount)}
                    </span> được áp dụng tự động cho sản phẩm này.
                  </p>
                </div>
              </div>
            )}

            {/* Khối Actions: Số lượng & Thêm vào giỏ */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-dashed border-stone-300">
              <div className="flex items-center bg-white border border-stone-200 rounded p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  <i className="ph-bold ph-minus text-sm"></i>
                </button>
                <span className="w-12 text-center text-sm font-bold text-stone-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                >
                  <i className="ph-bold ph-plus text-sm"></i>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 border-2 border-[#4A2C2A] text-[#4A2C2A] hover:bg-stone-50 text-xs font-bold uppercase tracking-widest rounded py-4 px-2 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  {isAdding ? (
                    <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                  ) : (
                    <>
                      <i className="ph-bold ph-shopping-cart-simple text-base"></i>
                      Thêm vào giỏ
                    </>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isAdding}
                  className="flex-1 bg-[#4A2C2A] hover:bg-[#3A2221] text-white text-xs font-bold uppercase tracking-widest rounded py-4 px-2 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  <i className="ph-bold ph-tote text-base"></i>
                  Mua Ngay
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-dashed border-stone-200">
              <div className="flex items-center space-x-3">
                <i className="ph-fill ph-leaf text-xl text-stone-400"></i>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">100% Nguyên Liệu Tự Nhiên</span>
              </div>
              <div className="flex items-center space-x-3">
                <i className="ph-fill ph-fire text-xl text-stone-400"></i>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Đốt Không Khói Đen</span>
              </div>
            </div>

          </div>
        </div>

        {/* Tab Nội Dung Mở Rộng - Spans entire width with left padding matching thumbnails */}
        <div className="grid grid-cols-1 lg:grid-cols-12 mt-16">
          <div
            className="lg:col-span-12 w-full transition-all duration-300"
            style={{ paddingLeft: `${thumbOffset}px` }}
          >
            <div className="w-full">
              {/* Header Tabs */}
              <div className="flex border-b border-stone-200 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`shrink-0 px-6 py-3 text-xs font-bold tracking-wider uppercase transition-colors rounded-t-md ${activeTab === 'description'
                      ? 'bg-[#4A2C2A] text-white'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                    }`}
                >
                  Mô Tả Sản Phẩm
                </button>
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`shrink-0 px-6 py-3 text-xs font-bold tracking-wider uppercase transition-colors rounded-t-md ${activeTab === 'ingredients'
                      ? 'bg-[#4A2C2A] text-white'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                    }`}
                >
                  Thành Phần & Xuất Xứ
                </button>
                <button
                  onClick={() => setActiveTab('care')}
                  className={`px-6 py-3 text-xs font-bold tracking-wider uppercase transition-colors rounded-t-md ${activeTab === 'care'
                      ? 'bg-[#4A2C2A] text-white'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                    }`}
                >
                  Nghệ Thuật Chăm Sóc Nến
                </button>
              </div>

              {/* Nội Dung Tabs */}
              <div className="pt-10">
                {activeTab === 'description' ? (
                  <div className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <h2 className="font-serif-display text-3xl md:text-4xl text-[#4A2C2A] mb-6 leading-tight">
                      Câu Chuyện Mùi Hương
                    </h2>
                    <div className="prose prose-stone text-stone-600 max-w-none leading-relaxed text-[15px]">
                      {product.description ? (
                        <p className="whitespace-pre-line">{product.description}</p>
                      ) : (
                        <p className="italic text-stone-400">Một sản phẩm hương thơm thủ công tuyệt hảo, đem lại cảm giác thư giãn tuyệt đối cho không gian của bạn.</p>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'ingredients' ? (
                  <div className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <h2 className="font-serif-display text-3xl md:text-4xl text-[#4A2C2A] mb-6 leading-tight">
                      Thuần Khiết Từ Tự Nhiên, An Toàn Cho Không Gian Sống
                    </h2>
                    <p className="text-stone-600 leading-relaxed mb-8">
                      Tại Candlet, chúng tôi nói không với hóa chất công nghiệp và sáp khoáng paraffin phụ phẩm dầu mỏ. Từng hũ nến {product.name} được pha trộn từ {ingredientDetails?.waxSummary ? `${ingredientDetails.waxSummary.toLowerCase()} tự nhiên` : 'sáp tự nhiên'} cùng tinh dầu thực vật thượng hạng.
                    </p>
                    <ul className="space-y-6">
                      {ingredientDetails?.items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <i className="ph-bold ph-check-circle text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                          <p className="text-stone-600 leading-relaxed text-sm">
                            <strong className="text-stone-800">{item.title}:</strong> {item.desc}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <h2 className="font-serif-display text-3xl md:text-4xl text-[#4A2C2A] mb-6 leading-tight">
                      Bí Quyết Giữ Trọn Hương Thơm
                    </h2>
                    <ul className="space-y-6">
                      <li className="flex items-start">
                        <i className="ph-bold ph-fire text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                        <p className="text-stone-600 leading-relaxed text-sm">
                          <strong className="text-stone-800">Lần Đốt Đầu Tiên:</strong> Hãy để nến cháy đủ lâu (khoảng 2-3 giờ) cho đến khi sáp chảy lỏng đều khắp bề mặt. Điều này giúp tránh hiện tượng "thụt ngòi" (tunneling) cho những lần sau.
                        </p>
                      </li>
                      <li className="flex items-start">
                        <i className="ph-bold ph-scissors text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                        <p className="text-stone-600 leading-relaxed text-sm">
                          <strong className="text-stone-800">Cắt Bấc Nến:</strong> Luôn giữ bấc nến ở độ dài khoảng 0.5cm trước mỗi lần đốt. Bấc quá dài sẽ làm ngọn lửa cháy lớn, gây muội đen và hao sáp nhanh.
                        </p>
                      </li>
                      <li className="flex items-start">
                        <i className="ph-bold ph-wind text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                        <p className="text-stone-600 leading-relaxed text-sm">
                          <strong className="text-stone-800">Tắt Nến Đúng Cách:</strong> Đừng thổi tắt nến vì sẽ sinh ra khói đen ám mùi sáp cháy. Hãy dùng dụng cụ dìm bấc hoặc đậy nắp hũ nến lại để dập tắt ngọn lửa.
                        </p>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Phần Đánh Giá Sản Phẩm (Full width background) */}
      <div id="reviews-section">
        <ProductReviews productId={product._id} />
      </div>
    </div>
  );
}
