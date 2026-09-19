import chalk from "chalk";
import figlet from "figlet";
import yaml from "js-yaml";
import { promises as fs } from 'fs';
import { join, relative } from 'path';
import { FloofcoreError } from "../errors/FloofcoreError.ts";
import { ErrorManager } from "../managers/ErrorManager.ts";

if (!process.env.FORCE_COLOR && !process.env.NO_COLOR) {
    process.env.FORCE_COLOR = '1';
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'fatal';

export type LogCallback = (entry: { timestamp: string; level: string; message: string; module?: string }) => void;

export class Logger {
    private static level: LogLevel = 'debug';
    private static onLogCallback: LogCallback | undefined;

    static setOnLogCallback(cb: LogCallback | undefined) {
        Logger.onLogCallback = cb;
    }

    private static getDisplayWidth(str: string): number {
        const clean = str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
        let width = 0;
        for (let i = 0; i < clean.length; i++) {
            const code = clean.codePointAt(i) || 0;
            if (code > 0xFFFF) {
                i++; // Skip low surrogate
            }
            
            // Zero-width characters (variation selectors, joiners, zero-width space)
            if (
                code === 0xFE0F || 
                code === 0xFE0E || 
                code === 0x200D || 
                code === 0x200B || 
                code === 0x200C || 
                (code >= 0x0300 && code <= 0x036F)
            ) {
                continue;
            }

            // Wide characters & emojis (2 cells in xterm/monospaced terminals)
            if (
                (code >= 0x1F000 && code <= 0x1FAFF) ||
                (code >= 0x2600 && code <= 0x27BF) ||
                (code >= 0x2300 && code <= 0x23FF) ||
                (code >= 0x2B00 && code <= 0x2BFF) ||
                (code >= 0x20000 && code <= 0x2A6DF) ||
                (code >= 0x4E00 && code <= 0x9FFF) ||
                (code >= 0xFF01 && code <= 0xFF60) ||
                (code >= 0xFFE0 && code <= 0xFFE6)
            ) {
                width += 2;
            } else {
                width += 1;
            }
        }
        return width;
    }

    private static invokeCallback(level: string, message: string, module?: string) {
        Logger.onLogCallback?.({ timestamp: new Date().toISOString(), level, message, module });
    }

    static setLevel(level: string) {
        if (['debug', 'info', 'warn', 'error', 'success', 'fatal'].includes(level)) {
            this.level = level as LogLevel;
        }
    }

    static shouldLog(methodLevel: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'success', 'fatal'];
        const currentIdx = levels.indexOf(this.level);
        const methodIdx = levels.indexOf(methodLevel);
        return methodIdx >= currentIdx;
    }

    private static readonly LEVEL_STYLES: Record<string, {
        tag: (s: string) => string;
        msg: (s: string) => string;
        icn: string;
    }> = {
        debug:   { tag: chalk.cyan,           msg: chalk.cyan,          icn: '◆' },
        info:    { tag: chalk.blueBright,     msg: chalk.white,         icn: '●' },
        success: { tag: chalk.green,          msg: chalk.white,         icn: '✔' },
        warn:    { tag: chalk.yellowBright,   msg: chalk.yellow,        icn: '▲' },
        error:   { tag: chalk.red,            msg: chalk.redBright,     icn: '✖' },
        fatal:   { tag: chalk.magenta,        msg: chalk.magentaBright, icn: '☠' },
    };

    private static readonly DEFAULT_COLOR = '#B2BEC3';
    private static readonly DEFAULT_ICON = '📄';

    private static readonly CONTEXT_COLORS: Record<string, string> = {
        interactionmanager: '#F79F1F', // Orange/Yellowish for Interaction Manager
        licensemanager: '#FFC312', // Yellow for License Manager
        modulemanager: '#12CBC4',
        databasemanager: '#ED4C67',
        permissionmanager: '#A3CB38',
        climanager: '#D980FA',
        welcomegoodbye: '#2ED573', // Green for Welcome/Goodbye
        giveaway: '#E056FD', // Festive Purple for Giveaway
        giveawaymanager: '#E056FD',
        dashboard: '#54A0FF', // Electric Sky Blue for Dashboard
        dashboardserver: '#54A0FF'
    };

    private static readonly CONTEXT_ICONS: Record<string, string> = {
        core: '⚙️',
        main: '⚙️',
        interactionmanager: '⚡',
        modulemanager: '📦',
        databasemanager: '🗄️',
        permissionmanager: '🛡️',
        climanager: '💻',
        licensemanager: '🔑',
        configmanager: '🛠️',
        dashboardserver: '🖥️',
        dashboard: '🖥️',
        updatehelper: '🚀',
        autoupdate: '🔄',
        autoupdateservice: '🔄',
        security: '🔒',
        auth: '🔐',
        ws: '📡',
        api: '🌐',
        
        // Modules
        welcomegoodbye: '👋',
        tempvoice: '🔊',
        automod: '🛡️',
        guildcenter: '🏛️',
        channelstats: '📊',
        music: '🎵',
        streamernotifications: '📺',
        applications: '📋',
        autorevive: '🔄',
        blacklist: '⛔',
        economybuilder: '💰',
        economygames: '🎲',
        giveaway: '🎁',
        giveawaymanager: '🎁',
        honeypot: '🍯',
        leveling: '⭐',
        pollsystem: '🗳️',
        reputation: '🏆',
        suggestions: '💡',
        userlocker: '🔒',
        tickets: '🎟️',
        crosschatrelay: '💬',
        discordstatusmonitor: '📡',
        qrcodemaker: '📱',
        aisystem: '🤖',
        corecommands: '⚙️',
        guildlogging: '📜',
        socials: '🌐',
        transcript: '📜',
    };

    // ─── Per-module styles (loaded from each module's module.yml) ────────────
    private static readonly moduleStyles = new Map<string, { color?: string; icon?: string }>();

    private static styleKey(name: any): string {
        if (!name) return 'core';
        if (typeof name !== 'string') {
            if (typeof name === 'object' && (name as any).name) name = (name as any).name;
            else if (typeof name === 'object' && (name as any).context) name = (name as any).context;
            else name = String(name);
        }
        return String(name).toLowerCase().replace(/[^a-z0-9]/g, '') || 'core';
    }

    static registerModuleStyle(name: string, style: { color?: string; icon?: string; contexts?: Record<string, { color?: string; icon?: string }> }): void {
        if (!name || !style) return;
        const base = { color: style.color, icon: style.icon };
        const baseKey = Logger.styleKey(name);
        Logger.moduleStyles.set(baseKey, { ...Logger.moduleStyles.get(baseKey), ...base });
        if (style.contexts && typeof style.contexts === "object") {
            for (const [context, ctxStyle] of Object.entries(style.contexts)) {
                if (!ctxStyle || typeof ctxStyle !== "object") continue;
                const ctxKey = Logger.styleKey(context);
                Logger.moduleStyles.set(ctxKey, { ...Logger.moduleStyles.get(ctxKey), ...ctxStyle });
            }
        }
    }

    static loadModuleStylesSync(modulesDir?: string): void {
        const dir = modulesDir || join(process.cwd(), "modules");
        try {
            const { readdirSync, readFileSync, statSync } = require("fs");
            if (!existsSync(dir)) return;
            const entries = readdirSync(dir);
            for (const name of entries) {
                const modDir = join(dir, name);
                if (!statSync(modDir).isDirectory()) continue;
                const ymlPath = join(modDir, "module.yml");
                if (existsSync(ymlPath)) {
                    try {
                        const raw = readFileSync(ymlPath, "utf8");
                        const parsed: any = yaml.load(raw);
                        if (parsed && typeof parsed === "object") {
                            const loggerBlock = parsed.logger || {};
                            const icon = parsed.emoji || parsed.icon || loggerBlock.icon || loggerBlock.emoji;
                            const color = loggerBlock.color || parsed.color;
                            if (icon || color) {
                                Logger.registerModuleStyle(parsed.name || name, {
                                    color: typeof color === "string" ? color : undefined,
                                    icon: typeof icon === "string" ? icon : undefined,
                                });
                                if (name && name !== parsed.name) {
                                    Logger.registerModuleStyle(name, {
                                        color: typeof color === "string" ? color : undefined,
                                        icon: typeof icon === "string" ? icon : undefined,
                                    });
                                }
                            }
                        }
                    } catch {}
                }
            }
        } catch {}
    }

    static async loadModuleStyles(modulesDir?: string): Promise<void> {
        const dir = modulesDir || join(process.cwd(), "modules");
        let entries: any;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const ymlPath = join(dir, entry.name, "module.yml");
            try {
                const raw = await fs.readFile(ymlPath, "utf8");
                const parsed: any = yaml.load(raw);
                if (parsed && typeof parsed === "object") {
                    const loggerBlock = parsed.logger || {};
                    const icon = parsed.emoji || parsed.icon || loggerBlock.icon || loggerBlock.emoji;
                    const color = loggerBlock.color || parsed.color;
                    Logger.registerModuleStyle(
                        parsed.name || entry.name,
                        {
                            color: typeof color === "string" ? color : undefined,
                            icon: typeof icon === "string" ? icon : undefined,
                            contexts: loggerBlock.contexts && typeof loggerBlock.contexts === "object" ? loggerBlock.contexts : undefined,
                        }
                    );
                    if (entry.name && entry.name !== parsed.name) {
                        Logger.registerModuleStyle(entry.name, {
                            color: typeof color === "string" ? color : undefined,
                            icon: typeof icon === "string" ? icon : undefined,
                        });
                    }
                }
            } catch {
                // skip malformed module.yml files
            }
        }
    }

    private static getTimestamp(): string {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return chalk.gray(`[${time}]`);
    }

    private static normalizeContextName(context: any): string {
        if (!context) return 'Core';
        if (typeof context !== 'string') {
            if (typeof context === 'object' && (context as any).name) context = (context as any).name;
            else if (typeof context === 'object' && (context as any).context) context = (context as any).context;
            else context = String(context);
        }
        if (context === 'CLI' || context === 'CLIManager' || context === 'cli') return 'CLI Manager';

        let name = String(context).replace(/[-_]/g, ' ');
        name = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
        return name
            .split(' ')
            .filter(Boolean)
            .map(word => {
                const upper = word.toUpperCase();
                if (upper === 'CLI') return 'CLI';
                if (upper === 'AI') return 'AI';
                if (upper === 'TTS') return 'TTS';
                if (upper === 'QR') return 'QR';
                if (upper === 'UI') return 'UI';
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    private static formatContext(context: any, customIcon?: string): string {
        const normalized = Logger.normalizeContextName(context);
        const key = Logger.styleKey(context);
        const style = Logger.moduleStyles.get(key);
        
        const hexCode = Logger.CONTEXT_COLORS[key] || style?.color || Logger.DEFAULT_COLOR;
        const color = chalk.hex(hexCode) as any;
        
        const defaultIcon = Logger.CONTEXT_ICONS[key] || Logger.DEFAULT_ICON;
        const icon = customIcon || Logger.CONTEXT_ICONS[key] || style?.icon || defaultIcon;
        const rawTag = `[${icon}  ${normalized}]`;
        const width = Logger.getDisplayWidth(rawTag);
        const paddingNeeded = Math.max(0, 28 - width);
        const paddedTag = rawTag + ' '.repeat(paddingNeeded);
        return color.bold(paddedTag);
    }

    static phaseHeader(phaseNumber: number, phaseName: string): void {
        const ts = Logger.getTimestamp();
        Logger.blankLine();
        console.log(chalk.gray('─'.repeat(70)));
        console.log(`${ts} ${chalk.bold.yellow(`❖ PHASE ${phaseNumber}`)} ${chalk.bold.white(`— ${phaseName}`)}`);
        console.log(chalk.gray('─'.repeat(70)));
    }

    private static cleanMessage(message: string): string {
        if (!message || typeof message !== 'string') return String(message || '');
        let msg = message.replace(/^\[[A-Za-z0-9_ -]+\]\s*/, '');
        msg = msg.replace(/^([\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}](?:\uFE0F|\uFE0E)?)(?!\s)/u, '$1 ');
        return msg;
    }

    static info(message: string, context: any = "Core", customIcon?: string) {
        if (!this.shouldLog('info')) return;
        const style = this.LEVEL_STYLES.info;
        const msg = this.cleanMessage(message);
        const ctxStr = typeof context === 'string' ? context : (context?.name || context?.context || 'Core');
        console.log(`${this.getTimestamp()} ${style.tag(`${style.icn} INFO`)} ${this.formatContext(ctxStr, customIcon)} ${style.msg(msg)}`);
        this.invokeCallback('info', msg, ctxStr);
    }

    static success(message: string, context: any = "Core", customIcon?: string) {
        if (!this.shouldLog('success')) return;
        const style = this.LEVEL_STYLES.success;
        const msg = this.cleanMessage(message);
        const ctxStr = typeof context === 'string' ? context : (context?.name || context?.context || 'Core');
        console.log(`${this.getTimestamp()} ${style.tag(`${style.icn} SUCC`)} ${this.formatContext(ctxStr, customIcon)} ${style.msg(msg)}`);
        this.invokeCallback('success', msg, ctxStr);
    }

    static warn(message: string, context: any = "Core", customIcon?: string) {
        if (!this.shouldLog('warn')) return;
        const style = this.LEVEL_STYLES.warn;
        const msg = this.cleanMessage(message);
        const ctxStr = typeof context === 'string' ? context : (context?.name || context?.context || 'Core');
        console.log(`${this.getTimestamp()} ${style.tag(`${style.icn} WARN`)} ${this.formatContext(ctxStr, customIcon)} ${style.msg(msg)}`);
        this.invokeCallback('warn', msg, ctxStr);
    }

    static error(message: string, context: any = "Core", err?: any, customIcon?: string) {
        if (!this.shouldLog('error')) return;
        const style = this.LEVEL_STYLES.error;
        const msg = this.cleanMessage(message);

        let resolvedContext = "Core";
        let targetErr = err;

        if (typeof context === 'string') {
            resolvedContext = context;
        } else if (context && typeof context === 'object') {
            if (context.err || context.stack || context.message) {
                targetErr = targetErr || context.err || context;
                resolvedContext = context.context || context.module || context.name || "Core";
            } else {
                resolvedContext = context.name || context.context || "Core";
            }
        }

        targetErr = targetErr || new Error(msg);
        const entry = ErrorManager.logError(targetErr, resolvedContext);

        let codeTag = entry.code ? chalk.yellow(` [${entry.hexCode || '0x0000'} | ${entry.code}]`) : "";

        console.log(`${this.getTimestamp()} ${style.tag(`${style.icn} ERRO`)} ${this.formatContext(resolvedContext, customIcon)} ${style.msg(msg)}${codeTag}`);
        this.invokeCallback('error', msg, resolvedContext);

        const ts = this.getTimestamp();
        const activeMod = entry.moduleName || resolvedContext;
        console.log(`${ts}   ${chalk.red('├─')} ${chalk.gray('Module Context:')} ${chalk.cyan(activeMod)}`);
        if (entry.code) {
            console.log(`${ts}   ${chalk.red('├─')} ${chalk.gray('Error Code:')}     ${chalk.yellow(`${entry.hexCode || '0x0000'} (${entry.code})`)}`);
        }
        const storePath = relative(process.cwd(), ErrorManager.getLogFilePath(activeMod)).replace(/\\/g, '/');
        console.log(`${ts}   ${chalk.red('├─')} ${chalk.gray('Log Store:')}      ${chalk.gray(`Saved to ${storePath}`)}`);
        console.log(`${ts}   ${chalk.red('└─')} ${chalk.gray('Details:')}        ${chalk.red(entry.message)}`);

        const displayErr = targetErr || err;
        if (displayErr && displayErr.stack) {
            const prefix = chalk.gray('       │ ');
            const stackLines = (typeof displayErr.stack === "string" ? displayErr.stack : String(displayErr.stack)).split('\n').slice(1, 5);
            console.log(`${prefix}${chalk.gray(stackLines.join('\n' + prefix))}`);
        }
        Logger.blankLine();
    }

    static debug(message: string, context: string = "Core", customIcon?: string) {
        if (!this.shouldLog('debug')) return;
        const style = this.LEVEL_STYLES.debug;
        const msg = this.cleanMessage(message);
        console.log(`${this.getTimestamp()} ${style.tag(`${style.icn} DEBG`)} ${this.formatContext(context, customIcon)} ${style.msg(msg)}`);
        this.invokeCallback('debug', msg, context);
    }

    static fatal(message: string, context: string = "Core", err?: any, customIcon?: string) {
        const style = this.LEVEL_STYLES.fatal;
        const msg = this.cleanMessage(message);

        let codeTag = "";
        if (err instanceof FloofcoreError && err.code) {
            codeTag = chalk.yellow(` [${err.code}]`);
        }

        console.log(`${this.getTimestamp()} ${style.tag(`${style.icn} FATL`)} ${this.formatContext(context, customIcon)} ${style.msg(msg)}${codeTag}`);
        this.invokeCallback('fatal', msg, context);

        const targetErr = err || new Error(message);
        ErrorManager.logError(targetErr, context);

        if (err) console.error(err);
        process.exit(1);
    }

    static inspectErrors(limit: number = 30): void {
        const { ErrorInspector } = require('./ErrorInspector.ts');
        ErrorInspector.printAllErrors(limit);
    }

    static inspectModuleErrors(moduleName: string, limit: number = 20): void {
        const { ErrorInspector } = require('./ErrorInspector.ts');
        ErrorInspector.printModuleErrors(moduleName, limit);
    }

    // ─── Phase: timed step with start/end ─────────────────────────────────────
    //   [18:38:21] ◆ PHASE ◆  Connecting to database...
    //   [18:38:23] ✔ Done  [+2.1s]
    //
    static blankLine(): void {
        console.log(' \x1b[0m');
    }

    private static _lastPhaseEnded = true;

    static phase(label: string): () => void {
        if (!this._lastPhaseEnded) Logger.blankLine();
        this._lastPhaseEnded = false;
        const start = performance.now();
        const ts = Logger.getTimestamp();
        console.log(`${ts} ${chalk.bold.cyan('⚙️  STEP')} ${chalk.gray('│')} ${chalk.white(label)}...`);
        return () => {
            const elapsed = ((performance.now() - start) / 1000).toFixed(2);
            const ts2 = Logger.getTimestamp();
            console.log(`${ts2} ${chalk.bold.green('✔  STEP')} ${chalk.gray('│')} ${chalk.white(label)} ${chalk.gray(`(+${elapsed}s)`)}`);
            Logger.blankLine();
            this._lastPhaseEnded = true;
        };
    }

    // ─── Module load line ─────────────────────────────────────────────────────
    //   [18:38:24] ◆ Module  auto-mod              v0.0.1   4 cmds (1 inter, 3 events)  [320ms]
    //
    static moduleLoad(
        name: string,
        version: string,
        stats: { commands: number; interactions: number; events: number; commandList?: string[] },
        durationMs?: number
    ): void {
        const ver = chalk.green(`v${version}`);
        const cmds = chalk.gray(` ${stats.commands} cmd${stats.commands !== 1 ? 's' : ''}`);

        const extras: string[] = [];
        if (stats.interactions > 0) extras.push(`${stats.interactions} inter${stats.interactions !== 1 ? 's' : ''}`);
        if (stats.events > 0) extras.push(`${stats.events} event${stats.events !== 1 ? 's' : ''}`);
        const extraStr = extras.length > 0 ? chalk.gray(` (${extras.join(', ')})`) : '';

        const time = durationMs !== undefined ? chalk.gray(` [${durationMs}ms]`) : '';
        const ts = Logger.getTimestamp();
        console.log(`${ts} ${chalk.bold.magenta('◆ Module')}  ${chalk.bold.cyan(name)}  ${ver}${cmds}${extraStr}${time}`);

        if (stats.commandList && stats.commandList.length > 0) {
            stats.commandList.forEach((cmd, idx) => {
                const isLast = idx === stats.commandList!.length - 1;
                const connector = isLast ? '└─' : '├─';
                console.log(`${ts}   ${chalk.gray(connector)} ${chalk.gray('Command:')} ${chalk.yellow('/' + cmd)}`);
            });
        }
        Logger.blankLine();
    }

    // ─── Module summary block ─────────────────────────────────────────────────
    //   [18:38:25] ── MODULES LOADED (11 mods, 37 cmds) ── [3450ms]
    //
    static moduleSummary(
        summary: { label: string; version: string; commands: number; interactions?: number; events?: number }[],
        elapsedMs?: number
    ): void {
        if (summary.length === 0) return;
        const totalCmds = summary.reduce((sum, m) => sum + m.commands, 0);
        const totalInters = summary.reduce((sum, m) => sum + (m.interactions || 0), 0);
        const totalEvents = summary.reduce((sum, m) => sum + (m.events || 0), 0);
        const moduleCount = summary.length;
        const ts = Logger.getTimestamp();
        const time = elapsedMs !== undefined ? chalk.gray(` [${elapsedMs}ms]`) : '';

        const overallExtras: string[] = [];
        if (totalInters > 0) overallExtras.push(`${totalInters} inters`);
        if (totalEvents > 0) overallExtras.push(`${totalEvents} events`);
        const overallExtraStr = overallExtras.length > 0 ? `, ${overallExtras.join(', ')}` : '';

        const maxLabelWidth = Math.max(...summary.map(m => m.label.length));
        console.log(`${ts} ${chalk.gray('──')} ${chalk.green('MODULES LOADED')} ${chalk.gray(`(${moduleCount} mods, ${totalCmds} cmds${overallExtraStr})`)}${time} ${chalk.gray('──')}`);
        for (const m of summary) {
            const cmdStr = `${m.commands} cmd${m.commands !== 1 ? 's' : ''}`;
            const version = m.version ? chalk.green(`v${m.version}`) : '';

            const extras: string[] = [];
            if (m.interactions && m.interactions > 0) {
                extras.push(`${m.interactions} inter${m.interactions !== 1 ? 's' : ''}`);
            }
            if (m.events && m.events > 0) {
                extras.push(`${m.events} event${m.events !== 1 ? 's' : ''}`);
            }
            const extraStr = extras.length > 0 ? chalk.gray(` (${extras.join(', ')})`) : '';

            console.log(`${ts}   ${chalk.gray('│')}  ${chalk.cyan(m.label.padEnd(maxLabelWidth))}  ${version.padEnd(10)}  ${chalk.gray(cmdStr)}${extraStr}`);
        }
        console.log(`${ts} ${chalk.gray('─'.repeat(50))}`);
    }

    // Visual Helpers
    static divider(char = '━', color = chalk.gray): void {
        console.log(color(char.repeat(70)));
    }

    static table(rows: Record<string, string | number | boolean>): void {
        const keyWidth = Math.max(...Object.keys(rows).map(k => k.length), 8);
        for (const [key, value] of Object.entries(rows)) {
            const k = chalk.cyan(key.padEnd(keyWidth));
            const v = chalk.white(String(value));
            console.log(`  ${k}  ${v}`);
        }
        Logger.blankLine();
    }

    static banner(name: string, colorHex: string, infoRows: Record<string, string>): void {
        let art: string;
        try {
            art = figlet.textSync(name, { font: 'Big' });
        } catch {
            art = figlet.textSync(name, { font: 'Standard' });
        }

        const lines = art.split('\n');
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        const artColor = chalk.rgb(r, g, b).bold;

        const totalWidth = 70;
        const centerPad = (text: string) => {
            const plainText = text.replace(/\x1b\[[0-9;]*m/g, '');
            const padding = Math.max(0, Math.floor((totalWidth - plainText.length) / 2));
            return ' '.repeat(padding) + text;
        };

        console.log(chalk.gray('━'.repeat(totalWidth)));
        lines.forEach((line: string) => {
            if (line.trim()) console.log(centerPad(artColor(line)));
        });
        console.log(chalk.gray('━'.repeat(totalWidth)));

        if (infoRows && Object.keys(infoRows).length > 0) {
            this.table(infoRows);
        } else {
            Logger.blankLine();
        }
    }

    // ─── Startup System & License Diagnostics Reports ──────────────────────────

    static systemDiagnostics(info: {
        engine: string;
        version: string;
        runtime: string;
        discordJs: string;
        mongoose: string;
        canvas: string;
    }): void {
        const ts = Logger.getTimestamp();
        console.log(`${ts} ${chalk.cyan('⚡ SYSTEM CHECK')}  ${chalk.white('Environment & Dependencies Verified')}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('Engine:')}        ${chalk.magenta(info.engine)} ${chalk.green(`v${info.version}`)}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('Runtime:')}       ${chalk.green(info.runtime)}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('Discord.js:')}    ${chalk.green(info.discordJs)}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('Mongoose:')}      ${chalk.green(info.mongoose)}`);
        console.log(`${ts}   ${chalk.gray('└─')} ${chalk.gray('Canvas Engine:')} ${chalk.green(info.canvas)}`);
        Logger.blankLine();
    }

    static licenseReport(info: {
        key: string;
        customerName: string;
        tier: string;
        guildsText: string;
        mode: string;
    }): void {
        const ts = Logger.getTimestamp();
        const maskedKey = info.key.length > 8 ? `${info.key.substring(0, 4)}...${info.key.substring(info.key.length - 4)}` : info.key;

        const tierUpper = (info.tier || 'CUSTOMER').toUpperCase();
        let formattedTier = chalk.magenta.bold(info.tier);
        if (tierUpper.includes('MASTER') || tierUpper.includes('MST')) {
            formattedTier = chalk.yellow.bold(`Master (MST)`);
        } else if (tierUpper.includes('OPEN') || tierUpper.includes('OSS')) {
            formattedTier = chalk.green.bold(`Open Source (OSS)`);
        } else if (tierUpper.includes('CUSTOMER') || tierUpper.includes('CUS')) {
            formattedTier = chalk.magenta.bold(`Customer (CUS)`);
        }

        console.log(`${ts} ${chalk.yellow('🔐  LICENSE STATUS')} ${chalk.white('Verified Key')} ${chalk.gray(`[${maskedKey}]`)}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('Owner / Client:')} ${chalk.bold.cyan(info.customerName)}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('License Tier:')}   ${formattedTier}`);
        console.log(`${ts}   ${chalk.gray('├─')} ${chalk.gray('Guild Usage:')}    ${chalk.white(info.guildsText)}`);
        console.log(`${ts}   ${chalk.gray('└─')} ${chalk.gray('Status Mode:')}    ${chalk.green(info.mode)}`);
        Logger.blankLine();
    }

    static finalBootReport(info: {
        version: string;
        bootTimeMs: number;
        memoryMb: number;
        modulesCount: number;
        commandsCount: number;
        eventsCount: number;
        dashboardUrl?: string;
        remoteDashboardUrl?: string;
    }): void {
        const ts = Logger.getTimestamp();
        const secs = (info.bootTimeMs / 1000).toFixed(2);

        console.log(chalk.gray('═'.repeat(65)));
        console.log(` ${chalk.bold.magenta('🐾  FLOOFCORE REBORN')} ${chalk.green(`v${info.version}`)}  ${chalk.gray('— Final Status Report')}`);
        console.log(chalk.gray('─'.repeat(65)));
        console.log(` ${chalk.gray('⏱️  Boot Duration:')}   ${chalk.yellow(`${secs}s`)}`);
        console.log(` ${chalk.gray('🧠  Memory (RSS):')}    ${chalk.cyan(`${info.memoryMb.toFixed(1)} MB`)}`);
        console.log(` ${chalk.gray('📦  Active Modules:')}  ${chalk.green(String(info.modulesCount))}`);
        console.log(` ${chalk.gray('⚡  Commands Loaded:')} ${chalk.green(String(info.commandsCount))}`);
        console.log(` ${chalk.gray('📡  Events Registered:')}${chalk.green(String(info.eventsCount))}`);
        if (info.dashboardUrl) {
            console.log(` ${chalk.gray('🖥️  Local Dashboard:')}  ${chalk.blueBright(info.dashboardUrl)}`);
        }
        if (info.remoteDashboardUrl) {
            console.log(` ${chalk.gray('🌐  Remote Dashboard:')} ${chalk.cyan(info.remoteDashboardUrl)}`);
        }
        console.log(chalk.gray('═'.repeat(65)));
        console.log(`${ts} ${chalk.green.bold('✔  FLOOFCORE ENGINE READY & ONLINE')}`);
        Logger.blankLine();
    }

    // ─── Update & Changelog Formatting ────────────────────────────────────────

    static updateNotice(currentVersion: string, latestVersion: string, channel: string): void {
        const ts = Logger.getTimestamp();
        Logger.blankLine();
        console.log(`${ts} ${chalk.bold.yellow('🚀  UPDATE AVAILABLE')}  ${chalk.white(`v${currentVersion}`)} ${chalk.bold.cyan('➔')} ${chalk.bold.green(`v${latestVersion}`)} ${chalk.gray(`[${channel} channel]`)}`);
    }

    static changelogReport(builds: Array<{ version: string; description?: string; critical?: boolean }>): void {
        if (!builds || builds.length === 0) return;
        const ts = Logger.getTimestamp();
        console.log(`${ts} ${chalk.bold.cyan('📋  Release Notes & Improvements:')}`);

        for (const b of builds) {
            const icon = b.critical ? chalk.yellow('  ⚠️  Patch') : chalk.green('  ✨  Update');
            const verStr = chalk.bold.white(`v${b.version}`);
            const rawDesc = b.description || 'General performance updates, bug fixes, and stability improvements.';
            const descLines = rawDesc.split('\n').map(l => l.trim()).filter(Boolean);

            if (descLines.length <= 1) {
                console.log(`${ts} ${icon} ${verStr} ${chalk.gray('—')} ${chalk.white(rawDesc)}`);
            } else {
                console.log(`${ts} ${icon} ${verStr}`);
                descLines.forEach((line, idx) => {
                    const isLast = idx === descLines.length - 1;
                    const connector = isLast ? '└─' : '├─';
                    console.log(`${ts}     ${chalk.gray(connector)} ${chalk.white(line.replace(/^[•\-\*]\s*/, ''))}`);
                });
            }
        }
        Logger.blankLine();
    }

    static upToDateNotice(version: string, channel: string): void {
        const ts = Logger.getTimestamp();
        console.log(`${ts} ${chalk.bold.green('💎  ENGINE UP TO DATE')} ${chalk.white(`v${version}`)} ${chalk.gray(`[${channel} channel]`)}`);
    }

    static updateSyncReport(info: {
        version: string;
        filesCount: number;
        elapsedMs: number;
        fileList?: string[];
    }): void {
        const ts = Logger.getTimestamp();
        const verStr = chalk.bold.cyan(`v${info.version}`);
        const filesStr = chalk.green(`${info.filesCount} file(s) synced`);
        const timeStr = chalk.gray(`[${Math.round(info.elapsedMs)}ms]`);

        console.log(`${ts} ${chalk.magenta('◆ Update')}  ${verStr} ${filesStr} ${timeStr}`);

        if (info.fileList && info.fileList.length > 0) {
            const displayList = info.fileList.slice(0, 10);
            displayList.forEach((file, index) => {
                const isLast = index === displayList.length - 1 && info.fileList!.length <= 10;
                const connector = isLast ? '└─' : '├─';
                console.log(`${ts}   ${chalk.gray(connector)} ${chalk.gray('File Synced:')} ${chalk.white(file)}`);
            });
            if (info.fileList.length > 10) {
                const remaining = info.fileList.length - 10;
                console.log(`${ts}   ${chalk.gray('└─')} ${chalk.gray(`...and ${remaining} more file(s)`)}`);
            }
        }
    }

    static moduleUpdateReport(info: {
        name: string;
        oldVersion: string;
        newVersion: string;
        reEnabled?: boolean;
    }): void {
        const ts = Logger.getTimestamp();
        const modName = chalk.bold.cyan(info.name);
        const cleanOld = String(info.oldVersion || '0.0.1').replace(/^v+/, '');
        const cleanNew = String(info.newVersion || '0.0.1').replace(/^v+/, '');
        const verTrans = chalk.white(`v${cleanOld}`) + ' ' + chalk.bold.cyan('➔') + ' ' + chalk.bold.green(`v${cleanNew}`);
        const statusBadge = info.reEnabled ? chalk.yellow(' (Re-enabled)') : '';

        console.log(`${ts} ${chalk.bold.magenta('🧩  Module Update')}  ${modName} ${verTrans}${statusBadge}`);
    }


    static perModuleUpdateReport(info: {
        moduleName: string;
        files: string[];
        commands?: string[];
        isCore?: boolean;
        hashVerified?: boolean;
    }): void {
        const ts = Logger.getTimestamp();
        const headerTag = info.isCore ? chalk.bold.cyan('◆ Core System Update') : chalk.bold.magenta(`◆ Module Update  ${info.moduleName}`);
        const hashTag = info.hashVerified ? chalk.gray(' [SHA-256 hash verified]') : '';

        console.log(`${ts} ${headerTag}${hashTag}`);

        const totalItems = (info.files?.length || 0) + (info.commands?.length || 0);
        let currentIdx = 0;

        if (info.files) {
            info.files.forEach((file) => {
                currentIdx++;
                const isLast = currentIdx === totalItems;
                const connector = isLast ? '└─' : '├─';
                const label = info.isCore ? 'Core File:' : 'File Synced:';
                console.log(`${ts}   ${chalk.gray(connector)} ${chalk.gray(label)} ${chalk.white(file)}`);
            });
        }

        if (info.commands && info.commands.length > 0) {
            info.commands.forEach((cmd) => {
                currentIdx++;
                const isLast = currentIdx === totalItems;
                const connector = isLast ? '└─' : '├─';
                console.log(`${ts}   ${chalk.gray(connector)} ${chalk.cyan('Command Updated:')} ${chalk.green(cmd)}`);
            });
        }
    }
}

// Shim for legacy modules
export const logger = {
    info: (msg: string, ctx: string, icon?: string) => Logger.info(msg, ctx, icon),
    warn: (msg: string, ctx: string, icon?: string) => Logger.warn(msg, ctx, icon),
    error: (msg: string, ctx: string, err?: any, icon?: string) => Logger.error(msg, ctx, err, icon),
    success: (msg: string, ctx: string, icon?: string) => Logger.success(msg, ctx, icon),
    debug: (msg: string, ctx: string, icon?: string) => Logger.debug(msg, ctx, icon),
    fatal: (msg: string, ctx: string, err?: any, icon?: string) => Logger.fatal(msg, ctx, err, icon),
    setOnLogCallback: (cb: LogCallback | undefined) => Logger.setOnLogCallback(cb)
};
