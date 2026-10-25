import { useCallback, useEffect, useMemo, useState } from 'react';
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

function SectionHeading({ icon, eyebrow, title, description, action }) {
  return <div className="flex flex-col gap-4 border-b border-[#eaded8] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5ebe7] text-primary"><Icon name={icon} /></div><div>{eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#a06a55]">{eyebrow}</p>}<h2 className="text-base font-extrabold text-[#322522]">{title}</h2>{description && <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">{description}</p>}</div></div>{action}
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
    <section role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
      <header className="flex items-start justify-between gap-4 border-b border-[#eaded8] bg-[#fffaf7] px-5 py-4 sm:px-6"><div><h2 className="text-lg font-extrabold text-[#322522]">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>}</div><button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e1d4ce] bg-white text-xl text-[#765f58] transition hover:bg-[#f4eae6]" aria-label="Đóng">×</button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      {footer && <footer className="flex justify-end gap-2 border-t border-[#eaded8] bg-white px-5 py-4 sm:px-6">{footer}</footer>}
    </section>
  </div>;
}

function EditCard({ icon, title, description, count, onClick }) {
  return <button onClick={onClick} className="group flex min-h-44 flex-col rounded-3xl border border-[#e6dad5] bg-white p-5 text-left shadow-[0_10px_30px_rgba(74,48,40,0.05)] transition hover:-translate-y-1 hover:border-[#c8aaa0] hover:shadow-[0_18px_40px_rgba(74,48,40,0.10)]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f5ebe7] text-primary transition group-hover:bg-primary group-hover:text-white"><Icon name={icon} /></span><h3 className="mt-4 font-extrabold text-[#322522]">{title}</h3><p className="mt-1 flex-1 text-xs leading-5 text-on-surface-variant">{description}</p><div className="mt-4 flex items-center justify-between text-xs"><span className="font-bold text-[#9a7162]">{count}</span><span className="font-extrabold text-primary">Chỉnh sửa →</span></div></button>;
}

function Field({ label, value, onChange, rows = 3, hint }) {
  return <label className="block space-y-2"><span className="text-xs font-extrabold text-[#493733]">{label}</span><textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-xl border border-[#ded0ca] bg-[#fffdfc] px-3.5 py-3 text-sm leading-6 text-on-surface outline-none transition placeholder:text-[#b7a8a2] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5" />{hint && <span className="block text-[11px] leading-4 text-on-surface-variant">{hint}</span>}</label>;
}

function StatCard({ icon, label, value, detail, tone }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-700', blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700',
  };
  return <div className="rounded-2xl border border-[#e6dad5] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-wider text-[#806f69]">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-[#322522]">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon name={icon} className="h-5 w-5" /></span></div><p className="mt-2 text-[11px] text-on-surface-variant">{detail}</p></div>;
}

function Operations({ status, drafts, conversations, loading, workingId, act }) {
  const [conversationSearch, setConversationSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [draftFilter, setDraftFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const modeLabel = { bot: 'Bot đang trả lời', human: 'Nhân viên xử lý', paused: 'Đang tạm dừng' };
  const stageLabel = { consulting: 'Đang tư vấn', collecting: 'Đang lấy thông tin', confirming: 'Chờ khách xác nhận', draft_ready: 'Đã tạo đơn nháp', handoff: 'Đã chuyển nhân viên' };
  const draftLabel = { pending: 'Chờ duyệt', approving: 'Đang tạo đơn', approved: 'Đã duyệt', rejected: 'Đã từ chối' };
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (modeFilter !== 'all' && conversation.mode !== modeFilter) return false;
      if (!query) return true;
      const searchable = [conversation.psid, conversation.customer?.name, conversation.customer?.phone, conversation.history?.at(-1)?.text].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [conversations, conversationSearch, modeFilter]);
  const filteredDrafts = useMemo(() => drafts.filter((draft) => draftFilter === 'all' || draft.status === draftFilter), [drafts, draftFilter]);
  const selected = filteredConversations.find((conversation) => conversation._id === selectedId) || filteredConversations[0];
  const submitReply = async () => {
    const text = reply.trim();
    if (!selected || !text) return;
    const succeeded = await act(selected._id, () => messengerBotService.sendConversationMessage(selected._id, text));
    if (succeeded) setReply('');
  };

  return <div className="space-y-6">
    {status && !status.configured && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 font-black">!</span><div><p className="font-bold">Bot chưa hoạt động đầy đủ</p><p className="mt-0.5 text-xs leading-5">Kiểm tra OpenAI API key và cấu hình Meta trên backend.</p></div></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-[#dfd1cb] bg-gradient-to-br from-[#fffaf7] to-[#f5e8e2] p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-wider text-[#80635b]">Hệ thống</p><span className={`h-2.5 w-2.5 rounded-full ${status?.configured ? 'bg-emerald-500 shadow-[0_0_0_4px_#d1fae5]' : 'bg-amber-500 shadow-[0_0_0_4px_#fef3c7]'}`} /></div><p className={`mt-3 text-lg font-extrabold ${status?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>{status?.configured ? 'Đang hoạt động' : 'Thiếu cấu hình'}</p><div className="mt-2 flex gap-3 text-[11px]"><span className={status?.openai_configured ? 'text-emerald-700' : 'text-red-600'}>OpenAI {status?.openai_configured ? '✓' : '×'}</span><span className={status?.meta_configured ? 'text-emerald-700' : 'text-red-600'}>Meta {status?.meta_configured ? '✓' : '×'}</span></div></div>
      <StatCard icon="pulse" label="Hoạt động 24 giờ" value={status?.recent_conversations ?? 0} detail="hội thoại có tương tác" tone="rose" />
      <StatCard icon="bot" label="Bot đang xử lý" value={status?.bot_conversations ?? 0} detail={`${status?.paused_conversations ?? 0} hội thoại tạm dừng`} tone="blue" />
      <StatCard icon="users" label="Cần nhân viên" value={status?.human_conversations ?? 0} detail={`${status?.pending_drafts ?? 0} đơn đang chờ duyệt`} tone="amber" />
      <StatCard icon="book" label="Dữ liệu tư vấn" value={status?.trained_products ?? 0} detail={`${status?.enabled_media ?? 0} ảnh AI · kiến thức v${status?.knowledge_version || 1}`} tone="green" />
    </div>

    <section className="overflow-hidden rounded-3xl border border-[#e6dad5] bg-white shadow-[0_12px_35px_rgba(74,48,40,0.06)]">
      <SectionHeading icon="box" eyebrow="Đơn hàng" title="Đơn nháp từ Messenger" description="Kiểm tra thông tin trước khi tạo đơn thật và trừ kho." action={<select value={draftFilter} onChange={(event) => setDraftFilter(event.target.value)} className="rounded-xl border border-[#ded0ca] bg-[#fffdfc] px-3 py-2.5 text-xs font-bold outline-none focus:border-primary"><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Đã từ chối</option><option value="all">Tất cả</option></select>} />
      {loading ? <p className="p-8 text-center text-sm text-on-surface-variant">Đang tải…</p> : filteredDrafts.length === 0 ? <p className="p-8 text-center text-sm text-on-surface-variant">Không có đơn ở trạng thái này.</p> : <div className="divide-y divide-outline-variant/20">{filteredDrafts.map((draft) => <div key={draft._id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center"><div><div className="flex items-center gap-2"><p className="font-bold">{draft.customer_name}</p><span className="rounded-full bg-surface-container px-2 py-1 text-[10px] font-bold">{draftLabel[draft.status] || draft.status}</span></div><p className="mt-1 text-sm text-on-surface-variant">{draft.customer_phone}</p><p className="mt-1 text-xs text-on-surface-variant">{draft.customer_address}</p></div><div><div className="space-y-1">{draft.items.map((item, index) => <p key={`${item.product_id}-${index}`} className="text-sm"><span className="font-semibold">{item.customer_label || item.product_name}</span>{item.sku_label && item.sku_label !== item.customer_label ? ` · ${item.sku_label}` : ''} × {item.quantity}</p>)}</div><p className="mt-2 font-bold text-primary">{money(draft.total_price)}</p><p className="mt-1 text-[11px] text-on-surface-variant">{time(draft.createdAt)}{draft.order_id?.orderId ? ` · ${draft.order_id.orderId}` : ''}</p></div><div className="flex gap-2">{draft.status === 'pending' && <><button disabled={workingId === draft._id} onClick={() => act(draft._id, () => messengerBotService.rejectDraft(draft._id, 'Nhân viên từ chối đơn nháp'))} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Từ chối</button><button disabled={workingId === draft._id} onClick={() => act(draft._id, () => messengerBotService.approveDraft(draft._id))} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Duyệt đơn</button></>}</div></div>)}</div>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-[#e6dad5] bg-white shadow-[0_12px_35px_rgba(74,48,40,0.06)]">
      <SectionHeading icon="chat" eyebrow="Inbox" title="Trung tâm hội thoại" description="Xem nội dung, tiếp quản và trả lời khách ngay tại đây." action={<div className="flex flex-col gap-2 sm:flex-row"><input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Tên, SĐT, PSID hoặc nội dung…" className="min-w-64 rounded-xl border border-[#ded0ca] bg-[#fffdfc] px-3 py-2.5 text-sm outline-none focus:border-primary" /><select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} className="rounded-xl border border-[#ded0ca] bg-[#fffdfc] px-3 py-2.5 text-sm outline-none focus:border-primary"><option value="all">Mọi chế độ</option><option value="bot">Bot xử lý</option><option value="human">Nhân viên xử lý</option><option value="paused">Tạm dừng</option></select></div>} />
      <div className="grid min-h-[560px] lg:grid-cols-[340px_1fr]">
        <div className="max-h-[680px] overflow-y-auto border-b border-outline-variant/30 lg:border-b-0 lg:border-r">{filteredConversations.length === 0 ? <p className="p-8 text-center text-sm text-on-surface-variant">Không tìm thấy hội thoại.</p> : filteredConversations.map((conversation) => <button key={conversation._id} onClick={() => { setSelectedId(conversation._id); setReply(''); }} className={`block w-full border-b border-outline-variant/20 p-4 text-left ${selected?._id === conversation._id ? 'bg-primary/5' : 'hover:bg-surface-container/60'}`}><div className="flex items-start justify-between gap-2"><p className="truncate font-bold">{conversation.customer?.name || conversation.customer?.phone || 'Khách Messenger'}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${conversation.mode === 'human' ? 'bg-amber-50 text-amber-700' : conversation.mode === 'bot' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{modeLabel[conversation.mode]}</span></div><p className="mt-1 truncate text-sm text-on-surface-variant">{conversation.history?.at(-1)?.text || 'Chưa có nội dung'}</p><p className="mt-2 text-[10px] text-on-surface-variant">{time(conversation.last_activity_at)} · {stageLabel[conversation.stage] || conversation.stage}</p></button>)}</div>
        {!selected ? <div className="grid place-items-center p-8 text-sm text-on-surface-variant">Chọn một hội thoại để xem chi tiết.</div> : <div className="flex min-w-0 flex-col"><div className="border-b border-outline-variant/30 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><h3 className="font-bold">{selected.customer?.name || 'Khách Messenger'}</h3><p className="mt-1 text-xs text-on-surface-variant">{selected.customer?.phone || 'Chưa có số điện thoại'} · PSID {selected.psid}</p><p className="mt-1 text-xs text-on-surface-variant">{selected.handoff_reason || stageLabel[selected.stage] || selected.stage}</p></div><div className="flex flex-wrap gap-2"><select value={selected.mode} disabled={workingId === selected._id} onChange={(event) => act(selected._id, () => messengerBotService.updateConversationMode(selected._id, event.target.value))} className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs font-bold"><option value="bot">Bot trả lời</option><option value="human">Nhân viên xử lý</option><option value="paused">Tạm dừng</option></select><button disabled={workingId === selected._id} onClick={() => act(selected._id, () => messengerBotService.resetConversation(selected._id))} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold disabled:opacity-50">Phiên tư vấn mới</button></div></div>{(selected.customer?.address || selected.cart?.length || selected.referral?.ad_id) && <div className="mt-3 grid gap-2 rounded-xl bg-surface-container/60 p-3 text-xs sm:grid-cols-2"><div><span className="font-bold">Địa chỉ:</span> {selected.customer?.address || 'Chưa có'}</div><div><span className="font-bold">Nguồn:</span> {selected.referral?.ad_id ? `Quảng cáo ${selected.referral.ad_id}` : 'Tin nhắn tự nhiên'}</div>{selected.cart?.length > 0 && <div className="sm:col-span-2"><span className="font-bold">Giỏ hàng:</span> {selected.cart.map((item) => `${item.customer_label || item.sku_label || item.product_name} × ${item.quantity}`).join(', ')}</div>}</div>}</div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-surface-container/20 p-4">{(selected.history || []).map((message, index) => <div key={`${message.at || index}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${message.role === 'assistant' ? 'bg-primary text-white' : 'border border-outline-variant/40 bg-white'}`}><p className="whitespace-pre-wrap">{message.text}</p><p className={`mt-1 text-[10px] ${message.role === 'assistant' ? 'text-white/70' : 'text-on-surface-variant'}`}>{message.role === 'assistant' ? 'Candlet' : 'Khách'} · {time(message.at)}</p></div></div>)}</div>
          <div className="border-t border-outline-variant/30 p-4"><textarea value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitReply(); } }} rows={3} maxLength={1900} placeholder="Nhập câu trả lời của nhân viên…" className="w-full resize-none rounded-xl border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary" /><div className="mt-2 flex items-center justify-between"><p className="text-[10px] text-on-surface-variant">Enter để gửi · Shift + Enter để xuống dòng · {reply.length}/1900</p><button onClick={submitReply} disabled={!reply.trim() || workingId === selected._id} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Gửi tin nhắn</button></div></div>
        </div>}
      </div>
    </section>
  </div>;
}

function KnowledgeEditor({ value, onChange, onSave, saving }) {
  const [active, setActive] = useState('');
  const set = (key, next) => onChange({ ...value, [key]: next });
  const close = () => setActive('');
  const save = async () => { if (await onSave()) close(); };
  const footer = <><button onClick={close} className="rounded-xl border border-[#ded0ca] px-4 py-2.5 text-sm font-bold">Đóng</button><button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></>;
  const configuredPolicies = ['brand_voice', 'greeting', 'shipping_policy', 'payment_policy', 'return_policy', 'processing_policy', 'gift_policy', 'active_promotion'].filter((key) => Boolean(value[key])).length;
  return <div className="space-y-5">
    <div className="rounded-3xl border border-[#e6dad5] bg-gradient-to-r from-[#fffaf7] to-white p-5 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a06a55]">Trung tâm huấn luyện</p><h2 className="mt-1 text-xl font-extrabold text-[#322522]">Chọn nội dung cần chỉnh sửa</h2><p className="mt-1 text-sm text-on-surface-variant">Trang chỉ hiển thị trạng thái tóm tắt. Bấm vào từng thẻ để mở biểu mẫu tương ứng.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><EditCard icon="book" title="Thương hiệu & chính sách" description="Giọng nói, lời chào, giao hàng, thanh toán và hậu mãi." count={`${configuredPolicies}/8 mục đã nhập`} onClick={() => setActive('brand')} /><EditCard icon="sparkles" title="Playbook bán hàng" description="Quy trình tư vấn, câu hỏi khám phá và nguyên tắc chốt đơn." count={`${value.discovery_questions?.length || 0} câu hỏi · ${value.closing_rules?.length || 0} quy tắc`} onClick={() => setActive('playbook')} /><EditCard icon="users" title="Xử lý phản đối" description="Cách bot phản hồi các băn khoăn thường gặp trước khi mua." count={`${value.objection_handlers?.length || 0} tình huống`} onClick={() => setActive('objections')} /><EditCard icon="chat" title="An toàn & hội thoại mẫu" description="Ranh giới, chuyển nhân viên, FAQ và ví dụ câu trả lời chuẩn." count={`${value.faqs?.length || 0} FAQ · ${value.examples?.length || 0} ví dụ`} onClick={() => setActive('responses')} /></div>
    <Modal open={active === 'brand'} onClose={close} title="Thương hiệu và chính sách" description="Thông tin ổn định được dùng trong mọi lượt tư vấn." footer={footer} wide><div className="grid gap-5 lg:grid-cols-2"><Field label="Giọng thương hiệu" value={value.brand_voice} onChange={(v) => set('brand_voice', v)} /><Field label="Lời chào mẫu" value={value.greeting} onChange={(v) => set('greeting', v)} /><Field label="Chính sách giao hàng" value={value.shipping_policy} onChange={(v) => set('shipping_policy', v)} /><Field label="Phương thức thanh toán" value={value.payment_policy} onChange={(v) => set('payment_policy', v)} /><Field label="Đổi trả và hoàn tiền" value={value.return_policy} onChange={(v) => set('return_policy', v)} /><Field label="Thời gian xử lý đơn" value={value.processing_policy} onChange={(v) => set('processing_policy', v)} /><Field label="Quà tặng, thiệp và đóng gói" value={value.gift_policy} onChange={(v) => set('gift_policy', v)} /><Field label="Khuyến mãi đang áp dụng" value={value.active_promotion} onChange={(v) => set('active_promotion', v)} /></div></Modal>
    <Modal open={active === 'playbook'} onClose={close} title="Playbook bán hàng" description="Hướng dẫn bot tư vấn tự nhiên theo từng giai đoạn." footer={footer} wide><div className="space-y-5"><Field label="Quy trình tư vấn và chốt đơn" rows={7} value={value.sales_process} onChange={(v) => set('sales_process', v)} hint="Mô tả lần lượt các bước bot nên thực hiện." /><div className="grid gap-5 lg:grid-cols-2"><Field label="Câu hỏi khám phá nhu cầu" rows={7} value={lines(value.discovery_questions)} onChange={(v) => set('discovery_questions', splitLines(v))} hint="Mỗi dòng một câu hỏi." /><Field label="Nguyên tắc trả lời" rows={7} value={lines(value.response_guidelines)} onChange={(v) => set('response_guidelines', splitLines(v))} hint="Mỗi dòng một nguyên tắc." /><Field label="Quy tắc chốt đơn" rows={7} value={lines(value.closing_rules)} onChange={(v) => set('closing_rules', splitLines(v))} hint="Mỗi dòng một điều kiện hoặc hành động." /></div></div></Modal>
    <Modal open={active === 'objections'} onClose={close} title="Xử lý phản đối" description="Khai báo băn khoăn của khách và cách Candlet muốn bot phản hồi." footer={footer}><Field label="Các tình huống phản đối" rows={12} value={pairsToText(value.objection_handlers, 'objection', 'response')} onChange={(v) => set('objection_handlers', textToPairs(v, 'objection', 'response'))} hint="Mỗi dòng: Băn khoăn của khách | Cách xử lý mong muốn" /></Modal>
    <Modal open={active === 'responses'} onClose={close} title="An toàn và hội thoại mẫu" description="Thiết lập giới hạn và cung cấp câu trả lời tham khảo cho bot." footer={footer} wide><div className="grid gap-5 lg:grid-cols-2"><Field label="Điều bot không được cam kết" rows={6} value={lines(value.prohibited_claims)} onChange={(v) => set('prohibited_claims', splitLines(v))} hint="Mỗi dòng một quy tắc." /><Field label="Chủ đề phải chuyển nhân viên" rows={6} value={lines(value.handoff_topics)} onChange={(v) => set('handoff_topics', splitLines(v))} hint="Mỗi dòng một chủ đề." /><Field label="Câu hỏi thường gặp" rows={9} value={pairsToText(value.faqs, 'question', 'answer')} onChange={(v) => set('faqs', textToPairs(v, 'question', 'answer'))} hint="Mỗi dòng: Câu hỏi | Câu trả lời" /><Field label="Ví dụ hội thoại chuẩn" rows={9} value={pairsToText(value.examples, 'customer', 'assistant')} onChange={(v) => set('examples', textToPairs(v, 'customer', 'assistant'))} hint="Mỗi dòng: Tin nhắn khách | Câu trả lời mong muốn" /></div></Modal>
  </div>;
}

function ProductTrainer({ items, selectedId, onSelect, profile, onChange, onSave, saving }) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.product._id === selectedId);
  const set = (key, next) => onChange({ ...profile, [key]: next });
  const listField = (label, key) => <Field label={label} value={lines(profile[key])} onChange={(v) => set(key, splitLines(v))} hint="Mỗi dòng một giá trị." />;
  const edit = (id) => { onSelect(id); setOpen(true); };
  const save = async () => { if (await onSave()) setOpen(false); };
  return <div className="space-y-5"><div className="rounded-3xl border border-[#e6dad5] bg-gradient-to-r from-[#fffaf7] to-white p-5 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a06a55]">Hồ sơ tư vấn</p><h2 className="mt-1 text-xl font-extrabold text-[#322522]">Dạy bot hiểu từng sản phẩm</h2><p className="mt-1 text-sm text-on-surface-variant">Chọn sản phẩm để mở biểu mẫu. Bot vẫn tự đọc tên, giá, phân loại và tồn kho từ dữ liệu sản phẩm.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <button key={item.product._id} onClick={() => edit(item.product._id)} className="group flex items-center gap-4 rounded-3xl border border-[#e6dad5] bg-white p-4 text-left shadow-[0_10px_30px_rgba(74,48,40,0.05)] transition hover:-translate-y-1 hover:border-[#c8aaa0] hover:shadow-lg"><img src={item.product.image} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-[#f5efec] object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-extrabold text-[#322522]">{item.product.name}</span><span className="mt-1 block text-xs text-on-surface-variant">{money(item.product.base_price)}</span><span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-extrabold ${item.profile ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.profile ? 'Đã huấn luyện' : 'Chưa bổ sung'}</span></span><span className="text-primary transition group-hover:translate-x-1">→</span></button>)}</div>
    <Modal open={open && Boolean(selected)} onClose={() => setOpen(false)} title={selected?.product.name || 'Hồ sơ sản phẩm'} description={selected ? `${money(selected.product.base_price)} · ${selected.product.scent_group || 'Chưa có nhóm hương'}` : ''} wide footer={<><button onClick={() => setOpen(false)} className="rounded-xl border border-[#ded0ca] px-4 py-2.5 text-sm font-bold">Đóng</button><button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></>}><div className="space-y-5"><label className="flex items-center justify-between rounded-2xl bg-[#f8f2ef] px-4 py-3 text-sm font-bold"><span>Cho phép bot tư vấn sản phẩm này</span><input type="checkbox" checked={profile.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 accent-[#5b3028]" /></label><div className="grid gap-5 md:grid-cols-2">{listField('Tầng hương', 'scent_notes')}<label className="block space-y-2"><span className="text-xs font-extrabold text-[#493733]">Cường độ hương</span><select value={profile.intensity || ''} onChange={(e) => set('intensity', e.target.value)} className="w-full rounded-xl border border-[#ded0ca] bg-[#fffdfc] px-3.5 py-3 text-sm outline-none focus:border-primary"><option value="">Chưa xác định</option><option value="nhẹ">Nhẹ</option><option value="vừa">Vừa</option><option value="đậm">Đậm</option></select></label>{listField('Không gian phù hợp', 'suitable_spaces')}{listField('Dịp sử dụng', 'occasions')}{listField('Cảm xúc/mục đích', 'moods')}{listField('Đối tượng phù hợp', 'audiences')}<Field label="Thời gian đốt" value={profile.burn_time} onChange={(v) => set('burn_time', v)} />{listField('Điểm bán hàng nổi bật', 'selling_points')}{listField('Từ khóa khách thường dùng', 'keywords')}<Field label="Lưu ý tư vấn" value={profile.advice_notes} onChange={(v) => set('advice_notes', v)} /></div></div></Modal>
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
    <div className="flex flex-col gap-4 rounded-3xl border border-[#e6dad5] bg-gradient-to-r from-[#fffaf7] to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a06a55]">Nội dung trực quan</p><h2 className="mt-1 text-xl font-extrabold text-[#322522]">Thư viện ảnh AI</h2><p className="mt-1 text-sm text-on-surface-variant">Bấm vào ảnh để chỉnh sửa cách bot sử dụng. Hiện có {items.length} ảnh.</p></div><button onClick={startNew} className="rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-md">+ Thêm ảnh mới</button></div>
    {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {items.length === 0 ? <button onClick={startNew} className="grid min-h-64 w-full place-items-center rounded-3xl border-2 border-dashed border-[#decfc9] bg-white text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary">Tải ảnh đầu tiên vào thư viện</button> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => <button key={item._id} onClick={() => { setError(''); setSelectedId(item._id); }} className="group overflow-hidden rounded-3xl border border-[#e6dad5] bg-white text-left shadow-[0_10px_30px_rgba(74,48,40,0.05)] transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[4/3] overflow-hidden bg-[#f5efec]"><img src={item.image_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><span className={`absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-extrabold backdrop-blur ${item.enabled ? 'bg-emerald-500/90 text-white' : 'bg-black/55 text-white'}`}>{item.enabled ? 'Đang bật' : 'Đã tắt'}</span></div><div className="p-4"><p className="truncate font-extrabold text-[#322522]">{item.name}</p><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-on-surface-variant">{item.description || item.usage_notes || 'Chưa có mô tả sử dụng'}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#a06a55]">Ưu tiên {item.priority || 0} · Chỉnh sửa →</p></div></button>)}</div>}
    <Modal open={Boolean(selectedId)} onClose={close} title={selected ? 'Chỉnh sửa ảnh' : 'Thêm ảnh mới'} description="Mô tả rõ trường hợp sử dụng để AI chọn đúng ảnh." wide footer={<><button onClick={close} className="rounded-xl border border-[#ded0ca] px-4 py-2.5 text-sm font-bold">Đóng</button>{selected && <button onClick={remove} disabled={working} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Xóa ảnh</button>}<button onClick={save} disabled={working} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{working ? 'Đang lưu…' : 'Lưu ảnh'}</button></>}>
      {error && <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-[220px_1fr]"><div className="space-y-3">{form.image_url ? <img src={form.image_url} alt="Xem trước" className="aspect-square w-full rounded-xl border border-outline-variant object-cover" /> : <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-outline-variant text-sm text-on-surface-variant">Chưa có ảnh</div>}<label className="block cursor-pointer rounded-xl border border-outline-variant px-4 py-2.5 text-center text-sm font-bold"><input type="file" accept="image/*" onChange={upload} disabled={working} className="hidden" />{working ? 'Đang xử lý…' : 'Tải ảnh lên'}</label></div><div className="space-y-4"><label className="block space-y-1.5"><span className="text-xs font-bold">Tên ảnh *</span><input value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} className="w-full rounded-xl border border-outline-variant px-3 py-2.5 text-sm" placeholder="Ví dụ: Gói quà sinh nhật màu kem" /></label><Field label="Mô tả nội dung ảnh" value={form.description} onChange={(v) => set('description', v)} hint="Mô tả những gì khách sẽ nhìn thấy." /><Field label="Khi nào nên dùng" value={form.usage_notes} onChange={(v) => set('usage_notes', v)} hint="Ví dụ: gửi khi khách hỏi mẫu gói quà sinh nhật." /></div></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Từ khóa kích hoạt" value={lines(form.trigger_keywords)} onChange={(v) => set('trigger_keywords', splitLines(v))} hint="Mỗi dòng một từ hoặc cụm từ khách có thể dùng." /><label className="block space-y-1.5"><span className="text-xs font-bold">Sản phẩm liên quan</span><select multiple value={form.linked_products} onChange={(e) => set('linked_products', [...e.target.selectedOptions].map((option) => option.value))} className="min-h-36 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm">{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select><span className="block text-[11px] text-on-surface-variant">Giữ Ctrl hoặc Cmd để chọn nhiều sản phẩm.</span></label></div>
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-[#f8f2ef] p-4"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="accent-[#5b3028]" />Cho phép AI sử dụng</label><label className="ml-auto flex items-center gap-2 text-sm"><span className="font-bold">Ưu tiên</span><input type="number" min="-100" max="100" value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-24 rounded-lg border border-outline-variant px-3 py-2" /></label></div>
    </Modal>
  </div>;
}

export default function MessengerBotManagement() {
  const [tab, setTab] = useState('operations');
  const [status, setStatus] = useState(null); const [drafts, setDrafts] = useState([]); const [conversations, setConversations] = useState([]);
  const [knowledge, setKnowledge] = useState(emptyKnowledge); const [productProfiles, setProductProfiles] = useState([]); const [media, setMedia] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(''); const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true); const [workingId, setWorkingId] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { try { setError(''); const [s, d, c, k, p, m] = await Promise.all([messengerBotService.getStatus(), messengerBotService.getDrafts(), messengerBotService.getConversations(), messengerBotService.getKnowledge(), messengerBotService.getProductProfiles(), messengerBotService.getMedia()]); setStatus(s.data.data); setDrafts(d.data.data || []); setConversations(c.data.data || []); setKnowledge({ ...emptyKnowledge, ...k.data.data }); setProductProfiles(p.data.data || []); setMedia(m.data.data || []); setSelectedProductId((current) => current || p.data.data?.[0]?.product?._id || ''); } catch (e) { setError(e.response?.data?.message || 'Không thể tải dữ liệu bot.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const item = productProfiles.find((entry) => entry.product._id === selectedProductId); setProfile({ ...emptyProfile, ...(item?.profile || {}) }); }, [selectedProductId, productProfiles]);
  const act = async (id, action) => { try { setWorkingId(id); setError(''); await action(); await load(); return true; } catch (e) { setError(e.response?.data?.message || 'Không thể thực hiện thao tác.'); return false; } finally { setWorkingId(''); } };
  const saveKnowledge = async () => { try { setSaving(true); setError(''); const result = await messengerBotService.updateKnowledge(knowledge); setKnowledge({ ...emptyKnowledge, ...result.data.data }); setNotice('Đã lưu kiến thức mới cho bot.'); await load(); return true; } catch (e) { setError(e.response?.data?.message || 'Không thể lưu kiến thức.'); return false; } finally { setSaving(false); } };
  const saveProfile = async () => { try { setSaving(true); setError(''); await messengerBotService.updateProductProfile(selectedProductId, profile); setNotice('Đã lưu hồ sơ tư vấn sản phẩm.'); await load(); return true; } catch (e) { setError(e.response?.data?.message || 'Không thể lưu hồ sơ sản phẩm.'); return false; } finally { setSaving(false); } };
  const tabs = useMemo(() => [
    { key: 'operations', label: 'Vận hành', icon: 'pulse' },
    { key: 'knowledge', label: 'Huấn luyện chuyên sâu', icon: 'sparkles' },
    { key: 'products', label: 'Dạy theo sản phẩm', icon: 'box' },
    { key: 'media', label: 'Thư viện ảnh', icon: 'image' },
  ], []);
  return <Layout><div className="mx-auto max-w-7xl space-y-6 pb-10">
    <section className="relative overflow-hidden rounded-3xl bg-[#402620] px-5 py-6 text-white shadow-[0_18px_50px_rgba(64,38,32,0.22)] sm:px-7 sm:py-7"><div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#c99072]/20 blur-2xl" /><div className="absolute bottom-0 right-1/3 h-24 w-24 rounded-full bg-white/5 blur-xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10"><Icon name="bot" className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#eac4b1]">Facebook Messenger</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${status?.configured ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-300/15 text-amber-200'}`}>{status?.configured ? '● Online' : '● Cần cấu hình'}</span></div><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Trung tâm Bot AI</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-white/65">Vận hành hội thoại, xây dựng playbook bán hàng và quản lý nội dung bot gửi cho khách.</p></div></div><button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"><Icon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button></div></section>
    <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[#e6dad5] bg-white p-1.5 shadow-sm">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition ${tab === item.key ? 'bg-[#5b3028] text-white shadow-md' : 'text-[#725d57] hover:bg-[#f8f2ef] hover:text-[#402620]'}`}><Icon name={item.icon} className="h-4 w-4" />{item.label}</button>)}</nav>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}{notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
    {tab === 'operations' && <Operations {...{ status, drafts, conversations, loading, workingId, act }} />}{tab === 'knowledge' && <KnowledgeEditor value={knowledge} onChange={setKnowledge} onSave={saveKnowledge} saving={saving} />}{tab === 'products' && <ProductTrainer items={productProfiles} selectedId={selectedProductId} onSelect={setSelectedProductId} profile={profile} onChange={setProfile} onSave={saveProfile} saving={saving} />}{tab === 'media' && <MediaLibrary items={media} products={productProfiles.map((item) => item.product)} onReload={load} />}
  </div></Layout>;
}
