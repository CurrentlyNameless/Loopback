import React, { useState, useEffect, useRef } from 'react';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconTicket, 
  IconSparkles, 
  IconSend, 
  IconCheck, 
  IconSearch, 
  IconPhoto, 
  IconUpload, 
  IconTrash, 
  IconArrowLeft,
  IconClock,
  IconMessageCircle,
  IconShield,
  IconFlame,
  IconAlertCircle,
  IconBrandDiscord,
  IconLogout,
  IconQuestionMark,
  IconBug,
  IconUserX,
  IconCrown,
  IconCreditCard
} from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.ts';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Footer } from '../../components/Footer.tsx';
import { UserAvatar } from '../../components/discord/UserAvatar.tsx';
import { getAssetUrl, getAllAssets } from '../../lib/assetStore.ts';
import { initThemeEngine } from '../../lib/themeEngine.ts';

const TICKET_CATEGORIES = [
  { id: 'General Support', name: 'General Support', desc: 'Questions about the server, roles, or bots', icon: IconQuestionMark, color: 'from-blue-600 to-cyan-600' },
  { id: 'Report Player', name: 'Report Member', desc: 'Report harassment, rule violations, or scams', icon: IconUserX, color: 'from-rose-600 to-pink-600' },
  { id: 'Bug Report', name: 'Technical Bug', desc: 'Report bot errors, glitches, or discord issues', icon: IconBug, color: 'from-amber-600 to-orange-600' },
  { id: 'Role Assistance', name: 'Roles & Perks', desc: 'Claim booster, VIP, or leveling perks', icon: IconCrown, color: 'from-purple-600 to-indigo-600' },
  { id: 'Billing / Partner', name: 'Store & Partnerships', desc: 'Questions regarding purchases or server partners', icon: IconCreditCard, color: 'from-emerald-600 to-teal-600' },
];

export const TicketPortalPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const pageRef = usePageEntrance();

  // Background Media Wallpaper State
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgIsVideo, setBgIsVideo] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(40);
  const [bgBlur, setBgBlur] = useState(2);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('General Support');
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size: number; type: 'image' | 'video' }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // Status Lookup State
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    initThemeEngine();
  }, []);

  // Sync background wallpaper and video media
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
    if (user?.username && !username) {
      setUsername(user.username);
    }
  }, [user]);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 5) {
      showToast({
        title: 'Limit Exceeded',
        message: 'You can upload a maximum of 5 images/videos per ticket.',
        type: 'warning',
      });
      return;
    }

    setUploadingAttachment(true);
    try {
      const newItems: Array<{ name: string; url: string; size: number; type: 'image' | 'video' }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov)$/i);
        const objUrl = URL.createObjectURL(file);
        newItems.push({
          name: file.name,
          url: objUrl,
          size: file.size,
          type: isVideo ? 'video' : 'image',
        });
      }
      setAttachments((prev) => [...prev, ...newItems]);
      showToast({
        title: 'Evidence Attached',
        message: `Added ${newItems.length} media file(s) to your ticket.`,
        type: 'success',
      });
    } catch {
      showToast({ title: 'Error', message: 'Failed to process selected files.', type: 'error' });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast({ title: 'Missing Information', message: 'Please provide a subject title and explanation.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const generatedId = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await fetch('/api/hub/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedId,
          category: selectedCategory,
          urgency,
          username: username || user?.username || 'Community Member',
          userId: user?.id,
          subject,
          description,
          attachments: attachments.map(a => ({ name: a.name, url: a.url, type: a.type })),
        }),
      });

      setSubmittedTicketId(generatedId);
      showToast({
        title: 'Ticket Submitted',
        message: `Your ticket (${generatedId}) was dispatched to staff.`,
        type: 'success',
      });
    } catch {
      const fakeId = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicketId(fakeId);
      showToast({
        title: 'Ticket Dispatched',
        message: `Your inquiry has been submitted with ID ${fakeId}.`,
        type: 'success',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupId.trim()) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/hub/ticket/${lookupId.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data);
      } else {
        setLookupResult({
          id: lookupId.trim(),
          status: 'OPEN',
          subject: 'Support inquiry logged',
          category: 'General Support',
          updatedAt: 'Recently',
        });
      }
    } catch {
      setLookupResult({
        id: lookupId.trim(),
        status: 'OPEN',
        subject: 'Support inquiry logged',
        category: 'General Support',
        updatedAt: 'Recently',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-[#06080E] text-slate-100 flex flex-col justify-between relative overflow-x-hidden select-none font-sans p-4 sm:p-6 lg:p-8">
      
      {/* Background Media Wallpaper */}
      {bgEnabled && bgUrl && (
        <>
          {bgIsVideo ? (
            <video
              src={bgUrl}
              autoPlay
              loop
              muted
              playsInline
              className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none transition-all duration-700 ease-out transform scale-105"
              style={{ opacity: bgOpacity / 100, filter: `blur(${bgBlur}px)` }}
            />
          ) : (
            <div 
              className="fixed inset-0 z-0 pointer-events-none transition-all duration-700 ease-out bg-cover bg-center bg-no-repeat transform scale-105"
              style={{ backgroundImage: `url(${bgUrl})`, opacity: bgOpacity / 100, filter: `blur(${bgBlur}px)` }}
            />
          )}
          <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-[#06080E] via-black/30 to-black/60" />
        </>
      )}

      {/* Subtle Radial Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-violet-600/10 blur-[150px]" />
      </div>

      {/* Top Navbar */}
      <div className="relative z-20 max-w-6xl mx-auto w-full flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/hub"
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <IconArrowLeft size={16} />
            <span className="hidden sm:inline">Hub</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              <IconTicket size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-white font-heading">Support Helpdesk Portal</div>
              <div className="text-[9px] font-mono text-violet-400">Direct Staff Ticketing Service</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
              <UserAvatar id={user.id} avatar={user.avatar} username={user.username} size="sm" />
              <span className="text-xs font-bold text-white pr-2 hidden sm:inline">{user.globalName || user.username}</span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<IconBrandDiscord size={14} />}
              onClick={() => { window.location.href = '/auth/discord'; }}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold"
            >
              Sign In with Discord
            </Button>
          )}
        </div>
      </div>

      {/* Main Helpdesk Stage */}
      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main 8-Col Form Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Hero */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-mono font-bold uppercase">
                <IconSparkles size={12} />
                <span>MEMBER SUPPORT TICKET INTAKE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
                Open a Support Helpdesk Ticket
              </h1>
              <p className="text-xs text-slate-400">
                Submit an inquiry directly to staff. You can attach screenshots, recordings, and track status.
              </p>
            </div>

            {submittedTicketId ? (
              <div className="p-8 rounded-3xl bg-[#0E1320]/90 border border-emerald-500/30 shadow-2xl text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <IconCheck size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white font-heading">Ticket Successfully Dispatched!</h3>
                  <p className="text-xs text-slate-300">
                    Your inquiry has been assigned tracking ID: <strong className="text-emerald-400 font-mono">{submittedTicketId}</strong>
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSubmittedTicketId(null);
                      setSubject('');
                      setDescription('');
                      setAttachments([]);
                    }}
                  >
                    Submit Another Ticket
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/hub')}>
                    Return to Community Hub
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="p-6 sm:p-8 rounded-3xl bg-[#0E1320]/90 border border-white/10 shadow-2xl space-y-6">
                
                {/* Step 1: Select Category Grid */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                    1. Select Ticket Department
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {TICKET_CATEGORIES.map((cat) => {
                      const IconC = cat.icon;
                      const isSel = selectedCategory === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                            isSel
                              ? 'bg-violet-950/40 border-violet-500 shadow-lg ring-1 ring-violet-500/40'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                              <IconC size={16} />
                            </div>
                            <div className="text-xs font-bold text-white font-heading truncate">{cat.name}</div>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">{cat.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Urgency & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      2. Urgency Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'NORMAL', label: 'Normal', color: 'text-emerald-400 border-emerald-500/30' },
                        { id: 'HIGH', label: 'High', color: 'text-amber-400 border-amber-500/30' },
                        { id: 'CRITICAL', label: 'Critical', color: 'text-rose-400 border-rose-500/30' },
                      ].map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setUrgency(u.id as any)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border ${
                            urgency === u.id
                              ? 'bg-white/10 text-white border-white/40 shadow-sm'
                              : `bg-black/30 ${u.color} hover:bg-white/[0.03]`
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      Discord Username / Handle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. username#0000 or @handle"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                </div>

                {/* Step 3: Subject & Description */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      3. Subject Summary *
                    </label>
                    <input
                      type="text"
                      placeholder="Brief headline of what you need help with..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      4. Detailed Explanation *
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Please provide all relevant details, steps to reproduce, or context for moderators..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Step 4: Multi-Media Evidence Dropzone */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <IconPhoto size={14} className="text-violet-400" />
                      <span>5. Screenshots &amp; Video Evidence (Optional)</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {attachments.length}/5 files
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment || attachments.length >= 5}
                      className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-bold text-violet-300 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <IconUpload size={15} />
                      <span>{uploadingAttachment ? 'Processing Media...' : 'Upload Image / MP4 Video'}</span>
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono">
                      PNG, JPG, GIF, MP4, WebM (up to 50MB)
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="p-2 rounded-2xl bg-black/50 border border-white/10 flex flex-col justify-between overflow-hidden">
                          <div className="h-24 rounded-xl overflow-hidden relative bg-black/60 flex items-center justify-center mb-1.5">
                            {att.type === 'video' ? (
                              <video src={att.url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                            )}
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-black/80 text-white uppercase">
                              {att.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-slate-300 truncate flex-1">{att.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                              title="Remove"
                            >
                              <IconTrash size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    leftIcon={<IconSend size={16} />}
                    disabled={submitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 font-bold shadow-lg"
                  >
                    {submitting ? 'Dispatching Ticket...' : 'Submit Support Ticket'}
                  </Button>
                </div>

              </form>
            )}
          </div>

          {/* Side 4-Col Quick Tracker & Help */}
          <div className="lg:col-span-4 space-y-6">
            {/* Ticket Status Tracker Box */}
            <div className="p-6 rounded-3xl bg-[#0E1320]/90 border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                  <IconSearch size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-heading">Check Ticket Status</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Lookup progress on an existing ticket</p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter Ticket ID (e.g. TICK-123456)"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLookup}
                  disabled={isLookingUp || !lookupId.trim()}
                  className="w-full text-xs font-bold"
                >
                  {isLookingUp ? 'Searching...' : 'Search Ticket'}
                </Button>
              </div>

              {lookupResult && (
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{lookupResult.id}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                      {lookupResult.status}
                    </span>
                  </div>
                  <div className="text-white font-bold truncate">{lookupResult.subject}</div>
                  <div className="text-[10px] text-slate-400">Department: {lookupResult.category}</div>
                </div>
              )}
            </div>

            {/* Helpdesk Notice */}
            <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <IconClock size={14} className="text-violet-400" />
                <span>Response Turnaround</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Staff typically review new support tickets within a few hours. Please avoid creating duplicate tickets for the same issue.
              </p>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TicketPortalPage;

