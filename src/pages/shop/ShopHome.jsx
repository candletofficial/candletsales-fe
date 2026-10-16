import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { shopService } from '../../services/shopService';
import NewsletterCanvas from '../../components/NewsletterCanvas';
import { resolveTagColor } from '../../utils/productTagUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { shippingDiscountLabel, shippingDiscountConditions } from '../../utils/couponUtils';

export default function ShopHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCardIdx, setHoveredCardIdx] = useState(null);
  const [copiedCouponId, setCopiedCouponId] = useState(null);
  const [activeMobileCoupon, setActiveMobileCoupon] = useState(0);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, couponRes] = await Promise.allSettled([
          shopService.getProducts(),
          shopService.getActiveCoupons(user?._id)
        ]);

        if (prodRes.status === 'fulfilled') {
          const data = prodRes.value;
          if (data && data.data) {
            setProducts(data.data);
          } else if (Array.isArray(data)) {
            setProducts(data);
          }
        }

        if (couponRes.status === 'fulfilled') {
          const cData = couponRes.value;
          if (cData && cData.data && Array.isArray(cData.data)) {
            setCoupons(cData.data);
          } else if (Array.isArray(cData)) {
            setCoupons(cData);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?._id]);

  // Observer để kích hoạt animation trượt mượt mà (scroll reveal) khi cuộn trang
  useEffect(() => {
    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.08,
      rootMargin: '0px 0px -20px 0px',
    });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [products, coupons, loading]);

  const handleCopyCoupon = (code, id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCouponId(id);
    setTimeout(() => {
      setCopiedCouponId((prev) => (prev === id ? null : prev));
    }, 2200);
  };

  const handleBuyNow = (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultSkuId = (product.skus && product.skus.length > 0) ? product.skus[0].id : undefined;

    const buyItem = {
      product_id: product,
      sku_id: defaultSkuId,
      quantity: 1
    };

    navigate('/checkout', { state: { selectedItems: [buyItem] } });
  };
  const submitNewsletter = (e) => {
    e.preventDefault();
    alert('Cảm ơn bạn đã đăng ký! Mã giảm giá 15% đã được gửi đến email của bạn.');
    e.target.reset();
  };

  const formatCouponValue = (coupon) => {
    if (!coupon) return '';
    if (coupon.type === 'freeship') return shippingDiscountLabel(coupon).toUpperCase();
    if (coupon.type === 'percent') {
      return `GIẢM ${coupon.value}%`;
    }
    return `GIẢM ${new Intl.NumberFormat('vi-VN').format(coupon.value)}đ`;
  };

  const formatCouponDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Chuẩn bị danh sách hiển thị tối đa 2 voucher thực tế từ cửa hàng
  const displayCoupons = (() => {
    const list = [...coupons];
    list.sort((a, b) => (b.type === 'percent' ? 1 : 0) - (a.type === 'percent' ? 1 : 0));

    if (list.length >= 2) return list.slice(0, 2);
    if (list.length === 1) return list;
    return [
      {
        _id: 'sample-1',
        code: 'CANDLELOVE10',
        name: 'Ưu Đãi Người Mới',
        type: 'percent',
        value: 10,
        max_discount: 30000,
        end_date: '2026-10-09T10:00:00.000Z',
        special_condition: 'Áp dụng mọi dòng nến thơm'
      },
      {
        _id: 'sample-2',
        code: 'WINTER2026',
        name: 'Giảm Giá Mùa Đông',
        type: 'fixed',
        value: 10000,
        end_date: '2026-10-09T03:00:00.000Z',
        special_condition: 'Độc quyền đơn hàng website'
      }
    ];
  })();

  const primaryCoupon = displayCoupons[0];
  const secondaryCoupon = displayCoupons[1] || displayCoupons[0];

  return (
    <>
      {/* BEGIN: HeroSection */}
      <section className="border-b border-dashed dashed-grid-border bg-[#f9f9f9]" data-purpose="editorial-hero" id="home">
        {/* MOBILE HERO (Thiết kế tối ưu hóa riêng biệt cho màn hình nhỏ < 1024px) */}
        <div className="lg:hidden p-4 sm:p-6 flex flex-col gap-4">
          {/* Top Mini Pill & Rating */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-900 text-[10.5px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
              Nến Thơm Thủ Công Cao Cấp
            </span>
            <div className="flex items-center text-xs space-x-1 font-bold text-brand-charcoal bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-stone-200/80 shadow-2xs shrink-0">
              <span>4.9</span>
              <i className="ph-fill ph-star text-amber-500"></i>
              <span className="text-[10px] text-stone-500 font-normal">(1.2k+)</span>
            </div>
          </div>

          {/* Mobile Main Visual Banner with rounded frame and glowing effect */}
          <div className="relative rounded-2xl overflow-hidden shadow-md border border-stone-200/80 bg-stone-100 group">
            <img
              alt="Bộ sưu tập nến thơm thủ công Candlet"
              className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-102"
              src="/hero-banner.png"
            />
            {/* Overlay Gradient at Bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                ✦ 100% Sáp Thực Vật
              </span>
              <span className="bg-amber-400 text-stone-950 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                Thông Điệp Ẩn
              </span>
            </div>
          </div>

          {/* Mobile Narrative & Headline */}
          <div className="text-center pt-1">
            <h1 className="font-serif-display text-3xl sm:text-4xl text-brand-charcoal leading-[1.18] font-normal mb-2">
              Khoảnh khắc an yên<br />
              <span className="italic font-light text-brand-burgundy">trong từng nhịp thở</span>
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-normal">
              Chế tác từ 100% sáp thực vật hữu cơ cùng tinh dầu trị liệu nguyên chất. Từng ngọn nến ôm ấp thông điệp bí mật dần hé lộ theo từng nhịp nến tan chảy.
            </p>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <a
              href="#collection"
              className="w-full py-3.5 px-6 rounded-full bg-brand-charcoal text-white hover:bg-black text-xs font-bold uppercase tracking-widest text-center transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 btn-shimmer"
            >
              <span>Khám Phá Bộ Sưu Tập</span>
              <i className="ph-bold ph-arrow-right text-xs"></i>
            </a>
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-stone-600 pt-1">
              <a href="#special-offers" className="hover:text-amber-800 flex items-center gap-1">
                <i className="ph-fill ph-ticket text-amber-600"></i>
                <span>Voucher giảm giá</span>
              </a>
              <span className="text-stone-300">•</span>
              <a href="#story" className="hover:text-amber-800 flex items-center gap-1">
                <i className="ph-fill ph-heart text-rose-600"></i>
                <span>Câu chuyện Candlet</span>
              </a>
            </div>
          </div>

          {/* Mobile 3 Core Values (Compact Touch Cards) */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2.5 rounded-xl bg-white/90 border border-stone-200/80 shadow-2xs flex flex-col items-center">
              <i className="ph-fill ph-flame text-xl text-amber-600 mb-1"></i>
              <span className="text-[11px] font-bold text-brand-charcoal leading-tight">Hương Cuốn Hút</span>
              <span className="text-[9.5px] text-stone-500 mt-0.5">Tinh dầu trị liệu</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/90 border border-stone-200/80 shadow-2xs flex flex-col items-center">
              <i className="ph-fill ph-shield-check text-xl text-emerald-600 mb-1"></i>
              <span className="text-[11px] font-bold text-brand-charcoal leading-tight">0% Muội Than</span>
              <span className="text-[9.5px] text-stone-500 mt-0.5">Không khói độc</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/90 border border-stone-200/80 shadow-2xs flex flex-col items-center">
              <i className="ph-fill ph-envelope-open text-xl text-rose-600 mb-1"></i>
              <span className="text-[11px] font-bold text-brand-charcoal leading-tight">Lời Nhắn Ẩn</span>
              <span className="text-[9.5px] text-stone-500 mt-0.5">Quà tặng xúc cảm</span>
            </div>
          </div>
        </div>

        {/* DESKTOP HERO (Giữ nguyên cấu trúc Editorial thanh lịch cho màn hình lớn) */}
        <div className="hidden lg:grid max-w-7xl mx-auto grid-cols-12 min-h-[640px]">
          {/* Hero Left Column */}
          <div className="lg:col-span-4 border-r border-dashed dashed-grid-border flex flex-col p-10">

            {/* Top Mini Promo Card */}
            <div className="pb-8 border-b border-dashed dashed-grid-border">
              <div className="flex items-center space-x-4">
                <div className="relative h-28 sm:h-32 flex-shrink-0 group flex items-center justify-center">
                  {/* Soft Background Glow with Breathing Animation */}
                  <div className="absolute inset-1 bg-amber-500/25 rounded-full blur-xl scale-125 animate-pulse-glow pointer-events-none"></div>
                  <img
                    alt="Mini Promo"
                    className="relative w-auto h-full object-contain transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-105 z-10 drop-shadow-md"
                    src="/banner-nho.png"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-brand-charcoal leading-snug">
                    Thắp sáng không gian sống bằng nghệ thuật hương thơm.
                  </p>
                  <a
                    className="inline-flex items-center text-[11px] font-bold text-stone-500 hover:text-brand-burgundy mt-2 transition-colors uppercase tracking-wider group"
                    href="#collection"
                  >
                    <span>Sở Hữu Ngay</span>
                    <i className="ph ph-arrow-right ml-1 text-sm transition-transform duration-300 group-hover:translate-x-1"></i>
                  </a>
                  {/* Avatars & Rating Score */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2 overflow-hidden">
                      <img alt="Khách hàng" className="inline-block h-6 w-6 rounded-full ring-2 ring-[#f9f9f9] object-cover hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCc7nFY_CgHNNkx49ODLx1LVbeVRkdbJi3Gf1ReF5B9_LBEWqJgCwU37UHyfeXadz1PAMrUQPQaTA2STlbhnqp3KXJu6LGE11jzHzX6P-KrcoGOlzTdE3ZRzkHqkuOgUxGA3KjulKQpdzAYmKXZAn-9ey3blh0WpoVi3U4LyKhKsFokxKGvWROTLQ1sLdRYOCD_s_LYMNs2Y6C-Rahu7go1NszvDol0HRQbJWZATw7u7mEIAnzNTJbEig" />
                      <img alt="Khách hàng" className="inline-block h-6 w-6 rounded-full ring-2 ring-[#f9f9f9] object-cover hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9McRw5tXWNfB_G5BUhWZq-tJeevRcogl57irvu3h2BzLUXRqCecIMajg-p-_UuvoRLDCelwLUublKk8mWKTpNsEKu3EA7DepSvlAjoNEhCud1ze0nMZk-30C2X9kIiaTgWCQRkpq1AJcAvgba8a_ndOKK7oC6T7jRhXuIOesPXVxY1Ift9UAn6T3t6OgNPS4kYrCZ4jyuLJXxA7N5mN-YWhaDW9CfmcqoXTyeVxkBCfHQxwSdAL5b7w" />
                      <img alt="Khách hàng" className="inline-block h-6 w-6 rounded-full ring-2 ring-[#f9f9f9] object-cover hover:scale-110 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoWdYjYTfNhBmx8ZyZsj0_sFFY8HZpNC8F0MD1K9zlIcAoLY5BWfrz9P4g2SsJrNLyKpqVVnqtjJ57hp7ueV_1ExKaAurV-uCaTBjuLu3iDAZ_LqncUj1K1VQPn5Tkl-fAqFDYseKn3VeUMJt9HdM6ELPXgl-pEJrSf02cYBUelcXLGYC4mqDXwNppM7Q6DB62Eq1Rj13ZUhuRl4o5NpbxsVhFLCbxHgNZixtcd2Jlc4_k49YnoVHxCw" />
                    </div>
                    <div className="flex items-center text-xs space-x-1">
                      <span className="font-bold text-brand-charcoal">4.9</span>
                      <i className="ph-fill ph-star text-amber-500"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Value Narrative */}
            <div className="py-8 border-b border-dashed dashed-grid-border">
              <p className="text-stone-700 text-xs leading-relaxed font-mono font-medium">
                Những thiết kế cuốn hút và tinh tế, kết hợp cùng nguyên liệu tự nhiên cao cấp an toàn tuyệt đối, là cách hoàn hảo để gợi mở không gian chánh niệm thư thái.
              </p>
              <div className="mt-8">
                <a
                  className="inline-flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-black px-12 py-3.5 text-xs font-mono font-semibold tracking-wide transition-all duration-300 relative group btn-shimmer shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  href="#collection"
                >
                  <div className="absolute inset-0 border-[3px] border-dotted border-[#f9f9f9] m-1 pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity"></div>
                  Mua Ngay
                </a>
              </div>
            </div>

            {/* Bottom 3 Pillars Icons */}
            <div className="pt-8 grid grid-cols-3 gap-2 text-center mt-auto">
              <div className="flex flex-col items-center group cursor-default p-2 rounded-xl hover:bg-white/80 transition-all duration-300 hover:-translate-y-1">
                <i className="ph-light ph-flame text-4xl text-brand-charcoal mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:text-amber-600 animate-flame-flicker"></i>
                <span className="text-xs font-mono font-semibold text-brand-charcoal group-hover:text-amber-900 transition-colors">Hương Cuốn Hút</span>
              </div>
              <div className="flex flex-col items-center group cursor-default p-2 rounded-xl hover:bg-white/80 transition-all duration-300 hover:-translate-y-1">
                <i className="ph-light ph-flask text-4xl text-brand-charcoal mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:text-emerald-700"></i>
                <span className="text-xs font-mono font-semibold text-brand-charcoal group-hover:text-emerald-900 transition-colors">Không Khói Độc</span>
              </div>
              <div className="flex flex-col items-center group cursor-default p-2 rounded-xl hover:bg-white/80 transition-all duration-300 hover:-translate-y-1">
                <i className="ph-light ph-plant text-4xl text-brand-charcoal mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:text-teal-700"></i>
                <span className="text-xs font-mono font-semibold text-brand-charcoal group-hover:text-teal-900 transition-colors">Sáp Hữu Cơ</span>
              </div>
            </div>
          </div>

          {/* Hero Right Column */}
          <div className="lg:col-span-8 flex overflow-hidden group">
            <img
              alt="Banner Candlet"
              className="w-full h-auto object-contain transition-transform duration-700 ease-out group-hover:scale-[1.01]"
              src="/hero-banner.png"
            />
          </div>
        </div>
      </section>

      {/* BEGIN: MindfulnessFeaturesSection */}
      <section className="py-12 sm:py-24 border-b border-dashed dashed-grid-border bg-[#FAF7F2] relative overflow-hidden" data-purpose="mindfulness-philosophy">
        {/* Subtle background ambient blur for organic artisan warmth */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-amber-200/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-rose-200/15 blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 relative z-10">
          {/* Editorial Asymmetric Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-10 sm:mb-16">
            <div className="lg:col-span-7 reveal-on-scroll">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/60 border border-stone-300/60 mb-3 sm:mb-5 text-[10.5px] sm:text-[11px] font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                Triết Lý Nến Thơm & Chánh Niệm
              </div>
              <h2 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl text-brand-charcoal tracking-tight font-normal leading-[1.15]">
                Khoảnh khắc chánh niệm<br />
                <span className="italic font-light text-stone-600">trong từng nhịp thở</span>
              </h2>
            </div>

            <div className="lg:col-span-5 reveal-on-scroll reveal-delay-200 lg:pb-2">
              <p className="text-stone-600 text-xs sm:text-base leading-relaxed mb-4 sm:mb-6 font-normal">
                Mỗi ngọn nến thủ công tại Candlet không đơn thuần chỉ để thắp sáng, mà là một chiếc neo tĩnh lặng kéo bạn về với hiện tại — vỗ về tâm trí bằng hương thơm trị liệu và thông điệp ẩn giấu sâu lắng.
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="#story"
                  className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-widest uppercase text-brand-burgundy hover:text-amber-900 transition-colors pb-1 border-b-2 border-brand-burgundy/30 hover:border-amber-900"
                >
                  <span>Khám phá câu chuyện Candlet</span>
                  <i className="ph-bold ph-arrow-right text-sm transition-transform duration-300 group-hover:translate-x-1.5"></i>
                </a>
              </div>
            </div>
          </div>

          {/* Asymmetric Bento Layout (1 Hero Feature Card + 2 Stacked Specialty Cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-stretch">
            {/* Card 01: Hero Feature Spotlight (Pure Botanical Wax & Aromatherapy) */}
            <div className="lg:col-span-7 relative flex flex-col justify-between p-5 pb-7 sm:p-12 sm:pb-12 rounded-2xl sm:rounded-3xl bg-white/85 backdrop-blur-xs border border-stone-200/80 hover:border-emerald-600/40 card-hover-lift group reveal-on-scroll reveal-delay-100 overflow-hidden shadow-xs">
              {/* Background Artful Number Watermark */}
              <span className="absolute -top-3 right-3 font-serif-display text-6xl sm:text-9xl font-light text-stone-200/50 select-none group-hover:text-emerald-950/10 transition-colors pointer-events-none">
                01
              </span>

              <div>
                {/* Header Badge */}
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-800 transition-all duration-400 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:-rotate-3">
                    <i className="ph-duotone ph-leaf text-xl sm:text-2xl"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-800 font-semibold block">
                      Cam Kết Nguồn Gốc
                    </span>
                    <h3 className="font-serif-display text-xl sm:text-3xl font-bold text-brand-charcoal group-hover:text-emerald-950 transition-colors">
                      Nguyên Liệu Thuần Khiết
                    </h3>
                  </div>
                </div>

                {/* Body Paragraph */}
                <p className="text-stone-600 text-xs sm:text-base leading-relaxed mb-6 sm:mb-8 max-w-xl">
                  Sử dụng 100% sáp cọ và sáp đậu nành hữu cơ tự nhiên, hòa quyện cùng tinh dầu thiên nhiên cao cấp tuyển chọn. Ngọn lửa cháy đều êm ái, hoàn toàn không sinh khói đen độc hại và giữ trọn vẹn đặc tính trị liệu của mùi hương.
                </p>
              </div>

              {/* Artisan Material Specs Grid */}
              <div className="pt-4 sm:pt-6 border-t border-stone-200/70 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-center sm:text-left">
                  <span className="text-[10px] sm:text-[11px] font-mono text-stone-500 uppercase block">Sáp Nến</span>
                  <span className="text-[11px] sm:text-sm font-semibold text-brand-charcoal block mt-0.5">100% Sáp Cây</span>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-center sm:text-left">
                  <span className="text-[10px] sm:text-[11px] font-mono text-stone-500 uppercase block">Bấc Nến</span>
                  <span className="text-[11px] sm:text-sm font-semibold text-brand-charcoal block mt-0.5">Cotton Sạch</span>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-center sm:text-left">
                  <span className="text-[10px] sm:text-[11px] font-mono text-stone-500 uppercase block">Khói Độc</span>
                  <span className="text-[11px] sm:text-sm font-semibold text-emerald-800 block mt-0.5">0% Muội Than</span>
                </div>
              </div>
            </div>

            {/* Right Column: 2 Stacked Cards */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-8">
              {/* Card 02: Multi-layer Scent Symphony */}
              <div className="relative flex-1 p-5 pb-8 sm:p-8 sm:pb-9 rounded-2xl sm:rounded-3xl bg-white/85 backdrop-blur-xs border border-stone-200/80 hover:border-amber-400/40 card-hover-lift group reveal-on-scroll reveal-delay-200 overflow-hidden shadow-xs">
                {/* Background Watermark */}
                <span className="absolute -top-3 right-3 font-serif-display text-5xl sm:text-8xl font-light text-stone-200/50 select-none group-hover:text-amber-950/10 transition-colors pointer-events-none">
                  02
                </span>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700 transition-all duration-400 group-hover:scale-110 group-hover:bg-amber-500/20 group-hover:rotate-3">
                    <i className="ph-duotone ph-wind text-xl"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-amber-800 font-semibold block">
                      Nghệ Thuật Mùi Hương
                    </span>
                    <h3 className="font-serif-display text-xl sm:text-2xl font-bold text-brand-charcoal group-hover:text-amber-950 transition-colors">
                      Hương Thơm Nồng Nàn
                    </h3>
                  </div>
                </div>

                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-5">
                  Mỗi ngọn nến mang tầng hương tràn đầy năng lượng giúp kích thích cảm hứng sáng tạo và tìm lại bình yên nội tại qua 3 nốt hương chuyển động tinh tế.
                </p>

                {/* Scent Layer 3-Step Journey */}
                <div className="pt-3 border-t border-stone-200/70">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                    <div className="p-2 rounded-xl bg-amber-500/8 border border-amber-500/20 flex flex-col items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-1"></span>
                      <span className="text-[9.5px] sm:text-[10px] font-mono text-amber-900/80 uppercase">Hương Đầu</span>
                      <span className="text-[11px] sm:text-xs font-bold text-amber-950 mt-0.5">Khơi Mở</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/8 border border-amber-500/20 flex flex-col items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mb-1"></span>
                      <span className="text-[9.5px] sm:text-[10px] font-mono text-amber-900/80 uppercase">Hương Giữa</span>
                      <span className="text-[11px] sm:text-xs font-bold text-amber-950 mt-0.5">Vỗ Về</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/8 border border-amber-500/20 flex flex-col items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-700 mb-1"></span>
                      <span className="text-[9.5px] sm:text-[10px] font-mono text-amber-900/80 uppercase">Hương Cuối</span>
                      <span className="text-[11px] sm:text-xs font-bold text-amber-950 mt-0.5">Lắng Sâu</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 03: Hidden Message Ritual & Self-Care */}
              <div className="relative flex-1 p-5 pb-8 sm:p-8 sm:pb-9 rounded-2xl sm:rounded-3xl bg-white/85 backdrop-blur-xs border border-stone-200/80 hover:border-rose-400/40 card-hover-lift group reveal-on-scroll reveal-delay-300 overflow-hidden shadow-xs">
                {/* Background Watermark */}
                <span className="absolute -top-3 right-3 font-serif-display text-5xl sm:text-8xl font-light text-stone-200/50 select-none group-hover:text-rose-950/10 transition-colors pointer-events-none">
                  03
                </span>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-brand-burgundy transition-all duration-400 group-hover:scale-110 group-hover:bg-rose-500/20 group-hover:rotate-3">
                    <i className="ph-duotone ph-flower-lotus text-xl"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-brand-burgundy font-semibold block">
                      Nghi Thức Chữa Lành
                    </span>
                    <h3 className="font-serif-display text-xl sm:text-2xl font-bold text-brand-charcoal group-hover:text-brand-burgundy transition-colors">
                      Nuông Chiều Bản Thân
                    </h3>
                  </div>
                </div>

                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-4">
                  Dành tặng chính mình khoảng lặng dịu êm sau ngày dài, tái tạo nguồn năng lượng tích cực và khám phá thông điệp cá nhân hóa ẩn sâu dưới lớp sáp tan chảy.
                </p>

                {/* Secret Message Preview Tag */}
                <div className="p-3 rounded-xl bg-[#FAF7F2] border border-dashed border-rose-300/70 flex items-center gap-3">
                  <i className="ph-fill ph-chat-centered-text text-brand-burgundy text-base shrink-0"></i>
                  <p className="text-[12px] italic font-serif-display text-stone-700 leading-snug">
                    “Dưới đáy nến là một lời thì thầm dịu dàng đang chờ bạn mở ra...”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN: TicketSpecialOfferSection */}
      <section className="py-12 sm:py-24 border-b border-dashed dashed-grid-border bg-[#F5EFE6] relative overflow-hidden" data-purpose="special-offer-ticket" id="special-offers">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          {/* Cột trái: Tối đa 2 Thẻ Vé Xòe Bài Chân Thực Ngoài Đời */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Tag tiêu đề nhỏ */}
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#EA580C] text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <i className="ph-fill ph-ticket"></i>
                Phiếu Quà Tặng Độc Quyền
              </span>
              <span className="text-[11px] text-stone-500 font-serif italic hidden sm:inline-block">
                (Rê chuột vào thẻ để xem)
              </span>
            </div>

            {/* Mobile Touch Switcher (Dành riêng cho màn hình cảm ứng điện thoại) */}
            {displayCoupons.length >= 2 && (
              <div className="flex sm:hidden items-center justify-center gap-2 mb-4 w-full max-w-[340px]">
                <button
                  type="button"
                  onClick={() => setActiveMobileCoupon(0)}
                  className={`flex-1 py-1.5 px-2.5 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                    activeMobileCoupon === 0
                      ? 'bg-brand-charcoal text-amber-300 font-bold border border-amber-400/40 scale-102 shadow-sm'
                      : 'bg-white/80 text-stone-600 border border-stone-200/80 hover:bg-white'
                  }`}
                >
                  <span>🎟️</span>
                  <span className="truncate">{primaryCoupon.name}</span>
                  <span className="bg-amber-400 text-stone-950 text-[9px] px-1.5 py-0.2 rounded-full font-black shrink-0">
                    {formatCouponValue(primaryCoupon)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMobileCoupon(1)}
                  className={`flex-1 py-1.5 px-2.5 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                    activeMobileCoupon === 1
                      ? 'bg-[#4A0E13] text-amber-200 font-bold border border-amber-400/40 scale-102 shadow-sm'
                      : 'bg-white/80 text-stone-600 border border-stone-200/80 hover:bg-white'
                  }`}
                >
                  <span>✦</span>
                  <span className="truncate">{secondaryCoupon.name}</span>
                  <span className="bg-amber-400 text-stone-950 text-[9px] px-1.5 py-0.2 rounded-full font-black shrink-0">
                    {formatCouponValue(secondaryCoupon)}
                  </span>
                </button>
              </div>
            )}

            {/* Container Xòe Bài (Fanned Cards Spread) */}
            <div
              className="relative w-full max-w-[480px] h-[210px] sm:h-[330px] flex items-center justify-center select-none"
              onMouseLeave={() => setHoveredCardIdx(null)}
            >
              {/* Thẻ 0: Ivory & Amber Gold Foil Stub (primaryCoupon) */}
              <div
                onMouseEnter={() => setHoveredCardIdx(0)}
                className={`absolute w-[320px] xs:w-[340px] sm:w-[410px] h-[180px] sm:h-[195px] flex cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] text-stone-900 ${
                  activeMobileCoupon === 1
                    ? 'max-sm:opacity-0 max-sm:pointer-events-none max-sm:scale-95'
                    : 'max-sm:z-20 max-sm:scale-100 max-sm:rotate-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:drop-shadow-xl'
                } ${displayCoupons.length === 1
                  ? 'sm:z-20 sm:scale-100 sm:drop-shadow-2xl sm:hover:scale-[1.03]'
                  : hoveredCardIdx === 0
                    ? 'sm:z-30 sm:rotate-0 sm:-translate-y-7 sm:-translate-x-1 sm:scale-[1.05] sm:drop-shadow-[0_25px_30px_rgba(0,0,0,0.3)] sm:opacity-100'
                    : hoveredCardIdx === 1
                      ? 'sm:z-10 sm:-rotate-[13deg] sm:-translate-x-12 sm:translate-y-5 sm:scale-[0.95] sm:opacity-75 sm:drop-shadow-md'
                      : 'sm:z-10 sm:-rotate-[7deg] sm:-translate-x-7 sm:translate-y-2 sm:scale-100 sm:drop-shadow-xl sm:opacity-95 sm:animate-float-gentle'
                  }`}
              >
                {/* SVG Die-Cut Background (Vết cắt trong suốt 100%, viền vàng uốn lượn tự nhiên, không rò rỉ góc) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="voucherGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFDF9" />
                      <stop offset="45%" stopColor="#FAF3E0" />
                      <stop offset="100%" stopColor="#F4E3B8" />
                    </linearGradient>
                    <clipPath id="voucherClip1">
                      <path d="M 16,0 H 269 A 11,11 0 0,0 291,0 H 384 A 16,16 0 0,1 400,16 V 174 A 16,16 0 0,1 384,190 H 291 A 11,11 0 0,0 269,190 H 16 A 16,16 0 0,1 0,174 V 16 A 16,16 0 0,1 16,0 Z" />
                    </clipPath>
                  </defs>
                  {/* Nền vé và cuống vé được clip chính xác 100% theo hình dáng vé có vết cắn & góc bo */}
                  <g clipPath="url(#voucherClip1)">
                    <rect x="0" y="0" width="400" height="190" fill="url(#voucherGrad1)" />
                    <rect x="280" y="0" width="120" height="190" fill="#78350F" fillOpacity="0.04" />
                  </g>
                  {/* Đường viền uốn lượn sắc sảo theo đúng mép vé */}
                  <path
                    d="M 16,0 H 269 A 11,11 0 0,0 291,0 H 384 A 16,16 0 0,1 400,16 V 174 A 16,16 0 0,1 384,190 H 291 A 11,11 0 0,0 269,190 H 16 A 16,16 0 0,1 0,174 V 16 A 16,16 0 0,1 16,0 Z"
                    fill="none"
                    stroke="#D97706"
                    strokeOpacity="0.75"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* Phần Thân Vé Chính (Bên trái - 70%) */}
                <div className="w-[70%] p-3 sm:p-3.5 pr-4 flex flex-col justify-between relative z-10">
                  {/* Viền chỉ may chìm */}
                  <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-xl pointer-events-none"></div>

                  {/* Header thân vé */}
                  <div className="flex justify-between items-start gap-1.5 z-10">
                    <div>
                      <h4 className="font-serif-display text-2xl sm:text-3xl font-black tracking-tight text-amber-950 leading-none">
                        Candlet
                      </h4>
                      <span className="text-[8.5px] uppercase tracking-widest text-amber-900/75 font-bold block mt-1">
                        ✦ Aroma Gift Voucher
                      </span>
                    </div>
                    <span className="bg-stone-900 text-amber-300 text-[8.5px] sm:text-[9.5px] font-extrabold px-2 py-0.5 sm:px-2.5 rounded-full shadow-xs tracking-wider whitespace-nowrap shrink-0">
                      {formatCouponValue(primaryCoupon)}
                    </span>
                  </div>

                  {/* Body thân vé */}
                  <div className="my-auto py-1 z-10 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                        {primaryCoupon.name}
                      </p>
                      <p className="text-[10.5px] text-stone-600 leading-relaxed line-clamp-2 mt-0.5">
                        {primaryCoupon.special_condition || 'Áp dụng cho mọi dòng nến thơm thủ công'}
                        {primaryCoupon.type === 'freeship' ? ` • ${shippingDiscountConditions(primaryCoupon)}` : primaryCoupon.max_discount ? ` • Giảm tối đa ${new Intl.NumberFormat('vi-VN').format(primaryCoupon.max_discount)}đ` : ''}
                      </p>
                    </div>

                    {/* Con dấu sáp thủ công tròn */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-amber-900/40 bg-amber-600/10 flex flex-col items-center justify-center text-center p-0.5 select-none transform rotate-6 shrink-0 shadow-2xs group-hover:rotate-12 transition-transform duration-500">
                      <span className="font-serif-display font-black text-xs sm:text-[13px] text-amber-950 leading-none">
                        {primaryCoupon.type === 'percent' ? `${primaryCoupon.value}%` : 'CANDLET'}
                      </span>
                      <span className="text-[7px] font-mono tracking-tighter text-amber-900 uppercase font-bold mt-0.5">
                        {primaryCoupon.type === 'percent' ? 'OFF' : '100% SOY'}
                      </span>
                    </div>
                  </div>

                  {/* Chân vé */}
                  <div className="text-[8.5px] font-mono text-amber-900/60 uppercase tracking-widest z-10">
                    Candlet Artisan Scented Candles
                  </div>
                </div>

                {/* Rãnh xé nét đứt dọc giữa thân & cuống vé */}
                <div className="absolute top-4 bottom-4 left-[70%] border-r-2 border-dashed border-amber-900/30 z-10 pointer-events-none"></div>
                <span className="absolute top-5 left-[70%] -translate-x-1/2 text-[9px] text-amber-900/40 transform -rotate-90 z-10 pointer-events-none">
                  ✂
                </span>

                {/* Phần Cuống Vé Xé (Bên phải - 30%) - trong suốt hoàn toàn, màu nền do SVG xử lý không bị lem */}
                <div className="w-[30%] p-2.5 sm:p-3 flex flex-col justify-between items-center text-center relative z-10">
                  {/* Mã Barcode mô phỏng vé ngoài đời */}
                  <div className="flex items-center justify-center gap-[2px] h-6 sm:h-7 my-auto text-amber-950 opacity-75">
                    <span className="w-[1.5px] h-full bg-current"></span>
                    <span className="w-[3px] h-full bg-current"></span>
                    <span className="w-[1px] h-full bg-current"></span>
                    <span className="w-[2.5px] h-full bg-current"></span>
                    <span className="w-[1px] h-full bg-current"></span>
                    <span className="w-[3.5px] h-full bg-current"></span>
                    <span className="w-[1px] h-full bg-current"></span>
                    <span className="w-[2px] h-full bg-current"></span>
                    <span className="w-[1.5px] h-full bg-current"></span>
                    <span className="w-[3px] h-full bg-current"></span>
                  </div>

                  {/* Mã CODE kèm nút bấm sao chép */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyCoupon(primaryCoupon.code, primaryCoupon._id || 'primary', e)}
                    className="w-full bg-amber-950/10 hover:bg-amber-950/20 active:scale-95 border border-amber-900/25 py-1 px-1 rounded text-[11px] sm:text-xs font-mono font-bold tracking-widest text-amber-950 text-center transition-all cursor-pointer shadow-2xs"
                    title="Bấm để sao chép mã ưu đãi"
                  >
                    {copiedCouponId === (primaryCoupon._id || 'primary') ? (
                      <span className="text-emerald-800 font-bold flex items-center justify-center gap-1">
                        <i className="ph-bold ph-check text-xs"></i> ĐÃ CHÉP!
                      </span>
                    ) : (
                      <span>{primaryCoupon.code}</span>
                    )}
                  </button>

                  {/* HSD & Seri */}
                  <div className="mt-1">
                    <span className="text-[8.5px] sm:text-[9px] font-mono tracking-tight text-amber-900/80 block">
                      HSD: {formatCouponDate(primaryCoupon.end_date)}
                    </span>
                    <span className="text-[7.5px] font-mono text-amber-900/50 uppercase tracking-widest block mt-0.5">
                      #CDL-{primaryCoupon.code.slice(0, 4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 1: Vintage Burgundy Velvet & Gold Stub (secondaryCoupon) - Chỉ render khi có thẻ thứ 2 */}
              {displayCoupons.length >= 2 && (
                <div
                  onMouseEnter={() => setHoveredCardIdx(1)}
                  className={`absolute w-[320px] xs:w-[340px] sm:w-[410px] h-[180px] sm:h-[195px] flex cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] text-amber-50 ${
                    activeMobileCoupon === 0
                      ? 'max-sm:opacity-0 max-sm:pointer-events-none max-sm:scale-95'
                      : 'max-sm:z-20 max-sm:scale-100 max-sm:rotate-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:drop-shadow-xl'
                  } ${hoveredCardIdx === 1
                    ? 'sm:z-30 sm:rotate-0 sm:-translate-y-7 sm:translate-x-1 sm:scale-[1.05] sm:drop-shadow-[0_25px_30px_rgba(0,0,0,0.35)] sm:opacity-100'
                    : hoveredCardIdx === 0
                      ? 'sm:z-10 sm:rotate-[13deg] sm:translate-x-12 sm:translate-y-5 sm:scale-[0.95] sm:opacity-75 sm:drop-shadow-md'
                      : 'sm:z-20 sm:rotate-[7deg] sm:translate-x-7 sm:translate-y-0 sm:scale-100 sm:drop-shadow-2xl sm:opacity-100 sm:animate-float-slow'
                    }`}
                >
                  {/* SVG Die-Cut Background (Vết cắt trong suốt 100%, viền vàng uốn lượn tự nhiên, không rò rỉ góc) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="voucherGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6B181E" />
                        <stop offset="50%" stopColor="#4A0E13" />
                        <stop offset="100%" stopColor="#2E070B" />
                      </linearGradient>
                      <clipPath id="voucherClip2">
                        <path d="M 16,0 H 269 A 11,11 0 0,0 291,0 H 384 A 16,16 0 0,1 400,16 V 174 A 16,16 0 0,1 384,190 H 291 A 11,11 0 0,0 269,190 H 16 A 16,16 0 0,1 0,174 V 16 A 16,16 0 0,1 16,0 Z" />
                      </clipPath>
                    </defs>
                    {/* Nền vé và cuống vé được clip chính xác 100% theo hình dáng vé có vết cắn & góc bo */}
                    <g clipPath="url(#voucherClip2)">
                      <rect x="0" y="0" width="400" height="190" fill="url(#voucherGrad2)" />
                      <rect x="280" y="0" width="120" height="190" fill="#000000" fillOpacity="0.22" />
                    </g>
                    {/* Đường viền vàng uốn lượn sắc nét theo mép vé */}
                    <path
                      d="M 16,0 H 269 A 11,11 0 0,0 291,0 H 384 A 16,16 0 0,1 400,16 V 174 A 16,16 0 0,1 384,190 H 291 A 11,11 0 0,0 269,190 H 16 A 16,16 0 0,1 0,174 V 16 A 16,16 0 0,1 16,0 Z"
                      fill="none"
                      stroke="#F59E0B"
                      strokeOpacity="0.5"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Phần Thân Vé Chính (Bên trái - 70%) */}
                  <div className="w-[70%] p-3 sm:p-3.5 pr-4 flex flex-col justify-between relative z-10">
                    {/* Viền chỉ may chìm */}
                    <div className="absolute inset-2 border border-dashed border-amber-400/20 rounded-xl pointer-events-none"></div>

                    {/* Header thân vé */}
                    <div className="flex justify-between items-start gap-1.5 z-10">
                      <div>
                        <h4 className="font-serif-display text-2xl sm:text-3xl font-black tracking-tight text-amber-200 leading-none">
                          Candlet VIP
                        </h4>
                        <span className="text-[8.5px] uppercase tracking-widest text-amber-300/80 font-bold block mt-1">
                          ✦ Signature Voucher
                        </span>
                      </div>
                      <span className="bg-amber-400 text-stone-950 text-[8.5px] sm:text-[9.5px] font-black px-2 py-0.5 sm:px-2.5 rounded-full shadow-xs tracking-wider whitespace-nowrap shrink-0">
                        {formatCouponValue(secondaryCoupon)}
                      </span>
                    </div>

                    {/* Body thân vé */}
                    <div className="my-auto py-1 z-10 flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                          {secondaryCoupon.name}
                        </p>
                        <p className="text-[10.5px] text-amber-100/80 leading-relaxed line-clamp-2 mt-0.5 font-light">
                          {secondaryCoupon.type === 'freeship' ? shippingDiscountConditions(secondaryCoupon) : secondaryCoupon.special_condition || 'Ưu đãi độc quyền dành cho đơn hàng đặt trực tuyến'}
                        </p>
                      </div>

                      {/* Con dấu sáp thủ công tròn */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-amber-400/40 bg-white/5 flex flex-col items-center justify-center text-center p-0.5 select-none transform -rotate-6 shrink-0 shadow-2xs group-hover:-rotate-12 transition-transform duration-500">
                        <span className="font-serif-display font-black text-xs sm:text-[13px] text-amber-200 leading-none">
                          {secondaryCoupon.type === 'freeship' ? 'SHIP' : secondaryCoupon.type === 'percent' ? `${secondaryCoupon.value}%` : '10K'}
                        </span>
                        <span className="text-[7px] font-mono tracking-tighter text-amber-300 uppercase font-bold mt-0.5">
                          VIP ONLY
                        </span>
                      </div>
                    </div>

                    {/* Chân vé */}
                    <div className="text-[8.5px] font-mono text-amber-200/50 uppercase tracking-widest z-10">
                      Candlet Exclusive Membership
                    </div>
                  </div>

                  {/* Rãnh xé nét đứt dọc giữa thân & cuống vé */}
                  <div className="absolute top-4 bottom-4 left-[70%] border-r-2 border-dashed border-white/20 z-10 pointer-events-none"></div>
                  <span className="absolute top-5 left-[70%] -translate-x-1/2 text-[9px] text-amber-200/40 transform -rotate-90 z-10 pointer-events-none">
                    ✂
                  </span>

                  {/* Phần Cuống Vé Xé (Bên phải - 30%) - trong suốt hoàn toàn, màu nền do SVG xử lý không bị lem */}
                  <div className="w-[30%] p-2.5 sm:p-3 flex flex-col justify-between items-center text-center relative z-10">
                    {/* Mã Barcode */}
                    <div className="flex items-center justify-center gap-[2px] h-6 sm:h-7 my-auto text-amber-200 opacity-75">
                      <span className="w-[1.5px] h-full bg-current"></span>
                      <span className="w-[3px] h-full bg-current"></span>
                      <span className="w-[1px] h-full bg-current"></span>
                      <span className="w-[2.5px] h-full bg-current"></span>
                      <span className="w-[1px] h-full bg-current"></span>
                      <span className="w-[3.5px] h-full bg-current"></span>
                      <span className="w-[1px] h-full bg-current"></span>
                      <span className="w-[2px] h-full bg-current"></span>
                      <span className="w-[1.5px] h-full bg-current"></span>
                      <span className="w-[3px] h-full bg-current"></span>
                    </div>

                    {/* Mã CODE kèm nút sao chép */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyCoupon(secondaryCoupon.code, secondaryCoupon._id || 'secondary', e)}
                      className="w-full bg-white/10 hover:bg-white/20 active:scale-95 border border-amber-400/30 py-1 px-1 rounded text-[11px] sm:text-xs font-mono font-bold tracking-widest text-amber-300 text-center transition-all cursor-pointer shadow-2xs"
                      title="Bấm để sao chép mã ưu đãi"
                    >
                      {copiedCouponId === (secondaryCoupon._id || 'secondary') ? (
                        <span className="text-amber-200 font-bold flex items-center justify-center gap-1">
                          <i className="ph-bold ph-check text-xs"></i> ĐÃ CHÉP!
                        </span>
                      ) : (
                        <span>{secondaryCoupon.code}</span>
                      )}
                    </button>

                    {/* HSD & Seri */}
                    <div className="mt-1">
                      <span className="text-[8.5px] sm:text-[9px] font-mono tracking-tight text-amber-200/80 block">
                        HSD: {formatCouponDate(secondaryCoupon.end_date)}
                      </span>
                      <span className="text-[7.5px] font-mono text-amber-200/50 uppercase tracking-widest block mt-0.5">
                        #CDL-{secondaryCoupon.code.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Thông tin Ưu Đãi Đặc Quyền */}
          <div className="lg:col-span-5 text-left reveal-on-scroll">
            <h3 className="font-serif-display text-3xl sm:text-5xl font-normal text-brand-charcoal leading-tight mb-3 sm:mb-4">
              Ưu đãi đặc quyền<br />
              <span className="italic font-light text-amber-800">Thắp Sáng Cảm Xúc</span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed mb-6 sm:mb-8 font-normal">
              Candlet dành tặng bạn những nốt hương an yên cùng các mã ưu đãi độc quyền. Từng ly nến thơm thủ công được rót từ 100% sáp đậu nành thiên nhiên, bấc cotton hữu cơ và tinh dầu thuần khiết — hoàn hảo để chăm sóc bản thân hoặc trao gửi yêu thương.
            </p>

            {/* Các nút hành động CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-charcoal text-white hover:bg-black px-7 py-3.5 sm:py-3 rounded-full text-xs tracking-widest uppercase font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 btn-shimmer active:scale-[0.98]"
              >
                <span>Mua Sắm & Dùng Mã</span>
                <i className="ph-bold ph-arrow-right"></i>
              </Link>
              <a
                href="#collection"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 border border-stone-400 text-stone-700 hover:border-brand-charcoal hover:text-brand-charcoal px-6 py-3.5 sm:py-3 rounded-full text-xs tracking-widest uppercase font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Xem Bộ Sưu Tập</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN: ProductCollectionSection */}
      <section className="py-12 sm:py-24 border-b border-dashed dashed-grid-border bg-[#FAF7F2] relative overflow-hidden" data-purpose="product-collection" id="collection">
        {/* Ambient Subtle Warmth */}
        <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-rose-100/30 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-3 sm:px-8 relative z-10">
          {/* Section Header: Editorial & Atmospheric */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-12">
            <div className="reveal-on-scroll max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/60 border border-stone-300/60 mb-3 text-[10.5px] sm:text-[11px] font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                Bộ Sưu Tập Thủ Công Mới Nhất
              </div>
              <h2 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl text-brand-charcoal tracking-tight font-normal leading-[1.15]">
                Khám phá bộ sưu tập<br />
                <span className="italic font-light text-brand-burgundy">thắp sáng tâm hồn</span>
              </h2>
              <p className="text-stone-600 text-xs sm:text-base leading-relaxed mt-2 sm:mt-4 font-normal">
                Chế tác từ 100% sáp thực vật hữu cơ hòa quyện cùng tinh dầu thiên nhiên nguyên chất. Từng ngọn nến mang trong mình một thông điệp xúc cảm bí mật, dần hé lộ khi ngọn lửa cháy êm dịu.
              </p>
            </div>

            <div className="reveal-on-scroll reveal-delay-200 hidden sm:flex items-center gap-4 shrink-0">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-brand-charcoal text-white hover:bg-brand-burgundy text-xs font-semibold tracking-widest uppercase transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>Xem Tất Cả Sản Phẩm</span>
                <i className="ph-bold ph-arrow-right transition-transform duration-300 group-hover:translate-x-1"></i>
              </Link>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-5 -mx-3 px-3 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'Tất Cả', icon: 'ph-squares-four' },
              { id: 'bestseller', label: 'Bán Chạy Nhất', icon: 'ph-fire' },
              { id: 'message', label: 'Nến Ẩn Thư', icon: 'ph-envelope-open' },
              { id: 'gift', label: 'Set Quà Tặng', icon: 'ph-gift' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-brand-charcoal text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-stone-600 border border-stone-200/80'
                }`}
              >
                <i className={`ph-bold ${cat.icon} text-xs ${selectedCategoryFilter === cat.id ? 'text-amber-300' : 'text-stone-400'}`}></i>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Product Grid: Modern Boutique Showcase (2 cột trên mobile, 4 cột trên desktop) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-2xl sm:rounded-3xl bg-white/70 border border-stone-200/70 p-3 sm:p-5 animate-pulse">
                  <div className="w-full aspect-square sm:aspect-[4/4.2] rounded-xl sm:rounded-2xl bg-stone-200/60 mb-3 sm:mb-4"></div>
                  <div className="h-3 sm:h-4 bg-stone-200/60 rounded w-1/2 mb-2 sm:mb-3"></div>
                  <div className="h-4 sm:h-6 bg-stone-200/60 rounded w-3/4 mb-3 sm:mb-4"></div>
                  <div className="h-8 sm:h-10 bg-stone-200/40 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-10 sm:p-16 rounded-2xl sm:rounded-3xl bg-white/60 border border-dashed border-stone-300 text-center max-w-xl mx-auto reveal-on-scroll">
              <h3 className="font-serif-display text-xl sm:text-2xl text-stone-800 font-bold mb-2">Bộ sưu tập đang được chuẩn bị</h3>
              <p className="text-xs sm:text-sm text-stone-500 mb-6">Những mẻ nến thơm mới đang trong quá trình rót sáp và ủ hương thủ công. Vui lòng ghé lại sau!</p>
              <Link to="/shop" className="inline-block px-6 py-2.5 rounded-full bg-brand-charcoal text-white text-xs font-semibold tracking-widest uppercase">
                Ghé thăm cửa hàng
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {products
                .filter(product => {
                  if (selectedCategoryFilter === 'all') return true;
                  if (selectedCategoryFilter === 'bestseller') {
                    return (product.tag && (product.tag.toLowerCase().includes('bán chạy') || product.tag.toLowerCase().includes('hot') || product.tag.toLowerCase().includes('best'))) || Number(product.avgRating) >= 4.8;
                  }
                  if (selectedCategoryFilter === 'message') {
                    return product.name?.toLowerCase().includes('thư') || product.name?.toLowerCase().includes('thông điệp') || product.description?.toLowerCase().includes('thông điệp') || product.tag?.toLowerCase().includes('thư') || true;
                  }
                  if (selectedCategoryFilter === 'gift') {
                    return product.name?.toLowerCase().includes('quà') || product.name?.toLowerCase().includes('set') || product.category?.name?.toLowerCase().includes('quà');
                  }
                  return true;
                })
                .slice(0, 4)
                .map((product, index) => {
                return (
                  <div
                    key={product._id}
                    className={`rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-xs border border-stone-200/80 hover:border-amber-700/30 p-3 sm:p-5 flex flex-col justify-between card-hover-lift group relative shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_35px_-10px_rgba(45,18,20,0.09)] transition-all duration-500 reveal-on-scroll reveal-delay-${((index % 4) + 1) * 100}`}
                  >
                    <div>
                      {/* Image Frame with Badges */}
                      <div className="relative w-full aspect-square sm:aspect-[4/4.2] rounded-xl sm:rounded-2xl overflow-hidden bg-stone-100/70 mb-3 sm:mb-4">
                        <Link to={`/product/${product._id}`} className="block w-full h-full">
                          {product.image ? (
                            <img
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                              src={getImageUrl(product.image)}
                            />
                          ) : (
                            <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs">
                              Chưa có ảnh
                            </div>
                          )}
                        </Link>

                        {/* Top Left Tag */}
                        {product.tag && (
                          <div
                            className="absolute top-2 left-2 sm:top-3 sm:left-3 text-white text-[8px] sm:text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1 uppercase z-10 shadow-sm rounded-full backdrop-blur-xs"
                            style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                          >
                            {product.tag}
                          </div>
                        )}

                        {/* Top Right Floating Wishlist Button */}
                        <button
                          aria-label="Thêm vào yêu thích"
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-md shadow-xs border border-stone-200/60 flex items-center justify-center text-stone-600 hover:text-rose-500 hover:scale-110 active:scale-90 transition-all duration-300 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(product, navigate);
                          }}
                          title={isInWishlist(product._id) ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                        >
                          <i className={`text-sm sm:text-base transition-transform duration-300 ${isInWishlist(product._id)
                            ? 'ph-fill ph-heart text-rose-500 scale-110'
                            : 'ph-bold ph-heart text-stone-600 hover:text-rose-500'
                            }`}></i>
                        </button>
                      </div>

                      {/* Header Info: Category & Rating */}
                      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
                        <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-stone-500 truncate">
                          {product.category?.name || 'CANDLET'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <i className="ph-fill ph-star text-amber-500 text-[10px] sm:text-[11px]"></i>
                          <span className="font-mono text-[10px] sm:text-xs font-semibold text-stone-700">
                            {product.avgRating || '5.0'}
                          </span>
                        </div>
                      </div>

                      {/* Product Name */}
                      <Link to={`/product/${product._id}`} className="block group-hover:text-amber-950 transition-colors">
                        <h3
                          className="font-serif-display text-xs sm:text-lg font-bold text-brand-charcoal leading-snug line-clamp-2 h-[32px] sm:h-[48px] overflow-hidden mb-1 sm:mb-2"
                          title={product.name}
                        >
                          {product.name}
                        </h3>
                      </Link>

                      {/* Product Description (Giới hạn đúng 2 dòng, chiều cao cố định để các thẻ đều nhau tuyệt đối) */}
                      <p
                        className="hidden sm:block text-xs text-stone-500 leading-relaxed mb-4 font-normal line-clamp-2 h-[36px] overflow-hidden"
                        title={product.description}
                      >
                        {product.description || 'Hương thơm êm dịu, thanh lọc không gian và mang lại cảm giác thư thái sâu lắng.'}
                      </p>
                    </div>

                    {/* Footer: Price & Buy Action */}
                    <div className="pt-2.5 sm:pt-3.5 border-t border-stone-200/80 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                          Giá
                        </span>
                        <span className="font-serif-display font-bold text-base sm:text-xl text-brand-charcoal group-hover:text-brand-burgundy transition-colors">
                          {product.base_price?.toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleBuyNow(e, product)}
                        className="w-full py-2 px-3 rounded-full bg-brand-charcoal hover:bg-brand-burgundy text-white text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase transition-all duration-300 shadow-2xs hover:shadow-md hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <i className="ph-bold ph-shopping-bag-open text-xs"></i>
                        <span>Mua Ngay</span>
                      </button>

                      {/* Low Stock Indicator */}
                      {product.stock <= 5 && product.stock > 0 && (
                        <div className="py-0.5 px-2 rounded-lg bg-amber-50 border border-amber-200/70 text-[9px] sm:text-[10px] font-mono text-amber-900 flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                          <span>Còn {product.stock} hũ cuối</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nút Xem Tất Cả trên Mobile */}
          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full border border-brand-charcoal text-brand-charcoal text-xs font-bold uppercase tracking-wider hover:bg-brand-charcoal hover:text-white transition-all shadow-2xs active:scale-98"
            >
              <span>Xem Tất Cả Nến Thơm ({products.length})</span>
              <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* BEGIN: WhatMakesUsDifferentSection */}
      <section className="relative overflow-hidden py-14 sm:py-28 bg-gradient-to-br from-[#2D1214] via-[#431A1E] to-[#240D10] text-[#f9f9f9]" data-purpose="brand-differentiation" id="story">
        {/* Ambient atmospheric warm glows with slow floating animation */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none animate-ambient-drift-1"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#9A3412]/20 rounded-full blur-[140px] pointer-events-none animate-ambient-drift-2"></div>
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none animate-pulse-glow"></div>

        {/* Subtle radial lighting layer */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.04] via-transparent to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">

            {/* Left Content Column */}
            <div className="lg:col-span-5 space-y-5 sm:space-y-7 reveal-on-scroll">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Giá Trị Cốt Lõi</span>
              </div>

              <h2 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.15] text-white tracking-tight">
                Điều Tạo Nên Sự Khác Biệt<br />
                <span className="italic font-light text-amber-200/90 font-serif">Của Candlet</span>
              </h2>

              <p className="text-xs sm:text-base text-[#E5D2CD] leading-relaxed font-normal">
                Dù bạn đang tìm kiếm một món quà tinh tế gửi người thân yêu hay muốn nuông chiều chính mình, chúng tôi luôn mở ra không gian thư thái nhất với nghệ thuật hương thơm thuần khiết.
              </p>

              {/* 3 Core Pillars List */}
              <div className="space-y-2.5 sm:space-y-3.5 pt-1">
                <div className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-[13px] text-[#D8C0B8] p-2 rounded-xl hover:bg-white/5 transition-all duration-300 group">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/20 group-hover:scale-110 group-hover:bg-amber-400/25 transition-all duration-300">
                    <i className="ph-bold ph-check text-xs"></i>
                  </span>
                  <span><strong className="text-white font-semibold group-hover:text-amber-200 transition-colors">100% Sáp Thực Vật & Sáp Ong:</strong> Không chứa paraffin độc hại, độ tan chảy chậm và không sinh muội than.</span>
                </div>

                <div className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-[13px] text-[#D8C0B8] p-2 rounded-xl hover:bg-white/5 transition-all duration-300 group">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/20 group-hover:scale-110 group-hover:bg-amber-400/25 transition-all duration-300">
                    <i className="ph-bold ph-check text-xs"></i>
                  </span>
                  <span><strong className="text-white font-semibold group-hover:text-amber-200 transition-colors">Bấc Nến Tự Nhiên Không Chì:</strong> Ngọn lửa êm dịu, âm thanh tí tách thư thái và an toàn cho phòng kín.</span>
                </div>

                <div className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-[13px] text-[#D8C0B8] p-2 rounded-xl hover:bg-white/5 transition-all duration-300 group">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/20 group-hover:scale-110 group-hover:bg-amber-400/25 transition-all duration-300">
                    <i className="ph-bold ph-check text-xs"></i>
                  </span>
                  <span><strong className="text-white font-semibold group-hover:text-amber-200 transition-colors">Rót Tay Thủ Công Tỉ Mẩn:</strong> Mỗi hũ nến là một tác phẩm được chăm chút tỉ mẩn bởi đôi bàn tay nghệ nhân Việt.</span>
                </div>
              </div>

              <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <a
                  href="#collection"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FDE68A] to-[#F59E0B] hover:from-white hover:to-amber-100 text-[#381B18] px-7 py-3.5 text-xs font-bold tracking-widest uppercase rounded-full shadow-lg shadow-black/25 hover:shadow-amber-500/25 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 btn-shimmer"
                >
                  <span>Khám Phá Bộ Sưu Tập</span>
                  <i className="ph-bold ph-arrow-right text-xs"></i>
                </a>
                <Link
                  to="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-amber-200/90 hover:text-white uppercase tracking-widest px-4 py-3 transition-all duration-300 underline-offset-4 hover:underline"
                >
                  <span>Xem Cửa Hàng</span>
                  <i className="ph ph-caret-right text-xs"></i>
                </Link>
              </div>
            </div>

            {/* Right Cards Showcase */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-7">

              {/* Card 1: Nguồn Thảo Dược & Chiết Xuất Bản Địa */}
              <div className="group relative bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 hover:border-amber-400/50 shadow-xl hover:shadow-2xl hover:shadow-amber-950/50 transition-all duration-500 flex flex-col justify-between card-hover-lift reveal-on-scroll reveal-delay-100">
                <div className="relative rounded-xl overflow-hidden aspect-[16/10] sm:aspect-[4/5] bg-stone-900 mb-3 sm:mb-4 shadow-inner">
                  <img
                    alt="Nguồn thảo mộc và sáp đậu nành thiên nhiên Candlet"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    src="/story-botanicals.jpg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity"></div>

                  {/* Glass Tag Badge */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/45 backdrop-blur-md border border-white/20 text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1.5 shadow-sm group-hover:border-amber-400/40 transition-colors">
                    <i className="ph-fill ph-leaf text-amber-300 text-xs"></i>
                    <span>Nguồn An Toàn</span>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-amber-400/90 text-stone-950 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 rounded-full shadow-md font-mono group-hover:scale-105 transition-transform">
                    100% Organic
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-serif-display text-xl sm:text-2xl font-semibold text-white group-hover:text-amber-200 transition-colors">
                    Chiết Xuất Bản Địa
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#D8C0B8] leading-relaxed font-normal">
                    Sáp đậu nành thực vật kết hợp cùng hoa khô, vỏ quế và tinh dầu thơm organic thuần khiết, mang lại nốt hương sâu lắng và an lành.
                  </p>
                </div>
              </div>

              {/* Card 2: Rót Nến Thủ Công & Bền Vững (Staggered offset) */}
              <div className="group relative bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 hover:border-amber-400/50 shadow-xl hover:shadow-2xl hover:shadow-amber-950/50 transition-all duration-500 flex flex-col justify-between sm:translate-y-8 card-hover-lift reveal-on-scroll reveal-delay-200">
                <div className="relative rounded-xl overflow-hidden aspect-[16/10] sm:aspect-[4/5] bg-stone-900 mb-3 sm:mb-4 shadow-inner">
                  <img
                    alt="Nghệ nhân rót nến thủ công Candlet"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    src="/story-craft.png"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity"></div>

                  {/* Glass Tag Badge */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/45 backdrop-blur-md border border-white/20 text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1.5 shadow-sm group-hover:border-amber-400/40 transition-colors">
                    <i className="ph-fill ph-hands-clapping text-amber-300 text-xs"></i>
                    <span>Nghệ Thuật Thủ Công</span>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-amber-400/90 text-stone-950 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 rounded-full shadow-md font-mono group-hover:scale-105 transition-transform">
                    Handmade in VN
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-serif-display text-xl sm:text-2xl font-semibold text-white group-hover:text-amber-200 transition-colors">
                    Rót Tay Tỉ Mỉ
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#D8C0B8] leading-relaxed font-normal">
                    Từng mẻ sáp được nấu chảy và canh nhiệt độ rót thủ công chuẩn xác vào hũ thủ tinh chịu nhiệt, dễ dàng tái chế trọn đời.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* BEGIN: NewsletterSection */}
      <section className="py-14 sm:py-24 border-b border-dashed dashed-grid-border bg-[#f9f9f9] relative overflow-hidden" data-purpose="newsletter-signup">
        <NewsletterCanvas />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2 sm:mb-3 block">Thư Thông Báo Candlet</span>
          <h2 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl text-brand-charcoal leading-tight font-normal mb-3 sm:mb-4">
            Luôn là người đầu tiên biết đến —<br />
            <span className="italic font-light">Đăng ký nhận bản tin</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-[512px] mx-auto mb-8 sm:mb-10 leading-relaxed font-normal">
            Đăng ký để nhận thông báo sớm nhất về các mùi hương độc bản theo mùa cùng mã giảm giá 15% cho đơn hàng tiếp theo.
          </p>
          <form onSubmit={submitNewsletter} className="max-w-[448px] mx-auto flex items-center border-b border-stone-800 focus-within:border-brand-burgundy pb-2.5 transition-colors group/form" data-purpose="email-form">
            <input className="w-full bg-transparent border-none text-stone-900 placeholder:text-stone-400 text-sm focus:ring-0 focus:outline-none px-2" placeholder="Nhập địa chỉ email của bạn..." required="" type="email" />
            <button aria-label="Đăng ký nhận tin" className="text-brand-charcoal hover:text-brand-burgundy transition-all p-2 group-hover/form:scale-110 hover:scale-125 active:scale-95 cursor-pointer" type="submit">
              <i className="ph ph-arrow-up-right text-xl font-bold transition-transform group-hover/form:translate-x-0.5 group-hover/form:-translate-y-0.5"></i>
            </button>
          </form>
          <p className="text-[10.5px] sm:text-[11px] text-stone-400 mt-4">Cam kết không gửi thư rác. Bạn có thể hủy nhận bất kỳ lúc nào.</p>
        </div>
      </section>
    </>
  );
}
