import api from './api';

export const couponService = {
  getCoupons: () => api.get('/coupons'),
  getCouponById: (id) => api.get(`/coupons/${id}`),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
  validateCoupon: (code, items, totalPrice) => api.post('/coupons/validate', { code, items, totalPrice }),
};
