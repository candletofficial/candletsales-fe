import api from './api';

export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/users/stats'),
  getDashboardStats: ({ days, endDate } = {}) => api.get('/admin/dashboard', { params: { days, endDate } }),
  approveUser: (id) => api.put(`/admin/users/${id}/approve`),
  rejectUser: (id) => api.put(`/admin/users/${id}/reject`),
  revokeUser: (id) => api.put(`/admin/users/${id}/revoke`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};
