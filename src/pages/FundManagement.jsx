import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { fundService } from '../services/fundService';
import { formatPrice } from '../utils/formatPrice';
import { useAuth } from '../hooks/useAuth';
import { getCarrierFromFundAccount, getFundAccountLabel } from '../utils/shippingCarriers';

const FUND_ACCOUNT_VISUALS = {
  pos: { icon: 'point_of_sale', color: '#7c3aed', background: '#ede9fe' },
  shopee: { mask: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/shopee.svg', color: '#ee4d2d', background: '#fff0eb' },
  tiktok: { mask: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tiktok.svg', color: '#111827', background: '#f1f5f9' },
  website: { icon: 'language', color: '#2563eb', background: '#dbeafe' },
};

const getFundAccountVisual = (accountId) => {
  const carrier = getCarrierFromFundAccount(accountId);
  if (carrier) return { logo: carrier.logo, color: carrier.color, background: `${carrier.color}18` };
  return FUND_ACCOUNT_VISUALS[accountId] || { icon: 'account_balance_wallet', color: '#475569', background: '#f1f5f9' };
};

function DepositModal({ onClose, onSuccess, user }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amount || amount <= 0) return setError('Sá»‘ tiá»n pháº£i lá»›n hÆ¡n 0');
    
    setLoading(true);
    try {
      await fundService.deposit({ 
        amount: Number(amount), 
        note, 
        created_by: user?.name || 'Admin' 
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lá»—i khi náº¡p tiá»n');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 animate-[slideUp_0.3s_ease]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[20px] font-bold text-on-surface">GÃ³p vá»‘n vÃ o quá»¹</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}
          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Sá»‘ tiá»n (VNÄ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-lg font-bold focus:outline-none focus:border-primary" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Ghi chÃº</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="3"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="VD: Admin náº¡p thÃªm vá»‘n"></textarea>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container">Há»§y</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-60">
              {loading ? 'Äang xá»­ lÃ½...' : 'GÃ³p vá»‘n'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WithdrawCapitalModal({ onClose, onSuccess, user, maxAmount }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return setError('Sá»‘ tiá»n pháº£i lá»›n hÆ¡n 0');
    if (numAmount > maxAmount) return setError('Sá»‘ tiá»n rÃºt vÆ°á»£t quÃ¡ tÃ i sáº£n chung hiá»‡n táº¡i');
    
    setLoading(true);
    try {
      await fundService.withdrawCapital({ 
        amount: numAmount, 
        note, 
        created_by: user?.name || 'Admin' 
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lá»—i khi rÃºt vá»‘n');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 animate-[slideUp_0.3s_ease]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[20px] font-bold text-on-surface">RÃºt vá»‘n khá»i quá»¹</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}
          
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 mb-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-on-surface-variant">TÃ i sáº£n chung hiá»‡n táº¡i:</span>
            <span className="font-bold text-primary text-lg">{formatPrice(maxAmount)}</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Sá»‘ tiá»n rÃºt (VNÄ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" max={maxAmount}
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-lg font-bold focus:outline-none focus:border-primary" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Ghi chÃº</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="3"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="VD: Admin rÃºt láº¡i vá»‘n Ä‘áº§u tÆ° ban Ä‘áº§u"></textarea>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container">Há»§y</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-error text-white font-semibold hover:opacity-90 disabled:opacity-60">
              {loading ? 'Äang xá»­ lÃ½...' : 'RÃºt vá»‘n'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WithdrawModal({ platform, maxAmount, onClose, onSuccess, user }) {
  const [amount, setAmount] = useState(maxAmount);
  const [fee, setFee] = useState(platform === 'shopee' ? 10800 : 0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amount || amount <= 0) return setError('Sá»‘ tiá»n pháº£i lá»›n hÆ¡n 0');
    if (amount > maxAmount) return setError('Sá»‘ tiá»n rÃºt khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ sá»‘ dÆ°');
    if (fee < 0) return setError('PhÃ­ khÃ´ng há»£p lá»‡');
    
    setLoading(true);
    try {
      await fundService.withdrawRevenue({ 
        source: platform,
        amount: Number(amount), 
        fee: Number(fee),
        note, 
        created_by: user?.name || 'Admin' 
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lá»—i khi rÃºt tiá»n');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] p-6 animate-[slideUp_0.3s_ease]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[20px] font-bold text-on-surface">RÃºt tiá»n tá»« {getFundAccountLabel(platform).toUpperCase()}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}
          
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 mb-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-on-surface-variant">Sá»‘ dÆ° kháº£ dá»¥ng:</span>
            <span className="font-bold text-primary text-lg">{formatPrice(maxAmount)}</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Sá»‘ tiá»n rÃºt (VNÄ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" max={maxAmount}
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-lg font-bold focus:outline-none focus:border-primary" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">PhÃ­ / VAT ná»n táº£ng (VNÄ)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
            <p className="text-xs text-on-surface-variant mt-1">TÃ i sáº£n chung sáº½ nháº­n: <strong className="text-[#059669]">{formatPrice(amount - fee)}</strong></p>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Ghi chÃº</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="2"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="VD: RÃºt doanh thu thÃ¡ng 5"></textarea>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container">Há»§y</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-60">
              {loading ? 'Äang xá»­ lÃ½...' : 'XÃ¡c nháº­n rÃºt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FundManagement() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ totalFundBalance: 0, platformBalances: [], adminDeposits: [], totalImportDebt: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Dá»± kiáº¿n = TÃ i sáº£n hiá»‡n táº¡i + Doanh thu cÃ¡c sÃ n chÆ°a rÃºt - Ná»£ phiáº¿u nháº­p chÆ°a táº¥t toÃ¡n
  const expectedFund = summary.totalFundBalance
    + (summary.platformBalances || []).reduce((sum, p) => sum + p.availableBalance, 0)
    - (summary.totalImportDebt || 0);
  
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawCapital, setShowWithdrawCapital] = useState(false);
  const [withdrawPlatform, setWithdrawPlatform] = useState(null);
  const accountScrollerRef = useRef(null);
  const [accountScrollState, setAccountScrollState] = useState({ canBack: false, canForward: false });

  useEffect(() => {
    const scroller = accountScrollerRef.current;
    if (!scroller) return undefined;

    const updateScrollState = () => setAccountScrollState({
      canBack: scroller.scrollLeft > 2,
      canForward: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2,
    });
    const handleWheel = (event) => {
      if (scroller.scrollWidth <= scroller.clientWidth) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const atStart = scroller.scrollLeft <= 0;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      scroller.scrollLeft += delta;
    };

    scroller.addEventListener('wheel', handleWheel, { passive: false });
    scroller.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    const frame = window.requestAnimationFrame(updateScrollState);
    return () => {
      window.cancelAnimationFrame(frame);
      scroller.removeEventListener('wheel', handleWheel);
      scroller.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [summary.platformBalances.length]);

  const scrollAccounts = (direction) => accountScrollerRef.current?.scrollBy({
    left: direction * Math.min(540, accountScrollerRef.current.clientWidth * 0.75),
    behavior: 'smooth',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let sd = '';
      let ed = '';
      if (dateFilter === 'this_month') {
        const now = new Date();
        sd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        ed = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (dateFilter === 'last_month') {
        const now = new Date();
        sd = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        ed = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      } else if (dateFilter === 'custom') {
        if (customStartDate) sd = new Date(customStartDate).toISOString();
        if (customEndDate) {
          const edDate = new Date(customEndDate);
          edDate.setHours(23, 59, 59, 999);
          ed = edDate.toISOString();
        }
      }

      const [sumRes, transRes] = await Promise.all([
        fundService.getSummary(),
        fundService.getTransactions(1, 0, filterType, sd, ed)
      ]);
      setSummary(sumRes.data.data);
      setTransactions(transRes.data.data.transactions);
    } catch (error) {
      showToast('Lá»—i khi táº£i dá»¯ liá»‡u', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, dateFilter, customStartDate, customEndDate]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuccess = (msg) => {
    setShowDeposit(false);
    setShowWithdrawCapital(false);
    setWithdrawPlatform(null);
    showToast(msg);
    fetchData();
  };

  const handleDeleteAllTransactions = async () => {
    if (window.confirm('Cáº¢NH BÃO NGUY HIá»‚M: HÃ nh Ä‘á»™ng nÃ y sáº½ xoÃ¡ toÃ n bá»™ lá»‹ch sá»­ giao dá»‹ch vÃ  RESET Táº¤T Cáº¢ Sá» DÆ¯ Vá»€ 0. Báº¡n cháº¯c cháº¯n muá»‘n tiáº¿p tá»¥c chá»©?')) {
      try {
        await fundService.deleteAllTransactions();
        showToast('ÄÃ£ xoÃ¡ lá»‹ch sá»­ giao dá»‹ch vÃ  reset sá»‘ dÆ°');
        fetchData();
      } catch (error) {
        showToast(error.response?.data?.message || 'Lá»—i khi xoÃ¡ lá»‹ch sá»­ giao dá»‹ch', 'error');
      }
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'admin_deposit': return { label: 'GÃ³p vá»‘n', color: 'bg-[#d1fae5] text-[#059669]' };
      case 'admin_withdrawal': return { label: 'RÃºt vá»‘n', color: 'bg-[#fee2e2] text-[#dc2626]' };
      case 'revenue_withdrawal': return { label: 'RÃºt doanh thu', color: 'bg-[#f3e5df] text-primary' };
      case 'ad_topup': return { label: 'Náº¡p quáº£ng cÃ¡o', color: 'bg-purple-100 text-purple-700' };
      case 'import_payment': return { label: 'Thanh toÃ¡n PN', color: 'bg-[#fee2e2] text-[#dc2626]' };
      case 'expense_payment': return { label: 'Chi tiÃªu', color: 'bg-orange-100 text-orange-700' };
      case 'system_adjustment': return { label: 'Äá»“ng bá»™ há»‡ thá»‘ng', color: 'bg-surface-container-high text-on-surface-variant' };
      case 'order_revenue': return { label: 'Doanh thu Ä‘Æ¡n hÃ ng', color: 'bg-[#dcfce7] text-[#166534]' };
      default: return { label: 'KhÃ¡c', color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-error' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {showDeposit && <DepositModal user={user} onClose={() => setShowDeposit(false)} onSuccess={() => handleSuccess('GÃ³p vá»‘n thÃ nh cÃ´ng')} />}
      {showWithdrawCapital && <WithdrawCapitalModal user={user} maxAmount={summary.totalFundBalance} onClose={() => setShowWithdrawCapital(false)} onSuccess={() => handleSuccess('RÃºt vá»‘n thÃ nh cÃ´ng')} />}
      {withdrawPlatform && <WithdrawModal user={user} platform={withdrawPlatform.platform} maxAmount={withdrawPlatform.availableBalance} onClose={() => setWithdrawPlatform(null)} onSuccess={() => handleSuccess('RÃºt tiá»n thÃ nh cÃ´ng')} />}

      <div className="flex flex-col pb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">TÃ i sáº£n chung</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">Quáº£n lÃ½ vá»‘n, doanh thu vÃ  thanh toÃ¡n phiáº¿u nháº­p</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-8">
          {/* Main Fund Card */}
          <div className="lg:col-span-1 min-h-[272px] bg-gradient-to-br from-on-primary-container to-secondary rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -right-4 -bottom-10 w-56 h-56 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[20px]">account_balance_wallet</span>
                </div>
                <p className="text-white/80 text-[13px] font-bold uppercase tracking-wider">Tổng tài sản chung</p>
              </div>
              <h2 className="text-[32px] font-black text-white mt-2 leading-tight">{formatPrice(summary.totalFundBalance)}</h2>
              <p className="text-white/60 text-[12px] mt-1 mb-3">Số dư quỹ hiện tại</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <p className="text-white/90 text-[12px] font-medium bg-white/10 inline-flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  Dự kiến: <strong className="text-white">{formatPrice(expectedFund)}</strong>
                </p>
                {(summary.totalImportDebt || 0) > 0 && (
                  <p className="text-white/90 text-[12px] font-medium bg-red-500/30 inline-flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm border border-red-300/30">
                    <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                    Nợ kho: <strong className="text-red-200">{formatPrice(summary.totalImportDebt)}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="relative z-10 mt-6 flex gap-3 pt-4 border-t border-white/20">
              <button onClick={() => setShowDeposit(true)} className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Góp vốn
              </button>
              <button onClick={() => setShowWithdrawCapital(true)} disabled={summary.totalFundBalance <= 0} className="flex-1 bg-white/10 hover:bg-white/20 transition-colors py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                Rút vốn
              </button>
            </div>
          </div>

          {/* Platform accounts */}
          <div className="lg:col-span-2 min-w-0 rounded-2xl border border-outline-variant/30 bg-white/60 p-3 md:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                  <h3 className="font-extrabold text-on-surface text-[15px]">Tài khoản doanh thu</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{summary.platformBalances.length}</span>
                </div>
                <p className="hidden md:block text-[11px] text-on-surface-variant mt-0.5">Sắp xếp theo số dư khả dụng</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => scrollAccounts(-1)} disabled={!accountScrollState.canBack} className="w-9 h-9 rounded-xl border border-outline-variant/50 bg-white text-on-surface flex items-center justify-center shadow-xs transition-all hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Xem các tài khoản phía trước">
                  <span className="material-symbols-outlined text-[21px]">chevron_left</span>
                </button>
                <button type="button" onClick={() => scrollAccounts(1)} disabled={!accountScrollState.canForward} className="w-9 h-9 rounded-xl border border-outline-variant/50 bg-white text-on-surface flex items-center justify-center shadow-xs transition-all hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Xem thêm tài khoản">
                  <span className="material-symbols-outlined text-[21px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="relative min-w-0">
              {accountScrollState.canBack && <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white/95 to-transparent" />}
              {accountScrollState.canForward && <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/95 to-transparent" />}
              <div ref={accountScrollerRef} className="no-scrollbar flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth" aria-label="Các tài khoản doanh thu">
                {[...summary.platformBalances]
                  .sort((a, b) => Number(b.availableBalance || 0) - Number(a.availableBalance || 0))
                  .map(p => {
                    const visual = getFundAccountVisual(p.platform);
                    const canWithdraw = Number(p.availableBalance || 0) > 0;
                    return (
                      <article key={p.platform} className="min-w-[218px] md:min-w-[230px] snap-start relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-outline-variant hover:shadow-md">
                        <div className="absolute -right-7 -top-8 h-24 w-24 rounded-full opacity-[0.08]" style={{ background: visual.color }} />
                        <div className="relative flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: visual.color, background: visual.background }}>
                            {visual.mask ? (
                              <span className="h-5 w-5" style={{ backgroundColor: visual.color, maskImage: `url(${visual.mask})`, maskPosition: 'center', maskRepeat: 'no-repeat', maskSize: 'contain', WebkitMaskImage: `url(${visual.mask})`, WebkitMaskPosition: 'center', WebkitMaskRepeat: 'no-repeat', WebkitMaskSize: 'contain' }} />
                            ) : visual.logo ? (
                              <img src={visual.logo} alt="" className="h-6 w-6 object-contain" />
                            ) : (
                              <span className="material-symbols-outlined text-[20px]">{visual.icon}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-[14px] font-extrabold text-on-surface">{getFundAccountLabel(p.platform)}</h4>
                            <p className="mt-0.5 text-[11px] text-on-surface-variant">Số dư khả dụng</p>
                          </div>
                        </div>
                        <p className="relative mt-5 text-[23px] font-black leading-none tracking-tight text-on-surface">{formatPrice(p.availableBalance)}</p>
                        <button onClick={() => setWithdrawPlatform(p)} disabled={!canWithdraw} className="relative mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-[12px] font-extrabold text-on-surface transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45">
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          Rút tiền
                        </button>
                      </article>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
        {/* Admin Contributions */}
        {summary.adminDeposits && summary.adminDeposits.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 mb-8">
            <h3 className="font-bold text-on-surface text-[16px] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
              Tá»‰ lá»‡ gÃ³p vá»‘n cá»§a cÃ¡c Admin
            </h3>
            <div className="space-y-5">
              {summary.adminDeposits.map(d => {
                const totalAll = summary.adminDeposits.reduce((s, a) => s + a.netDeposit, 0);
                const percent = totalAll > 0 ? (d.netDeposit / totalAll * 100).toFixed(1) : 0;
                return (
                  <div key={d.admin}>
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <span className="font-bold text-on-surface text-[15px] block">{d.admin}</span>
                        <div className="text-[12px] text-on-surface-variant flex gap-3 mt-1">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-[#059669]">arrow_upward</span> ÄÃ£ gÃ³p: {formatPrice(d.totalDeposit || 0)}</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-[#dc2626]">arrow_downward</span> ÄÃ£ rÃºt: {formatPrice(d.totalWithdrawal || 0)}</span>
                        </div>
                      </div>
                      <div className="text-right leading-none">
                        <span className="font-black text-primary text-[15px] mr-2">{formatPrice(d.netDeposit)}</span>
                        <span className="text-on-surface-variant font-bold text-[13px] bg-surface-container px-2 py-0.5 rounded">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden flex mt-2">
                      <div className="h-full bg-gradient-to-r from-primary to-[#4f46e5] transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex justify-between items-center gap-4 flex-wrap">
            <h3 className="font-bold text-on-surface text-[16px]">Lá»‹ch sá»­ giao dá»‹ch</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-outline-variant rounded-lg px-4 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none focus:border-primary bg-white min-w-[140px]"
              >
                <option value="all">Má»i thá»i gian</option>
                <option value="this_month">ThÃ¡ng nÃ y</option>
                <option value="last_month">ThÃ¡ng trÆ°á»›c</option>
                <option value="custom">Tuá»³ chá»‰nh</option>
              </select>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none focus:border-primary bg-white"
                  />
                  <span className="text-on-surface-variant">-</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none focus:border-primary bg-white"
                  />
                </div>
              )}

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-outline-variant rounded-lg px-4 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none focus:border-primary bg-white min-w-[180px]"
              >
                <option value="all">Táº¥t cáº£ giao dá»‹ch</option>
                <option value="admin_deposit">GÃ³p vá»‘n</option>
                <option value="admin_withdrawal">RÃºt vá»‘n</option>
                <option value="revenue_withdrawal">RÃºt doanh thu</option>
                <option value="ad_topup">Náº¡p quáº£ng cÃ¡o</option>
                <option value="import_payment">Thanh toÃ¡n PN</option>
                <option value="seeding_payment">Chi phÃ­ Seeding</option>
                <option value="shipping_payment">PhÃ­ Ship</option>
                <option value="system_adjustment">Äá»“ng bá»™ há»‡ thá»‘ng</option>
                <option value="platform_adjustment">Äá»“ng bá»™ quá»¹ ná»n táº£ng</option>
                <option value="order_revenue">Doanh thu Ä‘Æ¡n hÃ ng</option>
              </select>
              <button 
                onClick={handleDeleteAllTransactions}
                className="px-4 py-1.5 bg-error text-white text-[13px] font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                XÃ³a táº¥t cáº£
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm bg-surface-container-lowest">
                <tr>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Thá»i gian</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Loáº¡i giao dá»‹ch</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Biáº¿n Ä‘á»™ng</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">PhÃ­ / VAT</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Chi tiáº¿t</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">NgÆ°á»i táº¡o</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loading && transactions.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-surface-container rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-on-surface-variant">ChÆ°a cÃ³ giao dá»‹ch nÃ o</td>
                  </tr>
                ) : (
                  transactions.map(t => {
                    const typeInfo = getTypeLabel(t.type);
                    const displayChange = t.fund_change !== 0 
                      ? t.fund_change 
                      : (t.platform_change !== 0 
                          ? t.platform_change 
                          : (t.type === 'revenue_withdrawal' ? -t.amount : (t.type === 'order_revenue' ? t.amount : 0)));

                    return (
                      <tr key={t._id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-3 text-[13px] text-on-surface-variant whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${typeInfo.color}`}>
                            {typeInfo.label} {t.source ? `(${getFundAccountLabel(t.source)})` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`font-bold text-[14px] ${displayChange >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                            {displayChange > 0 ? '+' : ''}{formatPrice(displayChange)}
                          </span>
                          {t.funding_source === 'platform' && (
                            <p className="mt-1 text-[11px] text-on-surface-variant">Trá»« sá»‘ dÆ° {t.source}, Ä‘Ã£ gá»“m phÃ­</p>
                          )}
                        </td>
                        <td className="px-6 py-3 text-[13px] text-on-surface-variant font-medium">
                          {t.fee > 0 ? formatPrice(t.fee) : '-'}
                        </td>
                        <td className="px-6 py-3 text-[13px] text-on-surface max-w-[250px]" title={t.note}>
                          <p className="truncate">{t.note || '-'}</p>
                          {t.type === 'ad_topup' && (
                            <p className="mt-1 text-[11px] text-on-surface-variant">VÃ o tÃ i khoáº£n quáº£ng cÃ¡o: {formatPrice(t.amount)}</p>
                          )}
                        </td>
                        <td className="px-6 py-3 text-[13px] font-semibold text-right">
                          {t.created_by}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
