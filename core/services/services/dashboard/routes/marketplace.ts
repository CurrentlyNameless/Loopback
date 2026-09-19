import { Router, type Request, type Response } from 'express';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import multer from 'multer';
import JSZip from 'jszip';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { LicenseManager } from '../../../utils/LicenseManager.ts';
import { ModuleManager } from '../../../managers/ModuleManager.ts';
import { mountModuleRoutes, mountSingleModuleRoutes } from '../services/ModuleDashboardDiscovery.ts';
import { logger } from '../../../utils/logger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeSemver(v: any): number[] {
  if (!v) return [0, 0, 0];
  const clean = String(v).replace(/^v/i, '').trim();
  const parts = clean.split('.');
  return parts.map((p) => {
    const num = parseInt(p.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  });
}

function compareSemver(remote: string, local: string): number {
  const [rMaj = 0, rMin = 0, rPatch = 0] = normalizeSemver(remote);
  const [lMaj = 0, lMin = 0, lPatch = 0] = normalizeSemver(local);
  if (rMaj !== lMaj) return rMaj - lMaj;
  if (rMin !== lMin) return rMin - lMin;
  return rPatch - lPatch;
}

export default function marketplaceRoutes(bot: any, cfg: any): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
  const localCatalogPath = path.resolve(__dirname, '../data/modulesCatalog.json');
  const modulesDir = path.resolve(__dirname, '../../../../modules');

  const DEFAULT_FLM_URL = 'https://flm.moonmallow.dev';
  let cachedFlmUrl: string | null = null;
  let lastFlmCheck = 0;

  const resolveFlmUrl = async (): Promise<string> => {
    // 1. Explicit env override
    if (process.env.FLM_SERVER_URL) {
      return process.env.FLM_SERVER_URL.replace(/\/+$/, '');
    }

    // 2. LicenseManager active server if online
    const lmServer = (LicenseManager as any)?.instance?.getActiveServerUrl?.() || (global as any).licenseManager?.getActiveServerUrl?.();
    if (lmServer && typeof lmServer === 'string' && !lmServer.includes('localhost:3000')) {
      return lmServer.replace(/\/+$/, '');
    }

    // 3. User configured in config.yml (if not a dead localhost)
    const userCfgUrl = cfg?.license?.server || cfg?.dashboard?.flmUrl;
    if (userCfgUrl && !userCfgUrl.includes('localhost') && !userCfgUrl.includes('127.0.0.1')) {
      return userCfgUrl.replace(/\/+$/, '');
    }

    // Cache check every 30s
    const now = Date.now();
    if (cachedFlmUrl && now - lastFlmCheck < 30000) {
      return cachedFlmUrl;
    }
    lastFlmCheck = now;

    // Check if local dev instance is running on 2053
    const localTarget = (userCfgUrl && (userCfgUrl.includes('localhost') || userCfgUrl.includes('127.0.0.1')))
      ? userCfgUrl
      : 'http://localhost:2053';

    try {
      const ping = await fetch(`${localTarget}/api/public/status`, { signal: AbortSignal.timeout(400) });
      if (ping.ok) {
        cachedFlmUrl = localTarget.replace(/\/+$/, '');
        return cachedFlmUrl;
      }
    } catch {}

    cachedFlmUrl = DEFAULT_FLM_URL;
    return cachedFlmUrl;
  };

  // ── 1. GET /api/marketplace — Fetch from FLM 2.0 Registry + Enrich with Local Bot State
  router.get('/', async (_req: Request, res: Response) => {
    try {
      let catalog: any[] = [];
      const flmUrl = await resolveFlmUrl();

      // Try fetching live catalog (official + community) from FLM Reborn 2.0
      try {
        const flmRes = await fetch(`${flmUrl}/api/marketplace/modules`, {
          headers: { 'x-license-key': cfg?.license?.key || '' },
          signal: AbortSignal.timeout(6000),
        });
        if (flmRes.ok) {
          const flmData = await flmRes.json();
          if (Array.isArray(flmData.modules)) {
            catalog = flmData.modules;
          }
        }
      } catch (e: any) {
        logger.debug?.(`Could not reach FLM marketplace at ${flmUrl}, using local catalog fallback.`, 'Marketplace');
      }

      // Fallback to local catalog if FLM was unreachable
      if (catalog.length === 0 && existsSync(localCatalogPath)) {
        catalog = JSON.parse(readFileSync(localCatalogPath, 'utf8'));
      }

      const FORBIDDEN_MODULES = new Set<string>();
      catalog = catalog.filter((m) => !FORBIDDEN_MODULES.has(String(m.id || '').toLowerCase()));

      // Read runtime active modules
      const activeModulesMap = bot?.moduleManager ? (bot.moduleManager as any)._modules : null;

      const enrichedCatalog = catalog.map((item) => {
        const modFolder = path.join(modulesDir, item.id);
        const isInstalled = existsSync(modFolder);
        const isAllowedByLicense = LicenseManager.canLoadModule(item.id);

        let resolvedArtUrl = item.artUrl || null;
        if (!resolvedArtUrl && isInstalled) {
          const bannerCandidates = [
            path.join(modFolder, 'resources', 'banner.png'),
            path.join(modFolder, 'assets', 'banner.png'),
            path.join(modFolder, 'banner.png'),
            path.join(modFolder, 'dashboard', 'banner.png'),
          ];
          if (bannerCandidates.some((c) => existsSync(c))) {
            resolvedArtUrl = `/api/marketplace/art/${item.id}`;
          } else {
            for (const sub of ['assets', 'resources', 'dashboard']) {
              const subDir = path.join(modFolder, sub);
              if (existsSync(subDir)) {
                try {
                  const files = readdirSync(subDir);
                  if (files.some((f) => /banner/i.test(f))) {
                    resolvedArtUrl = `/api/marketplace/art/${item.id}`;
                    break;
                  }
                } catch {}
              }
            }
          }
        }

        let isEnabled = false;
        if (isInstalled && activeModulesMap) {
          isEnabled = activeModulesMap.has(item.id) || activeModulesMap.has(item.id.toLowerCase());
        } else if (isInstalled) {
          isEnabled = true;
        }

        let installedVersion: string | undefined = undefined;
        let hasUpdate = false;

        if (isInstalled) {
          const ymlPath = path.join(modFolder, 'module.yml');
          if (existsSync(ymlPath)) {
            try {
              const raw = readFileSync(ymlPath, 'utf8');
              const parsed = (yaml.load(raw) as any) || {};
              if (parsed.version) {
                installedVersion = String(parsed.version).trim();
              }
              const yamlIcon = parsed.logger?.icon || parsed.icon || parsed.emoji;
              if (yamlIcon) {
                item.icon = yamlIcon;
              }
              const yamlColor = parsed.logger?.color || parsed.color;
              if (yamlColor) {
                item.color = yamlColor;
              }
              if (parsed.label) {
                item.label = parsed.label;
              }
              if (parsed.description) {
                item.description = parsed.description;
              }
              if (parsed.author) {
                item.author = parsed.author;
              }
            } catch {
              try {
                const raw = readFileSync(ymlPath, 'utf8');
                const match = raw.match(/version:\s*['"]?([^'"\r\n]+)['"]?/i);
                if (match && match[1]) {
                  installedVersion = match[1].trim();
                }
              } catch {}
            }
          }
          if (!installedVersion) {
            const manifestPath = path.join(modFolder, 'dashboard', 'manifest.json');
            if (existsSync(manifestPath)) {
              try {
                const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
                if (m.version) installedVersion = String(m.version).trim();
              } catch {}
            }
          }
          if (!installedVersion) {
            installedVersion = '1.0.0';
          }

          const cleanInstalled = installedVersion.replace(/^v/i, '').trim();
          const remoteVersion = item.version ? String(item.version).replace(/^v/i, '').trim() : undefined;
          hasUpdate = Boolean(remoteVersion && compareSemver(remoteVersion, cleanInstalled) > 0);
          installedVersion = cleanInstalled;
        }

        return {
          ...item,
          artUrl: resolvedArtUrl,
          version: item.version || (installedVersion ? installedVersion : '1.0.0'),
          installed: isInstalled,
          enabled: isEnabled,
          licenseAllowed: isAllowedByLicense,
          installedVersion,
          hasUpdate,
        };
      });

      res.json({
        success: true,
        modules: enrichedCatalog,
        total: enrichedCatalog.length,
        flmConnected: Boolean(flmUrl),
      });
    } catch (err: any) {
      logger.error(`Failed to load marketplace catalog: ${err.message}`, 'Marketplace');
      res.status(500).json({ error: 'Failed to load module marketplace' });
    }
  });

  // ── 2. POST /api/marketplace/install — Download zip from FLM, Extract & Hot-Mount
  router.post('/install', async (req: Request, res: Response) => {
    try {
      const { moduleId, update } = req.body || {};
      if (!moduleId || typeof moduleId !== 'string') {
        res.status(400).json({ error: 'Valid moduleId is required' });
        return;
      }

      // 1. Verify license allowance via LicenseManager
      const isAllowed = LicenseManager.canLoadModule(moduleId);
      if (!isAllowed) {
        res.status(403).json({
          error: `Your current license key tier does not allow installation of "${moduleId}". Upgrade key to unlock.`,
        });
        return;
      }

      const modFolder = path.join(modulesDir, moduleId);
      const isInstalled = existsSync(modFolder);
      const isUpdate = Boolean(update || req.body.force);

      // If not installed or if user is performing an update, fetch zip from FLM Registry and extract it
      if (!isInstalled || isUpdate) {
        const flmUrl = await resolveFlmUrl();
        logger.info(
          `${isUpdate ? 'Updating' : 'Fetching'} module package "${moduleId}" from FLM registry (${flmUrl})...`,
          'Marketplace'
        );
        const downloadRes = await fetch(`${flmUrl}/api/marketplace/modules/${moduleId}/download`, {
          headers: { 'x-license-key': cfg?.license?.key || '' },
        });

        if (!downloadRes.ok) {
          const errBody = await downloadRes.json().catch(() => ({}));
          throw new Error(errBody.error || `FLM download failed with status ${downloadRes.status}`);
        }

        const arrayBuffer = await downloadRes.arrayBuffer();
        const zip = await JSZip.loadAsync(Buffer.from(arrayBuffer));

        mkdirSync(modFolder, { recursive: true });

        // Detect if zip has a single top-level folder (e.g. ai-system/) and strip it
        // so that modules/ai-system/ai-system/index.ts → modules/ai-system/index.ts
        const zipEntries = Object.keys(zip.files);
        const topLevelNames = new Set(zipEntries.map(e => e.split('/')[0]).filter(Boolean));
        const stripPrefix = topLevelNames.size === 1 ? `${[...topLevelNames][0]}/` : '';

        // Unpack zip entries (overwriting), stripping the common root prefix if present
        for (const [relativePath, file] of Object.entries(zip.files)) {
          const stripped = stripPrefix && relativePath.startsWith(stripPrefix)
            ? relativePath.slice(stripPrefix.length)
            : relativePath;
          if (!stripped) continue; // skip the root dir entry itself
          if (file.dir) {
            mkdirSync(path.join(modFolder, stripped), { recursive: true });
          } else {
            const content = await file.async('nodebuffer');
            const dest = path.join(modFolder, stripped);
            mkdirSync(path.dirname(dest), { recursive: true });
            writeFileSync(dest, content);
          }
        }

        logger.success(
          `Extracted ${isUpdate ? 'updated' : 'community'} module "${moduleId}" into ${modFolder}`,
          'Marketplace'
        );
      }

      // 2. Hot-load the module into the running bot (events, commands, onLoad/onReady)
      try {
        const loaded = await ModuleManager.hotLoadModule(moduleId, bot?.client ?? undefined);
        if (!loaded) {
          logger.warn(`hotLoadModule did not fully succeed for "${moduleId}" — module may need a restart to activate bot features.`, 'Marketplace');
        }
      } catch (mmErr: any) {
        logger.warn(`hotLoadModule error for "${moduleId}": ${mmErr?.message ?? mmErr}`, 'Marketplace');
      }

      // 3. Mount dashboard API routes for this module (targeted, duplicate-safe)
      try {
        const app = (req as any).app;
        if (app) {
          await mountSingleModuleRoutes(app, modulesDir, moduleId, bot);
        }
      } catch (mErr: any) {
        logger.warn(`Could not hot-mount dashboard routes for ${moduleId}: ${mErr.message}`, 'Marketplace');
      }

      // 4. Sync Discord slash commands (already done inside hotLoadModule but re-sync to be safe)
      if (bot?.client && bot?.interactionManager) {
        try {
          await bot.interactionManager.syncCommands?.();
        } catch {}
      }

      logger.info(
        `Module "${moduleId}" ${isUpdate ? 'updated' : 'installed'} and synchronized successfully.`,
        'Marketplace'
      );

      res.json({
        success: true,
        moduleId,
        installed: true,
        enabled: true,
        updated: isUpdate,
        message: `Module "${moduleId}" successfully ${isUpdate ? 'updated' : 'installed'} and synchronized!`,
      });
    } catch (err: any) {
      logger.error(`Error installing/updating module: ${err.message}`, 'Marketplace');
      res.status(500).json({ error: err.message || 'Failed to install/update module' });
    }
  });

  // ── 2b. POST /api/marketplace/uninstall — Gracefully Unload & Delete Module
  const PROTECTED_MODULES = new Set([
    'core-commands',
    'corecommands',
    'core',
    'guild-center',
    'guildcenter',
    'license-manager',
    'module-manager',
    'update-helper',
    'licensemanager',
    'modulemanager',
    'updatehelper',
  ]);

  router.post('/uninstall', async (req: Request, res: Response) => {
    try {
      const { moduleId } = req.body || {};
      if (!moduleId || typeof moduleId !== 'string') {
        res.status(400).json({ error: 'Valid moduleId is required' });
        return;
      }

      const cleanId = moduleId.trim();
      if (cleanId.includes('..') || cleanId.includes('/') || cleanId.includes('\\')) {
        res.status(400).json({ error: 'Invalid moduleId format' });
        return;
      }

      const normId = cleanId.toLowerCase();
      const slugId = normId.replace(/[^a-z0-9]/g, '');
      if (PROTECTED_MODULES.has(normId) || PROTECTED_MODULES.has(slugId)) {
        res.status(403).json({ error: `Cannot uninstall protected core module "${cleanId}".` });
        return;
      }

      const modFolder = path.join(modulesDir, cleanId);
      if (!existsSync(modFolder)) {
        res.status(404).json({ error: `Module "${cleanId}" is not installed.` });
        return;
      }

      logger.info(`Uninstalling module "${cleanId}"...`, 'Marketplace');

      // 1. Unload from ModuleManager runtime if active
      try {
        if (bot?.client) {
          await ModuleManager.unloadModule(cleanId, bot.client);
        }
      } catch (unloadErr: any) {
        logger.warn(`Could not unload module instance for ${cleanId}: ${unloadErr.message}`, 'Marketplace');
      }

      // 2. Unregister commands and interactions
      try {
        if (bot?.interactionManager?.unregisterCommandsForModule) {
          bot.interactionManager.unregisterCommandsForModule(cleanId);
        }
      } catch (intErr: any) {
        logger.warn(`Could not unregister commands for ${cleanId}: ${intErr.message}`, 'Marketplace');
      }

      // 3. Clear from internal disabled/active sets
      try {
        if ((ModuleManager as any)._disabledModules) {
          (ModuleManager as any)._disabledModules.delete(cleanId);
          (ModuleManager as any)._disabledModules.delete(cleanId.toLowerCase().replace(/[^a-z0-9]/g, ''));
        }
        if ((ModuleManager as any)._modules) {
          (ModuleManager as any)._modules.delete(cleanId);
        }
      } catch {}

      // 4. Remove module folder from disk
      try {
        rmSync(modFolder, { recursive: true, force: true });
        logger.success(`Removed module directory: ${modFolder}`, 'Marketplace');
      } catch (rmErr: any) {
        logger.error(`Failed to delete module folder ${modFolder}: ${rmErr.message}`, 'Marketplace');
        res.status(500).json({ error: `Failed to remove module directory: ${rmErr.message}` });
        return;
      }

      // 5. Route cleanup — the Express handler for this module's routes remains in the
      //    router stack (Express has no route-removal API) but it will simply 404 since
      //    the module folder is gone. No remounting needed.

      // 6. Resync commands with Discord
      if (bot?.client && bot?.interactionManager?.syncCommands) {
        try {
          await bot.interactionManager.syncCommands();
        } catch {}
      }

      logger.info(`Module "${cleanId}" uninstalled successfully.`, 'Marketplace');
      res.json({
        success: true,
        moduleId: cleanId,
        installed: false,
        message: `Module "${cleanId}" has been uninstalled successfully.`,
      });
    } catch (err: any) {
      logger.error(`Error uninstalling module: ${err.message}`, 'Marketplace');
      res.status(500).json({ error: err.message || 'Failed to uninstall module' });
    }
  });

  // ── 3. POST /api/marketplace/upload — Proxy Module Upload to FLM Registry
  router.post('/upload', upload.single('moduleZip'), async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'A module .zip archive file is required (form field: moduleZip)' });
        return;
      }

      // Prepare form data for FLM
      const formData = new FormData();
      const blob = new Blob([req.file.buffer], { type: 'application/zip' });
      formData.append('moduleZip', blob, req.file.originalname || 'module.zip');
      if (req.body.author) formData.append('author', req.body.author);
      if (req.body.category) formData.append('category', req.body.category);
      if (req.body.requiredTier) formData.append('requiredTier', req.body.requiredTier);

      const flmUrl = await resolveFlmUrl();
      const flmRes = await fetch(`${flmUrl}/api/marketplace/upload`, {
        method: 'POST',
        headers: {
          'x-license-key': cfg?.license?.key || '',
        },
        body: formData,
      });

      const data = await flmRes.json();
      if (!flmRes.ok) {
        res.status(flmRes.status).json(data);
        return;
      }

      res.json(data);
    } catch (err: any) {
      logger.error(`Module upload proxy failed: ${err.message}`, 'Marketplace');
      res.status(500).json({ error: err.message || 'Failed to upload module to FLM registry' });
    }
  });

  // ── 4. POST /api/marketplace/reload — Hot-reload all active modules
  router.post('/reload', async (req: Request, res: Response) => {
    try {
      const app = (req as any).app;
      const client = bot?.client ?? undefined;
      const reloaded: string[] = [];
      const failed: string[] = [];

      // Reload all currently-tracked modules
      const loadedNames = ModuleManager.getAllModules().map(m => m.name);
      for (const name of loadedNames) {
        try {
          const ok = await ModuleManager.hotLoadModule(name, client);
          if (ok) reloaded.push(name);
          else failed.push(name);
        } catch {
          failed.push(name);
        }
      }

      // Also scan for any new module folders not yet loaded (just installed but never loaded)
      try {
        const { readdirSync: rds, statSync } = await import('node:fs');
        const entries = rds(modulesDir).filter(e => {
          try { return statSync(path.join(modulesDir, e)).isDirectory(); } catch { return false; }
        });
        for (const entry of entries) {
          if (!loadedNames.includes(entry)) {
            // New module on disk — hot-load it
            try {
              const ok = await ModuleManager.hotLoadModule(entry, client);
              if (ok) reloaded.push(entry);
            } catch {}
            // Mount its dashboard routes if any
            if (app) {
              await mountSingleModuleRoutes(app, modulesDir, entry, bot).catch(() => {});
            }
          }
        }
      } catch {}

      if (bot?.interactionManager) {
        await bot.interactionManager.syncCommands?.().catch(() => null);
      }

      res.json({
        success: true,
        message: `Hot-reloaded ${reloaded.length} module(s).`,
        reloaded,
        failed,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reload bot' });
    }
  });

  // ── 5. Reviews Proxies ─────────────────────────────────────────────────────
  router.get('/reviews/:moduleId', async (req: Request, res: Response) => {
    try {
      const flmUrl = await resolveFlmUrl();
      const flmRes = await fetch(`${flmUrl}/api/marketplace/reviews/${req.params.moduleId}`);
      const data = await flmRes.json();
      res.status(flmRes.status).json(data);
    } catch (err: any) {
      res.json({ success: true, reviews: [], avgRating: 0, reviewCount: 0, breakdown: {} });
    }
  });

  router.post('/reviews/:moduleId', async (req: Request, res: Response) => {
    try {
      const flmUrl = await resolveFlmUrl();
      const key = (req.headers['x-license-key'] as string) || cfg?.license?.key || '';
      const flmRes = await fetch(`${flmUrl}/api/marketplace/reviews/${req.params.moduleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-license-key': key,
        },
        body: JSON.stringify(req.body),
      });
      const data = await flmRes.json();
      res.status(flmRes.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit review' });
    }
  });

  router.post('/reviews/:moduleId/:reviewId/helpful', async (req: Request, res: Response) => {
    try {
      const flmUrl = await resolveFlmUrl();
      const flmRes = await fetch(`${flmUrl}/api/marketplace/reviews/${req.params.moduleId}/${req.params.reviewId}/helpful`, {
        method: 'POST',
      });
      const data = await flmRes.json();
      res.status(flmRes.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── 6. Art Proxy & Upload ──────────────────────────────────────────────────
  router.get('/art/:moduleId', async (req: Request, res: Response) => {
    const moduleId = req.params.moduleId.toLowerCase();
    const flmUrl = await resolveFlmUrl();

    // 1. Try FLM 2.0 registry
    try {
      const flmRes = await fetch(`${flmUrl}/api/marketplace/art/${moduleId}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (flmRes.ok) {
        const contentType = flmRes.headers.get('content-type') || 'image/png';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const buf = Buffer.from(await flmRes.arrayBuffer());
        res.send(buf);
        return;
      }
    } catch {}

    // 2. Local fallback if FLM does not have it or is offline
    const modFolder = path.join(modulesDir, moduleId);
    if (existsSync(modFolder)) {
      const ART_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
      const candidates = [
        path.join(modFolder, 'resources', 'banner.png'),
        path.join(modFolder, 'resources', 'banner.jpg'),
        path.join(modFolder, 'resources', 'banner.webp'),
        path.join(modFolder, 'assets', 'banner.png'),
        path.join(modFolder, 'assets', 'banner.jpg'),
        path.join(modFolder, 'assets', 'banner.webp'),
        path.join(modFolder, 'banner.png'),
        path.join(modFolder, 'banner.jpg'),
        path.join(modFolder, 'banner.webp'),
        path.join(modFolder, 'dashboard', 'banner.png'),
        path.join(modFolder, 'dashboard', 'banner.jpg'),
      ];
      for (const c of candidates) {
        if (existsSync(c)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.sendFile(c);
          return;
        }
      }
      for (const sub of ['assets', 'resources', 'dashboard', '']) {
        const subDir = sub ? path.join(modFolder, sub) : modFolder;
        if (existsSync(subDir)) {
          try {
            const files = readdirSync(subDir);
            const banner = files.find((f) => /banner/i.test(f) && ART_EXTS.some((e) => f.toLowerCase().endsWith(e)));
            if (banner) {
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.sendFile(path.join(subDir, banner));
              return;
            }
          } catch {}
        }
      }
    }

    res.status(404).send('Not found');
  });

  router.post('/art/:moduleId', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req: Request, res: Response) => {
    try {
      const moduleId = req.params.moduleId.toLowerCase();
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const uploadedFile = req.file || files?.image?.[0] || files?.banner?.[0];
      if (!uploadedFile) {
        res.status(400).json({ error: 'No banner image file uploaded' });
        return;
      }

      const flmUrl = await resolveFlmUrl();

      // Proxy file upload to FLM Reborn 2.0 (FLM expects 'image' form field)
      const formData = new FormData();
      const blob = new Blob([uploadedFile.buffer], { type: uploadedFile.mimetype });
      formData.append('image', blob, uploadedFile.originalname || `${moduleId}.png`);

      const flmRes = await fetch(`${flmUrl}/api/marketplace/art/${moduleId}`, {
        method: 'POST',
        headers: {
          'x-license-key': cfg?.license?.key || '',
        },
        body: formData,
      });

      const data = await flmRes.json();
      res.status(flmRes.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upload banner art to FLM' });
    }
  });

  return router;
}
