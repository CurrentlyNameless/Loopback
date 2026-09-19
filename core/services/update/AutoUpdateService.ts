import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { Logger } from '../../utils/logger.ts';
import { applyBotUpdate } from '../../utils/updateHelper.ts';

export type PollUnit = 'hours' | 'days' | 'weeks' | 'months';

export interface UpdatePollInterval {
  value: number;
  unit: PollUnit;
}

export interface UpdatesConfig {
  enabled: boolean;
  channel: 'stable' | 'beta';
  autoApply: boolean;
  pollInterval: UpdatePollInterval;
  lastCheck?: string | null;
  lastUpdateFound?: string | null;
  backupExcludes?: string[];
}

export class AutoUpdateService {
  private static instance: AutoUpdateService | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isChecking: boolean = false;
  private config: UpdatesConfig;
  private bot: any = null;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): AutoUpdateService {
    if (!AutoUpdateService.instance) {
      AutoUpdateService.instance = new AutoUpdateService();
    }
    return AutoUpdateService.instance;
  }

  public setBotInstance(bot: any) {
    this.bot = bot;
  }

  public getConfig(): UpdatesConfig {
    return this.config;
  }

  /**
   * Convert interval value and unit to milliseconds (min 15 minutes).
   */
  public static intervalToMs(value: number, unit: PollUnit): number {
    const val = Math.max(1, Number(value) || 1);
    switch (unit) {
      case 'hours':
        return val * 60 * 60 * 1000;
      case 'days':
        return val * 24 * 60 * 60 * 1000;
      case 'weeks':
        return val * 7 * 24 * 60 * 60 * 1000;
      case 'months':
        return val * 30 * 24 * 60 * 60 * 1000;
      default:
        return val * 60 * 60 * 1000;
    }
  }

  /**
   * Load updates config from bot or config.yml
   */
  public loadConfig(): UpdatesConfig {
    const defaults: UpdatesConfig = {
      enabled: false,
      channel: 'beta',
      autoApply: false,
      pollInterval: {
        value: 6,
        unit: 'hours',
      },
      lastCheck: null,
      lastUpdateFound: null,
    };

    try {
      const cfgPath = path.resolve(process.cwd(), 'config.yml');
      if (existsSync(cfgPath)) {
        const { parse } = require('yaml');
        const raw = readFileSync(cfgPath, 'utf-8');
        const parsed = parse(raw);
        if (parsed?.updates) {
          const u = parsed.updates;
          return {
            enabled: Boolean(u.enabled),
            channel: u.channel === 'stable' ? 'stable' : 'beta',
            autoApply: Boolean(u.autoApply),
            pollInterval: {
              value: Math.max(1, Number(u.pollInterval?.value) || 6),
              unit: ['hours', 'days', 'weeks', 'months'].includes(u.pollInterval?.unit)
                ? u.pollInterval.unit
                : 'hours',
            },
            lastCheck: u.lastCheck || null,
            lastUpdateFound: u.lastUpdateFound || null,
            backupExcludes: u.backupExcludes || [],
          };
        }
      }
    } catch (e: any) {
      Logger.warn(`AutoUpdateService: Could not parse config.yml: ${e.message}`, 'AutoUpdate');
    }

    return defaults;
  }

  /**
   * Update configuration and restart background poll timer
   */
  public updateConfig(newUpdates: Partial<UpdatesConfig>): UpdatesConfig {
    this.config = {
      ...this.config,
      ...newUpdates,
      pollInterval: {
        ...this.config.pollInterval,
        ...(newUpdates.pollInterval || {}),
      },
    };

    // Persist to config.yml while preserving all ASCII banners, comments, and spacing
    try {
      const cfgPath = path.resolve(process.cwd(), 'config.yml');
      if (existsSync(cfgPath)) {
        const { parseDocument } = require('yaml');
        const raw = readFileSync(cfgPath, 'utf-8');
        const doc = parseDocument(raw);
        if (!doc.has('updates')) {
          doc.set('updates', {});
        }
        doc.setIn(['updates', 'enabled'], this.config.enabled);
        doc.setIn(['updates', 'channel'], this.config.channel);
        doc.setIn(['updates', 'autoApply'], this.config.autoApply);
        doc.setIn(['updates', 'pollInterval', 'value'], this.config.pollInterval.value);
        doc.setIn(['updates', 'pollInterval', 'unit'], this.config.pollInterval.unit);
        writeFileSync(cfgPath, String(doc), 'utf-8');
      }
    } catch (e: any) {
      Logger.error(`AutoUpdateService: Failed to persist config to config.yml: ${e.message}`, 'AutoUpdate');
    }

    // Restart timer with new schedule
    this.start();
    return this.config;
  }

  /**
   * Start or restart the background polling loop
   */
  public start(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (!this.config.enabled) {
      Logger.info('Automatic background updates polling is paused (disabled).', 'AutoUpdate');
      return;
    }

    const intervalMs = AutoUpdateService.intervalToMs(
      this.config.pollInterval.value,
      this.config.pollInterval.unit
    );

    const prettySchedule = `every ${this.config.pollInterval.value} ${this.config.pollInterval.unit}`;
    Logger.info(
      `AutoUpdateService active: Polling ${prettySchedule} on channel "${this.config.channel.toUpperCase()}" (Auto-Apply: ${this.config.autoApply ? 'ON' : 'OFF (Notify Only)'})`,
      'AutoUpdate'
    );

    // Run an initial check shortly after boot (after 20 seconds)
    setTimeout(() => {
      this.checkAndOptionallyApply();
    }, 20000);

    // Schedule recurring interval
    this.timer = setInterval(() => {
      this.checkAndOptionallyApply();
    }, intervalMs);
  }

  /**
   * Stop the background timer
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      Logger.info('AutoUpdateService timer stopped.', 'AutoUpdate');
    }
  }

  /**
   * Read current running version
   */
  private readCurrentVersion(): string {
    const paths = [
      path.resolve(process.cwd(), 'version.json'),
      path.resolve(process.cwd(), 'package.json'),
    ];
    for (const p of paths) {
      try {
        if (existsSync(p)) {
          const raw = readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
          const data = JSON.parse(raw);
          if (data.version) return String(data.version);
        }
      } catch {}
    }
    return '0.0.0.1';
  }

  /**
   * Check for updates from release servers and optionally apply if autoApply is enabled
   */
  public async checkAndOptionallyApply(forceCheck: boolean = false): Promise<{
    hasUpdate: boolean;
    current: string;
    latest: string;
    downloadUrl: string | null;
  }> {
    if (this.isChecking && !forceCheck) {
      return { hasUpdate: false, current: '', latest: '', downloadUrl: null };
    }

    this.isChecking = true;
    const current = this.readCurrentVersion();
    const channel = this.config.channel || 'beta';
    let latest: string = current;
    let downloadUrl: string | null = null;

    try {
      const nowIso = new Date().toISOString();
      this.config.lastCheck = nowIso;

      Logger.debug(`Checking for updates on stream: ${channel}...`, 'AutoUpdate');

      const urls = [
        `http://localhost:3000/api/builds?channel=${channel}`,
        `http://localhost:2053/api/builds?channel=${channel}`,
        `http://127.0.0.1:3000/api/builds?channel=${channel}`,
      ];

      for (const u of urls) {
        try {
          const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
          if (r.ok) {
            const data: any = await r.json();
            const builds = data?.builds || [];
            if (builds.length > 0) {
              latest = builds[0].version;
              const origin = u.replace(/\/api\/builds.*/, '');
              downloadUrl = `${origin}/builds/${channel}/${builds[0].filename || `floofcore-v${latest}.zip`}`;
              break;
            }
          }
        } catch {}
      }

      const normVer = (v: string) => v.replace(/^v/, '').split(/[-.]/).map((s) => parseInt(s, 10) || 0);
      const pa = normVer(latest);
      const pb = normVer(current);
      const len = Math.max(pa.length, pb.length);
      let isNewer = false;
      for (let i = 0; i < len; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) {
          isNewer = diff > 0;
          break;
        }
      }

      const hasUpdate = isNewer;

      if (hasUpdate) {
        this.config.lastUpdateFound = latest;
        Logger.info(
          `🚀 [AutoUpdate] New release found: v${latest} (Running: v${current}) on ${channel.toUpperCase()} channel.`,
          'AutoUpdate'
        );


        if (this.config.autoApply && downloadUrl) {
          Logger.warn(
            `⚡ [AutoUpdate] Auto-Apply is ON. Automatically applying release v${latest} in 5 seconds...`,
            'AutoUpdate'
          );

          setTimeout(async () => {
            await this.executeAutoApply(downloadUrl!, latest);
          }, 5000);
        } else {
          Logger.info(
            `ℹ️ [AutoUpdate] Auto-Apply is OFF (Notification Only). Open Dashboard to inspect changelog and deploy.`,
            'AutoUpdate'
          );
        }
      } else {
        Logger.debug(`[AutoUpdate] Instance is up to date (v${current}).`, 'AutoUpdate');
      }

      return { hasUpdate, current, latest, downloadUrl };
    } catch (err: any) {
      Logger.error(`[AutoUpdate] Error checking for updates: ${err.message}`, 'AutoUpdate');
      return { hasUpdate: false, current, latest: current, downloadUrl: null };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Execute auto-download and apply sequence
   */
  private async executeAutoApply(url: string, targetVersion: string): Promise<void> {
    try {
      Logger.info(`Downloading release payload from ${url}...`, 'AutoUpdate');
      const zipRes = await fetch(url);
      if (!zipRes.ok) throw new Error(`Download failed with status ${zipRes.status}`);

      const zipBuf = await zipRes.arrayBuffer();
      const zipPath = path.resolve(process.cwd(), 'update.zip');
      writeFileSync(zipPath, Buffer.from(zipBuf));

      Logger.info(`Applying update transaction for v${targetVersion}...`, 'AutoUpdate');
      const success = await applyBotUpdate(zipPath, targetVersion);

      try {
        if (existsSync(zipPath)) unlinkSync(zipPath);
      } catch {}

      if (success) {
        Logger.info(`✅ Update applied successfully by AutoUpdateService. Initiating clean container restart...`, 'AutoUpdate');
        const { safeContainerReboot } = await import('../../utils/updateHelper.ts');
        await safeContainerReboot(1500);
      } else {
        Logger.error(`❌ Automatic update failed. Safe rollback restored previous state.`, 'AutoUpdate');
      }

    } catch (err: any) {
      Logger.error(`AutoApply execution failed: ${err.message}`, 'AutoUpdate');
    }
  }
}
