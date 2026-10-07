import React from 'react';
import { useSettingsStore, useThemeStore } from '../store';

interface BrandLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  showText?: boolean;
  scanning?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  variant = 'auto',
  scanning = false,
  size = 'md',
}) => {
  const { logoUrl, logoLightUrl, logoDarkUrl, platformName } = useSettingsStore();
  const { isDarkMode } = useThemeStore();

  // 'dark' variant means dark graphics for light backgrounds.
  // 'light' variant means white graphics for dark backgrounds.
  const isLightBackground = variant === 'dark' ? true : variant === 'light' ? false : !isDarkMode;
  const defaultSvg = isLightBackground ? '/logo-dark.svg' : '/logo-white.svg';
  const defaultPng = isLightBackground ? '/wds-logo-dark.png' : '/wds-logo-white.png';
  const activeLogo = isLightBackground
    ? (logoLightUrl || logoUrl || defaultSvg)
    : (logoDarkUrl || logoUrl || defaultSvg);

  const sizeClasses = {
    sm: 'h-6 sm:h-7',
    md: 'h-8 sm:h-10',
    lg: 'h-12 sm:h-14',
    xl: 'h-16 sm:h-20',
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Scanning laser beam sweep */}
      {scanning && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div className="preloader-scan-beam" />
        </div>
      )}

      <img
        src={activeLogo}
        alt={platformName || 'WatchWDS Logo'}
        className={`${sizeClasses} max-w-full object-contain bg-transparent transition-opacity drop-shadow-sm`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== defaultSvg && target.src.indexOf(defaultSvg) === -1) {
            target.src = defaultSvg;
          } else if (target.src !== defaultPng && target.src.indexOf(defaultPng) === -1) {
            target.src = defaultPng;
          }
        }}
      />
    </div>
  );
};
