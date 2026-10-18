import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/imageUtils';

const steps = [
  { value: 'pending', label: 'Chờ xác nhận', description: 'Shop đang kiểm tra thông tin đơn hàng.', icon: 'receipt_long' },
  { value: 'confirmed', label: 'Đã chấp nhận', description: 'Sản phẩm đang được chuẩn bị để giao.', icon: 'inventory_2' },
  { value: 'shipping', label: 'Đang giao hàng', description: 'Đơn hàng đang trên đường đến bạn.', icon: 'local_shipping' },
  { value: 'delivered', label: 'Giao thành công', description: 'Đơn hàng đã được giao đến bạn.', icon: 'task_alt' },
];

const statusDetails = {
  pending: { label: 'Chờ xác nhận', eyebrow: 'Shop đã nhận được đơn', description: 'Shop đang kiểm tra thông tin và sẽ sớm xác nhận đơn hàng của bạn.', icon: 'schedule', tone: 'border-amber-200 bg-amber-50 text-amber-950', iconTone: 'bg-amber-500 text-white shadow-amber-200' },
  confirmed: { label: 'Đơn hàng đã được chấp nhận', eyebrow: 'Đang chuẩn bị hàng', description: 'Shop đang chuẩn bị sản phẩm trước khi bàn giao cho đơn vị vận chuyển.', icon: 'inventory_2', tone: 'border-sky-200 bg-sky-50 text-sky-950', iconTone: 'bg-sky-600 text-white shadow-sky-200' },
  shipping: { label: 'Đơn hàng đang được giao', eyebrow: 'Đang vận chuyển', description: 'Đơn hàng đang trên đường đến bạn. Vui lòng để ý điện thoại khi tài xế liên hệ.', icon: 'local_shipping', tone: 'border-blue-200 bg-blue-50 text-blue-950', iconTone: 'bg-blue-600 text-white shadow-blue-200' },
  delivered: { label: 'Giao hàng thành công', eyebrow: 'Đơn hàng đã hoàn tất', description: 'Cảm ơn bạn đã mua sắm cùng shop. Chúc bạn có trải nghiệm thật vui!', icon: 'task_alt', tone: 'border-emerald-200 bg-emerald-50 text-emerald-950', iconTone: 'bg-emerald-600 text-white shadow-emerald-200' },
  failed: { label: 'Giao hàng chưa thành công', eyebrow: 'Cần hỗ trợ', description: 'Đơn hàng chưa thể giao thành công. Vui lòng liên hệ shop để được hỗ trợ.', icon: 'error', tone: 'border-rose-200 bg-rose-50 text-rose-950', iconTone: 'bg-rose-600 text-white shadow-rose-200' },
  returned: { label: 'Đơn hàng đã hoàn về shop', eyebrow: 'Đã hoàn hàng', description: 'Đơn hàng đã được ghi nhận hoàn về shop. Vui lòng liên hệ nếu bạn cần hỗ trợ.', icon: 'keyboard_return', tone: 'border-orange-200 bg-orange-50 text-orange-950', iconTone: 'bg-orange-600 text-white shadow-orange-200' },
  cancelled: { label: 'Đơn hàng đã huỷ', eyebrow: 'Đã kết thúc', description: 'Đơn hàng này đã được huỷ. Vui lòng liên hệ shop nếu bạn cần hỗ trợ.', icon: 'cancel', tone: 'border-stone-200 bg-stone-100 text-stone-900', iconTone: 'bg-stone-600 text-white shadow-stone-200' },
};

const dateText = value => value && !Number.isNaN(new Date(value).getTime())
  ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  : '';

export default function OrderTracking() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      setLoading(true);
      try {
        const result = await orderService.getTrackingOrder(token);
        if (active) { setOrder(result.data.data); setError(''); }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Chưa thể cập nhật trạng thái. Vui lòng thử lại.');
          if (err.response?.status === 404) setOrder(null);
        }
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    load();
    const refreshVisible = () => { if (document.visibilityState === 'visible') load(); };
    const timer = window.setInterval(refreshVisible, 30000);
    window.addEventListener('focus', refreshVisible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refreshVisible); };
  }, [token, refresh]);

  const status = order?.status === 'cancelled' ? 'cancelled'
    : order?.status === 'returned' ? 'returned'
    : order?.delivery_status === 'failed' ? 'failed' : order?.delivery_status || 'pending';
  const stepIndex = steps.findIndex(step => step.value === status);
  const exceptionProgress = status === 'failed' || status === 'returned' ? 2 : -1;
  const statusDetail = statusDetails[status] || statusDetails.pending;

  const copyOrderId = async () => {
    if (!order?.orderId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  };

  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-[#faf8f5] to-white px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 sm:mb-8">
          <Link to="/shop" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400">
            <span aria-hidden="true" className="material-symbols-outlined text-xl">arrow_back</span>Về cửa hàng
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3724d]">Đơn hàng của bạn</p><h1 className="mt-1.5 font-serif-display text-[2rem] leading-tight text-stone-950 sm:text-4xl">Theo dõi đơn hàng</h1></div>
            <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)} aria-label="Cập nhật trạng thái đơn hàng" className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60 sm:size-auto sm:min-h-11 sm:gap-2 sm:px-4">
              <span aria-hidden="true" className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>refresh</span><span className="hidden text-sm font-semibold sm:inline">{loading ? 'Đang cập nhật' : 'Cập nhật'}</span>
            </button>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl">warning</span><span className="flex-1">{error}</span>{order && <button type="button" onClick={() => setRefresh(value => value + 1)} className="shrink-0 font-bold underline underline-offset-2">Thử lại</button>}</div>}

        {loading && !order ? (
          <div role="status" aria-label="Đang tải đơn hàng" className="space-y-4"><div className="h-56 animate-pulse rounded-3xl bg-stone-200/70" /><div className="h-72 animate-pulse rounded-3xl bg-stone-100" /></div>
        ) : order && (
          <div className="space-y-4 sm:space-y-6">
            <section aria-live="polite" className={`overflow-hidden rounded-3xl border shadow-sm ${statusDetail.tone}`}>
              <div className="p-5 sm:p-7"><div className="flex items-start gap-4">
                <span aria-hidden="true" className={`material-symbols-outlined flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg ${statusDetail.iconTone}`}>{statusDetail.icon}</span>
                <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-65">{statusDetail.eyebrow}</p><h2 className="mt-1 text-xl font-extrabold leading-snug sm:text-2xl">{statusDetail.label}</h2><p className="mt-2 text-sm leading-6 opacity-80 sm:max-w-2xl">{statusDetail.description}</p></div>
              </div></div>
              <div className="flex items-center gap-2 border-t border-current/10 bg-white/40 px-5 py-3 text-xs font-medium opacity-75 sm:px-7"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" /><span className="relative inline-flex size-2 rounded-full bg-current" /></span>Tự động cập nhật mỗi 30 giây{order.updated_at && <span className="ml-auto hidden sm:inline">Cập nhật lúc {dateText(order.updated_at)}</span>}</div>
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.82fr)] lg:gap-6">
              <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex items-center gap-3"><span aria-hidden="true" className="material-symbols-outlined flex size-9 items-center justify-center rounded-xl bg-[#f5eee8] text-xl text-[#8c5e3c]">route</span><div><h2 className="font-bold text-stone-900">Hành trình đơn hàng</h2><p className="mt-0.5 text-xs text-stone-500">Theo dõi tiến trình mới nhất</p></div></div>
                <ol>{steps.map((step, index) => {
                  const isCurrent = index === stepIndex;
                  const isDone = stepIndex >= 0 ? index < stepIndex : index <= exceptionProgress;
                  const lineActive = stepIndex >= 0 ? index < stepIndex : index < exceptionProgress;
                  return <li key={step.value} aria-current={isCurrent ? 'step' : undefined} className="relative flex gap-4 pb-7 last:pb-0">
                    {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[17px] top-9 h-[calc(100%-1.5rem)] w-0.5 rounded-full ${lineActive ? 'bg-[#b98056]' : 'bg-stone-200'}`} />}
                    <span aria-hidden="true" className={`material-symbols-outlined relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-[19px] ring-4 ring-white ${isCurrent ? 'bg-[#4a2c2a] text-white shadow-md' : isDone ? 'bg-[#c8956c] text-white' : 'bg-stone-100 text-stone-400'}`}>{isDone ? 'check' : step.icon}</span>
                    <div className={`min-w-0 flex-1 pt-0.5 ${isCurrent || isDone ? 'text-stone-900' : 'text-stone-400'}`}><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold sm:text-[15px]">{step.label}</p>{isCurrent && <span className="rounded-full bg-[#f3e6dc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7b4a2f]">Hiện tại</span>}</div><p className="mt-1 text-xs leading-5 opacity-70">{step.description}</p></div>
                  </li>;
                })}</ol>
                {order.updated_at && <p className="mt-6 border-t border-stone-100 pt-4 text-xs text-stone-400 sm:hidden">Cập nhật gần nhất: {dateText(order.updated_at)}</p>}
              </section>

              <div className="space-y-4 lg:sticky lg:top-24">
                <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Mã đơn hàng</p><p className="mt-1.5 break-all font-mono text-base font-bold text-stone-900">{order.orderId}</p></div><button type="button" onClick={copyOrderId} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-stone-100 px-3 text-xs font-bold text-stone-600 transition hover:bg-stone-200" aria-label="Sao chép mã đơn hàng"><span aria-hidden="true" className="material-symbols-outlined text-lg">{copied ? 'check' : 'content_copy'}</span>{copied ? 'Đã chép' : 'Sao chép'}</button></div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4 text-sm"><div><dt className="text-xs text-stone-400">Ngày đặt hàng</dt><dd className="mt-1 font-semibold text-stone-700">{dateText(order.ordered_at) || '—'}</dd></div><div><dt className="text-xs text-stone-400">Vận chuyển</dt><dd className="mt-1 font-semibold text-stone-700">{order.shippingMethod === 'express' ? 'Hỏa tốc 4h' : 'Tiêu chuẩn'}</dd></div></dl>
                </section>

                <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6"><h2 className="font-bold text-stone-900">Sản phẩm</h2><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-500">{order.items.length} sản phẩm</span></div>
                  <ul className="divide-y divide-stone-100 px-5 sm:px-6">{order.items.map((item, index) => <li key={`${item.product_name}-${index}`} className="flex items-start gap-3 py-4">
                    {item.product_image ? <img src={getImageUrl(item.product_image)} alt="" className="size-16 shrink-0 rounded-2xl border border-stone-100 object-cover" /> : <span aria-hidden="true" className="material-symbols-outlined flex size-16 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-300">inventory_2</span>}
                    <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold leading-5 text-stone-800">{item.product_name}</p>{item.sku_label && <p className="mt-1 truncate text-xs text-stone-500">{item.sku_label}</p>}<div className="mt-2 flex items-end justify-between gap-2"><span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-500">SL: {item.quantity}</span><span className="text-sm font-bold text-stone-800">{formatPrice(item.unit_price * item.quantity)}</span></div></div>
                  </li>)}</ul>
                  <div className="flex items-end justify-between gap-4 bg-[#faf8f5] px-5 py-4 sm:px-6"><span className="text-sm font-semibold text-stone-600">Tổng đơn hàng</span><strong className="text-xl text-[#4a2c2a]">{formatPrice(order.total_price)}</strong></div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
