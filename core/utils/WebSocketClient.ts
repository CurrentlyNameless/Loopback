import { logger } from './logger.ts';
import { getBotVersion } from './updateHelper.ts';
import type { LicenseConfig } from './LicenseManager.ts';

const HEARTBEAT_INTERVAL = 10000;
const KEEPALIVE_INTERVAL = 60000;
const PING_TIMEOUT = 15000;

let botPublicIP: string | null = null;

async function getPublicIP(silent: boolean): Promise<string | null> {
  if (botPublicIP) return botPublicIP;

  const services = [
    'https://api.ipify.org',
    'https://api.my-ip.io/v2/ip.txt',
    'https://ipinfo.io/ip',
    'https://ifconfig.me/ip',
    'https://checkup.amazonaws.com',
  ];

  for (const url of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        let ip = (await res.text()).trim();
        if (ip.includes('\n')) ip = ip.split('\n')[0].trim();
        if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
          if (!ip.startsWith('10.') && !ip.startsWith('172.16.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) {
            botPublicIP = ip;
            if (!silent) logger.debug(`Public IP detected: ${ip}`, 'LicenseManager');
            return ip;
          }
        }
      }
    } catch (err) {
      if (!silent) logger.debug(`Failed to get IP from ${url}: ${(err as Error).message}`, 'LicenseManager');
    }
  }

  if (!silent) logger.warn('Could not detect public IP', 'LicenseManager');
  return null;
}

export type WebSocketEvent =
  | 'bot:auth' | 'bot:auth_success' | 'bot:heartbeat'
  | 'bot:ping' | 'bot:pong' | 'bot:reconnect'
  | 'bot:restart' | 'bot:shutdown' | 'bot:update'
  | 'bot:update_info' | 'bot:update_progress'
  | 'bot:domain_update' | 'bot:log' | 'bot:strike_update' | 'license:sync'
  | 'blacklist:add' | 'blacklist:remove'
  | 'blacklist:addnote' | 'blacklist:settrust' | 'blacklist:setflags'
  | 'blacklist:guild_whitelist_add' | 'blacklist:guild_whitelist_remove'
  | 'blacklist:badguild_add' | 'blacklist:badguild_remove'
  | 'blacklist:verify_user_request' | 'blacklist:verify_user_response'
  | 'bot:create_backup' | 'bot:restore_backup'
  | 'backup:data_ready' | 'backup:restore_result'
  | 'federation:chat_message' | 'federation:chat_message_delete'
  | 'federation:ban_sync' | 'federation:ban_unsync'
  | 'federation:link_created' | 'federation:relay_message'
  | 'federation:admin_disable_relay' | 'federation:admin_enable_relay'
  | 'federation:admin_broadcast' | 'federation:relay_ban_user'
  | 'guild:config_update' | 'guild:request_config'
  | 'guild:config_data' | 'guild:config_saved'
  | 'guild:tier_update';

export interface WebSocketPacket {
  event: WebSocketEvent;
  data?: Record<string, unknown>;
}

export interface BotInstance {
  client: import("discord.js").Client;
  config?: { name?: string };
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isWebSocketConnected = false;
  private _isConnecting = false;
  private _isReconnecting = false;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private _isHeartbeatRunning = false;
  private keepaliveIntervalId: ReturnType<typeof setInterval> | null = null;
  private pingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pingResponseReceived = false;
  private serverUrl: string;
  private hasConnectedBefore = false;

  onMessage?: (packet: WebSocketPacket) => void;
  onConnected?: () => void;
  onFatalClose?: (code: number) => void;

  constructor(
    private config: LicenseConfig,
    private getBotInstance: () => BotInstance | null,
    private silent: boolean
  ) {
    this.serverUrl = config.server || 'http://localhost:3000';
  }

  get isWebSocketConnected(): boolean { return this._isWebSocketConnected; }
  get isConnecting(): boolean { return this._isConnecting; }
  get isReconnecting(): boolean { return this._isReconnecting; }

  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this._isConnecting) {
        if (!this.silent) logger.debug('WebSocket already connecting, waiting...', 'LicenseManager');
        await new Promise(r => setTimeout(r, 2000));
        if (this._isWebSocketConnected) { resolve(); return; }
      }

      if (this._isReconnecting) {
        if (!this.silent) logger.debug('Reconnect in progress, waiting...', 'LicenseManager');
        await new Promise(r => setTimeout(r, 3000));
        if (this._isWebSocketConnected) { resolve(); return; }
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) { resolve(); return; }
      if (!this.config.key) { reject(new Error('No license key')); return; }

      if (this.ws) {
        try { this.ws.close(); } catch {}
        this.ws = null;
      }

      this._isConnecting = true;
      this._isWebSocketConnected = false;

      const candidates = Array.from(new Set([
        this.config.server,
        'http://flm.moonmallow.dev:2053',
        'http://216.220.236.104:2053',
        'https://flm.moonmallow.dev',
        'http://localhost:2053',
        'http://127.0.0.1:2053',
        'https://flm.disparityurl.space',
        'https://flm.hectort.xyz'
      ].filter(Boolean) as string[]));

      // Build WS candidate endpoints
      const wsUrls = candidates.map(targetServer => {
        if (targetServer.startsWith('ws://') || targetServer.startsWith('wss://')) {
          return { original: targetServer, wsUrl: targetServer };
        }
        const isHttps = targetServer.toLowerCase().startsWith('https://');
        const cleanBase = targetServer.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        const protocol = isHttps ? 'wss://' : 'ws://';
        return { original: targetServer, wsUrl: `${protocol}${cleanBase}/ws` };
      });

      // Fast-Probe Candidates with Concurrent Race
      let activeSocket: WebSocket | null = null;
      let winningServer = '';

      const attemptProbe = async (item: { original: string; wsUrl: string }): Promise<WebSocket | null> => {
        return new Promise<WebSocket | null>((res) => {
          let settled = false;
          let tempWs: WebSocket | null = null;
          const timeout = setTimeout(() => {
            if (!settled) {
              settled = true;
              try { (tempWs as any)?.terminate?.(); tempWs?.close(); } catch {}
              res(null);
            }
          }, 3500);

          try {
            tempWs = new WebSocket(item.wsUrl);
            tempWs.onopen = () => {
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                res(tempWs);
              } else {
                try { tempWs?.close(); } catch {}
              }
            };
            tempWs.onerror = () => {
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                res(null);
              }
            };
            tempWs.onclose = () => {
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                res(null);
              }
            };
          } catch {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              res(null);
            }
          }
        });
      };

      // Probe top candidates in parallel
      for (let i = 0; i < wsUrls.length; i += 3) {
        const batch = wsUrls.slice(i, i + 3);
        const results = await Promise.all(batch.map(item => attemptProbe(item)));
        const winnerIndex = results.findIndex(s => s !== null);
        if (winnerIndex !== -1 && results[winnerIndex]) {
          activeSocket = results[winnerIndex]!;
          winningServer = batch[winnerIndex].original;
          // Close other connected sockets in same batch
          results.forEach((s, idx) => {
            if (idx !== winnerIndex && s) {
              try { s.close(); } catch {}
            }
          });
          break;
        }
      }

      if (activeSocket) {
        const socket = activeSocket;
        this.ws = socket;
        this.serverUrl = winningServer;
        this._isConnecting = false;
        this._isWebSocketConnected = true;
        this.wsReconnectAttempts = 0;
        this.pingResponseReceived = true;

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string);
            if (!this.silent) logger.debug(`WebSocket message: ${message.event}`, 'LicenseManager');

            if (message.event === 'bot:pong') {
              this.pingResponseReceived = true;
              if (this.pingTimeoutId) {
                clearTimeout(this.pingTimeoutId);
                this.pingTimeoutId = null;
              }
              return;
            }

            if (message.event === 'bot:ping') {
              this.send({ event: 'bot:pong', data: { timestamp: Date.now() } });
              return;
            }

            this.onMessage?.(message as WebSocketPacket);
          } catch (err) {
            logger.error('Failed to parse WebSocket message', 'LicenseManager', err as Error);
          }
        };

        socket.onclose = (event) => {
          this._isConnecting = false;
          this._isWebSocketConnected = false;
          this.stopHeartbeat();
          this.stopKeepalive();

          if ([4001, 4002, 4003, 4004].includes(event.code)) {
            this.onFatalClose?.(event.code);
          } else {
            logger.debug(`WebSocket closed (code: ${event.code})`, 'LicenseManager');
            this.scheduleReconnect();
          }

          if (this.ws === socket) this.ws = null;
        };

        socket.onerror = (err) => {
          logger.debug(`WebSocket socket error: ${(err as any)?.message || 'connection glitch'}`, 'LicenseManager');
        };

        this.onConnected?.();

        if (!this.hasConnectedBefore) {
          logger.success(`🔗 Connected to FLM license server (${winningServer})`, 'LicenseManager', '🔓');
          this.hasConnectedBefore = true;
        }

        if ((global as any).onLicenseConnected) {
          (global as any).onLicenseConnected();
        }

        resolve();
        return;
      }

      this._isConnecting = false;
      this._isWebSocketConnected = false;
      this.scheduleReconnect();
      reject(new Error('Failed to connect to FLM license server (all candidates unreachable)'));
    });
  }

  disconnect(): void {
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this._isWebSocketConnected = false;
    this._isConnecting = false;
    this._isReconnecting = false;
    this.stopHeartbeat();
    this.stopKeepalive();
  }

  send(data: WebSocketPacket): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  sendInfoUpdate(payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ event: 'bot:update_info', data: payload }));
    } catch {}
  }

  sendLog(level: string, message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ event: 'bot:log', data: { level, message, botId: this.config.productId } }));
    } catch {}
  }

  sendUpdateProgress(step: number, label: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        event: 'bot:update_progress',
        data: { step, label, botId: this.config.productId, timestamp: Date.now() },
      }));
    } catch {}
  }

  sendBlacklistEvent(action: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ event: `blacklist:${action}`, data }));
    } catch {}
  }

  sendFederationEvent(action: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ event: `federation:${action}`, data }));
    } catch {}
  }

  startHeartbeat(): void {
    if (this._isHeartbeatRunning) return;
    this._isHeartbeatRunning = true;

    this.heartbeatIntervalId = setInterval(async () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        if (!this._isReconnecting) { try { await this.connect(); } catch {} }
        return;
      }

      try {
        const botInstance = this.getBotInstance();
        const publicIP = await getPublicIP(this.silent);
        this.send({
          event: 'bot:heartbeat',
          data: {
            licenseKey: this.config.key,
            botId: botInstance?.client?.user?.id || this.config.productId,
            timestamp: Date.now(),
            uptime: process.uptime(),
            info: {
              name: botInstance?.config?.name || 'FloofCore Reborn',
              version: getBotVersion(),
              publicIP: publicIP || 'unknown',
              guildCount: botInstance?.client?.guilds?.cache?.size || 0,
              guilds: botInstance?.client?.guilds?.cache?.map((g: any) => ({ id: g.id, name: g.name, icon: g.icon, iconUrl: g.iconURL?.({ size: 32 }) || null })) || [],
            },
          },
        });
        if (!this.silent) logger.debug('Heartbeat sent', 'LicenseManager');
      } catch (error) {
        if (!this.silent) logger.debug(`Heartbeat error: ${(error as Error).message}`, 'LicenseManager');
      }
    }, HEARTBEAT_INTERVAL);
  }

  stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    this._isHeartbeatRunning = false;
  }

  startKeepalive(): void {
    if (this.keepaliveIntervalId) clearInterval(this.keepaliveIntervalId);

    this.keepaliveIntervalId = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      this.pingResponseReceived = false;
      try {
        this.ws.send(JSON.stringify({ event: 'bot:ping', data: { timestamp: Date.now() } }));
      } catch {}

      this.pingTimeoutId = setTimeout(() => {
        if (!this.pingResponseReceived) {
          if (!this.silent) logger.warn('No pong received within timeout', 'LicenseManager');
          if (this.ws) {
            try { this.ws.close(1006, 'Ping timeout'); } catch {}
          }
        }
      }, PING_TIMEOUT);
    }, KEEPALIVE_INTERVAL);
  }

  stopKeepalive(): void {
    if (this.keepaliveIntervalId) {
      clearInterval(this.keepaliveIntervalId);
      this.keepaliveIntervalId = null;
    }
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId);
      this.pingTimeoutId = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.wsReconnectTimeout) clearTimeout(this.wsReconnectTimeout);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) { this._isReconnecting = false; return; }

    this._isReconnecting = true;
    this.wsReconnectAttempts++;

    const delay = this.wsReconnectAttempts === 1 ? 1000 : Math.min(3000 * Math.pow(2, Math.min(this.wsReconnectAttempts - 2, 4)), 30000);
    if (!this.silent) {
      logger.debug(`WebSocket reconnecting to ${this.serverUrl} in ${delay}ms...`, 'LicenseManager');
    }

    this.wsReconnectTimeout = setTimeout(() => {
      this._isReconnecting = false;
      this.connect().then(() => {
        if (!this.silent) logger.success('WebSocket reconnected successfully', 'LicenseManager', '📜');
        this.wsReconnectAttempts = 0;
      }).catch(() => {});
    }, delay);
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopKeepalive();
    if (this.wsReconnectTimeout) {
      clearTimeout(this.wsReconnectTimeout);
      this.wsReconnectTimeout = null;
    }
    this._isReconnecting = false;
    if (this.ws) {
      try {
        this.ws.close(1000, 'Process exiting');
      } catch {}
      this.ws = null;
    }
  }
}