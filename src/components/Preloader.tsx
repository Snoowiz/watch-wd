import React from 'react';
import { useSettingsStore, useThemeStore } from '../store';
import { BrandLogo } from './BrandLogo';

interface PreloaderProps {
  forceStyle?: 'bouncing-ball' | 'scanning-logo';
}

export function Preloader({ forceStyle }: PreloaderProps = {}) {
  const { preloaderStyle = 'bouncing-ball', platformName, logoUrl, logoLightUrl, logoDarkUrl } = useSettingsStore();
  const { isDarkMode } = useThemeStore();

  const activeStyle = forceStyle || preloaderStyle || 'bouncing-ball';
  const activeLogo = isDarkMode ? (logoDarkUrl || logoUrl) : (logoLightUrl || logoUrl);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Stylesheet injection for physics & scanning beam keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 1. Football Bouncing Physics */
        .football-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 160px;
        }

        .football-ball {
          width: 76px;
          height: 76px;
          animation: football-bounce 1.2s infinite ease-in-out;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.18));
          z-index: 10;
        }

        .football-svg {
          width: 100%;
          height: 100%;
        }

        .football-shadow {
          width: 58px;
          height: 8px;
          background: rgba(15, 23, 42, 0.25);
          border-radius: 50%;
          position: absolute;
          bottom: 18px;
          animation: shadow-scale 1.2s infinite ease-in-out;
          filter: blur(2px);
          z-index: 5;
        }

        .dark .football-shadow {
          background: rgba(37, 99, 235, 0.25);
        }

        @keyframes football-bounce {
          0%, 100% {
            transform: translateY(0) scaleY(0.85) scaleX(1.15) rotate(0deg);
          }
          10% {
            transform: translateY(0) scaleY(1.05) scaleX(0.95) rotate(15deg);
          }
          45% {
            transform: translateY(-80px) scaleY(1) scaleX(1) rotate(180deg);
          }
          55% {
            transform: translateY(-80px) scaleY(1) scaleX(1) rotate(180deg);
          }
          90% {
            transform: translateY(0) scaleY(1.05) scaleX(0.95) rotate(345deg);
          }
          95%, 98% {
            transform: translateY(0) scaleY(0.8) scaleX(1.2) rotate(360deg);
          }
        }

        @keyframes shadow-scale {
          0%, 100%, 95%, 98% {
            transform: scale(1.3);
            opacity: 0.5;
          }
          45%, 55% {
            transform: scale(0.3);
            opacity: 0.08;
          }
        }

        .preloader-glow {
          position: absolute;
          width: 130px;
          height: 130px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
        }

        /* 2. Horizontal Scanning Laser / Light Beam Sweep */
        .scan-container {
          position: relative;
          padding: 24px 36px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .scan-wrapper {
          position: relative;
          display: inline-block;
          overflow: hidden;
          padding: 12px 18px;
          border-radius: 16px;
        }

        /* Moving laser line & gradient beam sweep horizontally */
        .preloader-scan-beam {
          position: absolute;
          top: 0;
          left: -100%;
          width: 80%;
          height: 100%;
          background: linear-gradient(
            90deg, 
            transparent 0%, 
            rgba(59, 130, 246, 0.08) 25%, 
            rgba(59, 130, 246, 0.45) 50%, 
            rgba(255, 255, 255, 0.95) 55%, 
            rgba(59, 130, 246, 0.45) 60%, 
            rgba(59, 130, 246, 0.08) 75%, 
            transparent 100%
          );
          animation: scan-horizontal-sweep 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 30;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
        }

        /* Subtle horizontal laser tracer */
        .laser-line {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
          z-index: 5;
        }

        @keyframes scan-horizontal-sweep {
          0% {
            left: -100%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            left: 200%;
            opacity: 0;
          }
        }

        /* Logo pulse & ambient glow */
        .logo-scan-ambient {
          position: absolute;
          width: 260px;
          height: 90px;
          background: radial-gradient(ellipse, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0) 75%);
          border-radius: 50%;
          animation: ambient-pulse 2s infinite ease-in-out;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes ambient-pulse {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.9;
          }
        }

        /* Subtle scan bar indicator at the bottom */
        .scan-progress-bar {
          width: 140px;
          height: 3px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
          margin-top: 18px;
        }

        .scan-progress-fill {
          position: absolute;
          top: 0;
          left: -40%;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #2563eb, #60a5fa, #2563eb, transparent);
          animation: progress-slide 1.5s infinite ease-in-out;
          border-radius: 9999px;
        }

        @keyframes progress-slide {
          0% {
            left: -40%;
          }
          100% {
            left: 120%;
          }
        }
      `}} />

      {activeStyle === 'bouncing-ball' ? (
        /* OPTION 1: Bouncing Football with Platform Logo directly below (Replaced Text) */
        <div className="flex flex-col items-center justify-center">
          <div className="football-container">
            <div className="preloader-glow" />
            
            <div className="football-ball">
              <svg viewBox="0 0 100 100" className="football-svg">
                <circle cx="50" cy="50" r="45" fill="#ffffff" stroke="#0f172a" strokeWidth="4" />
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
                <circle cx="50" cy="5" r="4" fill="#0f172a" />
                <circle cx="95" cy="50" r="4" fill="#0f172a" />
                <circle cx="5" cy="50" r="4" fill="#0f172a" />
                <circle cx="50" cy="95" r="4" fill="#0f172a" />
              </svg>
            </div>

            <div className="football-shadow" />
          </div>

          {/* Platform Logo Below Bouncing Ball (Zero 'loading platform' text) */}
          <div className="mt-5 flex items-center justify-center">
            {activeLogo ? (
              <img
                src={activeLogo}
                alt={platformName || 'WatchWDS'}
                className="h-10 sm:h-12 max-w-[200px] object-contain drop-shadow-sm"
              />
            ) : (
              <BrandLogo size="lg" />
            )}
          </div>
        </div>
      ) : (
        /* OPTION 2: Centered Logo with Horizontal Scanning Light Sweep */
        <div className="scan-container">
          <div className="logo-scan-ambient" />

          {/* Logo Wrapper with Horizontal Scanning Shimmer Beam */}
          <div className="scan-wrapper relative z-10 flex items-center justify-center">
            {/* The horizontal scanning laser beam */}
            <div className="preloader-scan-beam" />

            {/* Platform Logo */}
            {activeLogo ? (
              <div className="relative">
                <img
                  src={activeLogo}
                  alt={platformName || 'WatchWDS'}
                  className="h-14 sm:h-16 max-w-[260px] object-contain drop-shadow-lg"
                />
              </div>
            ) : (
              <div className="relative">
                <BrandLogo size="xl" />
              </div>
            )}
          </div>

          {/* Futuristic horizontal scanner progress track */}
          <div className="scan-progress-bar">
            <div className="scan-progress-fill" />
          </div>
        </div>
      )}
    </div>
  );
}
export default Preloader;
