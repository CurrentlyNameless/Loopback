import React, { useState, useMemo, useEffect } from 'react';
import {
  Search as IconSearch,
  Copy as IconCopy,
  Check as IconCheck,
  Sparkles as IconSparkles,
  Clock as IconClock,
  Server as IconServer,
  User as IconUser,
  Palette as IconPalette,
  MessageSquare as IconMessage2,
  Coins as IconCoin,
  Mic as IconMicrophone,
  X as IconX,
  ExternalLink as IconExternalLink,
  Code as IconCode,
  Wand2 as IconWand,
  Dices as IconDice,
  Plus as IconPlus,
  Trash2 as IconTrash,
} from 'lucide-react';
import { useToast } from '../Toast';
import { useDiscordContext } from './LivePreview';
import {
  ALL_VARIABLES,
  type VariableItem,
  VariablesModal,
  type VariablesModalProps,
} from '../VariablesModal';
import { VariableSelectMenu, type VariableSelectMenuProps } from './VariableSelectMenu';

export * from '../VariablesModal';
export { VariableSelectMenu } from './VariableSelectMenu';
export type { VariableSelectMenuProps };

const RAW_EXTENDED_VARIABLES: VariableItem[] = [
  ...ALL_VARIABLES,
  {
    token: '{displayName}',
    label: 'Channel Creator Display Name',
    category: 'user',
    moduleTag: 'Temp Voice / Core',
    description: 'Server nickname or global display name of the user.',
    exampleOutput: 'Pete (Admin)',
    recommended: true,
  },
  {
    token: '{bitrate}',
    label: 'Channel Audio Bitrate',
    category: 'guild_center',
    moduleTag: 'Temp Voice',
    description: 'Current voice channel bitrate in kbps.',
    exampleOutput: '96 kbps',
  },
  {
    token: '{limit}',
    label: 'Channel User Limit',
    category: 'guild_center',
    moduleTag: 'Temp Voice',
    description: 'Maximum user capacity of the voice room or "Unlimited".',
    exampleOutput: '5 Users',
  },
  {
    token: '{counter}',
    label: 'Auto Increment Counter',
    category: 'guild_center',
    moduleTag: 'Temp Voice',
    description: 'Numerical counter for sequential channel generation (e.g. Squad #1, Squad #2).',
    exampleOutput: '#1',
  },
];

// De-duplicate items by token so React list keys are strictly unique
const EXTENDED_VARIABLES: VariableItem[] = Array.from(
  new Map(RAW_EXTENDED_VARIABLES.map((item) => [item.token, item])).values()
);

export interface CustomVariable {
  id: string;
  name: string;
  value: string;
  description?: string;
  createdAt: number;
}

export interface VariablesPageProps {
  module?: string;
  allowedCategories?: Array<'guild_center' | 'server' | 'user' | 'timestamps' | 'mentions' | 'modules' | 'markdown'>;
  onSelect?: (token: string) => void;
  accentColor?: 'violet' | 'cyan' | 'emerald' | 'amber';
  title?: string;
  subtitle?: string;
}

export const VariablesPage: React.FC<VariablesPageProps> = ({
  module,
  allowedCategories,
  onSelect,
  accentColor = 'violet',
  title = 'Dynamic Variables & Builder Studio',
  subtitle = 'Browse built-in tokens, visually build Discord timestamps & dynamic randomizers, or create your own custom guild variables.',
}) => {
  const [subView, setSubView] = useState<'builder' | 'browse' | 'tester' | 'custom'>('builder');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // ── Timestamp Builder State ───────────────────────────────────────────────
  const [tsPreset, setTsPreset] = useState<'now' | 'created' | '1h' | '24h' | '7d' | 'custom'>('now');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [tsStyle, setTsStyle] = useState<':R' | ':d' | ':D' | ':t' | ':T' | ':f' | ':F'>(':R');

  // ── Logic & Randomizer Builder State ──────────────────────────────────────
  const [randomMin, setRandomMin] = useState<number>(1);
  const [randomMax, setRandomMax] = useState<number>(100);
  const [choiceItems, setChoiceItems] = useState<string>('Yes, No, Maybe, Definitely!');

  // ── Interactive String Tester State ───────────────────────────────────────
  const [testString, setTestString] = useState<string>(
    '🎉 Welcome {user} to **{server}**! We are thrilled to have you here.\n\n' +
    '👥 Total Members: `{members}`\n' +
    '📅 Server Founded: <t:{createdAt}:D> (<t:{createdAt}:R>)\n' +
    '🎲 Your Lucky Number Today: {random:1-100}\n\n' +
    '-# Enjoy your stay in {server}!'
  );

  const { show: showToast } = useToast();
  const { currentGuild, user, botInfo, resolveVariables } = useDiscordContext();
  const guildId = currentGuild?.id || 'default';
  const storageKey = `floof_custom_vars_${guildId}`;

  // ── Custom Variables State (Persisted in localStorage per Guild) ──────────
  const [customVars, setCustomVars] = useState<CustomVariable[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', name: 'rules_link', value: 'https://discord.gg/rules', description: 'Official server rules link', createdAt: Date.now() },
      { id: '2', name: 'support_email', value: 'support@floofcore.com', description: 'Public support contact email', createdAt: Date.now() },
      { id: '3', name: 'announcement_role', value: '<@&1234567890>', description: 'Global announcements role tag', createdAt: Date.now() },
    ];
  });

  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newVarDesc, setNewVarDesc] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(customVars));
    } catch {}
  }, [customVars, storageKey]);

  const colorThemes = {
    violet: {
      activeTab: 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 border-violet-400/40',
      badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
      tokenBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300 group-hover:border-violet-400',
      borderHover: 'hover:border-violet-500/40',
      headerGlow: 'from-violet-900/20 via-deck-900 to-deck-900 border-violet-500/20',
      iconText: 'text-violet-400',
      btnAccent: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30',
    },
    cyan: {
      activeTab: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border-cyan-400/40',
      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      tokenBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 group-hover:border-cyan-400',
      borderHover: 'hover:border-cyan-500/40',
      headerGlow: 'from-cyan-900/20 via-deck-900 to-deck-900 border-cyan-500/20',
      iconText: 'text-cyan-400',
      btnAccent: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30',
    },
    emerald: {
      activeTab: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-400/40',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      tokenBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 group-hover:border-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      headerGlow: 'from-emerald-900/20 via-deck-900 to-deck-900 border-emerald-500/20',
      iconText: 'text-emerald-400',
      btnAccent: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30',
    },
    amber: {
      activeTab: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border-amber-400/40',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      tokenBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300 group-hover:border-amber-400',
      borderHover: 'hover:border-amber-500/40',
      headerGlow: 'from-amber-900/20 via-deck-900 to-deck-900 border-amber-500/20',
      iconText: 'text-amber-400',
      btnAccent: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30',
    },
  }[accentColor];

  const categories = useMemo(() => [
    { id: 'all', label: '🌟 All Tokens', icon: <IconSparkles size={14} /> },
    { id: 'guild_center', label: '🏛️ Server & Hub', icon: <IconServer size={14} /> },
    { id: 'user', label: '👤 User & Member', icon: <IconUser size={14} /> },
    { id: 'timestamps', label: '⏰ Timestamps & Dates', icon: <IconClock size={14} /> },
    { id: 'mentions', label: '📣 Mentions & IDs', icon: <IconMessage2 size={14} /> },
    { id: 'modules', label: '📦 Module Specific', icon: <IconCoin size={14} /> },
    { id: 'markdown', label: '🎨 Markdown & Text', icon: <IconPalette size={14} /> },
  ], []);

  const baseVariables = useMemo(() => {
    if (!allowedCategories || allowedCategories.length === 0) return EXTENDED_VARIABLES;
    return EXTENDED_VARIABLES.filter((item) => allowedCategories.includes(item.category));
  }, [allowedCategories]);

  const filteredVariables = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return baseVariables.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCategory) return false;
      if (!q) return true;

      return (
        item.token.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.moduleTag && item.moduleTag.toLowerCase().includes(q)) ||
        (item.exampleOutput && item.exampleOutput.toLowerCase().includes(q))
      );
    });
  }, [baseVariables, searchQuery, activeCategory]);

  const handleCopy = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    showToast({
      title: 'Variable Copied',
      message: `${token} copied to clipboard!`,
      type: 'info',
      duration: 2200,
    });
    setTimeout(() => setCopiedToken(null), 1800);
    if (onSelect) {
      onSelect(token);
    }
  };

  // Helper to dynamically calculate live output for current guild & user
  const getLivePreviewValue = (item: VariableItem) => {
    if (item.token === '{server}' || item.token === '{guild}' || item.token === '{guildName}') {
      return currentGuild?.name || 'Your Server';
    }
    if (item.token === '{members}' || item.token === '{memberCount}') {
      return (currentGuild?.memberCount || currentGuild?.stats?.memberCount || 1234).toLocaleString();
    }
    if (item.token === '{user}' || item.token === '{username}' || item.token === '{displayName}') {
      return user?.globalName || user?.username || 'Pete';
    }
    if (item.token === '{tag}') {
      return user?.username ? `@${user.username}` : '@Pete';
    }
    if (item.token === '{bitrate}') {
      return `${currentGuild?.maximumBitrateKbps || 96} kbps`;
    }
    if (item.token === '{rules_count}') {
      return '12';
    }
    if (item.token === '{ticket_count}') {
      return '0';
    }
    if (item.token === '{roles_count}') {
      return String(currentGuild?.stats?.rolesCount || '4');
    }
    return item.exampleOutput;
  };

  // ── Calculated Unix Timestamp for Builder ────────────────────────────────
  const resolvedTimestampNumber = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    switch (tsPreset) {
      case 'now':
        return nowSec;
      case 'created':
        return Math.floor(Date.now() / 1000) - 86400 * 365;
      case '1h':
        return nowSec + 3600;
      case '24h':
        return nowSec + 86400;
      case '7d':
        return nowSec + 86400 * 7;
      case 'custom': {
        const d = new Date(customDateTime);
        return isNaN(d.getTime()) ? nowSec : Math.floor(d.getTime() / 1000);
      }
      default:
        return nowSec;
    }
  }, [tsPreset, customDateTime]);

  const generatedTimestampToken = useMemo(() => {
    if (tsPreset === 'created') {
      return `<t:{createdAt}${tsStyle}>`;
    }
    return `<t:${resolvedTimestampNumber}${tsStyle}>`;
  }, [tsPreset, resolvedTimestampNumber, tsStyle]);

  const timestampStyles = useMemo(() => [
    { tag: ':R', name: 'Relative Time', example: '3 minutes ago / in 2 hours', desc: 'Auto-updating countdown/elapsed time' },
    { tag: ':d', name: 'Short Date', example: '12/01/2024', desc: 'Locale numerical date' },
    { tag: ':D', name: 'Long Date', example: 'December 1, 2024', desc: 'Full month, day and year' },
    { tag: ':t', name: 'Short Time', example: '12:00 AM', desc: 'Hour and minute' },
    { tag: ':T', name: 'Long Time', example: '12:00:00 AM', desc: 'Hour, minute, and second' },
    { tag: ':f', name: 'Short Date & Time', example: 'Dec 1, 2024 12:00 AM', desc: 'Combined short date & time' },
    { tag: ':F', name: 'Full Date & Time', example: 'Sunday, Dec 1, 2024 12:00 AM', desc: 'Complete day of week, date and time' },
  ], []);

  const handleAddCustomVar = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newVarName.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanName) {
      showToast({ title: 'Invalid Name', message: 'Name must be alphanumeric (e.g. support_link)', type: 'error' });
      return;
    }
    if (customVars.some((v) => v.name.toLowerCase() === cleanName.toLowerCase())) {
      showToast({ title: 'Variable Exists', message: `{custom:${cleanName}} already exists`, type: 'error' });
      return;
    }

    const newVar: CustomVariable = {
      id: String(Date.now()),
      name: cleanName,
      value: newVarValue,
      description: newVarDesc || undefined,
      createdAt: Date.now(),
    };
    setCustomVars((prev) => [newVar, ...prev]);
    setNewVarName('');
    setNewVarValue('');
    setNewVarDesc('');
    showToast({ title: 'Variable Created!', message: `{custom:${cleanName}} is now ready to use`, type: 'success' });
  };

  const handleDeleteCustomVar = (id: string) => {
    setCustomVars((prev) => prev.filter((v) => v.id !== id));
    showToast({ title: 'Variable Deleted', message: 'Custom variable removed', type: 'info' });
  };

  // ── Live String Resolver for Tester ──────────────────────────────────────
  const resolvedTestOutput = useMemo(() => {
    if (!testString) return '';
    let out = testString;

    const realServerName = currentGuild?.name || 'Floof Hangout';
    const realMemberCount = (currentGuild?.memberCount || currentGuild?.stats?.memberCount || 1420).toLocaleString();
    const realUserName = user?.globalName || user?.username || 'Pete';
    const realTag = user?.username ? `@${user.username}` : '@Pete';
    const realCreatedAt = String(Math.floor(Date.now() / 1000) - 86400 * 365);

    out = out
      .replace(/\{server\}|\{guild\}|\{guildName\}/g, realServerName)
      .replace(/\{members\}|\{memberCount\}/g, realMemberCount)
      .replace(/\{user\}|\{username\}|\{displayName\}/g, realUserName)
      .replace(/\{tag\}/g, realTag)
      .replace(/\{createdAt\}/g, realCreatedAt)
      .replace(/\{bitrate\}/g, `${currentGuild?.maximumBitrateKbps || 96} kbps`)
      .replace(/\{rules_count\}/g, '12')
      .replace(/\{roles_count\}/g, String(currentGuild?.stats?.rolesCount || '5'))
      .replace(/\{ticket_count\}/g, '0');

    customVars.forEach((cv) => {
      const reg = new RegExp(`\\{custom:${cv.name}\\}`, 'g');
      out = out.replace(reg, cv.value);
    });

    out = out.replace(/\{random:(\d+)-(\d+)\}/g, (_match, min, max) => {
      const mn = parseInt(min);
      const mx = parseInt(max);
      return String(Math.floor(Math.random() * (mx - mn + 1)) + mn);
    });

    out = out.replace(/\{choose:([^}]+)\}/g, (_match, items) => {
      const arr = items.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (arr.length === 0) return '';
      return arr[Math.floor(Math.random() * arr.length)];
    });

    return out;
  }, [testString, currentGuild, user, customVars]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header Hero Banner ────────────────────────────────────────── */}
      <div className={`saas-card p-6 border rounded-2xl bg-gradient-to-r ${colorThemes.headerGlow} space-y-4 shadow-xl`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center font-mono text-sm font-extrabold ${colorThemes.iconText}`}>
                {'{…}'}
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${colorThemes.badge} border`}>
                {baseVariables.length} Tokens
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Real Live Context Indicator */}
          <div className="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Server Context</span>
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span className="truncate max-w-[180px]">{currentGuild?.name || 'Connected Server'}</span>
              <span className="text-[10px] text-slate-500">·</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {user?.globalName || user?.username || 'User'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sub-Navigation Modes ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => setSubView('builder')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'builder' ? colorThemes.activeTab : 'text-slate-400 hover:text-white'
              }`}
            >
              <IconWand size={15} />
              <span>Variable Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('tester')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'tester' ? colorThemes.activeTab : 'text-slate-400 hover:text-white'
              }`}
            >
              <IconSparkles size={15} />
              <span>String Playground</span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'custom' ? colorThemes.activeTab : 'text-slate-400 hover:text-white'
              }`}
            >
              <IconPlus size={15} />
              <span>Custom Variables ({customVars.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('browse')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'browse' ? colorThemes.activeTab : 'text-slate-400 hover:text-white'
              }`}
            >
              <IconSearch size={15} />
              <span>Browse All ({baseVariables.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            Tip: Click any token to copy directly
          </div>
        </div>

        {/* Search Bar & Category Chips (Shown only when in browse mode) */}
        {subView === 'browse' && (
          <div className="space-y-3 pt-1 border-t border-white/[0.08]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search variables (e.g. {server}, user, timestamps)..."
                  className="saas-input w-full pl-9 pr-8 py-2 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Showing <strong className="text-white font-mono">{filteredVariables.length}</strong> available tokens</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map((cat) => {
                const count = cat.id === 'all' 
                  ? baseVariables.length 
                  : baseVariables.filter((v) => v.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border select-none ${
                      activeCategory === cat.id
                        ? colorThemes.activeTab
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                    <span className="text-[10px] font-mono opacity-70 ml-0.5">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── MODE 1: VISUAL VARIABLE BUILDER (BotGhost Style) ─────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subView === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Builders (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Discord Native Timestamp Constructor */}
            <div className="saas-card p-6 space-y-4 border border-white/[0.08]">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <IconClock size={18} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Discord Native Timestamp Builder</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Interactive
                </span>
              </div>

              {/* Step 1: Pick Timestamp Origin */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">1. Select Target Time / Origin:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'now', label: '⏱️ Current Time' },
                    { id: 'created', label: '🏛️ Server Founding' },
                    { id: '1h', label: '⏳ In 1 Hour' },
                    { id: '24h', label: '🌅 In 24 Hours' },
                    { id: '7d', label: '📆 In 7 Days' },
                    { id: 'custom', label: '📅 Custom Date/Time' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTsPreset(p.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        tsPreset === p.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{p.label}</span>
                      {tsPreset === p.id && <IconCheck size={14} className="text-amber-400 shrink-0" />}
                    </button>
                  ))}
                </div>

                {tsPreset === 'custom' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="text-[11px] text-slate-400 block mb-1">Pick Exact Date &amp; Time:</label>
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="saas-input w-full p-2.5 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Step 2: Pick Discord Format Style */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300 block">2. Select Discord Display Format Style:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {timestampStyles.map((s) => (
                    <button
                      key={s.tag}
                      type="button"
                      onClick={() => setTsStyle(s.tag as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        tsStyle === s.tag
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-950/20'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{s.name}</span>
                        <code className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-black/40 text-amber-300">
                          {s.tag}
                        </code>
                      </div>
                      <div className="text-[11px] text-slate-400">{s.desc}</div>
                      <div className="text-[10px] font-mono text-emerald-300 pt-0.5">
                        Preview: {s.example}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Generated Token Result Box */}
              <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-black/50 border border-amber-500/30">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">
                    Generated Discord Timestamp Token:
                  </span>
                  <div className="font-mono text-sm font-extrabold text-white">
                    {generatedTimestampToken}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(generatedTimestampToken)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
                >
                  {copiedToken === generatedTimestampToken ? (
                    <>
                      <IconCheck size={15} />
                      <span>Copied Token!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy size={15} />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Logic & Randomizer Builder */}
            <div className="saas-card p-6 space-y-4 border border-white/[0.08]">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <IconDice size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Logic &amp; Randomizer Constructor</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  BotGhost Style
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Random Number Range Builder */}
                <div className="saas-subcard p-4 space-y-3">
                  <span className="text-xs font-bold text-white block">Random Number Generator</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Min Value</label>
                      <input
                        type="number"
                        value={randomMin}
                        onChange={(e) => setRandomMin(parseInt(e.target.value) || 0)}
                        className="saas-input w-full p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Max Value</label>
                      <input
                        type="number"
                        value={randomMax}
                        onChange={(e) => setRandomMax(parseInt(e.target.value) || 100)}
                        className="saas-input w-full p-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <code className="text-xs font-mono text-cyan-300 font-bold">
                      {`{random:${randomMin}-${randomMax}}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(`{random:${randomMin}-${randomMax}}`)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <IconCopy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Random Choice Picker */}
                <div className="saas-subcard p-4 space-y-3">
                  <span className="text-xs font-bold text-white block">Random Choice Selector</span>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Comma-separated Options</label>
                    <input
                      type="text"
                      value={choiceItems}
                      onChange={(e) => setChoiceItems(e.target.value)}
                      placeholder="Red, Blue, Green, Gold"
                      className="saas-input w-full p-2 text-xs font-mono"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <code className="text-xs font-mono text-cyan-300 font-bold truncate max-w-[150px]">
                      {`{choose:${choiceItems}}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(`{choose:${choiceItems}}`)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <IconCopy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Generator Deck (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="saas-card p-6 space-y-4 border border-white/[0.08]">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
                <IconSparkles size={18} className="text-violet-400" />
                <h3 className="text-sm font-bold text-white">Popular Quick-Insert Cards</h3>
              </div>

              <div className="space-y-2">
                {[
                  { token: '{user}', label: 'User Mention', desc: 'Pings the member who invoked the action', preview: `@${user?.username || 'Pete'}` },
                  { token: '{server}', label: 'Server Name', desc: 'Current Discord guild name', preview: currentGuild?.name || 'Your Server' },
                  { token: '{members}', label: 'Member Count', desc: 'Live formatted member count', preview: '1,420' },
                  { token: '<t:{createdAt}:R>', label: 'Founding Relative Date', desc: 'e.g. 2 years ago', preview: '2 years ago' },
                  { token: '{tag}', label: 'User Tag', desc: 'Username without mention ping', preview: `@${user?.username || 'Pete'}` },
                  { token: '<#CHANNEL_ID>', label: 'Channel Link', desc: 'Creates a clickable channel mention link', preview: '#general' },
                  { token: '<@&ROLE_ID>', label: 'Role Mention', desc: 'Pings or displays role pill', preview: '@Member' },
                ].map((item) => (
                  <div
                    key={item.token}
                    onClick={() => handleCopy(item.token)}
                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-violet-500/40 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                          {item.token}
                        </code>
                        <span className="text-xs font-bold text-white truncate">{item.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        Preview: <span className="text-emerald-300 font-mono">{item.preview}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Copy Token"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 group-hover:text-white transition-colors shrink-0"
                    >
                      {copiedToken === item.token ? <IconCheck size={14} className="text-emerald-400" /> : <IconCopy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── MODE 2: INTERACTIVE STRING PLAYGROUND / TESTER ───────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subView === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Input Textarea (6 cols) */}
          <div className="lg:col-span-6 saas-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <IconCode size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Live Template String Editor</h3>
              </div>
              <button
                type="button"
                onClick={() => setTestString('')}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Type or paste your message template containing dynamic tokens below. FloofCore will resolve each token in real time against your connected server and user context.
            </p>

            {/* Quick Token Helper Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['{server}', '{members}', '{user}', '{tag}', '<t:{createdAt}:R>', '{random:1-100}'].map((tok) => (
                <button
                  key={tok}
                  type="button"
                  onClick={() => setTestString((prev) => `${prev} ${tok}`)}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-[11px] border border-white/10 cursor-pointer"
                >
                  + {tok}
                </button>
              ))}
            </div>

            <textarea
              rows={11}
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              className="saas-input w-full p-3 font-mono text-xs leading-relaxed resize-y"
              placeholder="Type your message with {variables} here..."
            />

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Length: <strong className="text-white font-mono">{testString.length}</strong> chars</span>
              <button
                type="button"
                onClick={() => handleCopy(testString)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <IconCopy size={13} />
                <span>Copy Template</span>
              </button>
            </div>
          </div>

          {/* Right: Real-time Discord Rendered Output (6 cols) */}
          <div className="lg:col-span-6 saas-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <IconSparkles size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Resolved Discord Output</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ● Live Evaluated
              </span>
            </div>

            <p className="text-xs text-slate-400">
              This is the final text Discord members will see when this message is posted to channels or sent via DM:
            </p>

            {/* Discord Dark Theme Bubble Simulator */}
            <div className="rounded-2xl bg-[#313338] border border-black/30 p-5 shadow-2xl font-sans text-sm text-[#dbdee1] space-y-3 select-none">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {botInfo?.username?.slice(0, 2)?.toUpperCase() || 'FC'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs">{botInfo?.username || 'FloofCore'}</span>
                    <span className="bg-[#5865f2] text-[10px] text-white px-1 rounded uppercase font-bold">BOT</span>
                  </div>
                  <span className="text-[10px] text-[#949ba4]">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Resolved Text Body */}
              <div className="whitespace-pre-wrap leading-relaxed text-xs font-sans text-[#dbdee1] break-words">
                {resolvedTestOutput || <span className="text-[#949ba4] italic">Type something in the template editor to see live evaluation...</span>}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Resolved Length: <strong className="text-white font-mono">{resolvedTestOutput.length}</strong> chars</span>
              <button
                type="button"
                onClick={() => handleCopy(resolvedTestOutput)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <IconCheck size={14} />
                <span>Copy Resolved Text</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── MODE 3: CUSTOM SERVER VARIABLES (BotGhost Custom Placeholders) ─ */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subView === 'custom' && (
        <div className="space-y-6">
          {/* Create New Custom Variable Card */}
          <div className="saas-card p-6 space-y-4 border border-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <IconPlus size={18} className="text-violet-400" />
                <h3 className="text-sm font-bold text-white">Create New Custom Variable</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Server-Scoped Placeholders</span>
            </div>

            <form onSubmit={handleAddCustomVar} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-300 block mb-1">Variable Name (Token)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-violet-400 text-xs font-bold">{'{custom:'}</span>
                  <input
                    type="text"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="website"
                    className="saas-input w-full pl-20 pr-7 py-2 text-xs font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-violet-400 text-xs font-bold">{'}'}</span>
                </div>
              </div>

              <div className="sm:col-span-5">
                <label className="text-xs font-bold text-slate-300 block mb-1">Replacement Value</label>
                <input
                  type="text"
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  placeholder="https://floofcore.com/store"
                  className="saas-input w-full px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-300 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newVarDesc}
                  onChange={(e) => setNewVarDesc(e.target.value)}
                  placeholder="Official server store URL"
                  className="saas-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md ${colorThemes.btnAccent}`}
                >
                  <IconPlus size={14} />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Defined Custom Variables */}
          <div className="saas-card p-6 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Saved Custom Variables for {currentGuild?.name || 'this server'} ({customVars.length})
            </h4>

            {customVars.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No custom variables created yet. Use the form above to define your first custom variable!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customVars.map((v) => {
                  const fullToken = `{custom:${v.name}}`;
                  const isCopied = copiedToken === fullToken;

                  return (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 transition-all flex flex-col justify-between gap-3 group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <code className="px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 font-mono text-xs font-extrabold">
                            {fullToken}
                          </code>
                          <button
                            type="button"
                            title="Delete custom variable"
                            onClick={() => handleDeleteCustomVar(v.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                        <div className="text-xs font-bold text-white mt-1.5">{v.description || v.name}</div>
                        <div className="text-[11px] font-mono text-emerald-300 truncate bg-black/30 p-1.5 rounded-lg border border-white/5">
                          {v.value}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Click to copy token</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(fullToken)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border border-white/10"
                        >
                          {isCopied ? <IconCheck size={12} className="text-emerald-400" /> : <IconCopy size={12} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── MODE 4: FULL BROWSE ALL CARDS (Encyclopedia) ─────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subView === 'browse' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVariables.map((item) => {
              const isCopied = copiedToken === item.token;
              const liveResolved = getLivePreviewValue(item);

              return (
                <div
                  key={item.token}
                  onClick={() => handleCopy(item.token)}
                  className={`saas-card p-4 flex flex-col justify-between border border-white/[0.08] ${colorThemes.borderHover} hover:bg-white/[0.03] transition-all group cursor-pointer relative shadow-sm hover:shadow-xl hover:scale-[1.01]`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <code className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-extrabold transition-all shadow-sm ${colorThemes.tokenBg}`}>
                          {item.token}
                        </code>
                        {item.recommended && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ⭐ Popular
                          </span>
                        )}
                      </div>

                      {item.moduleTag && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0">
                          {item.moduleTag}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-white group-hover:text-violet-200 transition-colors">
                      {item.label}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400 truncate min-w-0">
                      <span className="text-slate-500 font-bold mr-1">Resolves To:</span>
                      <span className="text-emerald-300 font-mono font-semibold truncate inline-block max-w-[140px] align-bottom">
                        {liveResolved}
                      </span>
                    </div>

                    <button
                      type="button"
                      title="Click to copy token"
                      onClick={(e) => handleCopy(item.token, e)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/5'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <IconCheck size={12} className="text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <IconCopy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const VariablesTab = VariablesPage;
export default VariablesPage;
