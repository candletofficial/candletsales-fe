import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import OrderItemMaterialsModal from '../components/OrderItemMaterialsModal';
import OrderCustomerDetails from '../components/OrderCustomerDetails';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { couponService } from '../services/couponService';
import systemConfigService from '../services/systemConfigService';
import { fundService } from '../services/fundService';
import { printInvoice } from '../utils/printInvoice';
import { getImageUrl } from '../utils/imageUtils';
import { shippingDiscountLabel, shippingDiscountConditions } from '../utils/couponUtils';

// ── Helpers ────────────────────────────────────────────────────────
const formatPrice = (n) =>
  Math.round(n ?? 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Modal Tạo / Chỉnh sửa đơn hàng ───────────────────────────────
function OrderModal({ order, products, onClose, onSave, onDelete, onMarkReturn, onMaterialsSaved, onTrackingCreated, onStatusSaved, isReplacementMode = false, isSeedingMode = false }) {
  const isEdit = !!order;
  const [items, setItems] = useState(order?.items?.map(i => ({ ...i })) || []);
  const [materialsIndex, setMaterialsIndex] = useState(null);
  // totalPrice = tiền hàng thuần (chưa bao gồm shipping_fee của khách, chưa trừ discount)
  const [totalPrice, setTotalPrice] = useState(order ? (() => {
    if (order.source === 'website') {
      // Website: total_price = tiền hàng + shipping_fee - discount
      return order.total_price - (order.shipping_fee || 0) + (order.discount_amount || 0);
    }
    // Legacy admin orders included shop-paid shipping in total_price. After the
    // next save, this flag prevents subtracting the shipping cost a second time.
    const legacyShipping = order.total_excludes_logistics === true ? 0 : (order.logistics_cost || 0);
    return order.total_price - legacyShipping + (order.discount_amount || 0);
  })() : 0);
  const [logisticsCost, setLogisticsCost] = useState(order?.logistics_cost ?? 0);
  // shipping_fee: chỉ dùng cho đơn website — phí vận chuyển khách trả (hỏa tốc / thường)
  const [shippingFee, setShippingFee] = useState(order?.shipping_fee || 0);
  const [note, setNote] = useState(order?.note || '');
  const [orderedAt, setOrderedAt] = useState(() => {
    if (order && order.ordered_at) {
      const d = new Date(order.ordered_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return today();
  });
  const [source, setSource] = useState(order?.source || 'shopee');
  const [deliveryStatus, setDeliveryStatus] = useState(order?.delivery_status || (order?.source === 'website' ? 'pending' : 'delivered'));
  const [statusSaving, setStatusSaving] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const statusRequestRef = useRef(false);
  const [createTracking, setCreateTracking] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const managesDelivery = source === 'website' || order?.tracking_enabled;
  const canEditCustomer = source === 'website' || source === 'pos' || !order?.pancake_order_id;
  const trackingCode = order?.tracking_token
    ? btoa(String.fromCharCode(...(order.tracking_token.slice(0, 16).match(/.{2}/g) || []).map(value => parseInt(value, 16))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    : '';
  const trackingUrl = trackingCode ? `${window.location.origin}/s/${trackingCode}` : '';
  const handleCreateTracking = async () => {
    setLinkLoading(true);
    setError('');
    try {
      const result = await orderService.createTrackingLink(order._id);
      setDeliveryStatus(result.data.data.order.delivery_status);
      onTrackingCreated(result.data.data.order);
      setLinkMessage('Đã tạo link. Bạn có thể sao chép và gửi cho khách.');
    } catch (err) { setError(err.response?.data?.message || 'Không tạo được link theo dõi.'); }
    finally { setLinkLoading(false); }
  };
  const handleCopyTracking = async () => {
    try { await navigator.clipboard.writeText(trackingUrl); setLinkMessage('Đã sao chép link theo dõi.'); }
    catch { setLinkMessage('Hãy chọn đường link bên dưới và sao chép thủ công.'); }
  };
  const [cancelReason, setCancelReason] = useState(order?.cancelled_reason || '');
  const [posMode, setPosMode] = useState(order?.pos_mode || 'offline');
  const [customerName, setCustomerName] = useState(order?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone || '');
  const [customerAddress, setCustomerAddress] = useState(order?.customer_address || '');
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || 'cash');
  const [shippingMethod, setShippingMethod] = useState(order?.shippingMethod || 'standard');
  const [orderId, setOrderId] = useState(order?.orderId || '');
  const [showConfirmAcceptModal, setShowConfirmAcceptModal] = useState(false);
  const [confirmAcceptLoading, setConfirmAcceptLoading] = useState(false);
  const [autoTotal, setAutoTotal] = useState(!isEdit);
  const [isReplacement, setIsReplacement] = useState(isReplacementMode || order?.is_replacement || false);
  const [isSeeding, setIsSeeding] = useState(isSeedingMode || order?.is_seeding || false);
  const [seedingCost, setSeedingCost] = useState(order?.seeding_cost || 0);
  const [returnCost, setReturnCost] = useState(order?.return_cost || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [requiredDepositAmount, setRequiredDepositAmount] = useState(0);

  const handleStatusChange = async (nextStatus) => {
    if (statusRequestRef.current || loading || linkLoading || confirmAcceptLoading || nextStatus === deliveryStatus) return;
    if (!isEdit) {
      setDeliveryStatus(nextStatus);
      return;
    }
    statusRequestRef.current = true;
    setStatusSaving(nextStatus);
    setStatusMessage('');
    setError('');
    try {
      const result = await orderService.updateDeliveryStatus(order._id, {
        delivery_status: nextStatus,
        ...(nextStatus === 'cancelled' ? { cancelled_reason: cancelReason.trim() || 'Đã huỷ theo yêu cầu' } : {}),
      });
      const updatedOrder = result.data.data;
      setDeliveryStatus(updatedOrder.delivery_status);
      if (nextStatus === 'cancelled') setCancelReason(updatedOrder.cancelled_reason || '');
      if (updatedOrder.status === 'returned') setReturnCost(updatedOrder.return_cost || 0);
      onStatusSaved(updatedOrder);
      setStatusMessage('Đã lưu trạng thái. Trang theo dõi của khách sẽ cập nhật tự động.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không lưu được trạng thái. Vui lòng thử lại.');
    } finally {
      statusRequestRef.current = false;
      setStatusSaving(null);
    }
  };
  const handleStatusClick = (event) => {
    const nextStatus = event.currentTarget.dataset.status;
    if (nextStatus === 'confirmed' && deliveryStatus === 'confirmed') {
      setShowConfirmAcceptModal(true);
    } else {
      handleStatusChange(nextStatus);
    }
  };

  // Xử lý xác nhận chấp nhận đơn hàng và cập nhật mã vận đơn / phí ship
  const handleConfirmAcceptOrder = async ({ newOrderId, newLogisticsCost, saveDirectly }) => {
    setOrderId(newOrderId);
    setLogisticsCost(newLogisticsCost);
    setDeliveryStatus('confirmed');

    if (saveDirectly && isEdit) {
      setConfirmAcceptLoading(true);
      try {
        let finalOrderedAt = new Date(orderedAt);
        if (order.ordered_at && orderedAt === new Date(order.ordered_at).toISOString().split('T')[0]) {
          finalOrderedAt = new Date(order.ordered_at);
        }

        const finalPrice = isReplacement ? 0 : isSeeding ? totalPrice : Math.max(0, (() => {
          const base = totalPrice - appliedDiscount.amount;
          if (source === 'website') return base + shippingFee;
          return base;
        })());

        const payload = {
          orderId: newOrderId,
          items,
          total_price: finalPrice,
          logistics_cost: newLogisticsCost,
          source,
          pos_mode: source === 'pos' ? posMode : undefined,
          customer_name: canEditCustomer ? customerName : undefined,
          customer_phone: canEditCustomer ? customerPhone : undefined,
          customer_address: canEditCustomer ? customerAddress : undefined,
          payment_method: canEditCustomer ? paymentMethod : undefined,
          shippingMethod,
          delivery_status: 'confirmed',
          note,
          ordered_at: finalOrderedAt,
          is_replacement: isReplacement,
          is_seeding: isSeeding,
          seeding_cost: seedingCost,
          shipping_fee: source === 'website' ? shippingFee : 0,
          discount_amount: appliedDiscount.amount,
          discount_code: appliedDiscount.code
        };

        await orderService.updateOrder(order._id, payload);
        setShowConfirmAcceptModal(false);
        onSave();
      } catch (err) {
        if (err.response?.data?.code === 'INSUFFICIENT_FUND') {
          const amt = err.response.data.requiredAmount || 0;
          setRequiredDepositAmount(amt);
          setShowDepositModal(true);
        } else {
          alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đơn hàng');
        }
      } finally {
        setConfirmAcceptLoading(false);
      }
    } else {
      setShowConfirmAcceptModal(false);
    }
  };

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
    let active = true;
    setAvailableCoupons([]);
    couponService.getCoupons(source).then(res => {
      // Chỉ lấy những mã đang active và còn hạn, còn lượt
      const valid = res.data.data.filter(c => 
        (source === 'website' || (c.type !== 'freeship' && !c.is_website_only)) &&
        c.is_active && new Date() >= new Date(c.start_date) &&
        new Date() <= new Date(c.end_date) && 
        c.used_count < c.quantity
      );
      if (active) setAvailableCoupons(valid);
    }).catch(err => console.error('Failed to load coupons', err));
    return () => { active = false; };
  }, [source]);

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
      const res = await couponService.validateCoupon(discountCodeInput, items, totalPrice, source === 'website' ? shippingFee : 0, source);
      const data = res.data.data;
      setAppliedDiscount({ code: data.code, amount: data.discount_amount });
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setAppliedDiscount({ code: null, amount: 0 });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e, withTracking = createTracking) => {
    e.preventDefault();
    if (loading || statusRequestRef.current) return;
    setCreateTracking(withTracking);
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

      // Tính final total_price (số tiền khách phải trả)
      // Website: tiền hàng + shipping_fee - discount (logistics_cost không cộng vào khách trả)
      // Non-website: logistics_cost là chi phí shop, không nằm trong tiền khách trả.
      const finalPrice = isReplacement ? 0 : isSeeding ? totalPrice : Math.max(0, (() => {
        const base = totalPrice - appliedDiscount.amount;
        if (source === 'website') return base + shippingFee;
        // Phí vận chuyển ngoài website do shop chịu.
        return base;
      })());

      const payload = { 
        orderId: orderId.trim() || undefined,
        items, 
        total_price: finalPrice, 
        logistics_cost: logisticsCost, 
        source, 
        pos_mode: source === 'pos' ? posMode : undefined,
        customer_name: canEditCustomer ? customerName : undefined,
        customer_phone: canEditCustomer ? customerPhone : undefined,
        customer_address: canEditCustomer ? customerAddress : undefined,
        payment_method: canEditCustomer ? paymentMethod : undefined,
        shippingMethod, 
        delivery_status: managesDelivery ? deliveryStatus : undefined,
        cancelled_reason: (managesDelivery && deliveryStatus === 'cancelled') ? cancelReason : undefined,
        note, 
        ordered_at: finalOrderedAt, 
        is_replacement: isReplacement,
        is_seeding: isSeeding,
        seeding_cost: seedingCost,
        shipping_fee: source === 'website' ? shippingFee : 0,
        discount_amount: appliedDiscount.amount,
        discount_code: appliedDiscount.code,
        return_cost: (isEdit && order?.status === 'returned') ? returnCost : undefined
      };
      
      if (isEdit) {
        await orderService.updateOrder(order._id, payload);
        onSave();
      } else {
        const result = await orderService.createOrder({ ...payload, orderId: orderId.trim() || undefined, create_tracking_link: withTracking });
        onSave(result.data.data, { keepOpen: withTracking });
      }
    } catch (err) {
      if (err.response?.data?.code === 'INSUFFICIENT_FUND') {
        const amt = err.response.data.requiredAmount || 0;
        setRequiredDepositAmount(amt);
        setShowDepositModal(true);
      } else {
        setError(err.response?.data?.message || 'Có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSuccess = () => {
    setShowDepositModal(false);
    setError('');
    // Automatically submit again after successful deposit
    handleSubmit(new Event('submit'));
  };

  const isReturned = order?.status === 'returned';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1020px] max-h-[92vh] flex flex-col overflow-hidden border border-stone-100 animate-[fadeIn_0.15s_ease]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#003366] to-[#1e40af] text-white flex items-center justify-center shadow-xs shadow-primary/20">
              <span className="material-symbols-outlined text-[24px]">
                {isReplacementMode ? 'local_shipping' : isSeedingMode ? 'campaign' : 'receipt_long'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[18px] font-bold text-stone-900">
                  {isEdit
                    ? (isReplacementMode ? 'Chi tiết Đơn Giao Bù' : isSeedingMode ? 'Chi tiết Đơn Seeding' : 'Chi tiết & Chỉnh sửa Đơn Hàng')
                    : (isReplacementMode ? 'Tạo Đơn Giao Bù Mới' : isSeedingMode ? 'Tạo Đơn Seeding Mới' : 'Tạo Đơn Hàng Mới')}
                </h2>
                {isEdit && (
                  <span className="font-mono text-[13px] font-bold text-primary bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                    #{orderId || order.orderId}
                  </span>
                )}
                {shippingMethod === 'express' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-xs shadow-orange-300 animate-pulse">
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    HỎA TỐC 4H
                  </span>
                )}
                {isEdit && order.status === 'returned' && (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    ✕ Bị hoàn
                  </span>
                )}
              </div>
              <p className="text-[12px] text-stone-500 mt-0.5">
                {isEdit ? `Thời gian đặt: ${formatDate(order.ordered_at)} • Cập nhật thông tin đơn hàng` : 'Nhập thông tin sản phẩm và giao nhận để tạo đơn'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={() => printInvoice({
                  ...order,
                  orderId: orderId || order.orderId,
                  customer_name: customerName || order.customer_name,
                  customer_phone: customerPhone || order.customer_phone,
                  customer_address: customerAddress || order.customer_address,
                  shippingMethod: shippingMethod || order.shippingMethod,
                  payment_method: paymentMethod || order.payment_method,
                  source: source || order.source,
                  total_price: isReplacement ? 0 : isSeeding ? totalPrice : Math.max(0, (() => {
                    const base = totalPrice - appliedDiscount.amount;
                    if (source === 'website') return base + shippingFee;
                    return base;
                  })()),
                  shipping_fee: source === 'website' ? shippingFee : (order.shipping_fee || 0),
                  logistics_cost: logisticsCost,
                  discount_amount: appliedDiscount.amount,
                  discount_code: appliedDiscount.code,
                  items: items.length > 0 ? items : order.items,
                  note: note !== undefined ? note : order.note
                })}
                className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="In hóa đơn bán hàng / phiếu xuất kho"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">print</span>
                <span className="hidden sm:inline">In Hóa Đơn</span>
              </button>
            )}
            <button
              disabled={Boolean(statusSaving)}
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Priority Express Banner (Nếu là đơn hỏa tốc) */}
        {shippingMethod === 'express' && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/5 border-b border-orange-200 flex items-center justify-between gap-3 animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-orange-300">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 px-2 py-0.5 rounded border border-orange-300">
                  ĐƠN GIAO HỎA TỐC 4H
                </span>
                <span className="text-[12px] font-semibold text-orange-800">
                  Đơn hàng ưu tiên đặc biệt — Cần đóng gói & bàn giao shipper xuất kho trong ngày!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body - 2 Columns Layout */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* ═══════════ FULL WIDTH: TIẾN TRÌNH TRẠNG THÁI GIAO HÀNG (ĐƠN WEBSITE) ═══════════ */}
          {isEdit && !order.pancake_order_id && (
            <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="flex items-center gap-2 text-sm font-bold text-stone-800"><span aria-hidden="true" className="material-symbols-outlined text-primary">link</span>Link theo dõi đơn hàng</h3><p className="mt-1 text-xs text-stone-500">Khách mở link để xem tiến trình giao hàng, không cần đăng nhập.</p></div>
                {trackingUrl ? <div className="flex gap-2"><button type="button" onClick={handleCopyTracking} className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800">Sao chép link</button><a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Mở trang</a></div>
                  : <button type="button" onClick={handleCreateTracking} disabled={linkLoading || loading || Boolean(statusSaving)} className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{linkLoading ? 'Đang tạo…' : 'Tạo link theo dõi'}</button>}
              </div>
              {trackingUrl && <input aria-label="Đường link theo dõi đơn hàng" readOnly value={trackingUrl} onFocus={e => e.target.select()} className="mt-3 w-full rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-blue-800" />}
              {linkMessage && <p role="status" className="mt-2 text-xs text-emerald-700">{linkMessage}</p>}
            </section>
          )}
          {managesDelivery && (() => {
            // Hàm kiểm tra tính hợp lệ khi ép buộc chuyển trạng thái tuần tự
            const checkStatusAvailability = (targetVal) => {
              if (targetVal === deliveryStatus) {
                return { allowed: true, isCurrent: true, isCompleted: false, isNext: false, reason: 'Trạng thái hiện tại' };
              }

              // Đơn đã giao thành công hoặc đã huỷ thì khoá toàn bộ thao tác đổi
              if (deliveryStatus === 'delivered' || deliveryStatus === 'cancelled' || isReturned) {
                return { allowed: false, isCurrent: false, isCompleted: false, isNext: false, reason: 'Đơn hàng đã hoàn tất chu trình, không thể thay đổi' };
              }

              const MAIN_STEPS = ['pending', 'confirmed', 'shipping', 'delivered'];
              const currentIdx = MAIN_STEPS.indexOf(deliveryStatus);
              const targetIdx = MAIN_STEPS.indexOf(targetVal);

              // 1. Đối với 4 bước chính tuần tự:
              if (targetIdx !== -1) {
                // Nếu đang ở trạng thái 'failed': chỉ được phép chuyển sang 'shipping' để giao lại
                if (deliveryStatus === 'failed') {
                  const allowed = targetVal === 'shipping';
                  return { 
                    allowed, 
                    isCurrent: false, 
                    isCompleted: false, 
                    isNext: allowed, 
                    reason: allowed ? 'Bấm để giao hàng lại lần 2' : 'Cần giao lại trước khi hoàn thành' 
                  };
                }

                // Bước kế tiếp liền kề (Bắt buộc tuần tự tiến)
                if (targetIdx === currentIdx + 1) {
                  return { allowed: true, isCurrent: false, isCompleted: false, isNext: true, reason: 'Bước tiếp theo hợp lệ' };
                }

                // Bước đã hoàn thành trong quá khứ (< currentIdx)
                if (targetIdx < currentIdx) {
                  // Cho phép hoàn tác duy nhất từ confirmed về pending khi chưa bàn giao shipper
                  const canRollback = deliveryStatus === 'confirmed' && targetVal === 'pending';
                  return { 
                    allowed: canRollback, 
                    isCurrent: false, 
                    isCompleted: true, 
                    isNext: false, 
                    reason: canRollback ? 'Bấm để hoàn lại bước Chờ xác nhận' : 'Giai đoạn này đã hoàn thành' 
                  };
                }

                // Bước nhảy cóc trong tương lai (> currentIdx + 1) -> CẤM
                return { 
                  allowed: false, 
                  isCurrent: false, 
                  isCompleted: false, 
                  isNext: false, 
                  reason: `Bắt buộc phải qua bước "${MAIN_STEPS[currentIdx + 1] === 'confirmed' ? 'Đã chấp nhận' : MAIN_STEPS[currentIdx + 1] === 'shipping' ? 'Đang giao hàng' : 'Giao thành công'}" trước!` 
                };
              }

              // 2. Nếu target là 'failed' (Giao thất bại):
              if (targetVal === 'failed') {
                const allowed = deliveryStatus === 'shipping';
                return { 
                  allowed, 
                  isCurrent: false, 
                  isCompleted: false, 
                  isNext: false, 
                  reason: allowed ? 'Đánh dấu giao hàng không thành công' : 'Chỉ có thể ghi nhận thất bại khi đơn đang trên đường giao hàng' 
                };
              }

              // 3. Nếu target là 'cancelled' (Đã huỷ):
              if (targetVal === 'cancelled') {
                const isLocked = deliveryStatus === 'shipping' || deliveryStatus === 'delivered' || (order && (order.delivery_status === 'shipping' || order.delivery_status === 'delivered'));
                return { 
                  allowed: !isLocked, 
                  isCurrent: false, 
                  isCompleted: false, 
                  isNext: false, 
                  reason: isLocked ? 'Không thể huỷ đơn khi đã bàn giao shipper hoặc đã giao thành công' : 'Huỷ đơn hàng' 
                };
              }

              return { allowed: false, isCurrent: false, isCompleted: false, isNext: false };
            };

            return (
              <div className="relative rounded-2xl p-5 sm:p-6 border-2 border-amber-400/90 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 shadow-[0_6px_25px_-5px_rgba(245,158,11,0.18)] space-y-4 overflow-hidden mb-6">
                {/* Decorative Corner Tag / Marker */}
                <div className="absolute top-0 right-0">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-bl-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-mono font-bold tracking-wider uppercase shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    {source === 'website' ? 'Ưu Tiên Xử Lý • Đơn Website' : 'Đơn có link theo dõi'}
                  </span>
                </div>

                {/* Header Khối Trạng thái */}
                <div className="pb-3 border-b border-amber-200/60 pr-32">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">alt_route</span>
                    </span>
                    <h3 className="text-[14px] sm:text-[15px] font-black uppercase tracking-wider text-stone-900">
                      Tiến Trình Giao Hàng
                    </h3>
                  </div>
                  <p className="text-[12px] text-stone-600 font-medium">
                    {isEdit ? 'Bấm vào bước tiếp theo để chuyển và lưu trạng thái ngay.' : 'Trạng thái sẽ được lưu khi tạo đơn hàng.'}
                  </p>
                  {(statusSaving || statusMessage) && <p role="status" className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${statusSaving ? 'text-blue-700' : 'text-emerald-700'}`}><span aria-hidden="true" className={`material-symbols-outlined text-base ${statusSaving ? 'animate-spin' : ''}`}>{statusSaving ? 'progress_activity' : 'check_circle'}</span>{statusSaving ? 'Đang lưu trạng thái…' : statusMessage}</p>}
                </div>

                {/* Status Indicator Banner (Mô tả hành động của trạng thái hiện tại) */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-[12.5px] transition-colors ${
                  deliveryStatus === 'pending'
                    ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                    : deliveryStatus === 'confirmed'
                    ? 'bg-blue-100/70 border-blue-300 text-blue-950'
                    : deliveryStatus === 'shipping'
                    ? 'bg-indigo-100/70 border-indigo-300 text-indigo-950'
                    : deliveryStatus === 'delivered'
                    ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                    : deliveryStatus === 'failed'
                    ? 'bg-rose-100/70 border-rose-300 text-rose-950'
                    : 'bg-stone-200/70 border-stone-300 text-stone-800'
                }`}>
                  <div className="flex items-center gap-2.5 font-medium truncate">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${
                      deliveryStatus === 'pending' ? 'bg-amber-600' :
                      deliveryStatus === 'confirmed' ? 'bg-blue-600' :
                      deliveryStatus === 'shipping' ? 'bg-indigo-600' :
                      deliveryStatus === 'delivered' ? 'bg-emerald-600' :
                      deliveryStatus === 'failed' ? 'bg-rose-600' : 'bg-stone-600'
                    }`}></span>
                    <span className="font-bold">Trạng thái hiện tại:</span>
                    <span className="truncate">
                      {deliveryStatus === 'pending' && 'Khách vừa đặt — Cần admin kiểm tra và duyệt đơn để xuất kho'}
                      {deliveryStatus === 'confirmed' && 'Đã duyệt đơn — Đang đóng gói sản phẩm và chuẩn bị gọi shipper'}
                      {deliveryStatus === 'shipping' && 'Đang giao hàng — Đơn vị vận chuyển đang giao tới tay khách hàng'}
                      {deliveryStatus === 'delivered' && 'Giao thành công — Khách đã nhận hàng & hoàn tất đơn'}
                      {deliveryStatus === 'failed' && 'Giao thất bại — Khách không nhận hoặc sự cố giao vận (chuẩn bị chuyển hoàn kho)'}
                      {deliveryStatus === 'cancelled' && 'Đã huỷ đơn — Đã hoàn trả lại số lượng nguyên liệu về kho'}
                    </span>
                  </div>
                </div>

                {/* TẦNG 1: Quy trình giao hàng chính 4 bước (Full-width Stepper với logic ép buộc tuần tự) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                      Quy trình vận chuyển chính (4 Giai đoạn tuần tự)
                    </label>
                    <span className="text-[11px] font-medium text-amber-900 bg-amber-100/70 border border-amber-300/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <span className="material-symbols-outlined text-[13px]">lock_clock</span>
                      Bắt buộc bấm tuần tự từng bước
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { step: '01', val: 'pending', label: 'Chờ xác nhận', desc: 'Chờ kiểm tra đơn', icon: 'hourglass_empty', activeColor: 'bg-amber-500 border-amber-600 text-white shadow-md ring-2 ring-amber-300' },
                      { step: '02', val: 'confirmed', label: 'Đã chấp nhận', desc: 'Đã duyệt & soạn hàng', icon: 'inventory_2', activeColor: 'bg-blue-600 border-blue-700 text-white shadow-md ring-2 ring-blue-300' },
                      { step: '03', val: 'shipping', label: 'Đang giao hàng', desc: 'Shipper đang giao', icon: 'local_shipping', activeColor: 'bg-indigo-600 border-indigo-700 text-white shadow-md ring-2 ring-indigo-300' },
                      { step: '04', val: 'delivered', label: 'Giao thành công', desc: 'Khách đã nhận', icon: 'check_circle', activeColor: 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-300' },
                    ].map(st => {
                      const statusInfo = checkStatusAvailability(st.val);
                      const isSelected = statusInfo.isCurrent;
                      const isAllowed = statusInfo.allowed;
                      const isCompleted = statusInfo.isCompleted;
                      const isNext = statusInfo.isNext;

                      return (
                        <button
                          key={st.val}
                          type="button"
                          disabled={Boolean(statusSaving) || loading || linkLoading || confirmAcceptLoading || (!isAllowed && (!isSelected || st.val !== 'confirmed'))}
                          data-status={st.val}
                          onClick={handleStatusClick}
                          title={statusInfo.reason || ''}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[86px] relative group ${
                            isSelected
                              ? `${st.activeColor} scale-[1.02] ${st.val === 'confirmed' ? 'cursor-pointer ring-offset-2' : 'cursor-default'}`
                              : isNext
                              ? 'bg-white border-blue-500 ring-2 ring-blue-400/50 text-stone-900 hover:bg-blue-50/60 hover:shadow-md cursor-pointer animate-[pulse_2.5s_infinite]'
                              : isCompleted
                              ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900 cursor-pointer hover:bg-emerald-100/60'
                              : 'opacity-40 bg-stone-100/80 border-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <span className={`text-[11px] font-mono font-bold flex items-center gap-1 ${
                              isSelected ? 'text-white/90' : isCompleted ? 'text-emerald-700' : isNext ? 'text-blue-600' : 'text-stone-400'
                            }`}>
                              #{st.step}
                              {isCompleted && (
                                <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                              )}
                            </span>

                            {isSelected ? (
                              <span className="material-symbols-outlined text-[20px] text-white">{st.icon}</span>
                            ) : isNext ? (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                                <span>Tiếp theo</span>
                                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                              </span>
                            ) : isCompleted ? (
                              <span className="material-symbols-outlined text-[18px] text-emerald-600">task_alt</span>
                            ) : (
                              <span className="material-symbols-outlined text-[17px] text-stone-400">lock</span>
                            )}
                          </div>

                          <div>
                            <p className="text-[13px] font-black leading-tight mb-0.5 flex items-center justify-between">
                              <span>{st.label}</span>
                              {isSelected && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-white/25 text-white uppercase flex items-center gap-0.5">
                                  {st.val === 'confirmed' ? (
                                    <>
                                      <span className="material-symbols-outlined text-[11px]">edit</span>
                                      Sửa mã / phí
                                    </>
                                  ) : 'Hiện tại'}
                                </span>
                              )}
                            </p>
                            <p className={`text-[10.5px] ${
                              isSelected ? 'text-white/80' : isCompleted ? 'text-emerald-700/80' : isNext ? 'text-blue-700 font-medium' : 'text-stone-400'
                            }`}>
                              {isSelected && st.val === 'confirmed'
                                ? `Mã: #${orderId || order?.orderId} • Phí: ${logisticsCost ? formatPrice(logisticsCost) : '0đ'}`
                                : (!isAllowed && !isSelected && !isCompleted ? 'Chưa thể chuyển' : st.desc)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TẦNG 2: Xử lý ngoại lệ / Huỷ đơn */}
                <div className="pt-3.5 border-t border-amber-200/50">
                  <label className="block text-[11px] font-bold text-stone-600 mb-2 uppercase tracking-wider">
                    Trường hợp ngoại lệ / Sự cố
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nút Giao thất bại */}
                    {(() => {
                      const failedInfo = checkStatusAvailability('failed');
                      const isSelected = failedInfo.isCurrent;
                      const isAllowed = failedInfo.allowed;

                      return (
                        <button
                          type="button"
                          disabled={!isAllowed || Boolean(statusSaving) || loading || linkLoading || confirmAcceptLoading}
                          data-status="failed"
                          onClick={handleStatusClick}
                          title={failedInfo.reason || ''}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-rose-600 border-rose-700 text-white shadow-md ring-2 ring-rose-300 font-bold cursor-default'
                              : isAllowed
                              ? 'bg-white border-stone-200 text-stone-700 hover:border-rose-400 hover:bg-rose-50/40 hover:shadow-xs cursor-pointer'
                              : 'opacity-40 bg-stone-100/80 border-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : isAllowed ? 'bg-rose-50 text-rose-500' : 'bg-stone-200 text-stone-400'
                          }`}>
                            <span className="material-symbols-outlined text-[19px]">
                              {isAllowed || isSelected ? 'cancel' : 'lock'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[12.5px] font-bold">Giao thất bại</p>
                              {!isAllowed && !isSelected && (
                                <span className="text-[10px] text-stone-400 font-normal">(chỉ khi đang giao)</span>
                              )}
                            </div>
                            <p className={`text-[11px] ${isSelected ? 'text-white/85' : 'text-stone-400'}`}>
                              Khách không nhận / chuyển hoàn kho
                            </p>
                          </div>
                        </button>
                      );
                    })()}

                    {/* Nút Đã huỷ đơn hàng */}
                    {(() => {
                      const cancelInfo = checkStatusAvailability('cancelled');
                      const isSelected = cancelInfo.isCurrent;
                      const isAllowed = cancelInfo.allowed;

                      return (
                        <button
                          type="button"
                          disabled={!isAllowed || Boolean(statusSaving) || loading || linkLoading || confirmAcceptLoading}
                          data-status="cancelled"
                          onClick={handleStatusClick}
                          title={cancelInfo.reason || ''}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-stone-800 border-stone-900 text-white shadow-md ring-2 ring-stone-400 font-bold cursor-default'
                              : isAllowed
                              ? 'bg-white border-stone-200 text-stone-700 hover:border-stone-500 hover:bg-stone-100 hover:shadow-xs cursor-pointer'
                              : 'opacity-40 bg-stone-100/80 border-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : isAllowed ? 'bg-stone-100 text-stone-600' : 'bg-stone-200 text-stone-400'
                          }`}>
                            <span className="material-symbols-outlined text-[19px]">
                              {isAllowed || isSelected ? 'block' : 'lock'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[12.5px] font-bold">Đã huỷ đơn hàng</p>
                              {!isAllowed && !isSelected && (
                                <span className="text-[10px] text-stone-400 font-normal">(đang ship không thể huỷ)</span>
                              )}
                            </div>
                            <p className={`text-[11px] ${isSelected ? 'text-white/85' : 'text-stone-400'}`}>
                              Tự động hoàn trả nguyên liệu về kho
                            </p>
                          </div>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Khối lý do huỷ đơn */}
                  {['pending', 'confirmed', 'cancelled'].includes(deliveryStatus) && (
                    <div className="mt-3 p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 animate-[fadeIn_0.15s_ease]">
                      <label className="block text-[11.5px] font-bold text-red-700">Lý do huỷ đơn {deliveryStatus !== 'cancelled' && '(nếu có)'}</label>
                      <input
                        type="text"
                        readOnly={isEdit && deliveryStatus === 'cancelled'}
                        disabled={Boolean(statusSaving)}
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="VD: Khách đổi ý, hết hàng, không liên lạc được..."
                        className="w-full border border-red-200 rounded-lg px-3.5 py-2 text-[13px] bg-white focus:outline-none focus:border-red-400"
                      />
                      <p className="text-[10.5px] text-stone-500">
                        * Tự động hoàn trả nguyên liệu của đơn hàng vào kho khi chuyển sang "Đã huỷ".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ═══════════ CỘT TRÁI (5/12): THÔNG TIN ĐƠN, KHÁCH HÀNG & GIAO VẬN ═══════════ */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card 1: Nguồn đơn & Mã đơn & Thời gian */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">storefront</span>
                    Thông tin đơn hàng
                  </h3>
                  <span className="text-[11px] text-stone-400">Kênh bán & Thời gian</span>
                </div>

                {/* Mã đơn hàng (khi tạo mới) */}
                {!isEdit && (
                  <div>
                    <label className="block text-[12px] font-bold text-stone-700 mb-1.5">
                      Mã đơn hàng
                      <span className="ml-1.5 text-[11px] font-normal text-stone-400">(để trống để tự sinh ngẫu nhiên)</span>
                    </label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={e => setOrderId(e.target.value.toUpperCase())}
                      placeholder="VD: DH-982341..."
                      maxLength={30}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-[14px] font-mono font-bold text-stone-800 bg-stone-50/40 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Chọn nguồn đơn hàng */}
                <div>
                  <label className="block text-[12px] font-bold text-stone-700 mb-2">Kênh bán hàng *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'shopee', label: 'Shopee', color: 'hover:border-[#ee4d2d]' },
                      { id: 'tiktok', label: 'TikTok', color: 'hover:border-black' },
                      { id: 'website', label: 'Website', color: 'hover:border-blue-500' },
                      { id: 'pos', label: 'POS Quầy', color: 'hover:border-emerald-500' },
                      { id: 'facebook', label: 'Facebook', color: 'hover:border-blue-600' },
                      { id: 'instagram', label: 'Instagram', color: 'hover:border-pink-500' },
                      { id: 'youtube', label: 'YouTube', color: 'hover:border-red-500' },
                      { id: 'khác', label: 'Khác', color: 'hover:border-stone-400' },
                    ].map(src => {
                      const isSelected = source === src.id;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => {
                            if (source !== src.id) {
                              setSource(src.id);
                              setDiscountCodeInput('');
                              setAppliedDiscount({ code: null, amount: 0 });
                              setCouponError('');
                            }
                          }}
                          className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center truncate ${
                            isSelected
                              ? 'bg-primary border-primary text-white shadow-xs'
                              : `bg-stone-50 border-stone-200 text-stone-700 hover:bg-white ${src.color}`
                          }`}
                        >
                          {src.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ngày đặt hàng */}
                <div>
                  <label className="block text-[12px] font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-stone-500">calendar_today</span>
                    Ngày đặt hàng
                  </label>
                  <input
                    type="date"
                    value={orderedAt}
                    onChange={e => setOrderedAt(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-[13px] font-medium text-stone-800 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {isEdit && (order.pancake_order_id || (source !== 'website' && source !== 'pos')) && (
                <OrderCustomerDetails order={order} name={customerName} phone={customerPhone} address={customerAddress} />
              )}

              {/* Card 2: Thông tin khách hàng & Giao nhận (Website / POS / Khách lẻ) */}
              {canEditCustomer && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">person_pin</span>
                      Khách hàng & Nhận hàng
                    </h3>
                    {source === 'website' && (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        Đơn Website
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11.5px] font-bold text-stone-600 mb-1">Họ tên người nhận *</label>
                      <input
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-[13px] text-stone-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-bold text-stone-600 mb-1">Số điện thoại *</label>
                      <input
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="09..."
                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-[13px] text-stone-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-bold text-stone-600 mb-1">Địa chỉ nhận hàng *</label>
                      <input
                        required
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-[13px] text-stone-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-bold text-stone-600 mb-1.5">Hình thức thanh toán</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'cash', label: 'COD (Tiền mặt)', icon: 'payments' },
                          { id: 'transfer', label: 'Chuyển khoản (CK)', icon: 'account_balance' },
                        ].map(pm => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id)}
                            className={`p-2 rounded-xl border text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              paymentMethod === pm.id
                                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{pm.icon}</span>
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Vận chuyển & Trạng thái giao hàng */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                    Hình thức vận chuyển & Phí ship
                  </h3>
                </div>

                {/* Chọn Tiêu chuẩn vs Hỏa tốc */}
                <div>
                  <label className="block text-[12px] font-bold text-stone-700 mb-2">Hình thức vận chuyển *</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShippingMethod('standard')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        shippingMethod === 'standard'
                          ? 'bg-stone-100/80 border-stone-400 ring-2 ring-stone-300/60 shadow-xs'
                          : 'bg-stone-50/60 border-stone-200 hover:bg-white text-stone-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px] text-stone-600">local_shipping</span>
                      <div>
                        <p className="text-[12.5px] font-bold text-stone-900">Tiêu chuẩn</p>
                        <p className="text-[10.5px] text-stone-500">Toàn quốc (2-4 ngày)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShippingMethod('express')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 relative overflow-hidden ${
                        shippingMethod === 'express'
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-400 ring-2 ring-orange-400/40 shadow-xs'
                          : 'bg-stone-50/60 border-stone-200 hover:bg-white text-stone-600'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        shippingMethod === 'express' ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white' : 'bg-stone-200 text-stone-500'
                      }`}>
                        <span className="material-symbols-outlined text-[17px]">bolt</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-[12.5px] font-black text-orange-950">Hỏa tốc 4h</p>
                        </div>
                        <p className="text-[10.5px] text-orange-700/90 font-medium">Nội thành trong 4h</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Phí ship thực tế (Shop chịu) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-bold text-stone-700">Phí ship thực tế (Shop chịu)</label>
                    <button
                      type="button"
                      onClick={() => setLogisticsCost(0)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer transition-colors"
                      title="Đặt nhanh về 0đ (Freeship)"
                    >
                      Freeship (0đ)
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={logisticsCost}
                    onChange={e => setLogisticsCost(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-[14px] font-mono font-bold text-stone-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10.5px] text-stone-400 mt-1">
                    Phí shop nộp cho đơn vị vận chuyển — không cộng vào tiền khách trả, được trừ vào doanh thu trong Dashboard
                  </p>
                  {logisticsCost > 0 && (
                    <p className="text-[10.5px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">account_balance</span>
                      Tiền thực về tài khoản: {Math.round(
                        (isReplacement ? 0 : isSeeding ? totalPrice : Math.max(0, (() => {
                          const base = totalPrice - appliedDiscount.amount;
                          if (source === 'website') return base + shippingFee;
                          return base;
                        })())) - logisticsCost
                      ).toLocaleString('vi-VN')}đ
                    </p>
                  )}
                </div>
              </div>

              {/* Card 4: Ghi chú */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-2">
                <label className="block text-[12px] font-bold text-stone-700">Ghi chú đơn hàng</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú nội bộ hoặc yêu cầu của khách hàng..."
                  className="w-full border border-stone-200 rounded-xl p-3 text-[13px] text-stone-800 bg-stone-50/30 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Đơn bị hoàn: Khối chỉnh phí hoàn */}
              {order?.status === 'returned' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <label className="block text-[12px] font-bold text-amber-800">Phí hoàn trả thực tế (VNĐ)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={returnCost}
                      onChange={e => setReturnCost(Number(e.target.value))}
                      className="flex-1 border border-amber-300 rounded-xl px-3 py-2 text-[14px] font-mono font-bold text-amber-900 bg-white focus:outline-none"
                    />
                    <button 
                      type="button"
                      onClick={handleSubmit} 
                      disabled={loading || (returnCost === (order.return_cost || 0) && note === (order.note || ''))}
                      className="px-4 py-2 bg-amber-600 text-white text-[12.5px] font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                      Lưu phí
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════ CỘT PHẢI (7/12): GIỎ HÀNG, SẢN PHẨM & TỔNG KẾT THANH TOÁN ═══════════ */}
            <div className="lg:col-span-7 space-y-4">
              {/* Card 1: Danh sách sản phẩm */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">inventory_2</span>
                    <h3 className="text-[14px] font-bold text-stone-900">
                      Sản phẩm trong đơn ({items.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProductPicker(true)}
                    className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Thêm sản phẩm
                  </button>
                </div>

                {/* Items List */}
                {items.length === 0 ? (
                  <div className="border-2 border-dashed border-stone-200 rounded-2xl py-12 text-center text-stone-400 space-y-2">
                    <span className="material-symbols-outlined text-[42px] opacity-40">shopping_bag</span>
                    <p className="text-xs font-semibold text-stone-600">Chưa có sản phẩm nào trong đơn hàng</p>
                    <p className="text-[11px] text-stone-400">Bấm nút "Thêm sản phẩm" phía trên để chọn nến và phân loại</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0 group">
                        {/* Ảnh & Tên */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name} 
                              className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0 shadow-2xs" 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {item.product_name?.charAt(0) || 'N'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-stone-900 truncate">{item.product_name}</p>
                            {item.sku_label && (
                              <span className="inline-block text-[10.5px] font-medium text-primary bg-blue-50 px-2 py-0.2 rounded-md border border-blue-200/60 mt-0.5 truncate max-w-full">
                                {item.sku_label}
                              </span>
                            )}
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Đơn giá: <strong className="text-stone-700 font-mono">{formatPrice(isReplacementMode ? (item.unit_cost || 0) : item.unit_price)}</strong>
                            </p>
                            <button
                              type="button"
                              onClick={() => setMaterialsIndex(idx)}
                              disabled={Boolean(statusSaving) || !isEdit || isReturned || order?.status === 'cancelled' || ['failed', 'cancelled'].includes(order?.delivery_status)
                                || order?.items?.[idx]?.product_id !== item.product_id
                                || order?.items?.[idx]?.sku_id !== item.sku_id
                                || order?.items?.[idx]?.quantity !== item.quantity}
                              title={isReturned || order?.status === 'cancelled' ? 'Đơn đã hoàn hoặc huỷ không được đổi nguyên liệu' : 'Lưu đơn và số lượng sản phẩm trước khi đổi nguyên liệu'}
                              className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-primary no-underline transition-colors cursor-pointer enabled:hover:bg-blue-50 enabled:hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:text-stone-400 disabled:cursor-not-allowed"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[14px] leading-none">tune</span>
                              {item.material_overrides ? 'Nguyên liệu riêng · Chỉnh sửa' : 'Đổi nguyên liệu'}
                            </button>
                          </div>
                        </div>

                        {/* Bộ tăng giảm số lượng */}
                        <div className="flex items-center gap-1 shrink-0 bg-stone-50 p-1 rounded-xl border border-stone-200">
                          <button 
                            type="button"
                            onClick={() => handleQtyChange(idx, item.quantity - 1)} 
                            className="w-6 h-6 rounded-lg bg-white shadow-2xs border border-stone-200 flex items-center justify-center hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">remove</span>
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleQtyChange(idx, e.target.value)}
                            className="w-9 text-center bg-transparent text-[13px] font-bold text-stone-800 focus:outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => handleQtyChange(idx, item.quantity + 1)} 
                            className="w-6 h-6 rounded-lg bg-white shadow-2xs border border-stone-200 flex items-center justify-center hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                          </button>
                        </div>

                        {/* Thành tiền */}
                        <div className="text-right shrink-0 w-24">
                          <p className={`text-[13px] font-bold font-mono ${isReplacementMode ? 'text-red-600' : 'text-primary'}`}>
                            {formatPrice((isReplacementMode ? (item.unit_cost || 0) : item.unit_price) * item.quantity)}
                          </p>
                        </div>

                        {/* Nút Xoá */}
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(idx)} 
                          className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xoá sản phẩm này"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Mã giảm giá / Voucher */}
              {!isReplacementMode && !isSeedingMode && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[12.5px] font-bold text-stone-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-amber-600">confirmation_number</span>
                      Ưu đãi & Khuyến mãi (Voucher)
                    </label>
                    {appliedDiscount.code && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Đã giảm {formatPrice(appliedDiscount.amount)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={discountCodeInput}
                      onChange={e => setDiscountCodeInput(e.target.value)}
                      className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2 text-[13px] font-medium text-stone-800 bg-stone-50/40 focus:bg-white focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Chọn mã giảm giá --</option>
                      {availableCoupons.map(c => (
                        <option key={c._id} value={c.code}>
                          {c.code} — {c.name} ({c.type === 'freeship' ? `${shippingDiscountLabel(c)} • ${shippingDiscountConditions(c)}` : c.type === 'percent' ? `Giảm ${c.value}%` : `Giảm ${formatPrice(c.value)}`})
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
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-[12.5px] font-bold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      {validatingCoupon ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                  {couponError && <p className="text-red-600 text-[11.5px] font-medium">{couponError}</p>}
                </div>
              )}

              {/* Card 3: Bảng Tóm Tắt Thanh Toán (Financial Summary) */}
              {!isReplacementMode && !isSeedingMode ? (
                <div className="bg-gradient-to-br from-blue-50/40 via-white to-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">receipt</span>
                      Tổng kết thanh toán
                    </h4>
                    <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-stone-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoTotal}
                        onChange={e => setAutoTotal(e.target.checked)}
                        className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      Tính tự động theo giỏ hàng
                    </label>
                  </div>

                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center justify-between gap-3 text-stone-600">
                      <label htmlFor="order-subtotal">Tạm tính tiền hàng:</label>
                      {autoTotal ? (
                        <span className="font-mono font-semibold text-stone-900">{formatPrice(totalPrice)}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            id="order-subtotal"
                            type="number"
                            min="0"
                            step="1"
                            required
                            value={totalPrice}
                            onChange={e => {
                              setTotalPrice(e.target.value === '' ? '' : Number(e.target.value));
                              setAppliedDiscount({ code: null, amount: 0 });
                            }}
                            className="w-36 sm:w-44 min-w-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-right font-mono font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <span className="font-semibold">đ</span>
                        </div>
                      )}
                    </div>
                    {!autoTotal && (
                      <p className="text-[11px] text-stone-500">
                        Nhập tiền hàng trước phí vận chuyển và giảm giá. Áp dụng lại voucher sau khi đổi số tiền.
                      </p>
                    )}

                    {/* Phí vận chuyển khách trả — chỉ đơn website */}
                    {source === 'website' ? (
                      <div className="flex justify-between text-stone-600">
                        <span className="flex items-center gap-1">
                          <span>Phí vận chuyển (Khách trả):</span>
                          {shippingMethod === 'express' && (
                            <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px]">bolt</span>
                              Hỏa tốc
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-semibold text-stone-900">+{formatPrice(shippingFee)}</span>
                      </div>
                    ) : logisticsCost > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span className="flex items-center gap-1">
                          <span>Phí vận chuyển (shop chịu):</span>
                          {shippingMethod === 'express' && (
                            <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px]">bolt</span>
                              Hỏa tốc
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-semibold">-{formatPrice(logisticsCost)}</span>
                      </div>
                    )}

                    {appliedDiscount.amount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Chiết khấu Voucher ({appliedDiscount.code}):</span>
                        <span className="font-mono">-{formatPrice(appliedDiscount.amount)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-blue-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-bold text-stone-900 block">TỔNG KHÁCH PHẢI TRẢ:</span>
                        <span className="text-[11px] text-stone-500 font-normal">Không bao gồm phí ship do shop chi trả</span>
                      </div>
                      <span className="text-xl sm:text-2xl font-black font-mono text-primary">
                        {formatPrice(Math.max(0, (() => {
                          const base = totalPrice - appliedDiscount.amount;
                          if (source === 'website') return base + shippingFee;
                          return base;
                        })()))}
                      </span>
                    </div>

                    {/* Doanh thu thực sau khi trừ phí ship shop chịu */}
                    {logisticsCost > 0 && (
                      <div className="flex justify-between text-[11.5px] text-stone-500 pt-1 border-t border-dashed border-stone-200">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-stone-400">account_balance</span>
                          Doanh thu thực (sau trừ phí ship shop chịu):
                        </span>
                        <span className="font-mono font-semibold text-stone-700">
                          {formatPrice(Math.max(0, (() => {
                            const base = totalPrice - appliedDiscount.amount;
                            const gross = source === 'website' ? base + shippingFee : base;
                            return gross - logisticsCost;
                          })()))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : isReplacementMode ? (
                <div className="bg-red-50 rounded-2xl p-5 border border-red-200 flex items-start gap-3 text-red-800">
                  <span className="material-symbols-outlined text-[24px] text-red-600">info</span>
                  <div>
                    <p className="text-[13.5px] font-bold">Đơn Hàng Giao Bù</p>
                    <p className="text-[12px] opacity-90 mt-0.5 leading-relaxed">
                      Doanh thu ghi nhận 0đ (không thu tiền khách). Hệ thống sẽ xuất kho và tính chi phí giá vốn để quản lý lợi nhuận chính xác.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-purple-50 rounded-2xl p-5 border border-purple-200 flex items-start gap-3 text-purple-900">
                  <span className="material-symbols-outlined text-[24px] text-purple-600">campaign</span>
                  <div>
                    <p className="text-[13.5px] font-bold">Đơn Hàng Seeding</p>
                    <p className="text-[12px] opacity-90 mt-0.5 leading-relaxed">
                      Đơn ghi nhận quảng bá / review sản phẩm. Chi phí sẽ được khấu trừ vào Quỹ Marketing / Tài sản chung.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-stone-200/80 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            {isEdit && (
              <>
                {order.status !== 'returned' && !isReplacementMode && !isSeedingMode && (
                  <button
                    type="button"
                    onClick={onMarkReturn}
                    disabled={Boolean(statusSaving)}
                    className="px-3.5 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[17px]">assignment_return</span>
                    Đánh dấu hoàn hàng
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={Boolean(statusSaving)}
                  className="px-3.5 py-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">delete</span>
                  Xóa đơn
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onClose} disabled={Boolean(statusSaving)} className="px-4 py-2 text-on-surface-variant text-[14px] font-medium hover:bg-surface-container rounded-lg transition-colors">
              Hủy
            </button>
            {!isEdit && <button type="button" onClick={e => handleSubmit(e, true)} disabled={loading || (!isSeeding && items.length === 0)} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-blue-50 disabled:opacity-40"><span aria-hidden="true" className="material-symbols-outlined text-lg">add_link</span>Tạo đơn & link theo dõi</button>}
            {(!isEdit || order.status !== 'returned') && (
              <button onClick={e => handleSubmit(e, false)} disabled={loading || linkLoading || Boolean(statusSaving) || (!isSeeding && items.length === 0)}
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
                      <img src={getImageUrl(product.image)} alt={product.name} className="w-9 h-9 rounded-lg object-cover" />
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

      {materialsIndex !== null && items[materialsIndex] && (
        <OrderItemMaterialsModal
          orderId={order._id}
          index={materialsIndex}
          item={items[materialsIndex]}
          onClose={() => setMaterialsIndex(null)}
          onSaved={({ item, order: updatedOrder }) => {
            setItems(current => current.map((currentItem, index) => index === materialsIndex
              ? { ...currentItem, material_overrides: item.material_overrides, materials_key: item.materials_key, unit_cost: item.unit_cost }
              : currentItem));
            setMaterialsIndex(null);
            onMaterialsSaved?.(updatedOrder);
          }}
        />
      )}

      {/* Deposit Fund Sub-modal */}
      {showDepositModal && (
        <DepositModal 
          requiredAmount={requiredDepositAmount} 
          onClose={() => setShowDepositModal(false)} 
          onSuccess={handleDepositSuccess} 
        />
      )}

      {/* Accept Order & Set Tracking Code / Shipping Fee Sub-modal */}
      {showConfirmAcceptModal && (
        <AcceptOrderModal
          order={order}
          currentOrderId={orderId || order?.orderId || ''}
          currentLogisticsCost={logisticsCost}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          shippingMethod={shippingMethod}
          paymentMethod={paymentMethod}
          finalPrice={isReplacement ? 0 : isSeeding ? totalPrice : Math.max(0, (() => {
            const base = totalPrice - appliedDiscount.amount;
            if (source === 'website') return base + shippingFee;
            return base;
          })())}
          note={note}
          onClose={() => setShowConfirmAcceptModal(false)}
          onConfirm={handleConfirmAcceptOrder}
          loading={confirmAcceptLoading}
        />
      )}
    </div>
  );
}

// ── Modal Chấp nhận đơn & Nhập mã vận đơn / Phí ship (Đơn Website) ──
function AcceptOrderModal({
  order,
  currentOrderId,
  currentLogisticsCost,
  customerName,
  customerPhone,
  customerAddress,
  shippingMethod,
  paymentMethod,
  finalPrice,
  note,
  onClose,
  onConfirm,
  loading = false
}) {
  const [newOrderId, setNewOrderId] = useState(currentOrderId || '');
  const [newLogisticsCost, setNewLogisticsCost] = useState(currentLogisticsCost ?? 0);
  const [copiedField, setCopiedField] = useState(null);
  const [modalError, setModalError] = useState('');

  const codAmount = paymentMethod === 'cash' ? finalPrice : 0;
  const quickCostPresets = [0, 16500, 22000, 30000, 35000, 45000];

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Sao chép toàn bộ thông tin đơn hàng 1-Click sang định dạng app SPX Express
  const handleCopyAllForSPX = () => {
    const textToCopy = `[ĐƠN HÀNG CANDLET - ĐẶT QUA SPX EXPRESS]
• Người nhận: ${customerName || 'Khách hàng'}
• Số điện thoại: ${customerPhone || 'Chưa có SĐT'}
• Địa chỉ giao hàng: ${customerAddress || 'Chưa cập nhật'}
• Mã tham chiếu Website: ${order?.orderId || currentOrderId}
• Tiền thu hộ COD: ${codAmount > 0 ? formatPrice(codAmount) : '0 VNĐ (Đã chuyển khoản - KHÔNG THU TIỀN)'}
• Gói vận chuyển: ${shippingMethod === 'express' ? 'SPX Hỏa tốc 4h' : 'SPX Tiêu chuẩn'}
• Tên hàng hóa: Nến thơm handmade Candlet (Hàng dễ vỡ)
• Chỉ dẫn giao hàng: Cho xem hàng, không cho thử${note ? `\n• Ghi chú của khách: ${note}` : ''}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!newOrderId.trim()) {
      setModalError('Vui lòng nhập mã vận đơn SPX (hoặc giữ mã đơn cũ)');
      return;
    }
    setModalError('');
    onConfirm({
      newOrderId: newOrderId.trim(),
      newLogisticsCost: Math.max(0, Number(newLogisticsCost) || 0),
      saveDirectly: true
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-[fadeIn_0.15s_ease]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[580px] max-h-[92vh] flex flex-col overflow-hidden border border-stone-300">
        
        {/* Header SPX & Chấp nhận đơn */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[22px] text-white">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[15px] text-white leading-snug">
                  Đồng Bộ Đặt Đơn SPX Express
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-stone-900 uppercase">
                  Shopee Xpress
                </span>
              </div>
              <p className="text-[11px] text-stone-300 font-normal">
                Copy thông tin tạo đơn trên SPX & Dán mã vận đơn SPXVN... vào đây
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-stone-900">
          
          {/* Nút 1-Click Sao chép toàn bộ thông tin cho SPX */}
          <button
            type="button"
            onClick={handleCopyAllForSPX}
            className={`w-full py-2.5 px-4 rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              copiedField === 'all'
                ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                : 'bg-stone-100 hover:bg-stone-200/90 text-stone-800 border-stone-300 hover:border-stone-400'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {copiedField === 'all' ? 'task_alt' : 'content_copy'}
            </span>
            <span>
              {copiedField === 'all' 
                ? '✓ Đã sao chép toàn bộ thông tin đơn hàng cho SPX!' 
                : '📋 Sao chép nhanh toàn bộ thông tin để dán vào SPX Express'
              }
            </span>
          </button>

          {/* Quick Copy Panel theo từng ô thông tin */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-300 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">pin_drop</span>
                Thông tin nhận hàng của khách
              </span>
              <span className="text-[10px] text-stone-500 font-medium">Bấm nút để copy từng ô</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              {/* Người nhận */}
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div className="truncate pr-2">
                  <span className="text-[9.5px] text-stone-400 block font-semibold uppercase">Người nhận</span>
                  <span className="font-bold text-stone-900 truncate block">{customerName || 'Chưa có tên'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(customerName, 'name')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {copiedField === 'name' ? 'check' : 'content_copy'}
                  </span>
                  {copiedField === 'name' ? 'Đã chép' : 'Copy'}
                </button>
              </div>

              {/* SĐT */}
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div className="truncate pr-2">
                  <span className="text-[9.5px] text-stone-400 block font-semibold uppercase">Số điện thoại</span>
                  <span className="font-bold font-mono text-stone-900 truncate block">{customerPhone || 'Chưa có SĐT'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(customerPhone, 'phone')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {copiedField === 'phone' ? 'check' : 'content_copy'}
                  </span>
                  {copiedField === 'phone' ? 'Đã chép' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Địa chỉ giao hàng */}
            <div className="flex items-start justify-between bg-white px-3 py-2.5 rounded-xl border border-stone-200 gap-2">
              <div className="flex-1">
                <span className="text-[9.5px] text-stone-400 block font-semibold uppercase">Địa chỉ nhận hàng SPX</span>
                <p className="font-semibold text-stone-900 text-[12px] leading-snug">
                  {customerAddress || 'Chưa cập nhật địa chỉ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(customerAddress, 'address')}
                className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {copiedField === 'address' ? 'check' : 'content_copy'}
                </span>
                {copiedField === 'address' ? 'Đã chép' : 'Copy'}
              </button>
            </div>

            {/* Tiền thu hộ COD & Mã tham chiếu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[9.5px] text-stone-400 block font-semibold uppercase">Tiền COD trên SPX</span>
                  <span className="font-mono font-bold text-stone-900">
                    {paymentMethod === 'cash' ? formatPrice(codAmount) : '0 VNĐ (Đã CK)'}
                  </span>
                </div>
                {paymentMethod === 'cash' && (
                  <button
                    type="button"
                    onClick={() => handleCopy(String(Math.round(codAmount)), 'cod')}
                    className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedField === 'cod' ? 'check' : 'content_copy'}
                    </span>
                    {copiedField === 'cod' ? 'Đã chép' : 'Copy COD'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[9.5px] text-stone-400 block font-semibold uppercase">Mã tham chiếu Web</span>
                  <span className="font-mono font-bold text-stone-900">
                    #{order?.orderId || currentOrderId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(order?.orderId || currentOrderId, 'ref')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {copiedField === 'ref' ? 'check' : 'content_copy'}
                  </span>
                  {copiedField === 'ref' ? 'Đã chép' : 'Copy mã'}
                </button>
              </div>
            </div>
          </div>

          {/* Form inputs */}
          <div className="space-y-4 pt-1">
            
            {/* Mã đơn mới / Mã vận đơn SPX */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12.5px] font-bold text-stone-900 flex items-center gap-1">
                  <span>Mã vận đơn SPX Express (Tracking Number)</span>
                  <span className="text-stone-500 font-normal text-xs">(bắt buộc)</span>
                </label>
                {order?.orderId && newOrderId !== order.orderId && (
                  <button
                    type="button"
                    onClick={() => setNewOrderId(order.orderId)}
                    className="text-[11px] text-stone-600 hover:underline font-semibold cursor-pointer"
                  >
                    Khôi phục mã cũ ({order.orderId})
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 font-bold text-xs font-mono">
                  SPX
                </div>
                <input
                  type="text"
                  required
                  value={newOrderId}
                  onChange={e => setNewOrderId(e.target.value)}
                  placeholder="Dán mã SPX tại đây (VD: SPXVN0482910483...)"
                  className="w-full pl-12 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-[14px] font-mono font-bold text-stone-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Dán mã vận đơn do app/web SPX cấp sau khi bạn tạo đơn thành công. Mã này sẽ được tạo Barcode để bưu tá SPX quét nhận hàng.
              </p>
            </div>

            {/* Phí ship thực tế SPX báo (Shop chịu) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12.5px] font-bold text-stone-900 flex items-center gap-1">
                  <span>Phí ship thực tế do SPX báo (VNĐ)</span>
                  <span className="text-stone-500 font-normal text-xs">(trừ vào chi phí shop)</span>
                </label>
                <span className="text-[12px] font-mono font-bold text-stone-900">
                  {formatPrice(newLogisticsCost)}
                </span>
              </div>
              <div className="relative mb-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newLogisticsCost}
                  onChange={e => setNewLogisticsCost(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3.5 pr-12 py-2.5 bg-white border border-stone-300 rounded-xl text-[14px] font-mono font-bold text-stone-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-500 font-bold text-xs">
                  VNĐ
                </div>
              </div>

              {/* Preset Chips chuẩn mức cước SPX */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-stone-500 font-medium mr-1">Cước SPX nhanh:</span>
                {quickCostPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewLogisticsCost(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                      newLogisticsCost === preset
                        ? 'bg-stone-900 border-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 border-stone-200 text-stone-800 hover:bg-stone-200'
                    }`}
                  >
                    {preset === 0 ? '0đ (Freeship)' : `${(preset / 1000).toLocaleString('vi-VN')}k`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                Khoản cước phí bạn trả cho SPX Express — tự động ghi nhận vào chi phí giao vận trong báo cáo tài chính của shop.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {modalError && (
            <div className="p-3 bg-stone-100 border border-stone-400 rounded-xl text-stone-900 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{modalError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-[13px] font-bold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-[13px] font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Xác nhận & Cập nhật đơn SPX</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Xác nhận xóa ────────────────────────────────────────────
function DeleteModal({ order, onClose, onConfirm, loading }) {
  const isReturned = ['returned', 'cancelled'].includes(order.status) || ['failed', 'cancelled'].includes(order.delivery_status);
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
            <span>Đơn hàng này đã hoàn hoặc huỷ — nguyên liệu đã được <strong>hoàn vào kho</strong> trước đó. Xóa đơn sẽ không thay đổi tồn kho.</span>
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
function RefundModal({ order, onClose, onConfirm, loading }) {
  const [refundTransactionId, setRefundTransactionId] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const value = refundTransactionId.trim();
    if (value.length < 3) {
      setError('Vui lòng nhập mã giao dịch chuyển hoàn tiền.');
      return;
    }
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">currency_exchange</span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900">Xác nhận đã hoàn tiền</h3>
              <p className="text-xs text-stone-500 mt-1">Đơn #{order.orderId} · {formatPrice(order.total_price)}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Chỉ xác nhận sau khi bạn đã chuyển tiền thật cho khách. Thao tác này không tự chuyển tiền.
          </p>
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">Mã giao dịch hoàn tiền *</label>
            <input
              autoFocus
              value={refundTransactionId}
              onChange={(event) => { setRefundTransactionId(event.target.value); setError(''); }}
              placeholder="Ví dụ: FT260923..."
              maxLength={120}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-100 rounded-xl">Đóng</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-60 flex items-center gap-2">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin" />}
            Đã hoàn tiền
          </button>
        </div>
      </form>
    </div>
  );
}

function ReturnModal({ order, defaultReturnCost, onClose, onConfirm, loading }) {
  const [localReturnCost, setLocalReturnCost] = useState(defaultReturnCost || 0);

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
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={localReturnCost}
                onChange={(e) => setLocalReturnCost(Number(e.target.value))}
                className="w-24 text-right bg-transparent border-b border-[#d97706]/30 text-[#d97706] font-bold font-mono focus:outline-none focus:border-[#d97706] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[14px] font-bold text-[#d97706] font-mono">đ</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#fee2e2] px-4 py-3 rounded-lg border border-[#fca5a5]">
            <span className="text-[13px] text-[#991b1b] font-semibold">Tổng thiệt hại</span>
            <span className="text-[15px] font-bold text-[#dc2626] font-mono">{formatPrice(order.total_price + localReturnCost)}</span>
          </div>
        </div>

        <div className="flex justify-center gap-3 w-full">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container flex-1">Hủy</button>
          <button
            onClick={() => onConfirm(localReturnCost)}
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

// ── Modal Nạp tiền nhanh vào Tài sản chung ────────────────────────
function DepositModal({ requiredAmount, onClose, onSuccess }) {
  const [amount, setAmount] = useState(requiredAmount || '');
  const [note, setNote] = useState('Nạp tiền trả phí đơn hàng');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return setError('Số tiền nạp phải lớn hơn 0');
    setError('');
    setLoading(true);
    try {
      await fundService.deposit({ amount: Number(amount), note });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi nạp tiền');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] flex flex-col animate-[fadeIn_0.15s_ease]">
        <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-error-container/20 rounded-t-2xl">
          <h3 className="font-bold text-[16px] text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            Số dư không đủ!
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[13px] text-on-surface-variant">
            Tài sản chung hiện không đủ để trả chi phí của đơn hàng này. Vui lòng nạp thêm tối thiểu <span className="font-bold text-error">{formatPrice(requiredAmount)}</span> để tiếp tục lưu đơn.
          </p>
          {error && <div className="p-3 bg-error-container text-error rounded-lg text-[13px] font-medium">{error}</div>}
          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Số tiền nạp (đ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono font-bold" />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ghi chú</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-on-surface-variant text-[13px] font-bold hover:bg-surface-container">Hủy bỏ</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Nạp tiền & Lưu đơn
            </button>
          </div>
        </form>
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
  // Shipping filter
  const [shippingFilter, setShippingFilter] = useState('all'); // 'all' | 'express'
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

  const handleSave = (savedOrder, options = {}) => {
    setModal(options.keepOpen && savedOrder?._id ? { type: 'edit', data: savedOrder } : null);
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

  const handleReturn = async (returnCostValue) => {
    setActionLoading(true);
    try {
      const res = await orderService.markAsReturned(modal.data._id, returnCostValue);
      showToast(res.data?.message || 'Đã đánh dấu đơn hàng bị hoàn');
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async (refundTransactionId) => {
    setActionLoading(true);
    try {
      const res = await orderService.markAsRefunded(modal.data._id, refundTransactionId);
      showToast(res.data?.message || 'Đã ghi nhận hoàn tiền cho khách.');
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể ghi nhận hoàn tiền.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered orders theo bộ lọc tìm kiếm, thời gian & nguồn (KHÔNG lọc theo trạng thái)
  const baseFilteredOrders = orders.filter(o => {
    // Lọc theo mã đơn hàng
    if (searchQuery && !((o.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) || (o._id || '').toLowerCase().includes(searchQuery.toLowerCase()))) return false;

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
    if (datePreset === 'lastMonth') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }
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

  // Lọc thêm theo trạng thái & hình thức vận chuyển để hiển thị trên bảng
  const filteredOrders = baseFilteredOrders.filter(o => {
    // Lọc theo hình thức giao hàng: CHỈ đơn Website hỏa tốc CHƯA ĐƯỢC CHẤP NHẬN (chờ xác nhận)
    if (shippingFilter === 'express') {
      const isWebsiteExpressPending = 
        o.source === 'website' && 
        o.shippingMethod === 'express' && 
        (!o.delivery_status || o.delivery_status === 'pending');
      if (!isWebsiteExpressPending) return false;
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      const s = o.status || 'completed';
      const d = o.delivery_status;
      if (statusFilter === 'cancelled') {
        return s === 'cancelled' || d === 'cancelled';
      }
      if (statusFilter === 'returned') {
        return s === 'returned' || d === 'failed';
      }
      return s === statusFilter;
    }
    return true;
  });

  // Đếm số đơn hỏa tốc Website chưa được chấp nhận (chờ duyệt)
  const pendingExpressCount = baseFilteredOrders.filter(o =>
    o.source === 'website' &&
    o.shippingMethod === 'express' &&
    (!o.delivery_status || o.delivery_status === 'pending')
  ).length;

  // Stats — tính trên baseFilteredOrders (không bị ảnh hưởng bởi tab trạng thái)
  const activeOrders = baseFilteredOrders.filter(o => o.status !== 'returned' && o.status !== 'cancelled' && o.delivery_status !== 'failed' && o.delivery_status !== 'cancelled');
  const normalActiveOrders = activeOrders.filter(o => !o.is_replacement && !o.is_seeding);
  const returnedOrders  = baseFilteredOrders.filter(o => o.status === 'returned' || o.delivery_status === 'failed');
  const totalRevenue = normalActiveOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalItems   = normalActiveOrders.reduce((s, o) => s + (o.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0);
  const totalCost    = activeOrders.reduce((s, o) => s + (o.seeding_cost || 0) + (o.items?.reduce((a, i) => a + (i.unit_cost || 0) * i.quantity, 0) || 0) + (o.logistics_cost || 0) + (o.packaging_cost || 0), 0)
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
          onStatusSaved={updatedOrder => {
            setOrders(current => current.map(order => order._id === updatedOrder._id ? { ...updatedOrder, tracking_token: order.tracking_token } : order));
            setModal(current => current?.data?._id === updatedOrder._id ? { ...current, data: { ...updatedOrder, tracking_token: current.data.tracking_token } } : current);
          }}
          onTrackingCreated={updatedOrder => {
            const tracking = {
              tracking_enabled: updatedOrder.tracking_enabled, tracking_token: updatedOrder.tracking_token,
              status: updatedOrder.status, delivery_status: updatedOrder.delivery_status, updatedAt: updatedOrder.updatedAt,
            };
            setModal(current => ({ ...current, data: { ...current.data, ...tracking } }));
            setOrders(current => current.map(order => order._id === updatedOrder._id ? { ...order, ...tracking } : order));
          }}
          onDelete={() => setModal({ type: 'delete', data: modal.data })}
          onMarkReturn={() => setModal({ type: 'return', data: modal.data })}
          onMaterialsSaved={updatedOrder => {
            setOrders(current => current.map(order => order._id === updatedOrder._id ? { ...updatedOrder, tracking_token: order.tracking_token } : order));
            setModal(current => ({ ...current, data: { ...updatedOrder, tracking_token: current.data.tracking_token } }));
            showToast('Đã đổi nguyên liệu và cập nhật tồn kho');
          }}
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
          defaultReturnCost={returnCostConfig[modal.data.source || 'khác'] || 0}
          onClose={() => setModal(null)}
          onConfirm={handleReturn}
          loading={actionLoading}
        />
      )}
      {modal?.type === 'refund' && (
        <RefundModal
          order={modal.data}
          onClose={() => setModal(null)}
          onConfirm={handleRefund}
          loading={actionLoading}
        />
      )}

      <div className="space-y-6">
        {/* Header Trang */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Quản lý Đơn hàng</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                {orders.length} đơn
              </span>
            </div>
            <p className="text-stone-500 mt-1 text-sm">Theo dõi, điều phối và xử lý toàn bộ đơn hàng từ các kênh bán</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setModal({ type: 'add_replacement' })}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all font-bold text-xs border border-red-200 shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              <span>Tạo đơn giao bù</span>
            </button>
            <button
              onClick={() => setModal({ type: 'add' })}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all shadow-sm font-bold text-xs shadow-primary/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Tạo đơn hàng mới</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Thống Kê */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: 'Tổng đơn hàng', 
              value: loading ? null : filteredOrders.length, 
              icon: 'receipt_long', 
              color: 'text-primary', 
              bg: 'bg-blue-50/70',
              border: 'border-blue-200/80',
              sub: pendingExpressCount > 0 ? `${pendingExpressCount} hỏa tốc chờ duyệt` : 'Toàn bộ đơn hàng'
            },
            { 
              label: 'Sản phẩm bán ra', 
              value: loading ? null : totalItems.toLocaleString('vi-VN'), 
              icon: 'inventory_2', 
              color: 'text-emerald-700', 
              bg: 'bg-emerald-50/70',
              border: 'border-emerald-200/80',
              sub: 'Tổng số lượng ly nến'
            },
            { 
              label: 'Doanh thu thực tế', 
              value: loading ? null : formatPrice(totalRevenue), 
              icon: 'payments', 
              color: 'text-amber-800', 
              bg: 'bg-amber-50/70',
              border: 'border-amber-200/80',
              sub: totalReturned > 0 ? `${totalReturned} đơn hoàn` : 'Doanh thu ròng'
            },
            { 
              label: 'Lợi nhuận gộp', 
              value: loading ? null : formatPrice(totalProfit), 
              icon: 'trending_up', 
              color: totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600', 
              bg: totalProfit >= 0 ? 'bg-emerald-50/70' : 'bg-red-50/70',
              border: totalProfit >= 0 ? 'border-emerald-200/80' : 'border-red-200/80',
              sub: `${profitMargin}% tỷ suất biên`
            },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-stone-200/90 flex items-center justify-between hover:shadow-xs transition-all">
              <div>
                <p className="text-stone-500 text-xs font-semibold mb-1">{card.label}</p>
                <h3 className={`text-[22px] font-black leading-none font-mono ${card.color}`}>
                  {loading ? (
                    <span className="inline-block w-24 h-7 bg-stone-100 rounded-lg animate-pulse" />
                  ) : (
                    card.value
                  )}
                </h3>
                {card.sub && !loading && (
                  <p className="text-[11px] text-stone-400 font-medium mt-1.5">{card.sub}</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${card.bg} ${card.border}`}>
                <span className={`material-symbols-outlined text-[24px] ${card.color}`}>{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Thanh Lọc và Tìm Kiếm */}
        <div className="bg-white rounded-2xl shadow-2xs border border-stone-200/90 p-4 sm:p-5 space-y-4">
          {/* Tầng 1: Lọc thời gian, Nguồn đơn & Số lượng kết quả */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-stone-100">
            <div className="flex flex-wrap items-center gap-4">
              {/* Lọc thời gian */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-stone-400">calendar_month</span>
                  Thời gian:
                </span>
                <select
                  value={datePreset}
                  onChange={(e) => { setDatePreset(e.target.value); setCurrentPage(1); }}
                  className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-stone-50/70 text-stone-800 focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="thisWeek">Tuần này</option>
                  <option value="thisMonth">Tháng này</option>
                  <option value="lastMonth">Tháng trước</option>
                  <option value="thisYear">Năm nay</option>
                  <option value="custom">Khoảng tuỳ chỉnh...</option>
                </select>

                {datePreset === 'custom' && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => { setCustomFrom(e.target.value); setCurrentPage(1); }}
                      className="border border-stone-200 rounded-xl px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:border-primary"
                    />
                    <span className="text-stone-400 text-xs">—</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => { setCustomTo(e.target.value); setCurrentPage(1); }}
                      className="border border-stone-200 rounded-xl px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Lọc nguồn */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-stone-400">storefront</span>
                  Kênh bán:
                </span>
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-stone-50/70 text-stone-800 focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Tất cả kênh</option>
                  <option value="shopee">Shopee</option>
                  <option value="tiktok">TikTok</option>
                  <option value="website">Website</option>
                  <option value="pos">POS (Quầy)</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="khác">Khác</option>
                </select>
              </div>
            </div>

            {/* Badge đếm kết quả */}
            <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full font-bold">
              Hiển thị <strong className="text-stone-900">{filteredOrders.length}</strong> / {orders.length} đơn
            </span>
          </div>

          {/* Tầng 2: Các tab trạng thái & Nút lọc hỏa tốc */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { val: 'all', label: 'Tất cả' },
                { val: 'pending', label: 'Chờ duyệt / Chờ thu' },
                { val: 'completed', label: 'Hoàn thành' },
                { val: 'returned', label: 'Bị hoàn' },
                { val: 'cancelled', label: 'Đã huỷ' },
              ].map(st => {
                const isSelected = statusFilter === st.val;
                let count = 0;
                if (st.val === 'returned') count = baseFilteredOrders.filter(o => o.status === 'returned' || o.delivery_status === 'failed').length;
                if (st.val === 'pending') count = baseFilteredOrders.filter(o => o.status === 'pending').length;
                if (st.val === 'cancelled') count = baseFilteredOrders.filter(o => o.status === 'cancelled' || o.delivery_status === 'cancelled').length;

                return (
                  <button
                    key={st.val}
                    onClick={() => {
                      setStatusFilter(st.val);
                      setShippingFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected && shippingFilter !== 'express'
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/80'
                    }`}
                  >
                    <span>{st.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected && shippingFilter !== 'express' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="h-5 w-[1px] bg-stone-200 mx-1 hidden sm:block"></div>

              {/* Nút lọc Đơn Hỏa Tốc (Chỉ lọc Hỏa tốc Website chưa được chấp nhận) */}
              <button
                type="button"
                onClick={() => {
                  setShippingFilter(prev => {
                    if (prev === 'express') return 'all';
                    setStatusFilter('all');
                    return 'express';
                  });
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  shippingFilter === 'express'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500 text-white shadow-orange-300 ring-2 ring-orange-400/30'
                    : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800'
                }`}
                title="Lọc các đơn hỏa tốc Website chưa được chấp nhận (Chờ duyệt)"
              >
                <span className={`material-symbols-outlined text-[16px] ${shippingFilter === 'express' ? 'text-yellow-200 animate-bounce' : 'text-orange-600'}`}>
                  bolt
                </span>
                <span>Đơn Hỏa Tốc</span>
                {pendingExpressCount > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    shippingFilter === 'express' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white animate-pulse'
                  }`}>
                    {pendingExpressCount} gấp
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bảng Danh Sách Đơn Hàng */}
        <div className="bg-white rounded-2xl shadow-2xs border border-stone-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Mã đơn & Kênh</th>
                  <th className="px-5 py-3.5">Khách hàng</th>
                  <th className="px-5 py-3.5">Sản phẩm</th>
                  <th className="px-5 py-3.5 text-right">Tổng thanh toán</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 text-center">Ngày đặt</th>
                  <th className="px-4 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-stone-100 rounded-lg" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-stone-400">
                      <span className="material-symbols-outlined text-[48px] opacity-30 block mb-2">receipt_long</span>
                      <p className="text-sm font-semibold text-stone-600">Chưa có đơn hàng nào trong hệ thống</p>
                      <button 
                        onClick={() => setModal({ type: 'add' })} 
                        className="mt-3 text-xs font-bold text-primary hover:underline"
                      >
                        + Tạo đơn hàng đầu tiên
                      </button>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-stone-400">
                      <span className="material-symbols-outlined text-[48px] opacity-30 block mb-2">search_off</span>
                      <p className="text-sm font-semibold text-stone-600">Không tìm thấy đơn hàng nào phù hợp với bộ lọc</p>
                      <p className="text-xs text-stone-400 mt-1">Thử đổi từ khóa hoặc khoảng thời gian tìm kiếm</p>
                    </td>
                  </tr>
                ) : (
                  currentOrders.map(order => {
                    const isExpress = order.shippingMethod === 'express';
                    const isReturned = order.status === 'returned';
                    const isManualTransfer = order.payment_method === 'transfer' && order.source !== 'website';
                    const isTransferPaid = order.payment_status === 'paid' || isManualTransfer;

                    return (
                      <tr
                        key={order._id}
                        onClick={() => setModal({ type: 'edit', data: order })}
                        className={`transition-colors cursor-pointer group ${
                          isReturned
                            ? 'bg-amber-50/40 hover:bg-amber-50/80'
                            : isExpress
                            ? 'bg-orange-50/35 hover:bg-orange-100/50 border-l-4 border-l-orange-500'
                            : 'hover:bg-stone-50/80'
                        }`}
                      >
                        {/* 1. Mã đơn & Kênh bán */}
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[13px] font-bold text-stone-900 bg-stone-100/80 group-hover:bg-white px-2 py-0.5 rounded-md border border-stone-200 transition-colors">
                                #{order.orderId}
                              </span>
                              {isExpress && (
                                <span
                                  title="Đơn giao HỎA TỐC 4H - Ưu tiên đóng gói và gửi shipper ngay"
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs shadow-orange-300 animate-pulse"
                                >
                                  <span className="material-symbols-outlined text-[12px] font-black">bolt</span>
                                  HỎA TỐC
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-wrap">
                              {order.source && (
                                <span className={`inline-flex items-center justify-center gap-1 text-[10px] uppercase font-bold rounded px-1.5 py-0.2 ${{
                                  shopee: 'bg-[#ee4d2d]/10 text-[#ee4d2d] border border-[#ee4d2d]/20',
                                  tiktok: 'bg-black text-white border border-black/20',
                                  facebook: 'bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20',
                                  instagram: 'bg-[#e1306c]/10 text-[#e1306c] border border-[#e1306c]/20',
                                  youtube: 'bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/20',
                                  website: 'bg-blue-50 text-blue-700 border border-blue-200',
                                  pos: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }[order.source] || 'bg-stone-100 text-stone-600 border border-stone-200'}`}>
                                  {order.source}
                                </span>
                              )}

                              {order.pancake_order_id && (
                                <span title="Đồng bộ tự động từ Pancake" className="inline-flex items-center gap-0.5 text-[9.5px] uppercase font-bold rounded bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2">
                                  Auto
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Khách hàng */}
                        <td className="px-5 py-3.5 align-middle">
                          <div className="min-w-0 max-w-[160px]">
                            <p className="text-[13px] font-bold text-stone-900 truncate">
                              {order.customer_name || (order.source === 'website' ? 'Khách Website' : `Khách sàn ${order.source || ''}`)}
                            </p>
                            {order.customer_phone ? (
                              <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 font-mono">
                                <span className="material-symbols-outlined text-[13px] text-stone-400">call</span>
                                {order.customer_phone}
                              </p>
                            ) : (
                              <p className="text-[11px] text-stone-400 italic">Không có SĐT</p>
                            )}
                          </div>
                        </td>

                        {/* 3. Sản phẩm */}
                        <td className="px-5 py-3.5 align-middle">
                          <div className="space-y-1 min-w-[180px] max-w-[240px]">
                            {!order.items || order.items.length === 0 ? (
                              <span className="text-xs italic text-stone-400">Không kèm sản phẩm</span>
                            ) : (
                              <>
                                {order.items.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    {item.product_image ? (
                                      <img 
                                        src={item.product_image} 
                                        alt={item.product_name} 
                                        className="w-7 h-7 rounded-lg object-cover border border-stone-200 shrink-0" 
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {item.product_name?.charAt(0) || 'N'}
                                      </div>
                                    )}
                                    <span className="text-[12.5px] text-stone-800 truncate">
                                      {item.product_name}
                                      {item.sku_label && <span className="text-stone-400 text-[11px]"> · {item.sku_label}</span>}
                                      <strong className="text-stone-900 font-mono"> ×{item.quantity}</strong>
                                    </span>
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <p className="text-[10.5px] font-semibold text-stone-400 pl-9">
                                    +{order.items.length - 2} sản phẩm khác
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 4. Tổng thanh toán */}
                        <td className="px-5 py-3.5 text-right align-middle">
                          <p className="font-mono font-black text-[14px] text-stone-900">
                            {formatPrice(order.total_price)}
                          </p>
                          <span className="text-[10px] font-bold text-stone-400 uppercase">
                            {order.payment_method === 'cash' ? 'COD (Thu tiền)' : order.payment_method === 'transfer' ? 'Chuyển khoản' : 'Đã thanh toán'}
                          </span>
                          {order.payment_method === 'transfer' && (
                            <span className={`block mt-1 text-[10px] font-bold uppercase ${
                              order.payment_status === 'refunded'
                                ? 'text-stone-500'
                                : isTransferPaid
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                            }`}>
                              {order.payment_status === 'refunded'
                                ? '↩ Đã hoàn tiền'
                                : isTransferPaid
                                  ? '✓ Đã nhận tiền'
                                  : 'Chờ SePay xác nhận'}
                            </span>
                          )}
                          {order.payment_method === 'transfer' && order.payment_status === 'refunded' && order.refund_transaction_id && (
                            <span className="block mt-0.5 text-[9.5px] font-mono text-stone-400 truncate" title={order.refund_transaction_id}>
                              Mã hoàn: {order.refund_transaction_id}
                            </span>
                          )}
                        </td>

                        {/* 5. Trạng thái */}
                        <td className="px-5 py-3.5 text-center align-middle">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            {(order.source === 'website' || order.tracking_enabled) && !isReturned && order.status !== 'cancelled' ? (
                              <>
                                {(!order.delivery_status || order.delivery_status === 'pending') && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    Chờ xác nhận
                                  </span>
                                )}
                                {order.delivery_status === 'confirmed' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    <span className="material-symbols-outlined text-[13px]">inventory_2</span>
                                    Đã chấp nhận
                                  </span>
                                )}
                                {order.delivery_status === 'shipping' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                                    Đang giao hàng
                                  </span>
                                )}
                                {order.delivery_status === 'delivered' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    Giao thành công
                                  </span>
                                )}
                                {order.delivery_status === 'failed' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    <span className="material-symbols-outlined text-[13px]">cancel</span>
                                    Giao thất bại
                                  </span>
                                )}
                                {order.delivery_status === 'cancelled' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                    <span className="material-symbols-outlined text-[13px]">block</span>
                                    Đã huỷ
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {order.status === 'cancelled' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                    <span className="material-symbols-outlined text-[12px]">block</span>
                                    Đã huỷ
                                  </span>
                                )}
                                {order.status === 'returned' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                                    <span className="material-symbols-outlined text-[12px]">assignment_return</span>
                                    Hoàn hàng
                                  </span>
                                )}
                                {order.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                                    <span className="material-symbols-outlined text-[12px]">hourglass_empty</span>
                                    Chờ thu tiền
                                  </span>
                                )}
                                {order.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                    Đã thu tiền
                                  </span>
                                )}
                                {order.source === 'pos' && (
                                  <span className="text-[10px] text-stone-500 font-bold">
                                    {order.pos_mode === 'online' ? 'POS Online' : 'POS Tại quầy'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 6. Ngày đặt */}
                        <td className="px-5 py-3.5 text-center align-middle">
                          <p className="text-[12.5px] font-semibold text-stone-800 font-mono">
                            {formatDate(order.ordered_at).split(' ')[0]}
                          </p>
                          <p className="text-[10.5px] text-stone-400 font-mono">
                            {formatDate(order.ordered_at).split(' ')[1] || ''}
                          </p>
                        </td>

                        {/* 7. Thao tác */}
                        <td className="px-4 py-3.5 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            {order.payment_method === 'transfer' && isTransferPaid && (order.status === 'cancelled' || order.delivery_status === 'cancelled') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModal({ type: 'refund', data: order });
                                }}
                                className="h-8 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                                title="Xác nhận đã chuyển hoàn tiền cho khách"
                              >
                                <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
                                <span className="text-[10px] font-bold">Hoàn tiền</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ type: 'edit', data: order });
                              }}
                              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-primary hover:text-white text-stone-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                              title="Xem và chỉnh sửa đơn hàng"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit_note</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang (Pagination) */}
          {!loading && orders.length > 0 && (
            <div className="px-5 py-3.5 border-t border-stone-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-stone-50/50">
              <p className="text-stone-500 text-xs">
                Hiển thị <strong className="text-stone-800">{currentOrders.length}</strong> trên tổng số <strong className="text-stone-800">{filteredOrders.length}</strong> đơn hàng
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-stone-700 px-2">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
