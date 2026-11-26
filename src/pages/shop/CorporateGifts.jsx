import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cups, customPrices, lids, processSteps, productionPolicies,
  scents, shapedCandles, shapedPrices,
} from './customCatalogueData';

function PriceTable({ headers, rows }) {
  const columns = headers.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-[0_18px_55px_rgba(74,45,35,.06)] sm:rounded-[1.5rem]">
      <div className={`hidden ${columns} bg-brand-deepWine px-4 py-3 text-[10px] font-black uppercase tracking-[.14em] text-brand-warmIvory sm:grid sm:px-6`}>
        {headers.map(header => <span key={header} className="last:text-right">{header}</span>)}
      </div>
      <div className="divide-y divide-brand-sand/70 sm:hidden">
        {rows.map(row => (
          <div key={row[0]} className="p-4">
            <p className="text-xs font-black text-brand-charcoal">{row[0]}</p>
            <div className={`mt-3 grid ${row.length === 3 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {row.slice(1).map((cell, index) => <div key={cell} className="rounded-xl bg-brand-cream px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-brand-muted">{headers[index + 1]}</p><p className="mt-1 text-sm font-black text-brand-terracotta">{cell}</p></div>)}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block">
        {rows.map((row, index) => (
          <div key={row[0]} className={`grid ${columns} items-center px-4 py-4 text-xs sm:px-6 sm:text-sm ${index < rows.length - 1 ? 'border-b border-stone-100' : ''}`}>
            {row.map((cell, cellIndex) => <span key={cell} className={`${cellIndex === 0 ? 'font-semibold text-stone-600' : 'font-black text-brand-terracotta'} ${cellIndex === row.length - 1 ? 'text-right' : ''}`}>{cell}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CorporateGifts() {
  const [scentQuery, setScentQuery] = useState('');
  const filteredScents = useMemo(() => {
    const query = scentQuery.trim().toLocaleLowerCase('vi');
    return query ? scents.filter(scent => scent.join(' ').toLocaleLowerCase('vi').includes(query)) : scents;
  }, [scentQuery]);

  return (
    <main className="overflow-hidden bg-brand-warmIvory text-brand-charcoal">
      <section className="relative overflow-hidden bg-brand-deepWine text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-brand-terracotta/30 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-brand-gold/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:gap-10 sm:px-8 sm:py-16 lg:min-h-[620px] lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[.22em] text-brand-sand sm:text-[10px] sm:tracking-[.25em]"><span className="h-px w-8 bg-brand-gold sm:w-10" /> Catalogue · 01.11.2026</div>
            <h1 className="mt-4 font-serif-display text-[2.7rem] font-normal leading-[1.02] sm:mt-5 sm:text-6xl lg:text-7xl">Hương riêng.<br /><span className="italic text-brand-sand">Dấu ấn riêng.</span></h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/68 sm:text-base">Nến thơm custom dành cho doanh nghiệp, sự kiện và những món quà mang nhận diện của bạn. Chọn cốc, nắp, mùi hương, nhãn dán và bao bì trong một quy trình rõ ràng.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Từ 20 cốc', '63 mùi hương', '200 ml & 300 ml'].map(item => <span key={item} className="rounded-full border border-white/20 bg-white/8 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-brand-warmIvory sm:px-4 sm:text-[10px]">{item}</span>)}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-sand px-6 text-xs font-black uppercase tracking-wider text-brand-deepWine transition hover:-translate-y-0.5 hover:bg-white"><i className="ph-bold ph-chat-circle-dots text-lg" /> Nhận tư vấn & báo giá</a>
              <a href="#catalogue" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10">Mở tài liệu <i className="ph-bold ph-arrow-down" /></a>
            </div>
          </div>
          <div className="relative mx-auto flex h-[300px] w-full max-w-2xl items-end justify-center sm:h-[430px] lg:h-[480px]">
            <div className="absolute inset-x-4 bottom-0 h-36 rounded-[50%] bg-black/25 blur-2xl sm:h-52" />
            <img src="/custom-catalogue/official/cup-white-frosted.webp" alt="Cốc nến trắng mờ chính thức" className="relative z-10 h-[86%] w-auto object-contain drop-shadow-[0_26px_25px_rgba(0,0,0,.28)]" />
            <img src="/custom-catalogue/official/cup-amber.webp" alt="Cốc nến nâu hổ phách chính thức" className="absolute bottom-0 left-[2%] z-20 h-[65%] w-auto -rotate-2 object-contain drop-shadow-[0_24px_20px_rgba(0,0,0,.3)] sm:left-[8%]" />
            <img src="/custom-catalogue/official/cup-pink-frosted.webp" alt="Cốc nến hồng san hô mờ chính thức" className="absolute bottom-0 right-[2%] z-20 h-[70%] w-auto rotate-2 object-contain drop-shadow-[0_24px_20px_rgba(0,0,0,.3)] sm:right-[5%]" />
            <div className="absolute right-0 top-0 z-30 rounded-2xl border border-white/20 bg-brand-deepWine/80 px-4 py-3 text-right backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[.18em] text-brand-sand">Cốc 200 ml từ</p><p className="mt-1 font-serif-display text-2xl text-white">85.000đ</p></div>
          </div>
        </div>
      </section>

      <nav className="border-b border-brand-sand bg-brand-cream" aria-label="Mục lục catalogue">
        <div className="mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-8 sm:py-4 [&::-webkit-scrollbar]:hidden">
          {[['01', 'Bảng giá', '#catalogue'], ['02', 'Cốc', '#cups'], ['03', 'Nắp & nhãn', '#lids'], ['04', 'Mùi hương', '#scents'], ['05', 'Nến tạo hình', '#shaped'], ['06', 'Quy trình', '#process']].map(([number, label, href]) => <a key={number} href={href} className="flex shrink-0 snap-start items-center gap-2 rounded-full border border-brand-sand bg-white px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-brand-burgundy shadow-sm sm:rounded-none sm:border-0 sm:border-r sm:bg-transparent sm:px-4 sm:py-1 sm:text-[10px] sm:shadow-none sm:first:pl-0 sm:last:border-r-0"><span className="text-brand-terracotta">{number}</span>{label}</a>)}
        </div>
      </nav>

      <div className="mx-auto max-w-[1360px] px-3 py-4 sm:px-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
      <section id="catalogue" className="scroll-mt-24 mx-auto max-w-7xl rounded-[1.5rem] bg-white px-5 py-10 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-brand-terracotta">01 · Nến thơm custom</p>
            <h2 className="mt-3 font-serif-display text-3xl leading-tight text-brand-burgundy sm:text-5xl">Đặt nhiều hơn,<br /><span className="italic text-brand-terracotta">giá tốt hơn</span></h2>
            <p className="mt-5 text-sm leading-7 text-stone-600">Đơn giá tham khảo cho nến thành phẩm có nhãn dán custom cơ bản. Cốc 300 ml tạm tính cao hơn 20.000đ/cốc so với cốc 200 ml ở cùng mức số lượng.</p>
            <div className="mt-6 rounded-2xl border border-brand-sand bg-brand-cream p-5 text-xs leading-6 text-stone-600"><strong className="block text-brand-burgundy">Thông tin để chốt giá</strong>Số lượng · Dung tích · Mẫu cốc / nắp · Mùi hương · Nội dung nhãn · Ngày cần nhận.</div>
          </div>
          <div><PriceTable headers={['Số lượng', 'Cốc 200 ml', 'Cốc 300 ml']} rows={customPrices} /><p className="mt-4 text-xs leading-5 text-stone-500">Giá cuối được xác nhận theo mẫu. Chưa gồm hộp, túi quà, thiệp, nơ, phụ kiện, vận chuyển và thuế (nếu có). Cấu hình đặc biệt có thể phát sinh phụ phí.</p></div>
        </div>
      </section>

      <section id="cups" className="scroll-mt-24 mx-auto max-w-7xl rounded-[1.5rem] bg-white px-5 py-10 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.22em] text-brand-terracotta">02 · Chọn cốc</p><h2 className="mt-3 font-serif-display text-3xl text-brand-burgundy sm:text-5xl">Bảng màu cốc nến</h2><p className="mt-4 text-sm leading-7 text-stone-600">Chọn dung tích 200 ml hoặc 300 ml, sau đó chọn màu cốc. 200 ml và 300 ml là dung tích cốc, không phải khối lượng sáp.</p></div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:grid-cols-4 lg:grid-cols-7">
            {cups.map(([code, name, color, image]) => <article key={code} className="overflow-hidden rounded-2xl border border-brand-sand bg-brand-cream p-2.5 transition sm:hover:-translate-y-1 sm:hover:shadow-lg"><div className="grid h-36 place-items-center overflow-hidden rounded-xl border border-black/5" style={{ background: color }}>{image && <img src={image} alt={`Cốc nến ${name}`} className="h-full w-full object-contain" />}</div><div className="px-1 pb-1"><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-brand-terracotta">{code}</p><h3 className="mt-1 text-xs font-bold text-brand-charcoal sm:text-sm">{name}</h3></div></article>)}
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-brand-sand bg-brand-warmIvory p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-terracotta shadow-sm"><i className="ph-bold ph-palette text-lg" /></span><div><h3 className="text-sm font-black text-brand-burgundy">Bạn cần màu cốc khác?</h3><p className="mt-1 text-xs leading-5 text-brand-muted">Vui lòng liên hệ Candlet để kiểm tra màu, số lượng tối thiểu và thời gian tùy chỉnh.</p></div></div><a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-burgundy px-5 text-[10px] font-black uppercase tracking-wider text-white"><i className="ph-bold ph-chat-circle-dots text-base" /> Liên hệ tùy chỉnh</a></div>
          <p className="mt-4 text-xs leading-5 text-stone-500">Cốc 200 ml là mẫu trong catalogue. Kích thước, màu, nắp và khối lượng nến của cốc 300 ml được xác nhận theo mẫu thực tế; thời gian cháy được xác nhận theo thành phẩm.</p>
        </div>
      </section>

      <section id="lids" className="scroll-mt-24 mx-auto max-w-7xl rounded-[1.5rem] bg-white px-5 py-10 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-brand-terracotta">03 · Nắp & nhãn dán</p><h2 className="mt-3 font-serif-display text-3xl text-brand-burgundy sm:text-5xl">Hoàn thiện từng chi tiết</h2><p className="mt-4 text-sm leading-7 text-stone-600">Chọn nắp phù hợp và thêm nhãn dán mang nhận diện của bạn.</p></div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">{lids.map(([code, name, size, image]) => <article key={code} className="rounded-2xl border border-brand-sand bg-brand-cream p-3 sm:p-4"><img src={image} alt={name} className="aspect-[1.18] w-full rounded-xl bg-white object-cover" /><p className="mt-4 text-[9px] font-black uppercase tracking-widest text-brand-terracotta">{code}</p><div className="mt-1 flex items-end justify-between gap-3"><h3 className="text-sm font-black sm:text-base">{name}</h3><p className="text-[10px] text-stone-500 sm:text-xs">{size}</p></div></article>)}</div>
            <div className="rounded-2xl bg-brand-deepWine p-5 text-white sm:p-6"><p className="text-xs font-black uppercase tracking-[.16em] text-brand-sand">Nhãn dán tùy chỉnh</p><div className="mt-5 grid gap-5 sm:grid-cols-3">{[['01', 'Nội dung của bạn', 'Logo, tên thương hiệu, tên sự kiện, lời nhắn hoặc tên mùi hương.'], ['02', 'Quy cách rõ ràng', 'Thống nhất kích thước, chất liệu, số màu và số mẫu nhãn.'], ['03', 'Duyệt trước khi làm', 'Gửi file logo, duyệt thiết kế và mẫu theo thỏa thuận.']].map(([number, title, text]) => <div key={number}><span className="font-serif-display text-2xl text-brand-gold">{number}</span><h3 className="mt-2 text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-white/65">{text}</p></div>)}</div></div>
            <p className="text-xs leading-5 text-stone-500">Nắp kim loại có màu vàng, bạc và đen. Mẫu 80 mm cần kiểm tra độ vừa với cốc 70 mm trước khi chốt. Tùy chọn thêm: hộp, túi quà, thiệp, nơ, khắc hoặc in trực tiếp lên nắp.</p>
          </div>
        </div>
      </section>

      <section id="scents" className="scroll-mt-24 mx-auto max-w-7xl rounded-[1.5rem] bg-brand-cream px-5 py-10 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.22em] text-brand-terracotta">04 · Chọn mùi hương</p><h2 className="mt-3 font-serif-display text-3xl text-brand-burgundy sm:text-5xl">Thư viện 63 mùi hương</h2><p className="mt-4 text-sm leading-7 text-stone-600">Tìm theo mã, tên mùi hoặc tầng hương. Tình trạng mùi được xác nhận tại thời điểm đặt hàng.</p></div><label className="flex h-12 w-full items-center gap-3 rounded-full border border-brand-sand bg-white px-5 shadow-sm md:w-96"><i className="ph ph-magnifying-glass text-lg text-brand-terracotta" /><input value={scentQuery} onChange={event => setScentQuery(event.target.value)} placeholder="Tìm mã, tên hoặc nốt hương..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>
          <div className="mt-8 flex items-center justify-between border-b border-brand-sand pb-3"><p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Danh mục mùi hương</p><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-brand-burgundy shadow-sm">{filteredScents.length} lựa chọn</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredScents.map(([code, name, top, middle, base]) => <article key={`${code}-${name}`} className="rounded-2xl border border-brand-sand/80 bg-white p-4 shadow-[0_8px_30px_rgba(74,45,35,.035)] sm:p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-brand-terracotta">Mã {code}</p><h3 className="mt-1 font-serif-display text-xl font-bold text-brand-burgundy">{name}</h3></div><i className="ph-light ph-flower-lotus text-2xl text-brand-terracotta/70" /></div><dl className="mt-4 grid gap-2 text-xs leading-5"><div className="grid grid-cols-[42px_1fr] gap-2 sm:grid-cols-[48px_1fr]"><dt className="font-black text-brand-terracotta">Đầu</dt><dd className="text-stone-600">{top}</dd></div><div className="grid grid-cols-[42px_1fr] gap-2 sm:grid-cols-[48px_1fr]"><dt className="font-black text-brand-terracotta">Giữa</dt><dd className="text-stone-600">{middle}</dd></div><div className="grid grid-cols-[42px_1fr] gap-2 sm:grid-cols-[48px_1fr]"><dt className="font-black text-brand-terracotta">Cuối</dt><dd className="text-stone-600">{base}</dd></div></dl></article>)}
          </div>
          {filteredScents.length === 0 && <div className="rounded-2xl border border-dashed border-[#bda998] py-12 text-center text-sm text-stone-500">Không tìm thấy mùi phù hợp.</div>}
        </div>
      </section>

      <section id="shaped" className="scroll-mt-24 mx-auto max-w-7xl rounded-[1.5rem] bg-white px-5 py-10 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-brand-terracotta">05 · Nến tạo hình</p><h2 className="mt-3 font-serif-display text-3xl leading-tight text-brand-burgundy sm:text-5xl">Quà tặng doanh nghiệp <span className="italic text-brand-terracotta">thú vị</span></h2><p className="mt-5 text-sm leading-7 text-stone-600">06 mẫu lấy cảm hứng từ đồ uống, sử dụng cốc thủy tinh và nắp bần. Mỗi cốc có khối lượng nến 180 g.</p></div>
          <div><PriceTable headers={['Số lượng', 'Đơn giá / cốc']} rows={shapedPrices} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{shapedCandles.map(([number, name, color, image]) => <article key={number} className="overflow-hidden rounded-2xl border border-brand-sand bg-white transition sm:hover:-translate-y-1 sm:hover:shadow-lg"><img src={image} alt={`Nến tạo hình ${name}`} className="aspect-[1.2] w-full object-cover" /><div className="p-3 sm:p-4"><p className="text-[9px] font-black text-brand-terracotta">{number}</p><h3 className="mt-1 text-xs font-black sm:text-sm">{name}</h3><p className="mt-1 text-[10px] text-stone-500 sm:text-xs">Màu: {color} · 180 g</p></div></article>)}</div><p className="mt-4 text-xs leading-5 text-stone-500">Cốc cao 95 mm, đường kính 70 mm; khối lượng cả bao bì khoảng 330 g. Đơn giá chưa gồm hộp, túi quà, phụ kiện, vận chuyển, nhãn tùy chỉnh và thuế/VAT.</p></div>
        </div>
      </section>

      <section id="process" className="scroll-mt-24 mx-auto max-w-7xl rounded-[1.5rem] bg-brand-deepWine px-5 py-10 text-white shadow-[0_12px_45px_rgba(52,38,32,.12)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-brand-sand">06 · Quy trình đặt hàng</p><h2 className="mt-3 max-w-2xl font-serif-display text-3xl sm:text-5xl">Từ lựa chọn đến thành phẩm</h2><div className="mt-8 grid gap-3 md:grid-cols-5 md:gap-px md:overflow-hidden md:rounded-2xl md:bg-white/10">{processSteps.map(([number, title, text]) => <article key={number} className="rounded-2xl border border-white/10 bg-white/5 p-5 md:rounded-none md:border-0 md:bg-brand-deepWine"><p className="font-serif-display text-3xl text-brand-gold">{number}</p><h3 className="mt-3 text-sm font-black md:mt-5">{title}</h3><p className="mt-2 text-xs leading-5 text-white/60">{text}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-7xl rounded-[1.5rem] bg-white px-5 py-10 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:rounded-[2rem] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.5rem] border border-brand-sand bg-white p-5 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-warmIvory text-brand-terracotta"><i className="ph-bold ph-package text-xl" /></span><h2 className="font-serif-display text-2xl text-brand-burgundy sm:text-3xl">Thanh toán, sản xuất & giao hàng</h2></div><p className="mt-5 text-sm leading-7 text-stone-600">Thông thường, Candlet đề xuất đặt cọc 50% khi xác nhận đơn và thanh toán 50% còn lại trước khi bàn giao. Yêu cầu riêng về giá, tiến độ và phương thức thanh toán sẽ được thống nhất trước khi triển khai.</p><ul className="mt-5 space-y-3">{productionPolicies.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600"><i className="ph-fill ph-check-circle mt-1 shrink-0 text-brand-terracotta" /><span>{item}</span></li>)}</ul></article>
          <article className="rounded-[1.5rem] border border-brand-sand bg-brand-warmIvory p-5 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-terracotta"><i className="ph-bold ph-shield-check text-xl" /></span><h2 className="font-serif-display text-2xl text-brand-burgundy sm:text-3xl">Thay đổi, hủy đơn & chất lượng</h2></div><div className="mt-5 space-y-4 text-sm leading-6 text-stone-600"><p><strong className="text-brand-burgundy">Trước khi duyệt thiết kế:</strong> Có thể điều chỉnh nội dung theo thỏa thuận.</p><p><strong className="text-brand-burgundy">Sau khi duyệt và đã in:</strong> Các thay đổi phát sinh được báo chi phí riêng.</p><p><strong className="text-brand-burgundy">Sau khi sản xuất:</strong> Không tự động chấp nhận hủy; hai bên đối soát chi phí đã phát sinh và thống nhất phương án.</p><p><strong className="text-brand-burgundy">Khi nhận hàng:</strong> Báo thiếu, vỡ hũ hoặc lỗi trong 48 giờ, kèm hình ảnh/video. Candlet kiểm tra và đổi, bù hoặc khắc phục lỗi thuộc trách nhiệm sản xuất.</p></div></article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-burgundy to-brand-deepWine px-6 py-10 text-white shadow-[0_12px_45px_rgba(52,38,32,.12)] sm:rounded-[2rem] sm:px-10 lg:px-14 lg:py-16"><div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.23em] text-brand-sand">Thông tin cần gửi để chốt cấu hình</p><h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Sẵn sàng tạo dấu ấn riêng?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">Gửi số lượng, ngày cần nhận, dung tích, mã cốc, mã nắp, mã mùi, nội dung nhãn, phụ kiện và địa điểm giao hàng. Candlet sẽ xác nhận giá và tiến độ.</p></div><div className="flex flex-col gap-3 lg:items-end"><a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-sand px-6 text-xs font-black uppercase tracking-wider text-brand-deepWine lg:w-64"><i className="ph-bold ph-chat-circle-dots text-lg" /> Trao đổi qua Zalo</a><Link to="/shop" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-xs font-bold uppercase tracking-wider lg:w-64">Xem sản phẩm mẫu <i className="ph-bold ph-arrow-right" /></Link></div></div></section>
        </div>
      </div>
    </main>
  );
}
