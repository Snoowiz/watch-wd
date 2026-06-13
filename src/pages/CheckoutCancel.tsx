import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-700 text-center animate-in fade-in slide-in-from-bottom-10 duration-500">
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Payment Cancelled
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            You have cancelled the checkout process.
          </p>
          <button
             onClick={() => navigate('/profile')}
             className="w-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-xl transition-all"
          >
            Return to Profile
          </button>
        </div>
      </div>
    </div>
  );
}
