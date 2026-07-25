import api from './api';

export const fundService = {
  getSummary: () => api.get('/funds/summary'),
  getTransactions: (page = 1, limit = 20, type = 'all', startDate = '', endDate = '') => 
    api.get(`/funds/transactions?page=${page}&limit=${limit}&type=${type}&startDate=${startDate}&endDate=${endDate}`),
  deposit: (data) => api.post('/funds/deposit', data),
  withdrawRevenue: (data) => api.post('/funds/withdraw-revenue', data),
  withdrawCapital: (data) => api.post('/funds/withdraw-capital', data),
  syncFund: (data) => api.post('/funds/sync', data),
  deleteAllTransactions: () => api.delete('/funds/transactions/all')
};
