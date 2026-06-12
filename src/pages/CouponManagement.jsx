import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import { couponService } from '../services/couponService';
import { productService } from '../services/productService';

const formatPrice = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

function CouponModal({ coupon, products, onClose, onSave }) {
  const isEdit = !!coupon;
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    name: coupon?.name || '',
    type: coupon?.type || 'percent',
    value: coupon?.value || '',
    max_discount: coupon?.max_discount || '',
    quantity: coupon?.quantity || '',
    start_date: coupon?.start_date ? new Date(coupon.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    end_date: coupon?.end_date ? new Date(coupon.end_date).toISOString().slice(0, 16) : '',
    applicable_products: coupon?.applicable_products || 'all',
    product_ids: coupon?.product_ids?.map(p => typeof p === 'object' ? p._id : p) || [],
    is_active: coupon?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.type === 'fixed') payload.max_discount = null;
      if (payload.applicable_products === 'all') payload.product_ids = [];

      if (isEdit) {
        await couponService.updateCoupon(coupon._id, payload);
      } else {
        await couponService.createCoupon(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId) => {
    setFormData(prev => {
      const ids = prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId];
      return { ...prev, product_ids: ids };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-[fadeIn_0.2s_ease]">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="text-[18px] font-bold text-on-surface">
            {isEdit ? 'Chỉnh sửa phiếu giảm giá' : 'Tạo phiếu giảm giá mới'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 bg-error-container text-error rounded-lg text-sm font-medium">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Mã giảm giá (Code)</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VD: SUMMER2026"
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] font-mono focus:border-primary focus:ring-1 focus:ring-primary uppercase"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Tên ưu đãi</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Giảm giá mùa hè"
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Loại giảm giá</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="percent">Giảm theo phần trăm (%)</option>
                <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">
                {formData.type === 'percent' ? 'Mức giảm (%)' : 'Mức giảm (VNĐ)'}
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {formData.type === 'percent' && (
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Giảm tối đa (VNĐ) - Tùy chọn</label>
              <input
                type="number"
                min="0"
                value={formData.max_discount}
                onChange={e => setFormData({ ...formData, max_discount: Number(e.target.value) })}
                placeholder="Không giới hạn nếu để trống"
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Tổng số lượng phát hành</label>
            <input
              type="number"
              required
              min="1"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Từ ngày</label>
              <input
                type="datetime-local"
                required
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Đến ngày</label>
              <input
                type="datetime-local"
                required
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-1.5">Sản phẩm áp dụng</label>
            <select
              value={formData.applicable_products}
              onChange={e => setFormData({ ...formData, applicable_products: e.target.value })}
              className="w-full border border-outline-variant rounded-lg px-4 py-2 text-[15px] focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tất cả sản phẩm</option>
              <option value="specific">Chỉ sản phẩm cụ thể</option>
            </select>
          </div>

          {formData.applicable_products === 'specific' && (
            <div className="border border-outline-variant rounded-lg p-3 max-h-48 overflow-y-auto">
              {products.map(p => (
                <label key={p._id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-surface-container-low px-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.product_ids.includes(p._id)}
                    onChange={() => handleProductToggle(p._id)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-[14px] text-on-surface">{p.name} <span className="text-[12px] text-on-surface-variant">({p.productId})</span></span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded text-primary focus:ring-primary w-4 h-4"
            />
            <label htmlFor="is_active" className="text-[14px] font-medium text-on-surface cursor-pointer">Kích hoạt mã giảm giá</label>
          </div>
        </div>

        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-on-surface-variant text-[14px] font-medium hover:bg-surface-container rounded-lg transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-primary text-white text-[14px] font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Lưu phiếu giảm giá
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: 'add' | 'edit', data? }
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resCoupons, resProducts] = await Promise.all([
        couponService.getCoupons(),
        productService.getProducts()
      ]);
      setCoupons(resCoupons.data.data);
      setProducts(resProducts.data.data);
    } catch {
      showToast('Không thể tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      await couponService.deleteCoupon(id);
      showToast('Đã xóa thành công');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi xóa', 'error');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await couponService.updateCoupon(coupon._id, { is_active: !coupon.is_active });
      showToast(coupon.is_active ? 'Đã vô hiệu hóa mã' : 'Đã kích hoạt mã');
      fetchData();
    } catch (err) {
      showToast('Lỗi cập nhật', 'error');
    }
  };

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {modal && (
        <CouponModal
          coupon={modal.data}
          products={products}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            showToast('Đã lưu mã giảm giá');
            fetchData();
          }}
        />
      )}

      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="text-[24px] font-bold text-on-surface">Khuyến mãi & Phiếu giảm giá</h2>
          <p className="text-on-surface-variant mt-1 text-[14px]">Quản lý các chương trình ưu đãi cho đơn hàng</p>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 font-semibold text-sm shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tạo mã mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-[48px] opacity-20 mb-3">sell</span>
            <p className="text-[15px] font-medium text-on-surface">Chưa có mã giảm giá nào</p>
            <p className="text-[13px] mt-1">Bấm "Tạo mã mới" để bắt đầu chương trình ưu đãi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant/30 text-[13px] text-on-surface-variant">
                  <th className="py-4 px-6 font-semibold w-[20%]">Mã ưu đãi</th>
                  <th className="py-4 px-6 font-semibold w-[25%]">Chi tiết giảm</th>
                  <th className="py-4 px-6 font-semibold w-[15%]">Sử dụng</th>
                  <th className="py-4 px-6 font-semibold w-[20%]">Thời gian áp dụng</th>
                  <th className="py-4 px-6 font-semibold text-center w-[10%]">Trạng thái</th>
                  <th className="py-4 px-6 font-semibold text-right w-[10%]">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {coupons.map((c) => {
                  const isExpired = new Date() > new Date(c.end_date);
                  const isOutOfStock = c.used_count >= c.quantity;
                  let statusBadge = '';
                  if (!c.is_active) statusBadge = <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded text-[11px] font-bold">VÔ HIỆU</span>;
                  else if (isExpired) statusBadge = <span className="bg-error-container text-error px-2 py-1 rounded text-[11px] font-bold">HẾT HẠN</span>;
                  else if (isOutOfStock) statusBadge = <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded text-[11px] font-bold">HẾT LƯỢT</span>;
                  else statusBadge = <span className="bg-[#d1fae5] text-[#059669] px-2 py-1 rounded text-[11px] font-bold">ĐANG CHẠY</span>;

                  return (
                    <tr 
                      key={c._id} 
                      onClick={() => setModal({ type: 'edit', data: c })}
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer ${!c.is_active || isExpired ? 'opacity-60' : ''}`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[15px] text-primary font-mono">{c.code}</span>
                          <span className="text-[13px] text-on-surface-variant mt-0.5 truncate max-w-[200px]">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-bold text-on-surface">
                            Giảm {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}
                          </span>
                          {c.type === 'percent' && c.max_discount && (
                            <span className="text-[12px] text-on-surface-variant">Tối đa: {formatPrice(c.max_discount)}</span>
                          )}
                          <span className="text-[11px] text-on-surface-variant mt-1 border border-outline-variant/50 inline-block px-1.5 py-0.5 rounded bg-surface-container-low max-w-fit">
                            {c.applicable_products === 'all' ? 'Tất cả sản phẩm' : `Chỉ ${c.product_ids?.length || 0} sản phẩm`}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-full bg-surface-container-low rounded-full h-1.5 mb-1.5 overflow-hidden">
                          <div className={`h-full ${isOutOfStock ? 'bg-error' : 'bg-primary'}`} style={{ width: `${Math.min((c.used_count / c.quantity) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-[13px] font-semibold text-on-surface">{c.used_count} <span className="font-normal text-on-surface-variant">/ {c.quantity}</span></span>
                      </td>
                      <td className="py-4 px-6 text-[13px] text-on-surface-variant">
                        <div><span className="font-semibold">Từ:</span> {new Date(c.start_date).toLocaleString('vi-VN')}</div>
                        <div><span className="font-semibold">Đến:</span> {new Date(c.end_date).toLocaleString('vi-VN')}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {statusBadge}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleToggleActive(c); }} title={c.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">{c.is_active ? 'pause_circle' : 'play_circle'}</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }} className="p-1.5 text-error opacity-70 hover:opacity-100 transition-opacity" title="Xóa">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
