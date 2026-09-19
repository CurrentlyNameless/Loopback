import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  IconSearch, 
  IconBell, 
  IconWifi, 
  IconMenu2, 
  IconBolt, 
  IconLayoutDashboard,
  IconTerminal2,
  IconPlug,
  IconShieldLock,
  IconBroadcast,
  IconTicket,
  IconScale,
  IconDatabase,
  IconSettings,
  IconHash,
  IconSparkles,
  IconArrowUpRight
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/ui.ts';
import { useAuthStore } from '../../stores/auth.ts';
import { useGuildStore } from '../../stores/guild.ts';
import { useRealtimeStore } from '../../stores/realtime.ts';
import { useNotificationStore } from '../../stores/notifications.ts';
import { UserAvatar } from '../discord/UserAvatar.tsx';
import { useToast } from '../Toast.tsx';
import { Tooltip } from '../ui/Tooltip.tsx';
import { NotificationModal } from '../NotificationModal.tsx';

const PAGE_TOPICS: Record<string, { label: string; subtitle: string; icon: any }> = {
  '/': { label: 'Overview', subtitle: 'Live cluster metrics, active modules & growth analytics', icon: IconLayoutDashboard },
  '/games': { label: 'Games & Hosts', subtitle: 'Game server monitoring, nodes & live host status', icon: IconBolt },
  '/commands': { label: 'Slash Commands', subtitle: 'Application slash command registry & guild sync', icon: IconTerminal2 },
  '/modules': { label: 'Module Matrix', subtitle: 'Modular plugin extensions & runtime hot-reloading', icon: IconPlug },
  '/roles': { label: 'Roles & Permissions', subtitle: 'Role hierarchy, administrative rights & bot access', icon: IconShieldLock },
  '/channels': { label: 'Channel Map', subtitle: 'Channel topology & automated logging destinations', icon: IconHash },
  '/appeals': { label: 'Member Appeals', subtitle: 'Review and manage moderation disciplinary appeals', icon: IconScale },
  '/tickets': { label: 'Support Desks', subtitle: 'Live customer support desks & archived HTML transcripts', icon: IconTicket },
  '/streamers': { label: 'Streamer Alerts', subtitle: 'Multi-platform live stream notifications & embeds', icon: IconBroadcast },
  '/webhooks': { label: 'Webhooks Relay', subtitle: 'Outbound webhook relays & formatted embed dispatches', icon: IconHash },
  '/backups': { label: 'Backup Vault', subtitle: 'Server state preservation snapshots & restoration', icon: IconDatabase },
  '/updates': { label: 'Bot Updates', subtitle: 'Firmware patching, release changelogs & rollback engine', icon: IconBolt },
  '/settings': { label: 'Cluster Settings', subtitle: 'Bot presence, developer tokens & gateway controls', icon: IconSettings },
};

export const Topbar: React.FC = () => {
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { user } = useAuthStore();
  const { currentGuild } = useGuildStore();
  const { ping, connected, memoryMb, uptime } = useRealtimeStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, clearAll } = useNotificationStore();
  const { show: showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    fetchNotifications(currentGuild?.id);
    const interval = setInterval(() => {
      fetchNotifications(currentGuild?.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [currentGuild?.id, fetchNotifications]);

  const currentPage = PAGE_TOPICS[location.pathname] || {
    label: location.pathname.replace('/', '') || 'Control Plane',
    subtitle: 'Modular Discord Bot Administrative Panel',
    icon: IconSparkles,
  };
  const PageIcon = currentPage.icon;

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setNotifOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <header className="h-16 px-4 md:px-6 bg-[#080B13]/90 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between sticky top-0 z-30 select-none">
      
      {/* ── Left: Page Breadcrumbs & Purpose ─────────────────────────── */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer shrink-0"
        >
          <IconMenu2 size={18} />
        </button>

        {/* Page Icon & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 shadow-sm">
            <PageIcon size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold text-white tracking-tight font-heading truncate">
                {currentPage.label}
              </h1>
              <span className="hidden sm:inline px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white/[0.04] border border-white/10 text-slate-400">
                {currentGuild?.name || 'Pro Cluster'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden md:inline">
              {currentPage.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Header Actions & Live Telemetry ───────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Quick Search Trigger */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-sm"
        >
          <IconSearch size={14} />
          <span className="hidden sm:inline">Quick Action...</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Live Gateway Latency Meter & Pulse */}
        <Tooltip content={`Gateway: ${connected ? 'Active Stream' : 'Connecting'} • Uptime: ${formatUptime(uptime)} • RAM: ${memoryMb}MB`}>
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-sm transition-colors ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              connected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
            }`} />
            <span>{ping > 0 ? `${ping}ms` : '<1ms'}</span>
          </div>
        </Tooltip>

        {/* Notifications Modal Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              unreadCount > 0
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 hover:bg-violet-600 hover:text-white'
                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-slate-400 hover:text-white'
            }`}
            title="System Alerts & Notifications"
          >
            <IconBell size={18} />
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* ── System Notification Popout Modal ──────────────────────────── */}
        <NotificationModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

        {/* User Avatar Pill */}
        <div className="pl-1">
          <UserAvatar id={user?.id} avatar={user?.avatar} username={user?.username} size="sm" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
