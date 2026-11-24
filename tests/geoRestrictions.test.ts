import express from 'express';
import fs from 'fs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGeoPlaybackGate, evaluateGeo, geoState, getGeoRequirements, loadGeoExclusions, parseGeoExclusions,
  registerGeoRestrictionRoutes, resolveTrustedCountry, type GeoExclusion,
} from '../geoRestrictionService.js';

const SECRET = 's'.repeat(40);
const MIN = 60_000;
const NOW = Date.parse('2026-11-28T15:00:00Z');
const timed = (countryCode: string, from: number, to: number): GeoExclusion =>
  ({ countryCode, mode: 'timed', startsAt: NOW + from * MIN, endsAt: NOW + to * MIN });
const permanent = (countryCode: string): GeoExclusion => ({ countryCode, mode: 'permanent', startsAt: null, endsAt: null });
const reqFrom = (country?: string, secret = SECRET) =>
  ({ headers: { 'cf-ipcountry': country, 'x-wds-edge-secret': secret, 'x-forwarded-for': '8.8.8.8' } });
const toDb = (l: GeoExclusion[]) => l.map((e) => ({ country_code: e.countryCode, mode: e.mode, starts_at_ms: e.startsAt, ends_at_ms: e.endsAt }));
const signedMatch = { id: '7', stream_provider: 'mux', mux_playback_policy: 'signed', mux_playback_id: 'pb_live', mux_asset_playback_id: 'pb_vod' };
const ready = { isConfigured: true, isSigningConfigured: true };

beforeEach(() => {
  vi.stubEnv('GEO_COUNTRY_HEADER', 'CF-IPCountry');
  vi.stubEnv('GEO_EDGE_SECRET', SECRET);
  vi.stubEnv('GEO_EDGE_SECRET_HEADER', '');
  // An empty override must not disable the default header name
  delete process.env.GEO_EDGE_SECRET_HEADER;
});
afterEach(() => vi.unstubAllEnvs());

describe('exclusion windows', () => {
  it('is worldwide with no exclusions, even for an unknown country', () => {
    expect(evaluateGeo([], null, NOW).restricted).toBe(false);
  });

  it('starts inclusively and expires exclusively with no job running', () => {
    const e = timed('GB', 0, 10);
    expect(geoState(e, NOW - 1)).toBe('upcoming');
    expect(geoState(e, NOW)).toBe('active');
    expect(geoState(e, NOW + 10 * MIN - 1)).toBe('active');
    expect(geoState(e, NOW + 10 * MIN)).toBe('expired');
  });

  it('blocks only the excluded country', () => {
    const list = [permanent('FR'), timed('GB', -5, 5)];
    expect(evaluateGeo(list, 'FR', NOW)).toMatchObject({ restricted: true, endsAt: null });
    expect(evaluateGeo(list, 'GB', NOW)).toMatchObject({ restricted: true, endsAt: NOW + 5 * MIN });
    expect(evaluateGeo(list, 'US', NOW).restricted).toBe(false);
  });

  it('denies an unverified location only while something is active', () => {
    expect(evaluateGeo([timed('GB', -5, 5)], null, NOW).reason).toBe('location_unverified');
    expect(evaluateGeo([timed('GB', 30, 60)], null, NOW).restricted).toBe(false);
    expect(evaluateGeo([timed('GB', -60, -30)], null, NOW).restricted).toBe(false);
  });

  it('reports the end of chained windows, not just the current one', () => {
    expect(evaluateGeo([timed('GB', 4, 20), timed('GB', -5, 5)], 'GB', NOW).endsAt).toBe(NOW + 20 * MIN);
    expect(evaluateGeo([timed('GB', 10, 20), timed('GB', -5, 5)], 'GB', NOW).endsAt).toBe(NOW + 5 * MIN);
  });

  it('has no automatic UK blackout (Saturday 15:00 UK, no manual exclusion)', () => {
    expect(evaluateGeo([], 'GB', NOW).restricted).toBe(false);
  });
});

describe('validation', () => {
  const bad = (e: any) => parseGeoExclusions([e]).error;
  it('rejects bad input', () => {
    expect(parseGeoExclusions('GB').error).toBeTruthy();
    expect(bad({ countryCode: 'UK', mode: 'permanent' })).toMatch(/ISO/);
    expect(bad({ countryCode: 'GB', mode: 'forever' })).toMatch(/mode/);
    expect(bad({ countryCode: 'GB', mode: 'timed', startsAt: '2026-01-01T10:00:00Z' })).toBeTruthy();
    expect(bad({ countryCode: 'GB', mode: 'timed', startsAt: '2026-01-01T10:00', endsAt: '2026-01-01T11:00' })).toMatch(/time zone/);
    expect(bad({ countryCode: 'GB', mode: 'timed', startsAt: '2026-01-01T10:00:00Z', endsAt: '2026-01-01T10:00:00Z' })).toMatch(/after/);
    expect(parseGeoExclusions([{ countryCode: 'GB', mode: 'permanent' }, { countryCode: 'gb', mode: 'permanent' }]).error).toMatch(/duplicate/);
  });
  it('normalises offsets to UTC', () => {
    const { exclusions } = parseGeoExclusions([{ countryCode: 'gb', mode: 'timed', startsAt: '2026-07-01T15:00:00+01:00', endsAt: '2026-07-01T17:00:00+01:00' }]);
    expect(exclusions[0]).toMatchObject({ countryCode: 'GB', startsAt: Date.parse('2026-07-01T14:00:00Z') });
  });
});

describe('trusted country', () => {
  it('needs the edge secret', () => {
    expect(resolveTrustedCountry(reqFrom('gb'))).toBe('GB');
    expect(resolveTrustedCountry(reqFrom('US', 'forged'))).toBeNull();
    expect(resolveTrustedCountry({ headers: { 'cf-ipcountry': 'US' } })).toBeNull();
  });
  it('rejects unknown, Tor and missing countries', () => {
    for (const c of ['XX', 'T1', '', undefined]) expect(resolveTrustedCountry(reqFrom(c))).toBeNull();
  });
  it('is off when the secret is too short', () => {
    vi.stubEnv('GEO_EDGE_SECRET', 'short');
    expect(resolveTrustedCountry(reqFrom('GB', 'short'))).toBeNull();
  });
});

describe('playback gate', () => {
  const gate = (list: GeoExclusion[], over: any = {}) => createGeoPlaybackGate({
    query: async () => toDb(list), getMuxConfig: () => ready, getPlaybackIdPolicy: async () => 'signed', now: () => NOW, ...over,
  });

  it('leaves unrestricted events untouched, including YouTube and missing infrastructure', async () => {
    vi.stubEnv('GEO_EDGE_SECRET', '');
    const lookup = vi.fn();
    const g = gate([], { getMuxConfig: () => ({ isConfigured: false, isSigningConfigured: false }), getPlaybackIdPolicy: lookup });
    expect(await g({ id: '1', stream_provider: 'youtube' }, { headers: {} })).toEqual({ denied: null, maxTokenSeconds: null });
    expect(await gate([timed('GB', -60, -30)])({ id: '1', stream_provider: 'youtube' }, { headers: {} })).toEqual({ denied: null, maxTokenSeconds: null });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('refuses an excluded viewer with no playback data, whatever their role', async () => {
    const r = await gate([permanent('GB')])(signedMatch, { ...reqFrom('GB'), user: { role: 'admin' } });
    expect(r.denied?.status).toBe(451);
    expect(JSON.stringify(r)).not.toMatch(/pb_live|pb_vod|token"|GB/);
  });

  it('cannot be bypassed with a forged country or X-Forwarded-For', async () => {
    const r = await gate([permanent('GB')])(signedMatch, reqFrom('US', 'forged'));
    expect(r.denied?.body.reason).toBe('location_unverified');
  });

  it('allows other countries', async () => {
    expect(await gate([permanent('GB')])(signedMatch, reqFrom('US'))).toEqual({ denied: null, maxTokenSeconds: null });
  });

  it('caps the token at the next start and blocks inside the minimum token lifetime', async () => {
    expect((await gate([timed('GB', 10, 60)])(signedMatch, reqFrom('GB'))).maxTokenSeconds).toBe(600);
    expect((await gate([timed('GB', 10, 60)])(signedMatch, reqFrom('US'))).maxTokenSeconds).toBeNull();
    expect((await gate([timed('GB', 0.5, 60)])(signedMatch, reqFrom('GB'))).denied?.body.endsAt).toBe(new Date(NOW + 60 * MIN).toISOString());
  });

  it('fails closed if protection drifts', async () => {
    const list = [permanent('GB')];
    for (const drift of [{ mux_playback_policy: 'public' }, { stream_provider: 'youtube' }, { video_url: 'https://x/y.m3u8' }, { description: '<iframe src="x">' }]) {
      expect((await gate(list)({ ...signedMatch, ...drift }, reqFrom('US'))).denied?.status).toBe(503);
    }
    expect((await gate(list, { getMuxConfig: () => ({ isConfigured: true, isSigningConfigured: false }) })(signedMatch, reqFrom('US'))).denied?.status).toBe(503);
    // Any ID in the response counts, not only the one being played
    const oneBad = { getPlaybackIdPolicy: async (id: string) => (id === 'pb_vod' ? 'public' : 'signed') };
    expect((await gate(list, oneBad)(signedMatch, reqFrom('US'))).denied?.status).toBe(503);
  });

  it('handles a Mux lookup outage: closed when active, open when only scheduled', async () => {
    const down = { getPlaybackIdPolicy: async () => { throw new Error('down'); } };
    expect((await gate([permanent('GB')], down)(signedMatch, reqFrom('US'))).denied?.status).toBe(503);
    expect((await gate([timed('GB', 60, 90)], down)(signedMatch, reqFrom('US'))).denied).toBeNull();
  });

  it('does not fail open on database errors, but tolerates a table that was never created', async () => {
    await expect(gate([], { query: async () => { throw new Error('db'); } })(signedMatch, reqFrom('US'))).rejects.toThrow('db');
    expect(await loadGeoExclusions(async () => { throw Object.assign(new Error(), { errno: 1146 }); }, '1')).toEqual([]);
  });
});

describe('infrastructure requirements', () => {
  const api = (policy: string) => ({
    getLiveStream: async () => ({ playback_ids: [{ policy: 'signed' }, { policy }] }),
    getAsset: async () => ({ playback_ids: [{ policy: 'signed' }] }),
  });
  const m = { ...signedMatch, mux_live_stream_id: 'ls', mux_asset_id: 'as' };
  const codes = async (match: any, mux: any, a: any, r: any) => (await getGeoRequirements(match, mux, a, r)).map((x) => x.code);

  it('is empty when ready', async () => expect(await codes(m, ready, api('signed'), reqFrom('US'))).toEqual([]));
  it('lists everything missing', async () => {
    vi.stubEnv('GEO_EDGE_SECRET', '');
    expect(await codes({ stream_provider: 'youtube' }, { isConfigured: false, isSigningConfigured: false }, api('signed'), reqFrom('US')))
      .toEqual(['mux_signing_keys', 'mux_provider', 'mux_signed_policy', 'country_source', 'mux_credentials']);
  });
  it('detects leftover public IDs, Mux errors and an edge that does not deliver the header', async () => {
    expect(await codes(m, ready, api('public'), reqFrom('US'))).toEqual(['public_playback_id']);
    const broken = { ...api('signed'), getAsset: async () => { throw new Error(); } };
    expect(await codes(m, ready, broken, reqFrom('US'))).toEqual(['mux_unverified']);
    expect(await codes(m, ready, api('signed'), { headers: {} })).toEqual(['country_source_unverified']);
  });
});

describe('routes', () => {
  function setup(opts: { match?: any; rows?: any[]; failInsert?: boolean } = {}) {
    const state = { rows: opts.rows || [] as any[] };
    const app = express();
    app.use(express.json());
    registerGeoRestrictionRoutes({
      app,
      db: { collection: () => ({ doc: (id: string) => ({ get: async () => ({ exists: id === '7', data: () => opts.match || signedMatch }) }) }) },
      query: async () => state.rows,
      transaction: async (fn) => {
        let next = state.rows;
        await fn(async (sql, p: any[] = []) => {
          if (sql.startsWith('DELETE')) next = [];
          else {
            if (opts.failInsert) throw new Error('insert failed');
            next = [...next, { country_code: p[1], mode: p[2], starts_at_ms: p[3], ends_at_ms: p[4] }];
          }
        });
        state.rows = next;
      },
      authenticate: (req: any, res: any, next: any) => {
        if (!req.headers['x-role']) return res.status(401).json({});
        req.user = { id: 1, role: req.headers['x-role'] };
        next();
      },
      requireRole: (roles) => (req: any, res: any, next: any) => (roles.includes(req.user.role) ? next() : res.status(403).json({})),
      getMuxConfig: () => ready,
      loadMuxSettings: async () => null,
      muxApi: { getLiveStream: async () => ({}), getAsset: async () => ({}) },
    });
    return { app, state };
  }
  const path = '/api/admin/matches/7/geo-restrictions';
  const put = (app: any, role: string, exclusions: any) =>
    request(app).put(path).set('x-role', role).set('cf-ipcountry', 'US').set('x-wds-edge-secret', SECRET).send({ exclusions });
  const gb = [{ countryCode: 'GB', mode: 'permanent' }];

  it('is admin-only', async () => {
    const { app, state } = setup();
    for (const role of ['operator', 'partner', 'viewer']) {
      expect((await put(app, role, gb)).status).toBe(403);
      expect((await request(app).get(path).set('x-role', role)).status).toBe(403);
    }
    expect((await request(app).put(path).send({ exclusions: gb })).status).toBe(401);
    expect(state.rows).toEqual([]);
  });

  it('saves when ready and prompts without saving when not', async () => {
    const ok = setup();
    expect((await put(ok.app, 'admin', gb)).status).toBe(200);
    expect(ok.state.rows).toHaveLength(1);

    const notReady = setup({ match: { ...signedMatch, mux_playback_policy: 'public' } });
    const res = await put(notReady.app, 'admin', gb);
    expect(res.status).toBe(409);
    expect(res.body.requirements[0].code).toBe('mux_signed_policy');
    expect(notReady.state.rows).toEqual([]);
  });

  it('can always clear restrictions', async () => {
    const { app, state } = setup({ match: { stream_provider: 'youtube' }, rows: toDb([permanent('GB')]) });
    expect((await put(app, 'admin', [])).status).toBe(200);
    expect(state.rows).toEqual([]);
  });

  it('keeps the previous list if saving fails part-way', async () => {
    const { app, state } = setup({ rows: toDb([permanent('FR')]), failInsert: true });
    expect((await put(app, 'admin', gb)).status).toBe(500);
    expect(state.rows[0].country_code).toBe('FR');
  });

  it('gives viewers a status without exposing the list', async () => {
    const { app } = setup({ rows: toDb([permanent('GB'), permanent('FR')]) });
    const res = await request(app).get('/api/matches/7/geo-status').set('cf-ipcountry', 'GB').set('x-wds-edge-secret', SECRET);
    expect(res.body).toEqual({ restricted: true, reason: 'country_excluded', endsAt: null });
    expect(res.headers['cache-control']).toContain('no-store');
  });
});

// server.ts starts a server on import, so its wiring is checked at source level.
describe('server wiring', () => {
  const src = fs.readFileSync('server.ts', 'utf8');
  const between = (a: string, b: string) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a) + a.length));

  it('gates after entitlement and before building the stream response', () => {
    const s = between('app.post("/api/matches/:id/stream"', 'app.post("/api/matches/:id/view-session"');
    const order = ['if (!hasAccess) {', 'geoPlaybackGate(match, req)', 'geo.maxTokenSeconds', 'resolveMatchStreamResponse(match'].map((x) => s.indexOf(x));
    expect(order.every((n) => n > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('gates every token signer in server.ts', () => {
    expect(src.match(/signMuxPlaybackTokens\(/g)).toHaveLength(1);
    expect(src.match(/resolveMatchStreamResponse\(/g)).toHaveLength(1);
    const s = between('app.get("/api/matches/:id/mux/status"', 'app.get("/api/matches/:id/mux/credentials"');
    expect(s.indexOf('geoPlaybackGate(')).toBeLessThan(s.indexOf('signMuxPlaybackTokens('));
    expect(s).toContain('geoPlaybackGate(');
  });
  it('keeps the event page endpoint free of geo checks', () => {
    expect(between('app.get("/api/matches/:id", async', '// Geographic restrictions: single gate')).not.toMatch(/geo/i);
  });
  it('does not emit raw event rows from saved matches or the cache warmer', () => {
    expect(between('app.get("/api/saved-matches/details"', 'app.post("/api/matches/:id/save"')).toContain('sanitizeMatchForPublic');
    expect(between('async function warmCriticalCaches', '// Warm Database Cache layer')).toContain("coll === 'matches') continue");
  });
});
