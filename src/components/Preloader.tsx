import React from 'react';
import { useSettingsStore } from '../store';

export function Preloader() {
  const { platformName } = useSettingsStore();

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Stylesheet injection for squash, stretch, and bounce keyframe physics */}
      <style dangerouslySetInnerHTML={{ __html: `
        .football-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 180px;
        }

        .football-ball {
          width: 80px;
          height: 80px;
          animation: football-bounce 1.2s infinite ease-in-out;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
          z-index: 10;
        }

        .football-svg {
          width: 100%;
          height: 100%;
        }

        .football-shadow {
          width: 60px;
          height: 8px;
          background: rgba(15, 23, 42, 0.2);
          border-radius: 50%;
          position: absolute;
          bottom: 20px;
          animation: shadow-scale 1.2s infinite ease-in-out;
          filter: blur(2px);
          z-index: 5;
        }

        .dark .football-shadow {
          background: rgba(253, 224, 71, 0.15);
        }

        @keyframes football-bounce {
          0%, 100% {
            transform: translateY(0) scaleY(0.85) scaleX(1.15) rotate(0deg);
          }
          10% {
            transform: translateY(0) scaleY(1.05) scaleX(0.95) rotate(15deg);
          }
          45% {
            transform: translateY(-90px) scaleY(1) scaleX(1) rotate(180deg);
          }
          55% {
            transform: translateY(-90px) scaleY(1) scaleX(1) rotate(180deg);
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
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
        }
      `}} />

      <div className="football-container">
        {/* Glow behind the ball */}
        <div className="preloader-glow" />

        {/* The bouncing/squashing football */}
        <div className="football-ball">
          <svg viewBox="0 0 100 100" className="football-svg">
            {/* White base shell */}
            <circle cx="50" cy="50" r="45" fill="#ffffff" stroke="#0f172a" strokeWidth="4" />
            
            {/* Center Pentagon */}
            <polygon points="50,38 61,46 57,59 43,59 39,46" fill="#0f172a" />
            
            {/* Connecting Stitches */}
            <line x1="50" y1="38" x2="50" y2="24" stroke="#0f172a" strokeWidth="3" />
            <line x1="61" y1="46" x2="74" y2="42" stroke="#0f172a" strokeWidth="3" />
            <line x1="57" y1="59" x2="66" y2="70" stroke="#0f172a" strokeWidth="3" />
            <line x1="43" y1="59" x2="34" y2="70" stroke="#0f172a" strokeWidth="3" />
            <line x1="39" y1="46" x2="26" y2="42" stroke="#0f172a" strokeWidth="3" />
            
            {/* Surrounding outer shapes */}
            <polygon points="50,24 38,15 28,24 39,33" fill="#334155" />
            <polygon points="50,24 62,15 72,24 61,33" fill="#334155" />
            
            <polygon points="74,42 86,34 92,46 83,56" fill="#334155" />
            <polygon points="26,42 14,34 8,46 17,56" fill="#334155" />
            
            <polygon points="66,70 78,70 74,84 60,84" fill="#334155" />
            <polygon points="34,70 22,70 26,84 40,84" fill="#334155" />
            
            {/* Top and Bottom edge indicators */}
            <circle cx="50" cy="5" r="4" fill="#0f172a" />
            <circle cx="95" cy="50" r="4" fill="#0f172a" />
            <circle cx="5" cy="50" r="4" fill="#0f172a" />
            <circle cx="50" cy="95" r="4" fill="#0f172a" />
          </svg>
        </div>

        {/* Dynamic Shadow */}
        <div className="football-shadow" />
      </div>

      {/* Brand Label */}
      <div className="mt-8 text-center animate-pulse">
        <div className="text-2xl font-black tracking-tighter">
          <span className="text-slate-900 dark:text-white">Watch</span>
          <span className="text-yellow-500">WDS</span>
        </div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-1">
          Loading Platform
        </p>
      </div>
    </div>
  );
}
