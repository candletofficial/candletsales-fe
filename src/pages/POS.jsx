import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { fundService } from '../services/fundService';
import { couponService } from '../services/couponService';
import { printInvoice } from '../utils/printInvoice';

const formatPrice = (n) =>
  Math.round(n ?? 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export default function POS() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Cart & Order State
  const [cartItems, setCartItems] = useState([]);
  const [posMode, setPosMode] = useState('offline'); // 'offline' | 'online'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer'
  const [logisticsCost, setLogisticsCost] = useState(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Discount States
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState({ code: null, amount: 0 });
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await couponService.getCoupons();
      const valid = res.data.data.filter(c => c.is_active && new Date() <= new Date(c.end_date) && c.used_count < c.quantity);
      setAvailableCoupons(valid);
    } catch (error) {
      console.error('Failed to load coupons', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productService.getProducts();
      // Lọc các sản phẩm không bị khóa
      setProducts(res.data.data.filter(p => !p.isDisabled));
    } catch (error) {
      showToast('Lỗi tải sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const term = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || p.productId?.toLowerCase().includes(term));
  }, [products, search]);

  const handleProductClick = (product) => {
    if (product.skus && product.skus.length > 0) {
      setSelectedProduct(product);
    } else {
      addToCart(product, null);
    }
  };

  const addToCart = (product, sku) => {
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

    setCartItems(prev => {
      const existingIdx = prev.findIndex(i => i.product_id === product._id && (sku ? i.sku_id === sku.id : !i.sku_id));
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx].quantity += 1;
        return newArr;
      }
      return [...prev, {
        product_id: product._id,
        productId: product.productId,
        product_name: product.name,
        product_image: product.image || null,
        sku_id: sku ? sku.id : null,
        sku_label,
        unit_price,
        unit_cost,
        quantity: 1,
      }];
    });
    setSelectedProduct(null);
  };

  const updateQty = (index, delta) => {
    setCartItems(prev => {
      const newArr = [...prev];
      const newQty = newArr[index].quantity + delta;
      if (newQty <= 0) {
        return newArr.filter((_, i) => i !== index);
      }
      newArr[index].quantity = newQty;
      return newArr;
    });
    setAppliedDiscount({ code: null, amount: 0 }); // Reset discount
  };

  const removeItem = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
    setAppliedDiscount({ code: null, amount: 0 }); // Reset discount
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setLogisticsCost(0);
    setNote('');
    setDiscountCodeInput('');
    setAppliedDiscount({ code: null, amount: 0 });
  };

  const baseTotalPrice = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const finalPrice = Math.max(0, baseTotalPrice + (posMode === 'online' ? logisticsCost : 0) - appliedDiscount.amount);

  const handleApplyCoupon = async () => {
    if (!discountCodeInput.trim()) {
      setAppliedDiscount({ code: null, amount: 0 });
      setCouponError('');
      return;
    }
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await couponService.validateCoupon(discountCodeInput, cartItems, baseTotalPrice);
      const data = res.data.data;
      setAppliedDiscount({ code: data.code, amount: data.discount_amount });
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setAppliedDiscount({ code: null, amount: 0 });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return showToast('Giỏ hàng trống!', 'error');
    if (posMode === 'online') {
      if (!customerName || !customerPhone || !customerAddress) {
        return showToast('Vui lòng điền đủ thông tin khách hàng (Tên, SĐT, Địa chỉ)', 'error');
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: cartItems,
        total_price: finalPrice,
        source: 'pos',
        pos_mode: posMode,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        logistics_cost: posMode === 'online' ? logisticsCost : 0,
        discount_code: appliedDiscount.code,
        discount_amount: appliedDiscount.amount,
        note: note,
      };
      
      const res = await orderService.createOrder(payload);
      showToast('Thanh toán thành công!');
      
      // Auto print bill
      printInvoice(res.data.data);
      
      clearCart();
    } catch (error) {
      showToast(error.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageContent = (
    <>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-[70] animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {/* Sku Selection Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[90vw] max-w-[400px] p-6 animate-[fadeIn_0.15s_ease]">
            <h3 className="text-lg font-bold text-on-surface mb-4">Chọn phân loại cho {selectedProduct.name}</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {selectedProduct.skus.map(sku => {
                const skuLabel = sku.combination?.map(optId => {
                  for (const g of selectedProduct.variant_groups || []) {
                    const opt = g.options.find(o => o.id === optId);
                    if (opt) return opt.label;
                  }
                  return optId;
                }).join(' - ') || 'Mặc định';
                return (
                  <button
                    key={sku.id}
                    onClick={() => addToCart(selectedProduct, sku)}
                    className="w-full flex items-center justify-between gap-3 p-3 border border-outline-variant/50 rounded-xl hover:bg-primary-container/20 transition-colors text-left"
                  >
                    <span className="font-semibold text-[14px] text-on-surface flex-1">{skuLabel}</span>
                    <span className="font-bold text-primary whitespace-nowrap">{formatPrice(sku.price || selectedProduct.base_price)}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSelectedProduct(null)} className="w-full mt-5 py-2.5 bg-surface-container hover:bg-surface-container-high rounded-lg font-bold text-on-surface-variant transition-colors">Đóng</button>
          </div>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-6 ${isFullScreen ? 'h-screen p-4 bg-surface-container-lowest w-full' : 'h-[calc(100vh-80px)] -mt-2'}`}>
        {/* Left Side: Products */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Tìm sản phẩm (tên, mã)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square bg-surface-container-high rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                <span className="material-symbols-outlined text-[48px] mb-2">inventory_2</span>
                <p>Không tìm thấy sản phẩm</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div 
                    key={product._id} 
                    onClick={() => handleProductClick(product)}
                    className="bg-white border border-outline-variant/30 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group flex flex-col"
                  >
                    <div className="aspect-square bg-surface-container-low flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30">image</span>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <p className="font-bold text-[13px] text-on-surface line-clamp-2 leading-snug">{product.name}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-bold text-primary text-[14px]">{formatPrice(product.base_price)}</span>
                        {product.skus && product.skus.length > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Nhiều loại</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/30 bg-primary-container/30 flex items-center justify-between">
            <h2 className="font-bold text-[16px] text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              Đơn hàng POS
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsFullScreen(!isFullScreen)} 
                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-black/5 rounded-lg transition-colors"
                title={isFullScreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
              {cartItems.length > 0 && (
                <button onClick={clearCart} className="text-[13px] text-error hover:bg-error/10 px-2 py-1 rounded font-semibold transition-colors">
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/50">
                <span className="material-symbols-outlined text-[48px] mb-2">shopping_basket</span>
                <p>Giỏ hàng trống</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 bg-white p-3 rounded-xl border border-outline-variant/50 shadow-sm relative pr-8">
                    <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-on-surface-variant opacity-50 hover:opacity-100 hover:text-error transition-all">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded border border-outline-variant/30 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-surface-container flex-shrink-0 flex items-center justify-center font-bold text-on-surface-variant">
                        {item.product_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] text-on-surface leading-tight mb-0.5 pr-4 truncate">{item.product_name}</p>
                      {item.sku_label && <p className="text-[11px] text-on-surface-variant">{item.sku_label}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary text-[14px]">{formatPrice(item.unit_price)}</span>
                        <div className="flex items-center bg-surface-container rounded-lg border border-outline-variant/50 overflow-hidden">
                          <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">remove</span>
                          </button>
                          <span className="w-8 text-center text-[13px] font-bold">{item.quantity}</span>
                          <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex flex-col gap-3">
            {/* Payment & Mode */}
            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-outline-variant/50">
              <button 
                onClick={() => setPosMode('offline')}
                className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all ${posMode === 'offline' ? 'bg-primary text-white shadow' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                Offline
              </button>
              <button 
                onClick={() => setPosMode('online')}
                className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all ${posMode === 'online' ? 'bg-primary text-white shadow' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                Online
              </button>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-outline-variant/50">
              <button 
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[13px] font-bold rounded-lg transition-all ${paymentMethod === 'cash' ? 'bg-[#059669] text-white shadow' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                Tiền mặt
              </button>
              <button 
                onClick={() => setPaymentMethod('transfer')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[13px] font-bold rounded-lg transition-all ${paymentMethod === 'transfer' ? 'bg-[#0284c7] text-white shadow' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                Chuyển khoản
              </button>
            </div>

            {/* Customer Info for Online Mode */}
            {posMode === 'online' && (
              <div className="space-y-2 bg-white p-3 rounded-xl border border-outline-variant/50">
                <input 
                  type="text" 
                  placeholder="Tên khách hàng *" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Số điện thoại *" 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Địa chỉ giao hàng *" 
                  value={customerAddress} 
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-on-surface-variant font-bold whitespace-nowrap">Phí ship:</span>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0" 
                    value={logisticsCost} 
                    onChange={e => setLogisticsCost(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Discount Code */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <select
                  value={discountCodeInput}
                  onChange={e => { setDiscountCodeInput(e.target.value); setCouponError(''); }}
                  className="flex-1 min-w-0 border border-outline-variant/50 rounded-lg px-3 py-2 text-[13px] focus:border-primary focus:ring-1 focus:ring-primary bg-white truncate"
                >
                  <option value="">-- Chọn mã ưu đãi --</option>
                  {availableCoupons.map(c => (
                    <option key={c._id} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={handleApplyCoupon} 
                  disabled={validatingCoupon || cartItems.length === 0 || !discountCodeInput}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-[13px] font-bold disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                >
                  {validatingCoupon ? 'Đang ktra...' : 'Áp dụng'}
                </button>
              </div>
              {couponError && <p className="text-error text-[12px] font-medium ml-1">{couponError}</p>}
            </div>

            <input 
              type="text" 
              placeholder="Ghi chú đơn hàng..." 
              value={note} 
              onChange={e => setNote(e.target.value)}
              className="w-full bg-white border border-outline-variant/50 rounded-xl px-4 py-2.5 text-[13px] focus:border-primary focus:outline-none"
            />

            <div className="flex flex-col gap-1 pt-2">
              <div className="flex items-end justify-between">
                <span className="text-[13px] text-on-surface-variant font-bold">Tổng tiền hàng:</span>
                <span className="text-[14px] font-bold text-on-surface font-mono">{formatPrice(baseTotalPrice)}</span>
              </div>
              {posMode === 'online' && logisticsCost > 0 && (
                <div className="flex items-end justify-between">
                  <span className="text-[13px] text-on-surface-variant font-bold">Phí ship:</span>
                  <span className="text-[14px] font-bold text-on-surface font-mono">+ {formatPrice(logisticsCost)}</span>
                </div>
              )}
              {appliedDiscount.amount > 0 && (
                <div className="flex items-end justify-between text-[#059669]">
                  <span className="text-[13px] font-bold">Giảm giá ({appliedDiscount.code}):</span>
                  <span className="text-[14px] font-bold font-mono">- {formatPrice(appliedDiscount.amount)}</span>
                </div>
              )}
              <div className="flex items-end justify-between mt-2 pt-2 border-t border-outline-variant/30">
                <span className="text-[14px] font-bold text-on-surface-variant">Thanh toán:</span>
                <span className="text-[24px] font-bold text-primary font-mono">{formatPrice(finalPrice)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full mt-2 bg-primary text-white font-bold text-[16px] py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-md"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Hoàn tất đơn ({cartItems.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return isFullScreen ? (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest overflow-hidden flex flex-col">
      {pageContent}
    </div>
  ) : (
    <Layout>
      {pageContent}
    </Layout>
  );
}
