import api from './api';

export const fundService = {
  getSummary: () => api.get('/funds/summary'),
  getTransactions: (page = 1, limit = 20, type = 'all') => api.get(`/funds/transactions?page=${page}&limit=${limit}&type=${type}`),
  deposit: (data) => api.post('/funds/deposit', data),
  withdrawRevenue: (data) => api.post('/funds/withdraw-revenue', data)
};
