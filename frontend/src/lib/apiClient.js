import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const attachAuthInterceptor = (client) => {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/2fa/validate');

      if (status === 401 && !isAuthEndpoint) {
        localStorage.removeItem('token');
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const createApiClient = () => {
  const token = localStorage.getItem('token');

  return attachAuthInterceptor(axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        },
  }));
};

export const createPublicApiClient = () =>
  attachAuthInterceptor(axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  }));
