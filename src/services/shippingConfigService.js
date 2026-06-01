import api from './api';

export const shippingConfigService = {
  getAllConfigs: () => api.get('/shipping-config'),
  updateConfig: (method, data) => api.put(`/shipping-config/${method}`, data),
};
