import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

export const SPORT_ICON_OPTIONS = [
  { emoji: '⚽', label: 'Football / Soccer' },
  { emoji: '🎾', label: 'Tennis' },
  { emoji: '🏀', label: 'Basketball' },
  { emoji: '🥊', label: 'Boxing' },
  { emoji: '🥋', label: 'MMA / Martial Arts' },
  { emoji: '🏈', label: 'American Football' },
  { emoji: '⚾', label: 'Baseball' },
  { emoji: '🏐', label: 'Volleyball' },
  { emoji: '🏉', label: 'Rugby' },
  { emoji: '🏏', label: 'Cricket' },
  { emoji: '🏑', label: 'Field Hockey' },
  { emoji: '🏒', label: 'Ice Hockey' },
  { emoji: '🏓', label: 'Table Tennis / Ping Pong' },
  { emoji: '🏸', label: 'Badminton' },
  { emoji: '⛳', label: 'Golf' },
  { emoji: '🏊', label: 'Swimming' },
  { emoji: '🏃', label: 'Athletics / Running' },
  { emoji: '🚴', label: 'Cycling' },
  { emoji: '🏋️', label: 'Weightlifting' },
  { emoji: '🤼', label: 'Wrestling' },
  { emoji: '🤸', label: 'Gymnastics' },
  { emoji: '⛷️', label: 'Skiing' },
  { emoji: '🏄', label: 'Surfing' },
  { emoji: '🎱', label: 'Snooker / Pool / Billiards' },
  { emoji: '🎯', label: 'Darts' },
  { emoji: '🎳', label: 'Bowling' },
  { emoji: '🏇', label: 'Horse Racing' },
  { emoji: '🛹', label: 'Skateboarding' },
  { emoji: '🚣', label: 'Rowing' },
  { emoji: '🧗', label: 'Climbing' },
  { emoji: '🥅', label: 'Net Sports (generic)' },
  { emoji: '🏆', label: 'General / Trophy (default)' },
  { emoji: '🌟', label: 'General / Featured' },
];

export const DEFAULT_SPORT_EMOJI_MAP: Record<string, string> = {
  football: '⚽', soccer: '⚽', tennis: '🎾', basketball: '🏀',
  boxing: '🥊', mma: '🥋', 'american-football': '🏈', baseball: '⚾',
  volleyball: '🏐', rugby: '🏉', cricket: '🏏', 'field-hockey': '🏑',
  'ice-hockey': '🏒', 'table-tennis': '🏓', badminton: '🏸', golf: '⛳',
  swimming: '🏊', athletics: '🏃', running: '🏃', cycling: '🚴',
  weightlifting: '🏋️', wrestling: '🤼', gymnastics: '🤸', skiing: '⛷️',
  surfing: '🏄', snooker: '🎱', pool: '🎱', billiards: '🎱', darts: '🎯',
  bowling: '🎳', 'horse-racing': '🏇', horseracing: '🏇', skateboarding: '🛹',
  rowing: '🚣', climbing: '🧗',
};

export function getSportEmoji(sport: { id?: string; slug?: string; icon?: string | null }): string {
  const ico = (sport.icon || '').trim();
  if (ico) return ico;
  const key = (sport.id || sport.slug || '').toLowerCase().replace(/\s+/g, '-');
  return DEFAULT_SPORT_EMOJI_MAP[key] || DEFAULT_SPORT_EMOJI_MAP[key.replace(/-/g, '')] || '🏆';
}

interface SportIconPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function SportIconPicker({ value, onChange }: SportIconPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return SPORT_ICON_OPTIONS;
    const q = search.toLowerCase();
    return SPORT_ICON_OPTIONS.filter(o => o.label.toLowerCase().includes(q) || o.emoji.includes(q));
  }, [search]);

  const current = value?.trim() || '';

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
        Sport Icon
      </label>

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-400/30 dark:border-yellow-500/20 flex items-center justify-center text-2xl shrink-0 select-none">
          {current || '🏆'}
        </div>

        {/* Toggle picker */}
        <button
          type="button"
          onClick={() => setIsOpen(o => !o)}
          className="flex-1 flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-yellow-400 transition-colors"
        >
          <span>{current ? `Selected: ${current}` : 'Choose an icon…'}</span>
          <span className="text-xs text-slate-400">{isOpen ? '▲' : '▼'}</span>
        </button>

        {current && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            title="Remove icon"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Picker panel */}
      {isOpen && (
        <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-yellow-400"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 max-h-52 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt.emoji}
                type="button"
                title={opt.label}
                onClick={() => { onChange(opt.emoji); setIsOpen(false); setSearch(''); }}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-xl transition-all border ${
                  current === opt.emoji
                    ? 'bg-yellow-500 border-yellow-500 shadow-md'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{opt.emoji}</span>
                <span className="text-[9px] text-slate-400 truncate w-full text-center leading-tight hidden sm:block">{opt.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No icons match "{search}"</p>
          )}
        </div>
      )}
    </div>
  );
}
