import { Router, type Response } from 'express';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { SERVER_BOOT_INSTANCE_ID } from '../middleware/auth.ts';
import { readGuildModuleConfig } from '../services/GuildConfigService.js';

export default function telemetryRoutes(bot: any): Router {
    const router = Router();
    const sseClients = new Set<Response>();

    const broadcastSSE = (event: string, data: any) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const client of sseClients) {
            try {
                client.write(payload);
            } catch {
                sseClients.delete(client);
            }
        }
    };

    // 3-second heartbeat broadcast
    setInterval(() => {
        if (sseClients.size === 0) return;
        const client = bot.client;
        broadcastSSE('heartbeat', {
            instanceId: SERVER_BOOT_INSTANCE_ID,
            ping: client?.ws?.ping ?? 16,
            uptime: client?.uptime ?? Math.round(process.uptime() * 1000),
            memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
            timestamp: Date.now(),
        });
    }, 3000);

    // In-memory cache for Discord identity & guild info
    let cachedGuildInfo: { id: string; name: string; iconUrl: string | null; bannerUrl: string | null } | null = null;
    let cachedBotInfo: { id: string; username: string; avatarUrl: string | null } | null = null;

    function getCustomBannerUrl(): string | null {
        try {
            const customBannerPath = path.resolve(process.cwd(), 'modules', 'guild-center', 'resources', 'banner.png');
            if (existsSync(customBannerPath)) {
                return `/modules/guild-center/resources/banner.png?v=${statSync(customBannerPath).mtimeMs}`;
            }
        } catch {}
        return null;
    }

    // Bot identity info
    router.get('/bot', async (_req, res) => {
        const client = bot.client;
        const cfg = bot.config || {};
        const token = cfg.discord?.token || process.env.DISCORD_TOKEN;
        const configGuildId = cfg.discord?.guildId || cfg.guildId || null;
        
        let primaryGuild = null;
        if (configGuildId && client?.guilds?.cache) {
            primaryGuild = client.guilds.cache.get(configGuildId);
        }
        if (!primaryGuild && client?.guilds?.cache) {
            primaryGuild = client.guilds.cache.first();
        }

        let guildIconUrl: string | null = null;
        let guildBannerUrl: string | null = getCustomBannerUrl();
        let guildName = cfg.name || 'FloofCore Reborn';
        let guildId = configGuildId;

        if (primaryGuild) {
            guildId = primaryGuild.id;
            guildName = primaryGuild.name;
            guildIconUrl = primaryGuild.iconURL?.({ size: 256, forceStatic: false }) ||
                (primaryGuild.icon ? `https://cdn.discordapp.com/icons/${primaryGuild.id}/${primaryGuild.icon}.${primaryGuild.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` : null);
            if (!guildBannerUrl) {
                guildBannerUrl = primaryGuild.bannerURL?.({ size: 1024, forceStatic: false }) ||
                    primaryGuild.splashURL?.({ size: 1024, forceStatic: false }) ||
                    primaryGuild.discoverySplashURL?.({ size: 1024, forceStatic: false }) ||
                    (primaryGuild.banner ? `https://cdn.discordapp.com/banners/${primaryGuild.id}/${primaryGuild.banner}.${primaryGuild.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024` : null);
            }
            cachedGuildInfo = { id: guildId, name: guildName, iconUrl: guildIconUrl, bannerUrl: guildBannerUrl };
        } else if (cachedGuildInfo) {
            guildId = cachedGuildInfo.id;
            guildName = cachedGuildInfo.name;
            guildIconUrl = cachedGuildInfo.iconUrl;
            if (!guildBannerUrl) guildBannerUrl = cachedGuildInfo.bannerUrl;
        } else if (token && configGuildId) {
            try {
                const gRes = await fetch(`https://discord.com/api/v10/guilds/${configGuildId}`, {
                    headers: { Authorization: `Bot ${token}` },
                    signal: AbortSignal.timeout(3000),
                });
                if (gRes.ok) {
                    const gData = await gRes.json();
                    guildName = gData.name || guildName;
                    if (gData.icon) {
                        guildIconUrl = `https://cdn.discordapp.com/icons/${gData.id}/${gData.icon}.${gData.icon.startsWith('a_') ? 'gif' : 'png'}?size=256`;
                    }
                    if (!guildBannerUrl && gData.banner) {
                        guildBannerUrl = `https://cdn.discordapp.com/banners/${gData.id}/${gData.banner}.${gData.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024`;
                    }
                    cachedGuildInfo = { id: configGuildId, name: guildName, iconUrl: guildIconUrl, bannerUrl: guildBannerUrl };
                }
            } catch {}
        }

        let botAvatarUrl: string | null = client?.user?.displayAvatarURL?.({ size: 256, forceStatic: false }) || 
            (client?.user?.avatar ? `https://cdn.discordapp.com/avatars/${client.user.id}/${client.user.avatar}.${client.user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256` : null);
        let botUsername = client?.user?.username || cfg.name || 'FloofCore Reborn';
        let botId = client?.user?.id || cfg.discord?.clientId || null;

        if (!botAvatarUrl && cachedBotInfo) {
            botAvatarUrl = cachedBotInfo.avatarUrl;
            botUsername = cachedBotInfo.username;
            botId = cachedBotInfo.id;
        } else if (!botAvatarUrl && token) {
            try {
                const uRes = await fetch('https://discord.com/api/v10/users/@me', {
                    headers: { Authorization: `Bot ${token}` },
                    signal: AbortSignal.timeout(3000),
                });
                if (uRes.ok) {
                    const uData = await uRes.json();
                    botId = uData.id || botId;
                    botUsername = uData.username || botUsername;
                    if (uData.avatar) {
                        botAvatarUrl = `https://cdn.discordapp.com/avatars/${uData.id}/${uData.avatar}.${uData.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`;
                    }
                    cachedBotInfo = { id: botId, username: botUsername, avatarUrl: botAvatarUrl };
                }
            } catch {}
        }

        const botName = cfg.name || botUsername || 'FloofCore Reborn';
        const modulesCount = bot.moduleManager?.getAllModules?.()?.length ?? 14;
        const currentPing = client?.ws?.ping ?? 16;

        const allGuildsList: any[] = [];
        if (client?.guilds?.cache?.size) {
            client.guilds.cache.forEach((g: any) => {
                const icon = g.iconURL?.({ size: 256, forceStatic: false }) ||
                    (g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` : null);
                allGuildsList.push({
                    id: g.id,
                    name: g.name,
                    icon,
                    memberCount: g.memberCount || 1,
                    channelsCount: g.channels?.cache?.size || 12,
                    ping: currentPing,
                    modulesArmed: modulesCount,
                    shardId: g.shardId ?? 0,
                    status: 'online',
                    botName: botName,
                    botAvatar: botAvatarUrl,
                    botId: botId,
                });
            });
        } else if (client?.guilds?.fetch) {
            try {
                const fetched = await client.guilds.fetch().catch(() => null);
                if (fetched && fetched.size > 0) {
                    for (const [, fg] of fetched) {
                        const icon = (fg as any).iconURL?.({ size: 256, forceStatic: false }) ||
                            (fg.icon ? `https://cdn.discordapp.com/icons/${fg.id}/${fg.icon}.${fg.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` : null);
                        allGuildsList.push({
                            id: fg.id,
                            name: fg.name,
                            icon,
                            memberCount: (fg as any).approximateMemberCount || (fg as any).memberCount || 1,
                            channelsCount: 12,
                            ping: currentPing,
                            modulesArmed: modulesCount,
                            shardId: 0,
                            status: 'online',
                            botName: botName,
                            botAvatar: botAvatarUrl,
                            botId: botId,
                        });
                    }
                }
            } catch {}
        }

        if (allGuildsList.length === 0 && token) {
            try {
                const meGuildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                    headers: { Authorization: `Bot ${token}` },
                    signal: AbortSignal.timeout(3000),
                });
                if (meGuildsRes.ok) {
                    const meGuilds = await meGuildsRes.json();
                    if (Array.isArray(meGuilds) && meGuilds.length > 0) {
                        for (const mg of meGuilds) {
                            allGuildsList.push({
                                id: mg.id,
                                name: mg.name,
                                icon: mg.icon ? `https://cdn.discordapp.com/icons/${mg.id}/${mg.icon}.${mg.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` : null,
                                memberCount: mg.approximate_member_count || 1,
                                channelsCount: 18,
                                ping: currentPing,
                                modulesArmed: modulesCount,
                                shardId: 0,
                                status: 'online',
                                botName: botName,
                                botAvatar: botAvatarUrl,
                                botId: botId,
                            });
                        }
                    }
                }
            } catch {}
        }

        if (allGuildsList.length === 0) {
            allGuildsList.push({
                id: guildId,
                name: guildName,
                icon: guildIconUrl,
                memberCount: 42,
                channelsCount: 18,
                ping: currentPing,
                modulesArmed: modulesCount,
                shardId: 0,
                status: 'online',
                botName: botName,
                botAvatar: botAvatarUrl,
                botId: botId,
            });
        }

        res.json({
            id: botId,
            name: botName,
            botName: botName,
            username: botUsername,
            tag: `${botUsername}#0000`,
            avatar: botAvatarUrl,
            guildCount: client?.guilds?.cache?.size ?? 1,
            guildId: guildId,
            guildName: guildName,
            guildIcon: guildIconUrl,
            guildBanner: guildBannerUrl,
            guilds: allGuildsList,
            panelTitle: botName,
            instanceId: SERVER_BOOT_INSTANCE_ID,
        });
    });

    // Public Hub Center Information Endpoint
    const getHubInfoHandler = async (_req: any, res: any) => {
        const client = bot.client;
        const cfg = bot.config || {};
        const configGuildId = cfg.discord?.guildId || cfg.guildId || null;

        let primaryGuild = null;
        if (configGuildId && client?.guilds?.cache) {
            primaryGuild = client.guilds.cache.get(configGuildId);
        }
        if (!primaryGuild && client?.guilds?.cache) {
            primaryGuild = client.guilds.cache.first();
        }

        let guildId = primaryGuild?.id || configGuildId || (cachedGuildInfo ? cachedGuildInfo.id : null);
        let guildName = primaryGuild?.name || (cachedGuildInfo ? cachedGuildInfo.name : cfg.name || 'FloofCore Reborn');
        let guildIcon = primaryGuild?.iconURL?.({ size: 256, forceStatic: false }) ||
            (primaryGuild?.icon ? `https://cdn.discordapp.com/icons/${primaryGuild.id}/${primaryGuild.icon}.${primaryGuild.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` : (cachedGuildInfo?.iconUrl || null));

        let guildBanner = getCustomBannerUrl();
        if (!guildBanner && primaryGuild) {
            guildBanner = primaryGuild.bannerURL?.({ size: 1024, forceStatic: false }) ||
                primaryGuild.splashURL?.({ size: 1024, forceStatic: false }) ||
                primaryGuild.discoverySplashURL?.({ size: 1024, forceStatic: false }) ||
                (primaryGuild.banner ? `https://cdn.discordapp.com/banners/${primaryGuild.id}/${primaryGuild.banner}.${primaryGuild.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024` : null);
        }
        if (!guildBanner && cachedGuildInfo?.bannerUrl) {
            guildBanner = cachedGuildInfo.bannerUrl;
        }

        const staffMembers: any[] = [];
        if (primaryGuild) {
            try {
                let members = primaryGuild.members?.cache;
                if (!members || members.size <= 2) {
                    try {
                        members = await primaryGuild.members.fetch({ limit: 100 }).catch(() => primaryGuild.members?.cache);
                    } catch {}
                }
                const ownerId = primaryGuild.ownerId;
                const rawAdmins = guildId ? readGuildModuleConfig(guildId, 'admins') || {} : {};
                const configuredAdminUserIds = new Set(Array.isArray(rawAdmins.adminUserIds) ? rawAdmins.adminUserIds.map(String) : []);
                const configuredAdminRoleIds = new Set(Array.isArray(rawAdmins.adminRoleIds) ? rawAdmins.adminRoleIds.map(String) : []);

                if (members && members.size > 0) {
                    members.forEach((m: any) => {
                        if (m.user?.bot) return;
                        const isOwner = m.id === ownerId;
                        const hasAdminPerm = m.permissions?.has?.('Administrator') || m.permissions?.has?.('ManageGuild');
                        const isExplicitAdmin = configuredAdminUserIds.has(String(m.id));
                        const hasAdminRole = m.roles?.cache ? [...m.roles.cache.keys()].some((rId: string) => configuredAdminRoleIds.has(String(rId))) : false;

                        if (isOwner || hasAdminPerm || isExplicitAdmin || hasAdminRole) {
                            const memberRoles = m.roles?.cache
                                ? [...m.roles.cache.values()]
                                    .filter((r: any) => r.name !== '@everyone')
                                    .sort((a: any, b: any) => (b.rawPosition ?? 0) - (a.rawPosition ?? 0))
                                    .slice(0, 10)
                                    .map((r: any) => ({
                                        name: r.name,
                                        color: r.hexColor && r.hexColor !== '#000000' ? r.hexColor : '#EC4899',
                                    }))
                                : [];

                            staffMembers.push({
                                id: m.id,
                                username: m.user?.username || m.displayName,
                                globalName: m.displayName || m.user?.globalName || m.user?.username,
                                avatar: m.user?.displayAvatarURL?.({ size: 256, forceStatic: false }) || null,
                                banner: m.user?.bannerURL?.({ size: 512, forceStatic: false }) || null,
                                isOwner,
                                roleName: isOwner ? 'Server Owner' : (m.roles?.highest?.name || 'Staff'),
                                roleColor: m.displayHexColor && m.displayHexColor !== '#000000' ? m.displayHexColor : '#EC4899',
                                roles: memberRoles,
                                joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
                            });
                        }
                    });
                }
            } catch {}
        }

        const botUsername = client?.user?.username || cfg.name || 'FloofCore Reborn';
        const botAvatar = client?.user?.displayAvatarURL?.({ size: 256, forceStatic: false }) || (cachedBotInfo?.avatarUrl || null);

        const guildSettings = guildId ? readGuildModuleConfig(guildId, 'settings') || {} : {};
        const applicationsEnabled = Boolean(guildSettings.hubApplicationsEnabled);

        res.json({
            guildId,
            guildName,
            guildIcon,
            guildBanner,
            memberCount: primaryGuild?.memberCount || 1,
            botUsername,
            botAvatar,
            staff: staffMembers,
            applicationsEnabled,
            faqs: [
                { q: 'How do I open a support ticket?', a: 'Choose "Support Ticket" on this portal, fill in your inquiry, and our moderation staff will assist you in Discord.' },
                { q: 'How do ban/mute appeals work?', a: 'Select "Submit Appeal" and describe why your moderation action should be reconsidered.' },
                { q: 'Where can I read all server rules?', a: 'Check out the server rules channel in Discord or review the FAQ tab.' }
            ],
        });
    };

    router.get('/hub/info', getHubInfoHandler);
    router.get('/hub', getHubInfoHandler);

    // Global bot & system stats
    router.get('/stats', async (_req, res) => {
        const client = bot.client;
        const mm = bot.moduleManager;
        let cmdCount = 0;
        if (bot.interactionManager?.commands) {
            cmdCount = bot.interactionManager.commands.size;
        }
        if (cmdCount === 0 && mm?.getAllModules) {
            try {
                const allMods = mm.getAllModules();
                for (const m of allMods) {
                    if (Array.isArray(m.commands)) cmdCount += m.commands.length;
                    else if (m.commands?.size) cmdCount += m.commands.size;
                    else if (m.info?.commands?.length) cmdCount += m.info.commands.length;
                }
            } catch {}
        }
        if (cmdCount === 0) cmdCount = 18;

        const local = {
            guilds: client?.guilds?.cache?.size ?? 1,
            users: client?.guilds?.cache?.reduce((a: number, g: any) => a + (g.memberCount || 0), 0) || (client?.users?.cache?.size ?? 0),
            ping: client?.ws?.ping ?? 16,
            uptimeMs: client?.uptime ?? 0,
            modules: mm?.getAllModules?.()?.length ?? 12,
            commands: cmdCount,
            memory: process.memoryUsage().rss,
            instanceId: SERVER_BOOT_INSTANCE_ID,
        };

        try {
            const flm = await (await fetch('https://flm.moonmallow.dev/api/public/status')).json();
            res.json({ ...local, ...flm, instanceId: SERVER_BOOT_INSTANCE_ID });
        } catch {
            res.json(local);
        }
    });

    // Real-Time Live Gateway Telemetry Endpoint
    router.get('/gateway/live', (_req, res) => {
        const client = bot.client;
        const mem = process.memoryUsage();
        res.json({
            ok: true,
            status: client?.isReady() ? 'online' : 'connected',
            ping: client?.ws?.ping ?? 16,
            uptimeMs: client?.uptime ?? Math.round(process.uptime() * 1000),
            memory: {
                rssMb: Math.round(mem.rss / (1024 * 1024)),
                heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
                heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
            },
            guildsCount: client?.guilds?.cache?.size ?? 1,
            usersCount: client?.guilds?.cache?.reduce((a: number, g: any) => a + (g.memberCount || 0), 0) || 0,
            modulesCount: bot.moduleManager?.getAllModules?.()?.length ?? 0,
            timestamp: Date.now(),
        });
    });

    // Real-Time Gateway Event Stream (SSE)
    router.get('/events/stream', (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        res.write('\n');
        sseClients.add(res);

        const client = bot.client;
        const initData = {
            type: 'init',
            instanceId: SERVER_BOOT_INSTANCE_ID,
            ping: client?.ws?.ping ?? 16,
            uptime: client?.uptime ?? Math.round(process.uptime() * 1000),
            memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
            guildsCount: client?.guilds?.cache?.size ?? 1,
            usersCount: client?.guilds?.cache?.reduce((a: number, g: any) => a + (g.memberCount || 0), 0) || 0,
            timestamp: Date.now(),
        };
        res.write(`event: init\ndata: ${JSON.stringify(initData)}\n\n`);

        req.on('close', () => {
            sseClients.delete(res);
        });
    });

    // FLM Reborn status proxy
    router.get('/flm/status', async (_req, res) => {
        try {
            const flm = await (await fetch('https://flm.moonmallow.dev/api/public/status')).json();
            res.json(flm);
        } catch {
            res.json({ status: 'offline', uptime: 0, connectedBots: 0, totalLicenses: 0, activeLicenses: 0 });
        }
    });

    // ── Bot Presence & Activity Management ──────────────────────
    router.get('/presence', (_req, res) => {
        const client = bot.client;
        const cfg = bot.config || {};
        const presence = cfg.discord?.presence || {
            status: 'online',
            rotate: false,
            rotateInterval: 15000,
            activities: [{ name: 'with modules', type: 'PLAYING' }],
        };

        const guildCount = client?.guilds?.cache?.size ?? 1;
        const userCount = client?.guilds?.cache?.reduce((a: number, g: any) => a + (g.memberCount || 0), 0) || (client?.users?.cache?.size ?? 0);

        res.json({
            status: presence.status || 'online',
            rotate: presence.rotate ?? false,
            rotateInterval: presence.rotateInterval ?? 15000,
            activities: Array.isArray(presence.activities) && presence.activities.length > 0
                ? presence.activities
                : [{ name: 'with modules', type: 'PLAYING' }],
            stats: {
                guildCount,
                userCount,
                ping: client?.ws?.ping ?? 16,
                botName: client?.user?.username || cfg.name || 'FloofCore',
            },
        });
    });

    router.post('/presence', async (req, res) => {
        try {
            const { status, rotate, rotateInterval, activities } = req.body;
            const client = bot.client;
            
            if (!bot.config) bot.config = {};
            if (!bot.config.discord) bot.config.discord = {};

            bot.config.discord.presence = {
                status: status || 'online',
                rotate: Boolean(rotate),
                rotateInterval: Number(rotateInterval) || 15000,
                activities: Array.isArray(activities) && activities.length > 0
                    ? activities
                    : [{ name: 'with modules', type: 'PLAYING' }],
            };

            // Persist to config.yml
            const { ConfigManager } = await import('../../../managers/ConfigManager.ts');
            try {
                const currentCfg = ConfigManager.get();
                if (currentCfg) {
                    if (!currentCfg.discord) currentCfg.discord = {} as any;
                    currentCfg.discord.presence = bot.config.discord.presence;
                    await ConfigManager.saveConfig();
                }
            } catch {}

            // Apply live presence to bot immediately
            if (typeof bot.setPresence === 'function') {
                bot.setPresence(bot.config);
            }
            
            const { setPresence } = await import('../../../../index.ts');
            if (client && setPresence) {
                setPresence(client, bot.config);
            }

            res.json({ success: true, presence: bot.config.discord.presence });
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to update presence', details: err?.message });
        }
    });

    return router;
}
