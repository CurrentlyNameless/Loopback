import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  glow?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  hoverEffect = false,
  ...props
}) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -3, scale: 1.008 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl shadow-2xl shadow-black/20 p-6 transition-colors duration-200 ${
        glow ? 'border-violet-500/40 shadow-violet-500/15' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
