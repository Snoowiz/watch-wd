import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Plus, Calendar, Trophy, Tag, DollarSign, Image as ImageIcon,
  Loader2, Sparkles, AlertCircle, CheckCircle2, Shield, Radio, Check,
  CreditCard, ChevronDown, Search
} from 'lucide-react';
import { SPORTS_REGISTRY, getSportConfig, SportConfig } from '../config/sports';
import { useSportStore } from '../store';
import { MediaPickerModal } from './MediaPickerModal';
import { TypeaheadInput, TypeaheadOption } from './TypeaheadInput';
import { getSportEmoji } from './SportIconPicker';

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
  // Only sports marked Active in Admin > Sports (public /api/sports, in admin display order)
  const { activeSports: sports = [], fetchActiveSports } = useSportStore();

  useEffect(() => {
    fetchActiveSports?.();
  }, [fetchActiveSports]);

  const canPublish = permissions.can_publish_events ?? true;
  const canSetPricing = permissions.can_set_pricing ?? true;
  const canSelectComps = permissions.can_select_competitions ?? true;

  // --- Form state ---
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
  const [accessType, setAccessType] = useState<'free' | 'ppv' | 'plan'>('free');
  const [ppvPrice, setPpvPrice] = useState<string>('2.50');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [publishImmediately, setPublishImmediately] = useState(canPublish);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // --- Competition state ---
  const [competitionId, setCompetitionId] = useState<string>('');
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  // Custom competition creation
  const [customCompName, setCustomCompName] = useState<string>('');
  const [clubCustomComps, setClubCustomComps] = useState<any[]>([]);
  const [loadingCustomComps, setLoadingCustomComps] = useState(false);
  const [showCustomSuggestions, setShowCustomSuggestions] = useState(false);
  const customCompRef = useRef<HTMLDivElement>(null);

  // --- Club subscription plans ---
  const [clubPlans, setClubPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // --- UI state ---
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active sport config
  const activeSportConfig: SportConfig = useMemo(() => {
    return getSportConfig(sport, sports) || getSportConfig('football')!;
  }, [sport, sports]);

  const isPairSport = activeSportConfig.participants.type === 'players_or_pairs';
  const isCombatSport = activeSportConfig.participants.type === 'combatants';
  const slot1Label = activeSportConfig.participants.slot1Label || (isPairSport ? 'Player or Pair 1' : isCombatSport ? 'Fighter 1' : 'Home Team');
  const slot2Label = activeSportConfig.participants.slot2Label || (isPairSport ? 'Player or Pair 2' : isCombatSport ? 'Fighter 2' : 'Away Team');
  const slot1Placeholder = activeSportConfig.participants.slot1Placeholder || (isPairSport ? 'e.g. Player A' : isCombatSport ? 'e.g. Fighter A' : 'e.g. Home Club');
  const slot2Placeholder = activeSportConfig.participants.slot2Placeholder || (isPairSport ? 'e.g. Player B' : isCombatSport ? 'e.g. Fighter B' : 'e.g. Away Club');

  // Load platform competitions
  useEffect(() => {
    if (!canSelectComps) return;
    setLoadingComps(true);
    fetch('/api/competitions')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCompetitions(d); })
      .catch(() => {})
      .finally(() => setLoadingComps(false));
  }, [canSelectComps]);

  // Load club custom competitions
  useEffect(() => {
    if (!canSelectComps || !clubId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingCustomComps(true);
    fetch(`/api/clubs/${clubId}/custom-competitions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setClubCustomComps(d); })
      .catch(() => {})
      .finally(() => setLoadingCustomComps(false));
  }, [canSelectComps, clubId]);

  // Load club subscription plans when plan access type selected
  useEffect(() => {
    if (accessType !== 'plan' || !clubId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingPlans(true);
    fetch(`/api/clubs/${clubId}/plans`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setClubPlans(d); })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, [accessType, clubId]);

  // --- Participant typeahead sources: platform clubs + names used in past matches ---
  const [platformClubs, setPlatformClubs] = useState<any[]>([]);
  const [pastMatches, setPastMatches] = useState<any[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/clubs/active')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPlatformClubs(d); })
      .catch(() => {});
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPastMatches(d); })
      .catch(() => {});
  }, [isOpen]);

  const participantOptions: TypeaheadOption[] = useMemo(() => {
    const seen = new Map<string, TypeaheadOption>();
    const add = (name: any, opt: Partial<TypeaheadOption> = {}) => {
      const label = typeof name === 'string' ? name.trim() : '';
      if (!label) return;
      const k = label.toLowerCase();
      if (seen.has(k)) {
        const prev = seen.get(k)!;
        if (!prev.logo && opt.logo) prev.logo = opt.logo;
        return;
      }
      seen.set(k, { key: k, label, ...opt });
    };
    // Registered clubs only make sense as suggestions for team sports
    if (!isPairSport && !isCombatSport) {
      platformClubs.forEach(c => add(c.name, { logo: c.logo, hint: 'Club' }));
    }
    const sportKey = String(sport).toLowerCase();
    pastMatches
      .filter(m => !m.sport || String(m.sport).toLowerCase() === sportKey)
      .forEach(m => {
        if (isPairSport) {
          add(m.player_pair_1 ?? m.playerPair1); add(m.player_pair_2 ?? m.playerPair2);
        } else {
          add(m.home_team ?? m.homeTeam, { logo: m.home_logo ?? m.homeLogo });
          add(m.away_team ?? m.awayTeam, { logo: m.away_logo ?? m.awayLogo });
        }
      });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [platformClubs, pastMatches, sport, isPairSport, isCombatSport]);

  // Filtered competitions for selected sport
  const eligibleCompetitions = useMemo(() => {
    return competitions.filter(c => {
      if (Number(c.is_active) === 0) return false;
      if (!c.sport) return true;
      return String(c.sport).toLowerCase() === String(sport).toLowerCase();
    });
  }, [competitions, sport]);

  const eligibleCustomComps = useMemo(() => {
    return clubCustomComps.filter(c => {
      if (!c.sport) return true;
      return String(c.sport).toLowerCase() === String(sport).toLowerCase();
    });
  }, [clubCustomComps, sport]);

  // Live suggestions: matches what user typed so far
  const customCompSuggestions = useMemo(() => {
    if (!customCompName.trim()) return eligibleCustomComps;
    const q = customCompName.toLowerCase();
    return eligibleCustomComps.filter(c => c.name.toLowerCase().includes(q));
  }, [customCompName, eligibleCustomComps]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customCompRef.current && !customCompRef.current.contains(e.target as Node)) {
        setShowCustomSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const availableSports = useMemo(() => {
    const builtInIcons: Record<string, string> = { football: '⚽', basketball: '🏀', tennis: '🎾', boxing: '🥊' };
    return (sports as any[])
      .filter(s => s.is_active === undefined || s.is_active === true || Number(s.is_active) === 1)
      .map(s => {
        const id = String(s.id || s.slug);
        // DB default icon is a word like "Trophy" (not an emoji) — ignore plain-word icons
        const dbIcon = s.icon && !/^[A-Za-z\s-]+$/.test(String(s.icon)) ? String(s.icon) : null;
        return { id, name: s.name, icon: builtInIcons[id] || getSportEmoji({ id, slug: s.slug, icon: dbIcon }) };
      });
  }, [sports]);

  // If the selected sport is not active (e.g. default Football was deactivated), pick the first active one
  useEffect(() => {
    if (availableSports.length > 0 && !availableSports.some(s => s.id === sport)) {
      setSport(availableSports[0].id);
    }
  }, [availableSports, sport]);

  // Auto-fill slot1 with clubName for team sports
  useEffect(() => {
    if (!isPairSport && !isCombatSport && clubName && !slot1) {
      setSlot1(clubName);
    }
  }, [clubName, isPairSport, isCombatSport, slot1]);

  const computedTitle = useMemo(() => {
    const s1 = slot1.trim(), s2 = slot2.trim();
    if (s1 && s2) return `${s1} vs ${s2}`;
    if (s1) return `${s1} Broadcast`;
    return `New ${activeSportConfig.name} Event`;
  }, [slot1, slot2, activeSportConfig.name]);

  const finalTitle = useCustomTitle && customTitle.trim() ? customTitle.trim() : computedTitle;

  if (!isOpen) return null;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const s1 = slot1.trim(), s2 = slot2.trim();
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
    if (canSetPricing && accessType === 'plan' && !selectedPlanId) {
      setError('Please select a subscription plan for this event.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication session expired. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      // If creating a custom competition, do that first
      let resolvedCompetitionId: string | null = canSelectComps && competitionId && competitionId !== '__custom__' ? competitionId : null;
      if (canSelectComps && competitionId === '__custom__' && customCompName.trim()) {
        const compRes = await fetch(`/api/clubs/${clubId}/custom-competitions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: customCompName.trim(), sport })
        });
        const compData = await compRes.json().catch(() => null);
        if (!compRes.ok) throw new Error(compData?.error || 'Failed to create custom competition.');
        resolvedCompetitionId = compData.id;
        // Add to local list for future uses
        setClubCustomComps(prev => [...prev, compData]);
      }

      const isPaywall = canSetPricing && (accessType === 'ppv' || accessType === 'plan');
      const payload: Record<string, any> = {
        title: finalTitle,
        sport,
        club_id: String(clubId),
        clubId: String(clubId),
        date: scheduledDateTime.toISOString(),
        start_time: scheduledDateTime.toISOString().slice(0, 19).replace('T', ' '),
        competition_id: resolvedCompetitionId,
        access: isPaywall ? 'paid' : 'free',
        access_type: canSetPricing ? (accessType === 'ppv' ? 'ppv' : accessType === 'plan' ? 'plan' : 'free') : 'free',
        ppv_price: canSetPricing && accessType === 'ppv' ? Number(ppvPrice) || 0 : 0,
        price: canSetPricing && accessType === 'ppv' ? Number(ppvPrice) || 0 : 0,
        required_plan_id: canSetPricing && accessType === 'plan' ? selectedPlanId || null : null,
        publish_status: canPublish ? (publishImmediately ? 'published' : 'draft') : 'draft',
        stream_provider: 'mux',
        status: 'upcoming',
        description: description.trim() || null,
        thumbnail: posterUrl.trim() || null,
        poster: posterUrl.trim() || null,
      };

      if (isPairSport) {
        payload.player_pair_1 = s1; payload.player_pair_2 = s2;
        payload.playerPair1 = s1; payload.playerPair2 = s2;
        payload.home_team = null; payload.away_team = null;
      } else {
        payload.home_team = s1; payload.away_team = s2;
        payload.homeTeam = s1; payload.awayTeam = s2;
      }

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to create event. Please check inputs and try again.');

      onEventCreated(String(data.id));
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl my-6 flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
      >
        {/* Sticky Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} id="partner-create-event-form" className="p-6 space-y-6">
            {/* 1. SPORT */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select Sport
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableSports.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setSport(s.id);
                      if (s.id === 'tennis') { setSlot1(''); setSlot2(''); }
                      else if (!slot1) setSlot1(clubName);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      sport === s.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-xs truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. PARTICIPANTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {slot1Label} <span className="text-red-500">*</span>
                </label>
                <TypeaheadInput
                  required value={slot1} onChange={setSlot1}
                  placeholder={slot1Placeholder}
                  options={participantOptions.filter(o => o.label.toLowerCase() !== slot2.trim().toLowerCase())}
                  heading={isPairSport || isCombatSport ? 'Existing participants' : 'Existing clubs & teams'}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {slot2Label} <span className="text-red-500">*</span>
                </label>
                <TypeaheadInput
                  required value={slot2} onChange={setSlot2}
                  placeholder={slot2Placeholder}
                  options={participantOptions.filter(o => o.label.toLowerCase() !== slot1.trim().toLowerCase())}
                  heading={isPairSport || isCombatSport ? 'Existing participants' : 'Existing clubs & teams'}
                />
              </div>
            </div>

            {/* TITLE OVERRIDE */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Event Title: <span className="text-amber-600 dark:text-amber-400 font-semibold">{finalTitle}</span>
                </span>
                <button type="button" onClick={() => setUseCustomTitle(!useCustomTitle)} className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline">
                  {useCustomTitle ? 'Auto-generate from participants' : 'Customize title'}
                </button>
              </div>
              {useCustomTitle && (
                <input
                  type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Grand Final: Team A vs Team B"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              )}
            </div>

            {/* 3. SCHEDULE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Date <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-500" />
                  <span>Kick-off / Start Time <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="time" required value={eventTime} onChange={e => setEventTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 4. COMPETITION */}
            {canSelectComps && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Competition / League / Tournament</span>
                </label>
                <select
                  value={competitionId}
                  onChange={e => {
                    setCompetitionId(e.target.value);
                    if (e.target.value !== '__custom__') setCustomCompName('');
                  }}
                  disabled={loadingComps}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                >
                  <option value="">No competition (Friendly / Independent Event)</option>
                  {eligibleCompetitions.length > 0 && (
                    <optgroup label="Platform Competitions">
                      {eligibleCompetitions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.season ? ` (${c.season})` : ''}</option>
                      ))}
                    </optgroup>
                  )}
                  {eligibleCustomComps.length > 0 && (
                    <optgroup label="Your Custom Competitions">
                      {eligibleCustomComps.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__custom__">＋ Create custom competition…</option>
                </select>

                {/* Custom competition input with live suggestions */}
                {competitionId === '__custom__' && (
                  <div ref={customCompRef} className="relative mt-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={customCompName}
                        onChange={e => { setCustomCompName(e.target.value); setShowCustomSuggestions(true); }}
                        onFocus={() => setShowCustomSuggestions(true)}
                        placeholder="Type a name or pick an existing custom competition…"
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                        autoFocus
                      />
                    </div>
                    {showCustomSuggestions && customCompSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                          Existing custom competitions
                        </div>
                        {customCompSuggestions.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              // Pick an existing custom competition
                              setCompetitionId(c.id);
                              setCustomCompName('');
                              setShowCustomSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2"
                          >
                            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {customCompName.trim() && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        A new competition "<span className="font-semibold text-amber-600">{customCompName.trim()}</span>" will be saved when you create this event.
                      </p>
                    )}
                    {loadingCustomComps && (
                      <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading custom competitions…
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. MONETIZATION */}
            {canSetPricing ? (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Monetization &amp; Access Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Free */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    accessType === 'free'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}>
                    <input type="radio" name="accessType" checked={accessType === 'free'} onChange={() => setAccessType('free')} className="sr-only" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs">Free to Watch</span>
                  </label>

                  {/* PPV */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    accessType === 'ppv'
                      ? 'border-violet-500 bg-violet-500/10 text-violet-800 dark:text-violet-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}>
                    <input type="radio" name="accessType" checked={accessType === 'ppv'} onChange={() => setAccessType('ppv')} className="sr-only" />
                    <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                    <span className="text-xs">Pay-Per-View (PPV)</span>
                  </label>

                  {/* Subscription Plan */}
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    accessType === 'plan'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}>
                    <input type="radio" name="accessType" checked={accessType === 'plan'} onChange={() => setAccessType('plan')} className="sr-only" />
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs">Subscription Plan</span>
                  </label>
                </div>

                {/* PPV price */}
                {accessType === 'ppv' && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">PPV Price (£)</label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">£</span>
                      <input
                        type="number" step="0.50" min="0.50" value={ppvPrice} onChange={e => setPpvPrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Revenue split according to your club policy will apply automatically upon viewer purchase.</p>
                  </div>
                )}

                {/* Subscription plan selector */}
                {accessType === 'plan' && (
                  <div className="pt-2 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subscription Plan <span className="text-red-500">*</span>
                    </label>
                    {loadingPlans ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading plans…
                      </div>
                    ) : clubPlans.length === 0 ? (
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>No subscription plans are set up for this club yet. Ask an admin to create club plans in <strong>Admin &gt; Club Management</strong>.</span>
                      </div>
                    ) : (
                      <select
                        value={selectedPlanId}
                        onChange={e => setSelectedPlanId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      >
                        <option value="">Select a plan…</option>
                        {clubPlans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — £{Number(p.price).toFixed(2)} / {p.duration_days}d
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-slate-400">Subscribers with an active plan for this club will get automatic access.</p>
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
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Publish Immediately</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {publishImmediately ? 'Event page is public and ready for countdown / broadcasting' : 'Saved as private draft; publish later when ready'}
                  </span>
                </div>
                <input
                  type="checkbox" checked={publishImmediately} onChange={e => setPublishImmediately(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-600"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Event will be created in Draft status for administrator approval before going live.
              </div>
            )}

            {/* 7. THUMBNAIL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Thumbnail / Poster Image (Optional)</span>
                </span>
                <button type="button" onClick={() => setShowMediaPicker(true)} className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline">
                  Choose from Library / Upload
                </button>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="url" value={posterUrl} onChange={e => setPosterUrl(e.target.value)}
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
                rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Add key match notes, team news, or venue details..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl">
          <button
            type="button" onClick={onClose} disabled={submitting}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit" form="partner-create-event-form" disabled={submitting}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 text-xs disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating Event...</span></>
            ) : (
              <><Plus className="w-4 h-4" /><span>Create Event &amp; Link Broadcast</span></>
            )}
          </button>
        </div>
      </div>

      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => { setPosterUrl(url); setShowMediaPicker(false); }}
        />
      )}
    </div>
  );
}
