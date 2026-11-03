import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  PlayCircle, Calendar, Clock, LayoutGrid, List as ListIcon, 
  Bookmark, Search, X, Trophy, Building2, User, Filter, RotateCcw, 
  Radio, Film, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useSettingsStore, useMatchStore, useCategoryStore, useAuthStore, 
  useSavedMatchesStore, useCompetitionStore, useClubStore 
} from '../store';
import { formatMatchStatus, isInterview, isHighlights } from '../utils/statusHelper';
import { CONFIGURED_SPORTS, getSportConfig, SportId } from '../config/sports';

export function Matches() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { matches = [], fetchMatches } = useMatchStore();
  const { categories = [], fetchCategories } = useCategoryStore();
  const { currencySymbol } = useSettingsStore();
  const { savedMatches = [], saveMatch, unsaveMatch, fetchSavedMatches } = useSavedMatchesStore();

  const [clubs, setClubs] = useState<{ id: string; name: string; slug?: string }[]>([]);
  const [competitions, setCompetitions] = useState<{ id: string; name: string; slug?: string; season?: string; sport?: string | null }[]>([]);
  const [plans, setPlans] = useState<{ id: string | number; name: string }[]>([]);

  // 1. URL-driven filter states
  const sportParam = searchParams.get('sport') || 'all';
  const tabParam = (searchParams.get('tab') || 'all') as 'all' | 'live' | 'upcoming' | 'replays';
  const clubParam = searchParams.get('club') || 'all';
  const compParam = searchParams.get('competition') || 'all';
  const playerParam = searchParams.get('player') || '';
  const searchParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const viewParam = (searchParams.get('view') || 'grid') as 'grid' | 'list';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(viewParam);

  // Sync viewParam with state
  useEffect(() => {
    if (viewParam && (viewParam === 'grid' || viewParam === 'list')) {
      setViewMode(viewParam);
    }
  }, [viewParam]);

  // Ensure catalog data is loaded
  useEffect(() => {
    fetchMatches();
    fetchCategories();

    fetch('/api/clubs/active')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setClubs(data); })
      .catch(() => {});

    fetch('/api/competitions/active')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCompetitions(data); })
      .catch(() => {});

    fetch('/api/plans')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => {});
  }, [fetchMatches, fetchCategories]);

  useEffect(() => {
    if (user) {
      fetchSavedMatches();
    }
  }, [user, fetchSavedMatches]);

  // Helper to update query params while preserving others
  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all' || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const handleSportChange = (newSport: string) => {
    if (newSport === sportParam) return;
    
    // Clear incompatible filters when changing sport
    const updates: Record<string, string | null> = {
      sport: newSport === 'all' ? null : newSport,
    };

    if (newSport === 'tennis') {
      // Tennis does not use football clubs
      updates.club = null;
    } else if (newSport === 'football') {
      // Football does not use tennis player searches
      updates.player = null;
    }

    updateFilters(updates);
  };

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

  const formatDateSafe = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr || dateStr === 'Invalid Date') return 'TBA';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'TBA';
    return format(date, formatStr);
  };

  const getClassification = (m: any) => {
    if (isInterview(m)) return 'Interview';
    if (isHighlights(m)) return 'Highlights';
    if (m.status === 'live') return 'Live Now';
    if (m.status === 'upcoming') return 'Upcoming';
    return formatMatchStatus(m.status, m.title);
  };

  const getClassificationBadgeClass = (m: any) => {
    if (isInterview(m)) return 'bg-sky-600 text-white';
    if (isHighlights(m)) return 'bg-purple-600 text-white';
    if (m.status === 'live') return 'bg-red-500 text-white animate-pulse';
    if (m.status === 'upcoming') return 'bg-amber-500 text-white';
    return 'bg-slate-700 text-white';
  };

  const getSportBadge = (m: any) => {
    const sportKey = (m.sport || '').toLowerCase();
    if (sportKey === 'tennis') {
      return { label: 'Tennis', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
    if (sportKey === 'football') {
      return { label: 'Football', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
    if (sportKey === 'basketball') {
      return { label: 'Basketball', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
    }
    return null;
  };

  const getAccessBadgeInfo = (m: any) => {
    if (m.access_type === 'plan' || (!m.access_type && m.access === 'paid' && Number(m.price || 0) === 0)) {
      const assignedPlan = plans.find(p => String(p.id) === String(m.required_plan_id));
      if (assignedPlan) {
        return {
          label: `Included with ${assignedPlan.name}`,
          shortLabel: 'Included with plan',
          className: 'bg-indigo-600/90 text-white',
        };
      }
      return {
        label: 'Subscription required',
        shortLabel: 'Subscription required',
        className: 'bg-indigo-600/90 text-white',
      };
    }

    if (m.access === 'paid' || m.access_type === 'ppv') {
      const priceVal = m.ppv_price || m.price;
      return {
        label: `Watch for ${currencySymbol}${priceVal}`,
        shortLabel: `${currencySymbol}${priceVal}`,
        className: 'bg-slate-900/90 text-white border border-white/10',
      };
    }

    if (user) {
      return {
        label: 'Free',
        shortLabel: 'Free',
        className: 'bg-green-600/90 text-white',
      };
    }

    return {
      label: 'Free with an account',
      shortLabel: 'Free with an account',
      className: 'bg-emerald-600/90 text-white',
    };
  };

  // Filtered list
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // 1. Publication status: exclude drafts
      if (m.publish_status === 'draft' || m.publishStatus === 'draft') return false;
      if (m.publishStatus && m.publishStatus !== 'approved' && m.publishStatus !== 'published') return false;

      // 2. Sport filter
      if (sportParam !== 'all') {
        const matchSport = (m.sport || '').toLowerCase();
        if (matchSport) {
          if (matchSport !== sportParam) return false;
        } else {
          // Fallback legacy match classification by category if sport is not explicitly set
          const targetCategory = categories.find(c => (c.slug || '').toLowerCase() === sportParam);
          if (targetCategory) {
            const hasCat = (m.categories || []).some((cId: any) => Number(cId) === Number(targetCategory.id));
            if (!hasCat) return false;
          } else {
            return false;
          }
        }
      }

      // 3. Status tab filter (Live now / Upcoming / Replays)
      if (tabParam === 'live') {
        if (m.status !== 'live') return false;
      } else if (tabParam === 'upcoming') {
        if (m.status !== 'upcoming') return false;
      } else if (tabParam === 'replays') {
        const isReplay = m.status === 'completed' || m.status === 'full_match' || m.status === 'highlights' || isHighlights(m);
        if (!isReplay) return false;
      }

      // 4. Club filter (mainly Football / All)
      if (clubParam !== 'all') {
        const matchClub = m.club_id || (m as any).clubId;
        if (String(matchClub) !== String(clubParam)) return false;
      }

      // 5. Competition filter
      if (compParam !== 'all') {
        const matchComp = m.competition_id || (m as any).competitionId;
        const targetComp = competitions.find(c => String(c.id) === String(compParam) || c.slug === compParam);
        const targetId = targetComp ? targetComp.id : compParam;
        if (String(matchComp) !== String(targetId)) return false;
      }

      // 6. Tennis Player filter
      if (playerParam.trim()) {
        const qp = playerParam.toLowerCase();
        const p1 = (m.player_pair_1 || (m as any).playerPair1 || '').toLowerCase();
        const p2 = (m.player_pair_2 || (m as any).playerPair2 || '').toLowerCase();
        const title = (m.title || '').toLowerCase();
        if (!p1.includes(qp) && !p2.includes(qp) && !title.includes(qp)) return false;
      }

      // 7. Content Category filter
      if (categoryParam !== 'all') {
        if (!(m.categories || []).some((catId: any) => Number(catId) === Number(categoryParam))) return false;
      }

      // 8. General search query
      if (searchParam.trim()) {
        const q = searchParam.toLowerCase();
        const titleMatch = (m.title || '').toLowerCase().includes(q);
        const descMatch = (m.description || '').toLowerCase().includes(q);
        const homeMatch = (m.home_team || (m as any).homeTeam || '').toLowerCase().includes(q);
        const awayMatch = (m.away_team || (m as any).awayTeam || '').toLowerCase().includes(q);
        const p1Match = (m.player_pair_1 || (m as any).playerPair1 || '').toLowerCase().includes(q);
        const p2Match = (m.player_pair_2 || (m as any).playerPair2 || '').toLowerCase().includes(q);
        const clubMatch = clubs.some(c => String(c.id) === String(m.club_id) && (c.name || '').toLowerCase().includes(q));
        const compMatch = competitions.some(comp => String(comp.id) === String(m.competition_id) && (comp.name || '').toLowerCase().includes(q));
        
        if (!titleMatch && !descMatch && !homeMatch && !awayMatch && !p1Match && !p2Match && !clubMatch && !compMatch) {
          return false;
        }
      }

      return true;
    });
  }, [matches, sportParam, tabParam, clubParam, compParam, playerParam, categoryParam, searchParam, categories, clubs, competitions]);

  const hasActiveFilters = sportParam !== 'all' || tabParam !== 'all' || clubParam !== 'all' || compParam !== 'all' || playerParam !== '' || searchParam !== '' || categoryParam !== 'all';

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Filter competitions matching selected sport (if selected)
  const availableCompetitions = useMemo(() => {
    if (sportParam === 'all') return competitions;
    return competitions.filter(c => !c.sport || c.sport.toLowerCase() === sportParam);
  }, [competitions, sportParam]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">All events</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Watch live and on-demand sports from around the world.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Realtime Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text"
              placeholder="Search events, teams, players..."
              value={searchParam}
              onChange={(e) => updateFilters({ q: e.target.value })}
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
              id="matches-search-input"
            />
            {searchParam && (
              <button 
                onClick={() => updateFilters({ q: null })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                title="Clear Search"
                id="clear-search-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 self-end sm:self-auto justify-center">
            <button 
              onClick={() => { setViewMode('grid'); updateFilters({ view: 'grid' }); }}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-yellow-500 shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              title="Grid View"
              id="grid-view-btn"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setViewMode('list'); updateFilters({ view: 'list' }); }}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-yellow-500 shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              title="List View"
              id="list-view-btn"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Sport Selector Bar */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none p-1">
          <button
            onClick={() => handleSportChange('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              sportParam === 'all'
                ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
            id="sport-tab-all"
          >
            <Sparkles className="w-4 h-4" />
            All sports
          </button>

          {CONFIGURED_SPORTS.map(sport => {
            const isSelected = sportParam === sport.id;
            if (!sport.available) {
              return (
                <button
                  key={sport.id}
                  disabled
                  title={sport.unavailableReason || 'Coming soon'}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/40 cursor-not-allowed opacity-60 flex items-center gap-2 whitespace-nowrap"
                  id={`sport-tab-${sport.id}`}
                >
                  <span>{sport.name}</span>
                  <span className="text-[10px] uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold">
                    Coming soon
                  </span>
                </button>
              );
            }

            return (
              <button
                key={sport.id}
                onClick={() => handleSportChange(sport.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
                id={`sport-tab-${sport.id}`}
              >
                <span>{sport.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Viewing Tabs: All, Live Now, Upcoming, Replays */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => updateFilters({ tab: 'all' })}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tabParam === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All broadcasts
          </button>
          <button
            onClick={() => updateFilters({ tab: 'live' })}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              tabParam === 'live'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-red-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Live now
          </button>
          <button
            onClick={() => updateFilters({ tab: 'upcoming' })}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              tabParam === 'upcoming'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            Upcoming
          </button>
          <button
            onClick={() => updateFilters({ tab: 'replays' })}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              tabParam === 'replays'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Film className="w-4 h-4 text-purple-500" />
            Replays
          </button>
        </div>

        {/* Sport-Specific Dynamic Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Football / All Sports: Club Filter */}
          {sportParam !== 'tennis' && (
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={clubParam}
                onChange={(e) => updateFilters({ club: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
                id="filter-club-select"
              >
                <option value="all">All Clubs</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Competition / Tournament Filter */}
          <div className="relative min-w-[150px] flex-1 sm:flex-initial">
            <select
              value={compParam}
              onChange={(e) => updateFilters({ competition: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
              id="filter-competition-select"
            >
              <option value="all">
                {sportParam === 'tennis' ? 'All Tournaments' : 'All Competitions'}
              </option>
              {availableCompetitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} {comp.season ? `(${comp.season})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tennis Player Search Filter */}
          {sportParam === 'tennis' && (
            <div className="relative min-w-[150px] flex-1 sm:flex-initial">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by player..."
                value={playerParam}
                onChange={(e) => updateFilters({ player: e.target.value })}
                className="w-full pl-8 pr-7 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
                id="filter-tennis-player"
              />
              {playerParam && (
                <button
                  onClick={() => updateFilters({ player: null })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid or List View */}
      {filteredMatches.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-8">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No events match your criteria</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            We couldn't find any events matching your selected sport, status, or filters. Try adjusting your search or clearing active filters.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-md transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset all filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMatches.map(match => {
            const sportBadge = getSportBadge(match);
            const accessBadge = getAccessBadgeInfo(match);
            const comp = competitions.find(c => String(c.id) === String(match.competition_id));
            const club = clubs.find(c => String(c.id) === String(match.club_id));

            return (
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
                    
                    {/* Top status badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center">
                      <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg ${getClassificationBadgeClass(match)}`}>
                        {getClassification(match)}
                      </div>
                      {sportBadge && (
                        <div className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md border ${sportBadge.className}`}>
                          {sportBadge.label}
                        </div>
                      )}
                    </div>

                    {/* Bookmark action */}
                    <button 
                      onClick={(e) => handleToggleSave(e, match.id)}
                      className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900/90 rounded-full text-white backdrop-blur-sm z-10 transition-colors"
                      title={savedMatches.includes(match.id) ? 'Remove bookmark' : 'Save match'}
                    >
                      <Bookmark className={`w-4 h-4 ${savedMatches.includes(match.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>

                    {/* Bottom overlay: Categories & Access badge */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <div className="flex flex-wrap gap-1 max-w-[55%]">
                        {((match.categories || []) as number[]).slice(0, 2).map(catId => {
                          const cat = categories.find(c => Number(c.id) === Number(catId));
                          return cat ? (
                            <span key={catId} className="bg-white/10 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                              {cat.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <div className={`${accessBadge.className} backdrop-blur-md text-xs font-black px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1`}>
                        {accessBadge.label}
                      </div>
                    </div>

                    {/* Hover play button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-950/40 backdrop-blur-[2px]">
                      <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center text-slate-950 shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                        <PlayCircle className="w-8 h-8" />
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6">
                    {(comp || club) && (
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        {comp && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                            <Trophy className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{comp.name}</span>
                          </span>
                        )}
                        {club && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{club.name}</span>
                          </span>
                        )}
                      </div>
                    )}

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
                      ) : (
                        (match as any)?.createdAt && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-yellow-500" />
                            <span>Published {formatDateSafe((match as any).createdAt, 'MMM d, yyyy')}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredMatches.map(match => {
            const sportBadge = getSportBadge(match);
            const accessBadge = getAccessBadgeInfo(match);
            const comp = competitions.find(c => String(c.id) === String(match.competition_id));
            const club = clubs.find(c => String(c.id) === String(match.club_id));

            return (
              <Link key={match.id} to={`/matches/${match.slug}`} className="group block">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-700/60 transition-all hover:shadow-xl hover:border-yellow-500/30 flex items-center gap-4 sm:gap-6">
                  {/* Thumbnail */}
                  <div className="w-28 xs:w-36 sm:w-52 aspect-video bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden shrink-0 relative">
                    <img 
                      src={match.thumbnail || undefined}
                      alt={match.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/20"></div>
                    <div className="absolute top-2 left-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${getClassificationBadgeClass(match)}`}>
                        {getClassification(match)}
                      </span>
                    </div>
                  </div>

                  {/* Information Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {sportBadge && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${sportBadge.className}`}>
                          {sportBadge.label}
                        </span>
                      )}
                      {comp && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{comp.name}</span>
                        </span>
                      )}
                      {club && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{club.name}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white truncate group-hover:text-yellow-500 transition-colors">
                      {match.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">
                      {match.date ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                            {formatDateSafe(match.date, 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-yellow-500" />
                            {formatDateSafe(match.date, 'h:mm a')}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0 flex items-center gap-3">
                    <div className={`hidden sm:block ${accessBadge.className} text-xs font-black px-3 py-1.5 rounded-xl shadow-sm`}>
                      {accessBadge.label}
                    </div>
                    <button
                      onClick={(e) => handleToggleSave(e, match.id)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={savedMatches.includes(match.id) ? 'Remove bookmark' : 'Save match'}
                    >
                      <Bookmark className={`w-4 h-4 ${savedMatches.includes(match.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
