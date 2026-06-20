import api from './api';

export const orderService = {
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  deleteOrder: (id, restoreStock = false) => api.delete(`/orders/${id}?restoreStock=${restoreStock}`),
  markAsReturned: (id, returnCost) => api.patch(`/orders/${id}/return`, { returnCost }),
};
