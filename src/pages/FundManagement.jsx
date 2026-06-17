import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { fundService } from '../services/fundService';
import { formatPrice } from '../utils/formatPrice';
import { useAuth } from '../hooks/useAuth';

function DepositModal({ onClose, onSuccess, user }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amount || amount <= 0) return setError('Số tiền phải lớn hơn 0');
    
    setLoading(true);
    try {
      await fundService.deposit({ 
        amount: Number(amount), 
        note, 
        created_by: user?.name || 'Admin' 
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi nạp tiền');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 animate-[slideUp_0.3s_ease]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[20px] font-bold text-on-surface">Góp vốn vào quỹ</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}
          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Số tiền (VNĐ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-lg font-bold focus:outline-none focus:border-primary" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Ghi chú</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="3"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="VD: Admin nạp thêm vốn"></textarea>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-60">
              {loading ? 'Đang xử lý...' : 'Góp vốn'}
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
    if (!amount || amount <= 0) return setError('Số tiền phải lớn hơn 0');
    if (amount > maxAmount) return setError('Số tiền rút không được vượt quá số dư');
    if (fee < 0) return setError('Phí không hợp lệ');
    
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
      setError(err.response?.data?.message || 'Lỗi khi rút tiền');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] p-6 animate-[slideUp_0.3s_ease]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[20px] font-bold text-on-surface">Rút tiền từ {platform.toUpperCase()}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-error-container text-error rounded-lg text-sm">{error}</div>}
          
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 mb-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-on-surface-variant">Số dư khả dụng:</span>
            <span className="font-bold text-primary text-lg">{formatPrice(maxAmount)}</span>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Số tiền rút (VNĐ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" max={maxAmount}
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-lg font-bold focus:outline-none focus:border-primary" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Phí / VAT nền tảng (VNĐ)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" />
            <p className="text-xs text-on-surface-variant mt-1">Tài sản chung sẽ nhận: <strong className="text-[#059669]">{formatPrice(amount - fee)}</strong></p>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Ghi chú</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="2"
              className="w-full border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="VD: Rút doanh thu tháng 5"></textarea>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-60">
              {loading ? 'Đang xử lý...' : 'Xác nhận rút'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FundManagement() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ totalFundBalance: 0, platformBalances: [], adminDeposits: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const expectedFund = summary.totalFundBalance + (summary.platformBalances || []).reduce((sum, p) => sum + p.availableBalance, 0);
  
  const [filterType, setFilterType] = useState('all');
  
  const [showDeposit, setShowDeposit] = useState(false);
  const [withdrawPlatform, setWithdrawPlatform] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, transRes] = await Promise.all([
        fundService.getSummary(),
        fundService.getTransactions(1, 0, filterType)
      ]);
      setSummary(sumRes.data.data);
      setTransactions(transRes.data.data.transactions);
    } catch (error) {
      showToast('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuccess = (msg) => {
    setShowDeposit(false);
    setWithdrawPlatform(null);
    showToast(msg);
    fetchData();
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'admin_deposit': return { label: 'Góp vốn', color: 'bg-[#d1fae5] text-[#059669]' };
      case 'revenue_withdrawal': return { label: 'Rút doanh thu', color: 'bg-[#dbeafe] text-[#2563eb]' };
      case 'import_payment': return { label: 'Thanh toán PN', color: 'bg-[#fee2e2] text-[#dc2626]' };
      case 'expense_payment': return { label: 'Chi tiêu', color: 'bg-orange-100 text-orange-700' };
      case 'system_adjustment': return { label: 'Đồng bộ hệ thống', color: 'bg-surface-container-high text-on-surface-variant' };
      default: return { label: 'Khác', color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-error' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {showDeposit && <DepositModal user={user} onClose={() => setShowDeposit(false)} onSuccess={() => handleSuccess('Góp vốn thành công')} />}
      {withdrawPlatform && <WithdrawModal user={user} platform={withdrawPlatform.platform} maxAmount={withdrawPlatform.availableBalance} onClose={() => setWithdrawPlatform(null)} onSuccess={() => handleSuccess('Rút tiền thành công')} />}

      <div className="flex flex-col pb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Tài sản chung</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">Quản lý vốn, doanh thu và thanh toán phiếu nhập</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Fund Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-primary to-[#4f46e5] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[200px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <p className="text-white/80 font-medium text-sm uppercase tracking-widest mb-2">Tổng tài sản chung</p>
              <h3 className="text-4xl font-black">{formatPrice(summary.totalFundBalance)}</h3>
              <p className="text-white/90 text-[13px] font-medium mt-3 bg-white/10 inline-block px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                Dự kiến: <strong className="text-white">{formatPrice(expectedFund)}</strong>
              </p>
            </div>
            <div className="relative z-10 mt-6">
              <button onClick={() => setShowDeposit(true)} className="w-full bg-white/20 hover:bg-white/30 transition-colors py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Góp vốn
              </button>
            </div>
          </div>

          {/* Platforms Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
            {summary.platformBalances.map(p => (
              <div key={p.platform} className="bg-white rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-on-surface capitalize text-[15px]">{p.platform}</span>
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[16px]">storefront</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-on-surface-variant mb-0.5">Khả dụng</p>
                  <p className="text-lg font-bold text-[#059669]">{formatPrice(p.availableBalance)}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/30">
                  <button 
                    onClick={() => setWithdrawPlatform(p)}
                    disabled={p.availableBalance <= 0}
                    className="w-full py-1.5 rounded-lg text-[13px] font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Rút tiền
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Contributions */}
        {summary.adminDeposits && summary.adminDeposits.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 mb-8">
            <h3 className="font-bold text-on-surface text-[16px] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
              Tỉ lệ góp vốn của các Admin
            </h3>
            <div className="space-y-5">
              {summary.adminDeposits.map(d => {
                const totalAll = summary.adminDeposits.reduce((s, a) => s + a.totalDeposit, 0);
                const percent = totalAll > 0 ? (d.totalDeposit / totalAll * 100).toFixed(1) : 0;
                return (
                  <div key={d.admin}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-bold text-on-surface text-[15px]">{d.admin}</span>
                      <div className="text-right leading-none">
                        <span className="font-black text-primary text-[15px] mr-2">{formatPrice(d.totalDeposit)}</span>
                        <span className="text-on-surface-variant font-bold text-[13px] bg-surface-container px-2 py-0.5 rounded">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden flex">
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
            <h3 className="font-bold text-on-surface text-[16px]">Lịch sử giao dịch</h3>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-outline-variant rounded-lg px-4 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none focus:border-primary bg-white min-w-[180px]"
            >
              <option value="all">Tất cả giao dịch</option>
              <option value="admin_deposit">Góp vốn</option>
              <option value="revenue_withdrawal">Rút doanh thu</option>
              <option value="import_payment">Thanh toán PN</option>
              <option value="seeding_payment">Chi phí Seeding</option>
              <option value="shipping_payment">Phí Ship</option>
              <option value="system_adjustment">Đồng bộ hệ thống</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm bg-surface-container-lowest">
                <tr>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Thời gian</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Loại giao dịch</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Biến động</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Phí / VAT</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Chi tiết</th>
                  <th className="px-6 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">Người tạo</th>
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
                    <td colSpan="6" className="px-6 py-12 text-center text-on-surface-variant">Chưa có giao dịch nào</td>
                  </tr>
                ) : (
                  transactions.map(t => {
                    const typeInfo = getTypeLabel(t.type);
                    return (
                      <tr key={t._id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-3 text-[13px] text-on-surface-variant whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${typeInfo.color}`}>
                            {typeInfo.label} {t.source ? `(${t.source})` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`font-bold text-[14px] ${t.fund_change >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                            {t.fund_change >= 0 ? '+' : ''}{formatPrice(t.fund_change)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[13px] text-on-surface-variant font-medium">
                          {t.fee > 0 ? formatPrice(t.fee) : '-'}
                        </td>
                        <td className="px-6 py-3 text-[13px] text-on-surface max-w-[250px] truncate" title={t.note}>
                          {t.note || '-'}
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
