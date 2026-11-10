import React, { useState, useEffect } from 'react';
import {
  Radio, ShieldCheck, KeyRound, CheckCircle, AlertTriangle, Loader2, Copy,
  RefreshCw, Lock, Globe, Zap
} from 'lucide-react';
import type { MuxWatermarkConfig } from '../../store';
import { DEFAULT_WATERMARK_CONFIG } from '../../components/WatermarkOverlay';
import { MuxWatermarkEditor } from '../../components/MuxWatermarkEditor';

interface MuxAdminSettingsState {
  tokenId: string;
  tokenSecret: string;
  hasTokenSecret: boolean;
  webhookSecret: string;
  hasWebhookSecret: boolean;
  rtmpIngestUrl: string;
  signingKeyId: string;
  signingPrivateKey: string;
  hasSigningPrivateKey: boolean;
  isApiConfigured: boolean;
  isWebhookConfigured: boolean;
  isSigningConfigured: boolean;
  defaultPlaybackPolicy: 'public' | 'signed';
  requireSignedForPaidEvents: boolean;
  defaultWatermark: MuxWatermarkConfig;
  allowPartnerSelfProvision: boolean;
  defaultTestMode: boolean;
  defaultMaxSessionMinutes: number;
  maxConcurrentStreamsPerClub: number;
}

const EMPTY_MUX_SETTINGS: MuxAdminSettingsState = {
  tokenId: '',
  tokenSecret: '',
  hasTokenSecret: false,
  webhookSecret: '',
  hasWebhookSecret: false,
  rtmpIngestUrl: 'rtmps://global-live.mux.com:443/app',
  signingKeyId: '',
  signingPrivateKey: '',
  hasSigningPrivateKey: false,
  isApiConfigured: false,
  isWebhookConfigured: false,
  isSigningConfigured: false,
  defaultPlaybackPolicy: 'public',
  requireSignedForPaidEvents: false,
  defaultWatermark: { ...DEFAULT_WATERMARK_CONFIG },
  allowPartnerSelfProvision: true,
  defaultTestMode: false,
  defaultMaxSessionMinutes: 240,
  maxConcurrentStreamsPerClub: 1,
};

export function AdminMuxSettings() {
  const [settings, setSettings] = useState<MuxAdminSettingsState>(EMPTY_MUX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/mux/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...EMPTY_MUX_SETTINGS,
          ...data,
          defaultWatermark: data.defaultWatermark || { ...DEFAULT_WATERMARK_CONFIG },
        });
      }
    } catch (e) {
      console.error('Failed to load Mux settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/mux/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tokenId: settings.tokenId,
          tokenSecret: settings.tokenSecret,
          webhookSecret: settings.webhookSecret,
          rtmpIngestUrl: settings.rtmpIngestUrl,
          signingKeyId: settings.signingKeyId,
          signingPrivateKey: settings.signingPrivateKey,
          defaultPlaybackPolicy: settings.defaultPlaybackPolicy,
          requireSignedForPaidEvents: settings.requireSignedForPaidEvents,
          defaultWatermark: settings.defaultWatermark,
          allowPartnerSelfProvision: settings.allowPartnerSelfProvision,
          defaultTestMode: settings.defaultTestMode,
          defaultMaxSessionMinutes: settings.defaultMaxSessionMinutes,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Failed to save Mux settings.' });
        return;
      }
      setSettings({ ...EMPTY_MUX_SETTINGS, ...data });
      setFeedback({ type: 'success', message: 'Mux streaming, signing & watermark settings saved persistently.' });
    } catch {
      setFeedback({ type: 'error', message: 'Network error while saving Mux settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/mux/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Mux API connection failed.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Connected to Mux Video API v1 successfully!',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Network error testing Mux connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateSigningKey = async () => {
    setGeneratingKey(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/mux/signing-key', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Could not generate Mux Signing Key.' });
        return;
      }
      if (data?.settings) {
        setSettings({ ...EMPTY_MUX_SETTINGS, ...data.settings });
      } else {
        await loadSettings();
      }
      setFeedback({
        type: 'success',
        message: `Generated and persisted Mux Signing Key (${data?.signingKeyId}). Private key is stored securely on the server only.`,
      });
    } catch {
      setFeedback({ type: 'error', message: 'Network error generating Mux Signing Key.' });
    } finally {
      setGeneratingKey(false);
    }
  };

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/mux` : '/api/webhooks/mux';

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <span>Loading Mux settings...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 text-left">
      {/* Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/70">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
              settings.isApiConfigured
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Mux API: {settings.isApiConfigured ? 'Configured' : 'Not Configured'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
              settings.isSigningConfigured
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Signed JWT Playback: {settings.isSigningConfigured ? 'Ready' : 'Keys Missing'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
              settings.isWebhookConfigured
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Webhook Verification: {settings.isWebhookConfigured ? 'Active' : 'Missing Secret'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing || !settings.isApiConfigured}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Test API Connection</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Mux API & Webhook Credentials */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Mux Video API & Webhook Credentials
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Protected by self-healing server persistence. Masked secrets are retained unless replaced.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mux Access Token ID
            </label>
            <input
              type="text"
              value={settings.tokenId}
              onChange={(e) => setSettings({ ...settings, tokenId: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mux Access Token Secret {settings.hasTokenSecret && <span className="text-emerald-500">(Saved)</span>}
            </label>
            <input
              type="password"
              value={settings.tokenSecret}
              onChange={(e) => setSettings({ ...settings, tokenSecret: e.target.value })}
              placeholder="Paste new secret to update"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Webhook Signing Secret {settings.hasWebhookSecret && <span className="text-emerald-500">(Saved)</span>}
            </label>
            <input
              type="password"
              value={settings.webhookSecret}
              onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
              placeholder="whsec_..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              RTMP Ingest URL
            </label>
            <input
              type="text"
              value={settings.rtmpIngestUrl}
              onChange={(e) => setSettings({ ...settings, rtmpIngestUrl: e.target.value })}
              placeholder="rtmps://global-live.mux.com:443/app"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-2">Mux Webhook Endpoint:</span>
            <code className="font-mono text-slate-700 dark:text-slate-300 break-all">{webhookUrl}</code>
          </div>
          <button
            type="button"
            onClick={() => copyText(webhookUrl)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
            title="Copy Webhook URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Signed Playback Security & Keys */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/50 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Signed Playback Security (Short-Lived JWT Tokens)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Prevent direct HLS URL hotlinking on PPV and Subscription streams using RS256 playback tokens.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateSigningKey}
            disabled={generatingKey || !settings.isApiConfigured}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
          >
            {generatingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            <span>Generate Signing Key via Mux</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            type="button"
            onClick={() => setSettings({ ...settings, defaultPlaybackPolicy: 'public' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              settings.defaultPlaybackPolicy === 'public'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Globe className="w-4 h-4 text-sky-500" />
              Default Policy: Public Playback
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Standard playback URLs without token expiration; can still override per Event.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSettings({ ...settings, defaultPlaybackPolicy: 'signed' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              settings.defaultPlaybackPolicy === 'signed'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Lock className="w-4 h-4 text-emerald-500" />
              Default Policy: Signed Playback (JWT)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Every viewer receives a short-lived signed token after WatchWDS access verification.
            </div>
          </button>
        </div>

        <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Auto-protect Paid (PPV & Subscription) Mux Events with Signed Playback
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Automatically selects Signed policy whenever provisioning a new paid Mux Live Stream.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.requireSignedForPaidEvents}
            onChange={(e) => setSettings({ ...settings, requireSignedForPaidEvents: e.target.checked })}
            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Signing Key ID
            </label>
            <input
              type="text"
              value={settings.signingKeyId}
              onChange={(e) => setSettings({ ...settings, signingKeyId: e.target.value })}
              placeholder="Mux Signing Key ID"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Signing Private Key (PEM or Base64) {settings.hasSigningPrivateKey && <span className="text-emerald-500">(Saved)</span>}
            </label>
            <input
              type="password"
              value={settings.signingPrivateKey}
              onChange={(e) => setSettings({ ...settings, signingPrivateKey: e.target.value })}
              placeholder="-----BEGIN RSA PRIVATE KEY----- or Base64 key"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Partner Club Streaming Governance & Cost Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Partner Club Streaming Governance &amp; Cost Controls
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enforces one reusable Mux Live Stream channel per approved partner club across all sports (Football, Basketball, Tennis, Boxing, and dynamic sports).
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            Max {settings.maxConcurrentStreamsPerClub || 1} Active Broadcast / Club
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/40 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowPartnerSelfProvision}
              onChange={(e) => setSettings({ ...settings, allowPartnerSelfProvision: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="block font-bold text-slate-900 dark:text-white">
                Allow Approved Clubs to Self-Create Their Channel
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Only clubs with explicit admin streaming approval (in Partner Clubs) can click “Create Streaming Credentials”. When disabled, only Admins can provision club channels.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/40 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.defaultTestMode}
              onChange={(e) => setSettings({ ...settings, defaultTestMode: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="block font-bold text-slate-900 dark:text-white">
                Default New Channels to Mux Test Mode
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Mux test streams are free to encode (capped at 5 min, watermarked, auto-deleted after 24h) — ideal for staging &amp; setup validation before live production events.
              </span>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Default Max Session Duration (Minutes)
            </label>
            <input
              type="number"
              min={15}
              max={1440}
              value={settings.defaultMaxSessionMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultMaxSessionMinutes: Math.max(15, Math.min(1440, Number(e.target.value) || 240)),
                })
              }
              className="w-full sm:w-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Recommended ceiling (15–1440 mins) tracked per club broadcast session; customizable per club in Partner Clubs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Cost &amp; Account Spending Notice
            </div>
            <p>
              WatchWDS prevents unwanted encoding charges through club approval gates, single-channel reuse, test mode support, 1-broadcast concurrency locks, and admin channel suspension. Hard Mux account spend caps are configured directly in your Mux Dashboard billing settings.
            </p>
          </div>
        </div>
      </div>

      {/* Default Watermark Builder */}
      <MuxWatermarkEditor
        value={settings.defaultWatermark}
        onChange={(wm) => setSettings({ ...settings, defaultWatermark: wm })}
        title="Default Platform Watermark / Logo Overlay"
        subtitle="Automatically pre-fills watermark settings when creating new Mux Events. Per-Event overrides remain customizable."
      />

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Mux Settings'}</span>
        </button>
      </div>
    </form>
  );
}

