import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../services/adminService';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ─── Formatting helpers ───
const formatCurrency = (n) => (n || 0).toLocaleString('vi-VN') + ' ₫';

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
  const [filterType, setFilterType] = useState('30'); // '7', '30', '90', 'custom'
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    let params = { days: 30 };
    if (filterType === '7') params = { days: 7 };
    else if (filterType === '30') params = { days: 30 };
    else if (filterType === '90') params = { days: 90 };
    else if (filterType === 'custom') params = { days: 1, endDate: customDate };

    adminService.getDashboardStats(params)
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterType, customDate]);

  // Prepare Pie Chart data
  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Quảng cáo (Ads)', value: data.costStructure.ads, color: '#4F46E5' },
      { name: 'Vận hành & Kho', value: data.costStructure.inventory, color: '#06B6D4' },
      { name: 'Logistics', value: data.costStructure.logistics, color: '#F59E0B' },
    ];
  }, [data]);

  return (
    <Layout>
      <div className="p-lg h-full flex flex-col bg-surface-container-low overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-lg">
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
                <option value="7">1 tuần qua</option>
                <option value="30">1 tháng qua</option>
                <option value="90">3 tháng qua</option>
                <option value="custom">Ngày cụ thể...</option>
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
              onClick={() => window.print()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Xuất báo cáo
            </button>
          </div>
        </div>

        {/* 5 Stat Cards */}
        <div className="grid grid-cols-5 gap-md mb-lg">
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

          {/* Giá trị tồn kho */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-tertiary-container text-[#8b2d00] flex items-center justify-center">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              {!loading && <GrowthBadge value={data?.inventoryGrowth} />}
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Giá trị kho hàng</p>
              <h3 className="text-[24px] font-black text-on-surface">
                {loading ? <div className="h-8 w-32 bg-surface-container rounded animate-pulse" /> : formatCurrency(data?.inventoryValue)}
              </h3>
            </div>
          </div>

          {/* Chi phí quảng cáo */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center">
                <span className="material-symbols-outlined">ads_click</span>
              </div>
              {!loading && <GrowthBadge value={data?.adCostGrowth} />}
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Chi phí quảng cáo</p>
              <h3 className="text-[24px] font-black text-on-surface">
                {loading ? <div className="h-8 w-32 bg-surface-container rounded animate-pulse" /> : formatCurrency(data?.adCost)}
              </h3>
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
        <div className="flex gap-md h-[400px]">

          {/* Bar Chart - So sánh Doanh thu & Chi phí */}
          <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-bold text-on-surface">So sánh Doanh thu & Chi phí</h3>
              <div className="px-3 py-1 bg-surface-container-low border border-outline-variant/50 rounded-lg text-[12px] font-semibold text-on-surface-variant flex items-center gap-1">
                {filterType === 'custom' ? 'Theo ngày' : `${filterType} ngày qua`}
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
                    <Bar dataKey="cost" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Doughnut Chart - Cơ cấu chi phí */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 flex flex-col">
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
      </div>
    </Layout>
  );
}
