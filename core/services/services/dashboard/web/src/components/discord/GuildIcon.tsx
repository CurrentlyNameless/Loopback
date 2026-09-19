import React, { useState } from 'react';

export interface GuildIconProps {
  id: string;
  name: string;
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const GuildIcon: React.FC<GuildIconProps> = ({
  id,
  name,
  icon,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const defaultSizeClasses: Record<string, string> = {
    xs: 'w-6 h-6 text-[10px] rounded-lg',
    sm: 'w-8 h-8 text-xs rounded-xl',
    md: 'w-10 h-10 text-xs rounded-xl',
    lg: 'w-12 h-12 text-sm rounded-2xl',
    xl: 'w-16 h-16 text-base rounded-2xl',
  };

  const hasCustomWidth = /\bw-\S+/.test(className);
  const hasCustomHeight = /\bh-\S+/.test(className);
  const hasCustomRadius = /\brounded-\S+/.test(className);

  const fallbackSize = defaultSizeClasses[size] || defaultSizeClasses.md;
  
  let baseClasses = '';
  if (!hasCustomWidth && !hasCustomHeight) {
    baseClasses += fallbackSize.split(' ').filter((c) => c.startsWith('w-') || c.startsWith('h-')).join(' ') + ' ';
  }
  if (!hasCustomRadius) {
    baseClasses += fallbackSize.split(' ').filter((c) => c.startsWith('rounded')).join(' ') + ' ';
  }
  baseClasses += fallbackSize.split(' ').filter((c) => c.startsWith('text-')).join(' ');

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'FC';

  if (icon && !imgError) {
    const iconSrc = icon.startsWith('http') || icon.startsWith('data:')
      ? icon
      : `https://cdn.discordapp.com/icons/${id}/${icon}.${icon.startsWith('a_') ? 'gif' : 'png'}?size=128`;

    return (
      <div
        className={`relative shrink-0 overflow-hidden flex items-center justify-center bg-[#101524] ${baseClasses.trim()} ${className}`}
      >
        <img
          src={iconSrc}
          alt={name}
          className="w-full h-full object-cover rounded-[inherit]"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 bg-gradient-to-tr from-violet-700 to-indigo-600 border border-white/15 flex items-center justify-center font-bold text-white shadow-inner select-none ${baseClasses.trim()} ${className}`}
    >
      {initials}
    </div>
  );
};
