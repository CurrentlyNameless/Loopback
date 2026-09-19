import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsapWaterfallGrid } from '../../lib/animations.ts';
import { 
  IconSearch, 
  IconCheck, 
  IconX, 
  IconSettings,
  IconChevronRight,
  IconCpu,
  IconRefresh,
  IconPower,
  IconTerminal2,
  IconShield,
  IconUsers,
  IconTools,
  IconTrash,
  IconAlertTriangle
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { Switch } from '../../components/ui/Switch.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { getModuleMeta, ModuleMeta } from '../../lib/moduleMeta.ts';
import { normalizeModuleId } from '../../lib/moduleRegistry.ts';
import { useGuildStore } from '../../stores/guild.ts';
import { RainbowYamlEditor } from '../../components/RainbowYamlEditor.tsx';

interface ModuleData {
  id: string;
  name: string;
  label?: string;
  version?: string;
  description?: string;
  author?: string;
  category?: 'security' | 'utility' | 'engagement' | 'system';
  enabled: boolean;
  commands?: number;
  icon?: string;
}

// Exact 29 true cluster modules from the FloofCore module engine (sorted alphabetically)
const INITIAL_TRUE_MODULES: ModuleData[] = [
  { id: 'advent-calendar', name: 'advent-calendar', enabled: true, version: '0.0.1', author: 'Currently_Nameless and OnedEyePete', icon: '🎄' },
  { id: 'ai-system', name: 'ai-system', enabled: true, version: 'v2.0.0', author: 'FloofCore', icon: '🧠' },
  { id: 'anti-mention', name: 'anti-mention', label: 'Anti-Mention', enabled: true, version: 'v1.0.0', author: 'Currently_Nameless and OnedEyePete', icon: '🔕' },
  { id: 'applications', name: 'applications', label: 'Applications', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '📋' },
  { id: 'auto-mod', name: 'auto-mod', enabled: true, version: 'v2.1.0', author: 'FloofCore', icon: '🛡️' },
  { id: 'auto-revive', name: 'auto-revive', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '♻️' },
  { id: 'backup', name: 'backup', enabled: true, version: 'v1.1.4', author: 'FloofCore', icon: '🗄️' },
  { id: 'birthdays', name: 'birthdays', enabled: true, version: '0.0.1', author: 'Currently_Nameless and OnedEyePete', icon: '🎂' },
  { id: 'channel-stats', name: 'channel-stats', enabled: true, version: 'v1.0.2', author: 'FloofCore', icon: '📈' },
  { id: 'core-commands', name: 'core-commands', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🛠️' },
  { id: 'discord-status-monitor', name: 'discord-status-monitor', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '📶' },
  { id: 'economy-builder', name: 'economy-builder', enabled: true, version: 'v1.2.0', author: 'FloofCore', icon: '🏗️' },
  { id: 'flm-backup', name: 'flm-backup', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🗄️' },
  { id: 'game-host-check', name: 'game-host-check', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🎮' },
  { id: 'giveaway-manager', name: 'giveaway-manager', enabled: true, version: 'v1.1.0', author: 'FloofCore', icon: '🎁' },
  { id: 'guild-achievements', name: 'guild-achievements', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🏅' },
  { id: 'guild-center', name: 'guild-center', enabled: true, version: 'v2.0.0', author: 'FloofCore', icon: '🏛️' },
  { id: 'guild-logging', name: 'guild-logging', enabled: true, version: 'v1.1.0', author: 'FloofCore', icon: '📝' },
  { id: 'honeypot', name: 'honeypot', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🍯' },
  { id: 'leveling', name: 'leveling', enabled: true, version: 'v1.4.2', author: 'FloofCore', icon: '🎖️' },
  { id: 'link-embedder', name: 'link-embedder', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🔗' },
  { id: 'music', name: 'music', enabled: false, version: 'v1.0.1', author: 'FloofCore', icon: '🎵' },
  { id: 'nekos-best-socials-gifs', name: 'nekos-best-socials-gifs', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '😊' },
  { id: 'plant-a-tree', name: 'plant-a-tree', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🌳' },
  { id: 'poll-system', name: 'poll-system', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🗳️' },
  { id: 'product-panel', name: 'product-panel', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🛍️' },
  { id: 'qr-code-maker', name: 'qr-code-maker', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🔳' },
  { id: 'reputation', name: 'reputation', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '⭐' },
  { id: 'streamer-notifications', name: 'streamer-notifications', enabled: true, version: 'v1.0.3', author: 'FloofCore', icon: '📺' },
  { id: 'suggestions', name: 'suggestions', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '💡' },
  { id: 'temp-voice', name: 'temp-voice', enabled: true, version: 'v1.2.5', author: 'FloofCore', icon: '🎙️' },
  { id: 'tickets', name: 'tickets', enabled: true, version: 'v2.0.0', author: 'FloofCore', icon: '🎫' },
  { id: 'timed-channels', name: 'timed-channels', enabled: true, version: '0.0.1', author: 'Currently_Nameless', icon: '🌙' },
  { id: 'webhook-center', name: 'webhook-center', enabled: true, version: 'v1.0.0', author: 'FloofCore', icon: '🔗' },
  { id: 'welcome-goodbye', name: 'welcome-goodbye', enabled: true, version: 'v1.3.0', author: 'FloofCore', icon: '👋' },
];

function formatCapitalModuleName(name: string): string {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'ai') return 'AI';
      if (lower === 'flm') return 'FLM';
      if (lower === 'qr') return 'QR';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('-');
}

const PROTECTED_CORE_MODULES = new Set([
  'core-commands',
  'corecommands',
  'core',
  'guild-center',
  'guildcenter',
]);

const isProtectedModule = (id: string) => {
  const norm = (id || '').toLowerCase().trim();
  const slug = norm.replace(/[^a-z0-9]/g, '');
  return PROTECTED_CORE_MODULES.has(norm) || PROTECTED_CORE_MODULES.has(slug);
};

export const ModulesPage: React.FC = () => {
  const { currentGuild } = useGuildStore();
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'security' | 'utility' | 'engagement' | 'system'>('all');
  const [editingModule, setEditingModule] = useState<ModuleData | null>(null);
  const [configText, setConfigText] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState<ModuleData | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { show: showToast } = useToast();
  const gridRef = useRef<HTMLDivElement>(null);

  const [modules, setModules] = useState<ModuleData[]>(INITIAL_TRUE_MODULES);

  // GSAP: Cascade all module cards in a staggered waterfall wave
  useEffect(() => {
    if (gridRef.current) {
      gsapWaterfallGrid(gridRef.current, ':scope > div');
    }
  }, [modules.length, categoryFilter, filterState, search]);

  // Fetch real modules from bot backend.
  // Prefers /api/modules/manifests (module-owned manifest.json data with rich metadata)
  // and falls back to /api/modules (live bot runtime list) for modules without manifests.
  const fetchModules = async () => {
    setIsLoading(true);
    try {
      // Try the new manifests endpoint first — returns merged manifest.json + runtime data
      const manifestRes = await fetch('/api/modules/manifests');
      if (manifestRes.ok) {
        const manifestData = await manifestRes.json();
        if (Array.isArray(manifestData) && manifestData.length > 0) {
          const mapped = manifestData.map((d: any) => {
            const actualName = d.id || d.name;
            const meta = getModuleMeta(actualName, d.icon, d.color);
            return {
              id: actualName,
              name: actualName,
              label: d.label || meta.label,
              version: d.version || 'v1.0.0',
              description: d.description || meta.description || '',
              author: d.author || 'FloofCore',
              category: (d.category as any) || meta.category || 'utility',
              enabled: d.enabled !== false,
              commands: d.commands || 0,
              icon: d.icon || meta.icon || '📦',
              color: d.color || meta.color,
            };
          });
          mapped.sort((a: any, b: any) => ((a.label || a.name || a.id)).localeCompare(b.label || b.name || b.id, undefined, { sensitivity: 'base' }));
          setModules(mapped);
          return; // Manifests endpoint succeeded — no need for the fallback
        }
      }

      // Fallback: /api/modules (live bot runtime list, less rich metadata)
      const res = await fetch('/api/modules');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setModules((prev) => {
            const mapped = data.map((d: any) => {
              const actualName = d.name || d.id;
              const meta = getModuleMeta(actualName, d.icon, d.color);
              const match = prev.find((p) => p.name === actualName || p.id === actualName);
              return {
                id: actualName,
                name: actualName,
                label: d.label || match?.label || meta.label,
                version: d.version || 'v1.0.0',
                description: d.description || match?.description || meta.description,
                author: d.author || 'FloofCore',
                category: (meta.category as any) || 'utility',
                enabled: d.enabled !== false,
                commands: d.commands || 0,
                icon: d.icon || meta.icon,
                color: d.color || meta.color,
              };
            });
            mapped.sort((a: any, b: any) => ((a.label || a.name || a.id)).localeCompare(b.label || b.name || b.id, undefined, { sensitivity: 'base' }));
            return mapped;
          });
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();

    const handleRealtimeToggle = (e: any) => {
      const { name, enabled } = e.detail || {};
      if (name) {
        setModules((prev) =>
          prev.map((m) =>
            m.name.toLowerCase() === name.toLowerCase() || m.id.toLowerCase() === name.toLowerCase()
              ? { ...m, enabled }
              : m
          )
        );
      }
    };

    window.addEventListener('floofcore:moduleToggle', handleRealtimeToggle);
    return () => {
      window.removeEventListener('floofcore:moduleToggle', handleRealtimeToggle);
    };
  }, []);

  const handleToggle = async (name: string, next: boolean) => {
    setModules((prev) => prev.map((m) => (m.name === name || m.id === name ? { ...m, enabled: next } : m)));

    try {
      const res = await fetch(`/api/modules/${encodeURIComponent(name)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });

      if (res.ok) {
        showToast({
          title: next ? 'Module Armed' : 'Module Disarmed',
          message: `"${name}" is now ${next ? 'ACTIVE' : 'INACTIVE'} on the Discord gateway.`,
          type: next ? 'success' : 'warning',
        });
      }
    } catch {
      setModules((prev) => prev.map((m) => (m.name === name || m.id === name ? { ...m, enabled: !next } : m)));
      showToast({
        title: 'Toggle Failed',
        message: 'Could not communicate with the module engine.',
        type: 'error',
      });
    }
  };

  // Open Configuration Modal
  const handleOpenConfig = async (mod: ModuleData) => {
    setEditingModule(mod);
    const modId = normalizeModuleId(mod.id || mod.name);
    try {
      const res = await fetch(`/api/modules/${encodeURIComponent(modId)}/rawconfig`);
      if (res.ok) {
        const json = await res.json();
        if (json?.content && json.content.trim().length > 0) {
          setConfigText(json.content);
          return;
        }
      }
    } catch {}

    // Baseline fallback schema
    setConfigText(
`# Configuration for ${mod.name}
enabled: ${mod.enabled}
cooldown: 5
permissions:
  - SendMessages
  - UseApplicationCommands
logging:
  enabled: true
  channel: null
`
    );
  };

  // Save Configuration Modal
  const handleSaveConfig = async () => {
    if (!editingModule) return;
    setIsSavingConfig(true);
    const modId = normalizeModuleId(editingModule.id || editingModule.name);

    try {
      await fetch(`/api/modules/${encodeURIComponent(modId)}/rawconfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: configText }),
      }).catch(() => {});

      showToast({
        title: 'Configuration Applied',
        message: `Updated module.yml for ${editingModule.name}.`,
        type: 'success',
      });
      setEditingModule(null);
    } catch {
      showToast({
        title: 'Save Error',
        message: 'Could not save module.yml configuration.',
        type: 'error',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Delete Module Handler
  const handleDeleteModule = async () => {
    if (!confirmDeleteModule) return;
    const mod = confirmDeleteModule;
    setIsDeletingModule(true);

    try {
      let res = await fetch(`/api/modules/${encodeURIComponent(mod.id || mod.name)}`, {
        method: 'DELETE',
      });

      if (res.status === 404) {
        res = await fetch('/api/marketplace/uninstall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId: mod.id || mod.name }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete module');
      }

      showToast({
        title: 'Module Deleted',
        message: `"${mod.label || mod.name}" has been uninstalled.`,
        type: 'success',
      });

      const deletedId = mod.id || mod.name;
      try {
        const stored = JSON.parse(localStorage.getItem('fc_newly_installed_modules') || '[]');
        const updated = stored.filter((id: string) => id !== deletedId);
        localStorage.setItem('fc_newly_installed_modules', JSON.stringify(updated));
      } catch {}
      window.dispatchEvent(new CustomEvent('floofcore:moduleUninstalled', { detail: { id: deletedId } }));

      setModules((prev) => prev.filter((m) => m.id !== mod.id && m.name !== mod.name));
      setConfirmDeleteModule(null);
      fetchModules();
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        message: err.message || 'Could not delete module.',
        type: 'error',
      });
    } finally {
      setIsDeletingModule(false);
    }
  };

  const handleToggleAll = async (targetEnabled: boolean) => {
    setModules((prev) => prev.map((m) => ({ ...m, enabled: targetEnabled })));
    for (const m of modules) {
      if (m.enabled !== targetEnabled) {
        const modId = normalizeModuleId(m.id || m.name);
        fetch(`/api/modules/${encodeURIComponent(modId)}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: targetEnabled }),
        }).catch(() => {});
      }
    }
    showToast({
      title: targetEnabled ? 'All Modules Enabled' : 'All Modules Disabled',
      message: `Updated ${modules.length} module states.`,
      type: targetEnabled ? 'success' : 'info',
    });
  };

  const activeCount = modules.filter((m) => m.enabled).length;

  const filtered = modules.filter((m) => {
    const meta = getModuleMeta(m.name, m.icon);
    if (filterState === 'enabled' && !m.enabled) return false;
    if (filterState === 'disabled' && m.enabled) return false;
    if (categoryFilter !== 'all' && meta.category !== categoryFilter) return false;

    const q = search.toLowerCase();
    return (
      (m.label && m.label.toLowerCase().includes(q)) ||
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      meta.label.toLowerCase().includes(q) ||
      meta.description.toLowerCase().includes(q)
    );
  }).sort((a, b) => ((a.label || a.name || a.id)).localeCompare(b.label || b.name || b.id, undefined, { sensitivity: 'base' }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none py-2 font-sans">
      
      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div 
        style={{
          borderRadius: 'var(--fc-card-radius, 28px)',
          backgroundColor: 'var(--fc-card-bg, rgba(14, 19, 32, 0.9))',
          backdropFilter: 'blur(var(--fc-card-blur, 16px))',
          borderColor: 'var(--fc-card-border, rgba(255, 255, 255, 0.1))',
        }}
        className="p-6 md:p-8 border shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
              MODULE REGISTRY
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {activeCount} of {modules.length} Active
            </span>
            {isLoading && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 animate-pulse">
                Syncing...
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Modules &amp; Extensions
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Directly configure, toggle, and manage loaded FloofCore gateway modules.
          </p>
        </div>

        {/* Search, Status Filters & Bulk Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-60">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10">
            {(['all', 'enabled', 'disabled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterState(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  filterState === st
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Tooltip content="Reload module states from gateway">
              <button
                type="button"
                onClick={fetchModules}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <IconRefresh size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills & Bulk Controls ───────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'security', label: '🛡️ Security' },
            { id: 'utility', label: '⚙️ Utility' },
            { id: 'engagement', label: '🎉 Engagement' },
            { id: 'system', label: '⚡ System' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-violet-600/30 border border-violet-500 text-white shadow-md shadow-violet-500/20'
                  : 'bg-[#0E1320]/60 border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Enable all modules at once">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
            >
              Enable All
            </button>
          </Tooltip>

          <Tooltip content="Disable all modules at once">
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer"
            >
              Disable All
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Modules Grid ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div 
          style={{
            borderRadius: 'var(--fc-card-radius, 24px)',
            backgroundColor: 'var(--fc-card-bg, rgba(14, 19, 32, 0.75))',
            backdropFilter: 'blur(var(--fc-card-blur, 16px))',
            borderColor: 'var(--fc-card-border, rgba(255, 255, 255, 0.1))',
          }}
          className="p-12 text-center border space-y-3"
        >
          <IconCpu size={32} className="mx-auto text-slate-500" />
          <h3 className="text-base font-bold text-white">No modules match your query</h3>
          <p className="text-xs text-slate-400">Try adjusting your search terms or category filters.</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const meta = getModuleMeta(m.name, m.icon);
            return (
              <div
                key={m.name}
                style={{
                  borderRadius: 'var(--fc-card-radius, 24px)',
                  backgroundColor: 'var(--fc-card-bg, rgba(14, 19, 32, 0.75))',
                  backdropFilter: 'blur(var(--fc-card-blur, 16px))',
                  borderColor: 'var(--fc-card-border, rgba(255, 255, 255, 0.1))',
                }}
                className={`module-card p-5 border transition-all duration-150 flex flex-col justify-between space-y-4 group relative hover:z-20 ${
                  m.enabled
                    ? 'hover:border-violet-500/50 shadow-lg'
                    : 'opacity-70 hover:opacity-100 hover:border-white/20'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-2xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        {/* Prominently display human-readable module label */}
                        <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                          {m.label || meta.label || formatCapitalModuleName(m.name)}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                          <span className="text-slate-500 font-mono">{m.id}</span>
                          <span>•</span>
                          <span className="text-slate-500 uppercase">{meta.category}</span>
                        </span>
                      </div>
                    </div>

                    <Tooltip content={m.enabled ? `Disable ${m.name}` : `Enable ${m.name}`}>
                      <Switch
                        checked={m.enabled}
                        onChange={(checked) => handleToggle(normalizeModuleId(m.id || m.name), checked)}
                      />
                    </Tooltip>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {meta.description}
                  </p>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    m.enabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/15 text-slate-400 border border-white/10'
                  }`}>
                    {m.enabled ? '● Active' : '○ Inactive'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Tooltip content={`Open dedicated visual suite for ${m.name}`}>
                      <Link
                        to={`/modules/${encodeURIComponent(normalizeModuleId(m.id || m.name))}`}
                        className="flex items-center gap-1 text-white bg-violet-600/30 hover:bg-violet-600 border border-violet-500/40 hover:border-violet-500 transition-all cursor-pointer py-1 px-2.5 rounded-xl text-[11px] font-sans font-bold shadow-sm"
                      >
                        <IconSettings size={13} />
                        <span>Manage</span>
                      </Link>
                    </Tooltip>

                    <Tooltip content={`Quick raw configuration for ${m.name}`}>
                      <button
                        type="button"
                        onClick={() => handleOpenConfig(m)}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/10 text-[11px] font-mono"
                      >
                        Raw
                      </button>
                    </Tooltip>

                    {!isProtectedModule(m.id || m.name) && (
                      <Tooltip content="Delete module" align="end">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteModule(m)}
                          className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer p-1.5 rounded-xl"
                          title="Delete module"
                        >
                          <IconTrash size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Configuration YAML / JSON Modal ──────────────────────────── */}
      {editingModule && (
        <Modal
          opened={!!editingModule}
          onClose={() => setEditingModule(null)}
          title={`Configure ${getModuleMeta(editingModule.name).icon} ${formatCapitalModuleName(editingModule.name)} (module.yml)`}
          size="xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Direct live configuration override for <code className="text-violet-300 font-mono">{`modules/${editingModule.name}/module.yml`}</code>. Changes sync automatically on save.
            </p>

            <RainbowYamlEditor
              value={configText}
              onChange={setConfigText}
              onSave={handleSaveConfig}
              fileName={`modules/${editingModule.name}/module.yml`}
              minHeight="420px"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-slate-500">
                Path: modules/{editingModule.name}/module.yml
              </span>

              <div className="flex items-center gap-2.5">
                <Button variant="ghost" size="sm" onClick={() => setEditingModule(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={isSavingConfig} onClick={handleSaveConfig}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Module Modal ─────────────────────────────── */}
      {confirmDeleteModule && (
        <Modal
          opened={!!confirmDeleteModule}
          onClose={() => !isDeletingModule && setConfirmDeleteModule(null)}
          title={
            <div className="flex items-center gap-2 text-rose-400">
              <IconAlertTriangle size={20} />
              <span>Delete Module</span>
            </div>
          }
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 space-y-2">
              <p className="font-semibold text-rose-300">
                Are you sure you want to delete <span className="font-bold text-white underline">{confirmDeleteModule.label || confirmDeleteModule.name}</span>?
              </p>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                This will unload the module from the gateway runtime, unregister all associated slash commands, and permanently remove the folder from your server.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl shrink-0">
                {getModuleMeta(confirmDeleteModule.name, confirmDeleteModule.icon).icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {confirmDeleteModule.label || confirmDeleteModule.name}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  ID: {confirmDeleteModule.id || confirmDeleteModule.name}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeletingModule}
                onClick={() => setConfirmDeleteModule(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isDeletingModule}
                onClick={handleDeleteModule}
                className="!bg-rose-600 hover:!bg-rose-500 !text-white"
              >
                Delete Module
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ModulesPage;
