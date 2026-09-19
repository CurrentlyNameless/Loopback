export interface ModuleMeta {
  id: string;
  label: string;
  icon: string;
  category: 'security' | 'utility' | 'engagement' | 'system';
  description: string;
  color: string;
  gradient: string;
  author?: string;
  version?: string;
}

export function moduleSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const MODULE_EMOJI_REGISTRY: Record<string, Omit<ModuleMeta, 'id'>> = {
  // Security & Moderation
  'automod': {
    label: 'Auto Moderation',
    icon: '🔨',
    category: 'security',
    description: 'Anti-spam heuristics, toxic text filters, and automated warn/mute/ban actions.',
    color: '#EF4444',
    gradient: 'from-rose-600 to-red-600',
  },
  'auto-mod': {
    label: 'Auto Moderation',
    icon: '🔨',
    category: 'security',
    description: 'Anti-spam heuristics, toxic text filters, and automated warn/mute/ban actions.',
    color: '#EF4444',
    gradient: 'from-rose-600 to-red-600',
  },
  'blacklist': {
    label: 'OAuth2 Blacklist',
    icon: '🚫',
    category: 'security',
    description: 'Automatically bans members arriving from known raid and malicious servers.',
    color: '#DC2626',
    gradient: 'from-red-600 to-rose-700',
  },
  'honeypot': {
    label: 'Honeypot Trap',
    icon: '🍯',
    category: 'security',
    description: 'Hidden channel traps that instantly detect, isolate, and ban user-bot scrapers.',
    color: '#F59E0B',
    gradient: 'from-amber-600 to-orange-600',
  },
  'appeals': {
    label: 'Member Appeals',
    icon: '⚖️',
    category: 'security',
    description: 'Web-based ban appeal portal with staff verdict workflows and discord notifications.',
    color: '#8B5CF6',
    gradient: 'from-purple-600 to-indigo-600',
  },
  'appeals-manager': {
    label: 'Member Appeals',
    icon: '⚖️',
    category: 'security',
    description: 'Web-based ban appeal portal with staff verdict workflows and discord notifications.',
    color: '#8B5CF6',
    gradient: 'from-purple-600 to-indigo-600',
  },
  'anti-mention': {
    label: 'Anti-Mention',
    icon: '🔕',
    category: 'security',
    description: 'Protects designated members from unwanted mentions and @username pings with auto-delete and warning alerts.',
    color: '#EC4899',
    gradient: 'from-pink-600 to-rose-600',
  },
  'antimention': {
    label: 'Anti-Mention',
    icon: '🔕',
    category: 'security',
    description: 'Protects designated members from unwanted mentions and @username pings with auto-delete and warning alerts.',
    color: '#EC4899',
    gradient: 'from-pink-600 to-rose-600',
  },

  // Engagement & Community
  'leveling': {
    label: 'Leveling & XP Engine',
    icon: '🏆',
    category: 'engagement',
    description: 'Chat message XP points, voice activity rewards, and customizable rank cards.',
    color: '#EAB308',
    gradient: 'from-yellow-500 to-amber-600',
  },
  'economy': {
    label: 'Economy & Virtual Bank',
    icon: '🪙',
    category: 'engagement',
    description: 'Virtual currency, server shop items, daily rewards, and bank transfers.',
    color: '#10B981',
    gradient: 'from-emerald-600 to-teal-600',
  },
  'economy-builder': {
    label: 'Economy Builder',
    icon: '💰',
    category: 'engagement',
    description: 'Advanced custom items, dynamic market stock prices, and casino games.',
    color: '#059669',
    gradient: 'from-emerald-700 to-teal-700',
  },
  'music': {
    label: 'Neural Voice Player',
    icon: '🎶',
    category: 'engagement',
    description: 'Voice channel audio streamer with queue management and custom DSP filters.',
    color: '#EC4899',
    gradient: 'from-pink-600 to-rose-600',
  },
  'advent-calendar': {
    label: 'Advent Calendar Builder',
    icon: '🎄',
    category: 'engagement',
    description: 'Personalized Christmas countdown calendar with daily door punch-outs, luck loot drops, and streak tracking.',
    color: '#C41E3A',
    gradient: 'from-red-600 to-rose-700',
  },
  'advent': {
    label: 'Advent Calendar Builder',
    icon: '🎄',
    category: 'engagement',
    description: 'Personalized Christmas countdown calendar with daily door punch-outs, luck loot drops, and streak tracking.',
    color: '#C41E3A',
    gradient: 'from-red-600 to-rose-700',
  },
  'birthdays': {
    label: 'Birthday Celebrations',
    icon: '🎂',
    category: 'engagement',
    description: 'Automated member birthday wishes with canvas banners, zodiac signs, and celebration buttons.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'birthday': {
    label: 'Birthday Celebrations',
    icon: '🎂',
    category: 'engagement',
    description: 'Automated member birthday wishes with canvas banners, zodiac signs, and celebration buttons.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'giveaways': {
    label: 'Giveaways & Sweepstakes',
    icon: '🎁',
    category: 'engagement',
    description: 'Interactive button-based giveaway roll engine with reroll and requirements.',
    color: '#F43F5E',
    gradient: 'from-rose-500 to-pink-600',
  },
  'applications': {
    label: 'Applications',
    icon: '📋',
    category: 'utility',
    description: 'Interactive staff questionnaire forms with private reviewer channels and export workflows.',
    color: '#A55EEA',
    gradient: 'from-violet-600 to-purple-600',
  },
  'staff-applications': {
    label: 'Applications',
    icon: '📋',
    category: 'utility',
    description: 'Interactive staff questionnaire forms with private reviewer channels and export workflows.',
    color: '#A55EEA',
    gradient: 'from-violet-600 to-purple-600',
  },
  'introduction-builder': {
    label: 'Introduction Builder',
    icon: '👋',
    category: 'engagement',
    description: 'Customizable community questionnaires, Discord showcase cards, auto-role rewards, and web portal.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'introductions': {
    label: 'Introduction Builder',
    icon: '👋',
    category: 'engagement',
    description: 'Customizable community questionnaires, Discord showcase cards, auto-role rewards, and web portal.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'streamer-notifications': {
    label: 'Streamer Live Alerts',
    icon: '📺',
    category: 'engagement',
    description: 'Automated live stream alerts for Twitch, YouTube, and Kick creators.',
    color: '#9333EA',
    gradient: 'from-purple-600 to-violet-700',
  },
  'streamers': {
    label: 'Streamer Live Alerts',
    icon: '📺',
    category: 'engagement',
    description: 'Automated live stream alerts for Twitch, YouTube, and Kick creators.',
    color: '#9333EA',
    gradient: 'from-purple-600 to-violet-700',
  },
  'social': {
    label: 'Socials Hub',
    icon: '🌍',
    category: 'engagement',
    description: 'User profile showcase, custom bios, social links, and rep endorsements.',
    color: '#3B82F6',
    gradient: 'from-blue-600 to-cyan-600',
  },
  'welcome-goodbye': {
    label: 'Welcome & Goodbye',
    icon: '🎉',
    category: 'engagement',
    description: 'Custom canvas card banners and greetings dispatched on member joins/leaves.',
    color: '#6366F1',
    gradient: 'from-indigo-600 to-violet-600',
  },
  'guild-achievements': {
    label: 'Guild Achievements',
    icon: '🏅',
    category: 'engagement',
    description: 'Unlockable server milestone badges and participation trophies.',
    color: '#F97316',
    gradient: 'from-orange-500 to-amber-600',
  },
  'suggestions': {
    label: 'Suggestions Box',
    icon: '💡',
    category: 'engagement',
    description: 'Community suggestion submission thread with staff upvoting & decision triage.',
    color: '#FACC15',
    gradient: 'from-yellow-400 to-amber-500',
  },
  'poll-system': {
    label: 'Poll System',
    icon: '🗳️',
    category: 'engagement',
    description: 'Rich Discord interactive voting polls with multiple choice and timers.',
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-blue-600',
  },
  'reputation': {
    label: 'Reputation System',
    icon: '⭐',
    category: 'engagement',
    description: 'Peer-to-peer appreciation rating and member commendation leaderboard.',
    color: '#EAB308',
    gradient: 'from-yellow-500 to-orange-500',
  },
  'plant-a-tree': {
    label: 'Plant A Tree',
    icon: '🌳',
    category: 'engagement',
    description: 'Interactive virtual reforestation mini-game and global eco leaderboard.',
    color: '#22C55E',
    gradient: 'from-green-500 to-emerald-600',
  },
  'pets': {
    label: 'Pet Playground',
    icon: '🐾',
    category: 'engagement',
    description: 'Adopt virtual pets, feed, level up, and play interactive games.',
    color: '#F472B6',
    gradient: 'from-pink-500 to-rose-500',
  },
  'auto-revive': {
    label: 'Chat Reviver',
    icon: '🔥',
    category: 'engagement',
    description: 'Pings conversational icebreaker topics when channel activity lulls.',
    color: '#FB923C',
    gradient: 'from-orange-500 to-red-500',
  },

  // Utility & Relays
  'timed-channels': {
    label: 'Timed Channels',
    icon: '🌙',
    category: 'utility',
    description: 'Automated day & night chat switching, after-hours locks, and interactive dashboard toggles.',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-600',
  },
  'timed-chat': {
    label: 'Timed Channels',
    icon: '🌙',
    category: 'utility',
    description: 'Automated day & night chat switching, after-hours locks, and interactive dashboard toggles.',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-600',
  },
  'roles': {
    label: 'Role Studio & Assignment',
    icon: '🎭',
    category: 'utility',
    description: 'Advanced role management system, role builder studio, interactive self-assignable role panels, and administrative member role assignments.',
    color: '#9900FF',
    gradient: 'from-purple-600 to-indigo-600',
  },
  'role-builder': {
    label: 'Role Studio & Assignment',
    icon: '🎭',
    category: 'utility',
    description: 'Advanced role management system, role builder studio, interactive self-assignable role panels, and administrative member role assignments.',
    color: '#9900FF',
    gradient: 'from-purple-600 to-indigo-600',
  },
  'embed-builder': {
    label: 'Embed & Announcement Builder',
    icon: '✨',
    category: 'utility',
    description: 'Visual embed studio with real-time Discord preview, drafts, action row buttons, and direct channel publishing.',
    color: '#8B5CF6',
    gradient: 'from-violet-600 to-indigo-600',
  },
  'announcement-builder': {
    label: 'Embed & Announcement Builder',
    icon: '📢',
    category: 'utility',
    description: 'Visual embed studio with real-time Discord preview, drafts, action row buttons, and direct channel publishing.',
    color: '#8B5CF6',
    gradient: 'from-violet-600 to-indigo-600',
  },
  'tickets': {
    label: 'Support Tickets',
    icon: '🎟️',
    category: 'utility',
    description: 'Private support channel creation, staff triage, and HTML transcript exports.',
    color: '#06B6D4',
    gradient: 'from-cyan-600 to-teal-600',
  },
  'webhooks': {
    label: 'Webhook Center',
    icon: '🔗',
    category: 'utility',
    description: 'Compose and dispatch custom rich embeds directly to Discord channels.',
    color: '#8B5CF6',
    gradient: 'from-violet-600 to-indigo-600',
  },
  'webhook-center': {
    label: 'Webhook Center',
    icon: '🔗',
    category: 'utility',
    description: 'Compose and dispatch custom rich embeds directly to Discord channels.',
    color: '#8B5CF6',
    gradient: 'from-violet-600 to-indigo-600',
  },
  'qr-code-maker': {
    label: 'QR Code Maker',
    icon: '🔳',
    category: 'utility',
    description: 'Generate high-resolution custom QR codes with custom styling, colors, rounded dots, and center logos.',
    color: '#EE5A24',
    gradient: 'from-orange-500 to-amber-600',
  },
  'qrcode': {
    label: 'QR Code Maker',
    icon: '🔳',
    category: 'utility',
    description: 'Generate high-resolution custom QR codes with custom styling, colors, rounded dots, and center logos.',
    color: '#EE5A24',
    gradient: 'from-orange-500 to-amber-600',
  },
  'backups': {
    label: 'Backup Vault',
    icon: '🗄️',
    category: 'utility',
    description: 'Automated snapshots preserving server roles, permissions, and channel trees.',
    color: '#3B82F6',
    gradient: 'from-blue-600 to-indigo-600',
  },
  'backup': {
    label: 'Backup Vault',
    icon: '🗄️',
    category: 'utility',
    description: 'Automated snapshots preserving server roles, permissions, and channel trees.',
    color: '#3B82F6',
    gradient: 'from-blue-600 to-indigo-600',
  },
  'tempvoice': {
    label: 'Temp Voice Hubs',
    icon: '🎙️',
    category: 'utility',
    description: 'Dynamic join-to-create voice channels with custom owner controls.',
    color: '#14B8A6',
    gradient: 'from-teal-500 to-emerald-600',
  },
  'temp-voice': {
    label: 'Temp Voice Hubs',
    icon: '🎙️',
    category: 'utility',
    description: 'Dynamic join-to-create voice channels with custom owner controls.',
    color: '#14B8A6',
    gradient: 'from-teal-500 to-emerald-600',
  },
  'roles': {
    label: 'Role Studio & Assignment',
    icon: '🎭',
    category: 'utility',
    description: 'Comprehensive role management system, role builder studio, interactive self-assignable role panels, and administrative member role assignments.',
    color: '#9900FF',
    gradient: 'from-purple-600 to-indigo-600',
    version: 'v0.0.1 ALPHA',
    author: 'Currently_Nameless & OnedEyePete',
  },
  'role': {
    label: 'Role Studio & Assignment',
    icon: '🎭',
    category: 'utility',
    description: 'Comprehensive role management system, role builder studio, interactive self-assignable role panels, and administrative member role assignments.',
    color: '#9900FF',
    gradient: 'from-purple-600 to-indigo-600',
    version: 'v0.0.1 ALPHA',
    author: 'Currently_Nameless & OnedEyePete',
  },
  'role-builder': {
    label: 'Role Studio & Assignment',
    icon: '🎭',
    category: 'utility',
    description: 'Comprehensive role management system, role builder studio, interactive self-assignable role panels, and administrative member role assignments.',
    color: '#9900FF',
    gradient: 'from-purple-600 to-indigo-600',
    version: 'v0.0.1 ALPHA',
    author: 'Currently_Nameless & OnedEyePete',
  },
  'rules': {
    label: 'Server Rules & Verification',
    icon: '📜',
    category: 'utility',
    description: 'Interactive community guidelines, numbered rules, severity levels, and verification gatekeeping.',
    color: '#5865F2',
    gradient: 'from-violet-600 to-indigo-600',
    version: 'v1.0.0',
    author: 'FloofCore',
  },
  'cross-chat-relay': {
    label: 'Cross-Chat Relay',
    icon: '📡',
    category: 'utility',
    description: 'Sync and bridge real-time messages across multi-guild channel networks.',
    color: '#6366F1',
    gradient: 'from-indigo-600 to-cyan-600',
  },
  'federation': {
    label: 'Cross-Chat Relay',
    icon: '📡',
    category: 'utility',
    description: 'Sync and bridge real-time messages across multi-guild channel networks.',
    color: '#6366F1',
    gradient: 'from-indigo-600 to-cyan-600',
  },
  'guild-logging': {
    label: 'Guild Logging',
    icon: '📋',
    category: 'utility',
    description: 'Detailed event logs for message edits, channel creations, and voice moves.',
    color: '#64748B',
    gradient: 'from-slate-600 to-gray-700',
  },
  'stats-channel': {
    label: 'Stats Channels',
    icon: '📊',
    category: 'utility',
    description: 'Automated dynamic voice channel names displaying live member counts.',
    color: '#0EA5E9',
    gradient: 'from-sky-500 to-blue-600',
  },
  'applications': {
    label: 'Applications',
    icon: '📬',
    category: 'utility',
    description: 'Interactive staff questionnaire forms with private reviewer channels.',
    color: '#8B5CF6',
    gradient: 'from-violet-600 to-purple-600',
  },
  'introduction-builder': {
    label: 'Introduction Builder',
    icon: '👋',
    category: 'engagement',
    description: 'Customizable community questionnaires, Discord showcase cards, auto-role rewards, and web portal.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'introductions': {
    label: 'Introduction Builder',
    icon: '👋',
    category: 'engagement',
    description: 'Customizable community questionnaires, Discord showcase cards, auto-role rewards, and web portal.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'automation': {
    label: 'Automations Hub',
    icon: '⚙️',
    category: 'utility',
    description: 'Scheduled tasks, recurring reminders, and automated channel purges.',
    color: '#475569',
    gradient: 'from-slate-700 to-slate-800',
  },

  'link-embedder': {
    label: 'Link Embedder',
    icon: '🔗',
    category: 'utility',
    description: 'Auto-embeds social links (TikTok, Twitter/X, Instagram, Reddit) into seamless media previews.',
    color: '#00CEC9',
    gradient: 'from-teal-500 to-cyan-600',
  },
  'product-panel': {
    label: 'Product Panel',
    icon: '🛍️',
    category: 'utility',
    description: 'Server store & product showcase panel with Discord buttons and delivery workflows.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'products': {
    label: 'Product Panel',
    icon: '🛍️',
    category: 'utility',
    description: 'Server store & product showcase panel with Discord buttons and delivery workflows.',
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-600',
  },
  'qr-code-maker': {
    label: 'QR Code Maker',
    icon: '🔳',
    category: 'utility',
    description: 'Generate high-resolution custom QR codes for URLs, WiFi credentials, and crypto addresses.',
    color: '#EE5A24',
    gradient: 'from-orange-500 to-red-600',
  },
  'nekos-best-socials-gifs': {
    label: 'Anime Socials & GIFs',
    icon: '😊',
    category: 'engagement',
    description: 'Interactive anime reaction GIFs (hugs, pats, slaps, kisses, dances) powered by nekos.best.',
    color: '#FFA07A',
    gradient: 'from-pink-400 to-orange-400',
  },
  'channel-stats': {
    label: 'Channel Stats',
    icon: '📈',
    category: 'utility',
    description: 'Dynamic voice channel status counters for live server members, bots, and online count.',
    color: '#48DBFB',
    gradient: 'from-cyan-400 to-blue-500',
  },
  'game-host-check': {
    label: 'Game Host Check',
    icon: '🎮',
    category: 'utility',
    description: 'Ping and verify uptime for dedicated game servers (Minecraft, ARK, Rust, Palworld).',
    color: '#10B981',
    gradient: 'from-emerald-500 to-teal-600',
  },
  'flm-backup': {
    label: 'FLM Backup Vault',
    icon: '🗄️',
    category: 'utility',
    description: 'Cloud backup snapshots preserving all Floofcore Reborn module databases and server configs.',
    color: '#82CCDD',
    gradient: 'from-sky-400 to-indigo-600',
  },
  'guild-center': {
    label: 'Guild Center Hub',
    icon: '🏛️',
    category: 'utility',
    description: 'Centralized multi-guild administration and broadcast message routing engine.',
    color: '#9B59B6',
    gradient: 'from-purple-600 to-violet-700',
  },
  'ai-system': {
    label: 'Neural AI System',
    icon: '🧠',
    category: 'system',
    description: 'Multi-model AI assistant with Gemini, OpenAI, Claude, and localized server persona knowledge.',
    color: '#A29BFE',
    gradient: 'from-violet-500 to-purple-600',
  },
  'core-commands': {
    label: 'Core Commands',
    icon: '🛠️',
    category: 'system',
    description: 'Essential administrative, latency, diagnostics, and management slash commands.',
    color: '#F8C291',
    gradient: 'from-amber-400 to-orange-500',
  },
};

/**
 * Resolves complete metadata, rich emoji, label, and category for any module name or slug.
 */
export function getModuleMeta(name: string, liveIcon?: string, liveColor?: string): ModuleMeta {
  const slug = moduleSlug(name);
  const found = MODULE_EMOJI_REGISTRY[slug];

  if (found) {
    return {
      id: slug,
      ...found,
      icon: liveIcon || found.icon,
      color: liveColor || found.color,
    };
  }

  // Smart fallback
  const cleanLabel = name
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());

  let icon = liveIcon || '📦';
  let category: ModuleMeta['category'] = 'utility';
  let color = liveColor || '#8B5CF6';
  let gradient = 'from-violet-600 to-indigo-600';

  if (!liveIcon) {
    if (/advent|xmas|christmas/i.test(slug)) {
      icon = '🎄';
      category = 'engagement';
      color = '#C41E3A';
      gradient = 'from-red-600 to-rose-700';
    } else if (/birthday|bday/i.test(slug)) {
      icon = '🎂';
      category = 'engagement';
      color = '#EC4899';
      gradient = 'from-pink-500 to-rose-600';
    } else if (/voice|tempvoice/i.test(slug)) {
      icon = '🔊';
      category = 'utility';
      color = '#06B6D4';
      gradient = 'from-cyan-600 to-blue-600';
    } else if (/ban|mute|warn|mod|shield|guard|lock|black|honey/i.test(slug)) {
      icon = '🛡️';
      category = 'security';
      color = '#EF4444';
      gradient = 'from-rose-600 to-red-600';
    } else if (/xp|level|rank|game|play|pet|tree|poll|giveaway|music|stream|social/i.test(slug)) {
      icon = '🎮';
      category = 'engagement';
      color = '#F59E0B';
      gradient = 'from-amber-500 to-orange-600';
    } else if (/ai|bot|core|system|monitor|log|stat/i.test(slug)) {
      icon = '⚡';
      category = 'system';
      color = '#6366F1';
      gradient = 'from-indigo-600 to-violet-600';
    }
  }

  return {
    id: slug,
    label: cleanLabel,
    icon,
    category,
    description: 'Configurable bot feature module.',
    color,
    gradient,
  };
}

/**
 * Returns solely the emoji character for a module.
 */
export function getModuleEmoji(name: string): string {
  return getModuleMeta(name).icon;
}

/**
 * Converts a module-owned manifest.json object (from /api/modules/manifests)
 * into the standard ModuleMeta shape. Prefers manifest data over the registry.
 * Falls back to getModuleMeta() for any missing fields.
 */
export function getModuleMetaFromManifest(manifest: {
  id: string;
  label?: string;
  icon?: string;
  category?: string;
  description?: string;
  color?: string;
  gradient?: string;
  author?: string;
  version?: string;
}): ModuleMeta {
  const fallback = getModuleMeta(manifest.id, manifest.icon, manifest.color);
  return {
    id: manifest.id,
    label: manifest.label || fallback.label,
    icon: manifest.icon || fallback.icon,
    category: (manifest.category as ModuleMeta['category']) || fallback.category,
    description: manifest.description || fallback.description,
    color: manifest.color || fallback.color,
    gradient: manifest.gradient || fallback.gradient,
    author: manifest.author,
    version: manifest.version,
  };
}
