import api from './api';

export const expenseService = {
  getExpenses: () => api.get('/expenses'),
  createExpense: (data) => api.post('/expenses', data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
};
