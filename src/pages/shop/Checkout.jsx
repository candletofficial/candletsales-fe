import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { shopService } from '../../services/shopService';
import { useAuth } from '../../hooks/useAuth';
import AddressSelector from '../../components/shop/AddressSelector';
import { locationService } from '../../services/locationService';
import { authService } from '../../services/authService';
import { getImageUrl } from '../../utils/imageUtils';
import { calculateShippingDiscount, shippingDiscountValue, shippingDiscountConditions } from '../../utils/couponUtils';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkoutItems] = useState(() => {
    if (location.state?.selectedItems && location.state.selectedItems.length > 0) {
      try {
        sessionStorage.setItem('checkout_items', JSON.stringify(location.state.selectedItems));
      } catch (e) {
        console.warn('Không thể lưu checkout items vào sessionStorage', e);
      }
      return location.state.selectedItems;
    }
    try {
      const saved = sessionStorage.getItem('checkout_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isMobileItemsCollapsed, setIsMobileItemsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null); // Stores created order on success
  const { user, updateUser } = useAuth();
  
  // Khôi phục thông tin nhận hàng từ sessionStorage nếu có (tránh mất khi F5)
  const [formData, setFormData] = useState(() => {
    let saved = {};
    try {
      const raw = sessionStorage.getItem('checkout_delivery_info');
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    return {
      customer_name: saved.customer_name || user?.name || '',
      customer_phone: saved.customer_phone || user?.phone || '',
      customer_address: saved.customer_address || user?.address || '',
      shippingMethod: saved.shippingMethod || 'standard',
      payment_method: saved.payment_method || 'cash',
      is_gift: saved.is_gift || false,
      gift_message: saved.gift_message || '',
      note: saved.note || ''
    };
  });

  const [saveAsDefaultAddress, setSaveAsDefaultAddress] = useState(true);

  // Tự động lưu thông tin form vào sessionStorage để không bị mất khi refresh
  useEffect(() => {
    try {
      sessionStorage.setItem('checkout_delivery_info', JSON.stringify({
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        shippingMethod: formData.shippingMethod,
        payment_method: formData.payment_method,
        is_gift: formData.is_gift,
        gift_message: formData.gift_message,
        note: formData.note
      }));
    } catch (e) {}
  }, [formData]);

  // Xử lý khi xác nhận địa chỉ từ modal
  const handleCheckoutAddressConfirm = async (data) => {
    const newAddr = data?.fullAddress || '';
    if (!newAddr) return;

    setFormData(prev => ({ ...prev, customer_address: newAddr }));

    // Tự động lưu vào tài khoản nếu đã đăng nhập và được tích chọn
    if (user && saveAsDefaultAddress) {
      try {
        const res = await authService.updateProfile({
          name: formData.customer_name || user.name || 'Khách hàng',
          phone: formData.customer_phone || user.phone || '',
          address: newAddr
        });
        if (res.data?.success) {
          updateUser(res.data.data);
        }
      } catch (err) {
        console.warn('Không thể đồng bộ địa chỉ mặc định:', err);
      }
    }
  };

  const [activeCoupons, setActiveCoupons] = useState([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [customCouponCode, setCustomCouponCode] = useState('');
  const [validatingCustom, setValidatingCustom] = useState(false);
  const [customError, setCustomError] = useState('');

  // Phí ship động từ SystemConfig
  const [shippingConfig, setShippingConfig] = useState({
    expressFee: 15000,
    standardThreshold: 100000,
    standardFeeBelow: 16000,
  });

  // Shop Location & Express Distance Config
  const [shopConfig, setShopConfig] = useState({
    address: 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Thành phố Hà Nội',
    coords: { lat: 21.0298, lng: 105.7913 },
    maxDistance: 20,
    baseFee: 15000,
    perKmFee: 5000,
  });

  // State khoảng cách và cước phí hỏa tốc thực tế
  const [addressDetails, setAddressDetails] = useState({
    province: null,
    district: null,
    ward: null,
    street: '',
    fullAddress: '',
    generalAddress: '',
    isValid: false
  });
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [expressFeeResult, setExpressFeeResult] = useState(null);

  useEffect(() => {
    const initData = async () => {
      if (!checkoutItems || checkoutItems.length === 0) {
        navigate('/cart');
        return;
      }
      
      try {
        const [
          resCoupons,
          resExpressFee,
          resThreshold,
          resFeeBelow,
          resShopAddress,
          resShopCoords,
          resMaxDist,
          resBaseFee,
          resPerKmFee,
          resGoongKey,
        ] = await Promise.allSettled([
          shopService.getActiveCoupons(user?._id),
          api.get('/system-configs/express_shipping_fee'),
          api.get('/system-configs/standard_shipping_threshold'),
          api.get('/system-configs/standard_shipping_fee_below'),
          api.get('/system-configs/shop_address'),
          api.get('/system-configs/shop_coordinates'),
          api.get('/system-configs/express_max_distance'),
          api.get('/system-configs/express_base_fee'),
          api.get('/system-configs/express_per_km_fee'),
          api.get('/system-configs/goong_api_key'),
        ]);

        if (resGoongKey.status === 'fulfilled' && resGoongKey.value.data?.data?.value) {
          locationService.setGoongApiKey(resGoongKey.value.data.data.value);
        }

        if (resCoupons.status === 'fulfilled') {
          const res = resCoupons.value;
          if (res && res.data) setActiveCoupons(res.data);
          else if (Array.isArray(res)) setActiveCoupons(res);
        }

        setShippingConfig({
          expressFee: resExpressFee.status === 'fulfilled' && resExpressFee.value.data?.data?.value && resExpressFee.value.data.data.value !== false
            ? Number(resExpressFee.value.data.data.value)
            : 15000,
          standardThreshold: resThreshold.status === 'fulfilled' && resThreshold.value.data?.data?.value && resThreshold.value.data.data.value !== false
            ? Number(resThreshold.value.data.data.value)
            : 100000,
          standardFeeBelow: resFeeBelow.status === 'fulfilled' && resFeeBelow.value.data?.data?.value && resFeeBelow.value.data.data.value !== false
            ? Number(resFeeBelow.value.data.data.value)
            : 16000,
        });

        // Parse shop coordinates & rules
        let parsedCoords = { lat: 21.0298, lng: 105.7913 };
        if (resShopCoords.status === 'fulfilled' && resShopCoords.value.data?.data?.value) {
          try {
            const val = resShopCoords.value.data.data.value;
            const parsed = typeof val === 'string' ? JSON.parse(val) : val;
            if (parsed && parsed.lat && parsed.lng) parsedCoords = parsed;
          } catch (e) {}
        }

        setShopConfig({
          address: resShopAddress.status === 'fulfilled' && resShopAddress.value.data?.data?.value
            ? resShopAddress.value.data.data.value
            : 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Thành phố Hà Nội',
          coords: parsedCoords,
          maxDistance: resMaxDist.status === 'fulfilled' && resMaxDist.value.data?.data?.value !== undefined && resMaxDist.value.data.data.value !== false
            ? Number(resMaxDist.value.data.data.value)
            : 20,
          baseFee: resBaseFee.status === 'fulfilled' && resBaseFee.value.data?.data?.value !== undefined && resBaseFee.value.data.data.value !== false
            ? Number(resBaseFee.value.data.data.value)
            : 15000,
          perKmFee: resPerKmFee.status === 'fulfilled' && resPerKmFee.value.data?.data?.value !== undefined && resPerKmFee.value.data.data.value !== false
            ? Number(resPerKmFee.value.data.data.value)
            : 5000,
        });
      } catch (error) {
        console.error("Lỗi tải dữ liệu checkout:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [checkoutItems, user?._id, navigate]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customer_name: user.name || prev.customer_name,
        customer_phone: user.phone || prev.customer_phone,
        customer_address: user.address || prev.customer_address,
      }));
    }
  }, [user]);

  const calculateItemPrice = (item) => {
    const product = item.product_id;
    if (!product) return 0;
    if (item.sku_id && product.skus) {
      const sku = product.skus.find(s => s.id === item.sku_id);
      if (sku && sku.price > 0) return sku.price;
    }
    return product.base_price || 0;
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

  const calculateSubtotal = () => {
    return checkoutItems.reduce((total, item) => {
      return total + (calculateItemPrice(item) * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();

  // Tự động tính toán khoảng cách và cước hỏa tốc khi địa chỉ thay đổi
  useEffect(() => {
    if (!addressDetails.isValid && !addressDetails.generalAddress) {
      setExpressFeeResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCalculatingDistance(true);
      try {
        // Ưu tiên dùng tọa độ trực tiếp nếu khách chọn từ gợi ý Google Maps
        let custCoords = addressDetails.coords;
        if (!custCoords?.lat || !custCoords?.lng) {
          custCoords = await locationService.geocodeAddress(
            addressDetails.fullAddress,
            addressDetails.generalAddress
          );
        }

        if (custCoords && custCoords.lat && custCoords.lng) {
          const distanceInfo = await locationService.calculateDistance(shopConfig.coords, custCoords);
          const result = locationService.calculateExpressFee(distanceInfo, {
            maxDistance: shopConfig.maxDistance,
            baseFee: shopConfig.baseFee,
            perKmFee: shopConfig.perKmFee
          });
          setExpressFeeResult(result);

          // Nếu khoảng cách vượt quá 20km và khách đang chọn express -> đổi sang standard
          if (!result.eligible && formData.shippingMethod === 'express') {
            setFormData(prev => ({ ...prev, shippingMethod: 'standard' }));
          }
        } else {
          setExpressFeeResult({
            eligible: false,
            distanceKm: null,
            message: 'Không tìm thấy tọa độ chính xác cho địa chỉ đã chọn.'
          });
        }
      } catch (err) {
        console.warn('Lỗi tính khoảng cách hỏa tốc:', err);
      } finally {
        setCalculatingDistance(false);
      }
    }, addressDetails.coords ? 50 : 600);

    return () => clearTimeout(timer);
  }, [addressDetails, shopConfig]);

  // Phí ship dựa trên cấu hình từ admin và khoảng cách thực tế
  const FREESHIP_THRESHOLD = shippingConfig.standardThreshold;
  const isFreeshipEligible = subtotal >= FREESHIP_THRESHOLD;
  const standardShippingFee = isFreeshipEligible ? 0 : shippingConfig.standardFeeBelow;
  
  // Cước hỏa tốc tính theo km thực tế nếu khả dụng
  const expressShippingFee = expressFeeResult?.eligible
    ? expressFeeResult.fee
    : (shopConfig.baseFee || 15000);

  const shippingFee = formData.shippingMethod === 'express' ? expressShippingFee : standardShippingFee;
  const freeshipRemaining = Math.max(0, FREESHIP_THRESHOLD - subtotal);
  const calculateDiscountForCoupon = (coupon) => {
    if (!coupon || coupon.is_eligible === false) return 0;
    let discount = 0;
    let applicableSubtotal = 0;
    
    checkoutItems.forEach(item => {
      const product = item.product_id;
      const isApplicable = coupon.applicable_products === 'all' || 
        (coupon.applicable_products === 'specific' && coupon.product_ids?.includes(product._id));
        
      if (isApplicable) {
        applicableSubtotal += calculateItemPrice(item) * item.quantity;
      }
    });

    if (applicableSubtotal > 0) {
      if (coupon.type === 'freeship') {
        discount = calculateShippingDiscount(coupon, shippingFee, subtotal);
      } else if (coupon.type === 'percent') {
        discount = (applicableSubtotal * coupon.value) / 100;
        if (coupon.max_discount && discount > coupon.max_discount) {
          discount = coupon.max_discount;
        }
      } else if (coupon.type === 'fixed') {
        discount = coupon.value;
        if (discount > applicableSubtotal) {
          discount = applicableSubtotal;
        }
      }
    }
    return discount;
  };

  // Tự động chọn coupon tốt nhất
  useEffect(() => {
    if (activeCoupons.length > 0 && !selectedCouponCode) {
      let best = null;
      let maxDiscount = 0;

      activeCoupons.forEach(coupon => {
        if (coupon.is_eligible === false) return;
        const discount = calculateDiscountForCoupon(coupon);
        if (discount > maxDiscount) {
          maxDiscount = discount;
          best = coupon;
        }
      });

      if (best) {
        setSelectedCouponCode(best.code);
      }
    }
  }, [activeCoupons, checkoutItems, shippingFee]);

  // Derive synchronously so a shipping/address change cannot submit a stale discount.
  const selectedCoupon = activeCoupons.find(c => c.code === selectedCouponCode);
  const discountAmount = calculateDiscountForCoupon(selectedCoupon);
  const isFreeshipCoupon = selectedCoupon?.type === 'freeship' && discountAmount > 0;

  const handleApplyCustomCoupon = async () => {
    if (!customCouponCode.trim()) return;
    try {
      setValidatingCustom(true);
      setCustomError('');
      const res = await shopService.validateCoupon(customCouponCode.trim(), user?._id);
      if (res.success && res.data) {
        const potentialDiscount = calculateDiscountForCoupon(res.data);
        if (potentialDiscount === 0) {
          setCustomError(res.data.type === 'freeship' && subtotal < Number(res.data.min_order_value || 0)
            ? `Chưa đủ điều kiện: ${shippingDiscountConditions(res.data)} (chưa gồm phí vận chuyển).`
            : res.data.type === 'freeship' && shippingFee === 0
            ? 'Đơn hàng đã được miễn phí vận chuyển.'
            : 'Mã này không áp dụng được cho sản phẩm trong giỏ.');
          return;
        }

        setActiveCoupons(prev => {
          if (!prev.find(c => c.code === res.data.code)) {
            return [res.data, ...prev];
          }
          return prev;
        });
        
        setSelectedCouponCode(res.data.code);
        setCustomCouponCode('');
        setShowCouponModal(false);
      }
    } catch (err) {
      setCustomError(err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết lượt');
    } finally {
      setValidatingCustom(false);
    }
  };

  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim() || !formData.customer_phone.trim() || !formData.customer_address.trim()) {
      alert('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.');
      return;
    }

    try {
      setSubmitting(true);
      
      const orderItems = checkoutItems.map(item => {
        const product = item.product_id;
        const sku = product.skus?.find(s => s.id === item.sku_id);
        const skuLabel = sku ? getVariantLabel(product, item.sku_id) : '';

        return {
          product_id: product._id,
          productId: product.productId,
          product_name: product.name,
          product_image: product.image,
          sku_id: item.sku_id,
          sku_label: skuLabel,
          unit_price: calculateItemPrice(item),
          quantity: item.quantity
        };
      });

      const payload = {
        items: orderItems,
        total_price: finalTotal,
        shipping_fee: shippingFee,
        source: 'website',
        delivery_status: 'pending',
        status: 'pending',
        user_id: user?._id || user?.id || null,
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim(),
        customer_address: formData.customer_address.trim(),
        note: formData.note.trim(),
        payment_method: formData.payment_method,
        shippingMethod: formData.shippingMethod,
        discount_code: discountAmount > 0 ? selectedCouponCode : null,
        discount_amount: discountAmount || 0
      };

      const res = await api.post('/shop/checkout', payload);
      
      if (res.data.success) {
        // Xoá sản phẩm đã thanh toán khỏi giỏ hàng nếu có
        try {
          const removePayload = checkoutItems.map(i => ({
            product_id: i.product_id._id || i.product_id,
            sku_id: i.sku_id
          }));
          await cartService.removeMultipleItems(removePayload);
        } catch (cartErr) {
          console.warn('Lỗi dọn giỏ hàng sau khi đặt hàng:', cartErr);
        }

        // Đồng bộ địa chỉ vào tài khoản nếu user đã chọn lưu làm mặc định
        if (user && saveAsDefaultAddress && formData.customer_address && formData.customer_address !== user.address) {
          try {
            const syncRes = await authService.updateProfile({
              name: formData.customer_name.trim() || user.name,
              phone: formData.customer_phone.trim() || user.phone,
              address: formData.customer_address.trim()
            });
            if (syncRes.data?.success) updateUser(syncRes.data.data);
          } catch (syncErr) {
            console.warn('Lỗi đồng bộ địa chỉ tài khoản:', syncErr);
          }
        }

        try {
          sessionStorage.removeItem('checkout_items');
          sessionStorage.removeItem('checkout_delivery_info');
        } catch (e) {
          // ignore
        }

        // Chuyển hướng sang trang Hoàn tất đơn hàng chuyên biệt
        const destination = formData.payment_method === 'transfer'
          ? `/payment/${res.data.data.orderId}`
          : `/order-success/${res.data.data.orderId}`;
        navigate(destination, {
          state: { order: res.data.data }, 
          replace: true 
        });
      }
    } catch (error) {
      console.error('Lỗi khi đặt hàng', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[65vh] bg-[#fbf9f6]">
        <div className="w-12 h-12 border-3 border-[#4A2C2A]/20 border-t-[#4A2C2A] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-serif-display text-stone-600 tracking-wider">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  /* ORDER SUCCESS VIEW */
  if (orderSuccess) {
    return (
      <div className="bg-[#fbf9f6] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-md border border-stone-200/90 overflow-hidden p-8 sm:p-12 text-center animate-[modalIn_0.3s_ease-out]">
          
          {/* Success Badge */}
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <i className="ph-bold ph-check text-4xl"></i>
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
            Đặt Hàng Thành Công
          </span>

          <h1 className="text-3xl sm:text-4xl font-serif-display font-bold text-[#4A2C2A] mt-4 mb-2">
            Cảm Ơn Bạn Đã Tin Chọn Candlet
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mb-8 max-w-md mx-auto leading-relaxed">
            Ngọn nến của bạn đang được các nghệ nhân chuẩn bị và đóng gói thủ công với tất cả sự nâng niu.
          </p>

          {/* Order Details Card */}
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 text-left space-y-3.5 mb-8 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200">
              <span className="text-stone-500 font-medium">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-stone-900 text-base">#{orderSuccess.orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Người nhận:</span>
              <span className="font-bold text-stone-900">{formData.customer_name} ({formData.customer_phone})</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-stone-500 font-medium shrink-0">Địa chỉ giao:</span>
              <span className="font-medium text-stone-900 text-right">{formData.customer_address}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Phương thức:</span>
              <span className="font-bold text-stone-900">
                {formData.payment_method === 'cash' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng (VietQR)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Vận chuyển:</span>
              <span className="font-bold text-stone-900">
                {formData.shippingMethod === 'express' 
                  ? 'Giao Hỏa Tốc (+30.000đ)' 
                  : (shippingFee === 0 ? 'Giao Tiêu Chuẩn (Miễn Phí)' : 'Giao Tiêu Chuẩn (+16.000đ)')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-stone-200">
              <span className="text-sm font-bold uppercase tracking-wider text-stone-700">Tổng thanh toán:</span>
              <span className="text-xl font-bold font-serif-display text-[#4A2C2A]">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalTotal)}
              </span>
            </div>
          </div>

          {/* If bank transfer, display QR instructions */}
          {formData.payment_method === 'transfer' && (
            <div className="bg-[#FAF5EE] border border-amber-200 rounded-2xl p-6 mb-8 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C4A32] uppercase tracking-wider">
                <i className="ph-bold ph-qr-code text-base"></i>
                Quét mã VietQR để thanh toán nhanh
              </div>
              <div className="flex justify-center my-3">
                <img 
                  src={`https://api.vietqr.io/image/970422-19037042856018-compact2.jpg?amount=${finalTotal}&addInfo=${orderSuccess.orderId}&accountName=CANDLET`} 
                  alt="VietQR" 
                  className="w-48 h-auto rounded-xl border border-stone-200 shadow-sm"
                />
              </div>
              <p className="text-xs text-stone-600">
                Nội dung chuyển khoản: <strong className="font-mono text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">{orderSuccess.orderId}</strong>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/shop" 
              className="w-full sm:w-auto inline-flex bg-[#4A2C2A] hover:bg-[#341F1D] text-white text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-8 items-center justify-center gap-2 transition-all shadow-md active:scale-98"
            >
              <i className="ph-bold ph-storefront text-base"></i>
              Tiếp tục mua sắm
            </Link>
            <Link 
              to="/" 
              className="w-full sm:w-auto inline-flex bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-6 items-center justify-center gap-2 transition-colors"
            >
              Về trang chủ
            </Link>
          </div>

        </div>
      </div>
    );
  }

  /* CHECKOUT FORM VIEW */
  return (
    <div className="bg-[#f5f5f5] sm:bg-[#fbf9f6] min-h-screen py-3 sm:py-10 pb-20 lg:pb-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Mobile Header chuẩn Shopee (Nút quay lại & Tiêu đề) */}
        <div className="sm:hidden flex items-center justify-between pb-3 mb-3 border-b border-stone-200/80">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-700 active:scale-95 shadow-2xs border border-stone-200 cursor-pointer"
            aria-label="Quay lại giỏ hàng"
          >
            <i className="ph-bold ph-arrow-left text-base"></i>
          </button>
          <h1 className="font-serif-display font-bold text-base text-[#4A2C2A]">
            Thanh Toán Đơn Hàng
          </h1>
          <div className="w-8"></div> {/* Cân đối khoảng cách */}
        </div>

        {/* Order Stepper Header (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center justify-center gap-3 sm:gap-6 mb-8 text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-2 text-stone-400">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
              <i className="ph-bold ph-check"></i>
            </span>
            <span>1. Giỏ hàng</span>
          </div>
          <span className="text-stone-300">———</span>
          <div className="flex items-center gap-2 text-[#4A2C2A]">
            <span className="w-6 h-6 rounded-full bg-[#4A2C2A] text-white flex items-center justify-center text-xs">
              2
            </span>
            <span>2. Thông tin & Thanh toán</span>
          </div>
          <span className="text-stone-300">———</span>
          <div className="flex items-center gap-2 text-stone-400">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-xs">
              3
            </span>
            <span>3. Hoàn tất</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 items-start">
          
          {/* CỘT TRÁI: FORM THÔNG TIN GIAO HÀNG & PHƯƠNG THỨC */}
          <div className="flex-1 w-full space-y-4 sm:space-y-6">

            {/* Card 1: Thông tin người nhận - Chuẩn Shopee có dải bì thư bưu chính */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              {/* Dải sọc bì thư bưu chính đặc trưng Shopee */}
              <div 
                className="h-1 sm:h-1.5 w-full"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #f43f5e 0, #f43f5e 12px, transparent 12px, transparent 18px, #3b82f6 18px, #3b82f6 30px, transparent 30px, transparent 36px)'
                }}
              />
              <div className="p-4 sm:p-7 space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <i className="ph-fill ph-map-pin text-base sm:text-lg"></i>
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-stone-900">
                      Địa Chỉ Nhận Hàng
                    </h2>
                    <p className="text-[11px] text-stone-400">Vui lòng cung cấp địa chỉ chính xác để nến được giao an toàn</p>
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Họ và tên người nhận *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={formData.customer_name}
                      onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 pl-10 text-sm bg-white focus:outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 shadow-xs"
                      placeholder="Ví dụ: Hoàng Mai Anh"
                    />
                    <i className="ph-bold ph-user absolute left-3.5 top-3 text-stone-400 text-base"></i>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Số điện thoại *</label>
                  <div className="relative">
                    <input 
                      type="tel" 
                      required
                      value={formData.customer_phone}
                      onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 pl-10 text-sm bg-white focus:outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 shadow-xs"
                      placeholder="Ví dụ: 0912 345 678"
                    />
                    <i className="ph-bold ph-phone absolute left-3.5 top-3 text-stone-400 text-base"></i>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-stone-100">
                  <AddressSelector
                    initialAddress={formData.customer_address}
                    onChange={(data) => {
                      setAddressDetails(data);
                      // Chỉ cập nhật customer_address khi có giá trị thực sự
                      // (tránh overwrite địa chỉ cũ bằng '' trong lúc parse lại)
                      if (data.fullAddress || data.isValid) {
                        setFormData(prev => ({ ...prev, customer_address: data.fullAddress }));
                      }
                    }}
                    onConfirm={handleCheckoutAddressConfirm}
                    showAddressNote={true}
                    required={true}
                  />

                  {/* Tùy chọn lưu làm địa chỉ mặc định (cho người dùng đã đăng nhập) */}
                  {user && (
                    <label className="flex items-center gap-2 mt-2.5 text-xs text-stone-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveAsDefaultAddress}
                        onChange={e => setSaveAsDefaultAddress(e.target.checked)}
                        className="rounded border-stone-300 text-[#4A2C2A] focus:ring-[#4A2C2A] accent-[#4A2C2A]"
                      />
                      <span>Lưu làm địa chỉ nhận hàng mặc định cho các lần mua sau</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* Card 2: Phương thức vận chuyển */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3.5">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-truck text-lg"></i>
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-serif-display font-bold text-stone-900">
                    Phương Thức Vận Chuyển
                  </h2>
                  <p className="text-xs text-stone-400">Đóng gói chuẩn hộp quà chống sốc an toàn tuyệt đối</p>
                </div>
              </div>

              {/* Thông báo điều kiện Freeship thực tế */}
              {isFreeshipEligible ? (
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 sm:p-3.5 flex items-center gap-3 text-xs sm:text-sm text-emerald-900">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <i className="ph-bold ph-check-circle text-base"></i>
                  </div>
                  <div className="flex-1">
                    <strong className="block font-bold">Bạn được Miễn Phí Vận Chuyển Toàn Quốc!</strong>
                    <span className="text-[11px] text-emerald-700/90">Đơn hàng của bạn đạt mốc từ 100.000đ trở lên.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-stone-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-truck text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                        Mua thêm <strong className="text-[#8C4A32] font-bold">{new Intl.NumberFormat('vi-VN').format(freeshipRemaining)}đ</strong> để được <strong className="text-emerald-700 font-bold">Freeship toàn quốc</strong>
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Đơn dưới 100.000đ thu thêm 16.000đ phí giao hàng tiêu chuẩn.
                      </p>
                    </div>
                  </div>
                  <Link 
                    to="/shop" 
                    className="shrink-0 text-xs font-bold text-[#8C4A32] hover:text-[#4A2C2A] bg-white border border-amber-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-amber-50 transition-all flex items-center gap-1"
                  >
                    <span>Chọn thêm</span>
                    <i className="ph-bold ph-arrow-right text-[11px]"></i>
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Standard Shipping */}
                <label 
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.shippingMethod === 'standard'
                      ? 'border-[#4A2C2A] bg-stone-50/70 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="shippingMethod"
                    value="standard"
                    checked={formData.shippingMethod === 'standard'}
                    onChange={() => setFormData({ ...formData, shippingMethod: 'standard' })}
                    className="mt-1 accent-[#4A2C2A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-stone-900">Giao Tiêu Chuẩn</span>
                      {isFreeshipEligible ? (
                        <span className="text-xs font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Miễn Phí
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#8C4A32] bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                          16.000đ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {isFreeshipEligible 
                        ? 'Toàn quốc • 2 - 4 ngày • Miễn phí (đơn từ 100k)' 
                        : 'Toàn quốc • 2 - 4 ngày • Thu thêm 16.000đ (đơn dưới 100k)'}
                    </p>
                  </div>
                </label>

                {/* Express Shipping */}
                <label 
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                    expressFeeResult && !expressFeeResult.eligible
                      ? 'border-stone-200 bg-stone-50/60 opacity-75 cursor-not-allowed'
                      : formData.shippingMethod === 'express'
                      ? 'border-orange-500 bg-gradient-to-r from-orange-50/90 to-amber-50/50 shadow-xs ring-1 ring-orange-400 cursor-pointer'
                      : 'border-stone-200 hover:border-orange-300 cursor-pointer'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="shippingMethod"
                    value="express"
                    disabled={expressFeeResult && !expressFeeResult.eligible}
                    checked={formData.shippingMethod === 'express'}
                    onChange={() => {
                      if (!expressFeeResult || expressFeeResult.eligible) {
                        setFormData({ ...formData, shippingMethod: 'express' });
                      }
                    }}
                    className="mt-1 accent-orange-600 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">Giao Hỏa Tốc 4h</span>
                        <span className="text-[10px] font-extrabold uppercase bg-gradient-to-r from-orange-500 to-amber-600 text-white px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-0.5">
                          <i className="ph-fill ph-lightning"></i>
                          Gấp 4h
                        </span>
                      </div>
                      
                      {calculatingDistance ? (
                        <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                          <i className="ph-bold ph-spinner animate-spin"></i>
                          Đang tính cước...
                        </span>
                      ) : expressFeeResult && !expressFeeResult.eligible ? (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          Không khả dụng
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-orange-800 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-md">
                          {expressShippingFee.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>

                    {/* Giải trình cước và khoảng cách */}
                    {calculatingDistance ? (
                      <p className="text-xs text-stone-400 mt-1">Đang định vị khoảng cách từ shop đến địa chỉ của bạn...</p>
                    ) : expressFeeResult && !expressFeeResult.eligible ? (
                      <p className="text-xs text-rose-600 font-medium mt-1 leading-relaxed">
                        <i className="ph-bold ph-warning-circle mr-1"></i>
                        {expressFeeResult.message}
                      </p>
                    ) : expressFeeResult && expressFeeResult.eligible ? (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1 flex-wrap">
                          <i className="ph-fill ph-navigation-arrow text-emerald-600"></i>
                          <span>Cách shop ~{expressFeeResult.distanceKm} km</span>
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {expressFeeResult.formula}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 mt-1">
                        15.000đ cho 2km đầu tiên + 5.000đ/km tiếp theo (tối đa 20km). Cước chính xác sẽ tính sau khi bạn chọn địa chỉ.
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Card 3: Phương thức thanh toán */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3.5">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-credit-card text-lg"></i>
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-serif-display font-bold text-stone-900">
                    Phương Thức Thanh Toán
                  </h2>
                  <p className="text-xs text-stone-400">Lựa chọn cách thanh toán thuận tiện nhất với bạn</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* COD Option */}
                <label 
                  className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.payment_method === 'cash'
                      ? 'border-[#4A2C2A] bg-stone-50/70 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="payment_method"
                    value="cash"
                    checked={formData.payment_method === 'cash'}
                    onChange={() => setFormData({ ...formData, payment_method: 'cash' })}
                    className="mt-1 accent-[#4A2C2A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900">Thanh toán khi nhận hàng (COD)</span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Phổ biến</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Kiểm tra hũ nến nguyên vẹn trước khi thanh toán tiền mặt cho bưu tá.
                    </p>
                  </div>
                </label>

                {/* Transfer VietQR Option */}
                <label 
                  className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.payment_method === 'transfer'
                      ? 'border-[#4A2C2A] bg-stone-50/70 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="payment_method"
                    value="transfer"
                    checked={formData.payment_method === 'transfer'}
                    onChange={() => setFormData({ ...formData, payment_method: 'transfer' })}
                    className="mt-1 accent-[#4A2C2A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900">Chuyển khoản ngân hàng qua VietQR</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Khuyên dùng</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Quét mã QR tự động điền số tiền và nội dung, bảo mật và chuẩn xác 100%.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 4: Ghi chú đơn hàng */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                <span className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-notepad text-lg"></i>
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-serif-display font-bold text-stone-900">
                    Ghi Chú Đơn Hàng
                  </h2>
                  <p className="text-xs text-stone-400">Yêu cầu giao hàng hoặc lưu ý cho người bán (Tùy chọn)</p>
                </div>
              </div>

              <div>
                <input 
                  type="text" 
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-xs sm:text-sm bg-white focus:outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 shadow-xs"
                  placeholder="Ví dụ: Giao vào giờ hành chính, gọi trước khi giao..."
                />
              </div>
            </div>

          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG, VOUCHER VÀ NÚT ĐẶT HÀNG */}
          <div className="lg:w-[420px] shrink-0 w-full space-y-6">

            {/* Order Review Card - Chuẩn gian hàng Shopee */}
            <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-4 sm:p-7 sticky top-24 space-y-4 sm:space-y-6">
              <div 
                className="pb-3 border-b border-stone-100 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsMobileItemsCollapsed(!isMobileItemsCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                    <i className="ph-fill ph-storefront text-base"></i>
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <span>Candlet Official Store</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">Chính Hãng</span>
                    </h3>
                    <p className="text-[10.5px] text-stone-400">Đơn hàng gồm ({checkoutItems.length}) sản phẩm</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="sm:hidden text-xs text-stone-500 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{isMobileItemsCollapsed ? 'Xem chi tiết' : 'Thu gọn'}</span>
                  <i className={`ph-bold ${isMobileItemsCollapsed ? 'ph-caret-down' : 'ph-caret-up'} text-xs`}></i>
                </button>
              </div>

              {/* Items List in Checkout */}
              {!isMobileItemsCollapsed && (
                <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1.5 custom-scrollbar divide-y divide-stone-100">
                  {checkoutItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center pt-2.5 first:pt-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 relative">
                        {item.product_id?.image ? (
                          <img src={getImageUrl(item.product_id.image)} alt={item.product_id.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <i className="ph ph-image text-xl"></i>
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 bg-[#4A2C2A] text-white text-[9px] font-bold px-1.5 rounded-tl-md font-mono">
                          x{item.quantity}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                          {item.product_id?.name}
                        </h4>
                        {item.sku_id && (
                          <p className="text-[10.5px] text-[#8C4A32] truncate mt-0.5 font-medium">
                            {getVariantLabel(item.product_id, item.sku_id)}
                          </p>
                        )}
                        <p className="text-xs font-bold text-stone-700 mt-0.5">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateItemPrice(item) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* VOUCHER TICKET SECTION */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Phiếu Giảm Giá (Voucher)
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowCouponModal(true)}
                    className="text-xs text-[#8C4A32] font-bold hover:underline flex items-center gap-0.5"
                  >
                    {selectedCouponCode ? 'Đổi mã khác' : 'Chọn mã'}
                    <i className="ph-bold ph-caret-right text-xs"></i>
                  </button>
                </div>

                {selectedCouponCode ? (
                  <div className="bg-[#FAF5EE] border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs relative">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <i className="ph-fill ph-ticket text-lg"></i>
                      </span>
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-[#D97706] tracking-wider block">
                          {selectedCouponCode}
                        </span>
                        <span className="text-xs text-stone-600 block">
                          Đã giảm <strong className="text-[#8C4A32]">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}</strong>
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedCouponCode('')}
                      className="w-7 h-7 rounded-full bg-white hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center transition-colors shadow-xs shrink-0"
                      title="Gỡ mã giảm giá"
                    >
                      <i className="ph-bold ph-x text-sm"></i>
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setShowCouponModal(true)}
                    className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-200 border-dashed rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-stone-600 transition-colors shadow-2xs"
                  >
                    <i className="ph-bold ph-ticket text-base text-[#8C4A32]"></i>
                    Bấm để áp dụng mã giảm giá voucher
                  </button>
                )}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="border-t border-stone-100 pt-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Tạm tính</span>
                  <span className="font-bold text-stone-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between items-start text-stone-600">
                  <div>
                    <span>Phí vận chuyển ({formData.shippingMethod === 'express' ? 'Hỏa tốc' : 'Tiêu chuẩn'})</span>
                    {formData.shippingMethod === 'standard' && !isFreeshipEligible && (
                      <span className="block text-[10px] text-stone-400 font-normal">
                        (Thu thêm 16.000đ do đơn dưới 100k)
                      </span>
                    )}
                    {formData.shippingMethod === 'standard' && isFreeshipEligible && (
                      <span className="block text-[10px] text-emerald-600 font-medium">
                        (Đã áp dụng Freeship đơn từ 100k)
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 uppercase font-bold text-xs tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Miễn Phí
                      </span>
                    ) : (
                      <span className="font-bold text-stone-900">
                        +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}
                      </span>
                    )}
                  </div>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#8C4A32]">
                    <span>{isFreeshipCoupon ? 'Giảm phí vận chuyển từ voucher' : 'Giảm giá từ voucher'}</span>
                    <span className="font-bold">
                      - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="border-t border-stone-200 pt-4 flex justify-between items-baseline">
                  <span className="text-xs font-bold tracking-widest uppercase text-stone-500">
                    Tổng Thanh Toán
                  </span>
                  <span className="text-2xl sm:text-3xl font-serif-display font-bold text-[#4A2C2A]">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Submit Order Button (Desktop/Tablet) */}
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="hidden lg:flex w-full bg-[#4A2C2A] hover:bg-[#341F1D] text-white text-xs font-bold uppercase tracking-widest rounded-xl py-4 px-6 items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Đang xử lý đơn hàng...</span>
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-shield-check text-base"></i>
                    <span>Hoàn tất đặt hàng ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalTotal)})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-stone-400 pt-1">
                <i className="ph-fill ph-lock-key"></i>
                <span>Giao dịch an toàn & Cam kết hoàn tiền 100% nếu nứt vỡ</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* SHOPEE-STYLE MOBILE STICKY BOTTOM CHECKOUT ACTION BAR    */}
      {/* Cố định sát mép đáy trên mobile chuẩn Shopee             */}
      {/* ======================================================== */}
      <div 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] flex items-stretch h-14"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Cột trái: Tổng thanh toán & Tiết kiệm */}
        <div className="flex-1 flex flex-col justify-center items-end pr-3.5 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-stone-600 font-medium">Tổng thanh toán:</span>
            <span className="font-bold text-base sm:text-lg text-[#B45309] truncate">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalTotal)}
            </span>
          </div>
          {discountAmount > 0 && (
            <span className="text-[10px] text-emerald-600 font-medium block truncate leading-none">
              Tiết kiệm {new Intl.NumberFormat('vi-VN').format(discountAmount)}đ
            </span>
          )}
        </div>

        {/* Cột phải: Nút Đặt Hàng chuẩn Shopee */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-36 sm:w-40 bg-gradient-to-r from-[#94432C] to-[#4A2C2A] active:from-[#7D3824] active:to-[#38201F] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer shrink-0 shadow-inner px-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Đang đặt...</span>
            </>
          ) : (
            <span>Đặt Hàng</span>
          )}
        </button>
      </div>

      {/* VOUCHER SELECTION MODAL (Bottom Sheet trên Mobile) */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-[540px] overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] border border-stone-200 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-stone-100 bg-stone-50/70">
              <div className="flex items-center gap-2">
                <i className="ph-fill ph-ticket text-[#8C4A32] text-xl"></i>
                <h3 className="text-base font-serif-display font-bold text-[#4A2C2A]">Phiếu Ưu Đãi Candlet</h3>
              </div>
              <button 
                onClick={() => { setShowCouponModal(false); setCustomError(''); }}
                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-full transition-colors"
              >
                <i className="ph-bold ph-x"></i>
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar bg-stone-50/50 flex-1 space-y-4">
              
              {/* Custom coupon code input */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customCouponCode}
                    onChange={(e) => setCustomCouponCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã voucher riêng..." 
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-stone-800"
                  />
                  <button 
                    onClick={handleApplyCustomCoupon}
                    disabled={validatingCustom || !customCouponCode.trim()}
                    className="bg-[#4A2C2A] hover:bg-[#341F1D] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-40 transition-colors shrink-0"
                  >
                    {validatingCustom ? 'Đang kiểm tra...' : 'Áp dụng'}
                  </button>
                </div>
                {customError && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{customError}</p>
                )}
              </div>

              {activeCoupons.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <i className="ph-fill ph-ticket text-4xl mb-2 text-stone-300"></i>
                  <p className="text-xs">Hiện không có mã giảm giá công khai nào khả dụng.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCoupons.map(coupon => {
                    const maxSave = calculateDiscountForCoupon(coupon);
                    let isApplicable = maxSave > 0;
                    let labelSuffix = '';
                    
                    if (coupon.is_eligible === false) {
                      isApplicable = false;
                      // Hiển thị điều kiện đặc biệt thực tế của mã thay vì cụm "Yêu cầu đăng nhập"
                      labelSuffix = coupon.eligibility_error || 'Chỉ dành cho khách hàng thân thiết';
                    } else if (maxSave > 0) {
                      labelSuffix = `Giảm ${new Intl.NumberFormat('vi-VN').format(maxSave)}đ`;
                    } else {
                      labelSuffix = coupon.type === 'freeship' && subtotal < Number(coupon.min_order_value || 0)
                        ? `Mua thêm ${new Intl.NumberFormat('vi-VN').format(coupon.min_order_value - subtotal)}đ tiền hàng`
                        : coupon.type === 'freeship' && shippingFee === 0
                        ? 'Đơn hàng đã được miễn phí vận chuyển'
                        : 'Sản phẩm trong giỏ chưa phù hợp';
                    }

                    const isSelected = selectedCouponCode === coupon.code;
                    
                    return (
                      <div 
                        key={coupon._id} 
                        className={`relative rounded-xl border-2 transition-all overflow-hidden bg-white ${
                          !isApplicable 
                            ? 'border-stone-200 opacity-60 cursor-not-allowed' 
                            : isSelected 
                              ? 'border-[#F59E0B] shadow-sm cursor-pointer ring-1 ring-[#F59E0B]/30' 
                              : 'border-stone-200 hover:border-amber-300 hover:shadow-2xs cursor-pointer'
                        }`}
                        onClick={() => {
                          if (isApplicable) {
                            setSelectedCouponCode(coupon.code);
                            setShowCouponModal(false);
                          }
                        }}
                      >
                        <div className="flex">
                          {/* Graphic Left */}
                          <div className={`w-28 flex flex-col items-center justify-center p-3 text-white ${
                            !isApplicable ? 'bg-stone-300' : isSelected ? 'bg-[#F59E0B]' : 'bg-[#D97706]'
                          }`}>
                            <span className="text-xl font-bold font-serif-display leading-tight text-center">
                              {coupon.type === 'freeship'
                                ? (coupon.shipping_discount_type === 'fixed' ? `${new Intl.NumberFormat('vi-VN').format(shippingDiscountValue(coupon) / 1000)}K SHIP` : `${shippingDiscountValue(coupon)}% SHIP`)
                                : coupon.type === 'percent' ? `${coupon.value}%` : `${new Intl.NumberFormat('vi-VN').format(coupon.value / 1000)}K`}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest font-bold mt-0.5 opacity-90">GIẢM GIÁ</span>
                          </div>
                          
                          {/* Info Right */}
                          <div className="flex-1 p-3.5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                                  {coupon.name}
                                </h4>
                                <span className="font-mono text-[10px] font-bold text-[#8C4A32] bg-[#FAF5EE] border border-amber-200/80 px-1.5 py-0.5 rounded shrink-0">
                                  {coupon.code}
                                </span>
                              </div>

                              {/* Huy hiệu hiển thị rõ Điều Kiện Đặc Biệt */}
                              <div className="flex items-center gap-1.5 flex-wrap my-1.5">
                                {coupon.customer_condition === 'returning' && (
                                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <i className="ph-fill ph-crown text-[11px]"></i>
                                    Khách hàng thân thiết
                                  </span>
                                )}
                                {coupon.customer_condition === 'first_time' && (
                                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <i className="ph-fill ph-sparkle text-[11px]"></i>
                                    Khách mua lần đầu
                                  </span>
                                )}
                                {coupon.usage_limit_per_user === 'once' && (
                                  <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                                    1 lần/tài khoản
                                  </span>
                                )}
                                {coupon.applicable_products === 'specific' && (
                                  <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70 px-2 py-0.5 rounded-full">
                                    Sản phẩm chỉ định
                                  </span>
                                )}
                                {coupon.is_website_only && (
                                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                                    Độc quyền Website
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-stone-500 line-clamp-1">
                                {coupon.type === 'freeship' ? shippingDiscountConditions(coupon) : coupon.max_discount ? `Giảm tối đa ${new Intl.NumberFormat('vi-VN').format(coupon.max_discount)}đ` : 'Không giới hạn mức giảm'}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-100">
                              <span className={`text-xs font-bold ${
                                isApplicable ? 'text-[#D97706]' : 'text-stone-500 font-medium'
                              }`}>
                                {labelSuffix}
                              </span>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-stone-300'
                              }`}>
                                {isSelected && <i className="ph-bold ph-check text-white text-[9px]"></i>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-stone-100 bg-white">
              <button 
                onClick={() => { setShowCouponModal(false); setCustomError(''); }}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-xl py-3 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
