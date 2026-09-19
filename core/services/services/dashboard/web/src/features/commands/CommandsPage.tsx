import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { 
  IconSearch, 
  IconTerminal2, 
  IconCopy, 
  IconCheck, 
  IconReload, 
  IconShieldLock, 
  IconBolt, 
  IconCpu,
  IconHash,
  IconAdjustments
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { Switch } from '../../components/ui/Switch.tsx';
import { Button } from '../../components/ui/Button.tsx';

interface CommandItem {
  name: string;
  description: string;
  module: string;
  type: 'slash' | 'prefix';
  permission: 'ADMIN' | 'MODERATOR' | 'EVERYONE';
  enabled: boolean;
  cooldown?: number;
  args?: string[];
}

export const CommandsPage: React.FC = () => {
  const pageRef = usePageEntrance();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'slash' | 'prefix'>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { show: showToast } = useToast();

  const [commands, setCommands] = useState<CommandItem[]>([
    { name: 'help', description: 'Displays interactive command directory and bot guide.', module: 'Core', type: 'slash', permission: 'EVERYONE', enabled: true, cooldown: 3 },
    { name: 'stats', description: 'Renders cluster telemetry, shard ping, and V8 heap stats.', module: 'Core', type: 'slash', permission: 'EVERYONE', enabled: true, cooldown: 5 },
    { name: 'ping', description: 'Calculates round-trip gateway WebSocket heartbeat latency.', module: 'Core', type: 'slash', permission: 'EVERYONE', enabled: true },
    { name: 'ban', description: 'Permanently bans a user and purges recent messages.', module: 'Moderation', type: 'slash', permission: 'ADMIN', enabled: true, args: ['@user', 'reason', 'purge_days'] },
    { name: 'kick', description: 'Ejects a member from the server with audit reason.', module: 'Moderation', type: 'slash', permission: 'MODERATOR', enabled: true, args: ['@user', 'reason'] },
    { name: 'mute', description: 'Applies Discord communication timeout to a member.', module: 'Moderation', type: 'slash', permission: 'MODERATOR', enabled: true, args: ['@user', 'duration', 'reason'] },
    { name: 'warn', description: 'Issues an official warning and records to moderation audit log.', module: 'Moderation', type: 'slash', permission: 'MODERATOR', enabled: true, args: ['@user', 'reason'] },
    { name: 'ticket', description: 'Creates a private support channel with role assignments.', module: 'Tickets', type: 'slash', permission: 'EVERYONE', enabled: true, args: ['subject'] },
    { name: 'ticket-close', description: 'Closes a support ticket and archives HTML transcript.', module: 'Tickets', type: 'slash', permission: 'EVERYONE', enabled: true, args: ['reason'] },
    { name: 'rank', description: 'Displays your current leveling rank card and XP progression.', module: 'Leveling', type: 'slash', permission: 'EVERYONE', enabled: true },
    { name: 'leaderboard', description: 'Renders top XP and level rankings across the server.', module: 'Leveling', type: 'slash', permission: 'EVERYONE', enabled: true },
    { name: 'balance', description: 'Checks wallet and virtual bank balance.', module: 'Economy', type: 'slash', permission: 'EVERYONE', enabled: true },
    { name: 'daily', description: 'Claims your daily currency stipend reward.', module: 'Economy', type: 'slash', permission: 'EVERYONE', enabled: true, cooldown: 86400 },
    { name: 'backup-create', description: 'Captures full server layout snapshot into vault.', module: 'Backups', type: 'slash', permission: 'ADMIN', enabled: true },
    { name: 'webhook-send', description: 'Dispatches custom embed payload to selected channel.', module: 'Webhooks', type: 'slash', permission: 'ADMIN', enabled: true, args: ['channel', 'title', 'description'] },
  ]);

  const handleToggle = (name: string, next: boolean) => {
    setCommands((prev) =>
      prev.map((c) => (c.name === name ? { ...c, enabled: next } : c))
    );
    showToast({
      title: next ? 'Command Enabled' : 'Command Disabled',
      message: `/${name} is now ${next ? 'REGISTERED' : 'DISABLED'}.`,
      type: next ? 'success' : 'warning',
    });
  };

  const handleCopy = (name: string, type: 'slash' | 'prefix') => {
    const text = type === 'slash' ? `/${name}` : `!${name}`;
    navigator.clipboard.writeText(text);
    setCopiedCmd(name);
    showToast({
      title: 'Copied to Clipboard',
      message: `${text} copied.`,
      type: 'info',
    });
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSyncCommands = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/commands/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast({
          title: 'Commands Synchronized',
          message: data.message || 'Slash commands synced with Discord REST.',
          type: 'success',
        });
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      showToast({
        title: 'Sync Failed',
        message: err?.message || 'Could not sync slash commands.',
        type: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Group commands by module
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const cmd of commands) {
      if (typeFilter !== 'all' && cmd.type !== typeFilter) continue;
      const q = search.toLowerCase();
      if (
        q &&
        !cmd.name.toLowerCase().includes(q) &&
        !cmd.description.toLowerCase().includes(q) &&
        !cmd.module.toLowerCase().includes(q)
      ) {
        continue;
      }
      if (!map.has(cmd.module)) map.set(cmd.module, []);
      map.get(cmd.module)!.push(cmd);
    }
    return Array.from(map.entries()).map(([moduleName, items]) => ({
      moduleName,
      items,
    }));
  }, [commands, typeFilter, search]);

  const totalRegistered = commands.filter((c) => c.enabled).length;

  return (
    <div ref={pageRef} className="space-y-6 max-w-7xl mx-auto select-none py-2 font-sans">
      
      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-[28px] bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              DISCORD REST REGISTRY
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {totalRegistered} Commands Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Application Commands
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Manage slash command permissions, arguments, cooldowns, and gateway synchronization.
          </p>
        </div>

        {/* Sync Action & Search */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            loading={syncing}
            leftIcon={<IconReload size={14} />}
            onClick={handleSyncCommands}
          >
            Sync with Discord
          </Button>
        </div>
      </div>

      {/* ── Type Filter Pills ───────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {(['all', 'slash', 'prefix'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              typeFilter === t
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-[#0E1320]/60 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {t === 'all' ? 'All Commands' : `${t.toUpperCase()} Commands`}
          </button>
        ))}
      </div>

      {/* ── Grouped Command Lists ───────────────────────────────────── */}
      <div className="space-y-6">
        {grouped.map(({ moduleName, items }) => (
          <div key={moduleName} className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-slate-400 uppercase tracking-wider">
                  {moduleName} MODULE
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 text-slate-400">
                  {items.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {items.map((c) => (
                <motion.div
                  key={c.name}
                  layout
                  className={`p-4 rounded-2xl bg-[#0E1320]/75 border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                    c.enabled
                      ? 'border-white/10 hover:border-violet-500/40'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleCopy(c.name, c.type)}
                        className="flex items-center gap-1.5 text-sm font-mono font-black text-violet-400 hover:text-violet-300 transition-colors cursor-pointer group"
                      >
                        <span>{c.type === 'slash' ? `/${c.name}` : `!${c.name}`}</span>
                        {copiedCmd === c.name ? (
                          <IconCheck size={14} className="text-emerald-400" />
                        ) : (
                          <IconCopy size={13} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                        )}
                      </button>

                      <Switch
                        checked={c.enabled}
                        onChange={(checked) => handleToggle(c.name, checked)}
                      />
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {c.description}
                    </p>

                    {/* Arguments List */}
                    {c.args && c.args.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {c.args.map((a, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] font-mono text-slate-400"
                          >
                            &lt;{a}&gt;
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Pills */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-[10px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        c.permission === 'ADMIN'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : c.permission === 'MODERATOR'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {c.permission}
                    </span>

                    {c.cooldown ? (
                      <span className="text-slate-500">{c.cooldown}s Cooldown</span>
                    ) : (
                      <span className="text-slate-500">No Cooldown</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommandsPage;
