import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Award, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { HomepageBlock, useCategoryStore, useMatchStore } from '../../../store';

export function CompetitionsBlock({ block }: { block: HomepageBlock }) {
  const { categories = [] } = useCategoryStore();
  const { matches = [] } = useMatchStore();
  const carouselRef = useRef<HTMLDivElement>(null);

  const displayedCategories = categories.slice(0, block.maxItems || 6);
  const layout = block.layout || 'grid';

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.offsetWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getMatchCount = (catId: any) => {
    return matches.filter(m => {
      const matchCatId = typeof m.category === 'object' ? (m.category as any)?.id : m.category;
      return String(matchCatId) === String(catId);
    }).length;
  };

  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {block.title || 'Top Competitions'}
            </h2>
          </div>
          {block.subtitle && (
            <p className="text-slate-500 dark:text-slate-400 font-medium">{block.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {layout === 'carousel' && displayedCategories.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-yellow-500 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-yellow-500 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {block.showViewAll !== false && (
            <Link
              to={block.viewAllUrl || '/matches'}
              className="text-yellow-500 font-black text-sm uppercase tracking-widest hidden md:flex items-center gap-2 hover:text-yellow-400 transition-colors group"
            >
              All Leagues <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {displayedCategories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 font-bold">No competition categories set up yet.</p>
        </div>
      ) : layout === 'carousel' ? (
        <div
          ref={carouselRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {displayedCategories.map(cat => {
            const count = getMatchCount(cat.id);
            return (
              <div key={cat.id} className="flex-none w-[70vw] sm:w-[260px] snap-start">
                <CompetitionCard category={cat} count={count} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayedCategories.map(cat => {
            const count = getMatchCount(cat.id);
            return <CompetitionCard key={cat.id} category={cat} count={count} />;
          })}
        </div>
      )}
    </section>
  );
}

function CompetitionCard({ category, count }: { category: any; count: number }) {
  return (
    <Link
      to={`/category/${(category as any).slug || category.id}`}
      className="group p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-yellow-500/50 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-yellow-500 flex items-center justify-center font-black text-lg group-hover:bg-yellow-500 group-hover:text-slate-900 transition-colors shadow-inner">
          {category.name?.charAt(0) || 'C'}
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
          {count} {count === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors line-clamp-1">
          {category.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-medium">
          {category.description || 'Official tournaments and championship fixtures'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs font-bold text-yellow-500 group-hover:translate-x-0.5 transition-transform">
        <span>Explore Fixtures</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
