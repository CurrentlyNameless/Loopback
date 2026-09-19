/**
 * DashboardService — Dashboard URL Provider
 * 
 * Provides resolved URLs for the embedded Floofcore dashboard,
 * guild module configurations, and variable studio.
 */

import { ConfigManager } from '../../managers/ConfigManager.ts';
import { canUseLocalhost } from '../../utils/LicenseManager.ts';

export class DashboardService {
  /**
   * Return the configured dashboard base URL (e.g. http://localhost:3000 or custom domain).
   */
  public static getBaseUrl(): string {
    let config: any = null;
    try {
      config = ConfigManager.get();
    } catch {}
    const rawCallback = config?.dashboard?.oauth?.callbackUrl || config?.dashboard?.callbackUrl || process.env.DASHBOARD_URL;

    if (rawCallback && typeof rawCallback === 'string' && rawCallback.trim()) {
      let base = rawCallback.trim()
        .replace(/\/api\/auth\/discord\/callback\/?$/i, '')
        .replace(/\/auth\/discord\/callback\/?$/i, '')
        .replace(/\/auth\/callback\/?$/i, '')
        .replace(/\/callback\/?$/i, '')
        .replace(/\/+$/, '');

      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        base = 'http://' + base;
      }
      return base;
    }

    const port = config?.dashboard?.port || process.env.PORT || 3000;
    return 'http://localhost:' + port;
  }

  /**
   * Return the dashboard URL for a specific guild.
   */
  public static getDashboardUrl(guildId?: string): string {
    const base = this.getBaseUrl();
    return guildId ? `${base}/modules?guildId=${guildId}` : base;
  }

  /**
   * Return the URL to configure a specific module within a guild.
   */
  public static getModuleConfigUrl(guildId: string, moduleId: string): string {
    const base = this.getBaseUrl();
    return `${base}/modules/${encodeURIComponent(moduleId)}?guildId=${guildId}`;
  }

  /**
   * Return the URL to the Variable Studio.
   */
  public static getVariableStudioUrl(guildId?: string): string {
    const base = this.getBaseUrl();
    return guildId ? `${base}/variables?guildId=${guildId}` : `${base}/variables`;
  }
}

export default DashboardService;
