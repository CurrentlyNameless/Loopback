import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense, Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconArrowLeft,
  IconCheck,
  IconAlertTriangle,
  IconAdjustments,
  IconShield,
  IconUserPlus,
  IconTrophy,
  IconTicket,
  IconCoins,
  IconListCheck,
  IconRobot,
  IconBroadcast,
  IconDatabase,
  IconSparkles,
  IconFlame,
  IconFileText,
  IconTerminal2,
  IconDeviceFloppy,
  IconRotateClockwise,
  IconFileCode,
} from '@tabler/icons-react';
import { useGuildStore } from '../../stores/guild.ts';
import { Switch } from '../../components/ui/Switch.tsx';
import { useToast } from '../../components/Toast.tsx';
import { RainbowYamlEditor } from '../../components/RainbowYamlEditor.tsx';

import type { DiscordChannel, DiscordRole, ModuleEditorProps } from './types.ts';
import { formatCapitalModuleName, UniversalModule } from './components/UniversalModule.tsx';
import { resolveModuleComponent, normalizeModuleId } from '../../lib/moduleRegistry.ts';
import { IconBuildingCommunity, IconCake, IconGift, IconWriting, IconClock } from '@tabler/icons-react';
import { getModuleMeta } from '../../lib/moduleMeta.ts';

/**
 * Inline error boundary for module dashboard pages.
 *
 * When a dynamically-imported module page fails to load (e.g. the module has no
 * dashboard/page.tsx, or the file has a syntax error), this boundary catches the
 * error and sets `failed = true`. The parent then falls through to the YAML editor
 * rather than crashing the entire ModuleDetailPage.
 */
interface ModulePageEBProps { children: React.ReactNode; onFail: () => void; }
interface ModulePageEBState { failed: boolean; }
class ModulePageErrorBoundary extends Component<ModulePageEBProps, ModulePageEBState> {
  state: ModulePageEBState = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    console.error('[ModulePageErrorBoundary] Error rendering module dashboard:', err, info);
    this.props.onFail();
  }
  render() {
    if (this.state.failed) return null; // fall through to YAML editor
    return this.props.children;
  }
}

// ── Module Icon Helper ─────────────────────────────────────────────────────
const IconBellOff: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9.346 5.353a2 2 0 0 1 2.654 -1.353a2 2 0 0 1 2 2a7 7 0 0 1 4 6v3m1 1a4 4 0 0 0 1 2h-14a4 4 0 0 0 2 -3v-3a7 7 0 0 1 .537 -2.693M9 17v1a3 3 0 0 0 6 0v-1M3 3l18 18" />
  </svg>
);

function getModuleIcon(id: string, size = 20): React.ReactNode {
  const norm = id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (norm.includes('guild-center') || norm.includes('community')) return <IconBuildingCommunity size={size} className="text-violet-400" />;
  if (norm.includes('mindscape') || norm.includes('selfcare')) return <IconSparkles size={size} className="text-purple-400" />;
  if (norm.includes('tempvoice') || norm.includes('temp-voice')) return <IconAdjustments size={size} className="text-cyan-400" />;
  if (norm.includes('auto-revive') || norm.includes('revive')) return <IconFlame size={size} className="text-pink-400" />;
  if (norm.includes('application')) return <IconFileText size={size} className="text-purple-400" />;
  if (norm.includes('command')) return <IconTerminal2 size={size} className="text-amber-400" />;
  if (norm === 'ai-system' || norm === 'ai' || norm === 'neural-ai') return <IconRobot size={size} className="text-fuchsia-400" />;
  if (norm.includes('automod') || norm.includes('auto-mod')) return <IconShield size={size} className="text-rose-400" />;
  if (norm.includes('welcome') || norm.includes('goodbye')) return <IconUserPlus size={size} className="text-emerald-400" />;
  if (norm.includes('level') || norm.includes('xp')) return <IconTrophy size={size} className="text-yellow-400" />;
  if (norm.includes('ticket')) return <IconTicket size={size} className="text-cyan-400" />;
  if (norm.includes('economy')) return <IconCoins size={size} className="text-amber-400" />;
  if (norm.includes('log')) return <IconListCheck size={size} className="text-indigo-400" />;
  if (norm.includes('stream') || norm.includes('alert')) return <IconBroadcast size={size} className="text-purple-400" />;
  if (norm.includes('backup')) return <IconDatabase size={size} className="text-teal-400" />;
  if (norm.includes('birthday')) return <IconCake size={size} className="text-pink-400" />;
  if (norm.includes('advent')) return <IconGift size={size} className="text-red-400" />;
  if (norm.includes('timed-channel') || norm.includes('timed-chat') || norm.includes('after-hours')) return <IconClock size={size} className="text-amber-400" />;
  if (norm.includes('intro')) return <IconWriting size={size} className="text-pink-400" />;
  if (norm.includes('role') || norm.includes('roles')) return <IconUserCheck size={size} className="text-purple-400" />;
  if (norm.includes('anti-mention') || norm.includes('antimention')) return <IconBellOff size={size} className="text-pink-400" />;
  return <IconSparkles size={size} className="text-violet-400" />;
}

// ── Default Fallback Schemas ────────────────────────────────────────────────
function getDefaultSchema(id: string): Record<string, any> {
  const norm = id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  switch (norm) {
    case 'birthdays':
    case 'birthday':
      return {
        enabled: true,
        announcementChannelId: '',
        birthdayRoleId: '',
        roleDurationHours: 24,
        announcementHour: 9,
        defaultTimezone: 'UTC',
        pingUser: true,
        allowAgeDisplay: true,
        rewards: {
          enabled: true,
          birthdayCoins: 250,
        },
        embed: {
          color: '#FF69B4',
          footer: '🎂 Celebrating another wonderful year with our community!',
        },
        messages: [
          "🎉 Happy Birthday {user}! Wishing you an amazing year ahead filled with joy and success! 🎂✨",
          "🥳 Let's all wish {user} a fantastic Happy Birthday! Have the most wonderful day! 🎈🍰",
          "🎂 Another level up! Happy Birthday {user}! May your day be filled with celebration and fun! 🎁🎉",
          "🌟 Happy Birthday {user}! Thank you for being such an awesome part of our server! 🎂🥳",
          "✨ It's {user}'s special day! Drop some birthday love and wishes! 🎈🎁🎂",
        ],
      };
    case 'tempvoice':
    case 'temp-voice':
      return {
        enabled: true,
        triggerChannels: [],
        channelNameTemplate: "{username}'s Voice",
        defaultBitrate: 64,
        userLimit: 0,
        userRoleId: null,
        adminRoleIds: [],
        modRoleIds: [],
        autoDeleteEmpty: true,
        transferOnOwnerLeave: true,
        defaultLockState: false,
        allowNsfw: true,
        tts: {
          enabled: true,
          provider: 'google',
          voice: 'Brian',
        },
      };
    case 'ai-system':
    case 'ai':
      return {
        enabled: true,
        groqApiKey: '',
        openaiApiKey: '',
        geminiApiKey: '',
        features: {
          chat: {
            enabled: true,
            enableChat: true,
            temperature: 0.9,
            maxTokens: 2048,
            maxHistoryLength: 20,
            systemPrompt: 'You are FloofCore AI, an intelligent and friendly Discord assistant.',
          },
          imageAnalysis: {
            enabled: true,
            enableImageAnalysis: true,
            provider: 'gemini',
            geminiModel: 'gemini-3.6-flash',
            openaiModel: 'gpt-4o-mini',
            maxImageSize: 25,
          },
          imageGeneration: {
            enabled: false,
            provider: 'openai',
            model: 'dall-e-3',
            maxResolution: '1024x1024',
          },
          moderation: {
            enabled: true,
            enableModeration: true,
            confidenceThreshold: 0.75,
            autoAction: 'none',
          },
          summarization: {
            enabled: true,
            enableSummarization: true,
            maxLength: 8000,
          },
          translation: {
            enabled: true,
            enableTranslation: true,
            supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
          },
          webSearch: {
            enabled: false,
            provider: 'google',
            apiKey: '',
            searchEngineId: '',
            maxResults: 5,
          },
          rateLimiting: {
            enabled: true,
            messagesPerMinute: 20,
            tokensPerDay: 1000000,
          },
          modelRouting: {
            defaultProvider: 'groq',
            preferFreeTier: true,
          },
          conversationMemory: {
            enabled: true,
            semanticSummarization: true,
            maxContextMessages: 20,
          },
        },
      };
    case 'anti-mention':
    case 'antimention':
      return {
        enabled: true,
        deleteMessage: true,
        warningMessage: '⚠️ {user}, you are not allowed to mention {target}! {reason}',
        autoDeleteWarningSeconds: 6,
        notifyInChannel: true,
        notifyInDm: false,
        logChannelId: '',
        bypassAdmins: true,
        ignoredUserIds: [],
        ignoredRoleIds: [],
        ignoredChannelIds: [],
        targets: [],
      };
    default:
      return {
        enabled: true,
        cooldown: 5,
        logChannelId: null,
        adminRoleIds: [],
      };
  }
}

// ── Helper to compute detailed change summary for save notifications ─────────
function getConfigurationChangesSummary(
  moduleId: string,
  prev: Record<string, any>,
  next: Record<string, any>
): string[] {
  const changes: string[] = [];
  const isGuildCenter = (moduleId || '').toLowerCase().includes('guild-center');
  const isRules = (moduleId || '').toLowerCase().includes('rules');
  const isApplications = (moduleId || '').toLowerCase().includes('application');
  const isIntroduction = (moduleId || '').toLowerCase().includes('intro');

  if (isRules) {
    const prevRules = prev.rules || prev.config?.rules || [];
    const nextRules = next.rules || next.config?.rules || [];
    if (prevRules.length !== nextRules.length) {
      changes.push(`Updated Rules count (${prevRules.length} → ${nextRules.length} rules)`);
    } else if (JSON.stringify(prevRules) !== JSON.stringify(nextRules)) {
      changes.push('Modified Community Rules and descriptions');
    }
    const prevCats = prev.categories || prev.config?.categories || {};
    const nextCats = next.categories || next.config?.categories || {};
    if (JSON.stringify(prevCats) !== JSON.stringify(nextCats)) {
      changes.push(`Updated Rule Categories (${Object.keys(nextCats).length} categories)`);
    }
    const prevMode = prev.layoutMode || prev.config?.layoutMode;
    const nextMode = next.layoutMode || next.config?.layoutMode;
    if (prevMode !== nextMode && nextMode) {
      changes.push(`Layout Mode set to ${nextMode === 'components_v2' ? 'Components V2' : 'Embed'}`);
    }
    const prevMethod = prev.verificationMethod || prev.config?.verificationMethod;
    const nextMethod = next.verificationMethod || next.config?.verificationMethod;
    if (prevMethod !== nextMethod && nextMethod) {
      changes.push(`Verification method set to ${nextMethod}`);
    }
  }

  if (isGuildCenter) {
    // 1. Header Banner
    const prevBanner = prev.bannerImage || '';
    const nextBanner = next.bannerImage || '';
    if (prevBanner !== nextBanner) {
      if (nextBanner.startsWith('data:image/')) {
        changes.push('Uploaded new header banner image');
      } else if (!nextBanner) {
        changes.push('Removed header banner image');
      } else {
        changes.push('Updated header banner source');
      }
    }
    if (prev.features?.banner !== next.features?.banner && next.features?.banner !== undefined) {
      changes.push(`Header banner display ${next.features?.banner ? 'enabled' : 'disabled'}`);
    }

    // 2. Hub Layout & Style
    if (prev.hubChannelId !== next.hubChannelId && next.hubChannelId !== undefined) {
      changes.push('Updated Hub destination channel');
    }
    const prevStyle = prev.layoutMode || prev.hubStyle || 'components_v2';
    const nextStyle = next.layoutMode || next.hubStyle || 'components_v2';
    if (prevStyle !== nextStyle) {
      changes.push(`Interface style changed to ${nextStyle === 'components_v2' ? 'Components V2' : 'Classic Embed'}`);
    }

    // 3. Colors & Branding
    if (prev.hubEmbedColor !== next.hubEmbedColor && next.hubEmbedColor !== undefined) {
      changes.push(`Accent color changed (${prev.hubEmbedColor || 'default'} → ${next.hubEmbedColor})`);
    }
    if ((prev.hubEmbedTitle || prev.hubTitle) !== (next.hubEmbedTitle || next.hubTitle)) {
      changes.push('Updated Hub title');
    }
    if (
      (prev.hubEmbedDescription || prev.serverDescription || prev.hubV2Template) !==
      (next.hubEmbedDescription || next.serverDescription || next.hubV2Template)
    ) {
      changes.push('Updated Hub message content / body template');
    }
    if (prev.hubEmbedAuthor?.name !== next.hubEmbedAuthor?.name) {
      changes.push(next.hubEmbedAuthor?.name ? `Author line set to "${next.hubEmbedAuthor.name}"` : 'Disabled author line');
    }
    if ((prev.hubEmbedFooter?.text || prev.hubFooterText) !== (next.hubEmbedFooter?.text || next.hubFooterText)) {
      changes.push('Updated footer note');
    }
    if (JSON.stringify(prev.hubButtons) !== JSON.stringify(next.hubButtons) && next.hubButtons) {
      const activeCount = next.hubButtons.filter((b: any) => b.enabled !== false).length;
      changes.push(`Updated action buttons (${activeCount} buttons active)`);
    }

    // 4. Features
    if (JSON.stringify(prev.rules) !== JSON.stringify(next.rules) && next.rules) {
      changes.push(`Updated Server Rules (${next.rules.length} rules)`);
    }
    if (JSON.stringify(prev.roles) !== JSON.stringify(next.roles) && next.roles) {
      changes.push(`Updated Self Roles (${next.roles.length} roles)`);
    }
    if (JSON.stringify(prev.roleCategories) !== JSON.stringify(next.roleCategories) && next.roleCategories) {
      changes.push(`Updated Role Categories (${Object.keys(next.roleCategories).length} categories)`);
    }
    if (JSON.stringify(prev.ticketCategories) !== JSON.stringify(next.ticketCategories) && next.ticketCategories) {
      changes.push(`Updated Ticket Categories (${Object.keys(next.ticketCategories).length} categories)`);
    }
    if (prev.ticketWelcomeMessage !== next.ticketWelcomeMessage && next.ticketWelcomeMessage !== undefined) {
      changes.push('Updated ticket welcome message');
    }
    if (JSON.stringify(prev.suggestionsCategories) !== JSON.stringify(next.suggestionsCategories) && next.suggestionsCategories) {
      changes.push(`Updated Suggestion Categories (${Object.keys(next.suggestionsCategories).length} categories)`);
    }
    if (JSON.stringify(prev.introductionsQuestions) !== JSON.stringify(next.introductionsQuestions) && next.introductionsQuestions) {
      changes.push(`Updated Onboarding Questions (${next.introductionsQuestions.length} questions)`);
    }
    if (JSON.stringify(prev.applicationTemplates) !== JSON.stringify(next.applicationTemplates) && next.applicationTemplates) {
      changes.push(`Updated Application Forms (${Object.keys(next.applicationTemplates).length} templates)`);
    }
  }

  if (isApplications) {
    const prevTypes = prev.applicationTypes || prev.config?.applicationTypes || {};
    const nextTypes = next.applicationTypes || next.config?.applicationTypes || {};
    const prevKeys = Object.keys(prevTypes);
    const nextKeys = Object.keys(nextTypes);
    if (prevKeys.length !== nextKeys.length) {
      changes.push(`Updated Application Forms count (${prevKeys.length} → ${nextKeys.length} forms)`);
    } else if (JSON.stringify(prevTypes) !== JSON.stringify(nextTypes)) {
      changes.push('Updated Application Form templates & questions');
    }
    if (prev.staffChannelId !== next.staffChannelId && next.staffChannelId !== undefined) {
      changes.push('Updated Staff Review channel');
    }
    if (prev.whitelistChannelId !== next.whitelistChannelId && next.whitelistChannelId !== undefined) {
      changes.push('Updated Whitelist channel');
    }
    if (prev.creatorChannelId !== next.creatorChannelId && next.creatorChannelId !== undefined) {
      changes.push('Updated Creator Review channel');
    }
    if (prev.commissionChannelId !== next.commissionChannelId && next.commissionChannelId !== undefined) {
      changes.push('Updated Commission Review channel');
    }
    if (prev.panelChannelId !== next.panelChannelId && next.panelChannelId !== undefined) {
      changes.push('Updated Application Panel destination channel');
    }
    if (JSON.stringify(prev.staffRoleIds) !== JSON.stringify(next.staffRoleIds) && next.staffRoleIds) {
      changes.push('Updated Staff Reviewer roles');
    }
    if (JSON.stringify(prev.adminRoleIds) !== JSON.stringify(next.adminRoleIds) && next.adminRoleIds) {
      changes.push('Updated Admin Decision roles');
    }
  }

  if (isIntroduction) {
    const prevQ = prev.questions || prev.config?.questions || [];
    const nextQ = next.questions || next.config?.questions || [];
    if (prevQ.length !== nextQ.length) {
      changes.push(`Updated Introduction Questions count (${prevQ.length} → ${nextQ.length} questions)`);
    } else if (JSON.stringify(prevQ) !== JSON.stringify(nextQ)) {
      changes.push('Updated Introduction questionnaire');
    }
    if (prev.introductionsChannelId !== next.introductionsChannelId && next.introductionsChannelId !== undefined) {
      changes.push('Updated Introductions Showcase channel');
    }
    if (prev.panelChannelId !== next.panelChannelId && next.panelChannelId !== undefined) {
      changes.push('Updated Introduction Prompt Panel channel');
    }
    if (prev.autoRoleId !== next.autoRoleId && next.autoRoleId !== undefined) {
      changes.push('Updated Completion Auto-Role');
    }
  }

  // Fallback comparison for generic modules / additional keys
  if (changes.length === 0) {
    const allKeys = Array.from(new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]));
    for (const key of allKeys) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        if (typeof next[key] === 'boolean') {
          changes.push(`${formattedKey} set to ${next[key] ? 'Enabled' : 'Disabled'}`);
        } else if (typeof next[key] === 'string' || typeof next[key] === 'number') {
          changes.push(`Updated ${formattedKey}`);
        } else {
          changes.push(`Updated ${formattedKey} settings`);
        }
      }
    }
  }

  return changes;
}

// ── Main Page Component ────────────────────────────────────────────────────
export const ModuleDetailPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const activeModuleId = useMemo(() => normalizeModuleId(moduleId || ''), [moduleId]);
  const navigate = useNavigate();
  const { currentGuild } = useGuildStore();
  const activeGuildId = currentGuild?.id || 'default';
  const { show: showToast } = useToast();

  const [moduleInfo, setModuleInfo] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [savedConfig, setSavedConfig] = useState<Record<string, any>>({});
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [rawYaml, setRawYaml] = useState<string>('');
  const [savedRawYaml, setSavedRawYaml] = useState<string>('');
  const [isRawSaving, setIsRawSaving] = useState(false);
  const [rawViewMode, setRawViewMode] = useState<'raw' | 'form'>('raw');

  const [modulePageFailed, setModulePageFailed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // GSAP: Animate hero banner on module load/switch
  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: -24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.48, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }
  }, [moduleId]);

  // Reset failed state when navigating to a different module
  const prevModuleId = useRef<string | undefined>(undefined);
  if (prevModuleId.current !== moduleId) {
    prevModuleId.current = moduleId;
    if (modulePageFailed) setModulePageFailed(false);
  }

  const LazyComponent = useMemo(() => resolveModuleComponent(moduleId || ''), [moduleId]);
  const hasCustomDashboardPage = Boolean(LazyComponent) && !modulePageFailed;


  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const isGuildCenter = (moduleId || '').toLowerCase().includes('guild-center');
  const isRules = (moduleId || '').toLowerCase().includes('rules');
  const isApplications = (moduleId || '').toLowerCase().includes('application');
  const isIntroduction = (moduleId || '').toLowerCase().includes('intro');
  const isExplicitSave = isGuildCenter || isRules || isApplications || isIntroduction || hasCustomDashboardPage;

  // 1. Fetch Module Details & Config
  useEffect(() => {
    if (!activeModuleId && !moduleId) return;
    setLoading(true);

    const loadData = async () => {
      try {
        const targetId = activeModuleId || moduleId;
        const [modRes, cfgRes, chanRes, roleRes, schemaRes, rawRes] = await Promise.all([
          fetch(`/api/modules/${encodeURIComponent(targetId)}`),
          fetch(`/api/guilds/${encodeURIComponent(activeGuildId)}/modules/${encodeURIComponent(targetId)}/config`),
          fetch(`/api/guilds/${encodeURIComponent(activeGuildId)}/channels`),
          fetch(`/api/guilds/${encodeURIComponent(activeGuildId)}/roles`),
          // Try the module-owned schema first (dashboard/defaultSchema.json)
          fetch(`/api/modules/${encodeURIComponent(targetId)}/schema`),
          // Fetch raw YAML config for direct module.yml support
          fetch(`/api/modules/${encodeURIComponent(targetId)}/rawconfig`),
        ]);

        if (modRes.ok) {
          try {
            const modData = await modRes.json();
            setModuleInfo(modData);
            if (modData.hasCustomComponent === false) {
              setModulePageFailed(true);
            }
          } catch {}
        }

        // Resolve default schema: prefer module-owned schema, fall back to hardcoded
        let initialCfg = getDefaultSchema(targetId);
        if (schemaRes.ok) {
          try {
            const schemaData = await schemaRes.json();
            if (schemaData && Object.keys(schemaData).length > 0) {
              initialCfg = { ...initialCfg, ...schemaData };
            }
          } catch {}
        }

        if (cfgRes.ok) {
          try {
            const cfgData = await cfgRes.json();
            if (cfgData && Object.keys(cfgData).length > 0) {
              initialCfg = { ...initialCfg, ...cfgData };
            }
          } catch {}
        }
        if (typeof initialCfg.enabled !== 'boolean') {
          initialCfg.enabled = true;
        }
        setConfig(initialCfg);
        setSavedConfig(JSON.parse(JSON.stringify(initialCfg)));

        if (rawRes.ok) {
          try {
            const rawData = await rawRes.json();
            if (rawData?.content) {
              setRawYaml(rawData.content);
              setSavedRawYaml(rawData.content);
            }
          } catch {}
        }

        if (chanRes.ok) {
          try {
            const chanData = await chanRes.json();
            setChannels(Array.isArray(chanData) ? chanData : []);
          } catch {}
        }

        if (roleRes.ok) {
          try {
            const roleData = await roleRes.json();
            setRoles(Array.isArray(roleData) ? roleData : []);
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load module details:', err);
        const targetId = activeModuleId || moduleId;
        const fallback = getDefaultSchema(targetId);
        setConfig(fallback);
        setSavedConfig(JSON.parse(JSON.stringify(fallback)));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [moduleId, activeModuleId, activeGuildId]);

  const isDirty = useMemo(() => {
    if (loading) return false;
    if (!hasCustomDashboardPage) {
      return (rawViewMode === 'raw' && rawYaml !== savedRawYaml) || JSON.stringify(config) !== JSON.stringify(savedConfig);
    }
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig, loading, hasCustomDashboardPage, rawViewMode, rawYaml, savedRawYaml]);

  // 1.5 Shared Refresh Action
  const handleRefresh = useCallback(async () => {
    if (!moduleId || !activeGuildId) return;
    setIsRefreshing(true);
    try {
      const [cfgRes, chanRes, roleRes] = await Promise.all([
        fetch(`/api/guilds/${encodeURIComponent(activeGuildId)}/modules/${encodeURIComponent(moduleId)}/config`),
        fetch(`/api/guilds/${encodeURIComponent(activeGuildId)}/channels`),
        fetch(`/api/guilds/${encodeURIComponent(activeGuildId)}/roles`),
      ]);

      if (cfgRes.ok) {
        try {
          const cfgData = await cfgRes.json();
          if (cfgData && Object.keys(cfgData).length > 0) {
            // Only update config if the user has not made unsaved changes
            setConfig((prev) => {
              const prevStr = JSON.stringify(prev);
              const savedStr = JSON.stringify(savedConfig);
              if (prevStr === savedStr) {
                setSavedConfig(JSON.parse(JSON.stringify(cfgData)));
                return cfgData;
              }
              return prev;
            });
          }
        } catch {}
      }

      if (chanRes.ok) {
        try {
          const chanData = await chanRes.json();
          if (Array.isArray(chanData)) setChannels(chanData);
        } catch {}
      }

      if (roleRes.ok) {
        try {
          const roleData = await roleRes.json();
          if (Array.isArray(roleData)) setRoles(roleData);
        } catch {}
      }

      setRefreshTick((t) => t + 1);

      showToast({
        title: 'Module Refreshed',
        message: 'Module configuration, channels, and sub-items refreshed.',
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Refresh Failed',
        message: 'Could not reach server to refresh module data.',
        type: 'error',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [moduleId, activeGuildId, savedConfig, showToast]);



  // 2. Persist Config
  const persistConfig = useCallback(
    async (newCfg?: Record<string, any>) => {
      if (!moduleId) return;
      const targetCfg = newCfg || configRef.current;
      setSaving(true);
      setSaveStatus('idle');

      try {
        const targetId = activeModuleId || moduleId;
        const guildUrl = `/api/guilds/${encodeURIComponent(activeGuildId)}/modules/${encodeURIComponent(targetId)}/config`;
        const globalUrl = `/api/modules/${encodeURIComponent(targetId)}/config`;

        const [gRes, bRes] = await Promise.all([
          fetch(guildUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetCfg),
          }),
          fetch(globalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetCfg),
          }),
        ]);

        if (gRes.ok || bRes.ok) {
          const changesList = getConfigurationChangesSummary(moduleId || '', savedConfig, targetCfg);
          const moduleName = moduleInfo?.name || formatCapitalModuleName(moduleId || 'Module');

          let toastMessage = '';
          if (changesList.length > 0) {
            const maxShown = 6;
            const shownChanges = changesList.slice(0, maxShown);
            const remaining = changesList.length - maxShown;
            toastMessage = `Applied changes to ${moduleName}:\n\n` +
              shownChanges.map((c) => `• ${c}`).join('\n') +
              (remaining > 0 ? `\n• ...and ${remaining} other update${remaining > 1 ? 's' : ''}` : '');
          } else {
            toastMessage = `${moduleName} configuration has been saved & live-synced with Discord.`;
          }

          let finalCfg = { ...targetCfg };
          try {
            const data = gRes.ok ? await gRes.json() : await bRes.json();
            if (data && data.bannerImage) {
              finalCfg.bannerImage = data.bannerImage;
            }
          } catch {}
          setConfig(finalCfg);
          setSavedConfig(JSON.parse(JSON.stringify(finalCfg)));
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
          showToast({
            title: 'Changes Saved & Live-Synced',
            message: toastMessage,
            type: 'success',
            duration: 6000,
          });
        } else {
          setSaveStatus('error');
          showToast({
            title: 'Save Error',
            message: `Could not sync configuration changes for ${moduleId}.`,
            type: 'error',
          });
        }
      } catch (err) {
        console.error('Failed to persist module config:', err);
        setSaveStatus('error');
        showToast({
          title: 'Connection Error',
          message: 'Failed to reach dashboard server to save changes.',
          type: 'error',
        });
      } finally {
        setSaving(false);
      }
    },
    [moduleId, activeGuildId, showToast, moduleInfo]
  );

  const handleSaveRawConfig = useCallback(async (contentToSave?: string) => {
    if (!moduleId) return;
    const text = contentToSave !== undefined ? contentToSave : rawYaml;
    setIsRawSaving(true);
    setSaving(true);
    setSaveStatus('idle');

    try {
      const targetId = activeModuleId || moduleId;
      const res = await fetch(`/api/modules/${encodeURIComponent(targetId)}/rawconfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        setSavedRawYaml(text);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
        showToast({
          title: 'Configuration Applied',
          message: `Updated module.yml for ${moduleInfo?.name || moduleId}. Hot-reloaded live.`,
          type: 'success',
        });
      } else {
        setSaveStatus('error');
        showToast({
          title: 'Save Failed',
          message: 'Failed to write module.yml configuration.',
          type: 'error',
        });
      }
    } catch {
      setSaveStatus('error');
      showToast({
        title: 'Save Error',
        message: 'Could not connect to dashboard server to save module.yml.',
        type: 'error',
      });
    } finally {
      setIsRawSaving(false);
      setSaving(false);
    }
  }, [moduleId, rawYaml, moduleInfo, showToast]);

  const handleTopSave = useCallback(() => {
    if (!hasCustomDashboardPage && rawViewMode === 'raw') {
      handleSaveRawConfig();
    } else {
      persistConfig(configRef.current);
    }
  }, [hasCustomDashboardPage, rawViewMode, handleSaveRawConfig, persistConfig]);

  const handleDiscard = useCallback(() => {
    setConfig(JSON.parse(JSON.stringify(savedConfig)));
    setRawYaml(savedRawYaml);
    showToast({
      title: 'Changes Discarded',
      message: 'Reverted all unsaved changes to the last saved configuration.',
      type: 'info',
    });
  }, [savedConfig, savedRawYaml, showToast]);

  const update = useCallback(
    (fieldPath: string, val: any) => {
      setConfig((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        const parts = fieldPath.split('.');
        let curr = copy;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') {
            curr[parts[i]] = {};
          }
          curr = curr[parts[i]];
        }
        curr[parts[parts.length - 1]] = val;

        // Explicit save mode: custom studio pages & explicit modules require clicking "Save Changes" instead of live-sync
        if (!isExplicitSave) {
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            persistConfig(copy);
          }, 600);
        }

        return copy;
      });
    },
    [persistConfig, isExplicitSave]
  );

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !saving) {
          handleTopSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, saving, handleTopSave]);

  const toggleMaster = useCallback(
    (checked: boolean) => {
      update('enabled', checked);
      if (isExplicitSave) {
        // For master toggle, trigger save immediately
        setTimeout(() => persistConfig({ ...configRef.current, enabled: checked }), 50);
      }
      showToast({
        title: checked ? 'Module Activated' : 'Module Disabled',
        message: `${moduleInfo?.name || moduleId} is now ${checked ? 'active' : 'disabled'}.`,
        type: checked ? 'success' : 'warning',
      });
    },
    [update, moduleInfo, moduleId, showToast, isExplicitSave, persistConfig]
  );

  // 3. Delegate to the module's registered dashboard component (from moduleRegistry)
  const renderModuleComponent = () => {
    const props: ModuleEditorProps = {
      config,
      update,
      channels,
      roles,
      filterSectionId: null,
      guildId: activeGuildId,
      onChannelCreated: (newCh) => setChannels((prev) => [...prev, newCh]),
      onSave: () => persistConfig(configRef.current),
      isDirty,
      isSaving: saving,
      onDiscard: handleDiscard,
      refreshTick,
      onRefresh: handleRefresh,
    };

    // Look up the component from the registry (supports aliases like 'tempvoice' -> 'temp-voice')
    const LazyComponent = resolveModuleComponent(moduleId || '');

    if (LazyComponent && !modulePageFailed) {
      return (
        <ModulePageErrorBoundary onFail={() => setModulePageFailed(true)}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[20vh]">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <LazyComponent {...props} />
          </Suspense>
        </ModulePageErrorBoundary>
      );
    }

    // No registered dashboard page — directly render Raw Config YAML Editor with form toggle
    return (
      <div className="space-y-4">
        <div className="saas-card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg shadow-md">
                <IconFileCode size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-mono">Raw Configuration</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    module.yml
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ● Live Hot-Reload Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  This module operates directly via its core <code className="text-violet-300 font-mono">modules/{moduleId}/module.yml</code> specification.
                </p>
              </div>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setRawViewMode('raw')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  rawViewMode === 'raw' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                YAML Editor
              </button>
              <button
                type="button"
                onClick={() => setRawViewMode('form')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  rawViewMode === 'form' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Form Fields
              </button>
            </div>
          </div>

          {rawViewMode === 'raw' ? (
            <div className="space-y-4">
              <RainbowYamlEditor
                value={rawYaml}
                onChange={setRawYaml}
                onSave={() => handleSaveRawConfig()}
                fileName={`modules/${moduleId}/module.yml`}
                minHeight="540px"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-slate-500">
                  Path: modules/{moduleId}/module.yml
                </span>
                <div className="flex items-center gap-2">
                  {rawYaml !== savedRawYaml && (
                    <button
                      type="button"
                      onClick={() => setRawYaml(savedRawYaml)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                    >
                      Revert
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveRawConfig()}
                    disabled={rawYaml === savedRawYaml || isRawSaving}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      rawYaml !== savedRawYaml
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-white/[0.05] text-slate-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    <IconDeviceFloppy size={14} />
                    <span>{isRawSaving ? 'Saving...' : 'Save module.yml (Ctrl+S)'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <UniversalModule {...props} />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading module suite...</p>
        </div>
      </div>
    );
  }

  const formattedModuleName =
    moduleInfo?.label ||
    (moduleId ? getModuleMeta(moduleId).label : undefined) ||
    moduleInfo?.name ||
    formatCapitalModuleName(moduleId || 'Module');

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-24">
      {/* ── Module Hero Banner ──────────────────────────────────────────── */}
      <div ref={heroRef} className="saas-card p-4 sm:p-6 md:p-8 relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* ── Integrated Header Actions ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10 border-b border-white/[0.06] pb-4 sm:pb-5">
          <button
            type="button"
            onClick={() => navigate('/modules')}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] active:scale-95"
          >
            <IconArrowLeft size={16} />
            <span>Back to All Modules</span>
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {isDirty && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Unsaved Changes
              </span>
            )}

            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-violet-400 font-mono px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                Saving...
              </span>
            )}

            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <IconCheck size={14} />
                Saved
              </span>
            )}

            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-rose-400 font-bold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                <IconAlertTriangle size={14} />
                Save Error
              </span>
            )}

            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 border border-white/10 active:scale-95"
              >
                <IconRotateClockwise size={14} />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTopSave}
              disabled={!isDirty || saving}
              className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isDirty
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                  : 'bg-white/[0.05] text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconDeviceFloppy size={16} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 relative z-10">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/50 border border-white/10 shadow-lg shrink-0 flex items-center justify-center text-2xl sm:text-3xl">
              {moduleInfo?.icon || getModuleMeta(moduleId || '').icon || getModuleIcon(moduleId || '', 32)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{formattedModuleName}</h1>
                <span className="px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] sm:text-[11px] font-mono text-violet-300">
                  {moduleInfo?.id || moduleId}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-[10px] sm:text-[11px] font-mono text-slate-300">
                  {moduleInfo?.version || 'v1.0.0'}
                </span>
                {!hasCustomDashboardPage && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] sm:text-[11px] font-mono font-bold text-amber-300">
                    Raw Config Mode
                  </span>
                )}
                <span className="text-[11px] sm:text-xs text-slate-400 font-mono hidden sm:inline">
                  by {moduleInfo?.author || 'Currently_Nameless & OnedEyePete'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1.5 max-w-2xl leading-relaxed">
                {moduleInfo?.description || 'Configure and customize parameters for this Discord server module.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-start gap-4 saas-subcard p-3.5 sm:p-4 shrink-0 w-full md:w-auto">
            <div>
              <span className="text-xs font-bold text-white block">Module Status</span>
              <span className="text-[10px] text-slate-400">
                {config.enabled !== false ? 'Active & Hot-Reloading' : 'Disabled'}
              </span>
            </div>
            <Switch checked={config.enabled !== false} onChange={toggleMaster} />
          </div>
        </div>
      </div>

      {/* ── Direct Module Component Suite ──────────────────────────────── */}
      <div className="space-y-6">
        {renderModuleComponent()}
      </div>

      {/* ── Mobile Sticky Save Pill (Shows when dirty on small screens) ─── */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-3 right-3 z-40 lg:hidden flex items-center justify-between p-3 rounded-2xl bg-[#090C15]/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl shadow-black/80"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">Unsaved Changes</span>
                <span className="text-[10px] text-slate-400 truncate">Tap save to hot-reload</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-white/[0.08] text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleTopSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconDeviceFloppy size={15} />
                )}
                <span>Save</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
