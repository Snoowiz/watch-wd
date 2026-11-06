import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Search, Video, ArrowRight, Sparkles, X, Calendar, Layers } from 'lucide-react';
import { useMatchStore, useCompetitionStore, useSportStore, DEFAULT_PLATFORM_SPORTS, DEFAULT_PLATFORM_COMPETITIONS, Competition } from '../../store';

export function CompetitionsPage() {
  const { 
    competitions: storeCompetitions, 
    activeCompetitions, 
    fetchCompetitions, 
    fetchActiveCompetitions 
  } = useCompetitionStore();
  
  const { sports: storeSports, fetchSports } = useSportStore();
  const effectiveSports = storeSports.length > 0 ? storeSports : DEFAULT_PLATFORM_SPORTS;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { matches = [], fetchMatches } = useMatchStore();

  useEffect(() => {
    fetchMatches();
    fetchCompetitions();
    fetchActiveCompetitions();
    fetchSports();
  }, [fetchMatches, fetchCompetitions, fetchActiveCompetitions, fetchSports]);

  // Combine and deduplicate active competitions with resilient fallbacks
  const allAvailableCompetitions = useMemo(() => {
    const primary = activeCompetitions.length > 0 
      ? activeCompetitions 
      : storeCompetitions.length > 0 
      ? storeCompetitions 
      : DEFAULT_PLATFORM_COMPETITIONS;

    // Filter active items (or default active)
    const list = primary.filter(c => c.is_active === 1 || c.is_active === true || c.is_active === undefined);
    return list.length > 0 ? list : DEFAULT_PLATFORM_COMPETITIONS;
  }, [activeCompetitions, storeCompetitions]);

  // Compute how many active published matches each competition has
  const compMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matches.forEach(m => {
      if (m.publish_status === 'draft' || m.publishStatus === 'draft') return;
      if (m.competition_id) {
        counts[String(m.competition_id)] = (counts[String(m.competition_id)] || 0) + 1;
      }
    });
    return counts;
  }, [matches]);

  // Filter by search query
  const searchedCompetitions = useMemo(() => {
    if (!searchQuery.trim()) return allAvailableCompetitions;
    const q = searchQuery.toLowerCase();
    return allAvailableCompetitions.filter(comp => {
      const nameMatch = (comp.name || '').toLowerCase().includes(q);
      const seasonMatch = (comp.season || '').toLowerCase().includes(q);
      const descMatch = (comp.description || '').toLowerCase().includes(q);
      const sportMatch = (comp.sport || '').toLowerCase().includes(q);
      return nameMatch || seasonMatch || descMatch || sportMatch;
    });
  }, [allAvailableCompetitions, searchQuery]);

  // Group competitions by sport discipline
  const groupedBySport = useMemo(() => {
    const groups: { sportKey: string; sportName: string; competitions: Competition[] }[] = [];

    // Order by effectiveSports
    effectiveSports.forEach(sp => {
      const spKey = (sp.slug || sp.id).toLowerCase();
      const comps = searchedCompetitions.filter(c => {
        const cSport = (c.sport || 'football').toLowerCase();
        return cSport === spKey;
      });
      if (comps.length > 0) {
        groups.push({
          sportKey: spKey,
          sportName: sp.name,
          competitions: comps
        });
      }
    });

    // Capture any competition with sport not in effectiveSports
    const otherComps = searchedCompetitions.filter(c => {
      const cSport = (c.sport || 'football').toLowerCase();
      return !effectiveSports.some(sp => (sp.slug || sp.id).toLowerCase() === cSport);
    });
    if (otherComps.length > 0) {
      groups.push({
        sportKey: 'other',
        sportName: 'Other Tournaments',
        competitions: otherComps
      });
    }

    return groups;
  }, [effectiveSports, searchedCompetitions]);

  // When a sport tab is selected
  const activeTabCompetitions = useMemo(() => {
    if (selectedSport === 'all') return searchedCompetitions;
    return searchedCompetitions.filter(c => (c.sport || 'football').toLowerCase() === selectedSport.toLowerCase());
  }, [searchedCompetitions, selectedSport]);

  const getSportBadgeInfo = (sportStr?: string | null) => {
    const s = (sportStr || 'football').toLowerCase();
    if (s === 'tennis') {
      return { 
        label: 'Tennis Tournament', 
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
      };
    }
    if (s === 'basketball') {
      return { 
        label: 'Basketball League', 
        className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' 
      };
    }
    if (s === 'boxing') {
      return { 
        label: 'Boxing & MMA Series', 
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
      };
    }
    return { 
      label: 'Football Competition', 
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
    };
  };

  const renderCard = (comp: Competition) => {
    const badge = getSportBadgeInfo(comp.sport);
    const matchCount = comp.match_count !== undefined && Number(comp.match_count) > 0 
      ? Number(comp.match_count) 
      : (compMatchCounts[String(comp.id)] || 0);

    return (
      <Link
        key={comp.id}
        to={`/competition/${comp.slug || comp.id}`}
        className="group block bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm hover:shadow-2xl hover:border-yellow-500/40 transition-all hover:-translate-y-1.5 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 p-2 flex items-center justify-center shrink-0 overflow-hidden border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 shadow-inner">
              {comp.logo ? (
                <img
                  src={comp.logo}
                  alt={comp.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Trophy className="w-8 h-8" />
              )}
            </div>
            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight group-hover:text-yellow-500 transition-colors line-clamp-1 mb-1.5">
            {comp.name}
          </h3>
          {comp.season && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-500" />
              <span>Season {comp.season}</span>
            </div>
          )}
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {comp.description || 'Watch all tournament fixtures, live streams, and match broadcasts streaming on WatchWDS.'}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Video className="w-4 h-4 text-yellow-500" />
            <span>{matchCount} {matchCount === 1 ? 'event' : 'events'}</span>
          </div>
          <span className="inline-flex items-center gap-1 font-bold text-yellow-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform">
            View events <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-yellow-500 uppercase tracking-widest mb-2">
            <Trophy className="w-4 h-4" />
            <span>Tournaments & Leagues</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Competitions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl text-sm sm:text-base">
            Browse official tournaments, leagues, and cups across football, tennis, basketball, and boxing streaming on WatchWDS.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search competitions or season..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sport Filter Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-2">
        <button
          onClick={() => setSelectedSport('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap flex items-center gap-2 ${
            selectedSport === 'all'
              ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 scale-105'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-yellow-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          All Sports ({allAvailableCompetitions.length})
        </button>

        {effectiveSports.map(sp => {
          const spKey = (sp.slug || sp.id).toLowerCase();
          const count = allAvailableCompetitions.filter(c => (c.sport || 'football').toLowerCase() === spKey).length;
          const isSelected = selectedSport === spKey;

          return (
            <button
              key={sp.id}
              onClick={() => setSelectedSport(spKey)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 scale-105'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-yellow-500'
              }`}
            >
              {sp.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Content View */}
      {searchedCompetitions.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-8">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No competitions found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {searchQuery 
              ? `No competitions matched "${searchQuery}".`
              : 'No competitions or tournaments currently listed in this category.'}
          </p>
          {(searchQuery || selectedSport !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSport('all');
              }}
              className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-md transition-all text-sm"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : selectedSport === 'all' && !searchQuery.trim() ? (
        /* Grouped View by Sport when viewing all competitions */
        <div className="space-y-12">
          {groupedBySport.map(group => (
            <div key={group.sportKey} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {group.sportName}
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold">
                      {group.competitions.length} {group.competitions.length === 1 ? 'tournament & league' : 'tournaments & leagues'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSport(group.sportKey)}
                  className="text-xs font-black text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 flex items-center gap-1.5 transition-colors group"
                >
                  View all {group.sportName} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.competitions.map(comp => renderCard(comp))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat Grid View when filtering by a specific sport or searching */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {searchQuery ? `Search Results (${activeTabCompetitions.length})` : `${effectiveSports.find(s => (s.slug || s.id).toLowerCase() === selectedSport)?.name || 'Sport'} Competitions (${activeTabCompetitions.length})`}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTabCompetitions.map(comp => renderCard(comp))}
          </div>
        </div>
      )}
    </div>
  );
}
