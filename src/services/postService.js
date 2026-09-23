import api from './api';

export const postService = {
  // Public APIs
  getPosts: (params) => api.get('/posts', { params }),
  getPostBySlug: (slug) => api.get(`/posts/${slug}`),
  recordView: (slug) => api.post(`/posts/${slug}/view`),
  toggleLike: (slug, action) => api.post(`/posts/${slug}/like`, { action }),

  // Admin APIs
  getAdminPosts: (params) => api.get('/admin/posts', { params }),
  createPost: (data) => api.post('/admin/posts', data),
  updatePost: (id, data) => api.put(`/admin/posts/${id}`, data),
  deletePost: (id) => api.delete(`/admin/posts/${id}`),
};
