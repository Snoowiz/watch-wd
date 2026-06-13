import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LogOut, Settings as GearIcon,
  Sun, Moon, Monitor, Sparkles, LayoutDashboard, Video, MessageSquare, Users
} from 'lucide-react';
import { useAuthStore, useThemeStore, useFeatureStore } from '../store';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, setLogoutModalOpen } = useAuthStore();
  const { theme, setTheme, isDarkMode } = useThemeStore();
  const { isFeatureActive } = useFeatureStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleLogout = () => {
    setLogoutModalOpen(true);
    setIsOpen(false);
  };

  const closeDropdown = () => setIsOpen(false);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 hover:opacity-80 transition-opacity rounded-full focus:outline-none"
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
          {/* Header Section */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <Link to="/profile" onClick={closeDropdown} className="flex items-center gap-3 hover:opacity-80">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{user.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{user.role}</div>
              </div>
            </Link>
            <Link to="/profile" onClick={closeDropdown} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-700">
              <GearIcon className="w-5 h-5" />
            </Link>
          </div>

          {/* Main Links */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 space-y-1">
            {user.role === 'admin' && (
              <Link to="/admin" onClick={closeDropdown} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <LayoutDashboard className="w-5 h-5 text-slate-400" /> Administrative Panel
              </Link>
            )}
            {user.role === 'creator' && (
              <Link to="/creator/studio" onClick={closeDropdown} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Video className="w-5 h-5 text-slate-400" /> Creator Studio
              </Link>
            )}

            {/* Mobile-only Navigation Links */}
            <div className="md:hidden space-y-1">
              <Link to="/matches" onClick={closeDropdown} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Video className="w-5 h-5 text-slate-400" /> Matches
              </Link>
              <Link to="/blog" onClick={closeDropdown} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <MessageSquare className="w-5 h-5 text-slate-400" /> Blog
              </Link>
              {isFeatureActive('community_forum') && (
                <Link to="/forum" onClick={closeDropdown} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Users className="w-5 h-5 text-slate-400" /> Community
                </Link>
              )}
              <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2" />
            </div>
            
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>

          {/* Theme Toggles Footer */}
          <div className="p-3">
            <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-full p-1 flex items-center justify-between">
              <button onClick={() => setTheme('light')} className={`flex-1 py-1.5 flex justify-center rounded-full transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 border border-slate-200/50' : 'text-slate-400 hover:text-slate-500'} dark:text-slate-200`} title="Light Mode">
                <Sun className="w-[16px] h-[16px]" />
              </button>
              <button onClick={() => setTheme('dark')} className={`flex-1 py-1.5 flex justify-center rounded-full transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-slate-100 border border-slate-200/50 dark:border-slate-700' : 'text-slate-400 hover:text-slate-500'} dark:text-slate-200`} title="Dark Mode">
                <Moon className="w-[16px] h-[16px]" />
              </button>
              <button onClick={() => setTheme('system')} className={`flex-1 py-1.5 flex justify-center rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-slate-100 border border-slate-200/50 dark:border-slate-700' : 'text-slate-400 hover:text-slate-500'} dark:text-slate-200`} title="System Preference">
                <Monitor className="w-[16px] h-[16px]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
