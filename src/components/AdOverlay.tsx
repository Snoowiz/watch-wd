import React, { useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useAuthStore, usePurchaseStore, useAdStore, Match, Advertisement } from '../store';
import { X, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdOverlayProps {
  match: Match;
}

export function AdOverlay({ match }: AdOverlayProps) {
  const { user } = useAuthStore();
  const { purchases = [] } = usePurchaseStore();
  const { ads = [], adIntervalMinutes = 15, recordImpression, recordClick } = useAdStore();
  const navigate = useNavigate();

  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [skipTimeLeft, setSkipTimeLeft] = useState(0);
  const [adImpressionId, setAdImpressionId] = useState<number | null>(null);
  const skipTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  // Determine if user Should see Ads
  const canSeeAds = React.useMemo(() => {
    // Admins never see ads
    if (user?.role === 'admin') return false;
    
    // If they have watch purchase for this match
    if (user && purchases.some(p => p.type === 'watch' && p.matchId === match.id && p.userId === user.id)) return false;
    
    // If they have an active subscription / plan (in our simplified setup, assuming any valid sub-like purchase works, or using other criteria)
    if (user && purchases.some(p => p.type !== 'watch' && p.type !== 'embed')) return false; // Any other plan/subscription representation if it exists
    
    // They are free user
    return true;
  }, [user, purchases, match.id]);

  const serializedAdSettings = JSON.stringify(match.adSettings);
  const serializedCategories = JSON.stringify(match.categories);

  useEffect(() => {
    if (!canSeeAds || match.adSettings?.enabled === false) return;

    // Get final interval in milliseconds
    const intervalMinutes = Math.max(1, match.adSettings?.frequencyOverride || adIntervalMinutes);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Filter available ads
    let activeAds = ads.filter(a => a.status === 'active');
    
    // Apply campaign overrides if any
    if (match.adSettings?.campaignIds && match.adSettings.campaignIds.length > 0) {
      activeAds = activeAds.filter(a => match.adSettings!.campaignIds!.includes(a.id));
    } else {
      // General target verification
      activeAds = activeAds.filter(a => {
        if (a.targetAll) return true;
        if (a.targetMatches && Array.isArray(a.targetMatches) && a.targetMatches.includes(match.id)) return true;
        if (a.targetCategories && Array.isArray(a.targetCategories) && match.categories && Array.isArray(match.categories)) {
          return a.targetCategories.some(c => match.categories!.includes(c));
        }
        return false;
      });
    }

    if (activeAds.length === 0) return;

    const showRandomAd = () => {
      // Weighted random selection
      const totalWeight = activeAds.reduce((sum, a) => sum + (a.weight || 1), 0);
      let rand = Math.random() * totalWeight;
      let selectedAd = activeAds[0];
      for (const ad of activeAds) {
        if (rand < (ad.weight || 1)) {
          selectedAd = ad;
          break;
        }
        rand -= (ad.weight || 1);
      }

      setCurrentAd(selectedAd);
      setSkipTimeLeft(selectedAd.skipTimer || 0);
      const impId = Date.now();
      setAdImpressionId(impId);
      recordImpression(selectedAd.id, match.id, user?.id);
    };

    // Set loop
    intervalRef.current = window.setInterval(showRandomAd, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [canSeeAds, serializedAdSettings, serializedCategories, ads, adIntervalMinutes, match.id, user, recordImpression]);

  useEffect(() => {
    if (currentAd && skipTimeLeft > 0) {
      const timer = window.setTimeout(() => {
        setSkipTimeLeft(prev => prev - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, [currentAd, skipTimeLeft]);

  const handleClose = () => {
    setCurrentAd(null);
  };

  const handleInteract = (e: React.MouseEvent) => {
    // If clicked on close button or upgrade button, don't trigger Ad click
    if ((e.target as HTMLElement).closest('.ad-no-click')) return;
    
    if (adImpressionId && currentAd?.destinationUrl) {
      recordClick(adImpressionId);
      window.open(currentAd.destinationUrl, '_blank');
      // handleClose(); // Optional: close ad on click
    }
  };

  if (!currentAd) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Dark backdrop, no close on click to force interaction/wait */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

      <div className="relative w-[90%] max-w-2xl bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 pointer-events-auto flex flex-col max-h-[90%] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
          <span className="text-white font-semibold text-sm">Advertisement</span>
          
          <div className="flex items-center gap-3 ad-no-click">
            {skipTimeLeft > 0 ? (
              <span className="text-slate-400 text-sm font-medium">
                Skip in {skipTimeLeft}s
              </span>
            ) : (
              <button 
                onClick={handleClose}
                className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium transition"
              >
                Skip Ad <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div 
          className="flex-1 min-h-[300px] overflow-auto bg-black relative flex items-center justify-center group"
          onClick={handleInteract}
          style={{ cursor: currentAd.destinationUrl ? 'pointer' : 'default' }}
        >
          {currentAd.type === 'video' ? (
            <video 
              src={currentAd.code} 
              autoPlay 
              muted={false} // Usually ads are muted by default but let's allow controls
              controls={false}
              playsInline
              className="w-full h-full object-contain"
              onEnded={() => {
                if(skipTimeLeft === 0) handleClose();
              }}
            />
          ) : currentAd.type === 'html' || currentAd.type === 'adsense' ? (
            <div 
              className="w-full h-full p-4 flex items-center justify-center text-white [&_img]:max-w-full [&_img]:max-h-full"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAd.code, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'target', 'rel'] }) }}
            />
          ) : currentAd.type === 'embed' ? (
            <div 
              className="w-full h-full absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:border-0"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAd.code, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'target', 'rel'] }) }}
            />
          ) : (
            <div className="text-white p-4 text-center">
              Advertisement Content
            </div>
          )}

          {currentAd.destinationUrl && (
            <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
              Click to learn more
            </div>
          )}
        </div>

        {/* Upgrade CTA footer */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 border-t border-indigo-500/30 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 ad-no-click">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Enjoy ad-free viewing</h4>
              <p className="text-indigo-200 text-xs">Support creators and get uninterrupted access.</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/pricing')}
            className="w-full sm:w-auto px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg text-sm transition shadow-[0_0_15px_rgba(234,179,8,0.3)] whitespace-nowrap"
          >
            Upgrade Now
          </button>
        </div>

      </div>
    </div>
  );
}
