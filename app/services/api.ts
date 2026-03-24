import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://lpcrmbackend.vercel.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');

        if (!refresh) {
          // No refresh token — force logout
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          await SecureStore.deleteItemAsync('user');
          return Promise.reject(error);
        }

        // Your backend uses "refresh_token" key (not "refresh")
        const res = await axios.post(`${BASE_URL}/token/refresh/`, {
          refresh_token: refresh,
        });

        const newAccessToken = res.data.access;

        // Save new access token
        await SecureStore.setItemAsync('access_token', newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axios(originalRequest);

      } catch (refreshError) {
        // Refresh failed — clear everything
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;