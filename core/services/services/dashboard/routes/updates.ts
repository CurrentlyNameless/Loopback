import { Router, type Request, type Response } from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseDocument } from 'yaml';
import { getBotVersion } from '../../../utils/updateHelper.ts';

export default function updatesRoutes(bot: any, cfg: any): Router {
  const router = Router();

  function readConfig() {
    const configPath = join(process.cwd(), 'config.yml');
    if (!existsSync(configPath)) return null;
    try {
      const content = readFileSync(configPath, 'utf-8');
      return parseDocument(content);
    } catch {
      return null;
    }
  }

  function saveConfig(doc: any) {
    const configPath = join(process.cwd(), 'config.yml');
    try {
      writeFileSync(configPath, doc.toString(), 'utf-8');
    } catch {}
  }

  function readPackageVersion(): string {
    try {
      const pkgPath = join(process.cwd(), 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.version) return pkg.version;
      }
    } catch {}
    return getBotVersion() || '0.0.0.5';
  }

  function compareVersionRevision(a: string, b: string): number {
    const cleanA = String(a || '').replace(/^v/, '').trim();
    const cleanB = String(b || '').replace(/^v/, '').trim();
    const [baseA, revAStr] = cleanA.split('-');
    const [baseB, revBStr] = cleanB.split('-');
    const partsA = baseA.split('.').map(n => parseInt(n, 10) || 0);
    const partsB = baseB.split('.').map(n => parseInt(n, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    const revA = revAStr ? (parseInt(revAStr.replace(/\D/g, ''), 10) || 0) : 0;
    const revB = revBStr ? (parseInt(revBStr.replace(/\D/g, ''), 10) || 0) : 0;
    if (revA > revB) return 1;
    if (revA < revB) return -1;
    return 0;
  }

  // ── GET /api/guilds/:id/update or /api/update ─────────────────────────────
  const getUpdateHandler = async (req: Request, res: Response) => {
    const current = readPackageVersion();
    const doc = readConfig();
    const rawUpdates = doc?.get('updates') as any;
    const configUpdates = rawUpdates?.toJSON ? rawUpdates.toJSON() : rawUpdates || {};

    const requestedChannel = (req.query.channel as string) || configUpdates.channel || 'beta';

    // Fetch real live builds dynamically from FLM server
    let flmBuilds: any[] = [];
    let latestVersion = current;
    let downloadUrl: string | null = null;

    const urls = [
      `http://localhost:2054/api/builds?channel=${requestedChannel}`,
      `https://flm.moonmallow.dev/api/builds?channel=${requestedChannel}`,
      `https://flm.moonmallow.dev/api/builds`
    ];

    for (const url of urls) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data?.builds) && data.builds.length > 0) {
            flmBuilds = data.builds.map((b: any) => {
              const fname = b.filename || `floofcore-v${b.version}.zip`;
              return {
                version: b.version,
                type: b.type || (b.version.includes('beta') ? 'beta' : 'update'),
                releaseDate: b.releaseDate || (b.publishedAt ? new Date(b.publishedAt).toISOString() : new Date().toISOString()),
                filename: fname,
                description: b.description || 'FloofCore Reborn modular release build.',
                critical: Boolean(b.critical),
                publishedBy: b.publishedBy || 'FLM Server',
                downloadUrl: `https://flm.moonmallow.dev/builds/${data.channel || requestedChannel}/${fname}`,
              };
            });
            latestVersion = data.currentVersion || flmBuilds[0]?.version || current;
            downloadUrl = flmBuilds[0]?.downloadUrl || null;
            break;
          }
        }
      } catch {}
    }

    // Fallback if network unreachable
    if (flmBuilds.length === 0) {
      flmBuilds = [
        {
          version: '0.0.1-alpha',
          type: 'update',
          releaseDate: '2026-08-27T18:04:00.000Z',
          filename: 'floofcore-v0.0.1-alpha.zip',
          description: '🎉 FloofCore Reborn v0.0.1 Alpha Release! Includes Embed & Announcement Studio, Giveaway Manager with Resend & Live Previews, Advent Calendar Canvas Cards, Webhook Center, and Guild Center overhaul.',
          critical: false,
          publishedBy: 'OnedEyePete',
          downloadUrl: 'https://flm.moonmallow.dev/builds/alpha/floofcore-v0.0.1-alpha.zip',
        },
        {
          version: '0.0.0.5',
          type: 'update',
          releaseDate: '2026-08-10T18:34:00.000Z',
          filename: 'floofcore-v0.0.0.5.zip',
          description: '⚡ CRITICAL UPDATE v0.0.0.5: Global Database Pool, Lavalink Audio Failover, 7-Day Offline License Cache, Enhanced Auto-Mod, High-Contrast CLI Shell, Appeals system & full HTML transcript exports.',
          critical: true,
          publishedBy: 'OnedEyePete',
          downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.5.zip',
        },
        {
          version: '0.0.0.4',
          type: 'update',
          releaseDate: '2026-07-28T20:53:19.874Z',
          filename: 'floofcore-v0.0.0.4.zip',
          description: 'Dashboard layout overhaul, dynamic animated backgrounds, GIF avatar/icon support, Cloudflare subdomain proxy support, CLI backup system bug fixes.',
          critical: true,
          publishedBy: 'System',
          downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.4.zip',
        },
        {
          version: '0.0.0.3',
          type: 'update',
          releaseDate: '2026-06-22T19:27:19.000Z',
          filename: 'floofcore-v0.0.0.3.zip',
          description: 'Fixed interaction error handler crash, added cache/memory limits, autocomplete support, improved license server connectivity with 30s timeouts.',
          critical: true,
          publishedBy: 'System',
          downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.3.zip',
        },
        {
          version: '0.0.0.2',
          type: 'update',
          releaseDate: '2026-05-30T16:31:30.371Z',
          filename: 'floofcore-v0.0.0.2.zip',
          description: 'Bug fixes and performance improvements across discord gateway.',
          critical: false,
          publishedBy: 'System',
          downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.2.zip',
        },
        {
          version: '0.0.0.1',
          type: 'update',
          releaseDate: '2026-05-29T00:00:00Z',
          filename: 'floofcore-v0.0.0.1.zip',
          description: 'Initial FloofCore Reborn release build.',
          critical: false,
          publishedBy: 'System',
          downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.1.zip',
        }
      ];
      latestVersion = '0.0.1-alpha';
      downloadUrl = 'https://flm.moonmallow.dev/builds/alpha/floofcore-v0.0.1-alpha.zip';
    }

    const hasUpdate = compareVersionRevision(latestVersion, current) > 0;

    res.json({
      ok: true,
      current,
      latest: latestVersion,
      hasUpdate,
      downloadUrl,
      channel: requestedChannel,
      builds: flmBuilds,
      updatesConfig: {
        enabled: configUpdates.enabled ?? false,
        autoApply: configUpdates.autoApply ?? false,
        pollInterval: configUpdates.pollInterval || { value: 6, unit: 'hours' },
        lastCheck: configUpdates.lastCheck || new Date().toISOString(),
      },
    });
  };

  router.get('/:id/update', getUpdateHandler);
  router.get('/update', getUpdateHandler);

  // ── PATCH Channel Switch ──────────────────────────────────────────────────
  const patchChannelHandler = async (req: Request, res: Response) => {
    const { channel } = req.body || {};
    if (!channel || (channel !== 'stable' && channel !== 'beta')) {
      return res.status(400).json({ error: 'Invalid channel. Must be "stable" or "beta".' });
    }

    const doc = readConfig();
    if (doc) {
      let updates = doc.get('updates') as any;
      if (!updates) {
        doc.set('updates', { channel });
      } else {
        updates.set('channel', channel);
      }
      saveConfig(doc);
    }

    res.json({ ok: true, channel });
  };

  router.patch('/:id/update/channel', patchChannelHandler);
  router.patch('/update/channel', patchChannelHandler);

  // ── PATCH Auto Update & Polling Config ────────────────────────────────────
  const patchAutoHandler = async (req: Request, res: Response) => {
    const { enabled, autoApply, pollInterval, channel } = req.body || {};
    const doc = readConfig();
    if (doc) {
      let updates = doc.get('updates') as any;
      if (!updates) {
        doc.set('updates', {
          enabled: Boolean(enabled),
          autoApply: Boolean(autoApply),
          pollInterval: pollInterval || { value: 6, unit: 'hours' },
          channel: channel || 'beta',
          lastCheck: new Date().toISOString(),
        });
      } else {
        if (enabled !== undefined) updates.set('enabled', Boolean(enabled));
        if (autoApply !== undefined) updates.set('autoApply', Boolean(autoApply));
        if (pollInterval) updates.set('pollInterval', pollInterval);
        if (channel) updates.set('channel', channel);
        updates.set('lastCheck', new Date().toISOString());
      }
      saveConfig(doc);
    }

    res.json({ ok: true, config: { enabled, autoApply, pollInterval, channel } });
  };

  router.patch('/:id/update/auto', patchAutoHandler);
  router.patch('/update/auto', patchAutoHandler);

  // ── POST Apply Update ─────────────────────────────────────────────────────
  const postApplyHandler = async (req: Request, res: Response) => {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Download URL is required' });
    }

    const current = readPackageVersion();
    if (compareVersionRevision(current, '0.0.0.5') >= 0) {
      const versionMatch = String(url).match(/floofcore-v?([0-9.]+)/i);
      if (versionMatch && compareVersionRevision(versionMatch[1], '0.0.0.5') < 0) {
        return res.status(400).json({
          error: `Downgrade blocked: Current version is v${current}. Downgrading to v${versionMatch[1]} (< v0.0.0.5) is permanently disallowed.`
        });
      }
    }

    res.json({ ok: true, message: 'Update sequence started', url });

    // Execute update application and instance restart in background
    setTimeout(async () => {
      try {
        const { Logger } = await import('../../../utils/logger.ts');
        Logger.info(`📥 Dashboard triggered update from ${url}...`, 'Dashboard');
        const zipRes = await fetch(url);
        if (!zipRes.ok) throw new Error(`Download failed with status ${zipRes.status}`);
        const zipBuf = Buffer.from(await zipRes.arrayBuffer());
        const zipPath = join(process.cwd(), 'update.zip');
        writeFileSync(zipPath, zipBuf);

        const { applyBotUpdate } = await import('../../../utils/updateHelper.ts');
        const success = await applyBotUpdate(zipPath);
        try { if (existsSync(zipPath)) rmSync(zipPath, { force: true }); } catch {}

        if (success) {
          Logger.success('✅ Update applied successfully via Dashboard! Rebooting bot instance...', 'Dashboard');
          setTimeout(() => {
            process.exit(0);
          }, 1500);
        } else {
          Logger.error('❌ Dashboard update failed — rolled back to backup', 'Dashboard');
        }
      } catch (err: any) {
        const { Logger } = await import('../../../utils/logger.ts');
        Logger.error(`Dashboard update execution error: ${err.message}`, 'Dashboard');
      }
    }, 500);
  };

  router.post('/:id/update/apply', postApplyHandler);
  router.post('/update/apply', postApplyHandler);

  return router;
}

