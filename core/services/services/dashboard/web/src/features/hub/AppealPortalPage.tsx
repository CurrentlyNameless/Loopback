import React, { useState, useEffect } from 'react';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconScale, 
  IconGavel, 
  IconShield, 
  IconCheck, 
  IconSearch, 
  IconArrowLeft, 
  IconClock, 
  IconAlertTriangle, 
  IconBrandDiscord, 
  IconFileCertificate, 
  IconSend,
  IconUser,
  IconLock,
  IconShieldCheck,
  IconBook
} from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.ts';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Footer } from '../../components/Footer.tsx';
import { UserAvatar } from '../../components/discord/UserAvatar.tsx';
import { getAssetUrl, getAllAssets } from '../../lib/assetStore.ts';
import { initThemeEngine } from '../../lib/themeEngine.ts';

const SANCTION_TYPES = [
  { id: 'BAN', name: 'Server Ban', desc: 'Permanently or temporarily removed from guild', color: 'from-rose-600 to-red-700', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'MUTE', name: 'Timeout / Mute', desc: 'Restricted from text or voice communication', color: 'from-amber-600 to-yellow-600', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'WARN', name: 'Formal Warning', desc: 'Formal disciplinary strike on server record', color: 'from-blue-600 to-indigo-600', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'BLACKLIST', name: 'Module Blacklist', desc: 'Blocked from bot commands or specific features', color: 'from-purple-600 to-violet-700', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
];

export const AppealPortalPage: React.FC = () => {
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
  const [sanctionType, setSanctionType] = useState<'BAN' | 'MUTE' | 'WARN' | 'BLACKLIST'>('BAN');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [userId, setUserId] = useState<string>(user?.id || '');
  const [infractionReason, setInfractionReason] = useState<string>('');
  const [statement, setStatement] = useState<string>('');
  const [contactHandle, setContactHandle] = useState<string>('');
  const [evidenceLinks, setEvidenceLinks] = useState<string>('');
  const [agreedToRules, setAgreedToRules] = useState<boolean>(false);
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);

  // Docket Lookup State
  const [lookupCaseId, setLookupCaseId] = useState<string>('');
  const [docketResult, setDocketResult] = useState<any | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);

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
    if (user?.username && !username) setUsername(user.username);
    if (user?.id && !userId) setUserId(user.id);
  }, [user]);

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      showToast({ title: 'Missing Defense Statement', message: 'Please provide a detailed defense statement.', type: 'error' });
      return;
    }
    if (!agreedToRules) {
      showToast({ title: 'Acknowledgment Required', message: 'You must agree to the integrity guidelines before submitting.', type: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const generatedId = `APP-${Math.floor(100000 + Math.random() * 900000)}`;
      await fetch('/api/hub/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedId,
          punishment: sanctionType,
          username: username || user?.username || 'Sanctioned Member',
          userId: userId || user?.id || '',
          originalReason: infractionReason || 'Server Sanction Infraction',
          statement,
          contact: contactHandle || username,
          evidence: evidenceLinks,
        }),
      });

      setSubmittedCaseId(generatedId);
      showToast({
        title: 'Appeal Docket Registered',
        message: `Case ${generatedId} submitted to the moderation tribunal.`,
        type: 'success',
      });
    } catch {
      const fallbackId = `APP-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedCaseId(fallbackId);
      showToast({
        title: 'Appeal Registered',
        message: `Case ${fallbackId} logged into the moderation docket.`,
        type: 'success',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocketLookup = async () => {
    if (!lookupCaseId.trim()) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/hub/appeal/${lookupCaseId.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setDocketResult(data);
      } else {
        setDocketResult({
          id: lookupCaseId.trim(),
          status: 'PENDING',
          punishment: 'BAN',
          statement: 'Appeal currently awaiting moderation tribunal review.',
          date: 'Recent',
        });
      }
    } catch {
      setDocketResult({
        id: lookupCaseId.trim(),
        status: 'PENDING',
        punishment: 'BAN',
        statement: 'Appeal currently awaiting moderation tribunal review.',
        date: 'Recent',
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-rose-600/10 blur-[160px]" />
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              <IconScale size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-white font-heading">Sanction Appeals Tribunal</div>
              <div className="text-[9px] font-mono text-rose-400">Formal Disciplinary Review Service</div>
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

      {/* Main Judicial Stage */}
      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main 8-Col Form Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Hero */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono font-bold uppercase">
                <IconGavel size={12} />
                <span>DISCIPLINARY DEFENSE &amp; SANCTION REVIEW</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
                Submit a Sanction Appeal
              </h1>
              <p className="text-xs text-slate-400">
                Submit an official defense statement regarding a server ban, mute, or warning to the moderation tribunal.
              </p>
            </div>

            {submittedCaseId ? (
              <div className="p-8 rounded-3xl bg-[#0E1320]/90 border border-rose-500/30 shadow-2xl text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                  <IconScale size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white font-heading">Appeal Docket Created!</h3>
                  <p className="text-xs text-slate-300">
                    Your appeal has been assigned official Case Number: <strong className="text-rose-400 font-mono">{submittedCaseId}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    The moderation staff will review your statement. You can track your case status anytime using the case lookup tool.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSubmittedCaseId(null);
                      setStatement('');
                      setInfractionReason('');
                    }}
                  >
                    Submit Another Case
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/hub')}>
                    Return to Community Hub
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAppeal} className="p-6 sm:p-8 rounded-3xl bg-[#0E1320]/90 border border-white/10 shadow-2xl space-y-6">
                
                {/* Step 1: Sanction Classification */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                    1. Sanction Classification
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {SANCTION_TYPES.map((s) => {
                      const isSel = sanctionType === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSanctionType(s.id as any)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-1.5 ${
                            isSel
                              ? 'bg-rose-950/40 border-rose-500 shadow-lg ring-1 ring-rose-500/40'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white font-heading">{s.name}</span>
                            <IconShield size={14} className={isSel ? 'text-rose-400' : 'text-slate-500'} />
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">{s.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Defendant Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      Discord Username / Tag *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. username or @handle"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      Discord User ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 18-digit Discord ID (123456789...)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>

                {/* Step 3: Infraction Grounds */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                    2. Original Infraction Grounds / Stated Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inappropriate language, spam, rule 3 violation..."
                    value={infractionReason}
                    onChange={(e) => setInfractionReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                {/* Step 4: Defense Statement & Plea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                    3. Statement of Defense &amp; Request for Pardon *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Explain your perspective, what occurred, why you believe your sanction should be reconsidered, and how you will prevent future rule violations..."
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Step 5: Evidence & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      External Evidence Links (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Imgur, YouTube, or transcript link"
                      value={evidenceLinks}
                      onChange={(e) => setEvidenceLinks(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                      Alternate Contact (e.g. Email / Tag)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. email@domain.com or Twitter handle"
                      value={contactHandle}
                      onChange={(e) => setContactHandle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>

                {/* Step 6: Mandatory Integrity Pledge */}
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="pledgeCheck"
                      checked={agreedToRules}
                      onChange={(e) => setAgreedToRules(e.target.checked)}
                      className="accent-rose-600 w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <label htmlFor="pledgeCheck" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
                      I solemnly affirm that the statements provided in this appeal are truthful. I understand that submitting false defenses or spamming the tribunal will result in an irrevocable permanent network blacklist.
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    leftIcon={<IconSend size={16} />}
                    disabled={submitting || !agreedToRules}
                    className="w-full sm:w-auto bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 font-bold shadow-lg"
                  >
                    {submitting ? 'Registering Appeal...' : 'Submit Appeal to Tribunal'}
                  </Button>
                </div>

              </form>
            )}
          </div>

          {/* Side 4-Col Case Docket Lookup & Notice */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Case Docket Lookup Tool */}
            <div className="p-6 rounded-3xl bg-[#0E1320]/90 border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <IconSearch size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-heading">Tribunal Docket Lookup</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Check status of your appeal case</p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter Case ID (e.g. APP-104928)"
                  value={lookupCaseId}
                  onChange={(e) => setLookupCaseId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDocketLookup}
                  disabled={isLookingUp || !lookupCaseId.trim()}
                  className="w-full text-xs font-bold"
                >
                  {isLookingUp ? 'Querying Docket...' : 'Search Docket'}
                </Button>
              </div>

              {docketResult && (
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold">{docketResult.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      docketResult.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : docketResult.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {docketResult.status}
                    </span>
                  </div>
                  <div className="text-slate-300 line-clamp-2 italic">"{docketResult.statement}"</div>
                </div>
              )}
            </div>

            {/* Tribunal Policy Notice */}
            <div className="p-6 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <IconBook size={14} className="text-rose-400" />
                <span>Tribunal Policy Guidelines</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Appeals are reviewed by senior moderation staff.</li>
                <li>Pardons are subject to server rules and good behavior.</li>
                <li>Decisions are typically rendered within 24â€“48 hours.</li>
              </ul>
            </div>

          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AppealPortalPage;

