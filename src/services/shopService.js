import axios from 'axios';

const shopApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

export const shopService = {
  getProducts: async () => {
    const res = await shopApi.get('/shop/products');
    return res.data;
  },
  getProductById: async (id) => {
    const res = await shopApi.get(`/shop/products/${id}`, {
      params: { _t: Date.now() }
    });
    return res.data;
  },
  getActiveCoupons: async (user_id) => {
    const params = user_id ? { user_id } : {};
    const res = await shopApi.get('/shop/coupons', { params });
    return res.data;
  },
  validateCoupon: async (code, user_id) => {
    const res = await shopApi.post('/shop/coupons/validate', { code, user_id });
    return res.data;
  }
};
