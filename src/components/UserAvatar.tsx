import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  shape?: 'circle' | 'rounded' | 'square';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBadge?: boolean;
  badgeContent?: React.ReactNode;
}

const GRADIENT_PALETTES = [
  'from-amber-500 to-yellow-600 text-slate-950',
  'from-indigo-500 to-purple-600 text-white',
  'from-emerald-500 to-teal-600 text-white',
  'from-rose-500 to-pink-600 text-white',
  'from-cyan-500 to-blue-600 text-white',
  'from-fuchsia-600 to-indigo-600 text-white',
  'from-orange-500 to-amber-600 text-white',
  'from-violet-600 to-purple-800 text-white',
];

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradientIndex(str?: string | null): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % GRADIENT_PALETTES.length;
}

export function UserAvatar({
  src,
  name,
  alt,
  className = 'w-10 h-10 rounded-full',
  shape,
  size,
  showBadge,
  badgeContent
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset img error if src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = getInitials(name);
  const paletteIndex = getGradientIndex(name || alt || 'user');
  const gradientClass = GRADIENT_PALETTES[paletteIndex];

  const shapeClass = shape === 'circle' 
    ? 'rounded-full' 
    : shape === 'rounded' 
      ? 'rounded-xl' 
      : shape === 'square' 
        ? 'rounded-none' 
        : '';

  const sizeClass = size === 'xs' ? 'w-6 h-6 text-[10px]' :
    size === 'sm' ? 'w-8 h-8 text-xs' :
    size === 'md' ? 'w-10 h-10 text-sm' :
    size === 'lg' ? 'w-14 h-14 text-base' :
    size === 'xl' ? 'w-20 h-20 text-xl' :
    size === '2xl' ? 'w-24 h-24 text-2xl font-black' : '';

  const hasImage = src && !imgError;

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className} ${shapeClass} ${sizeClass}`}>
      {hasImage ? (
        <img
          src={src}
          alt={alt || name || 'User Avatar'}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${shapeClass || 'rounded-inherit'} shadow-inner`}
          style={{ borderRadius: 'inherit' }}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-black tracking-wider bg-gradient-to-br ${gradientClass} shadow-inner`}
          style={{ borderRadius: 'inherit' }}
        >
          {initials ? (
            <span className="drop-shadow-sm leading-none font-bold uppercase">{initials}</span>
          ) : (
            <UserIcon className="w-1/2 h-1/2 opacity-80" />
          )}
        </div>
      )}

      {showBadge && (
        <div className="absolute -bottom-1 -right-1 z-10">
          {badgeContent}
        </div>
      )}
    </div>
  );
}
