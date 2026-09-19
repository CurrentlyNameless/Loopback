import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconBook,
  IconSearch,
  IconX,
  IconCopy,
  IconCheck,
  IconSparkles,
  IconClock,
  IconServer,
  IconUser,
  IconPalette,
  IconMessage2,
  IconCoin,
  IconPlus,
} from '@tabler/icons-react';
import { useToast } from './Toast.tsx';

export interface VariableItem {
  token: string;
  label: string;
  category: 'guild_center' | 'server' | 'user' | 'timestamps' | 'mentions' | 'modules' | 'markdown';
  moduleTag?: string;
  description: string;
  exampleOutput: string;
  syntax?: string;
  recommended?: boolean;
}

export const ALL_VARIABLES: VariableItem[] = [
  // ── 1. Guild Center & Hub ───────────────────────────────────────────────
  {
    token: '{server}',
    label: 'Server Name',
    category: 'guild_center',
    moduleTag: 'Guild Center / Core',
    description: 'Displays the name of the Discord server.',
    exampleOutput: 'Floof Hangout',
    recommended: true,
  },
  {
    token: '{members}',
    label: 'Member Count',
    category: 'guild_center',
    moduleTag: 'Guild Center / Core',
    description: 'Total number of members in the server formatted with commas.',
    exampleOutput: '1,420',
    recommended: true,
  },
  {
    token: '{createdAt}',
    label: 'Server Created Unix Epoch',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: 'Raw Unix timestamp in seconds of when the server was founded. Use inside Discord timestamp tags.',
    exampleOutput: '1733000000',
    recommended: true,
  },
  {
    token: '<t:{createdAt}:d>',
    label: 'Server Founding Date Badge',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: "Formatted short calendar date of when the server was created in the viewer's local timezone.",
    exampleOutput: '12/01/2024',
    recommended: true,
  },
  {
    token: '<t:{createdAt}:R>',
    label: 'Server Founding Relative Time',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: 'Live-updating countdown/elapsed time since server was created.',
    exampleOutput: '2 years ago',
    recommended: true,
  },
  {
    token: '<t:{createdAt}:F>',
    label: 'Server Founding Full Date & Time',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: 'Full day, date, and time of server founding.',
    exampleOutput: 'Sunday, December 1, 2024 12:00 AM',
  },
  {
    token: '{rules_count}',
    label: 'Total Server Rules',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: 'Total number of configured rules in the Server Rules list.',
    exampleOutput: '8',
    recommended: true,
  },
  {
    token: '{roles_count}',
    label: 'Total Role Categories',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: 'Total number of self-assignable role categories available in the server.',
    exampleOutput: '5',
    recommended: true,
  },
  {
    token: '{ticket_count}',
    label: 'Active Open Tickets',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: 'Live count of currently open support tickets across all categories in this server.',
    exampleOutput: '2',
    recommended: true,
  },
  {
    token: '{icon}',
    label: 'Server Icon Image URL',
    category: 'guild_center',
    moduleTag: 'Guild Center',
    description: "Direct CDN URL to the server's icon image.",
    exampleOutput: 'https://cdn.discordapp.com/icons/123/abc.png',
  },

  // ── 2. Timestamps ───────────────────────────────────────────────────────
  {
    token: '<t:TIMESTAMP:R>',
    label: 'Relative Time (e.g. 5m ago)',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Displays a live relative duration relative to the viewer.',
    exampleOutput: '3 minutes ago / in 2 hours',
    syntax: '<t:1733000000:R>',
    recommended: true,
  },
  {
    token: '<t:TIMESTAMP:d>',
    label: 'Short Date',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Shows numerical date formatted to user locale (MM/DD/YYYY or DD/MM/YYYY).',
    exampleOutput: '08/26/2026',
    syntax: '<t:1733000000:d>',
  },
  {
    token: '<t:TIMESTAMP:D>',
    label: 'Long Date',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Spelled-out month and year.',
    exampleOutput: 'August 26, 2026',
    syntax: '<t:1733000000:D>',
  },
  {
    token: '<t:TIMESTAMP:t>',
    label: 'Short Time',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Hours and minutes formatted to user 12h/24h preference.',
    exampleOutput: '7:30 PM',
    syntax: '<t:1733000000:t>',
  },
  {
    token: '<t:TIMESTAMP:T>',
    label: 'Long Time with Seconds',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Hours, minutes, and seconds.',
    exampleOutput: '7:30:45 PM',
    syntax: '<t:1733000000:T>',
  },
  {
    token: '<t:TIMESTAMP:f>',
    label: 'Short Date & Time',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Standard date alongside hours and minutes.',
    exampleOutput: 'August 26, 2026 7:30 PM',
    syntax: '<t:1733000000:f>',
  },
  {
    token: '<t:TIMESTAMP:F>',
    label: 'Full Date & Time with Weekday',
    category: 'timestamps',
    moduleTag: 'Discord Native',
    description: 'Complete date, day of week, and time.',
    exampleOutput: 'Wednesday, August 26, 2026 7:30 PM',
    syntax: '<t:1733000000:F>',
  },

  // ── 3. Mentions & Links ─────────────────────────────────────────────────
  {
    token: '<#CHANNEL_ID>',
    label: 'Channel Mention Link',
    category: 'mentions',
    moduleTag: 'Discord Native',
    description: 'Creates a clickable hashtag link to a text/voice channel by ID.',
    exampleOutput: '#announcements',
    syntax: '<#1443754725995450448>',
    recommended: true,
  },
  {
    token: '<@&ROLE_ID>',
    label: 'Role Mention',
    category: 'mentions',
    moduleTag: 'Discord Native',
    description: 'Renders a colored role badge by ID (pings role members if permitted).',
    exampleOutput: '@Staff Team',
    syntax: '<@&123456789012345678>',
    recommended: true,
  },
  {
    token: '<@USER_ID>',
    label: 'User Mention',
    category: 'mentions',
    moduleTag: 'Discord Native',
    description: 'Renders a user ping / mention by their Discord User ID.',
    exampleOutput: '@FloofyFox',
    syntax: '<@123456789012345678>',
  },
  {
    token: '<:EMOJI_NAME:EMOJI_ID>',
    label: 'Custom Static Emoji',
    category: 'mentions',
    moduleTag: 'Discord Native',
    description: 'Renders a custom static Discord emoji.',
    exampleOutput: '🌟',
    syntax: '<:floof_sparkle:123456789>',
  },
  {
    token: '<a:EMOJI_NAME:EMOJI_ID>',
    label: 'Custom Animated Emoji',
    category: 'mentions',
    moduleTag: 'Discord Native',
    description: 'Renders a custom animated GIF Discord emoji.',
    exampleOutput: '✨ (animated)',
    syntax: '<a:party_blob:123456789>',
  },

  // ── 4. Welcome & Member Variables ───────────────────────────────────────
  {
    token: '{user}',
    label: 'Member Ping / Mention',
    category: 'user',
    moduleTag: 'Welcome / Birthdays / Alerts',
    description: 'Mentions the target member with an @ ping tag.',
    exampleOutput: '@FloofyFox',
    recommended: true,
  },
  {
    token: '{username}',
    label: 'Plain Username',
    category: 'user',
    moduleTag: 'Welcome / TempVoice',
    description: 'Raw username without sending a ping notification.',
    exampleOutput: 'floofy_fox',
    recommended: true,
  },
  {
    token: '{tag}',
    label: 'Display Name / Tag',
    category: 'user',
    moduleTag: 'Welcome / Goodbye',
    description: "Member's full display name or legacy username tag.",
    exampleOutput: 'Floofy Fox',
  },
  {
    token: '{avatar}',
    label: 'Member Avatar URL',
    category: 'user',
    moduleTag: 'Welcome / Goodbye',
    description: 'Direct link to member profile avatar.',
    exampleOutput: 'https://cdn.discordapp.com/avatars/...',
  },
  {
    token: '{memberOrdinal}',
    label: 'Member Join Ordinal',
    category: 'user',
    moduleTag: 'Welcome / Goodbye',
    description: "The member's join count with ordinal suffix (e.g. 1st, 2nd, 42nd, 100th).",
    exampleOutput: '142nd',
  },
  {
    token: '{accountAge}',
    label: 'Account Age Duration',
    category: 'user',
    moduleTag: 'Welcome / Security',
    description: "How long ago the user's Discord account was created.",
    exampleOutput: '3 years, 2 months',
  },
  {
    token: '{inviter}',
    label: 'Inviter Mention',
    category: 'user',
    moduleTag: 'Welcome Tracker',
    description: 'Mentions the user whose invite link was used.',
    exampleOutput: '@Pete',
  },

  // ── 5. Cross-Module Variables ───────────────────────────────────────────
  {
    token: '{level}',
    label: 'Level Number',
    category: 'modules',
    moduleTag: 'Levels Module',
    description: "Member's current achieved level number.",
    exampleOutput: '25',
  },
  {
    token: '{xp}',
    label: 'Total XP Points',
    category: 'modules',
    moduleTag: 'Levels Module',
    description: 'Total experience points accumulated by the member.',
    exampleOutput: '8,450',
  },
  {
    token: '{rank}',
    label: 'Leaderboard Rank',
    category: 'modules',
    moduleTag: 'Levels Module',
    description: 'Current leaderboard standing position.',
    exampleOutput: '#4',
  },
  {
    token: '{coins}',
    label: 'Wallet Coins / Balance',
    category: 'modules',
    moduleTag: 'Economy / Birthdays',
    description: 'Coins rewarded or current balance in user wallet.',
    exampleOutput: '500',
  },
  {
    token: '{bank}',
    label: 'Bank Balance',
    category: 'modules',
    moduleTag: 'Economy Module',
    description: 'Coins stored safely in user bank account.',
    exampleOutput: '15,000',
  },
  {
    token: '{streak}',
    label: 'Daily Login Streak',
    category: 'modules',
    moduleTag: 'Economy Module',
    description: 'Number of consecutive daily rewards claimed.',
    exampleOutput: '14 days',
  },
  {
    token: '{streamer}',
    label: 'Streamer Name',
    category: 'modules',
    moduleTag: 'Streamer Alerts',
    description: 'Name of the live streamer.',
    exampleOutput: 'FloofGamer',
  },
  {
    token: '{platform}',
    label: 'Live Platform',
    category: 'modules',
    moduleTag: 'Streamer Alerts',
    description: 'Twitch, YouTube, or Kick streaming platform.',
    exampleOutput: 'Twitch',
  },
  {
    token: '{url}',
    label: 'Stream Link URL',
    category: 'modules',
    moduleTag: 'Streamer Alerts',
    description: 'Direct link to the active live stream.',
    exampleOutput: 'https://twitch.tv/FloofGamer',
  },
  {
    token: '{game}',
    label: 'Stream Game / Category',
    category: 'modules',
    moduleTag: 'Streamer Alerts / TempVoice',
    description: 'Current game or streaming category.',
    exampleOutput: 'Minecraft',
  },

  // ── 6. Discord Formatting & Layout ──────────────────────────────────────
  {
    token: '## Heading 2',
    label: 'Large Section Heading',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Renders prominent bold heading text with built-in divider padding.',
    exampleOutput: '## Section Title',
    syntax: '## Section Title',
    recommended: true,
  },
  {
    token: '### Heading 3',
    label: 'Medium Sub-Heading',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Renders a clean sub-section heading.',
    exampleOutput: '### Sub-section Title',
    syntax: '### Sub-section Title',
  },
  {
    token: '-# Subtext Footer Note',
    label: 'Small Muted Subtext',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Renders tiny, muted gray footer caption text (ideal for rules notes or guidelines).',
    exampleOutput: '-# Staff will never ask for your password.',
    syntax: '-# Helper note text',
    recommended: true,
  },
  {
    token: '> Quote Callout',
    label: 'Quote Callout Block',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Renders an indented quote block with vertical accent bar on the left.',
    exampleOutput: '> Important announcement or highlight',
    syntax: '> Important note',
    recommended: true,
  },
  {
    token: '```Code Block```',
    label: 'Multiline Code Block',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Renders formatted monospace code block.',
    exampleOutput: '```js\nconsole.log("FloofCore");\n```',
    syntax: '```\nText here\n```',
  },
  {
    token: '[Link Text](https://...)',
    label: 'Masked Hyperlink',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Creates a custom clickable link with custom title (supported in embeds & Components V2).',
    exampleOutput: 'Official Website (clickable)',
    syntax: '[Official Rules](https://discord.gg)',
    recommended: true,
  },
  {
    token: '||Hidden Spoiler||',
    label: 'Spoiler Tag',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Hides text behind a dark blur box until clicked by the reader.',
    exampleOutput: '█████████ (click to view)',
    syntax: '||secret message||',
  },
  {
    token: '---',
    label: 'Horizontal Divider Line',
    category: 'markdown',
    moduleTag: 'Discord Markdown',
    description: 'Draws a full-width subtle divider line across the message.',
    exampleOutput: '────────────────────────',
    syntax: '\n---\n',
  },
];

export interface VariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (token: string) => void;
}

export type VariablesBibleModalProps = VariablesModalProps;

export const VariablesModal: React.FC<VariablesModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { show: showToast } = useToast();

  // Filter categories
  const categories = [
    { id: 'all', label: '🌟 All Variables', icon: <IconSparkles size={14} /> },
    { id: 'guild_center', label: '🏛️ Hub & Server', icon: <IconServer size={14} /> },
    { id: 'timestamps', label: '⏰ Timestamps', icon: <IconClock size={14} /> },
    { id: 'mentions', label: '📣 Mentions & Links', icon: <IconMessage2 size={14} /> },
    { id: 'user', label: '👤 User & Member', icon: <IconUser size={14} /> },
    { id: 'modules', label: '📦 All Bot Modules', icon: <IconCoin size={14} /> },
    { id: 'markdown', label: '🎨 Markdown Syntax', icon: <IconPalette size={14} /> },
  ];

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_VARIABLES.filter((item) => {
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
  }, [searchQuery, activeCategory]);

  const handleCopy = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    showToast({
      title: 'Variable Copied',
      message: `${token} copied to clipboard!`,
      type: 'info',
      duration: 2500,
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleInsert = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onInsert) {
      onInsert(token);
      showToast({
        title: 'Variable Inserted',
        message: `Inserted ${token} into message body.`,
        type: 'success',
        duration: 2000,
      });
      onClose();
    } else {
      handleCopy(token);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col saas-card border border-white/15 bg-[#0e1322]/95 backdrop-blur-xl shadow-2xl shadow-black/90 rounded-3xl overflow-hidden"
        >
          {/* Header Accent Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />

          {/* Top Bar */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-violet-300 flex items-center justify-center shadow-lg shadow-violet-500/10">
                <IconBook size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-heading">
                    Message Variables
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Dynamic Tokens
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  The complete directory of dynamic placeholders, timestamps, mentions &amp; Discord tokens.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/10"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/20 space-y-3">
            <div className="relative">
              <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search variables, tokens, examples, or modules (e.g. server, member, timestamp, rules)..."
                className="saas-input w-full pl-10 pr-10 py-2.5 text-xs font-sans rounded-xl bg-black/40 border-white/10 focus:border-violet-500 text-white placeholder-slate-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border ${
                    activeCategory === cat.id
                      ? 'bg-violet-600 text-white border-violet-400/40 shadow-lg shadow-violet-600/20'
                      : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Variables Grid Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3 max-h-[55vh]">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center mx-auto">
                  <IconSearch size={22} />
                </div>
                <div className="text-sm font-bold text-white">No matching variables found</div>
                <div className="text-xs text-slate-400">
                  Try searching for another keyword or switch category filters.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredList.map((item) => (
                  <div
                    key={item.token}
                    onClick={() => handleInsert(item.token)}
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between group cursor-pointer relative shadow-sm hover:shadow-lg hover:shadow-violet-600/5"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <code className="px-2 py-0.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono text-xs font-bold group-hover:border-violet-400 transition-colors">
                            {item.token}
                          </code>
                          {item.recommended && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
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

                      {/* Title & Description */}
                      <div className="text-xs font-bold text-white group-hover:text-violet-200 transition-colors">
                        {item.label}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Example & Actions Footer */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 truncate">
                        <span className="text-slate-500 font-bold mr-1">Preview:</span>
                        <span className="text-emerald-300 font-mono font-medium">{item.exampleOutput}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Copy to clipboard"
                          onClick={(e) => handleCopy(item.token, e)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-white/5"
                        >
                          {copiedToken === item.token ? (
                            <>
                              <IconCheck size={12} className="text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <IconCopy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {onInsert && (
                          <button
                            type="button"
                            title="Insert into message body"
                            onClick={(e) => handleInsert(item.token, e)}
                            className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-violet-600/20"
                          >
                            <IconPlus size={12} />
                            <span>Insert</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <IconSparkles size={15} className="text-violet-400" />
              <span>
                Tip: Click any variable card to <strong className="text-white">insert directly</strong> into your message body!
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer border border-white/10"
            >
              Done / Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const VariablesBibleModal = VariablesModal;
export default VariablesModal;
