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
  pending: { label: 'Chờ xác nhận', eyebrow: 'Shop đã nhận được đơn', description: 'Shop đang kiểm tra thông tin và sẽ sớm xác nhận đơn hàng của bạn.', icon: 'schedule', tone: 'bg-amber-50 text-amber-950', iconTone: 'bg-amber-500 text-white shadow-amber-200' },
  confirmed: { label: 'Đơn hàng đã được chấp nhận', eyebrow: 'Đang chuẩn bị hàng', description: 'Shop đang chuẩn bị sản phẩm trước khi bàn giao cho đơn vị vận chuyển.', icon: 'inventory_2', tone: 'bg-sky-50 text-sky-950', iconTone: 'bg-sky-600 text-white shadow-sky-200' },
  shipping: { label: 'Đơn hàng đang được giao', eyebrow: 'Đang vận chuyển', description: 'Đơn hàng đang trên đường đến bạn. Vui lòng để ý điện thoại khi tài xế liên hệ.', icon: 'local_shipping', tone: 'bg-blue-50 text-blue-950', iconTone: 'bg-blue-600 text-white shadow-blue-200' },
  delivered: { label: 'Giao hàng thành công', eyebrow: 'Đơn hàng đã hoàn tất', description: 'Cảm ơn bạn đã mua sắm cùng shop. Chúc bạn có trải nghiệm thật vui!', icon: 'task_alt', tone: 'bg-emerald-50 text-emerald-950', iconTone: 'bg-emerald-600 text-white shadow-emerald-200' },
  failed: { label: 'Giao hàng chưa thành công', eyebrow: 'Cần hỗ trợ', description: 'Đơn hàng chưa thể giao thành công. Vui lòng liên hệ shop để được hỗ trợ.', icon: 'error', tone: 'bg-rose-50 text-rose-950', iconTone: 'bg-rose-600 text-white shadow-rose-200' },
  returned: { label: 'Đơn hàng đã hoàn về shop', eyebrow: 'Đã hoàn hàng', description: 'Đơn hàng đã được ghi nhận hoàn về shop. Vui lòng liên hệ shop nếu bạn cần hỗ trợ.', icon: 'keyboard_return', tone: 'bg-orange-50 text-orange-950', iconTone: 'bg-orange-600 text-white shadow-orange-200' },
  cancelled: { label: 'Đơn hàng đã huỷ', eyebrow: 'Đã kết thúc', description: 'Đơn hàng này đã được huỷ. Vui lòng liên hệ shop nếu bạn cần hỗ trợ.', icon: 'cancel', tone: 'bg-stone-100 text-stone-900', iconTone: 'bg-stone-600 text-white shadow-stone-200' },
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
    <main className="bg-[#f5f5f5] sm:px-6 sm:py-10">
      <article className="mx-auto max-w-3xl overflow-hidden bg-white sm:border sm:border-stone-200 sm:shadow-sm">
        <header className="flex min-h-14 items-center gap-2 border-b border-stone-200 bg-white px-3 sm:px-5">
          <Link to="/shop" aria-label="Về cửa hàng" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-100">
            <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="min-w-0 flex-1 text-[17px] font-extrabold text-stone-900">Theo dõi đơn hàng</h1>
          <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)} aria-label="Cập nhật trạng thái đơn hàng" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-50">
            <span aria-hidden="true" className={`material-symbols-outlined text-[21px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </header>

        {error && <aside role="alert" className="mx-3 mt-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950 sm:mx-0"><span aria-hidden="true" className="material-symbols-outlined text-xl">warning</span><p className="flex-1">{error}</p>{order && <button type="button" onClick={() => setRefresh(value => value + 1)} className="shrink-0 font-bold text-amber-900">Thử lại</button>}</aside>}

        {loading && !order ? (
          <section role="status" aria-label="Đang tải đơn hàng" className="space-y-3 p-3 sm:p-0">
            <span className="block h-44 animate-pulse rounded-2xl bg-stone-200" />
            <span className="block h-52 animate-pulse rounded-2xl bg-white" />
          </section>
        ) : !order ? (
          <section className="m-3 rounded-2xl bg-white px-5 py-12 text-center shadow-sm sm:m-0">
            <span aria-hidden="true" className="material-symbols-outlined text-5xl text-stone-300">package_2</span>
            <h2 className="mt-3 text-lg font-bold text-stone-900">Không tìm thấy đơn hàng</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">Đường dẫn có thể đã hết hiệu lực hoặc đơn hàng không còn tồn tại.</p>
            <Link to="/shop" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#4a2c2a] px-5 text-sm font-bold text-white">Về cửa hàng</Link>
          </section>
        ) : (
          <section>
            <section aria-live="polite" className={`overflow-hidden border-b-8 border-stone-100 ${statusDetail.tone}`}>
              <header className="flex items-start gap-3 p-4 sm:p-6">
                <span aria-hidden="true" className={`material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm ${statusDetail.iconTone}`}>{statusDetail.icon}</span>
                <hgroup className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-60">{statusDetail.eyebrow}</p>
                  <h2 className="mt-1 text-lg font-extrabold leading-6 sm:text-xl">{statusDetail.label}</h2>
                  <p className="mt-1.5 text-[13px] leading-5 opacity-75">{statusDetail.description}</p>
                </hgroup>
              </header>
              <footer className="flex items-center gap-2 border-t border-current/10 bg-white/45 px-4 py-2.5 text-[11px] font-semibold opacity-70 sm:px-6">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current shadow-[0_0_0_3px_rgba(255,255,255,0.65)]" />
                Tự động cập nhật mỗi 30 giây
                {order.updated_at && <time className="ml-auto" dateTime={order.updated_at}>{dateText(order.updated_at)}</time>}
              </footer>
            </section>

            <section className="border-b-8 border-stone-100 bg-white">
              <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3.5 sm:px-5">
                <h2 className="text-sm font-extrabold text-stone-900">Thông tin đơn hàng</h2>
                <button type="button" onClick={copyOrderId} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-stone-100 px-2.5 text-[11px] font-bold text-stone-600" aria-label="Sao chép mã đơn hàng">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>{copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </header>
              <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 px-4 py-4 text-[13px] sm:px-5">
                <dt className="text-stone-500">Mã đơn</dt><dd className="min-w-0 break-all text-right font-mono font-bold text-stone-900">{order.orderId}</dd>
                <dt className="text-stone-500">Ngày đặt</dt><dd className="text-right font-semibold text-stone-800">{dateText(order.ordered_at) || '—'}</dd>
                <dt className="text-stone-500">Vận chuyển</dt><dd className="text-right font-semibold text-stone-800">{order.shippingMethod === 'express' ? 'Hỏa tốc 4h' : 'Tiêu chuẩn'}</dd>
              </dl>
              <address className="flex gap-3 border-t border-stone-100 px-4 py-4 not-italic sm:px-5">
                <span aria-hidden="true" className="material-symbols-outlined flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-lg text-[#c45e37]">location_on</span>
                <p className="min-w-0 flex-1 text-[13px] leading-5 text-stone-600">
                  <strong className="block text-sm text-stone-900">Thông tin người nhận</strong>
                  <span className="mt-1 block font-semibold text-stone-800">{order.customer?.name || 'Chưa cập nhật'}{order.customer?.phone && ` · ${order.customer.phone}`}</span>
                  <span className="mt-0.5 block break-words">{order.customer?.address || 'Chưa cập nhật địa chỉ giao hàng'}</span>
                </p>
              </address>
            </section>

            <section className="border-b-8 border-stone-100 bg-white px-4 py-5 sm:px-6 sm:py-6">
              <header className="mb-5 flex items-center gap-2.5">
                <span aria-hidden="true" className="material-symbols-outlined flex size-9 items-center justify-center rounded-lg bg-orange-50 text-xl text-[#a45f32]">local_shipping</span>
                <hgroup>
                  <h2 className="text-[15px] font-extrabold text-stone-900">Hành trình đơn hàng</h2>
                  <p className="text-[11px] text-stone-500">Trạng thái vận chuyển mới nhất</p>
                </hgroup>
              </header>
              <ol className="pl-0.5">{steps.map((step, index) => {
                const isCurrent = index === stepIndex;
                const isDone = stepIndex >= 0 ? index < stepIndex : index <= exceptionProgress;
                const lineActive = stepIndex >= 0 ? index < stepIndex : index < exceptionProgress;
                return <li key={step.value} aria-current={isCurrent ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${lineActive ? 'bg-[#c78455]' : 'bg-stone-200'}`} />}
                  <span aria-hidden="true" className={`material-symbols-outlined relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[17px] ring-[3px] ring-white ${isCurrent ? 'bg-[#ee4d2d] text-white shadow-sm' : isDone ? 'bg-[#c78455] text-white' : 'bg-stone-100 text-stone-400'}`}>{isDone ? 'check' : step.icon}</span>
                  <article className={`min-w-0 flex-1 pt-0.5 ${isCurrent || isDone ? 'text-stone-900' : 'text-stone-400'}`}>
                    <header className="flex flex-wrap items-center gap-2"><h3 className="text-[13px] font-bold">{step.label}</h3>{isCurrent && <mark className="rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#c34c2b]">Hiện tại</mark>}</header>
                    <p className="mt-0.5 text-[11px] leading-4 opacity-70">{step.description}</p>
                  </article>
                </li>;
              })}</ol>
            </section>

            <section className="overflow-hidden border-b border-stone-200 bg-white">
              <header className="flex items-center justify-between border-b border-stone-100 px-4 py-3.5 sm:px-5">
                <h2 className="text-sm font-extrabold text-stone-900">Sản phẩm đã đặt</h2>
                <span className="text-xs font-semibold text-stone-500">{(order.items || []).length} sản phẩm</span>
              </header>
              <ul className="divide-y divide-stone-100 px-4 sm:px-5">{(order.items || []).map((item, index) => <li key={`${item.product_name}-${index}`} className="flex gap-3 py-3.5">
                {item.product_image ? <img src={getImageUrl(item.product_image)} alt="" className="size-[68px] shrink-0 rounded-xl border border-stone-100 object-cover" /> : <span aria-hidden="true" className="material-symbols-outlined flex size-[68px] shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-300">inventory_2</span>}
                <article className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[13px] font-bold leading-5 text-stone-900">{item.product_name}</h3>
                  {item.sku_label && <p className="mt-0.5 truncate text-[11px] text-stone-500">Phân loại: {item.sku_label}</p>}
                  <footer className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-stone-500">x{item.quantity}</span><strong className="text-[13px] text-stone-900">{formatPrice(item.unit_price * item.quantity)}</strong></footer>
                </article>
              </li>)}</ul>
              <footer className="flex items-center justify-between bg-stone-50 px-4 py-3.5 sm:px-5"><span className="text-[13px] text-stone-600">Thành tiền</span><strong className="text-lg text-[#ee4d2d]">{formatPrice(order.total_price)}</strong></footer>
            </section>

            <footer className="px-2 py-2 text-center text-xs text-stone-500">
              Cần hỗ trợ? <a href="tel:0328624761" className="font-bold text-[#8c4a32]">Gọi shop 032.862.4761</a>
            </footer>
          </section>
        )}
      </article>
    </main>
  );
}
