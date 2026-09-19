import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { logger } from '../../../utils/Logger.js';

export interface ModuleDashboardManifest {
    id: string;
    label: string;
    icon: string;
    category: 'security' | 'utility' | 'engagement' | 'system';
    description: string;
    color: string;
    gradient: string;
    author?: string;
    version?: string;
    hasCustomRoutes?: boolean;
    hasCustomComponent?: boolean;
    routePrefix?: string;
    routePrefixes?: string[];
}

export interface ModuleDashboardReport {
    moduleId: string;
    folderName: string;
    hasDashboardDir: boolean;
    hasManifest: boolean;
    hasComponent: boolean;
    hasSchema: boolean;
    hasRoutes: boolean;
    routesMounted: boolean;
    status: 'ready' | 'warning' | 'error' | 'none';
    mode: 'custom-page' | 'raw-config';
    errors: string[];
    warnings: string[];
    manifest?: ModuleDashboardManifest;
}

// In-memory cache of the latest discovery report for diagnostics and API exposure
let lastReports: ModuleDashboardReport[] = [];

/**
 * Router slot registry.
 *
 * Instead of mounting routers directly into Express (which is permanent and
 * cannot be undone), we mount one permanent "slot" closure per route path.
 * The slot holds a mutable reference to the current router.
 *
 * On first install  → create slot, register permanent closure, set slot.router
 * On update/reinstall → just swap slot.router — the closure picks it up instantly
 *
 * No new dependencies required. Pure Express + JS closures.
 */
interface RouterSlot {
    routers: any[];          // current live routers for this prefix
    isGuildsProxy: boolean;  // true when mounted as a filtered /api/guilds proxy
}
const moduleRouterSlots = new Map<string, RouterSlot>();

export function getDashboardReports(): ModuleDashboardReport[] {
    return lastReports;
}

/**
 * Reads a module's module.yml or config.yml configuration directly.
 */
function readModuleYaml(modDir: string, folderName: string): any {
    const candidates = [
        path.join(modDir, folderName, 'module.yml'),
        path.join(modDir, folderName, 'config.yml'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) {
            try {
                return yaml.load(fs.readFileSync(c, 'utf-8')) || {};
            } catch {}
        }
    }
    return {};
}

// Scans all module folders using module.yml as the primary source of truth.
// If a module has dashboard/page.tsx or dashboard/routes.ts, it is discovered automatically.
// manifest.json is purely optional and not required.
export function discoverManifests(modDir: string): Map<string, ModuleDashboardManifest> {
    const result = new Map<string, ModuleDashboardManifest>();

    if (!fs.existsSync(modDir)) return result;

    let entries: string[] = [];
    try {
        entries = fs.readdirSync(modDir);
    } catch {
        return result;
    }

    for (const entry of entries) {
        const modFolder = path.join(modDir, entry);
        if (!fs.existsSync(modFolder) || !fs.statSync(modFolder).isDirectory()) continue;

        const dashDir = path.join(modFolder, 'dashboard');
        const hasDashDir = fs.existsSync(dashDir);
        const ymlData = readModuleYaml(modDir, entry);

        const hasComponent = hasDashDir && (
            fs.existsSync(path.join(dashDir, 'page.tsx')) ||
            fs.existsSync(path.join(dashDir, 'component.tsx'))
        );
        const hasRoutes = hasDashDir && (
            fs.existsSync(path.join(dashDir, 'routes.ts')) ||
            fs.existsSync(path.join(dashDir, 'routes.js'))
        );

        // module.yml is the single source of truth
        const id = ymlData.name || entry;
        const label = ymlData.label || ymlData.name || entry;
        const icon = ymlData.logger?.icon || ymlData.icon || ymlData.emoji || '📦';
        const color = ymlData.logger?.color || ymlData.color || '#8B5CF6';
        const category = ymlData.category || 'utility';
        const description = ymlData.description || '';
        const author = ymlData.author || 'FloofCore';
        const version = ymlData.version || '1.0.0';
        const gradient = ymlData.dashboard?.gradient || 'from-violet-600 to-indigo-600';

        let routePrefixes: string[] = [];
        if (Array.isArray(ymlData.dashboard?.routePrefixes)) {
            routePrefixes = ymlData.dashboard.routePrefixes;
        } else if (typeof ymlData.dashboard?.routePrefix === 'string') {
            routePrefixes = [ymlData.dashboard.routePrefix];
        }

        const manifest: ModuleDashboardManifest = {
            id,
            label,
            icon,
            category,
            description,
            color,
            gradient,
            author,
            version,
            hasCustomComponent: hasComponent,
            hasCustomRoutes: hasRoutes,
            routePrefixes,
        };

        result.set(id, manifest);
        if (entry !== id) {
            result.set(entry, manifest);
        }
    }

    return result;
}

// Reads a single module's dashboard/defaultSchema.json.
// Tries the exact moduleId folder first, then normalized name variants.
// Returns null if no file is found.
export function readModuleDefaultSchema(modDir: string, moduleId: string): Record<string, any> | null {
    if (!moduleId || !/^[a-zA-Z0-9_\s-]+$/.test(moduleId)) return null;

    const trimmed = moduleId.trim();
    const candidates = [trimmed];
    try {
        const entries = fs.readdirSync(modDir);
        for (const entry of entries) {
            const norm = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
            const inputNorm = moduleId.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (norm === inputNorm && entry !== moduleId) {
                candidates.push(entry);
            }
        }
    } catch {}

    for (const candidate of candidates) {
        const schemaPath = path.join(modDir, candidate, 'dashboard', 'defaultSchema.json');
        if (fs.existsSync(schemaPath)) {
            try {
                const raw = fs.readFileSync(schemaPath, 'utf-8');
                return JSON.parse(raw);
            } catch (err: any) {
                logger.warn(`Failed to parse defaultSchema.json for module "${candidate}": ${err?.message ?? err}`, 'ModuleDashboard');
            }
        }
    }

    // Fallback: use config block directly from module.yml
    for (const candidate of candidates) {
        const ymlData = readModuleYaml(modDir, candidate);
        if (ymlData?.config && typeof ymlData.config === 'object') {
            return ymlData.config;
        }
    }

    return null;
}

/**
 * Register (or swap) a router into a slot for the given mount path.
 *
 * First call  → creates the slot, registers a permanent Express closure
 * Subsequent  → swaps slot.router — the live closure picks it up immediately
 */
function registerSlot(app: any, mountPath: string, router: any, isGuildsProxy = false): void {
    if (moduleRouterSlots.has(mountPath)) {
        const slot = moduleRouterSlots.get(mountPath)!;
        if (!slot.routers.includes(router)) {
            slot.routers.push(router);
        }
        logger.info(`Router attached to existing slot at "${mountPath}" (${slot.routers.length} active routers).`, 'ModuleDashboard');
        return;
    }

    // First time: create slot with router array and register the permanent closure
    const slot: RouterSlot = { routers: [router], isGuildsProxy };
    moduleRouterSlots.set(mountPath, slot);

    app.use(mountPath, (req: any, res: any, next: any) => {
        if (slot.isGuildsProxy && (
            req.path === '/' || req.path === '' ||
            req.path.endsWith('/theme') ||
            req.path.endsWith('/settings') ||
            req.path.startsWith('/community')
        )) {
            return next();
        }

        // Execute routers sequentially until one handles the request
        let idx = 0;
        const runNextRouter = (err?: any) => {
            if (err) return next(err);
            if (idx >= slot.routers.length) return next();
            const currentRouter = slot.routers[idx++];
            try {
                currentRouter(req, res, runNextRouter);
            } catch (rErr) {
                runNextRouter(rErr);
            }
        };
        runNextRouter();
    });
}

/**
 * Discovers, inspects, and mounts all module dashboard components and routes.
 *
 * For each module in the modules/ directory:
 * - Checks for dashboard/ folder, manifest.json, component.tsx, defaultSchema.json, and routes.ts
 * - Isolates errors so one module failure never crashes the server or blocks other modules
 * - Logs crystal-clear status for each module and an aggregated summary on startup
 */
export async function mountModuleRoutes(app: any, modDir: string, bot: any): Promise<ModuleDashboardReport[]> {
    const reports: ModuleDashboardReport[] = [];
    if (!fs.existsSync(modDir)) return reports;

    let entries: string[] = [];
    try {
        entries = fs.readdirSync(modDir);
        entries.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    } catch {
        return reports;
    }

    logger.info(`Scanning ${entries.length} modules for dashboard pages and routes...`, 'ModuleDashboard');

    for (const entry of entries) {
        const dashDir = path.join(modDir, entry, 'dashboard');
        const hasDashDir = fs.existsSync(dashDir);

        if (!hasDashDir) {
            reports.push({
                moduleId: entry,
                folderName: entry,
                hasDashboardDir: false,
                hasManifest: false,
                hasComponent: false,
                hasSchema: false,
                hasRoutes: false,
                routesMounted: false,
                status: 'ready',
                mode: 'raw-config',
                errors: [],
                warnings: [],
            });
            logger.info(`Module "${entry}": Dashboard ready (raw config)`, 'ModuleDashboard');
            continue;
        }

        const report: ModuleDashboardReport = {
            moduleId: entry,
            folderName: entry,
            hasDashboardDir: true,
            hasManifest: false,
            hasComponent: false,
            hasSchema: false,
            hasRoutes: false,
            routesMounted: false,
            status: 'ready',
            mode: 'raw-config',
            errors: [],
            warnings: [],
        };

        // 1. Inspect module.yml (primary) and manifest.json (optional legacy)
        const ymlData = readModuleYaml(modDir, entry);
        if (ymlData.name) {
            report.moduleId = ymlData.name;
        }

        const manifestPath = path.join(dashDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            report.hasManifest = true;
            try {
                const raw = fs.readFileSync(manifestPath, 'utf-8');
                report.manifest = JSON.parse(raw);
                if (report.manifest?.id && !ymlData.name) {
                    report.moduleId = report.manifest.id;
                }
            } catch (err: any) {
                report.errors.push(`Invalid manifest.json: ${err?.message ?? err}`);
            }
        }

        // 2. Inspect page.tsx (the React UI page)
        const pagePath = path.join(dashDir, 'page.tsx');
        const componentPath = path.join(dashDir, 'component.tsx');
        if (fs.existsSync(pagePath) || fs.existsSync(componentPath)) {
            report.hasComponent = true;
            report.mode = 'custom-page';
        } else {
            report.hasComponent = false;
            report.mode = 'raw-config';
        }

        // 3. Inspect defaultSchema.json
        const schemaPath = path.join(dashDir, 'defaultSchema.json');
        if (fs.existsSync(schemaPath)) {
            report.hasSchema = true;
            try {
                JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
            } catch (err: any) {
                report.errors.push(`Invalid defaultSchema.json: ${err?.message ?? err}`);
            }
        }

        // 4. Inspect and mount routes.ts
        const routesPath = path.join(dashDir, 'routes.ts');
        const routesPathJs = path.join(dashDir, 'routes.js');
        const candidateRoute = fs.existsSync(routesPath) ? routesPath
            : fs.existsSync(routesPathJs) ? routesPathJs
            : null;

        if (candidateRoute) {
            report.hasRoutes = true;
            try {
                const mod = await import(candidateRoute);
                const factory = mod.default ?? mod;
                if (typeof factory !== 'function') {
                    report.errors.push('routes.ts does not export a factory function');
                } else {
                    const router = factory(bot, modDir);
                    if (!router) {
                        report.errors.push('routes.ts factory returned null or undefined');
                    } else {
                        // Register canonical slot (create or swap)
                        const canonicalMount = `/api/modules/${encodeURIComponent(report.moduleId)}/dashboard`;
                        registerSlot(app, canonicalMount, router);

                        // Register custom prefix slots from module.yml or manifest
                        let customPrefixes: string[] = [];
                        if (Array.isArray(ymlData.dashboard?.routePrefixes)) {
                            customPrefixes = ymlData.dashboard.routePrefixes;
                        } else if (typeof ymlData.dashboard?.routePrefix === 'string') {
                            customPrefixes = [ymlData.dashboard.routePrefix];
                        } else if (report.manifest?.routePrefixes && Array.isArray(report.manifest.routePrefixes)) {
                            customPrefixes = report.manifest.routePrefixes;
                        } else if (typeof report.manifest?.routePrefix === 'string') {
                            customPrefixes = [report.manifest.routePrefix];
                        }
                        for (const prefix of customPrefixes) {
                            registerSlot(app, prefix, router, prefix === '/api/guilds');
                        }

                        report.routesMounted = true;
                    }
                }
            } catch (err: any) {
                report.errors.push(`Failed to mount routes: ${err?.message ?? err}`);
            }
        }

        // Evaluate overall status
        if (report.errors.length > 0) {
            report.status = 'error';
            logger.error(`Module "${entry}": Dashboard error -> ${report.errors.join('; ')}`, 'ModuleDashboard');
        } else if (report.warnings.length > 0) {
            report.status = 'warning';
            logger.warn(`Module "${entry}": Dashboard warning -> ${report.warnings.join('; ')}`, 'ModuleDashboard');
        } else {
            report.status = 'ready';
            const pageStatus = report.hasComponent ? 'page: ✓' : 'page: — (raw config)';
            const details = [
                pageStatus,
                report.hasSchema ? 'schema: ✓' : 'schema: —',
                report.routesMounted ? 'routes: ✓' : (report.hasRoutes ? 'routes: ✖' : 'routes: —'),
            ].join(', ');
            logger.info(`Module "${entry}": Dashboard ready (${details})`, 'ModuleDashboard');
        }

        reports.push(report);
    }

    lastReports = reports;

    // Aggregated Summary Log
    const totalCustomPages = reports.filter(r => r.hasComponent).length;
    const totalRawConfig = reports.filter(r => !r.hasComponent).length;
    const totalErrors = reports.filter(r => r.status === 'error').length;
    const totalWarns = reports.filter(r => r.status === 'warning').length;
    const totalRoutes = reports.filter(r => r.routesMounted).length;

    logger.info(
        `Dashboard Discovery Complete: ${reports.length} modules ready (${totalCustomPages} custom pages, ${totalRawConfig} raw config, ${totalRoutes} API routes mounted, ${totalWarns} warnings, ${totalErrors} errors)`,
        'ModuleDashboard'
    );

    return reports;
}

/**
 * Mounts (or live-swaps) dashboard routes for a single module by folder name.
 *
 * Called after hot-installing/updating a module so its API routes become available
 * immediately without re-scanning all modules.
 *
 * - First install  → creates a router slot, registers permanent Express closure
 * - Update/reinstall → swaps the router reference inside the existing slot — live, instant
 *
 * @param app         Express application instance
 * @param modDir      Path to the modules directory
 * @param folderName  The module folder to process (e.g. "ai-system")
 * @param bot         Bot context passed to the routes factory
 */
export async function mountSingleModuleRoutes(app: any, modDir: string, folderName: string, bot: any): Promise<ModuleDashboardReport | null> {
    const dashDir = path.join(modDir, folderName, 'dashboard');
    if (!fs.existsSync(dashDir)) {
        logger.info(`mountSingleModuleRoutes: no dashboard/ dir for "${folderName}" — skipping.`, 'ModuleDashboard');
        return null;
    }

    const report: ModuleDashboardReport = {
        moduleId: folderName,
        folderName,
        hasDashboardDir: true,
        hasManifest: false,
        hasComponent: false,
        hasSchema: false,
        hasRoutes: false,
        routesMounted: false,
        status: 'ready',
        mode: 'raw-config',
        errors: [],
        warnings: [],
    };

    // 1. Inspect module.yml (primary) and manifest.json (optional legacy)
    const ymlData = readModuleYaml(modDir, folderName);
    if (ymlData.name) {
        report.moduleId = ymlData.name;
    }

    const manifestPath = path.join(dashDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        report.hasManifest = true;
        try {
            const raw = fs.readFileSync(manifestPath, 'utf-8');
            report.manifest = JSON.parse(raw);
            if (report.manifest?.id && !ymlData.name) {
                report.moduleId = report.manifest.id;
            }
        } catch (err: any) {
            report.errors.push(`Invalid manifest.json: ${err?.message ?? err}`);
        }
    }

    // Check for page component
    if (fs.existsSync(path.join(dashDir, 'page.tsx')) || fs.existsSync(path.join(dashDir, 'component.tsx'))) {
        report.hasComponent = true;
        report.mode = 'custom-page';
    }

    // Check for defaultSchema
    if (fs.existsSync(path.join(dashDir, 'defaultSchema.json'))) {
        report.hasSchema = true;
    }

    // Mount or swap routes
    const routesPath = path.join(dashDir, 'routes.ts');
    const routesPathJs = path.join(dashDir, 'routes.js');
    const candidateRoute = fs.existsSync(routesPath) ? routesPath
        : fs.existsSync(routesPathJs) ? routesPathJs
        : null;

    if (candidateRoute) {
        report.hasRoutes = true;
        const canonicalMount = `/api/modules/${encodeURIComponent(report.moduleId)}/dashboard`;

        try {
            // Cache-bust import so updated routes.ts code is always picked up
            const mod = await import(`${candidateRoute}?update=${Date.now()}`);
            const factory = mod.default ?? mod;
            if (typeof factory !== 'function') {
                report.errors.push('routes.ts does not export a factory function');
            } else {
                const router = factory(bot, modDir);
                if (!router) {
                    report.errors.push('routes.ts factory returned null or undefined');
                } else {
                    // Register canonical slot (creates closure on first install, swaps on update)
                    registerSlot(app, canonicalMount, router);

                    // Register custom prefix slots from module.yml or manifest
                    let customPrefixes: string[] = [];
                    if (Array.isArray(ymlData.dashboard?.routePrefixes)) {
                        customPrefixes = ymlData.dashboard.routePrefixes;
                    } else if (typeof ymlData.dashboard?.routePrefix === 'string') {
                        customPrefixes = [ymlData.dashboard.routePrefix];
                    } else if (report.manifest?.routePrefixes && Array.isArray(report.manifest.routePrefixes)) {
                        customPrefixes = report.manifest.routePrefixes;
                    } else if (typeof report.manifest?.routePrefix === 'string') {
                        customPrefixes = [report.manifest.routePrefix];
                    }
                    for (const prefix of customPrefixes) {
                        registerSlot(app, prefix, router, prefix === '/api/guilds');
                    }

                    report.routesMounted = true;
                    logger.success(`mountSingleModuleRoutes: routes for "${folderName}" live at "${canonicalMount}"`, 'ModuleDashboard');
                }
            }
        } catch (err: any) {
            report.errors.push(`Failed to mount routes: ${err?.message ?? err}`);
            logger.error(`mountSingleModuleRoutes: failed for "${folderName}": ${err?.message ?? err}`, 'ModuleDashboard');
        }
    }

    if (report.errors.length > 0) {
        report.status = 'error';
    }

    // Merge into lastReports (replace existing entry for this module or append)
    const existingIdx = lastReports.findIndex(r => r.folderName === folderName || r.moduleId === report.moduleId);
    if (existingIdx >= 0) {
        lastReports[existingIdx] = report;
    } else {
        lastReports.push(report);
    }

    return report;
}
