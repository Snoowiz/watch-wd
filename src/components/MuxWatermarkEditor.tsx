import React, { useState } from 'react';
import { Image as ImageIcon, Shield, Eye, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import type { MuxWatermarkConfig } from '../store';
import { WatermarkOverlay, DEFAULT_WATERMARK_CONFIG } from './WatermarkOverlay';
import { MediaPicker } from './MediaPicker';

interface MuxWatermarkEditorProps {
  value: MuxWatermarkConfig;
  onChange: (next: MuxWatermarkConfig) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function MuxWatermarkEditor({
  value,
  onChange,
  title = 'Broadcast Watermark / Logo Overlay',
  subtitle = 'Configure a PNG or JPG logo watermark overlaid onto live streams and VOD replays.',
  compact = false,
}: MuxWatermarkEditorProps) {
  const wm = value || DEFAULT_WATERMARK_CONFIG;
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateField = <K extends keyof MuxWatermarkConfig>(field: K, val: MuxWatermarkConfig[K]) => {
    setUploadError(null);
    onChange({ ...wm, [field]: val });
  };

  const handleMediaSelect = async (selectedUrl: string) => {
    setShowPicker(false);
    setUploadError(null);

    if (!selectedUrl) return;
    if (!selectedUrl.startsWith('data:')) {
      onChange({ ...wm, enabled: true, url: selectedUrl.trim() });
      return;
    }

    // Data URI selected/uploaded in MediaPicker -> promote to public PNG/JPG endpoint for Mux compatibility
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/mux/watermark-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dataUrl: selectedUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setUploadError(data?.error || 'Could not prepare uploaded image as PNG/JPG watermark.');
        return;
      }
      onChange({
        ...wm,
        enabled: true,
        url: data.url,
        ...(data.isLocalhost && wm.mode === 'mux_burn_in' ? { mode: 'player_overlay' } : {}),
      });
      if (data.isLocalhost) {
        setUploadError(
          'Localhost URL detected: Mux cloud servers cannot fetch localhost images for server burn-in, so mode defaulted to Player Overlay. Set APP_URL or use a public HTTPS PNG/JPG URL for server burn-in.'
        );
      }
    } catch {
      setUploadError('Failed to upload watermark image.');
    } finally {
      setUploading(false);
    }
  };

  const urlLower = (wm.url || '').trim().toLowerCase();
  const isLocalUrl =
    urlLower.includes('localhost') ||
    urlLower.includes('127.0.0.1') ||
    urlLower.includes('0.0.0.0');
  const isUnsupportedRemoteFmt =
    wm.enabled &&
    wm.mode === 'mux_burn_in' &&
    (/\.(svg|webp|gif)(?:$|\?)/i.test(urlLower) || urlLower.startsWith('data:'));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={Boolean(wm.enabled)}
            onChange={(e) => updateField('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-amber-500" />
        </label>
      </div>

      {wm.enabled && (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'lg:grid-cols-5'}`}>
          <div className={`${compact ? '' : 'lg:col-span-3'} space-y-3`}>
            {/* Mode Switcher */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Watermark Delivery Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('mode', 'mux_burn_in')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    wm.mode === 'mux_burn_in'
                      ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Mux Burn-In (Stream & VOD)</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Baked into live & recorded video via Mux API
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateField('mode', 'player_overlay')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    wm.mode === 'player_overlay'
                      ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Eye className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Player Overlay (Instant)</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Live toggleable overlay on any player/provider
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Watermark URL + Media Picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Watermark Image URL (PNG or JPG)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={wm.url}
                  onChange={(e) => updateField('url', e.target.value)}
                  placeholder="https://example.com/watermark-logo.png"
                  className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  <span>{uploading ? 'Uploading...' : 'Pick / Upload'}</span>
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {wm.mode === 'mux_burn_in' && (isUnsupportedRemoteFmt || (isLocalUrl && wm.url)) && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {isUnsupportedRemoteFmt
                    ? 'Mux burn-in requires a hosted PNG or JPG/JPEG image URL (SVG, WebP, GIF, and inline data URLs are not accepted by Mux).'
                    : 'Localhost URLs cannot be fetched by Mux cloud encoders for burn-in. Use a public HTTPS image URL or switch to Player Overlay.'}
                </span>
              </div>
            )}

            {/* Alignment, Margin, Width & Opacity Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Vertical Align</label>
                <select
                  value={wm.vertical_align}
                  onChange={(e) => updateField('vertical_align', e.target.value as MuxWatermarkConfig['vertical_align'])}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Horizontal Align</label>
                <select
                  value={wm.horizontal_align}
                  onChange={(e) => updateField('horizontal_align', e.target.value as MuxWatermarkConfig['horizontal_align'])}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Size / Width</label>
                <input
                  type="text"
                  value={wm.width}
                  onChange={(e) => updateField('width', e.target.value)}
                  placeholder="14%"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Vertical Margin</label>
                <input
                  type="text"
                  value={wm.vertical_margin}
                  onChange={(e) => updateField('vertical_margin', e.target.value)}
                  placeholder="4%"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Horizontal Margin</label>
                <input
                  type="text"
                  value={wm.horizontal_margin}
                  onChange={(e) => updateField('horizontal_margin', e.target.value)}
                  placeholder="4%"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Opacity</label>
                <input
                  type="text"
                  value={wm.opacity}
                  onChange={(e) => updateField('opacity', e.target.value)}
                  placeholder="85%"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 16:9 Live Preview */}
          <div className={`${compact ? '' : 'lg:col-span-2'} flex flex-col`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Live Placement Preview (16:9)
            </span>
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
              <div className="text-center text-[11px] font-mono text-slate-500 select-none">
                {wm.url ? 'LIVE FEED PREVIEW' : 'Select or paste PNG/JPG URL'}
              </div>
              <WatermarkOverlay config={wm} forcePreview />
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

