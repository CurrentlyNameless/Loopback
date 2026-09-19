import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconLayoutDashboard, 
  IconPlug, 
  IconTerminal2, 
  IconShieldLock, 
  IconWebhook, 
  IconFileText,
  IconTicket, 
  IconScale, 
  IconBroadcast, 
  IconSettings,
  IconDatabase,
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconBell,
  IconLogout,
  IconPlus,
  IconCheck,
  IconMenu2,
  IconX,
  IconExternalLink,
  IconServer,
  IconRefresh,
  IconGift,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconBuildingCommunity,
  IconShoppingBag,
  IconDeviceGamepad2,
  IconCake,
  IconSparkles,
  IconCode,
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/ui.ts';
import { useGuildStore } from '../../stores/guild.ts';
import { useAuthStore } from '../../stores/auth.ts';
import { GuildIcon } from '../discord/GuildIcon.tsx';
import { UserAvatar } from '../discord/UserAvatar.tsx';
import { useToast } from '../Toast.tsx';
import { Tooltip } from '../ui/Tooltip.tsx';
import { useNotificationStore } from '../../stores/notifications.ts';
import { NotificationModal } from '../NotificationModal.tsx';
import { getModuleMeta } from '../../lib/moduleMeta.ts';

interface InstalledModuleItem {
  id: string;
  label: string;
  icon: string;
  color?: string;
  category?: string;
  isNew?: boolean;
}

export const Sidebar: React.FC = () => {
  const { currentGuild, guilds, setCurrentGuild } = useGuildStore();
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { show: showToast } = useToast();

  const [guildMenuOpen, setGuildMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [guildSearch, setGuildSearch] = useState('');
  const { unreadCount } = useNotificationStore();

  // Dynamic Installed Modules & Apps state
  const [installedModules, setInstalledModules] = useState<InstalledModuleItem[]>([]);
  const [appsExpanded, setAppsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('fc_sidebar_apps_expanded') !== 'false';
  });

  const toggleAppsExpanded = () => {
    setAppsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('fc_sidebar_apps_expanded', String(next));
      return next;
    });
  };

  const markModuleAsSeen = (id: string) => {
    try {
      const seenRaw = localStorage.getItem('fc_seen_modules');
      const seenSet = seenRaw ? new Set<string>(JSON.parse(seenRaw)) : new Set<string>();
      seenSet.add(id);
      localStorage.setItem('fc_seen_modules', JSON.stringify(Array.from(seenSet)));

      const newRaw = localStorage.getItem('fc_newly_installed_modules');
      if (newRaw) {
        const list: string[] = JSON.parse(newRaw);
        const updated = list.filter((item) => item !== id);
        localStorage.setItem('fc_newly_installed_modules', JSON.stringify(updated));
      }

      setInstalledModules((prev) =>
        prev.map((mod) => (mod.id === id ? { ...mod, isNew: false } : mod))
      );
    } catch {}
  };

  const fetchInstalledModules = async () => {
    try {
      let rawModules: any[] = [];
      const manifestRes = await fetch('/api/modules/manifests');
      if (manifestRes.ok) {
        rawModules = await manifestRes.json();
      }
      if (!Array.isArray(rawModules) || rawModules.length === 0) {
        const fallbackRes = await fetch('/api/modules');
        if (fallbackRes.ok) {
          rawModules = await fallbackRes.json();
        }
      }
      if (!Array.isArray(rawModules)) return;

      const filtered = rawModules.filter((m: any) => {
        const id = (m.id || m.name || '').toLowerCase().trim();
        return id !== 'test-showcase';
      });

      const seenRaw = localStorage.getItem('fc_seen_modules');
      let seenSet = seenRaw ? new Set<string>(JSON.parse(seenRaw)) : null;

      let newlyInstalledSet = new Set<string>();
      try {
        const newRaw = localStorage.getItem('fc_newly_installed_modules');
        if (newRaw) newlyInstalledSet = new Set<string>(JSON.parse(newRaw));
      } catch {}

      if (!seenSet) {
        seenSet = new Set(filtered.map((m: any) => m.id || m.name));
        newlyInstalledSet.forEach((id) => seenSet?.delete(id));
        localStorage.setItem('fc_seen_modules', JSON.stringify(Array.from(seenSet)));
      }

      const mapped: InstalledModuleItem[] = filtered.map((m: any) => {
        const id = m.id || m.name;
        const meta = getModuleMeta(id, m.icon, m.color);
        const isNew = newlyInstalledSet.has(id) || !seenSet?.has(id);
        return {
          id,
          label: m.label || meta.label || id,
          icon: m.icon || meta.icon || '📦',
          color: m.color || meta.color,
          category: m.category || meta.category,
          isNew,
        };
      });

      // Strict alphabetical sorting (A to Z) by label
      mapped.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      );

      setInstalledModules(mapped);
    } catch (e) {
      console.warn('Failed to fetch installed modules for sidebar:', e);
    }
  };

  useEffect(() => {
    const match = location.pathname.match(/^\/modules\/([^\/]+)/);
    if (match && match[1]) {
      markModuleAsSeen(match[1]);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchInstalledModules();

    const onModuleChange = (e?: any) => {
      if (e?.detail?.id) {
        try {
          const newRaw = localStorage.getItem('fc_newly_installed_modules');
          const list: string[] = newRaw ? JSON.parse(newRaw) : [];
          if (!list.includes(e.detail.id)) {
            list.push(e.detail.id);
            localStorage.setItem('fc_newly_installed_modules', JSON.stringify(list));
          }
        } catch {}
      }
      fetchInstalledModules();
    };

    window.addEventListener('floofcore:moduleInstalled', onModuleChange);
    window.addEventListener('floofcore:moduleUninstalled', onModuleChange);
    window.addEventListener('floofcore:moduleToggle', onModuleChange);

    return () => {
      window.removeEventListener('floofcore:moduleInstalled', onModuleChange);
      window.removeEventListener('floofcore:moduleUninstalled', onModuleChange);
      window.removeEventListener('floofcore:moduleToggle', onModuleChange);
    };
  }, []);

  const newAppsCount = installedModules.filter((m) => m.isNew).length;

  // Collapsible State (persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('dashboard_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('dashboard_sidebar_collapsed', String(next));
    window.dispatchEvent(new Event('dashboard-backdrop-updated'));
  };

  // Keyboard shortcut listener for Cmd+[ / Ctrl+[ or Cmd+\
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === '[' || e.key === '\\')) {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  // Dynamic Theme State from Builder
  const [sidebarConfig, setSidebarConfig] = useState({
    width: 288,
    opacity: 85,
    blur: 16,
    gradient: 'from-violet-600 to-indigo-600',
  });

  useEffect(() => {
    const syncSidebarTheme = () => {
      const saved = localStorage.getItem('dashboard_builder_theme');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSidebarConfig({
            width: parsed.sidebarWidth || 288,
            opacity: parsed.sidebarOpacity !== undefined ? parsed.sidebarOpacity : 85,
            blur: parsed.sidebarBlur !== undefined ? parsed.sidebarBlur : 16,
            gradient: parsed.sidebarGradient || 'from-violet-600 to-indigo-600',
          });
        } catch {}
      }
    };

    syncSidebarTheme();
    window.addEventListener('storage', syncSidebarTheme);
    window.addEventListener('dashboard-backdrop-updated', syncSidebarTheme);
    return () => {
      window.removeEventListener('storage', syncSidebarTheme);
      window.removeEventListener('dashboard-backdrop-updated', syncSidebarTheme);
    };
  }, []);

  const navCategories = [
    {
      title: 'CORE PLATFORM',
      items: [
        { path: '/', label: 'Overview', icon: IconLayoutDashboard, exact: true },
        { path: '/modules', label: 'Modules', icon: IconPlug },
        { path: '/marketplace', label: 'Marketplace', icon: IconShoppingBag, badge: 'Store' },
        { path: '/variables', label: 'Variable Builder', icon: IconCode, badge: 'Studio' },
        { path: '/commands', label: 'Slash Commands', icon: IconTerminal2 },
      ],
    },
    {
      title: 'COMMUNITY & HUB',
      items: [
        { path: '/hub', label: 'Community Hub', icon: IconBuildingCommunity, badge: 'Portal' },
      ],
    },
    {
      title: 'SYSTEM & LIFECYCLE',
      items: [
        { path: '/settings', label: 'Server Settings', icon: IconSettings },
        { path: '/updates', label: 'Bot Updates', icon: IconRefresh },
      ],
    },
  ];

  const [botClientId, setBotClientId] = useState<string>('');

  useEffect(() => {
    fetch('/api/bot')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) setBotClientId(data.id);
      })
      .catch(() => {});
  }, []);

  const availableGuilds = guilds.length > 0 ? guilds : (currentGuild ? [currentGuild] : []);
  const filteredGuilds = availableGuilds.filter((g) => g.name.toLowerCase().includes(guildSearch.toLowerCase()));
  const connectedGuilds = filteredGuilds.filter((g) => g.botPresent !== false && g.botInGuild !== false);
  const unconnectedGuilds = filteredGuilds.filter((g) => g.botPresent === false || g.botInGuild === false);

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const actualWidth = isCollapsed ? 76 : sidebarConfig.width;

  return (
    <>
      {/* ── Desktop Collapsible Revamped Sidebar ────────────────────────── */}
      <aside 
        style={{
          width: `${actualWidth}px`,
          backgroundColor: `rgba(9, 12, 21, ${sidebarConfig.opacity / 100})`,
          backdropFilter: `blur(${sidebarConfig.blur}px)`,
        }}
        className="hidden lg:flex border-r border-white/[0.08] flex-col justify-between h-screen shrink-0 select-none z-30 transition-all duration-300 ease-out relative"
      >
        {/* ── Sleek Floating Border Toggle Button (Centered Vertically) ── */}
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-40">
          <Tooltip content={isCollapsed ? "Expand Sidebar (⌘[)" : "Collapse Sidebar (⌘[)"} position="right">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="w-7 h-9 rounded-full bg-[#0E1322] border border-white/25 text-slate-300 hover:text-white hover:border-violet-500 hover:bg-violet-600 shadow-xl shadow-black/90 flex items-center justify-center transition-all cursor-pointer transform hover:scale-110 active:scale-95 ring-2 ring-black/40"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
            </button>
          </Tooltip>
        </div>
        
        {/* Top Section: Server Selector + Search + Notifications */}
        <div className={`p-3 space-y-3 border-b border-white/[0.06] relative ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          
          {/* Server Context Dropdown Trigger */}
          <div className="w-full relative">
            <Tooltip
              content={isCollapsed ? (currentGuild?.name || 'FloofCore Server') : undefined}
              position="right"
              disabled={!isCollapsed}
              className={isCollapsed ? 'w-full flex justify-center' : 'w-full block'}
            >
              <button
                type="button"
                onClick={() => {
                  setGuildMenuOpen(!guildMenuOpen);
                  setNotifOpen(false);
                }}
                className={`w-full flex items-center ${
                  isCollapsed
                    ? 'justify-center w-12 h-12 p-0 mx-auto'
                    : 'justify-between px-3 py-2.5 min-h-[58px]'
                } rounded-2xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.08] hover:border-violet-500/40 transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0 flex items-center justify-center">
                    <GuildIcon
                      id={currentGuild?.id || '123456'}
                      name={currentGuild?.name || 'FloofCore Server'}
                      icon={currentGuild?.icon}
                      size="md"
                      className="w-10 h-10 rounded-xl shadow-md ring-1 ring-violet-500/30"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D121F] shadow-sm animate-pulse pointer-events-none" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                      <span className="text-xs font-black text-white font-heading truncate w-full tracking-wide">
                        {currentGuild?.name || 'FloofCore Server'}
                      </span>
                      <span className="text-[10px] font-mono text-violet-400 flex items-center gap-1.5 font-bold tracking-wider mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        SHARD 0 • ONLINE
                      </span>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <IconChevronDown
                    size={16}
                    className={`text-slate-400 group-hover:text-white transition-transform shrink-0 ml-2 ${
                      guildMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>
            </Tooltip>

            {/* Server Switcher Flyout Modal */}
            <AnimatePresence>
              {guildMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.7)',
                    backgroundColor: 'rgba(13, 18, 31, 0.96)',
                    backdropFilter: 'blur(24px)',
                    borderColor: 'var(--fc-card-border, rgba(255, 255, 255, 0.12))',
                  }}
                  className={`absolute ${isCollapsed ? 'left-full top-0 ml-3 w-72' : 'top-full left-0 right-0 mt-2'} p-2 border shadow-2xl z-50 space-y-2`}
                >
                  <div className="relative px-1">
                    <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search servers..."
                      value={guildSearch}
                      onChange={(e) => setGuildSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {/* Section 1: Connected Servers */}
                    <div className="space-y-1">
                      <div className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Connected Clusters ({connectedGuilds.length})</span>
                      </div>
                      {connectedGuilds.length === 0 ? (
                        <div className="px-2 py-1.5 text-[11px] text-slate-500 font-mono">No active servers found.</div>
                      ) : (
                        connectedGuilds.map((g) => {
                          const isSelected = g.id === currentGuild?.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setCurrentGuild(g);
                                setGuildMenuOpen(false);
                                showToast({
                                  title: 'Cluster Switched',
                                  message: `Now viewing ${g.name}.`,
                                  type: 'info',
                                });
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-600/20 text-white font-bold border border-violet-500/30'
                                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <GuildIcon id={g.id} name={g.name} icon={g.icon} size="xs" />
                                <span className="text-xs truncate">{g.name}</span>
                              </div>
                              {isSelected && <IconCheck size={14} className="text-violet-400 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Section 2: Manageable Servers Without Bot */}
                    {unconnectedGuilds.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-white/[0.06]">
                        <div className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Invite Bot to Server ({unconnectedGuilds.length})</span>
                        </div>
                        {unconnectedGuilds.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GuildIcon id={g.id} name={g.name} icon={g.icon} size="xs" />
                              <span className="text-xs truncate text-slate-300 max-w-[110px]">{g.name}</span>
                            </div>
                            <a
                              href={`https://discord.com/oauth2/authorize?client_id=${botClientId || ''}&permissions=8&scope=bot%20applications.commands&guild_id=${g.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/30 text-[10px] font-bold font-heading transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <span>Invite</span>
                              <IconExternalLink size={10} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-white/[0.06] px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGuildMenuOpen(false);
                        window.open(
                          `https://discord.com/oauth2/authorize?client_id=${botClientId || ''}&permissions=8&scope=bot%20applications.commands`,
                          '_blank'
                        );
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-violet-300 hover:text-white bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/20 hover:border-violet-500/40 transition-all cursor-pointer shadow-sm"
                    >
                      <IconPlus size={14} className="shrink-0" />
                      <span>Add Bot to New Server</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search & Bell Controls */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 w-full pt-1">
              <Tooltip content="Quick Search (⌘K)" position="right">
                <button
                  type="button"
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                    document.dispatchEvent(event);
                  }}
                  className="p-2.5 rounded-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.06] text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <IconSearch size={16} />
                </button>
              </Tooltip>

              <Tooltip content="System alerts & notifications" position="right">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(true);
                    setGuildMenuOpen(false);
                  }}
                  className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                    unreadCount > 0
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 hover:bg-violet-600 hover:text-white'
                      : 'bg-white/[0.035] hover:bg-white/[0.07] border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  <IconBell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-black bg-rose-500 text-white ring-2 ring-[#090C15] animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Tooltip content="Quick command & page switcher (⌘K)" position="bottom" className="flex-1">
                <button
                  type="button"
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                    document.dispatchEvent(event);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.035] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <IconSearch size={14} className="text-slate-400 group-hover:text-violet-400 transition-colors" />
                    <span>Search pages...</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white/[0.06] rounded border border-white/10">
                    ⌘K
                  </kbd>
                </button>
              </Tooltip>

              <Tooltip content="System alerts & notifications" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(true);
                    setGuildMenuOpen(false);
                  }}
                  className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                    unreadCount > 0
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 hover:bg-violet-600 hover:text-white'
                      : 'bg-white/[0.035] hover:bg-white/[0.07] border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  <IconBell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-black bg-rose-500 text-white ring-2 ring-[#090C15] animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Tooltip>
            </div>
          )}

          {/* ── System Notification Popout Modal (rendered on page via portal) ── */}
          <NotificationModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Middle Section: Categorized Navigation Links */}
        <div className={`flex-1 overflow-y-auto py-3 ${isCollapsed ? 'px-2 space-y-4' : 'px-3 space-y-5'} custom-scrollbar`}>
          {navCategories.map((category, catIdx) => (
            <div key={catIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[9px] font-mono font-extrabold tracking-widest text-slate-500 uppercase">
                  {category.title}
                </div>
              )}

              {isCollapsed && catIdx > 0 && (
                <div className="h-px bg-white/[0.06] my-2 mx-1" />
              )}

              <nav className="space-y-0.5">
                {category.items.map((item) => {
                  const IconComp = item.icon;
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);

                  const linkContent = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-bold transition-all duration-200 group active:scale-[0.98] ${
                        isActive
                          ? `bg-gradient-to-r ${sidebarConfig.gradient} text-white shadow-lg shadow-violet-600/25 font-black scale-[1.01]`
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06] hover:translate-x-1'
                      }`}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0`}>
                        <IconComp
                          size={18}
                          className={`transition-transform duration-200 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-violet-300 group-hover:scale-110'}`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 group-hover:border-violet-500/40 transition-colors">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.path} content={item.label} position="right" className="w-full">
                        {linkContent}
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </nav>

              {/* After Core Platform (catIdx === 0): Render Alphabetical Installed Apps & Modules */}
              {catIdx === 0 && installedModules.length > 0 && (
                isCollapsed ? (
                  <div className="space-y-1">
                    <div className="h-px bg-white/[0.06] my-2 mx-1" />
                    <nav className="space-y-1">
                      {installedModules.map((mod) => {
                        const modPath = `/modules/${mod.id}`;
                        const isActive = location.pathname === modPath || location.pathname.startsWith(`${modPath}/`);
                        return (
                          <Tooltip
                            key={mod.id}
                            content={mod.isNew ? `${mod.label} • NEW APP` : mod.label}
                            position="right"
                            className="w-full"
                          >
                            <NavLink
                              to={modPath}
                              onClick={() => markModuleAsSeen(mod.id)}
                              className={`flex items-center justify-center p-2 rounded-xl transition-all duration-150 group relative ${
                                isActive
                                  ? `bg-gradient-to-r ${sidebarConfig.gradient} text-white shadow-lg font-black`
                                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                              }`}
                            >
                              <span className="text-base select-none leading-none">{mod.icon}</span>
                              {mod.isNew && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090C15] animate-pulse" />
                              )}
                            </NavLink>
                          </Tooltip>
                        );
                      })}
                    </nav>
                  </div>
                ) : (
                  <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={toggleAppsExpanded}
                      className="w-full flex items-center justify-between px-3 py-1 text-[9px] font-mono font-extrabold tracking-widest text-slate-500 hover:text-slate-300 uppercase cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">INSTALLED APPS</span>
                        <span className="text-[9px] font-mono text-slate-500">({installedModules.length})</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {newAppsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30 animate-pulse">
                            {newAppsCount} NEW
                          </span>
                        )}
                        <IconChevronDown
                          size={13}
                          className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                            appsExpanded ? '' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {appsExpanded && (
                        <motion.nav
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="space-y-0.5 overflow-hidden"
                        >
                          {installedModules.map((mod) => {
                            const modPath = `/modules/${mod.id}`;
                            const isActive = location.pathname === modPath || location.pathname.startsWith(`${modPath}/`);
                            return (
                              <NavLink
                                key={mod.id}
                                to={modPath}
                                onClick={() => markModuleAsSeen(mod.id)}
                                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
                                  isActive
                                    ? `bg-gradient-to-r ${sidebarConfig.gradient} text-white shadow-lg shadow-violet-600/20 font-black scale-[1.01]`
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] hover:translate-x-1'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-sm shrink-0 flex items-center justify-center w-5 select-none transition-transform duration-200 group-hover:scale-110">
                                    {mod.icon}
                                  </span>
                                  <span className="truncate">{mod.label}</span>
                                </div>
                                {mod.isNew && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/40 animate-pulse shrink-0">
                                    NEW
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </motion.nav>
                      )}
                    </AnimatePresence>
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        {/* Bottom Section: User Profile Pill */}
        <div className={`p-2.5 border-t border-white/[0.08] bg-black/25 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2 p-1.5' : 'justify-between p-2'} rounded-2xl bg-white/[0.03] border border-white/[0.06]`}>
            <Tooltip content={user?.globalName || user?.username || 'Administrator'} position="right" disabled={!isCollapsed}>
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar id={user?.id} avatar={user?.avatar} username={user?.username} size="sm" />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      {user?.globalName || user?.username || 'Administrator'}
                    </span>
                    <span className="text-[9px] font-mono text-violet-400">Verified Admin</span>
                  </div>
                )}
              </div>
            </Tooltip>

            <div className="flex items-center gap-1">
              <Tooltip content="Sign out of dashboard" position={isCollapsed ? 'right' : 'top'}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <IconLogout size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Slide-Over Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-0 bottom-0 left-0 w-80 max-w-[88vw] z-50 lg:hidden shadow-2xl bg-[#090C15]/98 backdrop-blur-2xl flex flex-col justify-between p-4 border-r border-white/10"
            >
              {/* Mobile Drawer Header */}
              <div className="space-y-3 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0 flex items-center justify-center">
                      <GuildIcon
                        id={currentGuild?.id || '123456'}
                        name={currentGuild?.name || 'FloofCore Server'}
                        icon={currentGuild?.icon}
                        size="sm"
                        className="w-9 h-9 rounded-xl shadow ring-1 ring-violet-500/30"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0D121F] shadow-sm animate-pulse pointer-events-none" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-white font-heading truncate max-w-[170px]">
                        {currentGuild?.name || 'FloofCore Server'}
                      </span>
                      <span className="text-[9px] font-mono text-violet-400 font-bold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        SHARD 0 • ONLINE
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] cursor-pointer"
                  >
                    <IconX size={18} />
                  </button>
                </div>

                {/* Mobile Search Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                    document.dispatchEvent(event);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-400 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <IconSearch size={14} className="text-slate-400" />
                    <span>Search commands &amp; pages...</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white/[0.06] rounded border border-white/10">
                    ⌘K
                  </kbd>
                </button>
              </div>

              {/* Mobile Navigation List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar">
                {navCategories.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="px-2 text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      {cat.title}
                    </div>
                    {cat.items.map((item) => {
                      const IconComp = item.icon;
                      const isActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? `bg-gradient-to-r ${sidebarConfig.gradient} text-white shadow-lg`
                              : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComp size={16} className={isActive ? 'text-white' : 'text-violet-400'} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}

                    {/* After Core Platform in mobile: Render Alphabetical Installed Apps & Modules */}
                    {idx === 0 && installedModules.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <div className="px-2 flex items-center justify-between text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                          <span>INSTALLED APPS ({installedModules.length})</span>
                          {newAppsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 animate-pulse">
                              {newAppsCount} NEW
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {installedModules.map((mod) => {
                            const modPath = `/modules/${mod.id}`;
                            const isActive = location.pathname === modPath || location.pathname.startsWith(`${modPath}/`);
                            return (
                              <NavLink
                                key={mod.id}
                                to={modPath}
                                onClick={() => {
                                  markModuleAsSeen(mod.id);
                                  setSidebarOpen(false);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                  isActive
                                    ? `bg-gradient-to-r ${sidebarConfig.gradient} text-white shadow-lg`
                                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-sm shrink-0 w-5 flex items-center justify-center">{mod.icon}</span>
                                  <span className="truncate">{mod.label}</span>
                                </div>
                                {mod.isNew && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30 animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile User Profile Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar id={user?.id} avatar={user?.avatar} username={user?.username} size="sm" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      {user?.globalName || user?.username || 'Admin'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Verified Session</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <IconLogout size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
