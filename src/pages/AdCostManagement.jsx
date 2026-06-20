import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import { adCostService } from '../services/adCostService';
import { orderService } from '../services/orderService';
import { fundService } from '../services/fundService';
import { useAuth } from '../hooks/useAuth';

// ─── Platform config ───────────────────────────────────────────────
const PLATFORMS = [
  { key: 'shopee', label: 'Shopee', short: 'SP', color: '#EE4D2D', bg: '#fdf0ed', textColor: '#EE4D2D' },
  { key: 'facebook', label: 'Facebook', short: 'FB', color: '#1877F2', bg: '#e7f0fd', textColor: '#1877F2' },
  { key: 'tiktok', label: 'TikTok', short: 'TT', color: '#010101', bg: '#f0f0f0', textColor: '#010101' },
  { key: 'website', label: 'Website', short: 'WEB', color: '#34A853', bg: '#e8f5e9', textColor: '#34A853' },
  { key: 'instagram', label: 'Instagram', short: 'IG', color: '#C13584', bg: '#fce8f5', textColor: '#C13584' },
  { key: 'youtube', label: 'YouTube', short: 'YT', color: '#FF0000', bg: '#ffe8e8', textColor: '#FF0000' },
];

const getPlatform = (key) => PLATFORMS.find(p => p.key === key) || PLATFORMS[0];

// ─── Helpers ───────────────────────────────────────────────────────
const formatPrice = (n) =>
  Math.round(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫';

const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const getVatForPlatform = (plat) => plat === 'shopee' ? 8 : 10;

// ─── Modal Nạp tiền ────────────────────────────────────────────────
function TopupModal({ platform, onClose, onSuccess, user }) {
  const [amount, setAmount] = useState('');
  const isFbOrIg = platform === 'facebook' || platform === 'instagram';
  const [vatPct, setVatPct] = useState(getVatForPlatform(platform));
  const [fundingSource, setFundingSource] = useState(isFbOrIg ? 'common' : '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fundSummary, setFundSummary] = useState(null);

  useEffect(() => {
    fundService.getSummary()
      .then(res => setFundSummary(res.data.data))
      .catch(console.error);
  }, []);

  const platInfo = getPlatform(platform);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return setError('Số tiền nạp phải lớn hơn 0');
    if (!isFbOrIg && !fundingSource) return setError('Vui lòng chọn nguồn tiền nạp');
    setError(''); setLoading(true);
    
    const feeAmount = (Number(amount) * Number(vatPct)) / 100;
    
    try {
      await adCostService.topupPlatform({
        platform,
        amount: Number(amount),
        fee: feeAmount,
        note,
        fundingSource: isFbOrIg ? 'common' : fundingSource,
        created_by: user?.name || 'Admin'
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi nạp tiền');
    } finally { setLoading(false); }
  };

  const totalDeduct = amount ? Number(amount) + (Number(amount) * Number(vatPct)) / 100 : 0;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', width: '400px', maxWidth: '100%', zIndex: 1 }}>
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50 rounded-t-2xl">
          <h3 className="font-bold text-[16px] text-on-surface">Nạp tiền {platInfo.label}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Số tiền nạp (VNĐ) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[16px] font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="w-[100px]">
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">VAT (%)</label>
              <input type="number" value={vatPct} onChange={e => setVatPct(e.target.value)} min="0" max="100"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] font-bold text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Nguồn tiền nạp</label>
            <div className="flex gap-6">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="fundingSource" value="common" checked={fundingSource === 'common'} onChange={() => setFundingSource('common')} className="mt-0.5 text-primary focus:ring-primary" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[14px] text-on-surface">Tài khoản chung</span>
                  <span className="text-[13px] font-bold text-[#059669]">({fundSummary ? formatPrice(fundSummary.totalFundBalance || 0) : '...'})</span>
                </div>
              </label>
              {!isFbOrIg && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="fundingSource" value="platform" checked={fundingSource === 'platform'} onChange={() => setFundingSource('platform')} className="mt-0.5 text-primary focus:ring-primary" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[14px] text-on-surface">Tài khoản {platInfo.label}</span>
                    <span className="text-[13px] font-bold text-[#059669]">({fundSummary ? formatPrice(fundSummary.platformBalances?.find(p => p.platform === platform)?.availableBalance || 0) : '...'})</span>
                  </div>
                </label>
              )}
            </div>
          </div>
          
          {totalDeduct > 0 && (
            <div className="bg-error-container/30 px-4 py-3 rounded-lg border border-error/20 flex justify-between items-center">
              <span className="text-[13px] font-bold text-error">Sẽ trừ {(isFbOrIg || fundingSource === 'common') ? `Tài khoản chung (${fundSummary ? formatPrice(fundSummary.totalFundBalance || 0) : '...'})` : (fundingSource === 'platform' ? `Tài khoản ${platInfo.label} (${fundSummary ? formatPrice(fundSummary.platformBalances?.find(p => p.platform === platform)?.availableBalance || 0) : '...'})` : '...') } (Gốc + VAT):</span>
              <span className="text-[16px] font-bold text-error">{formatPrice(totalDeduct)}</span>
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ghi chú</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Tùy chọn"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-on-surface-variant text-[13px] font-medium border border-outline-variant hover:bg-surface-container rounded-lg">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-primary text-white text-[13px] font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Xác nhận nạp
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Modal thêm / sửa chi phí ─────────────────────────────────────
function AdCostModal({ record, defaultDate, onClose, onSave, onDelete }) {
  const isEdit = !!record;
  const [date, setDate] = useState(
    record?.date
      ? new Date(record.date).toISOString().split('T')[0]
      : (defaultDate || new Date().toISOString().split('T')[0])
  );

  const isOldRecord = record && record.base_amount == null;
  const initialVat = isOldRecord ? getVatForPlatform(record.platform) : (record?.vat ?? getVatForPlatform(record?.platform || 'shopee'));
  
  let initialBaseAmount = record?.base_amount ?? '';
  if (isOldRecord && record?.amount) {
    initialBaseAmount = Number((record.amount / (1 + initialVat / 100)).toFixed(2));
    if (initialBaseAmount % 1 === 0) initialBaseAmount = Math.round(initialBaseAmount);
  }

  const [platform, setPlatform] = useState(record?.platform || 'shopee');
  const [baseAmount, setBaseAmount] = useState(initialBaseAmount);
  const [vat, setVat] = useState(initialVat);
  const [note, setNote] = useState(record?.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlatformChange = (p) => {
    setPlatform(p);
    if (isEdit && p === record.platform) {
      setVat(initialVat);
    } else {
      setVat(getVatForPlatform(p));
    }
  };

  const amount = baseAmount ? Number(baseAmount) + (Number(baseAmount) * Number(vat) / 100) : 0;

  const handleSubmit = async () => {
    if (!baseAmount || Number(baseAmount) < 0) { setError('Vui lòng nhập chi phí hợp lệ'); return; }
    setError(''); setLoading(true);
    try {
      const payload = { 
        date: new Date(date), 
        platform, 
        base_amount: Number(baseAmount),
        vat: Number(vat),
        amount: amount, 
        note 
      };
      if (isEdit) await adCostService.updateAdCost(record._id, payload);
      else await adCostService.createAdCost(payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setLoading(false); }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', width: '480px', maxWidth: '100%', zIndex: 1 }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50 rounded-t-2xl">
          <h3 className="font-bold text-[16px] text-on-surface">
            {isEdit ? 'Chỉnh sửa chi phí' : 'Thêm chi phí quảng cáo'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ngày</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Nền tảng</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.key} onClick={() => handlePlatformChange(p.key)}
                  className={`py-2.5 rounded-lg text-[13px] font-bold border-2 transition-all ${platform === p.key ? 'shadow-sm scale-[1.02]' : 'border-outline-variant/40 hover:border-outline-variant'
                    }`}
                  style={{ color: platform === p.key ? p.color : '#5f6368', backgroundColor: platform === p.key ? p.bg : 'white', borderColor: platform === p.key ? p.color : undefined }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Chi phí gốc (VNĐ)</label>
              <input type="number" min="0" value={baseAmount} onChange={e => setBaseAmount(e.target.value)}
                placeholder="Ví dụ: 500000"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[16px] font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="w-[100px]">
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">VAT (%)</label>
              <input type="number" min="0" max="100" value={vat} onChange={e => setVat(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[16px] font-bold text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {baseAmount > 0 && (
            <div className="bg-primary-container/30 px-4 py-3 rounded-lg border border-primary/20 flex justify-between items-center">
              <span className="text-[13px] font-bold text-on-surface-variant">Tổng chi phí (Gốc + VAT)</span>
              <span className="text-[16px] font-bold text-primary">{formatPrice(amount)}</span>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ghi chú</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Chiến dịch, mục tiêu..."
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#f8f9fa] rounded-b-2xl border-t border-outline-variant/30 flex justify-between items-center">
          <div>
            {isEdit && (
              <button onClick={onDelete}
                className="px-4 py-2 bg-error-container text-error rounded-lg text-[13px] font-semibold hover:bg-error hover:text-white transition-colors">
                Xóa
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-on-surface-variant text-[13px] font-medium hover:bg-surface-container rounded-lg">Hủy</button>
            <button onClick={handleSubmit} disabled={loading}
              className="px-5 py-2 bg-primary text-white text-[13px] font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-2 shadow-sm">
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function AdCostManagement() {
  const { user } = useAuth();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [records, setRecords] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [modal, setModal] = useState(null); // null | { type: 'add'|'edit', data?, defaultDate? }
  const [topupPlatform, setTopupPlatform] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [orders, setOrders] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [res, balRes] = await Promise.all([
        adCostService.getAdCosts(viewYear, viewMonth + 1),
        adCostService.getBalances()
      ]);
      setRecords(res.data.data);
      setBalances(balRes.data.data);
    } catch { showToast('Không thể tải dữ liệu', 'error'); }
    finally { setLoading(false); }
  }, [viewYear, viewMonth]);

  const fetchBalancesOnly = async () => {
    try {
      const balRes = await adCostService.getBalances();
      setBalances(balRes.data.data);
    } catch {}
  };

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await orderService.getOrders();
        setOrders(res.data.data);
      } catch (e) {
        console.error('Failed to fetch orders:', e);
      }
    };
    loadOrders();
  }, []);

  // Group records by day
  const byDay = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const d = new Date(r.date).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }, [records]);

  // Selected day records (filtered)
  const selectedRecords = useMemo(() => {
    const list = byDay[selectedDay] || [];
    if (filterPlatform === 'all') return list;
    return list.filter(r => r.platform === filterPlatform);
  }, [byDay, selectedDay, filterPlatform]);

  // Month stats
  const monthTotal = useMemo(() => records.reduce((s, r) => s + r.amount, 0), [records]);

  const platformTotals = useMemo(() => {
    const map = {};
    records.forEach(r => { map[r.platform] = (map[r.platform] || 0) + r.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // Day total
  const dayTotal = useMemo(() => (byDay[selectedDay] || []).reduce((s, r) => s + r.amount, 0), [byDay, selectedDay]);

  // Orders and cost per order for selected day
  const selectedDayOrdersCount = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.ordered_at);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === selectedDay;
    }).length;
  }, [orders, viewYear, viewMonth, selectedDay]);

  const costPerOrder = selectedDayOrdersCount > 0 ? (dayTotal / selectedDayOrdersCount) : 0;

  // Calendar data
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekDay = getFirstDayOfWeek(viewYear, viewMonth); // 0=Sun

  // Re-order: Mon first (T2...CN)
  // firstWeekDay Sun=0 → col 6, Mon=1 → col 0, ...
  const startCol = (firstWeekDay + 6) % 7;

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(1);
  };
  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(1);
  };

  const handleSave = () => {
    setModal(null);
    showToast(modal?.type === 'edit' ? 'Đã cập nhật chi phí' : 'Đã thêm chi phí');
    fetchRecords();
  };

  const handleDelete = async () => {
    if (!modal?.data) return;
    try {
      await adCostService.deleteAdCost(modal.data._id);
      showToast('Đã xóa');
      setModal(null);
      fetchRecords();
    } catch { showToast('Xóa thất bại', 'error'); }
  };

  const selectedDateStr = `${String(selectedDay).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`;

  // Build calendar grid: 7 cols, up to 6 rows
  const totalCells = startCol + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold animate-[fadeIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'
          }`}>{toast.msg}</div>
      )}

      {/* Modal */}
      {modal?.type === 'add' && (
        <AdCostModal defaultDate={modal.defaultDate} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.type === 'edit' && (
        <AdCostModal record={modal.data} onClose={() => setModal(null)} onSave={handleSave} onDelete={handleDelete} />
      )}

      <div className="flex flex-col pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Chi phí Quảng cáo</h2>
            <p className="text-on-surface-variant mt-1 text-[14px]">Theo dõi chi phí quảng cáo và số dư từng nền tảng</p>
          </div>
          <button onClick={() => setModal({ type: 'add', defaultDate: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` })}
            className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 shadow-sm font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Thêm chi phí</span>
          </button>
        </div>

        {/* Ad Balances */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {PLATFORMS.map(p => {
            const bal = balances.find(b => b.platform === p.key)?.balance || 0;
            return (
              <div key={p.key} className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-3 flex flex-col justify-between group">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-[9px]" style={{ backgroundColor: p.bg, color: p.textColor }}>{p.short}</div>
                  <span className="text-[12px] font-bold text-on-surface">{p.label}</span>
                </div>
                <div className="text-[15px] font-black" style={{ color: bal > 0 ? '#059669' : '#dc2626' }}>
                  {formatPrice(bal)}
                </div>
                <button onClick={() => setTopupPlatform(p.key)} className="mt-2 w-full py-1 text-[10px] font-bold bg-surface-container hover:bg-surface-container-high rounded text-on-surface-variant transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                  Nạp tiền
                </button>
              </div>
            );
          })}
        </div>
        
        {topupPlatform && (
          <TopupModal platform={topupPlatform} user={user} onClose={() => setTopupPlatform(null)} onSuccess={() => { setTopupPlatform(null); showToast('Nạp tiền thành công'); fetchBalancesOnly(); }} />
        )}

        {/* Main 2-col layout */}
        <div className="flex gap-lg items-start">

          {/* ── Left: Calendar ── */}
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
              <button onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <h3 className="text-[17px] font-bold text-on-surface">
                {VI_MONTHS[viewMonth]} {viewYear}
              </h3>
              <button onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>

            {/* Day-of-week header: T2...CN */}
            <div className="grid grid-cols-7 border-b border-outline-variant/20">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                <div key={d} className={`py-2 text-center text-[12px] font-bold uppercase tracking-wider ${i === 6 ? 'text-error' : 'text-on-surface-variant'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1">
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-7 divide-x divide-outline-variant/20 border-b border-outline-variant/20 last:border-b-0" style={{ minHeight: '90px' }}>
                  {Array.from({ length: 7 }).map((_, colIdx) => {
                    const cellIdx = rowIdx * 7 + colIdx;
                    const day = cellIdx - startCol + 1;
                    const isValid = day >= 1 && day <= daysInMonth;
                    const isToday = isValid && day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
                    const isSelected = isValid && day === selectedDay;
                    const isSunday = colIdx === 6;
                    const dayRecords = isValid ? (byDay[day] || []) : [];
                    const dayTotal = dayRecords.reduce((s, r) => s + r.amount, 0);

                    return (
                      <div key={colIdx}
                        onClick={() => isValid && setSelectedDay(day)}
                        onDoubleClick={() => {
                          if (isValid) {
                            setSelectedDay(day);
                            setModal({ type: 'add', defaultDate: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
                          }
                        }}
                        className={`p-2 transition-colors relative ${isValid ? 'cursor-pointer hover:bg-surface-container-low/50' : 'bg-surface-container-low'} ${isSelected ? 'bg-primary-container/25 ring-1 ring-primary/40 ring-inset' : ''}`}
                      >
                        {isValid && (
                          <>
                            {/* Day number */}
                            <div className={`text-[13px] font-bold mb-1.5 flex items-center gap-1 ${isSunday ? 'text-error' : 'text-on-surface'}`}>
                              {isToday ? (
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-[12px] flex items-center justify-center font-bold">{day}</span>
                              ) : (
                                <span>{day}</span>
                              )}
                            </div>

                            {/* Platform mini tags */}
                            <div className="space-y-0.5">
                              {dayRecords.slice(0, 3).map(r => {
                                const p = getPlatform(r.platform);
                                return (
                                  <div key={r._id}
                                    style={{ backgroundColor: p.bg, color: p.textColor }}
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between gap-1 truncate">
                                    <span>{p.short}</span>
                                    <span className="opacity-80">{formatPrice(r.amount)}</span>
                                  </div>
                                );
                              })}
                              {dayRecords.length > 3 && (
                                <div className="text-[10px] text-on-surface-variant pl-1">+{dayRecords.length - 3}</div>
                              )}
                            </div>

                            {/* Day total */}
                            {dayTotal > 0 && (
                              <div className="mt-1 text-[10px] font-bold text-on-surface-variant">
                                Σ {formatPrice(dayTotal)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Detail Panel ── */}
          <div className="w-[320px] flex-shrink-0 flex flex-col gap-md">

            {/* Day detail card */}
            <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden">
              {/* Day header */}
              <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="text-[16px] font-bold text-on-surface">Chi tiết ngày {selectedDateStr}</p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">{VI_MONTHS[viewMonth]}</p>
                </div>
                <button onClick={() => setModal({ type: 'add', defaultDate: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` })}
                  className="p-1.5 text-primary hover:bg-primary-container/30 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </button>
              </div>

              {/* Platform filter chips */}
              <div className="px-4 pt-3 pb-2 flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterPlatform('all')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${filterPlatform === 'all' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                  Tất cả
                </button>
                {PLATFORMS.map(p => (
                  <button key={p.key} onClick={() => setFilterPlatform(p.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${filterPlatform === p.key ? 'text-white' : 'hover:opacity-80'}`}
                    style={filterPlatform === p.key
                      ? { backgroundColor: p.color }
                      : { backgroundColor: p.bg, color: p.textColor }}>
                    {p.short}
                  </button>
                ))}
              </div>

              {/* Records list */}
              <div className="px-4 pb-4 space-y-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 bg-surface-container rounded-xl animate-pulse" />
                  ))
                ) : selectedRecords.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-30 block mb-2">bar_chart</span>
                    <p className="text-[13px] text-on-surface-variant">Chưa có chi phí trong ngày này</p>
                  </div>
                ) : (
                  selectedRecords.map(r => {
                    const p = getPlatform(r.platform);
                    return (
                      <div key={r._id}
                        onClick={() => setModal({ type: 'edit', data: r })}
                        className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 hover:bg-surface-container-lowest cursor-pointer transition-colors group">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0"
                          style={{ backgroundColor: p.bg, color: p.textColor }}>
                          {p.short}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[13px] text-on-surface">{p.label}</p>
                          {r.note && <p className="text-[11px] text-on-surface-variant truncate">{r.note}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[13px]" style={{ color: p.textColor }}>
                            {formatPrice(r.amount)}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day total */}
              <div className="px-5 py-3 border-t border-outline-variant/20 flex flex-col gap-2 bg-surface-container-low/30">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-on-surface-variant font-medium">Tổng quảng cáo ngày {selectedDay}</span>
                  <span className="text-[15px] font-bold text-primary">{formatPrice(dayTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-on-surface-variant font-medium">Số đơn hàng</span>
                  <span className="text-[14px] font-bold text-on-surface">{selectedDayOrdersCount}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
                  <span className="text-[13px] text-on-surface-variant font-bold">Chi phí / Đơn</span>
                  <span className="text-[14px] font-bold text-[#d97706]">{formatPrice(costPerOrder)}</span>
                </div>
              </div>
            </div>

            {/* Month total card */}
            <div className="rounded-xl p-5 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1a237e 0%, #1976D2 100%)' }}>
              <div className="absolute right-4 top-4 opacity-10">
                <span className="material-symbols-outlined text-[72px]">payments</span>
              </div>
              <p className="text-[11px] uppercase tracking-widest font-bold opacity-80 mb-1">TỔNG CHI TIÊU {VI_MONTHS[viewMonth].toUpperCase()}</p>
              <p className="text-[28px] font-black leading-tight">
                {loading
                  ? <span className="inline-block w-40 h-8 bg-white/20 rounded animate-pulse" />
                  : formatPrice(monthTotal)}
              </p>
              {monthTotal > 0 && (
                <p className="text-[11px] mt-2 opacity-70 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                  {records.length} bản ghi trong tháng
                </p>
              )}
            </div>

            {/* Platform distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
              <h4 className="font-bold text-[14px] text-on-surface mb-4">Phân bổ nền tảng</h4>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-surface-container-high rounded animate-pulse" />)}
                </div>
              ) : platformTotals.length === 0 ? (
                <p className="text-[13px] text-on-surface-variant text-center py-4">Chưa có dữ liệu trong tháng</p>
              ) : (
                <div className="space-y-3">
                  {platformTotals.map(([key, total]) => {
                    const p = getPlatform(key);
                    const pct = monthTotal > 0 ? ((total / monthTotal) * 100).toFixed(1) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: p.bg, color: p.textColor }}>{p.short}</span>
                            <span className="text-[13px] font-semibold text-on-surface">{p.label} ({pct}%)</span>
                          </div>
                          <span className="text-[12px] font-bold text-on-surface-variant">{formatPrice(total)}</span>
                        </div>
                        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
