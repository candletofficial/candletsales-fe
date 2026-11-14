import api from './api';

export const productService = {
  getProducts: (params) => api.get('/products', { params }),
  createProduct: (data) => api.post('/products', data),
  updateShopOrder: (orderedProductIds) => api.put('/products/shop-order', { orderedProductIds }),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};
