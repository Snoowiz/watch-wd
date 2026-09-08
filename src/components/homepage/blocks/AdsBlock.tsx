import React from 'react';
import { ExternalLink } from 'lucide-react';
import { HomepageBlock } from '../../../store';

export function AdsBlock({ block }: { block: HomepageBlock }) {
  const { bannerImageUrl, targetUrl, altText, targetBlank } = block.config || {};

  if (!bannerImageUrl) {
    return null;
  }

  const content = (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 shadow-md group">
      <img
        src={bannerImageUrl}
        alt={altText || 'Sponsor banner'}
        className="w-full h-auto max-h-[220px] object-cover group-hover:scale-[1.01] transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/60 backdrop-blur-sm text-[10px] font-black uppercase text-white tracking-widest">
        Sponsored
      </div>
    </div>
  );

  if (targetUrl) {
    return (
      <section className="w-full my-4">
        <a
          href={targetUrl}
          target={targetBlank !== false ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="block focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-2xl"
        >
          {content}
        </a>
      </section>
    );
  }

  return <section className="w-full my-4">{content}</section>;
}
