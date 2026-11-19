import api from './api';

export const aiService = {
  /**
   * Lấy danh sách câu hỏi gợi ý và thông tin model đang hoạt động
   */
  getSuggestions: () => api.get('/ai/suggestions'),

  /**
   * Lấy cấu hình AI Business Analyst (OpenAI GPT / Gemini fallback)
   */
  getConfig: () => api.get('/ai/config'),

  /**
   * Cập nhật cấu hình AI Business Analyst (OpenAI API Key & Model)
   */
  updateConfig: (payload) => api.put('/ai/config', payload),

  /**
   * Kiểm tra kết nối OpenAI API Key
   */
  testConfig: (payload) => api.post('/ai/test-config', payload),

  /**
   * Gửi tin nhắn đến AI Business Analyst
   * @param {string} message - Câu hỏi của user
   * @param {Array}  history - Lịch sử chat [{role, content}]
   * @param {string} periodLabel - Nhãn kỳ hiện tại
   * @param {Object} options - { days, endDate, filterType, currentPage }
   */
  chat: (message, history = [], periodLabel = 'Tháng này', options = {}) =>
    api.post('/ai/chat', { message, history, periodLabel, ...options }),

  /**
   * Lấy danh sách Smart Alerts từ AI
   */
  getSmartAlerts: () => api.get('/ai/smart-alerts'),
};
