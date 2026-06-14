import React from 'react';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 ₫';
  return Math.round(amount).toLocaleString('vi-VN') + ' ₫';
};

const formatPercent = (percent) => {
  if (percent === undefined || percent === null) return '0%';
  return percent.toFixed(1) + '%';
};

export default function DetailedAnalysisModal({ isOpen, onClose, data, periodLabel }) {
  if (!isOpen || !data) return null;

  // Tính toán các chỉ số phái sinh
  const totalRevenue = data.totalRevenue || 0;
  const totalOrders = data.newOrders || 0; // Đã bao gồm mọi đơn
  const returnedOrders = data.returnedOrders || 0;
  
  // Đơn hoàn thành (Thực tế tạo ra doanh thu)
  const completedOrders = Math.max(0, totalOrders - returnedOrders);
  
  // AOV: Doanh thu trung bình trên mỗi đơn hoàn thành
  const aov = completedOrders > 0 ? totalRevenue / completedOrders : 0;
  
  const cogs = data.cogs || 0;
  const adCost = data.adCost || 0;
  const returnCost = data.returnCost || 0;
  const logisticsCost = data.logisticsCost || 0;
  const replacementCost = data.replacementCost || 0;
  const replacementOrders = data.replacementOrders || 0;
  const seedingCost = data.seedingCost || 0;
  const realProfit = data.realProfit || 0;
  
  // Margin
  const profitMargin = totalRevenue > 0 ? (realProfit / totalRevenue) * 100 : 0;
  
  // Chi phí QC / Đơn
  const adCostPerOrder = totalOrders > 0 ? adCost / totalOrders : 0;

  const returnRate = data.returnRate || 0;
  const inventoryValue = data.inventoryValue || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-[20px] font-black text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">query_stats</span>
              Phân tích chi tiết hiệu quả kinh doanh
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1 font-medium">
              Kỳ báo cáo: <span className="font-bold text-primary">{periodLabel}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Nhóm 1: Doanh số & Sản lượng */}
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                Doanh số & Đơn hàng
              </h3>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30">
                <p className="text-[12px] text-on-surface-variant font-semibold mb-1">Tổng Doanh Thu</p>
                <p className="text-[22px] font-black text-primary">{formatCurrency(totalRevenue)}</p>
                <p className="text-[11px] text-on-surface-variant mt-1">Chỉ tính các đơn giao thành công</p>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[12px] text-on-surface-variant font-semibold mb-1">Tổng Đơn</p>
                  <p className="text-[18px] font-bold text-on-surface">{totalOrders}</p>
                </div>
                <div>
                  <p className="text-[12px] text-on-surface-variant font-semibold mb-1">Bị Hoàn</p>
                  <p className="text-[18px] font-bold text-[#d97706]">{returnedOrders}</p>
                </div>
                <div>
                  <p className="text-[12px] text-on-surface-variant font-semibold mb-1">Giao Bù</p>
                  <p className="text-[18px] font-bold text-error">{replacementOrders}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30 bg-primary-container/20 border-primary/20">
                <p className="text-[12px] text-primary font-bold mb-1">AOV (Giá trị TB / Đơn)</p>
                <p className="text-[18px] font-black text-primary">{formatCurrency(aov)}</p>
              </div>
            </div>

            {/* Nhóm 2: Cấu trúc Chi phí */}
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                Cấu trúc Chi phí
              </h3>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[13px] text-on-surface-variant font-semibold">Giá trị xuất kho (COGS)</p>
                  <p className="text-[15px] font-bold text-[#8b2d00]">{formatCurrency(cogs)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[13px] text-on-surface-variant font-semibold">Chi phí quảng cáo</p>
                  <p className="text-[15px] font-bold text-[#dc2626]">{formatCurrency(adCost)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[13px] text-on-surface-variant font-semibold">Chi phí vận chuyển (Ship)</p>
                  <p className="text-[15px] font-bold text-secondary">{formatCurrency(logisticsCost)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[13px] text-on-surface-variant font-semibold">Thiệt hại hoàn hàng</p>
                  <p className="text-[15px] font-bold text-[#d97706]">{formatCurrency(returnCost)}</p>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
                  <p className="text-[13px] text-error font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">local_shipping</span> 
                    Chi phí Đơn giao bù
                  </p>
                  <p className="text-[15px] font-black text-error">{formatCurrency(replacementCost)}</p>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
                  <p className="text-[13px] text-[#7c3aed] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">campaign</span> 
                    Chi phí Đơn Seeding
                  </p>
                  <p className="text-[15px] font-black text-[#7c3aed]">{formatCurrency(seedingCost)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30 bg-error-container/20 border-error/20">
                <p className="text-[12px] text-error font-bold mb-1">CP Quảng cáo / Đơn (CAC)</p>
                <p className="text-[18px] font-black text-error">{formatCurrency(adCostPerOrder)}</p>
              </div>
            </div>

            {/* Nhóm 3: Hiệu quả & Tồn kho */}
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
                Hiệu quả Lợi nhuận
              </h3>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#059669]/30 bg-[#d1fae5]/30">
                <p className="text-[12px] text-[#059669] font-bold mb-1 uppercase tracking-wider">Lợi Nhuận Ròng (Tiền Mặt)</p>
                <p className={`text-[24px] font-black ${realProfit >= 0 ? 'text-[#059669]' : 'text-error'}`}>
                  {formatCurrency(realProfit)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-md text-[12px] font-bold ${profitMargin >= 0 ? 'bg-[#059669] text-white' : 'bg-error text-white'}`}>
                    Biên LN: {formatPercent(profitMargin)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-on-surface-variant font-semibold mb-1">Tỉ lệ Hoàn Đơn</p>
                  <p className="text-[18px] font-bold text-[#d97706]">{formatPercent(returnRate)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-on-surface-variant font-semibold mb-1">Giá Trị Tồn Kho</p>
                  <p className="text-[15px] font-bold text-on-surface mt-1">{formatCurrency(inventoryValue)}</p>
                </div>
              </div>

            </div>
          </div>
          
          {/* Note / Giải thích */}
          <div className="mt-6 bg-secondary-container/20 border border-secondary-container/50 rounded-xl p-4 text-[12px] text-on-surface-variant">
            <h4 className="font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">info</span> Ghi chú thuật toán:
            </h4>
            <ul className="list-disc list-inside space-y-1.5 opacity-80">
              <li><strong>Doanh thu</strong>: Chỉ cộng dồn từ những đơn hàng có trạng thái "Hoàn thành". Đơn bị hoàn, Đơn giao bù và Đơn Seeding không được tính vào doanh thu.</li>
              <li><strong>Lợi nhuận ròng</strong>: Bằng Doanh thu trừ đi toàn bộ Cấu trúc chi phí (Giá trị xuất kho + Quảng cáo + Phí ship + Hoàn hàng + Đơn giao bù + Đơn Seeding).</li>
              <li><strong>AOV (Average Order Value)</strong>: Giá trị trung bình mang lại trên mỗi đơn hàng giao thành công.</li>
              <li><strong>CP Quảng cáo / Đơn</strong>: Giúp đo lường chi phí Marketing trung bình bỏ ra để chốt được 1 đơn hàng trong kỳ.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
