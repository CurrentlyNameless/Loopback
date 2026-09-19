import path from 'path';
import fs from 'fs';
import { extractModuleSettings } from './ConfigService.js';

const GUILD_CONFIG_DIR = path.resolve(process.cwd(), 'core', 'config', 'guild-configs');

function getGuildConfigPath(guildId: string): string {
    if (!fs.existsSync(GUILD_CONFIG_DIR)) {
        fs.mkdirSync(GUILD_CONFIG_DIR, { recursive: true });
    }
    return path.join(GUILD_CONFIG_DIR, `${guildId}.json`);
}

export function deepMerge(target: any, source: any): any {
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

export function readGuildModuleConfig(guildId: string, moduleName: string): Record<string, any> {
    const filePath = getGuildConfigPath(guildId);
    if (!fs.existsSync(filePath)) return {};

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return data[moduleName] ? extractModuleSettings(data[moduleName]) : {};
    } catch {
        return {};
    }
}

export function writeGuildModuleConfig(guildId: string, moduleName: string, config: Record<string, any>): { success: boolean } {
    const filePath = getGuildConfigPath(guildId);
    let fullConfig: Record<string, any> = {};

    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            fullConfig = JSON.parse(raw) || {};
        } catch {
            fullConfig = {};
        }
    }

    const cleanSettings = extractModuleSettings(config);
    fullConfig[moduleName] = deepMerge(fullConfig[moduleName] || {}, cleanSettings);

    try {
        fs.writeFileSync(filePath, JSON.stringify(fullConfig, null, 2), 'utf-8');
        return { success: true };
    } catch {
        return { success: false };
    }
}

export function mergeWithGuildOverrides(baseConfig: any, overrides: any): any {
    const cleanBase = extractModuleSettings(baseConfig);
    const cleanOverrides = extractModuleSettings(overrides);
    return deepMerge(cleanBase, cleanOverrides);
}
