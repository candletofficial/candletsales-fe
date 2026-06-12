import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { materialService } from '../services/materialService';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { formatPrice } from '../utils/formatPrice';

const getEmptyForm = () => ({
  productId: `SP-${Math.floor(1000000 + Math.random() * 9000000)}`,
  name: '',
  image: '',
  description: '',
  base_price: 0,
  base_ingredients: [],
  variant_groups: [],
  skus: []
});

function ProductModal({ product, materials, onClose, onSave, onDelete, onDuplicate }) {
  const materialOptions = useMemo(() => materials.map(m => ({
    value: m._id,
    label: `${m.name} (${formatPrice(m.price)} / ${m.unit})`
  })), [materials]);

  const [form, setForm] = useState(() => {
    if (!product) return getEmptyForm();
    const p = JSON.parse(JSON.stringify(product));
    if (!p.productId) p.productId = `SP-${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Normalize populated base_ingredients
    if (p.base_ingredients) {
      p.base_ingredients = p.base_ingredients.map(item => ({
        ...item,
        ingredient_id: typeof item.ingredient_id === 'object' && item.ingredient_id ? item.ingredient_id._id : item.ingredient_id
      }));
    }

    // Normalize populated extra_ingredients in skus
    if (p.skus) {
      p.skus = p.skus.map(sku => ({
        ...sku,
        extra_ingredients: sku.extra_ingredients ? sku.extra_ingredients.map(item => ({
          ...item,
          ingredient_id: typeof item.ingredient_id === 'object' && item.ingredient_id ? item.ingredient_id._id : item.ingredient_id
        })) : []
      }));
    }

    return p;
  });
  const [activeTab, setActiveTab] = useState('basic'); // basic, base_ingredients, variants, skus
  const [loading, setLoading] = useState(false);

  // Calculate dynamic costs
  const currentBaseCost = useMemo(() => {
    return form.base_ingredients.reduce((total, item) => {
      const mat = materials.find(m => m._id === item.ingredient_id);
      return total + (mat ? mat.price * (Number(item.quantity) || 0) : 0);
    }, 0);
  }, [form.base_ingredients, materials]);

  const calculateSkuCost = (sku) => {
    const extraCost = sku.extra_ingredients.reduce((total, item) => {
      const mat = materials.find(m => m._id === item.ingredient_id);
      return total + (mat ? mat.price * (Number(item.quantity) || 0) : 0);
    }, 0);
    return currentBaseCost + extraCost;
  };

  // Helper to generate SKUs from variants
  const handleGenerateSKUs = () => {
    if (!form.variant_groups || form.variant_groups.length === 0) return;

    // Create cartesian product
    const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    const optionArrays = form.variant_groups.map(g => g.options.map(o => o.id));

    let combinations = [];
    if (optionArrays.length > 0) {
      combinations = optionArrays.length === 1 ? optionArrays[0].map(id => [id]) : cartesian(...optionArrays);
    }

    const newSkus = combinations.map(combo => {
      // 1. Try exact match (order-independent)
      let existingSku = form.skus.find(s => {
        if (!s.combination) return false;
        if (s.combination.length !== combo.length) return false;
        const sortedS = [...s.combination].sort();
        const sortedC = [...combo].sort();
        return JSON.stringify(sortedS) === JSON.stringify(sortedC);
      });
      
      if (existingSku) return existingSku;

      // 2. If no exact match, find the best partial match (highest intersection)
      let bestMatch = null;
      let maxIntersection = 0;
      for (const oldSku of form.skus) {
        if (!oldSku.combination) continue;
        const intersection = oldSku.combination.filter(c => combo.includes(c)).length;
        if (intersection > maxIntersection && intersection > 0) {
          maxIntersection = intersection;
          bestMatch = oldSku;
        }
      }

      if (bestMatch) {
        return {
          id: `V${Math.floor(1000 + Math.random() * 9000)}`,
          price: bestMatch.price,
          combination: combo,
          extra_ingredients: JSON.parse(JSON.stringify(bestMatch.extra_ingredients))
        };
      }

      // 3. Fallback to empty SKU
      return {
        id: `V${Math.floor(1000 + Math.random() * 9000)}`,
        price: form.base_price || 0,
        combination: combo,
        extra_ingredients: []
      };
    });

    setForm({ ...form, skus: newSkus });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-[modalIn_0.3s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              {product && product._id ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}
              <span className="text-[13px] font-mono bg-surface-container-high px-2 py-1 rounded text-on-surface-variant font-normal">
                {form.productId}
              </span>
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Giá vốn gốc (Base Cost): <span className="font-bold text-primary">{formatPrice(currentBaseCost)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/30 px-6 pt-2 gap-4">
          {[
            { id: 'basic', label: 'Thông tin' },
            { id: 'base_ingredients', label: 'Công thức gốc' },
            { id: 'variants', label: 'Nhóm phân loại' },
            { id: 'skus', label: 'Danh sách phân loại' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Tên sản phẩm *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ví dụ: Nến thơm tinh dầu hoa hồng" />
              </div>
              <div className="col-span-1">
                <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Giá bán cơ bản (VNĐ) *</label>
                <input type="number" min="0" value={form.base_price || ''} onChange={e => setForm({ ...form, base_price: Number(e.target.value) })} required
                  className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ví dụ: 150000" />
              </div>
              <div className="col-span-1">
                <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Hình ảnh (URL)</label>
                <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })}
                  className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="3"
                  className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Mô tả chi tiết sản phẩm..." />
              </div>
            </div>
          )}

          {activeTab === 'base_ingredients' && (
            <div>
              <div className="flex justify-between items-center mb-4 sticky -top-6 bg-surface-container-low z-10 py-3 -mx-6 px-6 border-b border-outline-variant/30 shadow-sm">
                <p className="text-sm text-on-surface-variant">Công thức này sẽ được áp dụng chung cho TẤT CẢ các phân loại.</p>
                <button type="button" onClick={() => setForm({ ...form, base_ingredients: [...form.base_ingredients, { ingredient_id: '', quantity: 1 }] })}
                  className="text-primary text-sm font-bold flex items-center gap-1 hover:bg-primary-container/30 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add</span> Thêm nguyên liệu
                </button>
              </div>

              <div className="space-y-3">
                {form.base_ingredients.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-lg border border-outline-variant/50 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        options={materialOptions}
                        value={item.ingredient_id}
                        onChange={(val) => {
                          const newArr = [...form.base_ingredients];
                          newArr[idx].ingredient_id = val;
                          setForm({ ...form, base_ingredients: newArr });
                        }}
                        placeholder="-- Chọn nguyên liệu --"
                      />
                    </div>
                    <div className="w-[120px]">
                      <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => {
                        const newArr = [...form.base_ingredients];
                        newArr[idx].quantity = Number(e.target.value);
                        setForm({ ...form, base_ingredients: newArr });
                      }}
                        className="w-full border border-outline-variant rounded-md px-3 py-1.5 text-[14px]" placeholder="SL" />
                    </div>
                    <button onClick={() => {
                      const newArr = [...form.base_ingredients];
                      newArr.splice(idx, 1);
                      setForm({ ...form, base_ingredients: newArr });
                    }}
                      className="p-1.5 text-error hover:bg-error-container rounded-md transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
                {form.base_ingredients.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant border-2 border-dashed border-outline-variant/50 rounded-xl">
                    Chưa có nguyên liệu nào.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div>
              <div className="flex justify-between items-center mb-4 sticky -top-6 bg-surface-container-low z-10 py-3 -mx-6 px-6 border-b border-outline-variant/30 shadow-sm">
                <p className="text-sm text-on-surface-variant">Thêm các nhóm phân loại (VD: Mùi hương, Kích cỡ).</p>
                <button type="button" onClick={() => setForm({ ...form, variant_groups: [...form.variant_groups, { id: `g${form.variant_groups.length + 1}`, name: '', options: [] }] })}
                  className="text-primary text-sm font-bold flex items-center gap-1 hover:bg-primary-container/30 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add</span> Thêm nhóm phân loại
                </button>
              </div>

              <div className="space-y-6">
                {form.variant_groups.map((group, gIdx) => (
                  <div key={gIdx} className="bg-white border border-outline-variant/50 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant/50 flex gap-4 items-center">
                      <input value={group.name} onChange={e => {
                        const newGroups = [...form.variant_groups];
                        newGroups[gIdx].name = e.target.value;
                        setForm({ ...form, variant_groups: newGroups });
                      }}
                        placeholder="Tên nhóm (VD: Mùi hương)"
                        className="font-bold text-[15px] bg-transparent border-b border-outline-variant focus:border-primary focus:outline-none px-1 py-0.5 flex-1" />
                      <button onClick={() => {
                        const newGroups = [...form.variant_groups];
                        newGroups.splice(gIdx, 1);
                        setForm({ ...form, variant_groups: newGroups });
                      }} className="text-error text-sm hover:underline">Xoá nhóm</button>
                    </div>
                    <div className="p-4 space-y-2">
                      {group.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-3 items-center">
                          <input value={opt.id} onChange={e => {
                            const newGroups = [...form.variant_groups];
                            newGroups[gIdx].options[oIdx].id = e.target.value;
                            setForm({ ...form, variant_groups: newGroups });
                          }}
                            placeholder="Mã (VD: RBY)" className="w-[100px] text-sm border border-outline-variant rounded-md px-2 py-1.5" />
                          <input value={opt.label} onChange={e => {
                            const newGroups = [...form.variant_groups];
                            newGroups[gIdx].options[oIdx].label = e.target.value;
                            setForm({ ...form, variant_groups: newGroups });
                          }}
                            placeholder="Tên biến thể (VD: Rosy Berry)" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5" />
                          <button onClick={() => {
                            const newGroups = [...form.variant_groups];
                            newGroups[gIdx].options.splice(oIdx, 1);
                            setForm({ ...form, variant_groups: newGroups });
                          }} className="text-error"><span className="material-symbols-outlined text-[18px]">close</span></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newGroups = [...form.variant_groups];
                        newGroups[gIdx].options.push({ id: `${group.id}-opt${newGroups[gIdx].options.length + 1}`, label: '' });
                        setForm({ ...form, variant_groups: newGroups });
                      }} className="text-[13px] text-primary font-semibold hover:underline mt-2 inline-block">
                        + Thêm tuỳ chọn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skus' && (
            <div>
              <div className="flex justify-between items-center mb-4 sticky -top-6 bg-surface-container-low z-10 py-3 -mx-6 px-6 border-b border-outline-variant/30 shadow-sm">
                <p className="text-sm text-on-surface-variant">Danh sách các phân loại cụ thể của sản phẩm.</p>
                <button type="button" onClick={handleGenerateSKUs}
                  className="bg-primary-container text-on-primary-container text-sm font-bold flex items-center gap-1 hover:brightness-95 px-4 py-2 rounded-lg transition-all shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">magic_button</span> Tự động tạo phân loại từ Nhóm phân loại
                </button>
              </div>

              <div className="space-y-4">
                {form.skus.map((sku, sIdx) => (
                  <div key={sIdx} className="bg-white border border-outline-variant/50 rounded-xl shadow-sm">
                    <div className="bg-surface-container-low px-4 py-2 border-b border-outline-variant/50 flex justify-between items-center rounded-t-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-on-surface">{sku.id}</span>
                        <div className="flex gap-1">
                          {sku.combination.map(c => (
                            <span key={c} className="bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-semibold text-on-surface-variant">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right border-r border-outline-variant/30 pr-4">
                          <p className="text-[11px] text-on-surface-variant font-bold uppercase">Tổng giá vốn</p>
                          <p className="text-[15px] font-bold text-on-surface">{formatPrice(calculateSkuCost(sku))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-primary font-bold uppercase mb-1">Giá bán</p>
                          <input type="number" min="0" value={sku.price} onChange={e => {
                            const newSkus = [...form.skus];
                            newSkus[sIdx].price = Number(e.target.value);
                            setForm({ ...form, skus: newSkus });
                          }} className="w-[100px] text-right font-bold text-[14px] text-primary border-b border-outline-variant focus:border-primary focus:outline-none bg-transparent" placeholder="0" />
                        </div>
                        <button onClick={() => {
                          const newSkus = [...form.skus];
                          newSkus.splice(sIdx, 1);
                          setForm({ ...form, skus: newSkus });
                        }} className="text-error text-[13px] hover:underline px-2 py-1 bg-error-container rounded-md">Xoá</button>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[12px] font-bold text-on-surface-variant mb-2 uppercase">Nguyên liệu bổ sung riêng (Extra Ingredients)</p>
                      {sku.extra_ingredients.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center mb-2">
                          <div className="flex-1 min-w-[250px]">
                            <SearchableSelect
                              options={materialOptions}
                              value={item.ingredient_id}
                              onChange={(val) => {
                                const newSkus = [...form.skus];
                                newSkus[sIdx].extra_ingredients[idx].ingredient_id = val;
                                setForm({ ...form, skus: newSkus });
                              }}
                              className="border border-outline-variant"
                              placeholder="-- Chọn nguyên liệu --"
                            />
                          </div>
                          <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => {
                            const newSkus = [...form.skus];
                            newSkus[sIdx].extra_ingredients[idx].quantity = Number(e.target.value);
                            setForm({ ...form, skus: newSkus });
                          }}
                            className="w-[80px] text-sm border border-outline-variant rounded-md px-2 py-1.5" placeholder="SL" />
                          <button onClick={() => {
                            const newSkus = [...form.skus];
                            newSkus[sIdx].extra_ingredients.splice(idx, 1);
                            setForm({ ...form, skus: newSkus });
                          }} className="text-error"><span className="material-symbols-outlined text-[16px]">close</span></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newSkus = [...form.skus];
                        newSkus[sIdx].extra_ingredients.push({ ingredient_id: '', quantity: 1 });
                        setForm({ ...form, skus: newSkus });
                      }} className="text-[12px] text-primary font-semibold hover:underline mt-1 inline-block">
                        + Thêm nguyên liệu phụ
                      </button>
                    </div>
                  </div>
                ))}
                {form.skus.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant border-2 border-dashed border-outline-variant/50 rounded-xl">
                    Chưa có phân loại nào.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-center rounded-b-2xl">
          <div className="flex gap-2">
            {product && product._id && (
              <button onClick={onDelete} type="button"
                className="px-4 py-2 bg-error-container text-error rounded-lg text-sm font-bold hover:bg-error hover:text-white transition-colors">
                Xoá
              </button>
            )}
            {product && product._id && (
              <button onClick={() => onDuplicate(form)} type="button"
                className="px-4 py-2 bg-surface-container-high text-on-surface-variant border border-outline-variant/30 rounded-lg text-sm font-bold hover:bg-surface-container transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Nhân bản
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} type="button"
              className="px-5 py-2.5 rounded-lg border border-outline-variant text-sm font-bold hover:bg-surface-container transition-colors">
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:shadow-lg hover:brightness-110 transition-all disabled:opacity-70 flex items-center gap-2">
              {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : null}
              Lưu Sản Phẩm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState(null); // { type: 'add' | 'edit' | 'delete', data?: any }
  const [toast, setToast] = useState(null);
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resProd, resMat] = await Promise.all([
        productService.getProducts(),
        materialService.getMaterials()
      ]);
      if (resProd.data.success) setProducts(resProd.data.data);
      if (resMat.data.success) setMaterials(resMat.data.data);
    } catch (err) {
      showToast('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (form) => {
    try {
      if (form._id) {
        const { data } = await productService.updateProduct(form._id, form);
        if (data.success) {
          showToast('Đã cập nhật sản phẩm!');
        }
      } else {
        const { data } = await productService.createProduct(form);
        if (data.success) {
          showToast('Đã tạo sản phẩm mới!');
        }
      }
      setModal(null);
      fetchData(); // reload to get calculated costs
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await productService.deleteProduct(id);
      if (data.success) {
        setProducts(products.filter(p => p._id !== id));
        showToast('Đã xoá sản phẩm!');
        setModal(null);
      }
    } catch (err) {
      showToast('Lỗi khi xoá sản phẩm', 'error');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => {
      const matchName = p.name?.toLowerCase().includes(term);
      const matchSku = p.productId?.toLowerCase().includes(term);
      // Also check inner SKUs
      const matchInnerSku = p.skus?.some(sku => sku.sku?.toLowerCase().includes(term));
      return matchName || matchSku || matchInnerSku;
    });
  }, [products, searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {/* Modals */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <ProductModal 
          key={modal.data?.productId || modal.type}
          product={modal.data} 
          materials={materials} 
          onClose={() => setModal(null)} 
          onSave={handleSave} 
          onDelete={() => setModal({ type: 'delete', data: modal.data })} 
          onDuplicate={(form) => {
            const newForm = JSON.parse(JSON.stringify(form));
            delete newForm._id;
            delete newForm.createdAt;
            delete newForm.updatedAt;
            delete newForm.__v;
            newForm.productId = `SP-${Math.floor(1000000 + Math.random() * 9000000)}`;
            newForm.name = newForm.name + ' (Copy)';
            newForm.skus = newForm.skus.map(sku => ({ ...sku, id: `V${Math.floor(1000 + Math.random() * 9000)}` }));
            // Set modal to add with new data
            setModal({ type: 'add', data: newForm });
            showToast('Đã nhân bản dữ liệu, vui lòng lưu để hoàn tất!', 'success');
          }}
        />
      )}

      {modal?.type === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[400px] p-6 text-center animate-[modalIn_0.2s_ease-out]">
            <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-error text-[32px]">delete</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Xoá Sản Phẩm?</h3>
            <p className="text-on-surface-variant text-sm mb-6">Bạn có chắc chắn muốn xoá sản phẩm <b>{modal.data.name}</b>? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-3 w-full">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-outline-variant text-sm font-bold hover:bg-surface-container">Hủy</button>
              <button onClick={() => handleDelete(modal.data._id)} className="flex-1 px-4 py-2 rounded-lg bg-error text-white text-sm font-bold shadow-md hover:brightness-110">Xoá ngay</button>
            </div>
          </div>
        </div>
      )}

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Danh sách Sản phẩm</h2>
            <p className="text-on-surface-variant mt-1 text-[14px]">Quản lý danh mục, công thức và biến thể sản phẩm</p>
          </div>
          <button onClick={() => setModal({ type: 'add' })}
            className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Tạo mới sản phẩm</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/30">
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Tên sản phẩm / SKU</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Mã sản phẩm / SKU</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Giá vốn</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider text-right text-primary pr-8">Giá bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-lg py-md"><div className="h-4 bg-surface-container rounded w-3/4"></div></td>
                      <td className="px-lg py-md"><div className="h-4 bg-surface-container rounded w-16"></div></td>
                      <td className="px-lg py-md"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                      <td className="px-lg py-md"><div className="h-4 bg-surface-container rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-lg py-[60px] text-center text-on-surface-variant">
                      <div className="w-16 h-16 mx-auto bg-surface-container rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[32px] opacity-50">inventory_2</span>
                      </div>
                      <p className="text-[15px] font-medium">Chưa có sản phẩm nào</p>
                      <p className="text-[13px] mt-1 opacity-70">Hãy bấm "Tạo mới sản phẩm" để bắt đầu.</p>
                    </td>
                  </tr>
                ) : (
                  currentProducts.map(p => {
                    const costs = p.skus?.map(s => s.cost) || [];
                    const minCost = costs.length > 0 ? Math.min(...costs) : p.base_cost;
                    const maxCost = costs.length > 0 ? Math.max(...costs) : p.base_cost;
                    const costDisplay = minCost === maxCost ? formatPrice(minCost) : `${formatPrice(minCost)} - ${formatPrice(maxCost)}`;

                    const prices = p.skus?.map(s => s.price) || [];
                    const minPrice = prices.length > 0 ? Math.min(...prices) : p.base_price;
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : p.base_price;
                    const priceDisplay = minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

                    return (
                      <React.Fragment key={p._id}>
                        <tr onClick={() => setModal({ type: 'edit', data: p })} className="hover:bg-surface-container-low/30 transition-colors group cursor-pointer">
                          <td className="px-lg py-md">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-outline-variant/30" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-primary font-bold text-sm">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-[14px] text-on-surface">{p.name}</p>
                                <p className="text-[12px] text-on-surface-variant line-clamp-1">{p.description || 'Không có mô tả'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-lg py-md">
                            <span className="font-mono text-[13px] text-on-surface font-semibold bg-surface-container-high px-2 py-1 rounded border border-outline-variant/30 shadow-sm">
                              {p.productId}
                            </span>
                          </td>
                          <td className="px-lg py-md text-right font-mono text-[14px] text-on-surface-variant font-semibold">
                            {costDisplay}
                          </td>
                          <td className="px-lg py-md text-right font-mono text-[14px] text-primary font-bold pr-8">
                            {priceDisplay}
                          </td>
                        </tr>

                        {/* SKUs nested rows */}
                        {p.skus?.map(sku => {
                          const comboLabel = sku.combination?.map(optId => {
                            for (const g of p.variant_groups || []) {
                              const opt = g.options.find(o => o.id === optId);
                              if (opt) return opt.label;
                            }
                            return optId;
                          }).join(' - ') || 'Mặc định';

                          return (
                            <tr key={sku.id} className="bg-surface-container-low hover:bg-surface-container-low/50 transition-colors border-t border-dashed border-outline-variant/30">
                              <td className="px-lg py-sm pl-[68px]">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-outline-variant text-[16px]">subdirectory_arrow_right</span>
                                  <span className="text-[13px] text-on-surface-variant font-medium">Phân loại: <span className="text-on-surface font-semibold">{comboLabel}</span></span>
                                </div>
                              </td>
                              <td className="px-lg py-sm">
                                <span className="text-[12px] font-mono text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">{p.productId}/{sku.id}</span>
                              </td>
                              <td className="px-lg py-sm text-right font-mono text-[13px] text-on-surface-variant">
                                {formatPrice(sku.cost)}
                              </td>
                              <td className="px-lg py-sm text-right font-mono text-[13px] text-primary font-bold pr-8">
                                {formatPrice(sku.price || p.base_price || 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filteredProducts.length > 0 && (
            <div className="px-lg py-md border-t border-outline-variant/30 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
              <p className="text-on-surface-variant text-[13px]">
                Hiển thị <span className="font-bold text-on-surface">{currentProducts.length}</span> trong <span className="font-bold text-on-surface">{filteredProducts.length}</span> sản phẩm {searchTerm && `(từ ${products.length})`}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-50 text-on-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="text-[13px] font-medium text-on-surface">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-50 text-on-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
