import { logger } from './logger.ts';
import { getBotVersion } from './updateHelper.ts';
import chalk from 'chalk';
import type { LicenseConfig } from './LicenseManager.ts';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

const DISCORD_SUPPORT_URL = 'https://discord.gg/EjUzF77RAs';
const DEFAULT_LICENSE_SERVER = 'https://flm.moonmallow.dev';
const CACHE_FILE = resolve('./core/config/license.cache.json');
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7-day offline grace period

interface LicenseValidationResponse {
  valid: boolean;
  error?: string;
  reason?: string;
  status?: 'active' | 'banned' | 'deleted' | 'expired' | 'unknown';
  badGuilds?: Array<{ guildId: string; guildName?: string; reason?: string }>;
  license?: {
    key: string;
    customerName: string | null;
    discordUserId: string | null;
    expiresAt: string | null;
    maxGuilds: number;
    features: Record<string, boolean>;
    strikes?: number;
    status?: 'active' | 'banned' | 'deleted' | 'expired' | 'unknown';
    reason?: string;
    backupServers?: string[];
  };
  version?: {
    current: string;
    latest: string;
    hasUpdate: boolean;
    downloadUrl?: string;
    hash?: string;
    type?: 'full' | 'delta';
    changelog?: string;
    isCritical?: boolean;
  };
  cachedAt?: number;
}

export class LicenseValidator {
  private serverUrl: string;

  constructor(private config: LicenseConfig) {
    this.serverUrl = config.server || DEFAULT_LICENSE_SERVER;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  async validate(): Promise<LicenseValidationResponse> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const candidateServers = Array.from(new Set([
      this.config.server,
      DEFAULT_LICENSE_SERVER,
      'http://flm.moonmallow.dev:2053',
      'http://216.220.236.104:2053',
      'http://localhost:2053',
      'http://127.0.0.1:2053',
      'https://flm.hectort.xyz',
      'https://flm.disparityurl.space',
    ].filter(Boolean) as string[]));

    let lastErrMessage = '';

    for (const serverUrl of candidateServers) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      try {
        const response = await fetch(`${serverUrl}/api/license/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: this.config.key,
            productId: this.config.productId,
            version: getBotVersion(),
            channel: this.config.channel || 'stable',
            botId: this.config.productId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          let errorData: any = null;
          try {
            errorData = await response.json();
          } catch {}

          if (errorData) {
            // WIPE cached license file so invalid/banned key cannot run offline
            if (errorData.status === 'banned' || errorData.status === 'deleted' || errorData.status === 'expired' || errorData.status === 'unknown') {
              try {
                if (existsSync(CACHE_FILE)) rmSync(CACHE_FILE, { force: true });
              } catch {}
              return errorData as LicenseValidationResponse;
            }
          }

          throw new Error(errorData?.error || `License validation request failed (status: ${response.status}).`);
        }

        const resData = (await response.json()) as LicenseValidationResponse;
        this.serverUrl = serverUrl;

        // Persist offline cache on successful verification
        try {
          mkdirSync(resolve('./core/config'), { recursive: true });
          writeFileSync(CACHE_FILE, JSON.stringify({ ...resData, cachedAt: Date.now(), cachedKey: this.config.key }, null, 2));
        } catch { /* non-fatal */ }

        return resData;
      } catch (error: any) {
        lastErrMessage = error?.message || String(error);
      }
    }

    // Attempt offline cache fallback only if server was genuinely unreachable (no HTTP response)
    try {
      if (existsSync(CACHE_FILE)) {
        const rawCache = readFileSync(CACHE_FILE, 'utf8');
        const cache = JSON.parse(rawCache);

        if (cache.cachedKey === this.config.key && cache.cachedAt) {
          const age = Date.now() - cache.cachedAt;
          if (age <= GRACE_PERIOD_MS) {
            const daysRemaining = Math.ceil((GRACE_PERIOD_MS - age) / (1000 * 60 * 60 * 24));
            logger.warn(
              `⚠️ License server unreachable — operating offline under cached license. Grace period: ${daysRemaining} day(s) remaining.`,
              'LicenseValidator'
            );
            return cache;
          }
        }
      }
    } catch { /* ignore cache read error */ }

    throw new Error(lastErrMessage || 'Failed to connect to FLM license server (all candidates unreachable)');
  }
}
