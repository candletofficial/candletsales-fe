import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';

const STATUS_META = {
  pending: { label: 'Chờ xác nhận', icon: 'ph-clock', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  confirmed: { label: 'Đang chuẩn bị', icon: 'ph-package', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  shipping: { label: 'Đang giao hàng', icon: 'ph-truck', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  delivered: { label: 'Đã giao hàng', icon: 'ph-check-circle', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Đã huỷ', icon: 'ph-prohibit', tone: 'bg-stone-100 text-stone-600 border-stone-200' },
  failed: { label: 'Giao thất bại', icon: 'ph-warning-circle', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const formatPrice = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND',
}).format(value || 0);

const formatDate = (value) => value
  ? new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
    })
  : 'Chưa cập nhật';

export default function OrderLookup() {
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedPhone = phone.trim();
    const normalizedOrderId = orderId.trim().toUpperCase();
    if (!normalizedPhone && !normalizedOrderId) {
      setError('Vui lòng nhập số điện thoại nhận hàng hoặc mã đơn hàng.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = {};
      if (normalizedPhone) params.phone = normalizedPhone;
      if (normalizedOrderId) params.orderId = normalizedOrderId;
      const response = await orderService.getShopOrders(params);
      setOrders(response.data?.success ? response.data.data || [] : []);
    } catch (requestError) {
      setOrders(null);
      setError(requestError.response?.data?.message || 'Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 font-jakarta text-[#2C1810] sm:bg-[#FBF9F6] sm:px-6 sm:py-14 lg:px-8 lg:pb-24">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-7 max-w-2xl text-center sm:mb-10">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-[#F4E9DF] text-xl text-[#8C4A32] shadow-xs">
            <i className="ph-bold ph-package"></i>
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B45309]">Theo dõi đơn hàng</p>
          <h1 className="font-serif-display text-3xl font-bold text-[#3B2422] sm:text-5xl">Tra cứu đơn hàng</h1>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-stone-500 sm:text-sm">
            Nhập số điện thoại nhận hàng hoặc mã đơn để kiểm tra trạng thái xử lý và tiến độ giao hàng.
          </p>
        </header>

        <section className="rounded-3xl border border-stone-200/90 bg-white p-5 shadow-[0_10px_35px_rgba(74,44,42,0.07)] sm:p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <label className="sm:col-span-5">
              <span className="mb-1.5 block text-[11px] font-bold text-stone-600">Số điện thoại nhận hàng</span>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0328624761" value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 font-mono text-xs outline-none transition focus:border-[#4A2C2A] focus:bg-white focus:ring-3 focus:ring-[#4A2C2A]/8" />
            </label>
            <label className="sm:col-span-4">
              <span className="mb-1.5 block text-[11px] font-bold text-stone-600">Mã đơn hàng</span>
              <input type="text" autoCapitalize="characters" placeholder="Ví dụ: DH-1234567" value={orderId}
                onChange={(event) => setOrderId(event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 font-mono text-xs uppercase outline-none transition focus:border-[#4A2C2A] focus:bg-white focus:ring-3 focus:ring-[#4A2C2A]/8" />
            </label>
            <div className="flex items-end sm:col-span-3">
              <button type="submit" disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#4A2C2A] px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#381B18] disabled:cursor-wait disabled:opacity-70">
                {loading ? <i className="ph-bold ph-spinner animate-spin text-base"></i> : <i className="ph-bold ph-magnifying-glass"></i>}
                <span>{loading ? 'Đang tìm' : 'Tra cứu'}</span>
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              <i className="ph-fill ph-warning-circle mt-0.5 text-base"></i><span>{error}</span>
            </div>
          )}
        </section>

        {orders && (
          <section className="mt-7 sm:mt-10">
            <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="font-serif-display text-xl font-bold text-[#3B2422] sm:text-2xl">Kết quả tra cứu</h2>
              <span className="text-[11px] font-semibold text-stone-500">{orders.length} đơn hàng</span>
            </div>
            {orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
                <i className="ph ph-package text-4xl text-stone-300"></i>
                <h3 className="mt-3 font-serif-display text-lg font-bold text-stone-700">Không tìm thấy đơn hàng</h3>
                <p className="mt-1 text-xs text-stone-500">Hãy kiểm tra lại số điện thoại hoặc mã đơn bạn đã nhập.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const meta = STATUS_META[order.delivery_status || 'pending'] || STATUS_META.pending;
                  return (
                    <article key={order._id || order.orderId} className="rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Mã đơn hàng</p>
                          <h3 className="mt-1 font-mono text-base font-bold text-[#4A2C2A]">#{order.orderId}</h3>
                          <p className="mt-1 text-[11px] text-stone-500">Đặt lúc {formatDate(order.ordered_at)}</p>
                        </div>
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${meta.tone}`}>
                          <i className={`ph-bold ${meta.icon}`}></i>{meta.label}
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-3">
                        <div><span className="text-[10px] uppercase tracking-wider text-stone-400">Người nhận</span><p className="mt-1 text-xs font-semibold text-stone-700">{order.customer_name || 'Chưa cập nhật'}</p></div>
                        <div><span className="text-[10px] uppercase tracking-wider text-stone-400">Sản phẩm</span><p className="mt-1 text-xs font-semibold text-stone-700">{(order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)} sản phẩm</p></div>
                        <div className="sm:text-right"><span className="text-[10px] uppercase tracking-wider text-stone-400">Tổng tiền</span><p className="mt-1 text-sm font-bold text-[#4A2C2A]">{formatPrice(order.total_price)}</p></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
          <span>Đã có tài khoản?</span><Link to="/login" className="font-bold text-[#4A2C2A] hover:underline">Đăng nhập để xem toàn bộ đơn mua</Link>
        </div>
      </div>
    </main>
  );
}
