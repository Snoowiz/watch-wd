import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function UIFeedbackProvider() {
  const { toasts, dismissToast, confirm, closeConfirm } = useUIStore();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleConfirmAction = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.onConfirm();
    } catch (err) {
      console.error('Error during confirm action:', err);
    } finally {
      setConfirmLoading(false);
      closeConfirm();
    }
  };

  return (
    <>
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto w-full bg-white dark:bg-slate-800 border rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 flex gap-3 items-start relative overflow-hidden transition-colors duration-200 ${
                toast.type === 'success' ? 'border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/50 dark:bg-emerald-950/20' :
                toast.type === 'error' ? 'border-rose-100 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/20' :
                toast.type === 'loading' ? 'border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/50 dark:bg-indigo-950/20' :
                'border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'loading' && (
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                )}
                {toast.type === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                )}
                {toast.type === 'error' && (
                  <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                )}
                {toast.type === 'info' && (
                  <Info className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {toast.message}
                </p>
              </div>

              {toast.type !== 'loading' && (
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Progressive loading bar for auto-dismissible toasts */}
              {toast.type !== 'loading' && (toast.duration ?? 4000) > 0 && (
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: (toast.duration ?? 4000) / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left ${
                    toast.type === 'success' ? 'bg-emerald-500 dark:bg-emerald-400' :
                    toast.type === 'error' ? 'bg-rose-500 dark:bg-rose-400' :
                    'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pop Confirmation Dialog / Modal */}
      <AnimatePresence>
        {confirm && confirm.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!confirmLoading) {
                  if (confirm.onCancel) confirm.onCancel();
                  closeConfirm();
                }
              }}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 overflow-hidden z-10"
              id="pop-confirm-modal"
            >
              <div className="flex flex-col items-center text-center">
                {/* Warning Icon Banner */}
                <div className={`p-3.5 rounded-full mb-4 ${confirm.isDanger ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' : 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400'}`}>
                  {confirm.isDanger ? (
                    <AlertTriangle className="w-8 h-8" />
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {confirm.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  {confirm.message}
                </p>

                {/* Footer buttons */}
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    disabled={confirmLoading}
                    onClick={() => {
                      if (confirm.onCancel) confirm.onCancel();
                      closeConfirm();
                    }}
                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-xl transition-all text-sm active:scale-95 disabled:opacity-50"
                  >
                    {confirm.cancelText || 'Cancel'}
                  </button>

                  <button
                    type="button"
                    disabled={confirmLoading}
                    onClick={handleConfirmAction}
                    className={`flex-1 px-4 py-3 text-white font-black rounded-xl transition-all text-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75 ${
                      confirm.isDanger
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20'
                        : 'bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 text-slate-900'
                    }`}
                  >
                    {confirmLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    <span>{confirm.confirmText || 'Confirm'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
