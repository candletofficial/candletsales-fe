import api from './api';

export const reviewService = {
  getReviewsByProduct: async (productId) => {
    try {
      const response = await api.get(`/reviews/${productId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createReview: async (reviewData) => {
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
