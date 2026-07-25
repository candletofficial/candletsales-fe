import api from './api';

export const adCostService = {
  getAdCosts: (year, month) => api.get('/ad-costs', { params: { year, month } }),
  createAdCost: (data) => api.post('/ad-costs', data),
  updateAdCost: (id, data) => api.put(`/ad-costs/${id}`, data),
  deleteAdCost: (id) => api.delete(`/ad-costs/${id}`),
  getBalances: () => api.get('/ad-costs/balances'),
  topupPlatform: (data) => api.post('/ad-costs/topup', data),
  getAffiliateFees: (year, month) => api.get('/ad-costs/affiliate-fees', { params: { year, month } }),
  saveAffiliateFee: (data) => api.post('/ad-costs/affiliate-fees', data),
  syncAdCost: (data) => api.post('/ad-costs/sync', data),
};
