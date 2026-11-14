import crypto from 'crypto';
import https from 'https';
import jwt from 'jsonwebtoken';
import {
  DEFAULT_MUX_WATERMARK_CONFIG,
  MuxWatermarkConfig,
  getCachedMuxPlatformSettings,
  normalizeWatermarkConfig,
  sanitizeKey,
  sanitizePrivateKey,
} from './db/persistentConfig.js';

export type { MuxWatermarkConfig };

export const MUX_API_BASE_URL = 'https://api.mux.com/video/v1';
export const MUX_SYSTEM_API_BASE_URL = 'https://api.mux.com/system/v1';
export const DEFAULT_MUX_RTMP_URL = 'rtmps://global-live.mux.com:443/app';
export const DEFAULT_MUX_STANDARD_RTMP_URL = 'rtmp://global-live.mux.com:5222/app';
export const DEFAULT_MUX_SRT_URL = 'srt://global-live.mux.com:6001';

export type MuxPlaybackPolicy = 'public' | 'signed';

export type MuxStreamStatus =
  | 'created'
  | 'idle'
  | 'connected'
  | 'recording'
  | 'active'
  | 'disconnected'
  | 'disabled'
  | 'error';

export interface MuxConfig {
  tokenId: string;
  tokenSecret: string;
  webhookSecret: string;
  rtmpIngestUrl: string;
  signingKeyId: string;
  signingPrivateKey: string;
  isConfigured: boolean;
  isWebhookConfigured: boolean;
  isSigningConfigured: boolean;
  defaultPlaybackPolicy: MuxPlaybackPolicy;
  requireSignedForPaidEvents: boolean;
  allowPartnerSelfProvision: boolean;
  defaultTestMode: boolean;
  defaultMaxSessionMinutes: number;
  maxConcurrentStreamsPerClub: number;
  defaultWatermark: MuxWatermarkConfig;
}

/**
 * Watermark / Overlay extension types prepared for future phase.
 * Matches Mux Video API `new_asset_settings.inputs[].overlay_settings`.
 * Do not enable watermark generation until a dedicated watermark phase is authorized.
 */
export interface MuxOverlaySettings {
  vertical_align?: 'top' | 'middle' | 'bottom';
  vertical_margin?: string;
  horizontal_align?: 'left' | 'center' | 'right';
  horizontal_margin?: string;
  width?: string;
  height?: string;
  opacity?: string;
}

export interface MuxNewAssetInput {
  url?: string;
  overlay_settings?: MuxOverlaySettings;
}

export interface MuxNewAssetSettings {
  playback_policies: Array<'public' | 'signed'>;
  inputs?: MuxNewAssetInput[];
}

export interface MuxPlaybackId {
  id: string;
  policy: 'public' | 'signed' | string;
}

export interface MuxLiveStreamResource {
  id: string;
  status: string;
  stream_key?: string;
  playback_ids?: MuxPlaybackId[];
  active_asset_id?: string;
  recent_asset_ids?: string[];
  passthrough?: string;
  reconnect_window?: number;
  latency_mode?: string;
  created_at?: string;
}

/**
 * Resilient IPv4 HTTPS Agent fallback for environments with IPv6 egress issues.
 */
const muxHttpsAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  timeout: 20000,
});

/**
 * Reads and sanitizes Mux configuration strictly from persisted platform config and server env vars.
 * Never returns credentials to any frontend or public API.
 */
export function getMuxConfig(): MuxConfig {
  const persisted = getCachedMuxPlatformSettings();
  const tokenId = sanitizeKey(persisted?.tokenId || process.env.MUX_TOKEN_ID || '');
  const tokenSecret = sanitizeKey(persisted?.tokenSecret || process.env.MUX_TOKEN_SECRET || '');
  const webhookSecret = sanitizeKey(persisted?.webhookSecret || process.env.MUX_WEBHOOK_SECRET || '');
  const rtmpIngestUrl =
    sanitizeKey(persisted?.rtmpIngestUrl || process.env.MUX_RTMP_INGEST_URL || '') || DEFAULT_MUX_RTMP_URL;
  const signingKeyId = sanitizeKey(persisted?.signingKeyId || process.env.MUX_SIGNING_KEY_ID || '');
  const signingPrivateKey = sanitizePrivateKey(
    persisted?.signingPrivateKey || process.env.MUX_SIGNING_PRIVATE_KEY || process.env.MUX_PRIVATE_KEY || ''
  );

  return {
    tokenId,
    tokenSecret,
    webhookSecret,
    rtmpIngestUrl,
    signingKeyId,
    signingPrivateKey,
    isConfigured: Boolean(tokenId && tokenSecret),
    isWebhookConfigured: Boolean(webhookSecret),
    isSigningConfigured: Boolean(signingKeyId && signingPrivateKey),
    defaultPlaybackPolicy: persisted?.defaultPlaybackPolicy === 'signed' ? 'signed' : 'public',
    requireSignedForPaidEvents: Boolean(persisted?.requireSignedForPaidEvents),
    allowPartnerSelfProvision: persisted?.allowPartnerSelfProvision !== undefined ? Boolean(persisted.allowPartnerSelfProvision) : true,
    defaultTestMode: Boolean(persisted?.defaultTestMode),
    defaultMaxSessionMinutes: Number(persisted?.defaultMaxSessionMinutes) || 240,
    maxConcurrentStreamsPerClub: 1,
    defaultWatermark: persisted?.defaultWatermark || { ...DEFAULT_MUX_WATERMARK_CONFIG },
  };
}

/**
 * Normalizes Mux live stream statuses into WatchWDS's canonical status enum.
 */
export function normalizeMuxStreamStatus(rawStatus?: string | null): MuxStreamStatus {
  const s = String(rawStatus || '').trim().toLowerCase();
  switch (s) {
    case 'created':
    case 'idle':
    case 'connected':
    case 'recording':
    case 'active':
    case 'disconnected':
    case 'disabled':
    case 'error':
      return s;
    case 'errored':
      return 'error';
    default:
      return 'created';
  }
}

/**
 * Builds the Mux Live Stream creation payload.
 * Includes a structured extension hook in `new_asset_settings.inputs` for future
 * watermark / `overlay_settings` configuration without changing the API structure.
 */
export function buildMuxLiveStreamPayload(options: {
  passthrough?: string;
  playbackPolicy?: 'public' | 'signed';
  latencyMode?: 'low' | 'reduced' | 'standard';
  reconnectWindow?: number;
  testMode?: boolean;
  overlayConfig?: {
    url: string;
    overlay_settings: MuxOverlaySettings;
  } | null;
}) {
  const policy = options.playbackPolicy || 'public';

  const newAssetSettings: MuxNewAssetSettings = {
    playback_policies: [policy],
  };

  return {
    playback_policies: [policy],
    ...(options.passthrough ? { passthrough: options.passthrough } : {}),
    ...(options.latencyMode ? { latency_mode: options.latencyMode } : {}),
    ...(options.reconnectWindow !== undefined ? { reconnect_window: options.reconnectWindow } : {}),
    ...(options.testMode ? { test: true } : {}),
    new_asset_settings: newAssetSettings,
  };
}

// ============================================================================
// REUSABLE STREAM KEY ENCRYPTION (AES-256-GCM) & INGEST ENDPOINTS
// ============================================================================

function deriveMuxEncryptionKey(explicitSecret?: string): Buffer {
  const material =
    sanitizeKey(explicitSecret || process.env.MUX_ENCRYPTION_KEY || '') ||
    `${sanitizeKey(process.env.JWT_SECRET || '') || 'watchwds-dev-jwt-fallback'}::watchwds-mux-stream-key-v1`;
  return crypto.createHash('sha256').update(material, 'utf8').digest();
}

export function encryptStreamKey(plainKey: string, explicitSecret?: string): string {
  const trimmed = String(plainKey || '').trim();
  if (!trimmed) {
    throw new Error('Cannot encrypt empty Mux stream key.');
  }
  const key = deriveMuxEncryptionKey(explicitSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptStreamKey(storedValue: string, explicitSecret?: string): string {
  const trimmed = String(storedValue || '').trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('enc:v1:')) {
    // Graceful backward compatibility for pre-encryption plaintext records
    return trimmed;
  }
  const parts = trimmed.split(':');
  if (parts.length !== 5) {
    throw new Error('Malformed encrypted Mux stream key format.');
  }
  const [, , ivHex, tagHex, cipherHex] = parts;
  const key = deriveMuxEncryptionKey(explicitSecret);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function getStreamKeyLast4(plainKey?: string | null): string | null {
  const cleaned = String(plainKey || '').trim();
  if (!cleaned) return null;
  return cleaned.length <= 4 ? cleaned : cleaned.slice(-4);
}

export function maskStreamKeyWithLast4(last4?: string | null): string {
  if (!last4) return '••••••••••••••••••••••••';
  return `••••••••••••••••••••${last4}`;
}

/**
 * Builds device-neutral ingest endpoint information matching Mux's documented protocols.
 * Never embeds the secret stream key into SRT URLs unless an authorized key is explicitly passed.
 */
export function buildMuxIngestEndpoints(
  rtmpsOverride?: string | null,
  revealedStreamKey?: string | null
): {
  rtmpsUrl: string;
  rtmpStandardUrl: string;
  srtUrl: string;
  srtFullUrl: string | null;
} {
  const rtmpsUrl = sanitizeKey(rtmpsOverride || '') || getMuxConfig().rtmpIngestUrl || DEFAULT_MUX_RTMP_URL;
  return {
    rtmpsUrl,
    rtmpStandardUrl: DEFAULT_MUX_STANDARD_RTMP_URL,
    srtUrl: DEFAULT_MUX_SRT_URL,
    srtFullUrl: revealedStreamKey ? `${DEFAULT_MUX_SRT_URL}?streamid=${encodeURIComponent(revealedStreamKey)}` : null,
  };
}

/**
 * Low-level authenticated HTTP helper for Mux Video REST API v1.
 * Reuses Node's native `fetch` with an automatic IPv4 `https` fallback.
 */
async function muxApiRequest<T = any>(
  endpointPath: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: any; baseUrl?: string } = {}
): Promise<T> {
  const config = getMuxConfig();
  if (!config.isConfigured) {
    throw new Error('Mux API credentials (MUX_TOKEN_ID / MUX_TOKEN_SECRET) are not configured on the server.');
  }

  const baseUrl = options.baseUrl || MUX_API_BASE_URL;
  const url = `${baseUrl}${endpointPath}`;
  const method = options.method || 'GET';
  const authHeader = 'Basic ' + Buffer.from(`${config.tokenId}:${config.tokenSecret}`).toString('base64');
  const payloadStr = options.body !== undefined ? JSON.stringify(options.body) : undefined;

  const headers: Record<string, string> = {
    Authorization: authHeader,
    Accept: 'application/json',
    ...(payloadStr !== undefined ? { 'Content-Type': 'application/json' } : {}),
  };

  const parseMuxError = (status: number, json: any, text: string) => {
    const messages = Array.isArray(json?.error?.messages)
      ? json.error.messages.join('; ')
      : json?.error?.type || json?.message || text || `Mux API error (${status})`;
    const err: any = new Error(messages);
    err.status = status;
    err.muxError = json?.error || null;
    return err;
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(20000),
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const rawText = await res.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      throw parseMuxError(res.status, parsed, rawText);
    }

    return (parsed?.data !== undefined ? parsed.data : parsed) as T;
  } catch (err: any) {
    // Only fall back on transport/socket errors, not Mux 4xx/5xx API responses
    if (err?.status) {
      throw err;
    }

    return await new Promise<T>((resolve, reject) => {
      const req = https.request(
        url,
        {
          method,
          headers: {
            ...headers,
            ...(payloadStr !== undefined ? { 'Content-Length': Buffer.byteLength(payloadStr) } : {}),
          },
          agent: muxHttpsAgent,
          timeout: 20000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const rawText = Buffer.concat(chunks).toString('utf8');
            const status = res.statusCode || 500;
            if (status === 204) {
              return resolve(undefined as T);
            }
            let parsed: any = null;
            try {
              parsed = rawText ? JSON.parse(rawText) : null;
            } catch {
              parsed = null;
            }
            if (status < 200 || status >= 300) {
              return reject(parseMuxError(status, parsed, rawText));
            }
            return resolve((parsed?.data !== undefined ? parsed.data : parsed) as T);
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('Mux API request timed out'));
      });

      if (payloadStr !== undefined) {
        req.write(payloadStr);
      }
      req.end();
    });
  }
}

export function extractMuxPlaybackId(
  playbackIds?: MuxPlaybackId[] | null,
  preferredPolicy?: MuxPlaybackPolicy
): string | null {
  if (!Array.isArray(playbackIds) || playbackIds.length === 0) return null;
  if (preferredPolicy) {
    const preferred = playbackIds.find((p) => p && p.policy === preferredPolicy && p.id);
    if (preferred) return preferred.id;
  }
  const publicEntry = playbackIds.find((p) => p && p.policy === 'public' && p.id);
  if (publicEntry) return publicEntry.id;
  return playbackIds[0]?.id || null;
}

export function normalizePlaybackPolicy(raw?: any): MuxPlaybackPolicy {
  return String(raw || '').trim().toLowerCase() === 'signed' ? 'signed' : 'public';
}

export interface WatermarkValidationResult {
  valid: boolean;
  isLocalhost?: boolean;
  error?: string;
}

/**
 * Validates that a watermark URL meets Mux Live Stream overlay requirements
 * (`http`/`https` publicly reachable `.png` or `.jpg`/`.jpeg` image).
 */
export function validateMuxWatermarkUrl(rawUrl?: string | null): WatermarkValidationResult {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Watermark image URL is required.' };
  }
  if (/^data:/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Base64 data URIs must be uploaded to a hosted HTTPS PNG/JPG endpoint before sending to Mux.',
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Watermark URL must be a valid http(s):// image URL.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Watermark URL must use http:// or https:// protocol.' };
  }
  const pathname = parsed.pathname.toLowerCase();
  if (pathname.endsWith('.svg') || pathname.endsWith('.webp') || pathname.endsWith('.gif')) {
    return {
      valid: false,
      error: 'Mux burn-in overlays only support PNG or JPG/JPEG images (SVG, WebP, and GIF are rejected by Mux).',
    };
  }
  const host = parsed.hostname.toLowerCase();
  const isLocalhost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local');

  return { valid: true, isLocalhost };
}

/**
 * Builds `overlayConfig` for Mux `new_asset_settings.inputs[1]` when watermark burn-in is enabled.
 */
export function buildWatermarkOverlayInput(
  watermarkConfig?: MuxWatermarkConfig | null,
  resolvedPublicUrl?: string | null
): { url: string; overlay_settings: MuxOverlaySettings } | null {
  if (!watermarkConfig || !watermarkConfig.enabled) return null;
  if (watermarkConfig.mode === 'player_overlay') return null;

  const targetUrl = (resolvedPublicUrl || watermarkConfig.url || '').trim();
  const check = validateMuxWatermarkUrl(targetUrl);
  if (!check.valid) return null;

  return {
    url: targetUrl,
    overlay_settings: {
      vertical_align: watermarkConfig.vertical_align || 'top',
      vertical_margin: watermarkConfig.vertical_margin || '4%',
      horizontal_align: watermarkConfig.horizontal_align || 'right',
      horizontal_margin: watermarkConfig.horizontal_margin || '4%',
      width: watermarkConfig.width || '14%',
      opacity: watermarkConfig.opacity || '85%',
    },
  };
}

/**
 * Creates a new Mux Live Stream via `POST /video/v1/live-streams`.
 * Supports both reusable partner-club channels (`clubId` / `passthrough`) and Event-level provisioning (`matchId`).
 */
export async function createMuxLiveStream(params: {
  matchId?: string;
  clubId?: string;
  passthrough?: string;
  playbackPolicy?: MuxPlaybackPolicy;
  latencyMode?: 'low' | 'reduced' | 'standard';
  reconnectWindow?: number;
  testMode?: boolean;
  overlayConfig?: { url: string; overlay_settings: MuxOverlaySettings } | null;
}): Promise<{
  liveStreamId: string;
  playbackId: string | null;
  streamKey: string;
  status: MuxStreamStatus;
  playbackPolicy: MuxPlaybackPolicy;
  raw: MuxLiveStreamResource;
}> {
  const policy = normalizePlaybackPolicy(params.playbackPolicy);
  const resolvedPassthrough =
    params.passthrough ||
    (params.clubId ? `club:${String(params.clubId)}` : undefined) ||
    (params.matchId ? String(params.matchId) : undefined);

  const payload = buildMuxLiveStreamPayload({
    passthrough: resolvedPassthrough,
    playbackPolicy: policy,
    latencyMode: params.latencyMode,
    reconnectWindow: params.reconnectWindow,
    testMode: params.testMode,
    overlayConfig: params.overlayConfig || null,
  });

  const data = await muxApiRequest<MuxLiveStreamResource>('/live-streams', {
    method: 'POST',
    body: payload,
  });

  return {
    liveStreamId: data.id,
    playbackId: extractMuxPlaybackId(data.playback_ids, policy),
    streamKey: data.stream_key || '',
    status: normalizeMuxStreamStatus(data.status || 'created'),
    playbackPolicy: policy,
    raw: data,
  };
}

/**
 * Rotates a reusable live stream's private stream key without creating a new Mux channel (`POST /live-streams/:id/reset-stream-key`).
 */
export async function resetMuxLiveStreamKey(liveStreamId: string): Promise<{
  liveStreamId: string;
  streamKey: string;
  status: MuxStreamStatus;
  raw: MuxLiveStreamResource;
}> {
  const data = await muxApiRequest<MuxLiveStreamResource>(
    `/live-streams/${encodeURIComponent(liveStreamId)}/reset-stream-key`,
    { method: 'POST' }
  );
  return {
    liveStreamId: data.id || liveStreamId,
    streamKey: data.stream_key || '',
    status: normalizeMuxStreamStatus(data.status),
    raw: data,
  };
}

/**
 * Immediately disables a Mux Live Stream (`PUT /live-streams/:id/disable`) so encoders are disconnected/rejected.
 */
export async function disableMuxLiveStream(liveStreamId: string): Promise<void> {
  await muxApiRequest<void>(`/live-streams/${encodeURIComponent(liveStreamId)}/disable`, {
    method: 'PUT',
  });
}

/**
 * Re-enables a disabled Mux Live Stream (`PUT /live-streams/:id/enable`).
 */
export async function enableMuxLiveStream(liveStreamId: string): Promise<void> {
  await muxApiRequest<void>(`/live-streams/${encodeURIComponent(liveStreamId)}/enable`, {
    method: 'PUT',
  });
}

/**
 * Explicitly finishes an active Mux Live Stream broadcast (`PUT /live-streams/:id/complete`).
 */
export async function completeMuxLiveStream(liveStreamId: string): Promise<void> {
  await muxApiRequest<void>(`/live-streams/${encodeURIComponent(liveStreamId)}/complete`, {
    method: 'PUT',
  });
}

/**
 * Fetches an individual Mux Asset (`GET /video/v1/assets/:id`) for delayed recording reconciliation.
 */
export async function getMuxAsset(assetId: string): Promise<{
  id: string;
  status: string;
  duration?: number;
  playback_ids?: MuxPlaybackId[];
  live_stream_id?: string;
}> {
  return muxApiRequest(`/assets/${encodeURIComponent(assetId)}`, {
    method: 'GET',
  });
}

/**
 * Updates live stream `new_asset_settings` (for VOD / future stream watermark overlays).
 */
export async function updateMuxLiveStreamWatermark(
  liveStreamId: string,
  params: {
    playbackPolicy?: MuxPlaybackPolicy;
    overlayConfig?: { url: string; overlay_settings: MuxOverlaySettings } | null;
  }
): Promise<MuxLiveStreamResource> {
  const policy = normalizePlaybackPolicy(params.playbackPolicy);
  const newAssetSettings: MuxNewAssetSettings = {
    playback_policies: [policy],
  };

  return muxApiRequest<MuxLiveStreamResource>(`/live-streams/${encodeURIComponent(liveStreamId)}`, {
    method: 'PATCH',
    body: {
      new_asset_settings: newAssetSettings,
    },
  });
}

export async function addMuxLiveStreamPlaybackId(
  liveStreamId: string,
  policy: MuxPlaybackPolicy
): Promise<MuxPlaybackId> {
  return muxApiRequest<MuxPlaybackId>(`/live-streams/${encodeURIComponent(liveStreamId)}/playback-ids`, {
    method: 'POST',
    body: { policy },
  });
}

export async function deleteMuxLiveStreamPlaybackId(
  liveStreamId: string,
  playbackId: string
): Promise<void> {
  await muxApiRequest<void>(
    `/live-streams/${encodeURIComponent(liveStreamId)}/playback-ids/${encodeURIComponent(playbackId)}`,
    { method: 'DELETE' }
  );
}

export async function addMuxAssetPlaybackId(
  assetId: string,
  policy: MuxPlaybackPolicy
): Promise<MuxPlaybackId> {
  return muxApiRequest<MuxPlaybackId>(`/assets/${encodeURIComponent(assetId)}/playback-ids`, {
    method: 'POST',
    body: { policy },
  });
}

export async function deleteMuxAssetPlaybackId(
  assetId: string,
  playbackId: string
): Promise<void> {
  await muxApiRequest<void>(
    `/assets/${encodeURIComponent(assetId)}/playback-ids/${encodeURIComponent(playbackId)}`,
    { method: 'DELETE' }
  );
}

/**
 * Creates a 2048-bit RSA Signing Key via `POST /system/v1/signing-keys`.
 * Mux returns the private key ONLY once at creation time.
 */
export async function createMuxSigningKey(): Promise<{
  id: string;
  privateKey: string;
  createdAt?: string;
}> {
  const data = await muxApiRequest<{ id: string; private_key: string; created_at?: string }>('/signing-keys', {
    method: 'POST',
    baseUrl: MUX_SYSTEM_API_BASE_URL,
  });

  return {
    id: data.id,
    privateKey: decodeMuxPrivateKey(data.private_key),
    createdAt: data.created_at,
  };
}

/**
 * Verifies server connectivity to Mux REST API (`GET /video/v1/live-streams?limit=1`).
 */
export async function testMuxApiConnection(): Promise<{ ok: true; liveStreamSampleCount: number }> {
  const list = await muxApiRequest<MuxLiveStreamResource[]>('/live-streams?limit=1', {
    method: 'GET',
  });
  return {
    ok: true,
    liveStreamSampleCount: Array.isArray(list) ? list.length : 0,
  };
}

/**
 * Decodes either raw PEM or Base64-encoded PEM into a normalized RSA private key PEM string.
 */
export function decodeMuxPrivateKey(rawKey?: string | null): string {
  const sanitized = sanitizePrivateKey(rawKey || '');
  if (!sanitized) return '';
  if (sanitized.includes('-----BEGIN')) {
    return sanitized;
  }
  const compact = sanitized.replace(/\s+/g, '');
  try {
    const decoded = Buffer.from(compact, 'base64').toString('utf8').trim();
    if (decoded.includes('-----BEGIN')) {
      return decoded;
    }
  } catch {
    // Fall through cleanly
  }
  return sanitized;
}

/**
 * Signs a short-lived Mux RS256 playback JWT (`sub: playbackId`, `aud: 'v' | 't' | 's'`).
 */
export function signMuxPlaybackToken(
  playbackId: string,
  options?: {
    keyId?: string;
    privateKey?: string;
    expirationSeconds?: number;
    audience?: 'v' | 't' | 's' | 'g';
  }
): { token: string; expiresAt: string } {
  const cfg = getMuxConfig();
  const keyId = sanitizeKey(options?.keyId || cfg.signingKeyId);
  const rawPrivateKey = options?.privateKey || cfg.signingPrivateKey;
  const pemKey = decodeMuxPrivateKey(rawPrivateKey);

  if (!playbackId) {
    throw new Error('Missing playbackId for Mux signed token generation.');
  }
  if (!keyId || !pemKey) {
    throw new Error('Mux signing keys (MUX_SIGNING_KEY_ID / MUX_SIGNING_PRIVATE_KEY) are not configured.');
  }

  const audience = options?.audience || 'v';
  const requestedTtl = Number(options?.expirationSeconds);
  const ttlSeconds = Number.isFinite(requestedTtl)
    ? Math.max(60, Math.min(86400, Math.floor(requestedTtl)))
    : 7200;

  const token = jwt.sign(
    {
      sub: playbackId,
      aud: audience,
    },
    pemKey,
    {
      algorithm: 'RS256',
      keyid: keyId,
      expiresIn: ttlSeconds,
    }
  );

  return {
    token,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

/**
 * Generates video (`v`), thumbnail (`t`), and storyboard (`s`) playback JWTs together.
 */
export function signMuxPlaybackTokens(
  playbackId: string,
  options?: {
    keyId?: string;
    privateKey?: string;
    expirationSeconds?: number;
  }
): {
  playback_token: string;
  thumbnail_token: string;
  storyboard_token: string;
  playback_token_expires_at: string;
} {
  const video = signMuxPlaybackToken(playbackId, { ...options, audience: 'v' });
  const thumb = signMuxPlaybackToken(playbackId, { ...options, audience: 't' });
  const storyboard = signMuxPlaybackToken(playbackId, { ...options, audience: 's' });

  return {
    playback_token: video.token,
    thumbnail_token: thumb.token,
    storyboard_token: storyboard.token,
    playback_token_expires_at: video.expiresAt,
  };
}

/**
 * Fetches current Live Stream state from Mux (`GET /video/v1/live-streams/:id`).
 */
export async function getMuxLiveStream(liveStreamId: string): Promise<MuxLiveStreamResource> {
  return muxApiRequest<MuxLiveStreamResource>(`/live-streams/${encodeURIComponent(liveStreamId)}`, {
    method: 'GET',
  });
}

/**
 * Deletes a Live Stream on Mux (`DELETE /video/v1/live-streams/:id`).
 * Used when cleaning up a deleted WatchWDS Event.
 */
export async function deleteMuxLiveStream(liveStreamId: string): Promise<void> {
  await muxApiRequest<void>(`/live-streams/${encodeURIComponent(liveStreamId)}`, {
    method: 'DELETE',
  });
}

/**
 * Verifies the `Mux-Signature` header (`t=<timestamp>,v1=<hex_sig>`) using HMAC-SHA256
 * over `${t}.${rawBody}` and constant-time comparison (`crypto.timingSafeEqual`).
 */
export function verifyMuxWebhookSignature(
  rawBody: string | Buffer | undefined,
  signatureHeader: string | string[] | undefined,
  webhookSecret?: string,
  toleranceSeconds: number = 300
): { valid: boolean; timestamp?: number; error?: string } {
  const secret = sanitizeKey(webhookSecret ?? getMuxConfig().webhookSecret);
  if (!secret) {
    return { valid: false, error: 'Mux webhook signing secret is not configured' };
  }

  if (!signatureHeader || Array.isArray(signatureHeader)) {
    return { valid: false, error: 'Missing or invalid Mux-Signature header' };
  }

  if (rawBody === undefined || rawBody === null) {
    return { valid: false, error: 'Missing raw request body for signature verification' };
  }

  const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const parts = signatureHeader.split(',').map((p) => p.trim()).filter(Boolean);

  let timestampStr = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key === 't' && !timestampStr) {
      timestampStr = val;
    } else if (key === 'v1' && val) {
      signatures.push(val);
    }
  }

  if (!timestampStr || signatures.length === 0) {
    return { valid: false, error: 'Malformed Mux-Signature header' };
  }

  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { valid: false, error: 'Invalid timestamp in Mux-Signature header' };
  }

  if (toleranceSeconds > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestamp) > toleranceSeconds) {
      return { valid: false, error: 'Mux webhook timestamp outside tolerance window' };
    }
  }

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(`${timestampStr}.${rawBodyStr}`, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  for (const sigHex of signatures) {
    if (!/^[a-fA-F0-9]+$/.test(sigHex)) continue;
    const sigBuf = Buffer.from(sigHex, 'hex');
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: true, timestamp };
    }
  }

  return { valid: false, error: 'Mux webhook signature verification failed' };
}

export interface ParsedMuxWebhookAction {
  handled: boolean;
  eventType: string;
  liveStreamId: string | null;
  assetId: string | null;
  passthroughMatchId: string | null;
  updates: Record<string, any>;
}

/**
 * Translates official Mux Video API webhook events (`video.live_stream.*` & `video.asset.*`)
 * into safe WatchWDS match updates without inventing unsupported event names.
 */
export function parseMuxWebhookEvent(event: any, preferredPolicy?: MuxPlaybackPolicy): ParsedMuxWebhookAction {
  const eventType = String(event?.type || '').trim();
  const data = event?.data || {};
  const passthrough = typeof data?.passthrough === 'string' && data.passthrough.trim()
    ? data.passthrough.trim()
    : null;

  const base: ParsedMuxWebhookAction = {
    handled: false,
    eventType,
    liveStreamId: null,
    assetId: null,
    passthroughMatchId: passthrough,
    updates: {},
  };

  // Official Mux Live Stream webhook events
  if (eventType.startsWith('video.live_stream.')) {
    const liveStreamId = data?.id ? String(data.id) : null;
    const playbackId = extractMuxPlaybackId(data?.playback_ids, preferredPolicy);
    const activeAssetId = data?.active_asset_id ? String(data.active_asset_id) : null;

    base.liveStreamId = liveStreamId;
    base.assetId = activeAssetId;

    switch (eventType) {
      case 'video.live_stream.created': {
        base.handled = true;
        base.updates = {
          mux_stream_status: normalizeMuxStreamStatus(data?.status || 'idle'),
          mux_error_message: null,
          ...(playbackId ? { mux_playback_id: playbackId } : {}),
        };
        return base;
      }
      case 'video.live_stream.connected': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'connected',
          mux_error_message: null,
          ...(activeAssetId ? { mux_asset_id: activeAssetId } : {}),
          ...(playbackId ? { mux_playback_id: playbackId } : {}),
        };
        return base;
      }
      case 'video.live_stream.recording': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'recording',
          mux_error_message: null,
          ...(activeAssetId ? { mux_asset_id: activeAssetId } : {}),
        };
        return base;
      }
      case 'video.live_stream.active': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'active',
          mux_error_message: null,
          ...(activeAssetId ? { mux_asset_id: activeAssetId } : {}),
          ...(playbackId ? { mux_playback_id: playbackId } : {}),
        };
        return base;
      }
      case 'video.live_stream.disconnected': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'disconnected',
        };
        return base;
      }
      case 'video.live_stream.idle': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'idle',
        };
        return base;
      }
      case 'video.live_stream.disabled': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'disabled',
        };
        return base;
      }
      case 'video.live_stream.enabled': {
        base.handled = true;
        base.updates = {
          mux_stream_status: normalizeMuxStreamStatus(data?.status || 'idle'),
          mux_error_message: null,
        };
        return base;
      }
      case 'video.live_stream.deleted': {
        base.handled = true;
        base.updates = {
          mux_stream_status: 'disabled',
        };
        return base;
      }
      case 'video.live_stream.warning': {
        base.handled = true;
        const msg = Array.isArray(data?.warnings)
          ? data.warnings.map((w: any) => w?.message || w?.type).filter(Boolean).join('; ')
          : (typeof data?.warning === 'string' ? data.warning : null);
        if (msg) {
          base.updates = { mux_error_message: msg };
        }
        return base;
      }
      case 'video.live_stream.updated': {
        base.handled = true;
        base.updates = {
          ...(data?.status ? { mux_stream_status: normalizeMuxStreamStatus(data.status) } : {}),
          ...(playbackId ? { mux_playback_id: playbackId } : {}),
        };
        return base;
      }
      default:
        return base;
    }
  }

  // Official Mux Asset webhook events (for recorded live stream VODs or errored assets)
  if (eventType.startsWith('video.asset.')) {
    const assetId = data?.id ? String(data.id) : null;
    const liveStreamId = data?.live_stream_id ? String(data.live_stream_id) : null;
    const assetPlaybackId = extractMuxPlaybackId(data?.playback_ids, preferredPolicy);

    base.assetId = assetId;
    base.liveStreamId = liveStreamId;

    switch (eventType) {
      case 'video.asset.created': {
        base.handled = true;
        base.updates = {
          ...(assetId ? { mux_asset_id: assetId } : {}),
        };
        return base;
      }
      case 'video.asset.ready': {
        base.handled = true;
        base.updates = {
          ...(assetId ? { mux_asset_id: assetId } : {}),
          ...(assetPlaybackId ? { mux_asset_playback_id: assetPlaybackId } : {}),
          mux_error_message: null,
        };
        return base;
      }
      case 'video.asset.errored': {
        base.handled = true;
        const errMessages = Array.isArray(data?.errors?.messages)
          ? data.errors.messages.join('; ')
          : 'Mux asset processing failed';
        base.updates = {
          mux_stream_status: 'error',
          mux_error_message: errMessages,
          ...(assetId ? { mux_asset_id: assetId } : {}),
        };
        return base;
      }
      default:
        return base;
    }
  }

  return base;
}

/**
 * Resolves the effective watermark configuration for an Event, inheriting platform
 * defaultWatermark (or channel watermark) whenever the Event has not explicitly overridden
 * or opted out of watermarking.
 */
export function resolveEffectiveWatermarkConfig(
  match: any,
  defaultWatermark?: MuxWatermarkConfig | null,
  channelWatermark?: MuxWatermarkConfig | null
): MuxWatermarkConfig | null {
  const raw = match?.mux_watermark_config ?? match?.muxWatermarkConfig ?? null;

  let rawObj: any = null;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      rawObj = JSON.parse(raw);
    } catch {
      rawObj = null;
    }
  } else if (raw && typeof raw === 'object') {
    rawObj = raw;
  }

  const defWm = defaultWatermark ? normalizeWatermarkConfig(defaultWatermark) : null;

  if (rawObj && typeof rawObj === 'object') {
    const normalized = normalizeWatermarkConfig(rawObj);
    // Explicit opt-out for this event
    if (!normalized.enabled && (normalized.url || rawObj.disabled === true)) {
      return null;
    }
    if (normalized.enabled && normalized.url) {
      const isCustomOverride = Boolean(rawObj.is_custom_override) || (Boolean(defWm?.url) && normalized.url !== defWm?.url);
      if (isCustomOverride) {
        return normalized;
      }
      // If the match was using the platform default watermark, dynamically inherit the latest platform default
      // position, margins, width, opacity, and delivery mode so changes in Admin Mux Settings apply immediately.
      if (defWm && defWm.enabled && defWm.url) {
        return defWm;
      }
      return normalized;
    }
  }

  if (channelWatermark) {
    const chWm = normalizeWatermarkConfig(channelWatermark);
    if (chWm.enabled && chWm.url) {
      return chWm;
    }
  }

  if (defWm && defWm.enabled && defWm.url) {
    return defWm;
  }

  return null;
}

/**
 * Resolves the safe, non-secret playback response object for an entitled viewer (`POST /api/matches/:id/stream`).
 * Never returns `stream_key` or `mux_stream_key`.
 * Preserves legacy YouTube, Custom Embed, and manual Mux Event playback.
 */
export function resolveMatchStreamResponse(
  match: any,
  options?: {
    signingConfig?: { keyId: string; privateKey: string } | null;
    expirationSeconds?: number;
    watermarkConfig?: MuxWatermarkConfig | null;
    defaultWatermark?: MuxWatermarkConfig | null;
    channelWatermark?: MuxWatermarkConfig | null;
  }
): {
  video_url: string | null;
  embed_code: string | null;
  playback_id: string | null;
  mux_playback_id: string | null;
  mux_asset_playback_id: string | null;
  mux_stream_status: string | null;
  playback_policy: MuxPlaybackPolicy;
  playback_token: string | null;
  thumbnail_token: string | null;
  storyboard_token: string | null;
  playback_token_expires_at: string | null;
  signing_error: string | null;
  watermark_config: MuxWatermarkConfig | null;
  stream_provider: string;
  description: string | null;
} {
  const provider = String(match?.stream_provider || match?.streamProvider || '').toLowerCase();
  const matchStatus = String(match?.status || '').toLowerCase();
  const isEndedOrReplay = ['completed', 'full_match', 'highlights'].includes(matchStatus);

  const muxLivePbId = match?.mux_playback_id || match?.muxPlaybackId || null;
  const muxAssetPbId = match?.mux_asset_playback_id || match?.muxAssetPlaybackId || null;
  const muxStreamStatus = match?.mux_stream_status || match?.muxStreamStatus || null;
  const isMuxActivelyLive = String(muxStreamStatus || '').toLowerCase() === 'active';
  const playbackPolicy = normalizePlaybackPolicy(match?.mux_playback_policy || match?.muxPlaybackPolicy);

  const watermarkConfig =
    options?.watermarkConfig !== undefined
      ? (options.watermarkConfig ? normalizeWatermarkConfig(options.watermarkConfig) : null)
      : resolveEffectiveWatermarkConfig(match, options?.defaultWatermark, options?.channelWatermark);

  let resolvedPlaybackId: string | null = match?.playback_id || match?.playbackId || null;

  // Use WatchWDS-managed Mux Playback ID only when provider is mux (or unset without conflicting YouTube/custom markup)
  if (!resolvedPlaybackId && provider !== 'youtube' && provider !== 'custom') {
    if (isEndedOrReplay && !isMuxActivelyLive && muxAssetPbId) {
      resolvedPlaybackId = muxAssetPbId;
    } else if (muxLivePbId || muxAssetPbId) {
      resolvedPlaybackId = muxLivePbId || muxAssetPbId;
    }
  }

  let playbackToken: string | null = null;
  let thumbnailToken: string | null = null;
  let storyboardToken: string | null = null;
  let playbackTokenExpiresAt: string | null = null;
  let signingError: string | null = null;

  if (
    playbackPolicy === 'signed' &&
    provider !== 'youtube' &&
    provider !== 'custom' &&
    resolvedPlaybackId
  ) {
    try {
      const signed = signMuxPlaybackTokens(resolvedPlaybackId, {
        keyId: options?.signingConfig?.keyId,
        privateKey: options?.signingConfig?.privateKey,
        expirationSeconds: options?.expirationSeconds,
      });
      playbackToken = signed.playback_token;
      thumbnailToken = signed.thumbnail_token;
      storyboardToken = signed.storyboard_token;
      playbackTokenExpiresAt = signed.playback_token_expires_at;
    } catch (err: any) {
      signingError = err?.message || 'Failed to generate Mux playback token.';
    }
  }

  return {
    video_url: match?.video_url || match?.videoUrl || null,
    embed_code: match?.embed_code || match?.embedCode || null,
    playback_id: resolvedPlaybackId,
    mux_playback_id: provider !== 'youtube' && provider !== 'custom' ? muxLivePbId : null,
    mux_asset_playback_id: provider !== 'youtube' && provider !== 'custom' ? muxAssetPbId : null,
    mux_stream_status: muxStreamStatus,
    playback_policy: playbackPolicy,
    playback_token: playbackToken,
    thumbnail_token: thumbnailToken,
    storyboard_token: storyboardToken,
    playback_token_expires_at: playbackTokenExpiresAt,
    signing_error: signingError,
    watermark_config: watermarkConfig && watermarkConfig.enabled ? watermarkConfig : null,
    stream_provider: provider || (resolvedPlaybackId ? 'mux' : 'youtube'),
    description: match?.description || null,
  };
}

