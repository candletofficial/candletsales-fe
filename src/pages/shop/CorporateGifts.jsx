import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cups, customPrices, lids, processSteps, productionPolicies,
  scents, shapedCandles, shapedPrices,
} from './customCatalogueData';

function PriceTable({ headers, rows }) {
  const columns = headers.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#dfd4c8] bg-white shadow-[0_18px_55px_rgba(74,45,35,.06)]">
      <div className={`grid ${columns} bg-[#3b2925] px-4 py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#f4dfc7] sm:px-6`}>
        {headers.map(header => <span key={header} className="last:text-right">{header}</span>)}
      </div>
      {rows.map((row, index) => (
        <div key={row[0]} className={`grid ${columns} items-center px-4 py-4 text-xs sm:px-6 sm:text-sm ${index < rows.length - 1 ? 'border-b border-stone-100' : ''}`}>
          {row.map((cell, cellIndex) => <span key={cell} className={`${cellIndex === 0 ? 'font-semibold text-stone-600' : 'font-black text-[#6f4036]'} ${cellIndex === row.length - 1 ? 'text-right' : ''}`}>{cell}</span>)}
        </div>
      ))}
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
    <main className="overflow-hidden bg-[#e8e3dc] text-brand-charcoal">
      <section className="relative bg-[#173e34] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative mx-auto grid min-h-[620px] max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.25em] text-[#d8b887]"><span className="h-px w-10 bg-[#d8b887]" /> Catalogue · 01.11.2026</div>
            <h1 className="mt-5 font-serif-display text-5xl font-normal leading-[1.02] sm:text-6xl lg:text-7xl">Hương riêng.<br /><span className="italic text-[#e9cda5]">Dấu ấn riêng.</span></h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/68 sm:text-base">Nến thơm custom dành cho doanh nghiệp, sự kiện và những món quà mang nhận diện của bạn. Chọn cốc, nắp, mùi hương, nhãn dán và bao bì trong một quy trình rõ ràng.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Từ 20 cốc', '63 mùi hương', '200 ml & 300 ml'].map(item => <span key={item} className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[#f2dec2]">{item}</span>)}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f1dfc4] px-6 text-xs font-black uppercase tracking-wider text-[#173e34] transition hover:-translate-y-0.5 hover:bg-white"><i className="ph-bold ph-chat-circle-dots text-lg" /> Nhận tư vấn & báo giá</a>
              <a href="#catalogue" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10">Mở tài liệu <i className="ph-bold ph-arrow-down" /></a>
            </div>
          </div>
          <div className="relative mx-auto flex h-[390px] w-full max-w-2xl items-end justify-center sm:h-[480px]">
            <div className="absolute inset-x-4 bottom-0 h-52 rounded-[50%] bg-black/20 blur-2xl" />
            <img src="/custom-catalogue/official/cup-white-frosted.webp" alt="Cốc nến trắng mờ chính thức" className="relative z-10 h-[82%] w-auto object-contain drop-shadow-[0_26px_25px_rgba(0,0,0,.28)]" />
            <img src="/custom-catalogue/official/cup-amber.webp" alt="Cốc nến nâu hổ phách chính thức" className="absolute bottom-0 left-[2%] z-20 h-[63%] w-auto -rotate-3 object-contain drop-shadow-[0_24px_20px_rgba(0,0,0,.3)] sm:left-[8%]" />
            <img src="/custom-catalogue/official/cup-black-matte.webp" alt="Cốc nến đen mờ chính thức" className="absolute bottom-0 right-[2%] z-20 h-[68%] w-auto rotate-3 object-contain drop-shadow-[0_24px_20px_rgba(0,0,0,.3)] sm:right-[5%]" />
            <div className="absolute right-0 top-0 z-30 border border-white/20 bg-[#173e34]/80 px-4 py-3 text-right backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#d8b887]">Cốc 200 ml từ</p><p className="mt-1 font-serif-display text-2xl text-white">85.000đ</p></div>
          </div>
        </div>
      </section>

      <nav className="border-b border-[#cfc7bd] bg-[#f7f3ed]" aria-label="Mục lục catalogue">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-4 sm:px-8">
          {[['01', 'Bảng giá', '#catalogue'], ['02', 'Cốc', '#cups'], ['03', 'Nắp & nhãn', '#lids'], ['04', 'Mùi hương', '#scents'], ['05', 'Nến tạo hình', '#shaped'], ['06', 'Quy trình', '#process']].map(([number, label, href]) => <a key={number} href={href} className="flex shrink-0 items-center gap-2 border-r border-stone-300 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-[#65463e] first:pl-0 last:border-r-0"><span className="text-[#af7d5f]">{number}</span>{label}</a>)}
        </div>
      </nav>

      <div className="mx-auto max-w-[1360px] px-3 py-6 sm:px-6 sm:py-10">
        <div className="space-y-6">
      <section id="catalogue" className="mx-auto max-w-7xl bg-[#fffdf9] px-5 py-14 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#98614e]">01 · Nến thơm custom</p>
            <h2 className="mt-3 font-serif-display text-3xl leading-tight sm:text-5xl">Đặt nhiều hơn,<br /><span className="italic text-[#855648]">giá tốt hơn</span></h2>
            <p className="mt-5 text-sm leading-7 text-stone-600">Đơn giá tham khảo cho nến thành phẩm có nhãn dán custom cơ bản. Cốc 300 ml tạm tính cao hơn 20.000đ/cốc so với cốc 200 ml ở cùng mức số lượng.</p>
            <div className="mt-6 rounded-2xl border border-[#dfd2c5] bg-[#fffaf4] p-5 text-xs leading-6 text-stone-600"><strong className="block text-[#68443b]">Thông tin để chốt giá</strong>Số lượng · Dung tích · Mẫu cốc / nắp · Mùi hương · Nội dung nhãn · Ngày cần nhận.</div>
          </div>
          <div><PriceTable headers={['Số lượng', 'Cốc 200 ml', 'Cốc 300 ml']} rows={customPrices} /><p className="mt-4 text-xs leading-5 text-stone-500">Giá cuối được xác nhận theo mẫu. Chưa gồm hộp, túi quà, thiệp, nơ, phụ kiện, vận chuyển và thuế (nếu có). Cấu hình đặc biệt có thể phát sinh phụ phí.</p></div>
        </div>
      </section>

      <section id="cups" className="mx-auto max-w-7xl bg-[#fffdf9] px-5 py-14 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:px-10 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#98614e]">02 · Chọn cốc</p><h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Bảng màu cốc nến</h2><p className="mt-4 text-sm leading-7 text-stone-600">Chọn dung tích 200 ml hoặc 300 ml, sau đó chọn màu cốc. 200 ml và 300 ml là dung tích cốc, không phải khối lượng sáp.</p></div>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {cups.map(([code, name, color, image]) => <article key={code} className="border border-stone-200 bg-[#faf8f5] p-3"><div className="grid h-36 place-items-center overflow-hidden border border-black/5" style={{ background: color }}>{image && <img src={image} alt={`Cốc nến ${name}`} className="h-full w-full object-contain" />}</div><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-[#a06c57]">{code}</p><h3 className="mt-1 text-sm font-bold">{name}</h3></article>)}
          </div>
          <p className="mt-5 text-xs leading-5 text-stone-500">Cốc 200 ml là mẫu trong catalogue. Kích thước, màu, nắp và khối lượng nến của cốc 300 ml được xác nhận theo mẫu thực tế; thời gian cháy được xác nhận theo thành phẩm.</p>
        </div>
      </section>

      <section id="lids" className="mx-auto max-w-7xl bg-[#fffdf9] px-5 py-14 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#98614e]">03 · Nắp & nhãn dán</p><h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Hoàn thiện từng chi tiết</h2><p className="mt-4 text-sm leading-7 text-stone-600">Chọn nắp phù hợp và thêm nhãn dán mang nhận diện của bạn.</p></div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">{lids.map(([code, name, size, image]) => <article key={code} className="border border-[#dfd4c8] bg-white p-4"><img src={image} alt={name} className="aspect-[1.18] w-full bg-white object-cover" /><p className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#a06c57]">{code}</p><div className="mt-1 flex items-end justify-between gap-3"><h3 className="text-base font-black">{name}</h3><p className="text-xs text-stone-500">{size}</p></div></article>)}</div>
            <div className="rounded-2xl bg-[#3b2925] p-6 text-white"><p className="text-xs font-black uppercase tracking-[.16em] text-[#e7c39e]">Nhãn dán tùy chỉnh</p><div className="mt-5 grid gap-5 sm:grid-cols-3">{[['01', 'Nội dung của bạn', 'Logo, tên thương hiệu, tên sự kiện, lời nhắn hoặc tên mùi hương.'], ['02', 'Quy cách rõ ràng', 'Thống nhất kích thước, chất liệu, số màu và số mẫu nhãn.'], ['03', 'Duyệt trước khi làm', 'Gửi file logo, duyệt thiết kế và mẫu theo thỏa thuận.']].map(([number, title, text]) => <div key={number}><span className="font-serif-display text-2xl text-[#d6a77e]">{number}</span><h3 className="mt-2 text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-white/65">{text}</p></div>)}</div></div>
            <p className="text-xs leading-5 text-stone-500">Nắp kim loại có màu vàng, bạc và đen. Mẫu 80 mm cần kiểm tra độ vừa với cốc 70 mm trước khi chốt. Tùy chọn thêm: hộp, túi quà, thiệp, nơ, khắc hoặc in trực tiếp lên nắp.</p>
          </div>
        </div>
      </section>

      <section id="scents" className="mx-auto max-w-7xl bg-[#f2ece3] px-5 py-14 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:px-10 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#98614e]">04 · Chọn mùi hương</p><h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Thư viện 63 mùi hương</h2><p className="mt-4 text-sm leading-7 text-stone-600">Tìm theo mã, tên mùi hoặc tầng hương. Tình trạng mùi được xác nhận tại thời điểm đặt hàng.</p></div><label className="flex h-12 w-full items-center gap-3 rounded-full border border-[#c9b8a7] bg-white px-5 md:w-96"><i className="ph ph-magnifying-glass text-lg text-[#8b5a4c]" /><input value={scentQuery} onChange={event => setScentQuery(event.target.value)} placeholder="Tìm mã, tên hoặc nốt hương..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>
          <div className="mt-8 flex items-center justify-between border-b border-[#cdbdad] pb-3"><p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Danh mục mùi hương</p><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#71473e]">{filteredScents.length} lựa chọn</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredScents.map(([code, name, top, middle, base]) => <article key={`${code}-${name}`} className="rounded-2xl border border-white/70 bg-white/72 p-5 shadow-[0_8px_30px_rgba(74,45,35,.035)]"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#a06954]">Mã {code}</p><h3 className="mt-1 font-serif-display text-xl font-bold text-[#3e2b27]">{name}</h3></div><i className="ph-light ph-flower-lotus text-2xl text-[#b88b6e]" /></div><dl className="mt-4 grid gap-2 text-xs leading-5"><div className="grid grid-cols-[48px_1fr] gap-2"><dt className="font-black text-[#8c5a4d]">Đầu</dt><dd className="text-stone-600">{top}</dd></div><div className="grid grid-cols-[48px_1fr] gap-2"><dt className="font-black text-[#8c5a4d]">Giữa</dt><dd className="text-stone-600">{middle}</dd></div><div className="grid grid-cols-[48px_1fr] gap-2"><dt className="font-black text-[#8c5a4d]">Cuối</dt><dd className="text-stone-600">{base}</dd></div></dl></article>)}
          </div>
          {filteredScents.length === 0 && <div className="rounded-2xl border border-dashed border-[#bda998] py-12 text-center text-sm text-stone-500">Không tìm thấy mùi phù hợp.</div>}
        </div>
      </section>

      <section id="shaped" className="mx-auto max-w-7xl bg-[#fffdf9] px-5 py-14 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#98614e]">05 · Nến tạo hình</p><h2 className="mt-3 font-serif-display text-3xl leading-tight sm:text-5xl">Quà tặng doanh nghiệp <span className="italic text-[#855648]">thú vị</span></h2><p className="mt-5 text-sm leading-7 text-stone-600">06 mẫu lấy cảm hứng từ đồ uống, sử dụng cốc thủy tinh và nắp bần. Mỗi cốc có khối lượng nến 180 g.</p></div>
          <div><PriceTable headers={['Số lượng', 'Đơn giá / cốc']} rows={shapedPrices} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{shapedCandles.map(([number, name, color, image]) => <article key={number} className="overflow-hidden border border-stone-200 bg-white"><img src={image} alt={`Nến tạo hình ${name}`} className="aspect-[1.2] w-full object-cover" /><div className="p-4"><p className="text-[9px] font-black text-[#a06954]">{number}</p><h3 className="mt-1 text-sm font-black">{name}</h3><p className="mt-1 text-xs text-stone-500">Màu: {color} · 180 g</p></div></article>)}</div><p className="mt-4 text-xs leading-5 text-stone-500">Cốc cao 95 mm, đường kính 70 mm; khối lượng cả bao bì khoảng 330 g. Đơn giá chưa gồm hộp, túi quà, phụ kiện, vận chuyển, nhãn tùy chỉnh và thuế/VAT.</p></div>
        </div>
      </section>

      <section id="process" className="mx-auto max-w-7xl bg-[#173e34] px-5 py-14 text-white shadow-[0_12px_45px_rgba(52,38,32,.12)] sm:px-10 sm:py-20 lg:px-14"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#deb992]">06 · Quy trình đặt hàng</p><h2 className="mt-3 max-w-2xl font-serif-display text-3xl sm:text-5xl">Từ lựa chọn đến thành phẩm</h2><div className="mt-9 grid gap-px overflow-hidden bg-white/10 md:grid-cols-5">{processSteps.map(([number, title, text]) => <article key={number} className="bg-[#173e34] p-5"><p className="font-serif-display text-3xl text-[#d9a97e]">{number}</p><h3 className="mt-5 text-sm font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-white/60">{text}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-7xl bg-[#fffdf9] px-5 py-14 shadow-[0_12px_45px_rgba(52,38,32,.08)] sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.8rem] border border-stone-200 bg-white p-6 sm:p-8"><h2 className="font-serif-display text-2xl sm:text-3xl">Thanh toán, sản xuất & giao hàng</h2><p className="mt-5 text-sm leading-7 text-stone-600">Thông thường, Candlet đề xuất đặt cọc 50% khi xác nhận đơn và thanh toán 50% còn lại trước khi bàn giao. Yêu cầu riêng về giá, tiến độ và phương thức thanh toán sẽ được thống nhất trước khi triển khai.</p><ul className="mt-5 space-y-3">{productionPolicies.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600"><i className="ph-fill ph-check-circle mt-1 shrink-0 text-[#9b6551]" /><span>{item}</span></li>)}</ul></article>
          <article className="rounded-[1.8rem] border border-stone-200 bg-[#eee4d8] p-6 sm:p-8"><h2 className="font-serif-display text-2xl sm:text-3xl">Thay đổi, hủy đơn & chất lượng</h2><div className="mt-5 space-y-4 text-sm leading-6 text-stone-600"><p><strong className="text-[#5f3c34]">Trước khi duyệt thiết kế:</strong> Có thể điều chỉnh nội dung theo thỏa thuận.</p><p><strong className="text-[#5f3c34]">Sau khi duyệt và đã in:</strong> Các thay đổi phát sinh được báo chi phí riêng.</p><p><strong className="text-[#5f3c34]">Sau khi sản xuất:</strong> Không tự động chấp nhận hủy; hai bên đối soát chi phí đã phát sinh và thống nhất phương án.</p><p><strong className="text-[#5f3c34]">Khi nhận hàng:</strong> Báo thiếu, vỡ hũ hoặc lỗi trong 48 giờ, kèm hình ảnh/video. Candlet kiểm tra và đổi, bù hoặc khắc phục lỗi thuộc trách nhiệm sản xuất.</p></div></article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl bg-[#75483d] px-6 py-12 text-white shadow-[0_12px_45px_rgba(52,38,32,.12)] sm:px-10 lg:px-14 lg:py-16"><div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.23em] text-[#f0cda7]">Thông tin cần gửi để chốt cấu hình</p><h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Sẵn sàng tạo dấu ấn riêng?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">Gửi số lượng, ngày cần nhận, dung tích, mã cốc, mã nắp, mã mùi, nội dung nhãn, phụ kiện và địa điểm giao hàng. Candlet sẽ xác nhận giá và tiến độ.</p></div><div className="flex flex-col gap-3 lg:items-end"><a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-black uppercase tracking-wider text-[#5b382f] lg:w-64"><i className="ph-bold ph-chat-circle-dots text-lg" /> Trao đổi qua Zalo</a><Link to="/shop" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-xs font-bold uppercase tracking-wider lg:w-64">Xem sản phẩm mẫu <i className="ph-bold ph-arrow-right" /></Link></div></div></section>
        </div>
      </div>
    </main>
  );
}
