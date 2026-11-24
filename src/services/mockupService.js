import api from './api';

export const mockupService = {
  createShare: (data) => api.post('/mockups', data),
  listShares: () => api.get('/mockups'),
  deleteShare: (id) => api.delete(`/mockups/${encodeURIComponent(id)}`),
  getPublicShare: (token) => api.get(`/mockups/public/${encodeURIComponent(token)}`),
};

export default mockupService;
