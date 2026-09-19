import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';

export interface ModalProps {
  opened?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  maxWidth?: string;
  className?: string;
  hideCloseButton?: boolean;
  closeOnClickOutside?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  opened,
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  maxWidth,
  className = '',
  hideCloseButton = false,
  closeOnClickOutside = true,
}) => {
  const isVisible = opened ?? isOpen ?? false;

  const sizeClasses: Record<string, string> = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    '4xl': 'max-w-7xl',
    full: 'max-w-[95vw] h-[92vh]',
  };

  // Lock background scrolling and attach ESC key listener
  useEffect(() => {
    if (!isVisible) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 select-none">
          {/* Dimmed Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOnClickOutside ? onClose : undefined}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Floating Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            style={{
              borderRadius: 'calc(var(--fc-card-radius, 24px) * 1.1)',
              backgroundColor: 'rgba(12, 16, 28, 0.96)',
              backdropFilter: 'blur(32px)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
            className={`w-full ${
              maxWidth ? (sizeClasses[maxWidth] || maxWidth) : (sizeClasses[size] || 'max-w-xl')
            } relative z-10 border shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col max-h-[88vh] overflow-hidden ${className}`}
          >
            {/* Header */}
            {(title || icon || !hideCloseButton) && (
              <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-sm">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && (
                      <div className="text-base font-bold text-white tracking-tight font-heading truncate">
                        {title}
                      </div>
                    )}
                    {subtitle && (
                      <div className="text-xs text-slate-400 truncate mt-0.5 font-sans">
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/10 transition-colors cursor-pointer shrink-0"
                    title="Close (Esc)"
                  >
                    <IconX size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
              {children}
            </div>

            {/* Optional Sticky Footer */}
            {footer && (
              <div className="px-6 py-3.5 border-t border-white/[0.08] bg-black/40 flex items-center justify-end gap-2 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
