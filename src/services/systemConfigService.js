import api from './api';

const systemConfigService = {
  getConfig: async (key) => {
    const response = await api.get(`/system-configs/${key}`);
    return response.data;
  },
  updateConfig: async (key, value) => {
    const response = await api.put(`/system-configs/${key}`, { value });
    return response.data;
  },
};

export default systemConfigService;
