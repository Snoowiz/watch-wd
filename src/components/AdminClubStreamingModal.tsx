import React, { useEffect, useState } from 'react';
import {
  Radio,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  X,
  KeyRound,
  Clock,
  Activity,
  Ban,
  CheckCircle,
  AlertTriangle,
  FlaskConical,
  History,
} from 'lucide-react';

interface AdminClubStreamingModalProps {
  club: {
    id: string;
    name: string;
    isActive?: boolean | number;
    is_active?: boolean | number;
    muxStreamingApproved?: boolean;
    mux_streaming_approved?: boolean | number;
    muxChannel?: any;
  };
  onClose: () => void;
  onUpdated?: () => void;
}

export function AdminClubStreamingModal({
  club,
  onClose,
  onUpdated,
}: AdminClubStreamingModalProps) {
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [clubSummary, setClubSummary] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [testModeOption, setTestModeOption] = useState(false);
  const [playbackPolicyOption, setPlaybackPolicyOption] = useState<'public' | 'signed'>('public');
  const [suspendReason, setSuspendReason] = useState('Suspended by platform administrator');
  const [maxSessionMinutes, setMaxSessionMinutes] = useState<number>(240);
  const [forceRotateWhileLive, setForceRotateWhileLive] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadGovernanceState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/mux/channels', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to load club streaming governance details.');
        return;
      }
      setGlobalEnabled(data?.globalStreamingEnabled !== false);
      const found = (data?.clubs || []).find((c: any) => String(c.clubId) === String(club.id));
      setClubSummary(found || null);
      if (found?.channel?.maxSessionMinutes) {
        setMaxSessionMinutes(Number(found.channel.maxSessionMinutes));
      }
      const clubSessions = (data?.recentSessions || []).filter(
        (s: any) => String(s.clubId ?? s.club_id) === String(club.id)
      );
      setSessions(clubSessions);
      const clubLogs = (data?.auditLogs || []).filter(
        (l: any) => String(l.clubId ?? l.club_id) === String(club.id)
      );
      setAuditLogs(clubLogs);
    } catch {
      setError('Network error while loading Mux channel telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGovernanceState();
  }, [club.id]);

  const invokeAction = async (
    actionKey: string,
    url: string,
    method: 'POST' | 'PUT',
    body?: any,
    okMessage?: string
  ) => {
    setBusyAction(actionKey);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Action failed.');
        return;
      }
      if (okMessage) setSuccessMsg(okMessage);
      await loadGovernanceState();
      onUpdated?.();
    } catch {
      setError('Network error executing streaming governance action.');
    } finally {
      setBusyAction(null);
    }
  };

  const approved = Boolean(
    clubSummary?.muxStreamingApproved ??
      club.muxStreamingApproved ??
      club.mux_streaming_approved
  );
  const channel = clubSummary?.channel || (club.muxChannel?.hasChannel ? club.muxChannel : null);
  const hasChannel = Boolean(channel?.hasChannel ?? channel?.muxLiveStreamId ?? channel?.id);
  const isSuspended = Boolean(channel?.isSuspended);
  const liveStatus = channel?.liveStatus || 'idle';
  const activeSessionId = channel?.activeSessionId || null;
  const isCurrentlyLive = Boolean(activeSessionId) || liveStatus === 'active';
  const usage = clubSummary?.usage || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative my-8 space-y-5 text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 pr-8">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {club.name} — Reusable Mux Channel
              </h3>
              {approved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Streaming Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-3 h-3" /> Approval Required
                </span>
              )}
              {hasChannel && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isSuspended
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : liveStatus === 'active'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse'
                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                  }`}
                >
                  {isSuspended ? 'Suspended' : liveStatus === 'active' ? 'LIVE NOW' : 'Idle & Reusable'}
                </span>
              )}
              {channel?.isTestMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <FlaskConical className="w-3 h-3" /> Test Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              One reusable Mux Live Stream channel across all sports (Football, Basketball, Tennis, Boxing &amp; dynamic sports). Enforces max 1 concurrent active broadcast.
            </p>
          </div>
        </div>

        {!globalEnabled && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Notice: Global <strong>Partner Live Streaming</strong> feature toggle is currently disabled in Feature Toggles.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
            <span>Loading reusable channel governance &amp; audit logs...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Step 1: Streaming Approval & Provisioning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Permission Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Club Streaming Permission
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {approved ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Only approved clubs can create or reveal their reusable Mux stream credentials and bind Events to go live.
                </p>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    invokeAction(
                      'approval',
                      `/api/admin/clubs/${encodeURIComponent(club.id)}/mux/approval`,
                      'PUT',
                      { approved: !approved },
                      !approved ? 'Club live streaming approved.' : 'Club streaming approval revoked.'
                    )
                  }
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    approved
                      ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {busyAction === 'approval' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{approved ? 'Revoke Streaming Permission' : 'Approve Club for Live Streaming'}</span>
                </button>
              </div>

              {/* Channel Summary / Provisioning Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Channel Infrastructure
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {usage.totalSessions ?? 0} sessions • {usage.totalMinutes ?? 0} min
                  </span>
                </div>

                {hasChannel ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Mux Stream ID:</span>
                      <code className="font-mono text-slate-900 dark:text-slate-100 truncate">
                        {channel.muxLiveStreamId}
                      </code>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Playback ID:</span>
                      <code className="font-mono text-slate-900 dark:text-slate-100 truncate">
                        {channel.muxPlaybackId}
                      </code>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Masked Stream Key:</span>
                      <code className="font-mono text-amber-600 dark:text-amber-400">
                        {channel.maskedStreamKey || '••••••••••••'}
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testModeOption}
                          onChange={(e) => setTestModeOption(e.target.checked)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span>Mux Test Mode</span>
                      </label>
                      <select
                        value={playbackPolicyOption}
                        onChange={(e) => setPlaybackPolicyOption(e.target.value as 'public' | 'signed')}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold"
                      >
                        <option value="public">Public Playback</option>
                        <option value="signed">Signed JWT</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() =>
                        invokeAction(
                          'provision',
                          `/api/admin/clubs/${encodeURIComponent(club.id)}/mux/channel`,
                          'POST',
                          { testMode: testModeOption, playbackPolicy: playbackPolicyOption },
                          'Reusable Mux Live Stream provisioned for club.'
                        )
                      }
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {busyAction === 'provision' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Provision Club Mux Channel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Channel Governance Controls when Channel Exists */}
            {hasChannel && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Suspend / Unsuspend */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Ban className="w-4 h-4 text-rose-500" />
                    <span>{isSuspended ? 'Restore Channel' : 'Suspend Channel'}</span>
                  </div>
                  {!isSuspended && (
                    <input
                      type="text"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Suspension reason..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px]"
                    />
                  )}
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() =>
                      isSuspended
                        ? invokeAction(
                            'unsuspend',
                            `/api/admin/clubs/${encodeURIComponent(club.id)}/mux/unsuspend`,
                            'POST',
                            undefined,
                            'Channel re-enabled and restored.'
                          )
                        : invokeAction(
                            'suspend',
                            `/api/admin/clubs/${encodeURIComponent(club.id)}/mux/suspend`,
                            'POST',
                            { reason: suspendReason },
                            'Club Mux stream disabled and channel suspended.'
                          )
                    }
                    className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isSuspended
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {(busyAction === 'suspend' || busyAction === 'unsuspend') && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>{isSuspended ? 'Unsuspend Channel' : 'Disable & Suspend'}</span>
                  </button>
                </div>

                {/* Stream Key Rotation */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Rotate Stream Key</span>
                  </div>
                  {isCurrentlyLive && (
                    <label className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceRotateWhileLive}
                        onChange={(e) => setForceRotateWhileLive(e.target.checked)}
                        className="mt-0.5 rounded border-amber-400"
                      />
                      <span>Force override while broadcast is active</span>
                    </label>
                  )}
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => {
                      if (!confirm(`Rotate the reusable Mux Stream Key for ${club.name}? Old encoder keys will stop working immediately.`)) {
                        return;
                      }
                      invokeAction(
                        'resetKey',
                        `/api/admin/clubs/${encodeURIComponent(club.id)}/mux/reset-key`,
                        'POST',
                        { force: forceRotateWhileLive },
                        'Stream key rotated via Mux and encrypted at rest.'
                      );
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {busyAction === 'resetKey' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Reset Stream Key</span>
                  </button>
                </div>

                {/* Max Session Limit */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Clock className="w-4 h-4 text-sky-500" />
                    <span>Session Limit (Mins)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      value={maxSessionMinutes}
                      onChange={(e) => setMaxSessionMinutes(Number(e.target.value) || 240)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                    />
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() =>
                        invokeAction(
                          'limits',
                          `/api/admin/clubs/${encodeURIComponent(club.id)}/mux/limits`,
                          'PUT',
                          { maxSessionMinutes },
                          'Club session limit updated.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Club Broadcast Sessions & Audit Trail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Recent Broadcast Sessions ({sessions.length})</span>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No broadcast sessions recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sessions.slice(0, 10).map((s: any) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {s.eventTitle || `Event #${s.matchId ?? s.match_id}`}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                            <span className="uppercase">{s.sport || 'event'}</span>
                            {s.durationMinutes ? <span>• {s.durationMinutes} min</span> : null}
                            {s.muxAssetPlaybackId ? <span className="text-indigo-500">• Replay VOD Saved</span> : null}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <History className="w-4 h-4 text-violet-500" />
                  <span>Audit Log ({auditLogs.length})</span>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No channel audit events yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {auditLogs.slice(0, 12).map((l: any) => (
                      <div
                        key={l.id}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                            {l.action}
                          </code>
                          <span className="text-[10px] text-slate-400 uppercase">{l.actorRole || l.actor_role}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {l.createdAt || l.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

