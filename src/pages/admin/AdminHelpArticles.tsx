import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Plus, Pencil, Trash2, Loader2, ExternalLink, X } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

type Draft = { id?: string; title: string; content: string; category: string; tags: string };

const emptyDraft: Draft = { title: '', content: '', category: '', tags: '' };
const inputClass =
  'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function AdminHelpArticles() {
  const [articles, setArticles] = useState<HelpArticle[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/help/articles', { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setArticles(data.articles || []);
    } catch (e: any) {
      setArticles([]);
      setMessage({ kind: 'error', text: e.message || 'Failed to load help articles' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = [...new Set((articles || []).map((a) => a.category).filter(Boolean))].sort();

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        title: draft.title,
        content: draft.content,
        category: draft.category,
        tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch(draft.id ? `/api/admin/help/articles/${encodeURIComponent(draft.id)}` : '/api/admin/help/articles', {
        method: draft.id ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setDraft(null);
      setMessage({ kind: 'ok', text: 'Article saved.' });
      await load();
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: HelpArticle) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/help/articles/${encodeURIComponent(a.id)}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) {
      setMessage({ kind: 'ok', text: 'Article deleted.' });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ kind: 'error', text: data?.error || 'Delete failed' });
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-yellow-500" /> Help Articles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Shown on the public <Link to="/help" className="underline hover:text-yellow-500">Help Centre</Link> and in site search.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setDraft({ ...emptyDraft }); setMessage(null); }}
          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New article
        </button>
      </div>

      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm ${message.kind === 'ok' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {draft && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white">{draft.id ? 'Edit article' : 'New article'}</h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="help-title">Title (the question)</label>
            <input id="help-title" className={inputClass} value={draft.title} maxLength={500} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="help-category">Category</label>
              <input id="help-category" list="help-categories" className={inputClass} value={draft.category} maxLength={255} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              <datalist id="help-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="help-tags">Search tags (comma separated)</label>
              <input id="help-tags" className={inputClass} value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="help-content">Answer (plain text, line breaks are kept)</label>
            <textarea id="help-content" className={`${inputClass} h-48`} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
            <button
              type="button"
              disabled={saving || !draft.title.trim() || !draft.content.trim()}
              onClick={save}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-900 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save article
            </button>
          </div>
        </div>
      )}

      {articles === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No help articles yet.</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
          {articles.map((a) => (
            <div key={a.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">{a.category || 'General'}</div>
                <div className="font-bold text-slate-900 dark:text-white break-words">{a.title}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 break-words">{a.content}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link to={`/help/${a.id}`} target="_blank" title="View" className="p-2 text-slate-400 hover:text-yellow-500"><ExternalLink className="w-4 h-4" /></Link>
                <button type="button" title="Edit" onClick={() => { setDraft({ id: a.id, title: a.title, content: a.content, category: a.category, tags: a.tags.join(', ') }); setMessage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                <button type="button" title="Delete" onClick={() => remove(a)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
