import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { useConsent } from '../utils/useConsent';

export const CONSENT_PREFERENCES_PATH = '/privacy/preferences';

// Accept all / Reject all / Manage choices share one style so no option is visually favoured.
const choiceClass =
  'flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm font-bold text-center text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

export function CookieBanner() {
  const { settings, record, ready, save } = useConsent();
  const location = useLocation();

  const isVisible =
    ready && !!settings?.enabled && record === null && location.pathname !== CONSENT_PREFERENCES_PATH;

  const acceptAll = () => save({ analytics: true, advertising: true });
  const rejectAll = () => save({ analytics: false, advertising: false });

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
          role="dialog"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-message"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Closing the banner counts as Reject all */}
            <button
              type="button"
              onClick={rejectAll}
              aria-label={settings.rejectText || 'Reject all'}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Cookie className="w-6 h-6 text-yellow-500" aria-hidden="true" />
              </div>
              <div>
                <h3 id="cookie-banner-title" className="font-black text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Cookies Privacy</h3>
                <p id="cookie-banner-message" className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {settings.message}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              <button type="button" onClick={acceptAll} className={choiceClass}>
                {settings.acceptText || 'Accept all'}
              </button>
              <button type="button" onClick={rejectAll} className={choiceClass}>
                {settings.rejectText || 'Reject all'}
              </button>
              <Link to={CONSENT_PREFERENCES_PATH} className={choiceClass}>
                {settings.manageText || 'Manage choices'}
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
