import api from './api';

export const importService = {
  getImportTickets: () => api.get('/imports'),
  createImportTicket: (data) => api.post('/imports', data),
  updateImportTicket: (id, data) => api.put(`/imports/${id}`, data),
  completeImportTicket: (id) => api.put(`/imports/${id}/complete`),
  deleteImportTicket: (id) => api.delete(`/imports/${id}`),
};
