import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, LogIn, UserPlus, X, Sparkles, CheckCircle2, Shield, Tv } from 'lucide-react';
import type { Match } from '../store';

interface AccountGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  onLogin: () => void;
  onRegister: () => void;
}

export const AccountGateModal: React.FC<AccountGateModalProps> = ({
  isOpen,
  onClose,
  match,
  onLogin,
  onRegister,
}) => {
  if (!isOpen || !match) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 text-white"
        >
          {/* Top Decorative Banner with Match Preview */}
          <div className="relative h-36 bg-gradient-to-br from-yellow-500/20 via-slate-800 to-slate-900 overflow-hidden border-b border-slate-800">
            {match.thumbnail && (
              <img
                src={match.thumbnail}
                alt={match.title}
                className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-lg shadow-yellow-500/10 shrink-0">
                <Tv className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
                  <Sparkles className="w-3 h-3" />
                  100% Free Match
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {match.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Account Required to Watch Free
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span className="sm:hidden">Sign in to watch this match for free. New users can create an account directly from the login page.</span>
                <span className="hidden sm:inline">Enjoy complimentary, full-stream match coverage and on-demand replays. Sign in or create a free WatchWDS account to start watching instantly.</span>
              </p>
            </div>

            {/* Feature Perks */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant access to free livestreams and full replay archives</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Save matches to your watchlist & get kickoff alerts</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Participate in live match chat & interact with fans</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="font-semibold text-slate-200">Zero cost — no credit card needed</span>
              </div>
            </div>

            {/* Action Button: Single Login Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={onLogin}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-3 sm:py-3.5 px-5 rounded-xl transition-all shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2.5 text-sm sm:text-base active:scale-[0.98] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In to Watch Free</span>
              </button>
            </div>

            {/* Footer Dismiss Note */}
            <div className="text-center pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 hover:underline"
              >
                Continue browsing match details without logging in
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
