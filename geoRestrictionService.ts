/**
 * Per-event geographic restrictions. See docs/geo-restrictions.md.
 *
 * Worldwide is the default: an event with no active/upcoming exclusion never needs a viewer country.
 * Windows are evaluated against the clock on every request, so start/expiry need no scheduled job.
 */
import crypto from 'crypto';
import { isIsoCountryCode } from './src/config/countries.js';

export interface GeoExclusion {
  countryCode: string;
  mode: 'permanent' | 'timed';
  /** UTC epoch milliseconds; null for permanent. Start inclusive, end exclusive. */
  startsAt: number | null;
  endsAt: number | null;
}
export type GeoState = 'active' | 'upcoming' | 'expired';
export interface GeoRequirement { code: string; message: string }
export interface GeoMuxConfig { isConfigured: boolean; isSigningConfigured: boolean }

type Query = (sql: string, params?: any[]) => Promise<any[]>;
export const GEO_MAX_EXCLUSIONS = 500;
/** Mux tokens cannot be shorter than this, so playback is cut off this early rather than overrunning a start time. */
const MIN_TOKEN_SECONDS = 60;

// ---------------------------------------------------------------- validation & windows

export function parseGeoExclusions(raw: any): { exclusions: GeoExclusion[]; error: string | null } {
  const fail = (error: string) => ({ exclusions: [], error });
  if (!Array.isArray(raw)) return fail('exclusions must be an array.');
  if (raw.length > GEO_MAX_EXCLUSIONS) return fail(`No more than ${GEO_MAX_EXCLUSIONS} exclusions are allowed.`);
  // Offset is mandatory: "2026-01-01T15:00" would silently mean server-local time.
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
  const seen = new Set<string>();
  const exclusions: GeoExclusion[] = [];
  for (const item of raw) {
    const countryCode = String(item?.countryCode ?? '').trim().toUpperCase();
    if (!isIsoCountryCode(countryCode)) return fail(`"${countryCode}" is not a valid ISO country code.`);
    let startsAt: number | null = null;
    let endsAt: number | null = null;
    if (item.mode === 'timed') {
      for (const v of [item.startsAt, item.endsAt]) {
        if (typeof v !== 'string' || !iso.test(v) || !Number.isFinite(Date.parse(v))) {
          return fail(`${countryCode}: timed exclusions need a start and end with a time zone.`);
        }
      }
      startsAt = Date.parse(item.startsAt);
      endsAt = Date.parse(item.endsAt);
      if (endsAt <= startsAt) return fail(`${countryCode}: the end must be after the start.`);
    } else if (item.mode !== 'permanent') {
      return fail(`${countryCode}: mode must be "permanent" or "timed".`);
    }
    const key = `${countryCode}:${startsAt}:${endsAt}`;
    if (seen.has(key)) return fail(`${countryCode}: duplicate exclusion.`);
    seen.add(key);
    exclusions.push({ countryCode, mode: item.mode, startsAt, endsAt });
  }
  return { exclusions, error: null };
}

export function geoState(e: GeoExclusion, now: number): GeoState {
  if (e.mode === 'permanent') return 'active';
  if (now < e.startsAt!) return 'upcoming';
  return now < e.endsAt! ? 'active' : 'expired';
}

export const isEnforceable = (list: GeoExclusion[], now: number) => list.some((e) => geoState(e, now) !== 'expired');

export interface GeoDecision {
  restricted: boolean;
  reason: 'country_excluded' | 'location_unverified' | null;
  endsAt: number | null;
  nextStartAt: number | null;
}

/**
 * Decision for one viewer. Unknown country is denied while any exclusion is active.
 * endsAt is only reported for a known country; null means no scheduled end.
 */
export function evaluateGeo(list: GeoExclusion[], country: string | null, now: number): GeoDecision {
  const relevant = country ? list.filter((e) => e.countryCode === country) : list;
  const starts = relevant.filter((e) => geoState(e, now) === 'upcoming').map((e) => e.startsAt!);
  const nextStartAt = starts.length ? Math.min(...starts) : null;
  const startsImminently = nextStartAt !== null && nextStartAt - now < MIN_TOKEN_SECONDS * 1000;
  if (!startsImminently && !relevant.some((e) => geoState(e, now) === 'active')) {
    return { restricted: false, reason: null, endsAt: null, nextStartAt };
  }
  if (!country) return { restricted: true, reason: 'location_unverified', endsAt: null, nextStartAt };
  if (relevant.some((e) => e.mode === 'permanent')) {
    return { restricted: true, reason: 'country_excluded', endsAt: null, nextStartAt };
  }
  // Follow overlapping/adjacent windows so the reported end is when access really returns.
  let end = relevant.some((e) => geoState(e, now) === 'active') ? now : nextStartAt!;
  for (const e of [...relevant].sort((a, b) => a.startsAt! - b.startsAt!)) {
    if (e.startsAt! <= end && e.endsAt! > end) end = e.endsAt!;
  }
  return { restricted: true, reason: 'country_excluded', endsAt: end, nextStartAt };
}

// ---------------------------------------------------------------- viewer country

type Env = Record<string, string | undefined>;

export function getGeoEdgeConfig(env: Env = process.env) {
  const countryHeader = String(env.GEO_COUNTRY_HEADER || '').trim().toLowerCase();
  const secretHeader = String(env.GEO_EDGE_SECRET_HEADER || 'x-wds-edge-secret').trim().toLowerCase();
  const secret = String(env.GEO_EDGE_SECRET || '');
  return { countryHeader, secretHeader, secret, isConfigured: Boolean(countryHeader && secret.length >= 32) };
}

/**
 * The country header counts only when the request also proves it came through our edge.
 * X-Forwarded-For is deliberately not used: the client can set it.
 */
export function resolveTrustedCountry(req: any, env: Env = process.env): string | null {
  const cfg = getGeoEdgeConfig(env);
  if (!cfg.isConfigured) return null;
  const digest = (v: string) => crypto.createHash('sha256').update(v).digest();
  const supplied = req?.headers?.[cfg.secretHeader];
  if (typeof supplied !== 'string' || !crypto.timingSafeEqual(digest(supplied), digest(cfg.secret))) return null;
  const header = req.headers[cfg.countryHeader];
  const code = typeof header === 'string' ? header.trim().toUpperCase() : '';
  return isIsoCountryCode(code) ? code : null; // rejects Cloudflare's XX (unknown) and T1 (Tor)
}

// ---------------------------------------------------------------- storage

export const GEO_MIGRATIONS = [
  "CREATE TABLE IF NOT EXISTS `event_geo_exclusions` (`id` BIGINT AUTO_INCREMENT PRIMARY KEY, `match_id` VARCHAR(100) NOT NULL, `country_code` CHAR(2) NOT NULL, `mode` VARCHAR(10) NOT NULL, `starts_at_ms` BIGINT DEFAULT NULL, `ends_at_ms` BIGINT DEFAULT NULL, `created_by` VARCHAR(100) DEFAULT NULL, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX `idx_ege_match` (`match_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

/** A missing table means no exclusion can exist (worldwide). Any other database error propagates: never fail open. */
export async function loadGeoExclusions(query: Query, matchId: any): Promise<GeoExclusion[]> {
  let rows: any[];
  try {
    rows = await query(
      'SELECT `country_code`, `mode`, `starts_at_ms`, `ends_at_ms` FROM `event_geo_exclusions` WHERE `match_id` = ? ORDER BY `id`',
      [String(matchId)]
    );
  } catch (err: any) {
    if (err?.errno === 1146 || err?.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
  return rows.map((r): GeoExclusion => ({
    countryCode: String(r.country_code).toUpperCase(),
    mode: r.mode === 'timed' ? 'timed' : 'permanent',
    startsAt: r.starts_at_ms == null ? null : Number(r.starts_at_ms),
    endsAt: r.ends_at_ms == null ? null : Number(r.ends_at_ms),
  }));
}

// ---------------------------------------------------------------- Mux infrastructure readiness

/** Checks that need no network call. Re-run at playback time so configuration drift cannot open a hole. */
export function getLocalGeoRequirements(match: any, mux: GeoMuxConfig): GeoRequirement[] {
  const out: GeoRequirement[] = [];
  if (!mux.isSigningConfigured) {
    out.push({ code: 'mux_signing_keys', message: 'Add Mux Signing Keys in Admin Settings > Mux Streaming.' });
  }
  if (String(match?.stream_provider || '').toLowerCase() !== 'mux') {
    out.push({ code: 'mux_provider', message: 'Set the event stream source to Mux and save it. YouTube and custom embeds cannot be geo-protected.' });
  }
  if (String(match?.mux_playback_policy || '').toLowerCase() !== 'signed') {
    out.push({ code: 'mux_signed_policy', message: 'Switch this event to Signed Playback and save it.' });
  }
  const markup = /<iframe|<video|<mux-|stream\.mux\.com|youtu\.?be/i;
  if (
    match?.video_url || match?.embed_code || match?.playback_id ||
    markup.test(String(match?.description || '')) || markup.test(String(match?.content || ''))
  ) {
    out.push({ code: 'alternate_source', message: 'Remove other video links or embeds from this event; they would bypass the restriction.' });
  }
  return out;
}

export interface GeoMuxApi {
  getLiveStream: (id: string) => Promise<any>;
  getAsset: (id: string) => Promise<any>;
}

/** Full check before restrictions may be saved. Any Mux error counts as not ready. */
export async function getGeoRequirements(match: any, mux: GeoMuxConfig, api: GeoMuxApi, req: any): Promise<GeoRequirement[]> {
  const out = getLocalGeoRequirements(match, mux);
  if (!getGeoEdgeConfig().isConfigured) {
    out.push({ code: 'country_source', message: 'Set GEO_COUNTRY_HEADER and GEO_EDGE_SECRET (32+ characters) on the server. See docs/geo-restrictions.md.' });
  } else if (!resolveTrustedCountry(req)) {
    out.push({ code: 'country_source_unverified', message: 'Your own request arrived without a verified country. Check that the edge/CDN adds the country and secret headers.' });
  }
  if (!mux.isConfigured) {
    out.push({ code: 'mux_credentials', message: 'Add the Mux API token in Admin Settings > Mux Streaming.' });
    return out;
  }
  const check = async (what: string, get: () => Promise<any>) => {
    try {
      const ids = (await get())?.playback_ids || [];
      if (ids.some((p: any) => p?.policy !== 'signed')) {
        out.push({ code: 'public_playback_id', message: `The Mux ${what} still has a non-signed playback ID. Re-apply Signed Playback or remove that ID in Mux.` });
      }
    } catch {
      out.push({ code: 'mux_unverified', message: `Could not verify the Mux ${what}. Try again.` });
    }
  };
  if (match?.mux_live_stream_id) await check('live stream', () => api.getLiveStream(String(match.mux_live_stream_id)));
  if (match?.mux_asset_id) await check('recording', () => api.getAsset(String(match.mux_asset_id)));
  return out;
}

// ---------------------------------------------------------------- enforcement

export interface GeoGateResult {
  /** null when playback may be issued. */
  denied: { status: number; body: Record<string, any> } | null;
  /** Upper bound for token lifetime so it cannot outlive the next window start. */
  maxTokenSeconds: number | null;
}

export function createGeoPlaybackGate(deps: {
  query: Query;
  getMuxConfig: () => GeoMuxConfig;
  getPlaybackIdPolicy: (id: string) => Promise<string>;
  now?: () => number;
}) {
  const clock = deps.now || Date.now;
  const policyCache = new Map<string, string>(); // a Mux playback ID's policy never changes

  const deny = (status: number, error: string, reason: string | null, endsAt: number | null): GeoGateResult => ({
    denied: {
      status,
      body: { error, geoRestricted: true, reason, endsAt: endsAt ? new Date(endsAt).toISOString() : null, hasAccess: false },
    },
    maxTokenSeconds: null,
  });

  /** Call after entitlement and before building any playback response. Applies to every role. */
  return async function geoPlaybackGate(match: any, req: any): Promise<GeoGateResult> {
    const list = await loadGeoExclusions(deps.query, match.id);
    const now = clock();
    if (!isEnforceable(list, now)) return { denied: null, maxTokenSeconds: null };

    const decision = evaluateGeo(list, resolveTrustedCountry(req), now);
    if (decision.restricted) return deny(451, 'geo_restricted', decision.reason, decision.endsAt);

    // Handing a public ID to an allowed viewer would expose it everywhere, so drift fails closed.
    const notReady = () => deny(503, 'geo_protection_unavailable', 'protection_unavailable', null);
    if (getLocalGeoRequirements(match, deps.getMuxConfig()).length > 0) return notReady();
    const anyActive = list.some((e) => geoState(e, now) === 'active');
    for (const id of new Set([match.mux_playback_id, match.mux_asset_playback_id].filter(Boolean).map(String))) {
      let policy = policyCache.get(id);
      if (!policy) {
        try {
          policy = await deps.getPlaybackIdPolicy(id);
        } catch {
          // Mux outage: closed while a window is active, tolerated while one is only scheduled.
          if (anyActive) return notReady();
          continue;
        }
        if (policyCache.size > 5000) policyCache.clear();
        policyCache.set(id, policy);
      }
      if (policy !== 'signed') return notReady();
    }
    return {
      denied: null,
      maxTokenSeconds: decision.nextStartAt === null ? null : Math.floor((decision.nextStartAt - now) / 1000),
    };
  };
}

const ENDED_STATUSES = ['completed', 'full_match', 'highlights'];
const PURCHASE_MESSAGES: Record<string, string> = {
  country_excluded: 'This event is not available in your location, so it cannot be purchased.',
  location_unverified: 'We could not confirm your location, so this event cannot be purchased. Turn off any VPN or Tor and try again.',
  event_window: 'This event will not be available in your location during its broadcast, so it cannot be purchased.',
  protection_unavailable: 'This event is temporarily unavailable for purchase. Please try again shortly.',
};

/**
 * Why this viewer may not buy the event, or null. Blocks a sale when playback is refused now, or when an
 * exclusion overlaps the scheduled broadcast (so nobody pays for a match they will be unable to watch live).
 */
export function evaluateGeoPurchase(match: any, list: GeoExclusion[], country: string | null, now: number): string | null {
  const decision = evaluateGeo(list, country, now);
  if (decision.restricted) return decision.reason;
  if (ENDED_STATUSES.includes(String(match?.status || '').toLowerCase())) return null;

  const upcoming = list.filter((e) => (!country || e.countryCode === country) && geoState(e, now) === 'upcoming');
  if (upcoming.length === 0) return null;
  const start = new Date(match?.date || match?.start_time || NaN).getTime();
  if (!Number.isFinite(start)) return 'event_window'; // unscheduled: cannot rule out an overlap
  const end = start + (Number(match?.duration) || 120) * 60_000;
  return upcoming.some((e) => e.startsAt! < end && e.endsAt! > start) ? 'event_window' : null;
}

/** Call before creating a payment or deducting a balance. Never call when fulfilling money already taken. */
export function createGeoPurchaseGate(deps: { query: Query; getMuxConfig: () => GeoMuxConfig; now?: () => number }) {
  const clock = deps.now || Date.now;
  return async function geoPurchaseGate(match: any, req: any): Promise<{ status: number; body: Record<string, any> } | null> {
    const list = await loadGeoExclusions(deps.query, match.id);
    const now = clock();
    if (!isEnforceable(list, now)) return null;
    const reason =
      evaluateGeoPurchase(match, list, resolveTrustedCountry(req), now) ||
      (getLocalGeoRequirements(match, deps.getMuxConfig()).length > 0 ? 'protection_unavailable' : null);
    return reason ? { status: 451, body: { error: PURCHASE_MESSAGES[reason], geoRestricted: true, reason } } : null;
  };
}

/** For guarding changes that would weaken an event with active or upcoming exclusions. */
export async function hasEnforceableGeo(query: Query, matchId: any): Promise<boolean> {
  return isEnforceable(await loadGeoExclusions(query, matchId), Date.now());
}

export const GEO_DOWNGRADE_ERROR =
  'This event has geographic restrictions, so it must keep signed Mux playback with no other video source. An admin must remove the restrictions first.';

// ---------------------------------------------------------------- routes

export function registerGeoRestrictionRoutes(deps: {
  app: any;
  db: any;
  query: Query;
  transaction: (fn: (execute: (sql: string, params?: any[]) => Promise<any>) => Promise<void>) => Promise<void>;
  authenticate: any;
  requireRole: (roles: string[]) => any;
  getMuxConfig: () => GeoMuxConfig;
  loadMuxSettings: () => Promise<any>;
  muxApi: GeoMuxApi;
}) {
  const { app, db, query, transaction, authenticate, requireRole } = deps;

  const getMatch = async (id: string) => {
    const doc = await db.collection('matches').doc(String(id)).get();
    return doc.exists ? { ...doc.data(), id: String(id) } : null;
  };
  const present = (list: GeoExclusion[]) => list.map((e) => ({
    countryCode: e.countryCode,
    mode: e.mode,
    startsAt: e.startsAt === null ? null : new Date(e.startsAt).toISOString(),
    endsAt: e.endsAt === null ? null : new Date(e.endsAt).toISOString(),
    state: geoState(e, Date.now()),
  }));
  const requirements = async (match: any, req: any) => {
    await deps.loadMuxSettings().catch(() => null);
    return getGeoRequirements(match, deps.getMuxConfig(), deps.muxApi, req);
  };

  app.get('/api/admin/matches/:id/geo-restrictions', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const match = await getMatch(req.params.id);
      if (!match) return res.status(404).json({ error: 'Event not found' });
      res.setHeader('Cache-Control', 'no-store, private');
      return res.json({
        exclusions: present(await loadGeoExclusions(query, match.id)),
        requirements: await requirements(match, req),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/matches/:id/geo-restrictions', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const parsed = parseGeoExclusions(req.body?.exclusions);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const match = await getMatch(req.params.id);
      if (!match) return res.status(404).json({ error: 'Event not found' });

      // Clearing restrictions is always allowed, even if infrastructure is broken.
      if (isEnforceable(parsed.exclusions, Date.now())) {
        const missing = await requirements(match, req);
        if (missing.length > 0) {
          return res.status(409).json({ error: 'Required playback infrastructure is not ready. Nothing was saved.', requirements: missing });
        }
      }
      await transaction(async (execute) => {
        await execute('DELETE FROM `event_geo_exclusions` WHERE `match_id` = ?', [match.id]);
        for (const e of parsed.exclusions) {
          await execute(
            'INSERT INTO `event_geo_exclusions` (`match_id`, `country_code`, `mode`, `starts_at_ms`, `ends_at_ms`, `created_by`) VALUES (?, ?, ?, ?, ?, ?)',
            [match.id, e.countryCode, e.mode, e.startsAt, e.endsAt, req.user?.id ? String(req.user.id) : null]
          );
        }
      });
      console.log(`[Geo] Admin ${req.user?.id} set ${parsed.exclusions.length} exclusion(s) on event ${match.id}`);
      return res.json({ success: true, exclusions: present(parsed.exclusions) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Viewer-specific status for the event page. Never exposes the exclusion list or the viewer's country.
  app.get('/api/matches/:id/geo-status', async (req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const list = await loadGeoExclusions(query, req.params.id);
      const country = resolveTrustedCountry(req);
      const now = Date.now();
      const d = evaluateGeo(list, country, now);
      const match = isEnforceable(list, now) ? await getMatch(req.params.id) : null;
      const purchaseReason = match ? evaluateGeoPurchase(match, list, country, now) : null;
      return res.json({
        restricted: d.restricted,
        purchaseRestricted: Boolean(purchaseReason),
        reason: d.reason || purchaseReason,
        endsAt: d.endsAt ? new Date(d.endsAt).toISOString() : null,
      });
    } catch {
      return res.status(500).json({ error: 'Could not check availability.' });
    }
  });
}
