import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cups, customPrices, lids, processSteps, productionPolicies,
  scents, shapedCandles, shapedPrices,
} from './customCatalogueData';

const ZALO_URL = 'https://zalo.me/0328624761';

function Eyebrow({ children, light = false }) {
  return (
    <p className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] ${light ? 'text-brand-sand' : 'text-brand-terracotta'}`}>
      <span className={`h-px w-7 ${light ? 'bg-brand-gold' : 'bg-brand-terracotta'}`} />
      {children}
    </p>
  );
}

function PriceTable({ headers, rows, compact = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-sand/80 bg-white">
      <div className={`hidden bg-brand-deepWine px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-brand-warmIvory sm:grid ${headers.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {headers.map((header, index) => <span key={header} className={index ? 'text-right' : ''}>{header}</span>)}
      </div>
      <div className="divide-y divide-brand-sand/70">
        {rows.map(row => (
          <div key={row[0]} className={`grid items-center gap-2 px-4 ${compact ? 'py-3' : 'py-4'} sm:px-5 ${row.length === 3 ? 'grid-cols-[1.2fr_1fr_1fr]' : 'grid-cols-2'}`}>
            {row.map((cell, index) => (
              <div key={cell} className={index ? 'text-right' : ''}>
                {index > 0 && <span className="mb-0.5 block text-[8px] font-bold uppercase tracking-wider text-brand-muted sm:hidden">{headers[index]}</span>}
                <span className={`${index ? 'font-black text-brand-terracotta' : 'font-semibold text-brand-charcoal'} text-[11px] sm:text-sm`}>{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepTitle({ number, title, description, light = false }) {
  return (
    <div className="flex gap-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black ${light ? 'bg-brand-sand text-brand-deepWine' : 'bg-brand-burgundy text-white'}`}>{number}</span>
      <div>
        <h3 className={`text-xl font-black leading-tight tracking-tight sm:text-2xl ${light ? 'text-white' : 'text-brand-burgundy'}`}>{title}</h3>
        <p className={`mt-2 max-w-2xl text-sm leading-6 ${light ? 'text-white/60' : 'text-brand-muted'}`}>{description}</p>
      </div>
    </div>
  );
}

export default function CorporateGifts() {
  const [scentQuery, setScentQuery] = useState('');
  const [showAllScents, setShowAllScents] = useState(false);

  const filteredScents = useMemo(() => {
    const query = scentQuery.trim().toLocaleLowerCase('vi');
    return query ? scents.filter(scent => scent.join(' ').toLocaleLowerCase('vi').includes(query)) : scents;
  }, [scentQuery]);

  const visibleScents = scentQuery || showAllScents ? filteredScents : filteredScents.slice(0, 8);

  return (
    <main className="overflow-hidden bg-brand-warmIvory text-brand-charcoal">
      <section className="relative isolate overflow-hidden bg-brand-deepWine text-white">
        <div className="absolute -right-32 -top-48 -z-10 h-[32rem] w-[32rem] rounded-full bg-brand-terracotta/25 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
          <div className="relative z-10 max-w-4xl">
            <Eyebrow light>Nến thơm custom cho doanh nghiệp</Eyebrow>
            <h1 className="mt-5 max-w-4xl font-serif-display text-4xl font-normal leading-[1.08] tracking-[-.025em] sm:text-6xl lg:text-7xl">Nến thơm mang dấu ấn riêng của doanh nghiệp bạn.</h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">Chọn cốc, nắp, mùi hương, nhãn và bao bì trong một quy trình rõ ràng. Candlet hỗ trợ từ thiết kế mẫu đến sản xuất và bàn giao.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#configure" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-sand px-6 text-xs font-black uppercase tracking-wider text-brand-deepWine transition hover:-translate-y-0.5 hover:bg-white">Bắt đầu chọn cấu hình <i className="ph-bold ph-arrow-down" /></a>
              <a href={ZALO_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-xs font-bold uppercase tracking-wider transition hover:bg-white/10"><i className="ph-bold ph-chat-circle-dots text-lg" /> Trao đổi với Candlet</a>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-40 border-b border-brand-sand/80 bg-brand-cream/95 backdrop-blur" aria-label="Điều hướng trang custom">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-8">
          {[['Cấu hình', '#configure'], ['Bảng giá', '#pricing'], ['Nến tạo hình', '#shaped'], ['Quy trình', '#process'], ['Chính sách', '#policies']].map(([label, href], index) => (
            <a key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider text-brand-burgundy transition hover:bg-white"><span className="text-brand-terracotta">0{index + 1}</span>{label}</a>
          ))}
        </div>
      </nav>

      <section className="border-b border-brand-sand/60 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:grid-cols-3 sm:px-8 sm:py-14">
          {[
            ['ph-buildings', 'Quà tặng doanh nghiệp', 'Đồng bộ nhận diện cho khách hàng, nhân viên và đối tác.'],
            ['ph-calendar-check', 'Sự kiện & workshop', 'Thiết kế theo chủ đề, tên sự kiện và mốc thời gian cụ thể.'],
            ['ph-storefront', 'Thương hiệu & hộ kinh doanh', 'Tạo dòng nến mang nhãn riêng với số lượng linh hoạt.'],
          ].map(([icon, title, text]) => (
            <article key={title} className="flex gap-4 rounded-2xl bg-brand-warmIvory p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-terracotta shadow-sm"><i className={`ph-bold ${icon} text-xl`} /></span><div><h2 className="text-sm font-black text-brand-burgundy">{title}</h2><p className="mt-1.5 text-xs leading-5 text-brand-muted">{text}</p></div></article>
          ))}
        </div>
      </section>

      <section id="configure" className="scroll-mt-20 bg-white px-4 py-14 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div className="max-w-3xl"><Eyebrow>Thiết kế sản phẩm của bạn</Eyebrow><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-brand-burgundy sm:text-5xl">Bốn lựa chọn tạo nên<br className="hidden sm:block" /> một sản phẩm hoàn chỉnh</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-brand-muted sm:text-base">Đi lần lượt từ cốc đến mùi hương. Khi liên hệ, bạn chỉ cần gửi các mã đã chọn để Candlet lên cấu hình và báo giá chính xác.</p></div>
            <div className="rounded-2xl border border-brand-sand bg-brand-cream p-5"><p className="text-[9px] font-black uppercase tracking-[.16em] text-brand-terracotta">Mẫu nội dung gửi Candlet</p><p className="mt-2 text-xs leading-6 text-brand-muted">100 cốc 200 ml · C02 · N02 · Mùi 235 · Nhãn logo 50 × 60 mm · Nhận trước 20/12</p></div>
          </div>

          <div className="mt-10 border-t border-brand-sand/80 sm:mt-14">
            <div className="border-b border-brand-sand/70 py-10 sm:py-14">
              <StepTitle number="01" title="Chọn cốc và dung tích" description="Cốc 200 ml phù hợp quà tặng gọn nhẹ; cốc 300 ml tạo cảm giác đầy đặn hơn. Màu cốc là nền cho toàn bộ thiết kế nhãn." />
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {cups.map(([code, name, , image]) => (
                  <article key={code} className="group border-b border-brand-sand/70 pb-4 transition hover:border-brand-terracotta"><div className="grid aspect-[.9] place-items-center p-3 sm:p-4"><img src={image} alt={`Cốc nến ${name}`} className="h-full max-h-full w-full max-w-full object-contain transition duration-300 group-hover:scale-[1.03]" /></div><div className="px-1 pt-2"><span className="text-[9px] font-black uppercase tracking-widest text-brand-terracotta">{code}</span><h3 className="mt-1 text-xs font-bold sm:text-sm">{name}</h3></div></article>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-brand-warmIvory p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><i className="ph-bold ph-palette mt-0.5 text-xl text-brand-terracotta" /><div><p className="text-sm font-black text-brand-burgundy">Bạn cần một màu khác?</p><p className="mt-1 text-xs leading-5 text-brand-muted">Liên hệ để kiểm tra màu, số lượng tối thiểu và thời gian tùy chỉnh.</p></div></div><a href={ZALO_URL} target="_blank" rel="noreferrer" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-brand-burgundy px-5 text-[10px] font-black uppercase tracking-wider text-brand-burgundy">Yêu cầu màu riêng</a></div>
            </div>

            <div className="grid border-b border-brand-sand/70 lg:grid-cols-[.9fr_1.1fr] lg:gap-12">
              <div className="border-b border-brand-sand/70 py-10 sm:py-14 lg:border-b-0">
                <StepTitle number="02" title="Chọn nắp" description="Nắp hoàn thiện tổng thể và bảo vệ bề mặt nến. Candlet sẽ kiểm tra độ vừa thực tế trước khi xác nhận." />
                <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {lids.map(([code, name, size, image]) => (
                    <article key={code} className="grid grid-cols-[104px_1fr] items-center gap-4 border-b border-brand-sand/70 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:block sm:border-b-0 sm:py-0 lg:grid lg:grid-cols-[120px_1fr] lg:border-b lg:py-4 lg:first:pt-0 lg:last:border-b-0 lg:last:pb-0"><div className="grid aspect-square place-items-center p-2"><img src={image} alt={name} className="h-full max-h-full w-full max-w-full object-contain" /></div><div><span className="text-[9px] font-black uppercase tracking-widest text-brand-terracotta">{code}</span><h3 className="mt-1 text-sm font-black">{name}</h3><p className="mt-1 text-[10px] leading-4 text-brand-muted">{size}</p></div></article>
                  ))}
                </div>
              </div>
              <div className="my-8 rounded-[1.75rem] bg-brand-deepWine p-5 text-white sm:p-8 lg:my-10 lg:p-10">
                <StepTitle number="03" title="Hoàn thiện nhãn & bao bì" description="Từ logo đến hộp quà, mỗi chi tiết được duyệt trước khi đi vào sản xuất." light />
                <div className="mt-8 space-y-5">
                  {[
                    ['Gửi nội dung', 'Logo, tên thương hiệu, lời nhắn, tên sự kiện và file thiết kế nếu đã có.'],
                    ['Chốt quy cách', 'Kích thước nhãn, chất liệu giấy, số màu, hộp quà, thiệp và phụ kiện.'],
                    ['Duyệt thiết kế', 'Candlet gửi thiết kế hoặc mockup để xác nhận trước khi in và sản xuất.'],
                  ].map(([title, text], index) => (
                    <div key={title} className="flex gap-4 border-b border-white/10 pb-5 last:border-0 last:pb-0"><span className="text-lg font-black text-brand-gold">0{index + 1}</span><div><h3 className="text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-white/60">{text}</p></div></div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-xs leading-6 text-white/70">Có thể tùy chỉnh hộp, túi quà, thiệp, nơ và in hoặc khắc trên nắp. Các hạng mục này được báo giá riêng theo mẫu.</div>
              </div>
            </div>

            <div className="py-10 sm:py-14">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <StepTitle number="04" title="Chọn mùi hương" description="Tìm theo mã, tên hoặc tầng hương. Tình trạng nguyên liệu được xác nhận tại thời điểm đặt hàng." />
                <label className="flex h-12 w-full items-center gap-3 rounded-full border border-brand-sand bg-brand-cream px-5 lg:w-96"><i className="ph ph-magnifying-glass text-lg text-brand-terracotta" /><input value={scentQuery} onChange={event => setScentQuery(event.target.value)} placeholder="Tìm mã, tên hoặc nốt hương..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
              </div>
              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {visibleScents.map(([code, name, top, middle, base]) => (
                  <article key={`${code}-${name}`} className="rounded-2xl border border-brand-sand/70 bg-brand-warmIvory p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><span className="text-[9px] font-black uppercase tracking-widest text-brand-terracotta">Mã {code}</span><h3 className="mt-1 text-lg font-black text-brand-burgundy">{name}</h3></div><i className="ph-light ph-flower-lotus text-2xl text-brand-terracotta/60" /></div><dl className="mt-3 space-y-1.5 text-xs leading-5 text-brand-muted"><div className="grid grid-cols-[42px_1fr] gap-2"><dt className="font-black text-brand-charcoal">Đầu</dt><dd>{top}</dd></div><div className="grid grid-cols-[42px_1fr] gap-2"><dt className="font-black text-brand-charcoal">Giữa</dt><dd>{middle}</dd></div><div className="grid grid-cols-[42px_1fr] gap-2"><dt className="font-black text-brand-charcoal">Cuối</dt><dd>{base}</dd></div></dl></article>
                ))}
              </div>
              {visibleScents.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-brand-sand py-10 text-center text-sm text-brand-muted">Không tìm thấy mùi phù hợp.</div>}
              {!scentQuery && filteredScents.length > 8 && (
                <button type="button" onClick={() => setShowAllScents(value => !value)} className="mx-auto mt-7 flex h-11 items-center gap-2 rounded-full border border-brand-burgundy px-6 text-[10px] font-black uppercase tracking-wider text-brand-burgundy transition hover:bg-brand-burgundy hover:text-white">{showAllScents ? 'Thu gọn danh sách' : `Xem đủ ${filteredScents.length} mùi hương`} <i className={`ph-bold ${showAllScents ? 'ph-caret-up' : 'ph-caret-down'}`} /></button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 bg-brand-cream px-4 py-14 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
          <div><Eyebrow>Ngân sách tham khảo</Eyebrow><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-brand-burgundy sm:text-5xl">Số lượng càng lớn,<br /><span className="text-brand-terracotta">đơn giá càng tốt</span></h2><p className="mt-5 text-sm leading-7 text-brand-muted">Bảng giá áp dụng cho nến thành phẩm kèm nhãn custom cơ bản. Sau khi nhận cấu hình, Candlet sẽ xác nhận giá cuối cùng cùng tiến độ sản xuất.</p><div className="mt-7 rounded-2xl bg-white p-5"><p className="text-xs font-black text-brand-burgundy">Để nhận báo giá nhanh, hãy chuẩn bị:</p><div className="mt-4 flex flex-wrap gap-2">{['Số lượng', 'Ngày nhận', 'Mã cốc', 'Mã nắp', 'Mã mùi', 'Nhãn & bao bì'].map(item => <span key={item} className="rounded-full bg-brand-warmIvory px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-brand-muted">{item}</span>)}</div></div></div>
          <div><PriceTable headers={['Số lượng', 'Cốc 200 ml', 'Cốc 300 ml']} rows={customPrices} /><p className="mt-4 text-xs leading-5 text-brand-muted">Giá chưa gồm hộp, túi quà, thiệp, nơ, phụ kiện, vận chuyển và thuế nếu có. Cấu hình đặc biệt có thể phát sinh phụ phí.</p><a href={ZALO_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-burgundy px-6 text-xs font-black uppercase tracking-wider text-white sm:w-auto"><i className="ph-bold ph-chat-circle-dots text-lg" /> Nhận báo giá theo cấu hình</a></div>
        </div>
      </section>

      <section id="shaped" className="scroll-mt-20 bg-white px-4 py-14 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><Eyebrow>Một lựa chọn khác</Eyebrow><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-brand-burgundy sm:text-5xl">Nến tạo hình cho món quà <span className="text-brand-terracotta">thú vị hơn</span></h2></div><p className="max-w-2xl text-sm leading-7 text-brand-muted">06 mẫu lấy cảm hứng từ đồ uống, dùng cốc thủy tinh và nắp bần. Mỗi cốc chứa 180 g nến, phù hợp quà sự kiện và các chiến dịch cần hình ảnh nổi bật.</p></div>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shapedCandles.map(([number, name, color, image]) => (
                <article key={number} className="group overflow-hidden rounded-2xl border border-brand-sand bg-brand-cream"><div className="overflow-hidden"><img src={image} alt={`Nến tạo hình ${name}`} className="aspect-[1.18] w-full object-cover transition duration-500 group-hover:scale-105" /></div><div className="p-3 sm:p-4"><span className="text-[9px] font-black text-brand-terracotta">MẪU {number}</span><h3 className="mt-1 text-sm font-black text-brand-burgundy">{name}</h3><p className="mt-1 text-[10px] text-brand-muted">{color} · 180 g</p></div></article>
              ))}
            </div>
            <div className="lg:sticky lg:top-24 lg:self-start"><PriceTable headers={['Số lượng', 'Đơn giá / cốc']} rows={shapedPrices} compact /><p className="mt-4 text-xs leading-5 text-brand-muted">Cốc cao 95 mm, đường kính 70 mm. Giá chưa gồm nhãn tùy chỉnh, hộp, phụ kiện, vận chuyển và thuế.</p></div>
          </div>
        </div>
      </section>

      <section id="process" className="scroll-mt-20 bg-brand-deepWine px-4 py-14 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl"><div className="max-w-3xl"><Eyebrow light>Quy trình rõ ràng</Eyebrow><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Từ ý tưởng đến thành phẩm</h2><p className="mt-5 text-sm leading-7 text-white/65 sm:text-base">Mỗi mốc đều có nội dung cần xác nhận, giúp hai bên kiểm soát thiết kế, chi phí và tiến độ.</p></div><div className="relative mt-10 grid gap-3 md:grid-cols-5 md:gap-0"><div className="absolute left-[10%] right-[10%] top-5 hidden h-px bg-white/15 md:block" />{processSteps.map(([number, title, text]) => <article key={number} className="relative rounded-2xl border border-white/10 bg-white/[.05] p-5 md:rounded-none md:border-0 md:bg-transparent md:px-4 md:py-0"><span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-brand-gold/50 bg-brand-deepWine text-sm font-black text-brand-gold">{number}</span><h3 className="mt-4 text-sm font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-white/55">{text}</p></article>)}</div></div>
      </section>

      <section id="policies" className="scroll-mt-20 px-4 py-14 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-16"><div><Eyebrow>Chính sách đặt hàng</Eyebrow><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-brand-burgundy sm:text-5xl">Những điều cần biết trước khi xác nhận</h2><p className="mt-5 text-sm leading-7 text-brand-muted">Các điều khoản được thống nhất cùng báo giá để đơn hàng minh bạch từ đầu.</p></div><div className="divide-y divide-brand-sand/80 border-y border-brand-sand/80">
          {[
            ['Thanh toán', 'Đặt cọc 50% khi xác nhận đơn và thanh toán 50% còn lại trước khi bàn giao. Điều kiện riêng của doanh nghiệp được trao đổi trước khi triển khai.'],
            ['Sản xuất & giao hàng', productionPolicies.join(' ')],
            ['Thay đổi & hủy đơn', 'Trước khi duyệt thiết kế, nội dung có thể điều chỉnh theo thỏa thuận. Sau khi in hoặc bắt đầu sản xuất, chi phí phát sinh được đối soát và thống nhất phương án xử lý.'],
            ['Chất lượng & bảo hành', 'Vui lòng kiểm tra hàng khi nhận và thông báo thiếu hàng, vỡ hũ hoặc lỗi trong 48 giờ kèm hình ảnh hoặc video. Candlet sẽ kiểm tra và đưa ra phương án đổi, bù hoặc khắc phục phù hợp.'],
          ].map(([title, text], index) => <article key={title} className="grid gap-3 py-6 sm:grid-cols-[48px_180px_1fr] sm:gap-5"><span className="text-lg font-black text-brand-terracotta">0{index + 1}</span><h3 className="text-sm font-black text-brand-burgundy">{title}</h3><p className="text-xs leading-6 text-brand-muted">{text}</p></article>)}
          </div></div></div>
      </section>

      <section className="px-4 pb-16 sm:px-8 sm:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-brand-burgundy px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-16"><div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-terracotta/35 blur-3xl" /><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-brand-sand">Bắt đầu đơn custom</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Bạn đã có ý tưởng? Candlet giúp bạn hoàn thiện.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Gửi số lượng, ngày cần nhận và các mã lựa chọn. Candlet sẽ tư vấn cấu hình, xác nhận giá và tiến độ.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><a href={ZALO_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-sand px-7 text-xs font-black uppercase tracking-wider text-brand-deepWine"><i className="ph-bold ph-chat-circle-dots text-lg" /> Trao đổi qua Zalo</a><Link to="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-7 text-xs font-bold uppercase tracking-wider">Xem sản phẩm mẫu <i className="ph-bold ph-arrow-right" /></Link></div></div></div>
      </section>
    </main>
  );
}
