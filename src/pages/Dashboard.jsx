import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../services/adminService';
import DetailedAnalysisModal from '../components/DetailedAnalysis';
import OrderAnalysisModal from '../components/OrderAnalysis';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { exportDashboardToPDF } from '../utils/pdfExport';

// ─── Formatting helpers ───
const formatCurrency = (n) => Math.round(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫';

const GrowthBadge = ({ value }) => {
  if (value == null || value === 0) return null; // Don't show if 0 or null
  const isPositive = value > 0;
  const colorClass = isPositive ? 'text-[#059669]' : 'text-[#dc2626]';
  const icon = isPositive ? 'trending_up' : 'trending_down';

  return (
    <div className={`flex items-center gap-1 text-[13px] font-bold ${colorClass}`}>
      <span className="material-symbols-outlined text-[16px] leading-none">{icon}</span>
      <span>{Math.abs(value)}%</span>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('this_month');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showOrderAnalysis, setShowOrderAnalysis] = useState(false);
  const [refreshingActivities, setRefreshingActivities] = useState(false);

  const getPeriodLabel = () => {
    if (filterType === 'today') return 'Hôm nay';
    if (filterType === 'this_week') return 'Tuần này';
    if (filterType === 'this_month') return 'Tháng này';
    if (filterType === 'this_year') return 'Năm nay';
    if (filterType === 'custom') return `Ngày ${new Date(customDate || Date.now()).toLocaleDateString('vi-VN')}`;
    return 'Tùy chỉnh';
  };

  const fetchData = React.useCallback(() => {
    setLoading(true);
    let params = { days: 30 };
    const now = new Date();
    
    if (filterType === 'today') {
      params = { days: 1 };
    } else if (filterType === 'this_week') {
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const days = dayOfWeek === 0 ? 7 : dayOfWeek;
      params = { days };
    } else if (filterType === 'this_month') {
      params = { days: now.getDate() };
    } else if (filterType === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      // diff in ms -> days. If today is Jan 1st, diff is 0, days should be 1.
      const days = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
      params = { days };
    } else if (filterType === 'custom') {
      params = { days: 1, endDate: customDate };
    }

    adminService.getDashboardStats(params)
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterType, customDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshActivities = () => {
    setRefreshingActivities(true);
    adminService.getRecentActivities()
      .then(res => {
        setData(prev => ({
          ...prev,
          recentActivities: res.data.data.recentActivities,
          recentOrders: res.data.data.recentOrders
        }));
      })
      .catch(console.error)
      .finally(() => setRefreshingActivities(false));
  };

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Quảng cáo (Ads)', value: data.costStructure.ads, color: '#4F46E5' },
      { name: 'Vận hành & Kho', value: data.costStructure.inventory, color: '#06B6D4' },
      { name: 'Logistics & Hoàn hàng', value: data.costStructure.logistics, color: '#F59E0B' },
    ];
  }, [data]);

  return (
    <Layout>
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h1 className="text-[24px] font-bold text-on-surface">Tổng quan hệ thống</h1>
            <p className="text-on-surface-variant text-[14px]">Chào mừng trở lại! Dưới đây là hoạt động kinh doanh hôm nay.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center bg-white border border-outline-variant/50 rounded-lg shadow-sm pr-2">
              <div className="pl-3 pr-2 py-2 flex items-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              </div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-transparent py-2 pr-3 text-[13px] font-semibold text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="today">Hôm nay</option>
                <option value="this_week">Tuần này</option>
                <option value="this_month">Tháng này</option>
                <option value="this_year">Năm nay</option>
                <option value="custom">Tuỳ chỉnh</option>
              </select>
              {filterType === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="bg-transparent py-1.5 pr-3 text-[13px] font-semibold text-on-surface focus:outline-none border-l border-outline-variant/30 pl-3 ml-1"
                />
              )}
            </div>
            <button
              onClick={() => setShowAnalysis(true)}
              className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg text-[13px] font-bold flex items-center gap-2 hover:bg-secondary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              Phân tích chi tiết
            </button>
            <button
              onClick={() => setShowOrderAnalysis(true)}
              className="px-4 py-2 bg-[#eef2ff] text-[#4f46e5] rounded-lg text-[13px] font-bold flex items-center gap-2 hover:bg-[#4f46e5] hover:text-white transition-colors border border-[#4f46e5]/20"
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              Phân tích Đơn hàng
            </button>
            <button
              onClick={async () => {
                setIsExporting(true);
                await exportDashboardToPDF(data, getPeriodLabel());
                setIsExporting(false);
              }}
              disabled={isExporting}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-opacity ${
                isExporting ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed' : 'bg-primary text-white hover:opacity-90'
              }`}>
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">download</span>
              )}
              {isExporting ? 'Đang tạo...' : 'Xuất báo cáo'}
            </button>
          </div>
        </div>

        {/* Detailed Analysis Modal */}
        <DetailedAnalysisModal 
          isOpen={showAnalysis} 
          onClose={() => setShowAnalysis(false)} 
          data={data} 
          periodLabel={getPeriodLabel()} 
        />
        {/* Order Analysis Modal */}
        <OrderAnalysisModal
          isOpen={showOrderAnalysis}
          onClose={() => setShowOrderAnalysis(false)}
          data={data}
          periodLabel={getPeriodLabel()}
        />

        {/* 4 Stat Cards - 1 row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
          {/* Doanh thu */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">payments</span>
              </div>
              {!loading && <GrowthBadge value={data?.revenueGrowth} />}
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tổng Doanh Thu</p>
              <h3 className="text-[24px] font-black text-on-surface">
                {loading ? <div className="h-8 w-32 bg-surface-container rounded animate-pulse" /> : formatCurrency(data?.totalRevenue)}
              </h3>
            </div>
          </div>

          {/* Đơn hàng mới */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined">shopping_bag</span>
              </div>
              {!loading && <GrowthBadge value={data?.ordersGrowth} />}
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Số đơn hàng mới</p>
              <h3 className="text-[24px] font-black text-on-surface">
                {loading ? <div className="h-8 w-20 bg-surface-container rounded animate-pulse" /> : `${data?.newOrders} đơn`}
              </h3>
            </div>
          </div>

          {/* Đơn hàng bị hoàn */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
                <span className="material-symbols-outlined">assignment_return</span>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Đơn bị hoàn</p>
              <h3 className="text-[24px] font-black text-[#d97706]">
                {loading ? <div className="h-8 w-20 bg-surface-container rounded animate-pulse" /> : `${data?.returnedOrders || 0} đơn`}
              </h3>
              {!loading && (
                <p className="text-[12px] font-bold text-on-surface-variant mt-1">
                  Tỉ lệ: {data?.returnRate || 0}% · Phí: {formatCurrency(data?.returnCost || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Lợi nhuận thực tế */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined">savings</span>
              </div>
              {!loading && <GrowthBadge value={data?.realProfitGrowth} />}
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Lợi nhuận thực tế</p>
              <h3 className="text-[24px] font-black text-on-surface" style={{ color: data?.realProfit < 0 ? '#dc2626' : undefined }}>
                {loading ? <div className="h-8 w-32 bg-surface-container rounded animate-pulse" /> : formatCurrency(data?.realProfit)}
              </h3>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div id="chart-revenue-container" className="flex gap-md h-[400px] mb-lg shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30">

          {/* Bar Chart - So sánh Doanh thu & Chi phí */}
          <div className="flex-[2] flex flex-col pr-4 border-r border-outline-variant/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
              <h3 className="text-[16px] font-bold text-on-surface">So sánh Doanh thu & Chi phí</h3>
              <div className="px-3 py-1 bg-surface-container-low border border-outline-variant/50 rounded-lg text-[12px] font-semibold text-on-surface-variant flex items-center gap-1">
                {getPeriodLabel()}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
                      tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : val} dx={-10} />
                    <RechartsTooltip
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '13px' }}
                      formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Doanh thu' : 'Chi phí']}
                      labelStyle={{ color: '#374151', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }}
                      formatter={(value) => value === 'revenue' ? 'Doanh thu' : 'Chi phí'} />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Doughnut Chart - Cơ cấu chi phí */}
          <div className="flex-1 flex flex-col pl-4">
            <h3 className="text-[16px] font-bold text-on-surface mb-2">Cơ cấu chi phí</h3>

            <div className="flex-1 min-h-0 relative flex items-center justify-center">
              {loading ? (
                <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="85%"
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [`${value.toFixed(1)}%`]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Tổng</span>
                    <span className="text-[20px] font-black text-on-surface">100%</span>
                  </div>
                </>
              )}
            </div>

            {/* Custom Legend */}
            {!loading && (
              <div className="mt-4 space-y-3">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[13px] font-bold text-on-surface-variant">{item.name}</span>
                    </div>
                    <span className="text-[14px] font-black text-on-surface">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Recent Activities & Newest Orders Row */}
        <div className="flex flex-col lg:flex-row gap-md pb-lg shrink-0">
          
          {/* Recent Activities */}
          <div className="lg:w-[32%] bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-bold text-on-surface">Hoạt động gần đây</h3>
              <button 
                onClick={handleRefreshActivities}
                disabled={refreshingActivities}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${refreshingActivities ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 bg-surface-container rounded-full animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-container rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-surface-container rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.recentActivities?.length > 0 ? (
                data.recentActivities.map((act, idx) => {
                  let icon, color, bgColor;
                  if (act.type === 'order') {
                    icon = 'shopping_cart'; color = '#1e40af'; bgColor = '#eff6ff'; // primary blue
                  } else if (act.type === 'import') {
                    icon = 'inventory_2'; color = '#059669'; bgColor = '#ecfdf5'; // emerald
                  } else if (act.type === 'inventory_check') {
                    icon = 'fact_check'; color = '#8b5cf6'; bgColor = '#f5f3ff'; // purple
                  } else if (act.type === 'out_of_stock') {
                    icon = 'error'; color = '#dc2626'; bgColor = '#fef2f2'; // red
                  } else if (act.type === 'deposit') {
                    icon = 'account_balance_wallet'; color = '#059669'; bgColor = '#ecfdf5'; // emerald
                  } else if (act.type === 'withdraw') {
                    icon = 'payments'; color = '#2563eb'; bgColor = '#dbeafe'; // blue
                  } else if (act.type === 'payment') {
                    icon = 'receipt_long'; color = '#dc2626'; bgColor = '#fef2f2'; // red
                  } else if (act.type === 'expense') {
                    icon = 'local_atm'; color = '#ea580c'; bgColor = '#ffedd5'; // orange
                  } else if (act.type === 'fund') {
                    icon = 'sync'; color = '#4f46e5'; bgColor = '#e0e7ff'; // indigo
                  } else {
                    icon = 'warning'; color = '#d97706'; bgColor = '#fef3c7'; // amber
                  }

                  return (
                    <div key={idx} className="flex gap-4 relative">
                      {idx !== data.recentActivities.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-[-24px] w-[2px] bg-outline-variant/30 -translate-x-1/2" />
                      )}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ backgroundColor: bgColor, color }}>
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-[14px] font-bold text-on-surface" dangerouslySetInnerHTML={{ __html: act.title.replace(/(#[A-Z0-9-]+)/g, '<span style="color:#1e40af">$1</span>') }}></p>
                        <p className="text-[13px] text-on-surface-variant mt-0.5">{act.subtitle}</p>
                        {act.detail && <p className="text-[13px] font-bold mt-0.5">{act.detail}</p>}
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1.5">
                          {new Date(act.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-70">
                  <span className="material-symbols-outlined text-[40px] mb-2">history</span>
                  <p className="text-[13px]">Không có hoạt động nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Newest Orders */}
          <div className="lg:w-[68%] bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-bold text-on-surface">15 đơn hàng mới nhất</h3>
              <a href="/orders" className="group text-[13px] font-bold text-primary flex items-center gap-0.5">
                <span className="group-hover:underline">Xem tất cả</span>
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
              </a>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                    <th className="py-3 px-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider rounded-tl-lg">Mã đơn</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Khách hàng</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Ngày đặt</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Giá trị</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-center rounded-tr-lg">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12">
                        <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                      </td>
                    </tr>
                  ) : data?.recentOrders?.length > 0 ? (
                    data.recentOrders.map(o => (
                      <tr key={o._id} className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low/30 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-bold text-primary text-[14px]">#{o.orderId || o._id.toString().slice(-4).toUpperCase()}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-on-surface text-[14px]">
                            {o.source ? 'Khách từ ' + o.source.charAt(0).toUpperCase() + o.source.slice(1) : 'Khách hàng'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[13px] text-on-surface-variant">
                            {new Date(o.ordered_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-black text-on-surface text-[14px]">{formatCurrency(o.total_price)}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {(() => {
                            const st = o.status || 'completed';
                            if (st === 'completed') return <span className="bg-[#d1fae5] text-[#059669] px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">Hoàn thành</span>;
                            if (st === 'returned') return <span className="bg-[#fef2f2] text-[#dc2626] px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">Hoàn trả</span>;
                            if (st === 'pending') return <span className="bg-[#fef3c7] text-[#d97706] px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">Chờ xử lý</span>;
                            return <span className="bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">{st}</span>;
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-[13px] text-on-surface-variant">Không có đơn hàng nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </Layout>
  );
}
