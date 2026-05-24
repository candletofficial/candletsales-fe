import api from './api';

export const inventoryCheckService = {
  // Lấy danh sách phiếu kiểm kho
  getTickets: async () => {
    try {
      const response = await api.get('/inventory-checks');
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phiếu kiểm kho:', error);
      throw error;
    }
  },

  // Tạo phiếu kiểm kho mới
  createTicket: async (ticketData) => {
    try {
      const response = await api.post('/inventory-checks', ticketData);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo phiếu kiểm kho:', error);
      throw error;
    }
  }
};
