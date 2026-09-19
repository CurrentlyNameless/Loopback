import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";
import { FloofcoreError, ErrorCode, ErrorHexCodes } from "../errors/FloofcoreError.ts";

export interface SerializedErrorEntry {
    name: string;
    message: string;
    code: string;
    hexCode: string;
    moduleName: string;
    contextData?: Record<string, unknown>;
    timestamp: string;
    stack?: string;
    /** Number of times this exact error (same fingerprint) has occurred back-to-back. Absent/undefined == 1. */
    occurrenceCount?: number;
    /** ISO timestamp of the first time this fingerprint was seen in the current streak. */
    firstSeen?: string;
}

export class ErrorManager {
    private static ERRORS_DIR = resolve("./core/errors");
    private static ERRORS_LOG_FILE = resolve("./core/errors/errors.yaml");
    private static MAX_ENTRIES = 50;

    // How long (ms) a repeated identical error can keep bumping the same entry's
    // occurrenceCount before it's treated as a "new" incident. Prevents a hot loop
    // from silently updating a stale-looking timestamp forever, while still collapsing bursts.
    private static DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    // NOTE on concurrent writes: logError()/clearErrors() below still use synchronous
    // fs calls (readFileSync/writeFileSync), which means each call runs to completion
    // without yielding the event loop - so within a single Node process there's no
    // interleaving race today. If this is ever migrated to async fs (fs/promises) for
    // throughput reasons, a per-file write queue/lock must be added at that point, or
    // two near-simultaneous writes to the same errors.yaml can clobber each
    // other on read-modify-write.

    public static getLogFilePath(_moduleName?: string): string {
        return this.ERRORS_LOG_FILE;
    }

    private static ensureLogFileForPath(filePath: string = this.ERRORS_LOG_FILE): void {
        try {
            const dir = resolve(filePath, "..");
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }

            if (!existsSync(filePath)) {
                const emptyYaml = yaml.dump([], { indent: 2 });
                writeFileSync(filePath, emptyYaml, "utf-8");
            }
        } catch (err) {
            console.error(`[ErrorManager] Failed to ensure log file at ${filePath}:`, err);
        }
    }

    /**
     * Builds a single searchable string out of every field an error could plausibly
     * carry identifying info in - message, name, stack, any custom `.details`/`.code`
     * property, and stringified contextData. inferErrorCode/inferModuleName should
     * always match against this instead of raw `.message` alone, since a lot of
     * error shapes in this codebase attach identifying codes (e.g. "TV1005") to
     * fields other than `message`.
     */
    private static buildHaystack(err: unknown): string {
        const errObj = err as any;
        const parts: string[] = [
            String(errObj?.message ?? ''),
            String(errObj?.name ?? ''),
            String(errObj?.stack ?? ''),
            errObj?.details != null ? String(errObj.details) : '',
            errObj?.code != null ? String(errObj.code) : '',
        ];

        if (errObj?.contextData && typeof errObj.contextData === 'object') {
            try {
                parts.push(JSON.stringify(errObj.contextData));
            } catch { /* circular or unserializable, skip */ }
        }

        // Fall back to stringifying the raw error itself (covers plain strings/objects thrown directly)
        if (!errObj?.message && !(err instanceof Error)) {
            parts.push(String(err ?? ''));
        }

        return parts.filter(Boolean).join(' ');
    }

    public static inferErrorCode(err: unknown, moduleContext: string = "Core"): ErrorCode {
        const errObj = err as any;
        const name = String(errObj?.name ?? '');
        const msg = this.buildHaystack(err);

        // 1. Rate Limits & Gateway Throttling
        if (name.includes('RateLimit') || msg.includes('429') || msg.includes('rate limit') || msg.includes('Too Many Requests') || msg.includes('slow down')) {
            return ErrorCode.DISCORD_RATE_LIMIT;
        }

        // 2. HTTP Payload & Entity Limits
        if (name.includes('PayloadTooLarge') || msg.includes('request entity too large') || msg.includes('413')) {
            return ErrorCode.PAYLOAD_TOO_LARGE;
        }

        // 3. Type & Reference Errors
        if (name.includes('TypeError') || msg.includes('is not a function') || msg.includes('is not an object') || msg.includes('cannot read property') || msg.includes('evaluating') || msg.includes('Cannot set property')) {
            return ErrorCode.TYPE_ERROR;
        }

        // 4. Syntax & Parsing Errors
        if (name.includes('SyntaxError') || name.includes('YAMLException') || msg.includes('Unexpected token') || msg.includes('JSON.parse') || msg.includes('YAML parse')) {
            return ErrorCode.SYNTAX_ERROR;
        }

        // 5. Database & Mongoose Timeouts
        if (name.includes('MongooseError') || msg.includes('buffering timed out') || msg.includes('MongoTimeoutError')) {
            return ErrorCode.MONGOOSE_TIMEOUT;
        }
        if (name.includes('Mongo') || name.includes('Sequelize') || msg.includes('Database repositories failed')) {
            return ErrorCode.DATABASE_ERROR;
        }

        // 6. Lavalink & Audio Voice Nodes
        if (msg.includes('Lavalink') || msg.includes('shoukaku') || msg.includes('UserId missing') || msg.includes('connector is misconfigured')) {
            return ErrorCode.LAVALINK_NODE_ERROR;
        }

        // 7. License & WebSocket Client
        if (msg.includes('license') || msg.includes('LICENSE SHUTDOWN') || msg.includes('connection already exists for this license')) {
            return ErrorCode.LICENSE_ERROR;
        }
        if (msg.includes('WebSocket disconnected') || msg.includes('WebSocket connection') || name.includes('WebSocket')) {
            return ErrorCode.WEBSOCKET_DISCONNECTED;
        }

        // 8. Discord Token & Missing Permissions / Entitlements
        if (msg.includes('An invalid token') || msg.includes('TOKEN_INVALID') || msg.includes('Used disallowed intents')) {
            return ErrorCode.DISCORD_TOKEN_INVALID;
        }
        if (msg.includes('Missing Permissions') || msg.includes('Missing Access') || msg.includes('MANAGE_GUILD') || msg.includes('Administrator permission required')) {
            return ErrorCode.DISCORD_MISSING_PERMISSIONS;
        }
        if (msg.includes('not in any Discord server') || msg.includes('not in the configured primary server') || msg.includes('DISCORD_NO_GUILDS')) {
            return ErrorCode.DISCORD_NO_GUILDS;
        }
        if (msg.includes('Unknown Message') || msg.includes('Unknown Channel') || msg.includes('Unknown Guild') || msg.includes('Unknown User') || msg.includes('10008') || msg.includes('10003')) {
            return ErrorCode.DISCORD_ENTITY_NOT_FOUND;
        }
        if (msg.includes('DiscordAPIError') || msg.includes('Invalid Form Body') || msg.includes('50035') || msg.includes('Cannot send message')) {
            return ErrorCode.API_ERROR;
        }
        if (msg.includes('TV1001') || msg.includes('TV1002') || msg.includes('TV1003') || msg.includes('TV1004') || msg.includes('TV1005') || msg.includes('TV2001') || msg.includes('TempVoice')) {
            return ErrorCode.TEMP_VOICE_ERROR;
        }

        // 9. Blacklist & Security Violations
        if (msg.includes('flagged') || msg.includes('OAuth2 Flagged') || msg.includes('malicious server')) {
            return ErrorCode.BLACKLIST_FLAGGED;
        }

        // 10. File System Errors
        if (name.includes('SystemError') || msg.includes('ENOENT') || msg.includes('EACCES') || msg.includes('EPERM') || msg.includes('ENOSPC')) {
            return ErrorCode.FILE_SYSTEM_ERROR;
        }

        // 11. Auth Session & OAuth
        if (msg.includes('invalid_state') || msg.includes('session_save') || msg.includes('token_exchange') || msg.includes('Unauthorized')) {
            return ErrorCode.SESSION_EXPIRED;
        }

        // 12. Network & General Timeouts
        if (msg.includes('ETIMEDOUT') || msg.includes('ESOCKETTIMEDOUT') || msg.includes('timed out')) {
            return ErrorCode.TIMEOUT_ERROR;
        }
        if (msg.includes('Cannot connect') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
            return ErrorCode.NETWORK_ERROR;
        }

        // 13. Permission Denied
        if (msg.includes('Permission') || msg.includes('Forbidden')) {
            return ErrorCode.PERMISSION_DENIED;
        }

        // 14. Config & API
        if (msg.includes('config')) return ErrorCode.CONFIG_ERROR;
        if (name.includes('DiscordAPIError') || name.includes('HTTPError')) {
            return ErrorCode.API_ERROR;
        }

        return ErrorCode.UNKNOWN_ERROR;
    }

    public static inferModuleName(err: unknown, moduleContext: string = "Core"): string {
        const errObj = err as any;

        // 1. Explicit property on error instance
        if (errObj?.moduleName && typeof errObj.moduleName === 'string' && errObj.moduleName !== 'Core' && errObj.moduleName !== 'FloofcoreError') {
            return errObj.moduleName;
        }
        if (errObj?.moduleContext && typeof errObj.moduleContext === 'string' && errObj.moduleContext !== 'Core') {
            return errObj.moduleContext;
        }

        // 2. Extract module folder name from stack trace path (e.g. /modules/auto-mod/lib/BackupLib.ts or \modules\auto-mod\...)
        const stack = String(errObj?.stack ?? '').replace(/\\+/g, '/');
        const match = stack.match(/\/modules\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
            return match[1];
        }

        // 2b. Fallback: check compiled/dist-style paths some bundlers/runtimes emit
        // instead of plain /modules/ stack frames (e.g. compiled dist output).
        const distMatch = stack.match(/\/dist\/modules\/([a-zA-Z0-9_-]+)/i);
        if (distMatch && distMatch[1]) {
            return distMatch[1];
        }

        // 3. Meaningful moduleContext passed in (not generic "Core" / "FloofcoreError")
        if (moduleContext && moduleContext !== 'Core' && moduleContext !== 'FloofcoreError') {
            return moduleContext;
        }

        return "Core";
    }

    /** Cheap fingerprint used to detect "the same error happening again" for dedup/occurrence collapsing. */
    private static fingerprint(entry: SerializedErrorEntry): string {
        return `${entry.moduleName}::${entry.code}::${entry.name}::${entry.message}`;
    }

    public static logError(err: FloofcoreError | Error | unknown, moduleContext: string = "Core"): SerializedErrorEntry {
        const resolvedModule = this.inferModuleName(err, moduleContext);
        const formattedModule = resolvedModule.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        const logFile = this.getLogFilePath(resolvedModule);
        this.ensureLogFileForPath(logFile);

        let errorEntry: SerializedErrorEntry;

        if (err instanceof FloofcoreError) {
            errorEntry = {
                ...err.toJSON(),
                name: (err.name && err.name !== 'FloofcoreError') ? err.name : `${formattedModule}Error`,
                hexCode: err.hexCode || ErrorHexCodes[err.code] || "0x0000",
                moduleName: resolvedModule,
            };
        } else if (err instanceof Error) {
            const code = this.inferErrorCode(err, resolvedModule);
            const hexCode = ErrorHexCodes[code] || "0x0000";
            const errorName = (err.name && err.name !== 'Error') ? `${formattedModule}${err.name}` : `${formattedModule}Error`;
            errorEntry = {
                name: errorName,
                message: err.message,
                code,
                hexCode,
                moduleName: resolvedModule,
                timestamp: new Date().toISOString(),
                stack: err.stack
            };
        } else {
            const code = this.inferErrorCode(err, resolvedModule);
            const hexCode = ErrorHexCodes[code] || "0x0000";
            errorEntry = {
                name: `${formattedModule}UnhandledError`,
                message: String(err),
                code,
                hexCode,
                moduleName: resolvedModule,
                timestamp: new Date().toISOString()
            };
        }

        try {
            let logs: SerializedErrorEntry[] = [];
            if (existsSync(logFile)) {
                const raw = readFileSync(logFile, "utf-8");
                const loaded = yaml.load(raw);
                if (Array.isArray(loaded)) logs = loaded;
            }

            // Dedup: if the most recent entry in this file is the same fingerprint and
            // within the dedup window, collapse into it instead of appending a duplicate.
            const fp = this.fingerprint(errorEntry);
            const mostRecent = logs[0];
            const withinWindow = mostRecent
                ? (Date.now() - new Date(mostRecent.timestamp).getTime()) <= this.DEDUP_WINDOW_MS
                : false;

            if (mostRecent && withinWindow && this.fingerprint(mostRecent) === fp) {
                errorEntry.occurrenceCount = (mostRecent.occurrenceCount ?? 1) + 1;
                errorEntry.firstSeen = mostRecent.firstSeen ?? mostRecent.timestamp;
                logs[0] = errorEntry;
            } else {
                errorEntry.occurrenceCount = 1;
                errorEntry.firstSeen = errorEntry.timestamp;
                logs.unshift(errorEntry);
            }

            if (logs.length > this.MAX_ENTRIES) {
                logs = logs.slice(0, this.MAX_ENTRIES);
            }

            const yamlStr = yaml.dump(logs, { indent: 2, lineWidth: -1 });
            writeFileSync(logFile, yamlStr, "utf-8");
        } catch (writeErr) {
            console.error(`[ErrorManager] Failed to persist error log to ${logFile}:`, writeErr);
        }

        return errorEntry;
    }

    public static getErrors(filter?: {
        moduleName?: string;
        code?: ErrorCode | string;
        limit?: number;
    }): SerializedErrorEntry[] {
        try {
            let allLogs: SerializedErrorEntry[] = [];
            this.ensureLogFileForPath(this.ERRORS_LOG_FILE);

            if (existsSync(this.ERRORS_LOG_FILE)) {
                const raw = readFileSync(this.ERRORS_LOG_FILE, "utf-8");
                const loaded = yaml.load(raw);
                if (Array.isArray(loaded)) allLogs = loaded;
            }

            if (filter?.moduleName && filter.moduleName !== 'all') {
                const targetMod = filter.moduleName.toLowerCase().replace(/[^a-z0-9]/g, '');
                allLogs = allLogs.filter(l => {
                    const mod = (l.moduleName || 'Core').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return mod === targetMod;
                });
            }

            if (filter?.code) {
                allLogs = allLogs.filter(l => l.code === filter.code);
            }

            // Sort aggregate logs by timestamp descending
            allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            if (filter?.limit && filter.limit > 0) {
                allLogs = allLogs.slice(0, filter.limit);
            }

            return allLogs;
        } catch (err) {
            console.error(`[ErrorManager] Failed to read error logs:`, err);
            return [];
        }
    }

    public static clearErrors(moduleName?: string): void {
        try {
            this.ensureLogFileForPath(this.ERRORS_LOG_FILE);

            if (!moduleName || moduleName.toLowerCase() === 'all') {
                const emptyYaml = yaml.dump([], { indent: 2 });
                writeFileSync(this.ERRORS_LOG_FILE, emptyYaml, "utf-8");
            } else {
                const targetMod = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '');
                let logs: SerializedErrorEntry[] = [];
                if (existsSync(this.ERRORS_LOG_FILE)) {
                    const raw = readFileSync(this.ERRORS_LOG_FILE, "utf-8");
                    const loaded = yaml.load(raw);
                    if (Array.isArray(loaded)) logs = loaded;
                }

                logs = logs.filter(l => {
                    const mod = (l.moduleName || 'Core').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return mod !== targetMod;
                });

                const yamlStr = yaml.dump(logs, { indent: 2, lineWidth: -1 });
                writeFileSync(this.ERRORS_LOG_FILE, yamlStr, "utf-8");
            }
        } catch (err) {
            console.error(`[ErrorManager] Failed to clear error logs${moduleName ? ` for ${moduleName}` : ''}:`, err);
        }
    }

    private static processHandlersBound = false;

    public static bindProcessHandlers(): void {
        if (this.processHandlersBound) return;
        this.processHandlersBound = true;

        // Lazily import the Logger via dynamic import instead of require(), since this
        // codebase resolves modules as ESM (.ts extension imports elsewhere assume
        // ESM/Bun/Deno-style resolution) where a bare require() would throw and silently
        // fall through to console.error on every single uncaught exception/rejection.
        const getLogger = async () => {
            const mod = await import("../utils/logger.ts");
            return mod.Logger;
        };

        process.on("uncaughtException", (err) => {
            getLogger()
                .then((Logger) => Logger.error(err.message || "Uncaught Exception", "Core", err))
                .catch(() => console.error("Uncaught Exception:", err));
        });

        process.on("unhandledRejection", (reason) => {
            const err = reason instanceof Error ? reason : new Error(String(reason));
            getLogger()
                .then((Logger) => Logger.error(err.message || "Unhandled Promise Rejection", "Core", err))
                .catch(() => console.error("Unhandled Rejection:", reason));
        });
    }
}