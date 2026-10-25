import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { messengerBotService } from '../services/messengerBotService';
import { uploadService } from '../services/uploadService';

const money = (value) => new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
const time = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const lines = (value) => Array.isArray(value) ? value.join('\n') : '';
const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const pairsToText = (items, left, right) => (items || []).map((item) => `${item[left]} | ${item[right]}`).join('\n');
const textToPairs = (value, left, right) => splitLines(value).map((row) => {
  const separator = row.indexOf('|');
  return separator < 0 ? null : { [left]: row.slice(0, separator).trim(), [right]: row.slice(separator + 1).trim() };
}).filter((item) => item?.[left] && item?.[right]);

const emptyKnowledge = {
  brand_voice: '', greeting: '', shipping_policy: '', payment_policy: '', return_policy: '',
  processing_policy: '', gift_policy: '', active_promotion: '', prohibited_claims: [], handoff_topics: [], faqs: [], examples: [],
  sales_process: '', discovery_questions: [], response_guidelines: [], closing_rules: [], objection_handlers: [],
};
const emptyProfile = {
  enabled: true, scent_notes: [], intensity: '', suitable_spaces: [], occasions: [], moods: [], audiences: [],
  burn_time: '', selling_points: [], keywords: [], advice_notes: '',
};
const emptyMedia = {
  name: '', image_url: '', description: '', trigger_keywords: [], usage_notes: '', linked_products: [], enabled: true, priority: 0,
};

const icons = {
  bot: <><path d="M12 3v3"/><rect x="4" y="6" width="16" height="13" rx="4"/><path d="M8 11h.01M16 11h.01M8 16h8M2 12h2M20 12h2"/></>,
  pulse: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  box: <><path d="m21 8-9 5-9-5 9-5 9 5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5Z"/><path d="M12 13v8"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  refresh: <><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 1 8"/></>,
  sparkles: <><path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4L12 3Z"/><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z"/><path d="m19 13-.6 1.4L17 15l1.4.6L19 17l.6-1.4L21 15l-1.4-.6L19 13Z"/></>,
};

function Icon({ name, className = 'h-5 w-5' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{icons[name]}</svg>;
}

function CustomerAvatar({ conversation, large = false }) {
  const name = conversation?.profile_name || conversation?.customer?.name || 'Khách hàng';
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const size = large ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs';
  return conversation?.profile_picture
    ? <img src={conversation.profile_picture} alt="" className={`${size} shrink-0 rounded-2xl border border-white object-cover shadow-sm`} />
    : <span className={`${size} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8C4A32] to-[#b97960] font-black text-white shadow-sm`}>{initials || 'KH'}</span>;
}

function SectionHeading({ icon, eyebrow, title, description, action }) {
  return <div className="flex flex-col gap-4 border-b border-[#EAE1D2] bg-gradient-to-r from-[#FFF9F2] via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div className="flex items-start gap-3.5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#EADBCA] bg-white text-primary shadow-sm"><Icon name={icon} /></div><div>{eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8C4A32]">{eyebrow}</p>}<h2 className="mt-0.5 text-lg font-black tracking-tight text-[#2C1810]">{title}</h2>{description && <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">{description}</p>}</div></div>{action}
  </div>;
}

function Modal({ open, title, description, onClose, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previous; };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#251714]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(37,23,20,.28)] sm:rounded-[2rem] ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
      <header className="relative flex items-start justify-between gap-4 overflow-hidden border-b border-[#EAE1D2] bg-gradient-to-r from-[#fff7f3] to-white px-5 py-5 sm:px-6"><div className="absolute -left-12 -top-16 h-32 w-32 rounded-full bg-[#dba88e]/15 blur-2xl" /><div className="relative"><p className="mb-1 text-[10px] font-black uppercase tracking-[.2em] text-[#8C4A32]">Candlet AI Studio</p><h2 className="text-xl font-black tracking-tight text-[#2C1810]">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>}</div><button onClick={onClose} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e1d4ce] bg-white text-xl text-[#765f58] shadow-sm transition hover:rotate-90 hover:bg-[#f4eae6]" aria-label="Đóng">×</button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      {footer && <footer className="flex justify-end gap-2 border-t border-[#EAE1D2] bg-white px-5 py-4 sm:px-6">{footer}</footer>}
    </section>
  </div>;
}

function EditCard({ icon, title, description, count, onClick }) {
  return <button onClick={onClick} className="group relative flex min-h-48 flex-col overflow-hidden rounded-[1.75rem] border border-[#EAE1D2] bg-white p-5 text-left shadow-[0_12px_35px_rgba(74,48,40,0.055)] transition duration-300 hover:-translate-y-1.5 hover:border-[#D7BBA6] hover:shadow-[0_22px_50px_rgba(74,48,40,0.11)]"><span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#F5EFE6] transition duration-300 group-hover:scale-125" /><span className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#EADBCA] bg-[#FFF9F2] text-primary shadow-sm transition group-hover:border-primary group-hover:bg-primary group-hover:text-white"><Icon name={icon} /></span><h3 className="relative mt-5 font-black text-[#2C1810]">{title}</h3><p className="relative mt-1.5 flex-1 text-xs leading-5 text-on-surface-variant">{description}</p><div className="relative mt-5 flex items-center justify-between border-t border-[#F5EFE6] pt-4 text-xs"><span className="font-bold text-[#8C4A32]">{count}</span><span className="font-extrabold text-primary transition group-hover:translate-x-1">Mở cài đặt →</span></div></button>;
}

function Field({ label, value, onChange, rows = 3, hint }) {
  return <label className="block space-y-2"><span className="text-xs font-extrabold text-[#4A2C2A]">{label}</span><textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3.5 py-3 text-sm leading-6 text-on-surface outline-none transition placeholder:text-[#b7a8a2] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5" />{hint && <span className="block text-[11px] leading-4 text-on-surface-variant">{hint}</span>}</label>;
}

function StatCard({ icon, label, value, detail, tone }) {
  const tones = {
    rose: 'from-rose-50 to-orange-50 text-rose-700', blue: 'from-sky-50 to-indigo-50 text-sky-700',
    amber: 'from-amber-50 to-yellow-50 text-amber-700', green: 'from-emerald-50 to-teal-50 text-emerald-700',
  };
  return <div className="group relative overflow-hidden rounded-3xl border border-[#EAE1D2] bg-white p-4 shadow-[0_8px_25px_rgba(74,48,40,.045)] transition hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(74,48,40,.09)]"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]}`} /><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#806f69]">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-[#2C1810]">{value}</p></div><span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone]} transition group-hover:scale-105`}><Icon name={icon} className="h-5 w-5" /></span></div><p className="mt-2 text-[11px] font-medium text-on-surface-variant">{detail}</p></div>;
}

function WorkspaceIntro({ icon, eyebrow, title, description, metric, action }) {
  return <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EAE1D2] bg-gradient-to-r from-[#FFF9F2] via-white to-white p-5 shadow-[0_10px_30px_rgba(74,48,40,.045)] sm:p-6"><div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#efd7cc]/30 blur-2xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4A2C2A] to-[#8C4A32] text-white shadow-md"><Icon name={icon} /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C4A32]">{eyebrow}</p><h2 className="mt-1 text-xl font-black tracking-tight text-[#2C1810]">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">{description}</p></div></div><div className="flex shrink-0 items-center gap-3">{metric && <span className="rounded-2xl border border-[#EADBCA] bg-white px-4 py-2 text-center shadow-sm"><span className="block text-lg font-black text-[#381B18]">{metric.value}</span><span className="block text-[9px] font-bold uppercase tracking-wide text-[#8C4A32]">{metric.label}</span></span>}{action}</div></div></div>;
}

function Operations({ status, drafts, conversations, loading, workingId, act, lastSyncedAt }) {
  const [conversationSearch, setConversationSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('active');
  const [draftFilter, setDraftFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const modeLabel = { bot: 'Bot đang trả lời', human: 'Nhân viên xử lý', paused: 'Đang tạm dừng' };
  const stageLabel = { consulting: 'Đang tư vấn', collecting: 'Đang lấy thông tin', confirming: 'Chờ khách xác nhận', draft_ready: 'Đã tạo đơn nháp', handoff: 'Đã chuyển nhân viên' };
  const draftLabel = { pending: 'Chờ duyệt', approving: 'Đang tạo đơn', approved: 'Đã duyệt', rejected: 'Đã từ chối' };
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (archiveFilter === 'active' && conversation.archived) return false;
      if (archiveFilter === 'archived' && !conversation.archived) return false;
      if (modeFilter !== 'all' && conversation.mode !== modeFilter) return false;
      if (!query) return true;
      const searchable = [conversation.psid, conversation.profile_name, conversation.customer?.name, conversation.customer?.phone, conversation.history?.at(-1)?.text].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [conversations, conversationSearch, modeFilter, archiveFilter]);
  const filteredDrafts = useMemo(() => drafts.filter((draft) => draftFilter === 'all' || draft.status === draftFilter), [drafts, draftFilter]);
  const selected = filteredConversations.find((conversation) => conversation._id === selectedId) || filteredConversations[0];
  const submitReply = async () => {
    const text = reply.trim();
    if (!selected || !text) return;
    const succeeded = await act(selected._id, () => messengerBotService.sendConversationMessage(selected._id, text));
    if (succeeded) setReply('');
  };
  const approveDraft = (draft) => {
    if (!window.confirm(`Duyệt đơn của ${draft.customer_name} với tổng tiền ${money(draft.total_price)}? Hệ thống sẽ tạo đơn thật và trừ nguyên liệu.`)) return;
    act(draft._id, () => messengerBotService.approveDraft(draft._id));
  };
  const rejectDraft = (draft) => {
    if (!window.confirm(`Từ chối đơn nháp của ${draft.customer_name}?`)) return;
    act(draft._id, () => messengerBotService.rejectDraft(draft._id, 'Nhân viên từ chối đơn nháp'));
  };

  return <div className="space-y-6">
    {status && !status.configured && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 font-black">!</span><div><p className="font-bold">Bot chưa hoạt động đầy đủ</p><p className="mt-0.5 text-xs leading-5">Kiểm tra OpenAI API key và cấu hình Meta trên backend.</p></div></div>}
    {status && (status.failed_events_24h > 0 || status.stuck_events > 0) && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-100 font-black">!</span><div><p className="font-bold">Có tin nhắn cần kiểm tra</p><p className="mt-0.5 text-xs leading-5">{status.failed_events_24h || 0} sự kiện lỗi trong 24 giờ · {status.stuck_events || 0} sự kiện xử lý quá lâu. Kiểm tra Render và Cloudflare Queue logs.</p></div></div>}
    <div className="flex items-center justify-end gap-2 text-[10px] font-semibold text-[#8e7770]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Tự cập nhật mỗi 15 giây{lastSyncedAt ? ` · gần nhất ${lastSyncedAt.toLocaleTimeString('vi-VN')}` : ''}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-[#dfd1cb] bg-gradient-to-br from-[#FFF9F2] to-[#f5e8e2] p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-wider text-[#80635b]">Hệ thống</p><span className={`h-2.5 w-2.5 rounded-full ${status?.configured ? 'bg-emerald-500 shadow-[0_0_0_4px_#d1fae5]' : 'bg-amber-500 shadow-[0_0_0_4px_#fef3c7]'}`} /></div><p className={`mt-3 text-lg font-extrabold ${status?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>{status?.configured ? 'Đang hoạt động' : 'Thiếu cấu hình'}</p><div className="mt-2 flex gap-3 text-[11px]"><span className={status?.openai_configured ? 'text-emerald-700' : 'text-red-600'}>OpenAI {status?.openai_configured ? '✓' : '×'}</span><span className={status?.meta_configured ? 'text-emerald-700' : 'text-red-600'}>Meta {status?.meta_configured ? '✓' : '×'}</span></div></div>
      <StatCard icon="pulse" label="Hoạt động 24 giờ" value={status?.recent_conversations ?? 0} detail="hội thoại có tương tác" tone="rose" />
      <StatCard icon="bot" label="Bot đang xử lý" value={status?.bot_conversations ?? 0} detail={`${status?.paused_conversations ?? 0} hội thoại tạm dừng`} tone="blue" />
      <StatCard icon="users" label="Cần nhân viên" value={status?.human_conversations ?? 0} detail={`${status?.pending_drafts ?? 0} đơn đang chờ duyệt`} tone="amber" />
      <StatCard icon="book" label="Dữ liệu tư vấn" value={status?.trained_products ?? 0} detail={`${status?.enabled_media ?? 0} ảnh AI · kiến thức v${status?.knowledge_version || 1}`} tone="green" />
    </div>

    <section className="overflow-hidden rounded-3xl border border-[#EAE1D2] bg-white shadow-[0_12px_35px_rgba(74,48,40,0.06)]">
      <SectionHeading icon="box" eyebrow="Đơn hàng" title="Đơn nháp từ Messenger" description="Kiểm tra thông tin trước khi tạo đơn thật và trừ kho." action={<select value={draftFilter} onChange={(event) => setDraftFilter(event.target.value)} className="rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3 py-2.5 text-xs font-bold outline-none focus:border-primary"><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Đã từ chối</option><option value="all">Tất cả</option></select>} />
      {loading ? <p className="p-8 text-center text-sm text-on-surface-variant">Đang tải…</p> : filteredDrafts.length === 0 ? <p className="p-8 text-center text-sm text-on-surface-variant">Không có đơn ở trạng thái này.</p> : <div className="divide-y divide-outline-variant/20">{filteredDrafts.map((draft) => <div key={draft._id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center"><div><div className="flex items-center gap-2"><p className="font-bold">{draft.customer_name}</p><span className="rounded-full bg-surface-container px-2 py-1 text-[10px] font-bold">{draftLabel[draft.status] || draft.status}</span></div><p className="mt-1 text-sm text-on-surface-variant">{draft.customer_phone}</p><p className="mt-1 text-xs text-on-surface-variant">{draft.customer_address}</p></div><div><div className="space-y-1">{draft.items.map((item, index) => <p key={`${item.product_id}-${index}`} className="text-sm"><span className="font-semibold">{item.customer_label || item.product_name}</span>{item.sku_label && item.sku_label !== item.customer_label ? ` · ${item.sku_label}` : ''} × {item.quantity}</p>)}</div><p className="mt-2 font-bold text-primary">{money(draft.total_price)}</p><p className="mt-1 text-[11px] text-on-surface-variant">{time(draft.createdAt)}{draft.order_id?.orderId ? ` · ${draft.order_id.orderId}` : ''}</p></div><div className="flex gap-2">{draft.status === 'pending' && <><button disabled={workingId === draft._id} onClick={() => rejectDraft(draft)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Từ chối</button><button disabled={workingId === draft._id} onClick={() => approveDraft(draft)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Duyệt đơn</button></>}</div></div>)}</div>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-[#EAE1D2] bg-white shadow-[0_12px_35px_rgba(74,48,40,0.06)]">
      <SectionHeading icon="chat" eyebrow="Inbox" title="Trung tâm hội thoại" description="Xem nội dung, tiếp quản và trả lời khách ngay tại đây." action={<div className="flex flex-col gap-2 sm:flex-row"><input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Tên, SĐT, PSID hoặc nội dung…" className="min-w-56 rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3 py-2.5 text-sm outline-none focus:border-primary" /><select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)} className="rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3 py-2.5 text-sm outline-none focus:border-primary"><option value="active">Đang hoạt động</option><option value="archived">Đã lưu trữ</option><option value="all">Tất cả hội thoại</option></select><select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} className="rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3 py-2.5 text-sm outline-none focus:border-primary"><option value="all">Mọi chế độ</option><option value="bot">Bot xử lý</option><option value="human">Nhân viên xử lý</option><option value="paused">Tạm dừng</option></select></div>} />
      <div className="grid min-h-[620px] bg-[#FAF7F2] lg:grid-cols-[360px_1fr]">
        <aside className="max-h-[760px] overflow-y-auto border-b border-[#EAE1D2] bg-white lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee4df] bg-white/95 px-4 py-3 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f7065]">{filteredConversations.length} hội thoại</p><span className="rounded-full bg-[#F5EFE6] px-2.5 py-1 text-[10px] font-bold text-primary">Cập nhật trực tiếp</span></div>
          {filteredConversations.length === 0 ? <div className="grid min-h-60 place-items-center px-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#F5EFE6] text-primary"><Icon name="chat" /></span><p className="mt-3 text-sm font-bold text-[#4A2C2A]">Không tìm thấy hội thoại</p><p className="mt-1 text-xs text-on-surface-variant">Thử thay đổi từ khóa hoặc bộ lọc.</p></div></div> : filteredConversations.map((conversation) => <button key={conversation._id} onClick={() => { setSelectedId(conversation._id); setReply(''); }} className={`group block w-full border-b border-[#F5EFE6] px-4 py-3.5 text-left transition ${selected?._id === conversation._id ? 'bg-[#fff4ef] shadow-[inset_3px_0_0_#4A2C2A]' : 'hover:bg-[#FAF7F2]'}`}><div className="flex gap-3"><CustomerAvatar conversation={conversation} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-extrabold text-[#2C1810]">{conversation.profile_name || conversation.customer?.name || conversation.customer?.phone || ('Messenger ' + String(conversation.psid).slice(-6))}</p><span className="shrink-0 text-[9px] font-medium text-[#9c8881]">{time(conversation.last_activity_at).split(',')[1] || ''}</span></div><p className="mt-1 truncate text-xs text-on-surface-variant">{conversation.history?.at(-1)?.text || 'Chưa có nội dung'}</p><div className="mt-2 flex items-center gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${conversation.mode === 'human' ? 'bg-amber-50 text-amber-700' : conversation.mode === 'bot' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{modeLabel[conversation.mode]}</span><span className="truncate text-[9px] font-semibold text-[#a18c84]">{stageLabel[conversation.stage] || conversation.stage}</span></div></div></div></button>)}
        </aside>
        {!selected ? <div className="grid place-items-center p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white text-primary shadow-sm"><Icon name="chat" className="h-7 w-7" /></span><p className="mt-4 font-extrabold text-[#4A2C2A]">Chọn một cuộc trò chuyện</p><p className="mt-1 text-sm text-on-surface-variant">Nội dung và thông tin khách sẽ xuất hiện tại đây.</p></div></div> : <div className="flex min-w-0 flex-col bg-[#FAF7F2]"><div className="border-b border-[#EAE1D2] bg-white p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-center gap-3"><CustomerAvatar conversation={selected} large /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-black text-[#2C1810]">{selected.profile_name || selected.customer?.name || ('Messenger ' + String(selected.psid).slice(-6))}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${selected.mode === 'bot' ? 'bg-emerald-50 text-emerald-700' : selected.mode === 'human' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{modeLabel[selected.mode]}</span>{selected.archived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">Đã lưu trữ</span>}</div><p className="mt-1 truncate text-xs text-on-surface-variant">{selected.customer?.phone || 'Chưa có số điện thoại'} · Messenger #{String(selected.psid).slice(-8)}</p><p className="mt-1 text-[10px] font-semibold text-[#8C4A32]">{selected.handoff_reason || stageLabel[selected.stage] || selected.stage}</p></div></div><div className="flex flex-wrap gap-2"><select value={selected.mode} disabled={workingId === selected._id} onChange={(event) => act(selected._id, () => messengerBotService.updateConversationMode(selected._id, event.target.value))} className="rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3 py-2 text-xs font-bold outline-none focus:border-primary"><option value="bot">Bot trả lời</option><option value="human">Nhân viên xử lý</option><option value="paused">Tạm dừng</option></select><button disabled={workingId === selected._id} onClick={() => act(selected._id, () => messengerBotService.resetConversation(selected._id))} className="rounded-xl border border-[#E3D8C7] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#F5EFE6] disabled:opacity-50">Làm mới phiên</button><button disabled={workingId === selected._id} onClick={() => act(selected._id, () => messengerBotService.archiveConversation(selected._id, !selected.archived))} className="rounded-xl border border-[#E3D8C7] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#F5EFE6] disabled:opacity-50">{selected.archived ? 'Khôi phục' : 'Lưu trữ'}</button><button disabled={workingId === selected._id} onClick={() => { if (window.confirm('Xóa vĩnh viễn hội thoại này? Thao tác không thể hoàn tác.')) act(selected._id, () => messengerBotService.deleteConversation(selected._id)); }} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50">Xóa</button></div></div>{(selected.memory_summary || selected.customer?.address || selected.cart?.length || selected.referral?.ad_id) && <div className="mt-4 grid gap-2 rounded-2xl border border-[#eee2dc] bg-[#FFF9F2] p-3 text-xs sm:grid-cols-2">{selected.memory_summary && <div className="sm:col-span-2"><span className="font-extrabold text-[#8C4A32]">AI ghi nhớ:</span> <span className="text-[#6e5b55]">{selected.memory_summary}</span></div>}<div><span className="font-bold">Địa chỉ:</span> {selected.customer?.address || 'Chưa có'}</div><div><span className="font-bold">Nguồn:</span> {selected.referral?.ad_id ? `Quảng cáo ${selected.referral.ad_id}` : 'Tin nhắn tự nhiên'}</div>{selected.cart?.length > 0 && <div className="sm:col-span-2"><span className="font-bold">Giỏ hàng:</span> {selected.cart.map((item) => `${item.customer_label || item.sku_label || item.product_name} × ${item.quantity}`).join(', ')}</div>}</div>}</div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,_#fff_0,_#fbf7f4_52%,_#F5EFE6_100%)] p-4 sm:p-6">{(selected.history || []).length === 0 && <p className="py-16 text-center text-sm text-on-surface-variant">Chưa có tin nhắn trong cuộc trò chuyện này.</p>}{(selected.history || []).map((message, index) => <div key={`${message.at || index}-${index}`} className={`flex items-end gap-2 ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>{message.role !== 'assistant' && <CustomerAvatar conversation={selected} />}<div className={`max-w-[82%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'assistant' ? 'rounded-br-md bg-gradient-to-br from-[#4A2C2A] to-[#381B18] text-white' : 'rounded-bl-md border border-[#EAE1D2] bg-white text-[#4A2C2A]'}`}><p className="whitespace-pre-wrap">{message.text}</p><p className={`mt-1.5 text-[9px] font-semibold ${message.role === 'assistant' ? 'text-white/60' : 'text-[#a18c84]'}`}>{message.role === 'assistant' ? 'Candlet AI' : selected.profile_name || 'Khách hàng'} · {time(message.at)}</p></div></div>)}</div>
          <div className="border-t border-[#EAE1D2] bg-white p-4"><div className="rounded-2xl border border-[#E3D8C7] bg-[#FFFCF8] p-2 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5"><textarea value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitReply(); } }} rows={2} maxLength={1900} placeholder="Nhập câu trả lời cho khách…" className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[#ab9992]" /><div className="flex items-center justify-between gap-3 px-1"><p className="truncate text-[9px] text-on-surface-variant">Enter để gửi · Shift + Enter xuống dòng · {reply.length}/1900</p><button onClick={submitReply} disabled={!reply.trim() || workingId === selected._id} className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-50">Gửi tin nhắn ↗</button></div></div></div>
        </div>}
      </div>
    </section>
  </div>;
}

function KnowledgeEditor({ value, onSave, saving }) {
  const [active, setActive] = useState('');
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!active) setDraft(value); }, [active, value]);
  const set = (key, next) => setDraft((current) => ({ ...current, [key]: next }));
  const close = () => { setDraft(value); setActive(''); };
  const open = (section) => { setDraft(value); setActive(section); };
  const save = async () => { if (await onSave(draft)) setActive(''); };
  const footer = <><button onClick={close} className="rounded-xl border border-[#E3D8C7] px-4 py-2.5 text-sm font-bold">Hủy thay đổi</button><button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></>;
  const configuredPolicies = ['brand_voice', 'greeting', 'shipping_policy', 'payment_policy', 'return_policy', 'processing_policy', 'gift_policy', 'active_promotion'].filter((key) => Boolean(value[key])).length;
  return <div className="space-y-5">
    <WorkspaceIntro icon="sparkles" eyebrow="Trung tâm huấn luyện" title="Xây dựng phong cách tư vấn riêng" description="Quản lý giọng thương hiệu, kịch bản bán hàng và các nguyên tắc phản hồi. Chọn từng nhóm để chỉnh sửa trong cửa sổ tập trung." metric={{ value: `${configuredPolicies}/8`, label: 'mục nền tảng' }} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><EditCard icon="book" title="Thương hiệu & chính sách" description="Giọng nói, lời chào, giao hàng, thanh toán và hậu mãi." count={`${configuredPolicies}/8 mục đã nhập`} onClick={() => open('brand')} /><EditCard icon="sparkles" title="Playbook bán hàng" description="Quy trình tư vấn, câu hỏi khám phá và nguyên tắc chốt đơn." count={`${value.discovery_questions?.length || 0} câu hỏi · ${value.closing_rules?.length || 0} quy tắc`} onClick={() => open('playbook')} /><EditCard icon="users" title="Xử lý phản đối" description="Cách bot phản hồi các băn khoăn thường gặp trước khi mua." count={`${value.objection_handlers?.length || 0} tình huống`} onClick={() => open('objections')} /><EditCard icon="chat" title="An toàn & hội thoại mẫu" description="Ranh giới, chuyển nhân viên, FAQ và ví dụ câu trả lời chuẩn." count={`${value.faqs?.length || 0} FAQ · ${value.examples?.length || 0} ví dụ`} onClick={() => open('responses')} /></div>
    <Modal open={active === 'brand'} onClose={close} title="Thương hiệu và chính sách" description="Thông tin ổn định được dùng trong mọi lượt tư vấn." footer={footer} wide><div className="grid gap-5 lg:grid-cols-2"><Field label="Giọng thương hiệu" value={draft.brand_voice} onChange={(v) => set('brand_voice', v)} /><Field label="Lời chào mẫu" value={draft.greeting} onChange={(v) => set('greeting', v)} /><Field label="Chính sách giao hàng" value={draft.shipping_policy} onChange={(v) => set('shipping_policy', v)} /><Field label="Phương thức thanh toán" value={draft.payment_policy} onChange={(v) => set('payment_policy', v)} /><Field label="Đổi trả và hoàn tiền" value={draft.return_policy} onChange={(v) => set('return_policy', v)} /><Field label="Thời gian xử lý đơn" value={draft.processing_policy} onChange={(v) => set('processing_policy', v)} /><Field label="Quà tặng, thiệp và đóng gói" value={draft.gift_policy} onChange={(v) => set('gift_policy', v)} /><Field label="Khuyến mãi đang áp dụng" value={draft.active_promotion} onChange={(v) => set('active_promotion', v)} /></div></Modal>
    <Modal open={active === 'playbook'} onClose={close} title="Playbook bán hàng" description="Hướng dẫn bot tư vấn tự nhiên theo từng giai đoạn." footer={footer} wide><div className="space-y-5"><Field label="Quy trình tư vấn và chốt đơn" rows={7} value={draft.sales_process} onChange={(v) => set('sales_process', v)} hint="Mô tả lần lượt các bước bot nên thực hiện." /><div className="grid gap-5 lg:grid-cols-2"><Field label="Câu hỏi khám phá nhu cầu" rows={7} value={lines(draft.discovery_questions)} onChange={(v) => set('discovery_questions', splitLines(v))} hint="Mỗi dòng một câu hỏi." /><Field label="Nguyên tắc trả lời" rows={7} value={lines(draft.response_guidelines)} onChange={(v) => set('response_guidelines', splitLines(v))} hint="Mỗi dòng một nguyên tắc." /><Field label="Quy tắc chốt đơn" rows={7} value={lines(draft.closing_rules)} onChange={(v) => set('closing_rules', splitLines(v))} hint="Mỗi dòng một điều kiện hoặc hành động." /></div></div></Modal>
    <Modal open={active === 'objections'} onClose={close} title="Xử lý phản đối" description="Khai báo băn khoăn của khách và cách Candlet muốn bot phản hồi." footer={footer}><Field label="Các tình huống phản đối" rows={12} value={pairsToText(draft.objection_handlers, 'objection', 'response')} onChange={(v) => set('objection_handlers', textToPairs(v, 'objection', 'response'))} hint="Mỗi dòng: Băn khoăn của khách | Cách xử lý mong muốn" /></Modal>
    <Modal open={active === 'responses'} onClose={close} title="An toàn và hội thoại mẫu" description="Thiết lập giới hạn và cung cấp câu trả lời tham khảo cho bot." footer={footer} wide><div className="grid gap-5 lg:grid-cols-2"><Field label="Điều bot không được cam kết" rows={6} value={lines(draft.prohibited_claims)} onChange={(v) => set('prohibited_claims', splitLines(v))} hint="Mỗi dòng một quy tắc." /><Field label="Chủ đề phải chuyển nhân viên" rows={6} value={lines(draft.handoff_topics)} onChange={(v) => set('handoff_topics', splitLines(v))} hint="Mỗi dòng một chủ đề." /><Field label="Câu hỏi thường gặp" rows={9} value={pairsToText(draft.faqs, 'question', 'answer')} onChange={(v) => set('faqs', textToPairs(v, 'question', 'answer'))} hint="Mỗi dòng: Câu hỏi | Câu trả lời" /><Field label="Ví dụ hội thoại chuẩn" rows={9} value={pairsToText(draft.examples, 'customer', 'assistant')} onChange={(v) => set('examples', textToPairs(v, 'customer', 'assistant'))} hint="Mỗi dòng: Tin nhắn khách | Câu trả lời mong muốn" /></div></Modal>
  </div>;
}

function ProductTrainer({ items, selectedId, onSelect, profile, onChange, onSave, saving }) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.product._id === selectedId);
  const set = (key, next) => onChange({ ...profile, [key]: next });
  const listField = (label, key) => <Field label={label} value={lines(profile[key])} onChange={(v) => set(key, splitLines(v))} hint="Mỗi dòng một giá trị." />;
  const edit = (id) => { onSelect(id); setOpen(true); };
  const close = () => { onChange({ ...emptyProfile, ...(selected?.profile || {}) }); setOpen(false); };
  const save = async () => { if (await onSave()) setOpen(false); };
  return <div className="space-y-5"><WorkspaceIntro icon="box" eyebrow="Hồ sơ tư vấn" title="Dạy bot hiểu từng sản phẩm" description="Bot tự đọc giá, phân loại và tồn kho. Bạn bổ sung tầng hương, không gian phù hợp và điểm bán hàng để lời tư vấn chính xác hơn." metric={{ value: `${items.filter((item) => item.profile).length}/${items.length}`, label: 'đã huấn luyện' }} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <button key={item.product._id} onClick={() => edit(item.product._id)} className="group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] border border-[#EAE1D2] bg-white p-4 text-left shadow-[0_10px_30px_rgba(74,48,40,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#D7BBA6] hover:shadow-[0_18px_40px_rgba(74,48,40,.1)]"><span className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#6B3530] to-[#d69b7e] transition-all duration-500 group-hover:w-full" style={{ width: item.profile ? '100%' : '24%' }} /><img src={item.product.image} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-[#f5efec] object-cover shadow-sm transition duration-300 group-hover:scale-105" /><span className="min-w-0 flex-1"><span className="block truncate font-black text-[#2C1810]">{item.product.name}</span><span className="mt-1 block text-xs font-semibold text-[#8c756d]">{money(item.product.base_price)}</span><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${item.profile ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.profile ? 'Đã huấn luyện' : 'Cần bổ sung'}</span></span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F5EFE6] text-primary transition group-hover:translate-x-1 group-hover:bg-primary group-hover:text-white">→</span></button>)}</div>
    <Modal open={open && Boolean(selected)} onClose={close} title={selected?.product.name || 'Hồ sơ sản phẩm'} description={selected ? `${money(selected.product.base_price)} · ${selected.product.scent_group || 'Chưa có nhóm hương'}` : ''} wide footer={<><button onClick={close} className="rounded-xl border border-[#E3D8C7] px-4 py-2.5 text-sm font-bold">Hủy thay đổi</button><button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></>}><div className="space-y-5"><label className="flex items-center justify-between rounded-2xl bg-[#F5EFE6] px-4 py-3 text-sm font-bold"><span>Cho phép bot tư vấn sản phẩm này</span><input type="checkbox" checked={profile.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 accent-[#4A2C2A]" /></label><div className="grid gap-5 md:grid-cols-2">{listField('Tầng hương', 'scent_notes')}<label className="block space-y-2"><span className="text-xs font-extrabold text-[#4A2C2A]">Cường độ hương</span><select value={profile.intensity || ''} onChange={(e) => set('intensity', e.target.value)} className="w-full rounded-xl border border-[#E3D8C7] bg-[#FFFCF8] px-3.5 py-3 text-sm outline-none focus:border-primary"><option value="">Chưa xác định</option><option value="nhẹ">Nhẹ</option><option value="vừa">Vừa</option><option value="đậm">Đậm</option></select></label>{listField('Không gian phù hợp', 'suitable_spaces')}{listField('Dịp sử dụng', 'occasions')}{listField('Cảm xúc/mục đích', 'moods')}{listField('Đối tượng phù hợp', 'audiences')}<Field label="Thời gian đốt" value={profile.burn_time} onChange={(v) => set('burn_time', v)} />{listField('Điểm bán hàng nổi bật', 'selling_points')}{listField('Từ khóa khách thường dùng', 'keywords')}<Field label="Lưu ý tư vấn" value={profile.advice_notes} onChange={(v) => set('advice_notes', v)} /></div></div></Modal>
  </div>;
}

function MediaLibrary({ items, products, onReload }) {
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyMedia);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selected = items.find((item) => item._id === selectedId);
  useEffect(() => {
    if (!selected) { setForm(emptyMedia); return; }
    setForm({
      ...emptyMedia, ...selected,
      linked_products: (selected.linked_products || []).map((item) => typeof item === 'string' ? item : item._id),
    });
  }, [selected]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Ảnh tối đa 10MB.'); return; }
    try {
      setWorking(true); setError('');
      const result = await uploadService.uploadProductImage(file);
      set('image_url', result.data.data.path);
      setMessage('Đã tải ảnh lên. Hãy bổ sung mô tả rồi lưu vào thư viện.');
    } catch (e) { setError(e.response?.data?.message || 'Không thể tải ảnh lên.'); }
    finally { setWorking(false); event.target.value = ''; }
  };
  const save = async () => {
    if (!form.name.trim() || !form.image_url) { setError('Vui lòng nhập tên và tải ảnh.'); return; }
    try {
      setWorking(true); setError(''); setMessage('');
      const payload = { ...form, name: form.name.trim(), priority: Number(form.priority) || 0 };
      if (selected) await messengerBotService.updateMedia(selected._id, payload);
      else await messengerBotService.createMedia(payload);
      await onReload();
      setMessage('Đã lưu ảnh và hướng dẫn sử dụng cho bot.');
      setSelectedId('');
    } catch (e) { setError(e.response?.data?.message || 'Không thể lưu ảnh.'); }
    finally { setWorking(false); }
  };
  const remove = async () => {
    if (!selected || !window.confirm(`Xóa ảnh “${selected.name}” khỏi thư viện bot?`)) return;
    try {
      setWorking(true); setError('');
      await messengerBotService.deleteMedia(selected._id);
      setSelectedId(''); await onReload(); setMessage('Đã xóa ảnh.');
    } catch (e) { setError(e.response?.data?.message || 'Không thể xóa ảnh.'); }
    finally { setWorking(false); }
  };
  const close = () => setSelectedId('');
  const startNew = () => { setForm(emptyMedia); setError(''); setMessage(''); setSelectedId('new'); };
  return <div className="space-y-5">
    <WorkspaceIntro icon="image" eyebrow="Nội dung trực quan" title="Thư viện ảnh AI" description="Gắn từ khóa và sản phẩm để bot tự chọn đúng hình ảnh khi khách cần xem mẫu, kiểu gói quà hoặc không gian sử dụng." metric={{ value: items.length, label: 'ảnh trong thư viện' }} action={<button onClick={startNew} className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">+ Thêm ảnh</button>} />
    {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {items.length === 0 ? <button onClick={startNew} className="grid min-h-64 w-full place-items-center rounded-3xl border-2 border-dashed border-[#decfc9] bg-white text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary">Tải ảnh đầu tiên vào thư viện</button> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => <button key={item._id} onClick={() => { setError(''); setSelectedId(item._id); }} className="group overflow-hidden rounded-3xl border border-[#EAE1D2] bg-white text-left shadow-[0_10px_30px_rgba(74,48,40,0.05)] transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[4/3] overflow-hidden bg-[#f5efec]"><img src={item.image_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><span className={`absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-extrabold backdrop-blur ${item.enabled ? 'bg-emerald-500/90 text-white' : 'bg-black/55 text-white'}`}>{item.enabled ? 'Đang bật' : 'Đã tắt'}</span></div><div className="p-4"><p className="truncate font-extrabold text-[#2C1810]">{item.name}</p><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-on-surface-variant">{item.description || item.usage_notes || 'Chưa có mô tả sử dụng'}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#8C4A32]">Ưu tiên {item.priority || 0} · Chỉnh sửa →</p></div></button>)}</div>}
    <Modal open={Boolean(selectedId)} onClose={close} title={selected ? 'Chỉnh sửa ảnh' : 'Thêm ảnh mới'} description="Mô tả rõ trường hợp sử dụng để AI chọn đúng ảnh." wide footer={<><button onClick={close} className="rounded-xl border border-[#E3D8C7] px-4 py-2.5 text-sm font-bold">Đóng</button>{selected && <button onClick={remove} disabled={working} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Xóa ảnh</button>}<button onClick={save} disabled={working} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{working ? 'Đang lưu…' : 'Lưu ảnh'}</button></>}>
      {error && <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-[220px_1fr]"><div className="space-y-3">{form.image_url ? <img src={form.image_url} alt="Xem trước" className="aspect-square w-full rounded-xl border border-outline-variant object-cover" /> : <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-outline-variant text-sm text-on-surface-variant">Chưa có ảnh</div>}<label className="block cursor-pointer rounded-xl border border-outline-variant px-4 py-2.5 text-center text-sm font-bold"><input type="file" accept="image/*" onChange={upload} disabled={working} className="hidden" />{working ? 'Đang xử lý…' : 'Tải ảnh lên'}</label></div><div className="space-y-4"><label className="block space-y-1.5"><span className="text-xs font-bold">Tên ảnh *</span><input value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} className="w-full rounded-xl border border-outline-variant px-3 py-2.5 text-sm" placeholder="Ví dụ: Gói quà sinh nhật màu kem" /></label><Field label="Mô tả nội dung ảnh" value={form.description} onChange={(v) => set('description', v)} hint="Mô tả những gì khách sẽ nhìn thấy." /><Field label="Khi nào nên dùng" value={form.usage_notes} onChange={(v) => set('usage_notes', v)} hint="Ví dụ: gửi khi khách hỏi mẫu gói quà sinh nhật." /></div></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Từ khóa kích hoạt" value={lines(form.trigger_keywords)} onChange={(v) => set('trigger_keywords', splitLines(v))} hint="Mỗi dòng một từ hoặc cụm từ khách có thể dùng." /><label className="block space-y-1.5"><span className="text-xs font-bold">Sản phẩm liên quan</span><select multiple value={form.linked_products} onChange={(e) => set('linked_products', [...e.target.selectedOptions].map((option) => option.value))} className="min-h-36 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm">{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select><span className="block text-[11px] text-on-surface-variant">Giữ Ctrl hoặc Cmd để chọn nhiều sản phẩm.</span></label></div>
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-[#F5EFE6] p-4"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="accent-[#4A2C2A]" />Cho phép AI sử dụng</label><label className="ml-auto flex items-center gap-2 text-sm"><span className="font-bold">Ưu tiên</span><input type="number" min="-100" max="100" value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-24 rounded-lg border border-outline-variant px-3 py-2" /></label></div>
    </Modal>
  </div>;
}

export default function MessengerBotManagement() {
  const [tab, setTab] = useState('operations');
  const [status, setStatus] = useState(null); const [drafts, setDrafts] = useState([]); const [conversations, setConversations] = useState([]);
  const [knowledge, setKnowledge] = useState(emptyKnowledge); const [productProfiles, setProductProfiles] = useState([]); const [media, setMedia] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(''); const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true); const [workingId, setWorkingId] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const syncingRef = useRef(false);
  const refreshOperations = useCallback(async (silent = false) => {
    if (syncingRef.current) return false;
    try {
      syncingRef.current = true;
      const [s, d, c] = await Promise.all([messengerBotService.getStatus(), messengerBotService.getDrafts(), messengerBotService.getConversations('all')]);
      setStatus(s.data.data); setDrafts(d.data.data || []); setConversations(c.data.data || []); setLastSyncedAt(new Date());
      return true;
    } catch (e) {
      if (!silent) setError(e.response?.data?.message || 'Không thể tải dữ liệu vận hành bot.');
      return false;
    } finally { syncingRef.current = false; }
  }, []);
  const refreshKnowledge = useCallback(async () => { const result = await messengerBotService.getKnowledge(); setKnowledge({ ...emptyKnowledge, ...result.data.data }); }, []);
  const refreshProducts = useCallback(async () => { const result = await messengerBotService.getProductProfiles(); const items = result.data.data || []; setProductProfiles(items); setSelectedProductId((current) => current || items[0]?.product?._id || ''); }, []);
  const refreshMedia = useCallback(async () => { const result = await messengerBotService.getMedia(); setMedia(result.data.data || []); }, []);
  useEffect(() => {
    let active = true;
    const initialLoad = async () => {
      try { setError(''); await Promise.all([refreshOperations(), refreshKnowledge(), refreshProducts(), refreshMedia()]); }
      catch (e) { if (active) setError(e.response?.data?.message || 'Không thể tải dữ liệu bot.'); }
      finally { if (active) setLoading(false); }
    };
    initialLoad();
    return () => { active = false; };
  }, [refreshKnowledge, refreshMedia, refreshOperations, refreshProducts]);
  useEffect(() => {
    if (tab !== 'operations') return undefined;
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible' && !workingId) refreshOperations(true); };
    const timer = window.setInterval(refreshWhenVisible, 15000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [refreshOperations, tab, workingId]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(''), 4000); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => { const item = productProfiles.find((entry) => entry.product._id === selectedProductId); setProfile({ ...emptyProfile, ...(item?.profile || {}) }); }, [selectedProductId, productProfiles]);
  const act = async (id, action) => { try { setWorkingId(id); setError(''); const result = await action(); setNotice(result?.data?.message || 'Đã cập nhật thành công.'); await refreshOperations(true); return true; } catch (e) { setError(e.response?.data?.message || 'Không thể thực hiện thao tác.'); return false; } finally { setWorkingId(''); } };
  const toggleBot = (enabled) => act('bot-status', () => messengerBotService.updateBotStatus(enabled));
  const saveKnowledge = async (nextKnowledge = knowledge) => { try { setSaving(true); setError(''); const result = await messengerBotService.updateKnowledge(nextKnowledge); setKnowledge({ ...emptyKnowledge, ...result.data.data }); setNotice('Đã lưu kiến thức mới cho bot.'); refreshOperations(true); return true; } catch (e) { setError(e.response?.data?.message || 'Không thể lưu kiến thức.'); return false; } finally { setSaving(false); } };
  const saveProfile = async () => { try { setSaving(true); setError(''); await messengerBotService.updateProductProfile(selectedProductId, profile); setNotice('Đã lưu hồ sơ tư vấn sản phẩm.'); await refreshProducts(); refreshOperations(true); return true; } catch (e) { setError(e.response?.data?.message || 'Không thể lưu hồ sơ sản phẩm.'); return false; } finally { setSaving(false); } };
  const tabs = useMemo(() => [
    { key: 'operations', label: 'Vận hành', caption: 'Hội thoại & đơn', icon: 'pulse' },
    { key: 'knowledge', label: 'Huấn luyện', caption: 'Kiến thức & kịch bản', icon: 'sparkles' },
    { key: 'products', label: 'Sản phẩm', caption: 'Hồ sơ tư vấn', icon: 'box' },
    { key: 'media', label: 'Thư viện ảnh', caption: 'Nội dung gửi khách', icon: 'image' },
  ], []);
  return <Layout><div className="relative mx-auto max-w-7xl pb-12">
    <div className="pointer-events-none absolute -left-20 top-28 h-72 w-72 rounded-full bg-[#e8cfc3]/20 blur-3xl" /><div className="pointer-events-none absolute -right-20 top-[36rem] h-80 w-80 rounded-full bg-[#f3ddd3]/25 blur-3xl" />
    <div className="relative space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2C1810] via-[#381B18] to-[#4A2C2A] px-5 py-6 text-white shadow-[0_24px_65px_rgba(64,38,32,0.25)] sm:px-8 sm:py-8"><div className="absolute -right-12 -top-28 h-80 w-80 rounded-full border border-white/5 bg-[#dc9b78]/20 blur-2xl" /><div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-white/5 blur-2xl" /><div className="absolute right-8 top-8 hidden grid-cols-3 gap-2 opacity-30 sm:grid">{Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-1 w-1 rounded-full bg-white" />)}</div><div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4 sm:gap-5"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur sm:h-16 sm:w-16"><Icon name="bot" className="h-8 w-8" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[0.23em] text-[#efc6b2]">Candlet Commerce · Messenger</p><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${status?.configured && status?.bot_enabled !== false ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>{!status?.configured ? '● Cần cấu hình' : status?.bot_enabled !== false ? '● Online' : '● Offline'}</span></div><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Bot AI Manager</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Không gian quản trị tập trung cho hội thoại, kiến thức bán hàng, sản phẩm và nội dung trực quan.</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-white/60"><span className="rounded-full bg-white/8 px-3 py-1.5">{status?.recent_conversations ?? 0} hội thoại / 24h</span><span className="rounded-full bg-white/8 px-3 py-1.5">{status?.pending_drafts ?? 0} đơn chờ duyệt</span><span className="rounded-full bg-white/8 px-3 py-1.5">{status?.trained_products ?? 0} sản phẩm đã học</span></div></div></div><button type="button" role="switch" aria-checked={status?.bot_enabled !== false} onClick={() => toggleBot(status?.bot_enabled === false)} disabled={workingId === 'bot-status'} className="inline-flex items-center gap-3 self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-50"><span className={`relative h-7 w-12 rounded-full transition ${status?.bot_enabled !== false ? 'bg-emerald-400' : 'bg-white/20'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition ${status?.bot_enabled !== false ? 'left-6' : 'left-1'}`} /></span><span><span className="block text-xs font-black">Bot {status?.bot_enabled !== false ? 'Online' : 'Offline'}</span><span className="mt-0.5 block text-[9px] text-white/55">{workingId === 'bot-status' ? 'Đang cập nhật…' : 'Chạm để đổi trạng thái'}</span></span></button></div></section>
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[#E3D8C7] bg-white p-2 shadow-[0_8px_24px_rgba(74,48,40,.07)]">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`group inline-flex min-w-[150px] flex-1 items-center justify-center gap-3 rounded-xl px-4 py-3 text-left transition ${tab === item.key ? 'bg-[#4A2C2A] text-white shadow-md' : 'bg-[#FAF7F2] text-[#604c46] hover:bg-[#F5EFE6] hover:text-[#381B18]'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tab === item.key ? 'bg-white/15 text-white' : 'bg-white text-primary shadow-sm'}`}><Icon name={item.icon} className="h-4 w-4" /></span><span><span className="block text-sm font-black leading-4">{item.label}</span><span className={`mt-1 hidden text-[10px] font-semibold leading-3 sm:block ${tab === item.key ? 'text-white/75' : 'text-[#8b756d]'}`}>{item.caption}</span></span></button>)}</nav>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">{error}</div>}{notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">{notice}</div>}
      {tab === 'operations' && <Operations {...{ status, drafts, conversations, loading, workingId, act, lastSyncedAt }} />}{tab === 'knowledge' && <KnowledgeEditor value={knowledge} onSave={saveKnowledge} saving={saving} />}{tab === 'products' && <ProductTrainer items={productProfiles} selectedId={selectedProductId} onSelect={setSelectedProductId} profile={profile} onChange={setProfile} onSave={saveProfile} saving={saving} />}{tab === 'media' && <MediaLibrary items={media} products={productProfiles.map((item) => item.product)} onReload={refreshMedia} />}
    </div>
  </div></Layout>;
}
