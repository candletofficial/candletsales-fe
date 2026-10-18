import { useState } from 'react';
import { formatPrice } from '../utils/formatPrice';

const hasValue = value => value !== undefined && value !== null && String(value).trim() !== '';
const safeUrl = value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};

function DetailGroup({ title, fields }) {
  const visible = fields.filter(field => hasValue(field.value));
  if (!visible.length) return null;
  return <div className="space-y-2.5">
    <h4 className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{title}</h4>
    <dl className="space-y-2.5">
      {visible.map(field => <div key={field.label} className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3 text-xs sm:grid-cols-[110px_minmax(0,1fr)]">
        <dt className="leading-relaxed text-stone-500">{field.label}</dt>
        <dd className="whitespace-pre-line break-words font-medium leading-relaxed text-stone-800">{field.value}</dd>
      </div>)}
    </dl>
  </div>;
}

export default function OrderCustomerDetails({ order, name, phone, address }) {
  const [expanded, setExpanded] = useState(false);
  const details = order.pancake_details || {};
  const pancake = Boolean(order.pancake_order_id);
  const phones = details.phones?.length ? details.phones.join('\n') : phone;
  const emails = details.emails?.join('\n');
  if (!pancake && ![name, phone, address].some(hasValue)) return null;
  const stats = [
    { label: 'Tổng đơn', value: details.order_count, color: 'text-stone-800' },
    { label: 'Thành công', value: details.succeed_order_count, color: 'text-emerald-700' },
    { label: 'Đơn hoàn', value: details.returned_order_count, color: 'text-amber-700' },
  ].filter(stat => hasValue(stat.value));
  const links = [
    { label: 'Mở đơn gốc', url: safeUrl(details.order_url), icon: 'open_in_new' },
    { label: 'Cuộc trò chuyện', url: safeUrl(details.conversation_url), icon: 'forum' },
    { label: 'Tra cứu vận chuyển', url: safeUrl(details.tracking_url), icon: 'local_shipping' },
  ].filter(link => link.url);
  const summaryName = details.name || name || details.recipient_name || 'Chưa có tên khách hàng';
  const summaryPhone = phones || details.recipient_phone;
  const summaryAddress = details.address || address || details.street;

  return <section aria-labelledby="order-customer-details-title" className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="material-symbols-outlined flex size-8 items-center justify-center rounded-lg bg-blue-50 text-[19px] text-primary">person_pin</span>
        <h3 id="order-customer-details-title" className="text-[13px] font-bold uppercase tracking-wider text-stone-700">Thông tin khách hàng</h3>
      </div>
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        aria-controls="order-customer-details-content"
        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-primary transition-colors hover:bg-blue-50"
      >
        {expanded ? 'Thu gọn' : 'Xem chi tiết'}
        <span aria-hidden="true" className={`material-symbols-outlined text-lg transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
    </div>

    {!expanded && <div className="mt-3 space-y-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-stone-400">person</span>
        <span className="truncate text-sm font-semibold text-stone-800">{summaryName}</span>
        {details.is_block && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">Đã chặn</span>}
      </div>
      {hasValue(summaryPhone) && <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-stone-400">call</span>
        <span className="whitespace-pre-line text-xs font-medium text-stone-600">{summaryPhone}</span>
      </div>}
      {hasValue(summaryAddress) && <div className="flex min-w-0 items-start gap-2.5">
        <span aria-hidden="true" className="material-symbols-outlined mt-px text-[18px] text-stone-400">location_on</span>
        <span className="line-clamp-2 text-xs leading-relaxed text-stone-600">{summaryAddress}</span>
      </div>}
    </div>}

    {expanded && <div id="order-customer-details-content" className="mt-4 space-y-5">
      {details.is_block && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Khách hàng được đánh dấu chặn.</p>}
      <DetailGroup title="Hồ sơ khách hàng" fields={[
        { label: 'Họ tên', value: details.name || name },
        { label: 'Tài khoản', value: details.username },
        { label: 'Mã khách hàng', value: details.customer_id },
        { label: 'Số điện thoại', value: phones },
        { label: 'Email', value: emails },
      ]} />
      <DetailGroup title="Người nhận & địa chỉ giao hàng" fields={[
        { label: 'Người nhận', value: details.recipient_name },
        { label: 'SĐT nhận hàng', value: details.recipient_phone },
        { label: 'Email nhận hàng', value: details.recipient_email },
        { label: 'Địa chỉ', value: details.address || address || details.street },
        { label: 'Phường / xã', value: details.commune },
        { label: 'Quận / huyện', value: details.district },
        { label: 'Tỉnh / thành', value: details.province },
        { label: 'Mã bưu chính', value: details.postcode },
        { label: 'Lưu ý giao hàng', value: details.delivery_note },
      ]} />

      {(stats.length > 0 || hasValue(details.purchased_amount) || hasValue(details.reward_point)) && <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Thống kê mua hàng</h4>
        {stats.length > 0 && <dl className="grid grid-cols-3 gap-2">{stats.map(stat => <div key={stat.label}><dt className="text-[10px] text-stone-500">{stat.label}</dt><dd className={`mt-1 text-lg font-bold tabular-nums ${stat.color}`}>{Number(stat.value).toLocaleString('vi-VN')}</dd></div>)}</dl>}
        <dl className="space-y-2 border-t border-blue-100 pt-2 text-xs">
          {hasValue(details.purchased_amount) && <div className="flex flex-wrap justify-between gap-2"><dt className="text-stone-500">Tổng tiền đã mua</dt><dd className="font-bold text-primary">{formatPrice(details.purchased_amount)}</dd></div>}
          {hasValue(details.reward_point) && <div className="flex flex-wrap justify-between gap-2"><dt className="text-stone-500">Điểm tích luỹ</dt><dd className="font-semibold text-stone-700">{Number(details.reward_point).toLocaleString('vi-VN')}</dd></div>}
        </dl>
      </div>}

      {pancake && <DetailGroup title="Nguồn đơn & vận chuyển" fields={[
        { label: 'Mã đơn nguồn', value: order.pancake_order_id },
        { label: 'Kênh bán', value: details.source_name },
        { label: 'Trang / cửa hàng', value: details.page_name },
        { label: 'Đơn vị giao hàng', value: details.carrier },
      ]} />}
      {links.length > 0 && <div className="flex flex-wrap gap-2">{links.map(link => <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 px-2.5 py-2 text-[11px] font-semibold text-primary no-underline transition-colors hover:bg-blue-50"><span aria-hidden="true" className="material-symbols-outlined text-[15px]">{link.icon}</span>{link.label}</a>)}</div>}
    </div>}
  </section>;
}
