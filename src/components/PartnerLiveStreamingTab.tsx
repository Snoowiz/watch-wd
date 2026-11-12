import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  Radio,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Play,
  Square,
  Monitor,
  Cpu,
  Smartphone,
  Lock,
  Clock,
  FlaskConical,
  ExternalLink,
  Calendar,
} from 'lucide-react';

interface PartnerLiveStreamingTabProps {
  clubId?: string | null;
  initialMatchId?: string | null;
  onStatusChanged?: () => void;
}

type SetupGuideTab = 'obs' | 'hardware' | 'mobile';

export function PartnerLiveStreamingTab({
  clubId,
  initialMatchId,
  onStatusChanged,
}: PartnerLiveStreamingTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [payload, setPayload] = useState<any>(null);

  // Ephemeral in-memory step-up auth + revealed secret state (NEVER persisted to storage)
  const [reauthToken, setReauthToken] = useState<string | null>(null);
  const [reauthExpiresAt, setReauthExpiresAt] = useState<number>(0);
  const [revealedCreds, setRevealedCreds] = useState<{
    streamKey: string;
    rtmpUrl: string;
    rtmpStandardUrl: string;
    srtFullUrl: string;
  } | null>(null);
  const [autoHideSecondsLeft, setAutoHideSecondsLeft] = useState<number>(0);

  // Step-up password modal state
  const [reauthModalOpen, setReauthModalOpen] = useState(false);
  const [pendingReauthAction, setPendingReauthAction] = useState<'reveal' | 'copy_key' | 'copy_srt' | 'reset_key' | null>(null);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthSubmitting, setReauthSubmitting] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);

  // Reset key confirmation modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);

  // Action busy flags
  const [provisioning, setProvisioning] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [resettingKey, setResettingKey] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [assigningEvent, setAssigningEvent] = useState(false);
  const [completingSessionId, setCompletingSessionId] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [guideTab, setGuideTab] = useState<SetupGuideTab>('obs');

  const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadStreamingStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const res = await fetch(`/api/partner/streaming${qs}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to load club streaming channel status.');
        return;
      }
      setPayload(data);
      const events = Array.isArray(data?.eligibleEvents) ? data.eligibleEvents : [];
      const activeEventId = data?.activeSession?.match_id || data?.activeSession?.matchId;
      if (activeEventId) {
        setSelectedMatchId(String(activeEventId));
      } else if (
        initialMatchId &&
        events.some((ev: any) => String(ev.id) === String(initialMatchId))
      ) {
        setSelectedMatchId(String(initialMatchId));
      } else if (events.length > 0 && !selectedMatchId) {
        setSelectedMatchId(String(events[0].id));
      }
    } catch {
      setError('Network error while connecting to live streaming service.');
    } finally {
      setLoading(false);
    }
  }, [clubId, authToken]);

  useEffect(() => {
    loadStreamingStatus();
  }, [loadStreamingStatus]);

  useEffect(() => {
    if (!initialMatchId || !payload) return;
    if (payload?.activeSession?.match_id || payload?.activeSession?.matchId) return;
    const events = Array.isArray(payload?.eligibleEvents) ? payload.eligibleEvents : [];
    if (events.some((ev: any) => String(ev.id) === String(initialMatchId))) {
      setSelectedMatchId(String(initialMatchId));
    }
  }, [initialMatchId, payload]);

  // Auto-hide revealed stream key & sensitive SRT URL after 60 seconds
  useEffect(() => {
    if (!revealedCreds || autoHideSecondsLeft <= 0) {
      if (revealedCreds && autoHideSecondsLeft <= 0) {
        setRevealedCreds(null);
      }
      return;
    }
    const timer = window.setInterval(() => {
      setAutoHideSecondsLeft((prev) => {
        if (prev <= 1) {
          setRevealedCreds(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [revealedCreds, autoHideSecondsLeft]);

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2000);
    } catch {
      setFeedback({ type: 'error', message: `Could not copy ${label} to clipboard.` });
    }
  };

  const hasValidReauthToken = () => {
    return Boolean(reauthToken && Date.now() < reauthExpiresAt - 5000);
  };

  const executeRevealWithToken = async (
    stepUpToken: string,
    afterReveal?: 'show' | 'copy_key' | 'copy_srt'
  ) => {
    setRevealing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/partner/streaming/credentials/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reauth-Token': stepUpToken,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.reauthRequired) {
          setReauthToken(null);
          setReauthExpiresAt(0);
          setPendingReauthAction(
            afterReveal === 'copy_key' ? 'copy_key' : afterReveal === 'copy_srt' ? 'copy_srt' : 'reveal'
          );
          setReauthModalOpen(true);
          return;
        }
        setFeedback({ type: 'error', message: data?.error || 'Could not reveal stream key.' });
        return;
      }

      if (afterReveal === 'copy_key') {
        await copyValue(data.streamKey, 'Stream Key');
      } else if (afterReveal === 'copy_srt') {
        await copyValue(data.srtFullUrl, 'SRT URL');
      } else {
        setRevealedCreds({
          streamKey: data.streamKey,
          rtmpUrl: data.rtmpUrl,
          rtmpStandardUrl: data.rtmpStandardUrl,
          srtFullUrl: data.srtFullUrl,
        });
        setAutoHideSecondsLeft(Number(data.autoHideSeconds) || 60);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error while fetching stream credentials.' });
    } finally {
      setRevealing(false);
    }
  };

  const triggerProtectedAction = async (
    action: 'reveal' | 'copy_key' | 'copy_srt' | 'reset_key'
  ) => {
    setFeedback(null);
    if (action === 'reveal' && revealedCreds) {
      setRevealedCreds(null);
      setAutoHideSecondsLeft(0);
      return;
    }

    if (hasValidReauthToken() && reauthToken) {
      if (action === 'reset_key') {
        setResetConfirmed(false);
        setResetModalOpen(true);
      } else {
        await executeRevealWithToken(reauthToken, action === 'reveal' ? 'show' : action);
      }
      return;
    }

    setPendingReauthAction(action);
    setReauthPassword('');
    setReauthError(null);
    setReauthModalOpen(true);
  };

  const completeStepUpReauth = async (bodyPayload: Record<string, any>) => {
    const res = await fetch('/api/partner/streaming/reauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ ...bodyPayload, clubId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.reauthToken) {
      throw new Error(data?.error || 'Re-authentication verification failed.');
    }

    const expMs = data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 4 * 60 * 1000;
    setReauthToken(data.reauthToken);
    setReauthExpiresAt(expMs);
    setReauthModalOpen(false);
    setReauthPassword('');

    const action = pendingReauthAction;
    setPendingReauthAction(null);
    if (action === 'reset_key') {
      setResetConfirmed(false);
      setResetModalOpen(true);
    } else if (action) {
      await executeRevealWithToken(data.reauthToken, action === 'reveal' ? 'show' : action);
    }
  };

  const handleSubmitReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword.trim()) {
      setReauthError('Please enter your account password.');
      return;
    }
    setReauthSubmitting(true);
    setReauthError(null);
    try {
      await completeStepUpReauth({ password: reauthPassword });
    } catch (err: any) {
      setReauthError(err?.message || 'Password verification failed.');
    } finally {
      setReauthSubmitting(false);
    }
  };

  const handleGoogleReauth = async () => {
    setReauthSubmitting(true);
    setReauthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const firebaseIdToken = await cred.user.getIdToken();
      await completeStepUpReauth({ firebaseIdToken });
    } catch (err: any) {
      setReauthError(err?.message || 'Google account verification failed or was cancelled.');
    } finally {
      setReauthSubmitting(false);
    }
  };

  const handleCreateChannel = async () => {
    setProvisioning(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/partner/streaming/channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Failed to create streaming credentials.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Reusable club Mux streaming channel created. Verify your password when ready to reveal your stream key.',
      });
      await loadStreamingStatus();
      onStatusChanged?.();
    } catch {
      setFeedback({ type: 'error', message: 'Network error creating streaming credentials.' });
    } finally {
      setProvisioning(false);
    }
  };

  const handleResetStreamKey = async () => {
    if (!resetConfirmed || !reauthToken) return;
    setResettingKey(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/partner/streaming/reset-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reauth-Token': reauthToken,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ clubId, confirm: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.reauthRequired) {
          setResetModalOpen(false);
          setReauthToken(null);
          setPendingReauthAction('reset_key');
          setReauthModalOpen(true);
          return;
        }
        setFeedback({ type: 'error', message: data?.error || 'Could not reset stream key.' });
        return;
      }
      setRevealedCreds(null);
      setAutoHideSecondsLeft(0);
      setResetModalOpen(false);
      setFeedback({
        type: 'success',
        message: 'Stream key rotated! Previous keys have been invalidated — update OBS/your encoder before your next broadcast.',
      });
      await loadStreamingStatus();
    } catch {
      setFeedback({ type: 'error', message: 'Network error rotating stream key.' });
    } finally {
      setResettingKey(false);
    }
  };

  const handleAssignEvent = async () => {
    if (!selectedMatchId) return;
    setAssigningEvent(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/partner/streaming/assign-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ matchId: selectedMatchId, clubId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Failed to assign event to streaming channel.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: data.idempotent
          ? 'This Event is already linked to your reusable streaming channel and ready for broadcast.'
          : 'Event assigned to your reusable channel! You can now start your encoder whenever ready.',
      });
      await loadStreamingStatus();
      onStatusChanged?.();
    } catch {
      setFeedback({ type: 'error', message: 'Network error assigning Event to channel.' });
    } finally {
      setAssigningEvent(false);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    if (!confirm('Mark this broadcast session as completed and signal Mux to close the active live feed? Replay VOD for this Event remains preserved on its Event page.')) {
      return;
    }
    setCompletingSessionId(sessionId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/partner/streaming/sessions/${encodeURIComponent(sessionId)}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ clubId, signalMuxComplete: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Could not finalize broadcast session.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Broadcast completed! Your reusable channel is free for the next Event.',
      });
      await loadStreamingStatus();
      onStatusChanged?.();
    } catch {
      setFeedback({ type: 'error', message: 'Network error completing broadcast session.' });
    } finally {
      setCompletingSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
        <p className="text-xs font-semibold">Loading reusable club streaming console...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-xs text-rose-600 dark:text-rose-300 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={loadStreamingStatus}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const globalEnabled = payload?.globalStreamingEnabled !== false;
  const muxServerConfigured = Boolean(payload?.muxServerConfigured);
  const allowSelfProvision = payload?.allowPartnerSelfProvision !== false;
  const clubInfo = payload?.club || {};
  const channel = payload?.channel || null;
  const activeSession = payload?.activeSession || null;
  const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
  const eligibleEvents = Array.isArray(payload?.eligibleEvents) ? payload.eligibleEvents : [];
  const ingest = payload?.ingest || channel?.ingest || {};

  const isLive = Boolean(activeSession && (activeSession.status === 'live' || channel?.channelStatus === 'active'));
  const hasChannel = Boolean(channel?.muxLiveStreamId);

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <ShieldCheck className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Global Feature Disabled / Server Pending / Club Approval Gates */}
      {!globalEnabled && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-bold text-sm">Partner Club Live Streaming is Paused</h3>
            <p className="mt-1 opacity-90">
              Platform administrators have temporarily disabled partner club Mux streaming. Existing Event replays remain playable.
            </p>
          </div>
        </div>
      )}

      {!clubInfo.muxStreamingApproved && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Streaming Approval Pending
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Your club profile ({clubInfo.name}) does not yet have Mux live streaming enabled. Contact the WatchWDS administrator team to approve your reusable club channel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                1. Club Account Active
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                2. Awaiting Admin Streaming Approval
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                3. Reveal RTMP / SRT Keys &amp; Assign Events
              </span>
            </div>
          </div>
        </div>
      )}

      {channel?.isSuspended && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-200">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
          <div>
            <h3 className="font-bold text-sm">Club Streaming Channel Suspended</h3>
            <p className="mt-1">
              Your reusable Mux streaming channel is currently suspended by platform administration. Please contact support to restore broadcast access.
            </p>
          </div>
        </div>
      )}

      {/* Channel Header & Provisioning State */}
      {clubInfo.muxStreamingApproved && !hasChannel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
            <Radio className="w-7 h-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Set Up Your Club’s Permanent Live Channel
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create one reusable WatchWDS Mux channel for {clubInfo.name}. Configure your camera or OBS Studio once and reuse the exact same ingest URL and stream key across every Football, Basketball, Tennis, Boxing, or multi-sport Event you host.
            </p>
          </div>
          {!muxServerConfigured ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              Mux API credentials are not yet configured on the platform server.
            </p>
          ) : allowSelfProvision && globalEnabled ? (
            <button
              type="button"
              disabled={provisioning}
              onClick={handleCreateChannel}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              <span>Create Streaming Credentials</span>
            </button>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              Channel self-creation is currently restricted to platform admins. Contact WatchWDS support to provision your channel.
            </p>
          )}
        </div>
      )}

      {/* Active Channel Credentials + Event Binding Console */}
      {hasChannel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Permanent Reusable Channel Credentials */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-500" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Reusable Club Broadcast Credentials
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        channel.isSuspended
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : channel.channelStatus === 'active'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {channel.isSuspended ? 'Suspended' : channel.channelStatus === 'active' ? 'Live Now' : 'Ready & Idle'}
                    </span>
                    {channel.isTestMode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <FlaskConical className="w-3 h-3" /> Test Stream Mode
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Save these settings once in your streaming software or encoder. Never share your Stream Key publicly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadStreamingStatus}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Ingest Server URLs */}
              <div className="space-y-3 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Primary RTMPS Server URL (Recommended)
                    </span>
                    <code className="font-mono text-slate-900 dark:text-slate-100 break-all">
                      {revealedCreds?.rtmpUrl || ingest.rtmpsUrl || ingest.rtmpUrl || 'rtmps://global-live.mux.com:443/app'}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        revealedCreds?.rtmpUrl || ingest.rtmpsUrl || ingest.rtmpUrl || 'rtmps://global-live.mux.com:443/app',
                        'RTMPS URL'
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] shrink-0"
                  >
                    {copiedLabel === 'RTMPS URL' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLabel === 'RTMPS URL' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Standard RTMP Fallback
                      </span>
                      <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                        {ingest.rtmpStandardUrl || 'rtmp://global-live.mux.com:5222/app'}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(ingest.rtmpStandardUrl || 'rtmp://global-live.mux.com:5222/app', 'RTMP URL')
                      }
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                      title="Copy Standard RTMP URL"
                    >
                      {copiedLabel === 'RTMP URL' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        SRT Ingest URL (Key Protected)
                      </span>
                      <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                        {revealedCreds?.srtFullUrl || 'srt://global-live.mux.com:6001?streamid=••••'}
                      </code>
                    </div>
                    <button
                      type="button"
                      disabled={channel.isSuspended || revealing}
                      onClick={() => triggerProtectedAction('copy_srt')}
                      className="text-slate-400 hover:text-amber-500 shrink-0 disabled:opacity-40"
                      title="Copy Full SRT URL (Requires Re-Auth)"
                    >
                      {copiedLabel === 'SRT URL' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Protected Stream Key Row */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>Private Stream Key</span>
                    </div>
                    {revealedCreds && autoHideSecondsLeft > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" /> Auto-hiding in {autoHideSecondsLeft}s
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Password verified access
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                    <code className="font-mono text-xs text-slate-900 dark:text-white break-all flex-1">
                      {revealedCreds?.streamKey || channel.maskedStreamKey || '••••••••••••••••••••••••'}
                    </code>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={channel.isSuspended || revealing}
                        onClick={() => triggerProtectedAction('reveal')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                      >
                        {revealing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : revealedCreds ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        <span>{revealedCreds ? 'Hide Key' : 'Reveal Key'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={channel.isSuspended || revealing}
                        onClick={() => triggerProtectedAction('copy_key')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50"
                      >
                        {copiedLabel === 'Stream Key' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLabel === 'Stream Key' ? 'Copied' : 'Copy Key'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={channel.isSuspended || isLive || resettingKey}
                        onClick={() => triggerProtectedAction('reset_key')}
                        title={
                          isLive
                            ? 'End active broadcast before rotating the stream key'
                            : 'Generate a new Mux Stream Key and invalidate the old key'
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset Key</span>
                      </button>
                    </div>
                  </div>
                  {isLive && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Stream key rotation is locked while an active broadcast session is live to prevent interrupting viewers.
                    </p>
                  )}
                </div>

                {/* Channel metadata strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Playback Policy: <strong className="uppercase">{channel.muxPlaybackPolicy || 'public'}</strong></span>
                  <span>Session Cap: <strong>{channel.maxSessionMinutes || 240} mins</strong></span>
                  {channel.keyRotatedAt && (
                    <span>Last Key Reset: {new Date(channel.keyRotatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Device-Neutral Encoder Setup Guide */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Encoder &amp; Broadcast Setup Guide
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure your encoder once using your club credentials — then pick any Event on the right before clicking Go Live.
                </p>
              </div>

              <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setGuideTab('obs')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    guideTab === 'obs'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> OBS / Software
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('hardware')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    guideTab === 'hardware'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" /> Hardware Encoders
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('mobile')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    guideTab === 'mobile'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile Apps
                </button>
              </div>

              {guideTab === 'obs' && (
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li>Open <strong>OBS Studio</strong>, vMix, or Ecamm Live and go to <strong>Settings &rarr; Stream</strong>.</li>
                  <li>Choose <strong>Service: Custom...</strong>, paste the <strong>RTMPS Server URL</strong> (<code className="font-mono">rtmps://global-live.mux.com:443/app</code>), and paste your Club Stream Key.</li>
                  <li>Recommended output settings: <strong>1920x1080 or 1280x720</strong>, Rate Control <strong>CBR</strong> (3500–6000 kbps), <strong>Keyframe Interval = 2 seconds</strong>, Audio AAC 128–192 kbps.</li>
                  <li>Select today’s Event in the Event Assignment panel on this page, then click <strong>Start Streaming</strong> in OBS.</li>
                </ol>
              )}

              {guideTab === 'hardware' && (
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li>Compatible with Teradek, LiveU Solo, Blackmagic ATEM Mini Pro/Extreme, Yolobox, and Pearl encoders.</li>
                  <li>Choose <strong>RTMPS</strong> (or standard RTMP fallback on legacy firmware) and save your server URL + club stream key in a reusable preset.</li>
                  <li>For unstable stadium cellular links, configure <strong>SRT Caller Mode</strong> using the Key-Protected SRT Ingest URL (port 6001) and set H.264 <strong>GOP / Keyframe = 2s</strong>.</li>
                  <li>Verify an Event is assigned in WatchWDS before taking the encoder live so replays archive onto the right Event page.</li>
                </ol>
              )}

              {guideTab === 'mobile' && (
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li>Install a pro broadcast app such as <strong>Larix Broadcaster</strong> or <strong>PRISM Live Studio</strong> on iOS/Android.</li>
                  <li>Create one saved connection named <strong>WatchWDS {clubInfo.name} Channel</strong> with <code className="font-mono">rtmps://global-live.mux.com:443/app</code> + your Stream Key.</li>
                  <li>Set Video Keyframe Frequency to <strong>2 seconds</strong> and enable adaptive bitrate if streaming over 4G/5G pitch-side.</li>
                  <li>Before kick-off, tap-off, or first serve, select the target Event here on WatchWDS and tap <strong>Go Live</strong> in your app.</li>
                </ol>
              )}
            </div>
          </div>

          {/* RIGHT: Multi-Sport Event Binding & Active Broadcast Session Control */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>Broadcast Session Control</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Link one Event at a time across any sport. When your stream finishes, its replay VOD saves automatically to that Event alone.
                </p>
              </div>

              {activeSession ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {isLive ? 'Broadcasting Live' : `Channel Bound (${activeSession.status})`}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {activeSession.event_title || activeSession.eventTitle || `Event #${activeSession.match_id}`}
                      </h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase font-bold text-amber-600 dark:text-amber-400">
                          {activeSession.event_sport || 'event'}
                        </span>
                        {activeSession.started_at && (
                          <span>• Started {new Date(activeSession.started_at).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/matches/${activeSession.match_id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] shrink-0 hover:border-amber-500"
                    >
                      <ExternalLink className="w-3 h-3" /> View Event
                    </Link>
                  </div>

                  {!isLive && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Waiting for encoder signal. Start streaming from OBS/your device using your saved credentials to go live automatically.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to={`/matches/${activeSession.match_id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800"
                    >
                      <Play className="w-3.5 h-3.5" /> Open Player Page
                    </Link>
                    <button
                      type="button"
                      disabled={completingSessionId === String(activeSession.id)}
                      onClick={() => handleCompleteSession(String(activeSession.id))}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {completingSessionId === String(activeSession.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>End Broadcast</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Select Event to Go Live
                  </label>
                  {eligibleEvents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-500">
                      No upcoming or eligible Events are currently assigned to {clubInfo.name}. Once an Event (Football, Basketball, Tennis, Boxing, etc.) is assigned to your club, select it here before broadcasting.
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedMatchId}
                        onChange={(e) => setSelectedMatchId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                      >
                        {eligibleEvents.map((ev: any) => (
                          <option key={ev.id} value={ev.id}>
                            [{(ev.sport || 'event').toUpperCase()}] {ev.title} ({ev.status})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedMatchId || assigningEvent || channel.isSuspended || !globalEnabled}
                        onClick={handleAssignEvent}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {assigningEvent ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Radio className="w-4 h-4" />
                        )}
                        <span>Prepare Event on Club Channel</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Past Broadcast Sessions History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Broadcast Sessions ({sessions.length})
                </h3>
              </div>
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400">No broadcasts recorded on this channel yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 text-xs">
                  {sessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/matches/${s.match_id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-amber-500 truncate block"
                        >
                          {s.event_title || `Event #${s.match_id}`}
                        </Link>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="uppercase">{s.event_sport || 'event'}</span>
                          {s.duration_minutes ? <span>• {s.duration_minutes} min</span> : null}
                          {s.mux_asset_playback_id ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                              • Replay Saved
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                          s.status === 'live'
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : s.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step-Up Password / Google OAuth Re-Authentication Modal */}
      {reauthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReauth}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {payload?.authMethod === 'google' ? 'Verify Google Sign-In' : 'Confirm Your Password'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {payload?.authMethod === 'google'
                    ? 'For your club’s security, confirm your identity with Google before viewing or rotating broadcast credentials.'
                    : 'For your club’s security, re-enter your WatchWDS password to access sensitive broadcast credentials.'}
                </p>
              </div>
            </div>

            {reauthError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                {reauthError}
              </div>
            )}

            {payload?.authMethod === 'google' ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleReauth}
                  disabled={reauthSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {reauthSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Continue with Google to Verify</span>
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Account Password
                </label>
                <input
                  type="password"
                  autoFocus
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your partner account password"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReauthModalOpen(false);
                  setPendingReauthAction(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              {payload?.authMethod !== 'google' && (
                <button
                  type="submit"
                  disabled={reauthSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {reauthSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Verify &amp; Continue</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Reset Stream Key Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Reusable Stream Key?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Generating a new stream key immediately invalidates your current key. You must paste the new stream key into OBS Studio, Larix, or your hardware encoder before your next broadcast.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(e) => setResetConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                I understand that any device currently configured with the old stream key will stop working until updated.
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!resetConfirmed || resettingKey}
                onClick={handleResetStreamKey}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {resettingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Key Rotation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

