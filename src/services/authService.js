import api from './api';

export const authService = {
  login: async (credentials) => {
    return await api.post('/auth/login', credentials);
  },
  register: async (data) => {
    return await api.post('/auth/register', data);
  },
  shopRegister: async (data) => {
    return await api.post('/auth/shop-register', data);
  },
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};
