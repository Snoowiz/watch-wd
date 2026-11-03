import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Info, X } from 'lucide-react';
import { useCategoryStore } from '../../store';
import { NewMatch } from './NewMatch';

type ConfiguredSport = 'football' | 'tennis';

const sports = [
  { id: 'football', label: 'Football', description: 'Club and competition events', available: true },
  { id: 'tennis', label: 'Tennis', description: 'Player or pair and tournament events', available: true },
  { id: 'basketball', label: 'Basketball', description: 'Sport-specific fields are not defined yet', available: false },
] as const;

/**
 * Sport-first entry point for new events. Uses the existing match editor and
 * existing sport category IDs; editing an event still opens NewMatch directly.
 */
export function CreateEvent() {
  const navigate = useNavigate();
  const { categories } = useCategoryStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ sport: ConfiguredSport; categoryId: number } | null>(null);
  const [missingCategory, setMissingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!selection) dialogRef.current?.focus();
  }, [selection]);

  const selectSport = (sport: ConfiguredSport) => {
    // Match categories are existing records, not an automatically created second taxonomy.
    const category = categories.find((item) =>
      String(item.slug || '').trim().toLowerCase() === sport ||
      String(item.name || '').trim().toLowerCase() === sport
    );

    if (!category || !Number.isFinite(Number(category.id))) {
      setMissingCategory(sport);
      return;
    }

    setMissingCategory(null);
    setSelection({ sport, categoryId: Number(category.id) });
  };

  if (selection) {
    return (
      <div>
        <div className="mx-4 sm:mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
            <Check className="h-4 w-4 text-emerald-500" />
            Sport: {selection.sport === 'football' ? 'Football' : 'Tennis'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Change sport? Any unsaved event details will be discarded.')) {
                setSelection(null);
              }
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 underline underline-offset-2 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Change sport
          </button>
        </div>
        <NewMatch
          key={selection.sport}
          initialSport={selection.sport}
          initialSportCategoryId={selection.categoryId}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-event-sport-title"
        aria-describedby="create-event-sport-description"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') navigate('/admin/matches');
        }}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-7 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Create event</p>
            <h1 id="create-event-sport-title" className="text-2xl font-black text-slate-900 dark:text-white">Select sport</h1>
            <p id="create-event-sport-description" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Choose the sport first. The existing event details form opens afterwards.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cancel event creation"
            onClick={() => navigate('/admin/matches')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {sports.map((sport) => (
            <button
              key={sport.id}
              type="button"
              disabled={!sport.available}
              onClick={() => {
                if (sport.id === 'football' || sport.id === 'tennis') selectSport(sport.id);
              }}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors enabled:hover:border-yellow-500 enabled:hover:bg-yellow-50 enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-yellow-500 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:enabled:hover:bg-slate-700"
            >
              <span>
                <span className="block font-bold text-slate-900 dark:text-white">{sport.label}</span>
                <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{sport.description}</span>
              </span>
              {sport.available
                ? <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                : <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">Not ready</span>}
            </button>
          ))}
        </div>

        {missingCategory && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="alert">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Sport category not configured</p>
                <p className="mt-1">
                  Create a category named {missingCategory.charAt(0).toUpperCase() + missingCategory.slice(1)}
                  {' '}with the slug {missingCategory} before creating this event. Existing categories are never created automatically.
                </p>
                <button type="button" onClick={() => navigate('/admin/categories')} className="mt-2 font-bold underline underline-offset-2">
                  Manage categories
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/admin/matches')}
          className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
