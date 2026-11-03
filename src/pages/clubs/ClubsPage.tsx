import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, Video, ArrowRight, ShieldCheck, Sparkles, Filter, X } from 'lucide-react';
import { useMatchStore } from '../../store';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
}

export function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const { matches = [], fetchMatches } = useMatchStore();

  useEffect(() => {
    fetchMatches();

    fetch('/api/clubs/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setClubs(data);
      })
      .catch(err => console.error('Failed to load active clubs:', err))
      .finally(() => setIsLoading(false));
  }, [fetchMatches]);

  // Compute how many active published matches each club has
  const clubMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matches.forEach(m => {
      if (m.publish_status === 'draft' || m.publishStatus === 'draft') return;
      if (m.club_id) {
        counts[String(m.club_id)] = (counts[String(m.club_id)] || 0) + 1;
      }
    });
    return counts;
  }, [matches]);

  const filteredClubs = useMemo(() => {
    return clubs.filter(club => {
      // Name search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!club.name.toLowerCase().includes(q)) return false;
      }

      // Sport filter (check if club has matches in this sport)
      if (selectedSport !== 'all') {
        const hasSportMatch = matches.some(m => {
          if (m.publish_status === 'draft' || m.publishStatus === 'draft') return false;
          if (String(m.club_id) !== String(club.id)) return false;
          return (m.sport || 'football').toLowerCase() === selectedSport;
        });
        if (!hasSportMatch) return false;
      }

      return true;
    });
  }, [clubs, searchQuery, selectedSport, matches]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4" />
            <span>Partner Directory</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Clubs</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Browse verified partner clubs, grassroots teams, and sports organisations streaming live on WatchWDS.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search clubs by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all shadow-sm"
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

      {/* Sport Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
        <button
          onClick={() => setSelectedSport('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            selectedSport === 'all'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:border-yellow-500'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          All sports
        </button>
        <button
          onClick={() => setSelectedSport('football')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            selectedSport === 'football'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:border-yellow-500'
          }`}
        >
          Football
        </button>
      </div>

      {/* Club Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-8">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No clubs found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {searchQuery ? `No clubs matched "${searchQuery}".` : 'No partner clubs currently listed.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-md transition-all text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map(club => {
            const matchCount = clubMatchCounts[String(club.id)] || 0;
            return (
              <Link
                key={club.id}
                to={`/clubs/${club.slug || club.id}`}
                className="group block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 p-6 shadow-sm hover:shadow-xl hover:border-yellow-500/40 transition-all hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-600">
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={club.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Partner
                    </span>
                  </div>

                  <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight group-hover:text-yellow-500 transition-colors line-clamp-1 mb-1.5">
                    {club.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {club.description || 'Official club broadcasts, fixtures, and on-demand replays.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-yellow-500" />
                    <span>{matchCount} {matchCount === 1 ? 'broadcast' : 'broadcasts'}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform">
                    View events <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
