import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';

// ── Helpers ────────────────────────────────────────────────────────
const formatPrice = (n) =>
  Math.round(n ?? 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const today = () => new Date().toISOString().split('T')[0];

// ── Modal Tạo / Chỉnh sửa đơn hàng ───────────────────────────────
function OrderModal({ order, products, onClose, onSave, onDelete }) {
  const isEdit = !!order;
  const [items, setItems] = useState(order?.items?.map(i => ({ ...i })) || []);
  const [totalPrice, setTotalPrice] = useState(order?.total_price ?? 0);
  const [logisticsCost, setLogisticsCost] = useState(order?.logistics_cost ?? 0);
  const [note, setNote] = useState(order?.note || '');
  const [orderedAt, setOrderedAt] = useState(
    order?.ordered_at ? new Date(order.ordered_at).toISOString().split('T')[0] : today()
  );
  const [source, setSource] = useState(order?.source || 'shopee');
  const [shippingMethod, setShippingMethod] = useState(order?.shippingMethod || 'standard');
  const [autoTotal, setAutoTotal] = useState(!isEdit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Tính tổng tự động
  const calcTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  }, [items]);

  useEffect(() => {
    if (autoTotal) setTotalPrice(calcTotal());
  }, [items, autoTotal, calcTotal]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const term = productSearch.toLowerCase();
    return products.filter(p => {
      const matchName = p.name?.toLowerCase().includes(term);
      const matchSku = p.productId?.toLowerCase().includes(term);
      const matchInnerSku = p.skus?.some(sku => sku.sku?.toLowerCase().includes(term));
      return matchName || matchSku || matchInnerSku;
    });
  }, [products, productSearch]);

  // Thêm sản phẩm / SKU vào đơn hàng
  const handlePickProduct = (product, sku = null) => {
    const unit_price = sku ? (sku.price || product.base_price || 0) : (product.base_price || 0);
    const unit_cost = sku ? (sku.cost || product.base_cost || 0) : (product.base_cost || 0);
    const sku_label = sku
      ? sku.combination?.map(optId => {
        for (const g of product.variant_groups || []) {
          const opt = g.options.find(o => o.id === optId);
          if (opt) return opt.label;
        }
        return optId;
      }).join(' - ') || ''
      : '';

    // Kiểm tra đã có trong đơn chưa
    const existing = items.findIndex(i =>
      i.product_id === product._id && (sku ? i.sku_id === sku.id : !i.sku_id)
    );

    if (existing >= 0) {
      const newItems = [...items];
      newItems[existing].quantity += 1;
      setItems(newItems);
    } else {
      setItems(prev => [...prev, {
        product_id: product._id,
        productId: product.productId,
        product_name: product.name,
        product_image: product.image || null,
        sku_id: sku ? sku.id : null,
        sku_label,
        unit_price,
        unit_cost,
        quantity: 1,
      }]);
    }
    setShowProductPicker(false);
  };

  const handleQtyChange = (idx, val) => {
    const newItems = [...items];
    newItems[idx].quantity = Math.max(1, Number(val));
    setItems(newItems);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { setError('Vui lòng thêm ít nhất 1 sản phẩm'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = { items, total_price: totalPrice, logistics_cost: logisticsCost, source, shippingMethod, note, ordered_at: new Date(orderedAt) };
      if (isEdit) {
        await orderService.updateOrder(order._id, payload);
      } else {
        await orderService.createOrder(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl min-h-[600px] max-h-[90vh] flex flex-col animate-[fadeIn_0.2s_ease]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low/50 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-on-surface">
              {isEdit ? `Chỉnh sửa đơn hàng` : 'Tạo đơn hàng mới'}
            </h2>
            {isEdit && <p className="text-[12px] text-on-surface-variant font-mono">{order.orderId}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-error-container text-error rounded-lg text-sm font-medium">{error}</div>
          )}

          {/* Ngày đặt hàng, Nguồn, Phí Ship, Ghi chú */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ngày đặt</label>
              <input
                type="date"
                value={orderedAt}
                onChange={e => setOrderedAt(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Nguồn</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
              >
                <option value="khác">Khác</option>
                <option value="shopee">Shopee</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Vận chuyển</label>
              <select
                value={shippingMethod}
                onChange={e => setShippingMethod(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
              >
                <option value="standard">Thường</option>
                <option value="express">Hỏa tốc</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Phí ship (đ)</label>
              <input
                type="number"
                min="0"
                value={logisticsCost}
                onChange={e => setLogisticsCost(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ghi chú</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú..."
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Danh sách sản phẩm */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[13px] font-bold text-on-surface-variant">Sản phẩm trong đơn</label>
              <button
                type="button"
                onClick={() => setShowProductPicker(true)}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:bg-primary-container/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Thêm sản phẩm
              </button>
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed border-outline-variant/50 rounded-xl py-10 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] opacity-40 block mb-2">shopping_bag</span>
                <p className="text-sm">Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để bắt đầu.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/30">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover border border-outline-variant/20 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {item.product_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] text-on-surface truncate">{item.product_name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {item.sku_label || 'Mặc định'} · {formatPrice(item.unit_price)}/cái
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQtyChange(idx, item.quantity - 1)} className="w-7 h-7 rounded-md border border-outline-variant flex items-center justify-center hover:bg-surface-container text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleQtyChange(idx, e.target.value)}
                        className="w-12 text-center border border-outline-variant rounded-md text-[14px] font-bold py-0.5 focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => handleQtyChange(idx, item.quantity + 1)} className="w-7 h-7 rounded-md border border-outline-variant flex items-center justify-center hover:bg-surface-container text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                    <p className="w-28 text-right font-bold text-[14px] text-primary font-mono">
                      {formatPrice(item.unit_price * item.quantity)}
                    </p>
                    <button onClick={() => handleRemoveItem(idx)} className="p-1.5 text-error hover:bg-error-container rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tổng tiền */}
          <div className="bg-primary-container/20 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[14px] text-on-surface">Tổng tiền đơn hàng</span>
              <label className="flex items-center gap-2 text-[13px] text-on-surface-variant cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoTotal}
                  onChange={e => setAutoTotal(e.target.checked)}
                  className="rounded"
                />
                Tính tự động
              </label>
            </div>
            <input
              type="number"
              min="0"
              value={totalPrice}
              onChange={e => { setAutoTotal(false); setTotalPrice(Number(e.target.value)); }}
              disabled={autoTotal && items.length > 0}
              className="w-full border border-primary/30 rounded-lg px-4 py-3 text-[20px] font-bold text-primary text-right focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white disabled:bg-surface-container-low"
            />
            {autoTotal && items.length > 0 && (
              <p className="text-[11px] text-on-surface-variant mt-1 text-right">Tổng tự động tính từ sản phẩm</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-between items-center rounded-b-2xl flex-shrink-0">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 bg-error-container text-error rounded-lg text-[14px] font-semibold hover:bg-error hover:text-white transition-colors"
              >
                Xóa đơn hàng
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-on-surface-variant text-[14px] font-medium hover:bg-surface-container rounded-lg transition-colors">
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading || items.length === 0}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-sm">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo đơn hàng'}
            </button>
          </div>
        </div>
      </div>

      {/* Product Picker Sub-modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowProductPicker(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[75vh] flex flex-col animate-[fadeIn_0.15s_ease]">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[16px] text-on-surface">Chọn sản phẩm</h3>
                <button onClick={() => setShowProductPicker(false)} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
                <input
                  type="text"
                  placeholder="Tìm tên hoặc mã sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg pl-9 pr-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary focus:bg-white transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredProducts.length === 0 && (
                <p className="text-center text-on-surface-variant py-8">Chưa có sản phẩm nào phù hợp.</p>
              )}
              {filteredProducts.map(product => (
                <div key={product._id} className="border border-outline-variant/30 rounded-xl overflow-hidden">
                  {/* Sản phẩm không có phân loại → chọn thẳng */}
                  <div
                    onClick={() => (!product.skus || product.skus.length === 0) && handlePickProduct(product)}
                    className={`flex items-center gap-3 px-4 py-3 ${!product.skus || product.skus.length === 0 ? 'hover:bg-primary-container/20 cursor-pointer' : 'bg-surface-container-lowest'}`}
                  >
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-primary font-bold text-sm">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-[14px] text-on-surface">{product.name}</p>
                      <p className="text-[11px] text-on-surface-variant">{product.productId}</p>
                    </div>
                    {(!product.skus || product.skus.length === 0) && (
                      <span className="text-[13px] font-bold text-primary">{formatPrice(product.base_price)}</span>
                    )}
                  </div>
                  {/* Các phân loại */}
                  {product.skus?.map(sku => {
                    const skuLabel = sku.combination?.map(optId => {
                      for (const g of product.variant_groups || []) {
                        const opt = g.options.find(o => o.id === optId);
                        if (opt) return opt.label;
                      }
                      return optId;
                    }).join(' - ') || 'Mặc định';
                    return (
                      <div
                        key={sku.id}
                        onClick={() => handlePickProduct(product, sku)}
                        className="flex items-center gap-3 px-4 py-2.5 border-t border-dashed border-outline-variant/30 hover:bg-primary-container/20 cursor-pointer pl-10"
                      >
                        <span className="material-symbols-outlined text-[14px] text-outline-variant">subdirectory_arrow_right</span>
                        <span className="text-[13px] text-on-surface-variant flex-1">Phân loại: <span className="text-on-surface font-semibold">{skuLabel}</span></span>
                        <span className="text-[13px] font-bold text-primary">{formatPrice(sku.price || product.base_price)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal Xác nhận xóa ────────────────────────────────────────────
function DeleteModal({ order, onClose, onConfirm, loading }) {
  const [restoreStock, setRestoreStock] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-error">delete_forever</span>
        </div>
        <h3 className="text-[17px] font-bold text-on-surface mb-1">Xác nhận xóa</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Bạn có chắc muốn xóa đơn hàng <span className="font-semibold text-on-surface">"{order.orderId}"</span> không? Hành động này không thể hoàn tác.
        </p>

        <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-6 cursor-pointer bg-surface-container-low px-4 py-2.5 rounded-lg border border-outline-variant/30 w-full hover:bg-surface-container transition-colors">
          <input
            type="checkbox"
            checked={restoreStock}
            onChange={(e) => setRestoreStock(e.target.checked)}
            className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
          />
          <span className="flex-1 text-left font-medium">Khôi phục lại nguyên liệu vào kho</span>
        </label>

        <div className="flex justify-center gap-3 w-full">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container flex-1">Hủy</button>
          <button onClick={() => onConfirm(restoreStock)} disabled={loading} className="px-5 py-2 rounded-lg bg-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 flex-1">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xóa đơn hàng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Component chính ───────────────────────────────────────────────
export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState(null); // null | { type: 'add'|'edit'|'delete', data? }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  // Date filter
  const [datePreset, setDatePreset] = useState('thisMonth'); // 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // Source filter
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'shopee' | 'tiktok' | ...

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrders, resProducts] = await Promise.all([
        orderService.getOrders(),
        productService.getProducts(),
      ]);
      setOrders(resOrders.data.data);
      if (resProducts.data.success) setProducts(resProducts.data.data);
    } catch {
      showToast('Không thể tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = () => {
    setModal(null);
    showToast(modal?.type === 'edit' ? 'Đã cập nhật đơn hàng' : 'Đã tạo đơn hàng mới');
    fetchData();
  };

  const handleDelete = async (restoreStock) => {
    setActionLoading(true);
    try {
      await orderService.deleteOrder(modal.data._id, restoreStock);
      showToast('Đã xóa đơn hàng');
      setModal(null);
      fetchData();
    } catch {
      showToast('Xóa thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered orders theo bộ lọc thời gian & nguồn
  const filteredOrders = orders.filter(o => {
    // Lọc theo nguồn
    const orderSource = o.source || 'khác';
    if (sourceFilter !== 'all' && orderSource !== sourceFilter) return false;

    // Lọc theo thời gian
    const d = new Date(o.ordered_at);
    const now = new Date();
    if (datePreset === 'today') return d.toDateString() === now.toDateString();
    if (datePreset === 'thisWeek') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (datePreset === 'thisMonth') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (datePreset === 'thisYear') return d.getFullYear() === now.getFullYear();
    if (datePreset === 'custom') {
      const from = customFrom ? new Date(customFrom) : null;
      const to = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true; // 'all'
  });

  // Stats
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalItems = filteredOrders.reduce((s, o) => s + (o.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0);
  const totalCost = filteredOrders.reduce((s, o) => s + (o.items?.reduce((a, i) => a + (i.unit_cost || 0) * i.quantity, 0) || 0) + (o.logistics_cost || 0) + (o.packaging_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const currentOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'add' && (
        <OrderModal products={products} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.type === 'edit' && (
        <OrderModal
          order={modal.data}
          products={products}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={() => setModal({ type: 'delete', data: modal.data })}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal order={modal.data} onClose={() => setModal(null)} onConfirm={handleDelete} loading={actionLoading} />
      )}

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Quản lý Đơn hàng</h2>
            <p className="text-on-surface-variant mt-1 text-[14px]">Tạo và quản lý toàn bộ đơn hàng bán hàng</p>
          </div>
          <button
            onClick={() => setModal({ type: 'add' })}
            className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Tạo đơn hàng mới</span>
          </button>
        </div>
        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 px-lg py-md mb-lg flex flex-wrap items-center gap-6">
          {/* Time Filter */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-on-surface-variant">Lọc theo thời gian:</span>
            <select
              value={datePreset}
              onChange={(e) => { setDatePreset(e.target.value); setCurrentPage(1); }}
              className="border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] font-semibold bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-[120px] cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
              <option value="thisYear">Năm nay</option>
              <option value="custom">Tuỳ chỉnh...</option>
            </select>

            {/* Custom date range */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => { setCustomFrom(e.target.value); setCurrentPage(1); }}
                  className="border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="text-on-surface-variant text-[13px]">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => { setCustomTo(e.target.value); setCurrentPage(1); }}
                  className="border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-on-surface-variant">Nguồn đơn hàng:</span>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] font-semibold bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-[120px] cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="shopee">Shopee</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="google">Google</option>
              <option value="khác">Khác</option>
            </select>
          </div>

          {/* Badge kết quả lọc */}
          <span className="ml-auto text-[12px] text-on-surface-variant bg-surface-container px-4 py-1.5 rounded-full font-bold">
            {filteredOrders.length} / {orders.length} đơn hàng
          </span>
        </div>

        <div className="grid grid-cols-4 gap-md mb-lg">
          {[
            { label: 'Tổng đơn hàng', value: loading ? null : orders.length, icon: 'receipt_long', color: 'text-primary', bg: 'bg-primary-container' },
            { label: 'Sản phẩm bán ra', value: loading ? null : totalItems.toLocaleString('vi-VN'), icon: 'inventory_2', color: 'text-[#059669]', bg: 'bg-[#d1fae5]' },
            { label: 'Tổng doanh thu', value: loading ? null : formatPrice(totalRevenue), icon: 'payments', color: 'text-[#d97706]', bg: 'bg-[#fef3c7]' },
            { label: 'Biên lợi nhuận', value: loading ? null : formatPrice(totalProfit), sub: loading ? null : `${profitMargin}% biên`, icon: 'trending_up', color: totalProfit >= 0 ? 'text-[#059669]' : 'text-error', bg: totalProfit >= 0 ? 'bg-[#d1fae5]' : 'bg-error-container' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl p-lg shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p className="text-on-surface-variant text-sm mb-xs">{card.label}</p>
                <h3 className={`text-[20px] font-bold leading-none ${card.color}`}>
                  {loading
                    ? <span className="inline-block w-24 h-8 bg-surface-container-high rounded animate-pulse" />
                    : card.value}
                </h3>
                {card.sub && !loading && (
                  <p className={`text-[11px] font-semibold mt-1 ${card.color}`}>{card.sub}</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.bg}`}>
                <span className={`material-symbols-outlined text-[24px] ${card.color}`}>{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/30">
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Mã đơn hàng</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Sản phẩm</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Tổng SL</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Tổng tiền</th>
                  <th className="px-lg py-md text-[12px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Ngày đặt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-lg py-md">
                          <div className="h-4 bg-surface-container-high rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-lg py-16 text-center">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30 block mb-3">receipt_long</span>
                      <p className="text-on-surface-variant text-sm">Chưa có đơn hàng nào</p>
                      <button onClick={() => setModal({ type: 'add' })} className="mt-3 text-primary text-sm font-semibold hover:underline">
                        + Tạo đơn hàng đầu tiên
                      </button>
                    </td>
                  </tr>
                ) : (
                  currentOrders.map(order => {
                    const totalQty = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
                    return (
                      <tr
                        key={order._id}
                        onClick={() => setModal({ type: 'edit', data: order })}
                        className="hover:bg-surface-container-lowest transition-colors cursor-pointer group"
                      >
                        <td className="px-lg py-md">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-[13px] font-semibold text-on-surface bg-surface-container-high px-2 py-1 rounded border border-outline-variant/30">
                              {order.orderId}
                            </span>
                            {order.source && order.source !== 'khác' && (
                              <span className={`flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded w-max ${{
                                  shopee: 'bg-[#ee4d2d]/10 text-[#ee4d2d] border border-[#ee4d2d]/20',
                                  tiktok: 'bg-black text-white border border-black/20',
                                  facebook: 'bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20',
                                  instagram: 'bg-[#e1306c]/10 text-[#e1306c] border border-[#e1306c]/20',
                                  youtube: 'bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/20',
                                  google: 'bg-[#4285f4]/10 text-[#4285f4] border border-[#4285f4]/20'
                                }[order.source] || 'bg-primary/10 text-primary'
                                }`}>
                                <span
                                  className="w-[11px] h-[11px] bg-current inline-block opacity-90"
                                  style={{
                                    maskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${order.source}.svg)`,
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${order.source}.svg)`,
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center'
                                  }}
                                />
                                {order.source}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-lg py-md">
                          <div className="space-y-1">
                            {order.items?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {item.product_image ? (
                                  <img src={item.product_image} alt={item.product_name} className="w-6 h-6 rounded object-cover border border-outline-variant/20 flex-shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-primary-container flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                                    {item.product_name?.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[13px] text-on-surface truncate max-w-[200px]">
                                  {item.product_name}
                                  {item.sku_label ? <span className="text-on-surface-variant"> · {item.sku_label}</span> : ''}
                                  <span className="font-bold text-on-surface-variant"> ×{item.quantity}</span>
                                </span>
                              </div>
                            ))}
                            {(order.items?.length || 0) > 2 && (
                              <p className="text-[11px] text-on-surface-variant pl-8">+{order.items.length - 2} sản phẩm khác</p>
                            )}
                          </div>
                        </td>
                        <td className="px-lg py-md text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-container text-primary text-[13px] font-bold">
                            {totalQty}
                          </span>
                        </td>
                        <td className="px-lg py-md text-right font-mono font-bold text-[14px] text-primary pr-8">
                          {formatPrice(order.total_price)}
                        </td>
                        <td className="px-lg py-md text-center text-[13px] text-on-surface-variant">
                          {formatDate(order.ordered_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          {!loading && orders.length > 0 && (
            <div className="px-lg py-md border-t border-outline-variant/30 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
              <p className="text-on-surface-variant text-[13px]">
                Hiển thị <span className="font-bold text-on-surface">{currentOrders.length}</span> / <span className="font-bold text-on-surface">{orders.length}</span> đơn hàng
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
                  <span className="text-[13px] font-medium text-on-surface">Trang {currentPage} / {totalPages}</span>
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
