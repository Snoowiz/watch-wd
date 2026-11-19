import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSportEmoji } from './SportIconPicker';

interface SportItem {
  id: string;
  name: string;
  slug?: string;
  icon?: string | null;
  available?: boolean;
  unavailableReason?: string;
}

interface SportFilterCarouselProps {
  sports: SportItem[];
  selectedSport: string;
  onSelectSport: (sportId: string) => void;
}

export function SportFilterCarousel({ sports, selectedSport, onSelectSport }: SportFilterCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const didDrag = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll, sports]);

  const scrollBy = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    didDrag.current = false;
    dragStartX.current = e.pageX;
    dragScrollLeft.current = scrollRef.current?.scrollLeft || 0;
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.pageX - dragStartX.current;
    if (Math.abs(dx) > 4) didDrag.current = true;
    if (scrollRef.current) scrollRef.current.scrollLeft = dragScrollLeft.current - dx;
  };

  const onMouseUp = () => { isDragging.current = false; };

  const activeSports = sports.filter(s => s.available !== false);
  const unavailableSports = sports.filter(s => s.available === false);

  const CardDesktop = ({ id, name, icon, disabled, title: titleAttr }: {
    id: string; name: string; icon: string; disabled?: boolean; title?: string;
  }) => {
    const isSelected = selectedSport === id;
    return (
      <button
        id={`sport-tab-${id}`}
        disabled={disabled}
        title={titleAttr}
        onClick={() => !didDrag.current && !disabled && onSelectSport(id)}
        className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all whitespace-nowrap select-none ${
          isSelected
            ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-md shadow-yellow-500/25'
            : disabled
              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-yellow-400 hover:text-slate-900 dark:hover:text-white hover:shadow-sm'
        }`}
      >
        <span className="text-base leading-none">{icon}</span>
        <span>{name}</span>
      </button>
    );
  };

  const CardMobile = ({ id, name, icon, disabled }: {
    id: string; name: string; icon: string; disabled?: boolean;
  }) => {
    const isSelected = selectedSport === id;
    return (
      <button
        id={`sport-tab-${id}-m`}
        disabled={disabled}
        onClick={() => !disabled && onSelectSport(id)}
        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold transition-all ${
          isSelected
            ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-md shadow-yellow-500/25'
            : disabled
              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'
        }`}
      >
        <span className="text-2xl leading-none">{icon}</span>
        <span className="text-xs text-center leading-tight">{name}</span>
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-3">
      {/* Desktop: carousel */}
      <div className="hidden sm:flex items-center gap-2">
        {canScrollLeft && (
          <button
            onClick={() => scrollBy('left')}
            aria-label="Scroll left"
            className="shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className={`flex gap-2 overflow-x-hidden flex-1 ${isDragging.current ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <CardDesktop id="all" name="All sports" icon="✦" />
          {activeSports.map(s => (
            <CardDesktop
              key={s.id}
              id={s.id}
              name={s.name}
              icon={getSportEmoji(s)}
            />
          ))}
          {unavailableSports.map(s => (
            <CardDesktop
              key={s.id}
              id={s.id}
              name={s.name}
              icon={getSportEmoji(s)}
              disabled
              title={s.unavailableReason || 'Coming soon'}
            />
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scrollBy('right')}
            aria-label="Scroll right"
            className="shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile: 2-column grid */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <CardMobile id="all" name="All sports" icon="✦" />
        {activeSports.map(s => (
          <CardMobile key={s.id} id={s.id} name={s.name} icon={getSportEmoji(s)} />
        ))}
        {unavailableSports.map(s => (
          <CardMobile key={s.id} id={s.id} name={s.name} icon={getSportEmoji(s)} disabled />
        ))}
      </div>
    </div>
  );
}
