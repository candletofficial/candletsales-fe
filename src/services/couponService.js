import api from './api';

export const couponService = {
  getCoupons: (source) => api.get('/coupons', { params: source ? { source } : {} }),
  getCouponById: (id) => api.get(`/coupons/${id}`),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
  validateCoupon: (code, items, totalPrice, shippingFee = 0, source = 'pos') => api.post('/coupons/validate', { code, items, totalPrice, shippingFee, source }),
};
