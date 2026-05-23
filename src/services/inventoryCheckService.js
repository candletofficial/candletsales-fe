import axios from 'axios';

const API_URL = 'http://localhost:5000/api/inventory-checks';

// Configure axios with credentials
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies/sessions if any
});

export const inventoryCheckService = {
  // Lấy danh sách phiếu kiểm kho
  getTickets: async () => {
    try {
      const response = await axiosInstance.get('/');
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phiếu kiểm kho:', error);
      throw error;
    }
  },

  // Tạo phiếu kiểm kho mới
  createTicket: async (ticketData) => {
    try {
      const response = await axiosInstance.post('/', ticketData);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo phiếu kiểm kho:', error);
      throw error;
    }
  }
};
