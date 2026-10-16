import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { materialService } from '../services/materialService';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { formatPrice } from '../utils/formatPrice';
import { TAG_PRESETS, TAG_COLORS, resolveTagColor } from '../utils/productTagUtils';
import { uploadService } from '../services/uploadService';
import { getImageUrl, isManagedUploadedImage } from '../utils/imageUtils';

const getEmptyForm = () => ({
  productId: `SP-${Math.floor(1000000 + Math.random() * 9000000)}`,
  name: '',
  image: '',
  images: [],
  description: '',
  base_price: 0,
  original_price: 0,
  tag: '',
  tag_color: '',
  category: 'Nến Hũ Đơn',
  volume: '200g (~50 giờ đốt)',
  wax_type: [],
  wick_type: [],
  base_ingredients: [],
  variant_groups: [],
  skus: []
});

function ProductModal({ product, products = [], materials, onClose, onSave, onDelete, onDuplicate }) {
  const VOLUME_OPTIONS = useMemo(() => [...new Set(products.map(p => p.volume).filter(Boolean))], [products]);
  const WAX_OPTIONS = useMemo(() => [...new Set(products.flatMap(p => p.wax_type || []))], [products]);
  const WICK_OPTIONS = useMemo(() => [...new Set(products.flatMap(p => p.wick_type || []))], [products]);

  const TagInput = ({ label, id, options, value = [], onChange, placeholder = "Nhập và nhấn Enter..." }) => {
    const [inputValue, setInputValue] = useState('');
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = inputValue.trim();
        if (val && !value.includes(val)) {
          onChange([...value, val]);
        }
        setInputValue('');
      }
    };

    const removeTag = (tagToRemove) => {
      onChange(value.filter(tag => tag !== tagToRemove));
    };

    const addPreset = (tag) => {
      if (!value.includes(tag)) {
        onChange([...value, tag]);
      }
    };

    const availablePresets = options.filter(opt => !value.includes(opt));

    return (
      <div className="space-y-2">
        <label className="block text-[13px] font-bold text-stone-700">{label}</label>
        <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-stone-50/80 border border-stone-200 rounded-lg">
          {value.length === 0 ? (
            <span className="text-xs text-stone-400 italic py-1">Chưa có thông số nào được chọn</span>
          ) : (
            value.map(tag => (
              <span key={tag} className="inline-flex items-center bg-stone-800 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-xs">
                {tag}
                <button type="button" onClick={(e) => { e.preventDefault(); removeTag(tag); }} className="ml-1.5 text-stone-300 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))
          )}
        </div>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            list={`${id}-list`} 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder={placeholder} 
            className="flex-1 border border-stone-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
          />
          <button
            type="button"
            onClick={() => {
              const val = inputValue.trim();
              if (val && !value.includes(val)) {
                onChange([...value, val]);
                setInputValue('');
              }
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg transition-colors"
          >
            Thêm
          </button>
        </div>

        {availablePresets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-stone-400 font-medium">Gợi ý nhanh:</span>
            {availablePresets.slice(0, 4).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => addPreset(opt)}
                className="text-[11px] bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-md transition-colors"
              >
                + {opt}
              </button>
            ))}
          </div>
        )}

        <datalist id={`${id}-list`}>
          {options.map(opt => <option key={opt} value={opt} />)}
        </datalist>
      </div>
    );
  };

  const materialOptions = useMemo(() => materials.map(m => ({
    value: m._id,
    label: `${m.name} (${formatPrice(m.price)} / ${m.unit})`
  })), [materials]);

  const [form, setForm] = useState(() => {
    if (!product) return getEmptyForm();
    const p = JSON.parse(JSON.stringify(product));
    if (!p.productId) p.productId = `SP-${Math.floor(1000000 + Math.random() * 9000000)}`;
    if (p.tag === undefined) p.tag = '';
    if (p.tag_color === undefined) p.tag_color = '';
    if (!Array.isArray(p.images)) p.images = [];

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
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [showBatchUrlInput, setShowBatchUrlInput] = useState(false);

  // States hỗ trợ tải file ảnh lên máy chủ
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [mainImageMode, setMainImageMode] = useState('file'); // 'file' | 'url'
  const [galleryImageMode, setGalleryImageMode] = useState('file'); // 'file' | 'url'

  // Calculate dynamic costs
  const currentBaseCost = useMemo(() => {
    return (form.base_ingredients || []).reduce((total, item) => {
      const mat = materials.find(m => m._id === item.ingredient_id);
      return total + (mat ? mat.price * (Number(item.quantity) || 0) : 0);
    }, 0);
  }, [form.base_ingredients, materials]);

  const calculateSkuCost = (sku) => {
    const extraCost = (sku.extra_ingredients || []).reduce((total, item) => {
      const mat = materials.find(m => m._id === item.ingredient_id);
      return total + (mat ? mat.price * (Number(item.quantity) || 0) : 0);
    }, 0);
    return currentBaseCost + extraCost;
  };

  // Helper to generate SKUs from variants
  const handleGenerateSKUs = () => {
    if (!form.variant_groups || form.variant_groups.length === 0) return;

    const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    const optionArrays = form.variant_groups.map(g => g.options.map(o => o.id));

    let combinations = [];
    if (optionArrays.length > 0) {
      combinations = optionArrays.length === 1 ? optionArrays[0].map(id => [id]) : cartesian(...optionArrays);
    }

    const newSkus = combinations.map(combo => {
      let existingSku = form.skus.find(s => {
        if (!s.combination) return false;
        if (s.combination.length !== combo.length) return false;
        const sortedS = [...s.combination].sort();
        const sortedC = [...combo].sort();
        return JSON.stringify(sortedS) === JSON.stringify(sortedC);
      });
      
      if (existingSku) return existingSku;

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

  // Calculations for financial preview
  const estimatedProfit = (form.base_price || 0) - currentBaseCost;
  const marginPercent = (form.base_price || 0) > 0 
    ? Math.round((estimatedProfit / form.base_price) * 100) 
    : 0;
  const discountPercent = (form.original_price > form.base_price && form.original_price > 0)
    ? Math.round(((form.original_price - form.base_price) / form.original_price) * 100)
    : 0;

  // Xử lý upload ảnh chính từ máy tính
  const handleUploadMainImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa cho phép là 10MB!');
      return;
    }

    try {
      setUploadingMain(true);
      const res = await uploadService.uploadProductImage(file);
      if (res.data?.success) {
        const oldImg = form.image;
        // Nếu ảnh cũ cũng là ảnh nội bộ do upload trong phiên này và khác ảnh mới thì dọn dẹp
        if (oldImg && isManagedUploadedImage(oldImg) && oldImg !== res.data.data.path) {
          uploadService.deleteUploadedFile(oldImg).catch(err => console.warn('Lỗi dọn ảnh cũ:', err));
        }
        setForm(prev => ({ ...prev, image: res.data.data.path }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Tải ảnh lên máy chủ thất bại!');
    } finally {
      setUploadingMain(false);
      e.target.value = '';
    }
  };

  // Xử lý gỡ / xóa ảnh chính
  const handleRemoveMainImage = async () => {
    if (!form.image) return;
    const currentImg = form.image;
    setForm(prev => ({ ...prev, image: '' }));

    // Nếu ảnh là file lưu trữ nội bộ trên máy chủ, xóa file vật lý ngay
    if (isManagedUploadedImage(currentImg)) {
      try {
        await uploadService.deleteUploadedFile(currentImg);
      } catch (err) {
        console.warn('Lỗi khi xóa file vật lý trên máy chủ:', err);
      }
    }
  };

  // Xử lý upload nhiều ảnh gallery từ máy tính
  const handleUploadGalleryImages = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 10) {
      alert('Chỉ được chọn tối đa 10 ảnh mỗi lần tải lên!');
      return;
    }

    try {
      setUploadingGallery(true);
      const res = await uploadService.uploadProductImages(files);
      if (res.data?.success) {
        const newPaths = res.data.data.map(item => item.path);
        setForm(prev => ({
          ...prev,
          images: [...(prev.images || []), ...newPaths]
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Tải ảnh bộ sưu tập thất bại!');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  // Thêm ảnh gallery qua link URL
  const handleAddGalleryImage = () => {
    const url = newGalleryUrl.trim();
    if (url) {
      setForm({ ...form, images: [...(form.images || []), url] });
      setNewGalleryUrl('');
    }
  };

  // Xóa 1 ảnh khỏi gallery (đồng thời xóa file vật lý nếu là file upload nội bộ)
  const handleRemoveGalleryImage = async (idxToRemove) => {
    const imgToRemove = (form.images || [])[idxToRemove];
    setForm(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== idxToRemove)
    }));

    if (imgToRemove && isManagedUploadedImage(imgToRemove)) {
      try {
        await uploadService.deleteUploadedFile(imgToRemove);
      } catch (err) {
        console.warn('Lỗi khi xóa file gallery trên máy chủ:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-stone-200 overflow-hidden animate-[modalIn_0.25s_ease-out]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {form.image ? (
              <img src={getImageUrl(form.image)} alt="Thumbnail" className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-sm shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[24px]">local_fire_department</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-stone-900 truncate">
                  {product && product._id ? (form.name || 'Chỉnh sửa Sản phẩm') : 'Tạo Sản phẩm mới'}
                </h2>
                <span className="font-mono text-xs bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded font-bold">
                  {form.productId || 'NEW'}
                </span>
                {form.tag && (
                  <span
                    className="text-white text-[9px] font-bold tracking-wider px-2 py-0.5 uppercase rounded shadow-xs"
                    style={{ backgroundColor: resolveTagColor(form.tag, form.tag_color) }}
                  >
                    {form.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                Danh mục: <span className="font-medium text-stone-700">{form.category || 'Nến Hũ Đơn'}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar & Close button */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-stone-200/90 rounded-xl px-3.5 py-1.5 shadow-xs">
              <div className="text-left border-r border-stone-100 pr-3">
                <span className="block text-[10px] uppercase font-bold text-stone-400">Giá vốn (BOM)</span>
                <span className="text-xs font-bold text-stone-800">{formatPrice(currentBaseCost)}</span>
              </div>
              <div className="text-left pl-1">
                <span className="block text-[10px] uppercase font-bold text-stone-400">Giá bán cơ bản</span>
                <span className="text-xs font-bold text-primary">{formatPrice(form.base_price || 0)}</span>
              </div>
              {marginPercent > 0 && (
                <span className="ml-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Lãi {marginPercent}%
                </span>
              )}
            </div>

            <button 
              onClick={onClose} 
              aria-label="Đóng"
              className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-white gap-2 pt-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'basic', label: 'Thông tin chung', icon: 'info' },
            { id: 'base_ingredients', label: 'Công thức gốc (BOM)', icon: 'science', count: (form.base_ingredients || []).length },
            { id: 'variants', label: 'Nhóm phân loại', icon: 'tune', count: (form.variant_groups || []).length },
            { id: 'skus', label: 'Danh sách phân loại (SKU)', icon: 'inventory_2', count: (form.skus || []).length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-3.5 text-[13px] font-bold transition-all border-b-2 whitespace-nowrap ${
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-stone-400'}`}>
                  {tab.icon}
                </span>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[11px] px-2 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/60 custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* Card 1: Định danh & Danh mục */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Nhận diện & Phân loại sản phẩm</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Tên sản phẩm *</label>
                    <input 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      required
                      className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-[15px] font-medium bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                      placeholder="Ví dụ: Nến thơm Matcha & My Muse" 
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Mã sản phẩm (SKU) *</label>
                    <input 
                      value={form.productId} 
                      onChange={e => setForm({ ...form, productId: e.target.value.toUpperCase() })} 
                      required
                      className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-[14px] font-mono font-bold uppercase bg-stone-50 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                      placeholder="VD: CANDMAT" 
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Danh mục sản phẩm</label>
                    <select 
                      value={form.category || 'Nến Hũ Đơn'} 
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                    >
                      <option value="Nến Hũ Đơn">Nến Hũ Đơn</option>
                      <option value="Tinh Dầu Khuếch Tán">Tinh Dầu Khuếch Tán</option>
                      <option value="Bộ Quà Tặng Giftset">Bộ Quà Tặng Giftset</option>
                      <option value="Phụ Kiện Chăm Sóc Nến">Phụ Kiện Chăm Sóc Nến</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Dung tích & Thời gian cháy</label>
                    <input 
                      type="text" 
                      list="volume-list" 
                      value={form.volume || ''} 
                      onChange={e => setForm({ ...form, volume: e.target.value })}
                      placeholder="VD: 200g (~50 giờ đốt)"
                      className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs" 
                    />
                    <datalist id="volume-list">
                      {VOLUME_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Card 2: Thiết lập Giá bán & Khuyến mãi */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                    <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Thiết lập Giá bán & Khuyến mãi</h3>
                  </div>
                  {discountPercent > 0 && (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[14px]">local_offer</span>
                      Đang giảm {discountPercent}% so với giá gốc
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                    <label className="block text-[13px] font-bold text-stone-800 mb-1">Giá bán cơ bản (VNĐ) *</label>
                    <p className="text-[11px] text-stone-400 mb-2">Giá hiển thị thực tế khách hàng mua</p>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0" 
                        value={form.base_price || ''} 
                        onChange={e => setForm({ ...form, base_price: Number(e.target.value) })} 
                        required
                        className="w-full border border-stone-200 rounded-lg pl-3.5 pr-10 py-2 text-[15px] font-bold text-primary bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                        placeholder="304000" 
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">đ</span>
                    </div>
                  </div>

                  <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                    <label className="block text-[13px] font-bold text-stone-800 mb-1">Giá gốc niêm yết (Gạch bỏ)</label>
                    <p className="text-[11px] text-stone-400 mb-2">Tạo hiệu ứng giảm giá (để trống nếu ko có)</p>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0" 
                        value={form.original_price || ''} 
                        onChange={e => setForm({ ...form, original_price: Number(e.target.value) })}
                        className="w-full border border-stone-200 rounded-lg pl-3.5 pr-10 py-2 text-[15px] font-semibold text-stone-500 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs line-through"
                        placeholder="364800" 
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">đ</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Ước tính lợi nhuận</span>
                      <p className="text-lg font-bold text-stone-900 mt-1">{formatPrice(estimatedProfit)}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-amber-200/50">
                      <span>Tỷ suất lợi nhuận:</span>
                      <span className="font-bold text-stone-800">{marginPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Huy hiệu & Nhãn nổi bật (Badge) */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-700 text-[20px]">bookmark</span>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Huy hiệu & Nhãn nổi bật sản phẩm (Tag Badge)</h3>
                      <p className="text-xs text-stone-400">Gắn các nhãn nổi bật như "Top Bán Chạy", "Mới Ra Mắt" để tăng tỉ lệ click</p>
                    </div>
                  </div>
                  {form.tag && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tag: '', tag_color: '' })}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span> Gỡ nhãn
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div>
                  <p className="text-xs text-stone-500 font-medium mb-2">Chọn nhanh các nhãn mẫu thịnh hành:</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_PRESETS.map(preset => {
                      const isSelected = (form.tag || '').trim().toLowerCase() === preset.text.toLowerCase();
                      return (
                        <button
                          key={preset.text}
                          type="button"
                          onClick={() => setForm({ ...form, tag: preset.text, tag_color: preset.color })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'border-stone-800 bg-stone-900 text-white shadow-sm ring-2 ring-stone-400/40 scale-[1.02]'
                              : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: preset.color }} />
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Tag Input + Color Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Tên nhãn tùy chỉnh</label>
                    <input
                      type="text"
                      value={form.tag || ''}
                      onChange={e => setForm({ ...form, tag: e.target.value })}
                      placeholder="Nhập tên tag hoặc chọn ở trên (VD: Hương Mùa Thu, Best Seller...)"
                      className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Màu sắc huy hiệu</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg p-1.5">
                        {TAG_COLORS.map(c => (
                          <button
                            key={c.hex}
                            type="button"
                            title={c.name}
                            onClick={() => setForm({ ...form, tag_color: c.hex })}
                            className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                              (form.tag_color || '').toLowerCase() === c.hex.toLowerCase()
                                ? 'scale-110 ring-2 ring-stone-900 ring-offset-1 shadow-sm'
                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {(form.tag_color || '').toLowerCase() === c.hex.toLowerCase() && (
                              <span className="material-symbols-outlined text-white text-[14px]">check</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={form.tag_color || ''}
                        onChange={e => setForm({ ...form, tag_color: e.target.value })}
                        placeholder="#DC2626"
                        className="w-24 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-center bg-white uppercase focus:outline-none focus:border-primary shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200/90 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-stone-400">visibility</span>
                    <span className="text-xs font-bold text-stone-600">Xem trước hiển thị trên ảnh sản phẩm:</span>
                  </div>
                  {form.tag ? (
                    <span
                      className="text-white text-[9px] font-bold tracking-widest px-2.5 py-1 uppercase rounded-sm shadow-sm"
                      style={{ backgroundColor: resolveTagColor(form.tag, form.tag_color) }}
                    >
                      {form.tag}
                    </span>
                  ) : (
                    <span className="text-xs italic text-stone-400">Không hiển thị huy hiệu (chưa đặt tag)</span>
                  )}
                </div>
              </div>

              {/* Card 4: Hình ảnh & Bộ sưu tập Gallery */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">photo_library</span>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Hình ảnh sản phẩm (Media & Gallery)</h3>
                      <p className="text-xs text-stone-400">Tải tệp ảnh trực tiếp từ máy tính lên máy chủ hosting hoặc dán liên kết URL</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBatchUrlInput(!showBatchUrlInput)}
                    className="text-xs text-stone-500 hover:text-stone-800 font-semibold flex items-center gap-1 underline self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                    {showBatchUrlInput ? 'Thu gọn nhập văn bản hàng loạt' : 'Nhập hàng loạt bằng văn bản'}
                  </button>
                </div>

                {/* Phần 1: Ảnh đại diện chính (Cover Image) */}
                <div className="bg-stone-50/60 p-4 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-stone-800">1. Ảnh đại diện chính (Cover Image) *</span>
                      {form.image && isManagedUploadedImage(form.image) && (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="material-symbols-outlined text-[12px]">cloud_done</span> Tệp trên máy chủ
                        </span>
                      )}
                    </div>
                    {/* Toggle Mode: File vs URL */}
                    <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setMainImageMode('file')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                          mainImageMode === 'file'
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">upload_file</span> Tải từ máy tính
                      </button>
                      <button
                        type="button"
                        onClick={() => setMainImageMode('url')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                          mainImageMode === 'url'
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">link</span> Dán link URL
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Khung xem trước ảnh đại diện */}
                    <div className="md:col-span-4 flex justify-center">
                      <div className="relative w-40 h-40 rounded-xl bg-white border-2 border-stone-200 overflow-hidden shadow-xs group flex items-center justify-center">
                        {form.tag && (
                          <div
                            className="absolute top-2 left-2 text-white text-[9px] font-bold tracking-widest px-2 py-0.5 uppercase z-20 rounded shadow-xs"
                            style={{ backgroundColor: resolveTagColor(form.tag, form.tag_color) }}
                          >
                            {form.tag}
                          </div>
                        )}
                        {form.image ? (
                          <>
                            <img
                              src={getImageUrl(form.image)}
                              alt="Ảnh đại diện chính"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={handleRemoveMainImage}
                                title="Xóa ảnh chính này (xóa file trên máy chủ nếu là ảnh tải lên)"
                                className="w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-md transition-transform hover:scale-110"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-3 text-stone-400">
                            <span className="material-symbols-outlined text-[36px] block opacity-40 mb-1">image_not_supported</span>
                            <span className="text-[11px] font-medium">Chưa có ảnh</span>
                          </div>
                        )}
                        {uploadingMain && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-30">
                            <span className="material-symbols-outlined animate-spin text-primary text-[28px]">progress_activity</span>
                            <span className="text-[11px] font-bold text-stone-700">Đang tải lên...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vùng tương tác: File Dropzone hoặc URL Input */}
                    <div className="md:col-span-8 space-y-3">
                      {mainImageMode === 'file' ? (
                        <div>
                          <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-primary bg-white hover:bg-primary/5 rounded-xl p-5 cursor-pointer transition-all group">
                            <span className="material-symbols-outlined text-[36px] text-stone-400 group-hover:text-primary transition-colors mb-1">
                              cloud_upload
                            </span>
                            <span className="text-xs font-bold text-stone-700 group-hover:text-primary">
                              Nhấn để chọn ảnh từ thiết bị
                            </span>
                            <span className="text-[11px] text-stone-400 mt-0.5">
                              Hỗ trợ JPG, PNG, WEBP, GIF, AVIF (Tối đa 10MB)
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                              onChange={handleUploadMainImage}
                              disabled={uploadingMain}
                              className="hidden"
                            />
                          </label>

                          {form.image && (
                            <div className="mt-2.5 flex items-center justify-between bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                                <span className="truncate font-mono text-stone-600 text-[11px]">{form.image}</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveMainImage}
                                className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-0.5 hover:underline shrink-0"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span> Gỡ bỏ
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-stone-600">Đường dẫn URL ảnh trực tuyến:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={form.image}
                              onChange={e => setForm({ ...form, image: e.target.value })}
                              placeholder="https://example.com/candle-image.jpg"
                              className="flex-1 border border-stone-200 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs font-mono"
                            />
                            {form.image && (
                              <button
                                type="button"
                                onClick={handleRemoveMainImage}
                                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span> Xóa
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400">
                            Dán liên kết ảnh từ trang web ngoài hoặc CDN.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phần 2: Bộ sưu tập ảnh chi tiết (Gallery Images) */}
                <div className="bg-stone-50/60 p-4 rounded-xl border border-stone-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-stone-800">
                        2. Bộ sưu tập ảnh chi tiết ({(form.images || []).length} ảnh)
                      </span>
                      <span className="text-xs text-stone-400">(Ảnh nắp, nhãn, góc chụp khác...)</span>
                    </div>

                    {/* Toggle Mode: Upload vs Add URL */}
                    <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 text-xs font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setGalleryImageMode('file')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                          galleryImageMode === 'file'
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">upload_file</span> Tải tệp từ máy
                      </button>
                      <button
                        type="button"
                        onClick={() => setGalleryImageMode('url')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                          galleryImageMode === 'url'
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">link</span> Thêm qua URL
                      </button>
                    </div>
                  </div>

                  {/* Input khu vực Gallery */}
                  {galleryImageMode === 'file' ? (
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-stone-200">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                        <span>Chọn ảnh từ máy tính (Có thể chọn nhiều ảnh)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={handleUploadGalleryImages}
                          disabled={uploadingGallery}
                          className="hidden"
                        />
                      </label>
                      {uploadingGallery && (
                        <div className="flex items-center gap-2 text-xs font-bold text-primary animate-pulse">
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          <span>Đang tải các ảnh lên máy chủ...</span>
                        </div>
                      )}
                      <span className="text-[11px] text-stone-400">
                        Tải lên tối đa 10 ảnh mỗi lần (tự động tối ưu định dạng)
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newGalleryUrl}
                        onChange={e => setNewGalleryUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGalleryImage(); } }}
                        placeholder="Dán đường dẫn link ảnh phụ vào đây rồi nhấn Thêm..."
                        className="flex-1 border border-stone-200 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddGalleryImage}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span> Thêm ảnh
                      </button>
                    </div>
                  )}

                  {/* Lưới hiển thị Thumbnails của Bộ sưu tập */}
                  {(form.images || []).length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-3 bg-white rounded-xl border border-stone-200">
                      {form.images.map((imgUrl, idx) => {
                        const isManaged = isManagedUploadedImage(imgUrl);
                        return (
                          <div key={idx} className="relative aspect-square rounded-lg bg-stone-50 border border-stone-200 overflow-hidden group shadow-xs">
                            <img
                              src={getImageUrl(imgUrl)}
                              alt={`Gallery ${idx}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Badge chỉ rõ ảnh nội bộ */}
                            {isManaged && (
                              <div
                                title="Ảnh đã tải lên"
                                className="absolute bottom-1 left-1 bg-stone-900/80 text-white rounded p-0.5 text-[9px] flex items-center pointer-events-none"
                              >
                                <span className="material-symbols-outlined text-[11px]">dns</span>
                              </div>
                            )}
                            {/* Action Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                              <button
                                type="button"
                                title="Đặt làm ảnh chính"
                                onClick={() => setForm({ ...form, image: imgUrl })}
                                className="w-7 h-7 rounded-full bg-white text-stone-800 hover:bg-amber-100 flex items-center justify-center shadow-md transition-transform hover:scale-110"
                              >
                                <span className="material-symbols-outlined text-[14px]">star</span>
                              </button>
                              <button
                                type="button"
                                title="Xóa ảnh này (xóa file trên máy chủ nếu là ảnh tải lên)"
                                onClick={() => handleRemoveGalleryImage(idx)}
                                className="w-7 h-7 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-md transition-transform hover:scale-110"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-stone-300">
                      <span className="material-symbols-outlined text-stone-300 text-[32px] block mb-1">collections</span>
                      <p className="text-xs text-stone-500 font-medium">Chưa có ảnh phụ trong bộ sưu tập</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">Bấm "Chọn ảnh từ máy tính" ở trên để tải thêm ảnh chi tiết cho sản phẩm</p>
                    </div>
                  )}

                  {/* Raw textarea editor (toggleable) */}
                  {showBatchUrlInput && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        Biên tập danh sách link ảnh trực tiếp (mỗi dòng 1 ảnh):
                      </label>
                      <textarea
                        value={(form.images || []).join('\n')}
                        onChange={e => setForm({ ...form, images: e.target.value.split('\n').map(l => l.trim()).filter(Boolean) })}
                        rows="3"
                        className="w-full border border-stone-200 rounded-lg px-3.5 py-2 text-xs font-mono bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="/uploads/products/...&#10;https://..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card 5: Đặc tính sáp, bấc & mô tả */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Quy cách & Mô tả chi tiết</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <TagInput 
                    label="Loại Sáp Sử Dụng" 
                    id="wax" 
                    options={WAX_OPTIONS} 
                    value={form.wax_type || []} 
                    onChange={newVal => setForm({ ...form, wax_type: newVal })} 
                  />
                  <TagInput 
                    label="Loại Bấc Nến" 
                    id="wick" 
                    options={WICK_OPTIONS} 
                    value={form.wick_type || []} 
                    onChange={newVal => setForm({ ...form, wick_type: newVal })} 
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-[13px] font-bold text-stone-700 mb-1.5">Mô tả sản phẩm</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    rows="3"
                    className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                    placeholder="Mô tả cảm hứng nốt hương, độ tỏa hương, thông điệp ẩn bên trong hũ nến..." 
                  />
                </div>
              </div>

            </div>
          )}

          {activeTab === 'base_ingredients' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Công thức gốc áp dụng cho tất cả phân loại (BOM)</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Tổng giá vốn nguyên liệu gốc: <span className="font-bold text-primary">{formatPrice(currentBaseCost)}</span>
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setForm({ ...form, base_ingredients: [{ ingredient_id: '', quantity: 1 }, ...form.base_ingredients] })}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shadow-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> Thêm nguyên liệu
                </button>
              </div>

              <div className="space-y-2.5">
                {form.base_ingredients.map((item, idx) => {
                  const selectedMat = materials.find(m => m._id === item.ingredient_id);
                  const lineTotal = selectedMat ? selectedMat.price * (Number(item.quantity) || 0) : 0;
                  
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-xs">
                      <div className="flex-1 min-w-0 w-full">
                        <SearchableSelect
                          options={materialOptions.filter(m => m.value === item.ingredient_id || !form.base_ingredients.some(b => b.ingredient_id === m.value))}
                          value={item.ingredient_id}
                          onChange={(val) => {
                            const newArr = [...form.base_ingredients];
                            newArr[idx].ingredient_id = val;
                            setForm({ ...form, base_ingredients: newArr });
                          }}
                          placeholder="-- Chọn nguyên liệu sản xuất --"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="w-[120px]">
                          <div className="relative">
                            <input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={item.quantity} 
                              onChange={e => {
                                const newArr = [...form.base_ingredients];
                                newArr[idx].quantity = Number(e.target.value);
                                setForm({ ...form, base_ingredients: newArr });
                              }}
                              className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:border-primary" 
                              placeholder="SL" 
                            />
                            {selectedMat?.unit && (
                              <span className="absolute right-2.5 top-2 text-[11px] font-bold text-stone-400 uppercase">
                                {selectedMat.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-[110px] text-right font-bold text-xs text-stone-700">
                          {formatPrice(lineTotal)}
                        </div>
                        <button 
                          onClick={() => {
                            const newArr = [...form.base_ingredients];
                            newArr.splice(idx, 1);
                            setForm({ ...form, base_ingredients: newArr });
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {form.base_ingredients.length === 0 && (
                  <div className="text-center py-12 text-stone-400 bg-white border-2 border-dashed border-stone-200 rounded-xl">
                    <span className="material-symbols-outlined text-[36px] block opacity-40 mb-1">science</span>
                    <p className="text-sm font-medium">Chưa có nguyên liệu nào trong công thức gốc</p>
                    <p className="text-xs mt-1">Bấm nút "+ Thêm nguyên liệu" để thêm sáp, bấc, tinh dầu hoặc hũ đựng.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Thiết lập các nhóm phân loại thuộc tính</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Tạo các thuộc tính lựa chọn như Mùi hương, Kích cỡ hũ, Đóng gói quà...</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setForm({ ...form, variant_groups: [...form.variant_groups, { id: `g${form.variant_groups.length + 1}`, name: '', options: [] }] })}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> Thêm nhóm phân loại
                </button>
              </div>

              <div className="space-y-4">
                {form.variant_groups.map((group, gIdx) => (
                  <div key={gIdx} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-stone-50/80 px-4 py-3 border-b border-stone-200 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-stone-400 uppercase">Nhóm #{gIdx + 1}:</span>
                        <input 
                          value={group.name} 
                          onChange={e => {
                            const newGroups = [...form.variant_groups];
                            newGroups[gIdx].name = e.target.value;
                            setForm({ ...form, variant_groups: newGroups });
                          }}
                          placeholder="Nhập tên nhóm (VD: Mùi hương, Kích cỡ)"
                          className="font-bold text-sm bg-transparent border-b border-stone-300 focus:border-primary focus:outline-none px-1 py-0.5 flex-1 max-w-sm" 
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newGroups = [...form.variant_groups];
                          newGroups.splice(gIdx, 1);
                          setForm({ ...form, variant_groups: newGroups });
                        }} 
                        className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-0.5 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span> Xóa nhóm
                      </button>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Các tùy chọn lựa chọn:</p>
                      {group.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2.5 items-center">
                          <input 
                            value={opt.id} 
                            onChange={e => {
                              const newGroups = [...form.variant_groups];
                              newGroups[gIdx].options[oIdx].id = e.target.value;
                              setForm({ ...form, variant_groups: newGroups });
                            }}
                            placeholder="Mã (VD: RBY)" 
                            className="w-[100px] text-xs font-mono font-bold uppercase border border-stone-200 rounded-lg px-2.5 py-1.5 bg-stone-50" 
                          />
                          <input 
                            value={opt.label} 
                            onChange={e => {
                              const newGroups = [...form.variant_groups];
                              newGroups[gIdx].options[oIdx].label = e.target.value;
                              setForm({ ...form, variant_groups: newGroups });
                            }}
                            placeholder="Tên tùy chọn (VD: Rosy Berry)" 
                            className="flex-1 text-xs border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary" 
                          />
                          <button 
                            onClick={() => {
                              const newGroups = [...form.variant_groups];
                              newGroups[gIdx].options.splice(oIdx, 1);
                              setForm({ ...form, variant_groups: newGroups });
                            }} 
                            className="text-stone-400 hover:text-red-600 p-1"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      ))}

                      <button 
                        onClick={() => {
                          const newGroups = [...form.variant_groups];
                          newGroups[gIdx].options.push({ id: `${group.id}-opt${newGroups[gIdx].options.length + 1}`, label: '' });
                          setForm({ ...form, variant_groups: newGroups });
                        }} 
                        className="text-xs text-primary font-bold hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span> Thêm tùy chọn biến thể
                      </button>
                    </div>
                  </div>
                ))}

                {form.variant_groups.length === 0 && (
                  <div className="text-center py-12 text-stone-400 bg-white border-2 border-dashed border-stone-200 rounded-xl">
                    <span className="material-symbols-outlined text-[36px] block opacity-40 mb-1">tune</span>
                    <p className="text-sm font-medium">Sản phẩm này chưa có nhóm phân loại nào</p>
                    <p className="text-xs mt-1">Nếu nến có nhiều mùi hương hoặc kích cỡ, bấm "+ Thêm nhóm phân loại".</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'skus' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Danh sách các mã phân loại SKU ({form.skus.length} SKU)</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Mỗi SKU có thể cài giá bán và nguyên liệu phụ riêng biệt</p>
                </div>
                <button 
                  type="button" 
                  onClick={handleGenerateSKUs}
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shadow-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Tự động tạo phân loại từ Nhóm
                </button>
              </div>

              <div className="space-y-3.5">
                {form.skus.map((sku, sIdx) => {
                  const skuCost = calculateSkuCost(sku);
                  const skuProfit = (sku.price || 0) - skuCost;
                  const skuMargin = (sku.price || 0) > 0 ? Math.round((skuProfit / sku.price) * 100) : 0;

                  return (
                    <div key={sIdx} className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
                      <div className="bg-stone-50/80 px-4 py-2.5 border-b border-stone-200 flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-2.5">
                          <input 
                            value={sku.id} 
                            onChange={e => {
                              const newSkus = [...form.skus];
                              newSkus[sIdx].id = e.target.value.toUpperCase();
                              setForm({ ...form, skus: newSkus });
                            }}
                            className="font-mono text-xs font-bold text-stone-800 border border-stone-300 rounded px-2 py-0.5 focus:border-primary focus:outline-none w-[110px] bg-white" 
                            placeholder="Mã SKU"
                          />
                          <div className="flex flex-wrap gap-1">
                            {sku.combination.map(c => (
                              <span key={c} className="bg-stone-200/80 px-2 py-0.5 rounded text-[11px] font-bold text-stone-700">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right border-r border-stone-200 pr-3">
                            <p className="text-[10px] text-stone-400 font-bold uppercase">Giá vốn SKU</p>
                            <p className="text-xs font-bold text-stone-700">{formatPrice(skuCost)}</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[10px] text-primary font-bold uppercase mb-0.5">Giá bán</p>
                            <div className="flex items-center gap-1">
                              <input 
                                type="number" 
                                min="0" 
                                value={sku.price} 
                                onChange={e => {
                                  const newSkus = [...form.skus];
                                  newSkus[sIdx].price = Number(e.target.value);
                                  setForm({ ...form, skus: newSkus });
                                }} 
                                className="w-[95px] text-right font-bold text-xs text-primary border border-stone-300 rounded px-2 py-0.5 focus:border-primary focus:outline-none bg-white" 
                                placeholder="0" 
                              />
                              <span className="text-xs text-stone-400 font-bold">đ</span>
                            </div>
                          </div>

                          {skuMargin > 0 && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Lãi {skuMargin}%
                            </span>
                          )}

                          <button 
                            onClick={() => {
                              const newSkus = [...form.skus];
                              newSkus.splice(sIdx, 1);
                              setForm({ ...form, skus: newSkus });
                            }} 
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded transition-colors"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>

                      {/* Extra Ingredients for SKU */}
                      <div className="p-3.5 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                            Nguyên liệu bổ sung riêng cho SKU này (nếu có):
                          </p>
                          <button 
                            onClick={() => {
                              const newSkus = [...form.skus];
                              newSkus[sIdx].extra_ingredients.push({ ingredient_id: '', quantity: 1 });
                              setForm({ ...form, skus: newSkus });
                            }} 
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[15px]">add</span> Thêm nguyên liệu phụ
                          </button>
                        </div>

                        {sku.extra_ingredients && sku.extra_ingredients.length > 0 ? (
                          <div className="space-y-2">
                            {sku.extra_ingredients.map((item, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <div className="flex-1 min-w-[220px]">
                                  <SearchableSelect
                                    options={materialOptions.filter(m => m.value === item.ingredient_id || (!form.base_ingredients.some(b => b.ingredient_id === m.value) && !sku.extra_ingredients.some(e => e.ingredient_id === m.value)))}
                                    value={item.ingredient_id}
                                    onChange={(val) => {
                                      const newSkus = [...form.skus];
                                      newSkus[sIdx].extra_ingredients[idx].ingredient_id = val;
                                      setForm({ ...form, skus: newSkus });
                                    }}
                                    className="border border-stone-200"
                                    placeholder="-- Chọn nguyên liệu phụ --"
                                  />
                                </div>
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  value={item.quantity} 
                                  onChange={e => {
                                    const newSkus = [...form.skus];
                                    newSkus[sIdx].extra_ingredients[idx].quantity = Number(e.target.value);
                                    setForm({ ...form, skus: newSkus });
                                  }}
                                  className="w-[80px] text-xs border border-stone-200 rounded-lg px-2.5 py-1.5" 
                                  placeholder="SL" 
                                />
                                <button 
                                  onClick={() => {
                                    const newSkus = [...form.skus];
                                    newSkus[sIdx].extra_ingredients.splice(idx, 1);
                                    setForm({ ...form, skus: newSkus });
                                  }} 
                                  className="text-stone-400 hover:text-red-600 p-1"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">Không có nguyên liệu phụ riêng (chỉ dùng công thức gốc BOM).</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {form.skus.length === 0 && (
                  <div className="text-center py-12 text-stone-400 bg-white border-2 border-dashed border-stone-200 rounded-xl">
                    <span className="material-symbols-outlined text-[36px] block opacity-40 mb-1">inventory_2</span>
                    <p className="text-sm font-medium">Chưa có mã phân loại nào</p>
                    <p className="text-xs mt-1">Bấm "Tự động tạo phân loại từ Nhóm" ở trên để hệ thống tự động sinh các tổ hợp.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-white flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-2">
            {product && product._id && (
              <button 
                onClick={onDelete} 
                type="button"
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span> Xoá sản phẩm
              </button>
            )}
            {product && product._id && (
              <button 
                onClick={() => onDuplicate(form)} 
                type="button"
                className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span> Nhân bản
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              type="button"
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
            >
              Đóng
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              )}
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
  const [expandedProducts, setExpandedProducts] = useState({});
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

  const toggleExpand = (e, productId) => {
    e.stopPropagation();
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
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
          products={products}
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
                                <img src={getImageUrl(p.image)} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-outline-variant/30" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-primary font-bold text-sm">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-[14px] text-on-surface">{p.name}</p>
                                  {p.tag && (
                                    <span
                                      className="text-white text-[9px] font-bold tracking-wider px-2 py-0.5 uppercase rounded-sm shadow-xs"
                                      style={{ backgroundColor: resolveTagColor(p.tag, p.tag_color) }}
                                    >
                                      {p.tag}
                                    </span>
                                  )}
                                </div>
                                {p.skus?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleExpand(e, p._id)}
                                    className="flex items-center gap-1 mt-0.5 text-[12px] font-semibold text-primary transition-all group/btn"
                                  >
                                    <span className="group-hover/btn:underline underline-offset-2">
                                      {expandedProducts[p._id] ? 'Thu gọn' : `Xem chi tiết ${p.skus.length} phân loại`}
                                    </span>
                                    <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${expandedProducts[p._id] ? 'rotate-180' : ''}`}>
                                      expand_more
                                    </span>
                                  </button>
                                )}
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

                        {/* SKUs toggle row removed - moved inline */}

                        {/* SKUs nested rows */}
                        {expandedProducts[p._id] && p.skus?.map(sku => {
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
