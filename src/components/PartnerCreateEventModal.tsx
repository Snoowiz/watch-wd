import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Calendar, Trophy, Tag, DollarSign, Image as ImageIcon, 
  Loader2, Sparkles, AlertCircle, CheckCircle2, Shield, Radio, Check
} from 'lucide-react';
import { SPORTS_REGISTRY, getSportConfig, SportConfig } from '../config/sports';
import { useSportStore } from '../store';
import { MediaPickerModal } from './MediaPickerModal';

export interface PartnerCreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  permissions?: {
    can_create_events?: boolean;
    can_edit_events?: boolean;
    can_publish_events?: boolean;
    can_set_pricing?: boolean;
    can_select_competitions?: boolean;
    can_select_categories?: boolean;
  };
  onEventCreated: (newEventId: string) => void;
}

export function PartnerCreateEventModal({
  isOpen,
  onClose,
  clubId,
  clubName,
  permissions = {},
  onEventCreated
}: PartnerCreateEventModalProps) {
  const { sports = [], fetchSports } = useSportStore();

  useEffect(() => {
    fetchSports?.();
  }, [fetchSports]);

  // Permission flags (default to true if not explicitly restricted)
  const canPublish = permissions.can_publish_events ?? true;
  const canSetPricing = permissions.can_set_pricing ?? true;
  const canSelectComps = permissions.can_select_competitions ?? true;
  const canSelectCats = permissions.can_select_categories ?? true;

  // Form State
  const [sport, setSport] = useState<string>('football');
  const [slot1, setSlot1] = useState<string>(clubName || '');
  const [slot2, setSlot2] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [eventDate, setEventDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [eventTime, setEventTime] = useState<string>('15:00');
  const [competitionId, setCompetitionId] = useState<string>('');
  const [accessType, setAccessType] = useState<'free' | 'ppv'>('free');
  const [ppvPrice, setPpvPrice] = useState<string>('2.50');
  const [publishImmediately, setPublishImmediately] = useState(canPublish);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // Auxiliary data
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [loadingComps, setLoadingComps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Sport Config
  const activeSportConfig: SportConfig = useMemo(() => {
    return getSportConfig(sport, sports) || getSportConfig('football')!;
  }, [sport, sports]);

  const isPairSport = activeSportConfig.participants.type === 'players_or_pairs';
  const isCombatSport = activeSportConfig.participants.type === 'combatants';

  const slot1Label = activeSportConfig.participants.slot1Label || (isPairSport ? 'Player or Pair 1' : isCombatSport ? 'Fighter 1' : 'Home Team');
  const slot2Label = activeSportConfig.participants.slot2Label || (isPairSport ? 'Player or Pair 2' : isCombatSport ? 'Fighter 2' : 'Away Team');
  const slot1Placeholder = activeSportConfig.participants.slot1Placeholder || (isPairSport ? 'e.g. Player A' : isCombatSport ? 'e.g. Fighter A' : 'e.g. Home Club');
  const slot2Placeholder = activeSportConfig.participants.slot2Placeholder || (isPairSport ? 'e.g. Player B' : isCombatSport ? 'e.g. Fighter B' : 'e.g. Away Club');

  // Load competitions if allowed
  useEffect(() => {
    if (!canSelectComps) return;
    setLoadingComps(true);
    fetch('/api/competitions')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompetitions(data);
        }
      })
      .catch((err) => console.error('Error loading competitions:', err))
      .finally(() => setLoadingComps(false));
  }, [canSelectComps]);

  // Filter competitions matching selected sport
  const eligibleCompetitions = useMemo(() => {
    return competitions.filter((c) => {
      if (!c.is_active && c.isActive === 0) return false;
      if (!c.sport) return true; // generic competitions
      return String(c.sport).toLowerCase() === String(sport).toLowerCase();
    });
  }, [competitions, sport]);

  // Automatically update slot 1 if team sport and clubName exists
  useEffect(() => {
    if (!isPairSport && !isCombatSport && clubName && !slot1) {
      setSlot1(clubName);
    }
  }, [clubName, isPairSport, isCombatSport, slot1]);

  // Auto-calculated title preview
  const computedTitle = useMemo(() => {
    const s1 = slot1.trim();
    const s2 = slot2.trim();
    if (s1 && s2) {
      return `${s1} vs ${s2}`;
    }
    if (s1) return `${s1} Broadcast`;
    return `New ${activeSportConfig.name} Event`;
  }, [slot1, slot2, activeSportConfig.name]);

  const finalTitle = useCustomTitle && customTitle.trim() ? customTitle.trim() : computedTitle;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const s1 = slot1.trim();
    const s2 = slot2.trim();

    if (!s1 || !s2) {
      setError(`Please specify both participants: ${slot1Label} and ${slot2Label}.`);
      return;
    }

    if (!eventDate || !eventTime) {
      setError('Please select an event scheduled date and time.');
      return;
    }

    const scheduledDateTime = new Date(`${eventDate}T${eventTime}:00`);
    if (isNaN(scheduledDateTime.getTime())) {
      setError('Invalid date or time provided.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication session expired. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: finalTitle,
        sport,
        club_id: String(clubId),
        clubId: String(clubId),
        date: scheduledDateTime.toISOString(),
        start_time: scheduledDateTime.toISOString().slice(0, 19).replace('T', ' '),
        competition_id: canSelectComps && competitionId ? competitionId : null,
        access: canSetPricing && accessType === 'ppv' ? 'paid' : 'free',
        access_type: canSetPricing && accessType === 'ppv' ? 'ppv' : 'free',
        ppv_price: canSetPricing && accessType === 'ppv' ? Number(ppvPrice) || 0 : 0,
        price: canSetPricing && accessType === 'ppv' ? Number(ppvPrice) || 0 : 0,
        publish_status: canPublish ? (publishImmediately ? 'published' : 'draft') : 'draft',
        stream_provider: 'mux',
        status: 'upcoming',
        description: description.trim() || null,
        thumbnail: posterUrl.trim() || null,
        poster: posterUrl.trim() || null,
      };

      if (isPairSport) {
        payload.player_pair_1 = s1;
        payload.player_pair_2 = s2;
        payload.playerPair1 = s1;
        payload.playerPair2 = s2;
        payload.home_team = null;
        payload.away_team = null;
      } else {
        payload.home_team = s1;
        payload.away_team = s2;
        payload.homeTeam = s1;
        payload.awayTeam = s2;
      }

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create event. Please check inputs and try again.');
      }

      const newId = String(data.id);
      onEventCreated(newId);
      onClose();
    } catch (err: any) {
      console.error('Failed to create partner event:', err);
      setError(err.message || 'An error occurred while creating the event.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableSports = [
    { id: 'football', name: 'Football', icon: '⚽' },
    { id: 'basketball', name: 'Basketball', icon: '🏀' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' },
    { id: 'boxing', name: 'Boxing & MMA', icon: '🥊' },
    ...sports.filter((s: any) => !['football', 'basketball', 'tennis', 'boxing'].includes(s.id)).map((s: any) => ({
      id: s.id || s.slug,
      name: s.name,
      icon: '🏆'
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Event for {clubName}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your sport and schedule. Broadcasting will automatically use your club's permanent Mux live stream channel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. SPORT SELECTION */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Sport
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableSports.map((s) => {
                const isSelected = sport === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setSport(s.id);
                      if (s.id === 'tennis') {
                        setSlot1('');
                        setSlot2('');
                      } else if (!slot1) {
                        setSlot1(clubName);
                      }
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-xs truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DYNAMIC PARTICIPANTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {slot1Label} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={slot1}
                onChange={(e) => setSlot1(e.target.value)}
                placeholder={slot1Placeholder}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {slot2Label} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={slot2}
                onChange={(e) => setSlot2(e.target.value)}
                placeholder={slot2Placeholder}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* TITLE OVERRIDE OPTION */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Event Title: <span className="text-amber-600 dark:text-amber-400 font-semibold">{finalTitle}</span>
              </span>
              <button
                type="button"
                onClick={() => setUseCustomTitle(!useCustomTitle)}
                className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
              >
                {useCustomTitle ? 'Auto-generate from participants' : 'Customize title'}
              </button>
            </div>
            {useCustomTitle && (
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Grand Final: Team A vs Team B"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* 3. SCHEDULE DATE & TIME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Date <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-500" />
                <span>Kick-off / Start Time <span className="text-red-500">*</span></span>
              </label>
              <input
                type="time"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 4. COMPETITION (If permitted) */}
          {canSelectComps && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Competition / League / Tournament</span>
              </label>
              <select
                value={competitionId}
                onChange={(e) => setCompetitionId(e.target.value)}
                disabled={loadingComps}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              >
                <option value="">No competition (Friendly / Independent Event)</option>
                {eligibleCompetitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {comp.season ? `(${comp.season})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. MONETIZATION & PPV PRICING */}
          {canSetPricing ? (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Monetization & Access Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  accessType === 'free'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="accessType"
                    checked={accessType === 'free'}
                    onChange={() => setAccessType('free')}
                    className="sr-only"
                  />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs">Free to Watch</span>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  accessType === 'ppv'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-800 dark:text-violet-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="accessType"
                    checked={accessType === 'ppv'}
                    onChange={() => setAccessType('ppv')}
                    className="sr-only"
                  />
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-xs">Pay-Per-View (PPV)</span>
                </label>
              </div>

              {accessType === 'ppv' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PPV Price (£)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">£</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0.50"
                      value={ppvPrice}
                      onChange={(e) => setPpvPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Revenue split according to your club policy will apply automatically upon viewer purchase.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Event will be published as Free Broadcast based on your club permissions.</span>
            </div>
          )}

          {/* 6. PUBLISH VISIBILITY */}
          {canPublish ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Publish Immediately
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {publishImmediately
                    ? 'Event page is public and ready for countdown / broadcasting'
                    : 'Saved as private draft; publish later when ready'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-600"
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Event will be created in Draft status for administrator approval before going live.
            </div>
          )}

          {/* 7. OPTIONAL POSTER / THUMBNAIL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Thumbnail / Poster Image (Optional)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Choose from Library / Upload
              </button>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://... image URL (or click Choose from Library)"
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
              {posterUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <img src={posterUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* 8. DESCRIPTION */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Event Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key match notes, team news, or venue details..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Event...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Event & Link Broadcast</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => {
            setPosterUrl(url);
            setShowMediaPicker(false);
          }}
        />
      )}
    </div>
  );
}
