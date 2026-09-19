import { Router, type Request, type Response } from 'express';
import path from 'path';
import fs, { existsSync, mkdirSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';
import { logger } from '../../../utils/Logger.js';
import { resolveModulesDir, findModuleDir, readModuleConfig, writeModuleConfig, extractModuleSettings } from '../services/ConfigService.js';
import { readGuildModuleConfig, writeGuildModuleConfig, mergeWithGuildOverrides, deepMerge } from '../services/GuildConfigService.js';
import { requireAuth, requireGuildManage, paramValue } from '../middleware/auth.ts';
import { discoverManifests, readModuleDefaultSchema, getDashboardReports } from '../services/ModuleDashboardDiscovery.ts';
import { ModuleManager } from '../../../managers/ModuleManager.ts';

function processGuildCenterBanner(guildId: string, bannerImage: any, modDir: string): string | undefined {
    if (!bannerImage || typeof bannerImage !== 'string') return bannerImage;
    if (!bannerImage.startsWith('data:image/')) return bannerImage;

    try {
        const match = bannerImage.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
        let ext = 'png';
        if (match && match[1]) {
            const sub = match[1].toLowerCase();
            if (sub.includes('gif')) ext = 'gif';
            else if (sub.includes('webp')) ext = 'webp';
            else if (sub.includes('jpeg') || sub.includes('jpg')) ext = 'jpg';
        }

        const base64 = bannerImage.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length > 10 * 1024 * 1024) {
            logger.warn('Guild Center banner base64 exceeds 10MB limit', 'Dashboard');
            return undefined;
        }

        const resourcesDir = path.resolve(modDir, 'guild-center', 'resources');
        if (!existsSync(resourcesDir)) mkdirSync(resourcesDir, { recursive: true });

        const prefix = (guildId && guildId !== 'default') ? `banner-${guildId}` : 'banner';
        for (const candidateExt of ['png', 'gif', 'webp', 'jpg', 'jpeg']) {
            const oldFile = path.join(resourcesDir, `${prefix}.${candidateExt}`);
            if (existsSync(oldFile)) {
                try { fs.unlinkSync(oldFile); } catch {}
            }
        }

        const bannerName = `${prefix}.${ext}`;
        writeFileSync(path.join(resourcesDir, bannerName), buffer);
        logger.info(`Guild Center banner persisted for ${guildId || 'default'} (${bannerName})`, 'Dashboard');
        return bannerName;
    } catch (e: any) {
        logger.error('Failed to save Guild Center banner from config payload:', e);
        return bannerImage;
    }
}

export function createApplyConfigToModule(bot: any, modDir: string) {
    return (name: string, cleanSettings: Record<string, any>) => {
        const actualDir = findModuleDir(modDir, name);
        const canonicalName = actualDir ? path.basename(actualDir) : name;

        const mod = (bot.moduleManager?.getModule?.(canonicalName) || bot.moduleManager?.getModule?.(name)) as any;
        if (!mod) return;

        if (typeof mod.updateConfig === 'function') {
            try { mod.updateConfig(cleanSettings); } catch (e) { logger.warn(`Error in ${canonicalName}.updateConfig(): ${e}`, 'Dashboard'); }
        }
        if (mod.moduleConfig && typeof mod.moduleConfig === 'object') {
            Object.assign(mod.moduleConfig, cleanSettings);
        }
        if (mod.config && typeof mod.config === 'object') {
            if (mod.config.config && typeof mod.config.config === 'object') {
                Object.assign(mod.config.config, cleanSettings);
            } else {
                Object.assign(mod.config, cleanSettings);
            }
        }

        if (mod.lib && typeof mod.lib === 'object') {
            if (typeof mod.lib.updateConfig === 'function') {
                try { mod.lib.updateConfig(cleanSettings); } catch {}
            }
            if (mod.lib.config && typeof mod.lib.config === 'object') {
                Object.assign(mod.lib.config, cleanSettings);
            }
        }

        if (canonicalName === 'temp-voice' || name === 'temp-voice' || name === 'tempvoice') {
            const globalLib = (global as any)._tempVoiceLibInstance;
            if (globalLib && typeof globalLib.updateConfig === 'function') {
                try { globalLib.updateConfig(cleanSettings); } catch {}
            }
        }

        if (typeof mod.onConfigReload === 'function') {
            try { mod.onConfigReload(cleanSettings); } catch (e) { logger.warn(`Error in ${canonicalName}.onConfigReload(): ${e}`, 'Dashboard'); }
        }
        if (typeof mod.onReload === 'function') {
            try { mod.onReload(cleanSettings); } catch (e) { logger.warn(`Error in ${canonicalName}.onReload(): ${e}`, 'Dashboard'); }
        }
    };
}

export function resolveModuleLabel(meta: any, manifest?: any, mod?: any, fallbackName?: string): string {
    if (meta?.label && typeof meta.label === 'string' && meta.label.trim()) {
        return meta.label.trim();
    }
    if (manifest?.label && typeof manifest.label === 'string' && manifest.label.trim()) {
        return manifest.label.trim();
    }
    for (const candidate of [meta?.name, mod?.name, mod?.info?.name]) {
        if (candidate && typeof candidate === 'string') {
            if (/[A-Z\s]/.test(candidate) && candidate.toLowerCase() !== candidate) {
                return candidate.trim();
            }
        }
    }
    const raw = fallbackName || meta?.name || mod?.name || '';
    return raw
        .split(/[-_]+/)
        .map((w: string) => {
            const l = w.toLowerCase();
            if (l === 'ai') return 'AI';
            if (l === 'flm') return 'FLM';
            if (l === 'qr') return 'QR';
            if (l === 'xp') return 'XP';
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(' ');
}

export default function modulesRoutes(bot: any, cfg: any): Router {
    const router = Router();
    const modDir = resolveModulesDir(cfg);
    const applyConfigToModule = createApplyConfigToModule(bot, modDir);

    let syncTimeout: NodeJS.Timeout | null = null;
    function scheduleCommandSync() {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
            try {
                if (bot.client && bot.interactionManager) {
                    await bot.interactionManager.syncCommands(bot.client);
                    logger.info('Commands synced successfully after module toggle.', 'Dashboard');
                }
            } catch (err: any) {
                logger.warn(`Command sync failed: ${err?.message ?? err}`, 'Dashboard');
            }
        }, 1500);
    }

    const FORBIDDEN_MODULES = new Set<string>();

    // List all modules
    router.get('/', (_req, res) => {
        const raw = bot.moduleManager?.getAllModules?.() ?? [];
        const mapped = raw
            .filter((m: any) => !FORBIDDEN_MODULES.has(String(m.name || m.id || '').toLowerCase()))
            .map((m: any) => {
            const yamlResult = readModuleConfig(modDir, m.name);
            const meta = yamlResult?.config || {};
            const icon = meta.logger?.icon || meta.icon || meta.emoji || m.icon || m.emoji || m.logger?.icon || undefined;
            const color = meta.logger?.color || meta.color || m.logger?.color || m.color || undefined;
            const label = resolveModuleLabel(meta, null, m, m.name);

            return {
                id: m.name,
                name: label,
                label,
                version: meta.version ?? m.version ?? m.info?.version ?? '1.0.0',
                description: meta.description ?? m.description ?? m.info?.description ?? '',
                author: meta.author ?? m.author ?? m.info?.author ?? 'FloofCore',
                category: meta.category ?? m.category ?? m.info?.category ?? 'utility',
                enabled: bot.moduleManager?.isModuleEnabled ? bot.moduleManager.isModuleEnabled(m.name) : (m.enabled !== false),
                commands: m.commands?.length ?? 0,
                icon,
                color,
            };
        });
        mapped.sort((a: any, b: any) => (a.label || a.name || a.id).localeCompare(b.label || b.name || b.id, undefined, { sensitivity: 'base' }));
        res.json(mapped);
    });

    // ── Module Dashboard Discovery Status & Diagnostics ─────────────────────
    router.get('/dashboard-status', (_req, res) => {
        res.json(getDashboardReports());
    });

    // ── Module-Owned Dashboard: All Manifests ─────────────────────────────────
    // Returns merged manifest.json + live module.yml data for every module that
    // ships a dashboard/manifest.json. The module.yml is the primary source of truth.
    // IMPORTANT: Must be registered BEFORE /:name to avoid Express swallowing 'manifests'
    // as a dynamic segment.
    router.get('/manifests', (_req, res) => {
        const manifests = discoverManifests(modDir);
        const raw = bot.moduleManager?.getAllModules?.() ?? [];

        // Build a quick map of module name -> live runtime data
        const liveMap = new Map<string, any>();
        for (const m of raw) {
            liveMap.set(m.name, m);
            const norm = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            liveMap.set(norm, m);
        }

        const result: any[] = [];
        const seen = new Set<string>();

        for (const [id, manifest] of manifests) {
            if (FORBIDDEN_MODULES.has(String(id || manifest.id).toLowerCase())) continue;
            if (seen.has(manifest.id)) continue;
            seen.add(manifest.id);

            const live = liveMap.get(id) || liveMap.get(manifest.id);
            const yamlResult = readModuleConfig(modDir, id);
            const meta = yamlResult?.config || {};

            // module.yml is primary source of truth
            const liveIcon = meta.logger?.icon || meta.icon || meta.emoji || manifest.icon || live?.icon || undefined;
            const liveColor = meta.logger?.color || meta.color || manifest.color || live?.color || undefined;
            const liveLabel = resolveModuleLabel(meta, manifest, live, id);
            const liveDesc = meta.description || manifest.description || live?.description || '';
            const liveAuthor = meta.author || manifest.author || live?.author || 'FloofCore';
            const liveVersion = meta.version || live?.version || manifest.version || '1.0.0';
            const liveCategory = meta.category || manifest.category || live?.category || 'utility';

            result.push({
                ...manifest,
                id: manifest.id,
                label: liveLabel,
                icon: liveIcon,
                color: liveColor,
                description: liveDesc,
                author: liveAuthor,
                version: liveVersion,
                category: liveCategory,
                enabled: bot.moduleManager?.isModuleEnabled
                    ? bot.moduleManager.isModuleEnabled(id)
                    : (live ? live.enabled !== false : true),
                commands: live?.commands?.length ?? 0,
            });
        }

        result.sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base' }));
        res.json(result);
    });

    // Single module metadata
    router.get('/:name', (req, res) => {
        const rawName = paramValue(req.params.name);
        const actualDir = findModuleDir(modDir, rawName);
        const name = actualDir ? path.basename(actualDir) : rawName;
        const mod: any = bot.moduleManager?.getModule?.(name) || bot.moduleManager?.getModule?.(rawName);
        const yamlResult = readModuleConfig(modDir, name);
        const meta = yamlResult?.config || {};

        const hasCustomComponent = actualDir ? (
            fs.existsSync(path.join(actualDir, 'dashboard', 'page.tsx')) ||
            fs.existsSync(path.join(actualDir, 'dashboard', 'component.tsx'))
        ) : false;

        // module.yml is single source of truth
        const icon = meta.logger?.icon || meta.icon || meta.emoji || mod?.icon || undefined;
        const color = meta.logger?.color || meta.color || mod?.color || undefined;
        const label = resolveModuleLabel(meta, undefined, mod, name);
        const version = meta.version || mod?.version || '1.0.0';
        const description = meta.description || mod?.description || '';
        const author = meta.author || mod?.author || 'FloofCore';
        const category = meta.category || mod?.category || 'utility';

        res.json({
            id: name,
            name: label,
            label,
            version,
            description,
            author,
            category,
            enabled: bot.moduleManager?.isModuleEnabled ? bot.moduleManager.isModuleEnabled(name) : (mod ? mod.enabled !== false : true),
            commands: mod?.commands?.length || 0,
            hasCustomComponent,
            icon,
            color,
        });
    });

    // Toggle global module state
    router.post('/:name/toggle', async (req, res) => {
        const rawName = paramValue(req.params.name);
        const actualDir = findModuleDir(modDir, rawName);
        const name = actualDir ? path.basename(actualDir) : rawName;
        const { enabled } = req.body as { enabled: boolean };
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled must be boolean' });
            return;
        }

        if (enabled) {
            await (bot.moduleManager as any)?.enableModule?.(name);
            if (name !== rawName) await (bot.moduleManager as any)?.enableModule?.(rawName);
        } else {
            await (bot.moduleManager as any)?.disableModule?.(name);
            if (name !== rawName) await (bot.moduleManager as any)?.disableModule?.(rawName);
        }

        scheduleCommandSync();
        res.json({ ok: true, name, enabled });
    });

    // Global module base config get
    router.get('/:name/config', (req, res) => {
        const name = paramValue(req.params.name);
        const yamlResult = readModuleConfig(modDir, name);
        if (!yamlResult) {
            res.json({});
            return;
        }
        res.json(extractModuleSettings(yamlResult.config));
    });

    // Raw YAML get
    router.get('/:name/rawconfig', (req, res) => {
        const name = paramValue(req.params.name);
        const yamlResult = readModuleConfig(modDir, name);
        res.json({ content: yamlResult?.rawYaml ?? '' });
    });

    // Raw YAML save
    router.post('/:name/rawconfig', async (req, res) => {
        const name = paramValue(req.params.name);
        const rawContent = typeof req.body === 'string' ? req.body : (req.body?.content || req.body?.raw || '');
        const writeRes = writeModuleConfig(modDir, name, rawContent);
        if (writeRes.success) {
            try {
                const parsed = yaml.load(rawContent);
                const cleanSettings = extractModuleSettings(parsed);
                applyConfigToModule(name, cleanSettings);
            } catch {}
            res.json({ ok: true });
        } else {
            res.status(500).json({ error: 'Failed to write module.yml' });
        }
    });

    // ── Module-Owned Dashboard: Default Schema ────────────────────────────────
    // Returns the module's dashboard/defaultSchema.json if it exists.
    // The frontend fetches this to seed the config editor with typed defaults.
    router.get('/:name/schema', (req, res) => {
        const name = paramValue(req.params.name);
        const schema = readModuleDefaultSchema(modDir, name);
        if (!schema) {
            res.status(404).json({ error: `No defaultSchema.json found for module "${name}"` });
            return;
        }
        res.json(schema);
    });


    // Global module config save
    router.post('/:name/config', async (req, res) => {
        const name = paramValue(req.params.name);
        const cleanSettings = extractModuleSettings(req.body);
        if (typeof req.body?.enabled === 'boolean') {
            cleanSettings.enabled = req.body.enabled;
            bot.moduleManager?.setModuleEnabled?.(name, req.body.enabled);
        }

        if (name === 'guild-center' && cleanSettings.bannerImage) {
            const processedBanner = processGuildCenterBanner('default', cleanSettings.bannerImage, modDir);
            if (processedBanner) {
                cleanSettings.bannerImage = processedBanner;
            }
        }

        const currentYaml = readModuleConfig(modDir, name);
        const existing = currentYaml.config || {};

        let merged: any;
        if ('config' in existing && existing.config && typeof existing.config === 'object' && !Array.isArray(existing.config)) {
            merged = { ...existing, config: deepMerge(existing.config, cleanSettings) };
        } else {
            merged = deepMerge(existing, cleanSettings);
        }

        writeModuleConfig(modDir, name, merged);
        applyConfigToModule(name, cleanSettings);
        res.json({ ok: true, bannerImage: cleanSettings.bannerImage });
    });

    // DELETE /api/modules/:name — Gracefully Unload & Delete Module
    router.delete('/:name', async (req, res) => {
        try {
            const rawName = paramValue(req.params.name);
            if (!rawName) {
                res.status(400).json({ error: 'Valid module name is required' });
                return;
            }

            const cleanId = rawName.trim();
            if (cleanId.includes('..') || cleanId.includes('/') || cleanId.includes('\\')) {
                res.status(400).json({ error: 'Invalid module name format' });
                return;
            }

            const PROTECTED = new Set([
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

            const normId = cleanId.toLowerCase();
            const slugId = normId.replace(/[^a-z0-9]/g, '');
            if (PROTECTED.has(normId) || PROTECTED.has(slugId)) {
                res.status(403).json({ error: `Cannot delete protected core module "${cleanId}".` });
                return;
            }

            const actualDir = findModuleDir(modDir, cleanId) || path.join(modDir, cleanId);
            if (!existsSync(actualDir)) {
                res.status(404).json({ error: `Module "${cleanId}" is not installed.` });
                return;
            }

            const canonical = path.basename(actualDir);
            logger.info(`Uninstalling/deleting module "${canonical}"...`, 'ModulesAPI');

            // 1. Unload from ModuleManager runtime if active
            try {
                if (bot?.client) {
                    await ModuleManager.unloadModule(canonical, bot.client);
                }
            } catch (unloadErr: any) {
                logger.warn(`Could not unload module instance for ${canonical}: ${unloadErr.message}`, 'ModulesAPI');
            }

            // 2. Unregister commands and interactions
            try {
                if (bot?.interactionManager?.unregisterCommandsForModule) {
                    bot.interactionManager.unregisterCommandsForModule(canonical);
                }
            } catch (intErr: any) {
                logger.warn(`Could not unregister commands for ${canonical}: ${intErr.message}`, 'ModulesAPI');
            }

            // 3. Clear from internal disabled/active sets
            try {
                if ((ModuleManager as any)._disabledModules) {
                    (ModuleManager as any)._disabledModules.delete(canonical);
                    (ModuleManager as any)._disabledModules.delete(canonical.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }
                if ((ModuleManager as any)._modules) {
                    (ModuleManager as any)._modules.delete(canonical);
                }
            } catch {}

            // 4. Remove module folder from disk
            try {
                fs.rmSync(actualDir, { recursive: true, force: true });
                logger.success(`Removed module directory: ${actualDir}`, 'ModulesAPI');
            } catch (rmErr: any) {
                logger.error(`Failed to delete module folder ${actualDir}: ${rmErr.message}`, 'ModulesAPI');
                res.status(500).json({ error: `Failed to remove module directory: ${rmErr.message}` });
                return;
            }

            // 5. Resync commands with Discord
            if (bot?.client && bot?.interactionManager?.syncCommands) {
                try {
                    await bot.interactionManager.syncCommands();
                } catch {}
            }

            res.json({
                success: true,
                moduleId: canonical,
                message: `Module "${canonical}" deleted successfully.`,
            });
        } catch (err: any) {
            logger.error(`Error deleting module: ${err.message}`, 'ModulesAPI');
            res.status(500).json({ error: err.message || 'Failed to delete module' });
        }
    });

    return router;
}

export function guildModulesRouter(bot: any, cfg: any): Router {
    const router = Router();
    const modDir = resolveModulesDir(cfg);
    const applyConfigToModule = createApplyConfigToModule(bot, modDir);

    let syncTimeout: NodeJS.Timeout | null = null;
    function scheduleCommandSync() {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
            try {
                if (bot.client && bot.interactionManager) {
                    await bot.interactionManager.syncCommands(bot.client);
                    logger.info('Commands synced successfully after module toggle.', 'Dashboard');
                }
            } catch (err: any) {
                logger.warn(`Command sync failed: ${err?.message ?? err}`, 'Dashboard');
            }
        }, 1500);
    }

    // List guild modules
    router.get('/:id/modules', requireAuth, (req, res) => {
        const raw = bot.moduleManager?.getAllModules?.() ?? [];
        const mapped = raw.map((m: any) => ({
            name: m.name,
            version: m.version ?? m.info?.version ?? '1.0.0',
            description: m.description ?? m.info?.description ?? '',
            author: m.author ?? m.info?.author ?? 'FloofCore',
            enabled: bot.moduleManager?.isModuleEnabled ? bot.moduleManager.isModuleEnabled(m.name) : (m.enabled !== false),
            dependencies: m.dependencies ?? m.info?.dependencies ?? [],
            placeholders: m.placeholders ?? m.info?.placeholders ?? [],
        }));
        mapped.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
        res.json(mapped);
    });

    // Toggle module in guild
    router.patch('/:id/modules/:name', requireAuth, requireGuildManage, async (req, res) => {
        const id = paramValue(req.params.id);
        const name = paramValue(req.params.name);
        if (name === 'core' || name === 'dashboard') {
            res.status(400).json({ error: 'Cannot toggle core modules' });
            return;
        }

        const { enabled } = req.body as { enabled: boolean };
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled must be a boolean' });
            return;
        }

        const mod = bot.moduleManager?.getModule?.(name);
        if (!mod) {
            res.status(404).json({ error: 'Module not found' });
            return;
        }

        const changed = bot.moduleManager?.setModuleEnabled?.(name, enabled)
            ?? (enabled ? bot.moduleManager?.enableModule?.(name) : bot.moduleManager?.disableModule?.(name));
        if (!changed) {
            res.status(500).json({ error: 'Failed to update module state' });
            return;
        }

        scheduleCommandSync();
        logger.info(`Module "${name}" ${enabled ? 'enabled' : 'disabled'} via dashboard for guild ${id}`, 'Dashboard');
        res.json({ ok: true, name, enabled: mod.enabled !== false });
    });

    // Guild module config get
    router.get('/:id/modules/:name/config', async (req, res) => {
        const id = paramValue(req.params.id);
        const name = paramValue(req.params.name);

        const yamlResult = readModuleConfig(modDir, name);
        const baseConfig = yamlResult?.config ? extractModuleSettings(yamlResult.config) : {};
        const guildOverrides = (id && id !== 'default') ? readGuildModuleConfig(id, name) : {};
        const merged = mergeWithGuildOverrides(baseConfig, guildOverrides);
        const isEnabled = bot.moduleManager?.isModuleEnabled
            ? bot.moduleManager.isModuleEnabled(name)
            : true;
        merged.enabled = isEnabled;

        if (name === 'streamer-notifications' && id && id !== 'default') {
            try {
                const { StreamerNotificationGuildRepository } = await import('../../../../modules/streamer-notifications/models/StreamerNotificationGuild.ts');
                const repo = new StreamerNotificationGuildRepository();
                await repo.initialize();
                const doc = await repo.get(id);
                if (doc) {
                    if (doc.notificationMessage) {
                        merged.notificationMessage = doc.notificationMessage;
                        merged.liveMessage = doc.notificationMessage;
                    }
                    if (doc.channelId) {
                        merged.channelId = doc.channelId;
                        merged.defaultChannelId = doc.channelId;
                    }
                    if (doc.mentionRoleId) {
                        merged.mentionRoleId = doc.mentionRoleId;
                    }
                }
            } catch (err) {
                logger.warn(`Could not load streamer notification guild doc: ${err}`, 'Dashboard');
            }
        }

        res.json(merged);
    });

    // Guild module config save (POST & PATCH)
    const handleGuildConfigSave = async (req: Request, res: Response) => {
        const id = paramValue(req.params.id);
        const name = paramValue(req.params.name);
        const cleanSettings = extractModuleSettings(req.body);
        if (typeof req.body?.enabled === 'boolean') {
            cleanSettings.enabled = req.body.enabled;
            bot.moduleManager?.setModuleEnabled?.(name, req.body.enabled);
        }

        if (name === 'guild-center' && cleanSettings.bannerImage) {
            const processedBanner = processGuildCenterBanner(id, cleanSettings.bannerImage, modDir);
            if (processedBanner) {
                cleanSettings.bannerImage = processedBanner;
            }
        }

        if (id && id !== 'default') {
            writeGuildModuleConfig(id, name, cleanSettings);

            const liveModule = bot.moduleManager?.getModule?.(name) as any;
            if (liveModule && typeof liveModule.updateConfig === 'function') {
                try {
                    liveModule.updateConfig(cleanSettings, id);
                } catch (err) {
                    logger.warn(`Error calling updateConfig on module ${name}: ${err}`, 'Dashboard');
                }
            }
        }

        if (name === 'streamer-notifications' && id && id !== 'default') {
            try {
                const { StreamerNotificationGuildRepository } = await import('../../../../modules/streamer-notifications/models/StreamerNotificationGuild.ts');
                const repo = new StreamerNotificationGuildRepository();
                await repo.initialize();
                await repo.getOrCreate(id);

                const msg = cleanSettings.notificationMessage ?? cleanSettings.liveMessage;
                if (msg !== undefined) {
                    await repo.setGuildField(id, 'notificationMessage', msg || null);
                }
                const chId = cleanSettings.channelId ?? cleanSettings.defaultChannelId;
                if (chId !== undefined) {
                    await repo.setGuildField(id, 'channelId', chId || '');
                }
                if (cleanSettings.mentionRoleId !== undefined) {
                    await repo.setGuildField(id, 'mentionRoleId', cleanSettings.mentionRoleId || null);
                }
            } catch (err) {
                logger.warn(`Could not sync streamer notification guild doc: ${err}`, 'Dashboard');
            }
        }

        if (name === 'guild-center' && bot.client) {
            const mod = bot.moduleManager?.getModule?.(name) as any;
            try {
                let GCLib: any;
                try {
                    const imp = await import('../../../../modules/guild-center/lib/GuildCenterLib.ts');
                    GCLib = imp.GuildCenterLib;
                } catch {
                    const imp = await import('../../../../modules/guild-center/lib/GuildCenterLib.js');
                    GCLib = imp.GuildCenterLib;
                }
                if (GCLib) {
                    await GCLib.refreshGuildHub(bot.client, mod, id);
                }
            } catch (err) {
                logger.warn(`Could not refresh guild-center hub: ${err}`, 'Dashboard');
            }
        }

        logger.info(`Module config updated for "${name}" in guild ${id}`, 'Dashboard');
        res.json({ ok: true, bannerImage: cleanSettings.bannerImage });
    };

    router.post('/:id/modules/:name/config', handleGuildConfigSave);
    router.patch('/:id/modules/:name/config', handleGuildConfigSave);

    // Dedicated Discord Status Monitor Test Route
    router.post('/:id/modules/discord-status-monitor/test', async (req: Request, res: Response) => {
        const config = req.body || {};
        try {
            const { StatusMonitorLib } = await import('../../../../modules/discord-status-monitor/lib/StatusMonitorLib.js');
            const lib = new StatusMonitorLib(() => config, () => bot.client);
            
            const sampleIncident: any = {
                id: '73wgk29dznv4',
                name: 'Messaging failures',
                status: 'resolved',
                created_at: new Date(Date.now() - 3600000).toISOString(),
                updated_at: new Date().toISOString(),
                monitoring_at: new Date(Date.now() - 1800000).toISOString(),
                resolved_at: new Date().toISOString(),
                impact: 'critical',
                shortlink: 'https://stspg.io/wlryy8d8r7wf',
                incident_updates: [
                    {
                        id: 'u1',
                        incident_id: '73wgk29dznv4',
                        status: 'identified',
                        body: "We are currently investigating an issue that is impacting users' ability to send direct messages. Other functionality including interactions, shop, and SDK integrations are also affected.",
                        created_at: new Date(Date.now() - 3600000).toISOString(),
                        updated_at: new Date(Date.now() - 3600000).toISOString(),
                        display_at: new Date(Date.now() - 3600000).toISOString(),
                        deliver_notifications: true
                    },
                    {
                        id: 'u2',
                        incident_id: '73wgk29dznv4',
                        status: 'identified',
                        body: 'We are continuing to work on a fix for this issue.',
                        created_at: new Date(Date.now() - 3000000).toISOString(),
                        updated_at: new Date(Date.now() - 3000000).toISOString(),
                        display_at: new Date(Date.now() - 3000000).toISOString(),
                        deliver_notifications: true
                    },
                    {
                        id: 'u3',
                        incident_id: '73wgk29dznv4',
                        status: 'monitoring',
                        body: 'We have a fix in place are seeing recovery, although some users may still be seeing impact.',
                        created_at: new Date(Date.now() - 1800000).toISOString(),
                        updated_at: new Date(Date.now() - 1800000).toISOString(),
                        display_at: new Date(Date.now() - 1800000).toISOString(),
                        deliver_notifications: true
                    },
                    {
                        id: 'u4',
                        incident_id: '73wgk29dznv4',
                        status: 'resolved',
                        body: 'This incident has been resolved.',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        display_at: new Date().toISOString(),
                        deliver_notifications: true
                    }
                ]
            };

            const msgId = await lib.sendAlert(sampleIncident);
            if (msgId) {
                res.json({ ok: true, messageId: msgId });
            } else {
                res.status(400).json({ error: 'Failed to send test alert. Verify webhook URL or channel permissions.' });
            }
        } catch (err: any) {
            res.status(500).json({ error: err?.message || 'Error delivering test alert' });
        }
    });

    // Dynamic Module Dashboard Data Route
    router.get('/:id/modules/:name/data', requireAuth, requireGuildManage, async (req: Request, res: Response) => {
        const id = paramValue(req.params.id);
        const name = paramValue(req.params.name);
        const mod = bot.moduleManager?.getModule?.(name) as any;
        if (!mod) {
            res.status(404).json({ error: `Module "${name}" is not installed or active` });
            return;
        }

        if (typeof mod.getDashboardData === 'function') {
            try {
                const data = await mod.getDashboardData(id, bot);
                res.json(data ?? {});
            } catch (err: any) {
                res.status(500).json({ error: err?.message || 'Failed to fetch module data' });
            }
            return;
        }

        res.json({});
    });

    // Dynamic Module Dashboard Action Route (e.g. toggle chat, execute actions)
    router.post('/:id/modules/:name/action/:action', requireAuth, requireGuildManage, async (req: Request, res: Response) => {
        const id = paramValue(req.params.id);
        const name = paramValue(req.params.name);
        const action = paramValue(req.params.action);
        const mod = bot.moduleManager?.getModule?.(name) as any;
        if (!mod) {
            res.status(404).json({ error: `Module "${name}" is not installed or active` });
            return;
        }

        if (typeof mod.handleDashboardAction === 'function') {
            try {
                const result = await mod.handleDashboardAction(id, action, req.body, bot);
                res.json(result ?? { ok: true });
            } catch (err: any) {
                res.status(500).json({ error: err?.message || 'Module action failed' });
            }
            return;
        }

        res.status(400).json({ error: `Module "${name}" does not implement dashboard actions` });
    });

    return router;
}
