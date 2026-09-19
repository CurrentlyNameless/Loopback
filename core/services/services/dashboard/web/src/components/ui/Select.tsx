import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown, IconSearch, IconCheck, IconX, IconSparkles, IconEdit, IconHash } from '@tabler/icons-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode | string;
  color?: string;
  group?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  allowCustom?: boolean;
  customLabelPrefix?: string;
  showSublabelInTrigger?: boolean;
}

export const Select: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = '— Select an option —',
  searchable = true,
  clearable = false,
  disabled = false,
  error,
  className = '',
  triggerClassName = '',
  size = 'md',
  allowCustom = false,
  customLabelPrefix = 'value',
  showSublabelInTrigger = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.value && opt.value.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const computedMaxHeight = Math.max(140, Math.min(280, spaceBelow > 100 ? spaceBelow : 260));

    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
      maxHeight: computedMaxHeight,
    });
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Reposition on scroll / resize & click outside
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    const timer = setTimeout(() => searchInputRef.current?.focus(), 60);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (optVal: string) => {
    onChange(optVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full relative ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}

      {/* Trigger Button */}
      {(() => {
        const sizeBtnClass =
          size === 'sm'
            ? 'py-1 px-2.5 rounded-lg text-xs'
            : size === 'lg'
            ? 'py-3.5 px-4 rounded-xl text-sm'
            : 'py-2.5 px-3.5 rounded-xl text-xs';
        const chevronSize = size === 'sm' ? 13 : 15;

        return (
          <button
            type="button"
            disabled={disabled}
            onClick={handleToggle}
            className={`w-full ${sizeBtnClass} bg-slate-900/90 hover:bg-slate-900 border text-left flex items-center justify-between gap-2 transition-all cursor-pointer select-none shadow-sm ${
              isOpen
                ? 'border-violet-500 ring-2 ring-violet-500/20'
                : error
                ? 'border-rose-500/50'
                : 'border-white/10 hover:border-white/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedOption ? (
                <>
                  {selectedOption.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: selectedOption.color }}
                    />
                  )}
                  {selectedOption.icon && (
                    <span className="shrink-0 text-sm">{selectedOption.icon}</span>
                  )}
                  <span className="text-white font-medium truncate">{selectedOption.label}</span>
                  {showSublabelInTrigger && selectedOption.sublabel && (
                    <span className="text-[10px] text-slate-500 truncate font-mono">
                      {selectedOption.sublabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 truncate">{placeholder}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {clearable && selectedOption && (
                <span
                  onClick={handleClear}
                  className="p-0.5 rounded text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <IconX size={13} />
                </span>
              )}
              <IconChevronDown
                size={chevronSize}
                className={`text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-violet-400' : ''
                }`}
              />
            </div>
          </button>
        );
      })()}

      {error && <span className="text-[11px] text-rose-400">{error}</span>}

      {/* Portal-Mounted Dropdown Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 999999,
            }}
            className="bg-[#15171e] backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-1.5 ring-1 ring-black/60"
          >
            {searchable && (
              <div className="p-1.5 border-b border-white/[0.08] relative shrink-0">
                <IconSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-3 py-1.5 bg-white/[0.06] border border-white/[0.1] focus:border-violet-500/60 rounded-lg text-xs text-white placeholder:text-slate-500 outline-none"
                />
              </div>
            )}

            <div className="overflow-y-auto custom-scrollbar space-y-0.5 p-0.5 flex-1 min-h-0">
              {allowCustom && searchQuery.trim() && !options.some((o) => o.value === searchQuery.trim() || o.label.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim())}
                  className="w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border border-violet-500/40 bg-violet-600/15 hover:bg-violet-600/25 text-violet-200 transition-all cursor-pointer text-left mb-1 shrink-0"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <IconSparkles size={14} className="text-violet-400 shrink-0" />
                    <span className="truncate">
                      Use custom {customLabelPrefix}: <strong className="font-mono text-white bg-black/40 px-1.5 py-0.5 rounded">{searchQuery.trim()}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider shrink-0 bg-violet-500/20 px-1.5 py-0.5 rounded">
                    Select
                  </span>
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                  {allowCustom ? 'No matching options found above. Use custom value above.' : 'No matching options found'}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.18)' : undefined,
                        borderColor: isSelected ? 'rgba(139, 92, 246, 0.45)' : 'transparent',
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer text-left border ${
                        isSelected
                          ? 'text-white'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {opt.color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        {opt.icon && <span className="shrink-0 text-sm">{opt.icon}</span>}
                        <span className={`truncate ${isSelected ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span className={`text-[10px] truncate font-mono ml-auto ${isSelected ? 'text-violet-300' : 'text-slate-500'}`}>
                            {opt.sublabel}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <IconCheck size={14} className="text-violet-400 shrink-0 ml-1.5" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// ── Drop-in Discord Channel Select ──────────────────────────────────────────
export interface ChannelSelectProps {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  channels: Array<{ id: string; name: string; type: number; parentId?: string | null }>;
  types?: number[]; // e.g. [0] for text, [4] for category, [2] for voice
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  allowManualInput?: boolean;
  showId?: boolean;
  className?: string;
}

export const ChannelSelect: React.FC<ChannelSelectProps> = ({
  label,
  value,
  onChange,
  channels,
  types,
  placeholder = '— Select Discord Channel —',
  clearable = true,
  disabled = false,
  allowManualInput = true,
  showId = false,
  className = '',
}) => {
  const [isManual, setIsManual] = useState(false);

  const filtered = useMemo(() => {
    if (!types || types.length === 0) return channels;
    return channels.filter((c) => types.includes(c.type));
  }, [channels, types]);

  const options: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [];
    if (clearable) {
      list.push({ value: '', label: 'None (Disabled)' });
    }

    // Preserve existing custom or direct channel ID so it doesn't show as empty
    if (value && !filtered.some((c) => c.id === value)) {
      list.push({
        value,
        label: `#channel (${value})`,
        icon: '#',
        sublabel: showId ? 'Direct Channel ID' : undefined,
        color: '#8b5cf6',
      });
    }

    for (const c of filtered) {
      let icon = '#';
      if (c.type === 4) icon = '📁';
      else if (c.type === 2 || c.type === 13) icon = '🔊';
      else if (c.type === 5) icon = '📢';
      else if (c.type === 15) icon = '💬';

      list.push({
        value: c.id,
        label: c.name,
        icon,
        sublabel: showId ? c.id : undefined,
      });
    }

    return list;
  }, [filtered, clearable, value, showId]);

  if (isManual) {
    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        <div className="flex items-center justify-between">
          {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}
          <button
            type="button"
            onClick={() => setIsManual(false)}
            className="text-[10px] text-violet-400 hover:text-violet-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>← Pick from list</span>
          </button>
        </div>
        <div className="relative">
          <IconHash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value.trim())}
            placeholder="Paste Discord Channel ID (e.g. 123456789012345678)..."
            className="w-full pl-8 pr-8 py-2.5 bg-slate-900/90 border border-violet-500/40 focus:border-violet-500 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 p-0.5 rounded cursor-pointer"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {allowManualInput && (
        <div className="flex items-center justify-between">
          {label ? <label className="text-xs font-semibold text-slate-300">{label}</label> : <div />}
          <button
            type="button"
            onClick={() => setIsManual(true)}
            className="text-[10px] text-slate-400 hover:text-violet-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
          >
            <IconEdit size={11} />
            <span>Enter ID</span>
          </button>
        </div>
      )}
      <Select
        label={allowManualInput ? undefined : label}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        clearable={clearable}
        disabled={disabled}
        allowCustom={true}
        customLabelPrefix="Channel ID"
      />
    </div>
  );
};

// ── Drop-in Discord Role Select ─────────────────────────────────────────────
export interface RoleSelectProps {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  roles: Array<{ id: string; name: string; color?: string }>;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  allowManualInput?: boolean;
  showId?: boolean;
  className?: string;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  label,
  value,
  onChange,
  roles,
  placeholder = '— Select Discord Role —',
  clearable = true,
  disabled = false,
  allowManualInput = true,
  showId = false,
  className = '',
}) => {
  const [isManual, setIsManual] = useState(false);

  const options: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [];
    if (clearable) {
      list.push({ value: '', label: 'None (No Role)' });
    }

    // Preserve custom or direct role ID
    if (value && !roles.some((r) => r.id === value)) {
      list.push({
        value,
        label: `@role (${value})`,
        icon: '@',
        sublabel: showId ? 'Direct Role ID' : undefined,
        color: '#99aab5',
      });
    }

    for (const r of roles) {
      list.push({
        value: r.id,
        label: r.name,
        color: r.color && r.color !== '#000000' ? r.color : '#99aab5',
        sublabel: showId ? r.id : undefined,
      });
    }

    return list;
  }, [roles, clearable, value, showId]);

  if (isManual) {
    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        <div className="flex items-center justify-between">
          {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}
          <button
            type="button"
            onClick={() => setIsManual(false)}
            className="text-[10px] text-violet-400 hover:text-violet-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>← Pick from list</span>
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value.trim())}
            placeholder="Paste Discord Role ID (e.g. 123456789012345678)..."
            className="w-full pl-8 pr-8 py-2.5 bg-slate-900/90 border border-violet-500/40 focus:border-violet-500 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 p-0.5 rounded cursor-pointer"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {allowManualInput && (
        <div className="flex items-center justify-between">
          {label ? <label className="text-xs font-semibold text-slate-300">{label}</label> : <div />}
          <button
            type="button"
            onClick={() => setIsManual(true)}
            className="text-[10px] text-slate-400 hover:text-violet-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
          >
            <IconEdit size={11} />
            <span>Enter ID</span>
          </button>
        </div>
      )}
      <Select
        label={allowManualInput ? undefined : label}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        clearable={clearable}
        disabled={disabled}
        allowCustom={true}
        customLabelPrefix="Role ID"
      />
    </div>
  );
};

// ── Drop-in Discord Member Select ───────────────────────────────────────────
export interface MemberSelectProps {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  guildId?: string;
  members?: Array<{ id: string; username: string; displayName?: string; avatar?: string | null }>;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
}

export const MemberSelect: React.FC<MemberSelectProps> = ({
  label,
  value,
  onChange,
  guildId,
  members: initialMembers,
  placeholder = '— Select Server Member —',
  clearable = true,
  disabled = false,
}) => {
  const [memberList, setMemberList] = useState<Array<{ id: string; username: string; displayName?: string; avatar?: string | null }>>(initialMembers || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMembers && initialMembers.length > 0) {
      setMemberList(initialMembers);
      return;
    }
    if (!guildId) return;

    let isMounted = true;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/members`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) setMemberList(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [guildId, initialMembers]);

  const options: SelectOption[] = useMemo(
    () => [
      ...(clearable ? [{ value: '', label: 'None (Clear selection)' }] : []),
      ...memberList.map((m) => ({
        value: m.id,
        label: m.displayName || m.username,
        sublabel: m.displayName && m.displayName !== m.username ? `@${m.username}` : undefined,
        icon: m.avatar ? (
          <img src={m.avatar} alt="" className="w-5 h-5 rounded-full ring-1 ring-white/10 shrink-0 inline-block object-cover" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 font-bold text-[10px] flex items-center justify-center shrink-0 inline-flex">
            {(m.displayName || m.username).charAt(0).toUpperCase()}
          </span>
        ),
      })),
    ],
    [memberList, clearable]
  );

  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={loading ? 'Loading server members...' : placeholder}
      clearable={clearable}
      disabled={disabled || loading}
    />
  );
};

// ── Drop-in Multi-Role Selector (Matching Welcome-Goodbye) ─────────────────
export const getRoleColorHex = (color: any): string => {
  if (!color || color === '#000000' || color === 0) return '#94a3b8';
  if (typeof color === 'string') {
    return color.startsWith('#') ? color : `#${color}`;
  }
  if (typeof color === 'number') {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
  return '#94a3b8';
};

export interface MultiRoleSelectorProps {
  label?: string;
  sublabel?: string;
  roles: Array<{ id: string; name: string; color?: any }>;
  selectedRoleIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  accentColor?: 'violet' | 'indigo' | 'cyan' | 'rose' | 'amber' | 'emerald';
  emptyText?: string;
  disabled?: boolean;
}

export const MultiRoleSelector: React.FC<MultiRoleSelectorProps> = ({
  label,
  sublabel,
  roles = [],
  selectedRoleIds = [],
  onChange,
  placeholder = '+ Search and select a role to add...',
  accentColor = 'violet',
  emptyText = 'No roles selected yet.',
  disabled = false,
}) => {
  const [pickerVal, setPickerVal] = useState<string>('');

  const colorStyles = {
    violet: {
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    },
    indigo: {
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    cyan: {
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    rose: {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    amber: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    emerald: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
  }[accentColor] || {
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  };

  const handleAddRole = (roleId: string) => {
    if (!roleId || disabled) return;
    if (!selectedRoleIds.includes(roleId)) {
      onChange([...selectedRoleIds, roleId]);
    }
    setPickerVal('');
  };

  const handleRemoveRole = (roleId: string) => {
    if (disabled) return;
    onChange(selectedRoleIds.filter((id) => id !== roleId));
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const availableRoles = useMemo(() => {
    return roles
      .filter((r) => r.name !== '@everyone' && !selectedRoleIds.includes(r.id))
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: getRoleColorHex(r.color),
      }));
  }, [roles, selectedRoleIds]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          {label && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">{label}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${colorStyles.badge}`}>
                {selectedRoleIds.length} {selectedRoleIds.length === 1 ? 'role' : 'roles'}
              </span>
            </div>
          )}
          {sublabel && <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>}
        </div>
        {selectedRoleIds.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors font-medium cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {!disabled && (
        <RoleSelect
          roles={availableRoles}
          value={pickerVal}
          onChange={handleAddRole}
          placeholder={placeholder}
          clearable={false}
          allowManualInput={true}
        />
      )}

      {selectedRoleIds.length === 0 ? (
        <div className="p-3.5 rounded-xl bg-black/30 border border-dashed border-white/10 text-center text-xs text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5 min-h-[44px]">
          {selectedRoleIds.map((id) => {
            const roleObj = roles.find((r) => r.id === id);
            const roleName = roleObj?.name || `@role (${id})`;
            const roleColor = getRoleColorHex(roleObj?.color);

            return (
              <div
                key={id}
                className="group inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-white/20 transition-all shadow-sm"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: roleColor }} />
                <span className="text-xs font-semibold text-slate-200 max-w-[200px] truncate" title={roleName}>
                  {roleName}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                  {id.length > 6 ? `...${id.slice(-4)}` : id}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title={`Remove ${roleName}`}
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


