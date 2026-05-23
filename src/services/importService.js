import api from './api';

export const importService = {
  getImportTickets: () => api.get('/imports'),
  createImportTicket: (data) => api.post('/imports', data),
  completeImportTicket: (id) => api.put(`/imports/${id}/complete`),
  deleteImportTicket: (id) => api.delete(`/imports/${id}`),
};
