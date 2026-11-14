import React from 'react';
import { BrandLogo } from './BrandLogo';
import { youtubeSource } from '../utils/youtube';

/** Shared admin/public presentation. Branding is outside the complete native viewport. */
export function WatchWDSYouTubePlayer({ source, title = 'Match video', isLive = false }: {source:string; title?:string; isLive?:boolean}) {
  const video = youtubeSource(source);
  if (!video) return null;
  return <section aria-label={`${title} player`} className="w-full min-w-[200px] bg-[#0A0A0B] text-white border-t-4 border-[#1261FF]">
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <BrandLogo variant="light" size="sm" />
      {isLive && <span className="text-xs font-bold tracking-wider px-2 py-1 rounded bg-[#1261FF]">LIVE</span>}
    </header>
    <div className="w-full min-w-[200px] min-h-[200px] aspect-video bg-black">
      <iframe src={video.src} title={`${title} — YouTube video player`} className="block w-full h-full min-h-[200px] border-0" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share" allowFullScreen />
    </div>
    <footer className="px-4 py-3 border-b border-white/10">
      <p className="font-bold text-sm break-words">{title}</p>
      <p className="mt-1 text-xs text-slate-300">Select play in the YouTube player. Captions and viewing settings are available where supported.</p>
      <p className="mt-2 text-xs text-slate-400">If this video is unavailable, <a className="text-blue-300 underline focus-visible:outline focus-visible:outline-2" href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">check it on YouTube</a>.</p>
    </footer>
  </section>;
}
