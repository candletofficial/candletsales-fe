import api from './api';

export const adCostService = {
  getAdCosts: (year, month) => api.get('/ad-costs', { params: { year, month } }),
  createAdCost: (data) => api.post('/ad-costs', data),
  updateAdCost: (id, data) => api.put(`/ad-costs/${id}`, data),
  deleteAdCost: (id) => api.delete(`/ad-costs/${id}`),
};
