import { create } from 'zustand';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, token, loading: false });
      
      // Connect WebSocket
      socketService.connect(token);
      
      return response;
    } catch (error) {
      set({ error: error.error || 'Login failed', loading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.register(data);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, token, loading: false });
      
      // Connect WebSocket
      socketService.connect(token);
      
      return response;
    } catch (error) {
      set({ error: error.error || 'Registration failed', loading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      socketService.disconnect();
      set({ user: null, token: null });
    }
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) return;

    set({ loading: true });
    try {
      const response = await authAPI.me();
      set({ user: response.data.user, loading: false });
      
      // Connect WebSocket
      socketService.connect(token);
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  }
}));

export default useAuthStore;
