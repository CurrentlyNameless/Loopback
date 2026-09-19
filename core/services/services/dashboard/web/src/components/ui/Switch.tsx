import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}) => {
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isInitial = useRef(true);

  useEffect(() => {
    if (!thumbRef.current) return;
    if (isInitial.current) {
      gsap.set(thumbRef.current, { x: checked ? 20 : 0 });
      isInitial.current = false;
      return;
    }

    gsap.to(thumbRef.current, {
      x: checked ? 20 : 0,
      duration: 0.38,
      ease: 'back.out(2.2)',
    });
  }, [checked]);

  const handlePress = () => {
    if (trackRef.current && !disabled) {
      gsap.fromTo(trackRef.current, { scale: 0.92 }, { scale: 1, duration: 0.25, ease: 'power2.out' });
    }
  };

  return (
    <label className={`inline-flex items-center justify-between gap-4 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-bold text-white tracking-tight group-hover:text-violet-200 transition-colors">{label}</span>}
          {description && <span className="text-[11px] text-slate-400 mt-0.5">{description}</span>}
        </div>
      )}

      <div
        ref={trackRef}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) {
            handlePress();
            onChange(!checked);
          }
        }}
        role="switch"
        aria-checked={checked}
        className={`w-11 h-6 flex items-center rounded-full p-0.5 border shrink-0 transition-colors duration-250 cursor-pointer ${
          checked
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-400/50 shadow-[0_0_14px_rgba(139,92,246,0.45)]'
            : 'bg-white/[0.08] hover:bg-white/[0.12] border-white/10'
        }`}
      >
        <div
          ref={thumbRef}
          className="w-5 h-5 rounded-full bg-white shadow-md pointer-events-none"
        />
      </div>
    </label>
  );
};

export default Switch;
