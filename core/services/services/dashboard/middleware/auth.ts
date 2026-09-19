import type { Request, Response, NextFunction } from 'express';
import { readGuildModuleConfig } from '../services/GuildConfigService.js';

export const SERVER_BOOT_INSTANCE_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

export function paramValue(val: string | string[] | undefined): string {
    if (Array.isArray(val)) return val[0] ?? '';
    return val ?? '';
}

export function hasManageGuild(permissions: string | number | bigint): boolean {
    try {
        const p = BigInt(permissions);
        // ADMINISTRATOR (0x8), MANAGE_GUILD (0x20), MANAGE_ROLES (0x10000000), MANAGE_CHANNELS (0x10)
        return (
            (p & 0x8n) === 0x8n ||
            (p & 0x20n) === 0x20n ||
            (p & 0x10000000n) === 0x10000000n ||
            (p & 0x10n) === 0x10n
        );
    } catch {
        return false;
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const sess = req.session as any;
    if (!sess?.user || sess.instanceId !== SERVER_BOOT_INSTANCE_ID) {
        if (sess?.user) {
            try { req.session.destroy(() => {}); } catch {}
        }
        res.status(401).json({ error: 'Unauthorized: Session expired due to bot restart', botRestarted: true });
        return;
    }
    next();
}

export function requireGuildAccess(req: Request, res: Response, next: NextFunction) {
    const sess = req.session as any;
    if (!sess?.user || sess.instanceId !== SERVER_BOOT_INSTANCE_ID) {
        if (sess?.user) {
            try { req.session.destroy(() => {}); } catch {}
        }
        res.status(401).json({ error: 'Unauthorized: Session expired due to bot restart', botRestarted: true });
        return;
    }
    if (sess.user?.isAdmin) {
        return next();
    }
    const id = paramValue(req.params.id);
    if (!id || id === 'default') return next();

    const userGuilds = (sess.user?.guilds ?? []) as any[];
    if (userGuilds.some((g: any) => g.id === id)) {
        return next();
    }
    const adminCfg = readGuildModuleConfig(id, 'admins') || {};
    if (Array.isArray(adminCfg.adminUserIds) && adminCfg.adminUserIds.includes(sess.user.id)) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
}

export function requireGuildManage(req: Request, res: Response, next: NextFunction) {
    const sess = req.session as any;
    if (!sess?.user || sess.instanceId !== SERVER_BOOT_INSTANCE_ID) {
        if (sess?.user) {
            try { req.session.destroy(() => {}); } catch {}
        }
        res.status(401).json({ error: 'Unauthorized: Session expired due to bot restart', botRestarted: true });
        return;
    }
    if (sess.user?.isAdmin) {
        return next();
    }
    const id = paramValue(req.params.id);
    if (!id || id === 'default') return next();

    const adminCfg = readGuildModuleConfig(id, 'admins') || {};
    if (Array.isArray(adminCfg.adminUserIds) && adminCfg.adminUserIds.includes(sess.user.id)) {
        return next();
    }

    const userGuilds = (sess.user?.guilds ?? []) as any[];
    const ug = userGuilds.find((g: any) => g.id === id);
    if (ug?.owner || (ug && hasManageGuild(ug.permissions ?? 0))) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden. Manage Server permission required.' });
}

export function requireGuildAdmin(req: Request, res: Response, next: NextFunction) {
    const sess = req.session as any;
    if (!sess?.user || sess.instanceId !== SERVER_BOOT_INSTANCE_ID) {
        if (sess?.user) {
            try { req.session.destroy(() => {}); } catch {}
        }
        res.status(401).json({ error: 'Unauthorized: Session expired due to bot restart', botRestarted: true });
        return;
    }
    if (sess.user?.isAdmin) {
        return next();
    }
    const id = paramValue(req.params.id);
    if (!id || id === 'default') return next();

    const userGuilds = (sess.user?.guilds ?? []) as any[];
    const ug = userGuilds.find((g: any) => g.id === id);
    if (ug?.owner) return next();
    if (!ug) { res.status(403).json({ error: 'Forbidden' }); return; }
    const perms = BigInt(ug.permissions ?? '0');
    if ((perms & BigInt(0x8)) !== BigInt(0x8)) {
        res.status(403).json({ error: 'Administrator permission required.' });
        return;
    }
    next();
}
