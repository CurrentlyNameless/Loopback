import { create } from 'zustand';

export interface DashboardNotification {
  id: string;
  type: 'update' | 'ticket' | 'appeal' | 'application' | 'suggestion' | 'automod' | 'backup' | 'system';
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  link: string;
  unread: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  meta?: Record<string, any>;
}

interface NotificationState {
  notifications: DashboardNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (guildId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (guildId?: string) => {
    try {
      const url = guildId ? `/api/notifications?guildId=${encodeURIComponent(guildId)}` : '/api/notifications';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          set({
            notifications: data.notifications,
            unreadCount: data.unreadCount ?? data.notifications.filter((n: any) => n.unread).length,
          });
        }
      }
    } catch {}
  },

  markAsRead: async (id: string) => {
    try {
      await fetch('/api/notifications/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const updated = get().notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
      set({
        notifications: updated,
        unreadCount: updated.filter((n) => n.unread).length,
      });
    } catch {}
  },

  clearAll: async () => {
    try {
      await fetch('/api/notifications/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      set({
        notifications: [],
        unreadCount: 0,
      });
    } catch {}
  },
}));
