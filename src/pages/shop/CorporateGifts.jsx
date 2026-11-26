import { Link } from 'react-router-dom';

const capabilities = [
  { icon: 'ph-candle', title: 'Chọn sản phẩm', text: 'Lựa chọn mẫu cốc, kiểu nến và mùi hương phù hợp với dịp tặng.' },
  { icon: 'ph-pen-nib', title: 'Thiết kế nhãn riêng', text: 'Cá nhân hóa nhãn, thông điệp và in logo thương hiệu từ 50 hũ.' },
  { icon: 'ph-gift', title: 'Bao bì theo yêu cầu', text: 'Tùy chỉnh hộp quà, thiệp và quy cách đóng gói với báo giá riêng.' },
];

const processSteps = [
  ['01', 'Chọn sản phẩm', 'Chọn mẫu nến, số lượng dự kiến và mục đích sử dụng.'],
  ['02', 'Thống nhất phương án', 'Chốt mùi hương, thiết kế nhãn và quy cách đóng gói.'],
  ['03', 'Nhận báo giá', 'Candlet gửi báo giá chi tiết và thời gian sản xuất dự kiến.'],
  ['04', 'Xác nhận & đặt cọc', 'Hai bên xác nhận đơn hàng và hoàn tất khoản đặt cọc.'],
  ['05', 'Sản xuất & bàn giao', 'Sản phẩm được hoàn thiện, kiểm tra và bàn giao theo kế hoạch.'],
];

const productionPolicies = [
  'Chỉ bắt đầu sản xuất sau khi khách duyệt mẫu, xác nhận báo giá và hoàn tất đặt cọc.',
  'Thời gian sản xuất cụ thể được ghi rõ trong báo giá.',
  'Đơn hàng lớn có thể được chia thành nhiều đợt sản xuất khi cần.',
  'Khách hàng được cập nhật tiến độ trong quá trình sản xuất.',
  'Sản phẩm được kiểm tra số lượng và ngoại quan trước khi đóng gói.',
  'Thời gian giao hàng phụ thuộc địa điểm nhận và đơn vị vận chuyển.',
];

const changePolicies = [
  ['Trước khi duyệt thiết kế', 'Khách hàng có thể điều chỉnh nội dung theo thỏa thuận giữa hai bên.'],
  ['Sau khi duyệt và đã in ấn', 'Mọi thay đổi phát sinh sẽ được kiểm tra và báo chi phí riêng.'],
  ['Sau khi bắt đầu sản xuất', 'Đơn không tự động được chấp nhận hủy; hai bên đối soát chi phí đã phát sinh và thống nhất phương án xử lý.'],
  ['Lỗi từ quá trình sản xuất', 'Candlet kiểm tra và thống nhất phương án khắc phục phù hợp.'],
];

export default function CorporateGifts() {
  return (
    <main className="overflow-hidden bg-[#f8f4ee] text-brand-charcoal">
      <section className="relative border-b border-stone-200 bg-[#281a19] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_18%_18%,#d6a46f_0,transparent_30%),radial-gradient(circle_at_85%_70%,#8f5d55_0,transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-amber-200">
              <i className="ph-fill ph-sparkle" /> Custom & Corporate Gifting
            </div>
            <h1 className="max-w-3xl font-serif-display text-4xl font-normal leading-[1.08] sm:text-6xl lg:text-7xl">
              Quà tặng mang dấu ấn <span className="italic text-[#e9c7a4]">thương hiệu riêng</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
              Candlet đồng hành cùng doanh nghiệp và hộ kinh doanh để tạo nên những hũ nến được cá nhân hóa chỉn chu — từ mùi hương, nhãn thương hiệu đến hộp quà và thiệp gửi tặng.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f2d1ad] px-6 text-xs font-black uppercase tracking-wider text-[#38221f] transition hover:-translate-y-0.5 hover:bg-white">
                <i className="ph-bold ph-chat-circle-dots text-lg" /> Nhận tư vấn & báo giá
              </a>
              <a href="tel:0328624761" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
                <i className="ph-bold ph-phone-call" /> 032.862.4761
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2.5rem] border border-white/10" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#f4ece2] p-3 shadow-2xl shadow-black/25">
              <img src="/hero-banner.png" alt="Nến thơm custom dành cho doanh nghiệp" className="aspect-[4/3] w-full rounded-[1.4rem] object-cover" />
              <div className="absolute inset-x-7 bottom-7 rounded-2xl border border-white/60 bg-white/88 p-4 text-[#38221f] shadow-xl backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b6655]">Bắt đầu từ</p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <p className="font-serif-display text-3xl font-bold">50 hũ</p>
                  <p className="pb-1 text-right text-xs font-semibold text-stone-500">Hỗ trợ nhãn riêng<br />& in logo thương hiệu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-stone-200 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {[
            ['50+', 'Số lượng hỗ trợ custom'],
            ['50 / 50', 'Đặt cọc và thanh toán'],
            ['Theo số lượng', 'Mức giá ưu đãi riêng'],
          ].map(([value, label]) => (
            <div key={label} className="px-3 py-7 text-center sm:py-9">
              <p className="font-serif-display text-3xl font-bold text-[#6f3f36]">{value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[.14em] text-stone-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#a26450]">01 · Chính sách giá & custom</p>
            <h2 className="mt-3 font-serif-display text-3xl leading-tight sm:text-5xl">Linh hoạt theo nhu cầu và ngân sách</h2>
            <p className="mt-5 text-sm leading-7 text-stone-600">
              Giá ưu đãi được áp dụng theo số lượng đặt hàng; số lượng càng lớn, đơn giá càng tốt. Mỗi dòng sản phẩm có bảng giá riêng và sẽ được gửi trong catalogue để doanh nghiệp tham khảo.
            </p>
            <div className="mt-6 rounded-2xl border border-[#e7d8ca] bg-[#fffaf4] p-5">
              <p className="text-xs font-black uppercase tracking-wider text-[#71443a]">Phạm vi custom</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Áp dụng từ 50 hũ. Hộp quà, thiệp và bao bì đặc biệt được khảo sát và báo giá riêng theo thiết kế.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {capabilities.map((item, index) => (
              <article key={item.title} className="group rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-[0_12px_40px_rgba(74,45,35,.05)] transition hover:-translate-y-1 hover:border-[#d8b89c] sm:p-6 lg:flex lg:items-center lg:gap-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f3e4d6] text-xl text-[#79483b]"><i className={`ph-bold ${item.icon}`} /></div>
                <div className="mt-4 lg:mt-0">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b17961]">Tùy chọn {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-1 text-base font-black">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-stone-600">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#efe5d9] px-5 py-14 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#9b624e]">02 · Quy trình đặt hàng</p>
            <h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Từ ý tưởng đến món quà hoàn thiện</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-5">
            {processSteps.map(([number, title, text]) => (
              <article key={number} className="relative rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur">
                <p className="font-serif-display text-3xl font-bold text-[#c79776]">{number}</p>
                <h3 className="mt-5 text-sm font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-stone-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-24">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.8rem] bg-[#382421] p-6 text-white sm:p-8">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><i className="ph-bold ph-credit-card text-xl text-[#efc9a7]" /></span><h2 className="font-serif-display text-2xl sm:text-3xl">Chính sách thanh toán</h2></div>
            <p className="mt-6 text-sm leading-7 text-white/72">Thông thường, Candlet đề xuất đặt cọc 50% khi xác nhận đơn hàng và thanh toán 50% còn lại trước khi bàn giao sản phẩm.</p>
            <p className="mt-4 text-sm leading-7 text-white/72">Với yêu cầu riêng, hai bên sẽ thống nhất chi tiết về giá, tiến độ và phương thức thanh toán trước khi triển khai. Candlet luôn cố gắng tối ưu theo ngân sách để sản phẩm đạt độ chỉn chu và phù hợp nhất.</p>
          </article>

          <article className="rounded-[1.8rem] border border-stone-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3e4d6]"><i className="ph-bold ph-truck text-xl text-[#7b493c]" /></span><h2 className="font-serif-display text-2xl sm:text-3xl">Sản xuất & giao hàng</h2></div>
            <ul className="mt-6 space-y-3">
              {productionPolicies.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600"><i className="ph-fill ph-check-circle mt-1 shrink-0 text-[#a56952]" /><span>{item}</span></li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white px-5 py-14 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#9b624e]">03 · Thay đổi & hủy đơn</p>
            <h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Rõ ràng ở từng giai đoạn</h2>
            <div className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-[#fbf8f4] px-5">
              {changePolicies.map(([title, text]) => <div key={title} className="py-5"><h3 className="text-sm font-black text-[#694038]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-stone-600">{text}</p></div>)}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#9b624e]">04 · Bảo hành & chất lượng</p>
            <h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">An tâm khi nhận hàng</h2>
            <div className="mt-8 overflow-hidden rounded-[1.8rem] bg-[#f0e5d8] p-6 sm:p-8">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-[#754438] shadow-sm"><i className="ph-bold ph-seal-check" /></div>
              <ul className="mt-6 space-y-4 text-sm leading-6 text-stone-700">
                <li>Kiểm tra hàng ngay khi nhận.</li>
                <li>Thông báo thiếu hàng, vỡ hũ hoặc lỗi sản phẩm trong vòng <strong>48 giờ</strong> kể từ khi nhận.</li>
                <li>Cung cấp hình ảnh hoặc video để Candlet xác minh tình trạng.</li>
                <li>Candlet sẽ kiểm tra và đưa ra phương án đổi, bù hoặc khắc phục với lỗi được xác nhận thuộc trách nhiệm của bên sản xuất.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#6f3f36] px-6 py-10 text-center text-white sm:px-12 sm:py-16">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#e7b988]/20 blur-2xl" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#f1cfaa]">Bắt đầu một dự án cùng Candlet</p>
            <h2 className="mt-3 font-serif-display text-3xl sm:text-5xl">Kể Candlet nghe về món quà bạn đang hình dung</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/72">Chia sẻ số lượng, ngân sách và thời gian dự kiến. Candlet sẽ đề xuất phương án sản phẩm và gửi báo giá phù hợp.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="https://zalo.me/0328624761" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-black uppercase tracking-wider text-[#5d352f] hover:bg-[#fff3e8]"><i className="ph-bold ph-chat-circle-dots text-lg" /> Trao đổi ngay</a>
              <Link to="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10">Xem sản phẩm mẫu <i className="ph-bold ph-arrow-right" /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
