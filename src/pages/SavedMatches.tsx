import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useSavedMatchesStore, Match } from '../store';
import { Play, Calendar, Users, Star, ArrowLeft, Bookmark } from 'lucide-react';
import { format } from 'date-fns';

export function SavedMatches() {
  const { user } = useAuthStore();
  const { savedMatches = [], unsaveMatch, fetchSavedMatches } = useSavedMatchesStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSavedMatches();
    
    // Fetch details for saved matches
    const fetchMatchDetails = async () => {
      try {
        const res = await fetch('/api/saved-matches/details', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
          console.error('Failed to fetch saved matches details', err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatchDetails();
  }, [fetchSavedMatches]);

  const handleUnsave = async (e: React.MouseEvent, matchId: number) => {
    e.preventDefault();
    e.stopPropagation();
    await unsaveMatch(matchId);
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/profile" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-yellow-500" />
            Watch Later
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Videos you've saved to watch later</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Bookmark className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No saved matches</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            When you find a match you want to watch later, click the save button and it will show up here.
          </p>
          <Link to="/matches" className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold transition-colors">
            <Play className="w-5 h-5" />
            Explore Matches
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {matches.map((match) => (
            <Link 
              to={`/matches/${match.slug}`}
              key={match.id}
              className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-video">
                <img 
                  src={match.thumbnail || null} 
                  alt={match.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white shadow-sm ${
                    match.status === 'live' ? 'bg-red-500 animate-pulse' :
                    match.status === 'upcoming' ? 'bg-blue-500' :
                    'bg-slate-600'
                  }`}>
                    {match.status.toUpperCase()}
                  </span>
                </div>

                <button 
                  onClick={(e) => handleUnsave(e, match.id)}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-10 block"
                  title="Remove from Watch Later"
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-yellow-500 transition-colors">
                  {match.title}
                </h3>
                
                <div className="mt-auto space-y-2">
                  <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    {(() => {
                      const dateVal = match.date || (match as any).startTime;
                      const dateObj = dateVal ? new Date(dateVal) : new Date();
                      const isValid = !isNaN(dateObj.getTime());
                      return (isValid ? dateObj : new Date()).toLocaleDateString(undefined, { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    })()}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-slate-500 dark:text-slate-400">
                      <Users className="w-4 h-4 mr-1" />
                      {(() => {
                        const count = match.views || (match as any).viewerCount || 0;
                        return typeof count === 'number' ? count.toLocaleString() : count;
                      })()}
                    </div>
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
