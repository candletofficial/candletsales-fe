import api from './api';

export const orderService = {
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  getItemMaterials: (id, index) => api.get(`/orders/${id}/items/${index}/materials`),
  updateItemMaterials: (id, index, data) => api.put(`/orders/${id}/items/${index}/materials`, data),
  deleteOrder: (id, restoreStock = false) => api.delete(`/orders/${id}?restoreStock=${restoreStock}`),
  markAsReturned: (id, returnCost) => api.patch(`/orders/${id}/return`, { returnCost }),
  markAsRefunded: (id, refundTransactionId) => api.patch(`/orders/${id}/refund`, { refund_transaction_id: refundTransactionId }),
  updateDeliveryStatus: (id, data) => api.patch(`/orders/${id}/delivery-status`, data),
  
  // Customer Shop APIs
  getPaymentSession: (orderReference) => api.get(`/shop/payment-sessions/${orderReference}`),
  getShopOrders: (params) => api.get('/shop/orders', { params }),
  getShopOrderById: (id) => api.get(`/shop/orders/${id}`),
  cancelShopOrder: (id, reason) => api.patch(`/shop/orders/${id}/cancel`, { reason }),
};
