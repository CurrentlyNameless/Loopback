import yaml from "js-yaml";
import fs from "fs";
import path from "node:path";
import { Logger } from "../utils/logger.ts";

export interface FloofConfig {
    name: string;
    color: string;
    font: string;
    ownerId?: string;
    ownerIds?: string[];
    discord: {
        token: string;
        clientId: string;
        clientSecret: string;
        guildId: string;
        callbackUrl?: string;
        ownerId?: string;
        ownerIds?: string[];
        presence: {
            status: string;
            activities: Array<{ name: string; type: string; url?: string }>;
            rotate?: boolean;
        };
    };
    license: { key: string; server?: string };
    updates: { enabled: boolean; channel: string; backupExcludes?: string[]; backupIncludes?: string[]; cleanupTargets?: string[] };
    backups?: { enabled: boolean; interval: string; keepLocal: boolean };
    database: {
        type: string;
        mongodb?: { uri: string };
    };
    modules: { directory: string };
    commands: { slash: { global: boolean; warmupSeconds?: number } };
    logging: {
        level: string;
        format: string;
        file: { enabled: boolean; path: string; maxFiles: number; maxSize: string };
        console: { enabled: boolean; timestamp: boolean };
    };
    personalities?: {
        strikes: Record<number, { message: string; emoji: string; color: string }>;
    };
    dashboard?: {
        port: number;
        secret?: string;
        sessionSecret?: string;
        enabled: boolean;
        callbackUrl: string;
        flmUrl?: string;
    };
}

export class ConfigManager {
    private static _config: FloofConfig | null = null;

    static async loadConfig(filePath: string = "config.yml"): Promise<FloofConfig> {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(resolvedPath)) {
            Logger.error(`Config file not found at ${resolvedPath}. Please create it.`, "ConfigManager");
            process.exit(1);
        }

        try {
            const text = fs.readFileSync(resolvedPath, "utf8");
            const rawConfig = yaml.load(text) as any;
            
            // Basic validation
            if (!rawConfig.discord?.token) {
                Logger.error("discord.token is missing in config.yml!", "ConfigManager");
                process.exit(1);
            }
            if (rawConfig.database?.type === 'mongodb' && !rawConfig.database.mongodb?.uri) {
                Logger.error("database.mongodb.uri is missing in config.yml!", "ConfigManager");
                process.exit(1);
            }

            this._config = rawConfig as FloofConfig;
            Logger.success("Configuration loaded & strictly validated.", "ConfigManager");
            return this._config;
        } catch (err) {
            Logger.error("Failed to parse config.yml", "ConfigManager", err);
            process.exit(1);
        }
    }

    static get(): FloofConfig {
        if (!this._config) {
            throw new Error("Config accessed before it was loaded!");
        }
        return this._config;
    }

    static async saveConfig(path: string = "config.yml"): Promise<void> {
        if (!this._config) return;
        const yamlStr = yaml.dump(this._config, {
            lineWidth: 160,
            quotingType: "'",
            forceQuotes: false,
            noCompatMode: true,
        });
        fs.writeFileSync(path, yamlStr, "utf8");
    }

    static async updatePresenceConfig(presence: { status?: string; activities?: Array<{ name: string; type: string; url?: string }>; rotate?: boolean; rotateInterval?: number }, configPath: string = "config.yml"): Promise<void> {
        if (!this._config) return;
        if (!this._config.discord) this._config.discord = {} as any;
        if (!this._config.discord.presence) this._config.discord.presence = {} as any;
        if (presence.status !== undefined) this._config.discord.presence.status = presence.status;
        if (presence.activities !== undefined) this._config.discord.presence.activities = presence.activities;
        if (presence.rotate !== undefined) this._config.discord.presence.rotate = presence.rotate;
        if (presence.rotateInterval !== undefined) this._config.discord.presence.rotateInterval = presence.rotateInterval;
        await this.saveConfig(configPath);
    }
}
