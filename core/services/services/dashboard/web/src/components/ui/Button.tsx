import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

  const sizeStyles = {
    sm: 'px-3.5 py-2 text-xs gap-2',
    md: 'px-5 py-2.5 text-xs font-semibold gap-2',
    lg: 'px-6 py-3 text-sm gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/40 border border-violet-400/30',
    secondary: 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 shadow-sm',
    outline: 'bg-transparent hover:bg-white/[0.04] text-slate-300 hover:text-white border border-white/15',
    ghost: 'bg-transparent hover:bg-white/[0.06] text-slate-400 hover:text-white',
    danger: 'bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
      )}
      <span className="inline-flex items-center gap-1.5">{children}</span>
      {!loading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </motion.button>
  );
};
