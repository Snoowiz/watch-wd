import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, useMatchStore, useSettingsStore, useBlogStore, useSavedMatchesStore } from '../store';
import { Video, Lock, Unlock, PlayCircle, CreditCard, Newspaper, ExternalLink, Loader2, Calendar, Clock, ChevronRight, ChevronLeft, Bookmark } from 'lucide-react';
import { getLatestSportsNews, NewsItem } from '../services/geminiService';
import { format } from 'date-fns';
import { stripHtml } from '../utils';

import { Slider } from '../components/Slider';

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { matches = [] } = useMatchStore();
  const { savedMatches = [], saveMatch, unsaveMatch, fetchSavedMatches } = useSavedMatchesStore();
  const { currencySymbol, homepageSettings, blogSettings } = useSettingsStore();
  const blogEnabled = blogSettings?.enabled !== false;

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
  const { posts = [] } = useBlogStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  // Provide fallback values in case homepageSettings is undefined
  const settings = homepageSettings || {
    featuresSectionEnabled: true,
    latestNewsEnabled: true
  };

  const featuredMatches = matches.slice(0, 9);
  const latestBlogs = posts.filter(p => p.status === 'published');
  const carouselRef = useRef<HTMLDivElement>(null);
  const featuredCarouselRef = useRef<HTMLDivElement>(null);

  const scrollNews = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.offsetWidth * 0.8;
      carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollFeatured = (direction: 'left' | 'right') => {
    if (featuredCarouselRef.current) {
      const scrollAmount = featuredCarouselRef.current.offsetWidth * 0.8;
      featuredCarouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    async function fetchNews() {
      try {
        const latestNews = await getLatestSportsNews();
        setNews(latestNews);
      } catch (error) {
        // Fallback silently if fetching news fails
      } finally {
        setLoadingNews(false);
      }
    }
    fetchNews();
  }, []);
  
  return (
    <div className="pb-20">
      {/* Hero Section */}
      <Slider id="default-hero" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 mt-16">
        {/* Featured Matches Section */}
        <section className="space-y-8">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Featured Broadcasts</h2>
            <p className="text-slate-500 dark:text-slate-400">Don't miss the most anticipated upcoming matches.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => scrollFeatured('left')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/20 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scrollFeatured('right')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/20 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <Link to="/matches" className="text-yellow-500 font-black text-sm uppercase tracking-widest hidden md:flex items-center gap-2 hover:text-yellow-400 transition-colors group">
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div ref={featuredCarouselRef} className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x snap-mandatory scrollbar-hide scroll-smooth" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {featuredMatches.map(match => (
            <Link key={match.id} to={`/matches/${match.slug}`} className="group block flex-none w-[80vw] sm:w-[350px] md:w-[380px] snap-start">
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-xl hover:-translate-y-1 h-full">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                  <img 
                    src={match.thumbnail || null}
                    alt={match.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                  <button 
                    onClick={(e) => handleToggleSave(e, match.id)}
                    className="absolute top-4 right-4 p-2 bg-slate-900/50 hover:bg-slate-900/80 rounded-full text-white backdrop-blur-sm z-10 transition-colors"
                  >
                    <Bookmark className={`w-4 h-4 ${savedMatches.includes(match.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${
                      match.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-slate-900'
                    }`}>
                      {match.status}
                    </div>
                    {match.access === 'paid' ? (
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
                <div className="p-6">
                  <h3 className="font-black text-xl text-slate-900 dark:text-white mb-3 line-clamp-1 group-hover:text-yellow-500 transition-colors tracking-tight">
                    {match.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-bold">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-yellow-500" />
                      {match.date ? format(new Date(match.date), 'MMM d, yyyy') : 'TBA'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      {match.date ? format(new Date(match.date), 'h:mm a') : 'TBA'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Blogs Carousel Section */}
      {blogEnabled && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
                <Newspaper className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Latest from the Blog</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest flex items-center gap-2">
                  Insights, news, and updates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => scrollNews('left')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scrollNews('right')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {latestBlogs.length > 0 ? (
            <div 
              ref={carouselRef}
              className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x snap-mandatory scrollbar-hide scroll-smooth"
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
              {latestBlogs.map((post) => (
                <Link 
                  key={post.id} 
                  to={`/blog/${post.slug}`}
                  className="group flex-none w-[80vw] sm:w-[350px] md:w-[400px] snap-start bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-indigo-500/30 transition-all flex flex-col overflow-hidden"
                >
                  <div className="aspect-[16/9] w-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                    <img 
                      src={post.featuredImage || `https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80`} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      {(post.categories || []).slice(0, 1).map(cat => (
                        <span key={cat} className="text-[10px] font-black bg-white/90 text-slate-900 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-tight tracking-tight">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed font-medium mb-6">
                      {stripHtml(post.excerpt)}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                        Admin
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-wide group-hover:underline">Read Article →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 font-bold">No posts available at the moment.</p>
            </div>
          )}
        </section>
      )}

      {/* Features Grid */}
      {settings.featuresSectionEnabled && (
        <section className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group flex flex-row items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Video className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">Live Streaming</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-xs sm:text-sm">High-quality live streams from our approved camera operators directly to your device.</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group flex flex-row items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Unlock className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">Pay-Per-View</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-xs sm:text-sm">Unlock premium matches using our secure wallet balance. Support local sports directly.</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group flex flex-row items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">Flexible Subscriptions</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-xs sm:text-sm">Subscribe to custom plans for unlimited access to exclusive team broadcasts, replays, and full match passes.</p>
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

