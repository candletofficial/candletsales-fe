import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopService } from '../../services/shopService';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import ProductReviews from '../../components/shop/ProductReviews';
import { resolveTagColor } from '../../utils/productTagUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { descriptionToHtml } from '../../utils/richText';

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

  // Shopee Variant Bottom Sheet State (Mobile)
  const [isVariantSheetOpen, setIsVariantSheetOpen] = useState(false);
  const [variantSheetAction, setVariantSheetAction] = useState('both'); // 'cart' | 'buy' | 'both'

  const openVariantSheet = (action = 'both') => {
    setVariantSheetAction(action);
    setIsVariantSheetOpen(true);
  };

  const closeVariantSheet = () => {
    setIsVariantSheetOpen(false);
  };

  // Khóa cuộn trang khi Bottom Sheet đang mở trên mobile
  useEffect(() => {
    if (isVariantSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVariantSheetOpen]);

  const thumbRef = useRef(null);
  const carouselRef = useRef(null);
  const mobileThumbRef = useRef(null);
  const [thumbOffset, setThumbOffset] = useState(0);

  // Danh sách toàn bộ ảnh sản phẩm
  const allImages = useMemo(() => {
    if (!product) return [];
    return [product.image, ...(product.images || [])].filter(Boolean);
  }, [product]);

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

  // Cuộn đến ảnh cụ thể trong carousel
  const scrollToImage = (img, index) => {
    setActiveImage(img);
    if (carouselRef.current) {
      const width = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
    }
  };

  // Xem ảnh trước đó
  const handlePrevImage = (e) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    const currentIndex = Math.max(0, allImages.indexOf(activeImage));
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    scrollToImage(allImages[prevIndex], prevIndex);
  };

  // Xem ảnh kế tiếp
  const handleNextImage = (e) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    const currentIndex = Math.max(0, allImages.indexOf(activeImage));
    const nextIndex = (currentIndex + 1) % allImages.length;
    scrollToImage(allImages[nextIndex], nextIndex);
  };

  // Lắng nghe thao tác vuốt / lướt của người dùng trên carousel
  const handleCarouselScroll = () => {
    if (!carouselRef.current || allImages.length === 0) return;
    const { scrollLeft, offsetWidth } = carouselRef.current;
    if (offsetWidth > 0) {
      const newIndex = Math.round(scrollLeft / offsetWidth);
      if (newIndex >= 0 && newIndex < allImages.length && allImages[newIndex] !== activeImage) {
        setActiveImage(allImages[newIndex]);
      }
    }
  };

  // Tự động cuộn thumbnail mobile vào giữa màn hình khi chuyển ảnh
  useEffect(() => {
    if (activeImage && mobileThumbRef.current) {
      const activeBtn = mobileThumbRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeImage]);

  // Giữ vị trí carousel khi thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      if (carouselRef.current && activeImage && allImages.length > 0) {
        const idx = allImages.indexOf(activeImage);
        if (idx !== -1) {
          carouselRef.current.scrollLeft = idx * carouselRef.current.offsetWidth;
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeImage, allImages]);

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

  const { addToCart, cartItemCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = async () => {
    if (!product) return;

    const selectedSku = currentSku();
    // Nếu có biến thể (skus) nhưng chưa chọn
    if (product.skus && product.skus.length > 0 && !selectedSku) {
      alert('Vui lòng chọn loại sản phẩm');
      return;
    }
    const available = selectedSku?.stock ?? product.stock;
    if (Number.isFinite(available) && (available <= 0 || quantity > available)) {
      alert(available <= 0 ? 'Phân loại này hiện đã hết hàng' : 'Số lượng bạn chọn hiện không khả dụng');
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
    const available = selectedSku?.stock ?? product.stock;
    if (Number.isFinite(available) && (available <= 0 || quantity > available)) {
      alert(available <= 0 ? 'Phân loại này hiện đã hết hàng' : 'Số lượng bạn chọn hiện không khả dụng');
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
  const availableStock = activeSku?.stock ?? product?.stock;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 bg-[#f9f9f9]">Không tìm thấy sản phẩm.</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-[calc(58px+env(safe-area-inset-bottom,0px))] md:pb-0 sm:bg-[#f9f9f9]">
      <div className="mx-auto max-w-7xl px-4 pt-0 sm:px-6 md:pt-8 lg:px-8">
        
        {/* Top Navigation & Breadcrumbs */}
        <div className="mb-8 hidden items-center justify-between md:flex">
          {/* Desktop & Tablet Breadcrumb */}
          <div className="flex items-center flex-wrap text-[11px] font-bold uppercase tracking-wider text-stone-400">
            <button onClick={() => navigate('/')} className="sm:hover:text-brand-burgundy transition-colors whitespace-nowrap cursor-pointer">
              TRANG CHỦ
            </button>
            <span className="mx-2 text-stone-300">/</span>
            <button onClick={() => navigate('/shop')} className="sm:hover:text-brand-burgundy transition-colors whitespace-nowrap cursor-pointer">
              CỬA HÀNG NẾN THƠM NGHỆ THUẬT
            </button>
            <span className="mx-2 text-stone-300">/</span>
            <span className="text-brand-charcoal truncate max-w-xs">{product.name}</span>
          </div>

        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-14">
          {/* Cột Trái: Image Gallery */}
          <div className="flex h-fit flex-col gap-3 sm:gap-4 md:flex-row-reverse lg:col-span-7">
            {/* Ảnh chính - Carousel Hỗ Trợ Vuốt / Lướt Chạm Mượt Mà */}
            <div className="group relative -mx-4 aspect-square w-[calc(100%+2rem)] select-none overflow-hidden bg-white sm:mx-0 sm:w-full sm:rounded-3xl sm:border sm:border-stone-200/80 sm:shadow-xs md:w-5/6">
              {product.tag && (
                <div
                  className="absolute left-3.5 top-3.5 z-20 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm pointer-events-none"
                  style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                >
                  {product.tag}
                </div>
              )}

              {/* Nút Yêu Thích nổi trên ảnh */}
              <button
                onClick={() => toggleWishlist(product, navigate)}
                className="absolute right-3 top-3 z-30 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/88 shadow-md backdrop-blur-md transition-all focus:outline-none sm:hover:scale-110 active:scale-90 md:right-4 md:top-4 md:size-10"
                title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Thêm vào danh sách yêu thích"}
              >
                <i className={`text-xl transition-colors ${isInWishlist(product._id)
                    ? 'ph-fill ph-heart text-rose-500'
                    : 'ph-bold ph-heart text-stone-400 sm:hover:text-rose-500'
                  }`}></i>
              </button>

              {/* Container Carousel Hỗ Trợ Lướt / Vuốt Tay Tự Nhiên (Native Touch Pan & Scroll Snap) */}
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x pan-y',
                  overscrollBehaviorX: 'contain',
                }}
              >
                {allImages.length > 0 ? (
                  allImages.map((img, index) => (
                    <div
                      key={`slide-${index}`}
                      className="w-full h-full shrink-0 snap-center relative flex items-center justify-center bg-stone-50"
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
                    <i className="ph ph-image text-4xl"></i>
                  </div>
                )}
              </div>

              {/* Nút Mũi Tên Chuyển Ảnh Trái / Phải */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2.5 top-1/2 z-20 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/82 text-stone-700 shadow-md backdrop-blur-md transition-all sm:hover:bg-white sm:hover:text-brand-burgundy active:scale-90 md:size-10"
                    aria-label="Xem ảnh trước"
                  >
                    <i className="ph-bold ph-caret-left text-base sm:text-lg"></i>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2.5 top-1/2 z-20 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/82 text-stone-700 shadow-md backdrop-blur-md transition-all sm:hover:bg-white sm:hover:text-brand-burgundy active:scale-90 md:size-10"
                    aria-label="Xem ảnh kế tiếp"
                  >
                    <i className="ph-bold ph-caret-right text-base sm:text-lg"></i>
                  </button>

                  {/* Dots Indicator ở đáy giữa ảnh */}
                  <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md md:flex">
                    {allImages.map((img, idx) => {
                      const isActive = allImages.indexOf(activeImage) === idx;
                      return (
                        <button
                          key={`dot-${idx}`}
                          type="button"
                          onClick={() => scrollToImage(img, idx)}
                          className={`transition-all duration-300 rounded-full cursor-pointer ${
                            isActive
                              ? 'w-5 h-1.5 bg-white shadow-xs'
                              : 'w-1.5 h-1.5 bg-white/50 sm:hover:bg-white/80'
                          }`}
                          aria-label={`Chuyển đến ảnh ${idx + 1}`}
                        />
                      );
                    })}
                  </div>

                  {/* Chỉ số ảnh trên Mobile (Ví dụ: 1/4) */}
                  <div className="md:hidden absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20 pointer-events-none">
                    {Math.max(0, allImages.indexOf(activeImage)) + 1}/{allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <>
                {/* Mobile: Horizontal Scroll Thumbnails với auto-scroll theo ảnh đang xem */}
                <div 
                  ref={mobileThumbRef}
                  className="hidden"
                >
                  {allImages.map((img, index) => {
                    const isSelected = activeImage === img;
                    return (
                      <button
                        key={`mob-${index}`}
                        data-active={isSelected ? "true" : "false"}
                        onClick={() => scrollToImage(img, index)}
                        className={`shrink-0 w-16 h-16 rounded-xl bg-white border-2 overflow-hidden transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-burgundy shadow-xs scale-102 ring-2 ring-brand-burgundy/15'
                            : 'border-stone-200/80 opacity-70 sm:hover:opacity-100'
                        }`}
                      >
                        <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`${product.name} ${index + 1}`} />
                      </button>
                    );
                  })}
                </div>

                {/* Desktop: Vertical Scroll matching main image height */}
                <div ref={thumbRef} className="hidden md:block w-1/6 relative">
                  <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                    {allImages.map((img, index) => {
                      const isSelected = activeImage === img;
                      return (
                        <button
                          key={`desk-${index}`}
                          onClick={() => scrollToImage(img, index)}
                          className={`shrink-0 w-full aspect-square rounded-xl bg-white border-2 overflow-hidden transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand-burgundy shadow-md scale-102 ring-2 ring-brand-burgundy/15'
                              : 'border-stone-200 opacity-60 sm:hover:opacity-100'
                          }`}
                        >
                          <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`${product.name} ${index + 1}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Cột Phải: Thông tin sản phẩm */}
          <section className="-mx-4 flex flex-col border-b-8 border-stone-100 px-4 pb-5 sm:mx-0 sm:border-b-0 sm:px-0 sm:pb-0 lg:col-span-5">
            {/* Category Pill */}
            {product.category && (
              <div className="mb-2">
                <span className="inline-block border-l-2 border-amber-600 pl-2 text-[10px] font-bold uppercase tracking-wider text-amber-800 sm:rounded-full sm:border sm:border-amber-200/60 sm:bg-amber-50 sm:px-2.5 sm:py-0.5 sm:text-xs">
                  {product.category}
                </span>
              </div>
            )}

            {/* Product Title */}
            <h1 className="font-serif-display text-2xl sm:text-3xl lg:text-4xl text-brand-charcoal leading-snug mb-2 font-normal">
              {product.name}
            </h1>

            {/* Rating & Reviews row */}
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
                className="text-xs text-[#B45309] font-semibold sm:hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{product.reviewCount || 0} đánh giá</span>
                <i className="ph-bold ph-arrow-down text-[10px]"></i>
              </a>
            </div>

            {/* Price Box */}
            <div className="mb-4 border-y border-stone-100 py-3 sm:mb-5 sm:rounded-2xl sm:border sm:border-stone-200/60 sm:bg-stone-50/80 sm:p-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#B45309]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
                </span>
                {(bestCoupon || (product.original_price && product.original_price > displayPrice)) && (
                  <span className="text-sm sm:text-base text-stone-400 line-through">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      product.original_price > basePrice ? product.original_price : basePrice
                    )}
                  </span>
                )}
                {product.original_price > displayPrice && (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                    Giảm {Math.round(((product.original_price - displayPrice) / product.original_price) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Mobile: Hàng chọn phân loại chuẩn Shopee (Bấm để mở Bottom Sheet) */}
            {product.variant_groups && product.variant_groups.length > 0 && (
              <div 
                onClick={() => openVariantSheet('both')}
                className="mb-4 flex cursor-pointer items-center justify-between border-b border-stone-100 px-0 pb-3 transition-colors active:bg-stone-50 md:hidden"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                    Phân loại
                  </span>
                  <span className="text-xs text-stone-800 font-medium truncate">
                    {product.variant_groups.map(g => {
                      const opt = g.options.find(o => o.id === selectedOptions[g.id]);
                      return opt?.label;
                    }).filter(Boolean).join(' • ') || 'Chọn Mùi hương, Đóng gói'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-stone-400 shrink-0">
                  <span className="text-[11px] text-[#B45309] font-bold">Chọn</span>
                  <i className="ph-bold ph-caret-right text-xs"></i>
                </div>
              </div>
            )}

            {/* Desktop: Variant Groups (Mùi hương, Kích thước) */}
            {product.variant_groups && product.variant_groups.length > 0 && (
              <div className="hidden md:block space-y-4 mb-6">
                {product.variant_groups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                        {group.name}
                      </label>
                      <span className="text-xs text-stone-500 font-medium">
                        Đang chọn: <span className="text-brand-burgundy font-bold">{group.options.find(o => o.id === selectedOptions[group.id])?.label || 'Chưa chọn'}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        const isSelected = selectedOptions[group.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleOptionSelect(group.id, opt.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-brand-burgundy text-white border-2 border-brand-burgundy shadow-xs'
                                : 'bg-white text-stone-700 border border-stone-200 sm:hover:border-stone-400'
                            }`}
                          >
                            {isSelected && <i className="ph-bold ph-check text-xs"></i>}
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Best Voucher Banner */}
            {bestCoupon && (
              <aside className="mb-5 flex items-start gap-3 border-y border-amber-200/80 bg-amber-50/50 py-3.5 sm:mb-6 sm:rounded-2xl sm:border sm:bg-gradient-to-r sm:from-[#FFF9F2] sm:to-amber-50/50 sm:p-3.5 sm:shadow-2xs">
                <div className="flex size-8 shrink-0 items-center justify-center text-amber-600 sm:size-9 sm:rounded-xl sm:bg-[#F59E0B] sm:text-white sm:shadow-xs">
                  <i className="ph-fill ph-ticket text-lg"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-brand-gold uppercase tracking-wide">
                      {bestCoupon.name}
                    </h4>
                    <span className="bg-amber-100 text-amber-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      {bestCoupon.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                    Giảm <span className="font-bold text-[#B45309]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bestCoupon.discountAmount)}
                    </span> được áp dụng tự động cho sản phẩm này.
                  </p>
                </div>
              </aside>
            )}

            {/* Action Box: Số lượng, Thêm vào giỏ & Mua ngay (Chỉ hiển thị trên Desktop; Mobile dùng Sticky Bar & Bottom Sheet chuẩn Shopee) */}
            <div className="hidden md:flex flex-col gap-4 pt-5 border-t border-stone-200">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Số lượng:</span>
                <div className="flex items-center bg-white border border-stone-200 rounded-xl p-0.5 shadow-2xs">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-stone-500 sm:hover:text-stone-800 sm:hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <i className="ph-bold ph-minus text-sm"></i>
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-stone-800">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-stone-500 sm:hover:text-stone-800 sm:hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <i className="ph-bold ph-plus text-sm"></i>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 border-2 border-brand-burgundy text-brand-burgundy bg-white sm:hover:bg-brand-burgundy/5 active:bg-brand-burgundy/10 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  {isAdding ? (
                    <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                  ) : (
                    <>
                      <i className="ph-bold ph-shopping-cart-simple text-base"></i>
                      <span>Thêm vào giỏ hàng</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isAdding}
                  className="flex-1 bg-brand-burgundy sm:hover:bg-[#3A2221] active:bg-[#2A1817] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  <i className="ph-bold ph-tote text-base"></i>
                  <span>Mua Ngay</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-5 grid grid-cols-2 gap-0 border-y border-dashed border-stone-200 py-3 sm:mt-6 sm:gap-3 sm:border-b-0 sm:pt-5">
              <div className="flex items-center space-x-2.5 border-r border-stone-200 px-1 py-1 sm:rounded-xl sm:border sm:border-stone-100 sm:bg-stone-50 sm:p-2">
                <i className="ph-fill ph-leaf text-lg text-emerald-600"></i>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600">100% Thuần Tự Nhiên</span>
              </div>
              <div className="flex items-center space-x-2.5 px-3 py-1 sm:rounded-xl sm:border sm:border-stone-100 sm:bg-stone-50 sm:p-2">
                <i className="ph-fill ph-fire text-lg text-amber-600"></i>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600">Đốt Không Khói Đen</span>
              </div>
            </div>

          </section>
        </div>

        {/* Tab Nội Dung Mở Rộng - Responsive & Mobile Friendly */}
        <section className="-mx-4 mt-0 border-t-8 border-stone-100 px-4 pt-5 sm:mx-0 sm:mt-16 sm:border-t-0 sm:px-0 sm:pt-0">
          <div
            className="w-full transition-all duration-300"
            style={{ paddingLeft: `${thumbOffset}px` }}
          >
            <div className="w-full">
              {/* Header Tabs - Horizontal scrollable pills */}
              <div className="scrollbar-none flex gap-5 overflow-x-auto border-b border-stone-200 sm:gap-2 sm:pb-1">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`shrink-0 cursor-pointer border-b-2 px-0 py-3 text-[11px] font-bold uppercase tracking-wider transition-all sm:rounded-t-xl sm:border-b-0 sm:px-6 sm:text-xs ${activeTab === 'description'
                      ? 'border-brand-burgundy text-brand-burgundy sm:bg-brand-burgundy sm:text-white sm:shadow-xs'
                      : 'border-transparent text-stone-500 sm:hover:text-stone-800 sm:hover:bg-stone-100'
                    }`}
                >
                  Mô Tả Sản Phẩm
                </button>
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`shrink-0 cursor-pointer border-b-2 px-0 py-3 text-[11px] font-bold uppercase tracking-wider transition-all sm:rounded-t-xl sm:border-b-0 sm:px-6 sm:text-xs ${activeTab === 'ingredients'
                      ? 'border-brand-burgundy text-brand-burgundy sm:bg-brand-burgundy sm:text-white sm:shadow-xs'
                      : 'border-transparent text-stone-500 sm:hover:text-stone-800 sm:hover:bg-stone-100'
                    }`}
                >
                  Thành Phần & Xuất Xứ
                </button>
                <button
                  onClick={() => setActiveTab('care')}
                  className={`shrink-0 cursor-pointer border-b-2 px-0 py-3 text-[11px] font-bold uppercase tracking-wider transition-all sm:rounded-t-xl sm:border-b-0 sm:px-6 sm:text-xs ${activeTab === 'care'
                      ? 'border-brand-burgundy text-brand-burgundy sm:bg-brand-burgundy sm:text-white sm:shadow-xs'
                      : 'border-transparent text-stone-500 sm:hover:text-stone-800 sm:hover:bg-stone-100'
                    }`}
                >
                  Nghệ Thuật Chăm Sóc Nến
                </button>
              </div>

              {/* Nội Dung Tabs */}
              <div className="bg-transparent px-0 py-6 sm:rounded-b-2xl sm:border-x sm:border-b sm:border-stone-200/80 sm:bg-white sm:p-8 sm:shadow-2xs">
                {activeTab === 'description' ? (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="font-serif-display text-2xl sm:text-3xl text-brand-burgundy mb-4 leading-tight">
                      Câu Chuyện Mùi Hương
                    </h2>
                    <div className="prose prose-stone text-stone-600 max-w-none leading-relaxed text-sm sm:text-[15px]">
                      {product.description ? (
                        <div className="product-rich-description" dangerouslySetInnerHTML={{ __html: descriptionToHtml(product.description) }} />
                      ) : (
                        <p className="italic text-stone-400">Một sản phẩm hương thơm thủ công tuyệt hảo, đem lại cảm giác thư giãn tuyệt đối cho không gian của bạn.</p>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'ingredients' ? (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="font-serif-display text-2xl sm:text-3xl text-brand-burgundy mb-4 leading-tight">
                      Thuần Khiết Từ Tự Nhiên, An Toàn Cho Không Gian Sống
                    </h2>
                    <p className="text-stone-600 leading-relaxed mb-6 text-sm">
                      Tại Candlet, chúng tôi nói không với hóa chất công nghiệp và sáp khoáng paraffin phụ phẩm dầu mỏ. Từng hũ nến {product.name} được pha trộn từ {ingredientDetails?.waxSummary ? `${ingredientDetails.waxSummary.toLowerCase()} tự nhiên` : 'sáp tự nhiên'} cùng tinh dầu thực vật thượng hạng.
                    </p>
                    <div className="divide-y divide-stone-200 md:grid md:grid-cols-2 md:gap-4 md:divide-y-0">
                      {ingredientDetails?.items.map((item, idx) => (
                        <div key={idx} className="flex items-start py-4 md:rounded-xl md:border md:border-stone-200/70 md:bg-stone-50 md:p-3.5">
                          <i className="ph-bold ph-check-circle text-[#B45309] text-lg mr-2.5 mt-0.5 shrink-0"></i>
                          <div>
                            <strong className="text-stone-800 text-xs sm:text-sm block mb-1">{item.title}</strong>
                            <p className="text-stone-600 leading-relaxed text-xs">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="font-serif-display text-2xl sm:text-3xl text-brand-burgundy mb-4 leading-tight">
                      Bí Quyết Giữ Trọn Hương Thơm
                    </h2>
                    <div className="divide-y divide-stone-200 md:space-y-4 md:divide-y-0">
                      <div className="flex items-start py-4 md:rounded-xl md:border md:border-stone-200/70 md:bg-stone-50 md:p-3.5">
                        <i className="ph-bold ph-fire text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                        <div>
                          <strong className="text-stone-800 text-xs sm:text-sm block mb-1">Lần Đốt Đầu Tiên</strong>
                          <p className="text-stone-600 leading-relaxed text-xs">
                            Hãy để nến cháy đủ lâu (khoảng 2-3 giờ) cho đến khi sáp chảy lỏng đều khắp bề mặt. Điều này giúp tránh hiện tượng "thụt ngòi" (tunneling) cho những lần sau.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start py-4 md:rounded-xl md:border md:border-stone-200/70 md:bg-stone-50 md:p-3.5">
                        <i className="ph-bold ph-scissors text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                        <div>
                          <strong className="text-stone-800 text-xs sm:text-sm block mb-1">Cắt Bấc Nến</strong>
                          <p className="text-stone-600 leading-relaxed text-xs">
                            Luôn giữ bấc nến ở độ dài khoảng 0.5cm trước mỗi lần đốt. Bấc quá dài sẽ làm ngọn lửa cháy lớn, gây muội đen và hao sáp nhanh.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start py-4 md:rounded-xl md:border md:border-stone-200/70 md:bg-stone-50 md:p-3.5">
                        <i className="ph-bold ph-wind text-[#B45309] text-xl mr-3 mt-0.5 shrink-0"></i>
                        <div>
                          <strong className="text-stone-800 text-xs sm:text-sm block mb-1">Tắt Nến Đúng Cách</strong>
                          <p className="text-stone-600 leading-relaxed text-xs">
                            Đừng thổi tắt nến vì sẽ sinh ra khói đen ám mùi sáp cháy. Hãy dùng dụng cụ dìm bấc hoặc đậy nắp hũ nến lại để dập tắt ngọn lửa.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Phần Đánh Giá Sản Phẩm (Full width background) */}
      <div id="reviews-section">
        <ProductReviews productId={product._id} />
      </div>

      {/* SHOPEE-STYLE MOBILE STICKY BOTTOM ACTION BAR (Chuẩn trải nghiệm Shopee trên Mobile) */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 isolate flex min-h-[58px] items-stretch border-t border-stone-200/90 bg-white shadow-[0_-4px_25px_rgba(0,0,0,0.12)] md:hidden"
        style={{
          height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* 1. Nút Yêu thích (Wishlist) */}
        <button
          onClick={() => toggleWishlist(product, navigate)}
          className="flex flex-col items-center justify-center w-14 shrink-0 text-stone-600 sm:hover:text-rose-500 border-r border-stone-100 active:bg-stone-50 transition-colors cursor-pointer"
          title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Yêu thích"}
        >
          <i className={`text-xl ${isInWishlist(product._id) ? 'ph-fill ph-heart text-rose-500' : 'ph ph-heart'}`}></i>
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Yêu thích</span>
        </button>

        {/* 2. Nút Giỏ hàng (Có badge số lượng & Link trực tiếp tới /cart) */}
        <button
          onClick={() => navigate('/cart')}
          className="flex flex-col items-center justify-center w-14 shrink-0 text-stone-600 sm:hover:text-brand-burgundy border-r border-stone-100 active:bg-stone-50 transition-colors cursor-pointer relative"
          title="Xem giỏ hàng"
        >
          <div className="relative">
            <i className="ph ph-shopping-bag-open text-xl"></i>
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] bg-[#B45309] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white px-0.5 shadow-2xs">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Giỏ hàng</span>
        </button>

        {/* 3. Nút "Thêm vào giỏ" phong cách Shopee (Mở Bottom Sheet chọn phân loại) */}
        <button
          onClick={() => openVariantSheet('cart')}
          disabled={isAdding}
          className="flex-1 bg-[#FFF5EC] active:bg-[#FFEAD6] text-[#B45309] flex flex-col items-center justify-center transition-colors disabled:opacity-60 cursor-pointer px-1 text-center"
        >
          {isAdding ? (
            <i className="ph-bold ph-spinner animate-spin text-base text-[#B45309]"></i>
          ) : (
            <>
              <i className="ph-bold ph-shopping-cart-simple text-base mb-0.5"></i>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-tight">Thêm Vào Giỏ</span>
            </>
          )}
        </button>

        {/* 4. Nút "Mua Ngay" phong cách Shopee (Mở Bottom Sheet chọn phân loại) */}
        <button
          onClick={() => openVariantSheet('buy')}
          disabled={isAdding}
          className="flex-1 bg-gradient-to-r from-[#94432C] to-brand-burgundy active:from-[#7D3824] active:to-[#38201F] text-white flex flex-col items-center justify-center transition-all disabled:opacity-60 cursor-pointer px-1 text-center shadow-inner"
        >
          <span className="text-xs font-bold uppercase tracking-wider">Mua Ngay</span>
          <span className="text-[10px] text-amber-200/90 font-medium leading-none mt-0.5">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SHOPEE VARIATION SELECTOR BOTTOM SHEET (MOBILE)           */}
      {/* Trượt từ mép đáy lên để chọn mùi hương, quy cách & số lượng */}
      {/* ======================================================== */}
      {isVariantSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop tối nền mờ */}
          <div 
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-[fadeIn_0.2s_ease-out]"
            onClick={closeVariantSheet}
          />

          {/* Sheet Drawer chính */}
          <div 
            className="relative z-10 w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* 1. Header Sheet: Ảnh đại diện + Giá + Đang chọn + Nút X */}
            <div className="p-4 border-b border-stone-100 flex items-start gap-3.5 relative bg-white">
              <div className="w-20 h-20 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 shadow-2xs">
                <img 
                  src={getImageUrl(activeImage || product.image)} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-extrabold text-[#B45309]">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
                  </span>
                  {bestCoupon && (
                    <span className="text-xs text-stone-400 line-through">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(basePrice)}
                    </span>
                  )}
                </div>
                
                <p className="text-[11px] text-stone-600 font-medium truncate mt-0.5">
                  Đã chọn: <span className="text-brand-burgundy font-bold">
                    {product.variant_groups?.map(g => {
                      const opt = g.options.find(o => o.id === selectedOptions[g.id]);
                      return opt?.label;
                    }).filter(Boolean).join(', ') || 'Tiêu chuẩn'}
                  </span>
                </p>
              </div>

              {/* Nút đóng X */}
              <button 
                type="button"
                onClick={closeVariantSheet}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-stone-100 sm:hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              >
                <i className="ph-bold ph-x text-base"></i>
              </button>
            </div>

            {/* 2. Scrollable Body: Danh sách phân loại (Mùi hương, Đóng gói) & Bộ chọn số lượng */}
            <div className="p-4 overflow-y-auto space-y-4.5 custom-scrollbar flex-1 max-h-[50vh]">
              {product.variant_groups && product.variant_groups.map((group) => (
                <div key={`sheet-${group.id}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      {group.name}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Đang chọn: <strong className="text-brand-burgundy">{group.options.find(o => o.id === selectedOptions[group.id])?.label || 'Chưa chọn'}</strong>
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedOptions[group.id] === opt.id;
                      return (
                        <button
                          key={`sheet-opt-${opt.id}`}
                          type="button"
                          onClick={() => handleOptionSelect(group.id, opt.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-brand-burgundy text-white border-2 border-brand-burgundy shadow-2xs'
                              : 'bg-stone-50 text-stone-700 border border-stone-200/90 sm:hover:border-stone-400'
                          }`}
                        >
                          {isSelected && <i className="ph-bold ph-check text-xs"></i>}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Bộ chọn số lượng */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Số lượng
                </span>

                <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 flex items-center justify-center text-stone-500 sm:hover:text-stone-800 rounded-lg active:bg-stone-200 transition-colors cursor-pointer"
                  >
                    <i className="ph-bold ph-minus text-xs"></i>
                  </button>
                  <span className="w-10 text-center text-xs font-bold text-stone-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Number.isFinite(availableStock) ? Math.min(Math.max(1, availableStock), q + 1) : q + 1)}
                    disabled={availableStock === 0 || (Number.isFinite(availableStock) && quantity >= availableStock)}
                    className="w-8 h-8 flex items-center justify-center text-stone-500 sm:hover:text-stone-800 rounded-lg active:bg-stone-200 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <i className="ph-bold ph-plus text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Nút hành động ở chân Bottom Sheet */}
            <div className="p-3.5 border-t border-stone-100 bg-white">
              {variantSheetAction === 'cart' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleAddToCart();
                    closeVariantSheet();
                  }}
                  disabled={isAdding}
                  className="w-full bg-brand-burgundy active:bg-[#341F1D] text-white text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isAdding ? (
                    <i className="ph-bold ph-spinner animate-spin text-base"></i>
                  ) : (
                    <>
                      <i className="ph-bold ph-shopping-cart-simple text-base"></i>
                      <span>Thêm Vào Giỏ Hàng</span>
                    </>
                  )}
                </button>
              ) : variantSheetAction === 'buy' ? (
                <button
                  type="button"
                  onClick={() => {
                    closeVariantSheet();
                    handleBuyNow();
                  }}
                  className="w-full bg-gradient-to-r from-[#94432C] to-brand-burgundy active:from-[#7D3824] active:to-[#38201F] text-white text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <i className="ph-bold ph-tote text-base"></i>
                  <span>Mua Ngay ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice * quantity)})</span>
                </button>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleAddToCart();
                      closeVariantSheet();
                    }}
                    disabled={isAdding}
                    className="flex-1 bg-[#FFF5EC] active:bg-[#FFEAD6] text-[#B45309] text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#B45309]/20"
                  >
                    <i className="ph-bold ph-shopping-cart-simple text-sm"></i>
                    <span>Thêm Vào Giỏ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeVariantSheet();
                      handleBuyNow();
                    }}
                    className="flex-1 bg-gradient-to-r from-[#94432C] to-brand-burgundy active:from-[#7D3824] active:to-[#38201F] text-white text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 px-2 flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <i className="ph-bold ph-tote text-sm"></i>
                    <span>Mua Ngay</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
