import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500';

export function HelpCenter() {
  const { id: openId } = useParams();
  const [articles, setArticles] = useState<HelpArticle[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(openId || null);

  useEffect(() => {
    fetch('/api/help/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setArticles(Array.isArray(d?.articles) ? d.articles : []))
      .catch(() => { setError(true); setArticles([]); });
  }, []);

  useEffect(() => {
    if (!openId || !articles) return;
    setOpen(openId);
    document.getElementById(`help-${openId}`)?.scrollIntoView({ block: 'center' });
  }, [openId, articles]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (articles || []).filter((a) =>
      !q || [a.title, a.content, a.category, ...(a.tags || [])].some((s) => s.toLowerCase().includes(q)),
    );
    const map = new Map<string, HelpArticle[]>();
    for (const a of list) {
      const key = a.category || 'General';
      map.set(key, [...(map.get(key) || []), a]);
    }
    return [...map.entries()];
  }, [articles, query]);

  return (
    <div className="max-w-3xl mx-auto px-0 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center gap-3 mb-2">
        <HelpCircle className="w-8 h-8 text-yellow-500" aria-hidden="true" />
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Help Centre</h1>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Answers to common questions.</p>

      <label className="relative block mb-8">
        <span className="sr-only">Search help articles</span>
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles"
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </label>

      {articles === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Help articles could not be loaded. Please try again later.</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{query ? 'No articles match your search.' : 'No help articles yet.'}</p>
      ) : (
        <div className="space-y-8">
          {groups.map(([category, list]) => (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <h2 id={`cat-${category}`} className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {category}
              </h2>
              <div className="space-y-2">
                {list.map((a) => {
                  const isOpen = open === a.id;
                  return (
                    <div key={a.id} id={`help-${a.id}`} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`help-body-${a.id}`}
                        onClick={() => setOpen(isOpen ? null : a.id)}
                        className={`w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left rounded-2xl ${focusRing}`}
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{a.title}</span>
                        <ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <div id={`help-body-${a.id}`} className="px-4 sm:px-5 pb-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
                          {a.content}
                          <div className="mt-3">
                            <Link to={`/help/${a.id}`} className={`text-xs text-slate-500 dark:text-slate-400 hover:text-yellow-500 rounded ${focusRing}`}>
                              Link to this article
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
