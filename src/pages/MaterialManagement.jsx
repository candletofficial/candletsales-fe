import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { materialService } from '../services/materialService';
import { formatPrice } from '../utils/formatPrice';

// ── Helpers ────────────────────────────────────────────────────────
const STATUS_MAP = {
  in_stock: { label: 'Còn hàng', className: 'bg-primary-container text-on-primary-container' },
  low_stock: { label: 'Sắp hết', className: 'bg-error-container text-on-error-container' },
  out_of_stock: { label: 'Hết hàng', className: 'bg-surface-container-highest text-on-surface-variant' },
};

const UNIT_ICON_MAP = {
  'Hũ': 'experiment',
  'Cốc': 'local_cafe',
  'Hộp': 'inventory_2',
  'Cái': 'view_agenda',
  'Chiếc': 'view_agenda',
  'Kg': 'scale',
  'Gam': 'scale',
  'Ml': 'water_drop',
  'Lít': 'water_drop',
  'Cuộn': 'texture',
  'Mét': 'straighten',
  'Túi': 'shopping_bag',
};

const EMPTY_FORM = { name: '', sku: '', unit: '', price: '', supplier: '', stock: '', minStock: '10' };

// ── Modal Thêm/Sửa ────────────────────────────────────────────────
function MaterialModal({ material, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(material ? { ...material, price: material.price, stock: material.stock, minStock: material.minStock || 10 } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!material;

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), minStock: Number(form.minStock) };
      if (isEdit) {
        await materialService.updateMaterial(material._id, payload);
      } else {
        await materialService.createMaterial(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[640px] mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 flex-shrink-0">
          <h3 className="text-[20px] font-bold text-on-surface">
            {isEdit ? 'Chỉnh sửa nguyên vật liệu' : 'Thêm mới nguyên vật liệu'}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container p-1 rounded-md transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form id="material-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Row 1 */}
            <div className="col-span-2">
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Tên nguyên vật liệu</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="VD: Vải Cotton 100%" />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Đơn vị tính</label>
              <div className="relative">
                <select name="unit" value={form.unit} onChange={handleChange} required
                  className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none">
                  <option value="" disabled hidden>Chọn đơn vị</option>
                  <option value="Hũ">Hũ</option>
                  <option value="Cốc">Cốc</option>
                  <option value="Hộp">Hộp</option>
                  <option value="Cái">Cái</option>
                  <option value="Chiếc">Chiếc</option>
                  <option value="Kg">Kg</option>
                  <option value="Gam">Gam</option>
                  <option value="Ml">Ml</option>
                  <option value="Lít">Lít</option>
                  <option value="Cuộn">Cuộn</option>
                  <option value="Mét">Mét</option>
                  <option value="Túi">Túi</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Đơn giá nhập</label>
              <div className="relative">
                <input name="price" type="number" value={form.price} onChange={handleChange} required min="0"
                  className="w-full border border-outline-variant rounded-lg pl-4 pr-12 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="0" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[15px] font-medium">VNĐ</span>
              </div>
            </div>

            {/* Row 3 */}
            <div className="col-span-2">
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Nhà cung cấp</label>
              <input name="supplier" value={form.supplier} onChange={handleChange} required
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Nhập tên nhà cung cấp" />
            </div>

            {/* Row 4 */}
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Số lượng tồn ban đầu</label>
              <input name="stock" type="number" step="any" value={form.stock} onChange={handleChange} required min="0"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Mức nhắc tồn (Tối thiểu)</label>
              <input name="minStock" type="number" step="any" value={form.minStock} onChange={handleChange} required min="0"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="10" />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-between items-center rounded-b-xl flex-shrink-0">
          <div>
            {isEdit && (
              <button type="button" onClick={onDelete}
                className="px-4 py-2 bg-error-container text-error rounded-lg text-[15px] font-semibold hover:bg-error hover:text-white transition-colors">
                Xóa nguyên liệu
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-on-surface-variant text-[15px] font-medium hover:bg-surface-container rounded-lg transition-colors">
              Hủy
            </button>
            <button type="submit" form="material-form" disabled={loading}
              className="px-6 py-2.5 bg-primary text-white text-[15px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-sm border border-primary">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Lưu thông tin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Xác nhận xóa ────────────────────────────────────────────
function DeleteModal({ material, onClose, onConfirm, loading, error }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-error">delete_forever</span>
        </div>
        <h3 className="text-[17px] font-bold text-on-surface mb-1">Xác nhận xóa</h3>
        <p className={`text-sm text-on-surface-variant ${error ? 'mb-4' : 'mb-6'}`}>
          Bạn có chắc muốn xóa <span className="font-semibold text-on-surface">"{material.name}"</span> không? Hành động này không thể hoàn tác.
        </p>

        {error && (
          <div className="w-full bg-error-container/40 text-error border border-error/20 p-3 rounded-lg text-[13px] font-semibold text-left mb-6 flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] mt-0.5">warning</span>
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-center gap-3 w-full mt-2">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container">
            Hủy
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-5 py-2 rounded-lg bg-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xóa nguyên liệu
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Component chính ───────────────────────────────────────────────
export default function MaterialManagement() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState(null); // null | { type: 'add' | 'edit' | 'delete', data?: {} }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState(null);
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMaterials = useCallback(() => {
    setLoading(true);
    materialService.getMaterials()
      .then((res) => setMaterials(res.data.data))
      .catch(() => showToast('Không thể tải dữ liệu nguyên liệu', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleSave = () => {
    setModal(null);
    setActionError('');
    showToast(modal?.type === 'edit' ? 'Đã cập nhật nguyên liệu' : 'Đã tạo nguyên liệu mới');
    fetchMaterials();
  };

  const handleDelete = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await materialService.deleteMaterial(modal.data._id);
      showToast('Đã xóa nguyên liệu');
      setModal(null);
      fetchMaterials();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  // Tính stats từ dữ liệu thực
  const stats = {
    total: materials.length,
    low_stock: materials.filter((m) => m.status === 'low_stock' || m.status === 'out_of_stock').length,
    totalValue: materials.reduce((sum, m) => {
      const activeStock = m.actualStock !== null && m.actualStock !== undefined ? m.actualStock : m.stock;
      return sum + (m.price * activeStock);
    }, 0),
    discrepancyValue: materials.reduce((sum, m) => {
      const diff = (m.actualStock ?? m.stock) - m.stock;
      return sum + (m.price * diff);
    }, 0),
  };

  // Filter theo tab & search
  const filtered = materials.filter((m) => {
    if (activeTab === 'in_stock' && m.status !== 'in_stock') return false;
    if (activeTab === 'low_stock' && m.status !== 'low_stock' && m.status !== 'out_of_stock') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(term);
      const matchSku = m.sku?.toLowerCase().includes(term);
      if (!matchName && !matchSku) return false;
    }

    return true;
  });

  const TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'in_stock', label: 'Còn hàng' },
    { key: 'low_stock', label: 'Sắp hết' },
  ];

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentMaterials = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'
          }`}>
          {toast.message}
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'add' && (
        <MaterialModal onClose={() => { setModal(null); setActionError(''); }} onSave={handleSave} />
      )}
      {modal?.type === 'edit' && (
        <MaterialModal material={modal.data} onClose={() => { setModal(null); setActionError(''); }} onSave={handleSave} onDelete={() => { setModal({ type: 'delete', data: modal.data }); setActionError(''); }} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal material={modal.data} onClose={() => { setModal(null); setActionError(''); }} onConfirm={handleDelete} loading={actionLoading} error={actionError} />
      )}

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Danh sách Nguyên vật liệu</h2>
          </div>
          <button
            onClick={() => setModal({ type: 'add' })}
            className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Tạo mới nguyên liệu</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-12 gap-lg mb-lg">
          <div className="col-span-12 md:col-span-3 bg-white p-lg rounded-xl shadow-sm border border-outline-variant/30 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-on-surface-variant text-sm mb-xs">Tổng số nguyên liệu</p>
              <h3 className="text-[36px] font-bold text-primary leading-none">
                {loading ? <span className="inline-block w-16 h-9 bg-surface-container-high rounded animate-pulse" /> : stats.total.toLocaleString('vi-VN')}
              </h3>
              <div className="flex items-center gap-xs mt-sm text-on-surface-variant text-[13px] font-semibold">
                <span className="material-symbols-outlined text-[16px]">inventory</span>
                <span>Đang được theo dõi</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-primary opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-500">inventory</span>
          </div>

          <div className="col-span-12 md:col-span-3 bg-white p-lg rounded-xl shadow-sm border border-outline-variant/30">
            <p className="text-on-surface-variant text-sm mb-xs">Cần nhập thêm</p>
            <h3 className="text-[36px] font-bold text-error leading-none">
              {loading ? <span className="inline-block w-12 h-9 bg-surface-container-high rounded animate-pulse" /> : stats.low_stock}
            </h3>
            {stats.low_stock > 0 ? (
              <div className="flex items-center gap-xs mt-sm">
                <span className="px-xs py-0.5 rounded bg-error-container text-on-error-container text-[11px] font-bold">KHẨN CẤP</span>
                <span className="text-on-surface-variant text-[12px]">Dưới mức tối thiểu</span>
              </div>
            ) : (
              <p className="text-[13px] text-on-surface-variant mt-sm">Tất cả đủ hàng ✓</p>
            )}
          </div>

          <div className="col-span-12 md:col-span-3 bg-white p-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="text-on-surface-variant text-sm mb-xs">Giá trị tồn kho</p>
              <h3 className="text-[24px] font-bold text-on-surface leading-none">
                {loading
                  ? <span className="inline-block w-24 h-8 bg-surface-container-high rounded animate-pulse" />
                  : formatPrice(stats.totalValue)}
              </h3>
              <p className="text-on-surface-variant text-[12px] mt-sm">Đơn giá × Tồn kho thực tế</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-container/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3 bg-white p-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="text-on-surface-variant text-sm mb-xs">Giá trị lệch kho</p>
              <h3 className={`text-[24px] font-bold leading-none ${stats.discrepancyValue > 0 ? 'text-[#059669]' :
                stats.discrepancyValue < 0 ? 'text-error' :
                  'text-on-surface-variant'
                }`}>
                {loading
                  ? <span className="inline-block w-24 h-8 bg-surface-container-high rounded animate-pulse" />
                  : `${stats.discrepancyValue >= 0 ? '+' : ''}${formatPrice(stats.discrepancyValue)}`}
              </h3>
              <p className="text-on-surface-variant text-[12px] mt-sm">Đơn giá × Số lượng tồn kho chênh lệch</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.discrepancyValue > 0 ? 'bg-[#d1fae5]' :
              stats.discrepancyValue < 0 ? 'bg-error-container' :
                'bg-surface-container'
              }`}>
              <span className={`material-symbols-outlined text-[24px] ${stats.discrepancyValue > 0 ? 'text-[#059669]' :
                stats.discrepancyValue < 0 ? 'text-error' :
                  'text-on-surface-variant'
                }`}>balance</span>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          {/* Toolbar */}
          <div className="px-lg py-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
            <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white">
              {TABS.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                  className={`px-md py-sm text-sm font-semibold transition-colors ${i < TABS.length - 1 ? 'border-r border-outline-variant' : ''
                    } ${activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'hover:bg-surface-container-low text-on-surface-variant'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-on-surface-variant">
              Hiển thị <span className="font-bold text-on-surface">{filtered.length}</span> trong <span className="font-bold text-on-surface">{materials.length}</span> nguyên liệu
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest">
                  {['Nguyên liệu', 'Đơn vị', 'Đơn giá nhập', 'Nhà cung cấp', 'Tồn kho', 'Trạng thái'].map((h) => (
                    <th key={h} className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-lg py-md">
                          <div className="h-4 bg-surface-container-high rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-lg py-16 text-center">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30 block mb-3">inventory_2</span>
                      <p className="text-on-surface-variant text-sm">Chưa có nguyên liệu nào</p>
                      <button onClick={() => setModal({ type: 'add' })} className="mt-3 text-primary text-sm font-semibold hover:underline">
                        + Tạo nguyên liệu mới
                      </button>
                    </td>
                  </tr>
                ) : (
                  currentMaterials.map((m) => {
                    const statusInfo = STATUS_MAP[m.status] || STATUS_MAP.in_stock;
                    return (
                      <tr key={m._id} onClick={() => setModal({ type: 'edit', data: m })} className="hover:bg-surface-container-lowest transition-colors group cursor-pointer">
                        <td className="px-lg py-md">
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-primary text-[20px]">
                                {UNIT_ICON_MAP[m.unit] || 'category'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-on-surface">{m.name}</p>
                              <p className="text-[12px] text-on-surface-variant">{m.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-md text-sm text-on-surface-variant">{m.unit}</td>
                        <td className="px-lg py-md text-sm font-bold text-on-surface">{formatPrice(m.price)}</td>
                        <td className="px-lg py-md text-sm text-on-surface-variant">{m.supplier}</td>
                        <td className={`px-lg py-md text-sm font-bold ${m.status !== 'in_stock' ? 'text-error' : 'text-on-surface'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{m.stock.toLocaleString('vi-VN')}</span>
                            {m.actualStock !== null && m.actualStock !== undefined && (m.actualStock - m.stock) !== 0 && (
                              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${(m.actualStock - m.stock) > 0 ? 'bg-[#d1fae5] text-[#059669]' : 'bg-error-container text-error'
                                }`}>
                                {(m.actualStock - m.stock) > 0 ? `+${m.actualStock - m.stock}` : (m.actualStock - m.stock)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-lg py-md">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-lg py-md border-t border-outline-variant/30 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
              <p className="text-on-surface-variant text-[13px]">
                Hiển thị <span className="font-bold text-on-surface">{currentMaterials.length}</span> / <span className="font-bold text-on-surface">{filtered.length}</span> nguyên liệu
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
