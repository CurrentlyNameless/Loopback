import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconPalette, 
  IconLayoutSidebar, 
  IconSparkles, 
  IconDeviceFloppy, 
  IconRefresh, 
  IconDownload, 
  IconUpload, 
  IconCheck, 
  IconEye, 
  IconAdjustments,
  IconBorderRadius,
  IconBox,
  IconSun,
  IconMoon,
  IconVolume,
  IconPhoto,
  IconShield,
  IconTicket,
  IconTerminal2,
  IconTrash,
  IconPlayerPlay,
  IconPlayerPause,
  IconMusic
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Switch } from '../../components/ui/Switch.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { applyThemeToDOM } from '../../lib/themeEngine.ts';
import { 
  saveAssetBlob, 
  getAssetUrl, 
  deleteAsset, 
  getAllAssets, 
  type DashboardAsset 
} from '../../lib/assetStore.ts';

interface BuilderThemeConfig {
  // Preset
  presetName: string;
  // Sidebar Styling
  sidebarWidth: number; // 240 to 340
  sidebarOpacity: number; // 20 to 100
  sidebarBlur: number; // 0 to 30
  sidebarGradient: string; // gradient classes
  // Card & Glassmorphism
  cardOpacity: number; // 20 to 95
  cardBlur: number; // 0 to 25
  cardBorderRadius: number; // 12 to 32
  borderGlowIntensity: number; // 0 to 100
  accentColorHex: string;
  accentGradient: string;
  // Wallpaper
  bgImageEnabled: boolean;
  bgImageUrl: string;
  bgOpacity: number;
  bgBlur: number;
  // Audio
  soundFxEnabled: boolean;
  soundVolume: number;
}

const DEFAULT_BUILDER_CONFIG: BuilderThemeConfig = {
  presetName: 'Orchid Bliss',
  sidebarWidth: 288,
  sidebarOpacity: 85,
  sidebarBlur: 16,
  sidebarGradient: 'from-violet-600 to-indigo-600',
  cardOpacity: 80,
  cardBlur: 16,
  cardBorderRadius: 24,
  borderGlowIntensity: 40,
  accentColorHex: '#8B5CF6',
  accentGradient: 'from-violet-600 to-indigo-600',
  bgImageEnabled: false,
  bgImageUrl: '',
  bgOpacity: 45,
  bgBlur: 2,
  soundFxEnabled: false,
  soundVolume: 50,
};

const PRESET_THEMES: Record<string, Partial<BuilderThemeConfig>> = {
  'Orchid Bliss': {
    presetName: 'Orchid Bliss',
    sidebarOpacity: 85,
    sidebarBlur: 16,
    sidebarGradient: 'from-violet-600 to-indigo-600',
    cardOpacity: 80,
    cardBorderRadius: 24,
    borderGlowIntensity: 45,
    accentColorHex: '#8B5CF6',
    accentGradient: 'from-violet-600 to-indigo-600',
  },
  'Cyberpunk Neon': {
    presetName: 'Cyberpunk Neon',
    sidebarOpacity: 90,
    sidebarBlur: 20,
    sidebarGradient: 'from-pink-600 to-cyan-500',
    cardOpacity: 85,
    cardBorderRadius: 18,
    borderGlowIntensity: 75,
    accentColorHex: '#EC4899',
    accentGradient: 'from-pink-600 to-rose-600',
  },
  'Deep Ocean': {
    presetName: 'Deep Ocean',
    sidebarOpacity: 80,
    sidebarBlur: 14,
    sidebarGradient: 'from-cyan-600 to-blue-700',
    cardOpacity: 75,
    cardBorderRadius: 28,
    borderGlowIntensity: 50,
    accentColorHex: '#0EA5E9',
    accentGradient: 'from-cyan-600 to-blue-600',
  },
  'Emerald Forest': {
    presetName: 'Emerald Forest',
    sidebarOpacity: 85,
    sidebarBlur: 16,
    sidebarGradient: 'from-emerald-600 to-teal-700',
    cardOpacity: 80,
    cardBorderRadius: 24,
    borderGlowIntensity: 45,
    accentColorHex: '#10B981',
    accentGradient: 'from-emerald-600 to-teal-600',
  },
  'Sunset Blaze': {
    presetName: 'Sunset Blaze',
    sidebarOpacity: 85,
    sidebarBlur: 16,
    sidebarGradient: 'from-orange-500 to-rose-600',
    cardOpacity: 80,
    cardBorderRadius: 24,
    borderGlowIntensity: 55,
    accentColorHex: '#F97316',
    accentGradient: 'from-orange-500 to-amber-600',
  },
  'OLED Stealth': {
    presetName: 'OLED Stealth',
    sidebarOpacity: 98,
    sidebarBlur: 0,
    sidebarGradient: 'from-slate-800 to-slate-900',
    cardOpacity: 95,
    cardBorderRadius: 16,
    borderGlowIntensity: 15,
    accentColorHex: '#64748B',
    accentGradient: 'from-slate-700 to-slate-800',
  },
};

export const BuilderPage: React.FC = () => {
  const { show: showToast } = useToast();
  const [config, setConfig] = useState<BuilderThemeConfig>(() => {
    const saved = localStorage.getItem('dashboard_builder_theme');
    if (saved) {
      try {
        return { ...DEFAULT_BUILDER_CONFIG, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_BUILDER_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'sidebar' | 'cards' | 'accents' | 'wallpaper' | 'presets'>('sidebar');
  const [saving, setSaving] = useState(false);

  // Asset Store State
  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [selectedBgAssetId, setSelectedBgAssetId] = useState<string | null>(() => localStorage.getItem('selectedBgAssetId'));
  const [selectedAudioAssetId, setSelectedAudioAssetId] = useState<string | null>(() => localStorage.getItem('selectedAudioAssetId'));
  const [vaultTab, setVaultTab] = useState<'all' | 'image' | 'audio'>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const activeAudioEl = useRef<HTMLAudioElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Load assets from IndexedDB
  const refreshAssets = async () => {
    const list = await getAllAssets();
    setAssets(list);
    const urls: Record<string, string> = {};
    for (const a of list) {
      if (a.type === 'image') {
        const u = await getAssetUrl(a.id);
        if (u) urls[a.id] = u;
      }
    }
    setAssetUrls(urls);
  };

  useEffect(() => {
    refreshAssets();
  }, []);

  // Apply changes to real layout via localStorage, themeEngine and window event
  const applyLiveUpdates = (newCfg: BuilderThemeConfig) => {
    setConfig(newCfg);
    applyThemeToDOM(newCfg);
    localStorage.setItem('dashboard_builder_theme', JSON.stringify(newCfg));
    localStorage.setItem('bgImageEnabled', String(newCfg.bgImageEnabled));
    if (newCfg.bgImageUrl) localStorage.setItem('bgImageUrl', newCfg.bgImageUrl);
    localStorage.setItem('bgOpacity', String(newCfg.bgOpacity));
    localStorage.setItem('bgBlur', String(newCfg.bgBlur));
    localStorage.setItem('soundFxEnabled', String(newCfg.soundFxEnabled));
    localStorage.setItem('soundVolume', String(newCfg.soundVolume));
    window.dispatchEvent(new Event('dashboard-backdrop-updated'));
  };

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Invalid File',
        message: 'Please select a valid image or GIF file.',
        type: 'error',
      });
      return;
    }

    try {
      const assetId = `img_${Date.now()}`;
      await saveAssetBlob(assetId, file, {
        name: file.name,
        type: 'image',
        size: file.size,
        mimeType: file.type,
        createdAt: Date.now(),
      });

      setSelectedBgAssetId(assetId);
      localStorage.setItem('selectedBgAssetId', assetId);
      localStorage.removeItem('bgImageUrl');

      const nextCfg = { ...config, bgImageEnabled: true, bgImageUrl: '' };
      applyLiveUpdates(nextCfg);
      await refreshAssets();

      showToast({
        title: 'Wallpaper Saved',
        message: `Saved ${file.name} to media vault and applied as backdrop.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Upload Failed',
        message: 'Could not store image asset in browser storage.',
        type: 'error',
      });
    }
  };

  // Audio Upload Handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      showToast({
        title: 'Invalid File',
        message: 'Please select an MP3 or audio file.',
        type: 'error',
      });
      return;
    }

    try {
      const assetId = `audio_${Date.now()}`;
      await saveAssetBlob(assetId, file, {
        name: file.name,
        type: 'audio',
        size: file.size,
        mimeType: file.type,
        createdAt: Date.now(),
      });

      setSelectedAudioAssetId(assetId);
      localStorage.setItem('selectedAudioAssetId', assetId);

      const nextCfg = { ...config, soundFxEnabled: true };
      applyLiveUpdates(nextCfg);
      await refreshAssets();

      showToast({
        title: 'Sound FX Saved',
        message: `Saved ${file.name} to media vault and enabled audio FX.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Upload Failed',
        message: 'Could not store audio asset in browser storage.',
        type: 'error',
      });
    }
  };

  // Delete Asset Tile Handler
  const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAsset(id);
      if (selectedBgAssetId === id) {
        setSelectedBgAssetId(null);
        localStorage.removeItem('selectedBgAssetId');
        applyLiveUpdates({ ...config, bgImageEnabled: false });
      }
      if (selectedAudioAssetId === id) {
        setSelectedAudioAssetId(null);
        localStorage.removeItem('selectedAudioAssetId');
      }
      await refreshAssets();
      showToast({
        title: 'Asset Deleted',
        message: 'Asset removed from dashboard media vault.',
        type: 'info',
      });
    } catch {
      showToast({
        title: 'Delete Failed',
        message: 'Could not remove asset from storage.',
        type: 'error',
      });
    }
  };

  // Select or Toggle Off Asset Tile
  const handleSelectAsset = (ast: DashboardAsset) => {
    if (ast.type === 'image') {
      if (selectedBgAssetId === ast.id && config.bgImageEnabled) {
        // Toggle OFF without deleting
        setSelectedBgAssetId(null);
        localStorage.removeItem('selectedBgAssetId');
        applyLiveUpdates({ ...config, bgImageEnabled: false });
        showToast({
          title: 'Wallpaper Turned Off',
          message: 'Backdrop disabled. Asset remains safely in media vault.',
          type: 'info',
        });
      } else {
        // Toggle ON
        setSelectedBgAssetId(ast.id);
        localStorage.setItem('selectedBgAssetId', ast.id);
        localStorage.removeItem('bgImageUrl');
        applyLiveUpdates({ ...config, bgImageEnabled: true, bgImageUrl: '' });
        showToast({
          title: 'Wallpaper Active',
          message: `Applied ${ast.name} as active backdrop. Tap again to turn off.`,
          type: 'success',
        });
      }
    } else {
      if (selectedAudioAssetId === ast.id && config.soundFxEnabled) {
        // Toggle OFF without deleting
        setSelectedAudioAssetId(null);
        localStorage.removeItem('selectedAudioAssetId');
        applyLiveUpdates({ ...config, soundFxEnabled: false });
        showToast({
          title: 'Sound FX Turned Off',
          message: 'Audio muted. Sound file remains safely in media vault.',
          type: 'info',
        });
      } else {
        // Toggle ON
        setSelectedAudioAssetId(ast.id);
        localStorage.setItem('selectedAudioAssetId', ast.id);
        applyLiveUpdates({ ...config, soundFxEnabled: true });
        showToast({
          title: 'Sound FX Active',
          message: `Set ${ast.name} as hover sound feedback. Tap again to turn off.`,
          type: 'success',
        });
      }
    }
  };

  const handleTurnOffWallpaper = () => {
    setSelectedBgAssetId(null);
    localStorage.removeItem('selectedBgAssetId');
    applyLiveUpdates({ ...config, bgImageEnabled: false, bgImageUrl: '' });
    showToast({
      title: 'Wallpaper Disabled',
      message: 'Background image/GIF turned off (preserved in vault).',
      type: 'info',
    });
  };

  const handleTurnOffSound = () => {
    setSelectedAudioAssetId(null);
    localStorage.removeItem('selectedAudioAssetId');
    applyLiveUpdates({ ...config, soundFxEnabled: false });
    showToast({
      title: 'Sound FX Muted',
      message: 'Sound effects turned off (preserved in vault).',
      type: 'info',
    });
  };

  // Test Play Sound
  const handleTestPlayAudio = async () => {
    if (isPlayingAudio && activeAudioEl.current) {
      activeAudioEl.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      let audioSrc = '';
      if (selectedAudioAssetId) {
        const url = await getAssetUrl(selectedAudioAssetId);
        if (url) audioSrc = url;
      }

      if (!audioSrc) {
        // Synthesize acoustic tone
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime((config.soundVolume / 100) * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        return;
      }

      const audio = new Audio(audioSrc);
      audio.volume = Math.max(0.05, config.soundVolume / 100);
      activeAudioEl.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const handleApplyPreset = (name: string) => {
    const p = PRESET_THEMES[name];
    if (!p) return;
    const next = { ...config, ...p, presetName: name };
    applyLiveUpdates(next);
    showToast({
      title: `Preset Applied: ${name}`,
      message: 'Visual styling updated across preview and workspace.',
      type: 'success',
    });
  };

  const handleSave = () => {
    setSaving(true);
    applyLiveUpdates(config);
    setTimeout(() => {
      setSaving(false);
      showToast({
        title: 'Theme Builder Saved',
        message: 'Your custom dashboard layout has been permanently applied.',
        type: 'success',
      });
    }, 400);
  };

  const handleReset = () => {
    applyLiveUpdates(DEFAULT_BUILDER_CONFIG);
    showToast({
      title: 'Reset to Defaults',
      message: 'Dashboard layout restored to baseline settings.',
      type: 'info',
    });
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floofcore-theme-${config.presetName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({
      title: 'Theme Exported',
      message: 'Saved theme JSON configuration file.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none py-2 font-sans">
      
      {/* Hidden File Upload Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
        onChange={handleAudioUpload}
        className="hidden"
      />

      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-[28px] bg-[#0E1320]/90 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-pink-500/10 text-pink-300 border border-pink-500/20">
              DASHBOARD THEME STUDIO
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
              ● LIVE WYSIWYG
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Visual Layout &amp; Sidebar Builder
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Customize sidebar width, glassmorphism blur, corner radius, glowing accents, and backdrops.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          <Tooltip content="Export theme as a .json backup file">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <IconDownload size={15} />
              <span>Export</span>
            </button>
          </Tooltip>

          <Tooltip content="Restore baseline layout defaults">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <IconRefresh size={15} />
              <span>Reset</span>
            </button>
          </Tooltip>

          <Tooltip content="Permanently apply layout to active session">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              icon={IconDeviceFloppy}
              className="rounded-xl px-4 py-2 text-xs font-bold shadow-lg shadow-violet-600/30"
            >
              Save Layout
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Main Studio Grid: Left Studio Controls (5 Cols), Right Live WYSIWYG Frame (7 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT: Visual Editor Controls (5 Cols) ───────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Sub Navigation Category Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto no-scrollbar">
            {[
              { key: 'sidebar', label: 'Sidebar', icon: IconLayoutSidebar },
              { key: 'cards', label: 'Surfaces', icon: IconBox },
              { key: 'accents', label: 'Accents & Glows', icon: IconPalette },
              { key: 'wallpaper', label: 'Media & FX', icon: IconPhoto },
              { key: 'presets', label: 'Presets', icon: IconSparkles },
            ].map((t) => {
              const IconComp = t.icon;
              const isSelected = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key as any)}
                  className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <IconComp size={14} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. Sidebar Geometry & Glass */}
          {activeTab === 'sidebar' && (
            <div className="p-5 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white font-heading">Sidebar Geometry &amp; Glass</h3>

              {/* Sidebar Width */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Sidebar Width</span>
                  <span className="text-white font-bold">{config.sidebarWidth}px</span>
                </div>
                <input
                  type="range"
                  min="220"
                  max="340"
                  value={config.sidebarWidth}
                  onChange={(e) => applyLiveUpdates({ ...config, sidebarWidth: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Sidebar Opacity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Glass Transparency</span>
                  <span className="text-white font-bold">{config.sidebarOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={config.sidebarOpacity}
                  onChange={(e) => applyLiveUpdates({ ...config, sidebarOpacity: Number(e.target.value) })}
                  className="w-full accent-pink-500"
                />
              </div>

              {/* Sidebar Blur */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Backdrop Blur Strength</span>
                  <span className="text-white font-bold">{config.sidebarBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={config.sidebarBlur}
                  onChange={(e) => applyLiveUpdates({ ...config, sidebarBlur: Number(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Active Tab Gradient */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-mono font-bold text-slate-400 uppercase">Active Item Accent</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Violet', grad: 'from-violet-600 to-indigo-600' },
                    { label: 'Rose Neon', grad: 'from-pink-600 to-rose-600' },
                    { label: 'Emerald', grad: 'from-emerald-600 to-teal-600' },
                    { label: 'Cyan Ocean', grad: 'from-cyan-600 to-blue-600' },
                    { label: 'Amber Flame', grad: 'from-orange-500 to-amber-600' },
                    { label: 'Stealth', grad: 'from-slate-700 to-slate-800' },
                  ].map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => applyLiveUpdates({ ...config, sidebarGradient: g.grad })}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        config.sidebarGradient === g.grad
                          ? 'bg-white/10 border-white text-white shadow-md'
                          : 'border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Cards & Glassmorphism Surfaces */}
          {activeTab === 'cards' && (
            <div className="p-5 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white font-heading">Card Surfaces &amp; Glassmorphism</h3>

              {/* Corner Radius */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Card Corner Curvature</span>
                  <span className="text-white font-bold">{config.cardBorderRadius}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="36"
                  value={config.cardBorderRadius}
                  onChange={(e) => applyLiveUpdates({ ...config, cardBorderRadius: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Card Opacity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Card Surface Opacity</span>
                  <span className="text-white font-bold">{config.cardOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={config.cardOpacity}
                  onChange={(e) => applyLiveUpdates({ ...config, cardOpacity: Number(e.target.value) })}
                  className="w-full accent-pink-500"
                />
              </div>

              {/* Card Blur */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Card Glass Blur</span>
                  <span className="text-white font-bold">{config.cardBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={config.cardBlur}
                  onChange={(e) => applyLiveUpdates({ ...config, cardBlur: Number(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Border Glow */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Border Highlight Intensity</span>
                  <span className="text-white font-bold">{config.borderGlowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.borderGlowIntensity}
                  onChange={(e) => applyLiveUpdates({ ...config, borderGlowIntensity: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* 3. Accents & Colors */}
          {activeTab === 'accents' && (
            <div className="p-5 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white font-heading">Primary Accents &amp; Glows</h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Electric Violet', hex: '#8B5CF6', grad: 'from-violet-600 to-indigo-600' },
                  { name: 'Neon Pink', hex: '#EC4899', grad: 'from-pink-600 to-rose-600' },
                  { name: 'Emerald Green', hex: '#10B981', grad: 'from-emerald-600 to-teal-600' },
                  { name: 'Cyan Blue', hex: '#0EA5E9', grad: 'from-cyan-600 to-blue-600' },
                  { name: 'Blazing Orange', hex: '#F97316', grad: 'from-orange-500 to-amber-600' },
                  { name: 'Discord Blurple', hex: '#5865F2', grad: 'from-indigo-600 to-violet-600' },
                ].map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => applyLiveUpdates({ ...config, accentColorHex: col.hex, accentGradient: col.grad })}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      config.accentColorHex === col.hex
                        ? 'bg-white/10 border-white text-white shadow-lg'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full shadow-md" style={{ backgroundColor: col.hex }} />
                    <span className="text-xs font-bold truncate">{col.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Media & Sound FX with Full Asset Store & Uploader */}
          {activeTab === 'wallpaper' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white font-heading">Wallpaper &amp; Audio Engine</h3>
                  <Switch
                    checked={config.bgImageEnabled}
                    onChange={(val) => applyLiveUpdates({ ...config, bgImageEnabled: val })}
                  />
                </div>

                {/* Upload Action Triggers */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all cursor-pointer"
                  >
                    <IconUpload size={15} />
                    <span>Upload Image / GIF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    <IconMusic size={15} />
                    <span>Upload MP3 Sound</span>
                  </button>
                </div>

                {/* Direct Image URL Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Or Direct Wallpaper URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="https://i.imgur.com/... or https://media.giphy.com/..."
                      value={config.bgImageUrl}
                      onChange={(e) => applyLiveUpdates({ ...config, bgImageUrl: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => applyLiveUpdates({ ...config, bgImageEnabled: true })}
                      className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white border border-white/10 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Opacity & Blur Controls */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Backdrop Opacity</span>
                      <span className="text-white font-bold">{config.bgOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={config.bgOpacity}
                      onChange={(e) => applyLiveUpdates({ ...config, bgOpacity: Number(e.target.value) })}
                      className="w-full accent-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Glass Blur</span>
                      <span className="text-white font-bold">{config.bgBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={config.bgBlur}
                      onChange={(e) => applyLiveUpdates({ ...config, bgBlur: Number(e.target.value) })}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                </div>

                {/* Sound FX & Audio Preview */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <IconVolume size={16} className="text-amber-400" />
                      <span>Interactive UI Audio Feedback</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleTestPlayAudio}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                    >
                      {isPlayingAudio ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                      <span>{isPlayingAudio ? 'Stop' : 'Test Sound'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Audio Volume</span>
                      <span className="text-white font-bold">{config.soundVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.soundVolume}
                      onChange={(e) => applyLiveUpdates({ ...config, soundVolume: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* ── Asset Store Vault Grid ──────────────────────────────── */}
              <div className="p-5 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white font-heading">Dashboard Media Vault</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-violet-500/20 text-violet-300">
                      {assets.length} stored
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Tap tile to activate • Trash to remove</span>
                </div>

                {/* Vault Category Tabs (All / Images / Audio) */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setVaultTab('all')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      vaultTab === 'all'
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>All Media</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white/10">
                      {assets.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVaultTab('image')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      vaultTab === 'image'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🖼️ Wallpapers &amp; GIFs</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white/10">
                      {assets.filter((a) => a.type === 'image').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVaultTab('audio')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      vaultTab === 'audio'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🎵 Audio Sound FX</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white/10">
                      {assets.filter((a) => a.type === 'audio').length}
                    </span>
                  </button>
                </div>

                {/* Active Media Status & Quick Turn-Off Bar */}
                {((config.bgImageEnabled && (selectedBgAssetId || config.bgImageUrl)) || (config.soundFxEnabled && selectedAudioAssetId)) && (
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {config.bgImageEnabled && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold">
                          <span>🖼️ Wallpaper Active</span>
                          <button
                            type="button"
                            onClick={handleTurnOffWallpaper}
                            className="ml-1 px-1.5 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-[10px] text-white cursor-pointer font-mono"
                            title="Turn off wallpaper backdrop without deleting"
                          >
                            Turn Off ✕
                          </button>
                        </div>
                      )}

                      {config.soundFxEnabled && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                          <span>🎵 Audio FX Active</span>
                          <button
                            type="button"
                            onClick={handleTurnOffSound}
                            className="ml-1 px-1.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-[10px] text-white cursor-pointer font-mono"
                            title="Turn off sound effects without deleting"
                          >
                            Mute / Turn Off ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      Tap active tile or "Turn Off" to disable without deleting
                    </span>
                  </div>
                )}

                {/* Filtered Grid */}
                {(() => {
                  const filtered = vaultTab === 'all' ? assets : assets.filter((a) => a.type === vaultTab);

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                        <IconPhoto size={24} className="mx-auto text-slate-500" />
                        <p className="text-xs text-slate-400">
                          {vaultTab === 'image'
                            ? 'No wallpaper images uploaded yet. Click "Upload Image / GIF" above!'
                            : vaultTab === 'audio'
                            ? 'No MP3 sound files uploaded yet. Click "Upload MP3 Sound" above!'
                            : 'No media stored yet. Upload PNGs, GIFs, or MP3s above!'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {filtered.map((ast) => {
                        const isImageSelected = ast.type === 'image' && selectedBgAssetId === ast.id && config.bgImageEnabled;
                        const isAudioSelected = ast.type === 'audio' && selectedAudioAssetId === ast.id && config.soundFxEnabled;
                        const isSelected = isImageSelected || isAudioSelected;
                        const thumbUrl = assetUrls[ast.id];

                        return (
                          <div
                            key={ast.id}
                            onClick={() => handleSelectAsset(ast)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between overflow-hidden ${
                              isSelected
                                ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-500/20 ring-1 ring-violet-500'
                                : 'bg-black/30 border-white/10 hover:border-white/30 hover:bg-white/[0.04]'
                            }`}
                          >
                            {/* Miniature image thumbnail if available */}
                            {ast.type === 'image' && thumbUrl ? (
                              <div className="h-16 rounded-xl overflow-hidden mb-2 bg-black/40 relative">
                                <img src={thumbUrl} alt={ast.name} className="w-full h-full object-cover" />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-mono font-black shadow-md flex items-center gap-1">
                                      <IconCheck size={10} /> Active
                                    </span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAsset(ast.id, e)}
                                  className="absolute top-1 right-1 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer z-10"
                                  title="Delete media tile permanently"
                                >
                                  <IconTrash size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-lg">
                                    {ast.type === 'image' ? '🖼️' : '🎵'}
                                  </span>
                                  {isSelected && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-mono font-bold">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAsset(ast.id, e)}
                                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                  title="Delete media tile permanently"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{ast.name}</div>
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5 flex items-center justify-between">
                                <span>{(ast.size / 1024).toFixed(0)} KB</span>
                                <span className="uppercase text-slate-500">{ast.type}</span>
                              </div>
                              {isSelected && (
                                <div className="text-[9px] font-mono text-violet-300 mt-1">
                                  ● Tap to turn off
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 5. Presets Gallery */}
          {activeTab === 'presets' && (
            <div className="p-5 rounded-3xl bg-[#0E1320]/80 border border-white/10 shadow-xl space-y-3">
              <h3 className="text-sm font-black text-white font-heading">Instant Theme Presets</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(PRESET_THEMES).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleApplyPreset(name)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      config.presetName === name
                        ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-500/20'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{name}</span>
                      {config.presetName === name && <IconCheck size={14} className="text-emerald-400" />}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Instant layout styling
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Real-Time Interactive WYSIWYG Simulation (7 Cols) ─ */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconEye size={16} className="text-violet-400" />
              <span>LIVE WYSIWYG STUDIO SIMULATOR</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              ● REAL-TIME SYNCHRONIZED
            </span>
          </div>

          {/* Interactive Simulation Frame */}
          <div className="relative rounded-[28px] border border-white/10 overflow-hidden bg-[#07090E] min-h-[580px] p-4 flex gap-4 shadow-2xl">
            
            {/* Simulated Live Backdrop in Simulator */}
            {config.bgImageEnabled && (config.bgImageUrl || selectedBgAssetId) && (
              <div 
                className="absolute inset-0 pointer-events-none bg-cover bg-center transition-all duration-300"
                style={{
                  backgroundImage: `url(${config.bgImageUrl || (selectedBgAssetId ? assetUrls[selectedBgAssetId] : '')})`,
                  opacity: config.bgOpacity / 100,
                  filter: `blur(${config.bgBlur}px)`,
                }}
              />
            )}

            {/* Simulated Sidebar */}
            <motion.div
              style={{
                width: `${Math.min(config.sidebarWidth * 0.72, 220)}px`,
                backgroundColor: `rgba(9, 12, 21, ${config.sidebarOpacity / 100})`,
                backdropFilter: `blur(${config.sidebarBlur}px)`,
              }}
              className="rounded-2xl border border-white/10 p-3 flex flex-col justify-between relative z-10 shrink-0 transition-all"
            >
              <div className="space-y-3">
                {/* Simulated Server Capsule */}
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-[10px]">
                    FC
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">FloofCore Server</div>
                    <div className="text-[8px] font-mono text-emerald-400">● SHARD 0</div>
                  </div>
                </div>

                {/* Simulated Nav Links */}
                <div className="space-y-1 text-[11px] font-bold">
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${config.sidebarGradient} text-white shadow-md flex items-center gap-2`}>
                    <span>📊</span>
                    <span>Overview</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <span>📦</span>
                    <span>Modules</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <span>⚡</span>
                    <span>Commands</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <span>🎟️</span>
                    <span>Tickets</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Settings</span>
                  </div>
                </div>
              </div>

              {/* Simulated User Profile Pill */}
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-black text-white">
                    A
                  </div>
                  <span className="text-[10px] font-bold text-white">Admin</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </motion.div>

            {/* Simulated Main Content Workspace */}
            <div className="flex-1 space-y-3 min-w-0">
              
              {/* Simulated Top Banner */}
              <div 
                style={{
                  backgroundColor: `rgba(14, 19, 32, ${config.cardOpacity / 100})`,
                  backdropFilter: `blur(${config.cardBlur}px)`,
                  borderRadius: `${config.cardBorderRadius}px`,
                }}
                className="p-4 border border-white/10 shadow-lg space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-lg">
                      👑
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Main Cluster Nexus</h4>
                      <p className="text-[10px] font-mono text-slate-400">Live synchronized telemetry</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                    Active
                  </span>
                </div>
              </div>

              {/* Simulated 2 Metric Glass Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  style={{
                    backgroundColor: `rgba(14, 19, 32, ${config.cardOpacity / 100})`,
                    backdropFilter: `blur(${config.cardBlur}px)`,
                    borderRadius: `${config.cardBorderRadius}px`,
                  }}
                  className="p-3.5 border border-white/10 shadow-lg space-y-1"
                >
                  <div className="text-[10px] font-mono text-slate-400">ACTIVE MODULES</div>
                  <div className="text-lg font-black text-white">35 Online</div>
                </div>

                <div 
                  style={{
                    backgroundColor: `rgba(14, 19, 32, ${config.cardOpacity / 100})`,
                    backdropFilter: `blur(${config.cardBlur}px)`,
                    borderRadius: `${config.cardBorderRadius}px`,
                  }}
                  className="p-3.5 border border-white/10 shadow-lg space-y-1"
                >
                  <div className="text-[10px] font-mono text-slate-400">COMMAND LATENCY</div>
                  <div className="text-lg font-black text-emerald-400">12 ms</div>
                </div>
              </div>

              {/* Simulated Action Surface */}
              <div 
                style={{
                  backgroundColor: `rgba(14, 19, 32, ${config.cardOpacity / 100})`,
                  backdropFilter: `blur(${config.cardBlur}px)`,
                  borderRadius: `${config.cardBorderRadius}px`,
                }}
                className="p-4 border border-white/10 shadow-lg flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">Auto-Moderation Defense</div>
                  <div className="text-[10px] font-mono text-slate-400">Shield active across 24 channels</div>
                </div>
                <div className="w-9 h-5 rounded-full bg-violet-600 flex items-center justify-end p-0.5">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BuilderPage;
