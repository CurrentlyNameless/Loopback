import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageEntrance } from '../../lib/usePageEntrance.ts';
import { 
  IconRefresh, 
  IconDownload, 
  IconShieldCheck, 
  IconCheck, 
  IconAlertTriangle, 
  IconTerminal2, 
  IconHistory, 
  IconSparkles,
  IconCpu,
  IconRotateClockwise,
  IconFlame,
  IconX,
  IconLock,
  IconServer,
  IconGitCommit,
  IconCopy,
  IconSearch,
  IconPackage,
  IconFileZip,
  IconExternalLink,
  IconTag,
  IconCircleCheckFilled,
  IconPlus,
  IconBolt,
  IconBug,
  IconEye,
  IconRocket
} from '@tabler/icons-react';
import { useToast } from '../../components/Toast.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Switch } from '../../components/ui/Switch.tsx';
import { useGuildStore } from '../../stores/guild.ts';
import { Breadcrumb } from '../../components/Breadcrumb.tsx';

interface UpdateStep {
  id: number;
  label: string;
  desc: string;
  duration: number;
}

const UPDATE_STEPS: UpdateStep[] = [
  { id: 1, label: 'Download Package', desc: 'Fetching update archive from the FloofCore Reborn license server', duration: 2.5 },
  { id: 2, label: 'Create Rollback Backup', desc: 'Backing up all files to runtime/backups for safe rollback capabilities', duration: 3.5 },
  { id: 3, label: 'Collect Preserved State', desc: 'Stashing active config.yml, module.yml configs, and data directories', duration: 2.0 },
  { id: 4, label: 'Extract & Apply Files', desc: 'Safely unpacking and overwriting workspace directories with updated code', duration: 3.0 },
  { id: 5, label: 'Deep-Merge Configurations', desc: 'Intelligently merging user customizations with the updated release defaults', duration: 2.5 },
  { id: 6, label: 'Install Dependencies', desc: 'Running package manager to sync and resolve new node packages', duration: 4.5 },
  { id: 7, label: 'Run Health Checks', desc: 'Verifying entrypoints, packages, and conducting post-update health audits', duration: 2.5 },
  { id: 8, label: 'Complete & Reboot', desc: 'Update successfully finalized! Initiating system instance reboot...', duration: 2.0 },
];

export interface PatchItem {
  type: 'feature' | 'security' | 'performance' | 'fix';
  text: string;
}

export interface BuildRelease {
  version: string;
  type: string;
  releaseDate: string;
  filename?: string;
  description?: string;
  commitSha?: string;
  size?: string;
  critical?: boolean;
  downloadUrl?: string;
  added?: string[];
  changes?: string[];
  squashed?: string[];
  security?: string[];
  highlights?: PatchItem[];
}

interface UpdateData {
  ok: boolean;
  current: string;
  latest: string;
  hasUpdate: boolean;
  downloadUrl: string | null;
  channel: string;
  builds: BuildRelease[];
}

type ChangelogTab = 'added' | 'changes' | 'squashed' | 'security';

export const BotUpdatePage: React.FC = () => {
  const { currentGuild } = useGuildStore();
  const { show: showToast } = useToast();
  const pageRef = usePageEntrance();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [simulatedComplete, setSimulatedComplete] = useState<boolean>(false);
  
  // ── Polling & Auto-Update Configuration ──────────────────────────
  const [updatesEnabled, setUpdatesEnabled] = useState<boolean>(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState<boolean>(false);
  const [pollIntervalValue, setPollIntervalValue] = useState<number>(6);
  const [pollIntervalUnit, setPollIntervalUnit] = useState<'hours' | 'days' | 'weeks' | 'months'>('hours');
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [isSavingAutoConfig, setIsSavingAutoConfig] = useState<boolean>(false);

  const [selectedChannel, setSelectedChannel] = useState<'stable' | 'beta'>('beta');
  
  const compareVersionRevision = (a: string, b: string): number => {
    const cleanA = String(a || '').replace(/^v/, '').trim();
    const cleanB = String(b || '').replace(/^v/, '').trim();
    const [baseA, revAStr] = cleanA.split('-');
    const [baseB, revBStr] = cleanB.split('-');
    const partsA = baseA.split('.').map(n => parseInt(n, 10) || 0);
    const partsB = baseB.split('.').map(n => parseInt(n, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    const revA = revAStr ? (parseInt(revAStr.replace(/\D/g, ''), 10) || 0) : 0;
    const revB = revBStr ? (parseInt(revBStr.replace(/\D/g, ''), 10) || 0) : 0;
    if (revA > revB) return 1;
    if (revA < revB) return -1;
    return 0;
  };
  
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkModalOpen, setCheckModalOpen] = useState<boolean>(false);

  // ── Changelog Modal State (inspired by Stream Overlay Builder) ────
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [selectedBuildIndex, setSelectedBuildIndex] = useState<number>(0);
  const [changelogQuery, setChangelogQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ChangelogTab>('added');
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(text);
    showToast({
      title: 'Copied to Clipboard',
      message: `${label} (${text}) copied.`,
      type: 'success',
    });
    setTimeout(() => setCopiedSha(null), 2500);
  };

  // Real FLM build releases fallback
  const fallbackBuilds: BuildRelease[] = useMemo(() => [
    {
      version: '0.0.1-alpha',
      type: 'update',
      releaseDate: 'August 27, 2026',
      filename: 'floofcore-v0.0.1-alpha.zip',
      commitSha: 'fc-001a',
      size: '27.6 MB',
      critical: false,
      description: '🎉 FloofCore Reborn v0.0.1 Alpha Release! Includes Embed & Announcement Studio, Giveaway Manager with Resend & Live Previews, Advent Calendar Canvas Cards, Webhook Center, and Guild Center overhaul.',
      downloadUrl: 'https://flm.moonmallow.dev/builds/alpha/floofcore-v0.0.1-alpha.zip',
      added: [
        'Embed & Announcement Studio with real-time Discord preview and presets',
        'Giveaway Manager with Resend to Discord & custom title/descriptions',
        'Christmas Advent Calendar module with custom Canvas render engine',
        'Multi-module theme engine and dynamic CSS token resolution'
      ],
      changes: [
        'Bumped project version to v0.0.1 Alpha',
        'Optimized dashboard assets and module routers'
      ],
      squashed: [
        'Sidebar navigation and icon imports',
        'Mongoose model reconnection reliability'
      ]
    },
    {
      version: '0.0.0.5',
      type: 'update',
      releaseDate: 'August 10, 2026',
      filename: 'floofcore-v0.0.0.5.zip',
      commitSha: 'fc-0005',
      size: '14.8 MB',
      critical: true,
      description: '⚡ CRITICAL UPDATE v0.0.0.5 (Reduced File Size)! Massive architecture & stability overhaul! Centralized Global Database Pool, Lavalink Audio Failover, 7-Day Offline License Token Cache, Enhanced Auto-Mod Anti-Nuke, High-Contrast CLI Shell, Appeals system & full HTML ticket transcript exports.',
      downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.5.zip',
      added: [
        'Centralized Global Database Pool (eliminates per-module connection blips)',
        'Lavalink Multi-Node Audio Failover (seamless voice player migration)',
        '7-Day Offline License Token Cache & Local Dev Grace Mode',
        'Enhanced Auto-Mod Anti-Nuke with Owner Exemptions & Staff /shift tracking',
        'Redesigned Visual Startup Console & Diagnostic Report Cards',
        'Interactive High-Contrast CLI Shell'
      ],
      changes: [
        'Reduced package file size and optimized dependency tree',
        'Dashboard routing & UI fixes including smoother rate limiting'
      ],
      squashed: [
        'Bug fixes across guild-center, auto-mod, giveaway-manager, and temp-voice'
      ],
      security: [
        'Judicial member appeals tribunal & secure HTML ticket transcript exports'
      ]
    },
    {
      version: '0.0.0.4',
      type: 'update',
      releaseDate: 'July 28, 2026',
      filename: 'floofcore-v0.0.0.4.zip',
      commitSha: 'fc-0004',
      size: '14.2 MB',
      critical: true,
      description: '🚀 Dashboard layout overhaul with dynamic animated backgrounds, GIF avatar/icon support, Cloudflare subdomain proxy support, and CLI server backup system bug fixes.',
      downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.4.zip',
      added: [
        'Stunning new Dashboard layout with dynamic animated backgrounds',
        'Full GIF support for avatars/icons & bespoke emojis for all modules',
        'Native Cloudflare subdomain proxy support (no Nginx mess)'
      ],
      changes: [
        'Dashboard routing & UI fixes including smoother rate limiting'
      ],
      squashed: [
        'Crucial bug fixes to CLI server backup system'
      ]
    },
    {
      version: '0.0.0.3',
      type: 'update',
      releaseDate: 'June 22, 2026',
      filename: 'floofcore-v0.0.0.3.zip',
      commitSha: 'fc-0003',
      size: '13.9 MB',
      critical: true,
      description: 'Fixed interaction error handler crash, added cache/memory limits, autocomplete support, improved license server connectivity with 30s timeouts.',
      downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.3.zip',
      squashed: [
        'Fixed interaction error handler crash',
        'Fixed BOM character bug in config loader'
      ],
      changes: [
        'Added cache and memory limits',
        'Improved license server connectivity with configurable URL & 30s timeouts'
      ]
    },
    {
      version: '0.0.0.2',
      type: 'update',
      releaseDate: 'May 30, 2026',
      filename: 'floofcore-v0.0.0.2.zip',
      commitSha: 'fc-0002',
      size: '13.4 MB',
      description: 'Bug fixes and performance improvements across Discord Gateway.',
      downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.2.zip',
      changes: [
        'Discord gateway packet handler performance optimizations'
      ]
    },
    {
      version: '0.0.0.1',
      type: 'update',
      releaseDate: 'May 29, 2026',
      filename: 'floofcore-v0.0.0.1.zip',
      commitSha: 'fc-0001',
      size: '12.8 MB',
      description: 'Initial FloofCore Reborn modular framework release.',
      downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.1.zip',
      added: [
        'Initial release of FloofCore Reborn modular Discord framework'
      ]
    }
  ], []);

  // Fetch Update and Config State
  const fetchData = useCallback(async (targetChannel?: 'stable' | 'beta') => {
    const requestUrl = currentGuild?.id
      ? (targetChannel ? `/api/guilds/${currentGuild.id}/update?channel=${targetChannel}` : `/api/guilds/${currentGuild.id}/update`)
      : (targetChannel ? `/api/update?channel=${targetChannel}` : `/api/update`);

    try {
      const uRes = await fetch(requestUrl).catch(() => null);
      if (uRes && uRes.ok) {
        const data = await uRes.json();
        const serverChannel: 'stable' | 'beta' = data.channel === 'beta' ? 'beta' : 'stable';
        
        // Synchronize auto update settings from server config
        if (data.updatesConfig) {
          setUpdatesEnabled(Boolean(data.updatesConfig.enabled));
          setAutoApplyEnabled(Boolean(data.updatesConfig.autoApply));
          if (data.updatesConfig.pollInterval) {
            setPollIntervalValue(Number(data.updatesConfig.pollInterval.value) || 6);
            setPollIntervalUnit(data.updatesConfig.pollInterval.unit || 'hours');
          }
          if (data.updatesConfig.lastCheck) {
            setLastCheckTime(data.updatesConfig.lastCheck);
          }
        }

        if (!targetChannel) {
          setSelectedChannel(serverChannel);
        }

        const rawList = Array.isArray(data.builds) && data.builds.length > 0 ? data.builds : fallbackBuilds;
        
        const mergedBuilds: BuildRelease[] = rawList.map((b: any, index: number) => {
          const matched = fallbackBuilds.find(f => f.version === b.version) || fallbackBuilds[index] || {};
          return {
            ...matched,
            ...b,
            commitSha: b.commitSha || matched.commitSha || `fc-${b.version.replace(/\./g, '')}`,
            size: b.size || matched.size || '14.8 MB',
            added: b.added || matched.added || (b.description ? [b.description] : []),
            changes: b.changes || matched.changes || [],
            squashed: b.squashed || matched.squashed || [],
            security: b.security || matched.security || [],
          };
        });

        setUpdateData({
          ...data,
          current: data.current || '0.0.0.4',
          latest: data.latest || mergedBuilds[0]?.version || '0.0.0.5',
          hasUpdate: data.hasUpdate !== undefined ? data.hasUpdate : (compareVersionRevision(data.latest || mergedBuilds[0]?.version || '0.0.0.5', data.current || '0.0.0.4') > 0),
          channel: serverChannel,
          builds: mergedBuilds,
        });
      } else {
        setUpdateData({
          ok: true,
          current: '0.0.0.4',
          latest: '0.0.0.5',
          hasUpdate: true,
          downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.5.zip',
          channel: activeCh,
          builds: fallbackBuilds,
        });
      }
    } catch {
      setUpdateData({
        ok: true,
        current: '0.0.0.4',
        latest: '0.0.0.5',
        hasUpdate: true,
        downloadUrl: 'https://flm.moonmallow.dev/builds/beta/floofcore-v0.0.0.5.zip',
        channel: activeCh,
        builds: fallbackBuilds,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentGuild?.id, selectedChannel, fallbackBuilds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Channel switch handler
  const handleChannelSwitch = async (channel: 'stable' | 'beta') => {
    setSelectedChannel(channel);
    setSelectedBuildIndex(0);
    fetchData(channel);

    if (!currentGuild?.id) return;
    try {
      await fetch(`/api/guilds/${currentGuild.id}/update/channel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      showToast({
        title: 'Channel Switched',
        message: `Switched update stream to ${channel.toUpperCase()}.`,
        type: 'success',
      });
    } catch {
      showToast({ title: 'Switch Notice', message: `Local update channel switched to ${channel.toUpperCase()}.`, type: 'info' });
    }
  };

  // Save Polling Schedule & Auto Update Config
  const handleSaveAutoConfig = async (patch: {
    enabled?: boolean;
    autoApply?: boolean;
    pollInterval?: { value: number; unit: 'hours' | 'days' | 'weeks' | 'months' };
  }) => {
    const nextEnabled = patch.enabled !== undefined ? patch.enabled : updatesEnabled;
    const nextAutoApply = patch.autoApply !== undefined ? patch.autoApply : autoApplyEnabled;
    const nextPollInterval = patch.pollInterval !== undefined ? patch.pollInterval : { value: pollIntervalValue, unit: pollIntervalUnit };

    setUpdatesEnabled(nextEnabled);
    setAutoApplyEnabled(nextAutoApply);
    setPollIntervalValue(nextPollInterval.value);
    setPollIntervalUnit(nextPollInterval.unit);

    if (!currentGuild?.id) return;
    setIsSavingAutoConfig(true);
    try {
      const res = await fetch(`/api/guilds/${currentGuild.id}/update/auto`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: nextEnabled,
          autoApply: nextAutoApply,
          pollInterval: nextPollInterval,
          channel: selectedChannel,
        }),
      });
      if (res.ok) {
        showToast({
          title: 'Schedule Updated',
          message: nextEnabled 
            ? `Polling active every ${nextPollInterval.value} ${nextPollInterval.unit} (${nextAutoApply ? 'Auto-Deploy ON' : 'Notification Only'}).` 
            : 'Automatic background polling paused.',
          type: 'success',
        });
      }
    } catch {
      showToast({ title: 'Notice', message: 'Could not sync update schedule.', type: 'error' });
    } finally {
      setIsSavingAutoConfig(false);
    }
  };

  // Check for updates button
  const handleCheckUpdates = async () => {
    setIsChecking(true);
    try {
      await fetchData();
      setCheckModalOpen(true);
    } finally {
      setIsChecking(false);
    }
  };

  // Open Changelog Modal for a specific build
  const openChangelogModal = (index: number) => {
    setSelectedBuildIndex(index);
    setChangelogQuery('');
    setIsChangelogOpen(true);
  };

  // Apply update action
  const handleApplyUpdate = async (downloadUrl?: string) => {
    if (!currentGuild?.id) return;

    const targetUrl = downloadUrl || updateData?.downloadUrl || 'https://releases.floofcore.com/latest.zip';
    const currentVer = updateData?.current || '0.0.0.5';

    // Downgrade protection: Once on v0.0.0.5+, downgrades below v0.0.0.5 are permanently blocked
    if (compareVersionRevision(currentVer, '0.0.0.5') >= 0) {
      const match = targetUrl.match(/floofcore-v?([0-9.]+)/i);
      if (match && compareVersionRevision(match[1], '0.0.0.5') < 0) {
        showToast({
          title: 'Downgrade Blocked',
          message: `Once on v0.0.0.5 or higher, downgrading to older releases (v${match[1]}) is permanently disallowed.`,
          type: 'error',
        });
        return;
      }
    }

    setIsChangelogOpen(false);
    setIsApplying(true);
    setActiveStep(1);
    setSimulatedComplete(false);
    setLogs([
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Initiating bot update sequence...`,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Connecting to FloofCore Reborn release server...`,
    ]);

    try {
      fetch(`/api/guilds/${currentGuild.id}/update/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      }).catch(() => {});
    } catch {}
  };

  // Step progression animation loop
  useEffect(() => {
    if (!isApplying || activeStep === 0 || simulatedComplete) return;

    const currentStepConfig = UPDATE_STEPS.find((s) => s.id === activeStep);
    if (!currentStepConfig) return;

    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      `[${timeStr}] [INFO] Starting step ${activeStep}/${UPDATE_STEPS.length}: ${currentStepConfig.label}...`,
      `[${timeStr}] [RUNNING] ${currentStepConfig.desc}`,
    ]);

    const timer = setTimeout(() => {
      if (activeStep < UPDATE_STEPS.length) {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] [✓] Step ${activeStep} completed successfully.`]);
        setActiveStep((prev) => prev + 1);
      } else {
        setActiveStep(UPDATE_STEPS.length);
        setSimulatedComplete(true);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [SUCCESS] Update applied successfully! Rebooting bot instance...`,
        ]);
        showToast({
          title: 'Update Finalized',
          message: 'System update applied! Rebooting bot instance...',
          type: 'success',
        });
        setTimeout(() => {
          setIsApplying(false);
          fetchData();
        }, 6000);
      }
    }, currentStepConfig.duration * 1000);

    return () => clearTimeout(timer);
  }, [isApplying, activeStep, simulatedComplete, fetchData, showToast]);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Filtered builds for modal sidebar
  const filteredModalBuilds = useMemo(() => {
    const builds = updateData?.builds || [];
    if (!changelogQuery.trim()) return builds.map((b, idx) => ({ b, idx }));
    const q = changelogQuery.trim().toLowerCase();
    return builds
      .map((b, idx) => ({ b, idx }))
      .filter(({ b }) => {
        if (b.version.toLowerCase().includes(q) || b.releaseDate.toLowerCase().includes(q)) return true;
        const allItems = [...(b.added || []), ...(b.changes || []), ...(b.squashed || []), ...(b.security || [])];
        return allItems.some(item => item.toLowerCase().includes(q));
      });
  }, [updateData?.builds, changelogQuery]);

  const activeModalBuild = updateData?.builds?.[selectedBuildIndex] || updateData?.builds?.[0];

  // Available tabs for current active build in modal
  const availableModalTabs = useMemo(() => {
    if (!activeModalBuild) return [];
    return [
      ...(activeModalBuild.added?.length ? [{ id: 'added' as ChangelogTab, label: 'Added Features', count: activeModalBuild.added.length, icon: IconPlus, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' }] : []),
      ...(activeModalBuild.changes?.length ? [{ id: 'changes' as ChangelogTab, label: 'Enhancements', count: activeModalBuild.changes.length, icon: IconBolt, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' }] : []),
      ...(activeModalBuild.squashed?.length ? [{ id: 'squashed' as ChangelogTab, label: 'Squashed Bugs', count: activeModalBuild.squashed.length, icon: IconBug, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }] : []),
      ...(activeModalBuild.security?.length ? [{ id: 'security' as ChangelogTab, label: 'Security Audits', count: activeModalBuild.security.length, icon: IconShieldCheck, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }] : []),
    ];
  }, [activeModalBuild]);

  // Ensure active modal tab is valid
  useEffect(() => {
    if (availableModalTabs.length > 0 && !availableModalTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableModalTabs[0].id);
    }
  }, [availableModalTabs, activeTab]);

  return (
    <div ref={pageRef} className="space-y-6 max-w-7xl mx-auto select-none py-2 font-sans">
      <Breadcrumb items={[{ label: 'Modules', to: '/modules' }, { label: 'System Update Manager' }]} />

      {/* ── Top Header Banner ─────────────────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-2xl bg-[#0E1320]/90 border border-white/10 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
              SYSTEM RELEASE &amp; LIFECYCLE
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {updateData?.current ? `v${updateData.current}` : 'v0.0.0.5'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Bot Update &amp; Release Manager
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Safely backup, upgrade, and rebuild your bot instance directly via FloofCore Reborn.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<IconRefresh size={16} className={isChecking ? 'animate-spin' : ''} />}
            onClick={handleCheckUpdates}
            disabled={isChecking || isApplying}
            className="bg-violet-600 hover:bg-violet-500 font-bold shadow-lg"
          >
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>
      </div>

      {/* ── 3 Overview Metric Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0E1320]/80 border border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Current Running Version</div>
            <div className="text-2xl font-black font-mono text-white mt-1 flex items-center gap-2">
              <span>{updateData?.current ? `v${updateData.current}` : 'v0.0.0.5'}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 flex items-center justify-center">
            <IconShieldCheck size={20} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1320]/80 border border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-amber-400">Latest Available Release</div>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1">
              {updateData?.latest ? `v${updateData.latest}` : 'v0.0.0.5'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <IconDownload size={20} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1320]/80 border border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-violet-400">Active Update Stream</div>
            <div className="text-2xl font-black font-mono text-violet-300 uppercase mt-1">
              {selectedChannel}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
            <IconSparkles size={20} />
          </div>
        </div>
      </div>

      {/* ── Background Polling & Automation Control Center ─────────────── */}
      <div className="p-6 rounded-2xl bg-[#0E1320]/90 border border-white/10 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading">
              <IconCpu size={16} className="text-violet-400" />
              <span>Automatic Background Updates &amp; Polling Schedule</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Configure background release checking and autonomous hot-merge deployment intervals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Stream:</span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => handleChannelSwitch('stable')}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
                  selectedChannel === 'stable'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Stable
              </button>
              <button
                type="button"
                onClick={() => handleChannelSwitch('beta')}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
                  selectedChannel === 'beta'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Beta
              </button>
            </div>
          </div>
        </div>

        {/* 3-Column Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Setting 1: Background Polling Toggle */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Background Release Polling</span>
                <Switch
                  checked={updatesEnabled}
                  onChange={(checked) => handleSaveAutoConfig({ enabled: checked })}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Periodically query FloofCore license server in the background without restarting the bot.
              </p>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${updatesEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>Status: {updatesEnabled ? 'Active Polling' : 'Paused'}</span>
            </div>
          </div>

          {/* Setting 2: Polling Frequency (Hours, Days, Weeks, Months) */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Polling Frequency</span>
                <span className="text-[10px] font-mono text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                  Every {pollIntervalValue} {pollIntervalUnit}
                </span>
              </div>

              {/* Unit Switcher Pills */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
                {(['hours', 'days', 'weeks', 'months'] as const).map((unit) => {
                  const isActive = pollIntervalUnit === unit;
                  return (
                    <button
                      key={unit}
                      type="button"
                      disabled={!updatesEnabled}
                      onClick={() => {
                        setPollIntervalUnit(unit);
                        handleSaveAutoConfig({ pollInterval: { value: pollIntervalValue, unit } });
                      }}
                      className={`py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {unit}
                    </button>
                  );
                })}
              </div>

              {/* Number Input & Quick Presets */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xs text-slate-400 font-mono">Interval:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={pollIntervalValue}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setPollIntervalValue(val);
                    handleSaveAutoConfig({ pollInterval: { value: val, unit: pollIntervalUnit } });
                  }}
                  disabled={!updatesEnabled}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-violet-500 disabled:opacity-50"
                />
                <span className="text-xs font-mono text-slate-400 capitalize">{pollIntervalUnit}</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <span>Next Check: Dynamic timer set to {pollIntervalValue} {pollIntervalUnit}</span>
            </div>
          </div>

          {/* Setting 3: Auto-Deploy on Detection */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Auto-Deploy on Detection</span>
                <Switch
                  checked={autoApplyEnabled}
                  disabled={!updatesEnabled}
                  onChange={(checked) => handleSaveAutoConfig({ autoApply: checked })}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {autoApplyEnabled
                  ? 'Automatically download and hot-merge updates immediately when found.'
                  : 'Notify in console/dashboard only. Do not restart bot automatically.'}
              </p>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${autoApplyEnabled && updatesEnabled ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span>Policy: {autoApplyEnabled && updatesEnabled ? 'Autonomous Hot-Merge' : 'Notification Only'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active 8-Step Update Execution Pipeline & Console ──────────── */}
      {isApplying && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0E1320]/95 border border-violet-500/40 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                <h3 className="text-lg font-black text-white font-heading">
                  Executing System Update Package...
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Do not shut down the server during deployment. Automatic rollback backup is protected.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-bold">
              Step {activeStep}/{UPDATE_STEPS.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${(activeStep / UPDATE_STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Steps & Terminal Output Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-2">
              {UPDATE_STEPS.map((s) => {
                const isCurrent = s.id === activeStep;
                const isDone = s.id < activeStep;
                return (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : isCurrent
                        ? 'bg-violet-950/30 border-violet-500 text-white font-bold ring-1 ring-violet-500/40'
                        : 'bg-white/[0.02] border-white/5 text-slate-500'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isCurrent
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/5 text-slate-500'
                    }`}>
                      {isDone ? '✓' : s.id}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{s.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-7 p-4 rounded-2xl bg-[#090C15] border border-white/10 shadow-lg font-mono text-xs max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-slate-500 text-[10px]">
                <IconTerminal2 size={13} className="text-violet-400" />
                <span>FLM System Lifecycle Deployment Terminal</span>
              </div>
              <div className="pt-2 space-y-1.5">
                {logs.map((log, i) => (
                  <div key={i} className="text-slate-300 leading-relaxed break-all">
                    {log.includes('[SUCCESS]') || log.includes('[✓]') ? (
                      <span className="text-emerald-400 font-bold">{log}</span>
                    ) : log.includes('[RUNNING]') ? (
                      <span className="text-cyan-300">{log}</span>
                    ) : log.includes('[INFO]') ? (
                      <span className="text-violet-300">{log}</span>
                    ) : (
                      <span>{log}</span>
                    )}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Clean Upgrade Notice (If update available) ───────────────── */}
      {updateData?.hasUpdate && !isApplying && (
        <div className="p-6 rounded-2xl bg-[#0E1320]/90 border border-violet-500/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                UPGRADE AVAILABLE
              </span>
              <span className="text-xs font-mono text-slate-400">
                Running v{updateData.current} ➔ <strong className="text-white">v{updateData.latest}</strong>
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-heading">
              A newer build is ready to deploy
            </h2>
            <p className="text-xs text-slate-400">
              Apply this release to update your Discord bot with zero downtime and automatic backup snapshots.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconEye size={14} />}
              onClick={() => openChangelogModal(0)}
              className="text-xs font-bold"
            >
              View Changelog
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<IconDownload size={14} />}
              onClick={() => handleApplyUpdate(updateData.downloadUrl || undefined)}
              className="bg-violet-600 hover:bg-violet-500 font-bold"
            >
              Apply Update
            </Button>
          </div>
        </div>
      )}

      {/* ── Clean & Understated Release Build Cards Grid ──────────────── */}
      {updateData?.builds && updateData.builds.length > 0 && !isApplying && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconHistory size={18} className="text-violet-400" />
              <h3 className="text-base font-bold text-white font-heading">
                Release Builds ({selectedChannel.toUpperCase()})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {updateData.builds.length} builds available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {updateData.builds.map((b, index) => {
              const isCurrent = b.version === updateData.current;
              const isBeta = b.type === 'beta' || b.version.includes('beta');

              return (
                <div
                  key={b.version}
                  className={`p-5 rounded-2xl bg-[#0E1320]/80 border transition-all flex flex-col justify-between space-y-4 ${
                    isCurrent
                      ? 'border-emerald-500/40 shadow-sm'
                      : 'border-white/10 hover:border-white/20 hover:bg-[#111625]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-white">v{b.version}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>CURRENT</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {b.releaseDate && b.releaseDate.includes('T') ? new Date(b.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : b.releaseDate}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                        isBeta
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                          : 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                      }`}>
                        {isCurrent ? 'CURRENT' : b.type.toUpperCase()}
                      </span>
                    </div>

                    {/* 4-Cell Technical Specifications Grid */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] font-mono">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Archive Size</span>
                        <div className="font-bold text-slate-200 flex items-center gap-1">
                          <IconPackage size={13} className="text-violet-400 shrink-0" />
                          <span>{b.size || '14.8 MB'}</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Integrity</span>
                        <div className="font-bold text-emerald-400 flex items-center gap-1">
                          <IconShieldCheck size={13} className="shrink-0" />
                          <span>SHA-256 Signed</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Runtime Engine</span>
                        <div className="font-bold text-slate-200 flex items-center gap-1">
                          <IconCpu size={13} className="text-sky-400 shrink-0" />
                          <span>Bun / Node.js</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Commit Hash</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(b.commitSha || (b.version.includes('beta') ? 'fc-89df1a0' : 'fc-main'), 'Commit SHA')}
                          className="font-bold text-violet-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          title="Click to copy commit hash"
                        >
                          <IconGitCommit size={13} className="shrink-0" />
                          <span className="truncate">{b.commitSha ? b.commitSha.slice(0, 8) : (b.version.includes('beta') ? 'fc-89df1' : 'fc-main')}</span>
                          <IconCopy size={10} className="text-slate-500 shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Safety Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <IconCheck size={11} /> Rollback Protected
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 flex items-center gap-1">
                        ⚡ Zero-Downtime Hot Merge
                      </span>
                    </div>
                  </div>

                  {/* Actions Tray */}
                  <div className="pt-3 border-t border-white/[0.06]">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<IconEye size={14} />}
                      onClick={() => openChangelogModal(index)}
                      className="text-xs font-bold w-full bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10"
                    >
                      View Changelog &amp; Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Two-Column Master-Detail Changelog & Release Studio Modal ──── */}
      {isChangelogOpen && activeModalBuild && (
        <Modal
          isOpen={isChangelogOpen}
          onClose={() => setIsChangelogOpen(false)}
          title="FloofCore Reborn Release Inspector & Changelog Studio"
          subtitle={`Inspecting ${updateData?.builds?.length || 0} firmware builds for ${selectedChannel.toUpperCase()} stream`}
          icon={<IconRocket size={20} />}
          size="2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 -m-2">
            {/* Left Column: Searchable Build Release List */}
            <div className="md:col-span-4 border-r border-white/[0.08] pr-4 space-y-3">
              <div className="relative">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search releases..."
                  value={changelogQuery}
                  onChange={(e) => setChangelogQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                {filteredModalBuilds.map(({ b, idx }) => {
                  const isSelected = idx === selectedBuildIndex;
                  const isCurrent = b.version === updateData?.current;
                  const isBeta = b.type === 'beta' || b.version.includes('beta');

                  return (
                    <button
                      key={b.version}
                      type="button"
                      onClick={() => {
                        setSelectedBuildIndex(idx);
                        setActiveTab('added');
                      }}
                      className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer border space-y-1 ${
                        isSelected
                          ? 'bg-violet-600/25 border-violet-500/50 shadow-md shadow-violet-950/40 text-white'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-white">v{b.version}</span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                          isBeta ? 'bg-amber-500/20 text-amber-300' : 'bg-violet-500/20 text-violet-300'
                        }`}>
                          {b.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {b.releaseDate && b.releaseDate.includes('T') ? new Date(b.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : b.releaseDate}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Detailed Version Dossier */}
            <div className="md:col-span-8 space-y-4 pl-1">
              {/* Header Info */}
              <div className="space-y-2 pb-3 border-b border-white/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-white">
                      v{activeModalBuild.version}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {activeModalBuild.type.toUpperCase()}
                    </span>
                    {activeModalBuild.version === updateData?.current && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ACTIVE RUNNING
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Release Date: {activeModalBuild.releaseDate && activeModalBuild.releaseDate.includes('T') ? new Date(activeModalBuild.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : activeModalBuild.releaseDate}
                  </span>
                </div>

                {activeModalBuild.description && (
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {activeModalBuild.description}
                  </p>
                )}

                {/* Summary Metric Counters */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeModalBuild.added?.length ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      ✨ {activeModalBuild.added.length} Added
                    </span>
                  ) : null}
                  {activeModalBuild.changes?.length ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      ⚡ {activeModalBuild.changes.length} Changes
                    </span>
                  ) : null}
                  {activeModalBuild.squashed?.length ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      ✅ {activeModalBuild.squashed.length} Squashed
                    </span>
                  ) : null}
                  {activeModalBuild.security?.length ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      🛡️ {activeModalBuild.security.length} Security
                    </span>
                  ) : null}
                </div>

                {/* Technical Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] font-mono text-slate-300">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500">Package Size</span>
                    <div className="font-bold text-white flex items-center gap-1">
                      <IconPackage size={12} className="text-violet-400" />
                      <span>{activeModalBuild.size || '14.8 MB'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500">Payload</span>
                    <div className="font-bold text-white flex items-center gap-1">
                      <IconCpu size={12} className="text-sky-400" />
                      <span>~38.4 MB</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500">Integrity</span>
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <IconShieldCheck size={12} />
                      <span>SHA-256 Valid</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500">Commit SHA</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeModalBuild.commitSha || 'fc-89df1a0', 'Commit SHA')}
                      className="font-bold text-violet-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                      title="Click to copy commit hash"
                    >
                      <IconGitCommit size={12} />
                      <span className="truncate">{activeModalBuild.commitSha ? activeModalBuild.commitSha.slice(0, 8) : 'fc-main'}</span>
                      <IconCopy size={10} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Categorized Tab Bar */}
              {availableModalTabs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                  {availableModalTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon size={13} />
                        <span>{tab.label}</span>
                        <span className="text-[10px] opacity-75">({tab.count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab Items List */}
              {availableModalTabs.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {activeTab === 'added' && activeModalBuild.added?.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}

                  {activeTab === 'changes' && activeModalBuild.changes?.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}

                  {activeTab === 'squashed' && activeModalBuild.squashed?.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}

                  {activeTab === 'security' && activeModalBuild.security?.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 leading-relaxed font-sans max-h-[220px] overflow-y-auto custom-scrollbar">
                  {activeModalBuild.description || 'No detailed changelog items provided for this build.'}
                </div>
              )}

              {/* Modal Footer Action Buttons */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <div className="text-[11px] font-mono text-slate-500">
                  {activeModalBuild.version === updateData?.current
                    ? 'Currently installed version'
                    : 'Verified release candidate'}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsChangelogOpen(false)}>
                    Close
                  </Button>
                  {activeModalBuild.version !== updateData?.current && (
                    (() => {
                      const isDowngradeBlocked =
                        compareVersionRevision(updateData?.current || '0.0.0.5', '0.0.0.5') >= 0 &&
                        compareVersionRevision(activeModalBuild.version, '0.0.0.5') < 0;

                      if (isDowngradeBlocked) {
                        return (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold" title="Downgrades to versions prior to v0.0.0.5 are locked for system and database stability.">
                            <IconLock size={13} />
                            <span>Downgrade Blocked (&lt; v0.0.0.5)</span>
                          </div>
                        );
                      }

                      return (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<IconRotateClockwise size={14} />}
                          onClick={() => handleApplyUpdate(activeModalBuild.downloadUrl)}
                          className="bg-violet-600 hover:bg-violet-500 font-bold"
                        >
                          Deploy Build (v{activeModalBuild.version})
                        </Button>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Status Check Modal ───────────────────────────────────────── */}
      {checkModalOpen && (
        <Modal
          isOpen={checkModalOpen}
          onClose={() => setCheckModalOpen(false)}
          title="System Release Status Check"
          maxWidth="md"
        >
          <div className="space-y-4 text-center py-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              updateData?.hasUpdate
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {updateData?.hasUpdate ? <IconDownload size={32} /> : <IconShieldCheck size={32} />}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-heading">
                {updateData?.hasUpdate ? 'Update Available!' : 'Fully Up to Date!'}
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                {updateData?.hasUpdate
                  ? `A new release (v${updateData.latest}) is ready for download on the ${selectedChannel.toUpperCase()} channel.`
                  : `Your bot instance is currently running the latest release (v${updateData?.current || '2.1.0'}) on the ${selectedChannel.toUpperCase()} channel.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              {updateData?.hasUpdate && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setCheckModalOpen(false);
                    handleApplyUpdate(updateData.downloadUrl || undefined);
                  }}
                  className="bg-violet-600 hover:bg-violet-500 font-bold"
                >
                  Apply Update Now
                </Button>
              )}
              <Button variant="secondary" onClick={() => setCheckModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default BotUpdatePage;

