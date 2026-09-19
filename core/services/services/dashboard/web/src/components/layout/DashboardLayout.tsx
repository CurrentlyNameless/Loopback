import React, { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import gsap from 'gsap';
import { Sidebar } from './Sidebar.tsx';
import { CommandPalette } from '../CommandPalette.tsx';
import { useDevice } from '../../lib/useDevice.ts';
import { getAssetUrl } from '../../lib/assetStore.ts';
import { initThemeEngine } from '../../lib/themeEngine.ts';
import { useRealtimeStore } from '../../stores/realtime.ts';
import { useAuthStore } from '../../stores/auth.ts';
import { 
  IconLayoutDashboard, 
  IconPlug, 
  IconTerminal2, 
  IconTicket, 
  IconSettings,
  IconMenu2,
  IconSearch,
  IconBell
} from '@tabler/icons-react';

import { Footer } from './Footer.tsx';
import { getAllAssets } from '../../lib/assetStore.ts';
import { useUIStore } from '../../stores/ui.ts';
import { useGuildStore } from '../../stores/guild.ts';
import { useNotificationStore } from '../../stores/notifications.ts';
import { GuildIcon } from '../discord/GuildIcon.tsx';
import { NotificationModal } from '../NotificationModal.tsx';
import { gsapLaserSweep, gsapCinematicPageEntrance } from '../../lib/animations.ts';

export const DashboardLayout: React.FC = () => {
  const { isMobile } = useDevice();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const initEventStream = useRealtimeStore((s) => s.initEventStream);
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { currentGuild } = useGuildStore();
  const { unreadCount } = useNotificationStore();
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const laserBarRef = useRef<HTMLDivElement>(null);

  // GSAP: High-impact cinematic page transition on route change with glowing neon laser sweep
  useEffect(() => {
    // 1. Fire energetic neon laser beam across top of viewport
    gsapLaserSweep(laserBarRef.current);

    // 2. 3D perspective camera tilt, zoom, and cascaded child card entrance
    gsapCinematicPageEntrance(pageContainerRef.current);
  }, [location.pathname]);

  // Background Media & Audio State
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgIsVideo, setBgIsVideo] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(35);
  const [bgBlur, setBgBlur] = useState(4);

  // Initialize dynamic theme variables & real-time SSE gateway stream
  useEffect(() => {
    initThemeEngine();
    const cleanupStream = initEventStream();
    return () => cleanupStream();
  }, [initEventStream]);

  // Sync background wallpaper on load and storage events
  useEffect(() => {
    const syncBackdrop = async () => {
      const enabled = localStorage.getItem('bgImageEnabled') === 'true';
      const assetId = localStorage.getItem('selectedBgAssetId');
      const directUrl = localStorage.getItem('bgImageUrl');
      const opacity = Number(localStorage.getItem('bgOpacity') || '40');
      const blur = Number(localStorage.getItem('bgBlur') || '0');

      setBgEnabled(enabled);
      setBgOpacity(opacity);
      setBgBlur(blur);

      if (enabled) {
        if (assetId) {
          const assets = await getAllAssets();
          const target = assets.find((a) => a.id === assetId);
          const isVid = target?.type === 'video' || target?.mimeType?.startsWith('video/') || target?.name?.match(/\.(mp4|webm|mov)$/i);
          setBgIsVideo(Boolean(isVid));
          const url = await getAssetUrl(assetId);
          setBgUrl(url);
        } else if (directUrl) {
          const isVid = directUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i);
          setBgIsVideo(Boolean(isVid));
          setBgUrl(directUrl);
        } else {
          setBgUrl(null);
          setBgIsVideo(false);
        }
      } else {
        setBgUrl(null);
        setBgIsVideo(false);
      }
    };

    syncBackdrop();
    window.addEventListener('storage', syncBackdrop);
    window.addEventListener('dashboard-backdrop-updated', syncBackdrop);
    return () => {
      window.removeEventListener('storage', syncBackdrop);
      window.removeEventListener('dashboard-backdrop-updated', syncBackdrop);
    };
  }, []);

  // Global hover sound FX engine
  useEffect(() => {
    let lastHovered: Element | null = null;

    const handleMouseOver = async (e: MouseEvent) => {
      const soundEnabled = localStorage.getItem('soundFxEnabled') === 'true';
      const audioAssetId = localStorage.getItem('selectedAudioAssetId');
      const soundVol = Number(localStorage.getItem('soundVolume') || '50');

      if (!soundEnabled || !audioAssetId) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest('button, [role="tab"], [role="switch"], a, .cursor-pointer');
      if (interactive && interactive !== lastHovered) {
        lastHovered = interactive;
        const url = await getAssetUrl(audioAssetId);
        if (url) {
          const audio = new Audio(url);
          audio.volume = Math.min(1, Math.max(0, (soundVol / 100) * 0.4));
          audio.play().catch(() => {});
        }
      }
    };

    window.addEventListener('mouseover', handleMouseOver);
    return () => window.removeEventListener('mouseover', handleMouseOver);
  }, []);

  const mobileNavItems = [
    { path: '/', label: 'Overview', icon: IconLayoutDashboard, exact: true },
    { path: '/modules', label: 'Modules', icon: IconPlug },
    { path: '/commands', label: 'Commands', icon: IconTerminal2 },
    { path: '/tickets', label: 'Tickets', icon: IconTicket },
    { path: '/settings', label: 'Settings', icon: IconSettings },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#06080E] text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-slate-400">Verifying session with FloofCore...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/hub" replace />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#070911] text-slate-100 overflow-hidden font-body select-none relative">
      {/* ── High-Impact Glowing Neon Laser Sweep Bar (GSAP) ─────────── */}
      <div
        ref={laserBarRef}
        className="fixed top-0 left-0 h-[3px] z-[9999] pointer-events-none bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400 shadow-[0_0_16px_rgba(236,72,153,0.9),0_0_26px_rgba(139,92,246,0.7)] origin-left"
        style={{ width: '0%', opacity: 0 }}
      />
      
      {/* ── Global Full-Screen Background Wallpaper / Video Layer ──── */}
      {bgEnabled && bgUrl && (
        <>
          {bgIsVideo || bgUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
            <video
              src={bgUrl}
              autoPlay
              loop
              muted
              playsInline
              className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none transition-all duration-700 ease-out transform scale-105"
              style={{
                opacity: bgOpacity / 100,
                filter: `blur(${bgBlur}px)`,
              }}
            />
          ) : (
            <div 
              className="fixed inset-0 z-0 pointer-events-none transition-all duration-700 ease-out bg-cover bg-center bg-no-repeat transform scale-105"
              style={{
                backgroundImage: `url(${bgUrl})`,
                opacity: bgOpacity / 100,
                filter: `blur(${bgBlur}px)`,
              }}
            />
          )}
          {/* Subtle Vignette & Gradient Shadow */}
          <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-[#070911] via-black/30 to-black/50" />
        </>
      )}

      {/* ── Mobile Fixed Top Header Bar ────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-[#080B13]/95 backdrop-blur-2xl border-b border-white/[0.08] px-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <IconMenu2 size={18} />
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all text-left min-w-0 cursor-pointer"
          >
            <GuildIcon
              id={currentGuild?.id || '123456'}
              name={currentGuild?.name || 'FloofCore Server'}
              icon={currentGuild?.icon}
              size="sm"
              className="w-7 h-7 rounded-lg shadow-sm shrink-0 ring-1 ring-violet-500/30"
            />
            <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
              {currentGuild?.name || 'FloofCore Server'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
            title="Search (⌘K)"
          >
            <IconSearch size={17} />
          </button>

          <button
            type="button"
            onClick={() => setMobileNotifOpen(true)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
            title="Notifications"
          >
            <IconBell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-[#080B13] animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Revamped Full-Height Left Sidebar */}
      <Sidebar />

      {/* Main Content Workspace with Bottom Footer on Every Page */}
      <main className={`flex-1 flex flex-col justify-between overflow-y-auto ${isMobile ? 'p-3.5 pb-28 pt-16' : 'p-6 md:p-8'} relative z-10 custom-scrollbar`}>
        <div ref={pageContainerRef} key={location.pathname} className="min-w-0 flex-1">
          <Outlet />
        </div>
        <Footer className="mt-12 shrink-0 pb-2" />
      </main>

      {/* Global Interactive Command Palette (⌘K) */}
      <CommandPalette />

      {/* Mobile Floating Bottom Bar */}
      {isMobile && !sidebarOpen && (
        <nav className="fixed bottom-3 left-3 right-3 z-30">
          <div className="bg-[#0D121F]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  <span className="leading-tight">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mobile Notifications Modal */}
      <NotificationModal open={mobileNotifOpen} onClose={() => setMobileNotifOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
