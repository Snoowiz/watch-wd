import crypto from 'crypto';
import { EventEmitter } from 'events';
import https from 'https';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_MUX_RTMP_URL,
  DEFAULT_MUX_SRT_URL,
  DEFAULT_MUX_STANDARD_RTMP_URL,
  MUX_API_BASE_URL,
  MUX_SYSTEM_API_BASE_URL,
  addMuxAssetPlaybackId,
  addMuxLiveStreamPlaybackId,
  buildMuxIngestEndpoints,
  buildMuxLiveStreamPayload,
  buildWatermarkOverlayInput,
  completeMuxLiveStream,
  createMuxLiveStream,
  createMuxSigningKey,
  decodeMuxPrivateKey,
  decryptStreamKey,
  deleteMuxAssetPlaybackId,
  deleteMuxLiveStream,
  deleteMuxLiveStreamPlaybackId,
  disableMuxLiveStream,
  enableMuxLiveStream,
  encryptStreamKey,
  extractMuxPlaybackId,
  getMuxAsset,
  getMuxConfig,
  getMuxLiveStream,
  getStreamKeyLast4,
  maskStreamKeyWithLast4,
  normalizeMuxStreamStatus,
  parseMuxWebhookEvent,
  resetMuxLiveStreamKey,
  resolveEffectiveWatermarkConfig,
  resolveMatchStreamResponse,
  signMuxPlaybackToken,
  signMuxPlaybackTokens,
  testMuxApiConnection,
  updateMuxLiveStreamWatermark,
  validateMuxWatermarkUrl,
  verifyMuxWebhookSignature,
} from '../muxService.js';
import {
  createClubChannelWebhookProcessor,
  issueStepUpReauthToken,
  resolveAuthorizedClubId,
  sanitizeChannelForClient,
  stripSecretsFromAuditDetails,
  validateEventChannelAssignment,
  validateStreamKeyRotation,
  verifyStepUpReauthToken,
} from '../clubStreamingService.js';
import {
  isMaskedSecret,
  normalizeWatermarkConfig,
  sanitizePrivateKey,
  setCachedMuxPlatformSettingsForTest,
} from '../db/persistentConfig.js';
import {
  parseWatermarkConfig,
  resolveRenderableWatermarkUrl,
} from '../src/components/WatermarkOverlay.js';
import { formatStreamHtml } from '../src/utils/embedHelper.js';
import {
  cleanEditorialDescription,
  formatMatchStatus,
  getPlaybackActionLabel,
} from '../src/utils/statusHelper.js';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

function signMuxPayload(rawBody: string, secret: string, timestampSec: number): string {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${timestampSec}.${rawBody}`, 'utf8')
    .digest('hex');
  return `t=${timestampSec},v1=${sig}`;
}

describe('Mux Live Stream Infrastructure', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MUX_TOKEN_ID;
    delete process.env.MUX_TOKEN_SECRET;
    delete process.env.MUX_WEBHOOK_SECRET;
    delete process.env.MUX_RTMP_INGEST_URL;
    delete process.env.MUX_SIGNING_KEY_ID;
    delete process.env.MUX_SIGNING_PRIVATE_KEY;
    delete process.env.MUX_PRIVATE_KEY;
    setCachedMuxPlatformSettingsForTest(null);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  describe('Phase 1: Server Configuration & Key Sanitization', () => {
    it('reports unconfigured when MUX_TOKEN_ID or MUX_TOKEN_SECRET are missing', () => {
      const cfg1 = getMuxConfig();
      expect(cfg1.isConfigured).toBe(false);
      expect(cfg1.isWebhookConfigured).toBe(false);
      expect(cfg1.rtmpIngestUrl).toBe(DEFAULT_MUX_RTMP_URL);

      process.env.MUX_TOKEN_ID = 'mux_token_id_only';
      expect(getMuxConfig().isConfigured).toBe(false);
    });

    it('sanitizes whitespace and invisible characters from env credentials', () => {
      process.env.MUX_TOKEN_ID = '  mux_id_123\u200B\r\n';
      process.env.MUX_TOKEN_SECRET = ' mux_secret_456\t ';
      process.env.MUX_WEBHOOK_SECRET = ' whsec_mux_789 ';
      process.env.MUX_RTMP_INGEST_URL = ' rtmps://custom-live.mux.com:443/app ';

      const cfg = getMuxConfig();
      expect(cfg.tokenId).toBe('mux_id_123');
      expect(cfg.tokenSecret).toBe('mux_secret_456');
      expect(cfg.webhookSecret).toBe('whsec_mux_789');
      expect(cfg.rtmpIngestUrl).toBe('rtmps://custom-live.mux.com:443/app');
      expect(cfg.isConfigured).toBe(true);
      expect(cfg.isWebhookConfigured).toBe(true);
    });
  });

  describe('Status Normalization & Payload Builder (incl. Watermark Prep)', () => {
    it('normalizes canonical Mux statuses and errored variant', () => {
      expect(normalizeMuxStreamStatus('created')).toBe('created');
      expect(normalizeMuxStreamStatus('idle')).toBe('idle');
      expect(normalizeMuxStreamStatus('connected')).toBe('connected');
      expect(normalizeMuxStreamStatus('recording')).toBe('recording');
      expect(normalizeMuxStreamStatus('ACTIVE')).toBe('active');
      expect(normalizeMuxStreamStatus('disconnected')).toBe('disconnected');
      expect(normalizeMuxStreamStatus('disabled')).toBe('disabled');
      expect(normalizeMuxStreamStatus('errored')).toBe('error');
      expect(normalizeMuxStreamStatus('unknown_state')).toBe('created');
    });

    it('builds standard live stream payload without watermarks enabled by default', () => {
      const payload = buildMuxLiveStreamPayload({
        passthrough: 'match-999',
        playbackPolicy: 'public',
      });

      expect(payload).toEqual({
        playback_policies: ['public'],
        passthrough: 'match-999',
        new_asset_settings: {
          playback_policies: ['public'],
        },
      });
      expect(payload.new_asset_settings.inputs).toBeUndefined();
    });

    it('strictly omits passthrough from new_asset_settings to adhere to Mux API contract and prevent 400 validation error', () => {
      const payload = buildMuxLiveStreamPayload({
        passthrough: 'club:42',
        playbackPolicy: 'signed',
        testMode: true,
      });

      expect(payload.passthrough).toBe('club:42');
      expect((payload.new_asset_settings as any).passthrough).toBeUndefined();
      expect(payload.new_asset_settings.playback_policies).toEqual(['signed']);
    });

    it('supports future watermark overlay_settings hook cleanly without changing top-level shape', () => {
      const payload = buildMuxLiveStreamPayload({
        passthrough: 'match-1000',
        playbackPolicy: 'public',
        latencyMode: 'low',
        reconnectWindow: 60,
        overlayConfig: {
          url: 'https://cdn.example.com/watermark.png',
          overlay_settings: {
            vertical_align: 'top',
            vertical_margin: '5%',
            horizontal_align: 'right',
            horizontal_margin: '5%',
            width: '120px',
            opacity: '80%',
          },
        },
      });

      expect(payload.latency_mode).toBe('low');
      expect(payload.reconnect_window).toBe(60);
      expect(payload.new_asset_settings.playback_policies).toEqual(['public']);
      // Validates that empty {} input is omitted on live stream creation to prevent Mux 'empty url' validation error
      expect(payload.new_asset_settings.inputs).toBeUndefined();
    });

    it('prefers public playback ID when extracting playback IDs', () => {
      expect(extractMuxPlaybackId(null)).toBeNull();
      expect(
        extractMuxPlaybackId([
          { id: 'signed_1', policy: 'signed' },
          { id: 'public_1', policy: 'public' },
        ])
      ).toBe('public_1');
      expect(extractMuxPlaybackId([{ id: 'signed_only', policy: 'signed' }])).toBe('signed_only');
    });
  });

  describe('Phase 2: Mux API Client (Create / Get / Delete / Fallback)', () => {
    it('fails explicitly if Mux credentials are not configured', async () => {
      await expect(createMuxLiveStream({ matchId: 'evt-1' })).rejects.toThrow(
        /not configured/i
      );
    });

    it('creates a Mux live stream via native fetch with Basic Auth and passthrough matchId', async () => {
      process.env.MUX_TOKEN_ID = 'test_token_id';
      process.env.MUX_TOKEN_SECRET = 'test_token_secret';

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            data: {
              id: 'ls_abc123',
              status: 'idle',
              stream_key: 'sk_live_secret_xyz',
              passthrough: 'evt-42',
              playback_ids: [{ id: 'pb_live_42', policy: 'public' }],
            },
          }),
      });
      globalThis.fetch = fetchMock as any;

      const created = await createMuxLiveStream({ matchId: 'evt-42' });

      expect(created.liveStreamId).toBe('ls_abc123');
      expect(created.playbackId).toBe('pb_live_42');
      expect(created.streamKey).toBe('sk_live_secret_xyz');
      expect(created.status).toBe('idle');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(`${MUX_API_BASE_URL}/live-streams`);
      expect(calledInit.method).toBe('POST');
      const expectedAuth = 'Basic ' + Buffer.from('test_token_id:test_token_secret').toString('base64');
      expect(calledInit.headers.Authorization).toBe(expectedAuth);
      const sentBody = JSON.parse(calledInit.body);
      expect(sentBody.passthrough).toBe('evt-42');
    });

    it('propagates Mux 4xx API errors directly without falling back to IPv4 socket retry', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'test_secret';

      const httpsSpy = vi.spyOn(https, 'request');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            error: {
              type: 'unauthorized',
              messages: ['Invalid credentials'],
            },
          }),
      }) as any;

      await expect(getMuxLiveStream('ls_missing')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid credentials',
      });
      expect(httpsSpy).not.toHaveBeenCalled();
    });

    it('falls back to IPv4 https.request when fetch hits a transport/network error', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'super_secret_do_not_leak';

      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed: ECONNRESET')) as any;

      const reqMock = new EventEmitter() as any;
      reqMock.write = vi.fn();
      reqMock.end = vi.fn();
      reqMock.destroy = vi.fn();

      const httpsSpy = vi.spyOn(https, 'request').mockImplementation((_url: any, _opts: any, cb: any) => {
        const res = new EventEmitter() as any;
        res.statusCode = 200;
        process.nextTick(() => {
          cb(res);
          res.emit(
            'data',
            Buffer.from(
              JSON.stringify({
                data: {
                  id: 'ls_ipv4_ok',
                  status: 'active',
                  playback_ids: [{ id: 'pb_ipv4', policy: 'public' }],
                },
              })
            )
          );
          res.emit('end');
        });
        return reqMock;
      });

      const stream = await getMuxLiveStream('ls_ipv4_ok');
      expect(httpsSpy).toHaveBeenCalledTimes(1);
      expect(stream.id).toBe('ls_ipv4_ok');
      expect(stream.status).toBe('active');
    });

    it('deletes a Mux live stream on 204 No Content', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'test_secret';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      }) as any;

      await expect(deleteMuxLiveStream('ls_to_delete')).resolves.toBeUndefined();
    });
  });

  describe('Webhook Signature Verification (Fail-Closed & Key Rotation)', () => {
    const secret = 'whsec_test_signing_secret_001';
    const rawBody = JSON.stringify({ type: 'video.live_stream.active', data: { id: 'ls_1' } });

    it('fails closed when MUX_WEBHOOK_SECRET is missing', () => {
      const ts = Math.floor(Date.now() / 1000);
      const header = signMuxPayload(rawBody, secret, ts);
      const res = verifyMuxWebhookSignature(rawBody, header);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/not configured/i);
    });

    it('accepts valid Mux-Signature header over exact rawBody string or Buffer', () => {
      const ts = Math.floor(Date.now() / 1000);
      const header = signMuxPayload(rawBody, secret, ts);

      expect(verifyMuxWebhookSignature(rawBody, header, secret)).toEqual({
        valid: true,
        timestamp: ts,
      });
      expect(verifyMuxWebhookSignature(Buffer.from(rawBody, 'utf8'), header, secret)).toEqual({
        valid: true,
        timestamp: ts,
      });
    });

    it('supports key rotation when multiple v1 signatures appear in Mux-Signature', () => {
      const ts = Math.floor(Date.now() / 1000);
      const oldSig = crypto.createHmac('sha256', 'old_secret').update(`${ts}.${rawBody}`).digest('hex');
      const newSig = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
      const header = `t=${ts},v1=${oldSig},v1=${newSig}`;

      expect(verifyMuxWebhookSignature(rawBody, header, secret).valid).toBe(true);
    });

    it('rejects tampered payloads, wrong secrets, malformed headers, and stale timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const validHeader = signMuxPayload(rawBody, secret, now);

      expect(verifyMuxWebhookSignature(rawBody + ' ', validHeader, secret).valid).toBe(false);
      expect(verifyMuxWebhookSignature(rawBody, validHeader, 'wrong_secret').valid).toBe(false);
      expect(verifyMuxWebhookSignature(rawBody, undefined, secret).valid).toBe(false);
      expect(verifyMuxWebhookSignature(rawBody, 't=abc,v1=deadbeef', secret).valid).toBe(false);

      const staleTs = now - 600;
      const staleHeader = signMuxPayload(rawBody, secret, staleTs);
      expect(verifyMuxWebhookSignature(rawBody, staleHeader, secret, 300).valid).toBe(false);
    });
  });

  describe('Webhook Event Parsing (Official Mux Events)', () => {
    it('maps all official video.live_stream.* lifecycle events without mutating Event status', () => {
      const cases: Array<[string, Record<string, any>, string]> = [
        ['video.live_stream.created', { id: 'ls_1', status: 'idle', passthrough: 'm1', playback_ids: [{ id: 'pb_1', policy: 'public' }] }, 'idle'],
        ['video.live_stream.connected', { id: 'ls_1', active_asset_id: 'asset_1' }, 'connected'],
        ['video.live_stream.recording', { id: 'ls_1', active_asset_id: 'asset_1' }, 'recording'],
        ['video.live_stream.active', { id: 'ls_1', active_asset_id: 'asset_1', playback_ids: [{ id: 'pb_1', policy: 'public' }] }, 'active'],
        ['video.live_stream.disconnected', { id: 'ls_1' }, 'disconnected'],
        ['video.live_stream.idle', { id: 'ls_1' }, 'idle'],
        ['video.live_stream.disabled', { id: 'ls_1' }, 'disabled'],
        ['video.live_stream.enabled', { id: 'ls_1', status: 'idle' }, 'idle'],
        ['video.live_stream.deleted', { id: 'ls_1' }, 'disabled'],
      ];

      for (const [type, data, expectedMuxStatus] of cases) {
        const parsed = parseMuxWebhookEvent({ type, data });
        expect(parsed.handled).toBe(true);
        expect(parsed.liveStreamId).toBe('ls_1');
        expect(parsed.updates.mux_stream_status).toBe(expectedMuxStatus);
        // Critical separation rule: Mux webhooks must never rewrite editorial Event `status`
        expect(parsed.updates.status).toBeUndefined();
      }
    });

    it('records warning details on video.live_stream.warning', () => {
      const parsed = parseMuxWebhookEvent({
        type: 'video.live_stream.warning',
        data: {
          id: 'ls_1',
          warnings: [{ type: 'audio_bitrate', message: 'Low audio bitrate detected' }],
        },
      });
      expect(parsed.handled).toBe(true);
      expect(parsed.updates.mux_error_message).toBe('Low audio bitrate detected');
    });

    it('maps video.asset.created, video.asset.ready, and video.asset.errored safely', () => {
      const created = parseMuxWebhookEvent({
        type: 'video.asset.created',
        data: { id: 'asset_99', live_stream_id: 'ls_1' },
      });
      expect(created.handled).toBe(true);
      expect(created.liveStreamId).toBe('ls_1');
      expect(created.updates).toEqual({ mux_asset_id: 'asset_99' });

      const ready = parseMuxWebhookEvent({
        type: 'video.asset.ready',
        data: {
          id: 'asset_99',
          live_stream_id: 'ls_1',
          playback_ids: [{ id: 'vod_pb_99', policy: 'public' }],
        },
      });
      expect(ready.handled).toBe(true);
      expect(ready.updates.mux_asset_id).toBe('asset_99');
      expect(ready.updates.mux_asset_playback_id).toBe('vod_pb_99');
      expect(ready.updates.mux_playback_id).toBeUndefined();
      expect(ready.updates.mux_error_message).toBeNull();

      const errored = parseMuxWebhookEvent({
        type: 'video.asset.errored',
        data: {
          id: 'asset_99',
          live_stream_id: 'ls_1',
          errors: { messages: ['Invalid input codec'] },
        },
      });
      expect(errored.handled).toBe(true);
      expect(errored.updates.mux_stream_status).toBe('error');
      expect(errored.updates.mux_error_message).toBe('Invalid input codec');
    });
  });

  describe('Playback Resolution & Backward Compatibility + Secret Isolation', () => {
    it('never returns mux_stream_key or stream_key in viewer playback response', () => {
      const resolved = resolveMatchStreamResponse({
        id: 'evt-mux-1',
        stream_provider: 'mux',
        status: 'live',
        mux_live_stream_id: 'ls_1',
        mux_playback_id: 'pb_live_1',
        mux_stream_key: 'SECRET_STREAM_KEY_DO_NOT_LEAK',
        stream_key: 'SECRET_STREAM_KEY_DO_NOT_LEAK',
        mux_stream_status: 'active',
        description: '<p>Live coverage</p>',
      });

      expect(resolved.playback_id).toBe('pb_live_1');
      expect(resolved.mux_playback_id).toBe('pb_live_1');
      expect(resolved.stream_provider).toBe('mux');
      expect((resolved as any).mux_stream_key).toBeUndefined();
      expect((resolved as any).stream_key).toBeUndefined();
      expect(JSON.stringify(resolved)).not.toContain('SECRET_STREAM_KEY_DO_NOT_LEAK');
    });

    it('preserves existing YouTube Events even if stale mux playback IDs exist on record', () => {
      const resolved = resolveMatchStreamResponse({
        id: 'evt-yt-1',
        stream_provider: 'youtube',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        mux_playback_id: 'stale_mux_pb',
        mux_asset_playback_id: 'stale_vod_pb',
      });

      expect(resolved.stream_provider).toBe('youtube');
      expect(resolved.playback_id).toBeNull();
      expect(resolved.mux_playback_id).toBeNull();
      expect(resolved.mux_asset_playback_id).toBeNull();
      expect(formatStreamHtml(resolved.video_url || '')).toContain('youtube.com/embed/dQw4w9WgXcQ');
    });

    it('preserves existing Custom Embed Events and ignores mux playback IDs', () => {
      const resolved = resolveMatchStreamResponse({
        id: 'evt-custom-1',
        stream_provider: 'custom',
        embed_code: '<iframe src="https://player.example.com/embed/42"></iframe>',
        mux_playback_id: 'stale_mux_pb',
      });

      expect(resolved.stream_provider).toBe('custom');
      expect(resolved.playback_id).toBeNull();
      expect(formatStreamHtml(resolved.embed_code || '')).toContain('player.example.com/embed/42');
    });

    it('preserves existing manually configured Mux Playback ID and HLS URL Events', () => {
      const byManualId = resolveMatchStreamResponse({
        id: 'evt-manual-mux-1',
        stream_provider: 'mux',
        playback_id: 'manualPlayback123456',
      });
      expect(byManualId.playback_id).toBe('manualPlayback123456');
      const playerHtml1 = formatStreamHtml(byManualId.playback_id!, { isLive: true });
      expect(playerHtml1).toContain('<mux-player');
      expect(playerHtml1).toContain('playback-id="manualPlayback123456"');
      expect(playerHtml1).toContain('stream-type="live"');

      const byManualUrl = resolveMatchStreamResponse({
        id: 'evt-manual-mux-2',
        stream_provider: 'mux',
        video_url: 'https://stream.mux.com/hlsPlayback789012.m3u8',
      });
      const playerHtml2 = formatStreamHtml(byManualUrl.video_url!, { isLive: false });
      expect(playerHtml2).toContain('<mux-player');
      expect(playerHtml2).toContain('playback-id="hlsPlayback789012"');
      expect(playerHtml2).toContain('stream-type="on-demand"');
    });

    it('switches completed Mux-managed events to recorded VOD asset playback once live stream is no longer active', () => {
      // During live broadcast (even if status briefly says full_match while mux_stream_status is still active) -> keep live playback ID
      const stillLive = resolveMatchStreamResponse({
        stream_provider: 'mux',
        status: 'full_match',
        mux_stream_status: 'active',
        mux_playback_id: 'livePlayback111222',
        mux_asset_playback_id: 'vodPlayback222333',
      });
      expect(stillLive.playback_id).toBe('livePlayback111222');

      // Once event is finished/replay and stream is idle/disconnected -> serve recorded asset playback ID
      const replayVod = resolveMatchStreamResponse({
        stream_provider: 'mux',
        status: 'full_match',
        mux_stream_status: 'idle',
        mux_playback_id: 'livePlayback111222',
        mux_asset_playback_id: 'vodPlayback222333',
      });
      expect(replayVod.playback_id).toBe('vodPlayback222333');
      const replayHtml = formatStreamHtml(replayVod.playback_id!, { isLive: false });
      expect(replayHtml).toContain('playback-id="vodPlayback222333"');
      expect(replayHtml).toContain('stream-type="on-demand"');
    });

    it('cleans internal editorial tags while preserving viewer playback label helpers', () => {
      const cleaned = cleanEditorialDescription(
        'SEO: WatchWDS Cup Final\n#full-match #highlights Opening match notes'
      );
      expect(cleaned).toBe('Opening match notes');
      expect(formatMatchStatus('full_match')).toBe('Full Match');
      expect(getPlaybackActionLabel({ isLive: true })).toBe('Watch live');
      expect(getPlaybackActionLabel({ status: 'highlights', isReplayAvailable: true })).toBe('Watch replay');
    });

    it('propagates 404/error status on deleteMuxLiveStream so DELETE /api/matches/:id can catch and continue cleanly', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'test_secret';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { type: 'not_found', messages: ['Live stream not found'] } }),
      }) as any;

      await expect(deleteMuxLiveStream('ls_already_deleted')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('Future Phase 1: Watermark / Logo Overlays', () => {
    it('validates watermark URLs and detects unsupported formats, data URIs, and localhost', () => {
      expect(validateMuxWatermarkUrl('https://cdn.watchwds.com/logo.png')).toEqual({
        valid: true,
        isLocalhost: false,
      });
      expect(validateMuxWatermarkUrl('https://cdn.watchwds.com/logo.jpg')).toEqual({
        valid: true,
        isLocalhost: false,
      });
      expect(validateMuxWatermarkUrl('http://localhost:3000/api/mux/watermarks/wm_1.png')).toEqual({
        valid: true,
        isLocalhost: true,
      });
      expect(validateMuxWatermarkUrl('data:image/png;base64,iVBOR').valid).toBe(false);
      expect(validateMuxWatermarkUrl('https://cdn.watchwds.com/logo.svg').valid).toBe(false);
      expect(validateMuxWatermarkUrl('https://cdn.watchwds.com/logo.webp').valid).toBe(false);
    });

    it('builds Mux overlay_settings only when enabled and mode is mux_burn_in', () => {
      expect(
        buildWatermarkOverlayInput({
          enabled: false,
          mode: 'mux_burn_in',
          url: 'https://cdn.example.com/wm.png',
          vertical_align: 'top',
          vertical_margin: '4%',
          horizontal_align: 'right',
          horizontal_margin: '4%',
          width: '14%',
          opacity: '85%',
        })
      ).toBeNull();

      expect(
        buildWatermarkOverlayInput({
          enabled: true,
          mode: 'player_overlay',
          url: 'https://cdn.example.com/wm.png',
          vertical_align: 'top',
          vertical_margin: '4%',
          horizontal_align: 'right',
          horizontal_margin: '4%',
          width: '14%',
          opacity: '85%',
        })
      ).toBeNull();

      expect(
        buildWatermarkOverlayInput({
          enabled: true,
          mode: 'mux_burn_in',
          url: 'https://cdn.example.com/wm.png',
          vertical_align: 'bottom',
          vertical_margin: '3%',
          horizontal_align: 'left',
          horizontal_margin: '5%',
          width: '120px',
          opacity: '75%',
        })
      ).toEqual({
        url: 'https://cdn.example.com/wm.png',
        overlay_settings: {
          vertical_align: 'bottom',
          vertical_margin: '3%',
          horizontal_align: 'left',
          horizontal_margin: '5%',
          width: '120px',
          opacity: '75%',
        },
      });
    });

    it('normalizes and parses watermark config consistently on server and client', () => {
      const serverNormalized = normalizeWatermarkConfig({
        enabled: 1,
        mode: 'player_overlay',
        url: '  /api/mux/watermarks/wm_abc.png  ',
        vertical_align: 'invalid_val',
        horizontal_align: 'center',
        width: '20',
        opacity: '90%',
      });
      expect(serverNormalized).toEqual({
        enabled: true,
        mode: 'player_overlay',
        url: '/api/mux/watermarks/wm_abc.png',
        vertical_align: 'top',
        vertical_margin: '4%',
        horizontal_align: 'center',
        horizontal_margin: '4%',
        width: '20%',
        opacity: '90%',
      });

      const clientParsed = parseWatermarkConfig(JSON.stringify(serverNormalized));
      expect(clientParsed).toEqual(serverNormalized);
    });

    it('updates Mux live stream new_asset_settings playback policy via PATCH without malformed empty inputs', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'test_secret';

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { id: 'ls_wm_1', status: 'idle' } }),
      });
      globalThis.fetch = fetchMock as any;

      await updateMuxLiveStreamWatermark('ls_wm_1', {
        playbackPolicy: 'signed',
        overlayConfig: {
          url: 'https://cdn.example.com/logo.png',
          overlay_settings: {
            vertical_align: 'top',
            horizontal_align: 'right',
            width: '15%',
            opacity: '90%',
          },
        },
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${MUX_API_BASE_URL}/live-streams/ls_wm_1`);
      expect(init.method).toBe('PATCH');
      const body = JSON.parse(init.body);
      expect(body.new_asset_settings.playback_policies).toEqual(['signed']);
      // Validates that empty {} inputs are omitted on live stream updates to prevent Mux 'empty url' validation error
      expect(body.new_asset_settings.inputs).toBeUndefined();
    });
  });

  describe('Future Phase 2: Signed Playback Keys & JWT Token Protection', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });

    it('decodes both raw PEM, escaped-newline env PEM, and Base64-encoded PEM keys', () => {
      const escaped = privateKey.replace(/\n/g, '\\n');
      expect(sanitizePrivateKey(escaped)).toContain('\n');
      expect(decodeMuxPrivateKey(escaped)).toContain('-----BEGIN RSA PRIVATE KEY-----');

      const b64 = Buffer.from(privateKey, 'utf8').toString('base64');
      expect(decodeMuxPrivateKey(b64)).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(isMaskedSecret('sk_test_••••••••1234')).toBe(true);
    });

    it('generates verifiable RS256 playback, thumbnail, and storyboard JWTs with clamped TTL', () => {
      process.env.MUX_SIGNING_KEY_ID = 'kid_test_rsa_1';
      process.env.MUX_SIGNING_PRIVATE_KEY = privateKey;

      const cfg = getMuxConfig();
      expect(cfg.isSigningConfigured).toBe(true);

      const single = signMuxPlaybackToken('signedPb123456', {
        expirationSeconds: 1800,
        audience: 'v',
      });
      const decoded = jwt.verify(single.token, publicKey, {
        algorithms: ['RS256'],
        complete: true,
      }) as any;
      expect(decoded.header.kid).toBe('kid_test_rsa_1');
      expect(decoded.payload.sub).toBe('signedPb123456');
      expect(decoded.payload.aud).toBe('v');

      const bundle = signMuxPlaybackTokens('signedPb123456', { expirationSeconds: 10 });
      const vDecoded = jwt.verify(bundle.playback_token, publicKey, { algorithms: ['RS256'] }) as any;
      const tDecoded = jwt.verify(bundle.thumbnail_token, publicKey, { algorithms: ['RS256'] }) as any;
      const sDecoded = jwt.verify(bundle.storyboard_token, publicKey, { algorithms: ['RS256'] }) as any;
      expect(vDecoded.aud).toBe('v');
      expect(tDecoded.aud).toBe('t');
      expect(sDecoded.aud).toBe('s');
      // Clamped minimum 60 seconds
      expect(vDecoded.exp - vDecoded.iat).toBe(60);
    });

    it('creates Mux live stream & prefers matching signed playback ID across webhooks and APIs', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'test_secret';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            data: {
              id: 'ls_signed_1',
              status: 'idle',
              stream_key: 'sk_signed_secret',
              playback_ids: [
                { id: 'pub_pb_unused', policy: 'public' },
                { id: 'sig_pb_primary', policy: 'signed' },
              ],
            },
          }),
      }) as any;

      const created = await createMuxLiveStream({
        matchId: 'evt-signed-1',
        playbackPolicy: 'signed',
      });
      expect(created.playbackPolicy).toBe('signed');
      expect(created.playbackId).toBe('sig_pb_primary');

      expect(
        extractMuxPlaybackId(
          [
            { id: 'pub_pb', policy: 'public' },
            { id: 'sig_pb', policy: 'signed' },
          ],
          'signed'
        )
      ).toBe('sig_pb');

      const webhookParsed = parseMuxWebhookEvent(
        {
          type: 'video.asset.ready',
          data: {
            id: 'asset_signed_9',
            live_stream_id: 'ls_signed_1',
            playback_ids: [
              { id: 'vod_pub_9', policy: 'public' },
              { id: 'vod_sig_9', policy: 'signed' },
            ],
          },
        },
        'signed'
      );
      expect(webhookParsed.updates.mux_asset_playback_id).toBe('vod_sig_9');
    });

    it('creates signing keys, tests connection, and toggles playback IDs via Mux REST APIs', async () => {
      process.env.MUX_TOKEN_ID = 'test_id';
      process.env.MUX_TOKEN_SECRET = 'test_secret';
      const b64Key = Buffer.from(privateKey, 'utf8').toString('base64');

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ data: { id: 'sk_generated_1', private_key: b64Key } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: [{ id: 'ls_1' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ data: { id: 'pb_new_sig', policy: 'signed' } }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ data: { id: 'asset_pb_sig', policy: 'signed' } }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' });

      globalThis.fetch = fetchMock as any;

      const keyRes = await createMuxSigningKey();
      expect(fetchMock.mock.calls[0][0]).toBe(`${MUX_SYSTEM_API_BASE_URL}/signing-keys`);
      expect(keyRes.id).toBe('sk_generated_1');
      expect(keyRes.privateKey).toContain('-----BEGIN RSA PRIVATE KEY-----');

      const ping = await testMuxApiConnection();
      expect(ping).toEqual({ ok: true, liveStreamSampleCount: 1 });

      const addedLive = await addMuxLiveStreamPlaybackId('ls_1', 'signed');
      expect(addedLive.id).toBe('pb_new_sig');
      await expect(deleteMuxLiveStreamPlaybackId('ls_1', 'pb_old_pub')).resolves.toBeUndefined();

      const addedAsset = await addMuxAssetPlaybackId('asset_1', 'signed');
      expect(addedAsset.id).toBe('asset_pb_sig');
      await expect(deleteMuxAssetPlaybackId('asset_1', 'asset_pb_old')).resolves.toBeUndefined();
    });

    it('resolves signed stream responses with tokens when configured and fails closed if keys missing', () => {
      // Missing signing keys -> fails closed with signing_error & null tokens
      const missingKeys = resolveMatchStreamResponse({
        stream_provider: 'mux',
        mux_playback_policy: 'signed',
        mux_playback_id: 'signedPlaybackId123',
        mux_stream_status: 'active',
      });
      expect(missingKeys.playback_policy).toBe('signed');
      expect(missingKeys.playback_token).toBeNull();
      expect(missingKeys.signing_error).toMatch(/not configured/i);

      // Configured RSA keys -> produces signed tokens and passes safe player_overlay watermark
      process.env.MUX_SIGNING_KEY_ID = 'kid_stream_1';
      process.env.MUX_SIGNING_PRIVATE_KEY = privateKey;

      const signedStream = resolveMatchStreamResponse({
        stream_provider: 'mux',
        mux_playback_policy: 'signed',
        mux_playback_id: 'signedPlaybackId123',
        mux_stream_status: 'active',
        mux_watermark_config: JSON.stringify({
          enabled: true,
          mode: 'player_overlay',
          url: '/api/mux/watermarks/wm_club.png',
          vertical_align: 'top',
          horizontal_align: 'right',
        }),
      });
      expect(signedStream.signing_error).toBeNull();
      expect(signedStream.playback_token).toBeTruthy();
      expect(signedStream.thumbnail_token).toBeTruthy();
      expect(signedStream.storyboard_token).toBeTruthy();
      expect(signedStream.watermark_config?.enabled).toBe(true);
      expect(signedStream.watermark_config?.mode).toBe('player_overlay');

      // Inject into <mux-player> via formatStreamHtml + real DOMPurify allowlist
      const playerHtml = formatStreamHtml(signedStream.playback_id!, {
        isLive: true,
        playbackToken: signedStream.playback_token,
        thumbnailToken: signedStream.thumbnail_token,
        storyboardToken: signedStream.storyboard_token,
      });
      expect(playerHtml).toContain('<mux-player');
      expect(playerHtml).toContain(`playback-token="${signedStream.playback_token}"`);
      expect(playerHtml).toContain(`thumbnail-token="${signedStream.thumbnail_token}"`);
      expect(playerHtml).toContain(`storyboard-token="${signedStream.storyboard_token}"`);

      // Rejects non-JWT attribute-injection payloads passed as token
      const xssHtml = formatStreamHtml('signedPlaybackId123', {
        playbackToken: '" onclick="alert(1)',
      });
      expect(xssHtml).not.toContain('onclick');
      expect(xssHtml).not.toContain('playback-token');
    });
  });

  describe('Phase 3+: Reusable Partner Club Channels, Security & Multi-Sport Isolation', () => {
    it('encrypts & decrypts stream keys with AES-256-GCM, rejects tampering, and masks keys cleanly', () => {
      process.env.MUX_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const plain = 'live_secret_mux_stream_key_9988';

      const enc1 = encryptStreamKey(plain);
      const enc2 = encryptStreamKey(plain);
      expect(enc1.startsWith('enc:v1:')).toBe(true);
      expect(enc1).not.toBe(enc2); // Random IV per encryption
      expect(enc1).not.toContain(plain);
      expect(decryptStreamKey(enc1)).toBe(plain);

      // Tampering throws explicitly
      const parts = enc1.split(':');
      const corrupted = `enc:v1:${parts[2]}:${parts[3]}:ffffffffffffffff`;
      expect(() => decryptStreamKey(corrupted)).toThrow();

      // Legacy plaintext records still read gracefully
      expect(decryptStreamKey('legacy_plain_key')).toBe('legacy_plain_key');

      const last4 = getStreamKeyLast4(plain);
      expect(last4).toBe('9988');
      expect(maskStreamKeyWithLast4(last4)).toBe('••••••••••••••••••••9988');

      const hiddenEndpoints = buildMuxIngestEndpoints(undefined, null);
      expect(hiddenEndpoints.rtmpsUrl).toBe(DEFAULT_MUX_RTMP_URL);
      expect(hiddenEndpoints.rtmpStandardUrl).toBe(DEFAULT_MUX_STANDARD_RTMP_URL);
      expect(hiddenEndpoints.srtUrl).toBe(DEFAULT_MUX_SRT_URL);
      expect(hiddenEndpoints.srtFullUrl).toBeNull();

      const revealedEndpoints = buildMuxIngestEndpoints(undefined, plain);
      expect(revealedEndpoints.srtFullUrl).toBe(
        `${DEFAULT_MUX_SRT_URL}?streamid=${encodeURIComponent(plain)}`
      );
    });

    it('creates testMode live streams and manages reset-key, disable, enable, complete & asset APIs', async () => {
      process.env.MUX_TOKEN_ID = 'mux_id_ops';
      process.env.MUX_TOKEN_SECRET = 'mux_sec_ops';

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              data: {
                id: 'ls_club_test_1',
                status: 'idle',
                stream_key: 'sk_test_init',
                playback_ids: [{ id: 'pb_club_1', policy: 'public' }],
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ data: { id: 'ls_club_test_1', stream_key: 'sk_rotated_new' } }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: {
                id: 'asset_99',
                status: 'ready',
                playback_ids: [{ id: 'pb_vod_99', policy: 'public' }],
              },
            }),
        });
      globalThis.fetch = fetchMock as any;

      const stream = await createMuxLiveStream({
        matchId: 'club:42',
        passthrough: 'club:42',
        testMode: true,
      });
      expect(stream.liveStreamId).toBe('ls_club_test_1');
      const reqBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(reqBody.test).toBe(true);
      expect(reqBody.passthrough).toBe('club:42');

      const reset = await resetMuxLiveStreamKey('ls_club_test_1');
      expect(fetchMock.mock.calls[1][0]).toBe(
        `${MUX_API_BASE_URL}/live-streams/ls_club_test_1/reset-stream-key`
      );
      expect(reset.streamKey).toBe('sk_rotated_new');

      await disableMuxLiveStream('ls_club_test_1');
      expect(fetchMock.mock.calls[2][0]).toBe(`${MUX_API_BASE_URL}/live-streams/ls_club_test_1/disable`);
      expect(fetchMock.mock.calls[2][1].method).toBe('PUT');

      await enableMuxLiveStream('ls_club_test_1');
      expect(fetchMock.mock.calls[3][0]).toBe(`${MUX_API_BASE_URL}/live-streams/ls_club_test_1/enable`);

      await completeMuxLiveStream('ls_club_test_1');
      expect(fetchMock.mock.calls[4][0]).toBe(`${MUX_API_BASE_URL}/live-streams/ls_club_test_1/complete`);

      const asset = await getMuxAsset('asset_99');
      expect(asset.status).toBe('ready');
      expect(extractMuxPlaybackId(asset.playback_ids)).toBe('pb_vod_99');
    });

    it('enforces partner anti-IDOR club pinning, step-up reauth tokens, and secret-free client/audit views', () => {
      const secret = 'test_jwt_secret_for_reauth';

      // Partner user is strictly pinned to own club_id regardless of requestedClubId
      expect(
        resolveAuthorizedClubId({ id: 'u1', role: 'partner', club_id: '101' }, '999')
      ).toBe('101');
      // Admin may inspect any target club
      expect(
        resolveAuthorizedClubId({ id: 'a1', role: 'admin' }, '999')
      ).toBe('999');
      // Regular viewer is denied
      expect(
        resolveAuthorizedClubId({ id: 'v1', role: 'viewer', club_id: '101' }, '101')
      ).toBeNull();

      // Step-up reauth token issuance & verification
      const partnerUser = { id: 'u1', role: 'partner', club_id: '101' };
      const reauth = issueStepUpReauthToken(
        { userId: 'u1', role: 'partner', clubId: '101' },
        secret,
        300
      );
      expect(verifyStepUpReauthToken(reauth.token, partnerUser, secret, '101').valid).toBe(true);
      expect(
        verifyStepUpReauthToken(reauth.token, { id: 'u2', role: 'partner', club_id: '101' }, secret, '101').valid
      ).toBe(false);
      expect(
        verifyStepUpReauthToken(reauth.token, partnerUser, secret, '202').valid
      ).toBe(false);
      expect(verifyStepUpReauthToken(undefined, partnerUser, secret, '101').valid).toBe(false);

      // Client channel sanitization strips encrypted ciphertexts and never reveals raw keys
      const sanitized = sanitizeChannelForClient({
        id: 'ch_1',
        club_id: '101',
        mux_live_stream_id: 'ls_101',
        mux_playback_id: 'pb_101',
        stream_key_encrypted: 'enc:v1:iv:tag:cipher',
        stream_key_last4: '4321',
        channel_status: 'idle',
      });
      expect(JSON.stringify(sanitized)).not.toContain('enc:v1');
      expect(sanitized?.maskedStreamKey).toBe('••••••••••••••••••••4321');
      expect(sanitized?.ingest.srtFullUrl).toBeNull();

      // Audit logs strip secret keys/passwords/tokens recursively while keeping last4
      const cleanAudit = stripSecretsFromAuditDetails({
        stream_key: 'should_not_appear',
        key_last4: '4321',
        password: 'hunter2',
        nested: { token: 'secret_jwt', matchId: 'evt_55' },
      });
      expect(cleanAudit).toEqual({
        key_last4: '4321',
        nested: { matchId: 'evt_55' },
      });
    });

    it('enforces approval, suspension, multi-sport eligibility, single active broadcast lock, and live key-rotation guard', () => {
      const approvedClub = { id: '10', is_active: 1, mux_streaming_approved: 1 };
      const channel = {
        id: 'ch_10',
        club_id: '10',
        mux_live_stream_id: 'ls_10',
        channel_status: 'idle',
        is_approved: 1,
        is_suspended: 0,
      };

      // Multi-sport support: football, basketball, tennis, boxing, and dynamically added sport ('padel')
      for (const sport of ['football', 'basketball', 'tennis', 'boxing', 'padel']) {
        const res = validateEventChannelAssignment({
          club: approvedClub,
          channel,
          event: { id: `ev_${sport}`, sport, club_id: '10', publish_status: 'published', revoke_status: 'normal' },
          openSessions: [],
          featureEnabled: true,
        });
        expect(res).toEqual({ ok: true });
      }

      // Feature disabled
      expect(
        validateEventChannelAssignment({
          club: approvedClub,
          channel,
          event: { id: 'ev_1', club_id: '10' },
          featureEnabled: false,
        })
      ).toMatchObject({ ok: false, status: 403 });

      // Club not approved
      expect(
        validateEventChannelAssignment({
          club: { id: '10', is_active: 1, mux_streaming_approved: 0 },
          channel,
          event: { id: 'ev_1', club_id: '10' },
        })
      ).toMatchObject({ ok: false, status: 403 });

      // Cross-club event IDOR blocked
      expect(
        validateEventChannelAssignment({
          club: approvedClub,
          channel,
          event: { id: 'ev_other', club_id: '99' },
        })
      ).toMatchObject({ ok: false, status: 403 });

      // Concurrent broadcast lock: blocks Event B while Event A session is active/open
      const openSession = { id: 'sess_A', match_id: 'ev_A', status: 'live' };
      const conflict = validateEventChannelAssignment({
        club: approvedClub,
        channel,
        event: { id: 'ev_B', sport: 'basketball', club_id: '10' },
        openSessions: [openSession],
      });
      expect(conflict).toMatchObject({ ok: false, status: 409 });

      // Idempotent re-assignment of the same bound event succeeds cleanly
      const idempotent = validateEventChannelAssignment({
        club: approvedClub,
        channel,
        event: { id: 'ev_A', sport: 'football', club_id: '10' },
        openSessions: [openSession],
      });
      expect(idempotent).toEqual({ ok: true, alreadyAssignedSession: openSession });

      // Key rotation safety guard during active broadcast
      expect(
        validateStreamKeyRotation({ channel: { ...channel, channel_status: 'active' }, openSessions: [openSession] })
      ).toMatchObject({ allowed: false });
      expect(
        validateStreamKeyRotation({
          channel: { ...channel, channel_status: 'active' },
          openSessions: [openSession],
          force: true,
        })
      ).toEqual({ allowed: true });
      expect(
        validateStreamKeyRotation({ channel, openSessions: [] })
      ).toEqual({ allowed: true });
    });

    it('processes club channel webhooks idempotently and preserves strict per-Event VOD replay isolation across reused events', async () => {
      // Lightweight stateful DB mock backing matches, club_streaming_channels, broadcast_sessions, mux_webhook_events
      const matchesMap = new Map<string, any>([
        [
          'event_football_1',
          {
            id: 'event_football_1',
            sport: 'football',
            club_id: 'club_1',
            stream_provider: 'mux',
            mux_live_stream_id: 'ls_club_reusable',
            mux_playback_id: 'pb_club_live',
            mux_stream_status: 'created',
            mux_asset_id: null,
            mux_asset_playback_id: null,
          },
        ],
        [
          'event_boxing_2',
          {
            id: 'event_boxing_2',
            sport: 'boxing',
            club_id: 'club_1',
            stream_provider: 'mux',
            mux_live_stream_id: 'ls_club_reusable',
            mux_playback_id: null,
            mux_stream_status: 'idle',
            mux_asset_id: null,
            mux_asset_playback_id: null,
          },
        ],
      ]);

      const channelRow: any = {
        id: 'ch_1',
        club_id: 'club_1',
        mux_live_stream_id: 'ls_club_reusable',
        mux_playback_id: 'pb_club_live',
        mux_playback_policy: 'public',
        channel_status: 'idle',
        active_broadcast_session_id: 'sess_1',
        active_match_id: 'event_football_1',
      };

      const sessions = new Map<string, any>([
        [
          'sess_1',
          {
            id: 'sess_1',
            channel_id: 'ch_1',
            club_id: 'club_1',
            match_id: 'event_football_1',
            mux_live_stream_id: 'ls_club_reusable',
            mux_playback_policy: 'public',
            status: 'assigned',
            mux_stream_status: 'idle',
            mux_asset_id: null,
            mux_asset_playback_id: null,
            duration_seconds: 0,
            ended_at: null,
          },
        ],
      ]);
      const seenWebhooks = new Set<string>();

      const dbMock = {
        collection: (name: string) => ({
          doc: (id: string) => ({
            get: async () => {
              if (name !== 'matches') return { exists: false };
              const data = matchesMap.get(String(id));
              return { exists: Boolean(data), id: String(id), data: () => ({ ...data }) };
            },
            update: async (patch: Record<string, any>) => {
              if (name === 'matches' && matchesMap.has(String(id))) {
                Object.assign(matchesMap.get(String(id)), patch);
              }
            },
          }),
        }),
      };

      const queryMock = async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM `mux_webhook_events`')) {
          return seenWebhooks.has(String(params[0])) ? [{ event_id: params[0] }] : [];
        }
        if (sql.includes('FROM `club_streaming_channels`')) {
          return channelRow.mux_live_stream_id === String(params[0]) ? [{ ...channelRow }] : [];
        }
        if (sql.includes('FROM `broadcast_sessions` WHERE `mux_asset_id`')) {
          return Array.from(sessions.values()).filter((s) => s.mux_asset_id === String(params[0]));
        }
        if (sql.includes('FROM `broadcast_sessions` WHERE `mux_live_stream_id`') && sql.includes("status` IN ('assigned'")) {
          return Array.from(sessions.values()).filter(
            (s) => s.mux_live_stream_id === String(params[0]) && ['assigned', 'live', 'disconnected', 'ending'].includes(s.status)
          );
        }
        if (sql.includes('FROM `broadcast_sessions` WHERE `mux_live_stream_id`') && sql.includes("status` = 'completed'")) {
          return Array.from(sessions.values()).filter(
            (s) => s.mux_live_stream_id === String(params[0]) && s.status === 'completed'
          );
        }
        return [];
      };

      const executeMock = async (sql: string, params: any[] = []) => {
        if (sql.includes('INSERT INTO `mux_webhook_events`')) {
          seenWebhooks.add(String(params[0]));
        } else if (sql.includes('UPDATE `club_streaming_channels` SET `channel_status`')) {
          channelRow.channel_status = params[0];
        } else if (sql.includes('UPDATE `club_streaming_channels` SET `active_broadcast_session_id` = NULL')) {
          if (channelRow.active_broadcast_session_id === params[1]) {
            channelRow.active_broadcast_session_id = null;
            channelRow.active_match_id = null;
          }
        } else if (sql.includes("UPDATE `broadcast_sessions` SET `status` = 'live'")) {
          const s = sessions.get(String(params[1]));
          if (s) {
            s.status = 'live';
            s.mux_stream_status = 'active';
            if (params[0]) s.mux_asset_id = params[0];
          }
        } else if (sql.includes("UPDATE `broadcast_sessions` SET `status` = 'completed'")) {
          const s = sessions.get(String(params[1]));
          if (s) {
            s.status = 'completed';
            s.mux_stream_status = 'idle';
            s.ended_at = new Date().toISOString();
          }
        } else if (sql.includes('UPDATE `broadcast_sessions` SET `mux_asset_id`')) {
          const s = sessions.get(String(params[3]));
          if (s) {
            if (params[0]) s.mux_asset_id = params[0];
            if (params[1]) s.mux_asset_playback_id = params[1];
          }
        }
        return {};
      };

      const invalidated: string[] = [];
      const processWebhook = createClubChannelWebhookProcessor({
        db: dbMock,
        query: queryMock,
        execute: executeMock,
        cacheEngine: { invalidateCollection: (c) => invalidated.push(c) },
      });

      // 1) Football Event A goes live on the club's reusable channel
      const activeRes = await processWebhook({
        id: 'wh_evt_1',
        type: 'video.live_stream.active',
        data: {
          id: 'ls_club_reusable',
          active_asset_id: 'asset_football_1',
          playback_ids: [{ id: 'pb_club_live', policy: 'public' }],
        },
      });
      expect(activeRes).toMatchObject({ handled: true, matchId: 'event_football_1', sessionId: 'sess_1' });
      expect(sessions.get('sess_1')?.status).toBe('live');
      expect(matchesMap.get('event_football_1')?.mux_stream_status).toBe('active');
      expect(matchesMap.get('event_football_1')?.mux_playback_id).toBe('pb_club_live');

      // 2) Duplicate webhook replay is ignored safely
      const dupRes = await processWebhook({
        id: 'wh_evt_1',
        type: 'video.live_stream.active',
        data: { id: 'ls_club_reusable' },
      });
      expect(dupRes).toEqual({ handled: true, duplicate: true });

      // 3) Broadcast ends -> Event A stream goes idle & clears channel active lock
      await processWebhook({
        id: 'wh_evt_2',
        type: 'video.live_stream.idle',
        data: { id: 'ls_club_reusable' },
      });
      expect(sessions.get('sess_1')?.status).toBe('completed');
      expect(channelRow.active_broadcast_session_id).toBeNull();
      expect(matchesMap.get('event_football_1')?.mux_stream_status).toBe('idle');
      expect(matchesMap.get('event_football_1')?.mux_playback_id).toBeNull();

      // 4) Delayed video.asset.ready arrives and attaches Event A's VOD asset strictly to Event A
      await processWebhook({
        id: 'wh_evt_3',
        type: 'video.asset.ready',
        data: {
          id: 'asset_football_1',
          live_stream_id: 'ls_club_reusable',
          duration: 5400,
          playback_ids: [{ id: 'pb_vod_football_1', policy: 'public' }],
        },
      });
      expect(matchesMap.get('event_football_1')?.mux_asset_playback_id).toBe('pb_vod_football_1');

      // 5) Club reuses the EXACT SAME Mux channel for Boxing Event B later
      sessions.set('sess_2', {
        id: 'sess_2',
        channel_id: 'ch_1',
        club_id: 'club_1',
        match_id: 'event_boxing_2',
        mux_live_stream_id: 'ls_club_reusable',
        mux_playback_policy: 'public',
        status: 'assigned',
        mux_stream_status: 'idle',
        mux_asset_id: null,
        mux_asset_playback_id: null,
        duration_seconds: 0,
      });
      channelRow.active_broadcast_session_id = 'sess_2';
      channelRow.active_match_id = 'event_boxing_2';
      Object.assign(matchesMap.get('event_boxing_2'), { mux_playback_id: 'pb_club_live' });

      await processWebhook({
        id: 'wh_evt_4',
        type: 'video.live_stream.active',
        data: {
          id: 'ls_club_reusable',
          active_asset_id: 'asset_boxing_2',
          playback_ids: [{ id: 'pb_club_live', policy: 'public' }],
        },
      });

      // Verify strict replay isolation: Event A serves ONLY Event A's VOD replay,
      // never Event B's live stream, while Event B plays the live reusable channel!
      const replayOfEventA = resolveMatchStreamResponse(matchesMap.get('event_football_1'));
      const liveOfEventB = resolveMatchStreamResponse(matchesMap.get('event_boxing_2'));
      expect(replayOfEventA.playback_id).toBe('pb_vod_football_1');
      expect(replayOfEventA.mux_playback_id).toBeNull();
      expect(replayOfEventA.mux_asset_playback_id).toBe('pb_vod_football_1');
      expect(replayOfEventA.mux_stream_status).toBe('idle');
      expect(liveOfEventB.playback_id).toBe('pb_club_live');
      expect(liveOfEventB.mux_playback_id).toBe('pb_club_live');
      expect(liveOfEventB.mux_stream_status).toBe('active');
      expect(invalidated).toContain('matches');
    });

    it('resolves platform default watermark fallback, respects opt-out, and normalizes localhost watermark URLs', () => {
      const platformDefault = {
        enabled: true,
        mode: 'mux_burn_in' as const,
        url: 'https://watchwds.com/api/mux/watermarks/brand.png',
        vertical_align: 'top' as const,
        vertical_margin: '4%',
        horizontal_align: 'right' as const,
        horizontal_margin: '4%',
        width: '14%',
        opacity: '85%',
      };

      // 1) Event without explicit watermark inherits platform default
      const inheritedFromNull = resolveEffectiveWatermarkConfig(
        { mux_watermark_config: null },
        platformDefault
      );
      expect(inheritedFromNull?.enabled).toBe(true);
      expect(inheritedFromNull?.url).toBe('https://watchwds.com/api/mux/watermarks/brand.png');

      // 2) Event with empty default placeholder { enabled: false, url: '' } also inherits platform default
      const inheritedFromPlaceholder = resolveEffectiveWatermarkConfig(
        { mux_watermark_config: JSON.stringify({ enabled: false, url: '' }) },
        platformDefault
      );
      expect(inheritedFromPlaceholder?.enabled).toBe(true);

      // 3) Explicit per-event opt-out (disabled: true) overrides default watermark
      const optedOut = resolveEffectiveWatermarkConfig(
        { mux_watermark_config: JSON.stringify({ enabled: false, disabled: true, url: '' }) },
        platformDefault
      );
      expect(optedOut).toBeNull();

      // 4) resolveMatchStreamResponse passes inherited defaultWatermark into stream response
      const streamResp = resolveMatchStreamResponse(
        {
          stream_provider: 'youtube',
          video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          mux_watermark_config: JSON.stringify({ enabled: false, url: '' }),
        },
        { defaultWatermark: platformDefault }
      );
      expect(streamResp.watermark_config?.enabled).toBe(true);
      expect(streamResp.watermark_config?.url).toBe('https://watchwds.com/api/mux/watermarks/brand.png');

      // 5) WatermarkOverlay helper normalizes stale localhost origins to relative API paths in browser
      const origWindow = (globalThis as any).window;
      (globalThis as any).window = origWindow || {};
      try {
        expect(resolveRenderableWatermarkUrl('http://localhost:3000/api/mux/watermarks/wm_1.png')).toBe(
          '/api/mux/watermarks/wm_1.png'
        );
        expect(resolveRenderableWatermarkUrl('https://cdn.watchwds.com/logo.png')).toBe(
          'https://cdn.watchwds.com/logo.png'
        );
        const parsedOptOut = parseWatermarkConfig(JSON.stringify({ enabled: false, disabled: true, url: '' }));
        expect(parsedOptOut.disabled).toBe(true);
      } finally {
        (globalThis as any).window = origWindow;
      }
    });

    it('injects fullscreen-element into mux-player and DOMPurify preserves it for fullscreen watermark display', () => {
      const htmlFromBareId = formatStreamHtml('d54001aBCdE123', {
        containerId: 'watchwds-player-container-test',
      });
      expect(htmlFromBareId).toContain('<mux-player');
      expect(htmlFromBareId).toContain('fullscreen-element="watchwds-player-container-test"');

      const htmlFromExisting = formatStreamHtml('<mux-player playback-id="my_live_stream_pb" controls></mux-player>', {
        containerId: 'watchwds-player-container-existing',
      });
      expect(htmlFromExisting).toContain('fullscreen-element="watchwds-player-container-existing"');
    });

    it('updates Mux live stream watermark overlay and resets inputs cleanly when cleared', async () => {
      process.env.MUX_TOKEN_ID = 'test_token';
      process.env.MUX_TOKEN_SECRET = 'test_secret';

      let lastBody: any = null;
      const fetchMock = vi.fn().mockImplementation((_url: string, init: any) => {
        lastBody = init?.body ? JSON.parse(init.body) : null;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: { id: 'ls_test', status: 'idle' } }),
        });
      });
      globalThis.fetch = fetchMock as any;

      // 1. Set watermark overlay
      await updateMuxLiveStreamWatermark('ls_test', {
        playbackPolicy: 'public',
        overlayConfig: {
          url: 'https://watchwds.com/api/mux/watermarks/logo.png',
          overlay_settings: {
            vertical_align: 'top',
            vertical_margin: '4%',
            horizontal_align: 'right',
            horizontal_margin: '4%',
            width: '14%',
            opacity: '85%',
          },
        },
      });

      expect(lastBody).toEqual({
        new_asset_settings: {
          playback_policies: ['public'],
        },
      });
      expect(lastBody.new_asset_settings.passthrough).toBeUndefined();
      expect(lastBody.new_asset_settings.inputs).toBeUndefined();

      // 2. Clear watermark overlay
      await updateMuxLiveStreamWatermark('ls_test', {
        playbackPolicy: 'signed',
        overlayConfig: null,
      });

      expect(lastBody).toEqual({
        new_asset_settings: {
          playback_policies: ['signed'],
        },
      });
      expect(lastBody.new_asset_settings.passthrough).toBeUndefined();
      expect(lastBody.new_asset_settings.inputs).toBeUndefined();
    });
  });
});

