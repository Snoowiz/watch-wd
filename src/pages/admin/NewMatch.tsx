import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMatchStore, useCategoryStore, useSettingsStore, Match, useAdStore, useMediaStore } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { 
  Save, X, Image as ImageIcon, Globe, Lock, DollarSign, 
  Calendar, Tag, ChevronRight, Eye, Code, Layout, Type, Plus, 
  MessageSquare, Clock, Loader2, Play, Video, Info, CheckCircle, 
  ExternalLink, Sparkles, Layers, FileText, Check, Shield, HelpCircle,
  Trophy, Building2
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MediaPicker } from '../../components/MediaPicker';
import { compressImage } from '../../lib/imageCompressor';
import { formatStreamHtml, loadMuxPlayerIfNeeded } from '../../utils/embedHelper';
import { formatMatchStatus } from '../../utils/statusHelper';
import { 
  DEFAULT_PRIMARY_COLOR, 
  DEFAULT_SECONDARY_COLOR, 
  DEFAULT_BUTTON_TEXT_COLOR, 
  getContrastTextColor 
} from '../../utils/themeColors';

type TabId = 'details' | 'video' | 'pricing' | 'promotion' | 'review';

export function NewMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches = [], addMatch, updateMatch } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const { currency, currencySymbol = '£', siteColorSettings } = useSettingsStore();
  
  // Platform Dynamic Theme Engine
  const primaryColor = siteColorSettings?.primaryColor || DEFAULT_PRIMARY_COLOR;
  const buttonTextColor = siteColorSettings?.buttonTextColor || getContrastTextColor(primaryColor);
  const secondaryColor = siteColorSettings?.secondaryColor || DEFAULT_SECONDARY_COLOR;

  // Reusable dynamic style definitions
  const primaryButtonStyle: React.CSSProperties = { 
    backgroundColor: primaryColor, 
    color: buttonTextColor,
    boxShadow: `0 4px 14px ${primaryColor}35`
  };
  const activeTabStyle: React.CSSProperties = { 
    backgroundColor: primaryColor, 
    color: buttonTextColor,
    boxShadow: `0 4px 16px ${primaryColor}40`
  };
  const primaryBadgeStyle: React.CSSProperties = { 
    backgroundColor: `${primaryColor}18`, 
    color: primaryColor, 
    borderColor: `${primaryColor}40` 
  };

  const isEditing = !!id;
  const existingMatch = isEditing ? matches.find(m => String(m.id) === String(id)) : null;

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabId>('details');

  // Form states
  const [title, setTitle] = useState(existingMatch?.title || '');
  const [slug, setSlug] = useState(existingMatch?.slug || '');
  const [content, setContent] = useState(existingMatch?.content || '');
  const [description, setDescription] = useState(existingMatch?.description || '');
  const [thumbnail, setThumbnail] = useState(existingMatch?.thumbnail || '');
  const [status, setStatus] = useState<Match['status']>(
    existingMatch?.status === 'completed' ? 'full_match' : (existingMatch?.status || 'upcoming')
  );
  const [accessType, setAccessType] = useState<'free' | 'ppv' | 'plan'>(existingMatch?.access_type || 'free');
  const [ppvPrice, setPpvPrice] = useState(existingMatch?.ppv_price || 50);
  const [requiredPlanId, setRequiredPlanId] = useState<string | number | null>(existingMatch?.required_plan_id || null);
  const [clubId, setClubId] = useState<string | null>(existingMatch?.club_id || (existingMatch as any)?.clubId || null);
  const [competitionId, setCompetitionId] = useState<string | null>(existingMatch?.competition_id || (existingMatch as any)?.competitionId || null);
  const [streamProvider, setStreamProvider] = useState<'youtube' | 'mux' | 'custom'>(
    existingMatch?.stream_provider || 
    (existingMatch?.description?.toLowerCase().includes('mux') ? 'mux' : 'youtube')
  );
  const [plans, setPlans] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);

  const [adSettingsEnabled, setAdSettingsEnabled] = useState(existingMatch?.adSettings?.enabled ?? true);
  const [adFrequencyOverride, setAdFrequencyOverride] = useState(existingMatch?.adSettings?.frequencyOverride || '');
  const [adCampaignIds, setAdCampaignIds] = useState<number[]>(existingMatch?.adSettings?.campaignIds || []);

  const { ads = [] } = useAdStore();

  const safeIsoDateSlice = (val: any): string => {
    if (!val || val === 'Invalid Date') return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  };

  const resolveValidIsoDate = (val: any): string | null => {
    if (!val || val === 'Invalid Date') return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const [selectedCategories, setSelectedCategories] = useState<any[]>((existingMatch?.categories || []).map((c: any) => Number(c)));
  const [seo, setSeo] = useState(existingMatch?.seo || { keywords: '', metaDescription: '' });
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>(existingMatch?.scheduledDate ? 'scheduled' : 'now');
  const [scheduledDate, setScheduledDate] = useState(existingMatch?.scheduledDate || '');
  const [customDate, setCustomDate] = useState(safeIsoDateSlice(existingMatch?.date || (existingMatch as any)?.start_time || (existingMatch as any)?.startTime));
  const [liveCommenting, setLiveCommenting] = useState(existingMatch?.liveCommenting ?? true);
  const [commentAlignment, setCommentAlignment] = useState<'left' | 'center' | 'right'>(existingMatch?.commentAlignment || 'center');
  const [duration, setDuration] = useState<number>(existingMatch?.duration || 120);

  // Event Access Duration System
  const [eventAccessEnabled, setEventAccessEnabled] = useState(
    Boolean(Number(existingMatch?.event_access_enabled ?? (existingMatch as any)?.eventAccessEnabled ?? 0))
  );
  const [eventAccessPreset, setEventAccessPreset] = useState<'3d' | '7d' | '30d' | '1y' | 'custom'>(
    (existingMatch?.event_access_duration_label as any) || '3d'
  );
  const [customDurationVal, setCustomDurationVal] = useState<number>(24);
  const [customDurationUnit, setCustomDurationUnit] = useState<'hours' | 'days'>('hours');
  
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast, updateToast } = useUIStore();

  const [isManualOverride, setIsManualOverride] = useState(
    existingMatch?.status === 'completed' || existingMatch?.status === 'full_match' || existingMatch?.status === 'live' || existingMatch?.status === 'highlights'
  );

  // Fetch plans and clubs
  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(console.error);

    fetch('/api/clubs/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setClubs(data);
      })
      .catch(console.error);

    fetch('/api/competitions/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCompetitions(data);
      })
      .catch(console.error);
  }, []);

  // Auto-generate slug from title (only when creating a new match)
  useEffect(() => {
    if (!isEditing && title) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [title, isEditing]);

  // Load platform default event access preset when creating a new match
  useEffect(() => {
    if (!isEditing) {
      fetch('/api/settings/event_access_defaults')
        .then(res => res.json())
        .then(data => {
          if (data?.defaultAccessPreset) {
            setEventAccessPreset(data.defaultAccessPreset);
          }
        })
        .catch(() => {});
    }
  }, [isEditing]);

  // Sync form state when existingMatch loads
  useEffect(() => {
    if (existingMatch) {
      setTitle(existingMatch.title || '');
      setSlug(existingMatch.slug || '');
      setContent(existingMatch.content || '');
      setDescription(existingMatch.description || '');
      setThumbnail(existingMatch.thumbnail || '');
      setStatus(existingMatch.status === 'completed' ? 'full_match' : (existingMatch.status || 'upcoming'));
      setAccessType((existingMatch.access_type || (existingMatch as any).accessType || 'free') as any);
      setPpvPrice(existingMatch.ppv_price || (existingMatch as any).ppvPrice || 50);
      setRequiredPlanId(existingMatch.required_plan_id || (existingMatch as any).requiredPlanId || null);
      setClubId(existingMatch.club_id || (existingMatch as any).clubId || null);
      setCompetitionId(existingMatch.competition_id || (existingMatch as any).competitionId || null);
      setStreamProvider(
        existingMatch.stream_provider || 
        (existingMatch.description?.toLowerCase().includes('mux') ? 'mux' : 'youtube')
      );
      setAdSettingsEnabled(existingMatch.adSettings?.enabled ?? true);
      setAdFrequencyOverride(existingMatch.adSettings?.frequencyOverride || '');
      setAdCampaignIds(existingMatch.adSettings?.campaignIds || []);
      setSelectedCategories((existingMatch.categories || []).map((c: any) => Number(c)));
      setSeo(existingMatch.seo || { keywords: '', metaDescription: '' });
      setPublishMode(existingMatch.scheduledDate ? 'scheduled' : 'now');
      setScheduledDate(existingMatch.scheduledDate || '');
      setCustomDate(safeIsoDateSlice(existingMatch.date || (existingMatch as any)?.start_time || (existingMatch as any)?.startTime));
      setLiveCommenting(existingMatch.liveCommenting ?? true);
      setCommentAlignment(existingMatch.commentAlignment || 'center');
      setDuration(existingMatch.duration || 120);
      setEventAccessEnabled(Boolean(Number(existingMatch.event_access_enabled ?? (existingMatch as any).eventAccessEnabled ?? 0)));
      setEventAccessPreset(((existingMatch.event_access_duration_label || '3d') as any));
      if (existingMatch.status === 'completed' || existingMatch.status === 'full_match' || existingMatch.status === 'live' || existingMatch.status === 'highlights') {
        setIsManualOverride(true);
      }
    }
  }, [existingMatch]);

  useEffect(() => {
    loadMuxPlayerIfNeeded(description);
  }, [description]);

  const getCalculatedStatus = (): 'upcoming' | 'live' | 'full_match' => {
    let targetDateStr = customDate;
    if (!targetDateStr && publishMode === 'scheduled' && scheduledDate) {
      targetDateStr = scheduledDate;
    }
    if (!targetDateStr && existingMatch?.date) {
      targetDateStr = existingMatch.date;
    }
    
    if (!targetDateStr) return 'upcoming';

    const matchMs = new Date(targetDateStr).getTime();
    if (isNaN(matchMs)) return 'upcoming';

    const nowMs = Date.now();
    const durMs = (Number(duration) || 120) * 60 * 1000;

    if (nowMs < matchMs) return 'upcoming';
    if (nowMs >= matchMs && nowMs < matchMs + durMs) return 'live';
    return 'full_match';
  };

  const currentEffectiveStatus = isManualOverride ? status : getCalculatedStatus();

  const handleSave = async () => {
    if (!title || !slug) {
      addToast('Please fill in the title and slug.', 'error');
      setActiveTab('details');
      return;
    }

    setIsSaving(true);
    const toastId = addToast(isEditing ? 'Updating match...' : 'Creating match...', 'loading');

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      let finalDate = resolveValidIsoDate(customDate);
      if (!finalDate && publishMode === 'scheduled' && scheduledDate) {
        finalDate = resolveValidIsoDate(scheduledDate);
      }
      if (!finalDate && isEditing) {
        finalDate = resolveValidIsoDate(existingMatch?.date) ||
                    resolveValidIsoDate((existingMatch as any)?.start_time) ||
                    resolveValidIsoDate((existingMatch as any)?.startTime);
      }
      if (!finalDate) {
        finalDate = new Date().toISOString();
      }

      let finalThumbnail = thumbnail;
      if (thumbnail && thumbnail.startsWith('data:image/')) {
        finalThumbnail = await compressImage(thumbnail);
      }

      const computedStatus = isManualOverride ? status : getCalculatedStatus();

      let calculatedDurationMinutes = 4320;
      if (eventAccessPreset === '3d') calculatedDurationMinutes = 3 * 24 * 60;
      else if (eventAccessPreset === '7d') calculatedDurationMinutes = 7 * 24 * 60;
      else if (eventAccessPreset === '30d') calculatedDurationMinutes = 30 * 24 * 60;
      else if (eventAccessPreset === '1y') calculatedDurationMinutes = 365 * 24 * 60;
      else if (eventAccessPreset === 'custom') {
        calculatedDurationMinutes = customDurationUnit === 'days'
          ? customDurationVal * 24 * 60
          : customDurationVal * 60;
      }

      const matchData: Match = {
        id: (isEditing ? String(id) : String(Date.now())) as any,
        title,
        slug,
        date: finalDate,
        price: accessType === 'ppv' ? ppvPrice : 0,
        access_type: accessType,
        ppv_price: ppvPrice,
        required_plan_id: requiredPlanId,
        club_id: clubId,
        competition_id: competitionId,
        stream_provider: streamProvider,
        embedPrice: ppvPrice * 10,
        status: computedStatus as any,
        duration: Number(duration) || 120,
        event_access_enabled: eventAccessEnabled ? 1 : 0,
        event_access_duration: calculatedDurationMinutes,
        event_access_duration_label: eventAccessPreset,
        thumbnail: finalThumbnail || 'https://picsum.photos/seed/default/800/450',
        content,
        description,
        categories: selectedCategories,
        access: accessType === 'free' ? 'free' : 'paid',
        seo,
        scheduledDate: publishMode === 'now' ? '' : scheduledDate,
        liveCommenting,
        commentAlignment,
        adSettings: {
          enabled: adSettingsEnabled,
          frequencyOverride: adFrequencyOverride ? Number(adFrequencyOverride) : undefined,
          campaignIds: adCampaignIds,
        }
      };

      if (finalThumbnail) {
        useMediaStore.getState().addMedia({
          name: `${title || 'Match'} Thumbnail`,
          url: finalThumbnail,
          type: 'image'
        });
      }

      if (isEditing) {
        await updateMatch(String(id) as any, matchData);
        await useMatchStore.getState().fetchMatches();
        updateToast(toastId, { message: 'Match updated successfully!', type: 'success' });
      } else {
        await addMatch(matchData);
        await useMatchStore.getState().fetchMatches();
        updateToast(toastId, { message: 'Match published successfully!', type: 'success' });
      }

      navigate('/admin/matches');
    } catch (err) {
      console.error('Failed to save match:', err);
      updateToast(toastId, { message: 'Failed to save match. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (catId: any) => {
    const numId = Number(catId);
    setSelectedCategories(prev => 
      prev.some(id => Number(id) === numId) ? prev.filter(id => Number(id) !== numId) : [...prev, numId]
    );
  };

  const selectedCategoryNames = useMemo(() => {
    if (!selectedCategories || selectedCategories.length === 0) return 'None';
    const names = selectedCategories
      .map(id => categories.find(c => Number(c.id) === Number(id))?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'None';
  }, [selectedCategories, categories]);

  const assignedPlanName = useMemo(() => {
    if (!requiredPlanId) return null;
    const found = plans.find(p => String(p.id) === String(requiredPlanId));
    return found ? found.name : `Plan #${requiredPlanId}`;
  }, [requiredPlanId, plans]);

  const assignedClubName = useMemo(() => {
    if (!clubId) return null;
    const found = clubs.find(c => String(c.id) === String(clubId));
    return found ? found.name : `Club #${clubId}`;
  }, [clubId, clubs]);

  const assignedCompetitionName = useMemo(() => {
    if (!competitionId) return null;
    const found = competitions.find(c => String(c.id) === String(competitionId));
    return found ? found.name : `Competition #${competitionId}`;
  }, [competitionId, competitions]);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'video', label: 'Video & broadcast' },
    { id: 'pricing', label: 'Pricing & access' },
    { id: 'promotion', label: 'Promotion' },
    { id: 'review', label: 'Review & publish' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-24 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Top Header Card */}
        <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm dark:shadow-xl mb-6 transition-all">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => navigate('/admin/matches')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              title="Back to Match Management"
            >
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Edit Match' : 'New Match'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              style={isPreviewMode ? primaryBadgeStyle : undefined}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 border ${
                isPreviewMode 
                  ? 'border-current' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={primaryButtonStyle}
              className="disabled:opacity-60 font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs sm:text-sm hover:opacity-90 active:scale-95 shadow-md"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isSaving 
                  ? (isEditing ? 'Updating...' : 'Publishing...') 
                  : (isEditing ? 'Update Match' : 'Post Match')}
              </span>
            </button>
          </div>
        </div>

        {/* Five Navigation Tabs */}
        <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-2 flex gap-2 overflow-x-auto no-scrollbar shadow-sm dark:shadow-lg mb-8 transition-all">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={isActive ? activeTabStyle : undefined}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-center transition-all ${
                  isActive
                    ? ''
                    : 'bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-950/40 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Section Header Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTab === 'details' && 'Details'}
              {activeTab === 'video' && 'Video & broadcast'}
              {activeTab === 'pricing' && 'Pricing & access'}
              {activeTab === 'promotion' && 'Promotion'}
              {activeTab === 'review' && 'Review & publish'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === 'details' && 'Basic match information, description, cover image and existing categories.'}
              {activeTab === 'video' && 'Existing video provider, stream embed, match timing, status and comments.'}
              {activeTab === 'pricing' && 'Existing viewing access, PPV, subscription, club association and timed access.'}
              {activeTab === 'promotion' && 'Search metadata and current match advertising controls.'}
              {activeTab === 'review' && 'Read-only summary of current form values with existing publication controls.'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest self-start sm:self-end">
            LAYOUT REFERENCE · CURRENT FIELDS ONLY
          </span>
        </div>

        {/* ===================== TAB 1: DETAILS ===================== */}
        {activeTab === 'details' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Match Details & Rich Text Editor */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Layout className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Match details</h3>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Match title
                  </label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Home Club v Away Club"
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
                  />
                </div>

                {/* Permalink / Slug */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Permalink / slug
                  </label>
                  <div className="flex items-center bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus-within:border-[var(--primary-500)] focus-within:ring-1 focus-within:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-sm transition-colors">
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs select-none shrink-0">
                      https://watchwds.com/matches/
                    </span>
                    <input 
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      onBlur={() => setSlug(prev => prev.replace(/(^-|-$)/g, '').replace(/-+/g, '-'))}
                      placeholder="home-club-v-away-club"
                      style={{ color: primaryColor }}
                      className="bg-transparent border-none font-mono text-xs font-bold focus:ring-0 p-0 flex-1 ml-1 outline-none"
                    />
                  </div>
                </div>

                {/* Content Type & Sport Row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Content type
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                      id="select-content-type"
                    >
                      <option value="upcoming">Upcoming Match</option>
                      <option value="live">Live broadcast</option>
                      <option value="full_match">Full Match</option>
                      <option value="highlights">Highlights</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Sport
                    </label>
                    <select
                      value={selectedCategories[0] || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val) {
                          setSelectedCategories(prev => prev.includes(val) ? prev : [val, ...prev.filter(id => id !== val)]);
                        }
                      }}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                      id="select-primary-sport"
                    >
                      <option value="">Select sport / category...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clubs / Organisation Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Clubs / organisation
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">Optional</span>
                  </div>
                  <select
                    value={clubId || ''}
                    onChange={(e) => setClubId(e.target.value ? e.target.value : null)}
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                    id="select-match-club"
                  >
                    <option value="">No club or organisation assigned</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.stripe_account_id ? '• Partner' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Assigning a club displays club branding and enables filtering. Does not alter billing or payouts unless set as PPV.
                  </p>
                </div>

                {/* Competition Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-slate-400" />
                      Competition
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">Optional</span>
                  </div>
                  <select
                    value={competitionId || ''}
                    onChange={(e) => setCompetitionId(e.target.value ? e.target.value : null)}
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                    id="select-match-competition"
                  >
                    <option value="">No competition assigned</option>
                    {competitions.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.season ? `(${comp.season})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Assigning a competition links this match to tournament schedules and enables competition filters.
                  </p>
                </div>

                {/* Rich Text Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <div className="prose-editor border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-950/40 transition-colors">
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      placeholder="Add a short introduction for supporters..."
                      className="bg-white dark:bg-slate-950/40 text-slate-900 dark:text-slate-100"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['link', 'image', 'video'],
                          ['clean']
                        ],
                      }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1">
                  Existing ReactQuill editor, formatting and saved content remain unchanged.
                </p>
              </div>
            </div>

            {/* Right Column: Thumbnail & Categories */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Match Thumbnail Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <ImageIcon className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Match thumbnail</h3>
                </div>

                <div
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full relative aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800/80 hover:border-[var(--primary-500)] bg-slate-50/80 dark:bg-slate-950/40 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center p-4 group"
                >
                  {thumbnail ? (
                    <>
                      <img src={thumbnail} alt="Match Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <p style={primaryButtonStyle} className="text-xs font-bold px-3 py-1.5 rounded-lg shadow">Change Image</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setThumbnail('');
                          }}
                          className="text-[11px] text-red-400 hover:text-red-300 font-semibold underline"
                        >
                          Remove thumbnail
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
                      <Plus className="w-8 h-8 mb-2 text-slate-400 group-hover:scale-110 transition-transform" style={{ color: primaryColor }} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        Select from existing media library
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">16:9 cover image</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Preserve existing MediaPicker and 16:9 preview.
                </p>
              </div>

              {/* Categories Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Tag className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Categories</h3>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {categories.map((cat) => {
                    const isChecked = selectedCategories.some(id => Number(id) === Number(cat.id));
                    return (
                      <label 
                        key={cat.id} 
                        style={isChecked ? { backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}40` } : undefined}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked 
                            ? 'text-slate-900 dark:text-white shadow-xs' 
                            : 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat.id)}
                          style={{ accentColor: primaryColor }}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-0"
                        />
                        <span className="text-xs sm:text-sm font-semibold">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>

                <button 
                  type="button"
                  onClick={() => navigate('/admin/categories')}
                  style={{ color: primaryColor }}
                  className="text-xs font-bold hover:underline transition-colors flex items-center gap-1.5 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Category
                </button>

                <p className="text-xs text-slate-500 pt-1">
                  Multiple existing categories; no new content-type or tags fields.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: VIDEO & BROADCAST ===================== */}
        {activeTab === 'video' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Video Provider, Markup & Live Preview */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Play className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Broadcast stream & embeds</h3>
                </div>

                {/* Video Source Segmented Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Video source
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-100/80 dark:bg-slate-950/40 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setStreamProvider('youtube')}
                      style={streamProvider === 'youtube' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        streamProvider === 'youtube'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setStreamProvider('mux')}
                      style={streamProvider === 'mux' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        streamProvider === 'mux'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Mux Video / Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setStreamProvider('custom')}
                      style={streamProvider === 'custom' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        streamProvider === 'custom'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Custom Embed
                    </button>
                  </div>
                </div>

                {/* Quick Setup for YouTube */}
                {streamProvider === 'youtube' && (
                  <div className="space-y-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      YouTube quick setup (watch URL or embed)
                    </label>
                    <input 
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono transition-colors"
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val) setDescription(val);
                      }}
                    />
                  </div>
                )}

                {/* Quick Setup for Mux */}
                {streamProvider === 'mux' && (
                  <div className="space-y-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Mux quick setup (playback ID or stream URL)
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. d54001aBCdE123 or https://stream.mux.com/PLAYBACK_ID.m3u8"
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono transition-colors"
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val) {
                          const pbId = val.replace(/^https?:\/\/stream\.mux\.com\//i, '').replace(/\.m3u8$/i, '');
                          setDescription(`<mux-player playback-id="${pbId}" metadata-video-title="${title || 'Match Broadcast'}" stream-type="${currentEffectiveStatus === 'live' ? 'live' : 'on-demand'}" controls playsinline preload="metadata"></mux-player>`);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Stream HTML / Embed Markup */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Stream HTML / Embed Markup
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Existing embed markup remains editable..."
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-y leading-relaxed transition-colors"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Keep provider-specific inputs and existing conversion / embed logic.
                </p>
              </div>

              {/* Stream Embed Live Preview Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Video className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Stream embed preview</h3>
                </div>

                <div className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-950/40 overflow-hidden flex flex-col items-center justify-center p-2 text-center transition-colors">
                  {description ? (
                    <div 
                      className="w-full h-full overflow-hidden [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-lg [&>video]:w-full [&>video]:h-full [&>video]:rounded-lg [&>mux-player]:w-full [&>mux-player]:h-full [&>mux-player]:rounded-lg [&>mux-player]:block"
                      dangerouslySetInnerHTML={{ __html: formatStreamHtml(description, { isLive: currentEffectiveStatus === 'live' }) }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center mb-2">
                        <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600" />
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Existing stream preview renders here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Timing, Status & Commenting */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Match Timing & Status Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Clock className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Match timing & status</h3>
                </div>

                {/* Original Creation / Match Date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Original Creation / Match Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomDate(new Date().toISOString().slice(0, 16))}
                      style={{ color: primaryColor }}
                      className="text-[11px] font-bold hover:underline"
                    >
                      Set to Current Time
                    </button>
                  </div>
                  <input 
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                  />
                </div>

                {/* Match Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Match status
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOverride = !isManualOverride;
                        setIsManualOverride(nextOverride);
                        if (nextOverride && !customDate) {
                          setCustomDate(new Date().toISOString().slice(0, 16));
                        }
                      }}
                      style={{ color: primaryColor }}
                      className="text-[11px] font-bold hover:underline"
                    >
                      {isManualOverride ? 'Use Automated Detection' : 'Manual Override'}
                    </button>
                  </div>

                  {!isManualOverride ? (
                    <div className="bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-2">
                        {getCalculatedStatus() === 'upcoming' && (
                          <span style={primaryBadgeStyle} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border">
                            <Clock className="w-3 h-3" /> UPCOMING (Auto)
                          </span>
                        )}
                        {getCalculatedStatus() === 'live' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> LIVE NOW (Auto)
                          </span>
                        )}
                        {getCalculatedStatus() === 'full_match' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            ✓ FULL MATCH (Auto)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">From date & duration</span>
                    </div>
                  ) : (
                    <select 
                      value={status === 'completed' ? 'full_match' : status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        setStatus(newStatus);
                        if ((newStatus === 'full_match' || newStatus === 'completed' || newStatus === 'live' || newStatus === 'highlights') && !customDate) {
                          setCustomDate(new Date().toISOString().slice(0, 16));
                        }
                      }}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live Now</option>
                      <option value="full_match">Full Match</option>
                      <option value="highlights">Highlights</option>
                    </select>
                  )}
                </div>

                {/* Match Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Match duration (minutes)
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[90, 120, 150, 180].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuration(mins)}
                        style={Number(duration) === mins ? primaryButtonStyle : undefined}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          Number(duration) === mins
                            ? 'border-transparent shadow-sm'
                            : 'bg-slate-100/80 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number"
                    min="15"
                    max="600"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Existing auto/manual status rules stay as they are.
                  </p>
                </div>
              </div>

              {/* Live Commenting Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <MessageSquare className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Live commenting</h3>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Enable comments</span>
                  <button
                    type="button"
                    onClick={() => setLiveCommenting(!liveCommenting)}
                    style={liveCommenting ? primaryButtonStyle : undefined}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      liveCommenting
                        ? 'shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {liveCommenting ? 'On' : 'Off'}
                  </button>
                </div>

                {liveCommenting && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Comment alignment
                    </label>
                    <select 
                      value={commentAlignment}
                      onChange={(e) => setCommentAlignment(e.target.value as any)}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none capitalize transition-colors"
                    >
                      <option value="center">Centre</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: PRICING & ACCESS ===================== */}
        {activeTab === 'pricing' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Viewing Access, PPV, Subscription, Partner Club */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Lock className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Access control</h3>
                </div>

                {/* Viewing Access: Free vs Paid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Viewing access
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-slate-950/40 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setAccessType('free')}
                      style={accessType === 'free' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        accessType === 'free'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (accessType === 'free') setAccessType('ppv');
                      }}
                      style={accessType !== 'free' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        accessType !== 'free'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {/* Paid Options */}
                {accessType !== 'free' && (
                  <div className="space-y-5 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Paid access type
                      </label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-slate-950/40 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setAccessType('ppv')}
                          style={accessType === 'ppv' ? primaryButtonStyle : undefined}
                          className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                            accessType === 'ppv'
                              ? 'shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Pay-Per-View
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccessType('plan')}
                          style={accessType === 'plan' ? primaryButtonStyle : undefined}
                          className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                            accessType === 'plan'
                              ? 'shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Plan / Subscription
                        </button>
                      </div>
                    </div>

                    {/* Pay-Per-View Price */}
                    {accessType === 'ppv' && (
                      <div className="space-y-4 animate-in fade-in">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Pay-Per-View price
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-bold">
                              {currencySymbol}
                            </span>
                            <input 
                              type="number"
                              step="0.01"
                              value={ppvPrice}
                              onChange={(e) => setPpvPrice(Number(e.target.value))}
                              className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl pl-9 pr-4 py-3 text-sm text-slate-900 dark:text-white font-mono outline-none transition-colors"
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Example existing default value, not a proposed commercial price.
                          </p>
                        </div>

                        {/* Partner Club Selector */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Partner club (for PPV revenue split) · Optional
                          </label>
                          <select
                            value={clubId || ''}
                            onChange={(e) => setClubId(e.target.value ? e.target.value : null)}
                            className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                          >
                            <option value="">No club — choose an existing partner club</option>
                            {clubs.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Required Subscription Plan */}
                    {accessType === 'plan' && (
                      <div className="space-y-2 animate-in fade-in">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Required subscription plan
                        </label>
                        <select
                          value={requiredPlanId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? e.target.value : null;
                            setRequiredPlanId(val);
                            if (val) {
                              const chosen = plans.find(p => String(p.id) === String(val));
                              if (chosen?.plan_scope === 'club' && chosen?.club_id && !clubId) {
                                setClubId(String(chosen.club_id));
                              }
                            }
                          }}
                          className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                        >
                          <option value="" disabled>Select a plan...</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {p.plan_scope === 'club' ? `Club Plan (Club #${p.club_id})` : 'Platform-Wide Plan'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Callout Notice */}
                <div className="bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                  <strong className="text-slate-900 dark:text-slate-300">Conditional fields:</strong> Free hides paid fields. Plan / Subscription shows the existing Required Plan selector instead of PPV pricing. Preserve the present access-type storage values.
                </div>
              </div>
            </div>

            {/* Right Column: Time-Limited Event Access & Existing Behavior */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Time-Limited Event Access Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Clock className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Time-limited event access</h3>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-200 block">
                      Enable event access duration
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Existing feature applies to Free, Plan and PPV.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEventAccessEnabled(!eventAccessEnabled)}
                    style={eventAccessEnabled ? primaryButtonStyle : undefined}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      eventAccessEnabled
                        ? 'shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {eventAccessEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                {eventAccessEnabled && (
                  <div className="space-y-3 pt-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Access duration window
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {[
                        { id: '3d', label: '3 Days' },
                        { id: '7d', label: '7 Days' },
                        { id: '30d', label: '30 Days' },
                        { id: '1y', label: '1 Year' },
                        { id: 'custom', label: 'Custom' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setEventAccessPreset(preset.id as any)}
                          style={eventAccessPreset === preset.id ? primaryButtonStyle : undefined}
                          className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center transition-all ${
                            eventAccessPreset === preset.id
                              ? 'border-transparent shadow-sm'
                              : 'bg-slate-100/80 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {eventAccessPreset === 'custom' && (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                        <input
                          type="number"
                          min="1"
                          value={customDurationVal}
                          onChange={(e) => setCustomDurationVal(Math.max(1, Number(e.target.value)))}
                          className="w-24 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                        <select
                          value={customDurationUnit}
                          onChange={(e) => setCustomDurationUnit(e.target.value as any)}
                          className="bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    )}

                    <div style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}30`, color: primaryColor }} className="rounded-xl p-3 text-xs leading-relaxed border font-medium">
                      The existing event-access countdown and expiry logic must not change as part of this styling task.
                    </div>
                  </div>
                )}
              </div>

              {/* Existing Behavior Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Info className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Existing behaviour</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Keep the current one-choice model: Free, PPV or required subscription plan. Do not add the PDF's simultaneous purchase and subscription options, expiry date controls or new entitlements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: PROMOTION ===================== */}
        {activeTab === 'promotion' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: SEO Settings */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Globe className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>SEO settings</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Focus keywords
                  </label>
                  <input 
                    type="text"
                    value={seo.keywords}
                    onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                    placeholder="football, live match, grassroots"
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Meta description
                  </label>
                  <textarea 
                    rows={4}
                    value={seo.metaDescription}
                    onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
                    placeholder="Brief summary for search results..."
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl p-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none leading-relaxed transition-colors"
                  />
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                  Only reuse existing saved SEO fields: keywords and metaDescription. The permalink remains on Details. Do not introduce a search-title field or new metadata schema.
                </div>
              </div>
            </div>

            {/* Right Column: Advertisement Settings */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <DollarSign className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Advertisement settings</h3>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-200 block">
                      Enable Ads for Free Viewers
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Uses the current enabled flag
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdSettingsEnabled(!adSettingsEnabled)}
                    style={adSettingsEnabled ? primaryButtonStyle : undefined}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      adSettingsEnabled
                        ? 'shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {adSettingsEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                {adSettingsEnabled && (
                  <div className="space-y-4 pt-2 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Display frequency override (minutes)
                      </label>
                      <input
                        type="number"
                        value={adFrequencyOverride}
                        onChange={(e) => setAdFrequencyOverride(e.target.value)}
                        placeholder="Global settings used by default"
                        className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Select campaign overrides (optional)
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 transition-colors">
                        {ads.filter(a => a.status === 'active').map(ad => (
                          <label key={ad.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 rounded-lg">
                            <input
                              type="checkbox"
                              checked={adCampaignIds.includes(ad.id)}
                              onChange={(e) => setAdCampaignIds(prev =>
                                e.target.checked ? [...prev, ad.id] : prev.filter(id => id !== ad.id)
                              )}
                              style={{ accentColor: primaryColor }}
                              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{ad.campaignName}</span>
                          </label>
                        ))}
                        {ads.filter(a => a.status === 'active').length === 0 && (
                          <p className="text-xs text-slate-500 p-2">Existing active campaigns appear here</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500 pt-1">
                  Preserve existing campaign selection and defaults. No new advertising products or formats.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: REVIEW & PUBLISH ===================== */}
        {activeTab === 'review' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Read-Only Match Summary */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <FileText className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Review match details</h3>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Title</span>
                    <span className="font-bold text-slate-900 dark:text-white">{title || 'Untitled Match'}</span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Permalink</span>
                    <code style={{ color: primaryColor }} className="font-mono text-xs bg-slate-100/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 px-2 py-0.5 rounded">
                      /matches/{slug || '...'}
                    </code>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Categories</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{selectedCategoryNames}</span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Club / Organisation</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {assignedClubName || 'None assigned'}
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Competition</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {assignedCompetitionName || 'None assigned'}
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Video source</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {streamProvider === 'mux' ? 'Mux Video / Live' : streamProvider === 'youtube' ? 'YouTube' : 'Custom Embed'}
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Match status</span>
                    <span style={{ color: primaryColor }} className="inline-flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                      {formatMatchStatus(currentEffectiveStatus)} ({isManualOverride ? 'Manual' : 'Automatic'})
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Match date</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
                      {customDate ? new Date(customDate).toLocaleString() : 'Current Date/Time'}
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Duration</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{duration || 120} minutes</span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Viewing access</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {accessType === 'free' && 'Free Access'}
                      {accessType === 'ppv' && `Pay-Per-View (${currencySymbol}${Number(ppvPrice || 0).toFixed(2)})${assignedClubName ? ` • Club: ${assignedClubName}` : ''}`}
                      {accessType === 'plan' && `Plan / Subscription (${assignedPlanName || 'Required Plan'})`}
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Event access duration</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {eventAccessEnabled ? `Enabled (${eventAccessPreset})` : 'Disabled'}
                    </span>
                  </div>
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Advertising</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {adSettingsEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                  Summary is display-only and must always reflect the editor's current values; no new backend data fields.
                </div>
              </div>
            </div>

            {/* Right Column: Publication Timing & Ready to Submit */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Publication Timing Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Clock className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Publication timing</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Publish match
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-slate-950/40 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setPublishMode('now')}
                      style={publishMode === 'now' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        publishMode === 'now'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishMode('scheduled')}
                      style={publishMode === 'scheduled' ? primaryButtonStyle : undefined}
                      className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                        publishMode === 'scheduled'
                          ? 'shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Scheduled
                    </button>
                  </div>
                </div>

                {publishMode === 'scheduled' && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Scheduled date & time
                    </label>
                    <input 
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                    />
                  </div>
                )}

                <div style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}30`, color: primaryColor }} className="rounded-xl p-3 text-xs leading-relaxed border font-medium">
                  Existing scheduled date/time field appears only when Scheduled is selected.
                </div>

                <p className="text-xs text-slate-500 pt-1">
                  Retain the current publication workflow; separate drafts are not confirmed.
                </p>
              </div>

              {/* Ready to Submit Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CheckCircle className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Ready to submit?</h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Review the current fields. Missing required values should direct an operator to the relevant tab.
                </p>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={primaryButtonStyle}
                  className="w-full disabled:opacity-60 font-bold px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm hover:opacity-90 active:scale-95"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving 
                      ? (isEditing ? 'Updating Match...' : 'Publishing Match...') 
                      : (isEditing ? 'Update Match' : 'Post Match')}
                  </span>
                </button>

                <p className="text-xs text-slate-500 text-center">
                  The same existing save action as the header. Edit mode: Update Match.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPicker
          onSelect={(url) => {
            setThumbnail(url);
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      {/* Live Preview Modal Overlay when Preview is toggled in Header */}
      {isPreviewMode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white/95 dark:bg-[#0f172a]/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 space-y-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" style={{ color: primaryColor }} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Match Preview</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stream Player Preview */}
            <div className="aspect-video w-full rounded-xl bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative">
              {description ? (
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>video]:w-full [&>video]:h-full [&>mux-player]:w-full [&>mux-player]:h-full [&>mux-player]:block"
                  dangerouslySetInnerHTML={{ __html: formatStreamHtml(description, { isLive: currentEffectiveStatus === 'live' }) }}
                />
              ) : thumbnail ? (
                <img src={thumbnail} alt="Match Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Play className="w-12 h-12 mb-2 text-slate-400 dark:text-slate-600" />
                  <p className="text-sm font-semibold">No stream or thumbnail configured yet</p>
                </div>
              )}
            </div>

            {/* Match Information Preview */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span style={primaryButtonStyle} className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                  {formatMatchStatus(currentEffectiveStatus)}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {accessType === 'free' ? 'Free Access' : accessType === 'ppv' ? `PPV (${currencySymbol}${ppvPrice})` : 'Plan Required'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-auto">
                  {customDate ? new Date(customDate).toLocaleDateString() : 'Today'} • {duration} mins
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title || 'Untitled Match Preview'}</h2>
              {content && (
                <div 
                  className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 prose dark:prose-invert max-w-none pt-2"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
