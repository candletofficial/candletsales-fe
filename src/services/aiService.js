import api from './api';

export const aiService = {
  /**
   * Lấy danh sách câu hỏi gợi ý
   */
  getSuggestions: () => api.get('/ai/suggestions'),

  /**
   * Gửi tin nhắn đến AI Business Analyst
   * @param {string} message - Câu hỏi của user
   * @param {Array}  history - Lịch sử chat [{role, content}]
   * @param {string} periodLabel - Nhãn kỳ hiện tại
   */
  chat: (message, history = [], periodLabel = 'Tháng này') =>
    api.post('/ai/chat', { message, history, periodLabel }),

  /**
   * Lấy danh sách Smart Alerts từ AI
   */
  getSmartAlerts: () => api.get('/ai/smart-alerts'),
};
