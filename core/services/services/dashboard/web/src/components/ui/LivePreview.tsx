import React, { useState, useEffect } from 'react';
import { Sparkles as IconSparkles, Save as IconDeviceFloppy, RotateCw as IconRotateClockwise, X as IconX, EyeOff as IconEyeOff } from 'lucide-react';
import { useGuildStore, type Guild } from '../../stores/guild';
import { useAuthStore, type User } from '../../stores/auth';

// ── Types & Interfaces ──────────────────────────────────────────────────────
export interface LivePreviewSaveAction {
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  onDiscard?: () => void;
  label?: string;
  sublabel?: string;
  colorScheme?: 'cyan' | 'emerald' | 'violet' | 'amber';
}

export interface LivePreviewProps {
  /** Title shown in the preview header (e.g. "Interactive Discord Live Preview") */
  title?: string;
  /** Badge shown on the right of header (e.g. "● Live Sync" or active channel) */
  badge?: React.ReactNode;
  /** Optional icon on left of title */
  icon?: React.ReactNode;
  /** Optional custom controls on right side of header */
  headerRight?: React.ReactNode;
  /** The Discord mockup / live preview content */
  children: React.ReactNode;
  /** Optional Sticky Save & Sync Card rendered above or inside the preview */
  saveCard?: LivePreviewSaveAction;
  /** Additional wrapper classes */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Grid column span classes. Default: 'lg:col-span-5 xl:col-span-5' */
  colSpan?: string;
  /** Top sticky offset. Default: '1.5rem' (top-6) */
  topOffset?: string | number;
  /** Maximum height to ensure preview never overflows screen. Default: 'calc(100vh - 3rem)' */
  maxHeight?: string | number;
  /** Whether to omit outer card styling around children */
  noCardWrapper?: boolean;
}

// ── Shared Bot Info Cache ───────────────────────────────────────────────────
let cachedBotInfo: { id?: string; username: string; avatarUrl: string | null } | null = null;
let botInfoPromise: Promise<{ id?: string; username: string; avatarUrl: string | null }> | null = null;

export function fetchBotInfo() {
  if (cachedBotInfo) return Promise.resolve(cachedBotInfo);
  if (!botInfoPromise) {
    botInfoPromise = fetch('/api/bot')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const info = {
          id: data?.id || '',
          // Prefer real Discord username over config display name (botName = cfg.name)
          username: data?.username || data?.botName || data?.name || 'FloofCore',
          // API sends `avatar` field (not `avatarUrl`)
          avatarUrl: data?.avatar || data?.avatarUrl || null,
        };
        cachedBotInfo = info;
        return info;
      })
      .catch(() => {
        const fallback = { username: 'FloofCore', avatarUrl: null };
        cachedBotInfo = fallback;
        return fallback;
      });
  }
  return botInfoPromise;
}

// ── Hook: useDiscordContext (Provides REAL live bot & guild data - NO MOCKS) ─
export function useDiscordContext() {
  const currentGuild = useGuildStore((s) => s.currentGuild);
  const user = useAuthStore((s) => s.user);
  const [botInfo, setBotInfo] = useState<{ id?: string; username: string; avatarUrl: string | null }>(
    cachedBotInfo || { username: 'FloofCore', avatarUrl: null }
  );

  useEffect(() => {
    fetchBotInfo().then((info) => setBotInfo(info));
  }, []);

  /**
   * Resolves text placeholders dynamically using REAL live Discord data:
   * {server}, {guild}, {members}, {user}, {username}, {tag}, {roles_count}, {channels_count}, etc.
   */
  const resolveVariables = (str: string): string => {
    if (!str) return '';
    const serverName = currentGuild?.name || 'Discord Server';
    const memberCount = (
      currentGuild?.memberCount ||
      currentGuild?.stats?.memberCount ||
      1
    ).toLocaleString();
    const userName = user?.globalName || user?.username || 'User';
    const userTag = user?.username ? `@${user.username}` : '@User';
    const rolesCount = String(currentGuild?.stats?.rolesCount || 0);
    const channelsCount = String(currentGuild?.stats?.channelsCount?.total || 0);
    const maximumBitrate = `${currentGuild?.maximumBitrateKbps || 96} kbps`;

    return str
      .replace(/\{server\}/g, serverName)
      .replace(/\{guild\}/g, serverName)
      .replace(/\{guildName\}/g, serverName)
      .replace(/\{members\}/g, memberCount)
      .replace(/\{memberCount\}/g, memberCount)
      .replace(/\{user\}/g, userName)
      .replace(/\{username\}/g, userName)
      .replace(/\{displayName\}/g, userName)
      .replace(/\{tag\}/g, userTag)
      .replace(/\{roles_count\}/g, rolesCount)
      .replace(/\{channels_count\}/g, channelsCount)
      .replace(/\{rules_count\}/g, '0')
      .replace(/\{ticket_count\}/g, '0')
      .replace(/\{bitrate\}/g, maximumBitrate)
      .replace(/\{createdAt\}/g, String(Math.floor(Date.now() / 1000) - 86400 * 30));
  };

  return {
    botInfo,
    currentGuild,
    user,
    resolveVariables,
  };
}

// ── Discord Markdown Renderer ───────────────────────────────────────────────
export function renderDiscordMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }

        // Parse bold, code, tags, and timestamps
        const parts: React.ReactNode[] = [];
        let remaining = line;
        let pKey = 0;

        // Pattern matching: **bold**, `code`, <t:...>, @tags, #channels
        const regex = /(\*\*[^*]+\*\*|`[^`]+`|<t:\d+:[a-zA-Z]>|@[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(remaining)) !== null) {
          if (match.index > lastIndex) {
            parts.push(remaining.slice(lastIndex, match.index));
          }

          const token = match[0];
          if (token.startsWith('**') && token.endsWith('**')) {
            parts.push(
              <strong key={pKey++} className="font-bold text-white">
                {token.slice(2, -2)}
              </strong>
            );
          } else if (token.startsWith('`') && token.endsWith('`')) {
            parts.push(
              <code
                key={pKey++}
                className="bg-[#1e1f22] text-cyan-300 font-mono text-[11px] px-1 py-0.5 rounded"
              >
                {token.slice(1, -1)}
              </code>
            );
          } else if (token.startsWith('<t:') && token.endsWith('>')) {
            parts.push(
              <span
                key={pKey++}
                className="bg-[#2b2d31] text-[#dbdee1] font-mono text-[11px] px-1 py-0.5 rounded border border-white/5"
              >
                Today
              </span>
            );
          } else if (token.startsWith('@')) {
            parts.push(
              <span
                key={pKey++}
                className="bg-[#5865f2]/20 text-[#c9cdfb] px-1 py-0.2 rounded text-[11px] font-medium"
              >
                {token}
              </span>
            );
          } else if (token.startsWith('#')) {
            parts.push(
              <span
                key={pKey++}
                className="bg-[#5865f2]/20 text-[#c9cdfb] px-1 py-0.2 rounded text-[11px] font-medium"
              >
                {token}
              </span>
            );
          }
          lastIndex = regex.lastIndex;
        }

        if (lastIndex < remaining.length) {
          parts.push(remaining.slice(lastIndex));
        }

        return <div key={idx}>{parts}</div>;
      })}
    </div>
  );
}

// ── Subcomponent: Pixel-Perfect Discord Action Button ───────────────────────
export type DiscordButtonColor = 'primary' | 'secondary' | 'success' | 'danger' | 'blurple' | 'gray' | 'green' | 'red';

export interface DiscordButtonProps {
  label: string;
  emoji?: React.ReactNode;
  style?: DiscordButtonColor;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const DISCORD_STYLE_HEX_MAP: Record<string, string> = {
  primary: '#5865F2',
  blurple: '#5865F2',
  success: '#248046',
  green: '#248046',
  danger: '#DA373C',
  red: '#DA373C',
  secondary: '#4E5058',
  gray: '#4E5058',
};

export const DiscordButton: React.FC<DiscordButtonProps> = ({
  label,
  emoji,
  style = 'secondary',
  disabled = false,
  active = false,
  onClick,
  className = '',
}) => {
  const getBgClass = () => {
    if (disabled) return 'opacity-40 cursor-not-allowed';
    switch (style) {
      case 'primary':
      case 'blurple':
        return 'hover:bg-[#4752C4] active:bg-[#3C45A5]';
      case 'success':
      case 'green':
        return 'hover:bg-[#1A6334] active:bg-[#15522B]';
      case 'danger':
      case 'red':
        return 'hover:bg-[#A1282C] active:bg-[#8F2022]';
      case 'secondary':
      case 'gray':
      default:
        return 'hover:bg-[#6D6F78] active:bg-[#5C5E66]';
    }
  };

  const bgHex = disabled ? '#4E505866' : (DISCORD_STYLE_HEX_MAP[style] || '#4E5058');

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ backgroundColor: bgHex }}
      className={`px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm select-none cursor-pointer shrink-0 min-w-0 leading-none text-white ${getBgClass()} ${className}`}
    >
      {emoji && (
        <span className="text-sm leading-none shrink-0 flex items-center justify-center">
          {emoji}
        </span>
      )}
      <span className="truncate">{label}</span>
    </button>
  );
};

// ── Subcomponent: Pixel-Perfect Discord Message Shell ───────────────────────
export interface DiscordMessageProps {
  botName?: string;
  botAvatar?: string | null;
  tag?: string;
  timestamp?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DiscordMessage: React.FC<DiscordMessageProps> = ({
  botName,
  botAvatar,
  tag = 'APP',
  timestamp = 'Today at 12:00 PM',
  subtitle,
  children,
  className = '',
}) => {
  const { botInfo } = useDiscordContext();
  const displayName = botName || botInfo.username || 'FloofCore';
  const displayAvatar = botAvatar !== undefined ? botAvatar : botInfo.avatarUrl;

  return (
    <div
      className={`bg-[#313338] text-[#dbdee1] rounded-2xl p-4 sm:p-5 border border-black/20 shadow-2xl space-y-3 font-sans select-none overflow-hidden ${className}`}
    >
      {/* Bot Identity Header */}
      <div className="flex items-start gap-3">
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover shadow-md shrink-0 ring-1 ring-white/10"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white tracking-wide">{displayName}</span>
            <span className="bg-[#5865F2] text-white text-[10px] px-1 py-0.2 rounded font-bold uppercase tracking-wider leading-none">
              {tag}
            </span>
            <span className="text-[11px] text-[#949ba4] ml-1">{timestamp}</span>
          </div>

          {subtitle && (
            <div className="text-xs text-[#949ba4] mt-0.5 leading-snug">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Message Body Content */}
      <div className="space-y-3 pt-1">{children}</div>
    </div>
  );
};

// ── Subcomponent: Pixel-Perfect Discord Ephemeral Box ───────────────────────
export interface DiscordEphemeralProps {
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const DiscordEphemeral: React.FC<DiscordEphemeralProps> = ({
  children,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#2b2d31]/85 border-l-[3px] border-[#5865F2] text-xs text-[#dbdee1] p-3 rounded-r-lg shadow-sm space-y-1.5 ${className}`}
    >
      <div>{children}</div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#949ba4]">
        <IconEyeOff size={12} className="text-[#949ba4]" />
        <span>Only you can see this • </span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#5865f2] hover:underline cursor-pointer font-medium"
          >
            Dismiss message
          </button>
        )}
      </div>
    </div>
  );
};

// ── Subcomponent: Pixel-Perfect Discord Modal Simulator ─────────────────────
export interface DiscordModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
}

export const DiscordModal: React.FC<DiscordModalProps> = ({
  isOpen,
  title,
  onClose,
  onSave,
  saveLabel = 'Submit',
  cancelLabel = 'Cancel',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#313338] text-white rounded-lg shadow-2xl border border-black/30 overflow-hidden space-y-0 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#949ba4] hover:text-white transition-colors cursor-pointer p-1"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-4 py-2 space-y-3.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#2b2d31] px-4 py-3 flex items-center justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white hover:underline cursor-pointer"
          >
            {cancelLabel}
          </button>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow transition-colors"
            >
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Subcomponent: Pixel-Perfect Discord Embed ───────────────────────────────
export interface DiscordEmbedProps {
  color?: string;
  author?: { name: string; icon_url?: string };
  title?: string;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string; icon_url?: string };
  image?: string;
  thumbnail?: string;
  children?: React.ReactNode;
  className?: string;
}

export const DiscordEmbed: React.FC<DiscordEmbedProps> = ({
  color = '#5865F2',
  author,
  title,
  description,
  fields = [],
  footer,
  image,
  thumbnail,
  children,
  className = '',
}) => {
  const accent = color.startsWith('#') ? color : `#${color}`;

  return (
    <div
      className={`bg-[#2b2d31] rounded-lg p-4 border border-white/[0.04] shadow-sm space-y-3 transition-all ${className}`}
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      {/* Author */}
      {author && (
        <div className="flex items-center gap-2">
          {author.icon_url && (
            <img src={author.icon_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          )}
          <span className="text-[12px] font-bold text-white">{author.name}</span>
        </div>
      )}

      {/* Title */}
      {title && <div className="text-sm font-bold text-white tracking-tight">{title}</div>}

      {/* Description */}
      {description && (
        <div className="text-xs text-[#dbdee1] leading-relaxed">
          {renderDiscordMarkdown(description)}
        </div>
      )}

      {/* Fields */}
      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
          {fields.map((f, i) => (
            <div key={i} className={f.inline ? 'col-span-1' : 'col-span-2'}>
              <div className="text-[11px] font-bold text-[#949ba4]">{f.name}</div>
              <div className="text-xs text-[#dbdee1] mt-0.5">{renderDiscordMarkdown(f.value)}</div>
            </div>
          ))}
        </div>
      )}

      {children}

      {/* Images */}
      {image && (
        <img
          src={image}
          alt=""
          className="rounded-md max-h-60 w-full object-cover border border-black/20"
        />
      )}

      {/* Footer */}
      {footer && (
        <div className="flex items-center gap-2 text-[11px] text-[#949ba4] pt-1 border-t border-white/[0.04]">
          {footer.icon_url && (
            <img src={footer.icon_url} alt="" className="w-4 h-4 rounded-full object-cover" />
          )}
          <span>{footer.text}</span>
        </div>
      )}
    </div>
  );
};

// ── Main LivePreview Component ──────────────────────────────────────────────
export const LivePreview: React.FC<LivePreviewProps> = ({
  title = 'Interactive Discord Live Preview',
  badge,
  icon,
  headerRight,
  children,
  saveCard,
  className = '',
  style = {},
  colSpan = 'lg:col-span-5 xl:col-span-5',
  topOffset = '1.5rem',
  maxHeight = 'calc(100vh - 3.5rem)',
  noCardWrapper = false,
}) => {
  const scheme = saveCard?.colorScheme || 'cyan';

  const colorStyles = {
    cyan: {
      bg: 'bg-gradient-to-r from-cyan-950/50 via-deck-900 to-cyan-950/40 border-cyan-500/30',
      btn: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30 ring-1 ring-cyan-400/50',
      iconText: 'text-cyan-400',
    },
    emerald: {
      bg: 'bg-gradient-to-r from-emerald-950/50 via-deck-900 to-emerald-950/40 border-emerald-500/30',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-1 ring-emerald-400/50',
      iconText: 'text-emerald-400',
    },
    violet: {
      bg: 'bg-gradient-to-r from-violet-950/50 via-deck-900 to-violet-950/40 border-violet-500/30',
      btn: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30 ring-1 ring-violet-400/50',
      iconText: 'text-violet-400',
    },
    amber: {
      bg: 'bg-gradient-to-r from-amber-950/50 via-deck-900 to-amber-950/40 border-amber-500/30',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-1 ring-amber-400/50',
      iconText: 'text-amber-400',
    },
  }[scheme];

  return (
    <aside
      className={`sticky-preview sticky top-6 space-y-4 self-start ${colSpan} ${className}`}
      style={{
        position: 'sticky',
        top: topOffset,
        zIndex: 20,
        maxHeight,
        display: 'flex',
        flexDirection: 'column',
        isolation: 'isolate',
        ...style,
      }}
    >


      {/* ── Main Preview Card ── */}
      {noCardWrapper ? (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
          {children}
        </div>
      ) : (
        <div className="bg-[#0f1422] border border-white/[0.08] rounded-2xl p-5 space-y-3.5 flex-1 min-h-0 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              {icon || <IconSparkles size={14} className={colorStyles.iconText} />}
              <span>{title}</span>
            </span>

            <div className="flex items-center gap-2">
              {headerRight}
              {badge || (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  ● Live Preview
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Preview Body */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-3">
            {children}
          </div>
        </div>
      )}
    </aside>
  );
};

export default LivePreview;
