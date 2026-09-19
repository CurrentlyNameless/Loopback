import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconCheck, 
  IconX, 
  IconAlertTriangle, 
  IconInfoCircle,
  IconShieldCheck,
  IconSparkles
} from '@tabler/icons-react';
import { getAssetUrl } from '../lib/assetStore.ts';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: ToastAction;
}

export type ToastPayload = Omit<Toast, 'id'> | string;

export interface ToastContextType {
  show: (
    toastOrMessage: ToastPayload,
    typeOrDuration?: 'success' | 'error' | 'warning' | 'info' | number,
    options?: {
      type?: 'success' | 'error' | 'warning' | 'info';
      duration?: number;
      action?: ToastAction;
    }
  ) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<Toast | null>(null);

  // Play acoustic sound when toast triggers if sound FX is enabled
  const playToastSound = async (type?: string) => {
    try {
      const soundEnabled = localStorage.getItem('soundFxEnabled') === 'true';
      if (!soundEnabled) return;

      const customAudioId = localStorage.getItem('selectedAudioAssetId');
      const volume = Math.max(0.05, (Number(localStorage.getItem('soundVolume') || '50')) / 100);

      if (customAudioId) {
        const url = await getAssetUrl(customAudioId);
        if (url) {
          const audio = new Audio(url);
          audio.volume = volume;
          await audio.play().catch(() => {});
          return;
        }
      }

      // Synthesize pleasant acoustic chime
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = type === 'error' ? 350 : type === 'warning' ? 550 : 880;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const show = useCallback(
    (
      toastOrMessage: ToastPayload,
      typeOrDuration?: 'success' | 'error' | 'warning' | 'info' | number,
      options?: {
        type?: 'success' | 'error' | 'warning' | 'info';
        duration?: number;
        action?: ToastAction;
      }
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      let newToast: Toast;

      if (typeof toastOrMessage === 'string') {
        const inferredType: 'success' | 'error' | 'warning' | 'info' =
          typeof typeOrDuration === 'string' && ['success', 'error', 'warning', 'info'].includes(typeOrDuration)
            ? typeOrDuration
            : options?.type || 'info';

        const inferredDuration =
          typeof typeOrDuration === 'number' ? typeOrDuration : options?.duration ?? 4000;

        const defaultTitle =
          inferredType === 'success'
            ? 'Success'
            : inferredType === 'error'
            ? 'Error'
            : inferredType === 'warning'
            ? 'Notice'
            : 'Information';

        newToast = {
          id,
          title: defaultTitle,
          message: toastOrMessage,
          type: inferredType,
          duration: inferredDuration,
          action: options?.action,
        };
      } else {
        newToast = {
          ...toastOrMessage,
          id,
          duration: toastOrMessage.duration ?? 4000,
        };
      }

      setActiveToast(newToast);
      playToastSound(newToast.type);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setActiveToast((current) => (current?.id === id ? null : current));
        }, newToast.duration);
      }
    },
    []
  );

  const closeToast = () => {
    setActiveToast(null);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      {/* Modal Popup Alert Overlay */}
      <AnimatePresence>
        {activeToast && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-8 md:pt-12 px-4 select-none">
            {/* Subtle Backdrop Ambient Tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeToast}
              className="fixed inset-0 pointer-events-auto bg-black/40 backdrop-blur-[3px]"
            />

            {/* Elevated Alert Modal Box */}
            <motion.div
              initial={{ opacity: 0, y: -25, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.94 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              style={{
                borderRadius: 'var(--fc-card-radius, 24px)',
                backgroundColor: 'var(--fc-card-bg, rgba(12, 16, 27, 0.95))',
                backdropFilter: 'blur(var(--fc-card-blur, 16px))',
                borderColor: 'var(--fc-card-border, rgba(255, 255, 255, 0.15))',
              }}
              className="toast-card pointer-events-auto relative z-10 w-full max-w-md border shadow-2xl shadow-black/90 overflow-hidden"
            >
              {/* Highlight Top Accent Bar */}
              <div
                className={`h-1.5 w-full ${
                  activeToast.type === 'error'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                    : activeToast.type === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : activeToast.type === 'info'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'bg-gradient-to-r from-violet-500 via-pink-500 to-indigo-500'
                }`}
                style={
                  activeToast.type === 'success' || !activeToast.type
                    ? { backgroundColor: 'var(--fc-accent, #8B5CF6)' }
                    : undefined
                }
              />

              <div className="p-5 sm:p-6 space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      style={{
                        borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.6)',
                      }}
                      className={`w-10 h-10 flex items-center justify-center shadow-lg ${
                        activeToast.type === 'error'
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                          : activeToast.type === 'warning'
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          : activeToast.type === 'info'
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                          : 'bg-violet-500/15 border border-violet-500/30 text-violet-300'
                      }`}
                    >
                      {activeToast.type === 'error' && <IconX size={20} />}
                      {activeToast.type === 'warning' && <IconAlertTriangle size={20} />}
                      {activeToast.type === 'info' && <IconInfoCircle size={20} />}
                      {(activeToast.type === 'success' || !activeToast.type) && <IconCheck size={20} />}
                    </div>

                    <div>
                      <div className="text-sm font-black text-white tracking-tight font-heading">
                        {activeToast.title}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {activeToast.type ? activeToast.type : 'SYSTEM NOTICE'}
                      </div>
                    </div>
                  </div>

                  {/* Close X Button */}
                  <button
                    type="button"
                    onClick={closeToast}
                    style={{
                      borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.5)',
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <IconX size={16} />
                  </button>
                </div>

                {/* Message Body */}
                {activeToast.message && (
                  <div 
                    style={{
                      borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.6)',
                    }}
                    className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 border border-white/[0.06] whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar"
                  >
                    {activeToast.message}
                  </div>
                )}

                {/* Footer Action Row */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    {activeToast.action ? 'Action available' : 'Auto-closing in a moment...'}
                  </span>

                  <div className="flex items-center gap-2">
                    {activeToast.action && (
                      <button
                        type="button"
                        onClick={() => {
                          const cb = activeToast.action?.onClick;
                          closeToast();
                          if (cb) cb();
                        }}
                        style={{
                          borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.5)',
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-violet-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <span>{activeToast.action.label}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={closeToast}
                      style={{
                        borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.5)',
                      }}
                      className="px-3.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-white border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (activeToast.duration ?? 4000) / 1000, ease: 'linear' }}
                className={`h-0.5 ${
                  activeToast.type === 'error'
                    ? 'bg-rose-500'
                    : activeToast.type === 'warning'
                    ? 'bg-amber-500'
                    : activeToast.type === 'info'
                    ? 'bg-cyan-400'
                    : 'bg-violet-400'
                }`}
                style={
                  activeToast.type === 'success' || !activeToast.type
                    ? { backgroundColor: 'var(--fc-accent, #8B5CF6)' }
                    : undefined
                }
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastProvider;
