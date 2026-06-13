import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getCookieSettings, CookieSettings } from '../services/settingsService';
import { Cookie, X } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermission } from '../services/notificationService';
import { useAuthStore } from '../store';

export function CookieBanner() {
  const [settings, setSettings] = useState<CookieSettings | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const checkCookies = async () => {
      const consent = localStorage.getItem('watchwds-cookie-consent');
      if (!consent) {
        const s = await getCookieSettings();
        setSettings(s);
        if (s?.enabled) {
          setIsVisible(true);
        }
      }
    };
    checkCookies();
  }, []);

  const handleAccept = async () => {
    localStorage.setItem('watchwds-cookie-consent', 'accepted');
    setIsVisible(false);
    
    // Attempt push notification permission silently
    if (user && 'Notification' in window && getNotificationPermission() !== 'granted') {
      try {
        await requestNotificationPermission(user.id);
      } catch (err) {
        console.error('Notification error', err);
      }
    }
  };

  const handleReject = () => {
    localStorage.setItem('watchwds-cookie-consent', 'rejected');
    setIsVisible(false);
  };

  if (!settings || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.5 }}
          className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-8 md:right-auto z-[110] max-w-sm origin-bottom-left"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <button 
              onClick={handleReject}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Cookie className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Cookies Privacy</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {settings.message}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {settings.rejectText}
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
              >
                {settings.acceptText}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
