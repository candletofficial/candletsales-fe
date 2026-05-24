import Layout from '../components/Layout';

export default function TiktokCalculator() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[70vh] p-lg">
        <div className="text-center w-full max-w-[480px]">
          {/* Icon TikTok */}
          <div className="w-24 h-24 mx-auto mb-6 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.23 8.23 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/>
            </svg>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#fef3c7] text-[#d97706] px-3 py-1.5 rounded-full text-[12px] font-bold mb-4">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            Sắp ra mắt
          </div>

          <h2 className="text-[26px] font-bold text-on-surface mb-3">
            Công cụ tính lợi nhuận TikTok Shop
          </h2>
          <p className="text-[15px] text-on-surface-variant mb-6 leading-relaxed">
            Chúng tôi đang phát triển công cụ phân tích lợi nhuận dành riêng cho nền tảng TikTok Shop.
            Tính năng này sẽ sớm có mặt trong các bản cập nhật tới!
          </p>

          {/* Features preview */}
          <div className="grid grid-cols-2 gap-3 mb-8 text-left">
            {[
              { icon: 'calculate', label: 'Tính phí sàn TikTok chính xác' },
              { icon: 'campaign', label: 'Ước tính phí ADS TikTok' },
              { icon: 'local_shipping', label: 'Phí vận chuyển & đóng gói' },
              { icon: 'analytics', label: 'Báo cáo biên lợi nhuận' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2.5 bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{f.icon}</span>
                <span className="text-[12px] font-medium text-on-surface-variant">{f.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-on-surface-variant/60">
            Trong thời gian chờ đợi, hãy dùng công cụ tính lợi nhuận Shopee của chúng tôi.
          </p>
        </div>
      </div>
    </Layout>
  );
}
