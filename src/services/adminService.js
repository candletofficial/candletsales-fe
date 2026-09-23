import api from './api';

export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/users/stats'),
  getDashboardStats: ({ days, endDate } = {}) => api.get('/admin/dashboard', { params: { days, endDate } }),
  getRecentActivities: () => api.get('/admin/activities'),
  approveUser: (id) => api.put(`/admin/users/${id}/approve`),
  rejectUser: (id) => api.put(`/admin/users/${id}/reject`),
  revokeUser: (id) => api.put(`/admin/users/${id}/revoke`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};
