import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { 
  IconSparkles, 
  IconTicket, 
  IconScale, 
  IconUsers, 
  IconHelpCircle, 
  IconSend, 
  IconCheck, 
  IconChevronDown, 
  IconChevronUp, 
  IconBrandDiscord, 
  IconLogout, 
  IconShieldLock, 
  IconCrown, 
  IconActivity, 
  IconWifi, 
  IconArrowRight,
  IconAlertCircle,
  IconFileText,
  IconSearch,
  IconX,
  IconCopy,
  IconExternalLink,
  IconMessageDots
} from '@tabler/icons-react';
import { useAuthStore } from '../../stores/auth.ts';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Footer } from '../../components/Footer.tsx';
import { UserAvatar } from '../../components/discord/UserAvatar.tsx';
import { useNavigate, Link } from 'react-router-dom';

import { IconPhoto, IconUpload, IconTrash } from '@tabler/icons-react';
import { getAssetUrl, getAllAssets } from '../../lib/assetStore.ts';
import { initThemeEngine } from '../../lib/themeEngine.ts';

interface StaffRole {
  name: string;
  color: string;
}

interface StaffMember {
  id: string;
  username: string;
  globalName: string;
  avatar: string | null;
  banner?: string | null;
  isOwner: boolean;
  roleName: string;
  roleColor: string;
  roles?: StaffRole[];
  joinedAt?: string | null;
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
  applicationsEnabled?: boolean;
}

const StaffMasterDetail: React.FC<{
  staffList: StaffMember[];
  selectedStaff: StaffMember | null;
  onSelectStaff: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCopyId: (id: string) => void;
  copiedId: boolean;
  onRequestTicket: () => void;
  onClose?: () => void;
  isModal?: boolean;
}> = ({
  staffList,
  selectedStaff,
  onSelectStaff,
  searchQuery,
  onSearchChange,
  onCopyId,
  copiedId,
  onRequestTicket,
  onClose,
  isModal = false,
}) => {
  const filtered = staffList.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.username.toLowerCase().includes(q) ||
      (m.globalName && m.globalName.toLowerCase().includes(q)) ||
      m.roleName.toLowerCase().includes(q) ||
      m.id.includes(q)
    );
  });

  const active = selectedStaff || filtered[0] || staffList[0] || null;

  return (
    <div className={`rounded-3xl bg-[#0E1320] border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row ${isModal ? 'max-h-[85vh] w-full' : 'min-h-[500px]'}`}>
      {/* LEFT COLUMN: STAFF LIST */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-black/40 shrink-0 max-h-[300px] md:max-h-none">
        {/* Search header */}
        <div className="p-3.5 border-b border-white/[0.08] flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <IconX size={12} />
              </button>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            {filtered.length} Staff
          </span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono">
              No staff members match search
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = active?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectStaff(m.id)}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-pink-500/50 text-white shadow-lg'
                      : 'hover:bg-white/[0.04] border-transparent text-slate-300'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                      alt={m.username}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                    />
                    {m.isOwner && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-black p-0.5 rounded-full shadow" title="Server Owner">
                        <IconCrown size={10} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white font-heading' : 'text-slate-200'}`}>
                        {m.globalName || m.username}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">@{m.username}</div>
                    <div className="mt-1">
                      <span
                        className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono inline-block truncate max-w-[140px]"
                        style={{ backgroundColor: `${m.roleColor}20`, color: m.roleColor || '#EC4899', border: `1px solid ${m.roleColor}40` }}
                      >
                        {m.roleName}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SELECTED STAFF OPTIONS & PROFILE */}
      <div className="flex-1 flex flex-col overflow-y-auto relative bg-[#0E1320]">
        {/* Close Button if Modal */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-30 p-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer backdrop-blur-md"
            title="Close"
          >
            <IconX size={16} />
          </button>
        )}

        {active ? (
          <div>
            {/* Header Banner / Wallpaper */}
            <div className="h-32 sm:h-44 w-full relative overflow-hidden bg-gradient-to-r from-pink-600/30 via-purple-600/20 to-indigo-600/30">
              {active.banner ? (
                <img
                  src={active.banner}
                  alt="Banner"
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div
                  className="w-full h-full opacity-30"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, ${active.roleColor}60 0%, transparent 60%)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E1320] via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* Profile Body */}
            <div className="p-5 sm:p-7 -mt-12 sm:-mt-16 relative z-10 space-y-5">
              
              {/* Avatar + Main Quick Actions */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="relative">
                  <img
                    src={active.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={active.username}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-4 ring-[#0E1320] shadow-2xl"
                    style={{ border: `2px solid ${active.roleColor || '#EC4899'}` }}
                  />
                  {active.isOwner && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black p-1 rounded-full shadow-lg" title="Server Owner">
                      <IconCrown size={14} />
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://discord.com/users/${active.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#5865F2] hover:text-white text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg"
                  >
                    <IconBrandDiscord size={16} />
                    <span>Message on Discord</span>
                    <IconExternalLink size={12} />
                  </a>

                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<IconTicket size={14} />}
                    onClick={onRequestTicket}
                    className="font-bold text-xs"
                  >
                    Inquire via Ticket
                  </Button>
                </div>
              </div>

              {/* Name & Identity */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight">
                    {active.globalName || active.username}
                  </h2>
                  {active.isOwner && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <IconCrown size={12} />
                      Server Owner
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>@{active.username}</span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => onCopyId(active.id)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-slate-400"
                    title="Click to copy Discord ID"
                  >
                    <span>ID: {active.id}</span>
                    {copiedId ? <IconCheck size={13} className="text-emerald-400" /> : <IconCopy size={13} />}
                  </button>
                </div>
              </div>

              {/* Primary Role Option Showcase */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Staff Role &amp; Permission Tier
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono inline-flex items-center gap-2 shadow-md"
                    style={{
                      backgroundColor: `${active.roleColor}25`,
                      color: active.roleColor || '#EC4899',
                      border: `1px solid ${active.roleColor}50`,
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: active.roleColor || '#EC4899' }} />
                    {active.roleName}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {active.isOwner ? 'Full Server Ownership & Cluster Control' : 'Authorized Server Leadership & Moderation Team'}
                  </span>
                </div>
              </div>

              {/* Server Roles Assigned */}
              {active.roles && active.roles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Guild Roles ({active.roles.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {active.roles.map((r, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold inline-flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${r.color}18`,
                          color: r.color,
                          border: `1px solid ${r.color}35`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Responsibilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Moderation &amp; Enforcement</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Resolves player misbehavior, handles sanctions, and maintains server order.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🎫</span>
                    <span>Support Ticket Assistance</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Responds to community inquiries and technical support tickets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-400 text-xs font-mono">
            Select a staff member from the left to view profile details.
          </div>
        )}
      </div>
    </div>
  );
};

export const CommunityHubPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const pageRef = usePageEntrance();

  const [hubInfo, setHubInfo] = useState<HubInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'ticket' | 'appeal' | 'apply' | 'staff' | 'faq'>('ticket');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Background Media Wallpaper State
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgIsVideo, setBgIsVideo] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(40);
  const [bgBlur, setBgBlur] = useState(2);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<string>('General Support');
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketDescription, setTicketDescription] = useState<string>('');
  const [ticketUsername, setTicketUsername] = useState<string>(user?.username || '');
  const [ticketAttachments, setTicketAttachments] = useState<Array<{ name: string; url: string; size: number; type: 'image' | 'video' }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState<boolean>(false);

  // Appeal Form State
  const [appealType, setAppealType] = useState<string>('Ban');
  const [appealUsername, setAppealUsername] = useState<string>(user?.username || '');
  const [appealReason, setAppealReason] = useState<string>('');
  const [submittingAppeal, setSubmittingAppeal] = useState<boolean>(false);

  // Staff Interactive Modal & Showcase State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [copiedStaffId, setCopiedStaffId] = useState(false);

  const activeStaff = (hubInfo?.staff && selectedStaffId)
    ? (hubInfo.staff.find((s) => s.id === selectedStaffId) || hubInfo.staff[0])
    : (hubInfo?.staff?.[0] || null);

  const handleCopyStaffId = (id: string) => {
    navigator.clipboard?.writeText?.(id);
    setCopiedStaffId(true);
    showToast({ title: 'Copied ID', message: `Discord ID ${id} copied to clipboard`, type: 'info' });
    setTimeout(() => setCopiedStaffId(false), 2000);
  };

  const openStaffDirectory = (staffId?: string) => {
    if (staffId) {
      setSelectedStaffId(staffId);
    } else if (!selectedStaffId && hubInfo?.staff?.[0]) {
      setSelectedStaffId(hubInfo.staff[0].id);
    }
    setIsStaffModalOpen(true);
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
    if (user?.username) {
      if (!ticketUsername) setTicketUsername(user.username);
      if (!appealUsername) setAppealUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/hub/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((hub) => {
        if (hub) {
          setHubInfo(hub);
          if (hub.staff && hub.staff.length > 0) {
            setSelectedStaffId((prev) => prev || hub.staff[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

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
          username: ticketUsername.trim() || user?.username || undefined,
          attachments: ticketAttachments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ title: 'Ticket Submitted', message: 'Your support ticket has been forwarded to server staff.', type: 'success' });
        setTicketSubject('');
        setTicketDescription('');
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

  const displayName = hubInfo?.guildName || hubInfo?.botUsername || 'Community Server';

  return (
    <main ref={pageRef} className="min-h-screen w-full bg-[#06080E] text-slate-100 flex flex-col justify-between p-3 sm:p-4 md:p-8 relative overflow-x-hidden select-none font-sans">
      
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-pink-600/[0.07] blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-indigo-500/[0.05] blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,8,14,0.92)_100%)]" />
      </div>

      {/* ── Top Header Navigation Bar ───────────────────────────────── */}
      <div className="relative z-20 max-w-5xl mx-auto w-full pt-1 pb-3 sm:pb-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/20 overflow-hidden">
            {hubInfo?.guildIcon ? (
              <img src={hubInfo.guildIcon} alt="Guild" className="w-full h-full object-cover" />
            ) : (
              <IconSparkles size={18} className="text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white font-heading truncate">{displayName}</div>
            <div className="text-[9px] sm:text-[10px] font-mono text-pink-400">Community Member Hub</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
              <UserAvatar id={user.id} avatar={user.avatar} username={user.username} size="sm" />
              <div className="hidden md:flex flex-col text-left pr-1 min-w-0">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">{user.globalName || user.username}</span>
                <span className="text-[9px] font-mono text-slate-400">{user.isAdmin ? 'Admin' : 'Member'}</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconShieldLock size={13} />}
                onClick={() => navigate('/')}
                className="font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1"
              >
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Button>


              <button
                type="button"
                onClick={() => logout()}
                className="p-1 sm:p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <IconLogout size={15} />
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<IconBrandDiscord size={15} />}
              onClick={() => { window.location.href = '/auth/discord'; }}
              className="font-bold text-xs bg-[#5865F2] hover:bg-[#4752C4]"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Community Hub Stage ───────────────────────────────── */}
      <div className="relative z-10 max-w-5xl w-full mx-auto my-auto space-y-4 sm:space-y-5 py-2">
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
                  MEMBER SELF-SERVICE CENTER
                </span>
                {hubInfo?.memberCount ? (
                  <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {hubInfo.memberCount.toLocaleString()} Members
                  </span>
                ) : null}
                {hubInfo?.staff && hubInfo.staff.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openStaffDirectory()}
                    className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-colors cursor-pointer"
                  >
                    {hubInfo.staff.length} Staff
                  </button>
                ) : null}
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight font-heading truncate mt-1 drop-shadow-md">
                {displayName}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5 truncate drop-shadow-sm">
                Official community portal for tickets, appeals, and staff directory.
              </p>
            </div>
          </div>

          {/* Quick Staff Roster / Avatars Stack on the Right Side of the Banner */}
          {hubInfo?.staff && hubInfo.staff.length > 0 && (
            <div className="relative z-10 flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shrink-0">
              <div className="flex -space-x-2 overflow-hidden">
                {hubInfo.staff.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openStaffDirectory(s.id)}
                    className="focus:outline-none transition-transform hover:scale-110 hover:z-20 cursor-pointer"
                    title={`${s.globalName || s.username} (${s.roleName})`}
                  >
                    <img
                      src={s.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                      alt={s.username}
                      className="inline-block w-8 h-8 rounded-full ring-2 ring-[#0E1320] object-cover"
                    />
                  </button>
                ))}
                {hubInfo.staff.length > 4 && (
                  <button
                    type="button"
                    onClick={() => openStaffDirectory()}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600/40 border border-violet-500/40 text-violet-200 text-[10px] font-bold ring-2 ring-[#0E1320] hover:bg-violet-600/60 transition-colors cursor-pointer"
                  >
                    +{hubInfo.staff.length - 4}
                  </button>
                )}
              </div>
              <div className="text-left pr-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{hubInfo.staff.length} Staff Members</span>
                </div>
                <button
                  type="button"
                  onClick={() => openStaffDirectory()}
                  className="text-[10px] font-mono text-pink-400 hover:text-pink-300 hover:underline transition-colors block cursor-pointer"
                >
                  Meet the Staff →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs (2x2 on small mobile, row on tablet/desktop) */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
          {[
            { key: 'ticket', label: 'Support Ticket', fullLabel: 'Support Tickets', icon: IconTicket },
            { key: 'appeal', label: 'Submit Appeal', fullLabel: 'Sanction Appeals', icon: IconScale },
            ...(hubInfo?.applicationsEnabled ? [{ key: 'apply', label: 'Applications', fullLabel: 'Applications & Forms', icon: IconFileText }] : []),
            { key: 'staff', label: 'Server Staff', fullLabel: 'Meet Server Staff', icon: IconUsers },
            { key: 'faq', label: 'FAQ / Rules', fullLabel: 'Knowledgebase & FAQ', icon: IconHelpCircle },
          ].map(({ key, label, fullLabel, icon: IconComp }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold font-heading flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === key
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

        {/* Hub Tab Content */}
        <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-2xl backdrop-blur-xl min-h-[360px]">
          
          {/* TAB 1: SUPPORT TICKET HELPDESK */}
          {activeTab === 'ticket' && (
            <motion.form
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleTicketSubmit}
              className="max-w-2xl mx-auto space-y-4"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-lg font-black text-white font-heading">Submit Support Helpdesk Ticket</h3>
                  <p className="text-xs text-slate-400">Need help from moderators or admins? We will receive your inquiry directly in Discord.</p>
                </div>
                <Link
                  to="/hub/tickets"
                  className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold font-mono shrink-0 flex items-center gap-1.5 transition-all"
                >
                  <span>Dedicated Portal</span>
                  <IconArrowRight size={13} />
                </Link>
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
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">Discord Username</label>
                  <input
                    type="text"
                    placeholder="e.g. username or @handle"
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
          {activeTab === 'appeal' && (
            <motion.form
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAppealSubmit}
              className="max-w-2xl mx-auto space-y-4"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-lg font-black text-white font-heading">Submit Punishment Appeal</h3>
                  <p className="text-xs text-slate-400">Banned, muted, or timed out? Submit an official appeal request to the moderation team.</p>
                </div>
                <Link
                  to="/hub/appeals"
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono shrink-0 flex items-center gap-1.5 transition-all"
                >
                  <span>Dedicated Portal</span>
                  <IconArrowRight size={13} />
                </Link>
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
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">Discord Username / ID *</label>
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
                <label className="text-xs font-bold text-slate-300 font-mono uppercase">Appeal Statement &amp; Explanation *</label>
                <textarea
                  rows={5}
                  placeholder="Explain why you believe the punishment should be reconsidered..."
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

          {/* TAB: APPLICATIONS & FORMS (ENABLED VIA SERVER SETTINGS) */}
          {activeTab === 'apply' && hubInfo?.applicationsEnabled && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-lg font-black text-white font-heading">Community Applications &amp; Forms</h3>
                  <p className="text-xs text-slate-400">Apply for staff, whitelist, creator, or custom commissions via our web portal.</p>
                </div>
                <Link
                  to="/apply"
                  className="px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-bold font-mono shrink-0 flex items-center gap-1.5 transition-all"
                >
                  <span>Dedicated Portal</span>
                  <IconArrowRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'staff', label: 'Staff Application', desc: 'Apply to join our moderation and admin team', emoji: '🛡️' },
                  { key: 'whitelist', label: 'Whitelist Access', desc: 'Apply for whitelist access to community servers', emoji: '📋' },
                  { key: 'creator', label: 'Content Creator', desc: 'Partner with our community and get creator role', emoji: '🎬' },
                  { key: 'custom', label: 'General Application', desc: 'Submit an open application for other positions', emoji: '✨' },
                ].map((item) => (
                  <Link
                    key={item.key}
                    to={`/apply/${hubInfo?.guildId || 'default'}/${item.key}`}
                    className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-pink-500/40 transition-all flex items-start gap-4 shadow-lg group hover:bg-white/[0.02]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                      {item.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                        {item.label}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-pink-400 group-hover:translate-x-1 transition-transform">
                        <span>Open Application</span>
                        <IconArrowRight size={12} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: STAFF SHOWCASE */}
          {activeTab === 'staff' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-lg font-black text-white font-heading">Server Leadership &amp; Meet the Staff</h3>
                  <p className="text-xs text-slate-400">Select a staff member from the left list to view their custom profile, roles, and direct contacts.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconUsers size={14} />}
                  onClick={() => openStaffDirectory(activeStaff?.id)}
                  className="font-bold text-xs shrink-0 self-start sm:self-auto"
                >
                  Launch Fullscreen Modal
                </Button>
              </div>

              {hubInfo?.staff && hubInfo.staff.length > 0 ? (
                <StaffMasterDetail
                  staffList={hubInfo.staff}
                  selectedStaff={activeStaff}
                  onSelectStaff={(id) => setSelectedStaffId(id)}
                  searchQuery={staffSearchQuery}
                  onSearchChange={(q) => setStaffSearchQuery(q)}
                  onCopyId={handleCopyStaffId}
                  copiedId={copiedStaffId}
                  onRequestTicket={() => {
                    setTicketCategory('General Support');
                    setActiveTab('ticket');
                  }}
                />
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs font-mono">
                  Staff roster syncing from Discord Gateway...
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: KNOWLEDGEBASE & FAQ */}
          {activeTab === 'faq' && (
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
      </div>

      {/* ── Meet the Staff Interactive Modal ──────────────────────── */}
      <AnimatePresence>
        {isStaffModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsStaffModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl relative"
            >
              <StaffMasterDetail
                staffList={hubInfo?.staff || []}
                selectedStaff={activeStaff}
                onSelectStaff={(id) => setSelectedStaffId(id)}
                searchQuery={staffSearchQuery}
                onSearchChange={(q) => setStaffSearchQuery(q)}
                onCopyId={handleCopyStaffId}
                copiedId={copiedStaffId}
                onRequestTicket={() => {
                  setIsStaffModalOpen(false);
                  setTicketCategory('General Support');
                  setActiveTab('ticket');
                }}
                onClose={() => setIsStaffModalOpen(false)}
                isModal={true}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Standalone Universal Footer ────────────────────────────── */}
      <Footer />
    </main>
  );
};

export default CommunityHubPage;
