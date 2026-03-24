import api from './api';
import * as SecureStore from 'expo-secure-store';

export const login = async (username: string, password: string) => {
  const res = await api.post('/login/', { username, password });
  
  // Your backend returns: access, refresh, user
  await SecureStore.setItemAsync('access_token', res.data.access);
  await SecureStore.setItemAsync('refresh_token', res.data.refresh);
  await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
  
  return res.data;
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  await SecureStore.deleteItemAsync('user');
};

export const getCurrentUser = async () => {
  const user = await SecureStore.getItemAsync('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = async () => {
  const token = await SecureStore.getItemAsync('access_token');
  return !!token;
};