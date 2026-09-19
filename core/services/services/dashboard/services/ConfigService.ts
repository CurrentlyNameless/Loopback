import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { parseDocument } from 'yaml';

export const META_KEYS = new Set([
    'name', 'version', 'author', 'description', 'enabled',
    'commands', 'events', 'dependencies', 'requiredIntents',
    'requiredPermissions', 'enabledByDefault', 'logger', 'placeholders'
]);

export function resolveModulesDir(cfg?: any): string {
    if (cfg?.modules?.directory) {
        return path.resolve(process.cwd(), cfg.modules.directory);
    }
    if (cfg?.modulesDir) {
        return path.resolve(process.cwd(), cfg.modulesDir);
    }
    return path.resolve(process.cwd(), 'modules');
}

/**
 * Intelligently finds the matching module directory (e.g. 'tempvoice' -> 'temp-voice', 'automod' -> 'auto-mod').
 */
export function findModuleDir(modDir: string, name: string): string | null {
    if (!name || !/^[a-zA-Z0-9_\s-]+$/.test(name)) return null;
    const root = path.resolve(modDir);
    const isDirectChildDirectory = (candidate: string): boolean => {
        const resolved = path.resolve(root, candidate);
        return path.dirname(resolved) === root && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
    };
    const trimmed = name.trim();
    const direct = path.join(root, trimmed);
    if (isDirectChildDirectory(trimmed)) return direct;

    const norm = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!fs.existsSync(modDir)) return null;

    try {
        const entries = fs.readdirSync(modDir);
        // Exact normalized match
        for (const entry of entries) {
            const entryNorm = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (entryNorm === norm) {
                if (isDirectChildDirectory(entry)) return path.join(root, entry);
            }
        }
        // Substring / alias match
        for (const entry of entries) {
            const entryNorm = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (entryNorm.includes(norm) || norm.includes(entryNorm)) {
                if (isDirectChildDirectory(entry)) return path.join(root, entry);
            }
        }
    } catch {}

    return null;
}

/**
 * Extracts pure module settings from a raw config or full module.yml object.
 * If object has a `config:` block, unwraps it. Also strips metadata keys.
 */
export function extractModuleSettings(obj: any): Record<string, any> {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};

    // If obj has a nested `config:` block that is an object, unwrap it
    let cur = obj;
    while (cur && typeof cur === 'object' && 'config' in cur && cur.config && typeof cur.config === 'object' && !Array.isArray(cur.config)) {
        cur = cur.config;
    }

    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(cur)) {
        if (!META_KEYS.has(k)) {
            result[k] = v;
        }
    }

    // Also bring over any non-metadata keys that might have been at the top level
    if (cur !== obj) {
        for (const [k, v] of Object.entries(obj)) {
            if (!META_KEYS.has(k) && k !== 'config' && !(k in result)) {
                result[k] = v;
            }
        }
    }

    return result;
}

export function readModuleConfig(modDir: string, name: string): { config: any; rawYaml: string; path: string } {
    const actualDir = findModuleDir(modDir, name);
    if (!actualDir) return { config: {}, rawYaml: '', path: '' };
    const candidates = [
        path.join(actualDir, 'module.yml'),
        path.join(actualDir, 'config.yml'),
        path.join(actualDir, 'example.module.yml'),
        path.join(actualDir, 'module.json'),
        path.join(actualDir, 'config.json'),
    ];

    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
            try {
                const raw = fs.readFileSync(filePath, 'utf-8');
                if (filePath.endsWith('.json')) {
                    const parsed = JSON.parse(raw);
                    return { config: parsed || {}, rawYaml: raw, path: filePath };
                }
                const parsed = yaml.load(raw);
                return { config: parsed || {}, rawYaml: raw, path: filePath };
            } catch {
                // Keep looking
            }
        }
    }

    const defaultPath = path.join(actualDir, 'module.yml');
    return { config: {}, rawYaml: '', path: defaultPath };
}

export function writeModuleConfig(modDir: string, name: string, data: any): { success: boolean; path?: string } {
    const actualDir = findModuleDir(modDir, name);
    if (!actualDir) return { success: false };
    const yamlPath = path.join(actualDir, 'module.yml');
    const fallbackPath = path.join(actualDir, 'config.yml');
    const examplePath = path.join(actualDir, 'example.module.yml');
    const targetPath = fs.existsSync(fallbackPath) && !fs.existsSync(yamlPath) ? fallbackPath : yamlPath;

    try {
        if (typeof data === 'string') {
            fs.writeFileSync(targetPath, data, 'utf-8');
            return { success: true, path: targetPath };
        }

        // Object payload: preserve comments, ASCII banners, and placeholders
        let sourceContent = '';
        if (fs.existsSync(targetPath)) {
            sourceContent = fs.readFileSync(targetPath, 'utf-8');
        } else if (fs.existsSync(examplePath)) {
            sourceContent = fs.readFileSync(examplePath, 'utf-8');
        }

        if (sourceContent && sourceContent.trim().length > 0) {
            try {
                const doc = parseDocument(sourceContent);
                const cleanSettings = extractModuleSettings(data);
                
                // Deep merge settings into YAML AST node tree preserving comments & ASCII art
                const applyAstMerge = (prefix: (string | number)[], obj: any) => {
                    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                        doc.setIn(prefix, obj);
                        return;
                    }
                    for (const [key, val] of Object.entries(obj)) {
                        const fullPath = [...prefix, key];
                        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                            const existing = doc.getIn(fullPath);
                            if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
                                applyAstMerge(fullPath, val);
                            } else {
                                doc.setIn(fullPath, val);
                            }
                        } else {
                            doc.setIn(fullPath, val);
                        }
                    }
                };

                const hasTopLevelConfig = doc.has('config');
                if (hasTopLevelConfig) {
                    applyAstMerge(['config'], cleanSettings);
                } else {
                    applyAstMerge([], cleanSettings);
                }

                if (typeof data.enabled === 'boolean') {
                    doc.set('enabled', data.enabled);
                }

                fs.writeFileSync(targetPath, doc.toString(), 'utf-8');
                return { success: true, path: targetPath };
            } catch {
                // Fallback to dump if parseDocument failed
            }
        }

        const yamlStr = yaml.dump(data, { indent: 2, lineWidth: -1 });
        fs.writeFileSync(targetPath, yamlStr, 'utf-8');
        return { success: true, path: targetPath };
    } catch {
        return { success: false };
    }
}
