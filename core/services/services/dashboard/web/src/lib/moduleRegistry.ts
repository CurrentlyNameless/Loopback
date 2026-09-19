/**
 * moduleRegistry.ts
 *
 * DYNAMIC MODULE DISCOVERY — ZERO MANUAL IMPORTS.
 *
 * Vite automatically scans the modules folder using import.meta.glob at startup.
 * For modules installed AFTER startup (hot-installed via marketplace), a dynamic
 * import fallback is used so their dashboard pages work without a restart.
 */

import React from 'react';
import type { ModuleEditorProps } from '../features/modules/types.ts';

type ModuleComponent = React.ComponentType<ModuleEditorProps>;
type LazyModuleComponent = React.LazyExoticComponent<ModuleComponent>;

// Vite dynamically discovers all module dashboard pages without ANY manual imports!
// Pattern reaches up from src/lib -> src -> web -> dashboard -> services -> core -> modules
const moduleLoaders = import.meta.glob<any>([
  '../../../../../../modules/*/dashboard/page.tsx',
  '../../../../../../modules/*/dashboard/component.tsx',
]);

// Map of normalized moduleId -> React.lazy loader
const registry = new Map<string, LazyModuleComponent>();

for (const [filePath, loader] of Object.entries(moduleLoaders)) {
  // Extract module directory name from path, e.g. "modules/temp-voice/dashboard/page.tsx" -> "temp-voice"
  const match = filePath.match(/modules\/([^/]+)\/dashboard\/(?:page|component)\.tsx$/);
  if (match && match[1]) {
    const moduleId = match[1].toLowerCase();
    // Prefer page.tsx over component.tsx if both exist
    if (!registry.has(moduleId) || filePath.endsWith('/page.tsx')) {
      const lazyComponent = React.lazy(async () => {
        const mod = await loader();
        return { default: mod.default || mod[Object.keys(mod)[0]] };
      });
      registry.set(moduleId, lazyComponent);
    }
  }
}

// Alias map for common alternate names or typos
const aliases = new Map<string, string>([
  ['antimention',       'anti-mention'],
  ['anti_mention',      'anti-mention'],
  ['tempvoice',         'temp-voice'],
  ['automod',           'auto-mod'],
  ['welcomegoodbye',    'welcome-goodbye'],
  ['levelling',         'leveling'],
  ['xp',                'leveling'],
  ['economy',           'economy-builder'],
  ['logging',           'guild-logging'],
  ['streamers',         'streamer-notifications'],
  ['backups',           'backup'],
  ['revive',            'auto-revive'],
  ['status-monitor',    'discord-status-monitor'],
  ['birthday',          'birthdays'],
  ['advent',            'advent-calendar'],
  ['giveaway',          'giveaway-manager'],
  ['embed',             'embed-builder'],
  ['mindscape',         'mindscape-rpg'],
  ['ai',                'ai-system'],
  ['community-hub',     'guild-center'],
  ['guildcenter',       'guild-center'],
  ['staff-applications','applications'],
  ['staffapplications', 'applications'],
  ['loopback',           'loopback-monitor'],
  ['loopbackmonitor',    'loopback-monitor'],
  ['server-rules',      'rules'],
  ['serverrules',       'rules'],
  ['role',              'roles'],
  ['role-builder',      'roles'],
  ['roles-module',      'roles'],
  ['qrcode',            'qr-code-maker'],
  ['qr',                'qr-code-maker'],
  ['introduction-builder', 'introductions'],
  ['intro-builder',        'introductions'],
  ['intro',                'introductions'],
  ['introductionbuilder',  'introductions'],
]);

export function normalizeModuleId(id: string): string {
  const slug = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return aliases.get(slug) ?? slug;
}

/**
 * Build a dynamic-import lazy component for a module that wasn't in the startup glob.
 * Vite serves the file on-demand since it exists on disk — no restart needed.
 * Result is cached so repeated calls return the same React.lazy reference.
 */
function buildDynamicComponent(folderName: string): LazyModuleComponent {
  const lazyComponent = React.lazy(async () => {
    try {
      // Dynamic import through Vite-backed /api/modules-ui/:name/page.js endpoint.
      // The server redirects to Vite's /@fs/ path so Vite transforms the TSX live on demand!
      const mod = await import(/* @vite-ignore */ `/api/modules-ui/${encodeURIComponent(folderName)}/page.js?t=${Date.now()}`);
      if (mod && mod.default) return { default: mod.default };
      const first = mod ? Object.keys(mod)[0] : null;
      if (first && mod[first]) return { default: mod[first] };
      throw new Error(`No export found in dashboard page for module "${folderName}"`);
    } catch (err) {
      // Clear from registry cache so future navigation can retry cleanly
      registry.delete(folderName);
      registry.delete(normalizeModuleId(folderName));
      throw err;
    }
  });
  return lazyComponent;
}

export function resolveModuleComponent(moduleId: string): LazyModuleComponent | undefined {
  const canonical = normalizeModuleId(moduleId);

  // 1. Static glob registry (modules present at startup)
  if (registry.has(canonical)) return registry.get(canonical);

  // 2. Also check the raw folder name (in case it differs from canonical)
  const raw = moduleId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (registry.has(raw)) return registry.get(raw);

  // 3. Dynamic fallback for modules hot-installed after startup.
  //    We probe the server synchronously (React.lazy handles the async).
  //    Cache the result so we don't build a new lazy on every render.
  //    Only attempt if the module API reports it has a dashboard component.
  //
  //    We create the lazy component optimistically — if the file doesn't exist
  //    the Suspense boundary will catch the rejection and show the fallback.
  const dynamic = buildDynamicComponent(canonical !== raw ? canonical : raw);
  registry.set(canonical, dynamic);
  return dynamic;
}

export function hasModuleComponent(moduleId: string): boolean {
  return registry.has(normalizeModuleId(moduleId));
}

export { registry as MODULE_REGISTRY };
