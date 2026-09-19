// --- Bun BSON / v8 Polyfill ---
import v8 from 'node:v8';
if (v8.startupSnapshot) {
    try { v8.startupSnapshot.isBuildingSnapshot(); } catch { v8.startupSnapshot.isBuildingSnapshot = () => false; }
}
// ------------------------------
import { Client, GatewayIntentBits, Partials, Events, ActivityType, Options } from "discord.js";
import figlet from "figlet";
import chalk from "chalk";
import readline from "readline";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { Logger } from "./core/utils/logger.ts";
import { ConfigManager } from "./core/managers/ConfigManager.ts";
import { DatabaseManager } from "./core/managers/DatabaseManager.ts";
import { ModuleManager } from "./core/managers/ModuleManager.ts";
import { InteractionManager } from "./core/managers/InteractionManager.ts";
import { LicenseManager, getKnownServerUrls } from "./core/utils/LicenseManager.ts";

export let licenseManager: LicenseManager | null = null;
import { DashboardServer } from "./core/services/dashboard/DashboardServer.ts";
import { CLIManager } from "./core/managers/CLIManager.ts";
import { getBotVersion } from "./core/utils/updateHelper.ts";

import { ErrorManager } from "./core/managers/ErrorManager.ts";
import { FloofcoreError, ErrorCode } from "./core/errors/FloofcoreError.ts";

ErrorManager.bindProcessHandlers();
Logger.loadModuleStylesSync();

// --- Container / Environment Dependency Verification ---
try {
    require.resolve('@tabler/icons-react');
    require.resolve('@tanstack/react-query');
} catch {
    Logger.warn('📦 Missing dashboard packages detected (@tabler/icons-react). Running package install...', 'Main');
    try {
        const { execSync } = require('node:child_process');
        const isBun = typeof (process.versions as any)?.bun === 'string';
        execSync(isBun ? 'bun install' : 'npm install', {
            cwd: process.cwd(),
            stdio: 'inherit',
            timeout: 180000,
        });
        Logger.success('✅ Dependencies installed successfully!', 'Main');
    } catch (err: any) {
        Logger.error(`❌ Auto-installation of dependencies failed: ${err.message}`, 'Main');
    }
}

Logger.info("Booting Floofcore Reborn engine...", "Main");

export let presenceInterval: ReturnType<typeof setInterval> | null = null;
let rotationIndex = 0;

export function setPresence(client: Client, config?: any): void {
    if (!client.user) return;

    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }

    const activeConfig = ConfigManager.get() || config || {};
    const presenceConfig = config?.discord?.presence || config?.presence || activeConfig.discord?.presence || {};
    const activitiesRaw = presenceConfig?.activities;
    const targetStatus = (presenceConfig?.status || 'online') as any;

    try {
        client.user.setStatus(targetStatus);
    } catch {}

    if (activitiesRaw && activitiesRaw.length > 0) {
        const buildActivity = (activity: any) => {
            const guildCount = client.guilds?.cache?.size ?? 1;
            const userCount = client.guilds?.cache?.reduce((acc: number, g: any) => acc + (g.memberCount || 0), 0) || (client.users?.cache?.size ?? 0);
            const ping = client.ws?.ping ?? 16;
            const botName = client.user?.username || activeConfig.name || 'FloofCore';

            let rawName = activity.name || '';
            rawName = rawName
                .replace(/\{guildCount\}/g, String(guildCount))
                .replace(/\{userCount\}/g, String(userCount))
                .replace(/\{ping\}/g, String(ping))
                .replace(/\{botName\}/g, botName);

            const actType = getActivityType(activity.type);
            let stateText = rawName.trim();

            if (actType === ActivityType.Playing) {
                if (!/^playing\s+/i.test(stateText)) {
                    stateText = 'Playing ' + stateText;
                }
            } else if (actType === ActivityType.Watching) {
                if (!/^watching\s+/i.test(stateText)) {
                    stateText = 'Watching ' + stateText;
                }
            } else if (actType === ActivityType.Listening) {
                if (/^to\s+/i.test(stateText)) {
                    stateText = 'Listening ' + stateText;
                } else if (!/^listening\s+/i.test(stateText)) {
                    stateText = 'Listening to ' + stateText;
                }
            } else if (actType === ActivityType.Competing) {
                if (!/^competing\s+/i.test(stateText)) {
                    if (/^in\s+/i.test(stateText)) {
                        stateText = 'Competing ' + stateText;
                    } else {
                        stateText = 'Competing in ' + stateText;
                    }
                }
            } else if (actType === ActivityType.Streaming) {
                if (!/^streaming\s+/i.test(stateText)) {
                    stateText = 'Streaming ' + stateText;
                }
            }

            const entry: any = {
                type: ActivityType.Custom,
                name: 'Custom Status',
                state: stateText,
            };

            if (activity.url && activity.url.trim() !== '') {
                entry.url = activity.url;
            }
            return entry;
        };


        if (presenceConfig?.rotate && activitiesRaw.length > 1) {
            const showActivity = (index: number) => {
                client.user?.setPresence({
                    activities: [buildActivity(activitiesRaw[index])],
                    status: targetStatus,
                });
            };

            rotationIndex = rotationIndex % activitiesRaw.length;
            showActivity(rotationIndex);
            rotationIndex++;

            presenceInterval = setInterval(() => {
                rotationIndex = rotationIndex % activitiesRaw.length;
                showActivity(rotationIndex);
                rotationIndex++;
            }, Math.max(20000, presenceConfig?.rotateInterval ?? 30000));

        } else {
            client.user?.setPresence({
                activities: [buildActivity(activitiesRaw[0])],
                status: targetStatus,
            });

            presenceInterval = setInterval(() => {
                if (!client.user) return;
                setPresence(client, activeConfig);
            }, 60 * 60 * 1000);
        }
    } else {
        const guildCount = client.guilds?.cache?.size ?? 1;
        client.user?.setPresence({
            activities: [{
                name: `with ${guildCount} servers`,
                type: ActivityType.Playing,
            }],
            status: targetStatus,
        });

        presenceInterval = setInterval(() => {
            if (!client.user) return;
            setPresence(client, activeConfig);
        }, 60 * 60 * 1000);
    }
}

function getActivityType(type: any): ActivityType {
    const s = String(type ?? '').trim().toUpperCase();
    if (s === 'PLAYING' || s === '0') return ActivityType.Playing;
    if (s === 'STREAMING' || s === '1') return ActivityType.Streaming;
    if (s === 'LISTENING' || s === '2') return ActivityType.Listening;
    if (s === 'WATCHING' || s === '3') return ActivityType.Watching;
    if (s === 'CUSTOM' || s === '4') return ActivityType.Custom;
    if (s === 'COMPETING' || s === '5') return ActivityType.Competing;
    return ActivityType.Playing;
}


function cacheLimit(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

const bootstrap = async () => {
    let client: Client | null = null;

    // 1. Load Configuration
    const config = await ConfigManager.loadConfig();

    // Set log level from config
    if (config.logging?.level) {
        Logger.setLevel(config.logging.level);
    }

    // Configure update rollback backup excludes (config-driven, applied
    // before any update so node_modules / .git / logs / etc. are skipped)
    if (config.updates?.backupExcludes?.length || config.updates?.backupIncludes?.length || config.updates?.cleanupTargets?.length) {
        const { setBackupExcludes, setBackupIncludes, setCleanupTargets } = await import("./core/utils/updateHelper.ts");
        if (config.updates.backupExcludes?.length) {
            setBackupExcludes(config.updates.backupExcludes);
        }
        if (config.updates.backupIncludes?.length) {
            setBackupIncludes(config.updates.backupIncludes);
        }
        if (config.updates.cleanupTargets?.length) {
            setCleanupTargets(config.updates.cleanupTargets);
        }
    }

    // Display ASCII banner
    console.clear();
    const bootStart = performance.now();
    Logger.banner(
        config.name || "Floofcore",
        config.color || "#9900FF",
        {}
    );

    // Diagnostics & System Environment Report
    Logger.systemDiagnostics({
        engine: "Floofcore Reborn",
        version: getBotVersion(),
        runtime: `Bun v${Bun.version || process.version} (${process.platform})`,
        discordJs: "v14.18.0",
        mongoose: "v8.12.1",
        canvas: "Active (@napi-rs/canvas)",
    });

    // 2. License Validation (must happen before anything else)
    if (config.license?.key) {
        const licDone = Logger.phase('Validating license');
        licenseManager = new LicenseManager({
            key: config.license.key,
            productId: 'floofcore',
            refreshInterval: 30,
            channel: config.updates?.channel || 'stable',
            server: config.license.server,
        });

        try {
            InteractionManager.licenseManager = licenseManager;
            await licenseManager.initialize();
            licDone();
            
            const maxGuilds = licenseManager.getMaxGuilds();
            const currentGuilds = client?.guilds?.cache?.size ?? 0;
            let guildsText = typeof maxGuilds === 'number' && Number.isFinite(maxGuilds) && maxGuilds < 999 
                ? `${currentGuilds}/${maxGuilds}` : `${currentGuilds}/Unlimited`;

            let modeStr = "Verified (Online)";
            const primaryGuildBanned = config.discord?.guildId && licenseManager.isGuildBanned(config.discord.guildId).banned;
            if (primaryGuildBanned) {
                modeStr = "Guild Banned (Access Revoked)";
                guildsText = "0/Blocked";
            }

            Logger.licenseReport({
                key: config.license.key,
                customerName: licenseManager.getCustomerName(),
                tier: licenseManager.getTier(),
                guildsText,
                mode: modeStr,
            });

            if (primaryGuildBanned) {
                const banCheck = licenseManager.isGuildBanned(config.discord.guildId);
                console.log(chalk.yellow('\n🔴  Bot features disabled: Configured guild has been banned by FLM.'));
                console.log(chalk.yellow(`🔴  Reason: ${banCheck.reason}\n`));
                // Note: We DO NOT exit the process here so that the dashboard can start and show the ban page, 
                // and the discord client can still connect to block interactions with the red embed!
            }
        } catch (err: any) {
            licDone();
            const isBanned = licenseManager?.isBanned() || licenseManager?.getStatus() === 'banned';
            const statusStr = isBanned ? "Banned (Access Revoked)" : "Invalid (Offline/Error)";

            Logger.licenseReport({
                key: config.license.key,
                customerName: licenseManager?.getCustomerName() || "Unknown Owner",
                tier: licenseManager?.getTier() || "Unknown Tier",
                guildsText: `0/Blocked`,
                mode: statusStr,
            });

            if (isBanned) {
                Logger.error(`🔴 License key is banned: ${licenseManager?.getBanReason() || 'Access Revoked'}`, 'LicenseManager');
                Logger.error('🔴 Bot startup aborted: Your license key has been banned by FLM.', 'LicenseManager');
                process.exit(1);
            } else {
                const errMsg = err?.message || 'Could not connect to FLM license server';
                Logger.error(`❌ License validation failed: ${errMsg}`, 'LicenseManager');
                Logger.error('🔴 Bot startup aborted: Unable to verify license with FLM server.', 'LicenseManager');
                process.exit(1);
            }
        }
    } else {
        Logger.warn('No license key found in config.yml — skipping license validation.', 'LicenseManager');
    }

    // ── Startup Update Check & Post-Update Verification ──────────────────
    const updatedFlag = join(process.cwd(), '.updated-flag');
    const wasUpdated = existsSync(updatedFlag);
    if (wasUpdated) {
        let flagVersion = getBotVersion();
        try {
            const raw = readFileSync(updatedFlag, 'utf-8');
            const data = JSON.parse(raw);
            if (data.version) flagVersion = data.version;
        } catch {}
        Logger.success(`🎉 System updated to v${flagVersion} successfully! Running integrity boot verification...`, 'System');
        try { rmSync(updatedFlag, { force: true }); } catch {}
    }

    // Check if the primary guild is banned to skip updates
    const primaryGuildBanned = config.discord?.guildId && licenseManager?.isGuildBanned(config.discord.guildId).banned;

    if (config.updates?.enabled !== false && !wasUpdated && !primaryGuildBanned) {
        const updateDone = Logger.phase('Checking for updates');
        const channel = config.updates?.channel || 'beta';
        let hasUpdate = false;
        let latest = '';
        let newBuilds: any[] = [];
        let downloadUrl = '';
        let selectedServerUrl = '';

        const compareSemver = (a: string, b: string): number => {
            const norm = (v: string) => v.replace(/^v/, '').split(/[-.]/).map((s) => parseInt(s, 10) || 0);
            const pa = norm(a);
            const pb = norm(b);
            const len = Math.max(pa.length, pb.length);
            for (let i = 0; i < len; i++) {
                const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
                if (diff !== 0) return diff > 0 ? 1 : -1;
            }
            return 0;
        };

        const servers = getKnownServerUrls();
        for (const serverUrl of servers) {
            try {
                const res = await fetch(`${serverUrl}/api/builds?channel=${channel}`, { signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                    const data = await res.json() as any;
                    const builds = (data?.builds ?? []) as any[];
                    const current = getBotVersion();
                    const fromIndex = builds.findIndex((b: any) => b.version === current);
                    newBuilds = fromIndex >= 0 ? builds.slice(0, fromIndex) : builds;
                    latest = builds[0]?.version;
                    hasUpdate = !!(latest && compareSemver(latest, current) > 0);
                    if (hasUpdate && builds[0]) {
                        downloadUrl = builds[0].downloadUrl || `${serverUrl}/builds/${channel}/${builds[0].filename}`;
                    }
                    selectedServerUrl = serverUrl;
                    break;
                }
            } catch {}
        }

        if (hasUpdate) {
            updateDone();
            const current = getBotVersion();
            Logger.updateNotice(current, latest, channel);
            Logger.changelogReport(newBuilds);

            const ask = (question: string, timeoutMs = 6000): Promise<string> => {
                if (!process.stdin.isTTY) {
                    return Promise.resolve(config.updates?.autoApply ? 'y' : 'n');
                }
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                return new Promise(resolve => {
                    const timer = setTimeout(() => {
                        try { rl.close(); } catch {}
                        console.log(chalk.gray(`\n⏰ No response received in ${timeoutMs / 1000}s — proceeding automatically...`));
                        resolve(config.updates?.autoApply ? 'y' : 'n');
                    }, timeoutMs);
                    rl.question(question, answer => {
                        clearTimeout(timer);
                        try { rl.close(); } catch {}
                        resolve(answer.trim().toLowerCase());
                    });
                });
            };

            const answer = await ask(
                chalk.yellow(`⚡ Apply update v${latest} now? (y/N) `)
            );

            if (answer === 'y' || answer === 'yes') {
                if (downloadUrl || selectedServerUrl) {
                    const applyDone = Logger.phase(`Applying delta update v${latest}`);
                    try {
                        const targetUrl = downloadUrl || `${selectedServerUrl}/builds/${channel}/floofcore-v${latest}.zip`;
                        Logger.info(`Downloading delta update payload from ${targetUrl}...`, 'UpdateHelper');
                        const res = await fetch(targetUrl);
                        if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
                        const zipBuf = Buffer.from(await res.arrayBuffer());
                        const zipPath = join(process.cwd(), 'update.zip');
                        writeFileSync(zipPath, zipBuf);

                        const { applyBotUpdate } = await import("./core/utils/updateHelper.ts");
                        const success = await applyBotUpdate(zipPath, latest);
                        try { if (existsSync(zipPath)) rmSync(zipPath, { force: true }); } catch {}

                        if (success) {
                            Logger.success("Bot updated successfully! Initiating clean container restart...", "System");
                            applyDone();
                            const { safeContainerReboot } = await import("./core/utils/updateHelper.ts");
                            await safeContainerReboot(1000);
                        } else {

                            Logger.error("Update failed — rolled back to backup", "System");
                            applyDone();
                        }
                    } catch (err: any) {
                        Logger.error(`Failed to run update process: ${err.message}`, "System");
                        applyDone();
                    }
                } else {
                    Logger.warn("Automatic update server unavailable.", "System");
                }
            } else {
                Logger.info("Skipping update. Starting bot...", "System");
            }
        } else {
            Logger.upToDateNotice(getBotVersion(), channel);
            updateDone();
        }

    }

    // 3. Connect to Database
    const dbDone = Logger.phase('Connecting to database');
    await DatabaseManager.connect();
    dbDone();

    // 4. Setup Client
    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildExpressions,
            GatewayIntentBits.GuildIntegrations,
            GatewayIntentBits.GuildWebhooks,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.DirectMessageTyping,
            GatewayIntentBits.MessageContent,
        ],
        partials: [
            Partials.User,
            Partials.Channel,
            Partials.GuildMember,
            Partials.Message,
            Partials.Reaction,
            Partials.GuildScheduledEvent,
            Partials.ThreadMember,
        ],
        // Unlimited Discord caches are especially expensive on small container hosts:
        // every member/presence update grows the heap and increases garbage-collection
        // work.  Keep useful recent data, while allowing command handlers to fetch a
        // member on demand when it is not cached.
        makeCache: Options.cacheWithLimits({
            MessageManager: cacheLimit(config.performance?.cacheLimits?.messages, 100),
            PresenceManager: cacheLimit(config.performance?.cacheLimits?.presences, 1000),
            ReactionManager: 0,
            GuildMemberManager: cacheLimit(config.performance?.cacheLimits?.members, 1000),
            UserManager: cacheLimit(config.performance?.cacheLimits?.users, 2000),
        }),
        sweepers: {
            messages: {
                interval: 300,
                lifetime: 1800,
            },
            threads: {
                interval: 600,
                lifetime: 3600,
            },
        },
        allowedMentions: { parse: ['users'], repliedUser: true },
        failIfNotExists: false,
        rest: { retries: 3, timeout: 15_000 },
    });

    client.setMaxListeners(0);

    client.on(Events.ClientReady, () => setPresence(client, config));

    client.once(Events.ClientReady, async () => {
        Logger.success(`Logged in as ${client.user?.tag}!`, "Client");

        // 4.5 Verify Server Membership Before Loading
        const serverDone = Logger.phase('Checking server membership');
        let guildCount = client.guilds.cache.size;
        if (guildCount === 0) {
            try {
                const fetched = await client.guilds.fetch();
                guildCount = fetched.size;
            } catch {}
        }

        const configuredGuildId = config.discord?.guildId;
        let primaryGuild = configuredGuildId ? client.guilds.cache.get(configuredGuildId) : null;
        if (configuredGuildId && !primaryGuild) {
            try {
                primaryGuild = await client.guilds.fetch(configuredGuildId).catch(() => null);
            } catch {}
        }

        if (guildCount === 0) {
            serverDone();
            const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user?.id || config.discord?.clientId}&permissions=8&scope=bot%20applications.commands`;
            const errorMsg = "Bot is not in any Discord server. Please invite the bot to a server before starting.";
            const err = new FloofcoreError(errorMsg, {
                code: ErrorCode.DISCORD_NO_GUILDS,
                hexCode: '0x0015',
                moduleName: 'Client',
                contextData: {
                    guildCount: 0,
                    configuredGuildId: configuredGuildId || 'None',
                    inviteUrl,
                    botId: client.user?.id,
                    botTag: client.user?.tag,
                },
            });
            Logger.error(errorMsg, "Client", err);
            console.log(chalk.cyan(`\n🔗 Bot Invite Link: ${chalk.underline.bold(inviteUrl)}\n`));
            console.log(chalk.red(`🔴 Bot startup aborted: Bot must be added to a server before modules can load.\n`));
            process.exit(1);
        }

        if (configuredGuildId && !primaryGuild) {
            serverDone();
            const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user?.id || config.discord?.clientId}&permissions=8&scope=bot%20applications.commands`;
            const errorMsg = `Bot is not in the configured primary server (ID: ${configuredGuildId}). Found in ${guildCount} other server(s), but missing from target server.`;
            const err = new FloofcoreError(errorMsg, {
                code: ErrorCode.DISCORD_NO_GUILDS,
                hexCode: '0x0015',
                moduleName: 'Client',
                contextData: {
                    guildCount,
                    configuredGuildId,
                    inviteUrl,
                    botId: client.user?.id,
                    botTag: client.user?.tag,
                },
            });
            Logger.error(errorMsg, "Client", err);
            console.log(chalk.cyan(`\n🔗 Bot Invite Link: ${chalk.underline.bold(inviteUrl)}\n`));
            console.log(chalk.red(`🔴 Bot startup aborted: Please invite the bot to configured server ${configuredGuildId} or update discord.guildId in config.yml.\n`));
            process.exit(1);
        }

        serverDone();
        const primaryGuildName = primaryGuild ? primaryGuild.name : (client.guilds.cache.first()?.name || 'Unknown');
        Logger.success(`Server verified: Active in ${guildCount} server(s) (Primary: "${primaryGuildName}").`, "Client");
        Logger.info("Core engine is running. Booting up modules...", "System");

        if (licenseManager) {
            licenseManager.setBot({ client, config });
        }

        // 5. Start Listening IMMEDIATELY for interactions (buttons, dropdowns, modals)
        InteractionManager.listen(client);

        // Load all Modules dynamically
        const modDone = Logger.phase('Loading modules');
        const modStart = performance.now();
        const summary = await ModuleManager.loadAll(client);

        // Expose managers on the client so commands/interactions can find them
        (client as any).moduleManager = ModuleManager;
        (client as any).interactionManager = InteractionManager;
        const modElapsed = performance.now() - modStart;
        modDone();

        // Ensure interaction router is listening
        InteractionManager.listen(client);

        // 7. Sync Slash Commands
        const cmdDone = Logger.phase('Syncing slash commands');
        await InteractionManager.syncCommands(client);
        cmdDone();

        const warmupSeconds = config.commands?.slash?.warmupSeconds ?? 0;
        if (warmupSeconds > 0) {
            client.user?.setPresence({
                activities: [{ name: '🔄 Updating commands…', type: ActivityType.Custom }],
                status: 'dnd',
            });
            InteractionManager.startWarmup(warmupSeconds, () => setPresence(client, config));
            Logger.debug(`Soft-reset warmup active for ${warmupSeconds}s.`, "System");
        }

        // 7. Start Web Dashboard directly on the Bot
        let dashboardUrl = 'Disabled';
        if (config.dashboard?.enabled !== false) {
            const dashDone = Logger.phase('Starting dashboard');
            const dashboard = new DashboardServer({
                client,
                config,
                databaseManager: DatabaseManager,
                moduleManager: {
                    getModule: (name: string) => ModuleManager.getModule(name),
                    getAllModules: () => ModuleManager.getAllModules(),
                    enableModule: (name: string) => ModuleManager.enableModule(name),
                    disableModule: (name: string) => ModuleManager.disableModule(name),
                    setModuleEnabled: (name: string, enabled: boolean) => ModuleManager.setModuleEnabled(name, enabled),
                    isModuleEnabled: (name: string) => ModuleManager.isModuleEnabled(name),
                },
                interactionManager: InteractionManager,
                setPresence: (newConfig?: any) => setPresence(client, newConfig || config),
            });
            try {
                dashboardUrl = await dashboard.start();
                Logger.success(`FloofCore Dashboard active on ${dashboardUrl}`, "Dashboard");
            } catch (err: any) {
                Logger.error(`Failed to start dashboard: ${err?.message ?? err}`, "Dashboard");
            } finally {
                dashDone();
            }
        } else {
            Logger.info("Dashboard is disabled in config.yml.", "Dashboard");
        }

        // Final Boot Diagnostic Summary Card
        const bootElapsedMs = performance.now() - bootStart;
        const rssMemory = process.memoryUsage().rss / (1024 * 1024);
        const totalCmds = summary.reduce((sum, m) => sum + m.commands, 0);
        const totalEvents = summary.reduce((sum, m) => sum + (m.events || 0), 0);

        let remoteDashboardUrl: string | undefined;
        try {
            const raw = config.dashboard?.publicUrl || config.dashboard?.callbackUrl || config.dashboard?.oauth?.callbackUrl;
            if (raw) {
                remoteDashboardUrl = new URL(raw).origin;
            }
        } catch {}

        const dashPort = parseInt(String(config.dashboard?.port ?? process.env.SERVER_PORT ?? process.env.PORT ?? 3000), 10);
        const localDashboardUrl = config.dashboard?.enabled !== false ? `http://localhost:${dashPort}` : undefined;

        Logger.finalBootReport({
            version: getBotVersion(),
            bootTimeMs: bootElapsedMs,
            memoryMb: rssMemory,
            modulesCount: summary.length,
            commandsCount: totalCmds,
            eventsCount: totalEvents,
            dashboardUrl: localDashboardUrl,
            remoteDashboardUrl: remoteDashboardUrl
        });

        // 8. Start Background AutoUpdate Polling Service
        try {
            const { AutoUpdateService } = await import("./core/services/update/AutoUpdateService.ts");
            const autoUpdateService = AutoUpdateService.getInstance();
            autoUpdateService.setBotInstance({ client, config });
            autoUpdateService.start();
        } catch (e: any) {
            Logger.warn(`Could not start AutoUpdateService: ${e.message}`, "AutoUpdate");
        }

        // 9. Start Terminal CLI
        CLIManager.start(client);
    });

    // 7. Connect to Discord
     if (!config.discord.token || config.discord.token === "YOUR_BOT_TOKEN_HERE") {
        Logger.warn("Bot token not provided in config.yml, skipping actual login.", "Client");
        return;
    }

    try {
        await client.login(config.discord.token);
    } catch (err) {
        Logger.error("Failed to login to Discord.", "Client", err);
    }
};

// Global Error Handling
process.on('uncaughtException', (error) => {
    Logger.error("Critical Uncaught Exception!", "System", error);
});

process.on('unhandledRejection', (reason) => {
    Logger.error("Unhandled Promise Rejection!", "System", reason);
});

bootstrap();
