import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, Video, MessageSquare, BookOpen, ChevronRight, HelpCircle, ArrowRight, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useSettingsStore } from '../store';

interface SearchResults {
  matches: any[];
  blogs: any[];
  forums: any[];
  kb: any[];
  totalCount: number;
}

export function SearchPage() {
  const { blogSettings } = useSettingsStore();
  const blogEnabled = blogSettings?.enabled !== false;
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'matches' | 'blog' | 'forum' | 'kb'>('all');
  const [results, setResults] = useState<SearchResults>({ matches: [], blogs: [], forums: [], kb: [], totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedKbId, setExpandedKbId] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else if (query.trim() === '') {
        setResults({ matches: [], blogs: [], forums: [], kb: [], totalCount: 0 });
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${activeTab === 'all' ? 'all' : activeTab}`);
      const data = await response.json();
      if (data.error) {
        console.error(data.error);
      } else {
        setResults(data);
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Re-run search if active tab changes and we have a valid query
  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      performSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults({ matches: [], blogs: [], forums: [], kb: [], totalCount: 0 });
  };

  // Determine which list is displayed based on tab selection
  const filterResults = () => {
    const list: any[] = [];
    if (activeTab === 'all' || activeTab === 'matches') {
      results.matches.forEach(m => list.push({ ...m, _type: 'match' }));
    }
    if (blogEnabled && (activeTab === 'all' || activeTab === 'blog')) {
      results.blogs.forEach(b => list.push({ ...b, _type: 'blog' }));
    }
    if (activeTab === 'all' || activeTab === 'forum') {
      results.forums.forEach(f => list.push({ ...f, _type: 'forum' }));
    }
    if (activeTab === 'all' || activeTab === 'kb') {
      results.kb.forEach(k => list.push({ ...k, _type: 'kb' }));
    }
    // Sort all by combined Score
    return list.sort((a, b) => (b._score || 0) - (a._score || 0));
  };

  const displayList = filterResults();

  // Helper categories for helpful pre-populated quick searches
  const quickSearches = [
    { label: 'PPV Match', term: 'premium' },
    { label: 'Reset password', term: 'password' },
    { label: 'Become creator', term: 'creator' },
    { label: 'Wallet balance', term: 'wallet' },
    { label: 'Refund policy', term: 'refund' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 min-h-[75vh]" id="search-container">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white" id="search-title">
          Platform Search
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto text-sm sm:text-base">
          Find matches, community forum threads, blog articles, and platform help guides.
        </p>
      </div>

      {/* Main Search Bar Form */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto mb-8" id="search-form">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, topics, policies, matches..."
            className="w-full text-base pl-12 pr-10 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-sm dark:shadow-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
            id="search-input"
            autoFocus
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" id="search-icon-wrapper">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded"
              id="search-clear-btn"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap items-center gap-2 mt-3.5 justify-center" id="quick-searches-box">
          <span className="text-xs text-slate-400 font-medium">Try searching:</span>
          {quickSearches.map((qs, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(qs.term)}
              className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-yellow-500 hover:text-white dark:hover:bg-yellow-500 dark:hover:text-slate-900 transition-colors font-medium cursor-pointer"
            >
              {qs.label}
            </button>
          ))}
        </div>
      </form>

      {/* Result Status & Tabs */}
      <div className="space-y-6" id="search-results-section">
        {query.trim().length >= 2 && (
          <div className="border-b border-slate-200 dark:border-slate-800/80 pb-1" id="search-tabs-container">
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-sm rounded-t-lg shrink-0 transition-colors ${activeTab === 'all' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                All Results
                <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-500">
                  {results.totalCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-sm rounded-t-lg shrink-0 transition-colors ${activeTab === 'matches' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <Video className="w-4 h-4" />
                Matches
                <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-500">
                  {results.matches.length}
                </span>
              </button>
              {blogEnabled && (
                <button
                  onClick={() => setActiveTab('blog')}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-sm rounded-t-lg shrink-0 transition-colors ${activeTab === 'blog' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <BookOpen className="w-4 h-4" />
                  CMS Blogs
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-500">
                    {results.blogs.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('forum')}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-sm rounded-t-lg shrink-0 transition-colors ${activeTab === 'forum' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Forums
                <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-500">
                  {results.forums.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('kb')}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-bold text-sm rounded-t-lg shrink-0 transition-colors ${activeTab === 'kb' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <HelpCircle className="w-4 h-4" />
                Knowledge Base
                <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-500">
                  {results.kb.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Results Showcase Area */}
        <div className="space-y-4" id="results-cards-list">
          {query.trim().length < 2 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6">
              <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">Start typing to search WatchWDS</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                Discover live streams, operational matches, blog insights, and support guides effortlessly.
              </p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
                  <p className="text-slate-600 dark:text-slate-400 font-bold">Querying the databases...</p>
                </div>
              ) : (
                <>
                  <HelpCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">No matches or articles found</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                    We couldn't find matches for <span className="text-yellow-500 font-semibold">"{query}"</span> in {activeTab === 'all' ? 'the platform' : activeTab}. Try revising your keyword terms.
                  </p>
                </>
              )}
            </div>
          ) : (
            displayList.map((item, index) => {
              if (item._type === 'match') {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    key={`match-${item.id}`}
                    className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md dark:shadow-none transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-start sm:items-center">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                            Live Stream
                          </span>
                          {item.is_ppv === 1 && (
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 px-2 py-0.5 rounded">
                              PPV Event
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/80 rounded font-mono text-slate-400">
                            Relevance: {item._score}
                          </span>
                        </div>
                        <h3 className="font-bold sm:text-lg text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 max-w-2xl">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/matches/${item.slug || item.id}`}
                      className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-slate-50 hover:bg-yellow-500 hover:text-white dark:bg-slate-700/60 dark:hover:bg-yellow-500 dark:hover:text-slate-900 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-100 dark:border-slate-700"
                    >
                      Watch Stream
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </Link>
                  </motion.div>
                );
              }

              if (item._type === 'blog') {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    key={`blog-${item.id}`}
                    className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md dark:shadow-none transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-start sm:items-center max-w-3xl">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                            CMS Article
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/80 rounded font-mono text-slate-400">
                            Relevance: {item._score}
                          </span>
                        </div>
                        <h3 className="font-bold sm:text-lg text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {item.excerpt || "Read our latest CMS blog publication..."}
                        </p>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 3).map((tag: string, tid: number) => (
                              <span key={tid} className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-400">
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/blog/${item.slug}`}
                      className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-slate-50 hover:bg-yellow-500 hover:text-white dark:bg-slate-700/60 dark:hover:bg-yellow-500 dark:hover:text-slate-900 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-100 dark:border-slate-700"
                    >
                      Read Article
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </Link>
                  </motion.div>
                );
              }

              if (item._type === 'forum') {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    key={`forum-${item.id}`}
                    className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md dark:shadow-none transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-start sm:items-center max-w-3xl">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                            Community Forum
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/80 rounded font-mono text-slate-400">
                            Relevance: {item._score}
                          </span>
                          <span className="text-xs text-slate-400">
                            by {item.author_name}
                          </span>
                        </div>
                        <h3 className="font-bold sm:text-lg text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors">
                          {item.title}
                        </h3>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 max-w-xl" dangerouslySetInnerHTML={{ __html: item.content }} />
                      </div>
                    </div>
                    <Link
                      to={`/forum/topic/${item.id}`}
                      className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-slate-50 hover:bg-yellow-500 hover:text-white dark:bg-slate-700/60 dark:hover:bg-yellow-500 dark:hover:text-slate-900 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-100 dark:border-slate-700"
                    >
                      Go to Topic
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </Link>
                  </motion.div>
                );
              }

              if (item._type === 'kb') {
                const isExpanded = expandedKbId === item.id;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    key={`kb-${item.id}`}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm transition-all"
                  >
                    <div
                      className="flex gap-4 items-start sm:items-center justify-between cursor-pointer"
                      onClick={() => setExpandedKbId(isExpanded ? null : item.id)}
                    >
                      <div className="flex gap-4 items-start sm:items-center">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-500 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
                              Knowledge Base ({item.category})
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/80 rounded font-mono text-slate-400">
                              Relevance: {item._score}
                            </span>
                          </div>
                          <h3 className="font-bold sm:text-lg text-slate-900 dark:text-white hover:text-yellow-500 transition-colors">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0 hidden sm:inline-block px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 rounded-lg group hover:text-yellow-500">
                        {isExpanded ? 'Collapse' : 'View Answer'}
                      </span>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-4 pt-4 border-t border-slate-100 dark:border-slate-750"
                        >
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl leading-relaxed text-sm sm:text-base text-slate-700 dark:text-slate-300">
                            {item.content}
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-4">
                                {item.tags.map((tag: string, tid: number) => (
                                  <span key={tid} className="inline-flex items-center gap-0.5 text-[10px] bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-slate-400">
                                    <Tag className="w-2.5 h-2.5 text-slate-400" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }

              return null;
            })
          )}
        </div>
      </div>
    </div>
  );
}
