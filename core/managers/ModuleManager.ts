import { Client } from "discord.js";
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import yaml from "js-yaml";
import { Logger } from "../utils/logger.ts";
import { IModule } from "../interfaces/IModule.ts";
import { AccessLevel } from "../interfaces/AccessLevel.ts";
import { ConfigManager } from "./ConfigManager.ts";
import { DatabaseManager } from "./DatabaseManager.ts";
import { InteractionManager } from "./InteractionManager.ts";
import { LicenseManager } from "../utils/LicenseManager.ts";
import { ModuleStateModel } from "../models/ModuleState.ts";

export class ModuleManager {
    private static _modules: Map<string, IModule> = new Map();
    private static _eventListeners: Map<string, Array<{ name: string, handler: any }>> = new Map();
    private static _client: Client | null = null;
    private static _disabledModules = new Set<string>();
    private static STATE_FILE = resolve('./core/config/disabled-modules.json');

    private static async loadDisabledState(): Promise<void> {
        // 1. Primary: Load persistent module states from MongoDB Database
        try {
            if (DatabaseManager.isConnected()) {
                const dbStates = await ModuleStateModel.find({ enabled: false }).lean();
                for (const state of dbStates) {
                    if (state.name) {
                        this._disabledModules.add(state.name);
                        this._disabledModules.add(state.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                }
                Logger.debug(`Loaded ${dbStates.length} disabled module state(s) from MongoDB database.`, "ModuleManager");
                return;
            }
        } catch (dbErr) {
            Logger.warn(`Could not load module states from database: ${dbErr}`, "ModuleManager");
        }

        // 2. Secondary: Fallback to local JSON configuration
        try {
            if (!existsSync(this.STATE_FILE)) return;
            const raw = readFileSync(this.STATE_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data.disabled)) {
                for (const d of data.disabled) {
                    if (typeof d === 'string') {
                        this._disabledModules.add(d);
                        this._disabledModules.add(d.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                }
            }
        } catch {
            this._disabledModules = new Set();
        }
    }

    private static async persistDisabledState(moduleName?: string, isEnabled?: boolean): Promise<void> {
        // 1. Primary: Persist module state to MongoDB Database
        try {
            if (DatabaseManager.isConnected() && moduleName) {
                await ModuleStateModel.findOneAndUpdate(
                    { name: moduleName },
                    { name: moduleName, enabled: isEnabled ?? true },
                    { upsert: true, new: true }
                );
            }
        } catch (dbErr) {
            Logger.warn(`Could not persist module state for '${moduleName}' to database: ${dbErr}`, "ModuleManager");
        }

        // 2. Secondary: Update local JSON configuration backup
        try {
            mkdirSync(resolve('./core/config'), { recursive: true });
            writeFileSync(this.STATE_FILE, JSON.stringify({ disabled: Array.from(this._disabledModules) }, null, 2));
        } catch { /* non-fatal */ }
    }

    static async loadAll(client: Client): Promise<{ label: string; version: string; commands: number; interactions: number; events: number }[]> {
        this._client = client;
        await this.loadDisabledState();
        const config = ConfigManager.get();
        const modulesDir = config.modules?.directory || "./modules";
        const summary: { label: string; version: string; commands: number; interactions: number; events: number }[] = [];

        await Logger.loadModuleStyles(modulesDir);

        Logger.info(`Scanning directory: ${modulesDir} for modules...`, "ModuleManager");

        try {
            const items = await readdir(modulesDir);
            items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

            const discoveredMap = new Map<string, {
                dirPath: string;
                folderName: string;
                instance: IModule;
                name: string;
                priority: number;
                dependencies: string[];
                softDependencies: string[];
                nodeDependencies: string[];
                enabled: boolean;
            }>();

            // ─── PASS 1: Discovery & Metadata Collection ───────────────────────
            for (const item of items) {
                const itemPath = join(modulesDir, item);
                const itemStat = await stat(itemPath);

                if (!itemStat.isDirectory()) continue;

                if (item.startsWith("-")) {
                    Logger.info(`Module '${item.substring(1)}' is disabled (prefixed with '-')`, "ModuleManager");
                    continue;
                }

                const discovered = await this.discoverModule(itemPath, item);
                if (discovered) {
                    if (!discovered.enabled) {
                        // Store disabled module instance so dashboard can inspect and toggle it, but skip execution
                        this._modules.set(discovered.name, discovered.instance);
                        Logger.info(`Module '${discovered.name}' is disabled in configuration. Skipping load.`, "ModuleManager");
                    } else {
                        discoveredMap.set(discovered.name, discovered);
                    }
                }
            }

            // ─── PASS 2: Dependency Validation & Topological Priority Sorting ───
            const validModules = this.resolveAndSortModules(discoveredMap);

            // ─── PASS 3: Alphabetical Execution with Inline Module & Command Logs ───
            const totalModules = validModules.length;
            let currentStep = 0;
            const delayMs = typeof config.modules?.loadDelayMs === 'number' ? config.modules.loadDelayMs : 250;

            for (const mod of validModules) {
                currentStep++;
                const result = await this.initializeModule(mod.instance, mod.dirPath, mod.folderName, client, false);
                if (result) {
                    summary.push({
                        label: result.label,
                        version: result.version,
                        commands: result.commands,
                        interactions: result.interactions,
                        events: result.events,
                    });
                }

                // Staggered rhythmic pause between modules (matching Athena Bot console cadence)
                if (currentStep < totalModules && delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }

            summary.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
            Logger.debug(`Successfully loaded ${this._modules.size} module(s) in topological dependency order.`, "ModuleManager");
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                Logger.warn(`Modules directory '${modulesDir}' does not exist. Creating it...`, "ModuleManager");
                const { mkdir } = await import("node:fs/promises");
                await mkdir(modulesDir, { recursive: true });
            } else {
                Logger.error("Failed to load modules directory.", "ModuleManager", error);
            }
        }

        return summary;
    }

    private static async discoverModule(
        dirPath: string,
        folderName: string,
    ): Promise<{
        dirPath: string;
        folderName: string;
        instance: IModule;
        name: string;
        priority: number;
        dependencies: string[];
        softDependencies: string[];
        enabled: boolean;
    } | null> {
        const entryPointJs = join(dirPath, "index.js");
        const entryPointTs = join(dirPath, "index.ts");
        const entryPoint = existsSync(entryPointJs) ? entryPointJs : entryPointTs;

        if (!existsSync(entryPoint)) return null;

        try {
            const absolutePath = resolve(entryPoint);
            const fileUrl = pathToFileURL(absolutePath).href;
            const imported = await import(`${fileUrl}?update=${Date.now()}`);
            const ModuleClass = imported.default;

            if (!ModuleClass) {
                Logger.warn(`Module in ${folderName} has no default export. Skipping.`, "ModuleManager");
                return null;
            }

            const instance: IModule = typeof ModuleClass === 'function' ? new ModuleClass() : ModuleClass;

            let priority = instance.priority ?? 100;
            let dependencies: string[] = instance.dependencies ? [...instance.dependencies] : [];
            let softDependencies: string[] = instance.softDependencies ? [...instance.softDependencies] : [];
            let nodeDependencies: string[] = instance.nodeDependencies ? [...instance.nodeDependencies] : [];

            // Read module.yml metadata
            const ymlPath = join(dirPath, "module.yml");
            if (existsSync(ymlPath)) {
                try {
                    const rawYaml = readFileSync(ymlPath, "utf8");
                    const parsed: any = yaml.load(rawYaml);

                    if (parsed) {
                        instance.name = parsed.name || instance.name || folderName;
                        const rawVer = parsed.version || instance.version || '1.0.0';
                        instance.version = typeof rawVer === 'string' ? rawVer.replace(/^v/i, '') : '1.0.0';
                        instance.description = parsed.description || instance.description || '';
                        instance.author = parsed.author || instance.author || 'Unknown';

                        if (typeof parsed.enabled === 'boolean') {
                            instance.enabled = parsed.enabled;
                            if (!parsed.enabled) {
                                this._disabledModules.add(instance.name);
                                this._disabledModules.add(folderName);
                                this._disabledModules.add(instance.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
                            }
                        }

                        if (typeof parsed.priority === 'number') {
                            priority = parsed.priority;
                        }
                        if (Array.isArray(parsed.dependencies)) {
                            dependencies = Array.from(new Set([...dependencies, ...parsed.dependencies.map(String)]));
                        }
                        if (Array.isArray(parsed.softDependencies)) {
                            softDependencies = Array.from(new Set([...softDependencies, ...parsed.softDependencies.map(String)]));
                        }
                        if (Array.isArray(parsed.nodeDependencies)) {
                            nodeDependencies = Array.from(new Set([...nodeDependencies, ...parsed.nodeDependencies.map(String)]));
                        }

                        instance.config = { ...instance.config, ...(parsed.config || {}) };
                    }
                } catch (ymlError) {
                    Logger.error(`Malformed module.yml in ${folderName}`, "ModuleManager", ymlError);
                }
            }

            if (!instance.name) {
                Logger.warn(`Module in ${folderName} is missing a 'name' property. Skipping.`, "ModuleManager");
                return null;
            }

            if (!LicenseManager.canLoadModule(instance.name)) {
                Logger.warn(`Module '${instance.name}' is not licensed under the current license tier. Skipping.`, "ModuleManager");
                return null;
            }

            instance.priority = priority;
            instance.dependencies = dependencies;
            instance.softDependencies = softDependencies;
            instance.nodeDependencies = nodeDependencies;

            const normName = instance.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normFolder = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isExplicitlyDisabled = instance.enabled === false ||
                this._disabledModules.has(instance.name) ||
                this._disabledModules.has(folderName) ||
                this._disabledModules.has(normName) ||
                this._disabledModules.has(normFolder);

            const isEnabled = !isExplicitlyDisabled;
            instance.enabled = isEnabled;
            if (!isEnabled) {
                this._disabledModules.add(instance.name);
                this._disabledModules.add(folderName);
                this._disabledModules.add(normName);
                this._disabledModules.add(normFolder);
            }

            return {
                dirPath,
                folderName,
                instance,
                name: instance.name,
                priority,
                dependencies,
                softDependencies,
                nodeDependencies,
                enabled: isEnabled,
            };
        } catch (error) {
            Logger.error(`Failed to discover module from ${folderName}`, "ModuleManager", error);
            return null;
        }
    }

    private static isNpmPackageInstalled(pkgName: string): boolean {
        try {
            require.resolve(pkgName);
            return true;
        } catch {
            try {
                const pkgPath = join(process.cwd(), "node_modules", pkgName);
                return existsSync(pkgPath);
            } catch {
                return false;
            }
        }
    }

    private static resolveAndSortModules(
        discoveredMap: Map<string, {
            dirPath: string;
            folderName: string;
            instance: IModule;
            name: string;
            priority: number;
            dependencies: string[];
            softDependencies: string[];
            nodeDependencies: string[];
            enabled: boolean;
        }>
    ) {
        const candidates = new Map(discoveredMap);

        // 1. Validate required dependencies (both npm packages and bot modules)
        for (const [name, mod] of candidates.entries()) {
            if (!mod.enabled) continue;

            // Validate explicit Node/NPM dependencies
            for (const nodePkg of mod.nodeDependencies) {
                if (!this.isNpmPackageInstalled(nodePkg)) {
                    Logger.warn(
                        `Module '${name}' cannot load: missing required npm package '${nodePkg}'. Skipping module.`,
                        "ModuleManager"
                    );
                    mod.enabled = false;
                    break;
                }
            }
            if (!mod.enabled) continue;

            // Validate general dependencies (could be npm packages OR bot modules)
            for (const dep of mod.dependencies) {
                // Ignore soft dependencies if listed
                if (mod.softDependencies?.includes(dep)) {
                    continue;
                }

                if (this.isNpmPackageInstalled(dep)) {
                    continue; // NPM package requirement satisfied!
                }

                const targetDep = candidates.get(dep);
                if (!targetDep || !targetDep.enabled) {
                    Logger.warn(
                        `Module '${name}' cannot load: missing or disabled required dependency '${dep}'. Skipping module.`,
                        "ModuleManager"
                    );
                    mod.enabled = false;
                    break;
                }
            }
        }

        const activeModules = Array.from(candidates.values()).filter(m => m.enabled);

        // 2. Topological sort using priority as tie-breaker
        activeModules.sort((a, b) => {
            const aNeedsB = (a.dependencies.includes(b.name) || (a.softDependencies.includes(b.name) && candidates.get(b.name)?.enabled)) && !this.isNpmPackageInstalled(b.name);
            const bNeedsA = (b.dependencies.includes(a.name) || (b.softDependencies.includes(a.name) && candidates.get(a.name)?.enabled)) && !this.isNpmPackageInstalled(a.name);

            if (aNeedsB) return 1;
            if (bNeedsA) return -1;

            // Primary tie-breaker: lower priority numbers load earlier
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Secondary tie-breaker: alphabetical (case-insensitive)
            return (a.folderName || a.name).localeCompare(b.folderName || b.name, undefined, { sensitivity: 'base' });
        });

        return activeModules;
    }

    private static async initializeModule(
        moduleInstance: IModule,
        dirPath: string,
        folderName: string,
        client: Client,
        silent: boolean = false,
    ): Promise<{ label: string; version: string; commands: number; interactions: number; events: number; commandList: string[]; elapsed: number } | null> {
        const start = performance.now();

        try {
            moduleInstance.enabled = true;
            (moduleInstance as any)._initialized = true;

            // ─── Phase 1: onPreLoad (DB schemas & singletons) ─────────────
            if (moduleInstance.onPreLoad) {
                await moduleInstance.onPreLoad();
            }

            // ─── Phase 2: onLoad (Handlers, commands & events) ─────────────
            if (moduleInstance.onLoad) {
                await moduleInstance.onLoad();
            }

            // Auto-register commands and interactions
            if (moduleInstance.commands) {
                moduleInstance.commands.forEach(cmd => {
                    cmd.moduleName = moduleInstance.name;
                    InteractionManager.registerCommand(cmd);
                });
            }
            if (moduleInstance.interactions) {
                moduleInstance.interactions.forEach(int => {
                    int.moduleName = moduleInstance.name;
                    InteractionManager.registerInteraction(int);
                });
            }

            if (moduleInstance.onReady) {
                try {
                    await moduleInstance.onReady(client);
                } catch (readyError) {
                    Logger.error(
                        `Module '${moduleInstance.name}' encountered an error in onReady()`,
                        moduleInstance.name,
                        readyError
                    );
                }
            }

            // Auto-register events
            if (moduleInstance.events) {
                this.registerModuleEvents(moduleInstance);
            }

            this._modules.set(moduleInstance.name, moduleInstance);

            const elapsed = Math.round(performance.now() - start);
            const commandsCount = moduleInstance.commands?.length || 0;
            const interactionsCount = moduleInstance.interactions?.length || 0;
            const eventsCount = moduleInstance.events?.length || 0;
            const commandList = moduleInstance.commands?.map(c => c.data?.name).filter(Boolean) || [];

            if (!silent) {
                Logger.moduleLoad(
                    moduleInstance.name,
                    moduleInstance.version || '?',
                    { commands: commandsCount, interactions: interactionsCount, events: eventsCount, commandList },
                    elapsed
                );
            }

            return {
                label: moduleInstance.name,
                version: moduleInstance.version || '1.0.0',
                commands: commandsCount,
                interactions: interactionsCount,
                events: eventsCount,
                commandList,
                elapsed,
            };
        } catch (error) {
            Logger.error(`Failed to initialize module ${folderName}`, "ModuleManager", error);
            return null;
        }
    }

    static getAllModules(): IModule[] {
        const list = Array.from(this._modules.values());
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
        return list;
    }

    private static unregisterModuleEvents(name: string): void {
        if (!this._client) return;
        const listeners = this._eventListeners.get(name);
        if (!listeners) return;

        listeners.forEach(l => this._client!.removeListener(l.name as any, l.handler));
        this._eventListeners.delete(name);
    }

    private static registerModuleEvents(module: IModule): void {
        if (!this._client || typeof (this._client as any).on !== 'function' || !module.events || module.enabled === false || this._eventListeners.has(module.name)) return;

        const listeners: Array<{ name: string, handler: any }> = [];
        module.events.forEach(event => {
            const handler = event.execute.bind(module);
            if (event.once) {
                this._client!.once(event.name as any, handler);
            } else {
                this._client!.on(event.name as any, handler);
            }
            listeners.push({ name: event.name as string, handler });
        });
        this._eventListeners.set(module.name, listeners);
    }

    static getModule(name: string): IModule | undefined {
        if (!name) return undefined;
        if (this._modules.has(name)) return this._modules.get(name);
        const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [k, v] of this._modules.entries()) {
            const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (kNorm === norm || (v.name && v.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm)) {
                return v;
            }
        }
        return undefined;
    }

    static isModuleEnabled(name: string): boolean {
        if (!name) return false;
        const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Check in-memory disabled set (with alias normalization)
        for (const d of this._disabledModules) {
            const dNorm = d.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (d === name || dNorm === norm) return false;
        }

        // 2. Check loaded module instance
        const module = this.getModule(name);
        if (module && module.enabled === false) {
            return false;
        }

        // 3. Check module.yml on disk
        try {
            const config = ConfigManager.get();
            const modulesDir = config.modules?.directory || "./modules";
            const candidates = [
                join(modulesDir, name, "module.yml"),
                join(modulesDir, norm, "module.yml"),
                join(modulesDir, name.toLowerCase(), "module.yml")
            ];
            for (const c of candidates) {
                if (existsSync(c)) {
                    const content = readFileSync(c, "utf8");
                    const parsed = yaml.load(content) as any;
                    if (parsed && typeof parsed.enabled === 'boolean') {
                        if (!parsed.enabled) return false;
                    }
                    break;
                }
            }
        } catch { /* non-fatal */ }

        return true;
    }

    static setModuleEnabled(name: string, enabled: boolean): boolean {
        const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const module = this.getModule(name);
        const canonicalName = module?.name || name;

        if (module) {
            module.enabled = enabled;
            if (typeof (module as any).updateConfig === 'function') {
                (module as any).updateConfig({ enabled });
            }
        }

        if (enabled) {
            this._disabledModules.delete(name);
            this._disabledModules.delete(canonicalName);
            this._disabledModules.delete(norm);
            this.persistDisabledState(canonicalName, true);

            if (module) {
                if (!(module as any)._initialized && this._client) {
                    try {
                        const config = ConfigManager.get();
                        const modulesDir = config.modules?.directory || "./modules";
                        const candidates = [name, canonicalName, norm, name.toLowerCase(), name.toLowerCase().replace(/_/g, '-')];
                        let foundPath = "";
                        let foundFolder = "";
                        for (const cand of candidates) {
                            const p = join(modulesDir, cand);
                            if (existsSync(p)) {
                                foundPath = p;
                                foundFolder = cand;
                                break;
                            }
                        }
                        if (foundPath) {
                            this.initializeModule(module, foundPath, foundFolder, this._client, false).catch(initErr => {
                                Logger.error(`Failed to initialize module '${canonicalName}' on enable: ${initErr}`, "ModuleManager");
                            });
                        }
                    } catch {}
                } else {
                    if (module.commands) {
                        module.commands.forEach(cmd => {
                            cmd.moduleName = canonicalName;
                            InteractionManager.registerCommand(cmd);
                        });
                    }
                    if (module.interactions) {
                        module.interactions.forEach(int => {
                            int.moduleName = canonicalName;
                            InteractionManager.registerInteraction(int);
                        });
                    }
                    this.registerModuleEvents(module);
                }
            }
        } else {
            this._disabledModules.add(name);
            this._disabledModules.add(canonicalName);
            this._disabledModules.add(norm);
            this.persistDisabledState(canonicalName, false);

            if (module) {
                this.unregisterModuleEvents(canonicalName);
            }
            this.unregisterModuleEvents(name);
            InteractionManager.unregisterCommandsForModule(canonicalName);
            InteractionManager.unregisterCommandsForModule(name);
        }

        // Update module.yml on disk directly
        try {
            const config = ConfigManager.get();
            const modulesDir = config.modules?.directory || "./modules";
            const candidates = [
                join(modulesDir, name, "module.yml"),
                join(modulesDir, canonicalName, "module.yml"),
                join(modulesDir, norm, "module.yml"),
                join(modulesDir, name.toLowerCase(), "module.yml"),
                join(modulesDir, name.toLowerCase().replace(/_/g, '-'), "module.yml"),
                join(modulesDir, canonicalName.toLowerCase().replace(/_/g, '-'), "module.yml")
            ];
            for (const c of candidates) {
                if (existsSync(c)) {
                    const content = readFileSync(c, "utf8");
                    try {
                        const { parseDocument } = require('yaml');
                        const doc = parseDocument(content);
                        doc.set('enabled', enabled);
                        writeFileSync(c, doc.toString(), 'utf-8');
                    } catch {
                        const parsed = yaml.load(content) as any;
                        if (parsed && typeof parsed === 'object') {
                            parsed.enabled = enabled;
                            writeFileSync(c, yaml.dump(parsed, { indent: 2 }));
                        }
                    }
                    break;
                }
            }
        } catch { /* non-fatal */ }

        Logger.info(`${enabled ? "Enabled" : "Disabled"} module: ${canonicalName} in configuration`, "ModuleManager");
        return true;
    }

    static enableModule(name: string): boolean {
        return this.setModuleEnabled(name, true);
    }

    static disableModule(name: string): boolean {
        return this.setModuleEnabled(name, false);
    }

    /**
     * Hot-load (or hot-reload) a single module by its folder name without restarting the bot.
     *
     * Pipeline:
     *  1. Discover the module from disk (fresh import with cache-bust)
     *  2. If already loaded, unload it first (clean swap for updates)
     *  3. Run full initialization: onPreLoad → onLoad → commands → interactions → onReady → events
     *
     * @param folderName  The module folder name inside the modules/ directory (e.g. "ai-system")
     * @param client      Discord.js Client. Falls back to the stored _client if omitted.
     * @returns           true if successfully loaded, false on failure
     */
    static async hotLoadModule(folderName: string, client?: Client): Promise<boolean> {
        const targetClient = client || this._client;
        if (!targetClient) {
            Logger.warn(`hotLoadModule: no Discord client available — module "${folderName}" bot features will be inactive until restart.`, 'ModuleManager');
        }

        const config = ConfigManager.get();
        const modulesDir = config.modules?.directory || './modules';
        const dirPath = join(modulesDir, folderName);

        if (!existsSync(dirPath)) {
            Logger.warn(`hotLoadModule: module folder "${folderName}" does not exist.`, 'ModuleManager');
            return false;
        }

        try {
            // 1. Discover module (fresh import — cache-busted via timestamp in discoverModule)
            const discovered = await this.discoverModule(dirPath, folderName);
            if (!discovered) {
                Logger.warn(`hotLoadModule: could not discover module "${folderName}".`, 'ModuleManager');
                return false;
            }

            const { instance, name } = discovered;

            // 2. If already loaded, unload cleanly first (update path)
            if (this._modules.has(name) && targetClient) {
                Logger.info(`hotLoadModule: unloading existing "${name}" before reload...`, 'ModuleManager');
                await this.unloadModule(name, targetClient);
            } else if (targetClient) {
                // May be registered under folder name if name differs
                if (this._modules.has(folderName)) {
                    await this.unloadModule(folderName, targetClient);
                }
            }

            // Clear from disabled set — installing means we want it enabled
            this._disabledModules.delete(name);
            this._disabledModules.delete(folderName);
            this._disabledModules.delete(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
            this._disabledModules.delete(folderName.toLowerCase().replace(/[^a-z0-9]/g, ''));
            instance.enabled = true;

            // 3. Full initialization (same pipeline as startup)
            if (targetClient) {
                const result = await this.initializeModule(instance, dirPath, folderName, targetClient, false);
                if (result) {
                    Logger.success(
                        `Hot-loaded module "${name}" v${result.version} — ${result.commands} command(s), ${result.events} event(s) in ${result.elapsed}ms`,
                        'ModuleManager'
                    );
                    return true;
                }
                Logger.error(`hotLoadModule: initializeModule failed for "${folderName}".`, 'ModuleManager');
                return false;
            } else {
                // No client — still register module in map so dashboard can see it
                this._modules.set(name, instance);
                Logger.info(`hotLoadModule: registered module "${name}" (no client — Discord features pending restart).`, 'ModuleManager');
                return true;
            }
        } catch (err: any) {
            Logger.error(`hotLoadModule: unexpected error for "${folderName}": ${err?.message ?? err}`, 'ModuleManager');
            return false;
        }
    }

    static async unloadModule(name: string, client: Client): Promise<boolean> {
        const module = this._modules.get(name);
        if (!module) return false;

        try {
            const listeners = this._eventListeners.get(name);
            if (listeners) {
                listeners.forEach(l => client.removeListener(l.name, l.handler));
                this._eventListeners.delete(name);
            }

            if (module.onUnload) {
                await module.onUnload(client);
            }

            this._modules.delete(name);
            Logger.info(`Unloaded module: ${name}`, "ModuleManager");
            return true;
        } catch (error) {
            Logger.error(`Failed to unload module: ${name}`, "ModuleManager", error);
            return false;
        }
    }

    static async unloadAll(client?: Client): Promise<number> {
        const targetClient = client || this._client;
        const moduleNames = Array.from(this._modules.keys());
        let unloadedCount = 0;

        Logger.info(`Unloading all ${moduleNames.length} module(s) prior to system operation...`, "ModuleManager");

        for (const name of moduleNames) {
            const module = this._modules.get(name);
            if (!module) continue;

            try {
                const listeners = this._eventListeners.get(name);
                if (listeners && targetClient) {
                    listeners.forEach(l => targetClient.removeListener(l.name as any, l.handler));
                    this._eventListeners.delete(name);
                }

                if (module.onUnload && targetClient) {
                    await module.onUnload(targetClient);
                }

                this._modules.delete(name);
                unloadedCount++;
            } catch (error) {
                Logger.error(`Error unloading module ${name}:`, "ModuleManager", error);
            }
        }

        this._eventListeners.clear();
        Logger.success(`Successfully unloaded ${unloadedCount} module(s).`, "ModuleManager");
        return unloadedCount;
    }
}
