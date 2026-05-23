import api from './api';

export const materialService = {
  getMaterials: (params) => api.get('/materials', { params }),
  createMaterial: (data) => api.post('/materials', data),
  updateMaterial: (id, data) => api.put(`/materials/${id}`, data),
  deleteMaterial: (id) => api.delete(`/materials/${id}`),
};
