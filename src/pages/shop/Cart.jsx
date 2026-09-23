import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { resolveTagColor } from '../../utils/productTagUtils';
import { getImageUrl } from '../../utils/imageUtils';

export default function Cart() {
  const {
    cart,
    loading,
    updateQuantity,
    removeItem,
    removeMultipleItems,
    calculateItemPrice
  } = useCart();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Ngưỡng miễn phí vận chuyển: 100.000đ
  const FREESHIP_THRESHOLD = 100000;

  // Helper kiểm tra item có được chọn không
  const isSelected = (item) => {
    return selectedItems.some(s => s.product_id === item.product_id._id && s.sku_id === item.sku_id);
  };

  const toggleSelect = (item) => {
    if (isSelected(item)) {
      setSelectedItems(prev => prev.filter(s => !(s.product_id === item.product_id._id && s.sku_id === item.sku_id)));
    } else {
      setSelectedItems(prev => [...prev, { product_id: item.product_id._id, sku_id: item.sku_id }]);
    }
  };

  const toggleSelectAll = () => {
    if (!cart?.items || cart.items.length === 0) return;
    if (selectedItems.length === cart.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.items.map(item => ({ product_id: item.product_id._id, sku_id: item.sku_id })));
    }
  };

  // Tính tổng tiền dựa trên các sản phẩm được chọn
  const calculateSelectedTotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items
      .filter(item => isSelected(item))
      .reduce((total, item) => total + (calculateItemPrice(item) * item.quantity), 0);
  };

  const selectedTotal = calculateSelectedTotal();
  const selectedCount = cart?.items?.filter(item => isSelected(item)).reduce((sum, item) => sum + item.quantity, 0) || 0;
  const isAllSelected = cart?.items && cart.items.length > 0 && selectedItems.length === cart.items.length;

  const isFreeshipEligible = selectedTotal >= FREESHIP_THRESHOLD;
  const estShipping = selectedItems.length > 0 ? (isFreeshipEligible ? 0 : 16000) : 0;
  const estimatedTotal = selectedTotal > 0 ? selectedTotal + estShipping : 0;

  // Tiến độ freeship
  const freeshipProgress = Math.min(100, Math.round((selectedTotal / FREESHIP_THRESHOLD) * 100));
  const freeshipRemaining = Math.max(0, FREESHIP_THRESHOLD - selectedTotal);

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedItems.length} sản phẩm đã chọn khỏi giỏ hàng?`)) {
      try {
        setIsDeletingMultiple(true);
        await removeMultipleItems(selectedItems);
        setSelectedItems([]);
      } catch (err) {
        console.error('Lỗi khi xóa nhiều sản phẩm:', err);
      } finally {
        setIsDeletingMultiple(false);
      }
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để tiến hành thanh toán');
      return;
    }
    const itemsToCheckout = cart.items.filter(item => isSelected(item));
    navigate('/checkout', { state: { selectedItems: itemsToCheckout } });
  };

  const getVariantLabel = (product, skuId) => {
    if (!product || !skuId || !product.skus || !product.variant_groups) return skuId;

    const sku = product.skus.find(s => s.id === skuId);
    if (!sku || !sku.combination) return skuId;

    const labels = [];
    sku.combination.forEach(optId => {
      product.variant_groups.forEach(group => {
        const option = group.options.find(o => o.id === optId);
        if (option) labels.push(option.label);
      });
    });

    return labels.length > 0 ? labels.join(' • ') : skuId;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[65vh] bg-[#fbf9f6]">
        <div className="w-12 h-12 border-3 border-[#4A2C2A]/20 border-t-[#4A2C2A] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-serif-display text-stone-600 tracking-wider">Đang chuẩn bị giỏ hàng của bạn...</p>
      </div>
    );
  }

  const hasItems = cart && cart.items && cart.items.length > 0;

  return (
    <div className="bg-[#fbf9f6] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-6">
          <Link to="/" className="hover:text-[#4A2C2A] transition-colors">Trang Chủ</Link>
          <span className="text-stone-300">/</span>
          <Link to="/shop" className="hover:text-[#4A2C2A] transition-colors">Cửa Hàng Nến</Link>
          <span className="text-stone-300">/</span>
          <span className="text-[#4A2C2A]">Giỏ Hàng ({cart?.items?.length || 0})</span>
        </div>

        {/* Page Title & Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8 pb-4 border-b border-stone-200/80">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif-display text-[#4A2C2A] font-bold tracking-tight">
              Giỏ Hàng Của Bạn
            </h1>
            <p className="text-sm text-stone-500 mt-1.5 font-normal">
              Những ngọn nến thủ công lưu giữ cảm xúc và thông điệp riêng
            </p>
          </div>
          {hasItems && (
            <Link
              to="/shop"
              className="mt-3 sm:mt-0 text-xs font-bold text-[#8C4A32] hover:text-[#4A2C2A] uppercase tracking-wider flex items-center gap-1.5 group transition-colors"
            >
              <i className="ph-bold ph-arrow-left group-hover:-translate-x-1 transition-transform"></i>
              Tiếp tục chọn thêm nến
            </Link>
          )}
        </div>

        {!hasItems ? (
          /* Empty Cart State */
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-12 sm:p-16 text-center max-w-2xl mx-auto my-6">
            <div className="w-24 h-24 bg-[#FAF5EE] text-[#8C4A32] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <i className="ph-light ph-shopping-bag-open text-5xl"></i>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif-display text-[#4A2C2A] font-bold mb-3">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-stone-500 mb-8 max-w-[480px] mx-auto text-sm sm:text-base leading-relaxed">
              Bạn chưa chọn được ngọn nến nào. Hãy khám phá bộ sưu tập nến thơm thủ công với thông điệp bí mật ẩn giấu bên trong nhé!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex bg-[#4A2C2A] hover:bg-[#341F1D] text-white text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-8 items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg active:scale-98"
              >
                Khám phá bộ sưu tập nến
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-6 items-center justify-center gap-2 transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Cart Items & Bulk Actions */}
            <div className="lg:col-span-8 space-y-6">

              {/* Freeship Progress Bar Banner */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between gap-4 mb-2.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-800">
                    <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-truck text-base"></i>
                    </span>
                    {freeshipProgress >= 100 ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <i className="ph-bold ph-check-circle text-base"></i>
                        Chúc mừng! Đơn hàng của bạn đã đủ điều kiện MIỄN PHÍ VẬN CHUYỂN toàn quốc
                      </span>
                    ) : (
                      <span>
                        Mua thêm <strong className="text-[#8C4A32]">{new Intl.NumberFormat('vi-VN').format(freeshipRemaining)}đ</strong> để được <strong className="text-emerald-700">Freeship toàn quốc</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono text-stone-500 shrink-0">
                    {freeshipProgress}%
                  </span>
                </div>
                {/* Progress bar line */}
                <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${freeshipProgress >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-r from-amber-500 to-[#8C4A32]'
                      }`}
                    style={{ width: `${freeshipProgress}%` }}
                  />
                </div>
              </div>

              {/* Select All & Multi-actions Bar */}
              <div className="bg-white rounded-xl px-5 py-3.5 border border-stone-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-[#4A2C2A] focus:ring-[#4A2C2A] cursor-pointer accent-[#4A2C2A]"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-xs sm:text-sm font-bold text-stone-800">
                    Chọn tất cả ({cart.items.length} sản phẩm)
                  </span>
                </label>

                <div className="flex items-center gap-4">
                  {selectedItems.length > 0 && (
                    <span className="text-xs text-stone-500 font-medium">
                      Đã chọn: <strong className="text-stone-900">{selectedItems.length}</strong>
                    </span>
                  )}
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={isDeletingMultiple}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline transition-colors disabled:opacity-50"
                    >
                      <i className="ph-bold ph-trash text-sm"></i>
                      Xóa mục đã chọn
                    </button>
                  )}
                </div>
              </div>

              {/* Items List Cards */}
              <div className="space-y-4">
                {cart.items.map((item, index) => {
                  const product = item.product_id;
                  if (!product) return null;

                  const price = calculateItemPrice(item);
                  const isItemActive = isSelected(item);
                  const originalPrice = product.original_price > price ? product.original_price : 0;
                  const discountPct = originalPrice > 0
                    ? Math.round(((originalPrice - price) / originalPrice) * 100)
                    : 0;

                  return (
                    <div
                      key={`${item.product_id._id || item.product_id}-${item.sku_id || 'default'}-${index}`}
                      className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${isItemActive
                        ? 'border-stone-400/80 ring-1 ring-stone-300/60'
                        : 'border-stone-200 hover:border-stone-300'
                        }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">

                        {/* Checkbox */}
                        <div className="pt-8 sm:pt-10 shrink-0">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-stone-300 text-[#4A2C2A] focus:ring-[#4A2C2A] cursor-pointer accent-[#4A2C2A]"
                            checked={isItemActive}
                            onChange={() => toggleSelect(item)}
                          />
                        </div>

                        {/* Product Image */}
                        <Link
                          to={`/product/${product._id}`}
                          className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 relative group"
                        >
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <i className="ph ph-image text-3xl"></i>
                            </div>
                          )}
                          {product.tag && (
                            <span
                              className="absolute top-1.5 left-1.5 text-white text-[8px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-xs shadow-xs"
                              style={{ backgroundColor: resolveTagColor(product.tag, product.tag_color) }}
                            >
                              {product.tag}
                            </span>
                          )}
                        </Link>

                        {/* Product Info & Controls */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base sm:text-lg font-serif-display font-bold text-stone-900 leading-snug hover:text-[#8C4A32] transition-colors line-clamp-2">
                                <Link to={`/product/${product._id}`}>{product.name}</Link>
                              </h3>

                              {/* Remove Button (Desktop) */}
                              <button
                                onClick={() => removeItem(item)}
                                className="text-stone-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                                title="Xóa sản phẩm này"
                              >
                                <i className="ph-bold ph-trash text-lg"></i>
                              </button>
                            </div>

                            {/* Scent / Variant Label */}
                            {item.sku_id && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#FAF5EE] text-[#8C4A32] border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                                  <i className="ph-fill ph-drop text-xs"></i>
                                  {getVariantLabel(product, item.sku_id)}
                                </span>
                              </div>
                            )}

                            {/* Price Block */}
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-base sm:text-lg font-bold text-[#4A2C2A]">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
                              </span>
                              {originalPrice > 0 && (
                                <>
                                  <span className="text-xs text-stone-400 line-through">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalPrice)}
                                  </span>
                                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                    -{discountPct}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Stepper & Subtotal */}
                          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">

                            {/* Quantity Stepper */}
                            <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50/80 p-0.5 shadow-2xs">
                              <button
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Giảm 1"
                              >
                                <i className="ph-bold ph-minus text-xs"></i>
                              </button>
                              <span className="w-10 text-center text-xs sm:text-sm font-bold text-stone-800 font-mono">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white rounded transition-colors"
                                title="Tăng 1"
                              >
                                <i className="ph-bold ph-plus text-xs"></i>
                              </button>
                            </div>

                            {/* Item Subtotal */}
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-bold">Thành tiền</span>
                              <span className="text-base sm:text-lg font-bold text-[#8C4A32]">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price * item.quantity)}
                              </span>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Column: Order Summary & Trust Guarantees */}
            <div className="lg:col-span-4 space-y-6">

              {/* Order Summary Sticky Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7 sticky top-24">
                <h3 className="text-xl font-serif-display text-[#4A2C2A] font-bold mb-5 pb-4 border-b border-stone-100 flex items-center justify-between">
                  <span>Tóm Tắt Đơn Hàng</span>
                  <span className="text-xs font-mono font-bold bg-[#FAF5EE] text-[#8C4A32] px-2.5 py-1 rounded-full border border-amber-200/50">
                    {selectedCount} món
                  </span>
                </h3>

                <div className="space-y-3.5 text-sm mb-6">
                  <div className="flex justify-between text-stone-600">
                    <span>Tạm tính ({selectedCount} sản phẩm đã chọn)</span>
                    <span className="font-bold text-stone-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-start text-stone-600">
                    <div>
                      <span>Ước tính phí vận chuyển</span>
                      {selectedItems.length > 0 && !isFreeshipEligible && (
                        <span className="block text-[10px] text-stone-400 font-normal">
                          (Thu thêm 16.000đ do đơn dưới 100k)
                        </span>
                      )}
                      {selectedItems.length > 0 && isFreeshipEligible && (
                        <span className="block text-[10px] text-emerald-600 font-medium">
                          (Đã đủ điều kiện Freeship đơn từ 100k)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {selectedItems.length === 0 ? (
                        <span className="italic text-stone-400 text-xs">--</span>
                      ) : isFreeshipEligible ? (
                        <span className="text-emerald-700 font-bold uppercase text-xs tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Miễn Phí
                        </span>
                      ) : (
                        <span className="font-bold text-stone-900">
                          +16.000đ
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Mã giảm giá / Voucher</span>
                    <span className="italic text-stone-400 text-xs">Áp dụng ở bước thanh toán</span>
                  </div>
                </div>

                {/* Total Price Section */}
                <div className="border-t border-stone-100 pt-5 mb-6">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold tracking-widest uppercase text-stone-400">
                      Tổng Tạm Tính
                    </span>
                    <span className="text-2xl sm:text-3xl font-serif-display font-bold text-[#4A2C2A]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(estimatedTotal)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 text-right italic">
                    {selectedItems.length === 0
                      ? '(Vui lòng chọn sản phẩm để tính tổng)'
                      : isFreeshipEligible
                        ? '(Đơn hàng đã được áp dụng Freeship toàn quốc)'
                        : '(Đã bao gồm 16.000đ phí giao hàng tiêu chuẩn)'}
                  </p>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="w-full bg-[#4A2C2A] hover:bg-[#341F1D] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-6 flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg active:scale-98"
                >
                  <span>Tiến hành đặt hàng</span>
                  <i className="ph-bold ph-arrow-right text-base"></i>
                </button>

                {selectedItems.length === 0 && (
                  <p className="text-xs text-amber-700 text-center mt-2.5 font-medium">
                    Vui lòng tích chọn ít nhất 1 ngọn nến để thanh toán
                  </p>
                )}

                {/* Secure Badge */}
                <div className="mt-5 pt-5 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-400">
                  <i className="ph-fill ph-shield-check text-emerald-600 text-base"></i>
                  <span>Thanh toán an toàn & bảo mật tuyệt đối</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
