import { create } from 'zustand';
import { login, logout, getCurrentUser } from '../services/auth';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  loginUser: (username: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  loginUser: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await login(username, password);
      set({ user: data.user, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.non_field_errors?.[0] || 'Login failed';
      set({ error: msg, isLoading: false });
    }
  },

  logoutUser: async () => {
    await logout();
    set({ user: null });
  },

  loadUser: async () => {
    const user = await getCurrentUser();
    set({ user });
  },
}));