import { create } from 'zustand';
import { useAuthStore } from './auth.ts';

export interface GatewayStats {
  ping: number;
  uptime: number;
  memoryMb: number;
  guildsCount: number;
  usersCount: number;
  connected: boolean;
  lastEvent: { type: string; data: any; timestamp: number } | null;
}

interface RealtimeStore extends GatewayStats {
  setStats: (partial: Partial<GatewayStats>) => void;
  initEventStream: () => () => void;
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  ping: 16,
  uptime: 0,
  memoryMb: 0,
  guildsCount: 1,
  usersCount: 0,
  connected: false,
  lastEvent: null,

  setStats: (partial) => set((state) => ({ ...state, ...partial })),

  initEventStream: () => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const checkServerInstance = (serverInstanceId?: string) => {
      if (!serverInstanceId) return;
      const storedInstanceId = localStorage.getItem('fc_instance_id');
      if (storedInstanceId && storedInstanceId !== serverInstanceId) {
        useAuthStore.getState().handleSessionExpired('bot_restarted');
      }
    };

    const connect = () => {
      try {
        eventSource = new EventSource('/api/events/stream');

        eventSource.onopen = () => {
          set({ connected: true });
        };

        eventSource.addEventListener('init', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.instanceId) checkServerInstance(data.instanceId);
            set({
              connected: true,
              ping: data.ping ?? 16,
              uptime: data.uptime ?? 0,
              memoryMb: data.memoryMb ?? 0,
              guildsCount: data.guildsCount ?? 1,
              usersCount: data.usersCount ?? 0,
            });
          } catch {}
        });

        eventSource.addEventListener('heartbeat', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.instanceId) checkServerInstance(data.instanceId);
            set({
              connected: true,
              ping: data.ping ?? get().ping,
              uptime: data.uptime ?? get().uptime,
              memoryMb: data.memoryMb ?? get().memoryMb,
            });
          } catch {}
        });

        eventSource.addEventListener('moduleToggle', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            set({
              lastEvent: { type: 'moduleToggle', data, timestamp: Date.now() },
            });
            // Dispatch global browser event so any open tab/page updates instantly
            window.dispatchEvent(new CustomEvent('floofcore:moduleToggle', { detail: data }));
          } catch {}
        });

        eventSource.onerror = () => {
          set({ connected: false });
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential backoff reconnect
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connect();
            }, 5000);
          }
        };
      } catch {
        set({ connected: false });
      }
    };

    connect();

    // Fallback polling for statistics every 5 seconds if SSE is blocked by proxies
    const pollInterval = setInterval(async () => {
      if (!get().connected) {
        try {
          const res = await fetch('/api/gateway/live');
          if (res.ok) {
            const live = await res.json();
            set({
              connected: true,
              ping: live.ping ?? 16,
              uptime: live.uptimeMs ?? 0,
              memoryMb: live.memory?.rssMb ?? 0,
              guildsCount: live.guildsCount ?? 1,
              usersCount: live.usersCount ?? 0,
            });
          }
        } catch {}
      }
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  },
}));
