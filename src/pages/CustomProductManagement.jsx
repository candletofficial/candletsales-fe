import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { productService } from '../services/productService';
import { materialService } from '../services/materialService';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const formatMoney = value => Math.round(Number(value) || 0).toLocaleString('vi-VN');
const newCode = () => `CUS-${Date.now().toString().slice(-7)}`;

const CORE_RECIPE = [
  { role: 'soy', label: 'Sáp đậu nành', quantity: 0.105, unit: 'kg' },
  { role: 'beeswax', label: 'Sáp ong', quantity: 0.025, unit: 'kg' },
  { role: 'oil', label: 'Tinh dầu (chưa xác định)', quantity: 10, unit: 'ml' },
  { role: 'ipm', label: 'IPM', quantity: 3, unit: 'ml' },
];

const matchesRole = (material, role) => {
  const text = normalize(`${material?.name} ${material?.sku} ${material?.category}`);
  if (role === 'soy') return text.includes('sap nanh') || text.includes('sap dau nanh');
  if (role === 'beeswax') return text.includes('sap ong');
  if (role === 'ipm') return /(^|\s)ipm($|\s)/.test(text) || text.includes('isopropyl myristate');
  if (role === 'oil') return material?.isConcentratedOil === true || text.includes('tinh dau');
  return false;
};

const defaultRecipe = materials => CORE_RECIPE.map(row => ({
  ...row,
  ingredient_id: row.role === 'oil' ? '' : (materials.find(material => matchesRole(material, row.role))?._id || ''),
}));

const emptyForm = materials => ({
  productId: newCode(), name: '', custom_group: '', base_price: 0, description: '',
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
      base_price: Number(product.base_price) || 0, description: product.description || '', recipe,
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
      custom_group: form.custom_group.trim(), base_price: Number(form.base_price) || 0,
      original_price: 0, description: form.description.trim(),
      base_ingredients: form.recipe.map(row => ({ ingredient_id: row.ingredient_id, quantity: Number(row.quantity) })),
    };
    try {
      setSaving(true);
      if (product?._id) await productService.updateProduct(product._id, payload);
      else await productService.createProduct(payload);
      onSaved(product ? 'Đã cập nhật sản phẩm custom.' : 'Đã tạo sản phẩm custom.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu sản phẩm custom.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-[#241815]/55 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={save} className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-outline-variant bg-gradient-to-r from-primary-container/70 to-white px-5 py-5 sm:px-7">
          <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-white"><span className="material-symbols-outlined">experiment</span></span><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-secondary">Sản phẩm nội bộ · Không hiển thị tại shop</p><h2 className="mt-1 text-xl font-black text-on-surface">{product ? 'Chỉnh sửa sản phẩm custom' : 'Tạo sản phẩm custom'}</h2></div></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-on-surface-variant hover:bg-white"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7">
          {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="block"><span className="mb-1.5 block text-xs font-bold">Nhóm đơn custom *</span><SearchableSelect value={form.custom_group} onChange={value => setForm(current => ({ ...current, custom_group: value }))} options={groups.map(group => ({ value: group, label: group }))} placeholder="Chọn hoặc tạo nhóm custom" searchPlaceholder="Tìm nhóm hoặc nhập tên nhóm mới..." ariaLabel="Nhóm đơn custom" allowCustomValue customValueLabel="Tạo nhóm mới" portalMenu className="min-h-11 rounded-xl border border-outline-variant bg-white !px-3 !py-2.5 hover:border-primary/50" /><span className="mt-1 block text-[10px] text-on-surface-variant">Các sản phẩm cùng đơn khách hàng nên dùng cùng tên nhóm.</span></div>
            <label className="block"><span className="mb-1.5 block text-xs font-bold">Tên sản phẩm *</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Nến hũ 200 ml · Mùi Lavender" className="w-full rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold">Mã sản phẩm *</span><input value={form.productId} onChange={event => setForm(current => ({ ...current, productId: event.target.value }))} className="w-full rounded-xl border border-outline-variant px-3.5 py-2.5 font-mono text-sm outline-none focus:border-primary" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold">Đơn giá bán</span><div className="relative"><input type="number" min="0" value={form.base_price} onChange={event => setForm(current => ({ ...current, base_price: event.target.value }))} className="w-full rounded-xl border border-outline-variant px-3.5 py-2.5 pr-10 text-sm font-bold outline-none focus:border-primary" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">đ</span></div></label>
            <label className="block md:col-span-2"><span className="mb-1.5 block text-xs font-bold">Ghi chú</span><textarea rows="2" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Quy cách cốc, tem, màu sắc hoặc ghi chú riêng của khách..." className="w-full rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm outline-none focus:border-primary" /></label>
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-outline-variant">
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

export default function CustomProductManagement() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [productResponse, materialResponse] = await Promise.all([productService.getProducts({ type: 'custom' }), materialService.getMaterials()]);
      setProducts(productResponse.data.data || []);
      setMaterials(materialResponse.data.data || []);
    } catch (error) { setToast({ type: 'error', text: error.response?.data?.message || 'Không thể tải dữ liệu sản phẩm custom.' }); }
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
    try { setDeleting(product._id); await productService.deleteProduct(product._id); showToast('Đã xóa sản phẩm custom.'); await load(); }
    catch (error) { showToast(error.response?.data?.message || 'Không thể xóa sản phẩm.', 'error'); }
    finally { setDeleting(null); }
  };

  return <Layout>
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-8">
      {toast && <div className={`fixed bottom-6 right-6 z-[90] rounded-xl px-5 py-3 text-xs font-bold shadow-xl ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.text}</div>}
      {editing !== undefined && <ProductForm product={editing || null} products={products} materials={materials} onClose={() => setEditing(undefined)} onSaved={async message => { setEditing(undefined); showToast(message); await load(); }} />}

      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary px-6 py-7 text-white shadow-lg sm:px-8 lg:px-10">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[45px] border-white/[.05]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/60">Sản phẩm nội bộ</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Sản phẩm Custom</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-white/70">Quản lý công thức theo từng nhóm đơn custom. Các sản phẩm này chỉ dùng khi tạo đơn trong admin và không xuất hiện tại cửa hàng.</p><div className="mt-5 flex gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold">{groups.length} nhóm</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold">{products.length} sản phẩm</span></div></div><button type="button" onClick={() => setEditing(null)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-primary shadow-sm"><span className="material-symbols-outlined text-[19px]">add</span>Tạo sản phẩm custom</button></div>
      </header>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-outline-variant bg-white p-3 shadow-sm sm:flex-row">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3"><span className="material-symbols-outlined text-[19px] text-on-surface-variant">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên, mã hoặc nhóm custom..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
        <select value={selectedGroup} onChange={event => setSelectedGroup(event.target.value)} className="h-11 rounded-xl border border-outline-variant bg-white px-4 text-xs font-bold text-on-surface outline-none focus:border-primary"><option value="all">Tất cả nhóm ({products.length})</option>{groups.map(group => <option key={group} value={group}>{group} ({products.filter(item => item.custom_group === group).length})</option>)}</select>
      </div>

      {loading ? <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-outline-variant bg-white"><span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span></div> : Object.keys(grouped).length === 0 ? <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-dashed border-outline-variant bg-white text-center"><div><span className="material-symbols-outlined text-4xl text-on-surface-variant/40">inventory_2</span><p className="mt-2 text-sm font-black text-on-surface">Chưa có sản phẩm phù hợp</p><p className="mt-1 text-xs text-on-surface-variant">Tạo sản phẩm custom đầu tiên hoặc thay đổi bộ lọc.</p></div></div> : <div className="mt-5 space-y-5">
        {Object.entries(grouped).map(([group, entries]) => <section key={group} className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm"><header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-container text-primary"><span className="material-symbols-outlined text-[19px]">folder_special</span></span><div><h2 className="text-sm font-black text-on-surface">{group}</h2><p className="mt-0.5 text-[10px] text-on-surface-variant">{entries.length} sản phẩm · Chọn nhóm này khi tạo đơn hàng</p></div></div></header><div className="divide-y divide-outline-variant/60">{entries.map(product => <article key={product._id} className="grid gap-4 px-5 py-4 hover:bg-primary-container/10 lg:grid-cols-[minmax(230px,1.2fr)_minmax(260px,1.4fr)_110px_100px]"><div><div className="flex items-center gap-2"><span className="rounded-md bg-primary-container px-2 py-1 font-mono text-[9px] font-black text-primary">{product.productId}</span><span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Không bán tại shop</span></div><h3 className="mt-2 text-sm font-black text-on-surface">{product.name}</h3>{product.description && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-on-surface-variant">{product.description}</p>}</div><div className="flex flex-wrap content-start gap-1.5">{(product.base_ingredients || []).map(item => <span key={item._id || item.ingredient_id?._id} className="rounded-lg border border-outline-variant bg-white px-2.5 py-1.5 text-[10px] text-on-surface-variant"><b className="text-on-surface">{item.ingredient_id?.name || 'Nguyên liệu'}</b> · {item.quantity}{item.ingredient_id?.unit || ''}</span>)}</div><div><p className="text-[9px] font-bold uppercase text-on-surface-variant">Đơn giá</p><p className="mt-1 text-sm font-black text-primary">{formatMoney(product.base_price)}đ</p><p className="mt-1 text-[9px] text-on-surface-variant">Vốn {formatMoney(product.base_cost)}đ</p></div><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => setEditing(product)} className="grid h-9 w-9 place-items-center rounded-xl text-primary hover:bg-primary-container"><span className="material-symbols-outlined text-[18px]">edit</span></button><button type="button" disabled={deleting === product._id} onClick={() => { if (window.confirm(`Xóa sản phẩm “${product.name}”?`)) remove(product); }} className="grid h-9 w-9 place-items-center rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">delete</span></button></div></article>)}</div></section>)}
      </div>}
    </div>
  </Layout>;
}
