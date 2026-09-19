import { Router } from 'express';
import crypto from 'crypto';
import { logger } from '../../../utils/Logger.js';
import { SERVER_BOOT_INSTANCE_ID, requireAuth, hasManageGuild } from '../middleware/auth.ts';
import { readGuildModuleConfig } from '../services/GuildConfigService.js';

const DISCORD_API = 'https://discord.com/api/v10';

export function resolveDashboardBaseUrl(req: any): string {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
    const host = (req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000').toString().split(',')[0].trim();
    return `${proto}://${host}`;
}

export function resolveCallbackUrl(req: any, cfg: any): string {
    const base = resolveDashboardBaseUrl(req);
    const configured = cfg?.dashboard?.callbackUrl || cfg?.dashboard?.oauth?.callbackUrl || cfg?.discord?.callbackUrl;
    if (configured && typeof configured === 'string' && configured.startsWith('http')) {
        return configured;
    }
    return `${base}/auth/callback`;
}

export default function authRoutes(bot: any, cfg: any): Router {
    const router = Router();

    const clientId = cfg?.discord?.clientId || cfg?.dashboard?.oauth?.clientId || cfg?.dashboard?.clientId;
    const clientSecret = cfg?.discord?.clientSecret || cfg?.dashboard?.oauth?.clientSecret || cfg?.dashboard?.clientSecret;

    // Discord OAuth2 Login Redirect
    router.get('/discord', (req: any, res) => {
        if (!clientId) {
            res.status(500).send('OAuth not configured: missing clientId in config.yml');
            return;
        }
        const state = crypto.randomBytes(16).toString('hex');
        req.session.oauthState = state;
        if (req.query.guild_id) {
            req.session.targetGuildId = req.query.guild_id;
        }

        const callbackUrl = resolveCallbackUrl(req, cfg);
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: callbackUrl,
            response_type: 'code',
            scope: 'identify guilds',
            state,
        });
        res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
    });

    // Legacy login alias
    router.get('/login', (_req, res) => res.redirect('/auth/discord'));

    // OAuth2 Callback
    router.get('/callback', async (req: any, res) => {
        const dashboardUrl = resolveDashboardBaseUrl(req);
        const verifyBaseUrl = dashboardUrl;
        const callbackUrl = resolveCallbackUrl(req, cfg);
        const { code, state } = req.query as Record<string, string>;

        if (!code) {
            res.redirect(`${dashboardUrl}/login?error=no_code`);
            return;
        }

        // Check for OAuth2 verification state payload
        let verifyState: { userId?: string; guildId: string } | null = null;
        try {
            if (state) {
                const decoded = decodeURIComponent(state);
                if (decoded.trim().startsWith('{')) {
                    const parsed = JSON.parse(decoded);
                    if (parsed && parsed.type === 'verify' && parsed.guildId) {
                        verifyState = parsed;
                    }
                }
            }
        } catch {}

        if (verifyState) {
            try {
                const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: callbackUrl,
                    }),
                });

                if (!tokenRes.ok) {
                    const errBody = await tokenRes.text().catch(() => 'unknown');
                    logger.error(`Verify OAuth token exchange failed (${tokenRes.status}): ${errBody}`, 'Auth');
                    res.redirect(`${verifyBaseUrl}/verify?success=false&message=${encodeURIComponent('OAuth token exchange failed. Please try again.')}`);
                    return;
                }

                const { access_token } = (await tokenRes.json()) as { access_token: string };

                const [userRes, guildsRes] = await Promise.all([
                    fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } }),
                    fetch(`${DISCORD_API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${access_token}` } }),
                ]);

                if (!userRes.ok || !guildsRes.ok) {
                    res.redirect(`${verifyBaseUrl}/verify?success=false&message=${encodeURIComponent('Failed to retrieve your Discord profile or servers.')}`);
                    return;
                }

                const user = (await userRes.json()) as any;
                const guilds = (await guildsRes.json()) as any[];

                if (verifyState.userId && user.id !== verifyState.userId) {
                    res.redirect(`${verifyBaseUrl}/verify?success=false&message=${encodeURIComponent('The authorized Discord account does not match the joining member.')}`);
                    return;
                }

                if (!verifyState.userId) {
                    verifyState.userId = user.id;
                }

                const blacklistModule = bot.moduleManager?.getModule?.('blacklist');
                if (!blacklistModule) {
                    res.redirect(`${verifyBaseUrl}/verify?success=false&message=${encodeURIComponent('Blacklist module is not loaded. Please contact an administrator.')}`);
                    return;
                }

                const badGuilds = await blacklistModule.badGuildRepo.getAll();
                const foundBadGuild = guilds.find((g: any) => badGuilds.some((bg: any) => bg.guildId === g.id));

                if (foundBadGuild) {
                    const targetGuild = bot.client?.guilds?.cache?.get(verifyState.guildId);
                    if (targetGuild) {
                        const banReason = `[OAuth2 Flagged] Member of flagged server "${foundBadGuild.name}" (${foundBadGuild.id})`;
                        await targetGuild.members.ban(verifyState.userId, { reason: banReason }).catch(() => null);

                        const userTag = `${user.username}#${user.discriminator || '0'}`;
                        await blacklistModule.repo.add({
                            userId: verifyState.userId,
                            reason: banReason,
                            addedBy: 'System (OAuth2 Verification)',
                            addedAt: new Date(),
                        });
                        await blacklistModule.logBlacklistBan(
                            bot.client,
                            verifyState.userId,
                            userTag,
                            banReason,
                            'System',
                            targetGuild.name,
                            targetGuild.id,
                            'on_join'
                        );
                    }

                    res.redirect(`${verifyBaseUrl}/verify?success=false&message=${encodeURIComponent(`Access Denied: You are a member of a flagged server: ${foundBadGuild.name}. You have been banned.`)}`);
                    return;
                }

                const targetGuild = bot.client?.guilds?.cache?.get(verifyState.guildId);
                if (targetGuild) {
                    const memberObj = await targetGuild.members.fetch(verifyState.userId).catch(() => null);
                    if (memberObj) {
                        const verifiedRole = targetGuild.roles.cache.find((r: any) =>
                            r.name.toLowerCase() === 'verified' ||
                            r.name.toLowerCase() === 'member' ||
                            r.name.toLowerCase() === 'tester'
                        );
                        if (verifiedRole) {
                            await memberObj.roles.add(verifiedRole).catch(() => null);
                        }
                    }
                }

                logger.success(`User ${user.username} (${user.id}) successfully verified via OAuth2.`, 'Blacklist');
                res.redirect(`${verifyBaseUrl}/verify?success=true`);
                return;
            } catch (e: any) {
                logger.error(`OAuth verification: ${e?.message}`, 'Dashboard');
                res.redirect(`${verifyBaseUrl}/verify?success=false&message=${encodeURIComponent('An internal server error occurred during verification.')}`);
                return;
            }
        }

        if (state !== req.session.oauthState) {
            res.redirect(`${dashboardUrl}/login?error=invalid_state`);
            return;
        }
        delete req.session.oauthState;

        try {
            const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: callbackUrl,
                }),
            });

            if (!tokenRes.ok) {
                const errBody = await tokenRes.text().catch(() => 'unknown');
                logger.error(`Login OAuth token exchange failed (${tokenRes.status}): ${errBody}`, 'Auth');
                const msg = encodeURIComponent(errBody.slice(0, 200));
                res.redirect(`${dashboardUrl}/login?error=token_exchange&details=${msg}`);
                return;
            }

            const { access_token } = (await tokenRes.json()) as { access_token: string };

            const [userRes, guildsRes] = await Promise.all([
                fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } }),
                fetch(`${DISCORD_API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${access_token}` } }),
            ]);

            if (!userRes.ok || !guildsRes.ok) {
                res.redirect(`${dashboardUrl}/login?error=fetch_user`);
                return;
            }

            const user = (await userRes.json()) as any;
            const guilds = (await guildsRes.json()) as any[];

            const botGuilds = new Set(bot.client?.guilds?.cache?.keys() ?? []);
            const userManageableGuilds = Array.isArray(guilds)
                ? guilds.filter((g: any) => botGuilds.has(g.id) && hasManageGuild(g.permissions ?? 0))
                : [];

            const isBotOwner = Boolean(
                cfg?.discord?.ownerId === user.id ||
                cfg?.discord?.ownerIds?.includes?.(user.id) ||
                cfg?.owners?.includes?.(user.id) ||
                cfg?.ownerId === user.id ||
                cfg?.ownerIds?.includes?.(user.id) ||
                bot.client?.application?.owner?.id === user.id
            );

            let isConfiguredAdmin = false;
            if (bot.client?.guilds?.cache) {
                for (const [gId, g] of bot.client.guilds.cache) {
                    const adminCfg = readGuildModuleConfig(gId, 'admins') || {};
                    if (Array.isArray(adminCfg.adminUserIds) && adminCfg.adminUserIds.includes(user.id)) {
                        isConfiguredAdmin = true;
                        break;
                    }
                }
            }

            // User is admin if bot owner, can manage any guild, or is configured as an admin
            const isAdmin = isBotOwner || userManageableGuilds.length > 0 || isConfiguredAdmin;

            (req.session as any).user = {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator ?? '0',
                avatar: user.avatar ?? null,
                globalName: user.global_name ?? user.username,
                accessToken: access_token,
                isAdmin: Boolean(isAdmin),
                guilds: Array.isArray(guilds) ? guilds : [],
            };
            (req.session as any).instanceId = SERVER_BOOT_INSTANCE_ID;

            req.session.save((err: any) => {
                if (err) {
                    res.redirect(`${dashboardUrl}/login?error=session_save`);
                    return;
                }
                if (isAdmin) {
                    res.redirect(`${dashboardUrl}/`);
                } else {
                    res.redirect(`${dashboardUrl}/hub`);
                }
            });

        } catch (e: any) {
            logger.error(`OAuth callback: ${e?.message}`, 'Dashboard');
            res.redirect(`${dashboardUrl}/login?error=server_error`);
        }
    });

    router.get('/me', requireAuth, (req: any, res) => {
        const { accessToken: _, ...safe } = (req.session as any).user;
        res.json({ ...safe, instanceId: SERVER_BOOT_INSTANCE_ID, targetGuildId: req.session.targetGuildId });
    });

    router.post('/logout', (req: any, res) => {
        req.session.destroy(() => res.json({ ok: true }));
    });

    router.get('/logout', (req: any, res) => {
        req.session.destroy(() => res.redirect('/'));
    });

    return router;
}
