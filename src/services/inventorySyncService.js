import api from './api';

export const inventorySyncService = {
  // Cân bằng kho
  syncInventory: async (data) => {
    try {
      const response = await api.post('/inventory-syncs', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cân bằng kho:', error);
      throw error;
    }
  },

  // Lấy lịch sử cân bằng kho
  getSyncHistory: async () => {
    try {
      const response = await api.get('/inventory-syncs');
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử cân bằng kho:', error);
      throw error;
    }
  }
};
