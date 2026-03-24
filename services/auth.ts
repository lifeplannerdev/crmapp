import api from './api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const storage = {
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const login = async (username: string, password: string) => {
  const res = await api.post('/login/', { username, password });

  await storage.set('access_token', res.data.access);
  await storage.set('refresh_token', res.data.refresh);
  await storage.set('user', JSON.stringify(res.data.user));

  return res.data;
};

export const logout = async () => {
  await storage.remove('access_token');
  await storage.remove('refresh_token');
  await storage.remove('user');
};

export const getCurrentUser = async () => {
  const user = await storage.get('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = async () => {
  const token = await storage.get('access_token');
  return !!token;
};