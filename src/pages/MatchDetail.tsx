import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useAuthStore, useFeatureStore, useSettingsStore, useMatchStore, usePurchaseStore, useCategoryStore, useThemeStore, useSavedMatchesStore, useClubStore, useCompetitionStore } from '../store';
import { Lock, Play, PlayCircle, LogIn, AlertCircle, Code, CheckCircle, Calendar, Clock, Tag, Share2, Info, CreditCard, X, MessageSquare, UserPlus, UserCheck, Video as VideoIcon, Bookmark, Unlock, DollarSign, PoundSterling, Euro, Coins, Bell, BellRing, RefreshCw, Loader2, ShieldAlert, Shield, Sparkles, RotateCcw, Trophy, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { MatchComments } from '../components/MatchComments';
import { AdOverlay } from '../components/AdOverlay';
import { AddFundsModal } from '../components/AddFundsModal';
import { AccountGateModal } from '../components/AccountGateModal';
import { requestNotificationPermission, subscribeToMatch, setupMessageListener, unsubscribeFromMatch, getNotificationPermission } from '../services/notificationService';
import { formatStreamHtml, loadMuxPlayerIfNeeded } from '../utils/embedHelper';
import { formatMatchStatus, isInterview, isHighlights, isVideoOnlyContent, cleanEditorialDescription } from '../utils/statusHelper';
import { MatchStreamPlayer } from '../components/MatchStreamPlayer';

export function MatchDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // ... other hooks

  const { user, updateUser } = useAuthStore();
  const { isFeatureActive } = useFeatureStore();
  const { currencySymbol, walletSettings } = useSettingsStore();
  const walletEnabled = walletSettings?.enabled !== false && isFeatureActive('wallet_system');
  const { matches, addToWatchHistory, restoreMatch, fetchMatchBySlugOrId } = useMatchStore();
  const [directMatch, setDirectMatch] = useState<any>(null);
  const [isResolvingMatch, setIsResolvingMatch] = useState<boolean>(true);
  const { categories = [] } = useCategoryStore();
  const { clubs = [], fetchClubs } = useClubStore();
  const { competitions = [], fetchCompetitions } = useCompetitionStore();
  const { purchases = [], addPurchase, addTransaction, fetchPurchases } = usePurchaseStore();
  const { savedMatches = [], saveMatch, unsaveMatch, fetchSavedMatches } = useSavedMatchesStore();

  useEffect(() => {
    fetchClubs();
    fetchCompetitions();
  }, [fetchClubs, fetchCompetitions]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setupMessageListener();
    if (user) {
      fetchPurchases();
    }
  }, [slug, user, fetchPurchases]);
  
  const [error, setError] = useState('');

  const [streamData, setStreamData] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showChatArchive, setShowChatArchive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

  const handleShareCopy = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileVideoStarted, setMobileVideoStarted] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMobilePlay = async () => {
    setMobileVideoStarted(true);
    try {
      if (videoContainerRef.current?.requestFullscreen) {
        await videoContainerRef.current.requestFullscreen();
        if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
          try {
            await (window.screen.orientation as any).lock('landscape');
          } catch (e) {
            console.warn('Orientation lock not supported');
          }
        }
      }
    } catch (err) {
      console.warn('Fullscreen/Orientation lock failed');
    }
  };

  // Robust match lookup: store first, then direct fetched match
  const match = useMemo(() => {
    const cleanSlug = decodeURIComponent(slug || '').trim().toLowerCase();
    if (!cleanSlug) return null;
    const storeMatch = matches.find(m => 
      String(m.id).toLowerCase() === cleanSlug || 
      (m.slug && m.slug.toLowerCase() === cleanSlug) ||
      (m.slug && decodeURIComponent(m.slug).toLowerCase() === cleanSlug)
    );
    if (storeMatch) return storeMatch;
    if (directMatch) {
      const matchId = String(directMatch.id).toLowerCase() === cleanSlug;
      const matchSlug = directMatch.slug && directMatch.slug.toLowerCase() === cleanSlug;
      const matchDecodedSlug = directMatch.slug && decodeURIComponent(directMatch.slug).toLowerCase() === cleanSlug;
      if (matchId || matchSlug || matchDecodedSlug) {
        return directMatch;
      }
    }
    return null;
  }, [matches, slug, directMatch]);

  // Direct fetch resolution for direct link visits & page refresh
  useEffect(() => {
    let isMounted = true;
    const cleanSlug = decodeURIComponent(slug || '').trim();
    if (!cleanSlug) {
      setDirectMatch(null);
      setIsResolvingMatch(false);
      return;
    }

    const storeMatch = matches.find(m => 
      String(m.id).toLowerCase() === cleanSlug.toLowerCase() || 
      (m.slug && m.slug.toLowerCase() === cleanSlug.toLowerCase()) ||
      (m.slug && decodeURIComponent(m.slug).toLowerCase() === cleanSlug.toLowerCase())
    );

    if (storeMatch) {
      if (isMounted) {
        setDirectMatch(storeMatch);
        setIsResolvingMatch(false);
      }
      return;
    }

    // Reset directMatch if not matching current slug
    setDirectMatch(prev => {
      if (prev && (
        String(prev.id).toLowerCase() === cleanSlug.toLowerCase() ||
        (prev.slug && prev.slug.toLowerCase() === cleanSlug.toLowerCase()) ||
        (prev.slug && decodeURIComponent(prev.slug).toLowerCase() === cleanSlug.toLowerCase())
      )) {
        return prev;
      }
      return null;
    });

    setIsResolvingMatch(true);
    fetchMatchBySlugOrId(cleanSlug)
      .then(fetched => {
        if (isMounted) {
          if (fetched) {
            setDirectMatch(fetched);
          }
          setIsResolvingMatch(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsResolvingMatch(false);
      });

    return () => { isMounted = false; };
  }, [slug, matches, fetchMatchBySlugOrId]);

  // All hooks must be called before any early return to satisfy React rules-of-hooks
  const [accessDetails, setAccessDetails] = useState<{
    access_starts_at?: string | null;
    access_expires_at?: string | null;
    access_status?: string;
  } | null>(null);
  const [isAccessExpired, setIsAccessExpired] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [accessCountdown, setAccessCountdown] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  useEffect(() => {
    if (match && String(match.id) === String(slug) && match.slug) {
      navigate(`/matches/${match.slug}`, { replace: true });
    }
  }, [match, slug, navigate]);

  const formatDateSafe = (dateStr: string | undefined, formatStr: string) => {
    let effectiveDate = dateStr;
    if (!effectiveDate || effectiveDate === 'Invalid Date') {
      if (match?.status === 'completed' || match?.status === 'full_match' || match?.status === 'highlights' || (match as any)?.status === 'live') {
        effectiveDate = (match as any)?.createdAt || (match as any)?.created_at || (match as any)?.startTime || (match as any)?.start_time || new Date().toISOString();
      } else {
        return 'TBA';
      }
    }
    const date = new Date(effectiveDate);
    if (isNaN(date.getTime())) {
      if (match?.status === 'completed' || match?.status === 'full_match' || match?.status === 'highlights' || (match as any)?.status === 'live') {
        return format(new Date(), formatStr);
      }
      return 'TBA';
    }
    return format(date, formatStr);
  };
  
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPlans(d); })
      .catch(() => {});
  }, []);

  const isRevoked = match?.revoke_status === 'revoked' || match?.revoke_status === 'auto_deleted';
  const isDraft = match?.publish_status === 'draft' || match?.publish_status === 'deleted';

  const isPartnerOwner = match ? (user?.role === 'partner' && !!user?.club_id && String(match.club_id || (match as any).clubId) === String(user.club_id)) : false;
  const isAdmin = user?.role === 'admin' || user?.role === 'operator';

  const userPlan = plans.find(p => String(p.id) === String(user?.planId));
  const isPlanValid = !!user?.planId && (!user.planExpiresAt || new Date(user.planExpiresAt) > new Date());
  
  const rawMatchClubId = match?.club_id || (match as any)?.clubId;
  const matchClubId = rawMatchClubId && String(rawMatchClubId).trim() !== "" ? String(rawMatchClubId).trim() : null;

  let hasPlanAccess = false;
  if (match && match.access_type === 'plan') {
    const now = new Date();

    // 1. Check primary user.planId
    if (isPlanValid && userPlan) {
      const planMatches = !match.required_plan_id || String(user.planId) === String(match.required_plan_id);
      if (userPlan.plan_scope === 'club' && userPlan.club_id) {
        hasPlanAccess = planMatches && Boolean(matchClubId && String(matchClubId) === String(userPlan.club_id));
      } else {
        // Platform-wide plan ONLY grants access to paid matches that are NOT assigned to a partner club
        hasPlanAccess = planMatches && !matchClubId;
      }
    }

    // 2. Check active plan purchases (supports multiple club subscriptions alongside platform plan)
    if (!hasPlanAccess && user && purchases.length > 0) {
      for (const p of purchases) {
        if (p.type === 'plan' && String(p.userId) === String(user.id) && p.access_status !== 'expired' && p.access_status !== 'revoked') {
          const isNotExpired = !p.access_expires_at || new Date(p.access_expires_at) > now;
          if (isNotExpired) {
            const planId = (p as any).planId || (p as any).plan_id || p.matchId;
            const targetPlan = plans.find(pl => String(pl.id) === String(planId));
            const planMatches = !match.required_plan_id || String(planId) === String(match.required_plan_id);

            if (targetPlan) {
              const scope = targetPlan.plan_scope || 'platform';
              const rawClubId = targetPlan.club_id || (p as any).clubId || (p as any).club_id;
              const clubId = rawClubId && String(rawClubId).trim() !== "" ? String(rawClubId).trim() : null;
              if (scope === 'club' && clubId) {
                if (planMatches && matchClubId && String(matchClubId) === String(clubId)) {
                  hasPlanAccess = true;
                  break;
                }
              } else if (scope === 'platform') {
                // Platform-wide plan ONLY grants access to paid matches that are NOT assigned to a partner club
                if (planMatches && !matchClubId) {
                  hasPlanAccess = true;
                  break;
                }
              }
            } else if ((p as any).clubId || (p as any).club_id) {
              const rawClubId = (p as any).clubId || (p as any).club_id;
              const clubId = rawClubId && String(rawClubId).trim() !== "" ? String(rawClubId).trim() : null;
              if (planMatches && matchClubId && String(matchClubId) === String(clubId)) {
                hasPlanAccess = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Find user's watch purchase and verify if expired
  const watchPurchase = (user && match) ? purchases.find(p => p.matchId === match.id && p.userId === user.id && p.type === 'watch') : null;
  const isLocalExpired = Boolean(
    watchPurchase && (
      watchPurchase.access_status === 'expired' ||
      (watchPurchase.access_expires_at && new Date() > new Date(watchPurchase.access_expires_at))
    )
  );

  const hasValidPurchase = Boolean(watchPurchase && !isLocalExpired && !isAccessExpired);
  const isFree = match?.access === 'free';
  const isFreeGated = isFree && !user;
  const hasAccess = !!(match ? (user ? (hasValidPurchase || isFree || hasPlanAccess || isPartnerOwner || isAdmin) : false) : false);
  const effectiveHasAccess = hasAccess && (!isRevoked || isAdmin);
  const hasEmbedCode = (user && match) ? purchases.some(p => p.matchId === match.id && p.userId === user.id && p.type === 'embed') : false;
  const embedCodePurchase = (user && match) ? purchases.find(p => p.matchId === match.id && p.userId === user.id && p.type === 'embed') : null;

  const [showAccountGateModal, setShowAccountGateModal] = useState(false);
  const sessionIdRef = useRef<string>('');

  const sendTrackingEvent = useCallback((action: 'attempt' | 'authenticated' | 'play_start' | 'heartbeat' | 'end', extra?: { watchDuration?: number }) => {
    if (!match || !sessionIdRef.current) return;
    const token = localStorage.getItem('token');
    const playbackType = match.status === 'live' ? 'live' : 'replay';

    fetch(`/api/matches/${match.id}/view-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        action,
        playbackType,
        matchTitle: match.title,
        watchDuration: extra?.watchDuration || 0
      })
    }).catch(err => {
      console.warn('[View Tracking Error]:', err?.message);
    });
  }, [match]);

  // Persistent session tracking ID for this match (persisted in sessionStorage)
  useEffect(() => {
    if (match) {
      const storageKey = `watch_sess_${match.id}`;
      let sId = sessionStorage.getItem(storageKey);
      if (!sId) {
        sId = `mvs_${match.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(storageKey, sId);
      }
      sessionIdRef.current = sId;

      if (!user && match.access === 'free') {
        sendTrackingEvent('attempt');
      }
    }
  }, [match?.id, user, sendTrackingEvent]);

  const handleAuthGateRedirect = (target: 'login' | 'register') => {
    if (!match) return;
    sendTrackingEvent('attempt');

    sessionStorage.setItem('pending_watch_match', JSON.stringify({
      matchId: match.id,
      slug: match.slug,
      title: match.title,
      autoPlay: true,
      timestamp: Date.now()
    }));

    navigate(`/${target}`, {
      state: {
        from: location.pathname,
        matchId: match.id,
        autoPlay: true
      }
    });
  };

  const handleFreePlayClick = () => {
    if (isFreeGated) {
      sendTrackingEvent('attempt');
      setShowAccountGateModal(true);
    }
  };

  // Restore playback and mark authenticated event after successful login / registration
  useEffect(() => {
    if (user && match) {
      const pendingRaw = sessionStorage.getItem('pending_watch_match');
      const locationState = location.state as any;
      let shouldAutoPlay = Boolean(locationState?.autoPlay);

      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (String(pending.matchId) === String(match.id)) {
            shouldAutoPlay = true;
          }
        } catch (_) {}
        sessionStorage.removeItem('pending_watch_match');
      }

      if (shouldAutoPlay) {
        if (locationState?.autoPlay) {
          window.history.replaceState({}, document.title);
        }

        sendTrackingEvent('authenticated');
        sendTrackingEvent('play_start');

        if (isMobile) {
          setMobileVideoStarted(true);
        }
      }
    }
  }, [user, match?.id, location.state, isMobile, sendTrackingEvent]);

  // Periodic watch heartbeat and session end tracking
  useEffect(() => {
    if (effectiveHasAccess && streamData && user && match) {
      sendTrackingEvent('play_start');

      const interval = setInterval(() => {
        sendTrackingEvent('heartbeat', { watchDuration: 30 });
      }, 30000);

      return () => {
        clearInterval(interval);
        sendTrackingEvent('end');
      };
    }
  }, [effectiveHasAccess, Boolean(streamData), user?.id, match?.id, sendTrackingEvent]);

  useEffect(() => {
    if (match && effectiveHasAccess) {
      const token = localStorage.getItem('token');
      fetch(`/api/matches/${match.id}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
        .then(async res => {
          if (res.status === 401 || res.status === 403) {
            const data = await res.json().catch(() => null);
            if (data?.isExpired) {
              setIsAccessExpired(true);
            }
            if (data?.authRequired) {
              setShowAccountGateModal(true);
            }
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then(data => {
          if (data?.stream) {
            setStreamData(data.stream);
            if (data.accessDetails) {
              setAccessDetails(data.accessDetails);
            }
          }
        })
        .catch(err => console.error("Error fetching stream data:", err));
    } else {
      setStreamData(null);
    }
  }, [match?.id, effectiveHasAccess]);

  // Match-level event access duration window (applies to Free, Plan/Subscription, and PPV matches)
  const matchEventExpiresAt = useMemo(() => {
    if (!match?.event_access_enabled) return null;
    const durationMins = Number(match.event_access_duration) || 4320;
    const matchStart = match.start_time || match.date || (match as any).createdAt;
    if (!matchStart) return null;
    const startMs = new Date(matchStart).getTime();
    if (isNaN(startMs)) return null;
    return new Date(startMs + durationMins * 60 * 1000).toISOString();
  }, [match?.event_access_enabled, match?.event_access_duration, match?.start_time, match?.date, (match as any)?.createdAt]);

  const effectiveExpiresAt = accessDetails?.access_expires_at || watchPurchase?.access_expires_at || matchEventExpiresAt;

  // Live countdown timer for time-limited event access (Free, Plan, PPV)
  useEffect(() => {
    if (!effectiveExpiresAt) {
      setAccessCountdown('');
      return;
    }

    const updateTimer = () => {
      const diffMs = new Date(effectiveExpiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setAccessCountdown('Expired');
        setIsAccessExpired(true);
        return;
      }
      setIsUrgent(diffMs < 60 * 60 * 1000); // Under 1 hour

      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);

      if (days > 0) {
        setAccessCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setAccessCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setAccessCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [effectiveExpiresAt]);


  const handleRequestAccess = async () => {
    if (!match) return;
    setRequestLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/matches/${match.id}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        setRequestSent(true);
      }
    } catch (err) {
      console.error("Failed to request access:", err);
    } finally {
      setRequestLoading(false);
    }
  };

  const rawStreamContent = useMemo(() => {
    return (
      streamData?.embed_code ||
      streamData?.video_url ||
      streamData?.playback_id ||
      streamData?.playbackId ||
      streamData?.description ||
      match?.playback_id ||
      match?.playbackId ||
      match?.description ||
      ''
    );
  }, [
    streamData?.embed_code,
    streamData?.video_url,
    streamData?.playback_id,
    streamData?.playbackId,
    streamData?.description,
    match?.playback_id,
    match?.playbackId,
    match?.description,
  ]);

  useEffect(() => {
    if (user && hasAccess && match) {
       addToWatchHistory(user.id, match.id);
    }
  }, [user, hasAccess, match?.id]);
  
  useEffect(() => {
    if (user && match?.creatorId && user.subscribedChannels?.includes(match.creatorId)) {
       setIsSubscribed(true);
    } else {
       setIsSubscribed(false);
    }
  }, [user, match?.creatorId]);
  
  useEffect(() => {
    if (user) {
      fetchSavedMatches();
    }
  }, [user, fetchSavedMatches]);

  useEffect(() => {
    const handleFullscreenChange = async () => {
      if (document.fullscreenElement) {
        // @ts-ignore
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          try {
             // @ts-ignore
             await window.screen.orientation.lock('landscape');
          } catch (error) {
             console.warn('Orientation lock not supported in this environment');
          }
        }
      } else {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
           window.screen.orientation.unlock();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (user && match) {
      // Initialize notification state based on user's subscribed matches
      if (user.subscribedMatches && user.subscribedMatches.includes(match.id)) {
        setIsNotified(true);
      } else {
        setIsNotified(false);
      }
    }
  }, [user, match?.id]);

  const [dynamicStatus, setDynamicStatus] = useState<string>(
    match?.status === 'completed' ? 'full_match' : (match?.status || 'upcoming')
  );

  useEffect(() => {
    if (!match?.date) {
      setTimeRemaining(null);
      return;
    }

    const kickoffMs = new Date(match.date).getTime();
    if (isNaN(kickoffMs)) {
      setTimeRemaining(null);
      return;
    }

    const durationMins = match.duration || 120;
    const durationMs = durationMins * 60 * 1000;

    const updateTimer = () => {
      const nowMs = Date.now();

      if (nowMs < kickoffMs) {
        setDynamicStatus(
          match.status === 'completed' || match.status === 'full_match'
            ? 'full_match'
            : match.status === 'highlights'
            ? 'highlights'
            : 'upcoming'
        );
        const distance = kickoffMs - nowMs;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeRemaining({ days, hours, minutes, seconds });
      } else if (nowMs >= kickoffMs && nowMs < kickoffMs + durationMs) {
        setDynamicStatus(
          match.status === 'completed' || match.status === 'full_match'
            ? 'full_match'
            : match.status === 'highlights'
            ? 'highlights'
            : 'live'
        );
        const elapsed = nowMs - kickoffMs;
        const minutes = Math.floor(elapsed / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        setTimeRemaining({ days: 0, hours: 0, minutes, seconds });
      } else {
        setDynamicStatus(
          match.status === 'upcoming' || match.status === 'live'
            ? 'full_match'
            : (match.status === 'completed' ? 'full_match' : match.status)
        );
        setTimeRemaining(null);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [match?.status, match?.date, match?.duration]);

  const handleToggleNotify = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/matches/${match?.slug}` } });
      return;
    }
    
    // Request permisson silently, don't block
    if ('Notification' in window && getNotificationPermission() !== 'granted') {
       requestNotificationPermission(user.id).catch(() => {});
    }

    if (isNotified) {
      // Unsubscribe
      const success = await unsubscribeFromMatch(user.id, match!.id);
      // We assume it succeeds local for better UX or wait for success
      if (success !== false) {
        const newSubs = (user.subscribedMatches || []).filter((id: any) => String(id) !== String(match!.id));
        updateUser({ subscribedMatches: newSubs });
        setIsNotified(false);
      }
    } else {
      const success = await subscribeToMatch(user.id, match!.id);
      if (success) {
        const newSubs = Array.from(new Set([...(user.subscribedMatches || []), match!.id]));
        updateUser({ subscribedMatches: newSubs });
        setIsNotified(true);
      }
    }
  };

  const isSaved = match ? savedMatches.includes(match.id) : false;
  
  const sortedMatches = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const relatedMatches = sortedMatches
    .filter(m => {
      if (!match) return false;
      if (m.id === match.id) return false;
      if (m.publishStatus && m.publishStatus !== 'approved' && m.publishStatus !== 'published') return false;
      
      const shareCategory = m.categories?.some(c => match.categories?.includes(c));
      // Check title for basic word match
      const titleWords = match.title?.toLowerCase().split(' ').filter(w => w.length > 3) || [];
      const mTitle = m.title?.toLowerCase() || '';
      const shareTitle = titleWords.some(w => mTitle.includes(w));
      
      return shareCategory || shareTitle;
    })
    .slice(0, 4);
    
  // If we don't have enough related, fill with newest
  if (relatedMatches.length < 4) {
      const fillMatches = sortedMatches.filter(m => m.id !== match?.id && (m.publishStatus === 'approved' || m.publishStatus === 'published' || !m.publishStatus) && !relatedMatches.some(rm => rm.id === m.id));
      relatedMatches.push(...fillMatches.slice(0, 4 - relatedMatches.length));
  }

  const handleToggleSave = () => {
    if (!user) {
      navigate('/login', { state: { from: `/matches/${match?.slug}` } });
      return;
    }
    if (isSaved) {
      unsaveMatch(match!.id);
    } else {
      saveMatch(match!.id);
    }
  };

  const handleToggleSubscription = () => {
     if (!user) {
        navigate('/login', { state: { from: `/matches/${match?.slug}` } });
        return;
     }
     
     if (!match?.creatorId) return;
     
     const currentSubs = user.subscribedChannels || [];
     let newSubs;
     if (currentSubs.includes(match.creatorId)) {
        newSubs = currentSubs.filter(id => id !== match.creatorId);
     } else {
        newSubs = [...currentSubs, match.creatorId];
     }
     
     updateUser({ subscribedChannels: newSubs });
  };

  // Second match guard removed — already handled above after all hooks
  const handleUnlockClick = () => {
    if (!match) return;
    if (!user) {
      navigate('/login', { state: { from: `/matches/${match.slug}` } });
      return;
    }
    if (match.access_type === 'plan') {
      navigate('/plans', { state: { fromMatchSlug: match.slug, matchId: match.id } });
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmUnlock = async () => {
    if (!match || !user || isProcessingPurchase) return;
    
    const priceToPay = match.ppv_price || match.price;
    setCheckoutData({
      amount: priceToPay,
      type: 'watch',
      metadata: { matchId: match.id, title: match.title, matchSlug: match.slug }
    });
    setShowConfirmModal(false);
    setShowCheckoutModal(true);
  };

  const handleBuyEmbed = async () => {
    if (!match || !user) {
      navigate('/login', { state: { from: `/matches/${match?.slug}` } });
      return;
    }
    if (isProcessingPurchase) return;
    
    setCheckoutData({
      amount: match.embedPrice,
      type: 'embed',
      metadata: { matchId: match.id, title: match.title, matchSlug: match.slug }
    });
    setShowCheckoutModal(true);
  };

  const renderAccessIcon = () => {
    if (!match) return null;
    const iconClass = "w-6 h-6 sm:w-10 sm:h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    if (match.access_type === 'plan') return <Lock className={iconClass} />;
    
    switch (currencySymbol) {
      case '£': return <PoundSterling className={iconClass} />;
      case '€': return <Euro className={iconClass} />;
      case '$': return <DollarSign className={iconClass} />;
      default: return <Coins className={iconClass} />;
    }
  };

  // Safe early returns AFTER all hooks have executed unconditionally
  if (isResolvingMatch && !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-20 text-center animate-fade-in">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Loading match...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to broadcast stream</p>
      </div>
    );
  }

  if (!match || (isDraft && !isAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Match Not Found</h2>
        <p className="text-slate-500 mt-2 mb-6">The match you're looking for doesn't exist or has been removed.</p>
        <Link to="/matches" className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md">Browse All Matches</Link>
      </div>
    );
  }

  const isVideoOnly = isVideoOnlyContent(match);
  const contentTerm = isVideoOnly ? 'video' : 'match';
  const aboutHeading = isVideoOnly ? 'About this video' : 'About this match';
  const assignedClub = clubs.find(c => String(c.id) === String(matchClubId));

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-24">
      {/* 1, 2, 3: Header Section ABOVE the Video Player */}
      <div className="flex flex-col items-start gap-2.5 text-left w-full px-4 sm:px-0 pt-1 sm:pt-2">
        <div className="flex items-start justify-between gap-3 sm:gap-4 w-full">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight text-left">
            {match.title}
          </h1>
        </div>
        
        {/* Metadata row: Status, Competition, Club, Date, Time */}
        <div className="flex flex-wrap items-center justify-start gap-2.5 sm:gap-3 w-full">
          {/* Verified broadcast status badge */}
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
            dynamicStatus === 'live' ? 'bg-red-500 text-white animate-pulse' :
            dynamicStatus === 'highlights' ? 'bg-purple-600 text-white' :
            (dynamicStatus === 'full_match' || dynamicStatus === 'completed') ? 'bg-slate-700 text-white' :
            dynamicStatus === 'upcoming' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {formatMatchStatus(dynamicStatus, match.title)}
          </span>

          {/* Competition badge (verified) */}
          {(() => {
            const compId = match.competition_id || (match as any).competitionId;
            const assignedComp = competitions.find(c => String(c.id) === String(compId));
            if (!assignedComp) return null;
            return (
              <Link
                to={`/matches?competition=${encodeURIComponent(assignedComp.slug || assignedComp.id)}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors shadow-sm"
                title={`Competition: ${assignedComp.name}`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{assignedComp.name}</span>
              </Link>
            );
          })()}

          {/* Club badge */}
          {assignedClub && (
            <Link
              to={`/matches?club=${encodeURIComponent(assignedClub.id)}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors shadow-sm"
              title={`Club / Organisation: ${assignedClub.name}`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{assignedClub.name}</span>
            </Link>
          )}

          {/* Date and Time or Published date */}
          {match.date ? (
            <>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateSafe(match.date, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDateSafe(match.date, 'h:mm a')}</span>
              </div>
            </>
          ) : (match as any).createdAt ? (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm">
              <Calendar className="w-3.5 h-3.5" />
              <span>Published {formatDateSafe((match as any).createdAt, 'MMM d, yyyy')}</span>
            </div>
          ) : null}

          {/* Timers */}
          {timeRemaining && dynamicStatus === 'upcoming' && (
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs sm:text-sm bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg sm:ml-auto border border-indigo-200 dark:border-indigo-500/30 transition-all">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}
              {timeRemaining.hours.toString().padStart(2, '0')}h : {timeRemaining.minutes.toString().padStart(2, '0')}m : {timeRemaining.seconds.toString().padStart(2, '0')}s
            </div>
          )}
          {timeRemaining && dynamicStatus === 'live' && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-lg sm:ml-auto border border-red-200 dark:border-red-500/30 transition-all">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              LIVE {timeRemaining.minutes}' ({timeRemaining.seconds.toString().padStart(2, '0')}s)
            </div>
          )}
        </div>
      </div>

      {/* 4. Existing Video Player Section */}
      <div className="-mx-4 -mt-2 sm:mx-0 sm:mt-0 bg-slate-900 sm:rounded-xl overflow-hidden shadow-2xl relative border-y sm:border border-slate-800">
        <div className={`bg-black relative flex items-center justify-center overflow-hidden ${effectiveHasAccess ? 'aspect-video' : 'min-h-[280px] sm:min-h-0 aspect-auto sm:aspect-video'}`}>
          <AdOverlay match={match} />
          {effectiveHasAccess && accessCountdown && accessCountdown !== 'Expired' && (
            <div className={`absolute top-4 left-4 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg border transition-all ${
              isUrgent 
                ? 'bg-rose-500/90 text-white border-rose-400 animate-pulse shadow-rose-900/40' 
                : 'bg-slate-900/80 text-yellow-400 border-yellow-500/40 shadow-black/40'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Access expires in: <strong className="font-mono text-white ml-1">{accessCountdown}</strong></span>
            </div>
          )}
          {effectiveHasAccess ? (
            <MatchStreamPlayer
              rawStreamContent={rawStreamContent}
              title={match.title}
              thumbnail={match.thumbnail}
              matchDate={formatDateSafe(match.date, 'MMM d, h:mm a')}
              isLive={dynamicStatus === 'live' || match.status === 'live'}
              isMobile={isMobile}
              status={dynamicStatus}
              isEnded={dynamicStatus === 'completed' || dynamicStatus === 'ended'}
              isUnavailable={isRevoked}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 text-center overflow-hidden">
              {/* Preserved uploaded match poster */}
              {match.thumbnail && (
                <img 
                  src={match.thumbnail} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-[1px] pointer-events-none" 
                  referrerPolicy="no-referrer" 
                />
              )}

              {/* Short, focused locked-player message */}
              {isRevoked ? (
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto p-4 text-center z-10">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 tracking-tight">
                    Temporarily unavailable
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm">
                    Broadcast streaming paused by administrator
                  </p>
                </div>
              ) : isAccessExpired || isLocalExpired ? (
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto p-4 text-center z-10">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 tracking-tight">
                    Access expired
                  </h3>
                  <button 
                    onClick={handleUnlockClick}
                    className="mt-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Buy access for {currencySymbol}{match.ppv_price || match.price}</span>
                  </button>
                </div>
              ) : isFreeGated ? (
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto p-4 text-center z-10 animate-fade-in">
                  <button
                    onClick={handleFreePlayClick}
                    className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-2xl shadow-yellow-500/40 transition-all duration-300 hover:scale-105 active:scale-95 mb-3 cursor-pointer"
                    aria-label={`Play Free ${contentTerm}`}
                  >
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5 transition-transform group-hover:scale-110" />
                  </button>

                  <h3 className="text-base sm:text-xl font-bold text-white mb-1">
                    Watch this {contentTerm} for free
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mb-3">
                    Account required to watch
                  </p>
                  <button
                    onClick={() => handleAuthGateRedirect('login')}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in to watch</span>
                  </button>
                </div>
              ) : match.access_type === 'plan' ? (
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto p-4 text-center z-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-white mb-1">
                    {matchClubId ? 'Watch with a club subscription' : 'Watch with a subscription'}
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mb-3">
                    {matchClubId && assignedClub 
                      ? `Included with ${assignedClub.name} club subscription`
                      : 'Included with eligible subscription'}
                  </p>
                  <button 
                    onClick={handleUnlockClick}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>View eligible plans</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto p-4 text-center z-10">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-3 shadow-lg">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-white mb-1">
                    Watch this {contentTerm} for {currencySymbol}{match.ppv_price || match.price}
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mb-3">
                    One-off payment. No subscription.
                  </p>
                  <button 
                    onClick={handleUnlockClick}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Buy access for {currencySymbol}{match.ppv_price || match.price}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* 5. Access Information and Primary Action (when viewing is restricted) */}
          {!effectiveHasAccess && (
            <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-sm text-left">
              {isRevoked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <h2 className="text-lg sm:text-xl font-bold">Broadcast temporarily unavailable</h2>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    This match has been temporarily taken down by administrators. Broadcast streaming and purchases are currently paused. Any previous purchases and watch entitlements remain securely protected.
                  </p>
                </div>
              ) : isAccessExpired || isLocalExpired ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Clock className="w-5 h-5 shrink-0" />
                    <h2 className="text-lg sm:text-xl font-bold">Access expired</h2>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Your time-limited pass for this {contentTerm} has expired{watchPurchase?.access_expires_at ? ` on ${formatDateSafe(watchPurchase.access_expires_at, 'MMM d, h:mm a')}` : ''}. You can repurchase an access pass or request an extension.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button 
                      onClick={handleUnlockClick}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Buy access for {currencySymbol}{match.ppv_price || match.price}</span>
                    </button>
                    {user && (
                      <button 
                        onClick={handleRequestAccess}
                        disabled={requestLoading || requestSent}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                      >
                        {requestLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : requestSent ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Request submitted</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>Request extension</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : isFreeGated ? (
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 mb-2">
                      Free with an account
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      Watch this {contentTerm} for free
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Create a free WatchWDS account or sign in to watch.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => handleAuthGateRedirect('register')}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Create a free account</span>
                    </button>
                    <button
                      onClick={() => handleAuthGateRedirect('login')}
                      className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold px-6 py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign in</span>
                    </button>
                  </div>
                </div>
              ) : match.access_type === 'plan' ? (
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-2">
                      Subscription required
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {matchClubId ? 'Watch with a club subscription' : 'Watch with a subscription'}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {matchClubId && assignedClub 
                        ? `This broadcast is included in an eligible club subscription for ${assignedClub.name}.`
                        : 'This broadcast is included in an eligible WatchWDS subscription.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button 
                      onClick={handleUnlockClick}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>View eligible plans</span>
                    </button>
                    {!user && (
                      <button 
                        onClick={() => handleAuthGateRedirect('login')}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold px-6 py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign in</span>
                      </button>
                    )}
                    {((match.ppv_price && Number(match.ppv_price) > 0) || (match.price && Number(match.price) > 0)) && (
                      <button
                        onClick={handleUnlockClick}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 underline underline-offset-2 ml-1"
                      >
                        Or buy single {contentTerm} access for {currencySymbol}{match.ppv_price || match.price}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 mb-2">
                      Pay-per-view
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      Watch this {contentTerm} for {currencySymbol}{match.ppv_price || match.price}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      One-off payment. No subscription.
                      {match.event_access_enabled && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Includes {Math.round((Number(match.event_access_duration) || 4320) / 60)} hours of full playback access.
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button 
                      onClick={handleUnlockClick}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Buy access for {currencySymbol}{match.ppv_price || match.price}</span>
                    </button>
                    {!user && (
                      <button 
                        onClick={() => handleAuthGateRedirect('login')}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold px-6 py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign in</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Existing Save and Share Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSave}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                  isSaved
                    ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isSaved ? "Remove from Watch Later" : "Save for Watch Later"}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={handleShareCopy}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Share broadcast"
              >
                {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{isCopied ? 'Link copied' : 'Share'}</span>
              </button>
            </div>

            {match.status === 'upcoming' && (
              <button
                onClick={handleToggleNotify}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                  isNotified
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isNotified ? "Turn off notifications" : "Notify me when live"}
              >
                {isNotified ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                <span>{isNotified ? 'Notified' : 'Remind me'}</span>
              </button>
            )}
          </div>
          
          {/* Creator Channel Block */}
          {match.creatorId && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                    <VideoIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                 </div>
                 <div className="text-left">
                    <p className="text-sm font-black text-slate-900 dark:text-white">Channel {match.creatorId}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified Creator</p>
                 </div>
              </div>
              {user?.id !== match.creatorId && (
                <button 
                   onClick={handleToggleSubscription}
                   className={`px-4 py-2 flex items-center gap-2 rounded-full font-bold text-sm transition-all ${
                     isSubscribed 
                       ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600' 
                       : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90'
                   }`}
                >
                   {isSubscribed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                   {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>
          )}
          
          {/* 7. Collapsible Information Section: About this match / About this video */}
          <div 
             className={`bg-slate-100 dark:bg-slate-800/80 rounded-xl p-5 sm:p-6 transition-all relative ${!isInfoExpanded ? "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" : ""}`}
             onClick={() => !isInfoExpanded && setIsInfoExpanded(true)}
          >
             <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 text-left">
               {aboutHeading}
             </h2>

             <div className={`relative ${!isInfoExpanded ? "max-h-24 overflow-hidden" : ""}`}>
                {match.categories && match.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {match.categories.map(catId => {
                      const cat = categories.find(c => Number(c.id) === Number(catId));
                      return cat ? (
                        <Link 
                          key={catId} 
                          to={`/category/${cat.slug}`}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cat.name || cat.slug}
                        </Link>
                      ) : null;
                    })}
                  </div>
                )}
                
                <div className="prose prose-sm dark:prose-invert max-w-none break-words text-left">
                  <div 
                    className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(cleanEditorialDescription(match.content || match.description || 'No description provided.')) 
                    }}
                  />
                </div>
                
                {!isInfoExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-100 dark:from-slate-800/80 to-transparent flex items-end pointer-events-none" />
                )}
             </div>
             <button 
                className="font-bold text-slate-900 dark:text-white mt-2 text-sm hover:underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setIsInfoExpanded(!isInfoExpanded); }}
             >
                {isInfoExpanded ? "Show less" : "Show more"}
             </button>
          </div>

          {/* 8. Comments Section */}
          <div className="mt-6 sm:mt-8">
            <MatchComments match={match} hasAccess={hasAccess} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 lg:self-start">
          {/* Creator Tools Section */}
          {user && (user.role === 'creator' || user.creatorStatus === 'approved') && (
            <div className="bg-indigo-600 p-5 sm:p-8 rounded-xl shadow-xl text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Creator Tools</h3>
                  <p className="text-indigo-100 text-sm">Embed this {contentTerm}</p>
                </div>
              </div>
              
              {hasEmbedCode && embedCodePurchase ? (
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <code className="text-xs text-indigo-100 break-all font-mono">
                      {embedCodePurchase.code}
                    </code>
                  </div>
                  <p className="text-xs text-indigo-200 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Code purchased
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    Get the embed code for <strong className="text-white">{currencySymbol}{match.embedPrice}</strong> to stream this {contentTerm} on your site.
                  </p>
                  <button 
                    onClick={handleBuyEmbed}
                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-3 rounded-xl transition-colors shadow-lg cursor-pointer"
                  >
                    Buy Embed Code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Share Card (Renamed from "Spread the Word" to "Share") */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-left">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-yellow-500" />
              <span>Share</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watch ${match.title} on WatchWDS: ${window.location.href}`)}`}
                target="_blank" 
                rel="noreferrer"
                className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 p-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Twitter / X
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" 
                rel="noreferrer"
                className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 p-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Facebook
              </a>
            </div>
            <button
              onClick={handleShareCopy}
              className="w-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 p-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              <span>{isCopied ? 'Link copied to clipboard' : 'Copy link'}</span>
            </button>
          </div>

          {/* Related Broadcasts Section (Sidebar, renamed from "Up Next" to "More broadcasts") */}
          {relatedMatches.length > 0 && (
            <div className="space-y-4 text-left">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>More broadcasts</span>
              </h3>
              <div className="flex flex-col gap-3">
                {relatedMatches.map(m => (
                  <Link key={m.id} to={`/matches/${m.slug}`} className="group block">
                    <div className="flex gap-3 bg-white dark:bg-slate-800 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="w-36 aspect-video rounded-lg overflow-hidden relative shrink-0 bg-slate-900">
                        <img 
                          src={m.thumbnail}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 flex gap-1">
                          <div className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                            m.status === 'live' ? 'bg-red-500 text-white' : 'bg-yellow-500/90 text-slate-900'
                          }`}>
                            {formatMatchStatus(m.status, m.title)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 py-1 pr-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-yellow-500 transition-colors mb-1">
                          {m.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{m.date ? formatDateSafe(m.date, 'MMM d, yyyy') : 'Published'}</span>
                        </div>
                        {m.access_type === 'plan' ? (
                          <div className="mt-1 text-[10px] font-black text-indigo-500 uppercase">
                            Subscribe
                          </div>
                        ) : m.access === 'paid' ? (
                          <div className="mt-1 text-[10px] font-black text-yellow-500 uppercase">
                            {currencySymbol}{m.ppv_price || m.price}
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] font-black text-green-500 uppercase">
                            Free
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 text-left">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Info className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">Confirm Access</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                You are about to unlock this {contentTerm} for <span className="text-yellow-500 font-bold">{currencySymbol}{match.ppv_price || match.price}</span>.{walletEnabled ? ' You can pay directly or deduct from your wallet balance.' : ' Choose your payment method at checkout.'}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmUnlock}
                  disabled={isProcessingPurchase}
                  className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${isProcessingPurchase ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-yellow-500/20'}`}
                >
                  {isProcessingPurchase ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    `Buy access for ${currencySymbol}${match.ppv_price || match.price}`
                  )}
                </button>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && checkoutData && (
        <AddFundsModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          directCheckoutAmount={checkoutData.amount}
          directCheckoutType={checkoutData.type}
          directCheckoutMetadata={checkoutData.metadata}
        />
      )}

      {/* Mandatory Account Gate Modal for Free Match Viewing */}
      <AccountGateModal
        isOpen={showAccountGateModal}
        onClose={() => setShowAccountGateModal(false)}
        match={match || null}
        onLogin={() => handleAuthGateRedirect('login')}
        onRegister={() => handleAuthGateRedirect('register')}
      />
    </div>
  );
}

