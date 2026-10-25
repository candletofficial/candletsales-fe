import api from './api';

export const messengerBotService = {
  getStatus: () => api.get('/messenger-bot/status'),
  updateBotStatus: (enabled) => api.patch('/messenger-bot/status', { enabled }),
  getKnowledge: () => api.get('/messenger-bot/knowledge'),
  updateKnowledge: (data) => api.put('/messenger-bot/knowledge', data),
  getProductProfiles: () => api.get('/messenger-bot/product-profiles'),
  updateProductProfile: (productId, data) => api.put(`/messenger-bot/product-profiles/${productId}`, data),
  getMedia: () => api.get('/messenger-bot/media'),
  createMedia: (data) => api.post('/messenger-bot/media', data),
  updateMedia: (id, data) => api.put(`/messenger-bot/media/${id}`, data),
  deleteMedia: (id) => api.delete(`/messenger-bot/media/${id}`),
  getConversations: (archived = false) => api.get('/messenger-bot/conversations', { params: { archived } }),
  updateConversationMode: (id, mode) => api.patch(`/messenger-bot/conversations/${id}/mode`, { mode }),
  archiveConversation: (id, archived = true) => api.patch(`/messenger-bot/conversations/${id}/archive`, { archived }),
  deleteConversation: (id) => api.delete(`/messenger-bot/conversations/${id}`),
  sendConversationMessage: (id, text) => api.post(`/messenger-bot/conversations/${id}/messages`, { text }),
  resetConversation: (id) => api.post(`/messenger-bot/conversations/${id}/reset`),
  getDrafts: (status) => api.get('/messenger-bot/drafts', { params: status ? { status } : {} }),
  approveDraft: (id, data = {}) => api.post(`/messenger-bot/drafts/${id}/approve`, data),
  rejectDraft: (id, reason = '') => api.post(`/messenger-bot/drafts/${id}/reject`, { reason }),
};
