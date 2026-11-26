import {
  cups, customPrices, lids, processSteps, productionPolicies,
  scents, shapedCandles, shapedPrices,
} from './customCatalogueData';

export const CUSTOM_PAGE_CONFIG_KEY = 'custom_page_config';

export const defaultCustomPageConfig = {
  contact: {
    zaloPhone: '0328624761',
    zaloUrl: 'https://zalo.me/0328624761',
    fanpageUrl: 'https://www.facebook.com/candlet.shop',
  },
  hero: {
    eyebrow: 'Nến thơm custom cho doanh nghiệp',
    title: 'Nến thơm mang dấu ấn riêng của doanh nghiệp bạn.',
    description: 'Chọn cốc, nắp, mùi hương, nhãn và bao bì trong một quy trình rõ ràng. Candlet hỗ trợ từ thiết kế mẫu đến sản xuất và bàn giao.',
  },
  introCards: [
    ['ph-buildings', 'Quà tặng doanh nghiệp', 'Đồng bộ nhận diện cho khách hàng, nhân viên và đối tác.'],
    ['ph-calendar-check', 'Sự kiện & workshop', 'Thiết kế theo chủ đề, tên sự kiện và mốc thời gian cụ thể.'],
    ['ph-storefront', 'Thương hiệu & hộ kinh doanh', 'Tạo dòng nến mang nhãn riêng với số lượng linh hoạt.'],
  ],
  configure: {
    eyebrow: 'Thiết kế sản phẩm của bạn',
    title: 'Bốn lựa chọn tạo nên một sản phẩm hoàn chỉnh',
    description: 'Đi lần lượt từ cốc đến mùi hương. Khi liên hệ, bạn chỉ cần gửi các mã đã chọn để Candlet lên cấu hình và báo giá chính xác.',
    sample: '100 cốc 200 ml · C02 · N02 · Mùi 235 · Nhãn logo 50 × 60 mm · Nhận trước 20/12',
    cupTitle: 'Chọn cốc và dung tích',
    cupDescription: 'Cốc 200 ml phù hợp quà tặng gọn nhẹ; cốc 300 ml tạo cảm giác đầy đặn hơn. Màu cốc là nền cho toàn bộ thiết kế nhãn.',
    lidTitle: 'Chọn nắp',
    lidDescription: 'Nắp hoàn thiện tổng thể và bảo vệ bề mặt nến. Candlet sẽ kiểm tra độ vừa thực tế trước khi xác nhận.',
    scentTitle: 'Chọn mùi hương',
    scentDescription: 'Tìm theo mã, tên hoặc tầng hương. Tình trạng nguyên liệu được xác nhận tại thời điểm đặt hàng.',
    otherColorTitle: 'Bạn cần một màu khác?',
    otherColorDescription: 'Liên hệ để kiểm tra màu, số lượng tối thiểu và thời gian tùy chỉnh.',
  },
  packaging: {
    title: 'Hoàn thiện nhãn & bao bì',
    description: 'Từ logo đến hộp quà, mỗi chi tiết được duyệt trước khi đi vào sản xuất.',
    note: 'Có thể tùy chỉnh hộp, túi quà, thiệp, nơ và in hoặc khắc trên nắp. Các hạng mục này được báo giá riêng theo mẫu.',
  },
  packagingSteps: [
    ['Gửi nội dung', 'Logo, tên thương hiệu, lời nhắn, tên sự kiện và file thiết kế nếu đã có.'],
    ['Chốt quy cách', 'Kích thước nhãn, chất liệu giấy, số màu, hộp quà, thiệp và phụ kiện.'],
    ['Duyệt thiết kế', 'Candlet gửi thiết kế hoặc mockup để xác nhận trước khi in và sản xuất.'],
  ],
  pricing: {
    eyebrow: 'Ngân sách tham khảo',
    title: 'Số lượng càng lớn, đơn giá càng tốt',
    description: 'Bảng giá áp dụng cho nến thành phẩm kèm nhãn custom cơ bản. Sau khi nhận cấu hình, Candlet sẽ xác nhận giá cuối cùng cùng tiến độ sản xuất.',
    note: 'Giá chưa gồm hộp, túi quà, thiệp, nơ, phụ kiện, vận chuyển và thuế nếu có. Cấu hình đặc biệt có thể phát sinh phụ phí.',
  },
  shaped: {
    eyebrow: 'Một lựa chọn khác',
    title: 'Nến tạo hình cho món quà thú vị hơn',
    description: '06 mẫu lấy cảm hứng từ đồ uống, dùng cốc thủy tinh và nắp bần. Mỗi cốc chứa 180 g nến, phù hợp quà sự kiện và các chiến dịch cần hình ảnh nổi bật.',
    note: 'Cốc cao 95 mm, đường kính 70 mm. Giá chưa gồm nhãn tùy chỉnh, hộp, phụ kiện, vận chuyển và thuế.',
  },
  process: {
    eyebrow: 'Quy trình rõ ràng',
    title: 'Từ ý tưởng đến thành phẩm',
    description: 'Mỗi mốc đều có nội dung cần xác nhận, giúp hai bên kiểm soát thiết kế, chi phí và tiến độ.',
  },
  policyIntro: {
    eyebrow: 'Chính sách đặt hàng',
    title: 'Những điều cần biết trước khi xác nhận',
    description: 'Các điều khoản được thống nhất cùng báo giá để đơn hàng minh bạch từ đầu.',
  },
  cups,
  lids,
  scents,
  customPrices,
  shapedCandles,
  shapedPrices,
  processSteps,
  productionPolicies,
  policies: [
    ['Thanh toán', 'Đặt cọc 50% khi xác nhận đơn và thanh toán 50% còn lại trước khi bàn giao. Điều kiện riêng của doanh nghiệp được trao đổi trước khi triển khai.'],
    ['Sản xuất & giao hàng', productionPolicies.join(' ')],
    ['Thay đổi & hủy đơn', 'Trước khi duyệt thiết kế, nội dung có thể điều chỉnh theo thỏa thuận. Sau khi in hoặc bắt đầu sản xuất, chi phí phát sinh được đối soát và thống nhất phương án xử lý.'],
    ['Chất lượng & bảo hành', 'Vui lòng kiểm tra hàng khi nhận và thông báo thiếu hàng, vỡ hũ hoặc lỗi trong 48 giờ kèm hình ảnh hoặc video. Candlet sẽ kiểm tra và đưa ra phương án đổi, bù hoặc khắc phục phù hợp.'],
  ],
  cta: {
    eyebrow: 'Bắt đầu đơn custom',
    title: 'Bạn đã có ý tưởng? Candlet giúp bạn hoàn thiện.',
    description: 'Gửi số lượng, ngày cần nhận và các mã lựa chọn. Candlet sẽ tư vấn cấu hình, xác nhận giá và tiến độ.',
  },
};

const clone = value => JSON.parse(JSON.stringify(value));

export function mergeCustomPageConfig(value) {
  const fallback = clone(defaultCustomPageConfig);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return {
    ...fallback,
    ...value,
    contact: { ...fallback.contact, ...(value.contact || {}) },
    hero: { ...fallback.hero, ...(value.hero || {}) },
    configure: { ...fallback.configure, ...(value.configure || {}) },
    packaging: { ...fallback.packaging, ...(value.packaging || {}) },
    pricing: { ...fallback.pricing, ...(value.pricing || {}) },
    shaped: { ...fallback.shaped, ...(value.shaped || {}) },
    process: { ...fallback.process, ...(value.process || {}) },
    policyIntro: { ...fallback.policyIntro, ...(value.policyIntro || {}) },
    cta: { ...fallback.cta, ...(value.cta || {}) },
  };
}
