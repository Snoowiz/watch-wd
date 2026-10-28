import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlayCircle, Calendar, Clock, Video, LayoutGrid, List as ListIcon, Tag, Bookmark, Search, X, Trophy, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useSettingsStore, useMatchStore, useCategoryStore, useAuthStore, useSavedMatchesStore } from '../store';
import { formatMatchStatus, isInterview, isHighlights } from '../utils/statusHelper';

export function Matches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { matches = [] } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const { currencySymbol } = useSettingsStore();
  const { savedMatches = [], saveMatch, unsaveMatch, fetchSavedMatches } = useSavedMatchesStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [selectedClub, setSelectedClub] = useState<string | 'all'>(searchParams.get('club') || 'all');
  const [selectedCompetition, setSelectedCompetition] = useState<string | 'all'>(searchParams.get('competition') || 'all');
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [competitions, setCompetitions] = useState<{ id: string; name: string; slug?: string; season?: string }[]>([]);
  const [plans, setPlans] = useState<{ id: string | number; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const clubParam = searchParams.get('club');
    if (clubParam) setSelectedClub(clubParam);
    const compParam = searchParams.get('competition');
    if (compParam) setSelectedCompetition(compParam);
  }, [searchParams]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (user) {
      fetchSavedMatches();
    }
  }, [user, fetchSavedMatches]);

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
    if (m.status === 'upcoming') return 'bg-yellow-500 text-white';
    return 'bg-slate-700 text-white';
  };

  const getAccessBadgeInfo = (m: any) => {
    if (m.access_type === 'plan' || (!m.access_type && m.access === 'paid' && Number(m.price || 0) === 0)) {
      const assignedPlan = plans.find(p => String(p.id) === String(m.required_plan_id));
      if (assignedPlan) {
        return {
          label: `Included with ${assignedPlan.name}`,
          shortLabel: 'Included with plan',
          className: 'bg-indigo-600/90 text-white',
          subClassName: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
        };
      }
      return {
        label: 'Subscription required',
        shortLabel: 'Subscription required',
        className: 'bg-indigo-600/90 text-white',
        subClassName: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
      };
    }

    if (m.access === 'paid' || m.access_type === 'ppv') {
      const priceVal = m.ppv_price || m.price;
      return {
        label: `Watch for ${currencySymbol}${priceVal}`,
        shortLabel: `${currencySymbol}${priceVal}`,
        className: 'bg-slate-900/90 text-white border border-white/10',
        subClassName: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
      };
    }

    if (user) {
      return {
        label: 'Free',
        shortLabel: 'Free',
        className: 'bg-green-600/90 text-white',
        subClassName: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
      };
    }

    return {
      label: 'Free with an account',
      shortLabel: 'Free with an account',
      className: 'bg-emerald-600/90 text-white',
      subClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    };
  };

  const filteredMatches = matches.filter(m => {
    // Only show approved or natively created matches
    if (m.publishStatus && m.publishStatus !== 'approved' && m.publishStatus !== 'published') return false;
    
    // Category filter
    if (selectedCategory !== 'all' && !(m.categories || []).some((catId: any) => Number(catId) === Number(selectedCategory))) return false;
    
    // Club filter
    if (selectedClub !== 'all') {
      const matchClub = m.club_id || (m as any).clubId;
      if (String(matchClub) !== String(selectedClub)) return false;
    }

    // Competition filter
    if (selectedCompetition !== 'all') {
      const matchComp = m.competition_id || (m as any).competitionId;
      const targetComp = competitions.find(c => String(c.id) === String(selectedCompetition) || c.slug === selectedCompetition);
      const targetId = targetComp ? targetComp.id : selectedCompetition;
      if (String(matchComp) !== String(targetId)) return false;
    }

    // Search query matching (title, description, category names, club name, competition name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = (m.title || '').toLowerCase().includes(query);
      const descMatch = (m.description || '').toLowerCase().includes(query);
      const categoryNamesMatch = (m.categories || []).some((catId: any) => {
        const cat = categories.find(c => Number(c.id) === Number(catId));
        return cat && (cat.name || '').toLowerCase().includes(query);
      });
      const clubMatch = clubs.some(c => String(c.id) === String(m.club_id) && (c.name || '').toLowerCase().includes(query));
      const compMatch = competitions.some(comp => String(comp.id) === String(m.competition_id) && (comp.name || '').toLowerCase().includes(query));
      if (!titleMatch && !descMatch && !categoryNamesMatch && !clubMatch && !compMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Browse broadcasts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Watch live and on-demand grassroots sports from around the world.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Realtime Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text"
              placeholder="Search matches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
              id="matches-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                title="Clear Search"
                id="clear-search-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Club Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
              id="filter-club-select"
            >
              <option value="all">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Competition Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
              id="filter-competition-select"
            >
              <option value="all">All Competitions</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} {comp.season ? `(${comp.season})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 self-end sm:self-auto justify-center">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-yellow-500 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              title="Grid View"
              id="grid-view-btn"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-yellow-500 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              title="List View"
              id="list-view-btn"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto pb-3 scrollbar-none -mx-4 pl-6 pr-4 md:mx-0 md:px-0 scroll-smooth snap-x">
        <button 
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start ${
            selectedCategory === 'all' 
              ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-yellow-500'
          }`}
        >
          All broadcasts
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start ${
              selectedCategory === cat.id 
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-yellow-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.slug}`} className="group block">
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                  <img 
                    src={match.thumbnail || null}
                    alt={match.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg ${getClassificationBadgeClass(match)}`}>
                      {getClassification(match)}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleToggleSave(e, match.id)}
                    className="absolute top-4 right-4 p-2 bg-slate-900/50 hover:bg-slate-900/80 rounded-full text-white backdrop-blur-sm z-10 transition-colors"
                  >
                    <Bookmark className={`w-4 h-4 ${savedMatches.includes(match.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </button>

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
                    {(() => {
                      const badge = getAccessBadgeInfo(match);
                      return (
                        <div className={`${badge.className} backdrop-blur-md text-xs font-black px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1`}>
                          {badge.label}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-slate-900/40 backdrop-blur-[2px]">
                    <div className="w-16 h-16 rotating-border-effect play-rotating-border transform scale-75 group-hover:scale-100 transition-transform duration-500 shadow-2xl">
                      <div className="play-rotating-border-inner bg-yellow-500 hover:bg-yellow-400 transition-colors">
                        <PlayCircle className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {(match.competition_id || match.club_id) && (
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {match.competition_id && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {competitions.find(c => String(c.id) === String(match.competition_id))?.name || 'Competition'}
                          </span>
                        </span>
                      )}
                      {match.club_id && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {clubs.find(c => String(c.id) === String(match.club_id))?.name || 'Club'}
                          </span>
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
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-500" />
                          {formatDateSafe(match.date, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          {formatDateSafe(match.date, 'h:mm a')}
                        </div>
                      </>
                    ) : (
                      (match as any)?.createdAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-500" />
                          <span>Published {formatDateSafe((match as any).createdAt, 'MMM d, yyyy')}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.slug}`} className="group block">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-xl hover:border-yellow-500/30 flex items-center gap-4 sm:gap-6">
                {/* Thumbnail image column, always horizontal on the left */}
                <div className="w-24 xs:w-32 sm:w-48 md:w-64 aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg sm:rounded-xl overflow-hidden shrink-0 relative">
                  <img 
                    src={match.thumbnail || null}
                    alt={match.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-slate-900/40 backdrop-blur-[2px]">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rotating-border-effect play-rotating-border transform scale-75 group-hover:scale-100 transition-transform duration-500 shadow-2xl">
                      <div className="play-rotating-border-inner bg-yellow-500 hover:bg-yellow-400 transition-colors">
                        <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleToggleSave(e, match.id)}
                    className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1 sm:p-1.5 bg-slate-900/50 hover:bg-slate-900/80 rounded-full text-white backdrop-blur-sm z-10 transition-colors"
                  >
                    <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 ${savedMatches.includes(match.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </button>
                </div>

                {/* Content columns */}
                <div className="flex-grow min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2 text-slate-100">
                      <span className={`text-[8px] sm:text-[10px] font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg uppercase tracking-widest ${getClassificationBadgeClass(match)}`}>
                        {getClassification(match)}
                      </span>
                      {(() => {
                        const badge = getAccessBadgeInfo(match);
                        return (
                          <span className={`text-[8px] sm:text-[10px] font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg uppercase tracking-wider ${badge.subClassName}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                      {match.competition_id && (
                        <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {competitions.find(c => String(c.id) === String(match.competition_id))?.name || 'Tournament'}
                          </span>
                        </span>
                      )}
                      {match.club_id && (
                        <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {clubs.find(c => String(c.id) === String(match.club_id))?.name || 'Club'}
                          </span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-xs xs:text-sm sm:text-xl md:text-2xl text-slate-900 dark:text-white mb-1 sm:mb-2 truncate sm:line-clamp-1 group-hover:text-yellow-500 transition-colors tracking-tight">
                      {match.title}
                    </h3>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-6 text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
                      {match.date ? (
                        <>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                            <span className="hidden xs:inline">{formatDateSafe(match.date, 'MMMM d, yyyy')}</span>
                            <span className="xs:hidden">{formatDateSafe(match.date, 'MMM d')}</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                            <span>{formatDateSafe(match.date, 'h:mm a')}</span>
                          </div>
                        </>
                      ) : (
                        (match as any)?.createdAt && (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                            <span>Published {formatDateSafe((match as any).createdAt, 'MMM d, yyyy')}</span>
                          </div>
                        )
                      )}
                      <div className="hidden sm:flex items-center gap-2">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                        <span>{match.categories?.length || 0} Categories</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop-only price column */}
                  {(() => {
                    const badge = getAccessBadgeInfo(match);
                    return (
                      <div className="hidden md:block text-right pr-6 shrink-0 font-black">
                        <div className="text-xl sm:text-2xl text-slate-900 dark:text-white">
                          {badge.label}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {filteredMatches.length === 0 && (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No matches found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">We couldn't find any matches matching your current filters.</p>
          <button 
            onClick={() => setSelectedCategory('all')}
            className="mt-8 text-yellow-500 font-black text-sm uppercase tracking-widest hover:text-yellow-400 transition-colors"
          >
            View All Broadcasts
          </button>
        </div>
      )}
    </div>
  );
}

