import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONTACT = {
  phoneDisplay: '032.862.4761',
  phoneHref: 'tel:0328624761',
  email: 'candlet.official@gmail.com',
};

const privacySections = [
  {
    id: 'pham-vi',
    title: 'Phạm vi áp dụng',
    content: (
      <>
        <p>
          Chính sách này giải thích cách Candlet thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân khi bạn truy cập website, mua hàng, liên hệ tư vấn hoặc tương tác với Candlet qua Fanpage, Messenger và các kênh chính thức khác.
        </p>
        <p>
          Khi cung cấp thông tin cho Candlet, bạn xác nhận đã đọc chính sách này và đồng ý để thông tin được xử lý cho các mục đích được nêu dưới đây. Nếu bạn cung cấp thông tin của người nhận quà hoặc người khác, bạn cần bảo đảm mình có quyền cung cấp thông tin đó.
        </p>
      </>
    ),
  },
  {
    id: 'du-lieu-thu-thap',
    title: 'Thông tin Candlet có thể thu thập',
    content: (
      <ul>
        <li><strong>Thông tin nhận diện và liên hệ:</strong> họ tên, số điện thoại, email, tên tài khoản mạng xã hội.</li>
        <li><strong>Thông tin giao nhận:</strong> địa chỉ nhận hàng, người nhận, ghi chú giao hàng và nội dung lời nhắn quà tặng.</li>
        <li><strong>Thông tin đơn hàng:</strong> sản phẩm, số lượng, giá trị đơn, mã ưu đãi, trạng thái thanh toán, lịch sử hỗ trợ và đổi trả.</li>
        <li><strong>Thông tin thanh toán:</strong> phương thức thanh toán, trạng thái và mã tham chiếu giao dịch. Candlet không yêu cầu hoặc lưu mật khẩu ngân hàng, mã OTP hay toàn bộ thông tin thẻ thanh toán của bạn.</li>
        <li><strong>Dữ liệu kỹ thuật:</strong> địa chỉ IP, loại thiết bị, trình duyệt, nhật ký truy cập, cookie và thao tác trên website trong phạm vi cần thiết để vận hành, bảo mật và cải thiện trải nghiệm.</li>
        <li><strong>Nội dung bạn chủ động gửi:</strong> tin nhắn, phản hồi, đánh giá, hình ảnh, tệp thiết kế tem hoặc yêu cầu làm nến custom.</li>
      </ul>
    ),
  },
  {
    id: 'muc-dich',
    title: 'Mục đích sử dụng thông tin',
    content: (
      <ul>
        <li>Tư vấn sản phẩm, xác nhận, xử lý, giao và hỗ trợ đơn hàng.</li>
        <li>Thiết kế, sản xuất và duyệt mẫu đối với sản phẩm custom theo yêu cầu của khách hàng.</li>
        <li>Quản lý tài khoản, giỏ hàng, danh sách yêu thích, bảo hành, đổi trả và chăm sóc sau bán.</li>
        <li>Phòng ngừa gian lận, bảo vệ tài khoản, bảo đảm an toàn hệ thống và giải quyết khiếu nại.</li>
        <li>Phân tích hiệu quả vận hành, cải thiện sản phẩm, nội dung và trải nghiệm trên website.</li>
        <li>Gửi thông tin ưu đãi khi bạn đã đồng ý nhận; bạn có thể từ chối bất cứ lúc nào.</li>
        <li>Thực hiện nghĩa vụ kế toán, thuế và các yêu cầu hợp pháp từ cơ quan có thẩm quyền.</li>
      </ul>
    ),
  },
  {
    id: 'fanpage',
    title: 'Dữ liệu từ Fanpage và Messenger',
    content: (
      <>
        <p>
          Khi bạn bình luận, nhắn tin hoặc đặt hàng qua Fanpage, Candlet có thể nhận những thông tin bạn công khai hoặc chủ động chia sẻ, như tên tài khoản, nội dung hội thoại, số điện thoại và thông tin giao hàng. Candlet chỉ dùng các dữ liệu này để phản hồi, tư vấn, xử lý đơn và hỗ trợ khách hàng.
        </p>
        <p>
          Facebook và Messenger do Meta vận hành nên hoạt động của bạn trên các nền tảng này còn chịu sự điều chỉnh bởi chính sách của Meta. Candlet không kiểm soát cách Meta thu thập hoặc xử lý dữ liệu ngoài phạm vi Candlet trực tiếp nhận được.
        </p>
      </>
    ),
  },
  {
    id: 'chia-se',
    title: 'Chia sẻ thông tin với bên thứ ba',
    content: (
      <>
        <p>Candlet không mua bán hoặc cho thuê thông tin cá nhân. Thông tin chỉ được chia sẻ trong phạm vi cần thiết với:</p>
        <ul>
          <li>Đơn vị vận chuyển, thanh toán, lưu trữ dữ liệu, chăm sóc khách hàng và nhà cung cấp kỹ thuật phục vụ việc vận hành.</li>
          <li>Đối tác sản xuất hoặc thiết kế khi cần hoàn thành sản phẩm custom, với lượng thông tin tối thiểu cần thiết.</li>
          <li>Cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp, hoặc khi cần bảo vệ quyền và lợi ích hợp pháp của Candlet, khách hàng và cộng đồng.</li>
        </ul>
        <p>Candlet yêu cầu các bên cung cấp dịch vụ chỉ sử dụng dữ liệu đúng mục đích công việc và áp dụng biện pháp bảo mật phù hợp.</p>
      </>
    ),
  },
  {
    id: 'cookie',
    title: 'Cookie và công nghệ tương tự',
    content: (
      <p>
        Website có thể sử dụng cookie để duy trì đăng nhập, ghi nhớ giỏ hàng, lưu tùy chọn, đo lường hoạt động và phát hiện truy cập bất thường. Bạn có thể chặn hoặc xóa cookie trong trình duyệt; một số tính năng như đăng nhập hoặc giỏ hàng có thể hoạt động không đầy đủ sau khi cookie bị tắt.
      </p>
    ),
  },
  {
    id: 'luu-tru',
    title: 'Thời gian lưu trữ và bảo mật',
    content: (
      <>
        <p>
          Candlet lưu thông tin trong thời gian cần thiết để hoàn thành các mục đích nêu trong chính sách, giải quyết yêu cầu của khách hàng và đáp ứng nghĩa vụ pháp lý, kế toán hoặc thuế. Sau thời hạn cần thiết, dữ liệu sẽ được xóa, ẩn danh hoặc hạn chế truy cập theo quy trình phù hợp.
        </p>
        <p>
          Candlet áp dụng các biện pháp kỹ thuật và quản trị hợp lý như phân quyền truy cập, bảo vệ tài khoản và sao lưu dữ liệu. Không có phương thức truyền hoặc lưu trữ trực tuyến nào an toàn tuyệt đối; nếu phát hiện sự cố có nguy cơ ảnh hưởng đến dữ liệu, Candlet sẽ xử lý và thông báo theo quy định áp dụng.
        </p>
      </>
    ),
  },
  {
    id: 'quyen',
    title: 'Quyền của bạn đối với dữ liệu cá nhân',
    content: (
      <>
        <p>Tùy trường hợp và quy định áp dụng, bạn có thể yêu cầu Candlet:</p>
        <ul>
          <li>Xác nhận, xem, cập nhật hoặc sửa thông tin cá nhân không chính xác.</li>
          <li>Rút lại sự đồng ý nhận nội dung tiếp thị.</li>
          <li>Hạn chế xử lý, xóa dữ liệu hoặc phản đối một hoạt động xử lý cụ thể.</li>
          <li>Giải thích cách thông tin được sử dụng và tiếp nhận khiếu nại liên quan đến quyền riêng tư.</li>
        </ul>
        <p>
          Candlet có thể cần xác minh danh tính trước khi xử lý yêu cầu. Một số dữ liệu phải tiếp tục được lưu khi đơn hàng đang thực hiện, có tranh chấp hoặc pháp luật yêu cầu.
        </p>
      </>
    ),
  },
  {
    id: 'tre-em',
    title: 'Thông tin của trẻ em',
    content: (
      <p>
        Dịch vụ của Candlet không chủ đích thu thập thông tin từ trẻ em dưới 16 tuổi. Người dưới 16 tuổi cần có sự đồng ý và giám sát của cha mẹ hoặc người giám hộ khi cung cấp thông tin hay đặt hàng.
      </p>
    ),
  },
  {
    id: 'cap-nhat',
    title: 'Cập nhật chính sách',
    content: (
      <p>
        Candlet có thể điều chỉnh chính sách để phù hợp với hoạt động thực tế hoặc quy định hiện hành. Phiên bản mới sẽ được đăng tại trang này và ghi rõ ngày cập nhật. Những thay đổi quan trọng sẽ được thông báo qua kênh phù hợp khi cần thiết.
      </p>
    ),
  },
];

const copyrightSections = [
  {
    id: 'chu-so-huu',
    title: 'Chủ sở hữu nội dung',
    content: (
      <p>
        Trừ khi có ghi chú khác, Candlet là chủ sở hữu hoặc bên được phép sử dụng hợp pháp các nội dung do Candlet công bố trên website, Fanpage và các kênh chính thức. Việc một nội dung xuất hiện công khai không đồng nghĩa với việc từ bỏ quyền sở hữu hoặc cho phép sử dụng không giới hạn.
      </p>
    ),
  },
  {
    id: 'pham-vi-bao-ho',
    title: 'Tài sản được bảo hộ',
    content: (
      <ul>
        <li>Tên thương hiệu Candlet, logo, dấu hiệu nhận diện, khẩu hiệu và hệ thống hình ảnh thương hiệu.</li>
        <li>Ảnh, video, đồ họa, minh họa, thiết kế tem, bao bì, catalogue và tài liệu truyền thông do Candlet tạo ra.</li>
        <li>Bài viết, mô tả sản phẩm, câu chuyện mùi hương, nội dung mạng xã hội, hướng dẫn và tài liệu đào tạo.</li>
        <li>Giao diện, bố cục, thành phần thiết kế và mã nguồn do Candlet sở hữu hoặc được cấp quyền sử dụng.</li>
        <li>Các tác phẩm và cách thể hiện sáng tạo khác đủ điều kiện bảo hộ theo quy định hiện hành.</li>
      </ul>
    ),
  },
  {
    id: 'su-dung-duoc-phep',
    title: 'Cách sử dụng được phép',
    content: (
      <>
        <p>Bạn có thể:</p>
        <ul>
          <li>Xem, lưu liên kết hoặc chia sẻ nguyên đường dẫn đến nội dung chính thức của Candlet cho mục đích cá nhân, phi thương mại.</li>
          <li>Trích dẫn một phần ngắn để giới thiệu, đánh giá hoặc thảo luận, với điều kiện ghi rõ nguồn Candlet và gắn liên kết đến nội dung gốc.</li>
          <li>Sử dụng tài liệu khi đã có sự đồng ý bằng văn bản của Candlet và tuân thủ đúng phạm vi được chấp thuận.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'hanh-vi-khong-duoc-phep',
    title: 'Hành vi không được phép',
    content: (
      <ul>
        <li>Sao chép, đăng lại, bán, cấp phép lại hoặc khai thác thương mại nội dung của Candlet khi chưa được chấp thuận.</li>
        <li>Dùng hình ảnh, video, mô tả hoặc thiết kế của Candlet để quảng cáo hay bán sản phẩm của bên khác.</li>
        <li>Chỉnh sửa logo, xóa tên nguồn, cắt watermark hoặc tạo nội dung gây hiểu nhầm rằng có liên kết hay bảo chứng từ Candlet.</li>
        <li>Mạo danh Candlet, lập trang, tài khoản, tên miền hoặc gian hàng có dấu hiệu nhận diện dễ gây nhầm lẫn.</li>
        <li>Thu thập tự động, sao chép hàng loạt hoặc xây dựng kho dữ liệu từ website nếu chưa có sự cho phép.</li>
      </ul>
    ),
  },
  {
    id: 'noi-dung-khach-hang',
    title: 'Nội dung do khách hàng cung cấp',
    content: (
      <>
        <p>
          Khách hàng vẫn giữ quyền đối với hình ảnh, tệp thiết kế, lời nhắn hoặc nội dung do mình tạo và gửi cho Candlet. Candlet chỉ sử dụng các nội dung này trong phạm vi cần thiết để tư vấn, thiết kế, sản xuất và hoàn thành đơn hàng.
        </p>
        <p>
          Candlet chỉ đăng lại hình ảnh, phản hồi hoặc sản phẩm custom cho mục đích truyền thông khi đã được khách hàng đồng ý hoặc khi nội dung đã được gửi công khai kèm quyền chia sẻ phù hợp. Khách hàng chịu trách nhiệm bảo đảm tệp mình cung cấp không xâm phạm quyền của bên thứ ba.
        </p>
      </>
    ),
  },
  {
    id: 'ben-thu-ba',
    title: 'Nội dung và nhãn hiệu của bên thứ ba',
    content: (
      <p>
        Tên, logo, hình ảnh hoặc dịch vụ của bên thứ ba xuất hiện trên website thuộc về chủ sở hữu tương ứng và chỉ được sử dụng cho mục đích nhận diện, tích hợp dịch vụ hoặc theo giấy phép. Việc xuất hiện đó không mặc nhiên tạo quan hệ đại diện, tài trợ hay bảo chứng giữa Candlet và bên thứ ba.
      </p>
    ),
  },
  {
    id: 'bao-cao-vi-pham',
    title: 'Báo cáo hành vi xâm phạm',
    content: (
      <>
        <p>Nếu cho rằng nội dung trên kênh của Candlet xâm phạm quyền của bạn, vui lòng gửi:</p>
        <ul>
          <li>Thông tin liên hệ của chủ thể quyền hoặc người đại diện hợp pháp.</li>
          <li>Mô tả tài sản được bảo hộ và tài liệu chứng minh quyền sở hữu hoặc quyền đại diện.</li>
          <li>Đường dẫn, ảnh chụp và mô tả vị trí nội dung bị cho là vi phạm.</li>
          <li>Tuyên bố rằng thông tin cung cấp là chính xác và yêu cầu xử lý cụ thể.</li>
        </ul>
        <p>Candlet sẽ xác minh, phản hồi và áp dụng biện pháp phù hợp trong thời gian hợp lý.</p>
      </>
    ),
  },
  {
    id: 'xu-ly',
    title: 'Xử lý vi phạm',
    content: (
      <p>
        Candlet có quyền yêu cầu gỡ bỏ, chấm dứt sử dụng, cải chính, bồi thường thiệt hại hoặc áp dụng các biện pháp hợp pháp khác khi phát hiện quyền sở hữu trí tuệ bị xâm phạm. Việc Candlet chưa xử lý ngay một trường hợp không được hiểu là từ bỏ bất kỳ quyền nào.
      </p>
    ),
  },
  {
    id: 'cap-nhat',
    title: 'Hiệu lực và cập nhật',
    content: (
      <p>
        Tuyên bố này có hiệu lực từ ngày 28/11/2026 và có thể được cập nhật để phản ánh thay đổi về tài sản thương hiệu hoặc quy định hiện hành. Phiên bản mới nhất luôn được công bố tại trang này.
      </p>
    ),
  },
];

const pageConfigs = {
  privacy: {
    eyebrow: 'Tin cậy & minh bạch',
    title: 'Chính sách quyền riêng tư',
    intro: 'Candlet tôn trọng quyền riêng tư và chỉ sử dụng thông tin của bạn cho những mục đích rõ ràng, cần thiết để mang đến trải nghiệm mua sắm và chăm sóc khách hàng tốt hơn.',
    icon: 'ph-shield-check',
    description: 'Cách Candlet thu thập, sử dụng và bảo vệ dữ liệu cá nhân của khách hàng.',
    sections: privacySections,
  },
  copyright: {
    eyebrow: 'Tài sản thương hiệu',
    title: 'Tuyên bố quyền sở hữu và quyền tác giả',
    intro: 'Tuyên bố này xác định quyền đối với nội dung, thiết kế và tài sản thương hiệu của Candlet, đồng thời hướng dẫn cách sử dụng đúng và báo cáo hành vi xâm phạm.',
    icon: 'ph-copyright',
    description: 'Phạm vi sở hữu, quyền sử dụng và quy trình tiếp nhận báo cáo vi phạm.',
    sections: copyrightSections,
  },
};

export default function LegalPage({ type }) {
  const page = pageConfigs[type] || pageConfigs.privacy;

  useEffect(() => {
    const selector = 'meta[name="description"]';
    const meta = document.querySelector(selector) || document.createElement('meta');
    const previousContent = meta.getAttribute('content');
    const wasConnected = meta.isConnected;

    meta.setAttribute('name', 'description');
    meta.setAttribute('content', page.description);
    if (!wasConnected) document.head.appendChild(meta);

    return () => {
      if (!wasConnected) meta.remove();
      else if (previousContent) meta.setAttribute('content', previousContent);
    };
  }, [page.description]);

  return (
    <main className="min-h-screen bg-[#FBF7F2] font-jakarta text-stone-800 selection:bg-brand-burgundy selection:text-white">
      <header className="relative overflow-hidden border-b border-[#E8DDD3] bg-[#2B0C10] text-white">
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/4 h-80 w-80 rounded-full bg-[#A14E3B]/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:py-24">
          <nav className="mb-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-300" aria-label="Đường dẫn trang">
            <Link to="/" className="transition-colors hover:text-amber-200">Trang chủ</Link>
            <i className="ph-bold ph-caret-right text-[9px] text-amber-300/70" />
            <span className="text-amber-200">Thông tin pháp lý</span>
          </nav>

          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200 backdrop-blur-sm">
              <i className={`ph-bold ${page.icon} text-sm`} />
              {page.eyebrow}
            </div>
            <h1 className="font-serif-display text-3xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-200 sm:text-base sm:leading-8">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-300">
              <span className="inline-flex items-center gap-2"><i className="ph ph-calendar-blank text-amber-300" /> Cập nhật ngày 28/11/2026</span>
              <span className="inline-flex items-center gap-2"><i className="ph ph-storefront text-amber-300" /> Áp dụng cho website và các kênh chính thức của Candlet</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[#E6D8CB] bg-white p-5 shadow-[0_12px_40px_rgba(67,32,22,0.05)]">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A14E3B]">
              <i className="ph-bold ph-list" /> Nội dung chính
            </p>
            <nav className="space-y-0.5" aria-label="Mục lục">
              {page.sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`} className="group flex items-start gap-3 rounded-lg px-2 py-2 text-xs font-semibold leading-5 text-stone-600 transition-colors hover:bg-[#FBF7F2] hover:text-brand-burgundy">
                  <span className="mt-0.5 font-mono text-[10px] text-stone-400 group-hover:text-[#A14E3B]">{String(index + 1).padStart(2, '0')}</span>
                  <span>{section.title}</span>
                </a>
              ))}
              <a href="#lien-he" className="group flex items-start gap-3 rounded-lg px-2 py-2 text-xs font-semibold leading-5 text-stone-600 transition-colors hover:bg-[#FBF7F2] hover:text-brand-burgundy">
                <span className="mt-0.5 font-mono text-[10px] text-stone-400 group-hover:text-[#A14E3B]">{String(page.sections.length + 1).padStart(2, '0')}</span>
                <span>Thông tin liên hệ</span>
              </a>
            </nav>
          </div>
        </aside>

        <article className="overflow-hidden rounded-2xl border border-[#E6D8CB] bg-white shadow-[0_18px_55px_rgba(67,32,22,0.06)]">
          <div className="divide-y divide-[#EEE4DC] px-5 sm:px-9">
            {page.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 py-8 sm:py-10">
                <div className="mb-4 flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6EBE2] font-serif-display text-sm font-bold text-[#8F3A31]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="pt-1 font-serif-display text-xl font-bold leading-snug text-brand-burgundy sm:text-2xl">
                    {section.title}
                  </h2>
                </div>
                <div className="legal-copy pl-0 text-sm leading-7 text-stone-600 sm:pl-[3.25rem] sm:text-[15px] sm:leading-8">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          <section id="lien-he" className="scroll-mt-24 border-t border-[#E6D8CB] bg-gradient-to-br from-[#F8EEE6] to-[#FFF9F2] p-5 sm:p-9">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A14E3B]">Liên hệ Candlet</span>
                <h2 className="mt-2 font-serif-display text-2xl font-bold text-brand-burgundy">Bạn cần giải đáp hoặc gửi yêu cầu?</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
                  Vui lòng nêu rõ nội dung cần hỗ trợ và thông tin giúp Candlet xác minh yêu cầu. Chúng tôi sẽ phản hồi qua kênh liên hệ bạn đã cung cấp.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 text-sm font-bold">
                <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-[#D8C2B2] bg-white px-4 text-brand-burgundy transition-colors hover:border-[#A14E3B]">
                  <i className="ph-bold ph-envelope-simple text-lg text-[#A14E3B]" />
                  {CONTACT.email}
                </a>
                <a href={CONTACT.phoneHref} className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-[#D8C2B2] bg-white px-4 text-brand-burgundy transition-colors hover:border-[#A14E3B]">
                  <i className="ph-bold ph-phone text-lg text-[#A14E3B]" />
                  {CONTACT.phoneDisplay}
                </a>
              </div>
            </div>
          </section>
        </article>
      </div>

      <style>{`
        .legal-copy p + p { margin-top: 1rem; }
        .legal-copy ul { margin: 0.75rem 0 0; display: grid; gap: 0.65rem; }
        .legal-copy li { position: relative; padding-left: 1.25rem; }
        .legal-copy li::before { content: ''; position: absolute; left: 0; top: 0.75rem; width: 0.35rem; height: 0.35rem; border-radius: 999px; background: #B76A4F; }
        .legal-copy strong { color: #3F2722; font-weight: 700; }
      `}</style>
    </main>
  );
}
