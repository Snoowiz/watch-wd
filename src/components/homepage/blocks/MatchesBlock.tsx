import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  PlayCircle,
  Radio,
  Trophy
} from 'lucide-react';
import {
  HomepageBlock,
  useMatchStore,
  useAuthStore,
  useSavedMatchesStore,
  useSettingsStore,
  Match
} from '../../../store';

function formatSafeDate(dateVal: any, formatStr: string): string {
  if (!dateVal || dateVal === 'Invalid Date') return 'TBA';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'TBA' : format(d, formatStr);
}

export function MatchesBlock({ block }: { block: HomepageBlock }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { matches = [] } = useMatchStore();
  const { savedMatches = [], saveMatch, unsaveMatch } = useSavedMatchesStore();
  const { currencySymbol } = useSettingsStore();
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleToggleSave = (e: React.MouseEvent, matchId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (savedMatches.includes(matchId)) {
      unsaveMatch(matchId);
    } else {
      saveMatch(matchId);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.offsetWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Filter matches based on block configuration
  let filtered = [...matches];

  // Specific status based on block type or explicit filter
  if (block.type === 'live_matches') {
    filtered = filtered.filter(m => m.status === 'live');
  } else if (block.type === 'upcoming_matches') {
    filtered = filtered.filter(m => m.status === 'upcoming');
  } else if (block.type === 'completed_matches') {
    filtered = filtered.filter(m => m.status === 'completed');
  } else if (block.filters?.status && block.filters.status.length > 0) {
    filtered = filtered.filter(m => block.filters!.status!.includes(m.status as any));
  }

  // Category filter
  if (block.filters?.categoryIds && block.filters.categoryIds.length > 0) {
    const filterCatIds = block.filters.categoryIds.map(Number);
    filtered = filtered.filter(m => {
      if (Array.isArray(m.categories) && m.categories.length > 0) {
        return m.categories.some(id => filterCatIds.includes(Number(id)));
      }
      const rawCat = (m as any).category || (m as any).categoryId;
      const matchCatId = typeof rawCat === 'object' ? rawCat?.id : rawCat;
      return matchCatId !== undefined && matchCatId !== null && filterCatIds.includes(Number(matchCatId));
    });
  }

  // Club filter
  if (block.filters?.clubIds && block.filters.clubIds.length > 0) {
    filtered = filtered.filter(m => {
      const matchClubId = (m as any).club_id || (m as any).clubId;
      return block.filters!.clubIds!.includes(String(matchClubId));
    });
  }

  // Access filter (free / paid)
  if (block.filters?.access && block.filters.access.length > 0) {
    filtered = filtered.filter(m => block.filters!.access!.includes(m.access as any));
  }

  // Sorting
  if (block.sortBy === 'popular') {
    filtered.sort((a, b) => ((b as any).views || 0) - ((a as any).views || 0));
  } else if (block.sortBy === 'most_commented') {
    filtered.sort((a, b) => ((b as any).comments_count || 0) - ((a as any).comments_count || 0));
  } else {
    // Default 'latest'
    filtered.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }

  const displayedMatches = filtered.slice(0, block.maxItems || 9);
  const layout = block.layout || 'carousel';

  return (
    <section className="space-y-8">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {block.type === 'live_matches' && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {block.title || 'Featured Broadcasts'}
            </h2>
          </div>
          {block.subtitle && (
            <p className="text-slate-500 dark:text-slate-400 font-medium">{block.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {layout === 'carousel' && displayedMatches.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/20 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/20 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {block.showViewAll !== false && (
            <Link
              to={block.viewAllUrl || '/matches'}
              className="text-yellow-500 font-black text-sm uppercase tracking-widest hidden md:flex items-center gap-2 hover:text-yellow-400 transition-colors group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {displayedMatches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-8 space-y-2">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            No matches scheduled in this category right now.
          </p>
          <Link to="/matches" className="text-xs font-black text-yellow-500 hover:underline uppercase tracking-wider inline-block">
            Browse All Available Matches →
          </Link>
        </div>
      ) : layout === 'carousel' ? (
        /* Carousel Layout */
        <div
          ref={carouselRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {displayedMatches.map(match => (
            <div key={match.id} className="flex-none w-[80vw] sm:w-[350px] md:w-[380px] snap-start">
              <MatchCard match={match} currencySymbol={currencySymbol} onToggleSave={handleToggleSave} isSaved={savedMatches.includes(match.id)} />
            </div>
          ))}
        </div>
      ) : layout === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedMatches.map(match => (
            <MatchCard key={match.id} match={match} currencySymbol={currencySymbol} onToggleSave={handleToggleSave} isSaved={savedMatches.includes(match.id)} />
          ))}
        </div>
      ) : (
        /* List Layout */
        <div className="space-y-3">
          {displayedMatches.map(match => (
            <MatchListItem key={match.id} match={match} currencySymbol={currencySymbol} onToggleSave={handleToggleSave} isSaved={savedMatches.includes(match.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

// Standalone Match Card
function MatchCard({
  match,
  currencySymbol,
  onToggleSave,
  isSaved
}: {
  match: Match;
  currencySymbol: string;
  onToggleSave: (e: React.MouseEvent, id: number) => void;
  isSaved: boolean;
}) {
  const matchUrl = `/matches/${match.slug || match.id}`;

  return (
    <Link to={matchUrl} className="group block h-full">
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-xl hover:-translate-y-1 h-full flex flex-col">
        <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative overflow-hidden shrink-0">
          <img
            src={match.thumbnail || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'}
            alt={match.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

          <button
            onClick={(e) => onToggleSave(e, match.id)}
            className="absolute top-4 right-4 p-2 bg-slate-900/50 hover:bg-slate-900/80 rounded-full text-white backdrop-blur-sm z-10 transition-colors"
            aria-label="Save match"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </button>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div
              className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${
                match.status === 'live'
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-yellow-500 text-slate-900'
              }`}
            >
              {match.status}
            </div>
            {match.access_type === 'plan' || (!match.access_type && match.access === 'paid' && Number(match.price || 0) === 0) ? (
              <div className="bg-indigo-600/90 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xl uppercase tracking-wider">
                PLAN
              </div>
            ) : match.access === 'paid' ? (
              <div className="bg-slate-900/90 backdrop-blur-md text-yellow-500 text-xs font-black px-3 py-1.5 rounded-xl border border-white/10 shadow-xl">
                {currencySymbol}{match.price}
              </div>
            ) : (
              <div className="bg-green-500/90 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xl">
                FREE
              </div>
            )}
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-slate-900/40 backdrop-blur-[2px]">
            <div className="w-16 h-16 rotating-border-effect play-rotating-border transform scale-75 group-hover:scale-100 transition-transform duration-500 shadow-2xl">
              <div className="play-rotating-border-inner bg-yellow-500 hover:bg-yellow-400 transition-colors">
                <PlayCircle className="w-8 h-8 text-slate-900" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1 justify-between">
          <h3 className="font-black text-xl text-slate-900 dark:text-white mb-3 line-clamp-1 group-hover:text-yellow-500 transition-colors tracking-tight">
            {match.title}
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-bold">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-500" />
              {formatSafeDate(match.date, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              {formatSafeDate(match.date, 'h:mm a')}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Standalone Match List Item
function MatchListItem({
  match,
  currencySymbol,
  onToggleSave,
  isSaved
}: {
  match: Match;
  currencySymbol: string;
  onToggleSave: (e: React.MouseEvent, id: number) => void;
  isSaved: boolean;
}) {
  const matchUrl = `/matches/${match.slug || match.id}`;

  return (
    <Link
      to={matchUrl}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-yellow-500/40 transition-all gap-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-24 h-16 sm:w-28 sm:h-18 rounded-lg overflow-hidden relative bg-slate-200 dark:bg-slate-700 shrink-0">
          <img
            src={match.thumbnail || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=300&q=80'}
            alt={match.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
            match.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-slate-900'
          }`}>
            {match.status}
          </div>
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors line-clamp-1">
            {match.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-1">
            <span>{formatSafeDate(match.date, 'MMM d, yyyy')}</span>
            <span>•</span>
            <span>{formatSafeDate(match.date, 'h:mm a')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center">
        {match.access_type === 'plan' || (!match.access_type && match.access === 'paid' && Number(match.price || 0) === 0) ? (
          <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wider">
            PLAN
          </span>
        ) : match.access === 'paid' ? (
          <span className="px-3 py-1 rounded-lg text-xs font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            {currencySymbol}{match.price}
          </span>
        ) : (
          <span className="px-3 py-1 rounded-lg text-xs font-black bg-green-500/10 text-green-500 border border-green-500/20">
            FREE
          </span>
        )}
        <button
          onClick={(e) => onToggleSave(e, match.id)}
          className="p-2 rounded-lg text-slate-400 hover:text-yellow-500 transition-colors"
          aria-label="Save match"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </button>
        <span className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs group-hover:bg-yellow-500 group-hover:text-slate-900 transition-colors">
          Watch
        </span>
      </div>
    </Link>
  );
}
