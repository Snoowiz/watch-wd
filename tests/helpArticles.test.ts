import express from 'express';
import fs from 'fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { normaliseTags, registerHelpArticleRoutes, validateHelpInput } from '../helpArticles';

function setup(initial: Record<string, any> = {}) {
  const rows: Record<string, any> = { ...initial };
  const db = {
    collection: () => ({
      get: async () => ({ docs: Object.entries(rows).map(([id, d]) => ({ id, data: () => d })) }),
      doc: (id: string) => ({
        get: async () => ({ exists: id in rows, data: () => rows[id] }),
        set: async (d: any) => { rows[id] = { ...(rows[id] || {}), ...d }; },
        delete: async () => { delete rows[id]; },
      }),
    }),
  };
  const app = express();
  app.use(express.json());
  registerHelpArticleRoutes({
    app,
    db,
    authenticate: (req: any, res: any, next: any) => {
      if (!req.headers['x-role']) return res.status(401).json({});
      req.user = { role: req.headers['x-role'] };
      next();
    },
    requireRole: (roles) => (req: any, res: any, next: any) => (roles.includes(req.user.role) ? next() : res.status(403).json({})),
  });
  app.use('/api', (_req, res) => res.json({ success: true })); // mirrors server.ts catch-all
  return { app, rows };
}

const kb5 = { title: 'What is the refund policy?', content: 'Contact support.', category: 'Billing & Wallet', tags: '["refund","policy"]', created_at: '2026-01-01' };
const article = { title: 'How do I watch?', content: 'Open the event.\nPress play.', category: 'Streaming', tags: ['watch', 'play'] };

describe('help article routes', () => {
  it('lists and reads articles publicly, normalising tags', async () => {
    const { app } = setup({ kb5 });
    const list = await request(app).get('/api/help/articles');
    expect(list.status).toBe(200);
    expect(list.body.articles).toEqual([expect.objectContaining({ id: 'kb5', title: kb5.title, tags: ['refund', 'policy'] })]);
    expect((await request(app).get('/api/help/articles/kb5')).body.title).toBe(kb5.title);
    expect((await request(app).get('/api/help/articles/missing')).status).toBe(404);
    expect((await request(app).get('/api/help/articles/bad%20id!')).status).toBe(404);
  });

  it('restricts every write and the admin list to admins', async () => {
    const { app, rows } = setup({ kb5 });
    const calls = [
      () => request(app).get('/api/admin/help/articles'),
      () => request(app).post('/api/admin/help/articles').send(article),
      () => request(app).put('/api/admin/help/articles/kb5').send(article),
      () => request(app).delete('/api/admin/help/articles/kb5'),
    ];
    for (const call of calls) {
      expect((await call()).status).toBe(401);
      for (const role of ['user', 'partner', 'creator']) expect((await call().set('x-role', role)).status).toBe(403);
    }
    expect(rows).toEqual({ kb5 });
  });

  it('lets an admin create, edit and delete', async () => {
    const { app, rows } = setup({ kb5 });
    const created = await request(app).post('/api/admin/help/articles').set('x-role', 'admin').send(article);
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(rows[id]).toMatchObject({ title: article.title, tags: '["watch","play"]' });

    const edited = await request(app).put('/api/admin/help/articles/kb5').set('x-role', 'admin').send({ ...kb5, tags: ['refund'], content: 'New text' });
    expect(edited.status).toBe(200);
    expect(rows.kb5.content).toBe('New text');
    expect(rows.kb5.created_at).toBe('2026-01-01');

    expect((await request(app).put('/api/admin/help/articles/nope').set('x-role', 'admin').send(article)).status).toBe(404);
    expect((await request(app).delete(`/api/admin/help/articles/${id}`).set('x-role', 'admin')).status).toBe(200);
    expect(rows[id]).toBeUndefined();
  });

  it('rejects invalid input without writing', async () => {
    const { app, rows } = setup();
    for (const bad of [{}, { title: 'x' }, { content: 'x' }, { title: 'x'.repeat(501), content: 'y' }, { ...article, tags: Array(21).fill('t') }]) {
      expect((await request(app).post('/api/admin/help/articles').set('x-role', 'admin').send(bad)).status).toBe(400);
    }
    expect(rows).toEqual({});
  });
});

describe('helpers', () => {
  it('normalises tags from arrays, JSON strings and CSV', () => {
    expect(normaliseTags(['a', ' b ', ''])).toEqual(['a', 'b']);
    expect(normaliseTags('["a","b"]')).toEqual(['a', 'b']);
    expect(normaliseTags('a, b')).toEqual(['a', 'b']);
    expect(normaliseTags(null)).toEqual([]);
  });
  it('trims and validates', () => {
    expect(validateHelpInput({ title: ' T ', content: ' C ', category: ' K ', tags: 'x,y' })).toEqual({ ok: true, value: { title: 'T', content: 'C', category: 'K', tags: ['x', 'y'] } });
  });
});

describe('server wiring', () => {
  const src = fs.readFileSync('server.ts', 'utf8');
  it('registers the help routes before the /api catch-all', () => {
    const reg = src.indexOf('registerHelpArticleRoutes({ app, db, authenticate, requireRole })');
    expect(reg).toBeGreaterThan(0);
    expect(reg).toBeLessThan(src.indexOf("app.use('/api', (req, res) => res.json({ success: true }));"));
  });
});
