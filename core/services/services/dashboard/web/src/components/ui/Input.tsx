import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </span>
        )}
        <input
          className={`w-full py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightIcon ? 'pr-9' : 'pr-3.5'} ${error ? 'border-rose-500/50' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-slate-400 flex items-center justify-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
};
