import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import {
  IconShoppingBag,
  IconSearch,
  IconSparkles,
  IconCheck,
  IconDownload,
  IconRefresh,
  IconUpload,
  IconShieldLock,
  IconAlertCircle,
  IconArrowRight,
  IconX,
  IconFileZip,
  IconStar,
  IconStarFilled,
  IconEye,
  IconThumbUp,
  IconCopy,
  IconPhoto,
  IconCode,
  IconPackage,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconChevronRight,
  IconChevronLeft,
  IconFlame,
  IconSettings,
  IconTrash,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { useGuildStore } from '../../stores/guild.ts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModuleItem {
  id: string;
  label: string;
  icon: string;
  category: string;
  description: string;
  author?: string;
  color?: string;
  gradient?: string;
  hasCustomComponent?: boolean;
  hasCustomRoutes?: boolean;
  installed?: boolean;
  enabled?: boolean;
  licenseAllowed?: boolean;
  isCommunity?: boolean;
  requiredTier?: string;
  downloads?: number;
  version?: string;
  installedVersion?: string;
  hasUpdate?: boolean;
  defaultSchema?: Record<string, any>;
  dependencies?: string[];
  sizeBytes?: number;
  avgRating?: number;
  reviewCount?: number;
  artUrl?: string | null;
}

interface Review {
  id: string;
  moduleId: string;
  rating: number;
  title: string;
  body: string;
  displayName: string;
  createdAt: string;
  updatedAt?: string;
  helpful: number;
}

type FilterStatusTab = 'all' | 'installed' | 'update' | 'not-installed';
type ModalTab = 'overview' | 'reviews';

const CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'community', label: '🌟 Community Uploads' },
  { id: 'security', label: 'Security & AutoMod' },
  { id: 'engagement', label: 'Engagement & Games' },
  { id: 'utility', label: 'Utility & Tools' },
  { id: 'system', label: 'System & Core' },
];

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const { currentGuild } = useGuildStore();
  const pageRef = usePageEntrance();

  // ── State ───────────────────────────────────────────────────────────────────
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusTab, setStatusTab] = useState<FilterStatusTab>('all');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  // Inspector & Review Modal
  const [inspectorModal, setInspectorModal] = useState<ModuleItem | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('overview');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewBreakdown, setReviewBreakdown] = useState<Record<number, number>>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Review Form
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newName, setNewName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState<Set<string>>(new Set());

  // Upload Community Module Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadArt, setUploadArt] = useState<File | null>(null);
  const [uploadArtPreview, setUploadArtPreview] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [requiredTier, setRequiredTier] = useState('Customer');
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artInputRef = useRef<HTMLInputElement>(null);
  // Uninstall Confirmation Modal
  const [confirmUninstallModal, setConfirmUninstallModal] = useState<ModuleItem | null>(null);
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);

  // ── Installed Modules Sidebar State ──────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('marketplace_installed_sidebar_collapsed') === 'true';
  });
  const [installedSearch, setInstalledSearch] = useState('');
  const [installedFilter, setInstalledFilter] = useState<'all' | 'updates'>('all');

  const toggleSidebarCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('marketplace_installed_sidebar_collapsed', String(next));
  };

  // ── Fetch Catalog ───────────────────────────────────────────────────────────
  const fetchCatalog = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/marketplace');
      if (res.ok) {
        const data = await res.json();
        const FORBIDDEN = new Set([
          'license-manager',
          'module-manager',
          'update-helper',
          'licensemanager',
          'modulemanager',
          'updatehelper',
        ]);
        const clean = (data.modules || []).filter((m: ModuleItem) => !FORBIDDEN.has(m.id.toLowerCase()));
        setModules(clean);
      }
    } catch {
      showToast('Failed to connect to module marketplace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !inspectorModal) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      showToast('Please select a PNG, JPEG, WEBP, or GIF image', 'error');
      return;
    }

    try {
      setUploadingBanner(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('banner', file);

      const res = await fetch(`/api/marketplace/art/${encodeURIComponent(inspectorModal.id)}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload banner art');
      }

      const timestamp = Date.now();
      const newArtUrl = `/api/marketplace/art/${inspectorModal.id}?t=${timestamp}`;

      setInspectorModal((prev) => (prev ? { ...prev, artUrl: newArtUrl } : null));
      setModules((prev) =>
        prev.map((m) => (m.id === inspectorModal.id ? { ...m, artUrl: newArtUrl } : m))
      );

      showToast('Banner artwork updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload banner artwork', 'error');
    } finally {
      setUploadingBanner(false);
      if (modalArtInputRef.current) modalArtInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // ── Fetch Reviews for Inspector ─────────────────────────────────────────────
  const fetchReviews = async (moduleId: string) => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/marketplace/reviews/${encodeURIComponent(moduleId)}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setReviewBreakdown(data.breakdown || {});
      }
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (inspectorModal && modalTab === 'reviews') {
      fetchReviews(inspectorModal.id);
    }
  }, [inspectorModal, modalTab]);

  // ── Filtered & Count Calculations ───────────────────────────────────────────
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      // Status Filter
      if (statusTab === 'installed' && !m.installed) return false;
      if (statusTab === 'update' && !m.hasUpdate) return false;
      if (statusTab === 'not-installed' && m.installed) return false;

      // Category Filter
      if (selectedCategory === 'community') {
        if (!m.isCommunity) return false;
      } else if (selectedCategory !== 'all') {
        if (m.category !== selectedCategory) return false;
      }

      // Search Filter
      if (search) {
        const q = search.toLowerCase();
        const match =
          m.label.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.author && m.author.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [modules, statusTab, selectedCategory, search]);

  const stats = useMemo(() => {
    return {
      total: modules.length,
      installed: modules.filter((m) => m.installed).length,
      updates: modules.filter((m) => m.hasUpdate).length,
      available: modules.filter((m) => !m.installed).length,
      community: modules.filter((m) => m.isCommunity).length,
    };
  }, [modules]);

  const installedModules = useMemo(() => {
    return modules.filter((m) => m.installed);
  }, [modules]);

  const filteredInstalledModules = useMemo(() => {
    return installedModules.filter((m) => {
      if (installedFilter === 'updates' && !m.hasUpdate) return false;
      if (installedSearch.trim()) {
        const q = installedSearch.toLowerCase().trim();
        return (
          m.label.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.category && m.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [installedModules, installedFilter, installedSearch]);

  // ── Top 5 Best Used Modules Carousel ──────────────────────────────────────
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);

  const topUsedModules = useMemo(() => {
    // Exclude internal test modules like test-showcase
    const valid = modules.filter(
      (m) => m.id !== 'test-showcase' && !m.id.toLowerCase().includes('test')
    );

    const POPULAR_WEIGHTS: Record<string, number> = {
      'ai-system': 1000,
      'applications': 950,
      'tickets': 900,
      'auto-mod': 850,
      'leveling': 800,
      'giveaway-manager': 750,
      'economy-builder': 700,
      'backup': 650,
      'temp-voice': 600,
      'guild-center': 550,
      'timed-channels': 500,
      'streamer-notifications': 450,
      'welcome-goodbye': 400,
      'birthdays': 350,
      'game-host-check': 300,
    };

    return [...valid]
      .sort((a, b) => {
        const weightA = (POPULAR_WEIGHTS[a.id.toLowerCase()] || 0) + (a.downloads || 0) * 10 + (a.installed ? 250 : 0) + (a.reviewCount || 0) * 15 + (a.avgRating || 0) * 10;
        const weightB = (POPULAR_WEIGHTS[b.id.toLowerCase()] || 0) + (b.downloads || 0) * 10 + (b.installed ? 250 : 0) + (b.reviewCount || 0) * 15 + (b.avgRating || 0) * 10;
        return weightB - weightA;
      })
      .slice(0, 5);
  }, [modules]);

  const activeCarouselModule = useMemo(() => {
    if (topUsedModules.length === 0) return null;
    return topUsedModules[carouselIndex % topUsedModules.length] || topUsedModules[0];
  }, [topUsedModules, carouselIndex]);

  useEffect(() => {
    if (carouselPaused || topUsedModules.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % topUsedModules.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [carouselPaused, topUsedModules.length]);

  const handlePrevSlide = () => {
    setCarouselIndex((prev) => (prev === 0 ? topUsedModules.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % topUsedModules.length);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleInstall = async (mod: ModuleItem, isUpdate = false) => {
    setInstallingId(mod.id);
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: mod.id, update: isUpdate }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isUpdate ? 'Failed to update module' : 'Failed to install module'));
      }

      showToast({
        title: isUpdate ? 'Module Updated!' : 'Module Installed!',
        message: isUpdate
          ? `Module "${mod.label || mod.id}" updated to v${mod.version} and synchronized!`
          : `Module "${mod.label || mod.id}" is now active and live on your bot.`,
        type: 'success',
        duration: 9000,
        action: {
          label: 'Configure Module →',
          onClick: () => navigate(`/modules/${mod.id}`),
        },
      });

      // Track newly installed module for sidebar highlight
      try {
        const stored = JSON.parse(localStorage.getItem('fc_newly_installed_modules') || '[]');
        if (!stored.includes(mod.id)) {
          stored.push(mod.id);
          localStorage.setItem('fc_newly_installed_modules', JSON.stringify(stored));
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('floofcore:moduleInstalled', { detail: { id: mod.id, name: mod.label || mod.id } }));

      await fetchCatalog(true);
    } catch (err: any) {
      showToast(err.message || (isUpdate ? 'Update failed' : 'Installation failed'), 'error');
    } finally {
      setInstallingId(null);
    }
  };

  const PROTECTED_CORE_MODULES = useMemo(
    () =>
      new Set([
        'core-commands',
        'corecommands',
        'core',
        'guild-center',
        'guildcenter',
      ]),
    []
  );

  const handleUninstall = async (mod: ModuleItem) => {
    if (PROTECTED_CORE_MODULES.has(mod.id.toLowerCase())) {
      showToast(`Cannot uninstall protected core module "${mod.label}".`, 'error');
      return;
    }

    setUninstallingId(mod.id);
    try {
      const res = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: mod.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to uninstall module');
      }

      // Remove from newly installed list
      try {
        const stored = JSON.parse(localStorage.getItem('fc_newly_installed_modules') || '[]');
        const updated = stored.filter((id: string) => id !== mod.id);
        localStorage.setItem('fc_newly_installed_modules', JSON.stringify(updated));
      } catch {}
      window.dispatchEvent(new CustomEvent('floofcore:moduleUninstalled', { detail: { id: mod.id } }));

      showToast(`Module "${mod.label}" uninstalled and unloaded successfully!`, 'success');
      setConfirmUninstallModal(null);
      if (inspectorModal?.id === mod.id) {
        setInspectorModal(null);
      }
      await fetchCatalog(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to uninstall module', 'error');
    } finally {
      setUninstallingId(null);
    }
  };

  const handleReloadBot = async () => {
    setReloading(true);
    try {
      const res = await fetch('/api/marketplace/reload', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Bot commands and modules synchronized!', 'success');
        await fetchCatalog(true);
      } else {
        throw new Error(data.error || 'Failed to reload bot');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reload bot', 'error');
    } finally {
      setReloading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorModal) return;
    if (!newRating) {
      showToast('Please select a star rating', 'error');
      return;
    }
    if (newBody.trim().length < 10) {
      showToast('Review text must be at least 10 characters', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketplace/reviews/${encodeURIComponent(inspectorModal.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: newRating,
          title: newTitle,
          body: newBody,
          displayName: newName || 'Server Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');

      showToast('Review submitted to marketplace!', 'success');
      setNewTitle('');
      setNewBody('');
      setNewRating(5);
      await fetchReviews(inspectorModal.id);
      await fetchCatalog(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (review: Review) => {
    if (helpfulVoted.has(review.id)) return;
    try {
      const res = await fetch(`/api/marketplace/reviews/${review.moduleId}/${review.id}/helpful`, {
        method: 'POST',
      });
      if (res.ok) {
        setHelpfulVoted((prev) => new Set([...prev, review.id]));
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, helpful: r.helpful + 1 } : r)));
      }
    } catch {}
  };

  const handleCopySchema = (schema: any) => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopiedSchema(true);
    showToast('Config schema copied!', 'success');
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a module .zip file to upload', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('moduleZip', uploadFile);
      if (uploadArt) formData.append('image', uploadArt);
      if (authorName) formData.append('author', authorName);
      formData.append('requiredTier', requiredTier);

      const res = await fetch('/api/marketplace/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      showToast(`Module "${data.module?.label || 'Custom Module'}" published to FLM Marketplace!`, 'success');
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadArt(null);
      setUploadArtPreview(null);
      setAuthorName('');
      await fetchCatalog(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to publish module', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={pageRef} className="space-y-6 pb-12">
      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0E1320]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
              <IconShoppingBag size={12} className="text-emerald-400" />
              <span>FLM Central Registry</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1.5">
              <IconSparkles size={12} className="text-violet-400" />
              <span>{stats.total} Modules in Catalog</span>
            </span>
            {stats.community > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-pink-500/10 text-pink-300 border border-pink-500/20">
                {stats.community} Community Uploads
              </span>
            )}
            {stats.updates > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                <IconSparkles size={12} className="text-amber-400" />
                <span>{stats.updates} Update{stats.updates > 1 ? 's' : ''} Available</span>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {stats.installed} Active
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white font-heading tracking-tight flex items-center gap-3">
            <span>Module Marketplace &amp; Catalog</span>
          </h1>

          <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Discover, download, and publish custom modules hosted centrally on FLM Reborn 2.0. Modules synchronize directly into your engine with one click.
          </p>
        </div>

        {/* Action Controls: Upload & Reload */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-violet-600/30 border border-violet-400/30 transition-all cursor-pointer"
          >
            <IconUpload size={16} />
            <span>Upload Custom Module</span>
          </button>

          <button
            type="button"
            onClick={handleReloadBot}
            disabled={reloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <IconRefresh size={15} className={`text-cyan-400 ${reloading ? 'animate-spin' : ''}`} />
            <span>{reloading ? 'Reloading...' : 'Sync Bot'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Installed Modules Left Sidebar + Catalog Grid ── */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* ── Left Sidebar: Installed Modules ── */}
        <aside
          className={`transition-all duration-300 shrink-0 sticky top-4 z-20 ${
            sidebarCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-80'
          }`}
        >
          <div className="p-3.5 rounded-3xl bg-[#0E1320]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5">
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <IconPackage size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-black text-white font-heading tracking-wide uppercase">
                          Installed
                        </h2>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {installedModules.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">Local bot modules</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSidebarCollapsed}
                    className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Collapse sidebar"
                  >
                    <IconLayoutSidebarLeftCollapse size={16} />
                  </button>
                </>
              ) : (
                <div className="w-full flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSidebarCollapsed}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Expand installed modules sidebar"
                  >
                    <IconLayoutSidebarLeftExpand size={18} />
                  </button>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    {installedModules.length}
                  </span>
                </div>
              )}
            </div>

            {/* If Expanded: Search & Quick Filters */}
            {!sidebarCollapsed && (
              <>
                {/* Search Box */}
                <div className="relative">
                  <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={installedSearch}
                    onChange={(e) => setInstalledSearch(e.target.value)}
                    placeholder="Filter installed..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090C15] border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  {installedSearch && (
                    <button
                      type="button"
                      onClick={() => setInstalledSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      <IconX size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Chips: All vs Updates */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090C15] border border-white/5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setInstalledFilter('all')}
                    className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                      installedFilter === 'all'
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({installedModules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstalledFilter('updates')}
                    className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      installedFilter === 'updates'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Updates</span>
                    {stats.updates > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[9px]">
                        {stats.updates}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* List of Installed Modules */}
            <div
              className={`space-y-1.5 custom-scrollbar overflow-y-auto max-h-[calc(100vh-340px)] pr-0.5 ${
                sidebarCollapsed ? 'flex flex-col items-center' : ''
              }`}
            >
              {filteredInstalledModules.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {installedModules.length === 0 ? 'No installed modules' : 'No matches found'}
                </div>
              ) : (
                filteredInstalledModules.map((mod) => {
                  const isUpdating = installingId === mod.id;

                  if (sidebarCollapsed) {
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => {
                          setInspectorModal(mod);
                          setModalTab('overview');
                        }}
                        title={`${mod.label} (v${mod.installedVersion || mod.version})`}
                        style={{ backgroundColor: `${mod.color || '#8B5CF6'}15` }}
                        className="w-10 h-10 rounded-xl border border-white/10 hover:border-violet-400/50 flex items-center justify-center text-lg relative group transition-transform hover:scale-105 cursor-pointer"
                      >
                        {mod.icon || '📦'}
                        {mod.hasUpdate && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0E1320] animate-pulse" />
                        )}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={mod.id}
                      className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-violet-500/30 transition-all group flex items-center justify-between gap-2.5"
                    >
                      {/* Left: Icon, Title, Version */}
                      <div
                        onClick={() => {
                          setInspectorModal(mod);
                          setModalTab('overview');
                        }}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                      >
                        <div
                          style={{ backgroundColor: `${mod.color || '#8B5CF6'}18` }}
                          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform"
                        >
                          {mod.icon || '📦'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                            {mod.label}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              v{mod.installedVersion || mod.version}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active" />
                            {mod.hasUpdate && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                UPDATE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {mod.hasUpdate && (
                          <button
                            type="button"
                            onClick={() => handleInstall(mod, true)}
                            disabled={isUpdating}
                            title={`Update to v${mod.version}`}
                            className="p-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                          >
                            <IconRefresh size={12} className={isUpdating ? 'animate-spin' : ''} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/modules/${mod.id}`)}
                          title="Configure module"
                          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                        >
                          <IconSettings size={13} />
                        </button>
                        {!PROTECTED_CORE_MODULES.has(mod.id.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => setConfirmUninstallModal(mod)}
                            title="Uninstall module"
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                          >
                            <IconTrash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer (when expanded) */}
            {!sidebarCollapsed && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{installedModules.length} installed</span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusTab('installed');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="hover:text-violet-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View in Grid</span>
                  <IconChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Catalog Area ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ── Unified Marketplace Command Toolbar ─────────────────── */}
          <div className="p-3.5 rounded-2xl bg-[#0E1320]/85 border border-white/10 backdrop-blur-xl shadow-lg flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Input with Clear Button */}
              <div className="relative w-full sm:w-80">
                <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search marketplace modules..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#090C15] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5"
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 rounded-xl bg-[#090C15]/80 border border-white/5">
                <button
                  type="button"
                  onClick={() => setStatusTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusTab === 'all'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] font-mono opacity-75">({stats.total})</span>
                </button>

                {stats.updates > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusTab('update')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusTab === 'update'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                        : 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                    }`}
                  >
                    <IconSparkles size={12} className="animate-pulse" />
                    <span>Updates ({stats.updates})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStatusTab('not-installed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusTab === 'not-installed'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Available ({stats.available})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === 'community' ? 'all' : 'community')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === 'community'
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌟 Community</span>
                  {stats.community > 0 && <span className="text-[10px] font-mono opacity-75">({stats.community})</span>}
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-white/5 custom-scrollbar">
              {CATEGORIES.map((cat) => {
                if (cat.id === 'community') return null;
                const count = cat.id === 'all'
                  ? modules.length
                  : modules.filter((m) => m.category === cat.id).length;
                const active = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      active
                        ? 'bg-white/15 text-white font-bold border border-white/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-[10px] font-mono opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Top 5 Best Used Modules Carousel ─────────────────────────── */}
          {statusTab === 'all' && selectedCategory === 'all' && !search.trim() && activeCarouselModule && (
            <div
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
              className="p-6 md:p-7 rounded-3xl bg-gradient-to-r from-violet-950/40 via-[#0E1320] to-indigo-950/30 border border-violet-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col gap-5 group"
            >
              {/* Subtle Ambient Radial Glow */}
              <div
                style={{ backgroundColor: `${activeCarouselModule.color || '#8B5CF6'}18` }}
                className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-colors duration-700"
              />

              {/* Carousel Header Bar */}
              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                    <IconFlame size={13} className="text-amber-400" />
                    <span>#{topUsedModules.findIndex((m) => m.id === activeCarouselModule.id) + 1} Best Used Module</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-white/[0.05] border border-white/10">
                    v{activeCarouselModule.version || '1.0.0'}
                  </span>

                  {activeCarouselModule.installed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Installed</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      Community Recommended
                    </span>
                  )}
                </div>

                {/* Carousel Navigation Arrows & Slide Counter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">
                    {topUsedModules.findIndex((m) => m.id === activeCarouselModule.id) + 1} / {topUsedModules.length}
                  </span>

                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    title="Previous Top Module"
                    className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
                  >
                    <IconChevronLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextSlide}
                    title="Next Top Module"
                    className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Active Module Showcase Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCarouselModule.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10"
                >
                  <div className="space-y-3.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3.5">
                      <div
                        style={{ backgroundColor: `${activeCarouselModule.color || '#8B5CF6'}25`, borderColor: `${activeCarouselModule.color || '#8B5CF6'}50` }}
                        className="w-14 h-14 rounded-2xl border flex items-center justify-center text-3xl shadow-xl bg-[#090D18] shrink-0"
                      >
                        {activeCarouselModule.icon || '📦'}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl font-black text-white font-heading truncate flex items-center gap-2">
                          <span>{activeCarouselModule.label}</span>
                        </h2>
                        <p className="text-xs text-slate-400 capitalize mt-0.5">
                          {activeCarouselModule.category} Module • by {activeCarouselModule.author || 'FloofCore'}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed max-w-2xl">
                      {activeCarouselModule.description || 'Powerful, customizable Discord server enhancement module.'}
                    </p>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectorModal(activeCarouselModule);
                          setModalTab('overview');
                        }}
                        className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <IconEye size={14} />
                        <span>Inspect Module</span>
                      </button>

                      {activeCarouselModule.installed ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/modules/${activeCarouselModule.id}`)}
                          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span>Configure Module</span>
                          <IconArrowRight size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInstall(activeCarouselModule)}
                          disabled={installingId === activeCarouselModule.id}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          {installingId === activeCarouselModule.id ? (
                            <>
                              <IconRefresh size={14} className="animate-spin" />
                              <span>Installing...</span>
                            </>
                          ) : (
                            <>
                              <IconDownload size={14} />
                              <span>Install Module</span>
                            </>
                          )}
                        </button>
                      )}

                      {activeCarouselModule.downloads !== undefined && activeCarouselModule.downloads > 0 && (
                        <span className="text-[11px] font-mono text-slate-400 bg-white/[0.03] px-2.5 py-1.5 rounded-xl border border-white/5">
                          🔥 {activeCarouselModule.downloads} installs
                        </span>
                      )}

                      {activeCarouselModule.avgRating !== undefined && activeCarouselModule.avgRating > 0 && (
                        <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20 flex items-center gap-1">
                          <IconStarFilled size={12} className="text-amber-400" />
                          <span>{activeCarouselModule.avgRating.toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spotlight Banner Graphic / Card Preview */}
                  <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden border border-white/10 relative shrink-0 shadow-xl bg-slate-950">
                    {activeCarouselModule.artUrl ? (
                      <img
                        src={activeCarouselModule.artUrl}
                        alt={activeCarouselModule.label}
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = 'none';
                          if (el.nextElementSibling) {
                            (el.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : null}
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${activeCarouselModule.color || '#8B5CF6'}35 0%, #090C16 100%)`,
                        display: activeCarouselModule.artUrl ? 'none' : 'flex',
                      }}
                      className="w-full h-full items-center justify-center text-4xl relative group-hover:scale-105 transition-transform duration-500"
                    >
                      <div className="text-5xl drop-shadow-2xl">{activeCarouselModule.icon || '📦'}</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E1320] via-transparent to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom Carousel Pill Thumbnails */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 overflow-x-auto custom-scrollbar z-10">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider shrink-0 mr-1">
                  Top 5:
                </span>
                {topUsedModules.map((mod, idx) => {
                  const isActive = idx === (carouselIndex % topUsedModules.length);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setCarouselIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 border border-violet-400'
                          : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                      }`}
                    >
                      <span className="text-xs">{mod.icon || '📦'}</span>
                      <span className="truncate max-w-[120px]">{mod.label}</span>
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        isActive ? 'bg-black/30 text-white' : 'text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Modules Grid ────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0E1320]/40 border border-white/10 space-y-3">
              <IconAlertCircle size={36} className="text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No matching modules found</h3>
              <p className="text-xs text-slate-400">Try changing your search query or selecting a different category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {filteredModules.map((mod) => {
                const isInstalled = Boolean(mod.installed);
                const isAllowed = mod.licenseAllowed !== false;
                const isInstalling = installingId === mod.id;

                return (
                  <div
                    key={mod.id}
                    className="rounded-3xl bg-[#0E1320]/75 border border-white/10 hover:border-violet-500/40 backdrop-blur-xl shadow-lg flex flex-col justify-between transition-all duration-200 group relative overflow-hidden"
                  >
                    {/* Top Card Banner Header */}
                    <div className="h-24 relative overflow-hidden bg-slate-900/90 border-b border-white/5">
                      {mod.artUrl ? (
                        <img
                          src={mod.artUrl}
                          alt={mod.label}
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            if (el.nextElementSibling) {
                              (el.nextElementSibling as HTMLElement).style.display = 'block';
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : null}

                      {/* Stylized Theme Gradient Fallback */}
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${mod.color || '#6366F1'}35 0%, #0E1320 100%)`,
                          display: mod.artUrl ? 'none' : 'block',
                        }}
                        className="w-full h-full relative"
                      >
                        <div
                          style={{ backgroundColor: mod.color || '#8B5CF6' }}
                          className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none"
                        />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E1320] via-transparent to-black/30" />

                      {/* Top Badges on Banner */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                        {mod.hasUpdate ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1 backdrop-blur-md shadow-sm animate-pulse">
                            <IconSparkles size={11} className="text-amber-400" />
                            <span>Update v{mod.version}</span>
                          </span>
                        ) : isInstalled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 backdrop-blur-md shadow-sm">
                            <IconCheck size={11} />
                            <span>v{mod.installedVersion || mod.version}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-black/50 border border-white/10 backdrop-blur-md">
                            v{mod.version}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Overlapping Icon & Title */}
                        <div className="flex items-start gap-3 min-w-0 -mt-6 relative z-10">
                          <div
                            style={{
                              backgroundColor: '#090D18',
                              borderColor: `${mod.color || '#8B5CF6'}40`,
                            }}
                            className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-xl group-hover:scale-105 transition-transform shrink-0"
                          >
                            {mod.icon || '📦'}
                          </div>
                          <div className="min-w-0 pt-2 flex-1">
                            <h3 className="text-sm font-black text-white font-heading truncate group-hover:text-violet-300 transition-colors">
                              {mod.label}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                {mod.category}
                              </span>
                              {mod.author && (
                                <span className="text-[10px] text-slate-500 truncate">
                                  by <span className="text-slate-400 font-semibold">{mod.author}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[36px]">
                          {mod.description}
                        </p>
                      </div>

                      {/* Metadata & Actions */}
                      <div className="space-y-3 pt-2">
                        {/* Rating & Tier Meta */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px]">
                          {mod.avgRating && mod.avgRating > 0 ? (
                            <div
                              onClick={() => {
                                setInspectorModal(mod);
                                setModalTab('reviews');
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer transition-colors"
                              title="View reviews"
                            >
                              <IconStarFilled size={12} />
                              <span>{mod.avgRating.toFixed(1)}</span>
                              <span className="text-[10px] text-slate-500">({mod.reviewCount})</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">No reviews yet</span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {mod.requiredTier && mod.requiredTier.toLowerCase() !== 'free' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-semibold flex items-center gap-1">
                                <IconShieldLock size={10} />
                                <span>{mod.requiredTier}</span>
                              </span>
                            )}
                            {mod.hasCustomComponent && (
                              <span className="text-slate-500 font-mono flex items-center gap-1 text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                <span>UI</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons Strip */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectorModal(mod);
                              setModalTab('overview');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <IconEye size={13} />
                            <span>Inspect</span>
                          </button>

                          {isInstalled ? (
                            <div className="flex items-center gap-2">
                              {mod.hasUpdate && (
                                <button
                                  type="button"
                                  onClick={() => handleInstall(mod, true)}
                                  disabled={isInstalling || !isAllowed}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-xs font-black text-white shadow-lg shadow-amber-500/25 border border-amber-400/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  title={`Update from v${mod.installedVersion} to v${mod.version}`}
                                >
                                  {isInstalling ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      <span>Updating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <IconRefresh size={13} className="text-white" />
                                      <span>Update</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate(`/modules/${mod.id}`)}
                                className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Configure</span>
                                <IconArrowRight size={13} className="text-slate-400" />
                              </button>
                              {!PROTECTED_CORE_MODULES.has(mod.id.toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmUninstallModal(mod)}
                                  title="Uninstall module"
                                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                                >
                                  <IconTrash size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInstall(mod, false)}
                              disabled={isInstalling || !isAllowed}
                              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                !isAllowed
                                  ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                                  : 'bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/30'
                              }`}
                            >
                              {isInstalling ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Syncing...</span>
                                </>
                              ) : (
                                <>
                                  <IconDownload size={14} />
                                  <span>Download &amp; Sync</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          INSPECTOR & REVIEW MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {inspectorModal && (
          <div
            onClick={() => setInspectorModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0C111F] border border-white/15 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Banner */}
              <div className="h-36 relative bg-slate-900 overflow-hidden shrink-0">
                {inspectorModal.artUrl ? (
                  <img
                    src={inspectorModal.artUrl}
                    alt={inspectorModal.label}
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      if (el.nextElementSibling) {
                        (el.nextElementSibling as HTMLElement).style.display = 'block';
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${inspectorModal.color || '#6366F1'}44 0%, #0C111F 100%)`,
                    display: inspectorModal.artUrl ? 'none' : 'block',
                  }}
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C111F] via-[#0C111F]/50 to-transparent" />

                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => modalArtInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
                    title="Upload or change banner art"
                  >
                    <IconPhoto size={14} className="text-violet-400" />
                    <span>{uploadingBanner ? 'Uploading...' : 'Change Art'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorModal(null)}
                    className="p-2 rounded-xl bg-black/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <IconX size={18} />
                  </button>
                </div>
                <input
                  type="file"
                  ref={modalArtInputRef}
                  onChange={handleBannerUpload}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      style={{ backgroundColor: `${inspectorModal.color || '#8B5CF6'}25` }}
                      className="w-14 h-14 rounded-2xl border border-white/15 flex items-center justify-center text-3xl shadow-xl bg-[#090C16]"
                    >
                      {inspectorModal.icon || '📦'}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-white font-heading truncate">
                        {inspectorModal.label}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-500">{inspectorModal.id}</span>
                        <span>• v{inspectorModal.version}</span>
                        {inspectorModal.author && <span>• by {inspectorModal.author}</span>}
                      </div>
                    </div>
                  </div>

                  {(inspectorModal.reviewCount ?? 0) > 0 && (
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1 justify-end text-amber-400">
                        <IconStarFilled size={14} />
                        <span className="text-sm font-mono font-bold text-white">
                          {(inspectorModal.avgRating || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {inspectorModal.reviewCount} reviews
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 shrink-0">
                {(['overview', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setModalTab(tab)}
                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer capitalize ${
                      modalTab === tab
                        ? 'text-violet-400 border-violet-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    {tab === 'reviews'
                      ? `Reviews (${inspectorModal.reviewCount || 0})`
                      : 'Overview & Specs'}
                  </button>
                ))}
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {modalTab === 'overview' ? (
                  <div className="space-y-5">
                    {/* Description */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        About Module
                      </h4>
                      <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                        {inspectorModal.description}
                      </p>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] text-slate-500 font-mono block">CATEGORY</span>
                        <span className="text-xs font-bold text-slate-200 capitalize mt-0.5 block">
                          {inspectorModal.category}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] text-slate-500 font-mono block">TIER REQUIRED</span>
                        <span className="text-xs font-bold text-slate-200 capitalize mt-0.5 block">
                          {inspectorModal.requiredTier || 'Customer'}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] text-slate-500 font-mono block">STATUS</span>
                        <span
                          className={`text-xs font-bold mt-0.5 block ${
                            inspectorModal.installed ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {inspectorModal.installed ? 'Installed' : 'Not Installed'}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] text-slate-500 font-mono block">SIZE</span>
                        <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                          {inspectorModal.sizeBytes
                            ? `${(inspectorModal.sizeBytes / 1024).toFixed(0)} KB`
                            : 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Dependencies */}
                    {inspectorModal.dependencies && inspectorModal.dependencies.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                          Dependencies
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inspectorModal.dependencies.map((dep) => (
                            <span
                              key={dep}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.04] text-slate-300 border border-white/10"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Default Schema */}
                    {inspectorModal.defaultSchema && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <IconCode size={14} className="text-violet-400" />
                            <span>Configuration Schema</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleCopySchema(inspectorModal.defaultSchema)}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <IconCopy size={12} />
                            <span>{copiedSchema ? 'Copied!' : 'Copy YAML/JSON'}</span>
                          </button>
                        </div>
                        <pre className="p-4 rounded-2xl bg-[#060911] border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48 custom-scrollbar">
                          {JSON.stringify(inspectorModal.defaultSchema, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── REVIEWS TAB ────────────────────────────────────────── */
                  <div className="space-y-6">
                    {/* Score Distribution */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-6">
                      <div className="text-center sm:border-r sm:border-white/10 sm:pr-6">
                        <div className="text-4xl font-black text-white font-mono">
                          {inspectorModal.avgRating ? inspectorModal.avgRating.toFixed(1) : '0.0'}
                        </div>
                        <div className="flex items-center justify-center gap-0.5 mt-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <IconStarFilled
                              key={n}
                              size={14}
                              className={
                                n <= Math.round(inspectorModal.avgRating || 0)
                                  ? 'text-amber-400'
                                  : 'text-slate-600'
                              }
                            />
                          ))}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          {inspectorModal.reviewCount || 0} total reviews
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-1.5">
                        {[5, 4, 3, 2, 1].map((n) => {
                          const count = reviewBreakdown[n] || 0;
                          const total = inspectorModal.reviewCount || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={n} className="flex items-center gap-2 text-xs font-mono">
                              <span className="w-3 text-slate-400">{n}</span>
                              <IconStarFilled size={11} className="text-amber-400" />
                              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                />
                              </div>
                              <span className="w-8 text-right text-slate-500">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Community Reviews
                      </h4>

                      {reviewsLoading ? (
                        <div className="text-center py-8 text-xs text-slate-500 font-mono">
                          Loading reviews...
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                          <IconStar size={28} className="text-slate-600 mx-auto opacity-50" />
                          <div className="text-xs font-bold text-slate-300">No reviews yet</div>
                          <div className="text-[11px] text-slate-500">
                            Be the first server administrator to leave feedback!
                          </div>
                        </div>
                      ) : (
                        reviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300">
                                  {rev.displayName?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white leading-tight">
                                    {rev.displayName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {new Date(rev.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <IconStarFilled
                                    key={n}
                                    size={11}
                                    className={n <= rev.rating ? 'text-amber-400' : 'text-slate-600'}
                                  />
                                ))}
                              </div>
                            </div>

                            {rev.title && (
                              <h5 className="text-xs font-bold text-slate-200">{rev.title}</h5>
                            )}
                            <p className="text-xs text-slate-400 leading-relaxed">{rev.body}</p>

                            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                              <button
                                type="button"
                                onClick={() => handleHelpful(rev)}
                                disabled={helpfulVoted.has(rev.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                  helpfulVoted.has(rev.id)
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'hover:bg-white/[0.05] text-slate-400 hover:text-white'
                                }`}
                              >
                                <IconThumbUp size={12} />
                                <span>Helpful ({rev.helpful || 0})</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Write Review Form */}
                    <form
                      onSubmit={handleSubmitReview}
                      className="p-5 rounded-2xl bg-violet-950/20 border border-violet-500/30 space-y-4"
                    >
                      <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <IconSparkles size={14} className="text-violet-400" />
                        <span>Leave a Review</span>
                      </h4>

                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-300">Rating:</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNewRating(n)}
                              className="p-1 cursor-pointer"
                            >
                              <IconStarFilled
                                size={20}
                                className={n <= newRating ? 'text-amber-400' : 'text-slate-600'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Your Name (e.g. Pete)"
                          className="px-3 py-2 rounded-xl bg-[#080C16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Review Title"
                          className="px-3 py-2 rounded-xl bg-[#080C16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <textarea
                        rows={3}
                        value={newBody}
                        onChange={(e) => setNewBody(e.target.value)}
                        placeholder="Write your review here (minimum 10 characters)..."
                        className="w-full px-3 py-2 rounded-xl bg-[#080C16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {submittingReview ? (
                            <IconRefresh size={13} className="animate-spin text-white" />
                          ) : (
                            <IconCheck size={13} />
                          )}
                          <span>Submit Review</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-white/10 bg-[#090C16] flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-400 font-mono">
                  Module ID: <span className="text-slate-200 font-bold">{inspectorModal.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectorModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {inspectorModal.installed ? (
                    <div className="flex items-center gap-2">
                      {!PROTECTED_CORE_MODULES.has(inspectorModal.id.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => setConfirmUninstallModal(inspectorModal)}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <IconTrash size={14} />
                          <span>Uninstall</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/modules/${inspectorModal.id}`)}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Configure Module</span>
                        <IconArrowRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInstall(inspectorModal)}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <IconDownload size={13} />
                      <span>Install to Bot</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════
          UPLOAD COMMUNITY MODULE MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div
            onClick={() => setUploadModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg p-6 rounded-3xl bg-[#0E1322] border border-white/15 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xl">
                    📦
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white font-heading">Publish Module to FLM</h3>
                    <p className="text-xs text-slate-400">Share packages with the community</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <IconX size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Archive File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-violet-500/50 bg-white/[0.02] hover:bg-white/[0.04] text-center cursor-pointer transition-all space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <IconFileZip size={36} className="text-violet-400 mx-auto" />
                  {uploadFile ? (
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                        {uploadFile.name}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Package Ready
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        Select module .zip package
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Must contain module.yml or manifest.json
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner Art Upload */}
                <div
                  onClick={() => artInputRef.current?.click()}
                  className="p-4 rounded-2xl border border-dashed border-white/15 hover:border-violet-500/40 bg-white/[0.02] flex items-center gap-3 cursor-pointer transition-all"
                >
                  <input
                    ref={artInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setUploadArt(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setUploadArtPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  {uploadArtPreview ? (
                    <img
                      src={uploadArtPreview}
                      alt="Banner Preview"
                      className="w-14 h-10 object-cover rounded-xl border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-slate-400">
                      <IconPhoto size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200">
                      {uploadArt ? uploadArt.name : 'Optional Module Banner Art'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      PNG, JPG, or WebP (e.g. 600x240)
                    </div>
                  </div>
                </div>

                {/* Author Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Creator / Author</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Pete Gaming"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090C15] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                {/* Required Tier */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Required License Key Tier</label>
                  <select
                    value={requiredTier}
                    onChange={(e) => setRequiredTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090C15] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                  >
                    <option value="Customer">Free / All Keys (Customer+)</option>
                    <option value="Beta">Beta Tier</option>
                    <option value="VIP">VIP Tier</option>
                    <option value="Developer">Developer Tier</option>
                    <option value="Master">Master Key Only</option>
                  </select>
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing to FLM...</span>
                      </>
                    ) : (
                      <>
                        <IconUpload size={14} />
                        <span>Publish Package</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════
          UNINSTALL CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmUninstallModal && (
          <div
            onClick={() => {
              if (!uninstallingId) setConfirmUninstallModal(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-[#0B0F19] border border-rose-500/30 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-[#0B0F19] to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    <IconAlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-heading text-white">
                      Uninstall Module
                    </h3>
                    <p className="text-xs text-rose-300/80">
                      Permanent deletion warning
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmUninstallModal(null)}
                  disabled={Boolean(uninstallingId)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div
                    style={{ backgroundColor: `${confirmUninstallModal.color || '#8B5CF6'}25` }}
                    className="w-10 h-10 rounded-xl border border-white/15 flex items-center justify-center text-xl shrink-0"
                  >
                    {confirmUninstallModal.icon || '📦'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">
                      {confirmUninstallModal.label}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      modules/{confirmUninstallModal.id} • v{confirmUninstallModal.installedVersion || confirmUninstallModal.version}
                    </div>
                  </div>
                </div>

                <p>
                  Are you sure you want to uninstall <strong className="text-white">{confirmUninstallModal.label}</strong>?
                </p>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200/90 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-200">
                    <IconTrash size={14} />
                    <span>This action will:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-rose-200/80">
                    <li>Unload the module and detach Discord listeners</li>
                    <li>Unregister commands from Discord's interaction system</li>
                    <li>Permanently delete the module directory from server disk</li>
                  </ul>
                </div>

                {PROTECTED_CORE_MODULES.has(confirmUninstallModal.id.toLowerCase()) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
                    ⚠️ This is a core system module and cannot be uninstalled.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 px-6 border-t border-white/10 bg-[#070A12] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmUninstallModal(null)}
                  disabled={Boolean(uninstallingId)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    Boolean(uninstallingId) ||
                    PROTECTED_CORE_MODULES.has(confirmUninstallModal.id.toLowerCase())
                  }
                  onClick={() => handleUninstall(confirmUninstallModal)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uninstallingId === confirmUninstallModal.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uninstalling...</span>
                    </>
                  ) : (
                    <>
                      <IconTrash size={14} />
                      <span>Confirm Uninstall</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketplacePage;
