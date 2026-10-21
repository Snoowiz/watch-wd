import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlayCircle, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { formatStreamHtml, loadMuxPlayerIfNeeded } from '../utils/embedHelper';

export interface MatchStreamPlayerProps {
  rawStreamContent: string;
  title?: string;
  thumbnail?: string;
  matchDate?: string;
  isLive?: boolean;
  isMobile?: boolean;
}

export const MatchStreamPlayer = React.memo(function MatchStreamPlayer({
  rawStreamContent,
  title,
  thumbnail,
  matchDate,
  isLive = false,
  isMobile = false,
}: MatchStreamPlayerProps) {
  const [mobileVideoStarted, setMobileVideoStarted] = useState(false);
  const [isAssetProcessing, setIsAssetProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<any>(null);

  // Pre-load Mux custom element script when content references Mux
  useEffect(() => {
    loadMuxPlayerIfNeeded(rawStreamContent);
  }, [rawStreamContent]);

  // Memoize sanitized HTML so string identity remains stable across parent renders
  const sanitizedStreamHtml = useMemo(() => {
    return formatStreamHtml(rawStreamContent, {
      autoplay: mobileVideoStarted,
      isLive,
    });
  }, [rawStreamContent, mobileVideoStarted, isLive]);

  // Generate a stable key for player DOM persistence
  const playerStableKey = useMemo(() => {
    if (!rawStreamContent) return 'empty_player';
    // Clean string key
    const clean = rawStreamContent.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    return `player_${clean}`;
  }, [rawStreamContent]);

  const handleMobilePlay = useCallback(async () => {
    setMobileVideoStarted(true);
    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
          try {
            await (window.screen.orientation as any).lock('landscape');
          } catch {
            // Orientation lock is optional
          }
        }
      }
    } catch {
      // Fullscreen is optional
    }
  }, []);

  // Manual or automatic retry check for Mux asset processing
  const handleCheckStreamReady = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const muxEl = container.querySelector('mux-player') as any;
    if (muxEl) {
      if (typeof muxEl.load === 'function') {
        muxEl.load();
      } else {
        const src = muxEl.getAttribute('src');
        if (src) {
          muxEl.setAttribute('src', src);
        }
      }
    }
    setRetryCount(prev => prev + 1);
  }, []);

  // Monitor Mux Player lifecycle and errors via DOM event delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleError = (e: any) => {
      // Check if target is mux-player or video inside
      const isMux = !!container.querySelector('mux-player');
      if (isMux) {
        // If the video asset is still preparing/transcoding, show stable processing placeholder
        setIsAssetProcessing(true);

        // Exponential gentle backoff: retry checking every 12 to 20 seconds instead of rapid remount loop
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          handleCheckStreamReady();
        }, 12000);
      }
    };

    const handleReady = () => {
      setIsAssetProcessing(false);
      clearTimeout(retryTimerRef.current);
    };

    // Capture error events on custom elements
    container.addEventListener('error', handleError, true);
    container.addEventListener('canplay', handleReady, true);
    container.addEventListener('playing', handleReady, true);
    container.addEventListener('loadeddata', handleReady, true);
    container.addEventListener('loadedmetadata', handleReady, true);

    return () => {
      clearTimeout(retryTimerRef.current);
      container.removeEventListener('error', handleError, true);
      container.removeEventListener('canplay', handleReady, true);
      container.removeEventListener('playing', handleReady, true);
      container.removeEventListener('loadeddata', handleReady, true);
      container.removeEventListener('loadedmetadata', handleReady, true);
    };
  }, [sanitizedStreamHtml, handleCheckStreamReady]);

  if (!rawStreamContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-4 text-center">
        <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-4 sm:mb-6 text-yellow-500/50" />
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-white/80 tracking-tight">
          Broadcast will begin shortly
        </h3>
        {matchDate && (
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Scheduled for {matchDate}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      key={playerStableKey}
      className="w-full h-full absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:border-0 [&_video]:w-full [&_video]:h-full [&_video]:object-contain [&_mux-player]:w-full [&_mux-player]:h-full [&_mux-player]:block flex items-center justify-center bg-slate-900"
    >
      {/* 1. Mobile Tap-to-Play Overlay (preserves user interaction requirement) */}
      {!mobileVideoStarted && isMobile ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-slate-900"
          onClick={handleMobilePlay}
        >
          {thumbnail && (
            <img
              src={thumbnail}
              alt={title || 'Match Video'}
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
          <PlayCircle className="w-16 h-16 text-white drop-shadow-xl z-20 hover:scale-110 transition-transform" />
          <div
            className="absolute inset-0 -z-10"
            dangerouslySetInnerHTML={{ __html: sanitizedStreamHtml }}
            style={{ opacity: 0.01, pointerEvents: 'none' }}
          />
        </div>
      ) : (
        /* 2. Primary Media Player Embed (Kept stably mounted in DOM) */
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: sanitizedStreamHtml }}
        />
      )}

      {/* 3. Stable Processing Placeholder (Shown while Mux is actively transcoding newly uploaded assets) */}
      {isAssetProcessing && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-fade-in">
          {thumbnail && (
            <img
              src={thumbnail}
              alt={title || 'Processing Match'}
              className="absolute inset-0 w-full h-full object-cover opacity-20 -z-10 pointer-events-none"
            />
          )}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl shadow-amber-500/10">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
            Broadcast Stream Encoding in Progress
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Your match video has been uploaded and is currently being processed by Mux for high-definition, adaptive streaming. Playback will begin automatically once processing finishes.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCheckStreamReady}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check Stream Status
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              Auto-checking every 12s...
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
