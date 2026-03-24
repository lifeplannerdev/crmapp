
import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://lpcrmbackend.vercel.app/api';

const getToken = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return await SecureStore.getItemAsync(key);
};

const removeToken = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

const saveToken = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken('access_token');
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
        const refresh = await getToken('refresh_token');

        if (!refresh) {
          await removeToken('access_token');
          await removeToken('refresh_token');
          await removeToken('user');
          return Promise.reject(error);
        }

        const res = await axios.post(`${BASE_URL}/token/refresh/`, {
          refresh_token: refresh,
        });

        const newAccessToken = res.data.access;
        await saveToken('access_token', newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axios(originalRequest);

      } catch (refreshError) {
        await removeToken('access_token');
        await removeToken('refresh_token');
        await removeToken('user');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;