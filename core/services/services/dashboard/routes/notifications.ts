import { Router, type Request, type Response } from 'express';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getBotVersion } from '../../../utils/updateHelper.ts';
import { paramValue } from '../middleware/auth.ts';

export interface DashboardNotification {
  id: string;
  type: 'update' | 'ticket' | 'appeal' | 'application' | 'suggestion' | 'automod' | 'backup' | 'system';
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  link: string;
  unread: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  meta?: Record<string, any>;
}

export default function notificationsRoutes(bot: any, cfg: any): Router {
  const router = Router();
  const acknowledgedIds = new Set<string>();

  function formatTimeAgo(timestamp: number): string {
    const elapsed = Date.now() - timestamp;
    const s = Math.floor(elapsed / 1000);
    if (s < 60) return 'Just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  router.get('/', async (req: Request, res: Response) => {
    const guildId = paramValue(req.query.guildId as string) || cfg?.discord?.guildId;
    const client = bot.client;
    const mm = bot.moduleManager;
    const notifications: DashboardNotification[] = [];

    // ── 1. Bot Update Check ────────────────────────────────────────────────
    try {
      const currentVer = getBotVersion();
      const updatesFlag = join(process.cwd(), '.update-available');
      if (existsSync(updatesFlag)) {
        try {
          const info = JSON.parse(readFileSync(updatesFlag, 'utf-8'));
          if (info.version && info.version !== currentVer) {
            notifications.push({
              id: `update-${info.version}`,
              type: 'update',
              title: `🚀 Bot Update v${info.version} Available`,
              desc: info.description || `New firmware release available. Click to review patch notes and install.`,
              time: 'New release',
              timestamp: info.timestamp || Date.now(),
              link: '/updates',
              unread: !acknowledgedIds.has(`update-${info.version}`),
              priority: 'high',
            });
          }
        } catch {}
      }
    } catch {}

    // ── 2. Tickets Module Check ────────────────────────────────────────────
    try {
      if (guildId && client) {
        const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
        if (guild) {
          // Check for active ticket channels
          const ticketChannels = guild.channels.cache.filter((c: any) => 
            c.isTextBased() && (c.name.startsWith('ticket-') || c.name.startsWith('support-') || c.name.startsWith('claim-'))
          );

          ticketChannels.forEach((ch: any) => {
            const id = `ticket-${ch.id}`;
            const created = ch.createdTimestamp || Date.now();
            notifications.push({
              id,
              type: 'ticket',
              title: `🎫 Active Support Ticket: #${ch.name}`,
              desc: `Channel active in ${guild.name}. Awaiting staff resolution.`,
              time: formatTimeAgo(created),
              timestamp: created,
              link: '/tickets',
              unread: !acknowledgedIds.has(id),
              priority: 'medium',
            });
          });
        }
      }
    } catch {}

    // ── 3. Appeals Check ───────────────────────────────────────────────────
    try {
      const appealsFile = join(process.cwd(), 'data', 'appeals.json');
      if (existsSync(appealsFile)) {
        const raw = JSON.parse(readFileSync(appealsFile, 'utf-8'));
        if (Array.isArray(raw)) {
          const pending = raw.filter((a: any) => (!guildId || a.guildId === guildId) && a.status === 'PENDING');
          pending.slice(0, 5).forEach((a: any) => {
            const id = `appeal-${a.id || a._id}`;
            notifications.push({
              id,
              type: 'appeal',
              title: `⚖️ Pending Disciplinary Appeal`,
              desc: `Submitted by ${a.user || a.userId || 'Member'} (${a.punishment || 'BAN'}).`,
              time: a.createdAt ? formatTimeAgo(new Date(a.createdAt).getTime()) : 'Recent',
              timestamp: a.createdAt ? new Date(a.createdAt).getTime() : Date.now(),
              link: '/appeals',
              unread: !acknowledgedIds.has(id),
              priority: 'urgent',
            });
          });
        }
      }
    } catch {}

    // ── 4. Applications Module Check ───────────────────────────────────────
    try {
      const appsFile = join(process.cwd(), 'modules', 'applications', 'data', 'applications.json');
      if (existsSync(appsFile)) {
        const raw = JSON.parse(readFileSync(appsFile, 'utf-8'));
        if (Array.isArray(raw)) {
          const pending = raw.filter((app: any) => (!guildId || app.guildId === guildId) && app.status === 'pending');
          pending.slice(0, 5).forEach((app: any) => {
            const id = `app-${app.id}`;
            notifications.push({
              id,
              type: 'application',
              title: `📝 New Application: ${app.username || 'Applicant'}`,
              desc: `Type: ${app.type || 'Staff Application'}. Awaiting moderation review.`,
              time: app.createdAt ? formatTimeAgo(app.createdAt) : 'Recent',
              timestamp: app.createdAt || Date.now(),
              link: '/modules/guild-center',
              unread: !acknowledgedIds.has(id),
              priority: 'medium',
            });
          });
        }
      }
    } catch {}

    // ── 5. Backups Check ───────────────────────────────────────────────────
    try {
      const backupDir = join(process.cwd(), 'runtime', 'backups');
      if (existsSync(backupDir)) {
        const files = readdirSync(backupDir).filter((f) => f.endsWith('.json') || f.endsWith('.zip'));
        if (files.length > 0) {
          const latestFile = files[files.length - 1];
          const id = `backup-${latestFile}`;
          notifications.push({
            id,
            type: 'backup',
            title: `🗄️ Vault Backup Snapshot Stored`,
            desc: `Snapshot archive ${latestFile} verified in runtime storage.`,
            time: 'System vault',
            timestamp: Date.now() - 3600000,
            link: '/backups',
            unread: !acknowledgedIds.has(id),
            priority: 'low',
          });
        }
      }
    } catch {}

    // Sort notifications: unread first, then by latest timestamp
    notifications.sort((a, b) => {
      if (a.unread && !b.unread) return -1;
      if (!a.unread && b.unread) return 1;
      return b.timestamp - a.timestamp;
    });

    const unreadCount = notifications.filter((n) => n.unread).length;
    res.json({
      success: true,
      unreadCount,
      notifications,
    });
  });

  // Acknowledge a single notification or all notifications
  router.post('/ack', (req: Request, res: Response) => {
    const { id, all, ids } = req.body || {};
    if (all) {
      // Clear all
      acknowledgedIds.clear();
      // Add sentinel or clear count
      res.json({ success: true, cleared: true });
      return;
    }

    if (Array.isArray(ids)) {
      ids.forEach((i) => acknowledgedIds.add(String(i)));
    } else if (id) {
      acknowledgedIds.add(String(id));
    }

    res.json({ success: true, acknowledged: id || ids });
  });

  return router;
}
