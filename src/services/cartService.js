import axios from 'axios';

const cartApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Helper to get or create a session ID for guest users
export const getSessionId = () => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const cartService = {
  getCart: async () => {
    const res = await cartApi.get(`/cart/${getSessionId()}`);
    return res.data;
  },
  addToCart: async (payload) => {
    const res = await cartApi.post('/cart/add', {
      sessionId: getSessionId(),
      ...payload
    });
    return res.data;
  },
  updateCartItem: async (payload) => {
    const res = await cartApi.put(`/cart/${getSessionId()}/update`, payload);
    return res.data;
  },
  removeFromCart: async (payload) => {
    const res = await cartApi.delete(`/cart/${getSessionId()}/remove`, { data: payload });
    return res.data;
  },
  removeMultipleItems: async (itemsToRemove) => {
    const res = await cartApi.post(`/cart/${getSessionId()}/remove-multiple`, { itemsToRemove });
    return res.data;
  },
  clearCart: async () => {
    const res = await cartApi.delete(`/cart/${getSessionId()}/clear`);
    return res.data;
  }
};
