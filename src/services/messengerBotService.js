import api from './api';

export const messengerBotService = {
  getStatus: () => api.get('/messenger-bot/status'),
  getConversations: () => api.get('/messenger-bot/conversations'),
  updateConversationMode: (id, mode) => api.patch(`/messenger-bot/conversations/${id}/mode`, { mode }),
  getDrafts: (status) => api.get('/messenger-bot/drafts', { params: status ? { status } : {} }),
  approveDraft: (id, data = {}) => api.post(`/messenger-bot/drafts/${id}/approve`, data),
  rejectDraft: (id, reason = '') => api.post(`/messenger-bot/drafts/${id}/reject`, { reason }),
};
