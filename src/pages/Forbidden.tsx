import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export function Forbidden() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-8 mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-500 dark:text-red-400" />
      </div>
      
      <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">403</h1>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Access Forbidden</h2>
      
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
        You don't have the necessary administrative or creator permissions to access this area. If you believe this is an error, please contact support.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <Link 
          to="/" 
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors w-full sm:w-auto justify-center"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </button>
      </div>
    </div>
  );
}
