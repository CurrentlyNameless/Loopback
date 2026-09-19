import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconBrandDiscord, 
  IconShieldCheck, 
  IconAlertCircle, 
  IconBolt, 
  IconSparkles, 
  IconArrowRight, 
  IconWifi, 
  IconCpu, 
  IconActivity, 
  IconDatabase, 
  IconLockCheck, 
  IconTerminal2, 
  IconServer, 
  IconTicket, 
  IconScale, 
  IconUsers, 
  IconHelpCircle, 
  IconSend, 
  IconCheck, 
  IconChevronDown, 
  IconChevronUp, 
  IconChevronLeft,
  IconChevronRight,
  IconUser, 
  IconMessageDots, 
  IconCrown,
  IconPhoto,
  IconUpload,
  IconTrash,
  IconLayersLinked,
  IconShield,
  IconX
} from '@tabler/icons-react';
import { GuildIcon } from '../../components/discord/GuildIcon.tsx';
import { Footer } from '../../components/Footer.tsx';
import { useAuthStore } from '../../stores/auth.ts';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Navigate } from 'react-router-dom';
import { getAssetUrl, getAllAssets } from '../../lib/assetStore.ts';
import { initThemeEngine } from '../../lib/themeEngine.ts';

export interface GuildItem {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  channelsCount: number;
  ping: number;
  modulesArmed: number;
  shardId: number;
  status: 'online' | 'standby';
  botName?: string;
  botAvatar?: string | null;
  botId?: string;
}

interface BotConfigData {
  id?: string;
  name?: string;
  botName?: string;
  username?: string;
  avatar?: string;
  guildName?: string;
  guildIcon?: string;
  guildId?: string;
  guilds?: GuildItem[];
}

interface StaffMember {
  id: string;
  username: string;
  globalName: string;
  avatar: string | null;
  isOwner: boolean;
  roleName: string;
  roleColor: string;
}

interface HubInfo {
  guildId: string | null;
  guildName: string;
  guildIcon: string | null;
  guildBanner: string | null;
  memberCount: number;
  botUsername: string;
  botAvatar: string | null;
  staff: StaffMember[];
  faqs: { q: string; a: string }[];
}

export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { show: showToast } = useToast();

  // ── GSAP Entrance Refs ───────────────────────────────────────────
  const loginTabRef   = useRef<HTMLDivElement>(null);
  const loginCardRef  = useRef<HTMLDivElement>(null);
  const loginLeftRef  = useRef<HTMLDivElement>(null);
  const loginBgRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Background glow orbs — scale in from 0
    if (loginBgRef.current) {
      gsap.set(loginBgRef.current.children, { opacity: 0, scale: 0.6 });
      tl.to(loginBgRef.current.children, {
        opacity: 1, scale: 1, duration: 1.2, stagger: 0.15, ease: 'power2.out',
      }, 0);
    }

    // 2. Mode switcher bar — slide down from -20px
    if (loginTabRef.current) {
      gsap.set(loginTabRef.current, { opacity: 0, y: -20 });
      tl.to(loginTabRef.current, { opacity: 1, y: 0, duration: 0.55 }, 0.1);
    }

    // 3. Left panel — sweep in from left
    if (loginLeftRef.current) {
      gsap.set(loginLeftRef.current, { opacity: 0, x: -48, scale: 0.97 });
      tl.to(loginLeftRef.current, { opacity: 1, x: 0, scale: 1, duration: 0.65 }, 0.2);
    }

    // 4. Login card — slam in from right with slight elastic overshoot
    if (loginCardRef.current) {
      gsap.set(loginCardRef.current, { opacity: 0, x: 48, scale: 0.95 });
      tl.to(loginCardRef.current, {
        opacity: 1, x: 0, scale: 1, duration: 0.7, ease: 'back.out(1.4)',
      }, 0.25);
    }

    return () => { tl.kill(); };
  }, []);

  const [portalMode, setPortalMode] = useState<'admin' | 'hub'>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('error') === 'not_authorized' || p.get('mode') === 'hub') {
        return 'hub';
      }
    } catch {}
    return 'admin';
  });
  const [botData, setBotData] = useState<BotConfigData | null>(null);
  const [botReady, setBotReady] = useState(false);
  const [stats, setStats] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'cluster' | 'security'>('status');
  const [selectedGuildIndex, setSelectedGuildIndex] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_selected_guild_index');
    return saved !== null ? Number(saved) : 0;
  });

  // Background Media Wallpaper State
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgIsVideo, setBgIsVideo] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(40);
  const [bgBlur, setBgBlur] = useState(2);

  // Hub Center State
  const [hubInfo, setHubInfo] = useState<HubInfo | null>(null);
  const [hubTab, setHubTab] = useState<'ticket' | 'appeal' | 'staff' | 'faq'>('ticket');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<string>('General Support');
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketDescription, setTicketDescription] = useState<string>('');
  const [ticketUsername, setTicketUsername] = useState<string>('');
  const [ticketAttachments, setTicketAttachments] = useState<Array<{ name: string; url: string; size: number; type: 'image' | 'video' }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState<boolean>(false);

  // Appeal Form State
  const [appealType, setAppealType] = useState<string>('Ban');
  const [appealUsername, setAppealUsername] = useState<string>('');
  const [appealReason, setAppealReason] = useState<string>('');
  const [submittingAppeal, setSubmittingAppeal] = useState<boolean>(false);

  const [dismissError, setDismissError] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const error = dismissError ? null : urlParams.get('error');

  const clearError = () => {
    setDismissError(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('details');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch {}
  };

  useEffect(() => {
    initThemeEngine();
  }, []);

  // Sync background wallpaper and video media on load and storage events
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

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const fetchBotData = async () => {
      try {
        const [bot, st, hub] = await Promise.all([
          fetch('/api/bot').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch('/api/stats').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch('/api/hub/info').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (cancelled) return;

        if (bot) {
          setBotData(bot);
          setBotReady(true);
        }
        if (st) setStats(st);
        if (hub) setHubInfo(hub);
      } catch {
        if (!cancelled) {
          retryTimeout = setTimeout(fetchBotData, 3000);
        }
      }
    };

    fetchBotData();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [error]);

  useEffect(() => {
    if (error === 'not_authorized' || urlParams.get('mode') === 'hub') {
      setPortalMode('hub');
    }
  }, [error]);

  if (isAuthenticated && !isLoading) {
    if (user?.isAdmin) {
      return <Navigate to="/" replace />;
    } else {
      return <Navigate to="/hub" replace />;
    }
  }

  const handleDiscordLogin = () => {
    clearError();
    if (currentGuild?.id) {
      try {
        localStorage.setItem('fc_selected_guild_id', currentGuild.id);
        localStorage.setItem('dashboard_target_guild_id', currentGuild.id);
      } catch {}
      window.location.href = `/auth/discord?guild_id=${encodeURIComponent(currentGuild.id)}`;
    } else {
      window.location.href = '/auth/discord';
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (ticketAttachments.length + files.length > 5) {
      showToast({ title: 'Limit Exceeded', message: 'You can attach up to 5 images or videos per ticket.', type: 'error' });
      return;
    }

    setUploadingAttachment(true);
    const added: Array<{ name: string; url: string; size: number; type: 'image' | 'video' }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check for duplicates in existing attachments or currently added queue
      const isDuplicate = 
        ticketAttachments.some((att) => att.name === file.name && att.size === file.size) ||
        added.some((att) => att.name === file.name && att.size === file.size);

      if (isDuplicate) {
        showToast({ title: 'Duplicate Skipped', message: `"${file.name}" is already attached.`, type: 'warning' });
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        showToast({ title: 'File Too Large', message: `"${file.name}" exceeds the 50MB limit.`, type: 'error' });
        continue;
      }

      let fileUrl = '';
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-file-name': file.name,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) fileUrl = data.url;
        }
      } catch (err) {
        console.warn('Upload fallback', err);
      }

      if (!fileUrl) {
        fileUrl = URL.createObjectURL(file);
      }

      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov)$/i);
      added.push({
        name: file.name,
        url: fileUrl,
        size: file.size,
        type: isVideo ? 'video' : 'image',
      });
    }

    if (added.length > 0) {
      setTicketAttachments((prev) => [...prev, ...added]);
      showToast({ title: 'Attachments Added', message: `Added ${added.length} media file(s).`, type: 'success' });
    }
    setUploadingAttachment(false);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const handleRemoveAttachment = (idx: number) => {
    setTicketAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      showToast({ title: 'Missing Information', message: 'Please provide a subject and details.', type: 'error' });
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await fetch('/api/hub/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: ticketCategory,
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          username: ticketUsername.trim() || undefined,
          attachments: ticketAttachments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ title: 'Ticket Submitted', message: 'Your support ticket has been forwarded to server staff.', type: 'success' });
        setTicketSubject('');
        setTicketDescription('');
        setTicketUsername('');
        setTicketAttachments([]);
      } else {
        showToast({ title: 'Submission Failed', message: data.error || 'Could not submit ticket.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', message: 'Network error submitting ticket.', type: 'error' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealUsername.trim() || !appealReason.trim()) {
      showToast({ title: 'Missing Information', message: 'Please enter your Discord tag and explanation.', type: 'error' });
      return;
    }

    setSubmittingAppeal(true);
    try {
      const res = await fetch('/api/hub/appeals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: appealType,
          username: appealUsername.trim(),
          reason: appealReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ title: 'Appeal Submitted', message: 'Your appeal request has been submitted to staff for review.', type: 'success' });
        setAppealUsername('');
        setAppealReason('');
      } else {
        showToast({ title: 'Appeal Failed', message: data.error || 'Could not submit appeal.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', message: 'Network error submitting appeal.', type: 'error' });
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const botName = botData?.name || botData?.botName || botData?.username || 'Bot Control Panel';
  const defaultGuildIcon = botData?.guildIcon || botData?.avatar || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%237c3aed'/><text x='50' y='68' text-anchor='middle' font-size='56' font-family='sans-serif' font-weight='700' fill='%23ffffff'>⚡</text></svg>`;
  
  const guildsList: GuildItem[] = botData?.guilds && botData.guilds.length > 0 ? botData.guilds : (
    botData?.guildName ? [
      {
        id: botData.guildId || '0',
        name: botData.guildName,
        icon: botData.guildIcon || defaultGuildIcon,
        memberCount: stats?.users || 1,
        channelsCount: 12,
        ping: stats?.ping || 16,
        modulesArmed: stats?.modules || 14,
        shardId: 0,
        status: 'online',
      }
    ] : []
  );

  const currentGuild: GuildItem = guildsList[Math.min(selectedGuildIndex, Math.max(0, guildsList.length - 1))] || {
    id: botData?.guildId || '0',
    name: botData?.guildName || botName,
    icon: botData?.guildIcon || defaultGuildIcon,
    memberCount: stats?.users || 1,
    channelsCount: 12,
    ping: stats?.ping || 16,
    modulesArmed: stats?.modules || 14,
    shardId: 0,
    status: 'online',
  };
  const currentGuildIcon = currentGuild?.icon || defaultGuildIcon;
  const isMultiGuild = guildsList.length > 1;

  // Clause:
  // - Multi-guild bot (e.g. 2+ connected servers): Primary identity is Bot Control Panel
  // - Single-guild bot (e.g. 1 connected server): Primary identity is that Dedicated Server Panel
  const displayTitle = isMultiGuild ? botName : currentGuild.name;
  const displayBadge = isMultiGuild ? 'BOT CONTROL PANEL' : `${currentGuild.name.toUpperCase()} PANEL`;
  const displayName = hubInfo?.guildName || currentGuild?.name || botData?.guildName || botName || 'Community Server';

  const selectGuild = (idx: number) => {
    setSelectedGuildIndex(idx);
    localStorage.setItem('dashboard_selected_guild_index', String(idx));
    const target = guildsList[idx];
    if (target?.id) {
      try {
        localStorage.setItem('fc_selected_guild_id', target.id);
        localStorage.setItem('dashboard_target_guild_id', target.id);
      } catch {}
    }
  };

  const handlePrevGuild = () => {
    const nextIdx = selectedGuildIndex > 0 ? selectedGuildIndex - 1 : guildsList.length - 1;
    selectGuild(nextIdx);
  };

  const handleNextGuild = () => {
    const nextIdx = selectedGuildIndex < guildsList.length - 1 ? selectedGuildIndex + 1 : 0;
    selectGuild(nextIdx);
  };

  // Keep fc_selected_guild_id synced on initial mount
  useEffect(() => {
    if (currentGuild?.id) {
      try {
        localStorage.setItem('fc_selected_guild_id', currentGuild.id);
        localStorage.setItem('dashboard_target_guild_id', currentGuild.id);
      } catch {}
    }
  }, [currentGuild?.id]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (portalMode !== 'admin') return;
      if (e.key === 'ArrowLeft') {
        handlePrevGuild();
      } else if (e.key === 'ArrowRight') {
        handleNextGuild();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [portalMode, guildsList.length, selectedGuildIndex]);

  // Dynamically update document title and browser tab favicon on server switch
  useEffect(() => {
    if (currentGuild) {
      document.title = isMultiGuild
        ? `${botName} // ${currentGuild.name} Panel`
        : `${currentGuild.name} Panel`;
      
      const iconUrl = currentGuild.icon || defaultGuildIcon;

      // Force-refresh favicon links in DOM for Chromium & Firefox
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach((el) => el.remove());

      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.type = 'image/png';
      newIcon.href = iconUrl;
      document.head.appendChild(newIcon);

      const newShortcut = document.createElement('link');
      newShortcut.rel = 'shortcut icon';
      newShortcut.type = 'image/png';
      newShortcut.href = iconUrl;
      document.head.appendChild(newShortcut);
    }
  }, [currentGuild?.id, currentGuild?.name, currentGuild?.icon, isMultiGuild, botName]);

  return (
    <main className="min-h-screen w-full bg-[#06080E] text-slate-100 flex flex-col justify-between p-3 sm:p-4 md:p-8 relative overflow-x-hidden select-none">
      
      {/* ── Global Dynamic Background Wallpaper / Video Layer ──────── */}
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
          <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-[#06080E] via-black/30 to-black/60" />
        </>
      )}

      {/* ── Background Subtle Ray Geometry ─────────────────────────── */}
      <div ref={loginBgRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-violet-600/[0.08] blur-[160px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.05] blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-cyan-500/[0.04] blur-[140px]" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,8,14,0.92)_100%)]" />
      </div>

      {/* ── Prominent Global Not Authorized Error Banner ───────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-30 max-w-2xl mx-auto w-full mb-3 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 shadow-2xl flex items-start gap-3.5 backdrop-blur-xl"
        >
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
            <IconAlertCircle size={22} />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="text-sm font-bold font-heading text-rose-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>
                  {error === 'not_authorized'
                    ? "Access Denied — You're Not Authorized"
                    : error === 'bot_restarted'
                    ? 'Bot Service Restarted'
                    : 'Authentication Required'}
                </span>
                {error === 'not_authorized' && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-extrabold bg-rose-500/30 text-rose-200 uppercase">
                    Admin Only
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={clearError}
                className="p-1 rounded-lg text-rose-300/70 hover:text-rose-100 hover:bg-rose-500/20 transition-all cursor-pointer"
                title="Dismiss message"
              >
                <IconX size={16} />
              </button>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              {error === 'not_authorized'
                ? 'Your Discord account does not have Administrator or Manage Server permissions on any servers configured with FloofCore.'
                : error === 'bot_restarted'
                ? 'The bot process was restarted. Please sign in again with Discord to establish a fresh session.'
                : 'Session expired or authorization required. Please sign in again.'}
            </p>
            {error === 'not_authorized' && (
              <div className="pt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPortalMode('hub')}
                  className="text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 px-3.5 py-1.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <IconSparkles size={14} />
                  <span>Open Community Member Hub</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Top Portal Switcher & Appearance Studio ──────────────────── */}
      <div ref={loginTabRef} className="relative z-20 max-w-xl mx-auto w-full pt-1 pb-4 flex items-center gap-2">
        <div className="flex-1 p-1 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPortalMode('admin')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold font-heading uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
              portalMode === 'admin'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <IconLockCheck size={16} />
            <span>Bot Admin Panel</span>
          </button>

          <button
            type="button"
            onClick={() => setPortalMode('hub')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold font-heading uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
              portalMode === 'hub'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <IconSparkles size={16} />
            <span>Community Member Hub</span>
          </button>
        </div>
      </div>

      {/* ── MODE 1: ADMINISTRATOR PORTAL ─────────────────────────────── */}
      {portalMode === 'admin' ? (
        <div className="relative z-10 max-w-5xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center py-6">
          
          {/* Left Side: Interactive Live Cluster Diagnostics Monolith */}
          <div
            ref={loginLeftRef}
            className="lg:col-span-6 space-y-6 hidden lg:block"
          >
            {/* Brand Header */}
            <div className="flex items-center gap-3.5">
              <img
                src={currentGuildIcon}
                alt={displayTitle}
                className="w-12 h-12 rounded-2xl object-cover shadow-xl ring-2 ring-violet-500/30 border border-white/10"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultGuildIcon; }}
              />
              <div>
                <h1 className="text-xl font-black tracking-tight text-white font-heading">
                  {displayTitle}
                </h1>
                <div className="text-xs font-mono font-bold text-violet-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {isMultiGuild 
                      ? `${botName.toUpperCase()} // ${guildsList.length} SERVERS CONNECTED` 
                      : `${botName.toUpperCase()} // DEDICATED SERVER`}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Hub Card */}
            <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-2xl space-y-5">
              <div className="flex items-center gap-2 p-1 rounded-xl bg-black/40 border border-white/[0.06]">
                {(['status', 'cluster', 'security'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'status' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/20 border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <IconWifi size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Gateway Latency</div>
                        <div className="text-[10px] font-mono text-slate-400">{currentGuild.name} Heartbeat</div>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-emerald-400">
                      {currentGuild.ping || 16} ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/20 border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                        <IconCpu size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Heap Memory Load</div>
                        <div className="text-[10px] font-mono text-slate-400">V8 Runtime Execution</div>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-violet-300">
                      142.6 MB
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/20 border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <IconActivity size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Active Pipelines</div>
                        <div className="text-[10px] font-mono text-slate-400">Dynamic Modular Core</div>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-cyan-300">
                      {currentGuild.modulesArmed || 14} Armed
                    </span>
                  </div>
                </motion.div>
              )}

              {activeTab === 'cluster' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Target Guild ID:</span>
                      <span className="text-white font-bold">{currentGuild.id}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Shard Instance:</span>
                      <span className="text-emerald-400 font-bold">Shard {currentGuild.shardId} (Active)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>REST API Rate Limit:</span>
                      <span className="text-violet-400 font-bold">50 req/sec OK</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Module Registry:</span>
                      <span className="text-cyan-400 font-bold">{currentGuild.modulesArmed} Modules Armed</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-300">
                    <IconShieldCheck size={18} className="shrink-0 text-emerald-400" />
                    <span>Discord OAuth 2.0 PKCE Handshake verified</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-2.5 text-violet-300">
                    <IconLockCheck size={18} className="shrink-0 text-violet-400" />
                    <span>Role-based access token scoping</span>
                  </div>
                </motion.div>
              )}

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-white/[0.06]">
                <span>CLUSTER TELEMETRY</span>
                <span className="text-emerald-400 font-bold">● 100% NOMINAL</span>
              </div>
            </div>
          </div>

          {/* Right Side: Sign-In Monolith Card with Multi-Guild Carousel */}
          <div
            ref={loginCardRef}
            className="lg:col-span-6 w-full max-w-[440px] mx-auto"
          >
            <div className="relative rounded-[32px] border border-white/10 bg-[#0C101A]/90 backdrop-blur-3xl shadow-2xl shadow-black/80 p-7 sm:p-8 space-y-6 overflow-hidden group">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-600/20 blur-3xl rounded-full" />

              {/* ── Carousel Header & Navigation Controls ───────────── */}
              <div className="flex items-center justify-between gap-3 w-full pb-3 border-b border-white/[0.06]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-violet-300 text-[10px] font-mono font-bold tracking-widest uppercase">
                  <IconSparkles size={12} className="text-violet-400" />
                  <span>
                    {isMultiGuild
                      ? `TARGET BOT & CLUSTER // ${selectedGuildIndex + 1} OF ${guildsList.length}`
                      : 'TARGET SERVER'}
                  </span>
                </div>

                {isMultiGuild && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevGuild}
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-violet-600 hover:text-white text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                      aria-label="Previous Server"
                    >
                      <IconChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextGuild}
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-violet-600 hover:text-white text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                      aria-label="Next Server"
                    >
                      <IconChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Server Switcher Row — always visible ── */}
              {!botReady && guildsList.length === 0 ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <IconServer size={13} className="text-violet-400 animate-pulse" />
                      <span>Connecting to Gateway...</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold animate-pulse">Connecting</span>
                  </div>
                  <div className="w-full p-1.5 rounded-2xl bg-black/40 border border-white/[0.08]">
                    <div className="p-2 rounded-xl flex items-center gap-2.5 border border-white/[0.04]">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 rounded bg-white/[0.08] animate-pulse w-3/4" />
                        <div className="h-2 rounded bg-white/[0.05] animate-pulse w-1/2" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : guildsList.length > 0 ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <IconServer size={13} className="text-violet-400" />
                      <span>{isMultiGuild ? `Switch Server (${guildsList.length})` : 'Connected Server'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {isMultiGuild ? `${selectedGuildIndex + 1} of ${guildsList.length} Active` : 'Online'}
                    </span>
                  </div>

                  {/* Server Switcher Pill Buttons */}
                  <div className={`grid gap-2 w-full p-1.5 rounded-2xl bg-black/40 border border-white/[0.08] ${guildsList.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {guildsList.map((g, idx) => {
                      const isSelected = selectedGuildIndex === idx;
                      const gIcon = g.icon || defaultGuildIcon;
                      return (
                        <button
                          key={g.id || idx}
                          type="button"
                          onClick={() => selectGuild(idx)}
                          className={`p-2 rounded-xl flex items-center gap-2.5 transition-all text-left relative cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border border-violet-500/50 shadow-lg shadow-violet-600/20 text-white ring-1 ring-violet-400/40'
                              : 'hover:bg-white/[0.05] border border-white/[0.04] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={gIcon}
                              alt={g.name}
                              className={`w-8 h-8 rounded-xl object-cover border ${
                                isSelected ? 'border-violet-400 ring-2 ring-violet-500/40' : 'border-white/10'
                              }`}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultGuildIcon; }}
                            />
                            {isSelected && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0C101A]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate leading-tight">
                              {g.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{g.memberCount?.toLocaleString() || 1} users</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}


              {/* ── Animated Slide for Current Guild Card ────────────── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentGuild.id || selectedGuildIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col items-center text-center space-y-4 w-full"
                >
                  <div className="relative group/icon">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[28px] blur-lg opacity-40 group-hover/icon:opacity-80 transition duration-500" />
                    <img
                      src={currentGuildIcon}
                      alt={currentGuild.name}
                      className="relative w-20 h-20 rounded-3xl object-cover shadow-2xl ring-2 ring-violet-500/50 border border-white/15 transform group-hover/icon:scale-105 transition-all duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultGuildIcon; }}
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-[#0C101A] shadow-md animate-pulse z-10" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight font-heading">
                      {displayTitle}
                    </h2>
                    <div className="text-xs font-mono font-bold text-violet-400 flex items-center justify-center gap-2 mt-1">
                      <span className="text-slate-400">{isMultiGuild ? `${currentGuild.name} Selected` : botName}</span>
                      <span>•</span>
                      <span className="text-emerald-400">Shard {currentGuild.shardId} Online</span>
                    </div>
                  </div>

                  {/* ── Per-Guild Live Stats Mini Grid ───────────────── */}
                  <div className="grid grid-cols-3 gap-2 w-full pt-1">
                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center flex flex-col items-center justify-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                        <IconUsers size={12} className="text-cyan-400" />
                        <span>Members</span>
                      </div>
                      <span className="text-sm font-black font-heading text-white">
                        {currentGuild.memberCount?.toLocaleString() || '1+'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center flex flex-col items-center justify-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                        <IconWifi size={12} className="text-emerald-400" />
                        <span>Ping</span>
                      </div>
                      <span className="text-sm font-black font-heading text-emerald-400">
                        {currentGuild.ping || 16} ms
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center flex flex-col items-center justify-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                        <IconLayersLinked size={12} className="text-violet-400" />
                        <span>Modules</span>
                      </div>
                      <span className="text-sm font-black font-heading text-violet-300">
                        {currentGuild.modulesArmed || 14} Armed
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* ── Pagination Indicator Dots ───────────────────────── */}
              {guildsList.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {guildsList.map((g, idx) => (
                    <button
                      key={g.id || idx}
                      type="button"
                      onClick={() => selectGuild(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        selectedGuildIndex === idx ? 'w-6 bg-violet-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`Switch to ${g.name}`}
                    />
                  ))}
                </div>
              )}


              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleDiscordLogin}
                className="group/btn relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#5865F2] hover:bg-[#4a55d4] px-5 py-4 text-xs font-bold font-heading text-white shadow-xl shadow-[#5865F2]/30 hover:shadow-[#5865F2]/45 transition-all cursor-pointer"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                <IconBrandDiscord size={22} className="relative" />
                <span className="relative text-sm tracking-wide">Sign in with Discord</span>
                <IconArrowRight size={16} className="opacity-60 transition-transform duration-200 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 ml-auto" />
              </motion.button>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <IconShieldCheck size={16} className="text-emerald-400" />
                  <span className="text-[11px]">Discord OAuth 2.0 PKCE</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  TLS 1.3 SECURE
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── MODE 2: COMMUNITY MEMBER HUB CENTER ─────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 max-w-5xl w-full mx-auto my-auto space-y-6 py-4"
        >
          {/* Hub Hero Banner */}
          <div className="p-4 sm:p-7 rounded-2xl sm:rounded-[28px] bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 min-h-[120px] sm:min-h-[140px]">
            {/* Real Background Banner Layer if set */}
            {hubInfo?.guildBanner && (
              <>
                <img
                  src={hubInfo.guildBanner}
                  alt="Guild Banner"
                  className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0E1320]/95 via-[#0E1320]/80 to-[#0E1320]/90 pointer-events-none" />
              </>
            )}

            <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xl ring-2 ring-pink-500/30 overflow-hidden">
                {hubInfo?.guildIcon ? (
                  <img src={hubInfo.guildIcon} alt="Guild" className="w-full h-full object-cover" />
                ) : (
                  <IconSparkles size={24} className="text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold uppercase bg-pink-500/10 text-pink-300 border border-pink-500/20">
                    MEMBER HELP &amp; DISCOVERY
                  </span>
                  {hubInfo?.memberCount ? (
                    <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {hubInfo.memberCount.toLocaleString()} Members
                    </span>
                  ) : null}
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight font-heading truncate mt-1 drop-shadow-md">
                  {displayName}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5 truncate drop-shadow-sm">
                  Welcome to the public member center. Submit support tickets, appeals, and meet our staff team.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPortalMode('admin')}
                className="text-xs"
              >
                Admin Sign-In
              </Button>
            </div>
          </div>

          {/* Hub Navigation Tabs (2x2 on small mobile, flex row on tablet+) */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
            {[
              { key: 'ticket', label: 'Support Ticket', fullLabel: 'Open Support Ticket', icon: IconTicket },
              { key: 'appeal', label: 'Submit Appeal', fullLabel: 'Submit Appeal', icon: IconScale },
              { key: 'staff', label: 'Server Staff', fullLabel: 'Meet Server Staff', icon: IconUsers },
              { key: 'faq', label: 'FAQ / Rules', fullLabel: 'Knowledgebase & FAQ', icon: IconHelpCircle },
            ].map(({ key, label, fullLabel, icon: IconComp }) => (
              <button
                key={key}
                type="button"
                onClick={() => setHubTab(key as any)}
                className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold font-heading flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  hubTab === key
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <IconComp size={14} className="shrink-0" />
                <span className="sm:hidden">{label}</span>
                <span className="hidden sm:inline">{fullLabel}</span>
              </button>
            ))}
          </div>

          {/* Hub Content Panels */}
          <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-2xl backdrop-blur-xl min-h-[360px]">
            
            {/* TAB 1: SUPPORT TICKET HELPDESK */}
            {hubTab === 'ticket' && (
              <motion.form
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleTicketSubmit}
                className="max-w-2xl mx-auto space-y-4"
              >
                <div className="text-center space-y-1 pb-2">
                  <h3 className="text-lg font-black text-white font-heading">Submit Support Helpdesk Ticket</h3>
                  <p className="text-xs text-slate-400">Need help from moderators or admins? We will receive your inquiry directly.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase">Category *</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111624] border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                    >
                      <option value="General Support">General Support / Question</option>
                      <option value="Report Player">Report Member / Misconduct</option>
                      <option value="Bug Report">Technical Bug / Issue</option>
                      <option value="Role Assistance">Role &amp; Leveling Perks</option>
                      <option value="Billing / Partner">Partnership &amp; Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase">Your Discord Tag (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. username#0000 or @handle"
                      value={ticketUsername}
                      onChange={(e) => setTicketUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">Subject Title *</label>
                  <input
                    type="text"
                    placeholder="Brief summary of your inquiry..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">Detailed Explanation *</label>
                  <textarea
                    rows={4}
                    placeholder="Describe what happened or what you need assistance with..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Media Evidence & Attachments (Screenshots, MP4/WebM Recordings) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center gap-1.5">
                      <IconPhoto size={14} className="text-pink-400" />
                      <span>Evidence &amp; Media Attachments (Optional)</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {ticketAttachments.length}/5 attached (Images &amp; Videos)
                    </span>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />

                  {/* Upload Button */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={uploadingAttachment || ticketAttachments.length >= 5}
                      className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 text-xs font-bold text-slate-200 hover:text-pink-300 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <IconUpload size={15} />
                      <span>{uploadingAttachment ? 'Uploading Media...' : 'Attach Image or Video'}</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      PNG, JPG, GIF, MP4, WebM (up to 50MB)
                    </span>
                  </div>

                  {/* Attachment Previews Grid */}
                  {ticketAttachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {ticketAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-black/40 border border-white/10 relative group flex flex-col justify-between overflow-hidden"
                        >
                          <div className="h-20 rounded-lg overflow-hidden relative bg-black/60 flex items-center justify-center mb-1.5">
                            {att.type === 'video' ? (
                              <video
                                src={att.url}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-full object-cover"
                              />
                            )}

                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-black/70 text-white uppercase">
                              {att.type}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-slate-300 truncate flex-1">
                              {att.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove Attachment"
                            >
                              <IconTrash size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    loading={submittingTicket}
                    leftIcon={<IconSend size={15} />}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 shadow-xl font-bold cursor-pointer"
                  >
                    Submit Support Ticket
                  </Button>
                </div>
              </motion.form>
            )}

            {/* TAB 2: SUBMIT APPEAL */}
            {hubTab === 'appeal' && (
              <motion.form
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAppealSubmit}
                className="max-w-2xl mx-auto space-y-4"
              >
                <div className="text-center space-y-1 pb-2">
                  <h3 className="text-lg font-black text-white font-heading">Submit Punishment Appeal</h3>
                  <p className="text-xs text-slate-400">Banned, muted, or timed out? Submit an official appeal request to the moderation team.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase">Punishment Type *</label>
                    <select
                      value={appealType}
                      onChange={(e) => setAppealType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111624] border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                    >
                      <option value="Ban">Server Ban</option>
                      <option value="Mute">Server Mute</option>
                      <option value="Timeout">Timeout</option>
                      <option value="Warning">Warning</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase">Your Discord Username / ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. username or 123456789"
                      value={appealUsername}
                      onChange={(e) => setAppealUsername(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">Appeal Reason &amp; Statement *</label>
                  <textarea
                    rows={5}
                    placeholder="Explain why you believe the punishment should be reconsidered and any context..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    loading={submittingAppeal}
                    leftIcon={<IconScale size={15} />}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 shadow-xl font-bold cursor-pointer"
                  >
                    Submit Official Appeal
                  </Button>
                </div>
              </motion.form>
            )}

            {/* TAB 3: STAFF SHOWCASE */}
            {hubTab === 'staff' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="text-center space-y-1 pb-3">
                  <h3 className="text-lg font-black text-white font-heading">Server Leadership &amp; Staff</h3>
                  <p className="text-xs text-slate-400">Our dedicated team of administrators and community moderators.</p>
                </div>

                {hubInfo?.staff && hubInfo.staff.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {hubInfo.staff.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-pink-500/40 transition-all flex items-center gap-3.5 shadow-lg group"
                      >
                        <div className="relative">
                          <img
                            src={m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                            alt={m.username}
                            className="w-12 h-12 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform"
                          />
                          {m.isOwner && (
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black p-0.5 rounded-full shadow" title="Server Owner">
                              <IconCrown size={12} />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                            {m.globalName || m.username}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">@{m.username}</div>
                          <div className="mt-1">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono inline-block truncate"
                              style={{ backgroundColor: `${m.roleColor}20`, color: m.roleColor || '#A855F7', border: `1px solid ${m.roleColor}40` }}
                            >
                              {m.roleName}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 text-xs font-mono">
                    Staff roster syncing from Discord Gateway...
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 4: KNOWLEDGEBASE & FAQ */}
            {hubTab === 'faq' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-3">
                <div className="text-center space-y-1 pb-3">
                  <h3 className="text-lg font-black text-white font-heading">Frequently Asked Questions</h3>
                  <p className="text-xs text-slate-400">Helpful guidelines, server commands, and community rules.</p>
                </div>

                {(hubInfo?.faqs || [
                  { q: 'How do I open a support ticket?', a: 'You can submit a ticket right here in the Community Hub or use /ticket in Discord.' },
                  { q: 'How do I submit an unban or unmute appeal?', a: 'Fill out the Appeal Form in the Member Hub with your Discord username and explanation.' },
                  { q: 'How do I get member roles and perks?', a: 'Head to #roles in Discord or participate in community chat to level up automatically!' },
                  { q: 'What is the server response time for tickets?', a: 'Staff typically respond within 15-30 minutes during active community hours.' },
                ]).map((faq, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-pink-300 transition-colors cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? <IconChevronUp size={16} className="text-pink-400 shrink-0" /> : <IconChevronDown size={16} className="text-slate-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Standalone Interactive Authors Footer ────────────────────── */}
      <Footer />
    </main>
  );
};

export default LoginPage;
