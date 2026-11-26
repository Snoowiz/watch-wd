import express from 'express';
import fs from 'fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTINGS_KEYS, isSecretLikeField, registerSettingsReadRoutes, stripSecretFields } from '../settingsAccess';

// Fake stored documents. Every allowlisted key carries planted secret-like fields
// (top level and nested) to prove they never reach the public response.
const planted = {
  clientSecret: 'PLANTED',
  privateKey: 'PLANTED',
  password: 'PLANTED',
  accessToken: 'PLANTED',
  serviceAccount: { private_key: 'PLANTED' },
  nested: { apiSecret: 'PLANTED', keep: 'ok', list: [{ token: 'PLANTED', label: 'ok' }] },
};
const store: Record<string, any> = {
  google_auth: { enabled: true, clientId: 'cid', clientSecret: 'PLANTED' },
  captcha: { enabled: true, tolerance: 25 },
  smtp: { host: 'h', auth_pass: 'PLANTED' },
  firebase_config: { apiKey: 'public-web-key', projectId: 'p', appId: 'a', measurementId: 'G-1', vapidKey: 'v', ...planted },
};
for (const k of PUBLIC_SETTINGS_KEYS) if (!store[k]) store[k] = { enabled: true, title: k, ...planted };

function setup() {
  const app = express();
  app.use(express.json());
  // Specific routes are registered before the generic ones in server.ts; mirror that.
  app.get('/api/settings/public', (_req, res) => res.json({ siteName: 'WatchWDS' }));
  app.get('/api/settings/match_categories', (_req, res) => res.json([{ id: 1 }]));
  app.get('/api/settings/blog_categories', (_req, res) => res.json([{ id: 2 }]));
  registerSettingsReadRoutes({
    app,
    getSecureDocument: async (_c: string, key: string) => store[key] ?? null,
    authenticate: (req: any, res: any, next: any) => {
      if (!req.headers['x-role']) return res.status(401).json({ error: 'Unauthorized' });
      req.user = { id: 1, role: req.headers['x-role'] };
      next();
    },
    requireRole: (roles: string[]) => (req: any, res: any, next: any) =>
      roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' }),
  });
  // server.ts ends /api with a catch-all that answers 200; the 404s must come from the route itself.
  app.use('/api', (_req, res) => res.json({ success: true }));
  return app;
}

function collectKeys(v: any, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => collectKeys(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.push(k); collectKeys(x, out); }
  return out;
}

describe('GET /api/admin/settings/:key', () => {
  const app = setup();
  it('requires authentication', async () => {
    expect((await request(app).get('/api/admin/settings/google_auth')).status).toBe(401);
  });
  it('rejects non-admins', async () => {
    for (const role of ['viewer', 'user', 'partner', 'creator', 'operator']) {
      expect((await request(app).get('/api/admin/settings/seo').set('x-role', role)).status).toBe(403);
    }
  });
  it('serves admins', async () => {
    const res = await request(app).get('/api/admin/settings/seo').set('x-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('seo');
  });
});

describe('GET /api/settings/:key', () => {
  const app = setup();
  it('returns 404 with no detail for non-public keys', async () => {
    for (const key of ['google_auth', 'captcha', 'smtp', 'payment', `random_${Date.now()}`]) {
      const res = await request(app).get(`/api/settings/${key}`);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('PLANTED');
      expect(res.body).toEqual({ error: 'Not found' });
    }
  });

  it('serves every allowlisted key without secret-like fields', async () => {
    for (const key of PUBLIC_SETTINGS_KEYS) {
      const res = await request(app).get(`/api/settings/${key}`);
      expect(res.status, key).toBe(200);
      expect(JSON.stringify(res.body), key).not.toContain('PLANTED');
      expect(collectKeys(res.body).filter(isSecretLikeField), key).toEqual([]);
    }
  });

  it('keeps the public Firebase web config and normal nested data', async () => {
    const fb = (await request(app).get('/api/settings/firebase_config')).body;
    expect(fb).toMatchObject({ apiKey: 'public-web-key', projectId: 'p', appId: 'a', measurementId: 'G-1', vapidKey: 'v' });
    const seo = (await request(app).get('/api/settings/seo')).body;
    expect(seo.nested).toEqual({ keep: 'ok', list: [{ label: 'ok' }] });
  });

  it('still applies site_colors defaults', async () => {
    store.site_colors = null;
    const res = await request(app).get('/api/settings/site_colors');
    expect(res.body).toEqual({ primaryColor: '#3B82F6', secondaryColor: '#10B981', buttonTextColor: '#FFFFFF' });
  });

  it('leaves the specific settings routes registered before it working', async () => {
    expect((await request(app).get('/api/settings/public')).body).toEqual({ siteName: 'WatchWDS' });
    expect((await request(app).get('/api/settings/match_categories')).body).toEqual([{ id: 1 }]);
    expect((await request(app).get('/api/settings/blog_categories')).body).toEqual([{ id: 2 }]);
  });
});

describe('allowlist and stripping', () => {
  it('matches the keys the frontend reads', () => {
    expect([...PUBLIC_SETTINGS_KEYS].sort()).toEqual([
      'blog', 'branding', 'cookies', 'currency', 'event_access_defaults', 'firebase_config', 'homepage',
      'navigation_menus', 'pages', 'seo', 'site_colors', 'social', 'wallet',
    ]);
    for (const k of ['google_auth', 'captcha', 'smtp']) expect(PUBLIC_SETTINGS_KEYS.has(k)).toBe(false);
  });
  it('strips secret-like names case-insensitively, at any depth', () => {
    expect(stripSecretFields({ a: 1, ClientSecret: 'x', b: [{ PASSWORD: 'x', c: 2 }], d: { refresh_token: 'x' } }))
      .toEqual({ a: 1, b: [{ c: 2 }], d: {} });
  });
});

// server.ts starts a server on import, so its wiring is checked at source level.
describe('server wiring', () => {
  const src = fs.readFileSync('server.ts', 'utf8');
  it('uses the locked-down read routes and has no inline generic GET routes', () => {
    expect(src).toContain('registerSettingsReadRoutes({ app, getSecureDocument, authenticate, requireRole })');
    expect(src).not.toContain('app.get("/api/settings/:key"');
    expect(src).not.toContain('app.get("/api/admin/settings/:key"');
  });
  it('registers the specific settings routes before the generic one', () => {
    const generic = src.indexOf('registerSettingsReadRoutes({');
    for (const r of ['app.get("/api/settings/public"', 'app.get("/api/settings/match_categories"', 'app.get("/api/settings/blog_categories"']) {
      expect(src.indexOf(r), r).toBeGreaterThan(0);
      expect(src.indexOf(r), r).toBeLessThan(generic);
    }
  });
  it('keeps settings writes admin-only and the masked Google auth route unchanged', () => {
    expect(src).toContain('app.put("/api/admin/settings/:key", authenticate, requireRole(["admin"])');
    expect(src).toContain('app.post("/api/admin/settings/:key", authenticate, requireRole(["admin"])');
    expect(src).toContain('app.get("/api/admin/google-auth/settings", authenticate, requireRole(["admin"])');
    expect(src).toContain('maskedData.clientSecret = maskSecret(maskedData.clientSecret)');
  });
});
