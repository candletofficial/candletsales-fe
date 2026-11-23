import { useEffect, useMemo } from 'react';
import { formatPrice } from '../utils/formatPrice';
import { getFundAccountLabel } from '../utils/shippingCarriers';

const accountLabel = (accountId) => (
  accountId === 'common' ? 'Tài khoản chính' : getFundAccountLabel(accountId)
);

export default function FundOverviewModal({ summary, onClose }) {
  const details = useMemo(() => {
    const currentFund = Number(summary?.totalFundBalance || 0);
    const unpaidTotal = Number(summary?.totalUnpaidAmount || 0);
    const importDebt = Number(summary?.totalImportDebt || 0);
    const platformAvailable = (summary?.platformBalances || [])
      .reduce((sum, account) => sum + Number(account.availableBalance || 0), 0);

    const accounts = [
      {
        id: 'common',
        available: currentFund,
        unpaid: Number(summary?.commonUnpaidAmount || 0),
      },
      ...(summary?.platformBalances || []).map((account) => ({
        id: account.platform,
        available: Number(account.availableBalance || 0),
        unpaid: Number(account.unpaidAmount || 0),
      })),
    ].filter((account) => account.available > 0 || account.unpaid > 0);

    return {
      currentFund,
      platformAvailable,
      unpaidTotal,
      importDebt,
      expected: currentFund + platformAvailable + unpaidTotal - importDebt,
      accounts,
    };
  }, [summary]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <section
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-[#F8FAFC] shadow-2xl sm:max-w-2xl sm:rounded-[24px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fund-overview-title"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined text-[21px]">account_balance_wallet</span>
            </span>
            <div className="min-w-0">
              <h2 id="fund-overview-title" className="text-[17px] font-extrabold text-slate-900">Chi tiết tài sản dự kiến</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Theo dõi số dư hiện có, tiền đang chờ và công nợ</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100" aria-label="Đóng">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#173A73] to-[#087F8C] p-5 text-white shadow-lg shadow-blue-950/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-white/65">Tổng tiền dự kiến</p>
            <p className="mt-1 text-[30px] font-black leading-tight sm:text-[34px]">{formatPrice(details.expected)}</p>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-white/15 pt-4 text-[12px]">
              <span className="text-white/70">Tiền đang có sẵn</span>
              <strong>{formatPrice(details.currentFund + details.platformAvailable)}</strong>
              <span className="text-white/70">Tiền chưa thanh toán</span>
              <strong className="text-amber-200">+ {formatPrice(details.unpaidTotal)}</strong>
              <span className="text-white/70">Nợ kho</span>
              <strong className="text-rose-200">− {formatPrice(details.importDebt)}</strong>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-slate-700">Chi tiết từng tài khoản</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">Chỉ hiển thị tài khoản đang có phát sinh</p>
            </div>
            <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[10px] font-bold text-slate-600">{details.accounts.length} tài khoản</span>
          </div>

          <div className="mt-3 space-y-2.5">
            {details.accounts.map((account) => (
              <article key={account.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <span className="material-symbols-outlined text-[18px]">{account.id === 'common' ? 'account_balance' : 'wallet'}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-extrabold text-slate-900">{accountLabel(account.id)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">Tổng {formatPrice(account.available + account.unpaid)}</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-[15px] font-black text-slate-900">{formatPrice(account.available + account.unpaid)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700/70">Sẵn có</p>
                    <p className="mt-0.5 text-[12px] font-extrabold text-emerald-700">{formatPrice(account.available)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700/70">Chưa thanh toán</p>
                    <p className="mt-0.5 text-[12px] font-extrabold text-amber-700">{formatPrice(account.unpaid)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
            <div className="flex items-center gap-2 text-rose-700">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span className="text-[12px] font-bold">Nợ kho cần thanh toán</span>
            </div>
            <strong className="text-[14px] text-rose-700">{formatPrice(details.importDebt)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
