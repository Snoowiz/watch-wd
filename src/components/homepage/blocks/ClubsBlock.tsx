import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { HomepageBlock } from '../../../store';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export function ClubsBlock({ block }: { block: HomepageBlock }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/clubs/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClubs(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const displayedClubs = clubs.slice(0, block.maxItems || 8);
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

  if (!loading && displayedClubs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {block.title || 'Partner Clubs'}
            </h2>
          </div>
          {block.subtitle && (
            <p className="text-slate-500 dark:text-slate-400 font-medium">{block.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {layout === 'carousel' && displayedClubs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {block.showViewAll !== false && (
            <Link
              to={block.viewAllUrl || '/matches'}
              className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest hidden md:flex items-center gap-2 hover:underline transition-colors"
            >
              All Clubs →
            </Link>
          )}
        </div>
      </div>

      {layout === 'carousel' ? (
        <div
          ref={carouselRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {displayedClubs.map(club => (
            <div key={club.id} className="flex-none w-[60vw] sm:w-[200px] snap-start">
              <ClubCard club={club} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayedClubs.map(club => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}
    </section>
  );
}

function ClubCard({ club }: { club: Club }) {
  return (
    <Link
      to={`/matches?club=${club.id}`}
      className="group p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-500/40 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center text-center justify-center gap-3 h-full"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/60 p-2 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-inner">
        {club.logo ? (
          <img
            src={club.logo}
            alt={club.name}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Shield className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        )}
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors line-clamp-1">
          {club.name}
        </h4>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Club</span>
      </div>
    </Link>
  );
}
