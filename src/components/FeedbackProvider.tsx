import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquarePlus } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

export interface FeedbackSettings {
  enabled: boolean;
  allow_guest: boolean;
  trigger_type: 'delay' | 'page_count' | 'manual_only';
  trigger_delay_seconds: number;
  pages_before_prompt: number;
  popup_frequency?: 'once_per_device' | 'once_per_day' | 'once_per_week';
  target_pages?: 'match_detail_only' | 'all_except_auth';
  cooldown_days_after_submit: number;
  cooldown_days_after_dismiss: number;
  cooldown_days_after_later: number;
  categories: string[];
  notify_admin_email: boolean;
}

interface FeedbackContextType {
  openFeedback: (initialCategory?: string) => void;
  closeFeedback: () => void;
  isOpen: boolean;
  settings: FeedbackSettings | null;
}

const FeedbackContext = createContext<FeedbackContextType>({
  openFeedback: () => {},
  closeFeedback: () => {},
  isOpen: false,
  settings: null
});

export const useFeedbackModal = () => useContext(FeedbackContext);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);

  // Fetch feedback configuration
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/feedback/settings');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (err) {
        console.warn('Could not fetch feedback settings:', err);
      }
    };
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const openFeedback = useCallback((initialCategory?: string) => {
    setActiveCategory(initialCategory);
    setIsOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Check if frequency or cooldown prevents automatic popup
  const isCooldownActive = useCallback((): boolean => {
    if (!settings) return true;
    try {
      const now = Date.now();
      const MS_IN_DAY = 24 * 60 * 60 * 1000;
      const frequency = settings.popup_frequency || 'once_per_device';

      // 1. Once-per-device rule
      if (frequency === 'once_per_device') {
        const deviceShown = localStorage.getItem('watchwds_fb_device_shown');
        const submitted = localStorage.getItem('watchwds_fb_submitted_at');
        const dismissed = localStorage.getItem('watchwds_fb_dismissed_at');
        if (deviceShown || submitted || dismissed) {
          return true; // Already shown or answered on this device
        }
      }

      // 2. Frequency timing rule (once per day / once per week)
      const lastShownAt = localStorage.getItem('watchwds_fb_last_shown_at');
      if (lastShownAt) {
        const diffDays = (now - Number(lastShownAt)) / MS_IN_DAY;
        if (frequency === 'once_per_day' && diffDays < 1) {
          return true;
        }
        if (frequency === 'once_per_week' && diffDays < 7) {
          return true;
        }
      }

      // 3. Submitted cooldown
      const submittedAt = localStorage.getItem('watchwds_fb_submitted_at');
      if (submittedAt) {
        const diffDays = (now - Number(submittedAt)) / MS_IN_DAY;
        if (diffDays < (settings.cooldown_days_after_submit || 30)) {
          return true;
        }
      }

      // 4. "Maybe Later" cooldown
      const laterAt = localStorage.getItem('watchwds_fb_later_at');
      if (laterAt) {
        const diffDays = (now - Number(laterAt)) / MS_IN_DAY;
        if (diffDays < (settings.cooldown_days_after_later || 7)) {
          return true;
        }
      }

      // 5. Dismissed cooldown
      const dismissedAt = localStorage.getItem('watchwds_fb_dismissed_at');
      if (dismissedAt) {
        const diffDays = (now - Number(dismissedAt)) / MS_IN_DAY;
        if (diffDays < (settings.cooldown_days_after_dismiss || 1)) {
          return true;
        }
      }

      // 6. Active browser session guard (maximum once per active tab session)
      const sessionShown = sessionStorage.getItem('watchwds_fb_session_shown');
      if (sessionShown) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [settings]);

  // Page counter tracking & automatic trigger evaluator
  useEffect(() => {
    if (!settings || !settings.enabled) return;
    if (settings.trigger_type === 'manual_only') return;

    const path = location.pathname.toLowerCase();

    // 1. STRICT EXCLUSIONS: Never trigger automatically on authentication, admin, creator, or checkout pages
    const isAuthRoute = path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password' || path.startsWith('/auth');
    const isAdminRoute = path.startsWith('/admin');
    const isCreatorRoute = path.startsWith('/creator');
    const isCheckoutRoute = path.startsWith('/checkout') || path.startsWith('/plans');

    if (isAuthRoute || isAdminRoute || isCreatorRoute || isCheckoutRoute) {
      return;
    }

    // 2. TARGET PAGES RULE: Default to match detail page only (/matches/:slug or /matches/:id)
    const targetPages = settings.target_pages || 'match_detail_only';
    if (targetPages === 'match_detail_only') {
      const isMatchDetailPage = path.startsWith('/matches/') && path !== '/matches' && path !== '/matches/';
      if (!isMatchDetailPage) {
        return; // Only auto-pop up while viewing an actual match
      }
    }

    // 3. Increment page counter in sessionStorage for page_count mode
    let currentPageCount = 1;
    try {
      const countStr = sessionStorage.getItem('watchwds_fb_page_count');
      currentPageCount = countStr ? parseInt(countStr) + 1 : 1;
      sessionStorage.setItem('watchwds_fb_page_count', currentPageCount.toString());
    } catch (err) {
      console.warn('Storage unavailable', err);
    }

    if (isCooldownActive()) return;

    // 4. Trigger evaluation
    const recordShown = () => {
      try {
        sessionStorage.setItem('watchwds_fb_session_shown', 'true');
        localStorage.setItem('watchwds_fb_device_shown', 'true');
        localStorage.setItem('watchwds_fb_last_shown_at', Date.now().toString());
      } catch (e) {
        console.warn('Storage write failed', e);
      }
      setIsOpen(true);
    };

    if (settings.trigger_type === 'page_count') {
      const targetPagesCount = settings.pages_before_prompt || 3;
      if (currentPageCount >= targetPagesCount) {
        recordShown();
      }
    } else if (settings.trigger_type === 'delay') {
      // Default wait time is 120 seconds (2 minutes)
      const delayMs = (settings.trigger_delay_seconds || 120) * 1000;
      const timer = setTimeout(() => {
        if (!isCooldownActive()) {
          recordShown();
        }
      }, delayMs);

      // Clean up timer if user navigates away before time elapsed
      return () => clearTimeout(timer);
    }
  }, [location.pathname, settings, isCooldownActive]);

  // Determine if voluntary floating launcher should be visible
  const rawPath = location.pathname.toLowerCase();
  const isExcludedPage = 
    rawPath === '/login' || 
    rawPath === '/register' || 
    rawPath === '/forgot-password' || 
    rawPath === '/reset-password' || 
    rawPath.startsWith('/auth') || 
    rawPath.startsWith('/admin') || 
    rawPath.startsWith('/checkout');
    
  const showFloatingLauncher = settings?.enabled !== false && !isExcludedPage && !isOpen;

  return (
    <FeedbackContext.Provider value={{ openFeedback, closeFeedback, isOpen, settings }}>
      {children}

      {/* Voluntary Floating Feedback Launcher */}
      {showFloatingLauncher && (
        <button
          onClick={() => openFeedback()}
          className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/60 shadow-lg shadow-black/60 backdrop-blur-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          title="Give Feedback"
          aria-label="Open Feedback Form"
        >
          <MessageSquarePlus className="w-4 h-4 transition-transform group-hover:rotate-12" />
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white pr-1">
            Feedback
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </span>
        </button>
      )}

      {/* Main Feedback Popup Modal */}
      <FeedbackModal
        isOpen={isOpen}
        onClose={closeFeedback}
        initialCategory={activeCategory}
        categories={settings?.categories}
      />
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;
