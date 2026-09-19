import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown as IconChevronDown,
  Search as IconSearch,
  Check as IconCheck,
  Copy as IconCopy,
  Sparkles as IconSparkles,
  Server as IconServer,
  User as IconUser,
  Clock as IconClock,
  MessageSquare as IconMessage2,
  Coins as IconCoin,
  Palette as IconPalette,
  X as IconX,
} from 'lucide-react';
import { ALL_VARIABLES, VariableItem } from '../VariablesModal';
import { useToast } from '../Toast';

export interface VariableSelectMenuProps {
  onSelect: (token: string) => void;
  label?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  allowedCategories?: Array<'guild_center' | 'server' | 'user' | 'timestamps' | 'mentions' | 'modules' | 'markdown'>;
  align?: 'left' | 'right';
}

export const VariableSelectMenu: React.FC<VariableSelectMenuProps> = ({
  onSelect,
  label = 'Variables',
  className = '',
  size = 'sm',
  allowedCategories,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 340,
  });

  const { show: showToast } = useToast();

  const categories = useMemo(() => [
    { id: 'all', label: '🌟 All', icon: <IconSparkles size={12} /> },
    { id: 'guild_center', label: '🏛️ Server', icon: <IconServer size={12} /> },
    { id: 'timestamps', label: '⏰ Time', icon: <IconClock size={12} /> },
    { id: 'mentions', label: '📣 Mentions', icon: <IconMessage2 size={12} /> },
    { id: 'user', label: '👤 Member', icon: <IconUser size={12} /> },
    { id: 'modules', label: '📦 Modules', icon: <IconCoin size={12} /> },
    { id: 'markdown', label: '🎨 Markdown', icon: <IconPalette size={12} /> },
  ], []);

  const baseVariables = useMemo(() => {
    if (!allowedCategories || allowedCategories.length === 0) return ALL_VARIABLES;
    return ALL_VARIABLES.filter((item) => allowedCategories.includes(item.category));
  }, [allowedCategories]);

  const filteredList = useMemo(() => {
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

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownWidth = 360;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = align === 'right' ? rect.right - dropdownWidth : rect.left;
    if (left + dropdownWidth > viewportWidth - margin) {
      left = viewportWidth - dropdownWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    let top = rect.bottom + margin;
    // Check if dropdown overflows screen bottom
    const estimatedHeight = 420;
    if (top + estimatedHeight > viewportHeight - margin && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - margin;
    }

    setCoords({
      top: top + window.scrollY,
      left: left + window.scrollX,
      width: dropdownWidth,
    });
  }, [align]);

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
      setSearchQuery('');
    } else {
      updatePosition();
      setIsOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) updatePosition();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (item: VariableItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.token);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCopy = (item: VariableItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.token);
    setCopiedToken(item.token);
    showToast({
      title: 'Variable Copied',
      message: `${item.token} copied to clipboard!`,
      type: 'info',
      duration: 2000,
    });
    setTimeout(() => setCopiedToken(null), 1800);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={`px-2.5 py-1 rounded-xl bg-violet-600/15 hover:bg-violet-600/30 text-violet-200 hover:text-white font-bold transition-all border border-violet-500/30 shadow-sm flex items-center gap-1.5 cursor-pointer select-none ${
          size === 'xs' ? 'text-[10px] py-0.5 px-2' : size === 'md' ? 'text-sm py-1.5 px-3' : 'text-xs'
        } ${isOpen ? 'ring-2 ring-violet-500/50 bg-violet-600/30' : ''}`}
      >
        <span className="font-mono text-violet-400 font-extrabold text-[11px] leading-none">{'{…}'}</span>
        <span>{label}</span>
        <IconChevronDown
          size={13}
          className={`text-violet-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="rounded-2xl border border-white/15 bg-[#0e1322]/98 backdrop-blur-2xl shadow-2xl shadow-black/90 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 select-none text-left"
          >
            {/* Header Accent */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-violet-400 font-black text-xs">{'{…}'}</span>
                <span className="text-xs font-bold text-white">Select Variable to Insert</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <IconX size={13} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search variable or token..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-sans rounded-xl bg-black/50 border border-white/10 focus:border-violet-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer border ${
                    activeCategory === cat.id
                      ? 'bg-violet-600 text-white border-violet-400/40'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* List of Variables */}
            <div className="max-h-[260px] overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
              {filteredList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching variables found
                </div>
              ) : (
                filteredList.map((item) => (
                  <div
                    key={item.token}
                    onClick={(e) => handleSelect(item, e)}
                    className="p-2 rounded-xl bg-white/[0.02] hover:bg-violet-600/20 border border-white/[0.05] hover:border-violet-500/40 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <code className="px-1.5 py-0.2 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 font-mono text-[11px] font-bold">
                          {item.token}
                        </code>
                        <span className="text-[11px] font-bold text-white truncate">{item.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Copy token"
                        onClick={(e) => handleCopy(item, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors opacity-60 group-hover:opacity-100"
                      >
                        {copiedToken === item.token ? (
                          <IconCheck size={12} className="text-emerald-400" />
                        ) : (
                          <IconCopy size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Tip */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
              <span>Click to insert at cursor</span>
              <span className="font-mono">{filteredList.length} tokens</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default VariableSelectMenu;
