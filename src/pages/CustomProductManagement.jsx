import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { productService } from '../services/productService';
import { materialService } from '../services/materialService';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const formatMoney = value => Math.round(Number(value) || 0).toLocaleString('vi-VN');
const formatQuantity = value => (Number(value) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
const newCode = () => `CUS-${Date.now().toString().slice(-7)}`;

const CORE_RECIPE = [
  { role: 'soy', label: 'Sáp đậu nành', quantity: 0.105, unit: 'kg' },
  { role: 'beeswax', label: 'Sáp ong', quantity: 0.025, unit: 'kg' },
  { role: 'ipm', label: 'IPM', quantity: 3, unit: 'ml' },
  { role: 'jar', label: 'Cốc thủy tinh', quantity: 1, unit: 'cốc' },
  { role: 'cotton_wick', label: 'Bấc cotton', quantity: 1, unit: 'cái' },
  { role: 'wick_sticker', label: 'Dán bấc', quantity: 1, unit: 'cái' },
  { role: 'oil', label: 'Tinh dầu (chưa xác định)', quantity: 10, unit: 'ml' },
];

const matchesRole = (material, role) => {
  const text = normalize(`${material?.name} ${material?.sku} ${material?.category}`);
  if (role === 'soy') return text.includes('sap nanh') || text.includes('sap dau nanh');
  if (role === 'beeswax') return text.includes('sap ong');
  if (role === 'ipm') return /(^|\s)ipm($|\s)/.test(text) || text.includes('isopropyl myristate');
  if (role === 'oil') return material?.isConcentratedOil === true || text.includes('tinh dau');
  if (role === 'jar') return text.includes('coc thuy tinh') || text.includes('ly thuy tinh') || text.includes('hu thuy tinh');
  if (role === 'cotton_wick') return !text.includes('dan bac') && (text.includes('bac cotton') || text.includes('tim nen cotton'));
  if (role === 'wick_sticker') return text.includes('dan bac') || text.includes('keo dan tim') || text.includes('mieng dan bac');
  return false;
};

const defaultRecipe = materials => CORE_RECIPE.map(row => ({
  ...row,
  ingredient_id: row.role === 'oil' ? '' : (materials.find(material => matchesRole(material, row.role))?._id || ''),
}));

const emptyForm = materials => ({
  productId: newCode(), name: '', custom_group: '', custom_quantity: 1, base_price: 0, description: '',
  recipe: defaultRecipe(materials),
});

function ProductForm({ product, products, materials, onClose, onSaved }) {
  const groups = [...new Set(products.map(item => item.custom_group).filter(Boolean))];
  const [form, setForm] = useState(() => {
    if (!product) return emptyForm(materials);
    const ingredients = (product.base_ingredients || []).map(item => ({
      ingredient_id: item.ingredient_id?._id || item.ingredient_id || '',
      quantity: Number(item.quantity) || 0,
    }));
    const recipe = ingredients.map(entry => {
      const material = materials.find(item => String(item._id) === String(entry.ingredient_id));
      const core = CORE_RECIPE.find(item => matchesRole(material, item.role));
      return core
        ? { ...core, ingredient_id: entry.ingredient_id, quantity: entry.quantity }
        : { role: 'extra', label: 'Nguyên liệu bổ sung', unit: material?.unit || '', ...entry };
    });
    return {
      productId: product.productId || newCode(), name: product.name || '', custom_group: product.custom_group || '',
      custom_quantity: Math.max(1, Number(product.custom_quantity) || 1), base_price: Number(product.base_price) || 0, description: product.description || '', recipe,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRecipe = (index, patch) => setForm(current => ({
    ...current,
    recipe: current.recipe.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row),
  }));
  const estimatedCost = form.recipe.reduce((sum, row) => {
    const material = materials.find(item => item._id === row.ingredient_id);
    return sum + (Number(material?.price) || 0) * (Number(row.quantity) || 0);
  }, 0);

  const save = async event => {
    event.preventDefault();
    setError('');
    if (!form.custom_group.trim()) return setError('Vui lòng nhập hoặc chọn nhóm đơn custom.');
    if (!form.name.trim()) return setError('Vui lòng nhập tên sản phẩm.');
    if (form.recipe.length === 0) return setError('Công thức phải có ít nhất một nguyên vật liệu.');
    const missing = form.recipe.find(row => !row.ingredient_id);
    if (missing) return setError(`Vui lòng chọn nguyên vật liệu cho dòng “${missing.label}”.`);
    if (form.recipe.some(row => Number(row.quantity) <= 0)) return setError('Định lượng nguyên vật liệu phải lớn hơn 0.');
    const ids = form.recipe.map(row => row.ingredient_id);
    if (new Set(ids).size !== ids.length) return setError('Một nguyên vật liệu không thể xuất hiện hai lần trong công thức.');
    const payload = {
      product_type: 'custom', productId: form.productId.trim(), name: form.name.trim(),
      custom_group: form.custom_group.trim(), custom_quantity: Math.max(1, Math.trunc(Number(form.custom_quantity) || 1)), base_price: Number(form.base_price) || 0,
      original_price: 0, description: form.description.trim(),
      base_ingredients: form.recipe.map(row => ({ ingredient_id: row.ingredient_id, quantity: Number(row.quantity) })),
    };
    try {
      setSaving(true);
      if (product?._id) await productService.updateProduct(product._id, payload);
      else await productService.createProduct(payload);
      onSaved(product ? 'Đã cập nhật sản phẩm trong đơn custom.' : 'Đã thêm sản phẩm vào đơn custom.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu sản phẩm trong đơn custom.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-[#241815]/55 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={save} className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-outline-variant bg-gradient-to-r from-primary-container/70 to-white px-5 py-5 sm:px-7">
          <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-white"><span className="material-symbols-outlined">experiment</span></span><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-secondary">Đơn custom · Không hiển thị tại shop</p><h2 className="mt-1 text-xl font-black text-on-surface">{product ? 'Chỉnh sửa sản phẩm trong đơn custom' : 'Thêm sản phẩm vào đơn custom'}</h2></div></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-on-surface-variant hover:bg-white"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7">
          {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}
          <section className="grid gap-x-3 gap-y-3 md:grid-cols-12">
            <div className="md:col-span-6"><span className="mb-1 block text-[11px] font-bold">Nhóm đơn custom *</span><SearchableSelect value={form.custom_group} onChange={value => setForm(current => ({ ...current, custom_group: value }))} options={groups.map(group => ({ value: group, label: group }))} placeholder="Chọn hoặc tạo nhóm custom" searchPlaceholder="Tìm nhóm hoặc nhập tên nhóm mới..." ariaLabel="Nhóm đơn custom" allowCustomValue customValueLabel="Tạo nhóm mới" portalMenu className="min-h-10 rounded-xl border border-outline-variant bg-white !px-3 !py-2 hover:border-primary/50" /></div>
            <label className="block md:col-span-6"><span className="mb-1 block text-[11px] font-bold">Tên sản phẩm *</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Nến hũ 200 ml · Mùi Lavender" className="h-10 w-full rounded-xl border border-outline-variant px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label>
            <label className="block md:col-span-3"><span className="mb-1 block text-[11px] font-bold">Mã sản phẩm *</span><input value={form.productId} onChange={event => setForm(current => ({ ...current, productId: event.target.value }))} className="h-10 w-full rounded-xl border border-outline-variant px-3 font-mono text-xs outline-none focus:border-primary" /></label>
            <label className="block md:col-span-3"><span className="mb-1 block text-[11px] font-bold">Đơn giá</span><div className="relative"><input type="number" min="0" value={form.base_price} onChange={event => setForm(current => ({ ...current, base_price: event.target.value }))} className="h-10 w-full rounded-xl border border-outline-variant px-3 pr-8 text-sm font-bold outline-none focus:border-primary" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">đ</span></div></label>
            <label className="block md:col-span-2"><span className="mb-1 block text-[11px] font-bold">Số lượng *</span><div className="relative"><input type="number" min="1" step="1" value={form.custom_quantity} onChange={event => setForm(current => ({ ...current, custom_quantity: event.target.value }))} className="h-10 w-full rounded-xl border border-outline-variant px-3 pr-9 text-sm font-bold outline-none focus:border-primary" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-on-surface-variant">SP</span></div></label>
            <label className="block md:col-span-4"><span className="mb-1 block text-[11px] font-bold">Ghi chú</span><input value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Cốc, tem, màu sắc..." className="h-10 w-full rounded-xl border border-outline-variant px-3 text-sm outline-none focus:border-primary" /></label>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-outline-variant">
            <div className="flex flex-col gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h3 className="text-sm font-black text-on-surface">Công thức cho 1 sản phẩm</h3><p className="mt-1 text-[10px] text-on-surface-variant">Công thức được tạo sẵn theo định lượng gợi ý; có thể thay đổi hoặc xoá thành phần không sử dụng.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-primary">Giá vốn ước tính: {formatMoney(estimatedCost)}đ</span></div>
            <div className="divide-y divide-outline-variant/60">
              {form.recipe.map((row, index) => {
                const selected = materials.find(item => item._id === row.ingredient_id);
                const options = row.role === 'oil' ? materials.filter(item => matchesRole(item, 'oil')) : materials;
                return <div key={`${row.role}-${index}`} className="grid gap-3 bg-white p-4 sm:grid-cols-[150px_minmax(0,1fr)_120px_36px] sm:items-center sm:px-5">
                  <div><p className="text-xs font-black text-on-surface">{row.label}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{row.role === 'oil' && !row.ingredient_id ? 'Cần chọn mùi' : row.role === 'extra' ? 'Bổ sung' : 'Gợi ý mặc định'}</p></div>
                  <SearchableSelect
                    value={row.ingredient_id}
                    onChange={value => updateRecipe(index, { ingredient_id: value })}
                    options={options.map(material => ({ value: material._id, label: `${material.name} · ${material.sku} · ${material.unit}` }))}
                    placeholder={row.role === 'oil' ? 'Chọn tinh dầu' : 'Chọn nguyên vật liệu'}
                    searchPlaceholder={row.role === 'oil' ? 'Tìm theo tên mùi hoặc mã...' : 'Tìm theo tên hoặc mã nguyên vật liệu...'}
                    ariaLabel={`Nguyên vật liệu ${row.label}`}
                    portalMenu
                    className="min-h-10 rounded-xl border border-outline-variant bg-white !px-3 !py-2 hover:border-primary/50"
                  />
                  <label className="flex items-center rounded-xl border border-outline-variant bg-surface-container-lowest"><input type="number" min="0.001" step="0.001" value={row.quantity} onChange={event => updateRecipe(index, { quantity: event.target.value })} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-right text-xs font-black outline-none" /><span className="border-l border-outline-variant px-2 text-[10px] font-bold text-on-surface-variant">{selected?.unit || row.unit || 'đv'}</span></label>
                  <button type="button" aria-label={`Xoá ${row.label}`} onClick={() => setForm(current => ({ ...current, recipe: current.recipe.filter((_, rowIndex) => rowIndex !== index) }))} className="grid h-9 w-9 place-items-center rounded-lg text-red-500 transition-colors hover:bg-red-50"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </div>;
              })}
            </div>
            <button type="button" onClick={() => setForm(current => ({ ...current, recipe: [...current.recipe, { role: 'extra', label: 'Nguyên liệu bổ sung', ingredient_id: '', quantity: 1, unit: '' }] }))} className="m-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-primary/40 px-3 text-[10px] font-bold text-primary hover:bg-primary-container"><span className="material-symbols-outlined text-[17px]">add</span>Thêm nguyên liệu</button>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:px-7"><button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-xs font-bold text-on-surface-variant hover:bg-white">Hủy</button><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-black text-white shadow-sm disabled:opacity-50"><span className={`material-symbols-outlined text-[17px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</button></footer>
      </form>
    </div>
  );
}

function CustomOrderConfigModal({ group, products, onClose, onSaved }) {
  const settings = products[0] || {};
  const [form, setForm] = useState({
    discount_type: settings.custom_discount_type || 'none',
    discount_value: Number(settings.custom_discount_value) || 0,
    other_cost: Number(settings.custom_other_cost) || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const grossRevenue = products.reduce((sum, product) => sum + (Number(product.base_price) || 0) * Math.max(1, Number(product.custom_quantity) || 1), 0);
  const materialTotals = [...products.reduce((totals, product) => {
    const productQuantity = Math.max(1, Number(product.custom_quantity) || 1);
    const ingredients = product.resolved_base_ingredients?.length ? product.resolved_base_ingredients : (product.base_ingredients || []);
    ingredients.forEach(item => {
      const material = item.ingredient_id;
      if (!material?._id) return;
      const key = String(material._id);
      const usedQuantity = (Number(item.quantity) || 0) * productQuantity;
      const current = totals.get(key) || { id: key, name: material.name || 'Nguyên vật liệu', sku: material.sku || '', unit: material.unit || '', quantity: 0, cost: 0 };
      current.quantity += usedQuantity;
      current.cost += usedQuantity * (Number(material.price) || 0);
      totals.set(key, current);
    });
    return totals;
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const baseCost = materialTotals.reduce((sum, material) => sum + material.cost, 0);
  const discountAmount = form.discount_type === 'percent'
    ? grossRevenue * Math.min(100, Math.max(0, Number(form.discount_value) || 0)) / 100
    : form.discount_type === 'fixed' ? Math.min(grossRevenue, Math.max(0, Number(form.discount_value) || 0)) : 0;
  const netRevenue = Math.max(0, grossRevenue - discountAmount);
  const otherCost = Math.max(0, Number(form.other_cost) || 0);
  const totalCost = baseCost + otherCost;
  const profit = netRevenue - totalCost;
  const margin = netRevenue > 0 ? profit / netRevenue * 100 : 0;

  const save = async event => {
    event.preventDefault();
    setError('');
    if (form.discount_type === 'percent' && Number(form.discount_value) > 100) return setError('Mức giảm không được vượt quá 100%.');
    try {
      setSaving(true);
      const response = await productService.updateCustomGroupSettings({ group, ...form });
      onSaved(response.data.data);
    } catch (saveError) { setError(saveError.response?.data?.message || 'Không thể lưu cấu hình đơn custom.'); }
    finally { setSaving(false); }
  };

  const metrics = [
    ['Giá bán', grossRevenue, ''], ['Giá vốn', baseCost, ''], ['Chi phí', totalCost, ''],
    ['Sau giảm', netRevenue, 'text-primary'], ['Lợi nhuận', profit, profit >= 0 ? 'text-emerald-700' : 'text-red-600'],
  ];

  return <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5">
    <button type="button" aria-label="Đóng" className="absolute inset-0 bg-[#241815]/55 backdrop-blur-sm" onClick={onClose} />
    <form onSubmit={save} className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-4 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-secondary">Cấu hình đơn custom</p><div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-lg font-black text-on-surface">{group}</h2><p className="text-[10px] text-on-surface-variant">{products.length} mẫu · {products.reduce((sum, product) => sum + Math.max(1, Number(product.custom_quantity) || 1), 0)} sản phẩm</p></div></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined text-[20px]">close</span></button></header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">{error}</div>}
        <div className="grid overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map(([label, value, tone]) => <div key={label} className="border-b border-outline-variant/60 px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[8px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p><p className={`mt-0.5 text-sm font-black ${tone || 'text-on-surface'}`}>{formatMoney(value)}đ</p></div>)}
          <div className="px-3 py-2.5"><p className="text-[8px] font-bold uppercase tracking-wide text-on-surface-variant">Biên lợi nhuận</p><p className={`mt-0.5 text-sm font-black ${margin >= 0 ? 'text-primary' : 'text-red-600'}`}>{margin.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</p></div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,.65fr)]">
          <section className="overflow-hidden rounded-xl border border-outline-variant"><header className="flex items-center justify-between bg-surface-container-low px-3.5 py-2.5"><div><h3 className="text-[11px] font-black text-on-surface">Nguyên vật liệu</h3><p className="text-[8px] text-on-surface-variant">Tổng theo số lượng đặt</p></div><b className="text-[11px] text-on-surface">{materialTotals.length} loại · {formatMoney(baseCost)}đ</b></header><div className="max-h-[360px] divide-y divide-outline-variant/60 overflow-y-auto">{materialTotals.length > 0 ? materialTotals.map(material => <div key={material.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3.5 py-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-on-surface">{material.name}</p><p className="truncate text-[8px] text-on-surface-variant">{material.sku || 'Không có mã'}</p></div><span className="rounded-md bg-primary-container px-2 py-1 text-[10px] font-black text-primary">{formatQuantity(material.quantity)} {material.unit}</span><b className="min-w-16 text-right text-[10px] text-on-surface">{formatMoney(material.cost)}đ</b></div>) : <p className="px-4 py-8 text-center text-xs text-on-surface-variant">Chưa có nguyên vật liệu.</p>}</div></section>

          <section className="rounded-xl border border-outline-variant p-4"><h3 className="text-xs font-black text-on-surface">Điều chỉnh đơn hàng</h3><div className="mt-3 space-y-3"><label className="block"><span className="mb-1 block text-[10px] font-bold">Hình thức giảm giá</span><select value={form.discount_type} onChange={event => setForm(current => ({ ...current, discount_type: event.target.value, discount_value: 0 }))} className="h-9 w-full rounded-lg border border-outline-variant bg-white px-3 text-xs outline-none focus:border-primary"><option value="none">Không giảm giá</option><option value="percent">Theo phần trăm (%)</option><option value="fixed">Số tiền cố định</option></select></label><label className="block"><span className="mb-1 block text-[10px] font-bold">Mức giảm</span><div className="relative"><input type="number" min="0" max={form.discount_type === 'percent' ? 100 : undefined} disabled={form.discount_type === 'none'} value={form.discount_value} onChange={event => setForm(current => ({ ...current, discount_value: event.target.value }))} className="h-9 w-full rounded-lg border border-outline-variant px-3 pr-8 text-xs font-bold outline-none focus:border-primary disabled:bg-surface-container-low disabled:text-on-surface-variant" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant">{form.discount_type === 'percent' ? '%' : 'đ'}</span></div></label><label className="block"><span className="mb-1 block text-[10px] font-bold">Chi phí khác</span><div className="relative"><input type="number" min="0" value={form.other_cost} onChange={event => setForm(current => ({ ...current, other_cost: event.target.value }))} className="h-9 w-full rounded-lg border border-outline-variant px-3 pr-8 text-xs font-bold outline-none focus:border-primary" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant">đ</span></div></label></div><div className="mt-3 space-y-1.5 rounded-lg bg-surface-container-low p-3 text-[10px]"><p className="flex justify-between gap-3"><span className="text-on-surface-variant">Giảm giá</span><b>{formatMoney(discountAmount)}đ</b></p><p className="flex justify-between gap-3"><span className="text-on-surface-variant">Doanh thu sau giảm</span><b className="text-primary">{formatMoney(netRevenue)}đ</b></p></div></section>
        </div>
      </div>

      <footer className="flex shrink-0 justify-end gap-2 border-t border-outline-variant bg-white px-5 py-3 sm:px-6"><button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-bold text-on-surface-variant hover:bg-surface-container">Đóng</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-black text-white disabled:opacity-50"><span className={`material-symbols-outlined text-[16px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button></footer>
    </form>
  </div>;
}

export default function CustomProductManagement() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [duplicating, setDuplicating] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [savingQuantity, setSavingQuantity] = useState(null);
  const [configuringGroup, setConfiguringGroup] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [productResponse, materialResponse] = await Promise.all([productService.getProducts({ type: 'custom' }), materialService.getMaterials()]);
      setProducts(productResponse.data.data || []);
      setMaterials(materialResponse.data.data || []);
    } catch (error) { setToast({ type: 'error', text: error.response?.data?.message || 'Không thể tải dữ liệu đơn custom.' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => [...new Set(products.map(item => item.custom_group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [products]);
  const filtered = useMemo(() => products.filter(product => {
    if (selectedGroup !== 'all' && product.custom_group !== selectedGroup) return false;
    const term = normalize(search);
    return !term || normalize(`${product.name} ${product.productId} ${product.custom_group}`).includes(term);
  }), [products, search, selectedGroup]);
  const grouped = useMemo(() => filtered.reduce((result, product) => {
    const group = product.custom_group || 'Chưa phân nhóm';
    if (!result[group]) result[group] = [];
    result[group].push(product);
    return result;
  }, {}), [filtered]);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };
  const remove = async product => {
    try { setDeleting(product._id); await productService.deleteProduct(product._id); showToast('Đã xóa sản phẩm khỏi đơn custom.'); await load(); }
    catch (error) { showToast(error.response?.data?.message || 'Không thể xóa sản phẩm.', 'error'); }
    finally { setDeleting(null); }
  };
  const duplicate = async product => {
    try {
      setDuplicating(product._id);
      await productService.createProduct({
        product_type: 'custom',
        productId: newCode(),
        name: `${product.name} - Bản sao`,
        custom_group: product.custom_group,
        custom_quantity: Math.max(1, Number(product.custom_quantity) || 1),
        base_price: Number(product.base_price) || 0,
        original_price: Number(product.original_price) || 0,
        description: product.description || '',
        base_ingredients: (product.base_ingredients || []).map(item => ({
          ingredient_id: item.ingredient_id?._id || item.ingredient_id,
          quantity: Number(item.quantity) || 0,
        })),
      });
      showToast(`Đã nhân bản “${product.name}”.`);
      await load();
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể nhân bản sản phẩm.', 'error');
    } finally { setDuplicating(null); }
  };
  const saveQuantity = async (product, rawQuantity) => {
    const quantity = Math.max(1, Math.trunc(Number(rawQuantity) || 1));
    setQuantityDrafts(current => ({ ...current, [product._id]: quantity }));
    if (quantity === Math.max(1, Number(product.custom_quantity) || 1)) return;
    try {
      setSavingQuantity(product._id);
      await productService.updateProduct(product._id, {
        product_type: 'custom', productId: product.productId, name: product.name,
        custom_group: product.custom_group, custom_quantity: quantity,
        base_price: Number(product.base_price) || 0, original_price: Number(product.original_price) || 0,
        description: product.description || '', image: product.image || null, images: product.images || [],
        base_ingredients: (product.base_ingredients || []).map(item => ({ ingredient_id: item.ingredient_id?._id || item.ingredient_id, quantity: Number(item.quantity) || 0 })),
      });
      setProducts(current => current.map(item => item._id === product._id ? { ...item, custom_quantity: quantity } : item));
      setQuantityDrafts(current => { const next = { ...current }; delete next[product._id]; return next; });
    } catch (error) { showToast(error.response?.data?.message || 'Không thể cập nhật số lượng.', 'error'); }
    finally { setSavingQuantity(null); }
  };

  return <Layout>
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-8">
      {toast && <div className={`fixed bottom-6 right-6 z-[90] rounded-xl px-5 py-3 text-xs font-bold shadow-xl ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.text}</div>}
      {editing !== undefined && <ProductForm product={editing || null} products={products} materials={materials} onClose={() => setEditing(undefined)} onSaved={async message => { setEditing(undefined); showToast(message); await load(); }} />}
      {configuringGroup && <CustomOrderConfigModal group={configuringGroup} products={products.filter(product => product.custom_group === configuringGroup)} onClose={() => setConfiguringGroup('')} onSaved={settings => { setProducts(current => current.map(product => product.custom_group === configuringGroup ? { ...product, custom_discount_type: settings.discount_type, custom_discount_value: settings.discount_value, custom_other_cost: settings.other_cost } : product)); setConfiguringGroup(''); showToast('Đã lưu cấu hình đơn custom.'); }} />}

      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary px-6 py-7 text-white shadow-lg sm:px-8 lg:px-10">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[45px] border-white/[.05]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/60">Quản lý nội bộ</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Đơn Custom</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-white/70">Mẫu dự toán nguyên liệu, giá vốn và lợi nhuận. Công thức chỉ tác động tồn kho khi nhóm được thêm vào đơn hàng; các thao tác đình chỉ, thay thế hoặc xoá nguyên liệu không tự thay đổi mẫu.</p><div className="mt-5 flex gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold">{groups.length} đơn</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold">{products.length} sản phẩm</span></div></div><button type="button" onClick={() => setEditing(null)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-primary shadow-sm"><span className="material-symbols-outlined text-[19px]">add</span>Thêm sản phẩm vào đơn custom</button></div>
      </header>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-outline-variant bg-white p-3 shadow-sm sm:flex-row">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3"><span className="material-symbols-outlined text-[19px] text-on-surface-variant">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên, mã hoặc nhóm custom..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
        <select value={selectedGroup} onChange={event => setSelectedGroup(event.target.value)} className="h-11 rounded-xl border border-outline-variant bg-white px-4 text-xs font-bold text-on-surface outline-none focus:border-primary"><option value="all">Tất cả nhóm ({products.length})</option>{groups.map(group => <option key={group} value={group}>{group} ({products.filter(item => item.custom_group === group).length})</option>)}</select>
      </div>

      {loading ? <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-outline-variant bg-white"><span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span></div> : Object.keys(grouped).length === 0 ? <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-dashed border-outline-variant bg-white text-center"><div><span className="material-symbols-outlined text-4xl text-on-surface-variant/40">inventory_2</span><p className="mt-2 text-sm font-black text-on-surface">Chưa có đơn custom phù hợp</p><p className="mt-1 text-xs text-on-surface-variant">Tạo đơn custom đầu tiên hoặc thay đổi bộ lọc.</p></div></div> : <div className="mt-5 space-y-5">
        {Object.entries(grouped).map(([group, entries]) => {
          const expanded = expandedGroup === group;
          const groupQuantity = entries.reduce((sum, product) => sum + Math.max(1, Number(product.custom_quantity) || 1), 0);
          const groupValue = entries.reduce((sum, product) => sum + (Number(product.base_price) || 0) * Math.max(1, Number(product.custom_quantity) || 1), 0);
          return <section key={group} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${expanded ? 'border-primary/30' : 'border-outline-variant'}`}>
            <div role="button" tabIndex="0" onClick={() => setConfiguringGroup(group)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setConfiguringGroup(group); }} className="flex w-full cursor-pointer flex-col gap-3 px-5 py-4 text-left hover:bg-primary-container/10 sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-primary"><span className="material-symbols-outlined text-[22px]">folder_special</span></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-black text-on-surface">{group}</span><span className="mt-1 block text-[10px] text-on-surface-variant">Nhóm đơn custom · Không hiển thị tại shop</span></span>
              <span className="flex w-full items-center justify-between gap-5 sm:w-auto sm:justify-end">
                <span><span className="block text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">Mẫu / Số lượng</span><span className="mt-0.5 block text-sm font-black text-on-surface">{entries.length} / {groupQuantity}</span></span>
                <span><span className="block text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">Tổng đơn giá</span><span className="mt-0.5 block text-sm font-black text-primary">{formatMoney(groupValue)}đ</span></span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary"><span className="material-symbols-outlined text-[17px]">tune</span>Cấu hình</span>
                <button type="button" onClick={event => { event.stopPropagation(); setExpandedGroup(current => current === group ? '' : group); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-primary hover:bg-primary-container">{expanded ? 'Thu gọn' : 'Sản phẩm'}<span className={`material-symbols-outlined text-[18px] transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span></button>
              </span>
            </div>
            {expanded && <div className="divide-y divide-outline-variant/60 border-t border-outline-variant/60">{entries.map(product => {
              const quantity = quantityDrafts[product._id] ?? Math.max(1, Number(product.custom_quantity) || 1);
              return <article key={product._id} className="grid gap-4 px-5 py-3 hover:bg-primary-container/10 sm:grid-cols-2 sm:items-center lg:grid-cols-4 lg:gap-8"><div><div className="flex items-center gap-2"><span className="font-mono text-[9px] font-black text-primary">{product.productId}</span></div><h3 className="mt-1 text-[13px] font-black text-on-surface">{product.name}</h3>{product.description && <p className="mt-0.5 line-clamp-1 text-[9px] text-on-surface-variant">{product.description}</p>}</div><div className="lg:max-w-36"><p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-on-surface-variant">Số lượng</p><div className="flex h-8 items-center overflow-hidden rounded-lg border border-outline-variant bg-white focus-within:border-primary"><button type="button" disabled={savingQuantity === product._id || quantity <= 1} onClick={() => saveQuantity(product, quantity - 1)} className="grid h-full w-7 place-items-center text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"><span className="material-symbols-outlined text-[15px]">remove</span></button><input type="number" min="1" step="1" value={quantity} onChange={event => setQuantityDrafts(current => ({ ...current, [product._id]: event.target.value }))} onBlur={event => saveQuantity(product, event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="min-w-0 flex-1 bg-transparent text-center text-[11px] font-black outline-none" /><button type="button" disabled={savingQuantity === product._id} onClick={() => saveQuantity(product, Number(quantity) + 1)} className="grid h-full w-7 place-items-center text-primary hover:bg-primary-container disabled:opacity-30"><span className="material-symbols-outlined text-[15px]">add</span></button></div></div><div><p className="text-[8px] font-bold uppercase tracking-wide text-on-surface-variant">Giá / Thành tiền</p><p className="mt-0.5 text-[13px] font-black text-primary">{formatMoney(product.base_price)}đ</p><p className="text-[9px] text-on-surface-variant">{formatMoney((Number(product.base_price) || 0) * Math.max(1, Number(quantity) || 1))}đ · Vốn {formatMoney(product.base_cost)}đ</p></div><div className="flex items-center justify-end gap-0.5"><button type="button" title="Nhân bản" aria-label={`Nhân bản ${product.name}`} disabled={duplicating === product._id} onClick={() => duplicate(product)} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-primary-container hover:text-primary disabled:opacity-40"><span className={`material-symbols-outlined text-[17px] ${duplicating === product._id ? 'animate-spin' : ''}`}>{duplicating === product._id ? 'progress_activity' : 'content_copy'}</span></button><button type="button" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${product.name}`} onClick={() => setEditing(product)} className="grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-container"><span className="material-symbols-outlined text-[17px]">edit</span></button><button type="button" title="Xoá" aria-label={`Xoá ${product.name}`} disabled={deleting === product._id} onClick={() => { if (window.confirm(`Xóa sản phẩm “${product.name}”?`)) remove(product); }} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"><span className="material-symbols-outlined text-[17px]">delete</span></button></div></article>;
            })}</div>}
          </section>;
        })}
      </div>}
    </div>
  </Layout>;
}
