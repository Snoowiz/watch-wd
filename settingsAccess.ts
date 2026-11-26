/**
 * Read access to the generic `settings` documents.
 *
 * - GET /api/settings/:key        public, deny-by-default allowlist, secret-like fields stripped
 * - GET /api/admin/settings/:key  admin only
 *
 * Writes (PUT/POST /api/admin/settings/:key) stay in server.ts unchanged.
 * Keys with their own dedicated routes (google_auth, captcha, smtp, payment, ...) are
 * never served here publicly.
 */

/** Keys the public site reads through GET /api/settings/:key. Anything else returns 404. */
export const PUBLIC_SETTINGS_KEYS: ReadonlySet<string> = new Set([
  'blog',
  'branding',
  'cookies',
  'currency',
  'event_access_defaults',
  'firebase_config',
  'homepage',
  'navigation_menus',
  'pages',
  'seo',
  'site_colors',
  'social',
  'wallet',
]);

/** Field names that must never leave the server through the public route. */
const SECRET_FIELD_PATTERN = /secret|private|passw(or)?d|token|service_?account|credential/i;

export function isSecretLikeField(name: string): boolean {
  return SECRET_FIELD_PATTERN.test(name);
}

/** Returns a deep copy with every secret-like field removed, at any depth. */
export function stripSecretFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripSecretFields(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSecretLikeField(k)) continue;
      out[k] = stripSecretFields(v);
    }
    return out as T;
  }
  return value;
}

const SITE_COLOR_DEFAULTS = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  buttonTextColor: '#FFFFFF',
};

function withDefaults(key: string, data: any) {
  if (key === 'site_colors') return { ...SITE_COLOR_DEFAULTS, ...(data || {}) };
  return data || {};
}

type Middleware = (req: any, res: any, next: any) => any;

export function registerSettingsReadRoutes(deps: {
  app: { get: (path: string, ...handlers: any[]) => any };
  getSecureDocument: (collection: string, key: string) => Promise<any>;
  authenticate: Middleware;
  requireRole: (roles: string[]) => Middleware;
}) {
  const { app, getSecureDocument, authenticate, requireRole } = deps;

  app.get('/api/settings/:key', async (req: any, res: any) => {
    const key = String(req.params.key || '');
    if (!PUBLIC_SETTINGS_KEYS.has(key)) return res.status(404).json({ error: 'Not found' });
    try {
      const data = await getSecureDocument('settings', key);
      res.json(stripSecretFields(withDefaults(key, data)));
    } catch {
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  app.get('/api/admin/settings/:key', authenticate, requireRole(['admin']), async (req: any, res: any) => {
    try {
      const data = await getSecureDocument('settings', req.params.key);
      res.json(withDefaults(req.params.key, data));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
