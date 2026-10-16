export const shippingDiscountValue = (coupon) => coupon.shipping_discount_type ? Number(coupon.value) : 100;

export const calculateShippingDiscount = (coupon, shippingFee, subtotal) => {
  if (subtotal < Number(coupon.min_order_value || 0) || shippingFee <= 0) return 0;
  const value = shippingDiscountValue(coupon);
  let discount = coupon.shipping_discount_type === 'fixed' ? value : shippingFee * value / 100;
  if (coupon.shipping_discount_type !== 'fixed' && coupon.max_discount > 0) {
    discount = Math.min(discount, coupon.max_discount);
  }
  return Math.min(shippingFee, Math.max(0, Math.round(discount)));
};

export const shippingDiscountLabel = (coupon) => {
  const value = shippingDiscountValue(coupon);
  return coupon.shipping_discount_type === 'fixed'
    ? `Giảm ${value.toLocaleString('vi-VN')}đ phí ship`
    : `Giảm ${value}% phí ship`;
};

export const shippingDiscountConditions = (coupon) => {
  const parts = [`Đơn từ ${Number(coupon.min_order_value || 0).toLocaleString('vi-VN')}đ tiền hàng`];
  if (coupon.shipping_discount_type !== 'fixed' && coupon.max_discount > 0) {
    parts.push(`giảm tối đa ${Number(coupon.max_discount).toLocaleString('vi-VN')}đ`);
  }
  return parts.join(' • ');
};
