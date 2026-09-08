import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Newspaper, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { HomepageBlock, useBlogStore, useSettingsStore } from '../../../store';
import { stripHtml } from '../../../utils';

export function BlogsBlock({ block }: { block: HomepageBlock }) {
  const { posts = [] } = useBlogStore();
  const { blogSettings } = useSettingsStore();
  const carouselRef = useRef<HTMLDivElement>(null);

  if (blogSettings?.enabled === false) {
    return null;
  }

  const published = posts.filter(p => p.status === 'published');
  const displayedPosts = published.slice(0, block.maxItems || 6);
  const layout = block.layout || 'carousel';

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.offsetWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
            <Newspaper className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {block.title || 'Latest from the Blog'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest flex items-center gap-2">
              {block.subtitle || 'Insights, news, and updates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {layout === 'carousel' && displayedPosts.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                aria-label="Previous posts"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                aria-label="Next posts"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {block.showViewAll !== false && (
            <Link
              to={block.viewAllUrl || '/blog'}
              className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest hidden md:flex items-center gap-2 hover:underline transition-colors"
            >
              All Articles →
            </Link>
          )}
        </div>
      </div>

      {displayedPosts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 font-bold">No blog posts available at the moment.</p>
        </div>
      ) : layout === 'carousel' ? (
        <div
          ref={carouselRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {displayedPosts.map((post) => (
            <div key={post.id} className="flex-none w-[80vw] sm:w-[350px] md:w-[400px] snap-start">
              <BlogPostCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

function BlogPostCard({ post }: { post: any }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-indigo-500/30 transition-all flex flex-col overflow-hidden h-full"
    >
      <div className="aspect-[16/9] w-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
        <img
          src={post.featuredImage || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80'}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {(post.categories || []).slice(0, 1).map((cat: string) => (
            <span key={cat} className="text-[10px] font-black bg-white/90 text-slate-900 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
              {cat}
            </span>
          ))}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {post.createdAt ? format(new Date(post.createdAt), 'MMM d, yyyy') : ''}
          </span>
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
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-wide group-hover:underline">
            Read Article →
          </span>
        </div>
      </div>
    </Link>
  );
}
