/**
 * Help articles (the existing `knowledge_base` table, also used by site search).
 *
 * Public:  GET /api/help/articles, GET /api/help/articles/:id
 * Admin:   GET/POST /api/admin/help/articles, PUT/DELETE /api/admin/help/articles/:id
 *
 * No schema change: columns are id, title, content, tags (JSON), category, created_at.
 * Content is plain text; the UI renders it as text, never as HTML.
 */

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string | null;
}

export const HELP_LIMITS = { title: 500, category: 255, content: 50000, tags: 20, tag: 50 };

export function normaliseTags(raw: unknown): string[] {
  let v: unknown = raw;
  if (typeof v === 'string') {
    const s = v;
    try { v = JSON.parse(s); } catch { v = s.split(","); }
  }
  if (!Array.isArray(v)) return [];
  return v.map((t) => String(t ?? '').trim()).filter(Boolean);
}

export function toHelpArticle(id: string, d: any): HelpArticle {
  const created = d?.created_at ?? d?.createdAt ?? null;
  return {
    id: String(id),
    title: String(d?.title ?? ''),
    content: String(d?.content ?? ''),
    category: String(d?.category ?? ''),
    tags: normaliseTags(d?.tags),
    createdAt: created ? String(created instanceof Date ? created.toISOString() : created) : null,
  };
}

/** Validates an admin payload. Returns the clean fields or an error message. */
export function validateHelpInput(body: any): { ok: true; value: Omit<HelpArticle, 'id' | 'createdAt'> } | { ok: false; error: string } {
  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const category = String(body?.category ?? '').trim();
  const tags = normaliseTags(body?.tags);
  if (!title) return { ok: false, error: 'Title is required' };
  if (!content) return { ok: false, error: 'Content is required' };
  if (title.length > HELP_LIMITS.title) return { ok: false, error: `Title must be at most ${HELP_LIMITS.title} characters` };
  if (category.length > HELP_LIMITS.category) return { ok: false, error: `Category must be at most ${HELP_LIMITS.category} characters` };
  if (content.length > HELP_LIMITS.content) return { ok: false, error: `Content must be at most ${HELP_LIMITS.content} characters` };
  if (tags.length > HELP_LIMITS.tags) return { ok: false, error: `At most ${HELP_LIMITS.tags} tags` };
  if (tags.some((t) => t.length > HELP_LIMITS.tag)) return { ok: false, error: `Each tag must be at most ${HELP_LIMITS.tag} characters` };
  return { ok: true, value: { title, content, category, tags } };
}

export function sortHelpArticles(list: HelpArticle[]): HelpArticle[] {
  return [...list].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

export function newHelpArticleId(): string {
  return `kb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

type Middleware = (req: any, res: any, next: any) => any;
interface DocRef {
  get: () => Promise<{ exists: boolean; data: () => any }>;
  set: (data: any) => Promise<void>;
  delete: () => Promise<void>;
}

export function registerHelpArticleRoutes(deps: {
  app: any;
  db: { collection: (name: string) => { get: () => Promise<{ docs: { id: string; data: () => any }[] }>; doc: (id: string) => DocRef } };
  authenticate: Middleware;
  requireRole: (roles: string[]) => Middleware;
}) {
  const { app, db, authenticate, requireRole } = deps;
  const coll = () => db.collection('knowledge_base');
  const isValidId = (id: unknown) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,50}$/.test(id);
  const admin = [authenticate, requireRole(['admin'])];

  const listAll = async () => sortHelpArticles((await coll().get()).docs.map((d) => toHelpArticle(d.id, d.data())));

  app.get('/api/help/articles', async (_req: any, res: any) => {
    try {
      res.json({ articles: await listAll() });
    } catch {
      res.status(500).json({ error: 'Failed to load help articles' });
    }
  });

  app.get('/api/help/articles/:id', async (req: any, res: any) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    try {
      const doc = await coll().doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Not found' });
      res.json(toHelpArticle(req.params.id, doc.data()));
    } catch {
      res.status(500).json({ error: 'Failed to load help article' });
    }
  });

  app.get('/api/admin/help/articles', ...admin, async (_req: any, res: any) => {
    try {
      res.json({ articles: await listAll() });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to load help articles' });
    }
  });

  app.post('/api/admin/help/articles', ...admin, async (req: any, res: any) => {
    const v = validateHelpInput(req.body);
    if (v.ok === false) return res.status(400).json({ error: v.error });
    try {
      const id = newHelpArticleId();
      await coll().doc(id).set({ id, ...v.value, tags: JSON.stringify(v.value.tags), created_at: new Date() });
      res.status(201).json({ id, ...v.value });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to create help article' });
    }
  });

  app.put('/api/admin/help/articles/:id', ...admin, async (req: any, res: any) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const v = validateHelpInput(req.body);
    if (v.ok === false) return res.status(400).json({ error: v.error });
    try {
      const ref = coll().doc(req.params.id);
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
      // created_at is left untouched
      await ref.set({ id: req.params.id, ...v.value, tags: JSON.stringify(v.value.tags) });
      res.json({ id: req.params.id, ...v.value });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to update help article' });
    }
  });

  app.delete('/api/admin/help/articles/:id', ...admin, async (req: any, res: any) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    try {
      const ref = coll().doc(req.params.id);
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
      await ref.delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to delete help article' });
    }
  });
}
