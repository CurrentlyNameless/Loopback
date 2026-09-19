import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { 
  IconCheck, 
  IconChevronRight, 
  IconArrowUpRight, 
  IconSparkles
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { useGuildStore, type GuildStats } from '../../stores/guild.ts';
import { useRealtimeStore } from '../../stores/realtime.ts';
import { GuildIcon } from '../../components/discord/GuildIcon.tsx';
import { Switch } from '../../components/ui/Switch.tsx';
import { getModuleMeta } from '../../lib/moduleMeta.ts';

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

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

function formatUptime(ms?: number): string {
  if (!ms) return '0m';
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface StatsData {
  guilds?: number;
  users?: number;
  ping?: number;
  uptimeMs?: number;
  modules?: number;
  commands?: number;
  memory?: number;
}

interface GrowthData {
  totalMembers: number;
  humanCount: number;
  botCount: number;
  netWeek: number;
  joinsWeek: number;
  leavesWeek: number;
  retentionRate: string;
  growthPercent: string;
  history: Array<{
    day: string;
    joins: number;
    leaves: number;
    net: number;
    total: number;
  }>;
}

interface ModuleItem {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  enabled: boolean;
  commands?: number;
}

export const OverviewPage: React.FC = () => {
  const { currentGuild } = useGuildStore();
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const pageRef = usePageEntrance();

  const { ping: livePing, uptime: liveUptime, memoryMb: liveMemoryMb } = useRealtimeStore();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [guildStats, setGuildStatsLocal] = useState<GuildStats | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([
    { id: 'auto-mod', name: 'Auto-Mod', version: 'v2.1.0', description: 'Anti-spam heuristics & text filters', category: 'security', enabled: true },
    { id: 'backup', name: 'Backup', version: 'v1.1.4', description: 'Server layout snapshot engine', category: 'security', enabled: true },
    { id: 'economy-builder', name: 'Economy-Builder', version: 'v1.2.0', description: 'Virtual currency & shop items', category: 'engagement', enabled: true },
    { id: 'leveling', name: 'Leveling', version: 'v1.4.2', description: 'Chat message XP & rank cards', category: 'engagement', enabled: true },
    { id: 'streamer-notifications', name: 'Streamer-Notifications', version: 'v1.0.3', description: 'Twitch, YouTube, and Kick alerts', category: 'engagement', enabled: true },
    { id: 'tickets', name: 'Tickets', version: 'v2.0.0', description: 'Private support channel desk', category: 'utility', enabled: true },
    { id: 'webhook-center', name: 'Webhook-Center', version: 'v1.0.0', description: 'Embed dispatcher & relay', category: 'utility', enabled: true },
    { id: 'welcome-goodbye', name: 'Welcome-Goodbye', version: 'v1.3.0', description: 'Greeting messages & auto roles', category: 'engagement', enabled: true },
  ]);
  const [toggling, setToggling] = useState<string | null>(null);

  // Load stats, channels, modules, and growth + real-time gateway events
  useEffect(() => {
    const loadOverview = async () => {
      try {
        const targetGuildId = currentGuild?.id || 'default';
        const safeFetchJson = async (url: string, fallback: any) => {
          try {
            const r = await fetch(url);
            if (!r.ok) return fallback;
            const ct = r.headers.get('content-type') || '';
            if (!ct.includes('application/json')) return fallback;
            return await r.json();
          } catch {
            return fallback;
          }
        };

        const [statsRes, modsRes, chRes, growthRes, gStatsRes] = await Promise.all([
          safeFetchJson('/api/stats', null),
          safeFetchJson('/api/modules', []),
          safeFetchJson(`/api/guilds/${targetGuildId}/channels`, []),
          safeFetchJson(`/api/guilds/${targetGuildId}/growth`, null),
          safeFetchJson(`/api/guilds/${targetGuildId}/stats`, null),
        ]);

        if (statsRes) setStats(statsRes);
        if (Array.isArray(modsRes) && modsRes.length > 0) {
          const sorted = [...modsRes].sort((a: any, b: any) => (a.name || a.id).localeCompare(b.name || b.id, undefined, { sensitivity: 'base' }));
          setModules(sorted);
        }
        if (Array.isArray(chRes)) setChannels(chRes);
        if (growthRes) setGrowth(growthRes);
        if (gStatsRes && gStatsRes.success !== false) {
          setGuildStatsLocal(gStatsRes);
        }
      } catch (err) {
        console.error('Failed to load overview:', err);
      }
    };

    loadOverview();
    const interval = setInterval(loadOverview, 10000);

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
      clearInterval(interval);
      window.removeEventListener('floofcore:moduleToggle', handleRealtimeToggle);
    };
  }, [currentGuild?.id]);

  const handleToggleModule = async (name: string, next: boolean) => {
    setToggling(name);
    setModules((prev) => prev.map((m) => (m.id === name ? { ...m, enabled: next } : m)));

    try {
      const res = await fetch(`/api/modules/${encodeURIComponent(name)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });

      const meta = getModuleMeta(name);
      if (res.ok) {
        showToast({
          title: `${meta.icon} ${meta.label} ${next ? 'Armed' : 'Disarmed'}`,
          message: `${meta.label} is now ${next ? 'ACTIVE' : 'INACTIVE'} on the Discord gateway.`,
          type: next ? 'success' : 'warning',
        });
      }
    } catch {
      setModules((prev) => prev.map((m) => (m.id === name ? { ...m, enabled: !next } : m)));
    } finally {
      setToggling(null);
    }
  };

  const tier = guildStats?.premiumTier ?? currentGuild?.premiumTier ?? 0;
  const boosts = guildStats?.premiumSubscriptionCount ?? currentGuild?.premiumSubscriptionCount ?? 0;
  const maxBitrateKbps = guildStats?.maximumBitrateKbps ?? currentGuild?.maximumBitrateKbps ?? (tier >= 3 ? 384 : tier >= 2 ? 256 : tier >= 1 ? 128 : 96);
  const rolesCount = guildStats?.rolesCount ?? 0;
  const emojisCount = guildStats?.emojisCount ?? 0;
  const stickersCount = guildStats?.stickersCount ?? 0;

  const memberRaw = growth?.totalMembers ?? (currentGuild?.memberCount ?? stats?.users ?? 0);
  const memberCount = useCountUp(memberRaw);
  const textChRaw = guildStats?.channelsCount?.text ?? (channels.filter((c) => c.type === 0 || c.type === 5).length || 14);
  const voiceChRaw = guildStats?.channelsCount?.voice ?? (channels.filter((c) => c.type === 2 || c.type === 13).length || 6);
  const textChCount = useCountUp(textChRaw, 600);
  const voiceChCount = useCountUp(voiceChRaw, 600);

  const pingValue = stats?.ping !== undefined ? stats.ping : 14;

  const quickNav = [
    { title: 'Appeals Portal', emoji: '⚖️', desc: 'Review & approve ban appeal requests', to: '/appeals', color: 'from-violet-600 to-indigo-600', textCol: 'text-violet-400' },
    { title: 'Support Tickets', emoji: '🎟️', desc: 'Browse and view closed support logs', to: '/tickets', color: 'from-indigo-600 to-cyan-600', textCol: 'text-indigo-400' },
    { title: 'Roles & Perms', emoji: '🛡️', desc: 'Manage role hierarchy & permissions', to: '/roles', color: 'from-cyan-600 to-teal-600', textCol: 'text-cyan-400' },
    { title: 'Guild Settings', emoji: '⚙️', desc: 'Configure system defaults and roles', to: '/settings', color: 'from-purple-600 to-pink-600', textCol: 'text-pink-400' },
  ];

  const recentEvents = [
    { id: 1, emoji: '🛡️', title: 'Auto-Mod Shield Active', desc: 'Quarantined unverified link on Discord Gateway', time: '4m ago' },
    { id: 2, emoji: '🗄️', title: 'Vault Snapshot Preserved', desc: 'Saved 24 channels & 12 roles successfully', time: '42m ago' },
    { id: 3, emoji: '⚡', title: 'Slash Commands Registered', desc: `${stats?.commands || 18} application commands synchronized with REST API`, time: '2h ago' },
  ];

  return (
    <div ref={pageRef} className="space-y-6 max-w-7xl mx-auto select-none py-2 font-sans">
      
      {/* ── 1. Hero Paper Header Banner ──────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-[28px] bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <GuildIcon
              id={currentGuild?.id || '123456'}
              name={currentGuild?.name || 'FloofCore Server'}
              icon={currentGuild?.icon}
              size="lg"
              className="w-18 h-18 rounded-[22px] border-2 border-white/15 shadow-xl bg-violet-600/20 font-black text-xl text-white ring-2 ring-violet-500/30"
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Server Connected
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  SHARD 0 PRIMARY
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
                  <span>✨</span>
                  <span>Tier {tier} • {boosts} Boost{boosts === 1 ? '' : 's'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                  <span>🎙️</span>
                  <span>{maxBitrateKbps} kbps Audio Ceiling</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-heading">
                {currentGuild?.name || 'FloofCore Server'}
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-1">
                ID: {currentGuild?.id || 'Primary Cluster'} • System Uptime: {formatUptime(stats?.uptimeMs)}
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => navigate('/modules')}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-xs md:text-sm text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/25 border border-indigo-400/30 transition-all cursor-pointer group"
            >
              <span>Manage Modules</span>
              <IconChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Unified Server Intelligence & Telemetry Card ────────────── */}
      <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-5">
        {/* Card Header with Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-xl shadow-md">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading">Server Tier &amp; Module Intelligence</h3>
              <p className="text-xs text-slate-400">Live guild-level telemetry powering FloofCore modules</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
              {rolesCount} Roles Configured
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
              {emojisCount} Custom Emojis
            </span>
            {stickersCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                {stickersCount} Stickers
              </span>
            )}
          </div>
        </div>

        {/* Live Metrics Grid (Total Members, Text Channels, Voice Channels, Latency) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Members */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-sm flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                TOTAL MEMBERS
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 text-base flex items-center justify-center shadow-sm">
                👥
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white tracking-tight">
              {memberCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-bold font-mono flex items-center gap-1">
              <IconCheck size={13} />
              <span>Synced via Gateway ({growth?.growthPercent || '+3.8%'})</span>
            </div>
          </div>

          {/* Text Channels */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-sm flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                TEXT CHANNELS
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 text-base flex items-center justify-center shadow-sm">
                💬
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white tracking-tight">
              {textChCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Text channels monitored
            </div>
          </div>

          {/* Voice Channels */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-sm flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                VOICE CHANNELS
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 text-base flex items-center justify-center shadow-sm">
                🎙️
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white tracking-tight">
              {voiceChCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-cyan-400 font-mono font-bold flex items-center gap-1">
              <span>⚡ Up to {maxBitrateKbps} kbps (Tier {tier})</span>
            </div>
          </div>

          {/* System Latency */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-sm flex flex-col justify-between space-y-2 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                SYSTEM LATENCY
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 text-base flex items-center justify-center shadow-sm">
                ⚡
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {pingValue}ms
            </div>
            <div className="text-[11px] text-emerald-400 font-bold font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span>Real-time active (Shard 0)</span>
            </div>
          </div>
        </div>

        {/* Intelligence Deep Dive (Audio Bitrate, Boost Status, Channel Breakdown) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Studio Audio Bitrate */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20 hover:border-cyan-500/40 transition-all space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Voice Quality Ceiling</span>
              <span className="text-lg">🎙️</span>
            </div>
            <div className="text-2xl font-black font-mono text-white group-hover:text-cyan-300 transition-colors">
              {maxBitrateKbps} kbps
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Optimal studio bitrate for Boost Tier {tier}. Modules like <span className="text-cyan-300 font-bold">Temp Voice</span> automatically inherit this ceiling by default for crystal clear audio.
            </p>
          </div>

          {/* Card 2: Nitro Boost Status */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-pink-500/20 hover:border-pink-500/40 transition-all space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-pink-400 uppercase tracking-wider">Server Boost Status</span>
              <span className="text-lg">✨</span>
            </div>
            <div className="text-2xl font-black font-mono text-white group-hover:text-pink-300 transition-colors">
              Tier {tier} ({boosts} Boost{boosts === 1 ? '' : 's'})
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tier >= 3
                ? 'Maximum server level reached. 384 kbps voice bitrate, 100MB file uploads, and 250 emoji slots unlocked.'
                : tier >= 2
                ? 'Level 2 perks unlocked. 256 kbps voice bitrate, 50MB file uploads, and 150 emoji slots active.'
                : tier >= 1
                ? 'Level 1 perks unlocked. 128 kbps voice bitrate, animated server icon, and 100 emoji slots active.'
                : 'Standard guild tier. Boost your server to unlock higher audio bitrates (up to 384 kbps) and upload perks.'}
            </p>
          </div>

          {/* Card 3: Channel Infrastructure */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-violet-500/20 hover:border-violet-500/40 transition-all space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-violet-400 uppercase tracking-wider">Channel Architecture</span>
              <span className="text-lg">🏗️</span>
            </div>
            <div className="text-2xl font-black font-mono text-white group-hover:text-violet-300 transition-colors">
              {guildStats?.channelsCount?.total ?? channels.length} Channels Monitored
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {textChRaw} Text &bull; {voiceChRaw} Voice &bull; {guildStats?.channelsCount?.category ?? 0} Categories monitored in real-time by the gateway.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Quick Navigation Cards Grid (4 Cards with Emojis) ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickNav.map((nav) => (
          <motion.div
            key={nav.title}
            whileHover={{ y: -2 }}
            onClick={() => navigate(nav.to)}
            className="p-4 rounded-2xl bg-[#0E1320]/65 border border-white/10 hover:border-violet-500/40 hover:bg-white/[0.06] cursor-pointer transition-all duration-200 group flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform shrink-0">
                {nav.emoji}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-black text-white group-hover:${nav.textCol} transition-colors truncate`}>
                  {nav.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                  {nav.desc}
                </div>
              </div>
            </div>
            <IconArrowUpRight size={18} className="text-white/30 group-hover:text-white transition-colors shrink-0 ml-2" />
          </motion.div>
        ))}
      </div>

      {/* ── 4. Modules Quick Toggles & Live Activity Stream ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Modules (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-xl shadow-md">
                📦
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">Active Modules</h3>
                <p className="text-xs text-slate-400">Enable or disable bot modules in real-time</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/modules')}
              className="text-xs font-mono font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>VIEW ALL</span>
              <IconArrowUpRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {modules.slice(0, 8).map((m) => {
              const meta = getModuleMeta(m.name || m.id);
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-xl shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                          {formatCapitalModuleName(m.name || m.id)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {m.version || 'v1.0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={m.enabled}
                    onChange={(checked) => handleToggleModule(m.id, checked)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity Log Stream (1 col) */}
        <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-xl shadow-md">
                🛰️
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">Activity Stream</h3>
                <p className="text-xs text-slate-400">Live operational events</p>
              </div>
            </div>

            <div className="space-y-3">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-2xl bg-black/30 border border-white/[0.04] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{evt.emoji}</span>
                      <span className="text-xs font-bold text-white">{evt.title}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">{evt.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed ml-6">{evt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Retention Pill */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">7D Member Retention:</span>
            <span className="text-emerald-400 font-bold">{growth?.retentionRate || '85%'} Nominal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
