import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  align?: 'center' | 'start' | 'end';
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center',
  delay = 150,
  className = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        if (align === 'end') return 'top-full right-0 mt-2';
        if (align === 'start') return 'top-full left-0 mt-2';
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        if (align === 'end') return 'bottom-full right-0 mb-2';
        if (align === 'start') return 'bottom-full left-0 mb-2';
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getAnimationVariants = () => {
    switch (position) {
      case 'bottom':
        return {
          initial: { opacity: 0, y: -4, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -4, scale: 0.96 },
        };
      case 'left':
        return {
          initial: { opacity: 0, x: 4, scale: 0.96 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: 4, scale: 0.96 },
        };
      case 'right':
        return {
          initial: { opacity: 0, x: -4, scale: 0.96 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: -4, scale: 0.96 },
        };
      case 'top':
      default:
        return {
          initial: { opacity: 0, y: 4, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 4, scale: 0.96 },
        };
    }
  };

  return (
    <div
      className={`relative inline-flex ${isVisible ? 'z-40' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && !disabled && content && (
          <motion.div
            variants={getAnimationVariants()}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              borderRadius: 'calc(var(--fc-card-radius, 24px) * 0.42)',
              backgroundColor: 'var(--fc-card-bg, rgba(14, 19, 32, 0.95))',
              backdropFilter: 'blur(var(--fc-card-blur, 16px))',
              borderColor: 'var(--fc-card-border, rgba(255, 255, 255, 0.18))',
            }}
            className={`absolute z-[99999] px-2.5 py-1.5 text-[11px] font-sans font-medium text-slate-200 border shadow-2xl shadow-black/90 pointer-events-none whitespace-nowrap select-none ${getPositionClasses()}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
