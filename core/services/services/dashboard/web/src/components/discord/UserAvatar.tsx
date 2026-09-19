import React from 'react';

export interface UserAvatarProps {
  id?: string;
  avatar?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  id,
  avatar,
  username = 'User',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 rounded-full text-[10px]',
    md: 'w-8 h-8 rounded-full text-xs',
    lg: 'w-12 h-12 rounded-full text-sm',
  };

  if (id && avatar) {
    return (
      <img
        src={`https://cdn.discordapp.com/avatars/${id}/${avatar}.png`}
        alt={username}
        className={`${sizeClasses[size]} object-cover ring-1 ring-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-white ring-1 ring-white/10 ${className}`}
    >
      {username.substring(0, 2).toUpperCase()}
    </div>
  );
};
