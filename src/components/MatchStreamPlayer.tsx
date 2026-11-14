import { youtubeSource } from '../utils/youtube';
import { WatchWDSYouTubePlayer } from './WatchWDSYouTubePlayer';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlayCircle, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { formatStreamHtml, loadMuxPlayerIfNeeded } from '../utils/embedHelper';
import type { MuxWatermarkConfig } from '../store';
import { WatermarkOverlay, parseWatermarkConfig } from './WatermarkOverlay';

export interface MatchStreamPlayerProps {
  rawStreamContent: string;
  title?: string;
  thumbnail?: string;
  matchDate?: string;
  isLive?: boolean;
  isMobile?: boolean;
  status?: string;
  isEnded?: boolean;
  isUnavailable?: boolean;
  muxStreamStatus?: string | null;
  streamProvider?: string | null;
  playbackToken?: string | null;
  thumbnailToken?: string | null;
  storyboardToken?: string | null;
  watermarkConfig?: MuxWatermarkConfig | string | null;
  isMuxRecordedAsset?: boolean;
}

export const MatchStreamPlayer = React.memo(function MatchStreamPlayer({
  rawStreamContent,
  title,
  thumbnail,
  matchDate,
  isLive = false,
  isMobile = false,
  status,
  isEnded = false,
  isUnavailable = false,
  muxStreamStatus = null,
  streamProvider = null,
  playbackToken = null,
  thumbnailToken = null,
  storyboardToken = null,
  watermarkConfig = null,
  isMuxRecordedAsset = false,
}: MatchStreamPlayerProps) {
  const [mobileVideoStarted, setMobileVideoStarted] = useState(false);
  const [isAssetProcessing, setIsAssetProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<any>(null);
  const initialTokensRef = useRef<{
    content: string;
    playbackToken: string | null;
    thumbnailToken: string | null;
    storyboardToken: string | null;
  }>({
    content: '',
    playbackToken: null,
    thumbnailToken: null,
    storyboardToken: null,
  });

  // Update initial token snapshot only when stream source changes or first token arrives
  if (
    initialTokensRef.current.content !== rawStreamContent ||
    (!initialTokensRef.current.playbackToken && playbackToken)
  ) {
    initialTokensRef.current = {
      content: rawStreamContent,
      playbackToken,
      thumbnailToken,
      storyboardToken,
    };
  }

  // Pre-load Mux custom element script when content references Mux
  useEffect(() => {
    loadMuxPlayerIfNeeded(rawStreamContent);
  }, [rawStreamContent]);

  // Push refreshed JWT playback tokens directly onto mounted <mux-player> without remounting playback DOM
  useEffect(() => {
    initialTokensRef.current = {
      content: rawStreamContent,
      playbackToken,
      thumbnailToken,
      storyboardToken,
    };
    const container = containerRef.current;
    if (!container) return;
    const muxEl = container.querySelector('mux-player') as any;
    if (!muxEl) return;
    if (containerId) {
      muxEl.setAttribute('fullscreen-element', containerId);
      try { muxEl.fullscreenElement = containerId; } catch (_) {}
    }
    if (playbackToken) {
      muxEl.setAttribute('playback-token', playbackToken);
      try { muxEl.playbackToken = playbackToken; } catch (_) {}
    }
    if (thumbnailToken) {
      muxEl.setAttribute('thumbnail-token', thumbnailToken);
      try { muxEl.thumbnailToken = thumbnailToken; } catch (_) {}
    }
    if (storyboardToken) {
      muxEl.setAttribute('storyboard-token', storyboardToken);
      try { muxEl.storyboardToken = storyboardToken; } catch (_) {}
    }
  }, [rawStreamContent, playbackToken, thumbnailToken, storyboardToken]);

  const parsedWatermark = useMemo(() => parseWatermarkConfig(watermarkConfig), [watermarkConfig]);

  // Generate a stable key for player DOM persistence and fullscreen target container ID
  const playerStableKey = useMemo(() => {
    if (!rawStreamContent) return 'empty_player';
    // Clean string key
    const clean = rawStreamContent.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    return `player_${clean}`;
  }, [rawStreamContent]);

  const containerId = useMemo(() => {
    return `watchwds-player-container-${playerStableKey}`;
  }, [playerStableKey]);

  // Memoize sanitized HTML so string identity remains stable across parent renders
  const sanitizedStreamHtml = useMemo(() => {
    return formatStreamHtml(rawStreamContent, {
      autoplay: mobileVideoStarted,
      isLive,
      playbackToken: initialTokensRef.current.content === rawStreamContent ? initialTokensRef.current.playbackToken : playbackToken,
      thumbnailToken: initialTokensRef.current.content === rawStreamContent ? initialTokensRef.current.thumbnailToken : thumbnailToken,
      storyboardToken: initialTokensRef.current.content === rawStreamContent ? initialTokensRef.current.storyboardToken : storyboardToken,
      containerId,
    });
  }, [rawStreamContent, mobileVideoStarted, isLive, Boolean(playbackToken), containerId]);

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

  if (youtubeSource(rawStreamContent)) {
    return <WatchWDSYouTubePlayer source={rawStreamContent} title={title} isLive={isLive} />;
  }

  if (!rawStreamContent) {
    if (isUnavailable) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-4 text-center">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-amber-400" />
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-white/90 tracking-tight">
            Temporarily unavailable
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm">
            We are experiencing technical issues loading this stream. Please check back shortly.
          </p>
        </div>
      );
    }

    if (isEnded || status === 'completed' || status === 'full_match') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-4 text-center">
          <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-white/80 tracking-tight">
            Broadcast ended
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            No replay is currently available for this broadcast.
          </p>
        </div>
      );
    }

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
      id={containerId}
      key={playerStableKey}
      className="w-full h-full absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:border-0 [&_video]:w-full [&_video]:h-full [&_video]:object-contain [&_mux-player]:w-full [&_mux-player]:h-full [&_mux-player]:block flex items-center justify-center bg-slate-900 overflow-hidden [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:max-w-none [&:fullscreen]:max-h-none [&:fullscreen]:bg-black [&:-webkit-full-screen]:w-screen [&:-webkit-full-screen]:h-screen [&:-webkit-full-screen]:max-w-none [&:-webkit-full-screen]:max-h-none [&:-webkit-full-screen]:bg-black"
    >
      {/* 1. Mobile Tap-to-Play Overlay (preserves user interaction requirement) */}
      {!mobileVideoStarted && isMobile ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer bg-slate-900"
          onClick={handleMobilePlay}
        >
          {thumbnail && (
            <img
              src={thumbnail}
              alt={title || 'Match Video'}
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
          <div className="flex flex-col items-center gap-2 z-20">
            <PlayCircle className="w-16 h-16 text-white drop-shadow-xl hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-bold text-white bg-slate-950/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-md">
              {isLive ? 'Watch live' : 'Play replay'}
            </span>
          </div>
          <div
            className="absolute inset-0 -z-10"
            dangerouslySetInnerHTML={{ __html: sanitizedStreamHtml }}
            style={{ opacity: 0.01, pointerEvents: 'none' }}
          />
        </div>
      ) : (
        /* 2. Primary Media Player Embed (Kept stably mounted in DOM) */
        <div
          className="relative z-0 w-full h-full"
          dangerouslySetInnerHTML={{ __html: sanitizedStreamHtml }}
        />
      )}

      {/* Persistent Player Watermark Overlay (preserved in normal and fullscreen playback) */}
      {!isAssetProcessing && (!isMobile || mobileVideoStarted) && (
        <WatermarkOverlay
          config={parsedWatermark}
          allowBurnInFallback={true}
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
            {muxStreamStatus === 'disabled'
              ? 'Broadcast Stream Disabled'
              : muxStreamStatus === 'error'
              ? 'Stream Processing Error'
              : ['created', 'idle', 'disconnected'].includes(String(muxStreamStatus || '').toLowerCase()) || isLive
              ? 'Waiting for Live Broadcast'
              : 'Broadcast Stream Encoding in Progress'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            {muxStreamStatus === 'disabled'
              ? 'This live stream has been disabled by an administrator.'
              : muxStreamStatus === 'error'
              ? 'There was an error processing this video stream. Please check back shortly.'
              : ['created', 'idle', 'disconnected'].includes(String(muxStreamStatus || '').toLowerCase()) || isLive
              ? 'The Mux live broadcast channel is ready and waiting for the broadcaster encoder to go live. Playback will begin automatically once the stream starts.'
              : 'Your match video has been uploaded and is currently being processed by Mux for high-definition, adaptive streaming. Playback will begin automatically once processing finishes.'}
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
