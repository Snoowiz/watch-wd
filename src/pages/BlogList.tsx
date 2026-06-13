import React, { useState } from 'react';
import { useBlogStore, useSettingsStore, useAuthStore } from '../store';
import { Link } from 'react-router-dom';
import { Calendar, Eye, Heart, Clock, Search, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { stripHtml } from '../utils';

export function BlogList() {
  const { posts = [], setPosts } = useBlogStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null);

  // Checks if user is admin
  const isAdmin = user?.role === 'admin' || user?.email === 'mayycutee1@gmail.com';

  const publishedPosts = posts.filter(p => p.status === 'published');

  const formatDateSafe = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'TBA';
    return format(date, formatStr);
  };
  
  // Extract all unique categories
  const allCategories = Array.from(
    new Set(
      publishedPosts
        .flatMap(p => p.categories || [])
        .map(cat => cat.trim())
        .filter(Boolean)
    )
  ).reduce<string[]>((acc, cat) => {
    if (!cat) return acc;
    const normalized = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    if (!acc.includes(normalized)) {
      acc.push(normalized);
    }
    return acc;
  }, []);

  const filteredPosts = publishedPosts.filter(post => {
    const matchesSearch = (post.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                          (post.excerpt || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory 
      ? (post.categories || []).some(cat => (cat || '').toLowerCase() === (selectedCategory || '').toLowerCase()) 
      : true;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isAdmin) return;
    setDraggedPostIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!isAdmin || draggedPostIndex === null || draggedPostIndex === targetIndex) return;

    const sourcePost = filteredPosts[draggedPostIndex];
    const targetPost = filteredPosts[targetIndex];

    const allPosts = [...posts];
    const sIndex = allPosts.findIndex(p => p.id === sourcePost.id);
    const tIndex = allPosts.findIndex(p => p.id === targetPost.id);

    if (sIndex !== -1 && tIndex !== -1) {
      const [moved] = allPosts.splice(sIndex, 1);
      allPosts.splice(tIndex, 0, moved);
      setPosts(allPosts);
    }
    setDraggedPostIndex(null);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            <span className="text-indigo-600 dark:text-indigo-500">Updates</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Insights, platform updates, and grassroots sports stories from our community.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          {/* Realtime Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              id="blog-search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                title="Clear Search"
                id="clear-blog-search-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {allCategories.length > 0 && (
        <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto pb-3 scrollbar-none -mx-4 pl-6 pr-4 md:mx-0 md:px-0 scroll-smooth snap-x">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start ${
              selectedCategory === null 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-indigo-500'
            }`}
            id="blog-cat-all"
          >
            All News
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-indigo-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filteredPosts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <div 
              key={post.id}
              draggable={isAdmin}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
              className={`group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col h-full relative ${
                isAdmin ? 'cursor-grab active:cursor-grabbing border-dashed border-2 hover:border-indigo-500/50' : ''
              } ${draggedPostIndex === index ? 'opacity-40 scale-95' : ''}`}
            >
              {isAdmin && (
                <div className="absolute top-2 right-2 bg-slate-900/90 text-white text-[9px] font-black px-2 py-1 rounded backdrop-blur-sm z-30 pointer-events-none select-none uppercase tracking-wider flex items-center gap-1 border border-white/10 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  Drag to Reorder
                </div>
              )}

              <Link 
                to={`/blog/${post.slug}`}
                className="flex flex-col h-full flex-grow"
              >
                <div className="aspect-[16/9] relative bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                  <img 
                    src={post.featuredImage || null} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  {post.categories.length > 0 && (
                    <div className="absolute top-4 left-4 bg-indigo-600/90 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm">
                      {post.categories[0]}
                    </div>
                  )}
                  {post.restricted === 'premium' && (
                    <div className="absolute top-4 right-4 bg-yellow-500/90 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm shadow-xl">
                      Premium
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="p-6 sm:p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDateSafe(post.createdAt, 'MMM d, yyyy')}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readingTimeMinutes} min read</span>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3 flex-1 flex-grow">
                    {stripHtml(post.excerpt)}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700 mt-auto">
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Eye className="w-4 h-4 text-slate-400" /> {post.views}</span>
                      <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-rose-400" /> {post.likes}</span>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read More <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">No articles found matching your criteria.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
            className="mt-6 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
