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
  showText = true,
  scanning = false,
  size = 'md',
}) => {
  const { logoUrl, logoLightUrl, logoDarkUrl, platformName } = useSettingsStore();
  const { isDarkMode } = useThemeStore();

  const isLightBackground = variant === 'dark' ? true : variant === 'light' ? false : !isDarkMode;
  const activeLogo = isLightBackground ? (logoLightUrl || logoUrl) : (logoDarkUrl || logoUrl);

  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8 sm:h-9',
    lg: 'h-12 sm:h-14',
    xl: 'h-16 sm:h-20',
  }[size];

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  }[size];

  return (
    <div className={`relative inline-flex items-center gap-3 select-none overflow-hidden ${className}`}>
      {/* Optional scanning laser sweep beam */}
      {scanning && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div className="preloader-scan-beam" />
        </div>
      )}

      {activeLogo ? (
        <img
          src={activeLogo}
          alt={platformName || 'WatchWDS Logo'}
          className={`${sizeClasses} max-w-full object-contain bg-transparent transition-opacity`}
        />
      ) : (
        <div className="flex items-center gap-2.5">
          {/* Stylized Vector Soccer Ball Emblem */}
          <div className={`relative shrink-0 flex items-center justify-center ${
            size === 'sm' ? 'w-7 h-7' : size === 'md' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-20 h-20'
          }`}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="brandBallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                <linearGradient id="brandBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="44" fill="url(#brandBallGrad)" stroke="#0f172a" strokeWidth="4" />
              <polygon points="50,38 61,46 57,59 43,59 39,46" fill="#0f172a" />
              <line x1="50" y1="38" x2="50" y2="24" stroke="#0f172a" strokeWidth="3" />
              <line x1="61" y1="46" x2="74" y2="42" stroke="#0f172a" strokeWidth="3" />
              <line x1="57" y1="59" x2="66" y2="70" stroke="#0f172a" strokeWidth="3" />
              <line x1="43" y1="59" x2="34" y2="70" stroke="#0f172a" strokeWidth="3" />
              <line x1="39" y1="46" x2="26" y2="42" stroke="#0f172a" strokeWidth="3" />
              <polygon points="50,24 38,15 28,24 39,33" fill="#334155" />
              <polygon points="50,24 62,15 72,24 61,33" fill="#334155" />
              <polygon points="74,42 86,34 92,46 83,56" fill="#334155" />
              <polygon points="26,42 14,34 8,46 17,56" fill="#334155" />
              <polygon points="66,70 78,70 74,84 60,84" fill="#334155" />
              <polygon points="34,70 22,70 26,84 40,84" fill="#334155" />
            </svg>
          </div>

          {showText && (
            <div className={`font-black tracking-tight leading-none ${textSizeClasses}`}>
              <span className={isLightBackground ? 'text-slate-900' : 'text-white'}>
                {platformName ? platformName.replace(/WDS$/i, '') || 'Watch' : 'Watch'}
              </span>
              <span className="text-blue-600 dark:text-blue-500 ml-0.5">
                {platformName && platformName.toUpperCase().endsWith('WDS') ? 'WDS' : 'WDS'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
