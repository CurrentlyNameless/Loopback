import { logger } from '../utils/logger.ts';
import chalk from 'chalk';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ModuleManager } from '../managers/ModuleManager.ts';
import { getBotVersion } from '../utils/updateHelper.ts';
import { WebSocketClient } from './WebSocketClient.ts';
import type { WebSocketPacket, BotInstance } from './WebSocketClient.ts';
import { LicenseValidator } from './LicenseValidator.ts';
import { BackupManager } from './BackupManager.ts';
import { GuildConfigManager } from '../managers/GuildConfigManager.ts';

export interface LicenseConfig {
  key: string;
  productId: string;
  refreshInterval: number;
  version?: string;
  channel?: string;
  server?: string;
}

function isMasterKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return key.startsWith('MASTER-') || key.startsWith('MST-');
}

/**
 * Compatibility export for legacy calls or uncleaned server installs.
 * Floofcore Reborn now serves the dashboard directly on port 3000
 * without restricting localhost per license key tier.
 */
export function canUseLocalhost(_key?: string): boolean {
  return true;
}

interface LicenseState {
  valid: boolean;
  features: Record<string, boolean>;
  validated: boolean;
  error?: string;
  activeServer?: string;
  customerName?: string;
  tier?: string;
  version?: {
    current: string;
    latest: string;
    hasUpdate: boolean;
    downloadUrl?: string;
  };
  banned?: boolean;
  banReason?: string;
  strikes: number;
  maxGuilds?: number;
}

const DISCORD_SUPPORT_URL = 'https://discord.gg/EjUzF77RAs';

export class LicenseManager {
  static instance: LicenseManager;
  private config: LicenseConfig;
  private botInstance: BotInstance | null = null;
  private wsClient: WebSocketClient;
  private licenseValidator: LicenseValidator;
  private licenseStatus: LicenseState = {
    valid: false,
    features: {},
    validated: false,
    activeServer: undefined,
    strikes: 0,
  };

  static canLoadModule(moduleName: string): boolean {
    if (!LicenseManager.instance) return true;
    const features = LicenseManager.instance.licenseStatus?.features;
    if (!features || Object.keys(features).length === 0) return true;
    const target = moduleName.toLowerCase();
    if (features[target] === false) return false;
    return true;
  }

  static canUseLocalhost(_key?: string): boolean {
    return true;
  }

  constructor(config: LicenseConfig) {
    this.config = config;
    this.wsClient = new WebSocketClient(config, () => this.botInstance, this.silent);
    this.licenseValidator = new LicenseValidator(config);
    LicenseManager.instance = this;
    (global as any).licenseManager = this;

    this.wsClient.onConnected = () => this.onWsConnected();
    this.wsClient.onMessage = (packet) => this.handleMessage(packet);
    this.wsClient.onFatalClose = (code) => {
      const reason = code === 4004 ? 'Too many bot instances' : `License revoked (code: ${code})`;
      logger.error(`🔴 ${reason}`, 'LicenseManager');
      process.exit(1);
    };

    const cleanup = () => {
      try { this.wsClient.disconnect(); } catch {}
    };
    process.once('SIGINT', () => { cleanup(); process.exit(0); });
    process.once('SIGTERM', () => { cleanup(); process.exit(0); });
    process.once('beforeExit', cleanup);
  }

  private get silent(): boolean {
    return isMasterKey(this.config.key);
  }

  setBot(bot: BotInstance): void {
    this.botInstance = bot;

    if (bot && bot.client) {
      const client = bot.client;

      if (client.user) {
        this.syncFleetState();
      } else {
        client.once('ready', () => this.syncFleetState());
      }

      client.on('guildCreate', (guild: import("discord.js").Guild) => {
        // Reject blacklisted guilds upon join (Just log it, don't leave per user request)
        const badGuilds = (this.licenseStatus as any).badGuilds || [];
        if (Array.isArray(badGuilds) && badGuilds.some((bg: any) => bg.guildId === guild.id)) {
          logger.warn(`🚫 Blacklisted guild joined: ${guild.name} (${guild.id}). Bot features will be disabled for this server.`, 'LicenseManager');
          return;
        }

        const maxGuilds = this.licenseStatus.maxGuilds ?? Infinity;
        if (Number.isFinite(maxGuilds) && client.guilds.cache.size > maxGuilds) {
          logger.warn(`⚠️ At guild limit (${maxGuilds}). Leaving newly joined guild: ${guild.name} (${guild.id})`, 'LicenseManager');
          guild.leave().catch((err: Error) => logger.error(`Failed to leave guild ${guild.id}: ${err.message}`, 'LicenseManager'));
          return;
        }

        // Sync live guilds list with central FLM server
        this.syncFleetState();
      });

      client.on('guildDelete', (_guild: import("discord.js").Guild) => {
        // Sync live guilds list with central FLM server
        this.syncFleetState();
      });
    }
  }

  /**
   * Push current guild list + enforce maxGuilds against the live license
   * state. Runs on bot ready, guild join/leave, and whenever license:sync
   * changes maxGuilds so an admin lowering the limit takes effect immediately
   * instead of only on the bot's next reconnect.
   */
  private syncFleetState(): void {
    const client = this.botInstance?.client;
    if (!client || !client.user) return;

    const botId = client.user.id;
    const badGuilds = (this.licenseStatus as any).badGuilds || [];

    const guilds = client.guilds.cache.map((g: import("discord.js").Guild) => {
      const isBanned = Array.isArray(badGuilds) && badGuilds.some((bg: any) => bg.guildId === g.id);
      const bannedObj = Array.isArray(badGuilds) ? badGuilds.find((bg: any) => bg.guildId === g.id) : undefined;
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        iconUrl: g.iconURL?.({ size: 32 }) || null,
        status: isBanned ? 'banned' : 'active',
        banReason: isBanned ? (bannedObj?.reason || 'Suspended by FLM') : undefined,
      };
    });

    console.log(chalk.yellow(`\n📡  Synchronizing bot ID (${botId}) and ${guilds.length} guilds with central server...\n`));
    this.wsClient.sendInfoUpdate({
      botId,
      info: { botId, guildCount: guilds.length, guilds },
    });

    const maxGuilds = this.licenseStatus.maxGuilds ?? Infinity;
    if (Number.isFinite(maxGuilds) && client.guilds.cache.size > maxGuilds) {
      const excess = client.guilds.cache.size - maxGuilds;
      logger.warn(`⚠️ Guild limit (${maxGuilds}) exceeded by ${excess}. Leaving excess guilds...`, 'LicenseManager');
      const sorted = client.guilds.cache.sort((a: import("discord.js").Guild, b: import("discord.js").Guild) => (b.memberCount || 0) - (a.memberCount || 0));
      const toLeave = Array.from(sorted.values()).slice(maxGuilds);
      for (const guild of toLeave) {
        logger.warn(`Leaving guild: ${guild.name} (${guild.id})`, 'LicenseManager');
        guild.leave().catch((err: Error) => logger.error(`Failed to leave guild ${guild.id}: ${err.message}`, 'LicenseManager'));
      }
    }
  }

  async initialize(): Promise<void> {
    if (!this.config.key) {
      throw new Error('License key is required. Please provide a valid license key in config.yml.');
    }

    if (typeof this.config.key === 'boolean') {
      logger.error(`Invalid license key: ${this.config.key}. License key must be a string, not a boolean.`, 'LicenseManager');
      throw new Error('License key must be a string, not a boolean.');
    }

    if (this.silent) {
      logger.info('Validating license key (master key — output suppressed)...', 'LicenseManager', '🔐');
    } else {
      logger.info('Validating license key against FLM server...', 'LicenseManager', '🔐');
    }

    try {
      const result = await this.licenseValidator.validate();
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!result.valid) {
        const status = result.status || result.license?.status || 'unknown';
        const errorMsg = result.error ?? 'Invalid license key';
        const reason = result.reason || result.license?.reason;
        this.licenseStatus.status = status;
        this.licenseStatus.tier = result.license?.tier || 'Customer';
        this.licenseStatus.customerName = result.license?.discordUsername || result.license?.customerName || 'Unknown Owner';

        if (status === 'banned') {
          this.licenseStatus.banned = true;
          this.licenseStatus.banReason = reason || errorMsg;
          logger.warn(`🔴 LICENSE BANNED\n📋 Reason: ${reason || errorMsg}\n\nDiscord: ${DISCORD_SUPPORT_URL}`, 'LicenseManager', '🔑');
        } else if (status === 'expired') {
          logger.warn(`⏳ LICENSE EXPIRED\n📋 Reason: ${reason || errorMsg}`, 'LicenseManager', '🔑');
        } else if (status === 'deleted') {
          logger.warn(`🗑️ LICENSE DELETED\n📋 Reason: ${reason || errorMsg}`, 'LicenseManager', '🔑');
        } else {
          logger.warn(`❌ LICENSE INVALID\n${errorMsg}\nStatus: ${status}\nReason: ${reason || 'N/A'}`, 'LicenseManager', '🔑');
        }

        if (status === 'banned' || status === 'deleted' || status === 'expired') {
          try {
            const cachePath = join(process.cwd(), 'core/config/license.cache.json');
            if (existsSync(cachePath)) rmSync(cachePath, { force: true });
          } catch {}
        }

        throw new Error(`License validation failed: ${errorMsg} (Status: ${status}).`);
      }

      this.licenseStatus.valid = true;
      this.licenseStatus.validated = true;
      this.licenseStatus.features = result.license?.features ?? {};
      this.licenseStatus.strikes = result.license?.strikes ?? 0;
      this.licenseStatus.maxGuilds = result.license?.maxGuilds ?? Infinity;
      this.licenseStatus.customerName = (result.license as any)?.discordUsername || result.license?.customerName || 'Unknown Owner';
      this.licenseStatus.tier = (result.license as any)?.tier || 'Customer';
      if (result.badGuilds) {
        (this.licenseStatus as any).badGuilds = result.badGuilds;
      }

      if (result.version) {
        this.licenseStatus.version = {
          current: result.version.current,
          latest: result.version.latest,
          hasUpdate: result.version.hasUpdate,
          downloadUrl: result.version.downloadUrl,
        };
        (global as any).licenseStatus = this.licenseStatus;

        if (result.version.hasUpdate && result.version.downloadUrl) {
          logger.info(`Update available: v${result.version.current} → v${result.version.latest}`, 'LicenseManager');
        }
      }

      this.licenseStatus.activeServer = this.licenseValidator.getServerUrl();
      logger.debug(
        `License validated | Status: active | Server: ${this.licenseStatus.activeServer} | Strikes: ${this.licenseStatus.strikes}/5`,
        'LicenseManager',
        '🔓'
      );

      try {
        await this.wsClient.connect();
      } catch (wsErr: any) {
        logger.warn(`⚠️ WebSocket real-time sync deferred (${wsErr?.message || 'reconnecting in background'}) — license verified via HTTP.`, 'LicenseManager');
      }
    } catch (error) {
      throw error;
    }
  }

  getStatus(): string {
    return this.licenseStatus.valid ? 'valid' : 'invalid';
  }

  isBanned(): boolean {
    return this.licenseStatus.status?.toLowerCase() === 'banned';
  }

  isGuildBanned(guildId: string): { banned: boolean; reason?: string; addedBy?: string } {
    const badGuilds = (this.licenseStatus as any).badGuilds || [];
    const bg = Array.isArray(badGuilds) ? badGuilds.find((b: any) => b.guildId === guildId) : undefined;
    if (bg) return { banned: true, reason: bg.reason || 'Banned by FLM', addedBy: bg.addedBy || 'Floofcore Staff' };
    return { banned: false };
  }

  getBanReason(): string | undefined {
    return this.licenseStatus.banReason;
  }

  getCustomerName(): string {
    return this.licenseStatus.customerName || 'Unknown Owner';
  }

  getTier(): string {
    return this.licenseStatus.tier || 'Customer';
  }

  getMaxGuilds(): number | string {
    return this.licenseStatus.maxGuilds ?? Infinity;
  }

  getStrikes(): number {
    return this.licenseStatus.strikes;
  }

  isConnected(): boolean {
    return this.wsClient.isWebSocketConnected;
  }

  getActiveServerUrl(): string {
    return this.licenseStatus.activeServer || this.config.server || 'http://localhost:3000';
  }

  private onWsConnected(): void {
    const botVersion = getBotVersion();
    const botInstance = this.botInstance;

    const publicIP = undefined;
    this.wsClient.send({
      event: 'bot:auth',
      data: {
        licenseKey: this.config.key,
        botId: botInstance?.client?.user?.id || this.config.productId,
        info: {
          name: botInstance?.config?.name || 'FloofCore Reborn',
          version: botVersion,
          tier: 'customer',
          platform: process.platform,
          nodeVersion: process.version,
          publicIP: 'unknown',
          dashboardPort: process.env.PORT || 3000,
          guildCount: botInstance?.client?.guilds?.cache?.size || 0,
          guilds: botInstance?.client?.guilds?.cache?.map((g: import("discord.js").Guild) => ({ id: g.id, name: g.name, icon: g.icon, iconUrl: g.iconURL?.({ size: 32 }) || null })) || [],
        },
      },
    });

    this.wsClient.startHeartbeat();
    this.wsClient.startKeepalive();

    const updatedFlag = join(process.cwd(), '.updated-flag');
    if (existsSync(updatedFlag)) {
      setTimeout(() => {
        this.wsClient.sendUpdateProgress(8, `Update to v${botVersion} complete! Bot online.`);
      }, 1000);
    }
  }

  private handleMessage(message: WebSocketPacket): void {
    switch (message.event) {
      case 'bot:auth_success': {
        if (message.data?.badGuilds && Array.isArray(message.data.badGuilds)) {
          (this.licenseStatus as any).badGuilds = message.data.badGuilds;
          const client = this.botInstance?.client;
          if (client) {
            for (const bg of message.data.badGuilds) {
              const matchGuild = client.guilds.cache.get(bg.guildId);
              if (matchGuild) {
                logger.warn(`🚫 Blacklisted guild detected: ${matchGuild.name} (${matchGuild.id}) [Reason: ${bg.reason || 'Banned by FLM'}]. Bot features will be disabled for this server.`, 'LicenseManager');
              }
            }
          }
        }
        break;
      }

      case 'bot:domain_update': {
        break;
      }

      case 'bot:reconnect': {
        const targetUrl = message.data?.url;
        if (targetUrl) {
          logger.info(`Reconnect command received for: ${targetUrl}`, 'LicenseManager');
          this.wsClient.disconnect();
        }
        break;
      }

      case 'bot:shutdown': {
        const reason = message.data?.reason || 'unknown';
        const shutdownMessage = message.data?.message || 'No message provided';
        const banReason = message.data?.banReason;
        logger.error('🔴 LICENSE SHUTDOWN RECEIVED', 'LicenseManager');
        logger.error(`Reason: ${reason}`, 'LicenseManager');
        logger.error(`Message: ${shutdownMessage}`, 'LicenseManager');
        if (banReason) logger.error(`Ban Reason: ${banReason}`, 'LicenseManager');
        process.exit(1);
        break;
      }

      case 'bot:restart':
        logger.warn('Restart command received, restarting bot...', 'LicenseManager');
        process.exit(0);
        break;

      case 'bot:kick_guild': {
        const { guildId, guildName } = message.data || {};
        if (!guildId) break;
        const client = this.botInstance?.client;
        const guild = client?.guilds?.cache?.get(guildId);
        if (!guild) { logger.warn(`Cannot kick guild ${guildId} — not in guild`, 'LicenseManager'); break; }
        logger.info(`👢 Kicking guild: ${guild.name} (${guild.id})`, 'LicenseManager');
        guild.leave().then(() => logger.success(`Left guild ${guild.name} (${guild.id})`, 'LicenseManager'))
          .catch((err: Error) => logger.error(`Failed to leave guild ${guild.id}: ${err.message}`, 'LicenseManager'));
        break;
      }

      case 'bot:ban_guild': {
        const banData = message.data || {};
        const { guildId: banGuildId, guildName: banGuildName, reason: banReason } = banData;
        if (!banGuildId) break;
        const currentBad = (this.licenseStatus as any).badGuilds || [];
        if (!currentBad.some((bg: any) => bg.guildId === banGuildId)) {
          currentBad.push({ guildId: banGuildId, guildName: banGuildName, reason: banReason || 'Banned from dashboard' });
          (this.licenseStatus as any).badGuilds = currentBad;
        }
        logger.warn(`🚫 Guild banned & quarantined via FLM WebSocket: ${banGuildName || banGuildId} (Reason: ${banReason || 'Banned by FLM'})`, 'LicenseManager');
        this.syncFleetState();
        break;
      }

      case 'blacklist:badguild_remove': {
        const { guildId } = (message.data as any) || {};
        if (guildId) {
          const currentBad = (this.licenseStatus as any).badGuilds || [];
          (this.licenseStatus as any).badGuilds = currentBad.filter((bg: any) => bg.guildId !== guildId);
          console.log(chalk.yellow(`\n✅  Guild unbanned & restored via central FLM WebSocket: ${guildId}\n`));
          this.syncFleetState();
        }
        break;
      }

      case 'bot:request_info': {
        this.syncFleetState();
        break;
      }

      case 'guild:request_config': {
        const { guildId } = (message.data as any) || {};
        if (!guildId) break;
        const config = GuildConfigManager.getGuildConfig(guildId);
        this.wsClient.send({
          event: 'guild:config_data',
          data: { guildId, config },
        });
        break;
      }

      case 'guild:config_update': {
        const { guildId, moduleId, config, fullConfig } = (message.data as any) || {};
        if (!guildId) break;

        let result: { success: boolean; config?: any };
        if (fullConfig && typeof fullConfig === 'object') {
          result = GuildConfigManager.saveFullGuildConfig(guildId, fullConfig);
        } else if (moduleId) {
          result = GuildConfigManager.saveModuleConfig(guildId, moduleId, config || {});
        } else {
          result = { success: false };
        }

        this.wsClient.send({
          event: 'guild:config_saved',
          data: {
            guildId,
            moduleId,
            config: result.config || config || fullConfig,
            success: result.success,
          },
        });
        break;
      }

      case 'guild:tier_update': {
        const { tier } = (message.data as any) || {};
        if (tier) {
          this.licenseStatus.tier = tier;
          logger.info(`Guild tier synchronized from FLM: ${tier}`, 'LicenseManager');
        }
        break;
      }

      case 'bot:remote_exec': {
        const { execId, command, payload } = (message.data as any) || {};
        if (!command) break;

        const startTime = Date.now();
        const cmdLower = String(command).trim().toLowerCase();
        let output = '';
        let success = true;

        try {
          if (cmdLower === 'stats' || cmdLower === 'status') {
            const mem = process.memoryUsage();
            const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
            const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
            const rssMB = (mem.rss / 1024 / 1024).toFixed(1);
            const client = this.botInstance?.client;
            const guildsCount = client?.guilds?.cache?.size ?? 0;
            const usersCount = client?.guilds?.cache?.reduce((acc: number, g: any) => acc + (g.memberCount || 0), 0) ?? 0;
            const uptimeHours = (process.uptime() / 3600).toFixed(2);
            const wsPing = client?.ws?.ping ?? 0;

            output = [
              `📊 Node Diagnostics & Memory Profile:`,
              `  • Heap Usage : ${heapUsedMB} MB / ${heapTotalMB} MB (RSS: ${rssMB} MB)`,
              `  • Guild Count: ${guildsCount} active servers (${usersCount} cached members)`,
              `  • Bot Uptime : ${uptimeHours} hours`,
              `  • WS Latency : ${wsPing}ms (Discord Gateway)`,
              `  • Runtime    : Node ${process.version} (${process.platform} ${process.arch})`,
            ].join('\n');
          } else if (cmdLower === 'reload' || cmdLower === 'reload_modules') {
            const loaded = (ModuleManager as any).getLoadedModules?.() || [];
            output = `⚡ Module system reload signaled. ${loaded.length} modules active in memory.`;
          } else if (cmdLower === 'gc') {
            const before = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
            if (global.gc) {
              global.gc();
              const after = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
              output = `🧹 Garbage Collection triggered. Heap reduced from ${before} MB → ${after} MB.`;
            } else {
              output = `🧹 Heap snapshot: ${before} MB. (Automatic memory management active)`;
            }
          } else if (cmdLower === 'ping') {
            const client = this.botInstance?.client;
            const ping = client?.ws?.ping ?? 0;
            output = `🏓 Discord Gateway Ping: ${ping}ms | FLM License Gateway: Online`;
          } else {
            output = `Executed remote command: ${command}`;
          }
        } catch (err: any) {
          success = false;
          output = `❌ Execution failed: ${err.message}`;
        }

        const durationMs = Date.now() - startTime;
        this.wsClient.send({
          event: 'bot:remote_exec_result' as any,
          data: {
            execId,
            command,
            output,
            success,
            durationMs,
            timestamp: new Date().toISOString(),
          },
        });
        break;
      }

      case 'bot:update': {
        const dlUrl = message.data?.downloadUrl;
        const updateType = message.data?.type || 'delta';
        const updateVer = message.data?.version || 'latest';
        
        // Ensure banned guild instances do not process live OTA updates
        const cfgGuildId = this.botInstance?.config?.discord?.guildId;
        if (cfgGuildId && this.isGuildBanned(cfgGuildId).banned) {
          logger.warn(`🚫 Live OTA update v${updateVer} skipped: Configured guild (${cfgGuildId}) is banned.`, 'LicenseManager');
          this.wsClient.sendUpdateProgress(-1, 'Update rejected — configured guild is banned');
          break;
        }

        if (!dlUrl) {
          logger.warn('Live update packet received but missing download URL', 'LicenseManager');
          break;
        }

        logger.info(`📥 Live ${updateType.toUpperCase()} update v${updateVer} broadcast received — downloading from ${dlUrl}...`, 'LicenseManager');
        this.wsClient.sendUpdateProgress(1, `Step 1 — Downloading ${updateType} update package (v${updateVer})`);
        
        (async () => {
          try {
            const res = await fetch(dlUrl);
            if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
            const buf = await res.arrayBuffer();
            const zipPath = join(process.cwd(), 'update.zip');
            writeFileSync(zipPath, Buffer.from(buf));
            
            logger.info(`📦 ${updateType === 'delta' ? 'Delta' : 'Full'} update package downloaded (${(buf.byteLength / 1024 / 1024).toFixed(2)} MB). Applying with rollback safeguards...`, 'LicenseManager');
            const { applyBotUpdate } = await import('./updateHelper.ts');
            const self = this;
            const success = await applyBotUpdate(zipPath, updateVer !== 'latest' ? updateVer : undefined, (step, label) => {
              const fleetStep = Math.min(step + 1, 7);
              self.wsClient.sendUpdateProgress(fleetStep, label);
            });

            if (success) {
              this.wsClient.sendUpdateProgress(8, `Step 8 — Complete v${updateVer} & Safe Reboot`);
              logger.success(`🎉 ${updateType === 'delta' ? 'Delta' : 'Full'} update v${updateVer} applied successfully! Initiating container restart...`, 'LicenseManager');
              await new Promise(r => setTimeout(r, 600));
              const { safeContainerReboot } = await import('./updateHelper.ts');
              await safeContainerReboot(1000);
            } else {
              logger.error(`❌ Update to v${updateVer} failed — previous installation restored from backup`, 'LicenseManager');
              this.wsClient.sendUpdateProgress(-1, 'Update failed — rolled back safely');
            }
          } catch (e: any) {
            logger.error(`❌ Live update failed: ${e.message}`, 'LicenseManager');
            this.wsClient.sendUpdateProgress(-1, `Update failed: ${e.message}`);
          }
        })();
        break;
      }

      case 'bot:log':
        if (!this.silent) logger.debug(`Log event: ${JSON.stringify(message.data)}`, 'LicenseManager');
        break;

      case 'bot:strike_update':
        if (message.data?.strikes !== undefined) {
          this.licenseStatus.strikes = message.data.strikes as number;
          const strikeReason = message.data?.reason || 'No reason provided';
          logger.error(`⚠️ LICENSE STRIKE: ${this.licenseStatus.strikes}/5 — ${strikeReason}`, 'LicenseManager');
        }
        break;

      // ── Live license property sync ──
      // Fired by the dashboard whenever an admin edits this license (tier,
      // features, guild/session limits, expiry, strikes). Merges into local
      // state immediately instead of waiting for the next validate/reconnect.
      case 'license:sync': {
        const patch = message.data || {};
        let guildLimitChanged = false;

        if (patch.tier !== undefined) this.licenseStatus.tier = patch.tier as string;
        if (patch.features !== undefined) this.licenseStatus.features = patch.features as Record<string, boolean>;
        if (patch.strikes !== undefined) this.licenseStatus.strikes = patch.strikes as number;
        if (patch.maxGuilds !== undefined) {
          const nextMax = patch.maxGuilds as number;
          guildLimitChanged = nextMax !== this.licenseStatus.maxGuilds;
          this.licenseStatus.maxGuilds = nextMax;
        }
        if (patch.banned === false) {
          this.licenseStatus.banned = false;
          this.licenseStatus.banReason = undefined;
        }

        logger.info(
          `📡 License synced live from FLM dashboard (tier: ${this.licenseStatus.tier}, maxGuilds: ${this.licenseStatus.maxGuilds}, strikes: ${this.licenseStatus.strikes}/5)`,
          'LicenseManager'
        );

        // A shrunk guild limit should take effect right away, not on next reconnect.
        if (guildLimitChanged) this.syncFleetState();
        break;
      }

      case 'blacklist:add': {
        const { userId, reason, addedBy, addedAt, flags, evidence } = message.data || {};
        if (!userId) break;
        logger.info(`📡 Remote blacklist add: ${userId} reason="${reason}"`, 'Blacklist');
        const blModule = ModuleManager.getModule('blacklist') as any;
        if (blModule) {
          (async () => {
            try {
              await blModule.repo.addRemote({ userId, reason, addedBy, addedAt: addedAt ? new Date(addedAt as string) : new Date(), flags, evidence });
              if (blModule.checkAndBanFromGuilds && blModule.config?.enabled) {
                const count = await blModule.checkAndBanFromGuilds(userId, reason || 'Global blacklist', addedBy || 'Remote', flags, evidence);
                if (count > 0) logger.info(`📡 Remote ban: ${userId} from ${count} guild(s) on this bot`, 'Blacklist');
              }
            } catch (e: any) {
              logger.error(`Failed to apply remote blacklist add for ${userId}: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:remove': {
        const { userId } = message.data || {};
        if (!userId) break;
        logger.info(`📡 Remote blacklist remove: ${userId}`, 'Blacklist');
        const blMod = ModuleManager.getModule('blacklist') as any;
        if (blMod && blMod._client) {
          (async () => {
            try {
              let guildsToUnban: string[] = [];
              const existing = await blMod.repo.get(userId);
              if (existing?.guilds) {
                guildsToUnban = existing.guilds;
              }
              await blMod.repo.removeRemote(userId);
              await blMod.repo.addToWhitelist(userId, "System (remote sync)", "Removed via remote sync");
              for (const guildId of guildsToUnban) {
                const guild = blMod._client!.guilds.cache.get(guildId);
                if (!guild) continue;
                try {
                  await guild.members.unban(userId, 'Removed from blacklist (remote sync)');
                  logger.info(`📡 Remote unban: ${userId} from "${guild.name}"`, 'Blacklist');
                } catch (e: any) {
                  if (e?.code !== 10026 && e?.code !== 50013) {
                    logger.debug(`Remote unban failed in "${guild.name}": ${e?.message}`, 'Blacklist');
                  }
                }
              }
            } catch (e: any) {
              logger.error(`Failed to apply remote blacklist remove for ${userId}: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:addnote': {
        const { userId: noteUserId, note } = message.data || {};
        if (!noteUserId) break;
        const anMod = ModuleManager.getModule('blacklist') as any;
        if (anMod) {
          (async () => {
            try {
              await anMod.repo.addNoteRemote(noteUserId, note);
            } catch (e: any) {
              logger.error(`Failed to apply remote note add: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:settrust': {
        const { userId: trustUserId, score } = message.data || {};
        if (!trustUserId) break;
        const stMod = ModuleManager.getModule('blacklist') as any;
        if (stMod) {
          (async () => {
            try {
              await stMod.repo.setTrustScoreRemote(trustUserId, score);
            } catch (e: any) {
              logger.error(`Failed to apply remote trust score: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:setflags': {
        const { userId: flagsUserId, flags } = message.data || {};
        if (!flagsUserId) break;
        const sfMod = ModuleManager.getModule('blacklist') as any;
        if (sfMod) {
          (async () => {
            try {
              await sfMod.repo.setFlagsRemote(flagsUserId, flags);
            } catch (e: any) {
              logger.error(`Failed to apply remote flags: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:guild_whitelist_add': {
        const gwData = message.data || {};
        if (!gwData.userId || !gwData.guildId) break;
        const gwMod = ModuleManager.getModule('blacklist') as any;
        if (gwMod) {
          (async () => {
            try {
              await gwMod.repo.addGuildWhitelistRemote(gwData.userId, gwData.guildId, gwData.addedBy || 'remote', gwData.reason || '');
            } catch (e: any) {
              logger.error(`Failed to apply guild whitelist add: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:guild_whitelist_remove': {
        const gwrData = message.data || {};
        if (!gwrData.userId || !gwrData.guildId) break;
        const gwrMod = ModuleManager.getModule('blacklist') as any;
        if (gwrMod) {
          (async () => {
            try {
              await gwrMod.repo.removeGuildWhitelistRemote(gwrData.userId, gwrData.guildId);
            } catch (e: any) {
              logger.error(`Failed to apply guild whitelist remove: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:badguild_add': {
        const bgData = message.data || {};
        if (!bgData.guildId) break;
        logger.info(`📡 Remote bad guild add: ${bgData.guildId}`, 'Blacklist');
        const bgMod = ModuleManager.getModule('blacklist') as any;
        if (bgMod) {
          (async () => {
            try {
              await bgMod.badGuildRepo.addRemote(bgData);
            } catch (e: any) {
              logger.error(`Failed to apply remote bad guild add: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:badguild_remove': {
        const { guildId } = message.data || {};
        if (!guildId) break;
        logger.info(`📡 Remote bad guild remove: ${guildId}`, 'Blacklist');
        const bgMod2 = ModuleManager.getModule('blacklist') as any;
        if (bgMod2) {
          (async () => {
            try {
              await bgMod2.badGuildRepo.removeRemote(guildId);
            } catch (e: any) {
              logger.error(`Failed to apply remote bad guild remove: ${e?.message}`, 'Blacklist');
            }
          })();
        }
        break;
      }

      case 'blacklist:verify_user_request': {
        const { transactionId, userId, username, discriminator, guildId, userGuilds } = message.data || {};
        logger.info(`🔑 Received remote verification scan request for user: ${username}#${discriminator || '0'} (${userId}) in guild: ${guildId}`, 'Blacklist');
        const blacklistModule = ModuleManager.getModule('blacklist') as any;

        if (!blacklistModule) {
          this.wsClient.send({
            event: 'blacklist:verify_user_response',
            data: { transactionId, success: false, message: 'Blacklist module is not loaded on this bot instance.' }
          } as WebSocketPacket);
          break;
        }

        (async () => {
          try {
            const badGuilds = await blacklistModule.badGuildRepo.getAll();
            const foundBadGuild = userGuilds.find((g: any) => badGuilds.some((bg: any) => bg.guildId === g.id));

            if (foundBadGuild) {
              const targetGuild = this.botInstance?.client?.guilds?.cache?.get(guildId);
              if (targetGuild) {
                const banReason = `[OAuth2 Flagged] Member of flagged server "${foundBadGuild.name}" (${foundBadGuild.id})`;
                await targetGuild.members.ban(userId, { reason: banReason }).catch(() => null);

                const userTag = `${username}#${discriminator || '0'}`;
                await blacklistModule.repo.add({
                  userId,
                  reason: banReason,
                  addedBy: "System (OAuth2 Verification)",
                  addedAt: new Date(),
                });
                await blacklistModule.logBlacklistBan(
                  this.botInstance.client,
                  userId,
                  userTag,
                  banReason,
                  "System",
                  targetGuild.name,
                  targetGuild.id,
                  "on_join"
                );
              }

              this.wsClient.send({
                event: 'blacklist:verify_user_response',
                data: {
                  transactionId,
                  success: false,
                  message: `Access Denied: You are a member of a flagged/malicious server: ${foundBadGuild.name}. You have been banned.`
                }
              } as WebSocketPacket);
              return;
            }

            const targetGuild = this.botInstance?.client?.guilds?.cache?.get(guildId);
            if (targetGuild) {
              const memberObj = await targetGuild.members.fetch(userId).catch(() => null);
              if (memberObj) {
                const verifiedRole = targetGuild.roles.cache.find((r: any) =>
                  r.name.toLowerCase() === 'verified' ||
                  r.name.toLowerCase() === 'member' ||
                  r.name.toLowerCase() === 'tester'
                );
                if (verifiedRole) {
                  await memberObj.roles.add(verifiedRole).catch(() => null);
                }
              }
            }

            logger.success(`User ${username} (${userId}) successfully verified via remote Central OAuth2. 0 bad guilds matched.`, 'Blacklist');
            this.wsClient.send({
              event: 'blacklist:verify_user_response',
              data: { transactionId, success: true }
            } as WebSocketPacket);
          } catch (e: any) {
            logger.error(`Remote verification handler error: ${e?.message}`, 'Blacklist');
            this.wsClient.send({
              event: 'blacklist:verify_user_response',
              data: { transactionId, success: false, message: 'Internal server error occurred during remote verification.' }
            } as WebSocketPacket);
          }
        })();
        break;
      }

      case 'federation:chat_message': {
        const fedMsg = message.data || {};
        if (!fedMsg.targetGuildId || !fedMsg.targetChannelId) break;
        logger.info(`📡 Remote federation chat message for guild ${fedMsg.targetGuildId}`, 'Federation');
        const fedModMsg = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModMsg && typeof fedModMsg.handleRemoteChatMessage === 'function') {
          (async () => {
            try {
              await fedModMsg.handleRemoteChatMessage(fedMsg);
            } catch (e: any) {
              logger.error(`Failed remote federation chat: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:chat_message_delete': {
        const fedDel = message.data || {};
        if (!fedDel.targetGuildId) break;
        const fedModDel = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModDel && typeof fedModDel.handleRemoteMessageDelete === 'function') {
          (async () => {
            try {
              await fedModDel.handleRemoteMessageDelete(fedDel);
            } catch (e: any) {
              logger.error(`Failed remote federation message delete: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:ban_sync': {
        const fedBan = message.data || {};
        if (!fedBan.targetGuildId || !fedBan.userId) break;
        logger.info(`📡 Remote federation ban sync: ${fedBan.userTag || fedBan.userId} -> ${fedBan.targetGuildId}`, 'Federation');
        const fedModBan = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModBan && typeof fedModBan.handleRemoteBanSync === 'function') {
          (async () => {
            try {
              await fedModBan.handleRemoteBanSync(fedBan);
            } catch (e: any) {
              logger.error(`Failed remote federation ban sync: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:ban_unsync': {
        const fedUnban = message.data || {};
        if (!fedUnban.targetGuildId || !fedUnban.userId) break;
        const fedModUnban = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModUnban && typeof fedModUnban.handleRemoteBanUnsync === 'function') {
          (async () => {
            try {
              await fedModUnban.handleRemoteBanUnsync(fedUnban);
            } catch (e: any) {
              logger.error(`Failed remote federation ban unsync: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:link_created': {
        const fedLink = message.data || {};
        const fedModLink = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModLink && typeof fedModLink.handleRemoteLinkCreated === 'function') {
          (async () => {
            try {
              await fedModLink.handleRemoteLinkCreated(fedLink);
            } catch (e: any) {
              logger.error(`Failed remote federation link created: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:relay_message': {
        const fedRelay = message.data || {};
        if (!fedRelay.relayGroup || !fedRelay.content?.length && !fedRelay.attachments && !fedRelay.embeds) break;
        const fedModRelay = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModRelay && typeof fedModRelay.handleRemoteRelayMessage === 'function') {
          (async () => {
            try {
              await fedModRelay.handleRemoteRelayMessage(fedRelay);
            } catch (e: any) {
              logger.error(`Failed remote relay message: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:admin_disable_relay': {
        const disableData = message.data || {};
        const selfBotId = this.botInstance?.client?.user?.id || this.config.productId;
        logger.info(`FLM dashboard requested disable relay for bot ${disableData.targetBotId}`, 'Federation');
        if (disableData.targetBotId && disableData.targetBotId === selfBotId) {
          const fedModDisable = ModuleManager.getModule('cross-chat-relay') as any;
          if (fedModDisable && typeof fedModDisable.handleAdminDisableRelay === 'function') {
            (async () => {
              try {
                await fedModDisable.handleAdminDisableRelay();
                logger.info('Relay disabled via FLM dashboard', 'Federation');
              } catch (e: any) {
                logger.error(`Failed to disable relay via dashboard: ${e?.message}`, 'Federation');
              }
            })();
          }
        }
        break;
      }

      case 'federation:admin_broadcast': {
        const bcData = message.data || {};
        const fedModBC = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModBC && typeof fedModBC.handleAdminBroadcast === 'function') {
          (async () => {
            try {
              await fedModBC.handleAdminBroadcast(bcData);
            } catch (e: any) {
              logger.error(`Failed admin broadcast: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:relay_ban_user': {
        const banData = message.data || {};
        const fedModBan = ModuleManager.getModule('cross-chat-relay') as any;
        if (fedModBan && typeof fedModBan.handleRelayBanUser === 'function') {
          (async () => {
            try {
              await fedModBan.handleRelayBanUser(banData);
            } catch (e: any) {
              logger.error(`Failed relay ban user: ${e?.message}`, 'Federation');
            }
          })();
        }
        break;
      }

      case 'federation:admin_enable_relay': {
        const enableData = message.data || {};
        const selfBotId = this.botInstance?.client?.user?.id || this.config.productId;
        logger.info(`FLM dashboard requested relay re-enable for bot ${enableData.targetBotId}`, 'Federation');
        if (enableData.targetBotId && enableData.targetBotId === selfBotId) {
          const fedModEnable = ModuleManager.getModule('cross-chat-relay') as any;
          if (fedModEnable && typeof fedModEnable.handleAdminEnableRelay === 'function') {
            (async () => {
              try {
                await fedModEnable.handleAdminEnableRelay();
                logger.info('Relay re-enabled via FLM dashboard', 'Federation');
              } catch (e: any) {
                logger.error(`Failed to re-enable relay via dashboard: ${e?.message}`, 'Federation');
              }
            })();
          }
        }
        break;
      }

      case 'bot:create_backup': {
        const backupData = message.data || {};
        const { guildId, guildName, label, isAuto } = backupData;
        if (!guildId) break;
        logger.info(`📥 Backup requested for guild ${guildName || guildId}`, 'FlmBackup');
        (async () => {
          let zipPath = '';
          try {
            zipPath = join(process.cwd(), 'backups', `backup_${Date.now()}.zip`);
            mkdirSync(join(process.cwd(), 'backups'), { recursive: true });
            BackupManager.createZipBackup(zipPath);
            const serverUrl = this.config.server || 'http://localhost:3000';
            const result = await BackupManager.uploadZip(zipPath, serverUrl, this.config.key, guildId, guildName || 'Unknown', label || `Backup ${new Date().toLocaleString()}`, !!isAuto);
            this.wsClient.send({
              event: 'backup:zip_ready',
              data: {
                guildId,
                guildName: guildName || 'Unknown',
                backupId: result.backupId,
                success: true,
              },
            } as WebSocketPacket);
            logger.success(`✅ Backup zip uploaded for guild ${guildName || guildId}`, 'FlmBackup');
          } catch (e: any) {
            logger.error(`❌ Backup zip failed for guild ${guildId}: ${e.message}`, 'FlmBackup');
            this.wsClient.send({
              event: 'backup:zip_ready',
              data: { guildId, guildName, success: false, error: e.message },
            } as WebSocketPacket);
          } finally {
            if (zipPath && existsSync(zipPath)) {
              try { rmSync(zipPath, { force: true }); } catch {}
            }
          }
        })();
        break;
      }

      case 'bot:restore_backup': {
        const restoreData = message.data || {};
        const { guildId: rGuildId, guildName: rGuildName, backupId, downloadUrl, data: rData } = restoreData;

        // Zip-based restore
        if (downloadUrl) {
          logger.info(`🔄 Restore from zip: backup ${backupId} for ${rGuildName || rGuildId}`, 'FlmBackup');
          (async () => {
            try {
              await BackupManager.restoreFromZip(downloadUrl);
              this.wsClient.send({
                event: 'backup:restore_result',
                data: { backupId, guildId: rGuildId, success: true },
              } as WebSocketPacket);
              logger.success(`✅ Restore from zip completed for ${rGuildName || rGuildId}`, 'FlmBackup');
            } catch (e: any) {
              logger.error(`❌ Restore from zip failed: ${e.message}`, 'FlmBackup');
              this.wsClient.send({
                event: 'backup:restore_result',
                data: { backupId, guildId: rGuildId, success: false, errors: [e.message] },
              } as WebSocketPacket);
            }
          })();
          break;
        }

        // Legacy JSON backup restore
        if (!rGuildId || !rData) break;
        logger.info(`🔄 Restore requested (legacy) for guild ${rGuildName || rGuildId} from backup ${backupId}`, 'FlmBackup');
        (async () => {
          try {
            const result = await BackupManager.apply(rGuildId, rData);
            this.wsClient.send({
              event: 'backup:restore_result',
              data: {
                backupId,
                guildId: rGuildId,
                success: result.success,
                errors: result.errors,
              },
            } as WebSocketPacket);
            if (result.success) {
              logger.success(`✅ Restore completed for guild ${rGuildName || rGuildId}`, 'FlmBackup');
            } else {
              logger.warn(`⚠️ Restore completed with errors for guild ${rGuildId}: ${result.errors.join('; ')}`, 'FlmBackup');
            }
          } catch (e: any) {
            logger.error(`❌ Restore failed for guild ${rGuildId}: ${e.message}`, 'FlmBackup');
            this.wsClient.send({
              event: 'backup:restore_result',
              data: { backupId, guildId: rGuildId, success: false, errors: [e.message] },
            } as WebSocketPacket);
          }
        })();
        break;
      }
    }
  }
}

export function getKnownServerUrls(): string[] {
  const list: string[] = [];
  try {
    const { ConfigManager } = require('../managers/ConfigManager.ts');
    const cfg = ConfigManager.get();
    if (cfg?.license?.server) list.push(cfg.license.server);
  } catch {}

  list.push(
    'https://flm.moonmallow.dev',
    'http://flm.moonmallow.dev:2053',
    'http://216.220.236.104:2053',
    'http://localhost:2053',
    'http://127.0.0.1:2053',
    'https://flm.hectort.xyz',
    'https://flm.disparityurl.space'
  );
  return Array.from(new Set(list));
}

export function initLicenseManager(config: LicenseConfig): LicenseManager {
  const lm = new LicenseManager(config);
  LicenseManager.instance = lm;
  (global as any).licenseManager = lm;
  return lm;
}