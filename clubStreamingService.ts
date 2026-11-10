import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  buildMuxIngestEndpoints,
  buildWatermarkOverlayInput,
  completeMuxLiveStream,
  createMuxLiveStream,
  decryptStreamKey,
  disableMuxLiveStream,
  enableMuxLiveStream,
  encryptStreamKey,
  extractMuxPlaybackId,
  getMuxConfig,
  getStreamKeyLast4,
  maskStreamKeyWithLast4,
  normalizeMuxStreamStatus,
  normalizePlaybackPolicy,
  parseMuxWebhookEvent,
  resetMuxLiveStreamKey,
  updateMuxLiveStreamWatermark,
  MuxPlaybackPolicy,
} from './muxService.js';
import {
  getMuxPlatformSettings,
  normalizeWatermarkConfig,
} from './db/persistentConfig.js';
import { verifyFirebaseIdToken } from './db/firebaseAdmin.js';

export interface ClubStreamingRouteDeps {
  app: any;
  db: any;
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  execute: (sql: string, params?: any[]) => Promise<any>;
  cacheEngine: { invalidateCollection: (name: string) => void };
  authenticate: any;
  requireRole: (roles: string[]) => any;
  JWT_SECRET: string;
  getRequestBaseUrl: (req: any) => string;
}

const SENSITIVE_AUDIT_KEY_PATTERN = /(secret|token|key|password|private|credential)/i;
const OPEN_SESSION_STATUSES = ['assigned', 'live', 'disconnected', 'ending'];

export function stripSecretsFromAuditDetails(details: any): Record<string, any> | null {
  if (!details || typeof details !== 'object') return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(details)) {
    if (SENSITIVE_AUDIT_KEY_PATTERN.test(k) && !/^key_last4|last4|key_id$/i.test(k)) {
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = stripSecretsFromAuditDetails(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Resolves the authorized club scope for partner vs admin actors.
 * Prevents partner users from spoofing another club via query/body `clubId`.
 */
export function resolveAuthorizedClubId(user: any, requestedClubId?: string | null): string | null {
  if (!user) return null;
  const role = String(user.role || '').toLowerCase();
  if (role === 'partner') {
    const cid = user.club_id ?? user.clubId;
    return cid ? String(cid).trim() : null;
  }
  if (role === 'admin') {
    const reqCid = requestedClubId ? String(requestedClubId).trim() : '';
    const userCid = user.club_id ?? user.clubId;
    return reqCid || (userCid ? String(userCid).trim() : null);
  }
  return null;
}

/**
 * Issues and verifies short-lived step-up re-authentication JWTs for sensitive key reveals & rotations.
 */
export function issueStepUpReauthToken(
  params: { userId: string; role: string; clubId?: string | null },
  jwtSecret: string,
  ttlSeconds: number = 300
): { token: string; expiresAt: string } {
  const token = jwt.sign(
    {
      purpose: 'mux_credential_reveal',
      userId: String(params.userId),
      role: String(params.role),
      clubId: params.clubId ? String(params.clubId) : null,
      jti: crypto.randomBytes(8).toString('hex'),
    },
    jwtSecret,
    { expiresIn: ttlSeconds }
  );
  return {
    token,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

export function verifyStepUpReauthToken(
  token: string | string[] | undefined,
  user: any,
  jwtSecret: string,
  expectedClubId?: string | null
): { valid: boolean; error?: string } {
  if (!token || Array.isArray(token)) {
    return { valid: false, error: 'Recent password re-authentication is required.' };
  }
  try {
    const decoded = jwt.verify(String(token).trim(), jwtSecret) as any;
    if (!decoded || decoded.purpose !== 'mux_credential_reveal') {
      return { valid: false, error: 'Invalid re-authentication token purpose.' };
    }
    if (!user || String(decoded.userId) !== String(user.id)) {
      return { valid: false, error: 'Re-authentication token does not match current account.' };
    }
    if (
      String(user.role || '').toLowerCase() === 'partner' &&
      expectedClubId &&
      decoded.clubId &&
      String(decoded.clubId) !== String(expectedClubId)
    ) {
      return { valid: false, error: 'Re-authentication token club scope mismatch.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Re-authentication session expired. Please verify your password again.' };
  }
}

export function sanitizeChannelForClient(channel: any) {
  if (!channel) return null;
  const last4 = channel.stream_key_last4 || channel.streamKeyLast4 || null;
  const rtmpUrl = channel.rtmp_ingest_url || channel.rtmpIngestUrl || undefined;
  return {
    id: String(channel.id),
    clubId: String(channel.club_id || channel.clubId),
    muxLiveStreamId: channel.mux_live_stream_id || channel.muxLiveStreamId || null,
    muxPlaybackId: channel.mux_playback_id || channel.muxPlaybackId || null,
    muxPlaybackPolicy: normalizePlaybackPolicy(channel.mux_playback_policy || channel.muxPlaybackPolicy),
    channelStatus: String(channel.channel_status || channel.channelStatus || 'idle'),
    isApproved: Boolean(Number(channel.is_approved ?? channel.isApproved ?? 1)),
    isSuspended: Boolean(Number(channel.is_suspended ?? channel.isSuspended ?? 0)),
    isTestMode: Boolean(Number(channel.is_test_mode ?? channel.isTestMode ?? 0)),
    activeBroadcastSessionId: channel.active_broadcast_session_id || channel.activeBroadcastSessionId || null,
    activeMatchId: channel.active_match_id || channel.activeMatchId || null,
    maxSessionMinutes: Number(channel.max_session_minutes ?? channel.maxSessionMinutes ?? 240),
    keyRotatedAt: channel.key_rotated_at || channel.keyRotatedAt || null,
    lastConnectedAt: channel.last_connected_at || channel.lastConnectedAt || null,
    hasStreamKey: Boolean(channel.stream_key_encrypted || channel.streamKeyEncrypted || channel.mux_live_stream_id),
    streamKeyLast4: last4,
    maskedStreamKey: maskStreamKeyWithLast4(last4),
    ingest: buildMuxIngestEndpoints(rtmpUrl, null),
    createdAt: channel.created_at || channel.createdAt || null,
    updatedAt: channel.updated_at || channel.updatedAt || null,
  };
}

/**
 * Pure conflict/authorization guard for assigning a multi-sport Event to a club's reusable channel.
 */
export function validateEventChannelAssignment(params: {
  channel: any;
  event: any;
  club: any;
  openSessions?: any[];
  featureEnabled?: boolean;
}): { ok: true; alreadyAssignedSession?: any } | { ok: false; status: number; error: string } {
  const { channel, event, club, openSessions = [], featureEnabled = true } = params;

  if (!featureEnabled) {
    return { ok: false, status: 403, error: 'Partner Live Streaming is currently disabled by platform administrators.' };
  }
  if (!club || !Boolean(Number(club.is_active ?? club.isActive ?? 1))) {
    return { ok: false, status: 403, error: 'Partner club account is inactive.' };
  }
  const clubApproved = Boolean(Number(club.mux_streaming_approved ?? club.muxStreamingApproved ?? 0));
  if (!clubApproved) {
    return { ok: false, status: 403, error: 'Club streaming access has not been approved by an administrator.' };
  }
  if (!channel || !channel.mux_live_stream_id) {
    return { ok: false, status: 400, error: 'No reusable streaming channel is provisioned for this club yet.' };
  }
  if (!Boolean(Number(channel.is_approved ?? 1)) || Boolean(Number(channel.is_suspended ?? 0))) {
    return { ok: false, status: 403, error: 'This club streaming channel is currently suspended or disabled.' };
  }
  if (!event) {
    return { ok: false, status: 404, error: 'Event not found.' };
  }
  const eventRevoked = (event.revoke_status && event.revoke_status !== 'normal') || event.publish_status === 'deleted';
  if (eventRevoked) {
    return { ok: false, status: 400, error: 'Cannot assign a revoked or deleted Event to a live channel.' };
  }

  const eventClubId = event.club_id ?? event.clubId ?? null;
  if (!eventClubId || String(eventClubId) !== String(club.id)) {
    return { ok: false, status: 403, error: 'Forbidden: This Event does not belong to your club.' };
  }

  const conflicting = openSessions.find(
    (s) => OPEN_SESSION_STATUSES.includes(String(s.status || '').toLowerCase()) && String(s.match_id) !== String(event.id)
  );
  if (conflicting) {
    return {
      ok: false,
      status: 409,
      error: `Channel is already assigned to Event #${conflicting.match_id}. Complete or release the current broadcast session first.`,
    };
  }

  const sameEventOpen = openSessions.find(
    (s) => OPEN_SESSION_STATUSES.includes(String(s.status || '').toLowerCase()) && String(s.match_id) === String(event.id)
  );
  if (sameEventOpen) {
    return { ok: true, alreadyAssignedSession: sameEventOpen };
  }

  return { ok: true };
}

/**
 * Pure check protecting live broadcasts from accidental stream key rotation.
 */
export function validateStreamKeyRotation(params: {
  channel: any;
  openSessions?: any[];
  force?: boolean;
}): { allowed: boolean; error?: string } {
  const { channel, openSessions = [], force = false } = params;
  if (!channel || !channel.mux_live_stream_id) {
    return { allowed: false, error: 'No Mux streaming channel exists to rotate keys for.' };
  }
  if (Boolean(Number(channel.is_suspended ?? 0))) {
    return { allowed: false, error: 'Cannot rotate stream key while channel is suspended.' };
  }
  const chStatus = String(channel.channel_status || '').toLowerCase();
  const hasLiveSession = openSessions.some((s) =>
    ['live', 'connected', 'recording'].includes(String(s.status || s.mux_stream_status || '').toLowerCase())
  );
  if (!force && (chStatus === 'active' || chStatus === 'connected' || chStatus === 'recording' || hasLiveSession)) {
    return {
      allowed: false,
      error: 'Cannot reset the stream key while a broadcast is actively live. End the active broadcast first.',
    };
  }
  return { allowed: true };
}

export function registerClubStreamingRoutes(deps: ClubStreamingRouteDeps) {
  const { app, db, query, execute, cacheEngine, authenticate, requireRole, JWT_SECRET, getRequestBaseUrl } = deps;

  const isGlobalStreamingEnabled = async (): Promise<boolean> => {
    try {
      const rows = await query<any>(
        "SELECT `enabled`, `key_name` FROM `features` WHERE `key_name` = 'partner_mux_streaming' OR `id` = '5' LIMIT 1"
      );
      if (rows && rows.length > 0) {
        return Boolean(Number(rows[0].enabled));
      }
    } catch (_) {}
    return true;
  };

  const recordAudit = async (params: {
    channelId?: string | null;
    clubId: string;
    actorUser: any;
    action: string;
    details?: Record<string, any> | null;
  }) => {
    try {
      const id = 'maud_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
      const safeDetails = stripSecretsFromAuditDetails(params.details);
      await execute(
        "INSERT INTO `mux_channel_audit_logs` (`id`, `channel_id`, `club_id`, `actor_user_id`, `actor_role`, `action`, `details`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          params.channelId || null,
          String(params.clubId),
          params.actorUser?.id ? String(params.actorUser.id) : null,
          params.actorUser?.role ? String(params.actorUser.role) : null,
          params.action,
          safeDetails ? JSON.stringify(safeDetails) : null,
        ]
      );
    } catch (err: any) {
      console.warn('[Mux Audit Warning]:', err?.message);
    }
  };

  const getClubChannelRow = async (clubId: string) => {
    const rows = await query<any>(
      "SELECT * FROM `club_streaming_channels` WHERE `club_id` = ? LIMIT 1",
      [String(clubId)]
    );
    return rows && rows[0] ? rows[0] : null;
  };

  const getOpenChannelSessions = async (channelId: string) => {
    const rows = await query<any>(
      "SELECT * FROM `broadcast_sessions` WHERE `channel_id` = ? AND `status` IN ('assigned', 'live', 'disconnected', 'ending') ORDER BY `assigned_at` DESC",
      [String(channelId)]
    );
    return rows || [];
  };

  const provisionReusableChannelForClub = async (params: {
    club: any;
    actorUser: any;
    req: any;
    testMode?: boolean;
    playbackPolicy?: MuxPlaybackPolicy;
  }) => {
    const { club, actorUser, req } = params;
    const clubId = String(club.id);

    // 1. Idempotency check before touching Mux API (never create duplicate Mux resources on double-click)
    const existing = await getClubChannelRow(clubId);
    if (existing) {
      return { channel: existing, created: false };
    }

    await getMuxPlatformSettings().catch(() => null);
    const cfg = getMuxConfig();
    if (!cfg.isConfigured) {
      const err: any = new Error('Central WatchWDS Mux API credentials are not configured on the server.');
      err.status = 400;
      throw err;
    }

    let policy = normalizePlaybackPolicy(params.playbackPolicy || cfg.defaultPlaybackPolicy);
    if (policy === 'signed' && !cfg.isSigningConfigured) {
      policy = 'public';
    }

    const useTestMode = params.testMode !== undefined ? Boolean(params.testMode) : Boolean(cfg.defaultTestMode);
    let overlayConfig: { url: string; overlay_settings: any } | null = null;
    if (cfg.defaultWatermark?.enabled && cfg.defaultWatermark.mode === 'mux_burn_in' && cfg.defaultWatermark.url) {
      const base = (process.env.APP_URL || getRequestBaseUrl(req) || '').replace(/\/+$/, '');
      const pubUrl = cfg.defaultWatermark.url.startsWith('/') && base ? `${base}${cfg.defaultWatermark.url}` : cfg.defaultWatermark.url;
      if (!pubUrl.includes('localhost') && !pubUrl.includes('127.0.0.1')) {
        overlayConfig = buildWatermarkOverlayInput(cfg.defaultWatermark, pubUrl);
      }
    }

    const muxCreated = await createMuxLiveStream({
      clubId,
      playbackPolicy: policy,
      overlayConfig,
      testMode: useTestMode,
    });

    const channelId = 'ch_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    const encryptedKey = encryptStreamKey(muxCreated.streamKey);
    const last4 = getStreamKeyLast4(muxCreated.streamKey);

    try {
      await execute(
        `INSERT INTO \`club_streaming_channels\`
         (\`id\`, \`club_id\`, \`mux_live_stream_id\`, \`mux_playback_id\`, \`mux_playback_policy\`,
          \`stream_key_encrypted\`, \`stream_key_last4\`, \`rtmp_ingest_url\`, \`channel_status\`,
          \`is_approved\`, \`is_suspended\`, \`is_test_mode\`, \`max_session_minutes\`, \`created_by\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)`,
        [
          channelId,
          clubId,
          muxCreated.liveStreamId,
          muxCreated.playbackId,
          muxCreated.playbackPolicy,
          encryptedKey,
          last4,
          cfg.rtmpIngestUrl,
          muxCreated.status,
          useTestMode ? 1 : 0,
          cfg.defaultMaxSessionMinutes || 240,
          actorUser?.id ? String(actorUser.id) : null,
        ]
      );
    } catch (insertErr: any) {
      // Handle race condition where two parallel POST requests hit UNIQUE(club_id)
      const raceExisting = await getClubChannelRow(clubId);
      if (raceExisting) {
        return { channel: raceExisting, created: false };
      }
      throw insertErr;
    }

    const inserted = await getClubChannelRow(clubId);
    await recordAudit({
      channelId,
      clubId,
      actorUser,
      action: 'channel_created',
      details: {
        muxLiveStreamId: muxCreated.liveStreamId,
        playbackPolicy: muxCreated.playbackPolicy,
        testMode: useTestMode,
        last4,
      },
    });

    return { channel: inserted, created: true };
  };

  // =========================================================================
  // 1. GLOBAL FEATURE TOGGLE PERSISTENCE
  // =========================================================================
  app.put('/api/admin/features/:slug', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const slug = String(req.params.slug || '').trim();
      const enabled = req.body?.enabled ? 1 : 0;
      const existingRows = await query<any>(
        'SELECT * FROM `features` WHERE `key_name` = ? LIMIT 1',
        [slug]
      );
      if (existingRows && existingRows.length > 0) {
        await execute('UPDATE `features` SET `enabled` = ? WHERE `key_name` = ?', [enabled, slug]);
      } else {
        await execute(
          'INSERT INTO `features` (`id`, `key_name`, `label`, `enabled`) VALUES (?, ?, ?, ?)',
          ['feat_' + Date.now().toString(36), slug, slug.replace(/_/g, ' '), enabled]
        );
      }
      cacheEngine.invalidateCollection('features');
      res.json({ success: true, slug, enabled: Boolean(enabled) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // 2. PARTNER / ADMIN RECENT RE-AUTHENTICATION (Step-Up Verification)
  // =========================================================================
  app.post('/api/partner/streaming/reauth', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { password, firebaseIdToken, clubId: requestedClubId } = req.body || {};
      const userDoc = await db.collection('users').doc(String(req.user.id)).get();
      if (!userDoc.exists) {
        return res.status(401).json({ error: 'User account not found.' });
      }
      const userRow = userDoc.data();
      if (userRow.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active.' });
      }

      let verified = false;
      if (userRow.password === 'google-auth-no-password') {
        if (firebaseIdToken) {
          try {
            const decodedFb = await verifyFirebaseIdToken(String(firebaseIdToken));
            if (decodedFb?.email && decodedFb.email.toLowerCase() === String(userRow.email || '').toLowerCase()) {
              verified = true;
            }
          } catch (_) {}
        }
      } else if (typeof password === 'string' && password.length > 0) {
        verified = bcrypt.compareSync(password, String(userRow.password || ''));
      }

      if (!verified) {
        return res.status(401).json({ error: 'Incorrect password. Re-authentication failed.' });
      }

      const clubId = resolveAuthorizedClubId(req.user, requestedClubId);
      const issued = issueStepUpReauthToken(
        { userId: String(req.user.id), role: String(req.user.role), clubId },
        JWT_SECRET,
        300
      );

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.json({
        success: true,
        reauthToken: issued.token,
        expiresAt: issued.expiresAt,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // 3. PARTNER CLUB SELF-SERVICE LIVE STREAMING ROUTES
  // =========================================================================
  app.get('/api/partner/streaming', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden: Partner or Admin access required' });
      }
      const clubId = resolveAuthorizedClubId(req.user, req.query.clubId as string);
      if (!clubId) {
        return res.status(400).json({ error: 'No partner club associated with this account' });
      }

      const clubDoc = await db.collection('clubs').doc(String(clubId)).get();
      if (!clubDoc.exists) {
        return res.status(404).json({ error: 'Club not found' });
      }
      const club = { id: clubDoc.id, ...clubDoc.data() };
      const globalEnabled = await isGlobalStreamingEnabled();
      await getMuxPlatformSettings().catch(() => null);
      const muxCfg = getMuxConfig();

      const channelRow = await getClubChannelRow(clubId);
      const openSessions = channelRow ? await getOpenChannelSessions(channelRow.id) : [];

      const sessions = await query<any>(
        `SELECT bs.*, m.title AS event_title, m.slug AS event_slug, m.sport AS event_sport,
                m.status AS event_status, m.date AS event_date
         FROM \`broadcast_sessions\` bs
         LEFT JOIN \`matches\` m ON m.id = bs.match_id
         WHERE bs.club_id = ?
         ORDER BY bs.assigned_at DESC
         LIMIT 25`,
        [clubId]
      ).catch(() => []);

      const clubMatchesSnap = await db.collection('matches').where('club_id', '==', String(clubId)).get();
      const eligibleEvents = (clubMatchesSnap.docs || [])
        .map((d: any) => {
          const m = d.data();
          return {
            id: String(d.id),
            title: m.title || [m.home_team, m.away_team].filter(Boolean).join(' vs ') || [m.player_pair_1, m.player_pair_2].filter(Boolean).join(' vs ') || `Event #${d.id}`,
            slug: m.slug || '',
            sport: m.sport || 'football',
            competitionId: m.competition_id || m.competitionId || null,
            date: m.date || m.start_time || null,
            status: m.status || 'upcoming',
            publishStatus: m.publish_status || m.publishStatus || 'published',
            revokeStatus: m.revoke_status || m.revokeStatus || 'normal',
            accessType: m.access_type || m.access || 'free',
            muxAssetPlaybackId: m.mux_asset_playback_id || null,
            muxStreamStatus: m.mux_stream_status || null,
            homeTeam: m.home_team || null,
            awayTeam: m.away_team || null,
            playerPair1: m.player_pair_1 || null,
            playerPair2: m.player_pair_2 || null,
          };
        })
        .filter((e: any) => e.revokeStatus === 'normal' && e.publishStatus !== 'deleted')
        .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      const clubApproved = Boolean(Number(club.mux_streaming_approved ?? club.muxStreamingApproved ?? 0));

      res.setHeader('Cache-Control', 'no-store, private');
      return res.json({
        globalStreamingEnabled: globalEnabled,
        muxServerConfigured: muxCfg.isConfigured,
        allowPartnerSelfProvision: muxCfg.allowPartnerSelfProvision,
        club: {
          id: club.id,
          name: club.name,
          isActive: Boolean(Number(club.is_active ?? 1)),
          muxStreamingApproved: clubApproved,
        },
        channel: sanitizeChannelForClient(channelRow),
        activeSession: openSessions[0] || null,
        sessions,
        eligibleEvents,
        ingest: buildMuxIngestEndpoints(channelRow?.rtmp_ingest_url, null),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/partner/streaming/channel', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const clubId = resolveAuthorizedClubId(req.user, req.body?.clubId);
      if (!clubId) {
        return res.status(400).json({ error: 'No partner club associated with this account' });
      }

      const globalEnabled = await isGlobalStreamingEnabled();
      if (!globalEnabled) {
        return res.status(403).json({ error: 'Partner live streaming is currently disabled by administrators.' });
      }

      const clubDoc = await db.collection('clubs').doc(String(clubId)).get();
      if (!clubDoc.exists) {
        return res.status(404).json({ error: 'Club not found' });
      }
      const club = { id: clubDoc.id, ...clubDoc.data() };
      if (!Boolean(Number(club.is_active ?? 1))) {
        return res.status(403).json({ error: 'Club is currently inactive.' });
      }

      const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
      const approved = Boolean(Number(club.mux_streaming_approved ?? club.muxStreamingApproved ?? 0));
      if (!isAdmin && !approved) {
        return res.status(403).json({ error: 'Live streaming has not been approved for your club yet.' });
      }

      await getMuxPlatformSettings().catch(() => null);
      const cfg = getMuxConfig();
      if (!isAdmin && !cfg.allowPartnerSelfProvision) {
        return res.status(403).json({ error: 'Self-service channel provisioning is disabled. Please ask an administrator to provision your channel.' });
      }

      const result = await provisionReusableChannelForClub({
        club,
        actorUser: req.user,
        req,
        testMode: isAdmin && req.body?.testMode !== undefined ? Boolean(req.body.testMode) : undefined,
      });

      res.setHeader('Cache-Control', 'no-store, private');
      return res.status(result.created ? 201 : 200).json({
        success: true,
        created: result.created,
        channel: sanitizeChannelForClient(result.channel),
      });
    } catch (e: any) {
      return res.status(e?.status || 502).json({ error: e?.message || 'Failed to provision streaming channel.' });
    }
  });

  app.post('/api/partner/streaming/credentials/reveal', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const clubId = resolveAuthorizedClubId(req.user, req.body?.clubId);
      if (!clubId) return res.status(400).json({ error: 'No partner club associated' });

      const reauth = verifyStepUpReauthToken(
        req.headers['x-reauth-token'] || req.body?.reauthToken,
        req.user,
        JWT_SECRET,
        clubId
      );
      if (!reauth.valid) {
        return res.status(401).json({ error: reauth.error, reauthRequired: true });
      }

      if (!(await isGlobalStreamingEnabled())) {
        return res.status(403).json({ error: 'Partner live streaming is currently disabled by administrators.' });
      }

      const clubDoc = await db.collection('clubs').doc(String(clubId)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: 'Club not found' });
      const club = clubDoc.data();
      if (!Boolean(Number(club.is_active ?? 1)) || !Boolean(Number(club.mux_streaming_approved ?? 0))) {
        return res.status(403).json({ error: 'Club streaming permission is disabled or revoked.' });
      }

      const channel = await getClubChannelRow(clubId);
      if (!channel) {
        return res.status(404).json({ error: 'No streaming channel provisioned for this club.' });
      }
      if (!Boolean(Number(channel.is_approved ?? 1)) || Boolean(Number(channel.is_suspended ?? 0))) {
        return res.status(403).json({ error: 'Your club streaming channel is currently suspended.' });
      }

      const plainKey = decryptStreamKey(channel.stream_key_encrypted || '');
      if (!plainKey) {
        return res.status(404).json({ error: 'Stream key is not available.' });
      }

      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'key_revealed',
        details: { last4: channel.stream_key_last4 || getStreamKeyLast4(plainKey) },
      });

      const ingest = buildMuxIngestEndpoints(channel.rtmp_ingest_url, plainKey);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      return res.json({
        success: true,
        streamKey: plainKey,
        rtmpUrl: ingest.rtmpsUrl,
        rtmpStandardUrl: ingest.rtmpStandardUrl,
        srtFullUrl: ingest.srtFullUrl,
        autoHideSeconds: 60,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/partner/streaming/reset-key', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const clubId = resolveAuthorizedClubId(req.user, req.body?.clubId);
      if (!clubId) return res.status(400).json({ error: 'No partner club associated' });

      if (!req.body?.confirm) {
        return res.status(400).json({ error: 'Confirmation is required to reset the stream key.' });
      }

      const reauth = verifyStepUpReauthToken(
        req.headers['x-reauth-token'] || req.body?.reauthToken,
        req.user,
        JWT_SECRET,
        clubId
      );
      if (!reauth.valid) {
        return res.status(401).json({ error: reauth.error, reauthRequired: true });
      }

      const clubDoc = await db.collection('clubs').doc(String(clubId)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: 'Club not found' });
      const club = clubDoc.data();
      if (!Boolean(Number(club.is_active ?? 1)) || !Boolean(Number(club.mux_streaming_approved ?? 0))) {
        return res.status(403).json({ error: 'Club streaming permission is disabled.' });
      }

      const channel = await getClubChannelRow(clubId);
      if (!channel) return res.status(404).json({ error: 'No streaming channel exists.' });
      const openSessions = await getOpenChannelSessions(channel.id);

      const rotCheck = validateStreamKeyRotation({ channel, openSessions, force: false });
      if (!rotCheck.allowed) {
        return res.status(409).json({ error: rotCheck.error });
      }

      await getMuxPlatformSettings().catch(() => null);
      const rotated = await resetMuxLiveStreamKey(String(channel.mux_live_stream_id));
      const newEncrypted = encryptStreamKey(rotated.streamKey);
      const newLast4 = getStreamKeyLast4(rotated.streamKey);

      await execute(
        'UPDATE `club_streaming_channels` SET `stream_key_encrypted` = ?, `stream_key_last4` = ?, `key_rotated_at` = NOW() WHERE `id` = ?',
        [newEncrypted, newLast4, channel.id]
      );

      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'key_rotated',
        details: { previousLast4: channel.stream_key_last4 || null, newLast4 },
      });

      const updatedRow = await getClubChannelRow(clubId);
      res.setHeader('Cache-Control', 'no-store, private');
      return res.json({
        success: true,
        message: 'Stream key rotated cleanly. Old credentials are now invalid.',
        channel: sanitizeChannelForClient(updatedRow),
      });
    } catch (e: any) {
      return res.status(502).json({ error: e?.message || 'Failed to rotate stream key.' });
    }
  });

  app.post('/api/partner/streaming/assign-event', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const clubId = resolveAuthorizedClubId(req.user, req.body?.clubId);
      if (!clubId) return res.status(400).json({ error: 'No partner club associated' });

      const matchId = String(req.body?.matchId || req.body?.eventId || '').trim();
      if (!matchId) return res.status(400).json({ error: 'Event ID is required.' });

      const globalEnabled = await isGlobalStreamingEnabled();
      const clubDoc = await db.collection('clubs').doc(String(clubId)).get();
      const club = clubDoc.exists ? { id: clubDoc.id, ...clubDoc.data() } : null;
      const channel = await getClubChannelRow(clubId);
      const matchDoc = await db.collection('matches').doc(matchId).get();
      const event = matchDoc.exists ? { id: matchDoc.id, ...matchDoc.data() } : null;
      const openSessions = channel ? await getOpenChannelSessions(channel.id) : [];

      const check = validateEventChannelAssignment({
        channel,
        event,
        club,
        openSessions,
        featureEnabled: globalEnabled,
      });

      if (!check.ok || 'status' in check) {
        const failed = check as { ok: false; status: number; error: string };
        return res.status(failed.status).json({ error: failed.error });
      }

      if (check.alreadyAssignedSession) {
        return res.json({
          success: true,
          idempotent: true,
          session: check.alreadyAssignedSession,
          channel: sanitizeChannelForClient(channel),
        });
      }

      await getMuxPlatformSettings().catch(() => null);
      const muxCfg = getMuxConfig();
      const isPaid = event.access === 'paid' || event.access_type === 'ppv' || event.access_type === 'plan';
      let effectivePolicy = normalizePlaybackPolicy(
        event.mux_playback_policy || (muxCfg.requireSignedForPaidEvents && isPaid ? 'signed' : channel.mux_playback_policy)
      );
      if (effectivePolicy === 'signed' && !muxCfg.isSigningConfigured) {
        effectivePolicy = 'public';
      }

      // If Event watermark is burn-in, apply new_asset_settings safely before stream starts
      if (event.mux_watermark_config && muxCfg.isConfigured) {
        const wm = normalizeWatermarkConfig(event.mux_watermark_config);
        if (wm.enabled && wm.mode === 'mux_burn_in' && wm.url) {
          const base = (process.env.APP_URL || getRequestBaseUrl(req) || '').replace(/\/+$/, '');
          const pubUrl = wm.url.startsWith('/') && base ? `${base}${wm.url}` : wm.url;
          const overlay = buildWatermarkOverlayInput(wm, pubUrl);
          if (overlay && !pubUrl.includes('localhost')) {
            await updateMuxLiveStreamWatermark(String(channel.mux_live_stream_id), {
              playbackPolicy: effectivePolicy,
              overlayConfig: overlay,
            }).catch(() => {});
          }
        }
      }

      const sessionId = 'bs_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
      const sport = String(event.sport || 'football').trim();
      const compId = event.competition_id || event.competitionId || null;

      await execute(
        `INSERT INTO \`broadcast_sessions\`
         (\`id\`, \`channel_id\`, \`club_id\`, \`match_id\`, \`sport\`, \`competition_id\`,
          \`mux_live_stream_id\`, \`mux_playback_policy\`, \`status\`, \`mux_stream_status\`, \`assigned_by\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'assigned', ?, ?)`,
        [
          sessionId,
          channel.id,
          clubId,
          matchId,
          sport,
          compId,
          channel.mux_live_stream_id,
          effectivePolicy,
          channel.channel_status || 'idle',
          req.user?.id ? String(req.user.id) : null,
        ]
      );

      await execute(
        'UPDATE `club_streaming_channels` SET `active_broadcast_session_id` = ?, `active_match_id` = ? WHERE `id` = ?',
        [sessionId, matchId, channel.id]
      );

      // Link live channel playback ID strictly during this assigned broadcast session (without any secret key)
      await db.collection('matches').doc(matchId).update({
        stream_provider: 'mux',
        mux_live_stream_id: channel.mux_live_stream_id,
        mux_playback_id: channel.mux_playback_id,
        mux_playback_policy: effectivePolicy,
        mux_stream_status: channel.channel_status || 'idle',
        mux_error_message: null,
      });
      cacheEngine.invalidateCollection('matches');

      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'event_assigned',
        details: { sessionId, matchId, sport, competitionId: compId },
      });

      const [sessionRow] = await query<any>('SELECT * FROM `broadcast_sessions` WHERE `id` = ? LIMIT 1', [sessionId]);
      const updatedChannel = await getClubChannelRow(clubId);
      return res.status(201).json({
        success: true,
        session: sessionRow,
        channel: sanitizeChannelForClient(updatedChannel),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/partner/streaming/sessions/:sessionId/complete', authenticate, async (req: any, res: any) => {
    try {
      if (!['partner', 'admin'].includes(String(req.user?.role || '').toLowerCase())) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const clubId = resolveAuthorizedClubId(req.user, req.body?.clubId);
      if (!clubId) return res.status(400).json({ error: 'No partner club associated' });

      const sessionId = String(req.params.sessionId || '').trim();
      const rows = await query<any>(
        'SELECT * FROM `broadcast_sessions` WHERE `id` = ? AND `club_id` = ? LIMIT 1',
        [sessionId, clubId]
      );
      if (!rows || !rows[0]) {
        return res.status(404).json({ error: 'Broadcast session not found for this club.' });
      }
      const session = rows[0];
      const wasLive = ['live', 'connected', 'recording', 'disconnected'].includes(String(session.status || '').toLowerCase());
      const finalStatus = wasLive ? 'completed' : 'cancelled';

      await getMuxPlatformSettings().catch(() => null);
      if (wasLive && getMuxConfig().isConfigured && req.body?.signalMuxComplete !== false) {
        await completeMuxLiveStream(String(session.mux_live_stream_id)).catch(() => {});
      }

      const startTimeMs = session.started_at ? new Date(session.started_at).getTime() : null;
      const durationSec = startTimeMs ? Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000)) : 0;

      await execute(
        'UPDATE `broadcast_sessions` SET `status` = ?, `mux_stream_status` = ?, `ended_at` = NOW(), `duration_seconds` = GREATEST(`duration_seconds`, ?) WHERE `id` = ?',
        [finalStatus, 'idle', durationSec, sessionId]
      );

      await execute(
        'UPDATE `club_streaming_channels` SET `active_broadcast_session_id` = NULL, `active_match_id` = NULL, `channel_status` = CASE WHEN `channel_status` = \'disabled\' THEN \'disabled\' ELSE \'idle\' END WHERE `id` = ? AND `active_broadcast_session_id` = ?',
        [session.channel_id, sessionId]
      );

      // Cleanly detach ephemeral live channel playback ID from ended Event so future club broadcasts never play through past Events!
      const matchDoc = await db.collection('matches').doc(String(session.match_id)).get();
      if (matchDoc.exists) {
        const m = matchDoc.data();
        const updates: Record<string, any> = {
          mux_stream_status: 'idle',
          mux_playback_id: null,
        };
        if (wasLive && String(m?.status || '').toLowerCase() === 'live') {
          updates.status = 'full_match';
        }
        await db.collection('matches').doc(String(session.match_id)).update(updates);
        cacheEngine.invalidateCollection('matches');
      }

      await recordAudit({
        channelId: session.channel_id,
        clubId,
        actorUser: req.user,
        action: wasLive ? 'session_completed' : 'event_unassigned',
        details: { sessionId, matchId: session.match_id, finalStatus },
      });

      return res.json({ success: true, status: finalStatus, sessionId });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // 4. ADMINISTRATOR CLUB CHANNEL & COST-PROTECTION GOVERNANCE APIs
  // =========================================================================
  app.get('/api/admin/mux/channels', authenticate, requireRole(['admin', 'operator']), async (_req: any, res: any) => {
    try {
      const clubsSnap = await db.collection('clubs').get();
      const clubsMap = new Map<string, any>();
      for (const d of clubsSnap.docs || []) {
        clubsMap.set(String(d.id), { id: String(d.id), ...d.data() });
      }

      const channels = await query<any>('SELECT * FROM `club_streaming_channels` ORDER BY `updated_at` DESC').catch(() => []);
      const channelByClub = new Map<string, any>();
      for (const ch of channels || []) {
        channelByClub.set(String(ch.club_id), ch);
      }

      const recentSessions = await query<any>(
        `SELECT bs.*, m.title AS event_title, m.slug AS event_slug, m.sport AS event_sport
         FROM \`broadcast_sessions\` bs
         LEFT JOIN \`matches\` m ON m.id = bs.match_id
         ORDER BY bs.assigned_at DESC
         LIMIT 50`
      ).catch(() => []);

      const auditLogs = await query<any>(
        'SELECT * FROM `mux_channel_audit_logs` ORDER BY `created_at` DESC LIMIT 50'
      ).catch(() => []);

      const usageRows = await query<any>(
        `SELECT \`club_id\`,
                COUNT(*) AS total_sessions,
                SUM(CASE WHEN \`status\` = 'live' THEN 1 ELSE 0 END) AS active_live_count,
                COALESCE(SUM(\`duration_seconds\`), 0) AS total_streamed_seconds
         FROM \`broadcast_sessions\`
         GROUP BY \`club_id\``
      ).catch(() => []);
      const usageByClub = new Map<string, any>();
      for (const r of usageRows || []) {
        usageByClub.set(String(r.club_id), r);
      }

      const items = Array.from(clubsMap.values()).map((c) => {
        const ch = channelByClub.get(String(c.id)) || null;
        const usage = usageByClub.get(String(c.id)) || null;
        return {
          clubId: c.id,
          clubName: c.name,
          isActive: Boolean(Number(c.is_active ?? 1)),
          muxStreamingApproved: Boolean(Number(c.mux_streaming_approved ?? 0)),
          channel: sanitizeChannelForClient(ch),
          usage: {
            totalSessions: Number(usage?.total_sessions || 0),
            activeLiveCount: Number(usage?.active_live_count || 0),
            totalStreamedMinutes: Math.round(Number(usage?.total_streamed_seconds || 0) / 60),
          },
        };
      });

      res.setHeader('Cache-Control', 'no-store, private');
      return res.json({
        globalStreamingEnabled: await isGlobalStreamingEnabled(),
        clubs: items,
        recentSessions,
        auditLogs,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/clubs/:id/mux/approval', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const clubId = String(req.params.id);
      const approved = req.body?.approved ? 1 : 0;
      const clubDoc = await db.collection('clubs').doc(clubId).get();
      if (!clubDoc.exists) return res.status(404).json({ error: 'Club not found' });

      await db.collection('clubs').doc(clubId).update({ mux_streaming_approved: approved });
      await execute('UPDATE `club_streaming_channels` SET `is_approved` = ? WHERE `club_id` = ?', [approved, clubId]).catch(() => {});
      cacheEngine.invalidateCollection('clubs');

      const channel = await getClubChannelRow(clubId);
      await recordAudit({
        channelId: channel?.id || null,
        clubId,
        actorUser: req.user,
        action: approved ? 'approval_granted' : 'approval_revoked',
      });

      return res.json({ success: true, clubId, approved: Boolean(approved) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/clubs/:id/mux/channel', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const clubId = String(req.params.id);
      const clubDoc = await db.collection('clubs').doc(clubId).get();
      if (!clubDoc.exists) return res.status(404).json({ error: 'Club not found' });

      await db.collection('clubs').doc(clubId).update({ mux_streaming_approved: 1 });
      cacheEngine.invalidateCollection('clubs');

      const result = await provisionReusableChannelForClub({
        club: { id: clubDoc.id, ...clubDoc.data(), mux_streaming_approved: 1 },
        actorUser: req.user,
        req,
        testMode: req.body?.testMode !== undefined ? Boolean(req.body.testMode) : undefined,
        playbackPolicy: req.body?.playbackPolicy,
      });

      res.setHeader('Cache-Control', 'no-store, private');
      return res.status(result.created ? 201 : 200).json({
        success: true,
        created: result.created,
        channel: sanitizeChannelForClient(result.channel),
      });
    } catch (e: any) {
      return res.status(e?.status || 502).json({ error: e?.message || 'Failed to provision club channel.' });
    }
  });

  app.post('/api/admin/clubs/:id/mux/suspend', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const clubId = String(req.params.id);
      const channel = await getClubChannelRow(clubId);
      if (!channel) {
        await db.collection('clubs').doc(clubId).update({ mux_streaming_approved: 0 });
        cacheEngine.invalidateCollection('clubs');
        await recordAudit({ clubId, actorUser: req.user, action: 'channel_suspended', details: { reason: req.body?.reason || 'Admin suspension' } });
        return res.json({ success: true, suspended: true });
      }

      await getMuxPlatformSettings().catch(() => null);
      if (channel.mux_live_stream_id && getMuxConfig().isConfigured) {
        await disableMuxLiveStream(String(channel.mux_live_stream_id)).catch((err: any) => {
          console.warn('[Mux] Remote disable warning during suspend:', err?.message);
        });
      }

      await execute(
        "UPDATE `club_streaming_channels` SET `is_suspended` = 1, `channel_status` = 'disabled' WHERE `id` = ?",
        [channel.id]
      );
      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'channel_suspended',
        details: { reason: req.body?.reason || 'Admin suspension' },
      });

      return res.json({ success: true, suspended: true, channel: sanitizeChannelForClient(await getClubChannelRow(clubId)) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/clubs/:id/mux/unsuspend', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const clubId = String(req.params.id);
      const channel = await getClubChannelRow(clubId);
      if (!channel) {
        return res.status(404).json({ error: 'No streaming channel found for this club.' });
      }

      await getMuxPlatformSettings().catch(() => null);
      if (channel.mux_live_stream_id && getMuxConfig().isConfigured) {
        await enableMuxLiveStream(String(channel.mux_live_stream_id)).catch((err: any) => {
          console.warn('[Mux] Remote enable warning during unsuspend:', err?.message);
        });
      }

      await execute(
        "UPDATE `club_streaming_channels` SET `is_suspended` = 0, `channel_status` = 'idle' WHERE `id` = ?",
        [channel.id]
      );
      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'channel_unsuspended',
      });

      return res.json({ success: true, suspended: false, channel: sanitizeChannelForClient(await getClubChannelRow(clubId)) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/clubs/:id/mux/reset-key', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const clubId = String(req.params.id);
      const channel = await getClubChannelRow(clubId);
      if (!channel) return res.status(404).json({ error: 'No streaming channel exists for this club.' });

      const openSessions = await getOpenChannelSessions(channel.id);
      const rotCheck = validateStreamKeyRotation({
        channel,
        openSessions,
        force: Boolean(req.body?.force),
      });
      if (!rotCheck.allowed) {
        return res.status(409).json({ error: rotCheck.error });
      }

      await getMuxPlatformSettings().catch(() => null);
      const rotated = await resetMuxLiveStreamKey(String(channel.mux_live_stream_id));
      const encrypted = encryptStreamKey(rotated.streamKey);
      const last4 = getStreamKeyLast4(rotated.streamKey);

      await execute(
        'UPDATE `club_streaming_channels` SET `stream_key_encrypted` = ?, `stream_key_last4` = ?, `key_rotated_at` = NOW() WHERE `id` = ?',
        [encrypted, last4, channel.id]
      );

      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'key_rotated',
        details: { adminForced: Boolean(req.body?.force), previousLast4: channel.stream_key_last4, newLast4: last4 },
      });

      return res.json({ success: true, channel: sanitizeChannelForClient(await getClubChannelRow(clubId)) });
    } catch (e: any) {
      return res.status(502).json({ error: e?.message || 'Admin key reset failed.' });
    }
  });

  app.put('/api/admin/clubs/:id/mux/limits', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const clubId = String(req.params.id);
      const channel = await getClubChannelRow(clubId);
      if (!channel) return res.status(404).json({ error: 'No streaming channel exists for this club.' });

      const mins = Math.max(15, Math.min(1440, Number(req.body?.maxSessionMinutes) || 240));
      await execute('UPDATE `club_streaming_channels` SET `max_session_minutes` = ? WHERE `id` = ?', [mins, channel.id]);
      await recordAudit({
        channelId: channel.id,
        clubId,
        actorUser: req.user,
        action: 'limits_updated',
        details: { maxSessionMinutes: mins },
      });

      return res.json({ success: true, maxSessionMinutes: mins, channel: sanitizeChannelForClient(await getClubChannelRow(clubId)) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // 5. REUSABLE-CHANNEL WEBHOOK RECONCILER DELEGATION
  // =========================================================================
  const processClubChannelWebhookEvent = createClubChannelWebhookProcessor({ db, query, execute, cacheEngine });

  return { processClubChannelWebhookEvent };
}

export function createClubChannelWebhookProcessor(deps: {
  db: any;
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  execute: (sql: string, params?: any[]) => Promise<any>;
  cacheEngine: { invalidateCollection: (name: string) => void };
}) {
  const { db, query, execute, cacheEngine } = deps;

  return async function processClubChannelWebhookEvent(event: any): Promise<{
    handled: boolean;
    duplicate?: boolean;
    matchId?: string | null;
    sessionId?: string | null;
    channelId?: string | null;
    status?: string | null;
  }> {
    const eventType = String(event?.type || '').trim();
    const data = event?.data || {};
    const liveStreamId = eventType.startsWith('video.live_stream.')
      ? (data?.id ? String(data.id) : null)
      : (data?.live_stream_id ? String(data.live_stream_id) : null);
    const assetId = eventType.startsWith('video.asset.') ? (data?.id ? String(data.id) : null) : (data?.active_asset_id ? String(data.active_asset_id) : null);

    const dedupeId = event?.id
      ? String(event.id)
      : `${eventType}:${data?.id || liveStreamId || 'unknown'}:${event?.created_at || ''}`;

    try {
      const existing = await query<any>(
        'SELECT `event_id` FROM `mux_webhook_events` WHERE `event_id` = ? LIMIT 1',
        [dedupeId]
      );
      if (existing && existing.length > 0) {
        return { handled: true, duplicate: true };
      }
      await execute(
        'INSERT INTO `mux_webhook_events` (`event_id`, `event_type`, `mux_object_id`, `payload_created_at`) VALUES (?, ?, ?, ?)',
        [dedupeId, eventType, data?.id ? String(data.id) : liveStreamId, event?.created_at ? String(event.created_at) : null]
      );
    } catch (_) {}

    if (!liveStreamId && !assetId) {
      return { handled: false };
    }

    let channel: any = null;
    if (liveStreamId) {
      const chRows = await query<any>(
        'SELECT * FROM `club_streaming_channels` WHERE `mux_live_stream_id` = ? LIMIT 1',
        [liveStreamId]
      ).catch(() => []);
      if (chRows && chRows[0]) channel = chRows[0];
    }

    // 1. For Asset events, resolve exact broadcast_session by mux_asset_id FIRST for strict per-Event replay isolation!
    let targetSession: any = null;
    if (eventType.startsWith('video.asset.') && assetId) {
      const sRows = await query<any>(
        'SELECT * FROM `broadcast_sessions` WHERE `mux_asset_id` = ? ORDER BY `assigned_at` DESC LIMIT 1',
        [assetId]
      ).catch(() => []);
      if (sRows && sRows[0]) targetSession = sRows[0];
    }

    // 2. Otherwise resolve currently active open session on the channel
    if (!targetSession && channel?.active_broadcast_session_id) {
      const sRows = await query<any>(
        'SELECT * FROM `broadcast_sessions` WHERE `id` = ? LIMIT 1',
        [channel.active_broadcast_session_id]
      ).catch(() => []);
      if (sRows && sRows[0]) targetSession = sRows[0];
    }

    if (!targetSession && liveStreamId) {
      const sRows = await query<any>(
        "SELECT * FROM `broadcast_sessions` WHERE `mux_live_stream_id` = ? AND `status` IN ('assigned', 'live', 'disconnected', 'ending') ORDER BY `assigned_at` DESC LIMIT 1",
        [liveStreamId]
      ).catch(() => []);
      if (sRows && sRows[0]) targetSession = sRows[0];
    }

    // 3. Delayed post-completion asset fallback when idle ran just before asset.created/asset.ready
    if (!targetSession && eventType.startsWith('video.asset.') && liveStreamId) {
      const recentCompleted = await query<any>(
        "SELECT * FROM `broadcast_sessions` WHERE `mux_live_stream_id` = ? AND `status` = 'completed' AND (`mux_asset_id` IS NULL OR `mux_asset_playback_id` IS NULL) ORDER BY `ended_at` DESC LIMIT 1",
        [liveStreamId]
      ).catch(() => []);
      if (recentCompleted && recentCompleted[0]) targetSession = recentCompleted[0];
    }

    if (!channel && !targetSession) {
      return { handled: false };
    }

    const effectivePolicy: MuxPlaybackPolicy = normalizePlaybackPolicy(
      targetSession?.mux_playback_policy || channel?.mux_playback_policy
    );
    const parsed = parseMuxWebhookEvent(event, effectivePolicy);
    if (!parsed.handled) {
      return { handled: false };
    }

    if (channel && eventType.startsWith('video.live_stream.')) {
      const nextChStatus = parsed.updates.mux_stream_status || channel.channel_status;
      if (nextChStatus) {
        await execute(
          'UPDATE `club_streaming_channels` SET `channel_status` = ?, `last_connected_at` = CASE WHEN ? IN (\'connected\', \'active\') THEN NOW() ELSE `last_connected_at` END WHERE `id` = ?',
          [nextChStatus, nextChStatus, channel.id]
        ).catch(() => {});
      }
      if (parsed.updates.mux_playback_id) {
        await execute(
          'UPDATE `club_streaming_channels` SET `mux_playback_id` = ? WHERE `id` = ?',
          [parsed.updates.mux_playback_id, channel.id]
        ).catch(() => {});
      }
    }

    if (targetSession) {
      const sStatus = String(targetSession.status || '').toLowerCase();
      const matchUpdates: Record<string, any> = { ...parsed.updates };
      let sessionNextStatus = targetSession.status;

      if (eventType === 'video.live_stream.active') {
        sessionNextStatus = 'live';
        matchUpdates.status = 'live';
        if (channel?.mux_playback_id) matchUpdates.mux_playback_id = channel.mux_playback_id;
        await execute(
          "UPDATE `broadcast_sessions` SET `status` = 'live', `mux_stream_status` = 'active', `mux_asset_id` = COALESCE(?, `mux_asset_id`), `started_at` = COALESCE(`started_at`, NOW()) WHERE `id` = ?",
          [parsed.assetId || null, targetSession.id]
        ).catch(() => {});
      } else if (eventType === 'video.live_stream.connected' || eventType === 'video.live_stream.recording') {
        await execute(
          'UPDATE `broadcast_sessions` SET `mux_stream_status` = ?, `mux_asset_id` = COALESCE(?, `mux_asset_id`) WHERE `id` = ?',
          [parsed.updates.mux_stream_status || eventType.split('.').pop(), parsed.assetId || null, targetSession.id]
        ).catch(() => {});
      } else if (eventType === 'video.live_stream.disconnected') {
        sessionNextStatus = 'disconnected';
        await execute(
          "UPDATE `broadcast_sessions` SET `status` = 'disconnected', `mux_stream_status` = 'disconnected', `disconnected_at` = NOW() WHERE `id` = ?",
          [targetSession.id]
        ).catch(() => {});
      } else if (eventType === 'video.live_stream.idle' && ['live', 'disconnected', 'ending'].includes(sStatus)) {
        sessionNextStatus = 'completed';
        const startMs = targetSession.started_at ? new Date(targetSession.started_at).getTime() : null;
        const durSec = startMs ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
        await execute(
          "UPDATE `broadcast_sessions` SET `status` = 'completed', `mux_stream_status` = 'idle', `ended_at` = NOW(), `duration_seconds` = GREATEST(`duration_seconds`, ?) WHERE `id` = ?",
          [durSec, targetSession.id]
        ).catch(() => {});
        if (channel) {
          await execute(
            'UPDATE `club_streaming_channels` SET `active_broadcast_session_id` = NULL, `active_match_id` = NULL WHERE `id` = ? AND `active_broadcast_session_id` = ?',
            [channel.id, targetSession.id]
          ).catch(() => {});
        }
        // Release ephemeral live playback ID from completed Event while keeping its isolated VOD replay asset!
        matchUpdates.mux_playback_id = null;
        matchUpdates.mux_stream_status = 'idle';
        matchUpdates.status = 'full_match';
      } else if (eventType === 'video.asset.created' || eventType === 'video.asset.ready' || eventType === 'video.asset.errored') {
        const assetPb = parsed.updates.mux_asset_playback_id || extractMuxPlaybackId(data?.playback_ids, effectivePolicy);
        await execute(
          'UPDATE `broadcast_sessions` SET `mux_asset_id` = COALESCE(?, `mux_asset_id`), `mux_asset_playback_id` = COALESCE(?, `mux_asset_playback_id`), `mux_error_message` = ? WHERE `id` = ?',
          [parsed.assetId || null, assetPb || null, parsed.updates.mux_error_message || null, targetSession.id]
        ).catch(() => {});
        // Never overwrite editorial match.status on late asset webhooks; only bind the isolated VOD playback ID
        delete matchUpdates.status;
      }

      if (targetSession.match_id && Object.keys(matchUpdates).length > 0) {
        // Respect completed Event playback isolation: never overwrite Event status if already full_match/highlights during late events
        const mDoc = await db.collection('matches').doc(String(targetSession.match_id)).get();
        if (mDoc.exists) {
          const curMatch = mDoc.data();
          if (
            matchUpdates.status === 'live' &&
            ['full_match', 'completed', 'highlights'].includes(String(curMatch?.status || '').toLowerCase()) &&
            String(curMatch?.status_mode || '').toLowerCase() === 'manual'
          ) {
            delete matchUpdates.status;
          }
          await db.collection('matches').doc(String(targetSession.match_id)).update(matchUpdates);
          cacheEngine.invalidateCollection('matches');
        }
      }

      return {
        handled: true,
        matchId: targetSession.match_id,
        sessionId: targetSession.id,
        channelId: channel?.id || targetSession.channel_id,
        status: sessionNextStatus,
      };
    }

    // Channel existed without an active Event session (e.g. direct encoder test before assignment)
    return {
      handled: true,
      matchId: null,
      sessionId: null,
      channelId: channel.id,
      status: parsed.updates.mux_stream_status || channel.channel_status,
    };
  };
}
