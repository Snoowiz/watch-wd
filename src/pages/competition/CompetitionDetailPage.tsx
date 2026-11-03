import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, ArrowLeft, Video, Calendar, Clock, PlayCircle, 
  Film, Bookmark, Building2, User
} from 'lucide-react';
import { format } from 'date-fns';
import { useMatchStore, useSettingsStore, useAuthStore, useSavedMatchesStore } from '../../store';
import { formatMatchStatus, isHighlights } from '../../utils/statusHelper';

interface CompetitionDetail {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  season?: string | null;
  description?: string | null;
  sport?: string | null;
}

export function CompetitionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [isLoadingComp, setIsLoadingComp] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'replays'>('all');

  const { matches = [], fetchMatches } = useMatchStore();
  const { currencySymbol } = useSettingsStore();
  const { user } = useAuthStore();
  const { savedMatches = [], saveMatch, unsaveMatch } = useSavedMatchesStore();

  useEffect(() => {
    fetchMatches();
    if (!slug) return;

    setIsLoadingComp(true);
    fetch(`/api/competitions/${encodeURIComponent(slug)}`)
      .then(res => {
        if (!res.ok) throw new Error('Competition not found');
        return res.json();
      })
      .then(data => setCompetition(data))
      .catch(() => {
        // Fallback: try active competitions list
        fetch('/api/competitions/active')
          .then(res => res.json())
          .then(list => {
            if (Array.isArray(list)) {
              const found = list.find((c: any) => c.slug === slug || String(c.id) === slug);
              if (found) setCompetition(found);
            }
          })
          .catch(() => {});
      })
      .finally(() => setIsLoadingComp(false));
  }, [slug, fetchMatches]);

  const compMatches = useMemo(() => {
    if (!competition) return [];
    return matches.filter(m => {
      if (m.publish_status === 'draft' || m.publishStatus === 'draft') return false;
      const matchCompId = m.competition_id || (m as any).competitionId;
      if (String(matchCompId) !== String(competition.id)) return false;

      if (activeTab === 'live') {
        return m.status === 'live';
      } else if (activeTab === 'upcoming') {
        return m.status === 'upcoming';
      } else if (activeTab === 'replays') {
        return m.status === 'completed' || m.status === 'full_match' || m.status === 'highlights' || isHighlights(m);
      }
      return true;
    });
  }, [matches, competition, activeTab]);

  const formatDateSafe = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr || dateStr === 'Invalid Date') return 'TBA';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'TBA';
    return format(date, formatStr);
  };

  const getClassificationBadgeClass = (m: any) => {
    if (m.status === 'live') return 'bg-red-500 text-white animate-pulse';
    if (m.status === 'upcoming') return 'bg-amber-500 text-white';
    return 'bg-slate-700 text-white';
  };

  const handleToggleSave = (e: React.MouseEvent, matchId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (savedMatches.includes(matchId)) {
      unsaveMatch(matchId);
    } else {
      saveMatch(matchId);
    }
  };

  const isTennis = (competition?.sport || '').toLowerCase() === 'tennis';

  if (isLoadingComp) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Trophy className="w-10 h-10 animate-bounce text-yellow-500 mb-3" />
        <p className="text-sm font-bold">Loading competition details...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="py-24 text-center bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-8">
        <Trophy className="w-14 h-14 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Competition not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The requested tournament or competition does not exist or is currently inactive.
        </p>
        <Link
          to="/competition"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-md transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all competitions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Link
          to="/competition"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-yellow-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competitions
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-8 sm:p-10 border border-slate-700/60 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-yellow-500/10 to-transparent pointer-events-none opacity-50"></div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-3 flex items-center justify-center shrink-0 shadow-2xl text-yellow-400">
            {competition.logo ? (
              <img
                src={competition.logo}
                alt={competition.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Trophy className="w-12 h-12" />
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-400 bg-yellow-400/15 border border-yellow-400/20 px-2.5 py-0.5 rounded-full">
                <Trophy className="w-3.5 h-3.5" />
                {isTennis ? 'Tennis Tournament' : 'Official Competition'}
              </span>
              {competition.season && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  <Calendar className="w-3 h-3 text-yellow-400" />
                  Season {competition.season}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{competition.name}</h1>
            <p className="text-slate-300 text-sm mt-2 max-w-2xl">
              {competition.description || 'Watch tournament fixtures, live broadcasts, and on-demand replay coverage.'}
            </p>
          </div>
        </div>
      </div>

      {/* Viewing Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All broadcasts ({compMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'live'
              ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-red-500'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Live now
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-500" />
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('replays')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'replays'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Film className="w-4 h-4 text-purple-500" />
          Replays
        </button>
      </div>

      {/* Events Grid */}
      {compMatches.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-8">
          <Video className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No broadcasts scheduled</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'all'
              ? `${competition.name} does not have any active broadcasts right now.`
              : `No ${activeTab} broadcasts found for ${competition.name}.`}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {compMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.slug}`} className="group block">
              <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700/60 transition-all hover:shadow-2xl hover:-translate-y-1.5">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                  <img
                    src={match.thumbnail || undefined}
                    alt={match.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>

                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg ${getClassificationBadgeClass(match)}`}>
                      {formatMatchStatus(match.status, match.title)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleToggleSave(e, match.id)}
                    className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900/90 rounded-full text-white backdrop-blur-sm z-10 transition-colors"
                  >
                    <Bookmark className={`w-4 h-4 ${savedMatches.includes(match.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </button>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-950/40 backdrop-blur-[2px]">
                    <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center text-slate-950 shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                      <PlayCircle className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-black text-xl text-slate-900 dark:text-white mb-3 line-clamp-1 group-hover:text-yellow-500 transition-colors tracking-tight">
                    {match.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-bold">
                    {match.date ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-yellow-500" />
                          {formatDateSafe(match.date, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          {formatDateSafe(match.date, 'h:mm a')}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
