import { useState } from 'react';
import SearchableSelect from './SearchableSelect';

export default function MaterialTrackingModal({ data, onClose, onConfirm, loading, error }) {
  const [action, setAction] = useState(data.products.length ? 'suspend' : 'none');
  const [replacementId, setReplacementId] = useState('');
  const canSubmit = action !== 'replace' || replacementId;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3">
            <span className="material-symbols-outlined flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">pause_circle</span>
            <div><h3 className="text-lg font-bold text-slate-900">Tạm ngừng theo dõi nguyên vật liệu</h3><p className="mt-1 text-sm text-slate-500">{data.material.name} · {data.material.sku}</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Nguyên vật liệu sẽ không còn được tính vào trạng thái và cảnh báo tồn kho cho đến khi bạn bật theo dõi lại.</div>
          {data.products.length > 0 && <>
            <div><p className="font-bold text-slate-900">Đang được dùng trong {data.products.length} công thức</p><p className="mt-1 text-sm text-slate-500">{data.products.slice(0, 5).map(product => product.name).join(', ')}{data.products.length > 5 ? ` và ${data.products.length - 5} sản phẩm khác` : ''}</p></div>
            <label className={`block cursor-pointer rounded-xl border p-4 transition-colors ${action === 'suspend' ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}>
              <span className="flex items-start gap-3"><input type="radio" className="mt-1 accent-violet-700" checked={action === 'suspend'} onChange={() => setAction('suspend')} /><span><strong className="block text-sm text-slate-900">Đình chỉ trong công thức</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Tạm bỏ khỏi giá vốn, khả năng sản xuất và trừ kho. Khi bật theo dõi lại, nguyên vật liệu tự trở lại công thức.</span></span></span>
            </label>
            <label className={`block cursor-pointer rounded-xl border p-4 transition-colors ${action === 'replace' ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}>
              <span className="flex items-start gap-3"><input type="radio" className="mt-1 accent-violet-700" checked={action === 'replace'} onChange={() => setAction('replace')} /><span><strong className="block text-sm text-slate-900">Thay thế tạm thời trong tất cả công thức</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Khi bật theo dõi lại, công thức tự trở về nguyên vật liệu cũ và giữ nguyên định lượng.</span></span></span>
              {action === 'replace' && <div className="mt-3"><SearchableSelect value={replacementId} onChange={setReplacementId} options={data.replacements.map(material => ({ value: material._id, label: `${material.name} (${material.sku}) · ${material.unit}` }))} placeholder="Chọn nguyên vật liệu thay thế" searchPlaceholder="Tìm theo tên hoặc mã SKU..." className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 shadow-sm hover:border-violet-300" portalMenu /></div>}
            </label>
          </>}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4"><button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Hủy</button><button type="button" onClick={() => onConfirm(action, replacementId)} disabled={loading || !canSubmit} className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{loading ? 'Đang xử lý...' : 'Tạm ngừng theo dõi'}</button></div>
      </div>
    </div>
  );
}
