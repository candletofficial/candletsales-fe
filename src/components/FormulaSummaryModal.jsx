import React, { useEffect, useMemo, useState } from 'react';
import { createFormulaPreviewUrl, exportFormulaSummaryPdf, getFormulaProducts } from '../utils/formulaSummaryPdf';

const SIZE_PRESETS = [
  { id: '70x100', label: 'Nhãn 70 × 100 mm', width: 70, height: 100 },
  { id: '50x70', label: 'Nhãn 50 × 70 mm', width: 50, height: 70 },
  { id: 'a6', label: 'Khổ A6 · 105 × 148 mm', width: 105, height: 148 },
  { id: 'custom', label: 'Kích thước tùy chỉnh' },
];

export default function FormulaSummaryModal({ products, materials, onClose, onSuccess }) {
  const eligibleProducts = useMemo(() => getFormulaProducts(products, materials), [products, materials]);
  const [selectedIds, setSelectedIds] = useState(() => new Set(eligibleProducts.map(product => product._id)));
  const [sizePreset, setSizePreset] = useState('70x100');
  const [width, setWidth] = useState(70);
  const [height, setHeight] = useState(100);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewing, setPreviewing] = useState(false);

  const selectedProducts = useMemo(
    () => eligibleProducts.filter(product => selectedIds.has(product._id)),
    [eligibleProducts, selectedIds],
  );
  const estimatedSheets = selectedProducts.length;

  useEffect(() => {
    if (!selectedProducts.length || width < 30 || height < 30 || width > 300 || height > 300) {
      setPreviewUrl(previousUrl => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return '';
      });
      return undefined;
    }

    let currentUrl = '';
    const timer = window.setTimeout(() => {
      try {
        setPreviewing(true);
        currentUrl = createFormulaPreviewUrl({ products: selectedProducts, materials, width, height, batchQuantity });
        setPreviewUrl(previousUrl => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return currentUrl;
        });
      } catch (previewError) {
        setError(previewError.message || 'Không thể xem trước file công thức.');
      } finally {
        setPreviewing(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [selectedProducts, materials, width, height, batchQuantity]);

  const selectPreset = (id) => {
    setSizePreset(id);
    const preset = SIZE_PRESETS.find(item => item.id === id);
    if (preset?.width) {
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  const toggleProduct = (id) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    setError('');
    if (!selectedProducts.length) return setError('Vui lòng chọn ít nhất một sản phẩm.');
    if (width < 30 || height < 30 || width > 300 || height > 300) {
      return setError('Kích thước mỗi chiều phải từ 30 đến 300 mm.');
    }
    try {
      const result = exportFormulaSummaryPdf({ products: selectedProducts, materials, width, height, batchQuantity });
      onSuccess?.(`Đã tạo ${result.sheets} phiếu pha chế.`);
      onClose();
    } catch (exportError) {
      setError(exportError.message || 'Không thể tạo file công thức.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="formula-summary-title">
      <div className="flex h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-5 py-4 sm:px-6">
          <div className="flex gap-3">
            <span className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">lab_profile</span>
            <div>
              <h3 id="formula-summary-title" className="text-lg font-extrabold text-stone-900">Phiếu pha chế thông minh</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">Chọn sản phẩm, kiểm tra bản in và tải file khi đã sẵn sàng.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[390px_minmax(0,1fr)] lg:overflow-hidden">
          <div className="border-r border-stone-200 px-5 py-5 sm:px-6 lg:overflow-y-auto">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <div className="space-y-5">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wide text-stone-600">Kích thước phiếu</label>
                <span className="text-[11px] text-stone-400">Mặc định 70 × 100 mm</span>
              </div>
              <select value={sizePreset} onChange={event => selectPreset(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 outline-none focus:border-primary">
                {SIZE_PRESETS.map(size => <option key={size.id} value={size.id}>{size.label}</option>)}
              </select>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-stone-600">Rộng (mm)
                  <input type="number" min="30" max="300" value={width} onChange={event => { setWidth(Number(event.target.value)); setSizePreset('custom'); }} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-bold text-stone-900 outline-none focus:border-primary" />
                </label>
                <label className="text-xs font-semibold text-stone-600">Cao (mm)
                  <input type="number" min="30" max="300" value={height} onChange={event => { setHeight(Number(event.target.value)); setSizePreset('custom'); }} className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-bold text-stone-900 outline-none focus:border-primary" />
                </label>
              </div>
              <label className="mt-3 block text-xs font-semibold text-stone-600">Số sản phẩm trong một mẻ
                <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-stone-200 bg-white focus-within:border-primary">
                  <button type="button" onClick={() => setBatchQuantity(value => Math.max(1, value - 1))} className="flex size-10 items-center justify-center text-stone-500 hover:bg-stone-100" aria-label="Giảm số lượng"><span className="material-symbols-outlined text-[18px]">remove</span></button>
                  <input type="number" min="1" max="10000" value={batchQuantity} onChange={event => setBatchQuantity(Math.max(1, Number(event.target.value) || 1))} className="min-w-0 flex-1 border-x border-stone-200 py-2.5 text-center text-sm font-black text-stone-900 outline-none" />
                  <button type="button" onClick={() => setBatchQuantity(value => Math.min(10000, value + 1))} className="flex size-10 items-center justify-center text-stone-500 hover:bg-stone-100" aria-label="Tăng số lượng"><span className="material-symbols-outlined text-[18px]">add</span></button>
                </div>
              </label>
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-relaxed text-stone-700">
                <strong className="block text-sm">Một sản phẩm, một công thức sáp</strong>
                Phân loại trùng công thức tinh dầu chỉ xuất hiện một lần, kèm tất cả tên và mã SKU áp dụng.
              </div>
            </section>
          </div>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-stone-800">Sản phẩm có công thức phù hợp</h4>
                <p className="mt-0.5 text-xs text-stone-500">Chỉ hiện sản phẩm có sáp chung và tinh dầu theo phân loại.</p>
              </div>
              <button type="button" onClick={() => setSelectedIds(selectedIds.size === eligibleProducts.length ? new Set() : new Set(eligibleProducts.map(product => product._id)))} className="shrink-0 text-xs font-bold text-primary hover:underline">
                {selectedIds.size === eligibleProducts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div className="max-h-[260px] space-y-2 overflow-y-auto rounded-2xl border border-stone-200 p-2">
              {eligibleProducts.length ? eligibleProducts.map(product => (
                <label key={product._id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50">
                  <input type="checkbox" checked={selectedIds.has(product._id)} onChange={() => toggleProduct(product._id)} className="size-4 shrink-0 accent-primary" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-stone-800">{product.name}</strong>
                    <span className="block text-[11px] text-stone-500">{product.productId} · {product.base_ingredients?.length || 0} nguyên liệu gốc · {product.skus?.length || 0} SKU</span>
                  </span>
                </label>
              )) : (
                <div className="py-8 text-center text-sm text-stone-500">Chưa có sản phẩm nào có cả công thức sáp và tinh dầu theo phân loại.</div>
              )}
            </div>
          </section>
          </div>

          <section className="flex min-h-[420px] min-w-0 flex-col bg-stone-100 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-stone-900">Xem trước file</h4>
                <p className="text-xs text-stone-500">{estimatedSheets} sản phẩm · {width} × {height} mm · Mẻ {batchQuantity}</p>
              </div>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50">
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>Mở rộng
                </a>
              )}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-300 bg-stone-300 shadow-inner">
              {previewing && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm font-bold text-stone-600">Đang tạo bản xem trước…</div>}
              {previewUrl ? (
                <iframe title="Xem trước phiếu pha chế" src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} className="h-full min-h-[420px] w-full bg-white" />
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center px-8 text-center text-sm text-stone-500">Chọn ít nhất một sản phẩm và kích thước hợp lệ để xem trước.</div>
              )}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100">Hủy</button>
          <button type="button" onClick={handleExport} disabled={!selectedProducts.length} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45">
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Tải file PDF
          </button>
        </div>
      </div>
    </div>
  );
}
