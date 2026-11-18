import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { materialService } from '../services/materialService';
import { productService } from '../services/productService';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/imageUtils';
import { createEssentialOilLabelsPdf } from '../utils/essentialOilLabelsPdf';
import { getMaterialAppearance, OIL_COLOR_OPTIONS } from '../utils/materialAppearance';

const EMPTY_FORM = {
  name: '',
  sku: '',
  supplier: '',
  unit: 'Gam',
  price: '',
  stock: '',
  minStock: '100',
  isConcentratedOil: false,
  oilColor: '#7c3aed',
};

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase();

const isColorMaterial = (material) => {
  const name = normalizeText(material?.name);
  const category = normalizeText(material?.category);
  const nameLooksLikeColor = ['mau ', 'mau sap', 'color', 'colour', 'pigment', 'dye', 'nhuom']
    .some((keyword) => name.includes(keyword));
  const dedicatedColorCategory = ['mau', 'mau nen', 'mau sap', 'color', 'pigment'].includes(category.trim());
  return nameLooksLikeColor || dedicatedColorCategory;
};

const isEssentialOil = (material) => {
  if (isColorMaterial(material)) return false;
  const text = normalizeText(`${material?.category || ''} ${material?.name || ''}`);
  return text.includes('tinh dau') || text.includes('essential oil');
};

const OIL_CONFIG = {
  category: 'Tinh dầu',
  title: 'Quản lý tinh dầu',
  singular: 'tinh dầu',
  plural: 'tinh dầu',
  eyebrow: 'Kho hương liệu',
  icon: 'water_drop',
  description: 'Theo dõi tồn kho, giá trị và các công thức đang sử dụng từng loại tinh dầu.',
  placeholder: 'Ví dụ: Tinh dầu Forest Calm',
  identificationHint: 'Tinh dầu được nhận diện theo tên hoặc phân loại “Tinh dầu”; nguyên liệu màu được giữ tại trang Nguyên vật liệu.',
  matches: isEssentialOil,
};

const getActualStock = (material) => Number(material?.actualStock ?? material?.stock ?? 0);

const getStatus = (material) => {
  const stock = getActualStock(material);
  if (stock <= 0) return 'out_of_stock';
  if (stock <= Number(material?.minStock || 0)) return 'low_stock';
  return 'in_stock';
};

const STATUS = {
  in_stock: { label: 'Đủ hàng', icon: 'check_circle', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
  low_stock: { label: 'Sắp hết', icon: 'warning', className: 'bg-amber-50 text-amber-700 ring-amber-600/15' },
  out_of_stock: { label: 'Hết hàng', icon: 'error', className: 'bg-red-50 text-red-700 ring-red-600/15' },
};

const ingredientId = (entry) => String(
  typeof entry?.ingredient_id === 'object'
    ? entry.ingredient_id?._id
    : entry?.ingredient_id || ''
);

const quantityText = (value) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });

const ingredientQuantity = (entries, materialId) => (entries || []).reduce(
  (sum, entry) => ingredientId(entry) === String(materialId) ? sum + Number(entry.quantity || 0) : sum,
  0
);

const variantLabel = (product, sku) => {
  const combination = new Set((sku?.combination || []).map(String));
  const groups = product.variant_groups || [];
  const scentGroup = groups.find((group) => {
    const name = normalizeText(group.name);
    return ['mui', 'huong', 'scent', 'aroma'].some((keyword) => name.includes(keyword));
  });
  const scentOption = scentGroup?.options?.find((option) => combination.has(String(option.id)));
  if (scentOption?.label) return scentOption.label;

  const labels = groups.flatMap((group) => (group.options || [])
    .filter((option) => combination.has(String(option.id)))
    .map((option) => option.label)
    .filter(Boolean));
  return labels.sort((a, b) => a.length - b.length)[0] || 'Mặc định';
};

const buildMaterialUsageDetails = (material, products) => {
  const materialId = String(material?._id || '');
  if (!materialId) return [];

  return products.map((product) => {
    const baseQuantity = ingredientQuantity(product.base_ingredients, materialId);
    const skus = product.skus?.length ? product.skus : [null];
    const groupedVariants = new Map();

    skus.forEach((sku, skuIndex) => {
      const quantity = baseQuantity + ingredientQuantity(sku?.extra_ingredients, materialId);
      if (quantity <= 0) return;
      const label = sku ? variantLabel(product, sku) : 'Mặc định';
      const key = normalizeText(label).trim() || 'mac dinh';
      const existing = groupedVariants.get(key);
      if (!existing) {
        groupedVariants.set(key, {
          label,
          minQuantity: quantity,
          maxQuantity: quantity,
          skuCount: 1,
          firstSkuId: sku?.id || '',
          skuIndexes: sku ? [skuIndex] : [],
        });
        return;
      }
      existing.minQuantity = Math.min(existing.minQuantity, quantity);
      existing.maxQuantity = Math.max(existing.maxQuantity, quantity);
      existing.skuCount += 1;
      if (sku) existing.skuIndexes.push(skuIndex);
      if (label.length < existing.label.length) existing.label = label;
    });

    const variants = [...groupedVariants.values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    if (!variants.length) return null;
    const summaryVariant = {
      label: product.name,
      minQuantity: Math.min(...variants.map((variant) => variant.minQuantity)),
      maxQuantity: Math.max(...variants.map((variant) => variant.maxQuantity)),
      skuCount: variants.reduce((total, variant) => total + variant.skuCount, 0),
      skuIndexes: [...new Set(variants.flatMap((variant) => variant.skuIndexes))],
    };
    return {
      id: product._id,
      productId: product.productId,
      name: product.name,
      image: product.image,
      baseQuantity,
      variantGroupCount: product.variant_groups?.length || 0,
      summaryVariant,
      variants,
    };
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

const setIngredientQuantity = (entries, materialId, quantity) => {
  const nextEntries = (entries || [])
    .filter((entry) => ingredientId(entry) !== String(materialId))
    .map((entry) => ({ ingredient_id: ingredientId(entry), quantity: Number(entry.quantity || 0) }));
  if (quantity > 0) nextEntries.push({ ingredient_id: materialId, quantity });
  return nextEntries;
};

const normalizeIngredientEntries = (entries) => (entries || [])
  .map((entry) => ({ ingredient_id: ingredientId(entry), quantity: Number(entry.quantity || 0) }))
  .filter((entry) => entry.ingredient_id);

const updateVariantOilQuantity = (product, variant, materialId, quantity) => {
  const nextProduct = JSON.parse(JSON.stringify(product));
  nextProduct.base_ingredients = normalizeIngredientEntries(nextProduct.base_ingredients);
  nextProduct.skus = (nextProduct.skus || []).map((sku) => ({
    ...sku,
    extra_ingredients: normalizeIngredientEntries(sku.extra_ingredients),
  }));
  const baseQuantity = ingredientQuantity(nextProduct.base_ingredients, materialId);
  const hasSkus = Array.isArray(nextProduct.skus) && nextProduct.skus.length > 0;

  if (!hasSkus) {
    nextProduct.base_ingredients = setIngredientQuantity(nextProduct.base_ingredients, materialId, quantity);
    return nextProduct;
  }

  if (baseQuantity > 0) {
    nextProduct.skus = nextProduct.skus.map((sku) => {
      const currentQuantity = baseQuantity + ingredientQuantity(sku.extra_ingredients, materialId);
      return {
        ...sku,
        extra_ingredients: setIngredientQuantity(sku.extra_ingredients, materialId, currentQuantity),
      };
    });
    nextProduct.base_ingredients = setIngredientQuantity(nextProduct.base_ingredients, materialId, 0);
  }

  const groupedIndexes = new Set(variant.skuIndexes || []);
  nextProduct.skus = nextProduct.skus.map((sku, index) => groupedIndexes.has(index)
    ? { ...sku, extra_ingredients: setIngredientQuantity(sku.extra_ingredients, materialId, quantity) }
    : sku);
  return nextProduct;
};

function EssentialOilDetailModal({ material, products, config, onClose, onEdit, onImport, onPrint, onUsageSaved }) {
  const stock = getActualStock(material);
  const statusInfo = STATUS[getStatus(material)];
  const oilAppearance = getMaterialAppearance(material);
  const productUsage = useMemo(() => buildMaterialUsageDetails(material, products), [material, products]);
  const [editingUsage, setEditingUsage] = useState(null);
  const [usageValue, setUsageValue] = useState('');
  const [savingUsage, setSavingUsage] = useState(false);
  const [usageError, setUsageError] = useState('');

  const beginUsageEdit = (product, variant) => {
    setEditingUsage(`${product.id}-${normalizeText(variant.label)}`);
    setUsageValue(String(variant.minQuantity));
    setUsageError('');
  };

  const saveUsage = async (productUsageItem, variant) => {
    const quantity = Number(usageValue);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setUsageError('Định lượng phải lớn hơn 0.');
      return;
    }

    const sourceProduct = products.find((product) => String(product._id) === String(productUsageItem.id));
    if (!sourceProduct) {
      setUsageError('Không tìm thấy sản phẩm để cập nhật.');
      return;
    }

    setSavingUsage(true);
    setUsageError('');
    try {
      const nextProduct = updateVariantOilQuantity(sourceProduct, variant, String(material._id), quantity);
      const response = await productService.updateProduct(sourceProduct._id, nextProduct);
      onUsageSaved(response.data?.data || nextProduct, variant.skuCount);
      setEditingUsage(null);
    } catch (error) {
      setUsageError(error.response?.data?.message || 'Không thể cập nhật định lượng.');
    } finally {
      setSavingUsage(false);
    }
  };

  const renderUsageControl = (product, variant) => {
    const usageKey = `${product.id}-${normalizeText(variant.label)}`;
    const isEditing = editingUsage === usageKey;
    const quantity = variant.minQuantity === variant.maxQuantity
      ? quantityText(variant.minQuantity)
      : `${quantityText(variant.minQuantity)}–${quantityText(variant.maxQuantity)}`;

    if (!isEditing) {
      return (
        <button type="button" onClick={() => beginUsageEdit(product, variant)} className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100" title="Sửa định lượng">
          <span>{quantity} {material.unit} / SP</span>
          <span className="material-symbols-outlined text-[15px] opacity-60 transition group-hover:opacity-100">edit</span>
        </button>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <div className="flex items-center overflow-hidden rounded-lg border border-violet-300 bg-white focus-within:ring-2 focus-within:ring-violet-100">
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            autoFocus
            value={usageValue}
            onChange={(event) => setUsageValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveUsage(product, variant);
              if (event.key === 'Escape') setEditingUsage(null);
            }}
            className="w-24 border-0 px-2.5 py-1.5 text-right text-sm font-bold text-slate-900 outline-none"
            aria-label={`Định lượng ${variant.label}`}
          />
          <span className="border-l border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-500">{material.unit}/SP</span>
        </div>
        <button type="button" onClick={() => saveUsage(product, variant)} disabled={savingUsage} className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-violet-700 text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60" aria-label="Lưu định lượng">
          <span className="material-symbols-outlined text-lg">{savingUsage ? 'progress_activity' : 'check'}</span>
        </button>
        <button type="button" onClick={() => { setEditingUsage(null); setUsageError(''); }} disabled={savingUsage} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="Hủy sửa">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="oil-detail-title">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <span className="material-symbols-outlined text-[26px]">{config.icon}</span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="oil-detail-title" style={{ color: oilAppearance.textColor }} className="truncate text-lg font-bold sm:text-xl">{material.name}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${statusInfo.className}`}>
                  <span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>{statusInfo.label}
                </span>
                <span style={{ color: oilAppearance.textColor }} className="text-[10px] font-bold">{oilAppearance.label}</span>
                {oilAppearance.concentrationLabel && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{oilAppearance.concentrationLabel}</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">{material.sku} · {material.supplier}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="overflow-y-auto">
          <section className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-4 sm:p-6">
            {[
              { label: 'Tồn thực tế', value: `${quantityText(stock)} ${material.unit}`, icon: 'inventory_2' },
              { label: 'Mức cảnh báo', value: `${quantityText(material.minStock)} ${material.unit}`, icon: 'notification_important' },
              { label: 'Đơn giá nhập', value: formatPrice(material.price), icon: 'sell' },
              { label: 'Giá trị tồn', value: formatPrice(stock * Number(material.price || 0)), icon: 'payments' },
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                <span className="material-symbols-outlined text-xl text-violet-500">{item.icon}</span>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 truncate text-sm font-extrabold text-slate-900" title={item.value}>{item.value}</p>
              </article>
            ))}
          </section>

          <section className="p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Chi tiết sử dụng</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Sản phẩm đang dùng tinh dầu này</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Sản phẩm chỉ có một nhóm phân loại được hiển thị gọn theo sản phẩm; sản phẩm nhiều nhóm mới tách chi tiết.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{productUsage.length} sản phẩm</span>
            </div>

            {productUsage.length ? (
              <div className="mt-5 space-y-3">
                {productUsage.map((product) => {
                  const collapsedVariant = product.variantGroupCount <= 1 ? product.summaryVariant : null;
                  return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className={`flex flex-wrap items-center gap-3 bg-slate-50/60 px-4 py-3 ${collapsedVariant ? '' : 'border-b border-slate-100'}`}>
                      {product.image ? (
                        <img src={getImageUrl(product.image)} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-300"><span className="material-symbols-outlined">inventory_2</span></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-slate-900">{product.name}</h4>
                        <p className="mt-0.5 text-xs text-slate-400">{product.productId || 'Chưa có mã'}{!collapsedVariant && ` · ${product.variants.length} lựa chọn đang dùng`}</p>
                      </div>
                      {collapsedVariant && renderUsageControl(product, collapsedVariant)}
                    </div>
                    {!collapsedVariant && <div className="divide-y divide-slate-100 px-4">
                      {product.variants.map((variant) => {
                        const usageKey = `${product.id}-${normalizeText(variant.label)}`;
                        return (
                          <div key={usageKey} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{variant.label}</p>
                              {variant.skuCount > 1 && <p className="mt-0.5 text-[11px] text-slate-400">Đã gộp {variant.skuCount} SKU trùng phân loại</p>}
                            </div>
                            {renderUsageControl(product, variant)}
                          </div>
                        );
                      })}
                    </div>}
                    {usageError && editingUsage?.startsWith(`${product.id}-`) && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">{usageError}</p>}
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">science_off</span>
                <p className="mt-2 text-sm font-semibold text-slate-600">Chưa dùng trong công thức sản phẩm nào</p>
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <button type="button" onClick={onPrint} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><span className="material-symbols-outlined text-lg">print</span>In tem A7</button>
          <button type="button" onClick={onImport} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"><span className="material-symbols-outlined text-lg">add_box</span>Tạo phiếu nhập</button>
          <button type="button" onClick={onEdit} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800"><span className="material-symbols-outlined text-lg">edit</span>Chỉnh sửa</button>
        </footer>
      </div>
    </div>
  );
}

function SpecializedMaterialModal({ material, config, onClose, onSaved, onRequestDelete }) {
  const existingAppearance = getMaterialAppearance(material);
  const [form, setForm] = useState(() => material ? {
    name: material.name || '',
    sku: material.sku || '',
    supplier: material.supplier || '',
    unit: material.unit || 'Gam',
    price: material.price ?? '',
    stock: material.stock ?? '',
    minStock: material.minStock ?? '100',
    isConcentratedOil: Boolean(material.isConcentratedOil),
    oilColor: existingAppearance.color || '#7c3aed',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(material);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        sku: form.sku.trim(),
        category: config.category,
        price: Number(form.price),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
      };
      if (!payload.sku) delete payload.sku;
      if (isEdit && payload.sku === String(material.sku || '').trim()) delete payload.sku;
      if (isEdit) await materialService.updateMaterial(material._id, payload);
      else await materialService.createMaterial(payload);
      onSaved(isEdit ? `Đã cập nhật ${config.singular}` : `Đã thêm ${config.singular} mới`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Không thể lưu ${config.singular}. Vui lòng thử lại.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="oil-modal-title">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <span className="material-symbols-outlined">{config.icon}</span>
            </span>
            <div>
              <h2 id="oil-modal-title" className="text-lg font-bold text-slate-900 sm:text-xl">{isEdit ? `Chỉnh sửa ${config.singular}` : `Thêm ${config.singular} mới`}</h2>
              <p className="mt-0.5 text-xs text-slate-500">Dữ liệu dùng chung với kho nguyên vật liệu và công thức sản phẩm.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="flex size-9 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form id="essential-oil-form" onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5 sm:px-6">
          {error && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Tên {config.singular} <span className="text-red-500">*</span></span>
              <input name="name" value={form.name} onChange={handleChange} required placeholder={config.placeholder} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Mã SKU</span>
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="Tự tạo nếu để trống" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Nhà cung cấp <span className="text-red-500">*</span></span>
              <input name="supplier" value={form.supplier} onChange={handleChange} required placeholder="Tên nhà cung cấp" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Đơn vị <span className="text-red-500">*</span></span>
              <select name="unit" value={form.unit} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                <option value="Gam">Gam</option>
                <option value="Kg">Kg</option>
                <option value="Ml">Ml</option>
                <option value="Lít">Lít</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Đơn giá nhập <span className="text-red-500">*</span></span>
              <div className="relative">
                <input name="price" type="number" min="0" step="any" value={form.price} onChange={handleChange} required placeholder="0" className="w-full rounded-xl border border-slate-200 py-2.5 pl-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">VNĐ</span>
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Tồn kho hệ thống <span className="text-red-500">*</span></span>
              <input name="stock" type="number" min="0" step="any" value={form.stock} onChange={handleChange} required placeholder="0" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
              {isEdit && material.actualStock !== null && material.actualStock !== undefined && Number(material.actualStock) !== Number(material.stock) && (
                <span className="mt-1.5 block text-xs text-amber-700">Tồn thực tế hiện tại: {Number(material.actualStock).toLocaleString('vi-VN')} {material.unit}</span>
              )}
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Mức cảnh báo tồn <span className="text-red-500">*</span></span>
              <input name="minStock" type="number" min="0" step="any" value={form.minStock} onChange={handleChange} required placeholder="100" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            </label>

            <label className={`sm:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${form.isConcentratedOil ? 'border-violet-300 bg-violet-100' : 'border-violet-100 bg-violet-50/60 hover:bg-violet-50'}`}>
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${form.isConcentratedOil ? 'bg-violet-800 text-white' : 'bg-violet-100 text-violet-700'}`}><span className="material-symbols-outlined">opacity</span></span>
                <span><strong className="block text-sm text-slate-800">Tinh dầu đậm đặc</strong><small className="mt-0.5 block text-xs text-slate-500">Thêm tag “Đậm đặc” cạnh tên tinh dầu.</small></span>
              </span>
              <input name="isConcentratedOil" type="checkbox" checked={form.isConcentratedOil} onChange={handleChange} className="size-5 shrink-0 cursor-pointer accent-violet-800" />
            </label>

            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-semibold text-slate-700">Màu nhận diện tinh dầu</legend>
              <div className="flex flex-wrap items-center gap-2">
                {OIL_COLOR_OPTIONS.map((option, index) => {
                  const selected = form.oilColor === option.color;
                  return <label key={option.color} title={`Màu mẫu ${index + 1}`} className={`cursor-pointer rounded-xl border p-2 transition ${selected ? 'border-slate-800 ring-2 ring-slate-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="oilColor" value={option.color} checked={selected} onChange={handleChange} className="sr-only" />
                    <span className={`block size-7 rounded-full shadow-sm ring-1 ring-black/10 ${option.swatch}`} />
                  </label>;
                })}
                <label title="Chọn màu tùy thích" className="relative flex size-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-400">
                  <input type="color" name="oilColor" value={form.oilColor} onChange={handleChange} className="absolute inset-[-8px] size-16 cursor-pointer border-0 bg-transparent" />
                  <span className="material-symbols-outlined pointer-events-none relative z-10 rounded-full bg-white/80 p-1 text-base">palette</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-violet-50 px-4 py-3 text-xs leading-relaxed text-violet-800">
            <span className="material-symbols-outlined text-lg">info</span>
            <p>Phân loại được cố định là <strong>{config.category}</strong> để hệ thống nhận diện đúng khi lập công thức sản xuất.</p>
          </div>
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            {isEdit && (
              <button type="button" onClick={() => onRequestDelete(material)} disabled={saving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40">
                <span className="material-symbols-outlined text-lg">delete</span>Xóa
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">Hủy</button>
            <button type="submit" form="essential-oil-form" disabled={saving} className="inline-flex min-w-28 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60">
              {saving && <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>}
              {saving ? 'Đang lưu' : `Lưu ${config.singular}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteMaterialModal({ material, config, loading, error, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600"><span className="material-symbols-outlined">delete_forever</span></span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Xóa {config.singular}?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Bạn đang xóa <strong>{material.name}</strong>. Không thể xóa nếu {config.singular} đang được dùng trong công thức sản phẩm.</p>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Hủy</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
            {loading && <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>}Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EssentialOilManagement() {
  const config = OIL_CONFIG;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');
  const [modal, setModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState(null);
  const search = searchParams.get('q') || '';

  const handleSearchChange = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [materialResponse, productResponse] = await Promise.all([
        materialService.getMaterials(),
        productService.getProducts(),
      ]);
      setMaterials(materialResponse.data?.data || []);
      setProducts(productResponse.data?.data || []);
    } catch (error) {
      setLoadError(error.response?.data?.message || `Không thể tải dữ liệu ${config.singular}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const oils = useMemo(() => materials.filter(config.matches), [materials, config.matches]);

  const usageMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const ids = new Set([
        ...(product.base_ingredients || []).map(ingredientId),
        ...(product.skus || []).flatMap((sku) => (sku.extra_ingredients || []).map(ingredientId)),
      ].filter(Boolean));
      ids.forEach((id) => {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ id: product._id, name: product.name });
      });
    });
    return map;
  }, [products]);

  const suppliers = useMemo(() => [...new Set(oils.map((oil) => oil.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [oils]);

  const stats = useMemo(() => {
    const lowStock = oils.filter((oil) => getStatus(oil) !== 'in_stock').length;
    const inUse = oils.filter((oil) => (usageMap.get(String(oil._id)) || []).length > 0).length;
    const inventoryValue = oils.reduce((sum, oil) => sum + getActualStock(oil) * Number(oil.price || 0), 0);
    const recipeCount = new Set(oils.flatMap((oil) => (usageMap.get(String(oil._id)) || []).map((product) => product.id))).size;
    return { total: oils.length, lowStock, inUse, inventoryValue, recipeCount };
  }, [oils, usageMap]);

  const filteredOils = useMemo(() => {
    const term = normalizeText(search.trim());
    const result = oils.filter((oil) => {
      const status = getStatus(oil);
      const usage = usageMap.get(String(oil._id)) || [];
      if (statusFilter === 'unused' && usage.length > 0) return false;
      if (!['all', 'unused'].includes(statusFilter) && status !== statusFilter) return false;
      if (supplierFilter !== 'all' && oil.supplier !== supplierFilter) return false;
      if (term && !normalizeText(`${oil.name} ${oil.sku} ${oil.supplier}`).includes(term)) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'vi');
      if (sortBy === 'stock-desc') return getActualStock(b) - getActualStock(a);
      if (sortBy === 'value-desc') return (getActualStock(b) * b.price) - (getActualStock(a) * a.price);
      const order = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
      const statusDifference = order[getStatus(a)] - order[getStatus(b)];
      return statusDifference || a.name.localeCompare(b.name, 'vi');
    });
    return result;
  }, [oils, search, statusFilter, supplierFilter, sortBy, usageMap]);

  const handleSaved = (message) => {
    setModal(null);
    showToast(message);
    fetchData();
    window.dispatchEvent(new CustomEvent('materialsChanged'));
  };

  const handleUsageSaved = (updatedProduct, skuCount) => {
    setProducts((current) => current.map((product) => String(product._id) === String(updatedProduct._id) ? updatedProduct : product));
    showToast(skuCount > 1 ? `Đã cập nhật định lượng cho ${skuCount} SKU được gộp` : 'Đã cập nhật định lượng sử dụng');
  };

  const requestDelete = (material) => {
    setModal({ type: 'delete', material });
    setDeleteError('');
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await materialService.deleteMaterial(modal.material._id);
      setModal(null);
      showToast(`Đã xóa ${config.singular}`);
      fetchData();
      window.dispatchEvent(new CustomEvent('materialsChanged'));
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'Không thể xóa tinh dầu.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openImport = (oil) => navigate('/admin/imports', {
    state: { autoOpenImport: true, materialId: oil?._id },
  });

  const printLabels = (items) => {
    try {
      const fileUrl = createEssentialOilLabelsPdf(items);
      const printTab = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (!printTab) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = 'tem-tinh-dau-a7.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Trình duyệt đã tải file tem vì cửa sổ in đang bị chặn.');
      }
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error) {
      showToast(error.message || 'Không thể tạo file tem tinh dầu.', 'error');
    }
  };

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`} role="status">
          {toast.message}
        </div>
      )}

      {modal?.type === 'detail' && (
        <EssentialOilDetailModal
          material={modal.material}
          products={products}
          config={config}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'form', material: modal.material })}
          onImport={() => openImport(modal.material)}
          onPrint={() => printLabels([modal.material])}
          onUsageSaved={handleUsageSaved}
        />
      )}
      {modal?.type === 'form' && (
        <SpecializedMaterialModal material={modal.material} config={config} onClose={() => setModal(null)} onSaved={handleSaved} onRequestDelete={requestDelete} />
      )}
      {modal?.type === 'delete' && (
        <DeleteMaterialModal material={modal.material} config={config} loading={deleteLoading} error={deleteError} onClose={() => setModal(null)} onConfirm={handleDelete} />
      )}

      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              <span className="material-symbols-outlined text-lg">{config.icon}</span>{config.eyebrow}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-[28px]">{config.title}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{config.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openImport()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
              <span className="material-symbols-outlined text-xl">local_shipping</span>Tạo phiếu nhập
            </button>
            <button type="button" onClick={() => printLabels(filteredOils)} disabled={!filteredOils.length} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
              <span className="material-symbols-outlined text-xl">print</span>In tem A7
            </button>
            <button type="button" onClick={() => setModal({ type: 'form', material: null })} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800">
              <span className="material-symbols-outlined text-xl">add</span>Thêm {config.singular}
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: `Danh mục ${config.plural}`, value: stats.total.toLocaleString('vi-VN'), note: `${stats.inUse} loại đang dùng`, icon: config.icon, orbClass: 'bg-violet-100/60', iconClass: 'bg-violet-50 text-violet-600' },
            { label: 'Cần nhập thêm', value: stats.lowStock.toLocaleString('vi-VN'), note: stats.lowStock ? 'Cần xử lý sớm' : 'Tồn kho ổn định', icon: 'notification_important', orbClass: stats.lowStock ? 'bg-amber-100/60' : 'bg-emerald-100/60', iconClass: stats.lowStock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600' },
            { label: 'Giá trị tồn kho', value: formatPrice(stats.inventoryValue), note: 'Đơn giá × tồn thực tế', icon: 'payments', orbClass: 'bg-blue-100/60', iconClass: 'bg-blue-50 text-blue-600' },
            { label: 'Công thức sử dụng', value: stats.recipeCount.toLocaleString('vi-VN'), note: `Sản phẩm có ${config.singular}`, icon: 'science', orbClass: 'bg-rose-100/60', iconClass: 'bg-rose-50 text-rose-600' },
          ].map((card) => (
            <article key={card.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className={`absolute -right-5 -top-5 size-24 rounded-full ${card.orbClass}`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">{card.label}</p>
                  <p className="mt-2 truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : card.value}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-400 sm:text-xs">{card.note}</p>
                </div>
                <span className={`material-symbols-outlined flex size-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}>{card.icon}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto]">
              <label className="relative block">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-slate-400">search</span>
                <input value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Tìm tên, SKU hoặc nhà cung cấp…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400">
                <option value="all">Tất cả trạng thái</option>
                <option value="in_stock">Đủ hàng</option>
                <option value="low_stock">Sắp hết</option>
                <option value="out_of_stock">Hết hàng</option>
                <option value="unused">Chưa dùng trong công thức</option>
              </select>
              <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400">
                <option value="all">Tất cả nhà cung cấp</option>
                {suppliers.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
              </select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400">
                <option value="urgency">Ưu tiên cần nhập</option>
                <option value="name">Tên A–Z</option>
                <option value="stock-desc">Tồn kho cao nhất</option>
                <option value="value-desc">Giá trị cao nhất</option>
              </select>
            </div>
            <p className="mt-3 text-xs text-slate-500">Hiển thị <strong className="text-slate-800">{filteredOils.length}</strong> trong {oils.length} loại {config.singular}</p>
          </div>

          {loadError ? (
            <div className="px-6 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-red-300">cloud_off</span>
              <p className="mt-3 text-sm font-semibold text-slate-700">{loadError}</p>
              <button type="button" onClick={fetchData} className="mt-4 cursor-pointer rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Thử lại</button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">{config.category}</th>
                      <th className="px-5 py-3.5">Nhà cung cấp</th>
                      <th className="px-5 py-3.5">Tồn kho</th>
                      <th className="px-5 py-3.5">Đơn giá / Giá trị</th>
                      <th className="px-5 py-3.5">Sử dụng trong</th>
                      <th className="px-5 py-3.5">Trạng thái</th>
                      <th className="px-5 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? [...Array(5)].map((_, index) => (
                      <tr key={index}>{[...Array(7)].map((__, cell) => <td key={cell} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>
                    )) : filteredOils.length ? filteredOils.map((oil) => {
                      const stock = getActualStock(oil);
                      const status = getStatus(oil);
                      const statusInfo = STATUS[status];
                      const usage = usageMap.get(String(oil._id)) || [];
                      const appearance = getMaterialAppearance(oil);
                      return (
                        <tr key={oil._id} onClick={() => setModal({ type: 'detail', material: oil })} className="cursor-pointer transition hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><span className="material-symbols-outlined">{config.icon}</span></span>
                              <div className="min-w-0"><p style={{ color: appearance.textColor }} className="max-w-64 truncate text-sm font-bold">{oil.name}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><span>{oil.sku}</span>{appearance.concentrationLabel && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">{appearance.concentrationLabel}</span>}</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{oil.supplier}</td>
                          <td className="px-5 py-4"><p className={`text-sm font-bold ${status === 'in_stock' ? 'text-slate-900' : 'text-red-600'}`}>{stock.toLocaleString('vi-VN')} {oil.unit}</p><p className="mt-0.5 text-xs text-slate-400">Cảnh báo: {Number(oil.minStock || 0).toLocaleString('vi-VN')} {oil.unit}</p></td>
                          <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{formatPrice(oil.price)}</p><p className="mt-0.5 text-xs text-slate-400">{formatPrice(stock * oil.price)} tồn kho</p></td>
                          <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-700">{usage.length ? `${usage.length} sản phẩm` : 'Chưa sử dụng'}</p>{usage.length > 0 && <p className="mt-0.5 max-w-52 truncate text-xs text-slate-400" title={usage.map((item) => item.name).join(', ')}>{usage.map((item) => item.name).join(', ')}</p>}</td>
                          <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusInfo.className}`}><span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>{statusInfo.label}</span></td>
                          <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={(event) => { event.stopPropagation(); openImport(oil); }} className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-100 hover:text-violet-700" title="Tạo phiếu nhập" aria-label={`Nhập thêm ${oil.name}`}><span className="material-symbols-outlined text-xl">add_box</span></button><button type="button" onClick={(event) => { event.stopPropagation(); setModal({ type: 'form', material: oil }); }} className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${oil.name}`}><span className="material-symbols-outlined text-xl">edit</span></button></div></td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} className="px-6 py-16 text-center"><span className="material-symbols-outlined text-5xl text-violet-200">{config.icon}</span><p className="mt-3 text-sm font-semibold text-slate-700">Chưa tìm thấy {config.singular} phù hợp</p><p className="mt-1 text-xs text-slate-400">{config.identificationHint}</p><button type="button" onClick={() => setModal({ type: 'form', material: null })} className="mt-4 cursor-pointer text-sm font-bold text-violet-700 hover:underline">+ Thêm {config.singular} mới</button></td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {loading ? [...Array(4)].map((_, index) => <div key={index} className="p-4"><div className="h-24 animate-pulse rounded-xl bg-slate-100" /></div>) : filteredOils.length ? filteredOils.map((oil) => {
                  const stock = getActualStock(oil);
                  const status = getStatus(oil);
                  const statusInfo = STATUS[status];
                  const usage = usageMap.get(String(oil._id)) || [];
                  const appearance = getMaterialAppearance(oil);
                  return (
                    <article key={oil._id} onClick={() => setModal({ type: 'detail', material: oil })} className="cursor-pointer p-4 active:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><span className="material-symbols-outlined">{config.icon}</span></span>
                        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 style={{ color: appearance.textColor }} className="truncate text-sm font-bold">{oil.name}</h3><p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500"><span>{oil.sku} · {oil.supplier}</span>{appearance.concentrationLabel && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">{appearance.concentrationLabel}</span>}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${statusInfo.className}`}>{statusInfo.label}</span></div>
                          <div className="mt-3 grid grid-cols-3 gap-2"><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Tồn kho</p><p className={`mt-0.5 text-xs font-bold ${status === 'in_stock' ? 'text-slate-800' : 'text-red-600'}`}>{stock.toLocaleString('vi-VN')} {oil.unit}</p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Giá trị</p><p className="mt-0.5 truncate text-xs font-bold text-slate-800">{formatPrice(stock * oil.price)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Công thức</p><p className="mt-0.5 text-xs font-bold text-slate-800">{usage.length} sản phẩm</p></div></div>
                          <div className="mt-3 flex justify-end"><button type="button" onClick={(event) => { event.stopPropagation(); openImport(oil); }} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"><span className="material-symbols-outlined text-base">add_box</span>Nhập thêm</button></div>
                        </div>
                      </div>
                    </article>
                  );
                }) : <div className="px-6 py-16 text-center"><span className="material-symbols-outlined text-5xl text-violet-200">{config.icon}</span><p className="mt-3 text-sm font-semibold text-slate-700">Chưa tìm thấy {config.singular} phù hợp</p><button type="button" onClick={() => setModal({ type: 'form', material: null })} className="mt-4 cursor-pointer text-sm font-bold text-violet-700">+ Thêm {config.singular} mới</button></div>}
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
