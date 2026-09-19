import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  globalName?: string;
  avatar?: string;
  discriminator?: string;
  isAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  instanceId: string | null;
  setUser: (user: User | null, instanceId?: string | null) => void;
  handleSessionExpired: (reason?: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  instanceId: localStorage.getItem('fc_instance_id'),
  setUser: (user, instanceId) => {
    if (user) {
      if (instanceId) {
        localStorage.setItem('fc_instance_id', instanceId);
      }
      set({ user, isAuthenticated: true, isLoading: false, instanceId: instanceId || localStorage.getItem('fc_instance_id') });
    } else {
      localStorage.removeItem('fc_instance_id');
      set({ user: null, isAuthenticated: false, isLoading: false, instanceId: null });
    }
  },
  handleSessionExpired: (reason = 'bot_restarted') => {
    localStorage.removeItem('fc_instance_id');
    set({ user: null, isAuthenticated: false, isLoading: false, instanceId: null });
    if (window.location.pathname !== '/login') {
      window.location.href = `/login?error=${encodeURIComponent(reason)}`;
    }
  },
  logout: async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('fc_instance_id');
    set({ user: null, isAuthenticated: false, isLoading: false, instanceId: null });
    window.location.href = '/login';
  },
}));

