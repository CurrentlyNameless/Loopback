import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import session from 'express-session';
import http from 'http';
import https from 'https';
import path from 'path';
import fs, { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { logger } from '../../utils/Logger.js';
import { resolveModulesDir, findModuleDir } from './services/ConfigService.js';
import { SERVER_BOOT_INSTANCE_ID } from './middleware/auth.ts';

// Dedicated Route Handlers
import authRoutes from './routes/auth.ts';
import telemetryRoutes from './routes/telemetry.ts';
import guildsRoutes from './routes/guilds.ts';
import modulesRoutes, { guildModulesRouter } from './routes/modules.ts';
import uploadRoutes from './routes/upload.ts';
import commandsApi, { loadCommandState, guildCommandsRouter } from './routes/commands.ts';
import notificationsRoutes from './routes/notifications.ts';
import updatesRoutes from './routes/updates.ts';
import marketplaceRoutes from './routes/marketplace.ts';

import { ConfigManager } from '../../managers/ConfigManager.ts';
import { mountModuleRoutes } from './services/ModuleDashboardDiscovery.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class DashboardServer {
    private server: http.Server | https.Server | null = null;
    private bot: any;
    private cfg: any;

    constructor(botOpts?: any, cfgOpts?: any) {
        this.bot = botOpts || {};
        this.cfg = cfgOpts || botOpts?.config || ConfigManager.get();
    }

    async start(botArg?: any, cfgArg?: any): Promise<string> {
        const bot = botArg || this.bot || {};
        const cfg = cfgArg || this.cfg || bot?.config || ConfigManager.get();

        const app = express();
        const modDir = resolveModulesDir(cfg);
        const commandsDir = path.resolve(modDir, 'core-commands', 'interactions', 'commands');

        const callbackUrlBase = cfg?.dashboard?.callbackUrl || cfg?.dashboard?.oauth?.callbackUrl || cfg?.discord?.callbackUrl || 'http://localhost:3000';
        const isHttps = callbackUrlBase.startsWith('https://');

        app.use((req, res, next) => {
            const { licenseManager } = require('../../../index.ts');
            if (cfg?.discord?.guildId && licenseManager) {
                const banCheck = licenseManager.isGuildBanned(cfg.discord.guildId);
                if (banCheck.banned) {
                    return res.status(403).send(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Access Revoked | FloofCore</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
                            <style>
                                body { font-family: 'Inter', sans-serif; }
                            </style>
                        </head>
                        <body class="min-h-screen w-full bg-[#0F1423] text-slate-100 flex items-center justify-center relative overflow-hidden m-0">
                            
                            <!-- Static Dotted Pattern (Particles) -->
                            <div class="pointer-events-none absolute inset-0 overflow-hidden z-0">
                                <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-rose-600/[0.12] blur-[100px]"></div>
                                <div class="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/[0.08] blur-[100px]"></div>
                                <div class="absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0); background-size: 28px 28px;"></div>
                            </div>

                            <!-- Shield Monolith -->
                            <div class="relative z-10 w-full max-w-xl mx-auto p-4 animate__animated animate__fadeInUp animate__faster">
                                <div class="rounded-3xl bg-[#141A2B]/90 border border-rose-500/30 shadow-[0_0_80px_-15px_rgba(225,29,72,0.25)] backdrop-blur-xl p-8 sm:p-10 relative overflow-hidden">
                                    
                                    <!-- Top Radiant Edge -->
                                    <div class="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/80 to-transparent"></div>
                                    <div class="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-600/30 blur-[80px] rounded-full"></div>

                                    <!-- Content -->
                                    <div class="flex flex-col items-center text-center">
                                        <!-- Icon -->
                                        <div class="w-20 h-20 mb-6 rounded-[1.25rem] bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-[0_0_40px_-5px_rgba(225,29,72,0.4)] ring-4 ring-rose-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                                        </div>

                                        <span class="px-3 py-1 mb-4 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-rose-500/15 text-rose-400 border border-rose-500/40">
                                            Access Revoked
                                        </span>

                                        <h1 class="text-3xl sm:text-4xl font-black text-rose-500 tracking-tight mb-3">Guild Banned</h1>
                                        <p class="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-md mx-auto mb-8">
                                            This server has been permanently or temporarily suspended from utilizing the FloofCore network.
                                        </p>

                                        <!-- Details Grid -->
                                        <div class="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8">
                                            <div class="bg-black/30 border border-white/10 rounded-2xl p-5 flex flex-col justify-center transition-all hover:bg-black/50 hover:border-white/20">
                                                <strong class="text-rose-400/90 uppercase text-[10px] font-bold tracking-widest mb-1.5">Banned By</strong>
                                                <span class="text-slate-300 text-sm font-bold">${banCheck.addedBy || 'Staff'}</span>
                                            </div>
                                            <div class="bg-black/30 border border-white/10 rounded-2xl p-5 flex flex-col justify-center transition-all hover:bg-black/50 hover:border-white/20">
                                                <strong class="text-rose-400/90 uppercase text-[10px] font-bold tracking-widest mb-1.5">Reason</strong>
                                                <span class="text-slate-300 text-sm font-bold truncate" title="${banCheck.reason || 'No reason provided'}">${banCheck.reason || 'No reason provided'}</span>
                                            </div>
                                        </div>
                                        
                                        <!-- Action Buttons -->
                                        <div class="w-full pt-6 border-t border-white/10">
                                            <a href="https://discord.gg/EjUzF77RAs" target="_blank" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600/80 border border-indigo-500/50 hover:bg-indigo-500 text-slate-200 hover:text-white text-sm font-bold shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                                                Contact Support
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </body>
                        </html>
                    `);
                }
            }
            next();
        });

        // Security headers & Parsers
        app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.removeHeader('Permissions-Policy');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
            // Force browser to use reliable HTTP/2 or HTTP/1.1 TCP connections instead of failing QUIC UDP streams
            res.setHeader('Alt-Svc', 'clear');
            next();
        });

        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Session Setup
        let configuredSessionSecret = cfg?.dashboard?.sessionSecret ?? cfg?.dashboard?.secret;
        let sessionSecret: string;
        if (typeof configuredSessionSecret === 'string' && configuredSessionSecret.length >= 32 && !configuredSessionSecret.includes('change-me')) {
            sessionSecret = configuredSessionSecret;
        } else {
            sessionSecret = crypto.randomBytes(32).toString('hex');
            if (cfg?.dashboard) {
                cfg.dashboard.sessionSecret = sessionSecret;
                delete cfg.dashboard.secret;
                try {
                    ConfigManager.saveConfig().catch(() => {});
                } catch {}
            }
        }

        app.use(session({
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: isHttps,
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            },
        }));

        // Static Uploads & Module Assets
        const uploadsDir = path.resolve(__dirname, '../../public/uploads');
        if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir, { recursive: true });
        }
        app.use('/uploads', express.static(uploadsDir));
        // Module source and module.yml files may contain credentials. Serve only
        // the explicit public resource folders needed by the dashboard.
        app.use('/modules/guild-center/resources', express.static(path.join(modDir, 'guild-center', 'resources'), { fallthrough: true, index: false }));

        // ── Mount Modular API Routes ────────────────────────────────
        app.use('/auth', authRoutes(bot, cfg));
        
        // Public API routes for bot discovery, live telemetry, applications, and hub info
        app.use('/api', telemetryRoutes(bot));
        // Dashboard management APIs require active session (or valid license key)
        app.use('/api', (req, res, next) => {
            if (
                req.path === '/guilds' || 
                req.path === '/guilds/' ||
                req.path.startsWith('/guilds/') ||
                req.originalUrl.startsWith('/api/guilds') ||
                req.originalUrl.startsWith('/api/applications') ||
                req.path.startsWith('/applications') ||
                req.path.endsWith('/theme') || 
                req.path.endsWith('/settings') ||
                req.path === '/marketplace' ||
                req.path.startsWith('/marketplace') ||
                req.path.startsWith('/modules-ui')
            ) {
                return next();
            }
            const licenseKey = req.body?.licenseKey || (req.headers['x-license-key'] as string) || (req.query?.key as string);
            const cfgKey = cfg?.license?.key || cfg?.key;
            if (licenseKey && cfgKey && licenseKey === cfgKey) {
                return next();
            }
            const sess = req.session as any;
            if (!sess?.user || sess.instanceId !== SERVER_BOOT_INSTANCE_ID) {
                res.status(401).json({ error: 'Unauthorized: Session expired due to bot restart', botRestarted: true });
                return;
            }
            next();
        });

        // ── Dynamic Module UI Entry Point (Hot-Reload / Dynamic Import) ────
        // Resolves module dashboard page/component/portal for freshly installed modules
        // and redirects to Vite's /@fs/ path so Vite transforms the TSX live on demand.
        app.get(['/api/modules-ui/:name/:file', '/api/modules-ui/:name'], (req, res) => {
            const modName = req.params.name;
            const requestedFile = req.params.file || 'page.js';
            const baseName = requestedFile.replace(/\.(js|jsx|ts|tsx)$/, '');
            const actualDir = findModuleDir(modDir, modName) || path.join(modDir, modName);

            let candidates: string[] = [];
            if (baseName === 'page' || baseName === 'component') {
                candidates = [
                    path.join(actualDir, 'dashboard', 'page.tsx'),
                    path.join(actualDir, 'dashboard', 'component.tsx'),
                    path.join(actualDir, 'dashboard', 'page.jsx'),
                    path.join(actualDir, 'dashboard', 'component.jsx'),
                    path.join(actualDir, 'dashboard', 'page.js'),
                    path.join(actualDir, 'dashboard', 'component.js'),
                ];
            } else if (baseName === 'ApplicationFormPortal' || baseName === 'portal') {
                candidates = [
                    path.join(actualDir, 'dashboard', 'ApplicationFormPortal.tsx'),
                    path.join(actualDir, 'dashboard', 'ApplicationFormPortal.jsx'),
                    path.join(actualDir, 'dashboard', 'portal.tsx'),
                    path.join(actualDir, 'dashboard', 'portal.jsx'),
                    path.join(actualDir, 'dashboard', `${baseName}.tsx`),
                    path.join(actualDir, 'dashboard', `${baseName}.jsx`),
                ];
            } else if (baseName === 'PublicStorePage' || baseName === 'store') {
                candidates = [
                    path.join(actualDir, 'dashboard', 'PublicStorePage.tsx'),
                    path.join(actualDir, 'dashboard', 'PublicStorePage.jsx'),
                    path.join(actualDir, 'dashboard', 'store.tsx'),
                    path.join(actualDir, 'dashboard', 'store.jsx'),
                    path.join(actualDir, 'dashboard', `${baseName}.tsx`),
                    path.join(actualDir, 'dashboard', `${baseName}.jsx`),
                ];
            } else {
                candidates = [
                    path.join(actualDir, 'dashboard', `${baseName}.tsx`),
                    path.join(actualDir, 'dashboard', `${baseName}.jsx`),
                    path.join(actualDir, 'dashboard', `${baseName}.ts`),
                    path.join(actualDir, 'dashboard', `${baseName}.js`),
                    path.join(actualDir, 'dashboard', 'page.tsx'),
                    path.join(actualDir, 'dashboard', 'component.tsx'),
                ];
            }

            const found = candidates.find(c => existsSync(c));
            if (!found) {
                res.status(404).json({ error: `No dashboard UI file "${requestedFile}" found for module "${modName}"` });
                return;
            }
            const normalized = found.split(path.sep).join('/');
            const fsPath = '/@fs/' + (normalized.startsWith('/') ? normalized.slice(1) : normalized);
            res.redirect(307, fsPath);
        });

        app.use('/api/upload', uploadRoutes(uploadsDir));
        app.use('/api/guilds', guildsRoutes(bot, cfg));
        app.use('/api/guilds', guildModulesRouter(bot, cfg));
        app.use('/api/guilds', guildCommandsRouter(bot));
        app.use('/api/modules', modulesRoutes(bot, cfg));
        app.use('/api/commands', commandsApi(bot));
        app.use('/api/notifications', notificationsRoutes(bot, cfg));
        app.use('/api/marketplace', marketplaceRoutes(bot, cfg));
        app.use('/api/guilds', updatesRoutes(bot, cfg));
        app.use('/api', updatesRoutes(bot, cfg));

        // ── Auto-mount Per-Module Dashboard Routes ──────────────────────────
        // Scans modules/*/dashboard/routes.ts and mounts each dynamically based on manifest.json
        await mountModuleRoutes(app, modDir, bot);

        // Initialize command states
        loadCommandState(bot.interactionManager ?? bot.moduleManager);

        // ── Frontend Delivery — Vite Middleware Mode (Always) ───────────────
        // Changes to TSX/CSS/assets are picked up immediately on the next request.
        // No build step or dist/ folder needed.
        const webDir = path.resolve(__dirname, 'web');
        const projectRoot = path.resolve(__dirname, '../../..');

        if (existsSync(webDir)) {
            logger.info('🛠️  Starting Vite middleware (dev mode — no build required)...', 'Dashboard');

            // Ensure client dashboard dependencies are installed
            try {
                require.resolve('@tabler/icons-react');
                require.resolve('@tanstack/react-query');
            } catch {
                try {
                    const { execSync } = require('node:child_process');
                    const isBun = typeof (process.versions as any)?.bun === 'string';
                    logger.info('📦 Installing missing dashboard dependencies (bun install)...', 'Dashboard');
                    execSync(isBun ? 'bun install' : 'npm install', {
                        cwd: projectRoot,
                        stdio: 'inherit',
                        timeout: 180000,
                    });
                    logger.success('✅ Dashboard dependencies installed successfully!', 'Dashboard');
                } catch (e: any) {
                    logger.warn(`Could not auto-install dependencies: ${e.message}`, 'Dashboard');
                }
            }

            const hasReactQuery = existsSync(path.resolve(projectRoot, 'node_modules/@tanstack/react-query'));

            const plugins: any[] = [];
            try {
                const reactPlugin = (await import('@vitejs/plugin-react')).default;
                plugins.push(reactPlugin());
            } catch {}
            try {
                const tailwindPlugin = (await import('@tailwindcss/vite')).default;
                plugins.push(tailwindPlugin());
            } catch {}

            const vite = await createViteServer({
                root: webDir,
                cacheDir: path.resolve(webDir, '.vite'),
                resolve: {
                    alias: {
                        '@': path.resolve(webDir, 'src'),
                        '@modules': path.resolve(projectRoot, 'modules'),
                        '@tabler/icons-react': path.resolve(webDir, 'src/lib/tablerFallback.tsx'),
                        ...(!hasReactQuery ? { '@tanstack/react-query': path.resolve(webDir, 'src/lib/reactQueryFallback.tsx') } : {}),
                    },
                },
                optimizeDeps: {
                    holdUntilCrawlEnd: false,
                    include: [
                        'react',
                        'react-dom',
                        'react-dom/client',
                        'react/jsx-runtime',
                        'react-router-dom',
                        'zustand',
                        'framer-motion',
                        'gsap',
                        '@gsap/react',
                        'lucide-react',
                        'clsx',
                        'js-yaml',
                        'tailwind-merge',
                        'canvas-confetti',
                        ...(hasReactQuery ? ['@tanstack/react-query'] : []),
                    ],
                },
                plugins,
                server: {
                    allowedHosts: true as any,
                    middlewareMode: true,
                    hmr: false,
                    watch: { ignored: ['**/vite.config.*'] },
                    fs: { allow: [webDir, projectRoot, modDir] },
                },
                appType: 'spa',
            });

            // Prevent path traversal probes
            app.use((req, res, next) => {
                if (req.method !== 'GET' && req.method !== 'HEAD') return next();

                let p = req.path;
                try { p = decodeURIComponent(p); } catch {}

                if (!p.startsWith('/@') && p.split('/').some(seg => seg === '..')) {
                    res.status(403).json({ error: 'Forbidden path traversal' });
                    return;
                }

                next();
            });

            // Prevent unhandled /api and /auth requests from falling through to Vite's HTML SPA router
            app.use(['/api', '/auth'], (_req, res) => {
                res.status(404).json({ error: 'API route not found' });
            });

            // Clean Vite client stub to prevent WebSocket connection failures to port 24678 in container environments
            app.get('/@vite/client', (_req, res) => {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                res.send(`
// FloofCore Vite Client Adapter (WebSocket HMR disabled for cluster security & container port limits)
class ErrorOverlay extends HTMLElement {}
if (typeof customElements !== 'undefined' && !customElements.get('vite-error-overlay')) {
    customElements.define('vite-error-overlay', ErrorOverlay);
}
export function createHotContext() {
    return {
        accept() {},
        prune() {},
        dispose() {},
        decline() {},
        invalidate() {},
        on() {},
        off() {},
        send() {},
    };
}
export function updateStyle(id, content) {
    if (typeof document === 'undefined') return;
    let style = document.getElementById(id);
    if (!style) {
        style = document.createElement('style');
        style.id = id;
        document.head.appendChild(style);
    }
    style.textContent = content;
}
export function removeStyle(id) {
    if (typeof document === 'undefined') return;
    const style = document.getElementById(id);
    if (style) style.remove();
}
export function injectQuery(url, queryToInject) {
    if (url[0] !== "." && url[0] !== "/") return url;
    const pathname = url.replace(/[?#].*$/, "");
    const { search, hash } = new URL(url, "http://vite.dev");
    return \`\${pathname}?\${queryToInject}\${search ? '&' + search.slice(1) : ''}\${hash || ''}\`;
}
export { ErrorOverlay };
export default {};
`);
            });

            app.use(vite.middlewares);

            // Global Express error handler to prevent TCP socket drops/crashes (Cloudflare 520 prevention)
            app.use((err: any, req: any, res: any, next: any) => {
                logger.error(`Dashboard server error on ${req.method} ${req.url}: ${err?.stack || err?.message || err}`, 'Dashboard');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unknown error' });
                }
            });
        } else {
            logger.warn('No web/ source directory found — dashboard UI unavailable', 'Dashboard');
            app.get('/', (_req, res) => res.json({
                message: 'Dashboard API running, but dashboard web/ source directory is missing.',
            }));
        }


        // ── Server Listen ──────────────────────────────────────────
        const port = parseInt(process.env.SERVER_PORT ?? process.env.PORT ?? cfg?.dashboard?.port ?? '3000', 10);
        return new Promise<string>((resolve, reject) => {
            const startServer = (handler: any) => {
                this.server = handler.listen(port, '0.0.0.0', () => {
                    const proto = isHttps ? 'https' : 'http';
                    let displayUrl = `${proto}://localhost:${port}`;
                    try {
                        const configuredUrl = cfg?.dashboard?.publicUrl || cfg?.dashboard?.callbackUrl || cfg?.dashboard?.oauth?.callbackUrl;
                        if (configuredUrl) {
                            const parsed = new URL(configuredUrl);
                            displayUrl = `${parsed.protocol}//${parsed.host}`;
                        }
                    } catch {}
                    resolve(`${displayUrl} (listening on 0.0.0.0:${port})`);
                });
                this.server.once('error', (err: any) => {
                    logger.error(`Dashboard failed to start on port ${port}: ${err?.message ?? err}`, 'Dashboard');
                    reject(err);
                });
            };

            if (isHttps) {
                const forge = require('node-forge');
                let hostname = 'localhost';
                try {
                    hostname = new URL(callbackUrlBase).hostname;
                } catch {
                    hostname = callbackUrlBase.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
                }

                const keys = forge.pki.rsa.generateKeyPair(2048);
                const cert = forge.pki.createCertificate();
                cert.publicKey = keys.publicKey;
                cert.serialNumber = '01';
                cert.validity.notBefore = new Date();
                cert.validity.notAfter = new Date();
                cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

                cert.setSubject([{ name: 'commonName', value: hostname }]);
                cert.setIssuer([{ name: 'commonName', value: hostname }]);

                cert.setExtensions([
                    { name: 'subjectAltName', altNames: [{ type: 2, value: hostname }] },
                ]);

                cert.sign(keys.privateKey, forge.md.sha256.create());

                const privPem = forge.pki.privateKeyToPem(keys.privateKey);
                const certPem = forge.pki.certificateToPem(cert);

                logger.info(`Generated self-signed TLS certificate for ${hostname}`, 'Dashboard');
                const server = https.createServer({ key: privPem, cert: certPem }, app as any);
                startServer(server);
            } else {
                startServer(app);
            }
        });
    }

    async stop(): Promise<void> {
        if (!this.server) return;
        return new Promise(resolve => {
            this.server!.close(() => {
                logger.setOnLogCallback(undefined);
                logger.info('Dashboard server stopped', 'DashboardServer');
                resolve();
            });
        });
    }
}
