import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { materialService } from '../services/materialService';
import { inventoryCheckService } from '../services/inventoryCheckService';
import { inventorySyncService } from '../services/inventorySyncService';
import { formatPrice } from '../utils/formatPrice';

// ── Helpers ────────────────────────────────────────────────────────
const STATUS_MAP = {
  in_stock: { label: 'Còn hàng', className: 'bg-primary-container text-on-primary-container' },
  low_stock: { label: 'Sắp hết', className: 'bg-error-container text-on-error-container' },
  out_of_stock: { label: 'Hết hàng', className: 'bg-surface-container-highest text-on-surface-variant' },
  negative_stock: { label: 'Âm kho', className: 'bg-error text-white font-bold' },
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

const EMPTY_FORM = { name: '', sku: '', category: '', unit: '', price: '', supplier: '', stock: '', minStock: '10' };

const duplicateMaterialForm = (material) => ({
  ...EMPTY_FORM,
  name: `${material.name} (Bản sao)`,
  category: material.category || '',
  unit: material.unit || '',
  price: material.price ?? '',
  supplier: material.supplier || '',
  stock: 0,
  minStock: material.minStock ?? 10,
});

// ── Modal Thêm/Sửa ────────────────────────────────────────────────
function MaterialModal({ material, duplicateOf, categories, onClose, onSave, onDelete, onCategoryDeleted }) {
  const [form, setForm] = useState(material
    ? { ...material, price: material.price, stock: material.stock, minStock: material.minStock || 10, category: material.category || '' }
    : duplicateOf ? duplicateMaterialForm(duplicateOf) : { ...EMPTY_FORM });
  const [isNewCategory, setIsNewCategory] = useState(false);
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

  const handleDeleteCategory = async () => {
    if (!form.category || !categories.includes(form.category)) return;

    if (window.confirm(`Xác nhận xóa phân loại "${form.category}" khỏi toàn bộ hệ thống?\nLưu ý: Các nguyên vật liệu đang dùng phân loại này sẽ bị trống mục Phân loại.`)) {
      try {
        await materialService.deleteCategory(form.category);
        setForm(f => ({ ...f, category: '' }));
        if (onCategoryDeleted) onCategoryDeleted();
      } catch (err) {
        setError(err.response?.data?.message || 'Có lỗi xảy ra khi xóa phân loại');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[640px] mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 flex-shrink-0">
          <h3 className="text-[20px] font-bold text-on-surface">
            {isEdit ? 'Chỉnh sửa nguyên vật liệu' : duplicateOf ? 'Nhân bản nguyên vật liệu' : 'Thêm mới nguyên vật liệu'}
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

          {duplicateOf && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-container/55 px-4 py-3 text-xs leading-relaxed text-on-primary-container">
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              <p>Đang tạo bản sao từ <strong>{duplicateOf.name}</strong>. SKU mới sẽ được tạo tự động và tồn kho ban đầu được đặt về 0.</p>
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
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Phân loại</label>
              {isNewCategory ? (
                <div className="flex gap-2">
                  <input name="category" value={form.category} onChange={handleChange} autoFocus
                    className="flex-1 border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-0"
                    placeholder="Nhập tên phân loại..." />
                  <button type="button" onClick={() => { setIsNewCategory(false); setForm(f => ({ ...f, category: '' })); }}
                    className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-[14px] font-semibold text-on-surface-variant transition-colors whitespace-nowrap">
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select name="category" value={form.category}
                      onChange={(e) => {
                        if (e.target.value === '___NEW___') {
                          setIsNewCategory(true);
                          setForm(f => ({ ...f, category: '' }));
                        } else {
                          handleChange(e);
                        }
                      }}
                      className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none truncate">
                      <option value="" disabled hidden>Chọn phân loại</option>
                      {categories?.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="___NEW___" className="font-bold text-primary">
                        + Thêm phân loại mới...
                      </option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                  {form.category && categories.includes(form.category) && (
                    <button type="button" onClick={handleDeleteCategory}
                      className="px-3 border border-error/30 text-error hover:bg-error-container hover:border-error rounded-lg transition-colors flex items-center justify-center"
                      title="Xóa phân loại này">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Nhà cung cấp</label>
              <input name="supplier" value={form.supplier} onChange={handleChange} required
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Nhập tên nhà cung cấp" />
            </div>

            {/* Row 3 */}
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

// ── Modal Xác nhận Cân bằng kho ───────────────────────────────────
function SyncConfirmModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-primary">balance</span>
        </div>
        <h3 className="text-[17px] font-bold text-on-surface mb-1">Xác nhận cân bằng kho</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          Bạn có chắc muốn cân bằng kho? Tồn kho hệ thống sẽ được cập nhật bằng với tồn kho thực tế của <span className="font-semibold text-on-surface">tất cả</span> các nguyên liệu đang bị lệch.
        </p>

        <div className="flex justify-center gap-3 w-full mt-2">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container">
            Hủy
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Lịch sử kiểm kho ─────────────────────────────────────────
function InventoryHistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    inventorySyncService.getSyncHistory()
      .then(res => setHistory(res))
      .catch(err => setError(err.message || 'Lỗi khi tải lịch sử'))
      .finally(() => setLoading(false));
  }, []);

  const totalDiscrepancyHistory = history.reduce((sum, ticket) => sum + (ticket.total_discrepancy_value || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 flex-shrink-0">
          <div>
            <h3 className="text-[20px] font-bold text-on-surface">Lịch sử cân bằng kho</h3>
            <p className="text-[13px] text-on-surface-variant mt-1">Danh sách các lần điều chỉnh tồn kho do sai lệch</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container p-1 rounded-md transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-surface-container-lowest">
          {!loading && !error && (
            <div className="mb-6 bg-primary-container/30 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-variant font-medium">Tổng giá trị đã lệch (từ trước đến nay)</p>
                <p className="text-xs text-on-surface-variant mt-1">Tính dựa trên đơn giá tại thời điểm cân bằng</p>
              </div>
              <div className={`text-[24px] font-bold ${totalDiscrepancyHistory > 0 ? 'text-[#059669]' : totalDiscrepancyHistory < 0 ? 'text-error' : 'text-on-surface'}`}>
                {totalDiscrepancyHistory > 0 ? '+' : ''}{formatPrice(totalDiscrepancyHistory)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-error">{error}</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant">history</span>
              </div>
              <p className="text-on-surface-variant font-medium">Chưa có lịch sử kiểm kho nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((ticket) => {
                const ticketTotalDiff = ticket.total_discrepancy_value || 0;
                return (
                  <div key={ticket._id} className="bg-white border border-outline-variant/50 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4 pb-3 border-b border-outline-variant/30">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-on-surface text-[15px]">{ticket.code}</span>
                          <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[11px] font-bold rounded">
                            {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-[13px] text-on-surface-variant">Người thực hiện: <span className="font-semibold">{ticket.synced_by || 'Admin'}</span></p>
                        {ticket.note && <p className="text-[13px] text-on-surface-variant mt-1">Ghi chú: {ticket.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] text-on-surface-variant mb-0.5">Giá trị lệch</p>
                        <p className={`font-bold text-[16px] ${ticketTotalDiff > 0 ? 'text-[#059669]' : ticketTotalDiff < 0 ? 'text-error' : 'text-on-surface'}`}>
                          {ticketTotalDiff > 0 ? '+' : ''}{formatPrice(ticketTotalDiff)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3">
                      <button
                        onClick={() => toggleExpand(ticket._id)}
                        className="flex items-center gap-1 w-full text-left outline-none group"
                      >
                        <p className="text-[12px] font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                          CHI TIẾT ({ticket.items.length} hạng mục)
                        </p>
                        <span className={`material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-transform duration-200 ${expandedItems[ticket._id] ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </button>

                      {expandedItems[ticket._id] && (
                        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 overflow-hidden animate-[fadeIn_0.2s_ease]">
                          <table className="w-full text-left">
                            <thead className="bg-surface-container-low/50">
                              <tr>
                                <th className="px-3 py-2 text-[11px] font-semibold text-on-surface-variant">SKU</th>
                                <th className="px-3 py-2 text-[11px] font-semibold text-on-surface-variant">Tên nguyên liệu</th>
                                <th className="px-3 py-2 text-[11px] font-semibold text-on-surface-variant text-right">Lệch</th>
                                <th className="px-3 py-2 text-[11px] font-semibold text-on-surface-variant text-right">Đơn giá</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/20">
                              {ticket.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-[12px] text-on-surface-variant">{item.material_id?.sku || 'N/A'}</td>
                                  <td className="px-3 py-2 text-[12px] font-medium text-on-surface">{item.material_id?.name || 'N/A'}</td>
                                  <td className={`px-3 py-2 text-[12px] font-bold text-right ${item.difference > 0 ? 'text-[#059669]' : item.difference < 0 ? 'text-error' : ''}`}>
                                    {item.difference > 0 ? '+' : ''}{item.difference}
                                  </td>
                                  <td className="px-3 py-2 text-[12px] text-on-surface-variant text-right">{formatPrice(item.price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
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

  const exportToExcel = () => {
    // Dùng BOM để Excel nhận diện được UTF-8
    const bom = '\uFEFF';

    // Header CSV
    const headers = ['Mã SKU', 'Tên nguyên liệu', 'Phân loại', 'Đơn vị', 'Đơn giá nhập', 'Nhà cung cấp', 'Tồn kho', 'Trạng thái'];

    // Rows
    const rows = filtered.map(m => {
      const actualStock = m.actualStock !== null && m.actualStock !== undefined ? m.actualStock : m.stock;
      const mStatus = actualStock < 0 ? 'negative_stock' : m.status;
      const statusLabel = STATUS_MAP[mStatus]?.label || 'Không xác định';

      return [
        m.sku || '',
        `"${m.name?.replace(/"/g, '""') || ''}"`,
        `"${m.category || ''}"`,
        m.unit || '',
        m.price || 0,
        `"${m.supplier?.replace(/"/g, '""') || ''}"`,
        actualStock || 0,
        statusLabel
      ].join(',');
    });

    const csvContent = bom + [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nguyen_Vat_Lieu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Đã xuất file Excel');
  };

  const handleSyncInventoryClick = () => {
    setModal({ type: 'sync' });
  };

  const confirmSyncInventory = async () => {
    setActionLoading(true);
    try {
      await inventorySyncService.syncInventory({ checked_by: 'Admin' });
      showToast('Đã cân bằng kho thành công');
      fetchMaterials();
      setModal(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi cân bằng kho', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleSave = () => {
    const savedType = modal?.type;
    setModal(null);
    setActionError('');
    showToast(savedType === 'edit' ? 'Đã cập nhật nguyên liệu' : savedType === 'duplicate' ? 'Đã nhân bản nguyên liệu' : 'Đã tạo nguyên liệu mới');
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

    if (selectedCategory !== 'all' && m.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'in_stock', label: 'Còn hàng' },
    { key: 'low_stock', label: 'Sắp hết' },
  ];

  const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))];

  const ITEMS_PER_PAGE = 25;
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
        <MaterialModal categories={uniqueCategories} onClose={() => { setModal(null); setActionError(''); }} onSave={handleSave} onCategoryDeleted={fetchMaterials} />
      )}
      {modal?.type === 'duplicate' && (
        <MaterialModal duplicateOf={modal.data} categories={uniqueCategories} onClose={() => { setModal(null); setActionError(''); }} onSave={handleSave} onCategoryDeleted={fetchMaterials} />
      )}
      {modal?.type === 'edit' && (
        <MaterialModal material={modal.data} categories={uniqueCategories} onClose={() => { setModal(null); setActionError(''); }} onSave={handleSave} onDelete={() => { setModal({ type: 'delete', data: modal.data }); setActionError(''); }} onCategoryDeleted={fetchMaterials} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal material={modal.data} onClose={() => { setModal(null); setActionError(''); }} onConfirm={handleDelete} loading={actionLoading} error={actionError} />
      )}
      {modal?.type === 'sync' && (
        <SyncConfirmModal onClose={() => setModal(null)} onConfirm={confirmSyncInventory} loading={actionLoading} />
      )}
      {showHistoryModal && (
        <InventoryHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Danh sách Nguyên vật liệu</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-xs px-lg py-sm bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-all shadow-sm font-semibold text-sm">
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span>Lịch sử cân bằng</span>
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-xs px-lg py-sm bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-all shadow-sm font-semibold text-sm">
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={() => setModal({ type: 'add' })}
              className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Tạo mới nguyên liệu</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-outline-variant/30 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-on-surface-variant text-sm mb-2">Tổng số nguyên liệu</p>
              <h3 className="text-[36px] font-bold text-primary leading-none">
                {loading ? <span className="inline-block w-16 h-9 bg-surface-container-high rounded animate-pulse" /> : stats.total.toLocaleString('vi-VN')}
              </h3>
              <div className="flex items-center gap-2 mt-3 text-on-surface-variant text-[13px] font-semibold">
                <span className="material-symbols-outlined text-[16px]">inventory</span>
                <span>Đang được theo dõi</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-primary opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-500">inventory</span>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-outline-variant/30">
            <p className="text-on-surface-variant text-sm mb-2">Cần nhập thêm</p>
            <h3 className="text-[36px] font-bold text-error leading-none">
              {loading ? <span className="inline-block w-12 h-9 bg-surface-container-high rounded animate-pulse" /> : stats.low_stock}
            </h3>
            {stats.low_stock > 0 ? (
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container text-[11px] font-bold">KHẨN CẤP</span>
                <span className="text-on-surface-variant text-[12px]">Dưới mức tối thiểu</span>
              </div>
            ) : (
              <p className="text-[13px] text-on-surface-variant mt-3">Tất cả đủ hàng ✓</p>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="text-on-surface-variant text-sm mb-2">Giá trị tồn kho</p>
              <h3 className="text-[22px] font-bold text-on-surface leading-none">
                {loading
                  ? <span className="inline-block w-24 h-8 bg-surface-container-high rounded animate-pulse" />
                  : formatPrice(stats.totalValue)}
              </h3>
              <p className="text-on-surface-variant text-[12px] mt-3">Đơn giá × Tồn kho thực tế</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-container/50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-on-surface-variant text-sm mb-2">Giá trị lệch kho</p>
                <h3 className={`text-[22px] font-bold leading-none ${stats.discrepancyValue > 0 ? 'text-[#059669]' :
                  stats.discrepancyValue < 0 ? 'text-error' :
                    'text-on-surface-variant'
                  }`}>
                  {loading
                    ? <span className="inline-block w-24 h-8 bg-surface-container-high rounded animate-pulse" />
                    : `${stats.discrepancyValue >= 0 && stats.discrepancyValue !== 0 ? '+' : ''}${formatPrice(stats.discrepancyValue)}`}
                </h3>
              </div>
              <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${stats.discrepancyValue > 0 ? 'bg-[#d1fae5]' :
                stats.discrepancyValue < 0 ? 'bg-error-container' :
                  'bg-surface-container'
                }`}>
                <span className={`material-symbols-outlined text-[20px] ${stats.discrepancyValue > 0 ? 'text-[#059669]' :
                  stats.discrepancyValue < 0 ? 'text-error' :
                    'text-on-surface-variant'
                  }`}>balance</span>
              </div>
            </div>
            <div className="flex items-end justify-between mt-3 gap-2">
              <p className="text-on-surface-variant text-[11px] leading-tight">Đơn giá × Số lượng tồn kho chênh lệch</p>
              <button
                onClick={handleSyncInventoryClick}
                disabled={stats.discrepancyValue === 0 || actionLoading}
                className="text-[12px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
              >
                Cân bằng kho
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          {/* Toolbar */}
          <div className="px-lg py-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white h-9">
                {TABS.map((tab, i) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                    className={`px-md h-full text-sm font-semibold transition-colors ${i < TABS.length - 1 ? 'border-r border-outline-variant' : ''
                      } ${activeTab === tab.key
                        ? 'bg-primary text-white'
                        : 'hover:bg-surface-container-low text-on-surface-variant'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative h-9">
                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="appearance-none bg-white border border-outline-variant rounded-lg px-4 h-full pr-10 text-sm font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-[160px]"
                >
                  <option value="all">Tất cả phân loại</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
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
                  {['Nguyên liệu', 'Phân loại', 'Đơn vị', 'Đơn giá nhập', 'Nhà cung cấp', 'Tồn kho', 'Trạng thái', 'Thao tác'].map((h) => (
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
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-lg py-md">
                          <div className="h-4 bg-surface-container-high rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-lg py-16 text-center">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30 block mb-3">inventory_2</span>
                      <p className="text-on-surface-variant text-sm">Chưa có nguyên liệu nào</p>
                      <button onClick={() => setModal({ type: 'add' })} className="mt-3 text-primary text-sm font-semibold hover:underline">
                        + Tạo nguyên liệu mới
                      </button>
                    </td>
                  </tr>
                ) : (
                  currentMaterials.map((m) => {
                    const actualStock = m.actualStock !== null && m.actualStock !== undefined ? m.actualStock : m.stock;
                    const mStatus = actualStock < 0 ? 'negative_stock' : m.status;
                    const statusInfo = STATUS_MAP[mStatus] || STATUS_MAP.in_stock;
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
                        <td className="px-lg py-md text-sm text-on-surface-variant">{m.category || '---'}</td>
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
                        <td className="px-lg py-md">
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setModal({ type: 'duplicate', data: m }); }}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary-container hover:text-primary"
                            title={`Nhân bản ${m.name}`}
                            aria-label={`Nhân bản nguyên liệu ${m.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>
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
