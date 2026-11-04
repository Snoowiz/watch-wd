import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, X, ShieldAlert } from 'lucide-react';
import { useCategoryStore, useSportStore } from '../../store';
import { CONFIGURED_SPORTS, SportConfig, getSportConfig, SPORTS_REGISTRY } from '../../config/sports';
import { NewMatch } from './NewMatch';

/**
 * Sport-first entry point for new events.
 * 
 * Presents an accessible "Select sport" dialog derived dynamically from
 * sports management and CONFIGURED_SPORTS.
 * Once a sport is selected, the unified event details editor opens with the
 * sport preselected and required categories mapped.
 * 
 * Editing an existing event bypasses this dialog and opens NewMatch directly.
 */
export function CreateEvent() {
  const navigate = useNavigate();
  const { categories, fetchCategories } = useCategoryStore();
  const { sports = [], fetchActiveSports } = useSportStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [selectedSport, setSelectedSport] = useState<SportConfig | null>(null);
  const [resolvedCategoryId, setResolvedCategoryId] = useState<number | undefined>(undefined);
  const [showSwitchWarning, setShowSwitchWarning] = useState<boolean>(false);

  useEffect(() => {
    fetchCategories();
    fetchActiveSports();
  }, [fetchCategories, fetchActiveSports]);

  useEffect(() => {
    if (!selectedSport) {
      dialogRef.current?.focus();
    }
  }, [selectedSport]);

  // Combine static registry with dynamic sports from DB
  const availableSportsList: SportConfig[] = useMemo(() => {
    if (!sports || sports.length === 0) {
      return CONFIGURED_SPORTS;
    }

    const list: SportConfig[] = [];
    const seen = new Set<string>();

    // Dynamic sports from database
    for (const s of sports) {
      const reg = SPORTS_REGISTRY[s.id] || SPORTS_REGISTRY[s.slug];
      const isActive = s.is_active === 1 || s.is_active === true;
      if (reg) {
        list.push({
          ...reg,
          available: isActive,
        });
      } else {
        const resolved = getSportConfig(s.id, sports);
        if (resolved) {
          list.push({
            ...resolved,
            available: isActive,
          });
        }
      }
      seen.add(s.id);
      seen.add(s.slug);
    }

    // Add any configured sports not yet in dynamic list
    for (const c of CONFIGURED_SPORTS) {
      if (!seen.has(c.id) && !seen.has(c.slug)) {
        list.push(c);
      }
    }

    return list;
  }, [sports]);

  const handleSelectSport = (sport: SportConfig) => {
    if (!sport.available) return;

    // Resolve matching category ID from existing categories if present
    const matchedCategory = categories.find(
      (cat) =>
        String(cat.slug || '').trim().toLowerCase() === sport.categorySlug.toLowerCase() ||
        String(cat.name || '').trim().toLowerCase() === sport.name.toLowerCase()
    );

    setResolvedCategoryId(matchedCategory ? Number(matchedCategory.id) : undefined);
    setSelectedSport(sport);
  };

  const handleChangeSportRequest = () => {
    setShowSwitchWarning(true);
  };

  const confirmChangeSport = () => {
    setShowSwitchWarning(false);
    setSelectedSport(null);
    setResolvedCategoryId(undefined);
  };

  if (selectedSport) {
    return (
      <div className="min-h-screen">
        {/* Top Active Sport Status Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Sport selected: <span className="text-yellow-600 dark:text-yellow-400 font-black">{selectedSport.name}</span>
              </span>
              <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400">
                — {selectedSport.participants.type === 'teams' ? 'Home & away team fixture' : (selectedSport.participants.type === 'combatants' ? 'Fighter card / championship match' : 'Player or pair tournament match')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleChangeSportRequest}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Change sport</span>
            </button>
          </div>
        </div>

        {/* Change Sport Confirmation Modal */}
        {showSwitchWarning && (
          <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-500">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change sport?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Switching sports will reset sport-specific participant data and tournament/club references.
                Shared values (event date, media, stream settings, and pricing) will be preserved.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSwitchWarning(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Keep {selectedSport.name}
                </button>
                <button
                  type="button"
                  onClick={confirmChangeSport}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                >
                  Change sport
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Unified Event Editor in Create Mode */}
        <NewMatch
          key={selectedSport.id}
          initialSport={selectedSport.id as any}
          initialSportCategoryId={resolvedCategoryId}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 backdrop-blur-sm px-4 py-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-event-dialog-title"
        aria-describedby="create-event-dialog-description"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') navigate('/admin/events');
        }}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none sm:p-8 dark:border-slate-800 dark:bg-slate-900 transition-all"
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 mb-2">
              Create event
            </span>
            <h1 id="create-event-dialog-title" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Select sport
            </h1>
            <p id="create-event-dialog-description" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Which sport would you like to create an event for?
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => navigate('/admin/events')}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sport Options List */}
        <div className="space-y-3">
          {availableSportsList.map((sport) => {
            const isAvailable = sport.available;
            return (
              <button
                key={sport.id}
                type="button"
                disabled={!isAvailable}
                onClick={() => handleSelectSport(sport)}
                className={`group flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all ${
                  isAvailable
                    ? 'border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 hover:border-yellow-500 dark:hover:border-yellow-500 hover:bg-yellow-50/50 dark:hover:bg-yellow-500/10 cursor-pointer shadow-sm'
                    : 'border-slate-200/60 dark:border-slate-800/40 bg-slate-100/50 dark:bg-slate-950/40 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                      {sport.name}
                    </span>
                    {!isAvailable && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sport.description}
                  </p>
                  {!isAvailable && sport.unavailableReason && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                      {sport.unavailableReason}
                    </p>
                  )}
                </div>

                {isAvailable ? (
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-yellow-600 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20 transition-all shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 shrink-0">
                    Disabled
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info & Cancel */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Closing without selection will not create any record.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
