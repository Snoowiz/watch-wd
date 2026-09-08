import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HomepageBlock } from '../../../store';

export function CustomTextBlock({ block }: { block: HomepageBlock }) {
  const { content, buttonText, buttonUrl, alignment = 'center' } = block.config || {};

  const alignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  }[alignment as 'left' | 'center' | 'right'] || 'text-center items-center';

  return (
    <section className="w-full">
      <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-700/50 shadow-xl flex flex-col ${alignClass} space-y-5 max-w-5xl mx-auto relative overflow-hidden`}>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {block.title && (
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white relative z-10">
            {block.title}
          </h2>
        )}

        {block.subtitle && (
          <p className="text-yellow-400 font-bold uppercase tracking-widest text-xs relative z-10">
            {block.subtitle}
          </p>
        )}

        {content && (
          <p className="text-slate-300 max-w-2xl text-base sm:text-lg leading-relaxed font-normal relative z-10 whitespace-pre-line">
            {content}
          </p>
        )}

        {buttonText && buttonUrl && (
          <div className="pt-3 relative z-10">
            <Link
              to={buttonUrl}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-yellow-500/25 group"
            >
              <span>{buttonText}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
