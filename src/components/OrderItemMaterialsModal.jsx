import { useEffect, useMemo, useState } from 'react';
import { orderService } from '../services/orderService';
import { materialService } from '../services/materialService';
import { formatPrice } from '../utils/formatPrice';
import SearchableSelect from './SearchableSelect';

const quantityText = value => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 4 });

export default function OrderItemMaterialsModal({ orderId, index, item, onClose, onSaved }) {
  const [original, setOriginal] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([orderService.getItemMaterials(orderId, index), materialService.getMaterials()])
      .then(([recipe, inventory]) => {
        if (!active) return;
        const data = recipe.data.data;
        if (String(data.product_id) !== String(item.product_id?._id || item.product_id)
          || (data.sku_id || null) !== (item.sku_id || null) || data.quantity !== item.quantity) {
          throw new Error('Sản phẩm hoặc số lượng đã thay đổi. Đóng cửa sổ và mở lại đơn hàng.');
        }
        setOriginal(data);
        setRows(data.ingredients.map(entry => ({ ingredient_id: entry.ingredient_id, quantity: entry.quantity, source_id: entry.ingredient_id, source_quantity: entry.quantity })));
        setSelectedRow(null);
        setMaterials(inventory.data.data);
      })
      .catch(err => { if (active) setError(err.response?.data?.message || err.message || 'Không tải được nguyên liệu.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, index, item.product_id, item.sku_id, item.quantity, reload]);

  const byId = useMemo(() => new Map(materials.map(material => [material._id, material])), [materials]);
  const changes = useMemo(() => {
    const quantities = new Map();
    for (const entry of original?.ingredients || []) quantities.set(entry.ingredient_id, -entry.quantity * item.quantity);
    for (const row of rows) {
      if (!row.ingredient_id || !Number.isFinite(Number(row.quantity))) continue;
      quantities.set(row.ingredient_id, (quantities.get(row.ingredient_id) || 0) + Number(row.quantity) * item.quantity);
    }
    return [...quantities].map(([id, quantity]) => ({ id, quantity: Number(quantity.toFixed(4)) })).filter(change => change.quantity !== 0);
  }, [original, rows, item.quantity]);

  const invalid = !rows.length || rows.some(row => !byId.has(row.ingredient_id)
    || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0
    || Number(Number(row.quantity).toFixed(4)) !== Number(row.quantity))
    || new Set(rows.map(row => row.ingredient_id)).size !== rows.length;
  const insufficient = changes.some(change => change.quantity > 0 && Number(byId.get(change.id)?.actualStock ?? 0) < change.quantity);
  const unitCost = rows.reduce((sum, row) => sum + (byId.get(row.ingredient_id)?.price || 0) * (Number(row.quantity) || 0), 0);
  const selected = rows[selectedRow];
  const selectedMaterial = byId.get(selected?.ingredient_id);
  const sourceMaterial = original?.ingredients.find(entry => entry.ingredient_id === selected?.source_id);
  const resetRows = () => {
    setRows(original.ingredients.map(entry => ({ ingredient_id: entry.ingredient_id, quantity: entry.quantity, source_id: entry.ingredient_id, source_quantity: entry.quantity })));
    setSelectedRow(null);
  };

  const updateRow = (rowIndex, field, value) => setRows(current => current.map((row, i) => i === rowIndex ? { ...row, [field]: value } : row));
  const save = async () => {
    if (invalid || insufficient || !original || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await orderService.updateItemMaterials(orderId, index, {
        revision: original.revision,
        ingredients: rows.map(row => ({ ingredient_id: row.ingredient_id, quantity: Number(row.quantity) })),
      });
      onSaved(result.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không lưu được nguyên liệu. Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="order-materials-title">
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-start gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <span aria-hidden="true" className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">tune</span>
          <div className="min-w-0 flex-1">
            <h3 id="order-materials-title" className="text-lg font-bold text-stone-900">Đổi nguyên liệu</h3>
            <p className="mt-1 break-words text-sm text-stone-500"><span className="font-medium text-stone-700">{item.product_name}</span>{item.sku_label ? ' · ' + item.sku_label : ''}<span className="ml-2 inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold">× {item.quantity} sản phẩm</span></p>
          </div>
          <button type="button" aria-label="Đóng phần nguyên liệu" disabled={saving} onClick={onClose} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="min-h-0 overflow-y-auto bg-stone-50/60">
          {error && <div role="alert" className="mx-5 mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" disabled={saving} onClick={() => { setOriginal(null); setReload(value => value + 1); }} className="ml-2 cursor-pointer font-semibold underline">Tải lại</button></div>}
          {loading ? <div role="status" className="flex flex-col items-center gap-3 py-16 text-sm text-stone-500"><span aria-hidden="true" className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>Đang tải nguyên liệu…</div> : original && (
            <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <fieldset disabled={saving} className="min-w-0 space-y-4 disabled:opacity-70">
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
                    <h4 className="text-sm font-bold text-stone-800">Chọn nguyên liệu cần đổi</h4>
                  </div>
                  <SearchableSelect
                    options={rows.map((row, rowIndex) => {
                      const material = byId.get(row.source_id || row.ingredient_id) || original.ingredients.find(entry => entry.ingredient_id === row.source_id);
                      const changed = row.source_id && (row.ingredient_id !== row.source_id || Number(row.quantity) !== Number(row.source_quantity));
                      return { value: rowIndex, label: material ? material.name + (material.sku ? ' · ' + material.sku : '') + (changed ? ' · Đã chỉnh sửa' : '') : 'Nguyên liệu mới — chưa chọn' };
                    })}
                    value={selectedRow ?? ''}
                    onChange={setSelectedRow}
                    placeholder="Tìm nguyên liệu trong sản phẩm"
                    searchPlaceholder="Nhập tên hoặc mã nguyên liệu…"
                    ariaLabel="Nguyên liệu cần đổi"
                    disabled={saving}
                    inlineMenu
                    className="min-h-11 border border-stone-200 bg-white !px-3 !py-2.5 hover:border-blue-300"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">Chọn từng nguyên liệu để thay thế hoặc điều chỉnh định lượng.</p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className={selected ? 'flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white' : 'flex size-6 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-400'}>2</span>
                    <h4 className="text-sm font-bold text-stone-800">{selected && !selected.source_id ? 'Thêm nguyên liệu mới' : 'Chọn nguyên liệu thay thế'}</h4>
                  </div>
                  {selected ? <div className="space-y-4">
                    {sourceMaterial && <div className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2.5">
                      <div className="min-w-0"><p className="text-[11px] font-medium text-stone-500">Đang dùng / 1 sản phẩm</p><p className="mt-0.5 break-words text-sm font-semibold text-stone-700">{sourceMaterial.name}</p></div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-600">{quantityText(selected.source_quantity)} {sourceMaterial.unit}</span>
                    </div>}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-stone-600">{selected.source_id ? 'Thay bằng' : 'Nguyên liệu'}</p>
                      <SearchableSelect
                        key={selectedRow}
                        options={materials.filter(candidate => !rows.some((other, i) => i !== selectedRow && other.ingredient_id === candidate._id)).map(candidate => ({ value: candidate._id, label: candidate.name + (candidate.sku ? ' · ' + candidate.sku : '') + ' (' + candidate.unit + ')' }))}
                        value={selected.ingredient_id}
                        onChange={value => updateRow(selectedRow, 'ingredient_id', value)}
                        placeholder={selected.ingredient_id && !selectedMaterial ? 'Nguyên liệu đã bị xoá — chọn thay thế' : 'Tìm nguyên liệu mới'}
                        searchPlaceholder="Nhập tên hoặc mã nguyên liệu…"
                        ariaLabel="Nguyên liệu thay thế"
                        disabled={saving}
                        inlineMenu
                        className="min-h-11 border border-blue-200 bg-white !px-3 !py-2.5 hover:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="order-material-quantity" className="text-xs font-semibold text-stone-600">Định lượng cho 1 sản phẩm</label>
                      <div className="mt-1.5 flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <input id="order-material-quantity" type="number" min="0.0001" step="0.0001" value={selected.quantity} onChange={e => updateRow(selectedRow, 'quantity', e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-semibold outline-none" />
                        <span className="px-3 text-sm text-stone-500">{selectedMaterial?.unit || 'đơn vị'}</span>
                      </div>
                    </div>
                    {selectedMaterial && <div className="grid grid-cols-2 gap-3 rounded-lg bg-blue-50/60 p-3">
                      <div><p className="text-[11px] text-stone-500">Tổng dùng · {item.quantity} sản phẩm</p><p className="mt-1 text-sm font-bold tabular-nums text-primary">{quantityText((Number(selected.quantity) || 0) * item.quantity)} <span className="font-normal">{selectedMaterial.unit}</span></p></div>
                      <div className="border-l border-blue-100 pl-3"><p className="text-[11px] text-stone-500">Tồn kho hiện tại</p><p className="mt-1 text-sm font-semibold tabular-nums text-stone-700">{quantityText(selectedMaterial.actualStock)} <span className="font-normal">{selectedMaterial.unit}</span></p></div>
                    </div>}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                      <button type="button" onClick={() => setSelectedRow(null)} className="cursor-pointer rounded-lg px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-blue-50">Đổi nguyên liệu khác</button>
                      <button type="button" onClick={() => { setRows(current => current.filter((_, i) => i !== selectedRow)); setSelectedRow(null); }} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"><span aria-hidden="true" className="material-symbols-outlined text-base">delete</span>Bỏ nguyên liệu</button>
                    </div>
                  </div> : <div className="flex flex-col items-center px-3 py-7 text-center">
                    <span aria-hidden="true" className="material-symbols-outlined mb-3 rounded-2xl bg-stone-50 p-3 text-3xl text-stone-300">swap_horiz</span>
                    <p className="text-sm font-medium text-stone-600">Chọn nguyên liệu ở bước 1</p>
                    <p className="mt-1 max-w-64 text-xs leading-relaxed text-stone-400">Sau đó tìm nguyên liệu thay thế và nhập định lượng cần dùng.</p>
                  </div>}
                </div>
                <button type="button" onClick={() => { const pending = rows.findIndex(row => !row.ingredient_id); if (pending >= 0) { setSelectedRow(pending); return; } setSelectedRow(rows.length); setRows(current => [...current, { ingredient_id: '', quantity: 1 }]); }} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2.5 text-xs font-semibold text-stone-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-primary"><span aria-hidden="true" className="material-symbols-outlined text-lg">add</span>Thêm nguyên liệu ngoài công thức</button>
              </fieldset>

              <aside className="min-w-0 space-y-3">
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div className="border-b border-stone-100 p-4">
                    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold text-stone-800">Kiểm tra thay đổi</h4>{changes.length > 0 && <button type="button" disabled={saving} onClick={resetRows} className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40">Đặt lại</button>}</div>
                    <p className="mt-1 text-xs text-stone-500">Tồn kho sẽ cập nhật cho {item.quantity} sản phẩm khi lưu.</p>
                  </div>
                  <div className="space-y-3 p-4" aria-live="polite">
                    {changes.length ? changes.map(change => {
                      const material = byId.get(change.id) || original.ingredients.find(entry => entry.ingredient_id === change.id);
                      const refund = change.quantity < 0;
                      const remaining = Number(material?.actualStock ?? 0) - change.quantity;
                      return <div key={change.id} className="flex items-start gap-2.5">
                        <span aria-hidden="true" className={'material-symbols-outlined flex size-8 shrink-0 items-center justify-center rounded-lg text-lg ' + (refund ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>{refund ? 'add' : 'remove'}</span>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><span className={'text-[11px] font-semibold ' + (refund ? 'text-emerald-700' : 'text-amber-700')}>{refund ? 'Hoàn về kho' : 'Trừ thêm từ kho'}</span><strong className={'text-sm tabular-nums ' + (refund ? 'text-emerald-700' : 'text-amber-700')}>{refund ? '+' : '−'}{quantityText(Math.abs(change.quantity))} {material?.unit}</strong></div><p className="mt-0.5 break-words text-sm font-medium text-stone-800">{material?.name || 'Nguyên liệu đã bị xoá'}</p>{remaining < 0 && <p className="mt-1 text-xs font-medium text-red-600">Thiếu {quantityText(-remaining)} {material?.unit}</p>}</div>
                      </div>;
                    }) : <div className="py-7 text-center"><span aria-hidden="true" className="material-symbols-outlined text-3xl text-stone-300">inventory_2</span><p className="mt-2 text-sm font-medium text-stone-500">Chưa có thay đổi</p><p className="mt-1 text-xs leading-relaxed text-stone-400">Nguyên liệu hoàn về và trừ thêm sẽ xuất hiện tại đây.</p></div>}
                  </div>
                  <dl className="space-y-2 border-t border-stone-100 bg-stone-50/60 p-4 text-xs">
                    <div className="flex flex-wrap justify-between gap-2"><dt className="text-stone-500">Giá vốn / sản phẩm</dt><dd className="font-semibold text-stone-700">{formatPrice(unitCost)}</dd></div>
                    <div className="flex flex-wrap items-center justify-between gap-2"><dt className="font-medium text-stone-600">Tổng giá vốn · {item.quantity} SP</dt><dd className="text-base font-bold text-primary">{formatPrice(unitCost * item.quantity)}</dd></div>
                  </dl>
                </div>
                <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-stone-500"><span aria-hidden="true" className="material-symbols-outlined shrink-0 text-base text-primary">info</span>Chỉ áp dụng cho sản phẩm này trong đơn hàng. Công thức gốc được giữ nguyên.</p>
                {insufficient && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-relaxed text-red-700">Kho không đủ nguyên liệu thay thế. Hãy giảm định lượng hoặc chọn nguyên liệu khác.</p>}
                {invalid && <p role="alert" className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Chọn đủ nguyên liệu và nhập định lượng lớn hơn 0, tối đa 4 số thập phân. Sản phẩm cần có ít nhất một nguyên liệu.</p>}
              </aside>
            </div>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:px-6">
          <p className="text-xs text-stone-500">{saving ? 'Đang cập nhật nguyên liệu và tồn kho…' : changes.length ? 'Thay đổi chưa được lưu.' : 'Tồn kho chỉ thay đổi sau khi lưu.'}</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" disabled={saving} onClick={onClose} className="min-h-11 flex-1 cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40 sm:flex-none">Đóng</button>
            <button type="button" disabled={loading || saving || !original || invalid || insufficient || !changes.length} onClick={save} className="inline-flex min-h-11 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"><span aria-hidden="true" className={'material-symbols-outlined text-lg' + (saving ? ' animate-spin' : '')}>{saving ? 'progress_activity' : 'check'}</span>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
