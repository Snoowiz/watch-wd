import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore, useFeatureStore, useSettingsStore, useMatchStore, usePurchaseStore, useCategoryStore, useThemeStore, useSavedMatchesStore } from '../store';
import { Lock, PlayCircle, AlertCircle, Code, CheckCircle, Calendar, Clock, Tag, Share2, Info, CreditCard, X, MessageSquare, UserPlus, UserCheck, Video as VideoIcon, Bookmark, Unlock, DollarSign, PoundSterling, Euro, Coins, Bell, BellRing } from 'lucide-react';
import { format } from 'date-fns';
import { MatchComments } from '../components/MatchComments';
import { AdOverlay } from '../components/AdOverlay';
import { AddFundsModal } from '../components/AddFundsModal';
import { requestNotificationPermission, subscribeToMatch, setupMessageListener, unsubscribeFromMatch, getNotificationPermission } from '../services/notificationService';

export function MatchDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  // ... other hooks

  useEffect(() => {
    window.scrollTo(0, 0);
    setupMessageListener();
  }, [slug]);

  const { user, updateUser } = useAuthStore();
  const { isFeatureActive } = useFeatureStore();
  const { currencySymbol } = useSettingsStore();
  const { matches, addToWatchHistory } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const { purchases = [], addPurchase, addTransaction } = usePurchaseStore();
  const { savedMatches = [], saveMatch, unsaveMatch, fetchSavedMatches } = useSavedMatchesStore();
  
  const [error, setError] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [showChatArchive, setShowChatArchive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

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

  const match = matches.find(m => m.slug === slug);
  
  const processedDescription = mobileVideoStarted && match?.description 
    ? match.description.replace(/src="([^"]+)"/g, (m, p1) => `src="${p1}${p1.includes('?') ? '&' : '?'}autoplay=1"`)
    : match?.description;

  const formatDateSafe = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'TBA';
    return format(date, formatStr);
  };
  
  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Match Not Found</h2>
        <p className="text-slate-500 mt-2 mb-6">The match you're looking for doesn't exist or has been removed.</p>
        <Link to="/matches" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Browse All Matches</Link>
      </div>
    );
  }
  
  const hasPlanAccess = match.access_type === 'plan' && !!user?.planId && (!user.planExpiresAt || new Date(user.planExpiresAt) > new Date()) && (!match.required_plan_id || String(user.planId) === String(match.required_plan_id));
  const hasAccess = !!(user ? purchases.some(p => p.matchId === match.id && p.userId === user.id && p.type === 'watch') || match.access === 'free' || hasPlanAccess : match.access === 'free');
  const hasEmbedCode = user ? purchases.some(p => p.matchId === match.id && p.userId === user.id && p.type === 'embed') : false;
  const embedCodePurchase = user ? purchases.find(p => p.matchId === match.id && p.userId === user.id && p.type === 'embed') : null;

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

  useEffect(() => {
    if (match?.status === 'upcoming' && match.date) {
      const targetDate = new Date(match.date).getTime();
      
      if (isNaN(targetDate)) {
        setTimeRemaining(null);
        return;
      }

      const updateTimer = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
          setTimeRemaining(null);
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
      };

      updateTimer();
      const intervalId = setInterval(updateTimer, 1000);
      
      return () => clearInterval(intervalId);
    } else {
      setTimeRemaining(null);
    }
  }, [match?.status, match?.date]);

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
      if (m.publishStatus && m.publishStatus !== 'approved') return false;
      
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
      const fillMatches = sortedMatches.filter(m => m.id !== match?.id && (m.publishStatus === 'approved' || !m.publishStatus) && !relatedMatches.some(rm => rm.id === m.id));
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

  if (!match) return (
    <div className="text-center py-24">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Match not found</h2>
      <Link to="/matches" className="text-yellow-500 font-bold mt-4 inline-block">Back to all matches</Link>
    </div>
  );

  const handleUnlockClick = () => {
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
    if (!user || isProcessingPurchase) return;
    
    const priceToPay = match.ppv_price || match.price;
    setCheckoutData({
      amount: priceToPay,
      type: 'watch',
      metadata: { matchId: match.id, title: match.title }
    });
    setShowConfirmModal(false);
    setShowCheckoutModal(true);
  };

  const handleBuyEmbed = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/matches/${match.slug}` } });
      return;
    }
    if (isProcessingPurchase) return;
    
    setCheckoutData({
      amount: match.embedPrice,
      type: 'embed',
      metadata: { matchId: match.id, title: match.title }
    });
    setShowCheckoutModal(true);
  };

  const renderAccessIcon = () => {
    const iconClass = "w-6 h-6 sm:w-10 sm:h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    if (match.access_type === 'plan') return <Lock className={iconClass} />;
    
    switch (currencySymbol) {
      case '£': return <PoundSterling className={iconClass} />;
      case '€': return <Euro className={iconClass} />;
      case '$': return <DollarSign className={iconClass} />;
      default: return <Coins className={iconClass} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Video Player Section */}
      <div className="-mx-4 -mt-8 sm:mx-0 sm:mt-0 bg-slate-900 sm:rounded-xl overflow-hidden shadow-2xl relative border-y sm:border border-slate-800">
        <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
          <AdOverlay match={match} />
          {hasAccess ? (
            match.description ? (
              <div 
                ref={videoContainerRef}
                className="w-full h-full absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:border-0 flex items-center justify-center bg-slate-900"
              >
                {!mobileVideoStarted && isMobile ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-slate-900" onClick={handleMobilePlay}>
                    {match.thumbnail && <img src={match.thumbnail} alt={match.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                    <PlayCircle className="w-16 h-16 text-white drop-shadow-xl z-20 hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 -z-10" dangerouslySetInnerHTML={{ __html: match.description }} style={{ opacity: 0.1, pointerEvents: 'none' }} />
                  </div>
                ) : (
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: processedDescription || '' }} />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-4 text-center">
                <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-4 sm:mb-6 text-yellow-500/50" />
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white/80 tracking-tight">Broadcast will begin shortly</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2">Scheduled for {formatDateSafe(match.date, 'MMM d, h:mm a')}</p>
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 sm:p-8 text-center overflow-y-auto">
              <Link 
                to="/" 
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/70 hover:text-white transition-colors text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg backdrop-blur-md border border-white/10 shadow-lg"
              >
                Back to Home
              </Link>
              <h2 className="text-lg sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-4 tracking-tight uppercase text-balance mt-4 sm:mt-0">
                {match.access_type === 'plan' ? 'Subscription Required' : match.access_type === 'ppv' ? 'Pay-Per-View Event' : 'Premium Content'}
              </h2>
              <p className="text-slate-400 mb-4 sm:mb-10 max-w-md text-xs sm:text-base md:text-lg leading-relaxed text-balance line-clamp-2 md:line-clamp-none">
                {match.access_type === 'plan' ? (
                  <>This match is exclusive to subscribers of our premium plans. Subscribe to unlock access and enjoy uninterrupted coverage.</>
                ) : match.access_type === 'ppv' || match.access === 'paid' ? (
                  <>This match is a Pay-Per-View event. Unlock access for <span className="text-yellow-500 font-bold">{currencySymbol}{match.ppv_price || match.price}</span> and support grassroots sports.</>
                ) : (
                  <>This match is exclusive. Unlock access for <span className="text-yellow-500 font-bold">{currencySymbol}{match.price}</span>.</>
                )}
              </p>
              <div className="flex flex-row justify-center gap-2 sm:gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleUnlockClick}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-4 py-2 sm:px-10 sm:py-4 rounded-xl transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-lg active:scale-95 flex-1 sm:flex-auto"
                >
                  <Unlock className="w-4 h-4" />
                  <span className="hidden sm:inline">{match.access_type === 'plan' ? 'View Plans' : 'Unlock Match'}</span>
                  <span className="sm:hidden">{match.access_type === 'plan' ? 'Plans' : 'Unlock'}</span>
                </button>
                {!user && (
                  <button 
                    onClick={() => navigate('/register')}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 sm:px-10 sm:py-4 rounded-xl transition-all backdrop-blur-md flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-lg border border-white/10 flex-1 sm:flex-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Join WatchWDS</span>
                    <span className="sm:hidden">Join</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Title and Meta Section */}
          <div className="flex flex-col items-start gap-2 text-left w-full">
            <div className="flex items-start justify-between gap-3 sm:gap-4 w-full">
               <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight text-left">
                 {match.title}
               </h1>
               <div className="flex items-center gap-2">
                 {match.status === 'upcoming' && (
                   <button 
                     onClick={handleToggleNotify}
                     className={`flex-shrink-0 p-3 rounded-full transition-all border ${
                       isNotified 
                         ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' 
                         : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                     }`}
                     title={isNotified ? "Turn off notifications" : "Notify me when live"}
                   >
                     {isNotified ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                   </button>
                 )}
                 <button 
                   onClick={handleToggleSave}
                   className={`flex-shrink-0 p-3 rounded-full transition-all border ${
                     isSaved 
                       ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30' 
                       : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                   }`}
                   title={isSaved ? "Remove from Watch Later" : "Save for Watch Later"}
                 >
                   <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                 </button>
               </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-start gap-3 w-full mt-2">
               <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                 match.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
               }`}>
                 {match.status}
               </span>
               <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm">
                 <Calendar className="w-3.5 h-3.5" />
                 {formatDateSafe(match.date, 'MMM d, yyyy')}
               </div>
               <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm">
                 <Clock className="w-3.5 h-3.5" />
                 {formatDateSafe(match.date, 'h:mm a')}
               </div>
               {timeRemaining && match.status === 'upcoming' && (
                 <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs sm:text-sm bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg sm:ml-auto border border-indigo-200 dark:border-indigo-500/30 transition-all">
                   <Clock className="w-3.5 h-3.5 animate-pulse" />
                   {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}
                   {timeRemaining.hours.toString().padStart(2, '0')}h : {timeRemaining.minutes.toString().padStart(2, '0')}m : {timeRemaining.seconds.toString().padStart(2, '0')}s
                 </div>
               )}
            </div>
          </div>
          
          {/* Creator Channel Block */}
          {match.creatorId && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
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
          
          {/* Collapsible Information Section */}
          <div 
             className={`bg-slate-100 dark:bg-slate-800/80 rounded-xl p-4 transition-all relative ${!isInfoExpanded ? "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" : ""}`}
             onClick={() => !isInfoExpanded && setIsInfoExpanded(true)}
          >
             <div className={`relative ${!isInfoExpanded ? "max-h-24 overflow-hidden" : ""}`}>
                <div className="flex flex-wrap gap-2 mb-3">
                  {match.categories?.map(catId => {
                    const cat = categories.find(c => c.id === catId);
                    return cat ? (
                      <Link 
                        key={catId} 
                        to={`/category/${cat.slug}`}
                        className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{cat.slug}
                      </Link>
                    ) : null;
                  })}
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <div 
                    className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{ __html: match.content || match.description || 'No description provided.' }}
                  />
                </div>
                
                {!isInfoExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-100 dark:from-slate-800/80 to-transparent flex items-end">
                  </div>
                )}
             </div>
             <button 
                className="font-bold text-slate-900 dark:text-white mt-2 text-sm hover:underline"
                onClick={(e) => { e.stopPropagation(); setIsInfoExpanded(!isInfoExpanded); }}
             >
                {isInfoExpanded ? "Show less" : "Show more"}
             </button>
          </div>

          {/* Comments Section */}
          <div className="mt-6 sm:mt-8">
            <MatchComments match={match} hasAccess={hasAccess} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 lg:self-start">
          {/* Creator Section */}
          {user && (user.role === 'creator' || user.creatorStatus === 'approved') && (
            <div className="bg-indigo-600 p-5 sm:p-8 rounded-xl shadow-xl text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Creator Tools</h3>
                  <p className="text-indigo-100 text-sm">Embed this match</p>
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
                    Get the embed code for <strong className="text-white">{currencySymbol}{match.embedPrice}</strong> to stream this match on your site.
                  </p>
                  <button 
                    onClick={handleBuyEmbed}
                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-3 rounded-xl transition-colors shadow-lg"
                  >
                    Buy Embed Code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Share Card */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-yellow-500" />
              Spread the Word
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 p-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                Twitter
              </button>
              <button className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 p-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                Facebook
              </button>
            </div>
          </div>

          {/* Related Matches Section (Sidebar) */}
          {relatedMatches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Up Next
              </h3>
              <div className="flex flex-col gap-4">
                {relatedMatches.map(m => (
                  <Link key={m.id} to={`/matches/${m.slug}`} className="group block">
                    <div className="flex gap-3 bg-white dark:bg-slate-800 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="w-40 aspect-video rounded-lg overflow-hidden relative shrink-0">
                        <img 
                          src={m.thumbnail}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 flex gap-1">
                          <div className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                            m.status === 'live' ? 'bg-red-500 text-white' : 'bg-yellow-500/90 text-slate-900'
                          }`}>
                            {m.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 py-1 pr-2 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-yellow-500 transition-colors mb-1">
                          {m.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{formatDateSafe(m.date, 'MMM d, yyyy')}</span>
                        </div>
                        {m.access === 'paid' ? (
                          <div className="mt-1 text-[10px] font-black text-yellow-500 uppercase">
                            {currencySymbol}{m.price}
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Confirm Access</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                You are about to unlock this match for <span className="text-yellow-500 font-bold">{currencySymbol}{match.ppv_price || match.price}</span>. This will be deducted from your balance.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmUnlock}
                  disabled={isProcessingPurchase}
                  className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isProcessingPurchase ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-yellow-500/20'}`}
                >
                  {isProcessingPurchase ? (
                    <><div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> Processing...</>
                  ) : (
                    'Confirm & Unlock'
                  )}
                </button>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-xl transition-all"
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
    </div>
  );
}

