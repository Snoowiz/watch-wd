import React from 'react';
import { Link } from 'react-router-dom';
import { ServerCrash, Home, RefreshCw } from 'lucide-react';

interface ServerErrorProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export function ServerError({ error, resetErrorBoundary }: ServerErrorProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-8 mx-auto">
        <ServerCrash className="w-12 h-12 text-red-500 dark:text-red-400" />
      </div>
      
      <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">500</h1>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Internal Server Error</h2>
      
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
        We're experiencing an internal server problem. Please try again later. If the problem persists, please contact support.
      </p>

      {error && process.env.NODE_ENV !== 'production' && (
        <div className="max-w-2xl w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-8 text-left overflow-auto text-sm">
          <p className="font-bold text-red-500 mb-2">{error.toString()}</p>
          <pre className="text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-pre-wrap">
            {error.stack}
          </pre>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
        {resetErrorBoundary && (
          <button 
            onClick={resetErrorBoundary}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors w-full sm:w-auto justify-center"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        )}
        <Link 
          to="/" 
          onClick={resetErrorBoundary}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 w-full sm:w-auto justify-center"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
