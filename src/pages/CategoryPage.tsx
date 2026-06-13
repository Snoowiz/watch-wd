import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMatchStore, useCategoryStore, useSettingsStore } from '../store';
import { PlayCircle, Calendar, Clock, Video, LayoutGrid, List as ListIcon } from 'lucide-react';
import { format } from 'date-fns';

export function CategoryPage() {
  const { slug } = useParams();
  const { matches = [] } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const { currencySymbol } = useSettingsStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const category = categories.find(c => c.slug === slug);
  
  if (!category) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Category not found</h2>
        <Link to="/matches" className="text-yellow-500 font-bold mt-4 inline-block">Back to all matches</Link>
      </div>
    );
  }

  const categoryMatches = matches.filter(m => (m.categories || []).includes(category.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{category.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">{category.description}</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-yellow-500 shadow-sm' : 'text-slate-400'}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-yellow-500 shadow-sm' : 'text-slate-400'}`}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.slug}`} className="group block">
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                  <img 
                    src={match.thumbnail || null}
                    alt={match.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                      match.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-slate-900'
                    }`}>
                      {match.status}
                    </div>
                    {match.access === 'paid' ? (
                      <div className="bg-slate-900/80 backdrop-blur-sm text-yellow-500 text-sm font-bold px-3 py-1 rounded-lg border border-white/10">
                        {currencySymbol}{match.price}
                      </div>
                    ) : (
                      <div className="bg-green-500/90 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-lg">
                        FREE
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm">
                    <PlayCircle className="w-16 h-16 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-yellow-500 transition-colors">
                    {match.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {match.date ? format(new Date(match.date), 'MMM d, yyyy') : 'TBA'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {match.date ? format(new Date(match.date), 'h:mm a') : 'TBA'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {categoryMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.slug}`} className="group block">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md flex items-center gap-6">
                <div className="w-48 aspect-video bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden shrink-0 relative">
                  <img 
                    src={match.thumbnail || null}
                    alt={match.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm">
                    <PlayCircle className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      match.status === 'live' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-slate-900'
                    }`}>
                      {match.status}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      match.access === 'free' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
                    }`}>
                      {match.access}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2 truncate group-hover:text-yellow-500 transition-colors">
                    {match.title}
                  </h3>
                  <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4" />
                      {match.date ? format(new Date(match.date), 'MMM d, yyyy') : 'TBA'}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-4 h-4" />
                      {match.date ? format(new Date(match.date), 'h:mm a') : 'TBA'}
                    </div>
                  </div>
                </div>
                <div className="text-right pr-4">
                  {match.access === 'paid' ? (
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      {currencySymbol}{match.price}
                    </div>
                  ) : (
                    <div className="text-xl font-black text-green-500">FREE</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {categoryMatches.length === 0 && (
        <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <Video className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No matches in this category</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Check back later for updates.</p>
        </div>
      )}
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
