import axios from 'axios';
import {getAdminToken, useAuthStore} from '../stores/authStore';

export const API_BASE_URL =
  import.meta.env.API_BASE_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(config => {
  const token = getAdminToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if ([401, 403].includes(error.response?.status)) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);
