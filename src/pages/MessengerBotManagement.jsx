import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { messengerBotService } from '../services/messengerBotService';

const money = (value) => new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
const time = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';

export default function MessengerBotManagement() {
  const [status, setStatus] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [statusResult, draftResult, conversationResult] = await Promise.all([
        messengerBotService.getStatus(),
        messengerBotService.getDrafts(),
        messengerBotService.getConversations(),
      ]);
      setStatus(statusResult.data.data);
      setDrafts(draftResult.data.data || []);
      setConversations(conversationResult.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu bot.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    try {
      setWorkingId(id);
      setError('');
      await action();
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể thực hiện thao tác.');
    } finally {
      setWorkingId('');
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Facebook Messenger</p>
            <h1 className="mt-1 text-2xl font-bold text-on-surface">Bot tư vấn và chốt đơn AI</h1>
            <p className="mt-1 text-sm text-on-surface-variant">Duyệt đơn nháp và chuyển quyền trả lời giữa bot với nhân viên.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-60">
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>Làm mới
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        {status && !status.configured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Bot chưa hoạt động. Hãy cấu hình đủ OpenAI API key, Meta Page Access Token, Verify Token và App Secret trên backend.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant/40 bg-white p-5"><p className="text-xs font-bold text-on-surface-variant">Trạng thái</p><p className={`mt-2 text-lg font-bold ${status?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>{status?.configured ? 'Sẵn sàng' : 'Chưa cấu hình'}</p><p className="mt-1 text-xs text-on-surface-variant">Model: {status?.model || '—'}</p></div>
          <div className="rounded-2xl border border-outline-variant/40 bg-white p-5"><p className="text-xs font-bold text-on-surface-variant">Đơn chờ duyệt</p><p className="mt-2 text-3xl font-bold text-on-surface">{status?.pending_drafts ?? 0}</p></div>
          <div className="rounded-2xl border border-outline-variant/40 bg-white p-5"><p className="text-xs font-bold text-on-surface-variant">Cần nhân viên</p><p className="mt-2 text-3xl font-bold text-on-surface">{status?.human_conversations ?? 0}</p></div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-white">
          <div className="border-b border-outline-variant/30 px-5 py-4"><h2 className="font-bold text-on-surface">Đơn nháp từ Messenger</h2></div>
          {loading ? <p className="p-8 text-center text-sm text-on-surface-variant">Đang tải…</p> : drafts.length === 0 ? <p className="p-8 text-center text-sm text-on-surface-variant">Chưa có đơn nháp.</p> : (
            <div className="divide-y divide-outline-variant/20">
              {drafts.map((draft) => (
                <div key={draft._id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center">
                  <div><p className="font-bold text-on-surface">{draft.customer_name}</p><p className="mt-1 text-sm text-on-surface-variant">{draft.customer_phone}</p><p className="mt-1 text-xs text-on-surface-variant">{draft.customer_address}</p></div>
                  <div><div className="space-y-1">{draft.items.map((item, index) => <p key={`${item.product_id}-${index}`} className="text-sm text-on-surface"><span className="font-semibold">{item.product_name}</span>{item.sku_label ? ` · ${item.sku_label}` : ''} × {item.quantity}</p>)}</div><p className="mt-2 font-bold text-primary">{money(draft.total_price)}</p><p className="mt-1 text-[11px] text-on-surface-variant">{time(draft.createdAt)} · {draft.status}</p></div>
                  <div className="flex gap-2 lg:justify-end">
                    {draft.status === 'pending' && <><button disabled={workingId === draft._id} onClick={() => act(draft._id, () => messengerBotService.rejectDraft(draft._id, 'Nhân viên từ chối đơn nháp'))} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Từ chối</button><button disabled={workingId === draft._id} onClick={() => act(draft._id, () => messengerBotService.approveDraft(draft._id))} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">Duyệt đơn</button></>}
                    {draft.status === 'approved' && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Đã tạo {draft.order_id?.orderId || 'đơn'}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-white">
          <div className="border-b border-outline-variant/30 px-5 py-4"><h2 className="font-bold text-on-surface">Hội thoại gần đây</h2></div>
          <div className="divide-y divide-outline-variant/20">
            {conversations.length === 0 ? <p className="p-8 text-center text-sm text-on-surface-variant">Chưa có hội thoại.</p> : conversations.map((conversation) => (
              <div key={conversation._id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate font-mono text-xs font-bold text-on-surface">{conversation.psid}</p><p className="mt-1 truncate text-sm text-on-surface-variant">{conversation.history?.at(-1)?.text || 'Chưa có nội dung'}</p><p className="mt-1 text-[11px] text-on-surface-variant">{time(conversation.last_activity_at)}{conversation.handoff_reason ? ` · ${conversation.handoff_reason}` : ''}</p></div>
                <select value={conversation.mode} disabled={workingId === conversation._id} onChange={(event) => act(conversation._id, () => messengerBotService.updateConversationMode(conversation._id, event.target.value))} className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-on-surface">
                  <option value="bot">Bot trả lời</option><option value="human">Nhân viên xử lý</option><option value="paused">Tạm dừng</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
