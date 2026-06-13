import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';

export function LogoutModal() {
  const { isLogoutModalOpen, setLogoutModalOpen, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    setLogoutModalOpen(false);
    logout();
    navigate('/');
  };

  return (
    <AnimatePresence>
      {isLogoutModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setLogoutModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl z-50 overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Sign Out
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Are you sure you want to sign out? You will need to log in again to access your account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLogoutModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
