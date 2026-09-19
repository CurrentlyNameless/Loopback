import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconSearch, 
  IconLayoutDashboard, 
  IconPlug, 
  IconTerminal2, 
  IconTicket, 
  IconBroadcast, 
  IconSettings, 
  IconScale, 
  IconWebhook,
  IconArrowRight,
  IconX,
  IconReload,
  IconDeviceGamepad2,
} from '@tabler/icons-react';
import { useUIStore } from '../stores/ui.ts';
import { useToast } from './Toast.tsx';

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { show: showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const actions = [
    { id: 'dash', label: 'Go to Overview Dashboard', category: 'Navigation', icon: IconLayoutDashboard, run: () => navigate('/') },
    { id: 'games', label: 'Game Hosts & Live Servers', category: 'Navigation', icon: IconDeviceGamepad2, run: () => navigate('/games') },
    { id: 'mods', label: 'Manage Feature Modules', category: 'Navigation', icon: IconPlug, run: () => navigate('/modules') },
    { id: 'cmds', label: 'Slash Commands Registry', category: 'Navigation', icon: IconTerminal2, run: () => navigate('/commands') },
    { id: 'tickets', label: 'View Support Tickets', category: 'Navigation', icon: IconTicket, run: () => navigate('/tickets') },
    { id: 'appeals', label: 'Member Ban Appeals', category: 'Navigation', icon: IconScale, run: () => navigate('/appeals') },
    { id: 'streamers', label: 'Streamer Live Broadcasts', category: 'Navigation', icon: IconBroadcast, run: () => navigate('/streamers') },
    { id: 'webhooks', label: 'Webhooks Relay Dispatcher', category: 'Navigation', icon: IconWebhook, run: () => navigate('/webhooks') },
    { id: 'settings', label: 'Engine & Presence Settings', category: 'Navigation', icon: IconSettings, run: () => navigate('/settings') },
    { 
      id: 'restart', 
      label: 'Restart Gateway Shard 0', 
      category: 'System Actions', 
      icon: IconReload, 
      run: () => {
        showToast({ title: 'Shard Reconnecting', message: 'Gateway Shard 0 re-authenticated successfully.', type: 'success' });
      } 
    },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-xl relative z-10 rounded-2xl border border-white/10 bg-[#0E131F]/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Search Input Box */}
            <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
              <IconSearch size={18} className="text-violet-400 shrink-0" />
              <input
                autoFocus
                placeholder="Type a command, page, or search actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Action Results */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  No matching actions found.
                </div>
              ) : (
                filtered.map((act) => {
                  const IconComp = act.icon;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        act.run();
                        setCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                          <IconComp size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{act.label}</div>
                          <div className="text-[10px] font-mono text-slate-500">{act.category}</div>
                        </div>
                      </div>
                      <IconArrowRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400 px-4">
              <span>Navigation Shortcuts</span>
              <div className="flex items-center gap-2">
                <span>[↑↓] Navigate</span>
                <span>[ESC] Close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
