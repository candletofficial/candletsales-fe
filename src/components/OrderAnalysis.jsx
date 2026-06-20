import React, { useState, useMemo } from 'react';

const fmt = (n) => Math.round(n || 0).toLocaleString('vi-VN') + ' ₫';
const fmtPct = (n) => (n || 0).toFixed(1) + '%';
const fmtNum = (n) => (n || 0).toLocaleString('vi-VN');

const PLATFORM_META = {
  shopee:    { label: 'Shopee',    color: '#ee4d2d', bg: '#fff1ee', icon: '🛒' },
  tiktok:    { label: 'TikTok',    color: '#000000', bg: '#f3f3f3', icon: '🎵' },
  facebook:  { label: 'Facebook',  color: '#1877f2', bg: '#eef4ff', icon: '📘' },
  instagram: { label: 'Instagram', color: '#e1306c', bg: '#fff0f5', icon: '📸' },
  youtube:   { label: 'YouTube',   color: '#ff0000', bg: '#fff0f0', icon: '▶️' },
  website:    { label: 'Website',    color: '#4285f4', bg: '#f0f5ff', icon: '🌐' },
  'khác':    { label: 'Khác',      color: '#6b7280', bg: '#f3f4f6', icon: '📦' },
};

function PlatformBar({ platform, maxRevenue }) {
  const meta = PLATFORM_META[platform.source] || PLATFORM_META['khác'];
  const pct = maxRevenue > 0 ? (platform.revenue / maxRevenue) * 100 : 0;
  const totalOrders = platform.orders + platform.returned + platform.replacements;
  const returnRate = totalOrders > 0 ? (platform.returned / totalOrders * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-4 border border-outline-variant/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[20px]">{meta.icon}</span>
          <span className="font-bold text-[15px] text-on-surface">{meta.label}</span>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="font-semibold text-on-surface-variant">{fmtNum(platform.orders)} đơn</span>
          {platform.returned > 0 && (
            <span className="bg-[#fef3c7] text-[#d97706] px-2 py-0.5 rounded-full font-bold">
              {fmtNum(platform.returned)} hoàn ({fmtPct(returnRate)})
            </span>
          )}
          {platform.replacements > 0 && (
            <span className="bg-[#fee2e2] text-[#dc2626] px-2 py-0.5 rounded-full font-bold">
              {fmtNum(platform.replacements)} bù
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-surface-container-low rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: meta.color }}
          />
        </div>
        <span className="font-black text-[14px] text-on-surface w-36 text-right">{fmt(platform.revenue)}</span>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { key: 'totalRevenue', label: 'Doanh thu' },
  { key: 'totalQty', label: 'Số lượng bán' },
  { key: 'grossMargin', label: 'Biên lãi gộp' },
  { key: 'netMargin', label: 'Biên lãi thực (sau Ads)' },
  { key: 'returnedQty', label: 'Số lượng hoàn' },
  { key: 'returnRate', label: 'Tỉ lệ hoàn' },
];

function MarginBar({ value, max, color }) {
  const pct = max > 0 ? Math.max(0, (value / max)) * 100 : 0;
  return (
    <div className="flex-1 bg-surface-container-low rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function ProductTable({ products, sortKey }) {
  const [expandedKeys, setExpandedKeys] = useState({});
  const toggleExpand = (key) => setExpandedKeys(prev => ({...prev, [key]: !prev[key]}));

  const maxRevenue = Math.max(...products.map(p => p.totalRevenue), 1);
  const maxGrossMargin = Math.max(...products.map(p => p.grossMargin), 1);
  const maxNetMargin = Math.max(...products.map(p => Math.abs(p.netMargin)), 1);

  return (
    <div className="space-y-3">
      {products.map((p, idx) => {
        const itemKey = p.productId || idx;
        const isExpanded = !!expandedKeys[itemKey];
        const hasVariants = p.variants && p.variants.length > 0 && (p.variants.length > 1 || p.variants[0].sku_id);

        return (
        <div key={itemKey} className="bg-white rounded-2xl p-5 border border-outline-variant/30 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4 min-w-[280px]">
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black flex-shrink-0 shadow-inner
                ${idx === 0 ? 'bg-gradient-to-br from-[#fef08a] to-[#f59e0b] text-white shadow-[#f59e0b]/30' : 
                  idx === 1 ? 'bg-gradient-to-br from-[#e5e7eb] to-[#9ca3af] text-white shadow-[#9ca3af]/30' : 
                  idx === 2 ? 'bg-gradient-to-br from-[#fed7aa] to-[#ea580c] text-white shadow-[#ea580c]/30' : 
                  'bg-surface-container-low text-on-surface-variant border border-outline-variant/50'}`}>
                {idx + 1}
              </div>
              {/* Ảnh sản phẩm */}
              <div className="relative">
                {p.product_image ? (
                  <img src={p.product_image} alt={p.product_name} className="w-14 h-14 rounded-xl object-cover border border-outline-variant/20 flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-container to-primary/20 flex items-center justify-center text-primary font-black text-[18px] flex-shrink-0 shadow-sm">
                    {(p.product_name || '?').charAt(0)}
                  </div>
                )}
                {p.returnedQty > 0 && (
                  <div className="absolute -top-2 -right-2 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border-2 border-white" title="Có hàng hoàn">
                    !
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px] text-on-surface line-clamp-2 leading-tight">{p.product_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[12px] text-on-surface-variant font-mono bg-surface-container-low w-fit px-2 py-0.5 rounded-md">{p.productId}</p>
                  {hasVariants && (
                    <button 
                      onClick={() => toggleExpand(itemKey)}
                      className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                    >
                      {isExpanded ? 'Thu gọn phân loại' : `Xem ${p.variants.length} phân loại`}
                      <span className="material-symbols-outlined text-[14px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full border-t md:border-t-0 md:border-l border-outline-variant/30 pt-4 md:pt-0 md:pl-4 mt-2 md:mt-0">
              {/* Doanh thu */}
              <div className="bg-surface-container-low/50 rounded-xl p-3">
                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Doanh thu</p>
                <p className="text-[16px] font-black text-primary mb-2">{fmt(p.totalRevenue)}</p>
                <MarginBar value={p.totalRevenue} max={maxRevenue} color="#6366f1" />
              </div>
              {/* SL bán */}
              <div className="bg-surface-container-low/50 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">SL Bán</p>
                  <p className="text-[16px] font-bold text-on-surface">{fmtNum(p.totalQty)} <span className="text-[12px] font-medium text-on-surface-variant">cái</span></p>
                </div>
                {p.returnedQty > 0 && (
                  <div className="mt-2 bg-[#fef2f2] text-[#dc2626] text-[11px] font-bold px-2 py-1 rounded-md flex items-center justify-between">
                    <span>{fmtNum(p.returnedQty)} hoàn</span>
                    <span>{fmtPct(p.returnRate)}</span>
                  </div>
                )}
              </div>
              {/* Biên lãi gộp */}
              <div className="bg-surface-container-low/50 rounded-xl p-3">
                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Lãi Gộp</p>
                <p className={`text-[16px] font-black mb-2 ${p.grossMargin >= 30 ? 'text-[#059669]' : p.grossMargin >= 15 ? 'text-[#d97706]' : 'text-error'}`}>
                  {fmtPct(p.grossMargin)}
                </p>
                <MarginBar value={p.grossMargin} max={maxGrossMargin} color={p.grossMargin >= 30 ? '#059669' : p.grossMargin >= 15 ? '#d97706' : '#dc2626'} />
              </div>
              {/* Biên lãi thực (sau Ads) */}
              <div className="bg-surface-container-low/50 rounded-xl p-3 relative overflow-hidden">
                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Sau Ads</p>
                <p className={`text-[16px] font-black mb-2 relative z-10 ${p.netMargin >= 0 ? 'text-[#059669]' : 'text-error'}`}>
                  {fmtPct(p.netMargin)}
                </p>
                <div className="relative z-10"><MarginBar value={Math.abs(p.netMargin)} max={maxNetMargin} color={p.netMargin >= 0 ? '#059669' : '#dc2626'} /></div>
                {p.netMargin < 0 && <div className="absolute inset-0 bg-error/5" />}
              </div>
            </div>
          </div>
          
          {/* Variants Expansion */}
          {isExpanded && hasVariants && (
            <div className="mt-4 pt-4 border-t border-outline-variant/20 md:pl-12">
               <h4 className="text-[12px] font-bold text-on-surface-variant mb-3 uppercase tracking-wider flex items-center gap-1.5">
                 <span className="material-symbols-outlined text-[16px]">category</span> Chi tiết phân loại
               </h4>
               <div className="space-y-2">
                 {p.variants.map((v, i) => (
                    <div key={v.sku_id || i} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-surface-container-low/40 rounded-xl border border-outline-variant/30 gap-3">
                      <div className="flex-1 min-w-[150px]">
                        <p className="font-bold text-[14px] text-on-surface">{v.sku_label || 'Mặc định'}</p>
                        {v.sku_id && <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">{v.sku_id}</p>}
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:text-right">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Doanh thu</p>
                          <p className="font-black text-[13px] text-primary">{fmt(v.totalRevenue)}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">SL Bán</p>
                          <p className="font-bold text-[13px] text-on-surface">{fmtNum(v.totalQty)}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Lãi Gộp</p>
                          <p className={`font-black text-[13px] ${v.grossMargin >= 30 ? 'text-[#059669]' : v.grossMargin >= 15 ? 'text-[#d97706]' : 'text-error'}`}>{fmtPct(v.grossMargin)}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Sau Ads</p>
                          <p className={`font-black text-[13px] ${v.netMargin >= 0 ? 'text-[#059669]' : 'text-error'}`}>{fmtPct(v.netMargin)}</p>
                        </div>
                      </div>
                      {v.returnedQty > 0 && (
                        <div className="md:ml-4 md:w-16 text-left md:text-right border-t md:border-t-0 md:border-l border-outline-variant/30 pt-2 md:pt-0 pl-0 md:pl-4 mt-1 md:mt-0">
                          <p className="text-[10px] text-error uppercase font-bold tracking-wider mb-0.5">Hoàn</p>
                          <p className="font-bold text-[13px] text-error">{fmtNum(v.returnedQty)}</p>
                        </div>
                      )}
                    </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )})}
    </div>
  );
}

export default function OrderAnalysisModal({ isOpen, onClose, data, periodLabel }) {
  const [tab, setTab] = useState('platform');
  const [sortKey, setSortKey] = useState('totalRevenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');

  // ALL hooks must be called before any early return (Rules of Hooks)
  const platformStats = data?.platformStats || [];
  const rawProducts = data?.productStats || [];
  const maxRevenue = Math.max(...platformStats.map(p => p.revenue), 1);

  const sortedProducts = useMemo(() => {
    let list = rawProducts;
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(p => p.product_name?.toLowerCase().includes(term) || p.productId?.toLowerCase().includes(term));
    }
    return [...list].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
  }, [rawProducts, sortKey, sortAsc, search]);

  // Top insights
  const topRevenue = useMemo(() => [...rawProducts].sort((a, b) => b.totalRevenue - a.totalRevenue)[0], [rawProducts]);
  const topGrossMargin = useMemo(() => [...rawProducts].filter(p => p.totalQty > 0).sort((a, b) => b.grossMargin - a.grossMargin)[0], [rawProducts]);
  const topNetMargin = useMemo(() => [...rawProducts].filter(p => p.totalQty > 0).sort((a, b) => b.netMargin - a.netMargin)[0], [rawProducts]);
  const topReturned = useMemo(() => [...rawProducts].filter(p => p.returnedQty > 0).sort((a, b) => b.returnedQty - a.returnedQty)[0], [rawProducts]);
  const topPlatform = platformStats[0];
  const totalPlatformRevenue = platformStats.reduce((s, p) => s + p.revenue, 0);

  // Early return AFTER all hooks
  if (!isOpen || !data) return null;

  const TABS = [
    { key: 'platform', label: 'Nền tảng', icon: 'bar_chart' },
    { key: 'product', label: 'Sản phẩm', icon: 'inventory_2' },
    { key: 'insights', label: 'Điểm nổi bật', icon: 'emoji_events' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-start bg-gradient-to-r from-primary-container/40 to-white flex-shrink-0">
          <div>
            <h2 className="text-[20px] font-black text-on-surface flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-[24px]">analytics</span>
              </div>
              Phân tích Đơn hàng & Sản phẩm
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-2 font-medium">
              Kỳ báo cáo: <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{periodLabel}</span>
              {rawProducts.length > 0 && <span className="ml-2 text-on-surface-variant">· {rawProducts.length} sản phẩm · {platformStats.length} nền tảng</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant bg-white shadow-sm border border-outline-variant/20"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-6 py-4 bg-white border-b border-outline-variant/30 flex items-center gap-2 flex-shrink-0 overflow-x-auto hide-scrollbar">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-full transition-all duration-300 whitespace-nowrap
                ${tab === t.key 
                  ? 'bg-primary text-white shadow-md shadow-primary/30 scale-[1.02]' 
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
            >
              <span className={`material-symbols-outlined text-[18px] ${tab === t.key ? 'text-white' : ''}`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low/30">

          {/* Tab: Nền tảng */}
          {tab === 'platform' && (
            <div className="space-y-4">
              {platformStats.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] opacity-30 block mb-2">bar_chart</span>
                  <p>Không có dữ liệu trong kỳ này</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-white to-surface-container-low rounded-2xl p-4 border border-outline-variant/30 text-center shadow-sm">
                      <p className="text-[12px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Nền tảng</p>
                      <p className="text-[28px] font-black text-primary">{platformStats.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#f0fdf4] to-white rounded-2xl p-4 border border-[#bbf7d0] text-center shadow-sm">
                      <p className="text-[12px] text-[#059669] font-bold uppercase tracking-wider mb-1">Thành công</p>
                      <p className="text-[28px] font-black text-[#059669]">{fmtNum(platformStats.reduce((s,p)=>s+p.orders,0))}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#fffbeb] to-white rounded-2xl p-4 border border-[#fde68a] text-center shadow-sm">
                      <p className="text-[12px] text-[#d97706] font-bold uppercase tracking-wider mb-1">Đơn hoàn</p>
                      <p className="text-[28px] font-black text-[#d97706]">{fmtNum(platformStats.reduce((s,p)=>s+p.returned,0))}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#fef2f2] to-white rounded-2xl p-4 border border-[#fecaca] text-center shadow-sm">
                      <p className="text-[12px] text-error font-bold uppercase tracking-wider mb-1">Đơn giao bù</p>
                      <p className="text-[28px] font-black text-error">{fmtNum(platformStats.reduce((s,p)=>s+p.replacements,0))}</p>
                    </div>
                  </div>
                  {/* Bar list */}
                  <div className="space-y-3">
                    {platformStats.map(p => (
                      <PlatformBar key={p.source} platform={p} maxRevenue={maxRevenue} />
                    ))}
                  </div>
                  {/* Pie-style percentage */}
                  {totalPlatformRevenue > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 mt-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
                        <p className="text-[15px] font-bold text-on-surface">Tỉ trọng doanh thu</p>
                      </div>
                      <div className="flex h-4 rounded-full overflow-hidden mb-5 gap-1 bg-surface-container-low shadow-inner">
                        {platformStats.map(p => {
                          const meta = PLATFORM_META[p.source] || PLATFORM_META['khác'];
                          const pct = totalPlatformRevenue > 0 ? (p.revenue / totalPlatformRevenue * 100) : 0;
                          if (pct < 0.5) return null;
                          return (
                            <div
                              key={p.source}
                              className="h-full transition-all hover:opacity-80"
                              style={{ width: `${pct}%`, backgroundColor: meta.color }}
                              title={`${PLATFORM_META[p.source]?.label}: ${fmtPct(pct)}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-4 justify-center">
                        {platformStats.map(p => {
                          const meta = PLATFORM_META[p.source] || PLATFORM_META['khác'];
                          const pct = totalPlatformRevenue > 0 ? (p.revenue / totalPlatformRevenue * 100) : 0;
                          return (
                            <div key={p.source} className="flex items-center gap-2 bg-surface-container-low/50 px-3 py-1.5 rounded-full border border-outline-variant/20 hover:bg-surface-container transition-colors">
                              <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: meta.color }} />
                              <span className="text-[13px] font-semibold text-on-surface">{meta.label}</span>
                              <span className="text-[13px] font-black" style={{ color: meta.color }}>{fmtPct(pct)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab: Sản phẩm */}
          {tab === 'product' && (
            <div className="space-y-4">
              {rawProducts.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] opacity-30 block mb-2">inventory_2</span>
                  <p>Không có dữ liệu trong kỳ này</p>
                </div>
              ) : (
                <>
                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-outline-variant/30">
                    {/* Search */}
                    <div className="flex items-center gap-2 border border-outline-variant/40 rounded-lg px-3 py-1.5 bg-surface-container-low/50 flex-1 min-w-[200px]">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
                      <input
                        type="text"
                        placeholder="Tìm sản phẩm..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-[13px] focus:outline-none flex-1 text-on-surface"
                      />
                    </div>
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-on-surface-variant font-semibold">Sắp xếp theo:</span>
                      <select
                        value={sortKey}
                        onChange={e => setSortKey(e.target.value)}
                        className="text-[13px] font-semibold border border-outline-variant/40 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-primary cursor-pointer"
                      >
                        {SORT_OPTIONS.map(o => (
                          <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSortAsc(v => !v)}
                        className="w-8 h-8 flex items-center justify-center border border-outline-variant/40 rounded-lg hover:bg-surface-container transition-colors"
                        title={sortAsc ? 'Tăng dần' : 'Giảm dần'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      </button>
                    </div>
                    <span className="text-[12px] text-on-surface-variant">{sortedProducts.length} sản phẩm</span>
                  </div>
                  <ProductTable products={sortedProducts} sortKey={sortKey} />
                </>
              )}
            </div>
          )}

          {/* Tab: Điểm nổi bật */}
          {tab === 'insights' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top doanh thu */}
              <InsightCard
                title="Bán chạy nhất"
                icon="workspace_premium"
                subtitle="Doanh thu cao nhất"
                product={topRevenue}
                value={topRevenue ? fmt(topRevenue.totalRevenue) : null}
                color="#6366f1"
                bgColor="#eef2ff"
              />
              {/* Top nền tảng */}
              <div className="bg-white rounded-xl p-5 border border-outline-variant/30 shadow-sm">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">hub</span> Nền tảng mạnh nhất</p>
                {topPlatform ? (
                  <>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[28px]">{PLATFORM_META[topPlatform.source]?.icon || '📦'}</span>
                      <div>
                        <p className="text-[18px] font-black text-on-surface">{PLATFORM_META[topPlatform.source]?.label || topPlatform.source}</p>
                        <p className="text-[13px] text-on-surface-variant">{fmtNum(topPlatform.orders)} đơn thành công</p>
                      </div>
                    </div>
                    <p className="text-[20px] font-black text-primary mt-2">{fmt(topPlatform.revenue)}</p>
                    {totalPlatformRevenue > 0 && (
                      <p className="text-[12px] text-on-surface-variant mt-1">
                        Chiếm <strong>{fmtPct(topPlatform.revenue / totalPlatformRevenue * 100)}</strong> tổng doanh thu
                      </p>
                    )}
                  </>
                ) : <p className="text-on-surface-variant text-sm mt-2">Không có dữ liệu</p>}
              </div>
              {/* Top biên lãi gộp */}
              <InsightCard
                title="Biên lãi gộp cao nhất"
                icon="monetization_on"
                subtitle="Giá bán – Giá vốn cao nhất"
                product={topGrossMargin}
                value={topGrossMargin ? fmtPct(topGrossMargin.grossMargin) : null}
                color="#059669"
                bgColor="#d1fae5"
              />
              {/* Top biên lãi sau Ads */}
              <InsightCard
                title="Sinh lời nhất (sau Ads)"
                icon="trending_up"
                subtitle="Biên lãi thực tế sau khi phân bổ chi phí quảng cáo"
                product={topNetMargin}
                value={topNetMargin ? fmtPct(topNetMargin.netMargin) : null}
                color="#7c3aed"
                bgColor="#ede9fe"
              />
              {/* Top bị hoàn */}
              <InsightCard
                title="Bị hoàn nhiều nhất"
                icon="error"
                subtitle="Cần kiểm tra lại chất lượng"
                product={topReturned}
                value={topReturned ? `${fmtNum(topReturned.returnedQty)} cái (${fmtPct(topReturned.returnRate)})` : null}
                color="#dc2626"
                bgColor="#fee2e2"
                isWarning
              />
              {/* Summary stats */}
              <div className="bg-white rounded-xl p-5 border border-outline-variant/30 shadow-sm">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">pie_chart</span> Tóm tắt sản phẩm</p>
                <div className="space-y-2">
                  <Row label="Tổng sản phẩm bán ra" value={`${fmtNum(rawProducts.length)} loại`} />
                  <Row label="Tổng doanh thu" value={fmt(rawProducts.reduce((s,p)=>s+p.totalRevenue,0))} />
                  <Row label="Tổng SL bán" value={`${fmtNum(rawProducts.reduce((s,p)=>s+p.totalQty,0))} cái`} />
                  <Row label="Tổng SL bị hoàn" value={`${fmtNum(rawProducts.reduce((s,p)=>s+p.returnedQty,0))} cái`} color="#d97706" />
                  <Row label="Biên lãi gộp TB" value={rawProducts.length > 0 ? fmtPct(rawProducts.reduce((s,p)=>s+p.grossMargin,0)/rawProducts.length) : '0%'} color="#059669" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, subtitle, product, value, color, bgColor, isWarning, icon }) {
  return (
    <div 
      className="rounded-2xl p-5 border border-outline-variant/30 shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
      style={{ background: `linear-gradient(145deg, white 40%, ${bgColor})` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -mr-6 -mt-6" style={{ background: color }} />
      <div>
        <div className="flex items-center gap-2 mb-1">
          {isWarning && !icon && <span className="material-symbols-outlined text-[18px]" style={{ color }}>warning</span>}
          {icon && <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>}
          <p className="text-[14px] font-black text-on-surface uppercase tracking-wide" style={{ color }}>{title}</p>
        </div>
        <p className="text-[12px] text-on-surface-variant font-medium mb-4">{subtitle}</p>
      </div>
      
      {product ? (
        <div>
          <p className="text-[28px] font-black mb-3 leading-none" style={{ color }}>{value}</p>
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm p-2 rounded-xl border border-white/40">
            {product.product_image ? (
              <img src={product.product_image} alt={product.product_name} className="w-10 h-10 rounded-lg object-cover shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-[15px] flex-shrink-0 shadow-sm" style={{ background: color, color: 'white' }}>
                {(product.product_name || '?').charAt(0)}
              </div>
            )}
            <p className="font-bold text-[13px] text-on-surface line-clamp-2 leading-tight">{product.product_name}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-on-surface-variant text-sm font-medium bg-white/50 px-4 py-2 rounded-lg">Không có dữ liệu</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[13px] py-1 border-b border-outline-variant/20 last:border-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-bold text-on-surface" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}
