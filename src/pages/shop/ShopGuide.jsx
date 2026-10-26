import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ShopGuide() {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('care'); // 'care' | 'hidden-message' | 'scents' | 'upcycle'

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQS = [
    {
      q: 'Tại sao lần đốt nến đầu tiên lại quan trọng nhất?',
      a: 'Nến có "ký ức sáp". Lần đầu thắp nến, bạn nên để ngọn lửa cháy liên tục từ 2 đến 3 giờ cho đến khi toàn bộ bề mặt sáp trên cùng tan chảy đều đến sát thành cốc. Điều này giúp ngăn ngừa triệt để hiện tượng nến bị đào hầm (tunneling - chỉ lõm một hố sâu ở giữa làm lãng phí sáp xung quanh).'
    },
    {
      q: 'Nến thơm sáp đậu nành Candlet có an toàn cho thú cưng và phụ nữ mang thai không?',
      a: 'Candlet cam kết sử dụng 100% sáp đậu nành và sáp ong tự nhiên, kết hợp tinh dầu chuẩn IFRA không chứa hóa chất độc hại, phthalate hay paraben. Ngọn lửa cháy với bấc gỗ tự nhiên không sinh khói đen. Tuy nhiên, nếu gia đình có thú cưng nhạy cảm hoặc phụ nữ mang thai 3 tháng đầu, bạn nên thắp nến trong không gian thoáng đãng và tham khảo thêm ý kiến chuyên gia.'
    },
    {
      q: 'Vì sao sau khi đốt xong và nguội lại, bề mặt nến có thể hơi gồ ghề?',
      a: 'Đây chính là "chứng minh thư" chứng thực hũ nến của bạn được làm từ 100% sáp thực vật tự nhiên (không pha sáp parafin công nghiệp). Do quá trình nguội tự nhiên của sáp đậu nành, bề mặt có thể hơi lượn sóng hoặc lấm tấm nhẹ. Điều này hoàn toàn bình thường và không ảnh hưởng đến chất lượng mùi hương hay độ tỏa khói.'
    },
    {
      q: 'Mỗi lần thắp nến nên kéo dài trong bao lâu?',
      a: 'Thời gian thắp nến lý tưởng là từ 1 đến tối đa 4 giờ. Không nên đốt nến quá 4 giờ liên tục vì nhiệt độ đáy cốc có thể quá nóng và làm giảm độ bền lưu hương của tinh dầu tự nhiên trong hũ.'
    },
    {
      q: 'Hạn sử dụng tốt nhất của nến thơm là bao lâu?',
      a: 'Nến thơm từ sáp thực vật và tinh dầu tự nhiên lưu giữ nốt hương tốt nhất trong vòng 18 đến 24 tháng kể từ ngày sản xuất. Khi không dùng, hãy đậy nắp kín và bảo quản nến ở nơi khô ráo, thoáng mát, tránh ánh nắng mặt trời trực tiếp.'
    }
  ];

  return (
    <main className="min-h-screen bg-white pb-12 font-jakarta text-brand-charcoal selection:bg-brand-burgundy selection:text-white sm:bg-[#FFFDF9] sm:pb-20 lg:pb-24">
      
      {/* 1. HERO HEADER */}
      <header className="relative border-b-8 border-stone-100 bg-white py-7 sm:border-b sm:border-stone-200/80 sm:bg-gradient-to-b sm:from-[#F7EFE8]/70 sm:via-[#FFFDF9] sm:to-[#FFFDF9] sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-left sm:px-8 sm:text-center">
          
          {/* Breadcrumbs */}
          <div className="mb-6 hidden items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 sm:flex">
            <Link to="/" className="sm:hover:text-brand-burgundy transition-colors">Trang Chủ</Link>
            <span>/</span>
            <span className="text-brand-terracotta">Cẩm Nang Nến Thơm Nghệ Thuật</span>
          </div>

          <div className="mb-5 hidden items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 sm:inline-flex">
            <i className="ph-fill ph-flame text-amber-500 text-sm"></i>
            The Art of Mindful Candle Rituals
          </div>

          <h1 className="mb-3 font-serif-display text-3xl font-bold leading-tight text-brand-burgundy sm:mb-6 sm:text-5xl lg:text-6xl">
            Cẩm Nang Thắp Nến & Nghệ Thuật Mùi Hương
          </h1>

          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-lg">
            Học cách chăm sóc ngọn nến thủ công như một nghệ nhân: từ kỹ thuật giữ phẳng mặt sáp, cắt tỉa bấc gỗ cho đến nghệ thuật chọn hương thơm khơi gợi xúc cảm an yên.
          </p>

          {/* Quick Navigation Anchor Tabs */}
          <nav className="no-scrollbar -mx-4 mt-6 flex items-center gap-5 overflow-x-auto border-t border-stone-100 px-4 pt-3 sm:mx-0 sm:mt-10 sm:flex-wrap sm:justify-center sm:gap-2.5 sm:overflow-visible sm:border-t-0 sm:px-0 sm:pt-0">
            <a
              href="#golden-rules"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-2 text-left text-[11px] font-bold text-stone-700 transition-all sm:hover:border-brand-burgundy sm:hover:text-brand-burgundy sm:rounded-full sm:border sm:bg-white sm:px-5 sm:py-2.5 sm:text-xs sm:shadow-2xs"
            >
              <i className="ph-bold ph-shield-check text-[#B45309]"></i>
              <span>4 Quy Tắc Vàng</span>
            </a>
            <a
              href="#scent-families"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-2 text-left text-[11px] font-bold text-stone-700 transition-all sm:hover:border-brand-burgundy sm:hover:text-brand-burgundy sm:rounded-full sm:border sm:bg-white sm:px-5 sm:py-2.5 sm:text-xs sm:shadow-2xs"
            >
              <i className="ph-bold ph-flower-lotus text-[#B45309]"></i>
              <span>Chọn Mùi Theo Không Gian</span>
            </a>
            <a
              href="#upcycle-candle"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-2 text-left text-[11px] font-bold text-stone-700 transition-all sm:hover:border-brand-burgundy sm:hover:text-brand-burgundy sm:rounded-full sm:border sm:bg-white sm:px-5 sm:py-2.5 sm:text-xs sm:shadow-2xs"
            >
              <i className="ph-bold ph-recycle text-[#B45309]"></i>
              <span>Tái Sinh Hũ Nến</span>
            </a>
            <a
              href="#faq-section"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-2 text-left text-[11px] font-bold text-stone-700 transition-all sm:hover:border-brand-burgundy sm:hover:text-brand-burgundy sm:rounded-full sm:border sm:bg-white sm:px-5 sm:py-2.5 sm:text-xs sm:shadow-2xs"
            >
              <i className="ph-bold ph-question text-[#B45309]"></i>
              <span>Hỏi & Đáp (FAQ)</span>
            </a>
          </nav>

        </div>
      </header>

      {/* 2. SECTION: 4 QUY TẮC VÀNG (THE 4 GOLDEN RULES) */}
      <section id="golden-rules" className="mx-auto max-w-6xl border-b-8 border-stone-100 px-4 py-12 sm:border-b sm:border-stone-200/60 sm:px-8 sm:py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309] block mb-2">
            Nền Tảng Căn Bản
          </span>
          <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-brand-burgundy mb-3">
            4 Quy Tắc Vàng Khi Đốt Nến Thơm
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Giúp kéo dài tuổi thọ của hũ nến thêm 30%, tối ưu hóa khả năng tỏa hương và giữ trọn vẹn thẩm mỹ cho không gian sống.
          </p>
        </div>

        <div className="divide-y divide-stone-200 md:grid md:grid-cols-2 md:gap-8 md:divide-y-0">
          
          {/* Quy tắc 1 */}
          <article className="group relative overflow-hidden py-7 transition-all md:rounded-2xl md:border md:border-stone-200 md:bg-white md:p-8 md:shadow-xs md:hover:shadow-md">
            <div className="absolute right-0 top-0 -z-0 hidden size-24 rounded-bl-full bg-[#FFF9F2] transition-transform sm:group-hover:scale-110 md:block"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-brand-burgundy text-white font-serif-display font-bold text-xl flex items-center justify-center mb-6 shadow-sm">
                01
              </div>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Lần Đốt Đầu Tiên: Ký Ức Của Sáp
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Hãy dành đủ <strong>2 đến 3 tiếng</strong> cho lần châm lửa đầu tiên. Cần đảm bảo lớp sáp trên bề mặt tan chảy hoàn toàn đến sát viền cốc nến.
              </p>
              <div className="flex items-start gap-2.5 border-l-2 border-amber-400 py-1 pl-3 text-xs text-amber-900 md:rounded-lg md:border md:border-amber-200/60 md:bg-[#FFF9F2] md:p-3">
                <i className="ph-fill ph-lightbulb text-amber-600 text-base shrink-0 mt-0.5"></i>
                <span><strong>Tại sao?</strong> Sáp nến có trí nhớ hình dạng. Nếu tắt quá sớm khi sáp chưa tràn viền, nến sẽ bị thụt ngòi ở những lần sau.</span>
              </div>
            </div>
          </article>

          {/* Quy tắc 2 */}
          <article className="group relative overflow-hidden py-7 transition-all md:rounded-2xl md:border md:border-stone-200 md:bg-white md:p-8 md:shadow-xs md:hover:shadow-md">
            <div className="absolute right-0 top-0 -z-0 hidden size-24 rounded-bl-full bg-[#FFF9F2] transition-transform sm:group-hover:scale-110 md:block"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-brand-burgundy text-white font-serif-display font-bold text-xl flex items-center justify-center mb-6 shadow-sm">
                02
              </div>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Cắt Tỉa Bấc Nến Từ 3 - 5mm
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Trước mỗi lần thắp lại, hãy dùng kéo chuyên dụng cắt bớt phần bấc đen đã cháy than, giữ chiều dài bấc còn khoảng <strong>3 đến 5mm</strong>.
              </p>
              <div className="flex items-start gap-2.5 border-l-2 border-amber-400 py-1 pl-3 text-xs text-amber-900 md:rounded-lg md:border md:border-amber-200/60 md:bg-[#FFF9F2] md:p-3">
                <i className="ph-fill ph-scissors text-amber-600 text-base shrink-0 mt-0.5"></i>
                <span><strong>Hiệu quả:</strong> Bấc gọn gàng giúp ngọn lửa cháy êm dịu, không bập bùng dữ dội và hoàn toàn không sinh khói đen ám cốc.</span>
              </div>
            </div>
          </article>

          {/* Quy tắc 3 */}
          <article className="group relative overflow-hidden py-7 transition-all md:rounded-2xl md:border md:border-stone-200 md:bg-white md:p-8 md:shadow-xs md:hover:shadow-md">
            <div className="absolute right-0 top-0 -z-0 hidden size-24 rounded-bl-full bg-[#FFF9F2] transition-transform sm:group-hover:scale-110 md:block"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-brand-burgundy text-white font-serif-display font-bold text-xl flex items-center justify-center mb-6 shadow-sm">
                03
              </div>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Tắt Nến Đúng Điệu: Đừng Thổi
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Đừng thổi trực tiếp vào tim nến. Hãy dùng <strong>chuông dập nến</strong> hoặc nhẹ nhàng <strong>đậy nắp hũ</strong> lại để dập tắt ngọn lửa bằng cách ngắt oxy.
              </p>
              <div className="flex items-start gap-2.5 border-l-2 border-amber-400 py-1 pl-3 text-xs text-amber-900 md:rounded-lg md:border md:border-amber-200/60 md:bg-[#FFF9F2] md:p-3">
                <i className="ph-fill ph-bell-simple text-amber-600 text-base shrink-0 mt-0.5"></i>
                <span><strong>Bí quyết:</strong> Thổi nến sẽ làm tàn tro văng ra bề mặt sáp lụa và để lại mùi khét khó chịu làm mất đi hương thơm tinh tế trong phòng.</span>
              </div>
            </div>
          </article>

          {/* Quy tắc 4 */}
          <article className="group relative overflow-hidden py-7 transition-all md:rounded-2xl md:border md:border-stone-200 md:bg-white md:p-8 md:shadow-xs md:hover:shadow-md">
            <div className="absolute right-0 top-0 -z-0 hidden size-24 rounded-bl-full bg-[#FFF9F2] transition-transform sm:group-hover:scale-110 md:block"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-brand-burgundy text-white font-serif-display font-bold text-xl flex items-center justify-center mb-6 shadow-sm">
                04
              </div>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Giới Hạn Tối Đa 4 Giờ & An Toàn
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Không nên thắp nến quá <strong>4 giờ liên tục</strong>. Luôn đặt hũ nến trên bề mặt phẳng, tránh xa rèm cửa và các luồng gió thổi trực tiếp từ điều hòa hay quạt máy.
              </p>
              <div className="flex items-start gap-2.5 border-l-2 border-amber-400 py-1 pl-3 text-xs text-amber-900 md:rounded-lg md:border md:border-amber-200/60 md:bg-[#FFF9F2] md:p-3">
                <i className="ph-fill ph-timer text-amber-600 text-base shrink-0 mt-0.5"></i>
                <span><strong>Lưu ý:</strong> Khi lớp sáp đáy chỉ còn khoảng 1cm, hãy ngừng đốt để đảm bảo an toàn cho đáy ly và chuẩn bị tái chế hũ nến.</span>
              </div>
            </div>
          </article>

        </div>
      </section>

      {/* 3. SECTION: PHÂN LOẠI TẦNG HƯƠNG & KHÔNG GIAN (FRAGRANCE FAMILIES) */}
      <section id="scent-families" className="mx-auto max-w-6xl border-b-8 border-stone-100 px-4 py-12 sm:border-b sm:border-stone-200/60 sm:px-8 sm:py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309] block mb-2">
            Khứu Giác & Không Gian
          </span>
          <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-brand-burgundy mb-3">
            Chọn Mùi Hương Phù Hợp Từng Khoảnh Khắc
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Mỗi nốt hương mang trong mình một tần số rung cảm riêng biệt, biến đổi năng lượng căn phòng và nuôi dưỡng cảm xúc bên trong.
          </p>
        </div>

        <div className="divide-y divide-stone-200 md:grid md:grid-cols-3 md:gap-8 md:divide-y-0">
          
          {/* Nhóm Gỗ & Hổ Phách */}
          <article className="flex flex-col justify-between py-7 md:rounded-2xl md:border md:border-amber-200/50 md:bg-[#FAF5EE] md:p-8">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#EFE3D3] text-brand-terracotta flex items-center justify-center text-2xl mb-6">
                <i className="ph-fill ph-tree"></i>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B45309] block mb-1">
                Woody & Amber
              </span>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Gỗ Đàn Hương, Tuyết Tùng & Vani
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Ấm áp, trầm tĩnh và đầy chiều sâu. Mang lại cảm giác được chở che, an yên và gắn kết.
              </p>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-stone-700">
                  <i className="ph-bold ph-bed text-stone-400"></i>
                  <span><strong>Không gian:</strong> Phòng ngủ, góc đọc sách đêm.</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <i className="ph-bold ph-moon-stars text-stone-400"></i>
                  <span><strong>Thời điểm:</strong> Buổi tối, những ngày mưa lạnh.</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-amber-200/60">
              <Link to="/shop?category=Nến Hũ Đơn" className="text-xs font-bold text-brand-burgundy sm:hover:text-brand-terracotta inline-flex items-center gap-1.5 group">
                <span>Khám phá nốt hương Gỗ</span>
                <i className="ph-bold ph-arrow-right sm:group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>
          </article>

          {/* Nhóm Hoa Cỏ & Trái Cây */}
          <article className="flex flex-col justify-between py-7 md:rounded-2xl md:border md:border-amber-200/50 md:bg-[#FAF5EE] md:p-8">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#EFE3D3] text-brand-terracotta flex items-center justify-center text-2xl mb-6">
                <i className="ph-fill ph-flower-lotus"></i>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B45309] block mb-1">
                Floral & Botanical
              </span>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Oải Hương, Hoa Nhài & Cam Bergamot
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Thanh tao, tươi mát và tinh khiết. Khơi gợi niềm hứng khởi, xua tan căng thẳng mệt mỏi.
              </p>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-stone-700">
                  <i className="ph-bold ph-armchair text-stone-400"></i>
                  <span><strong>Không gian:</strong> Phòng khách, bàn đón khách, sảnh.</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <i className="ph-bold ph-sun text-stone-400"></i>
                  <span><strong>Thời điểm:</strong> Buổi sáng, tiệc trà cuối tuần.</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-amber-200/60">
              <Link to="/shop?category=Nến Hũ Đơn" className="text-xs font-bold text-brand-burgundy sm:hover:text-brand-terracotta inline-flex items-center gap-1.5 group">
                <span>Khám phá nốt hương Hoa</span>
                <i className="ph-bold ph-arrow-right sm:group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>
          </article>

          {/* Nhóm Thảo Mộc & Trà Trắng */}
          <article className="flex flex-col justify-between py-7 md:rounded-2xl md:border md:border-amber-200/50 md:bg-[#FAF5EE] md:p-8">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#EFE3D3] text-brand-terracotta flex items-center justify-center text-2xl mb-6">
                <i className="ph-fill ph-leaf"></i>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B45309] block mb-1">
                Herbal & Tea
              </span>
              <h3 className="font-serif-display text-xl font-bold text-brand-burgundy mb-3">
                Trà Trắng, Xô Thơm & Bạc Hà
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Mộc mạc, tĩnh tại và thanh sạch. Giúp đầu óc minh mẫn, tập trung cao độ khi học tập và làm việc.
              </p>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-stone-700">
                  <i className="ph-bold ph-desktop text-stone-400"></i>
                  <span><strong>Không gian:</strong> Bàn làm việc, góc thiền định, yoga.</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <i className="ph-bold ph-lightning text-stone-400"></i>
                  <span><strong>Thời điểm:</strong> Giờ làm việc, cần tập trung tư duy.</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-amber-200/60">
              <Link to="/shop?category=Nến Hũ Đơn" className="text-xs font-bold text-brand-burgundy sm:hover:text-brand-terracotta inline-flex items-center gap-1.5 group">
                <span>Khám phá nốt hương Trà</span>
                <i className="ph-bold ph-arrow-right sm:group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>
          </article>

        </div>
      </section>

      {/* 5. SECTION: TÁI SINH HŨ NẾN (UPCYCLING) */}
      <section id="upcycle-candle" className="mx-auto max-w-6xl border-b-8 border-stone-100 px-4 py-12 sm:border-b sm:border-stone-200/60 sm:px-8 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309] block">
              Sống Xanh & Bền Vững
            </span>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-brand-burgundy leading-tight">
              Vòng Đời Mới Cho Chiếc Hũ Sau Khi Nến Tàn
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Mỗi chiếc hũ thủy tinh hổ phách hoặc cốc gốm mộc của Candlet đều được chế tác để có thể tồn tại lâu dài cùng không gian sống của bạn. Đừng vứt đi, hãy trao cho chiếc hũ một công năng mới!
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Rửa Sạch Bằng Nước Ấm</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Đổ nước nóng khoảng 60-70°C vào hũ. Sáp đậu nành tự nhiên sẽ tự động nổi lên trên, sau khi nước nguội chỉ cần vớt sáp ra và rửa lại bằng xà phòng rửa chén.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Gỡ Đế Kim Loại Của Bấc</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Dùng đầu dao nhọn cạy nhẹ miếng dán đế bấc ở đáy cốc, ngâm nước ấm là keo sẽ bong ra sạch sẽ không tì vết.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Biến Hóa Thành Đồ Decor Xinh Xắn</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Chiếc hũ sau khi sạch có thể dùng để trồng cây sen đá nhỏ, cắm cọ trang điểm, đựng bút vẽ hoặc chứa trang sức trên bàn phấn.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <aside className="flex flex-col items-center justify-center space-y-6 border-y border-stone-200 py-8 text-center sm:rounded-3xl sm:border sm:bg-gradient-to-tr sm:from-[#EBE3D5] sm:to-brand-warmIvory sm:p-10 sm:shadow-sm">
              <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center text-4xl text-brand-burgundy">
                <i className="ph-fill ph-plant"></i>
              </div>
              <blockquote className="font-serif-display text-xl sm:text-2xl text-brand-burgundy italic leading-relaxed">
                "Một ngọn nến cháy hết không phải là kết thúc, mà là sự mở đầu cho một mầm xanh bình yên."
              </blockquote>
              <span className="text-xs font-bold text-brand-terracotta uppercase tracking-widest">
                — Triết lý thủ công xanh tại Candlet
              </span>
            </aside>
          </div>

        </div>
      </section>

      {/* 6. SECTION: FAQ ACCORDION (HỎI ĐÁP THƯỜNG GẶP) */}
      <section id="faq-section" className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309] block mb-2">
            Giải Đáp Thắc Mắc
          </span>
          <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-brand-burgundy mb-3">
            Những Câu Hỏi Thường Gặp (FAQ)
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Mọi thắc mắc của bạn về chất liệu sáp, độ an toàn và cách thưởng thức nến thơm trọn vẹn nhất.
          </p>
        </div>

        <div className="divide-y divide-stone-200 border-y border-stone-200 sm:space-y-4 sm:divide-y-0 sm:border-y-0">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="overflow-hidden bg-white transition-all duration-200 sm:rounded-2xl sm:border sm:border-stone-200 sm:shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors sm:hover:bg-stone-50/80 focus:outline-none sm:px-6"
                >
                  <span className="font-serif-display text-base sm:text-lg font-bold text-brand-burgundy">
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'bg-brand-burgundy text-white rotate-180' : 'bg-stone-100 text-stone-600'}`}>
                    <i className="ph-bold ph-caret-down text-sm"></i>
                  </div>
                </button>

                {isOpen && (
                  <div className="animate-in fade-in border-t border-stone-100 pb-6 pt-4 text-sm leading-relaxed text-stone-600 duration-200 sm:px-6 sm:pt-1">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Hotline Box */}
        <aside className="mt-10 flex flex-col items-center justify-between gap-4 border-y border-amber-200/60 py-6 text-center sm:mt-12 sm:flex-row sm:rounded-2xl sm:border sm:bg-[#FAF5EE] sm:p-6">
          <div className="text-left">
            <h4 className="font-serif-display text-lg font-bold text-brand-burgundy">Bạn vẫn còn câu hỏi cần tư vấn?</h4>
            <p className="text-xs text-stone-600 mt-1">Đội ngũ nghệ nhân của Candlet luôn sẵn sàng hỗ trợ bạn bất cứ lúc nào.</p>
          </div>
          <a
            href="tel:0328624761"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider sm:hover:bg-brand-deepWine transition-colors shadow-xs shrink-0"
          >
            <i className="ph-bold ph-phone-call"></i>
            <span>Hotline: 032.862.4761</span>
          </a>
        </aside>
      </section>

      {/* 7. CTA SECTION */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-10">
        <section className="space-y-5 border-y border-amber-200/80 py-10 text-center sm:rounded-3xl sm:border sm:bg-gradient-to-r sm:from-[#FAF5EE] sm:via-[#FFF9F2] sm:to-[#FAF5EE] sm:p-14 sm:shadow-xs">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B45309]">
            Khởi Đầu Hành Trình Thư Thái
          </span>
          <h2 className="font-serif-display text-3xl sm:text-4xl text-brand-burgundy font-bold">
            Sẵn Sàng Tìm Kiếm Mùi Hương Thuộc Về Bạn?
          </h2>
          <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            Ghé thăm thư viện nến thơm Candlet để chọn cho mình một nốt hương ấm áp, mang lại sự thư thái và năng lượng tích cực cho không gian sống.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-brand-burgundy sm:hover:bg-brand-deepWine text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-full transition-all shadow-md sm:hover:scale-105 active:scale-95"
            >
              <i className="ph-bold ph-tote text-base"></i>
              <span>Ghé Thăm Cửa Hàng Nến</span>
            </Link>
          </div>
        </section>
      </div>

    </main>
  );
}
