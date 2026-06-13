import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useFeatureStore, useSettingsStore, useThemeStore } from '../store';
import { Video, MessageSquare, Menu, X, Sun, Moon, Monitor, Home, LogIn, Search } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { UserDropdown } from './UserDropdown';
import { MobileDock } from './MobileDock';
import { Footer } from './Footer';
import { CookieBanner } from './CookieBanner';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, setLogoutModalOpen } = useAuthStore();
  const { isFeatureActive } = useFeatureStore();
  const { currencySymbol, platformName: storedPlatformName, favicon } = useSettingsStore();
  const platformName = storedPlatformName || 'WDSportz';
  const { theme, setTheme, isDarkMode, toggleDarkMode } = useThemeStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (favicon) {
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = favicon;
      if (!link.parentNode && document.head) {
        document.head.appendChild(link);
      }
    }
  }, [favicon]);

  // Compute initials from platform name (e.g., "WD" for "WDSportz" or "S" / "SP" for custom names)
  const platformInitials = (() => {
    const cleanName = typeof platformName === 'string' ? platformName.trim() : 'WDSportz';
    if (!cleanName) return 'WD';
    // If name contains space or uppercase letters, get first letters of major words/syllables
    const parts = cleanName.split(/[\s_-]+/);
    if (parts.length > 1 && parts[0] && parts[1]) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase() || 'WD';
    }
    // Else check for transitions from lowercase to uppercase
    const caps = cleanName.replace(/[^A-Z]/g, '');
    if (caps.length >= 2) {
      return caps.substring(0, 2);
    }
    return cleanName.substring(0, 2).toUpperCase() || 'WD';
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm dark:shadow-none border-b border-slate-200 dark:border-slate-800/50' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center font-bold text-white">
                  {platformInitials}
                </div>
                <span className="font-bold text-xl tracking-tight">{platformName}</span>
              </Link>
              
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link to="/matches" className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 dark:hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Matches
                </Link>
                <Link to="/blog" className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 dark:hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Blog
                </Link>
                {isFeatureActive('community_forum') && (
                  <Link to="/forum" className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 dark:hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Community
                  </Link>
                )}
                <Link to="/search" className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 dark:hover:text-yellow-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  Search
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  {isFeatureActive('wallet_system') && (
                    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 mr-2 text-yellow-500 font-bold">
                       {currencySymbol}{user.points}
                    </div>
                  )}
                  
                  <NotificationDropdown />
                  <div className="pl-2 border-l border-slate-200 dark:border-slate-700">
                     <UserDropdown />
                  </div>
                </>
              ) : (
                <>
                  <button onClick={toggleDarkMode} className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 dark:hover:text-yellow-400 p-2 rounded-full transition-colors mr-2">
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 font-medium px-4 py-2">
                    Log in
                  </Link>
                  <Link to="/register" className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu Button */}
            <div className="flex items-center md:hidden gap-2">
               {user && <NotificationDropdown />}
               <button 
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 p-2 ml-2"
               >
                 {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
               </button>
            </div>
          </div>
        </div>

        {/* Mobile menu Layer */}
        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute right-4 top-16 w-56 md:hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
              <div className="p-2">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Home className="w-4 h-4" />
                  Home
                </Link>
                <Link to="/matches" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Video className="w-4 h-4" />
                  Matches
                </Link>
                <Link to="/blog" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Blog
                </Link>
                {isFeatureActive('community_forum') && (
                  <Link to="/forum" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Community
                  </Link>
                )}
                <Link to="/search" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Search className="w-4 h-4 text-slate-400" />
                  Search
                </Link>
                
                {user && (
                   <>
                    <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2"></div>
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        Administrative Panel
                      </Link>
                    )}
                    {user.role === 'creator' && (
                      <Link to="/creator/studio" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        Creator Studio
                      </Link>
                    )}
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      My Profile
                    </Link>
                    <button onClick={() => { setLogoutModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                      Sign Out
                    </button>
                   </>
                )}
                
                {!user && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-2 mx-2"></div>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                      <LogIn className="w-4 h-4" />
                      Log In
                    </Link>
                  </>
                )}

                <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-2 mx-2"></div>
                
                <div className="px-2 pb-1">
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
            </div>
          </>
        )}
      </nav>

      <main className={`flex-1 w-full ${isHomePage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24'} md:pb-8 pb-24`}>
        {children}
      </main>
      
      <Footer />
      
      <MobileDock />
      <CookieBanner />
    </div>
  );
}
