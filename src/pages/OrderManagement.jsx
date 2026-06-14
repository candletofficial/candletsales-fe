import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { couponService } from '../services/couponService';
import systemConfigService from '../services/systemConfigService';
import { printInvoice } from '../utils/printInvoice';

// ── Helpers ────────────────────────────────────────────────────────
const formatPrice = (n) =>
  Math.round(n ?? 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const today = () => new Date().toISOString().split('T')[0];

// ── Modal Tạo / Chỉnh sửa đơn hàng ───────────────────────────────
function OrderModal({ order, products, onClose, onSave, onDelete, onMarkReturn, isReplacementMode = false, isSeedingMode = false }) {
  const isEdit = !!order;
  const [items, setItems] = useState(order?.items?.map(i => ({ ...i })) || []);
  const [totalPrice, setTotalPrice] = useState(order ? (order.total_price - (order.logistics_cost || 0) + (order.discount_amount || 0)) : 0);
  const [logisticsCost, setLogisticsCost] = useState(order?.logistics_cost ?? 0);
  const [note, setNote] = useState(order?.note || '');
  const [orderedAt, setOrderedAt] = useState(
    order?.ordered_at ? new Date(order.ordered_at).toISOString().split('T')[0] : today()
  );
  const [source, setSource] = useState(order?.source || 'shopee');
  const [shippingMethod, setShippingMethod] = useState(order?.shippingMethod || 'standard');
  const [orderId, setOrderId] = useState('');
  const [autoTotal, setAutoTotal] = useState(!isEdit);
  const [isReplacement, setIsReplacement] = useState(isReplacementMode || order?.is_replacement || false);
  const [isSeeding, setIsSeeding] = useState(isSeedingMode || order?.is_seeding || false);
  const [seedingCost, setSeedingCost] = useState(order?.seeding_cost || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Discount states
  const [discountCodeInput, setDiscountCodeInput] = useState(order?.discount_code || '');
  const [appliedDiscount, setAppliedDiscount] = useState({
    code: order?.discount_code || null,
    amount: order?.discount_amount || 0
  });
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    couponService.getCoupons().then(res => {
      // Chỉ lấy những mã đang active và còn hạn, còn lượt
      const valid = res.data.data.filter(c => 
        c.is_active && 
        new Date() <= new Date(c.end_date) && 
        c.used_count < c.quantity
      );
      setAvailableCoupons(valid);
    }).catch(err => console.error('Failed to load coupons', err));
  }, []);

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
    setAppliedDiscount({ code: null, amount: 0 }); // Reset discount when changing items
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
    setAppliedDiscount({ code: null, amount: 0 });
  };

  const handleApplyCoupon = async () => {
    if (!discountCodeInput.trim()) {
      setAppliedDiscount({ code: null, amount: 0 });
      setCouponError('');
      return;
    }
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await couponService.validateCoupon(discountCodeInput, items, totalPrice);
      const data = res.data.data;
      setAppliedDiscount({ code: data.code, amount: data.discount_amount });
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setAppliedDiscount({ code: null, amount: 0 });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSeeding && items.length === 0) { setError('Vui lòng thêm ít nhất 1 sản phẩm'); return; }
    setError('');
    setLoading(true);
    try {
      let finalOrderedAt = new Date(orderedAt);
      if (isEdit && order.ordered_at && orderedAt === new Date(order.ordered_at).toISOString().split('T')[0]) {
        finalOrderedAt = new Date(order.ordered_at);
      } else if (!isEdit && orderedAt === today()) {
        finalOrderedAt = new Date();
      }

      const finalPrice = (isReplacement || isSeeding) ? 0 : Math.max(0, totalPrice + logisticsCost - appliedDiscount.amount);

      const payload = { 
        items, 
        total_price: finalPrice, 
        logistics_cost: logisticsCost, 
        source, 
        shippingMethod, 
        note, 
        ordered_at: finalOrderedAt, 
        is_replacement: isReplacement,
        is_seeding: isSeeding,
        seeding_cost: seedingCost,
        discount_amount: appliedDiscount.amount,
        discount_code: appliedDiscount.code
      };
      
      if (isEdit) {
        await orderService.updateOrder(order._id, payload);
      } else {
        await orderService.createOrder({ ...payload, orderId: orderId.trim() || undefined });
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
            <h2 className="text-[17px] font-bold text-on-surface flex items-center gap-2">
              {isReplacementMode && <span className="material-symbols-outlined text-error">local_shipping</span>}
              {isSeedingMode && <span className="material-symbols-outlined text-[#8b5cf6]">campaign</span>}
              {isEdit ? (isReplacementMode ? 'Chỉnh sửa đơn giao bù' : isSeedingMode ? 'Chỉnh sửa đơn Seeding' : 'Chỉnh sửa đơn hàng') : (isReplacementMode ? 'Tạo đơn giao bù' : isSeedingMode ? 'Tạo đơn Seeding' : 'Tạo đơn hàng mới')}
            </h2>
            {isEdit && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[12px] text-on-surface-variant font-mono">{order.orderId}</p>
                {order.status === 'returned' && (
                  <span className="text-[10px] font-bold bg-[#fef3c7] text-[#d97706] border border-[#fde68a] px-2 py-0.5 rounded-full">✕ Bị hoàn</span>
                )}
              </div>
            )}
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

          {/* Mã đơn hàng (chỉ hiển thị khi tạo mới) */}
          {!isEdit && (
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">
                Mã đơn hàng
                <span className="ml-2 text-[11px] font-normal text-on-surface-variant">(để trống để tự sinh)</span>
              </label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value.toUpperCase())}
                placeholder="Tự động sinh nếu để trống..."
                maxLength={30}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] font-mono font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:font-normal placeholder:text-on-surface-variant/40"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">Nhập mã từ sàn (VD: DH-1234567) hoặc để trống — hệ thống sẽ tự tạo mã ngẫu nhiên</p>
            </div>
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

          {isSeedingMode && (
            <div>
              <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Chi phí Seeding (trả KOL, Marketing...) (đ)</label>
              <input
                type="number"
                min="0"
                value={seedingCost}
                onChange={e => setSeedingCost(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]"
              />
            </div>
          )}

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
                        {item.sku_label || 'Mặc định'} · {formatPrice(isReplacementMode ? (item.unit_cost || 0) : item.unit_price)}/cái {isReplacementMode && <span className="text-error font-semibold">(Giá vốn)</span>}
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
                    <p className={`w-28 text-right font-bold text-[14px] font-mono ${isReplacementMode ? 'text-error' : 'text-primary'}`}>
                      {formatPrice((isReplacementMode ? (item.unit_cost || 0) : item.unit_price) * item.quantity)}
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
          {!isReplacementMode && !isSeedingMode ? (
          <div className="bg-primary-container/20 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[14px] text-on-surface">Tổng tiền đơn hàng</span>
              <div className="flex items-center gap-4">
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
            </div>
            <input
              type="number"
              min="0"
              value={totalPrice}
              onChange={e => { 
                setAutoTotal(false); 
                setTotalPrice(Number(e.target.value)); 
                setAppliedDiscount({ code: null, amount: 0 }); 
              }}
              disabled={autoTotal && items.length > 0}
              className="w-full border border-primary/30 rounded-lg px-4 py-3 text-[20px] font-bold text-primary text-right focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white disabled:bg-surface-container-low"
            />
            {autoTotal && items.length > 0 && (
              <p className="text-[11px] text-on-surface-variant mt-1 text-right">Tổng tự động tính từ sản phẩm</p>
            )}

            {!isReplacementMode && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Mã giảm giá</label>
                <div className="flex gap-2">
                  <select
                    value={discountCodeInput}
                    onChange={e => setDiscountCodeInput(e.target.value)}
                    className="flex-1 border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  >
                    <option value="">-- Chọn mã ưu đãi --</option>
                    {availableCoupons.map(c => (
                      <option key={c._id} value={c.code}>
                        {c.code} - {c.name} ({c.type === 'percent' ? `Giảm ${c.value}%` : `Giảm ${formatPrice(c.value)}`})
                      </option>
                    ))}
                    {discountCodeInput && !availableCoupons.find(c => c.code === discountCodeInput) && (
                      <option value={discountCodeInput}>{discountCodeInput} (Đã dùng)</option>
                    )}
                  </select>
                  <button 
                    type="button" 
                    onClick={handleApplyCoupon} 
                    disabled={validatingCoupon || items.length === 0 || !discountCodeInput}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-bold disabled:opacity-50"
                  >
                    {validatingCoupon ? 'Đang kiểm tra...' : 'Áp dụng'}
                  </button>
                </div>
                {couponError && <p className="text-error text-[12px] mt-1 font-medium">{couponError}</p>}
                {appliedDiscount.code && (
                  <div className="mt-2 text-[13px] text-[#059669] font-bold flex justify-between items-center bg-[#d1fae5]/50 px-3 py-2 rounded-lg border border-[#34d399]/30">
                    <span>Mã {appliedDiscount.code}</span>
                    <span>- {formatPrice(appliedDiscount.amount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3 text-[16px] font-bold text-on-surface">
                  <span>Khách phải trả:</span>
                  <span>{formatPrice(Math.max(0, totalPrice + logisticsCost - appliedDiscount.amount))}</span>
                </div>
              </div>
            )}
          </div>
          ) : isReplacementMode ? (
            <div className="bg-error-container/20 rounded-xl p-4 border border-error/20 flex items-start gap-3 text-error">
              <span className="material-symbols-outlined text-[24px]">info</span>
              <div>
                <p className="text-[14px] font-bold">Đây là Đơn Giao Bù</p>
                <p className="text-[12px] opacity-90 mt-0.5">Doanh thu sẽ không được tính (0đ) nhưng hệ thống vẫn trừ kho và tính chi phí đóng gói, giao hàng như bình thường.</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#f5f3ff] rounded-xl p-4 border border-[#ddd6fe] flex items-start gap-3 text-[#7c3aed]">
              <span className="material-symbols-outlined text-[24px]">campaign</span>
              <div>
                <p className="text-[14px] font-bold">Đây là Đơn Seeding</p>
                <p className="text-[12px] opacity-90 mt-0.5">Doanh thu sẽ không được tính (0đ). Bạn có thể không cần chọn sản phẩm nếu chỉ muốn ghi nhận chi phí trả cho KOL.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-between items-center rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            {isEdit && (
              <>
                <button
                  type="button"
                  onClick={() => printInvoice(order)}
                  className="px-3 py-2 text-primary hover:bg-primary/10 rounded-lg text-[14px] font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  In Hóa Đơn
                </button>

                <div className="w-[1px] h-4 bg-outline-variant/50 mx-1"></div>

                {order.status !== 'returned' && !isReplacementMode && !isSeedingMode && (
                  <button
                    type="button"
                    onClick={onMarkReturn}
                    className="px-3 py-2 text-[#d97706] hover:bg-[#d97706]/10 rounded-lg text-[14px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                    Đánh dấu hoàn
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-2 text-error hover:bg-error/10 rounded-lg text-[14px] font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Xóa
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-on-surface-variant text-[14px] font-medium hover:bg-surface-container rounded-lg transition-colors">
              Hủy
            </button>
            {(!isEdit || order.status !== 'returned') && (
              <button onClick={handleSubmit} disabled={loading || (!isSeeding && items.length === 0)}
                className="px-6 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-sm">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isEdit ? 'Lưu thay đổi' : 'Tạo đơn hàng'}
              </button>
            )}
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
  const isReturned = order.status === 'returned';
  const [restoreStock, setRestoreStock] = useState(!isReturned); // đơn hoàn: mặc định false vì kho đã hoàn rồi

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

        {isReturned ? (
          /* Đơn đã hoàn — kho đã được hoàn khi markAsReturned, không cần hoàn thêm */
          <div className="flex items-start gap-2.5 text-sm bg-[#fef9c3] text-[#854d0e] px-4 py-3 rounded-lg border border-[#fde68a] w-full mb-6 text-left">
            <span className="material-symbols-outlined text-[17px] flex-shrink-0 mt-0.5">info</span>
            <span>Đơn hàng này đã bị hoàn — nguyên liệu đã được <strong>hoàn vào kho</strong> trước đó. Xóa đơn sẽ không thay đổi tồn kho.</span>
          </div>
        ) : (
          /* Đơn hoàn thành — cho phép chọn hoàn kho hay không */
          <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-6 cursor-pointer bg-surface-container-low px-4 py-2.5 rounded-lg border border-outline-variant/30 w-full hover:bg-surface-container transition-colors">
            <input
              type="checkbox"
              checked={restoreStock}
              onChange={(e) => setRestoreStock(e.target.checked)}
              className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            <span className="flex-1 text-left font-medium">Khôi phục lại nguyên liệu vào kho</span>
          </label>
        )}

        <div className="flex justify-center gap-3 w-full">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container flex-1">Hủy</button>
          <button onClick={() => onConfirm(isReturned ? false : restoreStock)} disabled={loading} className="px-5 py-2 rounded-lg bg-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 flex-1">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xóa đơn hàng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Xác nhận đánh dấu đơn hoàn ────────────────────────────────
function ReturnModal({ order, returnCost, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[#d97706] text-[28px]">assignment_return</span>
        </div>
        <h3 className="text-[17px] font-bold text-on-surface mb-1">Xác nhận đơn hàng bị hoàn</h3>
        <p className="text-sm text-on-surface-variant mb-5">
          Đơn hàng <span className="font-semibold text-on-surface">"{order.orderId}"</span> sẽ bị đánh dấu là <strong>Bị hoàn</strong>.
          Nguyên liệu sẽ được hoàn trả vào kho.
        </p>

        <div className="w-full space-y-2 mb-6">
          <div className="flex items-center justify-between bg-surface-container-low px-4 py-3 rounded-lg border border-outline-variant/30">
            <span className="text-[13px] text-on-surface-variant font-medium">Doanh thu đơn hàng</span>
            <span className="text-[14px] font-bold text-on-surface font-mono">{formatPrice(order.total_price)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#fef3c7] px-4 py-3 rounded-lg border border-[#fde68a]">
            <span className="text-[13px] text-[#92400e] font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">payments</span>
              Chi phí hoàn hàng
            </span>
            <span className="text-[14px] font-bold text-[#d97706] font-mono">{formatPrice(returnCost)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#fee2e2] px-4 py-3 rounded-lg border border-[#fca5a5]">
            <span className="text-[13px] text-[#991b1b] font-semibold">Tổng thiệt hại</span>
            <span className="text-[15px] font-bold text-[#dc2626] font-mono">{formatPrice(order.total_price + returnCost)}</span>
          </div>
        </div>

        <div className="flex justify-center gap-3 w-full">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container flex-1">Hủy</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-[#d97706] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 flex-1"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xác nhận hoàn đơn
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
  const [modal, setModal] = useState(null); // null | { type: 'add'|'edit'|'delete'|'return', data? }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [returnCostConfig, setReturnCostConfig] = useState({});
  // Date filter
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // Source filter
  const [sourceFilter, setSourceFilter] = useState('all');
  // Status filter
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'returned'
  // Search from URL
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrders, resProducts, resReturnCost] = await Promise.all([
        orderService.getOrders(),
        productService.getProducts(),
        systemConfigService.getConfig('return_cost_per_platform'),
      ]);
      setOrders(resOrders.data.data);
      if (resProducts.data.success) setProducts(resProducts.data.data);
      if (resReturnCost && resReturnCost.success && resReturnCost.data.value) {
        try {
          setReturnCostConfig(JSON.parse(resReturnCost.data.value));
        } catch(e) {
          setReturnCostConfig({});
        }
      }
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

  const handleReturn = async () => {
    setActionLoading(true);
    try {
      const res = await orderService.markAsReturned(modal.data._id);
      showToast(res.data?.message || 'Đã đánh dấu đơn hàng bị hoàn');
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered orders theo bộ lọc thời gian & nguồn
  const filteredOrders = orders.filter(o => {
    // Lọc theo mã đơn hàng
    if (searchQuery && !((o.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) || (o._id || '').toLowerCase().includes(searchQuery.toLowerCase()))) return false;

    // Lọc theo trạng thái hoàn
    if (statusFilter !== 'all' && (o.status || 'completed') !== statusFilter) return false;

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

  // Stats — chỉ tính đơn hoàn thành (không tính đơn bị hoàn vào doanh thu)
  const completedOrders = filteredOrders.filter(o => (o.status || 'completed') === 'completed');
  const normalCompletedOrders = completedOrders.filter(o => !o.is_replacement && !o.is_seeding);
  const returnedOrders  = filteredOrders.filter(o => o.status === 'returned');
  const totalRevenue = normalCompletedOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalItems   = normalCompletedOrders.reduce((s, o) => s + (o.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0);
  const totalCost    = completedOrders.reduce((s, o) => s + (o.seeding_cost || 0) + (o.items?.reduce((a, i) => a + (i.unit_cost || 0) * i.quantity, 0) || 0) + (o.logistics_cost || 0) + (o.packaging_cost || 0), 0)
                     + returnedOrders.reduce((s, o) => s + (o.return_cost || 0), 0); // thêm chi phí hoàn
  const totalProfit  = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
  const totalReturned = returnedOrders.length;

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
      {modal?.type === 'add_replacement' && (
        <OrderModal products={products} onClose={() => setModal(null)} onSave={handleSave} isReplacementMode={true} />
      )}
      {modal?.type === 'add_seeding' && (
        <OrderModal products={products} onClose={() => setModal(null)} onSave={handleSave} isSeedingMode={true} />
      )}
      {modal?.type === 'edit' && (
        <OrderModal
          order={modal.data}
          products={products}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={() => setModal({ type: 'delete', data: modal.data })}
          onMarkReturn={() => setModal({ type: 'return', data: modal.data })}
          isReplacementMode={modal.data?.is_replacement}
          isSeedingMode={modal.data?.is_seeding}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal order={modal.data} onClose={() => setModal(null)} onConfirm={handleDelete} loading={actionLoading} />
      )}
      {modal?.type === 'return' && (
        <ReturnModal
          order={modal.data}
          returnCost={returnCostConfig[modal.data.source || 'khác'] || 0}
          onClose={() => setModal(null)}
          onConfirm={handleReturn}
          loading={actionLoading}
        />
      )}

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Quản lý Đơn hàng</h2>
            <p className="text-on-surface-variant mt-1 text-[14px]">Tạo và quản lý toàn bộ đơn hàng bán hàng</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal({ type: 'add_seeding' })}
              className="flex items-center gap-xs px-lg py-sm bg-[#f5f3ff] text-[#7c3aed] rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm border border-[#ddd6fe]"
            >
              <span className="material-symbols-outlined text-[20px]">campaign</span>
              <span className="hidden sm:inline">Tạo đơn seeding</span>
            </button>
            <button
              onClick={() => setModal({ type: 'add_replacement' })}
              className="flex items-center gap-xs px-lg py-sm bg-error-container text-error rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm border border-error/20"
            >
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              <span>Tạo đơn giao bù</span>
            </button>
            <button
              onClick={() => setModal({ type: 'add' })}
              className="flex items-center gap-xs px-lg py-sm bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-sm font-semibold text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Tạo đơn hàng mới</span>
            </button>
          </div>
        </div>
        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 px-lg py-md mb-lg flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6">
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {[['all', 'Tất cả', ''], ['completed', 'Hoàn thành', 'text-[#059669]'], ['returned', 'Bị hoàn', 'text-[#d97706]']].map(([val, label, color]) => (
              <button
                key={val}
                onClick={() => { setStatusFilter(val); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
                  statusFilter === val
                    ? val === 'returned'
                      ? 'bg-[#fef3c7] border-[#fde68a] text-[#d97706]'
                      : val === 'completed'
                        ? 'bg-[#d1fae5] border-[#6ee7b7] text-[#059669]'
                        : 'bg-primary-container border-primary/30 text-primary'
                    : 'bg-white border-outline-variant/50 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {label}
                {val === 'returned' && orders.filter(o => o.status === 'returned').length > 0 && (
                  <span className="ml-1 bg-[#d97706] text-white text-[10px] px-1.5 py-0.5 rounded-full">{orders.filter(o => o.status === 'returned').length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

          {/* Badge kết quả lọc */}
          <span className="ml-auto text-[12px] text-on-surface-variant bg-surface-container px-4 py-1.5 rounded-full font-bold">
            {filteredOrders.length} / {orders.length} đơn hàng
          </span>
        </div>

        <div className="grid grid-cols-4 gap-md mb-lg">
          {[
            { label: 'Tổng đơn hàng', value: loading ? null : filteredOrders.length, icon: 'receipt_long', color: 'text-primary', bg: 'bg-primary-container' },
            { label: 'Sản phẩm bán ra', value: loading ? null : totalItems.toLocaleString('vi-VN'), icon: 'inventory_2', color: 'text-[#059669]', bg: 'bg-[#d1fae5]' },
            { label: 'Doanh thu thực', value: loading ? null : formatPrice(totalRevenue), sub: loading ? null : `${totalReturned} đơn hoàn`, icon: 'payments', color: 'text-[#d97706]', bg: 'bg-[#fef3c7]' },
            { label: 'Lợi nhuận', value: loading ? null : formatPrice(totalProfit), sub: loading ? null : `${profitMargin}% biên`, icon: 'trending_up', color: totalProfit >= 0 ? 'text-[#059669]' : 'text-error', bg: totalProfit >= 0 ? 'bg-[#d1fae5]' : 'bg-error-container' },
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
                        className={`transition-colors cursor-pointer group ${
                          order.status === 'returned'
                            ? 'bg-[#fefce8] hover:bg-[#fef9c3]'
                            : 'hover:bg-surface-container-lowest'
                        }`}
                      >
                        <td className="px-lg py-md">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-[13px] font-semibold text-on-surface bg-surface-container-high px-2 py-1 rounded border border-outline-variant/30">
                              {order.orderId}
                            </span>
                            {order.status === 'returned' && (
                              <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded w-max bg-[#fef3c7] text-[#d97706] border border-[#fde68a]">
                                <span className="material-symbols-outlined text-[11px]">assignment_return</span>
                                Hoàn
                              </span>
                            )}
                            {order.is_replacement && (
                              <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded w-max bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]">
                                Giao bù
                              </span>
                            )}
                            {order.is_seeding && (
                              <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded w-max bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]">
                                Seeding
                              </span>
                            )}
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
                            {!order.items || order.items.length === 0 ? (
                              <span className="text-[13px] italic text-on-surface-variant opacity-70">Không kèm sản phẩm</span>
                            ) : (
                              <>
                                {order.items.slice(0, 2).map((item, idx) => (
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
                                {order.items.length > 2 && (
                                  <p className="text-[11px] text-on-surface-variant pl-8">+{order.items.length - 2} sản phẩm khác</p>
                                )}
                              </>
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
