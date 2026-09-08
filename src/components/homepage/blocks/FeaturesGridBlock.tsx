import React from 'react';
import { Video, Unlock, CreditCard } from 'lucide-react';
import { HomepageBlock } from '../../../store';

export function FeaturesGridBlock({ block }: { block: HomepageBlock }) {
  return (
    <section className="space-y-6">
      {block.title && (
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {block.title}
          </h2>
          {block.subtitle && (
            <p className="text-slate-500 dark:text-slate-400 font-medium">{block.subtitle}</p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group flex flex-row items-start gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <Video className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">
              Live Streaming
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-xs sm:text-sm">
              High-quality live streams from our approved camera operators directly to your device.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group flex flex-row items-start gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <Unlock className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">
              Pay-Per-View
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-xs sm:text-sm">
              Unlock premium matches using our secure wallet balance. Support local sports directly.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group flex flex-row items-start gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">
              Flexible Subscriptions
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-xs sm:text-sm">
              Subscribe to custom plans for unlimited access to exclusive team broadcasts, replays, and full match passes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
