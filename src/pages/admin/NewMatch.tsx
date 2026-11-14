import { youtubeSource } from '../../utils/youtube';
import { WatchWDSYouTubePlayer } from '../../components/WatchWDSYouTubePlayer';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMatchStore, useCategoryStore, useSettingsStore, Match, useAdStore, useMediaStore, useSportStore, MuxWatermarkConfig } from '../../store';
import { WatermarkOverlay, DEFAULT_WATERMARK_CONFIG, parseWatermarkConfig } from '../../components/WatermarkOverlay';
import { MuxWatermarkEditor } from '../../components/MuxWatermarkEditor';
import { getSportConfig, SPORTS_REGISTRY } from '../../config/sports';
import { useUIStore } from '../../store/uiStore';
import { 
  Save, X, Image as ImageIcon, Globe, Lock, DollarSign, 
  Calendar, Tag, ChevronRight, Eye, Code, Layout, Type, Plus, 
  MessageSquare, Clock, Loader2, Play, Video, Info, CheckCircle, 
  ExternalLink, Sparkles, Layers, FileText, Check, Shield, HelpCircle,
  Trophy, Building2, Radio, Copy, RefreshCw, EyeOff, KeyRound, AlertTriangle
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { format } from 'date-fns';
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

export function NewMatch({ initialSport, initialSportCategoryId }: { initialSport?: string; initialSportCategoryId?: number } = {}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches = [], adminMatches = [], addMatch, updateMatch, fetchAdminMatches } = useMatchStore();
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

  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const activeEventId = id ? String(id) : createdEventId;
  const isEditing = !!id || !!createdEventId;
  const existingMatch = activeEventId
    ? (adminMatches.find(m => String(m.id) === String(activeEventId)) || matches.find(m => String(m.id) === String(activeEventId)) || null)
    : null;

  useEffect(() => {
    if (id) {
      fetchAdminMatches();
    }
  }, [id, fetchAdminMatches]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabId>('details');

  // Authoritative Sport Classification
    // Authoritative Sport Classification
  const initialDetectedSport = (existingMatch?.sport as string) || initialSport || 'football';
  const [currentSport, setCurrentSport] = useState<string>(initialDetectedSport);
  const { sports: dynamicSports = [], fetchActiveSports } = useSportStore();

  useEffect(() => {
    fetchActiveSports();
  }, [fetchActiveSports]);

  const activeSportConfig = useMemo(() => {
    return getSportConfig(currentSport, dynamicSports) || SPORTS_REGISTRY[currentSport] || SPORTS_REGISTRY.football;
  }, [currentSport, dynamicSports]);

  // Form states & Structured Participants
  const [title, setTitle] = useState(existingMatch?.title || '');
  const [isTitleCustomized, setIsTitleCustomized] = useState(false);
  const [homeTeam, setHomeTeam] = useState(
    existingMatch?.home_team || (existingMatch as any)?.homeTeam || ''
  );
  const [awayTeam, setAwayTeam] = useState(
    existingMatch?.away_team || (existingMatch as any)?.awayTeam || ''
  );
  const [playerPair1, setPlayerPair1] = useState(
    existingMatch?.player_pair_1 || (existingMatch as any)?.playerPair1 || ''
  );
  const [playerPair2, setPlayerPair2] = useState(
    existingMatch?.player_pair_2 || (existingMatch as any)?.playerPair2 || ''
  );
  const handleHomeTeamChange = (val: string) => {
    setHomeTeam(val);
    if (!isTitleCustomized) {
      const generated = val && awayTeam ? `${val} vs ${awayTeam}` : val || awayTeam || '';
      setTitle(generated);
      if (!isEditing && !slug) {
        setSlug(generated.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      }
    }
  };

  const handleAwayTeamChange = (val: string) => {
    setAwayTeam(val);
    if (!isTitleCustomized) {
      const generated = homeTeam && val ? `${homeTeam} vs ${val}` : homeTeam || val || '';
      setTitle(generated);
      if (!isEditing && !slug) {
        setSlug(generated.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      }
    }
  };

  const handlePlayerPair1Change = (val: string) => {
    setPlayerPair1(val);
    if (!isTitleCustomized) {
      const generated = val && playerPair2 ? `${val} vs ${playerPair2}` : val || playerPair2 || '';
      setTitle(generated);
      if (!isEditing && !slug) {
        setSlug(generated.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      }
    }
  };

  const handlePlayerPair2Change = (val: string) => {
    setPlayerPair2(val);
    if (!isTitleCustomized) {
      const generated = playerPair1 && val ? `${playerPair1} vs ${val}` : playerPair1 || val || '';
      setTitle(generated);
      if (!isEditing && !slug) {
        setSlug(generated.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      }
    }
  };

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
    (existingMatch?.mux_live_stream_id || existingMatch?.mux_playback_id || existingMatch?.description?.toLowerCase().includes('mux')
      ? 'mux'
      : 'youtube')
  );
  const [muxServerConfigured, setMuxServerConfigured] = useState<boolean | null>(null);
  const [muxRtmpUrl, setMuxRtmpUrl] = useState<string>('rtmps://global-live.mux.com:443/app');
  const [muxLiveStreamId, setMuxLiveStreamId] = useState<string | null>(existingMatch?.mux_live_stream_id || null);
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(existingMatch?.mux_playback_id || null);
  const [muxAssetPlaybackId, setMuxAssetPlaybackId] = useState<string | null>(existingMatch?.mux_asset_playback_id || null);
  const [muxStreamStatus, setMuxStreamStatus] = useState<string | null>(existingMatch?.mux_stream_status || null);
  const [muxErrorMessage, setMuxErrorMessage] = useState<string | null>(existingMatch?.mux_error_message || null);
  const [muxStreamKey, setMuxStreamKey] = useState<string | null>(null);
  const [showMuxStreamKey, setShowMuxStreamKey] = useState<boolean>(false);
  const [isCreatingMuxStream, setIsCreatingMuxStream] = useState<boolean>(false);
  const [isRefreshingMuxStatus, setIsRefreshingMuxStatus] = useState<boolean>(false);
  const [isLoadingMuxCredentials, setIsLoadingMuxCredentials] = useState<boolean>(false);
  const [muxSigningConfigured, setMuxSigningConfigured] = useState<boolean>(false);
  const [muxPlaybackPolicy, setMuxPlaybackPolicy] = useState<'public' | 'signed'>(
    existingMatch?.mux_playback_policy === 'signed' || (existingMatch as any)?.muxPlaybackPolicy === 'signed'
      ? 'signed'
      : 'public'
  );
  const [muxWatermarkConfig, setMuxWatermarkConfig] = useState<MuxWatermarkConfig>(
    parseWatermarkConfig(existingMatch?.mux_watermark_config || (existingMatch as any)?.muxWatermarkConfig)
  );
  const [muxPreviewToken, setMuxPreviewToken] = useState<string | null>(null);
  const [isUpdatingWatermark, setIsUpdatingWatermark] = useState<boolean>(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState<boolean>(false);
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

  const [selectedCategories, setSelectedCategories] = useState<any[]>(
    initialSportCategoryId !== undefined && !isEditing
      ? [initialSportCategoryId]
      : (existingMatch?.categories || []).map((c: any) => Number(c))
  );
  const [seo, setSeo] = useState(existingMatch?.seo || { keywords: '', metaDescription: '' });
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>(existingMatch?.scheduledDate ? 'scheduled' : 'now');
  const [scheduledDate, setScheduledDate] = useState(existingMatch?.scheduledDate || '');
  const [customDate, setCustomDate] = useState(safeIsoDateSlice(existingMatch?.date || (existingMatch as any)?.start_time || (existingMatch as any)?.startTime));
  const [timeZone, setTimeZone] = useState<string>(existingMatch?.time_zone || 'Europe/London');
  const [isManualOverride, setIsManualOverride] = useState(
    existingMatch?.status_mode === 'manual' || existingMatch?.status === 'completed' || existingMatch?.status === 'full_match' || existingMatch?.status === 'live' || existingMatch?.status === 'highlights'
  );
  const [statusMode, setStatusMode] = useState<'manual' | 'automatic'>(
    existingMatch?.status_mode || (isManualOverride ? 'manual' : 'automatic')
  );
  const [hideLiveControls, setHideLiveControls] = useState<boolean>(
    Boolean(existingMatch?.hide_live_controls)
  );
  const [liveCommenting, setLiveCommenting] = useState(existingMatch?.liveCommenting ?? true);
  const [commentAlignment, setCommentAlignment] = useState<'left' | 'center' | 'right'>(existingMatch?.commentAlignment || 'center');
  const [duration, setDuration] = useState<number>(existingMatch?.duration || 120);

  // Event Access Duration & Period System
  const [eventAccessEnabled, setEventAccessEnabled] = useState(
    Boolean(Number(existingMatch?.event_access_enabled ?? (existingMatch as any)?.eventAccessEnabled ?? 0))
  );
  const [eventAccessPreset, setEventAccessPreset] = useState<'3d' | '7d' | '30d' | '1y' | 'custom'>(
    (existingMatch?.event_access_duration_label as any) || '3d'
  );
  const [customDurationVal, setCustomDurationVal] = useState<number>(24);
  const [customDurationUnit, setCustomDurationUnit] = useState<'hours' | 'days'>('hours');
  const [accessStartTime, setAccessStartTime] = useState<string>(
    safeIsoDateSlice(existingMatch?.event_access_starts_at || (existingMatch as any)?.access_starts_at || existingMatch?.date)
  );
  const [accessEndTime, setAccessEndTime] = useState<string>(
    safeIsoDateSlice(existingMatch?.event_access_expires_at || (existingMatch as any)?.access_expires_at || existingMatch?.revoke_expires_at)
  );

  const formatDateTimeDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    try {
      return format(d, 'd MMMM yyyy, HH:mm');
    } catch {
      return isoStr;
    }
  };
  
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast, updateToast } = useUIStore();

  // Fetch plans and clubs
  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(console.error);

    const token = localStorage.getItem('token');

    if (token) {
      fetch('/api/admin/mux/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d) {
            setMuxServerConfigured(Boolean(d.configured));
            setMuxSigningConfigured(Boolean(d.signingConfigured));
            if (d.rtmpIngestUrl) setMuxRtmpUrl(d.rtmpIngestUrl);
            if (!isEditing && !existingMatch) {
              if (d.defaultPlaybackPolicy === 'signed' && d.signingConfigured) {
                setMuxPlaybackPolicy('signed');
              } else if (d.requireSignedForPaidEvents && d.signingConfigured && accessType !== 'free') {
                setMuxPlaybackPolicy('signed');
              }
              if (d.defaultWatermark && d.defaultWatermark.enabled) {
                setMuxWatermarkConfig(parseWatermarkConfig(d.defaultWatermark));
              }
            }
          }
        })
        .catch(() => {});
    }

    // Fetch clubs: load full partner club data with fallback to active clubs
    const loadClubs = async () => {
      try {
        if (token) {
          const res = await fetch('/api/admin/clubs', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setClubs(data);
              return;
            }
          }
        }
        const activeRes = await fetch('/api/clubs/active');
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (Array.isArray(activeData)) setClubs(activeData);
        }
      } catch (err) {
        console.error('Failed to load clubs:', err);
      }
    };
    loadClubs();

    // Fetch competitions: load full competition list with fallback to active
    const loadCompetitions = async () => {
      try {
        const res = await fetch('/api/competitions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCompetitions(data);
            return;
          }
        }
        const activeRes = await fetch('/api/competitions/active');
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (Array.isArray(activeData)) setCompetitions(activeData);
        }
      } catch (err) {
        console.error('Failed to load competitions:', err);
      }
    };
    loadCompetitions();
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
      if (existingMatch.sport) {
        setCurrentSport(String(existingMatch.sport));
      }
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
        (existingMatch.mux_live_stream_id || existingMatch.mux_playback_id || existingMatch.description?.toLowerCase().includes('mux')
          ? 'mux'
          : 'youtube')
      );
      if (existingMatch.home_team || (existingMatch as any).homeTeam) {
        setHomeTeam(existingMatch.home_team || (existingMatch as any).homeTeam || '');
      }
      if (existingMatch.away_team || (existingMatch as any).awayTeam) {
        setAwayTeam(existingMatch.away_team || (existingMatch as any).awayTeam || '');
      }
      if (existingMatch.player_pair_1 || (existingMatch as any).playerPair1) {
        setPlayerPair1(existingMatch.player_pair_1 || (existingMatch as any).playerPair1 || '');
      }
      if (existingMatch.player_pair_2 || (existingMatch as any).playerPair2) {
        setPlayerPair2(existingMatch.player_pair_2 || (existingMatch as any).playerPair2 || '');
      }
      setMuxLiveStreamId(existingMatch.mux_live_stream_id || null);
      setMuxPlaybackId(existingMatch.mux_playback_id || null);
      setMuxAssetPlaybackId(existingMatch.mux_asset_playback_id || null);
      setMuxStreamStatus(existingMatch.mux_stream_status || null);
      setMuxErrorMessage(existingMatch.mux_error_message || null);
      setMuxPlaybackPolicy(
        existingMatch.mux_playback_policy === 'signed' || (existingMatch as any).muxPlaybackPolicy === 'signed'
          ? 'signed'
          : 'public'
      );
      if (existingMatch.mux_watermark_config || (existingMatch as any).muxWatermarkConfig) {
        setMuxWatermarkConfig(
          parseWatermarkConfig(existingMatch.mux_watermark_config || (existingMatch as any).muxWatermarkConfig)
        );
      }
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
    loadMuxPlayerIfNeeded(description || muxPlaybackId || muxAssetPlaybackId || '');
  }, [description, muxPlaybackId, muxAssetPlaybackId]);

  useEffect(() => {
    if (!activeEventId || streamProvider !== 'mux' || muxPlaybackPolicy !== 'signed') {
      setMuxPreviewToken(null);
      return;
    }
    if (!muxPlaybackId && !muxAssetPlaybackId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`/api/matches/${encodeURIComponent(activeEventId)}/mux/status?sync=0&previewToken=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.preview_playback_token) {
          setMuxPreviewToken(d.preview_playback_token);
        }
      })
      .catch(() => {});
  }, [activeEventId, streamProvider, muxPlaybackPolicy, muxPlaybackId, muxAssetPlaybackId]);

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

  const isPairSport = activeSportConfig.participants.type === 'players_or_pairs';
  const participantSlot1Label = activeSportConfig.participants.slot1Label || (isPairSport ? 'Player or pair 1' : 'Home team');
  const participantSlot2Label = activeSportConfig.participants.slot2Label || (isPairSport ? 'Player or pair 2' : 'Away team');

  const resolveEventParticipantPayload = (requireBothForDraft = false): {
    errorMessage?: string;
    resolvedTitle: string;
    fields: {
      home_team: string | null;
      away_team: string | null;
      player_pair_1: string | null;
      player_pair_2: string | null;
      homeTeam: string | null;
      awayTeam: string | null;
      playerPair1: string | null;
      playerPair2: string | null;
    };
  } => {
    const slot1 = (isPairSport ? playerPair1 : homeTeam).trim();
    const slot2 = (isPairSport ? playerPair2 : awayTeam).trim();
    const manualTitle = title.trim();

    if (requireBothForDraft) {
      if (!manualTitle && (!slot1 || !slot2)) {
        return {
          errorMessage: `Please enter ${participantSlot1Label} & ${participantSlot2Label} (or an Event title) in Details before creating a live stream.`,
          resolvedTitle: '',
          fields: {
            home_team: null,
            away_team: null,
            player_pair_1: null,
            player_pair_2: null,
            homeTeam: null,
            awayTeam: null,
            playerPair1: null,
            playerPair2: null,
          },
        };
      }
    } else if (!manualTitle) {
      if (!slot1) {
        return {
          errorMessage: `Please enter ${participantSlot1Label} (or an Event title).`,
          resolvedTitle: '',
          fields: {
            home_team: null,
            away_team: null,
            player_pair_1: null,
            player_pair_2: null,
            homeTeam: null,
            awayTeam: null,
            playerPair1: null,
            playerPair2: null,
          },
        };
      }
      if (!slot2) {
        return {
          errorMessage: `Please enter ${participantSlot2Label} (or an Event title).`,
          resolvedTitle: '',
          fields: {
            home_team: null,
            away_team: null,
            player_pair_1: null,
            player_pair_2: null,
            homeTeam: null,
            awayTeam: null,
            playerPair1: null,
            playerPair2: null,
          },
        };
      }
    }

    const resolvedTitle = manualTitle || (slot1 && slot2 ? `${slot1} vs ${slot2}` : slot1 || slot2 || 'Untitled Event');
    return {
      resolvedTitle,
      fields: {
        home_team: !isPairSport ? (slot1 || null) : null,
        away_team: !isPairSport ? (slot2 || null) : null,
        player_pair_1: isPairSport ? (slot1 || null) : null,
        player_pair_2: isPairSport ? (slot2 || null) : null,
        homeTeam: !isPairSport ? (slot1 || null) : null,
        awayTeam: !isPairSport ? (slot2 || null) : null,
        playerPair1: isPairSport ? (slot1 || null) : null,
        playerPair2: isPairSport ? (slot2 || null) : null,
      },
    };
  };

  const handleSave = async (targetPublishStatus?: 'published' | 'draft' | 'scheduled') => {
    const effectiveStatus = targetPublishStatus || (publishMode === 'scheduled' ? 'scheduled' : 'published');
    const participantResolution = resolveEventParticipantPayload(false);
    if (participantResolution.errorMessage) {
      addToast(participantResolution.errorMessage, 'error');
      setActiveTab('details');
      return;
    }

    const finalTitle = participantResolution.resolvedTitle;

    let finalSlug = slug.trim();
    if (!finalSlug) {
      finalSlug = finalTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    setIsSaving(true);
    const toastId = addToast(
      effectiveStatus === 'draft'
        ? 'Saving draft...'
        : isEditing
          ? 'Updating event...'
          : 'Publishing event...',
      'loading'
    );

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
        title: finalTitle,
        slug: finalSlug,
        sport: currentSport,
        ...participantResolution.fields,
        date: finalDate,
        price: accessType === 'ppv' ? ppvPrice : 0,
        access_type: accessType,
        ppv_price: ppvPrice,
        required_plan_id: requiredPlanId,
        club_id: clubId || null,
        competition_id: competitionId,
        stream_provider: streamProvider,
        mux_playback_policy: muxPlaybackPolicy,
        mux_watermark_config: muxWatermarkConfig,
        embedPrice: ppvPrice * 10,
        status: computedStatus as any,
        publish_status: effectiveStatus,
        publishStatus: effectiveStatus,
        duration: Number(duration) || 120,
        time_zone: timeZone,
        status_mode: statusMode,
        hide_live_controls: hideLiveControls,
        event_access_enabled: eventAccessEnabled ? 1 : 0,
        event_access_duration: calculatedDurationMinutes,
        event_access_duration_label: eventAccessPreset,
        event_access_starts_at: accessStartTime ? resolveValidIsoDate(accessStartTime) : null,
        event_access_expires_at: accessEndTime ? resolveValidIsoDate(accessEndTime) : null,
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
          name: `${finalTitle} Thumbnail`,
          url: finalThumbnail,
          type: 'image'
        });
      }

      if (activeEventId) {
        await updateMatch(activeEventId, matchData);
        await useMatchStore.getState().fetchMatches();
        await fetchAdminMatches();
        const successMsg = effectiveStatus === 'draft' ? 'Event saved as draft!' : 'Match updated successfully!';
        updateToast(toastId, { message: successMsg, type: 'success' });
      } else {
        const saved = await addMatch(matchData);
        if (saved && typeof saved === 'object' && 'id' in saved && saved.id) {
          setCreatedEventId(String(saved.id));
        }
        await useMatchStore.getState().fetchMatches();
        await fetchAdminMatches();
        const successMsg = effectiveStatus === 'draft'
          ? 'Event saved as draft!'
          : effectiveStatus === 'scheduled'
            ? 'Event scheduled successfully!'
            : 'Match published successfully!';
        updateToast(toastId, { message: successMsg, type: 'success' });
      }

      navigate('/admin/events');
    } catch (err) {
      console.error('Failed to save match:', err);
      updateToast(toastId, { message: 'Failed to save event. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const persistDraftEventForMux = async (): Promise<string | null> => {
    if (activeEventId) return activeEventId;

    const draftParticipants = resolveEventParticipantPayload(true);
    if (draftParticipants.errorMessage) {
      addToast(draftParticipants.errorMessage, 'error');
      setActiveTab('details');
      return null;
    }

    const derivedTitle = draftParticipants.resolvedTitle;

    const finalSlug = (slug.trim() || derivedTitle)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let finalDate = resolveValidIsoDate(customDate);
    if (!finalDate) finalDate = new Date().toISOString();

    let finalThumbnail = thumbnail;
    if (thumbnail && thumbnail.startsWith('data:image/')) {
      finalThumbnail = await compressImage(thumbnail);
    }

    const draftPayload: Match = {
      id: String(Date.now()) as any,
      title: derivedTitle,
      slug: finalSlug,
      sport: currentSport,
      ...draftParticipants.fields,
      date: finalDate,
      price: accessType === 'ppv' ? ppvPrice : 0,
      access_type: accessType,
      ppv_price: ppvPrice,
      required_plan_id: requiredPlanId,
      club_id: clubId || null,
      competition_id: competitionId,
      stream_provider: 'mux',
      mux_playback_policy: muxPlaybackPolicy,
      mux_watermark_config: muxWatermarkConfig,
      embedPrice: ppvPrice * 10,
      status: (isManualOverride ? status : getCalculatedStatus()) as any,
      publish_status: 'draft',
      publishStatus: 'draft',
      duration: Number(duration) || 120,
      time_zone: timeZone,
      status_mode: statusMode,
      hide_live_controls: hideLiveControls,
      thumbnail: finalThumbnail || 'https://picsum.photos/seed/default/800/450',
      content,
      description,
      categories: selectedCategories,
      access: accessType === 'free' ? 'free' : 'paid',
      seo,
      liveCommenting,
      commentAlignment,
    };

    const created = await addMatch(draftPayload);
    if (created && typeof created === 'object' && 'id' in created && created.id) {
      const newId = String(created.id);
      setCreatedEventId(newId);
      if (!title.trim()) setTitle(derivedTitle);
      if (!slug.trim()) setSlug(finalSlug);
      return newId;
    }
    return null;
  };

  const handleCreateMuxLiveStream = async () => {
    setIsCreatingMuxStream(true);
    const toastId = addToast('Provisioning Mux Live Stream...', 'loading');
    try {
      const targetEventId = await persistDraftEventForMux();
      if (!targetEventId) {
        updateToast(toastId, { message: 'Event details required first.', type: 'error' });
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/matches/${encodeURIComponent(targetEventId)}/mux/live-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          playbackPolicy: muxPlaybackPolicy,
          watermarkConfig: muxWatermarkConfig,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) {
        updateToast(toastId, { message: data?.error || 'Failed to create Mux Live Stream.', type: 'error' });
        return;
      }

      setStreamProvider('mux');
      setMuxLiveStreamId(data.mux_live_stream_id || null);
      setMuxPlaybackId(data.mux_playback_id || null);
      setMuxStreamStatus(data.mux_stream_status || 'idle');
      if (data.mux_playback_policy) setMuxPlaybackPolicy(data.mux_playback_policy);
      if (data.mux_watermark_config) setMuxWatermarkConfig(parseWatermarkConfig(data.mux_watermark_config));
      setMuxErrorMessage(null);
      if (data.rtmp_ingest_url) setMuxRtmpUrl(data.rtmp_ingest_url);
      await fetchAdminMatches();
      updateToast(toastId, { message: 'Mux Live Stream created & linked to Event!', type: 'success' });
    } catch (err: any) {
      console.error('Create Mux Live Stream error:', err);
      updateToast(toastId, { message: err?.message || 'Failed to create Mux Live Stream.', type: 'error' });
    } finally {
      setIsCreatingMuxStream(false);
    }
  };

  const handleSaveEventWatermark = async () => {
    if (!activeEventId) {
      addToast('Watermark settings will be applied when the Event is saved or stream is created.', 'info');
      return;
    }
    setIsUpdatingWatermark(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/matches/${encodeURIComponent(activeEventId)}/mux/watermark`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ watermarkConfig: muxWatermarkConfig }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        addToast(data?.error || 'Failed to update watermark configuration.', 'error');
        return;
      }
      if (data?.mux_watermark_config) {
        setMuxWatermarkConfig(parseWatermarkConfig(data.mux_watermark_config));
      }
      await fetchAdminMatches();
      addToast(data?.note || 'Event watermark updated.', 'success');
    } catch {
      addToast('Network error updating watermark.', 'error');
    } finally {
      setIsUpdatingWatermark(false);
    }
  };

  const handleSwitchMuxPlaybackPolicy = async (nextPolicy: 'public' | 'signed') => {
    if (nextPolicy === 'signed' && !muxSigningConfigured) {
      addToast('Configure Mux Signing Keys in Admin Settings > Mux Streaming before enabling Signed Playback.', 'error');
      return;
    }
    if (!muxLiveStreamId || !activeEventId) {
      setMuxPlaybackPolicy(nextPolicy);
      return;
    }
    setIsUpdatingPolicy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/matches/${encodeURIComponent(activeEventId)}/mux/playback-policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ playbackPolicy: nextPolicy }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        addToast(data?.error || 'Could not update playback policy.', 'error');
        return;
      }
      setMuxPlaybackPolicy(nextPolicy);
      if (data?.mux_playback_id) setMuxPlaybackId(data.mux_playback_id);
      if (data?.mux_asset_playback_id) setMuxAssetPlaybackId(data.mux_asset_playback_id);
      await fetchAdminMatches();
      addToast(`Playback security updated to ${nextPolicy === 'signed' ? 'Signed (JWT)' : 'Public'}.`, 'success');
    } catch {
      addToast('Failed to switch playback policy.', 'error');
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  const handleRefreshMuxStatus = async () => {
    if (!activeEventId) return;
    setIsRefreshingMuxStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/matches/${encodeURIComponent(activeEventId)}/mux/status?previewToken=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setMuxLiveStreamId(data.mux_live_stream_id || null);
        setMuxPlaybackId(data.mux_playback_id || null);
        setMuxAssetPlaybackId(data.mux_asset_playback_id || null);
        setMuxStreamStatus(data.mux_stream_status || null);
        if (data.mux_playback_policy) setMuxPlaybackPolicy(data.mux_playback_policy);
        if (data.preview_playback_token) setMuxPreviewToken(data.preview_playback_token);
        setMuxErrorMessage(data.mux_error_message || null);
        if (data.rtmp_ingest_url) setMuxRtmpUrl(data.rtmp_ingest_url);
        addToast('Mux stream status synced.', 'success');
      } else {
        addToast(data?.error || 'Could not sync Mux status.', 'error');
      }
    } catch {
      addToast('Could not sync Mux status.', 'error');
    } finally {
      setIsRefreshingMuxStatus(false);
    }
  };

  const handleToggleRevealStreamKey = async () => {
    if (showMuxStreamKey) {
      setShowMuxStreamKey(false);
      return;
    }
    if (muxStreamKey) {
      setShowMuxStreamKey(true);
      return;
    }
    if (!activeEventId) return;
    setIsLoadingMuxCredentials(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/matches/${encodeURIComponent(activeEventId)}/mux/credentials`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.mux_stream_key) {
        setMuxStreamKey(data.mux_stream_key);
        if (data.rtmp_ingest_url) setMuxRtmpUrl(data.rtmp_ingest_url);
        setShowMuxStreamKey(true);
      } else {
        addToast(data?.error || 'Unable to retrieve stream credentials.', 'error');
      }
    } catch {
      addToast('Unable to retrieve stream credentials.', 'error');
    } finally {
      setIsLoadingMuxCredentials(false);
    }
  };

  const handleCopyMuxField = (val: string, label: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    addToast(`${label} copied to clipboard!`, 'success');
  };

  const formatMuxStatusPill = (st: string | null) => {
    const s = String(st || '').toLowerCase();
    if (s === 'active') return { text: 'Live / Broadcasting', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    if (s === 'connected' || s === 'recording') return { text: s === 'recording' ? 'Recording' : 'Connected', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
    if (s === 'idle' || s === 'created') return { text: 'Ready (Idle)', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    if (s === 'disconnected') return { text: 'Disconnected', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    if (s === 'disabled') return { text: 'Disabled', cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    if (s === 'error') return { text: 'Error', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
    return { text: 'Not Created', cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20' };
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

  const selectedClub = useMemo(() => {
    if (!clubId) return null;
    return clubs.find(c => String(c.id) === String(clubId)) || null;
  }, [clubId, clubs]);

  const assignedClubName = useMemo(() => {
    if (!clubId) return null;
    return selectedClub ? selectedClub.name : `Club #${clubId}`;
  }, [clubId, selectedClub]);

  const availableSportOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    Object.values(SPORTS_REGISTRY).forEach((s) => map.set(s.id, { id: s.id, name: s.name }));
    (dynamicSports || []).forEach((s: any) => {
      if (s && s.id && (s.is_active === undefined || Boolean(s.is_active))) {
        map.set(String(s.id), { id: String(s.id), name: String(s.name || s.id) });
      }
    });
    return Array.from(map.values());
  }, [dynamicSports]);

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
              onClick={() => navigate('/admin/events')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              title="Back to Event Management"
            >
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Edit Match' : 'Event details'}
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
              onClick={() => handleSave()}
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
              {activeTab === 'details' && 'Event information, description, cover image and existing categories.'}
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
                  <h3>Event details</h3>
                </div>

                {/* Sport Classification Banner & Switcher */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sport:</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                      {activeSportConfig.name || currentSport.toUpperCase()}
                    </span>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <label htmlFor="select-event-sport" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Switch sport:
                      </label>
                      <select
                        id="select-event-sport"
                        value={currentSport}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next === currentSport) return;
                          const hasData = homeTeam || awayTeam || playerPair1 || playerPair2;
                          if (!hasData || window.confirm('Changing sport will clear participant names while keeping shared event data (title club, competition, pricing). Proceed?')) {
                            setCurrentSport(next);
                            setHomeTeam('');
                            setAwayTeam('');
                            setPlayerPair1('');
                            setPlayerPair2('');
                            setTitle('');
                            setSlug('');
                          }
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500"
                      >
                        {availableSportOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Dynamic Multi-Sport Participant Fields (Teams, Players/Pairs, Combatants, Custom Sports) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {participantSlot1Label} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={isPairSport ? playerPair1 : homeTeam}
                      onChange={(e) =>
                        isPairSport
                          ? handlePlayerPair1Change(e.target.value)
                          : handleHomeTeamChange(e.target.value)
                      }
                      placeholder={activeSportConfig.participants.slot1Placeholder || `${participantSlot1Label} name`}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {participantSlot2Label} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={isPairSport ? playerPair2 : awayTeam}
                      onChange={(e) =>
                        isPairSport
                          ? handlePlayerPair2Change(e.target.value)
                          : handleAwayTeamChange(e.target.value)
                      }
                      placeholder={activeSportConfig.participants.slot2Placeholder || `${participantSlot2Label} name`}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Event title
                  </label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${participantSlot1Label} vs ${participantSlot2Label}`}
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
                      placeholder="participant-1-v-participant-2"
                      style={{ color: primaryColor }}
                      className="bg-transparent border-none font-mono text-xs font-bold focus:ring-0 p-0 flex-1 ml-1 outline-none"
                    />
                  </div>
                </div>

                {/* Clubs / Organisation & Competition (Inline side by side across all sports) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          {c.name} {c.stripe_account_id ? '• Partner' : ''}{c.muxChannel?.hasChannel ? ' • Live Channel' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Assigning a club enables club branding, discovery filtering, and partner club live streaming across any sport.
                    </p>
                  </div>

                  {/* Competition Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-slate-400" />
                        {activeSportConfig.participants.competitionLabel || 'Competition'}
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">Optional</span>
                    </div>
                    <select
                      value={competitionId || ''}
                      onChange={(e) => setCompetitionId(e.target.value ? e.target.value : null)}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                      id="select-match-competition"
                    >
                      <option value="">{`No ${(activeSportConfig.participants.competitionLabel || 'competition').toLowerCase()} assigned`}</option>
                      {/* Matching Sport Competitions */}
                      {competitions.filter(c => (c.sport || 'football').toLowerCase() === (currentSport || 'football').toLowerCase()).length > 0 && (
                        <optgroup label={`${activeSportConfig.name} Competitions`}>
                          {competitions
                            .filter(c => (c.sport || 'football').toLowerCase() === (currentSport || 'football').toLowerCase())
                            .map(comp => (
                              <option key={comp.id} value={comp.id}>
                                {comp.name} {comp.season ? `(${comp.season})` : ''}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {/* Other Sports Competitions */}
                      {competitions.filter(c => (c.sport || 'football').toLowerCase() !== (currentSport || 'football').toLowerCase()).length > 0 && (
                        <optgroup label="Other Sports Competitions">
                          {competitions
                            .filter(c => (c.sport || 'football').toLowerCase() !== (currentSport || 'football').toLowerCase())
                            .map(comp => (
                              <option key={comp.id} value={comp.id}>
                                {comp.name} {comp.season ? `(${comp.season})` : ''} • [{(comp.sport || 'football').toUpperCase()}]
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {`Assigning a ${(activeSportConfig.participants.competitionLabel || 'competition').toLowerCase()} links this event to ${activeSportConfig.name.toLowerCase()} schedules.`}
                    </p>
                  </div>
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
                          disabled={initialSportCategoryId !== undefined && Number(cat.id) === initialSportCategoryId}
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
                      value={description}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono transition-colors"
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setDescription(val);
                      }}
                    />
                  </div>
                )}

                {/* Mux Live Stream & Manual Playback Configuration */}
                {streamProvider === 'mux' && (
                  <div className="space-y-4 animate-in fade-in">
                    {selectedClub && (
                      <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 p-3.5 flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                            <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>Partner Club Assigned: {selectedClub.name}</span>
                            {selectedClub.muxChannel?.hasChannel ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                {selectedClub.muxChannel.isSuspended ? 'Channel Suspended' : 'Reusable Channel Active'}
                              </span>
                            ) : selectedClub.muxStreamingApproved ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                Approved (No Channel Yet)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                Live Streaming Approval Pending
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-800/80 dark:text-indigo-200/80">
                            {selectedClub.muxChannel?.hasChannel
                              ? 'This club can broadcast this Event directly using their reusable Mux channel and permanent OBS/encoder credentials in Partner Dashboard → Live Streaming. Leave this standalone stream empty if the club will use their reusable channel.'
                              : 'Manage streaming approval or provision this club’s single reusable Mux channel in Partner Clubs rather than generating separate per-event stream keys.'}
                          </p>
                        </div>
                        <Link
                          to="/admin/clubs"
                          className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline shrink-0"
                        >
                          Manage Club Channel →
                        </Link>
                      </div>
                    )}

                    {/* WatchWDS Managed Mux Live Stream Card */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Radio className="w-4 h-4" style={{ color: primaryColor }} />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Mux Live Stream
                          </span>
                          {(() => {
                            const pill = formatMuxStatusPill(muxLiveStreamId ? (muxStreamStatus || 'idle') : null);
                            return (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${pill.cls}`}>
                                {pill.text}
                              </span>
                            );
                          })()}
                        </div>

                        {muxLiveStreamId ? (
                          <button
                            type="button"
                            onClick={handleRefreshMuxStatus}
                            disabled={isRefreshingMuxStatus}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMuxStatus ? 'animate-spin' : ''}`} />
                            <span>Refresh status</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCreateMuxLiveStream}
                            disabled={isCreatingMuxStream || muxServerConfigured === false}
                            style={primaryButtonStyle}
                            className="disabled:opacity-50 inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm hover:opacity-90 active:scale-95"
                          >
                            {isCreatingMuxStream ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Radio className="w-3.5 h-3.5" />
                            )}
                            <span>{activeEventId ? 'Create Mux Live Stream' : 'Save Draft & Create Live Stream'}</span>
                          </button>
                        )}
                      </div>

                      {muxServerConfigured === false && !muxLiveStreamId && (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Server Mux credentials (<code className="font-mono">MUX_TOKEN_ID</code> / <code className="font-mono">MUX_TOKEN_SECRET</code>) are not configured. You can still configure a manual Playback ID or HLS URL below.
                          </span>
                        </div>
                      )}

                      {muxLiveStreamId ? (
                        <div className="space-y-3 pt-1">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            {muxStreamStatus === 'disabled'
                              ? 'This Mux Live Stream is disabled.'
                              : muxStreamStatus === 'error'
                              ? (muxErrorMessage || 'Mux reported a stream processing error.')
                              : 'Ready for broadcasting. WatchWDS automatically plays this stream using the Playback ID below — you do not need to paste it manually.'}
                          </p>

                          <div className="grid sm:grid-cols-2 gap-3 text-xs">
                            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Playback ID
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <code className="font-mono text-slate-900 dark:text-slate-100 truncate">
                                  {muxPlaybackId || 'Pending...'}
                                </code>
                                {muxPlaybackId && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMuxField(muxPlaybackId, 'Playback ID')}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                                    title="Copy Playback ID"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Mux Live Stream ID
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <code className="font-mono text-slate-700 dark:text-slate-300 truncate">
                                  {muxLiveStreamId}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyMuxField(muxLiveStreamId, 'Live Stream ID')}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                                  title="Copy Live Stream ID"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {muxAssetPlaybackId && (
                            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2">
                              <span>
                                Replay VOD Asset Ready: <code className="font-mono font-bold">{muxAssetPlaybackId}</code>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMuxField(muxAssetPlaybackId, 'Replay Asset Playback ID')}
                                className="hover:underline font-bold shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          )}

                          {/* Broadcast RTMP Credentials */}
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <KeyRound className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                              <span>Broadcast Credentials (OBS / vMix / Hardware Encoder)</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase text-slate-400 mr-2">RTMP URL:</span>
                                <code className="font-mono text-slate-800 dark:text-slate-200 break-all">{muxRtmpUrl}</code>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyMuxField(muxRtmpUrl, 'RTMP Server URL')}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                                title="Copy RTMP Server URL"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400 mr-2">Stream Key:</span>
                                <code className="font-mono text-slate-900 dark:text-white break-all">
                                  {showMuxStreamKey && muxStreamKey ? muxStreamKey : '••••••••••••••••••••••••'}
                                </code>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={handleToggleRevealStreamKey}
                                  disabled={isLoadingMuxCredentials}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  {isLoadingMuxCredentials ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : showMuxStreamKey ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                  <span>{showMuxStreamKey ? 'Hide' : 'Reveal'}</span>
                                </button>
                                {showMuxStreamKey && muxStreamKey && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMuxField(muxStreamKey, 'Stream Key')}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    title="Copy Stream Key"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click <strong>{activeEventId ? 'Create Mux Live Stream' : 'Save Draft & Create Live Stream'}</strong> to generate a Playback ID and private RTMP stream key automatically.
                        </p>
                      )}
                    </div>

                    {/* Signed Playback Protection Controls */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/60 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                            <Lock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Playback Security Policy</span>
                            {isUpdatingPolicy && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Restrict stream manifests with short-lived server-signed JWTs after viewer access verification.
                          </p>
                        </div>
                        {!muxSigningConfigured && (
                          <Link
                            to="/admin/settings?tab=mux"
                            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            Configure Signing Keys →
                          </Link>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <button
                          type="button"
                          disabled={isUpdatingPolicy}
                          onClick={() => handleSwitchMuxPlaybackPolicy('public')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            muxPlaybackPolicy === 'public'
                              ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-sky-500" />
                            Public Playback
                          </div>
                          <div className="text-[10px] opacity-80 mt-0.5">Standard Mux playback without JWT tokens.</div>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdatingPolicy}
                          onClick={() => handleSwitchMuxPlaybackPolicy('signed')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            muxPlaybackPolicy === 'signed'
                              ? 'border-emerald-500 bg-emerald-500/10 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-500" />
                            Signed Playback (JWT Protected)
                          </div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            Requires WatchWDS entitlement + RS256 token.
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Watermark / Logo Overlay Configuration */}
                    <div className="space-y-2">
                      <MuxWatermarkEditor
                        value={muxWatermarkConfig}
                        onChange={setMuxWatermarkConfig}
                        compact
                      />
                      {activeEventId && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleSaveEventWatermark}
                            disabled={isUpdatingWatermark}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                          >
                            {isUpdatingWatermark && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Apply Watermark Settings to Event</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Existing Manual Mux Quick Setup (Retained for Legacy / Manual Events) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Manual Mux setup (optional override / existing Playback ID or HLS URL)
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

                <div className="relative w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-950/40 overflow-hidden flex flex-col items-center justify-center p-2 text-center transition-colors">
                  {(() => {
                    const effectivePreview =
                      streamProvider === 'mux'
                        ? (description.trim() || (currentEffectiveStatus === 'completed' || currentEffectiveStatus === 'full_match' ? (muxAssetPlaybackId || muxPlaybackId) : (muxPlaybackId || muxAssetPlaybackId)) || '')
                        : description;
                    const previewIsLive =
                      streamProvider === 'mux' && muxStreamStatus === 'active'
                        ? true
                        : currentEffectiveStatus === 'live';
                    return youtubeSource(effectivePreview) ? <WatchWDSYouTubePlayer source={effectivePreview} title={title} isLive={previewIsLive} /> : effectivePreview ? (
                      <div className="relative w-full aspect-video">
                        <div 
                          className="w-full h-full overflow-hidden [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-lg [&>video]:w-full [&>video]:h-full [&>video]:rounded-lg [&>mux-player]:w-full [&>mux-player]:h-full [&>mux-player]:rounded-lg [&>mux-player]:block"
                          dangerouslySetInnerHTML={{ __html: formatStreamHtml(effectivePreview, { isLive: previewIsLive, playbackToken: muxPreviewToken }) }}
                        />
                        {muxWatermarkConfig.enabled && muxWatermarkConfig.mode === 'player_overlay' && (
                          <WatermarkOverlay config={muxWatermarkConfig} />
                        )}
                      </div>
                    ) : null;
                  })()}
                  {!(streamProvider === 'mux' ? (description.trim() || muxPlaybackId || muxAssetPlaybackId) : description) && (
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
              {/* Match Timing & Broadcast Card */}
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                {/* Event date and start time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Event date and start time
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomDate(new Date().toISOString().slice(0, 16))}
                      style={{ color: primaryColor }}
                      className="text-[11px] font-bold hover:underline"
                    >
                      Set Current Time
                    </button>
                  </div>
                  <div 
                    className="relative cursor-pointer"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && 'showPicker' in input) {
                        try { (input as any).showPicker(); } catch {}
                      }
                    }}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input 
                      type="datetime-local"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors font-medium cursor-pointer"
                    />
                  </div>
                  {customDate && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-1 font-mono">
                      {formatDateTimeDisplay(customDate)}
                    </p>
                  )}
                </div>

                {/* Time zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Time zone
                  </label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                  >
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>

                {/* Broadcast status & Status mode (2 columns side by side) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Broadcast status
                    </label>
                    <select 
                      value={status === 'completed' ? 'full_match' : status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        setStatus(newStatus);
                        if ((newStatus === 'full_match' || newStatus === 'completed' || newStatus === 'live' || newStatus === 'highlights') && !customDate) {
                          setCustomDate(new Date().toISOString().slice(0, 16));
                        }
                      }}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live broadcast</option>
                      <option value="full_match">Full match</option>
                      <option value="highlights">Highlights</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Status mode
                    </label>
                    <select
                      value={statusMode}
                      onChange={(e) => {
                        const mode = e.target.value as 'manual' | 'automatic';
                        setStatusMode(mode);
                        setIsManualOverride(mode === 'manual');
                        if (mode === 'manual' && !customDate) {
                          setCustomDate(new Date().toISOString().slice(0, 16));
                        }
                      }}
                      className="w-full bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors"
                    >
                      <option value="manual">Manual</option>
                      <option value="automatic">Automatic</option>
                    </select>
                  </div>
                </div>

                {/* Estimated broadcast duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Estimated broadcast duration
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      min="15"
                      max="600"
                      value={duration}
                      onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                      className="w-28 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors font-mono"
                    />
                    <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">minutes</span>
                  </div>
                </div>

                {/* Informational banner */}
                <div className="flex items-start gap-2.5 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Publishing does not start the broadcast. An estimate must not end an active stream.</span>
                </div>

                {/* Hide live controls checkbox */}
                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={hideLiveControls}
                    onChange={(e) => setHideLiveControls(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[var(--primary-500)] focus:ring-[var(--primary-500)] bg-slate-50 dark:bg-slate-950/40"
                  />
                  <span>Hide live controls for highlights / interviews.</span>
                </label>
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

                {/* Time-limited event access toggle switch (Image 3 design) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={eventAccessEnabled}
                        onChange={(e) => setEventAccessEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[var(--primary-500)] relative"></div>
                      <span>Time-limited event access</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Limit event access to a countdown window (Free, Plan or PPV). When expired, the match automatically switches to revoked status.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Access Period (Optional) - Image 3 design */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="bg-white/90 dark:bg-[#0f172a]/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-sm transition-all">
                <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3>Access period (optional)</h3>
                </div>

                {/* Start time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Start time
                    </label>
                    {accessStartTime && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTimeDisplay(accessStartTime)}
                      </span>
                    )}
                  </div>
                  <div 
                    className="relative cursor-pointer"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && 'showPicker' in input) {
                        try { (input as any).showPicker(); } catch {}
                      }
                    }}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input 
                      type="datetime-local"
                      value={accessStartTime}
                      onChange={(e) => setAccessStartTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors font-medium cursor-pointer"
                    />
                  </div>
                </div>

                {/* End time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      End time
                    </label>
                    {accessEndTime && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTimeDisplay(accessEndTime)}
                      </span>
                    )}
                  </div>
                  <div 
                    className="relative cursor-pointer"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && 'showPicker' in input) {
                        try { (input as any).showPicker(); } catch {}
                      }
                    }}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input 
                      type="datetime-local"
                      value={accessEndTime}
                      onChange={(e) => setAccessEndTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 focus:border-[var(--primary-500)] focus:ring-1 focus:ring-[var(--primary-500)] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition-colors font-medium cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Presets row */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Quick duration helper
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: '3d', label: '3 Days', days: 3 },
                      { id: '7d', label: '7 Days', days: 7 },
                      { id: '30d', label: '30 Days', days: 30 },
                      { id: '1y', label: '1 Year', days: 365 },
                      { id: 'custom', label: 'Custom', days: 1 },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setEventAccessPreset(preset.id as any);
                          const baseStart = accessStartTime ? new Date(accessStartTime) : (customDate ? new Date(customDate) : new Date());
                          if (!accessStartTime) setAccessStartTime(baseStart.toISOString().slice(0, 16));
                          const end = new Date(baseStart.getTime() + preset.days * 24 * 60 * 60 * 1000);
                          setAccessEndTime(end.toISOString().slice(0, 16));
                        }}
                        style={eventAccessPreset === preset.id ? primaryButtonStyle : undefined}
                        className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border text-center transition-all ${
                          eventAccessPreset === preset.id
                            ? 'border-transparent shadow-sm'
                            : 'bg-slate-100/80 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                  onClick={() => handleSave()}
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
            <div className={`w-full rounded-xl bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative ${youtubeSource(description) ? "" : "aspect-video"}`}>
              {youtubeSource(description) ? <WatchWDSYouTubePlayer source={description} title={title} isLive={currentEffectiveStatus === 'live'} /> : (streamProvider === 'mux' ? (description.trim() || muxPlaybackId || muxAssetPlaybackId) : description) ? (
                <div className="relative w-full h-full">
                  <div 
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>video]:w-full [&>video]:h-full [&>mux-player]:w-full [&>mux-player]:h-full [&>mux-player]:block"
                    dangerouslySetInnerHTML={{ __html: formatStreamHtml((streamProvider === 'mux' ? (description.trim() || muxPlaybackId || muxAssetPlaybackId || '') : description), { isLive: muxStreamStatus === 'active' || currentEffectiveStatus === 'live', playbackToken: muxPreviewToken }) }}
                  />
                  {muxWatermarkConfig.enabled && muxWatermarkConfig.mode === 'player_overlay' && (
                    <WatermarkOverlay config={muxWatermarkConfig} />
                  )}
                </div>
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
