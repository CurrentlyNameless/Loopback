import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logger.ts';
import { ModuleManager } from './ModuleManager.ts';

const GUILD_CONFIG_DIR = path.resolve(process.cwd(), 'core', 'config', 'guild-configs');

function getGuildConfigPath(guildId: string): string {
  if (!fs.existsSync(GUILD_CONFIG_DIR)) {
    fs.mkdirSync(GUILD_CONFIG_DIR, { recursive: true });
  }
  return path.join(GUILD_CONFIG_DIR, `${guildId}.json`);
}

function deepMerge(target: any, source: any): any {
  if (!target || typeof target !== 'object') return source;
  if (!source || typeof source !== 'object') return target;

  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

export class GuildConfigManager {
  /**
   * Read full configuration object for a specific guild from disk.
   */
  static getGuildConfig(guildId: string): Record<string, any> {
    const filePath = getGuildConfigPath(guildId);
    if (!fs.existsSync(filePath)) return {};

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) || {};
    } catch (err: any) {
      Logger.warn(`Could not read guild config for ${guildId}: ${err.message}`, 'GuildConfigManager');
      return {};
    }
  }

  /**
   * Read configuration for a single module in a guild.
   */
  static getGuildModuleConfig(guildId: string, moduleId: string): Record<string, any> {
    const guildConfig = this.getGuildConfig(guildId);
    return guildConfig[moduleId] || {};
  }

  /**
   * Save a single module's configuration into the guild's local JSON file and apply it live.
   */
  static saveModuleConfig(guildId: string, moduleId: string, config: Record<string, any>): { success: boolean; config: any } {
    const filePath = getGuildConfigPath(guildId);
    let fullConfig: Record<string, any> = this.getGuildConfig(guildId);

    const existingModuleConfig = fullConfig[moduleId] || {};
    const mergedModuleConfig = typeof config === 'object' && !Array.isArray(config)
      ? deepMerge(existingModuleConfig, config)
      : config;

    fullConfig[moduleId] = mergedModuleConfig;

    try {
      fs.writeFileSync(filePath, JSON.stringify(fullConfig, null, 2), 'utf-8');
      Logger.info(`Updated config for guild ${guildId}, module ${moduleId}`, 'GuildConfigManager');

      // Hot-apply changes to the running module in memory
      this.applyConfigToModule(moduleId, mergedModuleConfig);

      return { success: true, config: mergedModuleConfig };
    } catch (err: any) {
      Logger.error(`Failed to write guild config for ${guildId}: ${err.message}`, 'GuildConfigManager');
      return { success: false, config: mergedModuleConfig };
    }
  }

  /**
   * Save full guild JSON configuration from remote dashboard.
   */
  static saveFullGuildConfig(guildId: string, fullConfig: Record<string, any>): { success: boolean } {
    const filePath = getGuildConfigPath(guildId);
    try {
      fs.writeFileSync(filePath, JSON.stringify(fullConfig, null, 2), 'utf-8');
      Logger.info(`Full guild config replaced for ${guildId}`, 'GuildConfigManager');

      // Hot-apply all module configurations
      for (const [moduleId, modConfig] of Object.entries(fullConfig)) {
        if (typeof modConfig === 'object' && modConfig !== null) {
          this.applyConfigToModule(moduleId, modConfig);
        }
      }

      return { success: true };
    } catch (err: any) {
      Logger.error(`Failed to replace guild config for ${guildId}: ${err.message}`, 'GuildConfigManager');
      return { success: false };
    }
  }

  /**
   * Live hot-apply settings to a running module instance in memory without restarting.
   */
  static applyConfigToModule(moduleId: string, cleanSettings: Record<string, any>): void {
    if (!cleanSettings || typeof cleanSettings !== 'object') return;

    // Handle module enable/disable state toggle
    if (typeof cleanSettings.enabled === 'boolean') {
      const isCurrentlyEnabled = ModuleManager.isModuleEnabled(moduleId);
      if (isCurrentlyEnabled !== cleanSettings.enabled) {
        ModuleManager.setModuleEnabled(moduleId, cleanSettings.enabled);
      }
    }

    const mod = ModuleManager.getModule(moduleId) as any;
    if (!mod) return;

    if (typeof mod.updateConfig === 'function') {
      try {
        mod.updateConfig(cleanSettings);
      } catch (e: any) {
        Logger.warn(`Error in ${moduleId}.updateConfig(): ${e.message}`, 'GuildConfigManager');
      }
    }

    if (mod.moduleConfig && typeof mod.moduleConfig === 'object') {
      Object.assign(mod.moduleConfig, cleanSettings);
    }

    if (mod.config && typeof mod.config === 'object') {
      if (mod.config.config && typeof mod.config.config === 'object') {
        Object.assign(mod.config.config, cleanSettings);
      } else {
        Object.assign(mod.config, cleanSettings);
      }
    }

    if (mod.lib && typeof mod.lib === 'object') {
      if (typeof mod.lib.updateConfig === 'function') {
        try { mod.lib.updateConfig(cleanSettings); } catch {}
      }
      if (mod.lib.config && typeof mod.lib.config === 'object') {
        Object.assign(mod.lib.config, cleanSettings);
      }
    }

    // Special global instance hooks (e.g. temp-voice)
    if (moduleId === 'temp-voice' || moduleId === 'tempvoice') {
      const globalLib = (global as any)._tempVoiceLibInstance;
      if (globalLib && typeof globalLib.updateConfig === 'function') {
        try { globalLib.updateConfig(cleanSettings); } catch {}
      }
    }

    if (typeof mod.onConfigReload === 'function') {
      try {
        mod.onConfigReload(cleanSettings);
      } catch (e: any) {
        Logger.warn(`Error in ${moduleId}.onConfigReload(): ${e.message}`, 'GuildConfigManager');
      }
    }

    if (typeof mod.onReload === 'function') {
      try {
        mod.onReload(cleanSettings);
      } catch (e: any) {
        Logger.warn(`Error in ${moduleId}.onReload(): ${e.message}`, 'GuildConfigManager');
      }
    }
  }
}
