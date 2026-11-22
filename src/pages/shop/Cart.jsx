import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { getImageUrl } from '../../utils/imageUtils';

export default function Cart() {
  const {
    cart,
    loading,
    updateQuantity,
    changeItemSku,
    removeItem,
    removeMultipleItems,
    calculateItemPrice
  } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [editingVariantKey, setEditingVariantKey] = useState('');
  const [variantDraft, setVariantDraft] = useState({});
  const [changingVariant, setChangingVariant] = useState(false);
  const [variantError, setVariantError] = useState('');
  const [swipeOffsets, setSwipeOffsets] = useState({});
  const swipeGesture = useRef(null);

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

  const toggleProductGroup = (items) => {
    const allSelected = items.every(item => isSelected(item));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(selected => !items.some(item => (
        selected.product_id === item.product_id._id && selected.sku_id === item.sku_id
      ))));
      return;
    }

    setSelectedItems(prev => {
      const next = [...prev];
      items.forEach(item => {
        if (!next.some(selected => selected.product_id === item.product_id._id && selected.sku_id === item.sku_id)) {
          next.push({ product_id: item.product_id._id, sku_id: item.sku_id });
        }
      });
      return next;
    });
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

    const sku = product.skus.find(s => String(s.id) === String(skuId));
    if (!sku || !sku.combination) return skuId;

    const labels = [];
    sku.combination.forEach(optId => {
      product.variant_groups.forEach(group => {
        const option = group.options.find(o => String(o.id) === String(optId));
        if (option) labels.push(option.label);
      });
    });

    return labels.length > 0 ? labels.join(' • ') : skuId;
  };

  const getItemKey = (item) => `${item.product_id?._id || item.product_id}:${item.sku_id || 'default'}`;

  const openVariantEditor = (item) => {
    const product = item.product_id;
    const sku = product?.skus?.find(entry => String(entry.id) === String(item.sku_id));
    if (!sku) return;
    const nextDraft = {};
    (product.variant_groups || []).forEach(group => {
      const option = (group.options || []).find(entry => (
        (sku.combination || []).some(optionId => String(optionId) === String(entry.id))
      ));
      if (option) nextDraft[group.id] = option.id;
    });
    setVariantDraft(nextDraft);
    setVariantError('');
    setEditingVariantKey(getItemKey(item));
  };

  const isDraftOptionUnavailable = (product, groupId, optionId) => {
    const requiredOptions = Object.entries(variantDraft)
      .filter(([draftGroupId]) => String(draftGroupId) !== String(groupId))
      .map(([, value]) => String(value));
    return !(product.skus || []).some(sku => {
      const combination = new Set((sku.combination || []).map(String));
      const hasStock = sku.stock === null || sku.stock === undefined || Number(sku.stock) > 0;
      return hasStock && combination.has(String(optionId)) && requiredOptions.every(value => combination.has(value));
    });
  };

  const findDraftSku = (product) => {
    const combination = Object.values(variantDraft).map(String).sort().join(',');
    return (product.skus || []).find(sku => (sku.combination || []).map(String).sort().join(',') === combination);
  };

  const saveVariantChange = async (item) => {
    const nextSku = findDraftSku(item.product_id);
    if (!nextSku) {
      setVariantError('Tổ hợp phân loại này không khả dụng.');
      return;
    }
    if (String(nextSku.id) === String(item.sku_id)) {
      setEditingVariantKey('');
      return;
    }

    try {
      setChangingVariant(true);
      setVariantError('');
      await changeItemSku(item, nextSku.id);
      setSelectedItems(prev => {
        const mapped = prev.map(selected => (
          selected.product_id === item.product_id._id && selected.sku_id === item.sku_id
            ? { ...selected, sku_id: nextSku.id }
            : selected
        ));
        return mapped.filter((selected, index) => mapped.findIndex(entry => (
          entry.product_id === selected.product_id && entry.sku_id === selected.sku_id
        )) === index);
      });
      setEditingVariantKey('');
    } catch (error) {
      setVariantError(error.response?.data?.message || 'Không thể đổi phân loại. Vui lòng thử lại.');
    } finally {
      setChangingVariant(false);
    }
  };

  const setSwipeOffset = (key, offset) => {
    setSwipeOffsets(current => {
      const next = {};
      Object.keys(current).forEach(itemKey => { next[itemKey] = itemKey === key ? offset : 0; });
      next[key] = offset;
      return next;
    });
  };

  const handleSwipeStart = (event, key) => {
    const touch = event.touches[0];
    swipeGesture.current = {
      key,
      startX: touch.clientX,
      startY: touch.clientY,
      initialOffset: swipeOffsets[key] || 0,
      latestOffset: swipeOffsets[key] || 0,
      horizontal: false,
    };
  };

  const handleSwipeMove = (event) => {
    const gesture = swipeGesture.current;
    if (!gesture) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (!gesture.horizontal && Math.abs(deltaX) > Math.abs(deltaY) + 6) gesture.horizontal = true;
    if (!gesture.horizontal) return;
    const nextOffset = Math.max(-152, Math.min(0, gesture.initialOffset + deltaX));
    gesture.latestOffset = nextOffset;
    setSwipeOffset(gesture.key, nextOffset);
  };

  const handleSwipeEnd = () => {
    const gesture = swipeGesture.current;
    if (!gesture) return;
    setSwipeOffset(gesture.key, gesture.latestOffset < -55 ? -152 : 0);
    swipeGesture.current = null;
  };

  const closeSwipeActions = (item) => setSwipeOffset(getItemKey(item), 0);

  const handleWishlistAction = (item) => {
    toggleWishlist(item.product_id, navigate);
    closeSwipeActions(item);
  };

  const handleRemoveAction = async (item) => {
    closeSwipeActions(item);
    await removeItem(item);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[65vh] bg-[#fbf9f6]">
        <div className="w-12 h-12 border-3 border-brand-burgundy/20 border-t-brand-burgundy rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-serif-display text-stone-600 tracking-wider">Đang chuẩn bị giỏ hàng của bạn...</p>
      </div>
    );
  }

  const hasItems = cart && cart.items && cart.items.length > 0;
  const productGroups = hasItems
    ? Object.values(cart.items.reduce((groups, item) => {
      const productId = item.product_id?._id || item.product_id;
      if (!groups[productId]) groups[productId] = { product: item.product_id, items: [] };
      groups[productId].items.push(item);
      return groups;
    }, {}))
    : [];
  const editingVariantItem = cart?.items?.find(item => getItemKey(item) === editingVariantKey) || null;
  const editingVariantProduct = editingVariantItem?.product_id || null;
  const draftSku = editingVariantProduct ? findDraftSku(editingVariantProduct) : null;
  const draftSkuImage = draftSku?.image || editingVariantProduct?.image;
  const draftSkuPrice = Number(draftSku?.price) > 0
    ? Number(draftSku.price)
    : Number(editingVariantProduct?.base_price) || 0;

  return (
    <main className="min-h-screen bg-white pb-24 font-jakarta sm:bg-[#fbf9f6] sm:py-10 lg:pb-16">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">

        {/* Breadcrumb Navigation */}
        <div className="mb-6 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stone-400 sm:flex">
          <Link to="/" className="sm:hover:text-brand-burgundy transition-colors">Trang Chủ</Link>
          <span className="text-stone-300">/</span>
          <Link to="/shop" className="sm:hover:text-brand-burgundy transition-colors">Cửa Hàng</Link>
          <span className="text-stone-300">/</span>
          <span className="text-brand-burgundy">Giỏ Hàng ({cart?.items?.length || 0})</span>
        </div>

        {/* Page Title & Tagline */}
        <header className="flex flex-col justify-between border-b border-stone-200/80 px-4 pb-4 pt-5 sm:mb-8 sm:flex-row sm:items-baseline sm:px-0 sm:pb-4 sm:pt-0">
          <div>
            <h1 className="text-2xl sm:text-4xl font-serif-display text-brand-burgundy font-bold tracking-tight">
              Giỏ Hàng Của Bạn
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 font-normal">
              Những ngọn nến thủ công lưu giữ cảm xúc và thông điệp riêng
            </p>
          </div>
          {hasItems && (
            <Link
              to="/shop"
              className="mt-2.5 sm:mt-0 text-[11px] sm:text-xs font-bold text-brand-terracotta sm:hover:text-brand-burgundy uppercase tracking-wider flex items-center gap-1.5 group transition-colors"
            >
              <i className="ph-bold ph-arrow-left sm:group-hover:-translate-x-1 transition-transform"></i>
              Tiếp tục chọn thêm nến
            </Link>
          )}
        </header>

        {!hasItems ? (
          /* Empty Cart State */
          <section className="mx-auto max-w-2xl px-3 py-8 text-center sm:py-14">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FAF5EE] text-brand-terracotta rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 shadow-inner">
              <i className="ph-light ph-shopping-bag-open text-4xl sm:text-5xl"></i>
            </div>
            <h2 className="text-xl sm:text-3xl font-serif-display text-brand-burgundy font-bold mb-2.5 sm:mb-3">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-stone-500 mb-6 sm:mb-8 max-w-[480px] mx-auto text-xs sm:text-base leading-relaxed">
              Bạn chưa chọn được ngọn nến nào. Hãy khám phá bộ sưu tập nến thơm thủ công với thông điệp bí mật ẩn giấu bên trong nhé!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex bg-brand-burgundy sm:hover:bg-[#341F1D] text-white text-xs font-bold uppercase tracking-widest rounded-full py-3.5 px-8 items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                Khám phá bộ sưu tập nến
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex bg-stone-100 sm:hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest rounded-full py-3.5 px-6 items-center justify-center gap-2 transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-0 sm:gap-8 lg:grid-cols-12">

            {/* Left Column: Cart Items & Bulk Actions */}
            <section className="space-y-0 sm:space-y-6 lg:col-span-8">

              {/* Freeship Progress Bar Banner */}
              <section className="border-b-8 border-stone-100 bg-white px-4 py-4 sm:rounded-2xl sm:border sm:border-stone-200 sm:p-5 sm:shadow-2xs">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-[11px] sm:text-sm font-bold text-stone-800">
                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-truck text-xs sm:text-base"></i>
                    </span>
                    {freeshipProgress >= 100 ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <i className="ph-bold ph-check-circle text-xs sm:text-base"></i>
                        Đã đủ điều kiện FREESHIP toàn quốc!
                      </span>
                    ) : (
                      <span>
                        Mua thêm <strong className="text-brand-terracotta">{new Intl.NumberFormat('vi-VN').format(freeshipRemaining)}đ</strong> để được <strong className="text-emerald-700">Freeship</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold font-mono text-stone-500 shrink-0">
                    {freeshipProgress}%
                  </span>
                </div>
                {/* Progress bar line */}
                <div className="w-full h-2 sm:h-2.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${freeshipProgress >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-r from-amber-500 to-brand-terracotta'
                      }`}
                    style={{ width: `${freeshipProgress}%` }}
                  />
                </div>
              </section>

              {/* Select All & Multi-actions Bar */}
              <section className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3.5 sm:rounded-2xl sm:border sm:border-stone-200/90 sm:px-5 sm:py-3.5 sm:shadow-2xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy cursor-pointer accent-brand-burgundy"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-xs sm:text-sm font-bold text-stone-800">
                    Chọn tất cả ({cart.items.length})
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  {selectedItems.length > 0 && (
                    <span className="text-[11px] sm:text-xs text-stone-500 font-medium">
                      Đã chọn: <strong className="text-stone-900">{selectedItems.length}</strong>
                    </span>
                  )}
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={isDeletingMultiple}
                      className="text-[11px] sm:text-xs font-semibold text-red-600 sm:hover:text-red-700 flex items-center gap-1 sm:hover:underline transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <i className="ph-bold ph-trash text-xs sm:text-sm"></i>
                      <span>Xóa đã chọn</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Items List Cards */}
              <section className="divide-y divide-stone-200 bg-white sm:space-y-4 sm:divide-y-0 sm:bg-transparent">
                {productGroups.map(({ product, items }) => {
                  if (!product) return null;
                  const isGroupSelected = items.every(item => isSelected(item));
                  const hasSelectedItem = items.some(item => isSelected(item));

                  return (
                    <article
                      key={product._id}
                      className={`bg-white transition-colors sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-2xs ${hasSelectedItem
                        ? 'bg-amber-50/20 sm:border-stone-400 sm:ring-1 sm:ring-stone-300/60'
                        : 'sm:border-stone-200/90'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 border-b border-stone-100 px-4 py-3 sm:px-5">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy cursor-pointer accent-brand-burgundy"
                          checked={isGroupSelected}
                          onChange={() => toggleProductGroup(items)}
                        />
                        <Link to={`/product/${product._id}`} className="min-w-0 flex-1 truncate font-serif-display text-base font-bold tracking-[0.01em] text-stone-900 transition-colors hover:text-brand-terracotta sm:text-lg">
                          {product.name}
                        </Link>
                        <span className="shrink-0 text-[10px] font-medium text-stone-400">{items.length} phân loại</span>
                      </div>

                      <div className="divide-y divide-stone-100">
                        {items.map((item, index) => {
                          const price = calculateItemPrice(item);
                          const selectedSku = product.skus?.find(sku => String(sku.id) === String(item.sku_id));
                          const itemImage = selectedSku?.image || product.image;
                          const isItemActive = isSelected(item);
                          const originalPrice = product.original_price > price ? product.original_price : 0;

                          return (
                            <div
                              key={`${product._id}-${item.sku_id || 'default'}-${index}`}
                              className="relative overflow-hidden bg-stone-100"
                            >
                              <div
                                aria-hidden={(swipeOffsets[getItemKey(item)] || 0) >= -4}
                                className={`absolute inset-y-0 right-0 flex w-[152px] transition-opacity duration-100 ${
                                  (swipeOffsets[getItemKey(item)] || 0) < -4 ? 'opacity-100' : 'pointer-events-none opacity-0'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleWishlistAction(item)}
                                  className="flex w-[76px] flex-col items-center justify-center gap-1 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 cursor-pointer"
                                >
                                  <i className={`${isInWishlist(product._id) ? 'ph-fill' : 'ph-bold'} ph-heart text-lg`} />
                                  <span className="text-[9px] font-bold">Yêu thích</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAction(item)}
                                  className="flex w-[76px] flex-col items-center justify-center gap-1 bg-red-500 text-white transition-colors hover:bg-red-600 cursor-pointer"
                                >
                                  <i className="ph-bold ph-trash text-lg" />
                                  <span className="text-[9px] font-bold">Xóa</span>
                                </button>
                              </div>

                              <div
                                onTouchStart={event => handleSwipeStart(event, getItemKey(item))}
                                onTouchMove={handleSwipeMove}
                                onTouchEnd={handleSwipeEnd}
                                onTouchCancel={handleSwipeEnd}
                                style={{
                                  transform: `translateX(${swipeOffsets[getItemKey(item)] || 0}px)`,
                                  touchAction: 'pan-y',
                                }}
                                className={`relative z-10 flex w-full items-start gap-2.5 px-4 py-3 transition-transform duration-200 sm:gap-4 sm:px-5 sm:py-4 ${isItemActive ? 'bg-amber-50' : 'bg-white'}`}
                              >
                              <input
                                type="checkbox"
                                className="mt-6 size-4 shrink-0 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy cursor-pointer accent-brand-burgundy sm:mt-7"
                                checked={isItemActive}
                                onChange={() => toggleSelect(item)}
                              />

                              <Link to={`/product/${product._id}`} className="group size-[68px] shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 sm:size-20">
                                {itemImage ? (
                                  <img src={getImageUrl(itemImage)} alt={getVariantLabel(product, item.sku_id)} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                  <span className="flex size-full items-center justify-center text-stone-300"><i className="ph ph-image text-2xl" /></span>
                                )}
                              </Link>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    {item.sku_id && (
                                      <button
                                        type="button"
                                        onClick={() => editingVariantKey === getItemKey(item) ? setEditingVariantKey('') : openVariantEditor(item)}
                                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#FAF5EE] px-2 py-1 text-left text-[10px] font-semibold text-brand-terracotta transition-colors hover:bg-[#F3E9DD] cursor-pointer sm:text-[11px]"
                                        title="Đổi phân loại"
                                      >
                                        <span className="truncate">{getVariantLabel(product, item.sku_id)}</span>
                                        <i className={`ph-bold ph-caret-down shrink-0 text-[9px] transition-transform ${editingVariantKey === getItemKey(item) ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                      <span className="text-xs font-bold text-brand-burgundy sm:text-sm">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
                                      </span>
                                      {originalPrice > 0 && (
                                        <span className="text-[10px] text-stone-400 line-through">
                                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalPrice)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSwipeOffset(getItemKey(item), swipeOffsets[getItemKey(item)] ? 0 : -152)}
                                    className="hidden shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[9px] font-semibold text-stone-500 transition-colors hover:bg-stone-50 sm:flex cursor-pointer"
                                  >
                                    Thao tác <i className="ph-bold ph-caret-left text-[9px]" />
                                  </button>
                                </div>

                                <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                                  <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 shadow-xs">
                                    <button type="button" onClick={() => updateQuantity(item, item.quantity - 1)} disabled={item.quantity <= 1} className="flex size-7 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-30 cursor-pointer"><i className="ph-bold ph-minus text-[10px]" /></button>
                                    <span className="w-8 text-center font-mono text-xs font-bold text-stone-800">{item.quantity}</span>
                                    <button type="button" onClick={() => updateQuantity(item, item.quantity + 1)} className="flex size-7 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 cursor-pointer"><i className="ph-bold ph-plus text-[10px]" /></button>
                                  </div>
                                  <div className="text-right">
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-stone-400">Thành tiền</span>
                                    <span className="text-xs font-bold text-brand-terracotta sm:text-sm">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price * item.quantity)}</span>
                                  </div>
                                </div>
                              </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </section>

            </section>

            {/* Right Column: Order Summary & Trust Guarantees (Chỉ hiển thị trên Desktop, Mobile dùng Sticky Bottom Bar) */}
            <div className="hidden lg:block lg:col-span-4 space-y-6">

              {/* Order Summary Sticky Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-7 sticky top-24">
                <h3 className="text-lg sm:text-xl font-serif-display text-brand-burgundy font-bold mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-stone-100 flex items-center justify-between">
                  <span>Tóm Tắt Đơn Hàng</span>
                  <span className="text-xs font-mono font-bold bg-[#FAF5EE] text-brand-terracotta px-2.5 py-1 rounded-full border border-amber-200/50">
                    {selectedCount} món
                  </span>
                </h3>

                <div className="space-y-3 text-xs sm:text-sm mb-5 sm:mb-6">
                  <div className="flex justify-between text-stone-600">
                    <span>Tạm tính ({selectedCount} món đã chọn)</span>
                    <span className="font-bold text-stone-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-start text-stone-600">
                    <div>
                      <span>Phí vận chuyển dự tính</span>
                      {selectedItems.length > 0 && !isFreeshipEligible && (
                        <span className="block text-[10px] text-stone-400 font-normal">
                          (Thu thêm 16.000đ do đơn dưới 100k)
                        </span>
                      )}
                      {selectedItems.length > 0 && isFreeshipEligible && (
                        <span className="block text-[10px] text-emerald-600 font-medium">
                          (Đã đạt Freeship đơn từ 100k)
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
                    <span>Voucher giảm giá</span>
                    <span className="italic text-stone-400 text-xs">Chọn ở bước thanh toán</span>
                  </div>
                </div>

                {/* Total Price Section */}
                <div className="border-t border-stone-100 pt-4 sm:pt-5 mb-5 sm:mb-6">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold tracking-widest uppercase text-stone-400">
                      Tổng Tạm Tính
                    </span>
                    <span className="text-xl sm:text-3xl font-serif-display font-bold text-brand-burgundy">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(estimatedTotal)}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-400 text-right italic">
                    {selectedItems.length === 0
                      ? '(Chọn sản phẩm để xem tổng tiền)'
                      : isFreeshipEligible
                        ? '(Đã áp dụng Freeship toàn quốc)'
                        : '(Đã gồm 16.000đ cước chuyển phát)'}
                  </p>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="w-full bg-brand-burgundy sm:hover:bg-[#341F1D] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-6 flex items-center justify-center gap-2.5 transition-all shadow-md sm:hover:shadow-lg active:scale-98 cursor-pointer"
                >
                  <span>Tiến hành đặt hàng ({selectedCount})</span>
                  <i className="ph-bold ph-arrow-right text-base"></i>
                </button>

                {selectedItems.length === 0 && (
                  <p className="text-xs text-amber-700 text-center mt-2.5 font-medium">
                    Vui lòng tích chọn ít nhất 1 ngọn nến để thanh toán
                  </p>
                )}

                {/* Secure Badge */}
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
                  <i className="ph-fill ph-shield-check text-emerald-600 text-sm"></i>
                  <span>Thanh toán an toàn & bảo mật tuyệt đối</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {editingVariantItem && editingVariantProduct && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-5">
          <button type="button" aria-label="Đóng bảng chọn phân loại" onClick={() => setEditingVariantKey('')} className="absolute inset-0 bg-stone-950/45 backdrop-blur-xs cursor-default" />
          <div className="relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="flex items-start gap-3 border-b border-stone-100 p-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                {draftSkuImage ? <img src={getImageUrl(draftSkuImage)} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-stone-300"><i className="ph ph-image text-2xl" /></span>}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate font-serif-display text-base font-bold text-stone-900">{editingVariantProduct.name}</p>
                <p className="mt-1 text-lg font-extrabold text-brand-terracotta">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(draftSkuPrice)}</p>
                <p className="mt-0.5 truncate text-[10px] text-stone-500">Đã chọn: <strong className="text-stone-700">{draftSku ? getVariantLabel(editingVariantProduct, draftSku.id) : 'Chưa đủ phân loại'}</strong></p>
              </div>
              <button type="button" onClick={() => setEditingVariantKey('')} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 cursor-pointer"><i className="ph-bold ph-x text-sm" /></button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-4">
              {(editingVariantProduct.variant_groups || []).map(group => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">{group.name}</span>
                    <span className="truncate text-[10px] text-stone-400">Đang chọn: <strong className="text-stone-600">{(group.options || []).find(option => String(option.id) === String(variantDraft[group.id]))?.label || 'Chưa chọn'}</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(group.options || []).map(option => {
                      const selected = String(variantDraft[group.id]) === String(option.id);
                      const unavailable = isDraftOptionUnavailable(editingVariantProduct, group.id, option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setVariantDraft(prev => ({ ...prev, [group.id]: option.id }))}
                          disabled={unavailable}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${unavailable
                            ? 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-300 line-through opacity-70'
                            : selected
                              ? 'border-2 border-brand-burgundy bg-brand-burgundy text-white shadow-xs'
                              : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                          }`}
                        >
                          {unavailable ? <i className="ph-bold ph-prohibit text-xs" /> : selected ? <i className="ph-bold ph-check text-xs" /> : null}
                          {option.label}
                          {unavailable && <span className="text-[8px] font-bold uppercase">Hết</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {variantError && <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">{variantError}</p>}
            </div>

            <div className="flex gap-2.5 border-t border-stone-100 bg-white p-3.5 pb-[calc(.875rem+env(safe-area-inset-bottom,0px))] sm:p-4">
              <button type="button" onClick={() => setEditingVariantKey('')} className="w-[32%] rounded-xl border border-stone-200 py-3 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer">Hủy</button>
              <button type="button" onClick={() => saveVariantChange(editingVariantItem)} disabled={changingVariant || !draftSku} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-burgundy py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-deepWine disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                {changingVariant && <i className="ph-bold ph-spinner animate-spin" />}
                Cập nhật phân loại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SHOPEE-STYLE MOBILE STICKY BOTTOM CHECKOUT BAR            */}
      {/* Ghim cố định sát mép đáy màn hình chuẩn Shopee            */}
      {/* ======================================================== */}
      {hasItems && (
        <aside
          className="fixed bottom-0 left-0 right-0 z-50 flex min-h-16 items-stretch border-t border-stone-200/90 bg-white shadow-[0_-4px_25px_rgba(0,0,0,0.12)] lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Cột trái: Checkbox chọn tất cả & Nút Xóa nhanh */}
          <div className="flex shrink-0 items-center gap-2 border-r border-stone-100 pl-4 pr-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-stone-300 text-brand-burgundy focus:ring-brand-burgundy accent-brand-burgundy cursor-pointer"
                checked={isAllSelected}
                onChange={toggleSelectAll}
              />
              <span className="text-xs font-semibold text-stone-700">Tất cả</span>
            </label>
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isDeletingMultiple}
                className="text-[11px] text-stone-400 sm:hover:text-red-600 underline cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Cột giữa: Tổng tiền thanh toán */}
          <div className="flex min-w-0 flex-1 flex-col items-end justify-center px-3 py-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-stone-600 font-medium">Tổng:</span>
              <span className="font-bold text-sm sm:text-base text-[#B45309] truncate">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTotal)}
              </span>
            </div>
            <div className="text-[10px] text-stone-400 leading-none truncate">
              {selectedItems.length === 0 ? (
                'Chưa chọn nến'
              ) : isFreeshipEligible ? (
                <span className="text-emerald-600 font-medium">Freeship toàn quốc</span>
              ) : (
                <span>Còn {(freeshipRemaining / 1000).toFixed(0)}k để freeship</span>
              )}
            </div>
          </div>

          {/* Cột phải: Nút Mua Hàng chuẩn Shopee */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={selectedItems.length === 0}
            className="flex w-32 shrink-0 cursor-pointer items-center justify-center gap-1 bg-gradient-to-r from-[#94432C] to-brand-burgundy px-2 text-xs font-bold uppercase tracking-wider text-white shadow-inner transition-all active:from-[#7D3824] active:to-[#38201F] disabled:cursor-not-allowed disabled:from-stone-300 disabled:to-stone-300 disabled:text-stone-400 sm:w-36 sm:text-sm"
          >
            <span>Mua Hàng</span>
            {selectedCount > 0 && (
              <span>({selectedCount})</span>
            )}
          </button>
        </aside>
      )}

    </main>
  );
}
