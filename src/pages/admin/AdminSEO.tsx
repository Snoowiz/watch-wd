import React, { useState, useEffect } from 'react';
import { useSettingsStore, PerPageSEOConfig } from '../../store';
import {
  Globe, Search, FileText, CheckCircle2, AlertCircle, ExternalLink, RefreshCw,
  Plus, Edit3, Trash2, Shield, Share2, Code, Eye, Save, Info, Zap, Sparkles, Check, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AdminSEO() {
  const { seoSettings, setSeoSettings, perPageSeo, setPerPageSeo, fetchPerPageSeo, platformName } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'global' | 'pages' | 'sitemap' | 'verifications' | 'schema' | 'social'>('global');
  const [formData, setFormData] = useState({ ...seoSettings });
  const [perPages, setPerPages] = useState<PerPageSEOConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ping state
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ google: boolean; bing: boolean; message: string } | null>(null);

  // Modal for editing/adding per-page SEO
  const [editingPage, setEditingPage] = useState<Partial<PerPageSEOConfig> | null>(null);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);

  // JSON-LD Copy feedback
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    setFormData({ ...seoSettings });
  }, [seoSettings]);

  useEffect(() => {
    fetchPerPageSeo();
  }, []);

  useEffect(() => {
    setPerPages(perPageSeo || []);
  }, [perPageSeo]);

  const handleGlobalChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveGlobal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      setSeoSettings(formData);
      setSaveMessage('Global SEO settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePingSitemap = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/seo/ping-sitemap', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setPingResult({
          google: data.results?.google?.success || false,
          bing: data.results?.bing?.success || false,
          message: data.message || 'Sitemap ping request dispatched!'
        });
      } else {
        setPingResult({ google: false, bing: false, message: data.error || 'Ping failed' });
      }
    } catch (err: any) {
      setPingResult({ google: false, bing: false, message: err.message || 'Network error' });
    } finally {
      setIsPinging(false);
    }
  };

  const handleOpenNewPageModal = () => {
    setEditingPage({
      id: `page-${Date.now()}`,
      path: '/',
      title: '',
      description: '',
      keywords: '',
      ogImage: '',
      canonicalUrl: '',
      noIndex: false,
      noFollow: false,
      jsonLdSchema: ''
    });
    setIsPageModalOpen(true);
  };

  const handleEditPage = (page: PerPageSEOConfig) => {
    setEditingPage({ ...page });
    setIsPageModalOpen(true);
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page SEO configuration?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seo/per-page/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = perPages.filter(p => p.id !== id);
        setPerPages(updated);
        setPerPageSeo(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePageModal = async () => {
    if (!editingPage || !editingPage.path) return;
    const pageToSave: PerPageSEOConfig = {
      id: editingPage.id || `page-${Date.now()}`,
      path: editingPage.path.startsWith('/') ? editingPage.path : `/${editingPage.path}`,
      title: editingPage.title || '',
      description: editingPage.description || '',
      keywords: editingPage.keywords || '',
      ogImage: editingPage.ogImage || '',
      canonicalUrl: editingPage.canonicalUrl || '',
      noIndex: !!editingPage.noIndex,
      noFollow: !!editingPage.noFollow,
      jsonLdSchema: editingPage.jsonLdSchema || ''
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/seo/per-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pageToSave)
      });
      if (res.ok) {
        const saved = await res.json();
        const existingIdx = perPages.findIndex(p => p.id === saved.id || p.path === saved.path);
        let updated: PerPageSEOConfig[];
        if (existingIdx >= 0) {
          updated = [...perPages];
          updated[existingIdx] = saved;
        } else {
          updated = [...perPages, saved];
        }
        setPerPages(updated);
        setPerPageSeo(updated);
        setIsPageModalOpen(false);
        setEditingPage(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Organization JSON-LD preview
  const orgJsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': formData.organizationType || 'Organization',
      'name': formData.organizationName || platformName,
      'url': formData.canonicalBaseUrl || window.location.origin,
      'logo': formData.organizationLogo || `${window.location.origin}/logo.png`,
      'sameAs': [
        formData.twitterHandle ? `https://x.com/${formData.twitterHandle.replace('@', '')}` : null
      ].filter(Boolean)
    },
    null,
    2
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Advanced SEO & Discovery Center
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Search Engine Optimization</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Configure global metadata, per-page overrides, sitemap parameters, search engine webmaster verifications, and structured JSON-LD schemas.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-indigo-400" /> View Sitemap
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-700 transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-400" /> View Robots.txt
            </a>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{saveMessage}</span>
          </motion.div>
        )}
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{saveError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'global' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Globe className="w-4 h-4" /> Global Meta & Defaults
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'pages' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <FileText className="w-4 h-4" /> Per-Page SEO Manager
        </button>
        <button
          onClick={() => setActiveTab('sitemap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'sitemap' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <RefreshCw className="w-4 h-4" /> Sitemap & Robots.txt
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'verifications' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Shield className="w-4 h-4" /> Verifications & Analytics
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'schema' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Code className="w-4 h-4" /> Schema & Structured Data
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'social' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Share2 className="w-4 h-4" /> Social Cards & OG
        </button>
      </div>

      {/* TAB 1: GLOBAL META & DEFAULTS */}
      {activeTab === 'global' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" /> Default Meta Tags
            </h2>

            <div className="grid grid-cols-1 gap-6">
              {/* Meta Title */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Default Meta Title
                  </label>
                  <span className={`text-xs font-mono font-semibold ${(formData.metaTitle || '').length > 60 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {(formData.metaTitle || '').length} / 60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.metaTitle || ''}
                  onChange={e => handleGlobalChange('metaTitle', e.target.value)}
                  placeholder="Watch WDS - Live Sports Streaming"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Appears in browser tabs and search result headings. Recommended length: 50–60 characters.
                </p>
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Default Meta Description
                  </label>
                  <span className={`text-xs font-mono font-semibold ${(formData.metaDescription || '').length > 160 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {(formData.metaDescription || '').length} / 160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={formData.metaDescription || ''}
                  onChange={e => handleGlobalChange('metaDescription', e.target.value)}
                  placeholder="Watch live sports, follow your favorite creators, and join the community."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Concise summary displayed below the search result title. Recommended length: 150–160 characters.
                </p>
              </div>

              {/* Meta Keywords */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Keywords
                </label>
                <input
                  type="text"
                  value={formData.metaKeywords || ''}
                  onChange={e => handleGlobalChange('metaKeywords', e.target.value)}
                  placeholder="sports, streaming, live matches, community, watchwds"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Canonical Base URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Canonical Base URL
                </label>
                <input
                  type="url"
                  value={formData.canonicalBaseUrl || ''}
                  onChange={e => handleGlobalChange('canonicalBaseUrl', e.target.value)}
                  placeholder="https://watchwds.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Prevents duplicate content penalties by specifying the preferred URL prefix.
                </p>
              </div>

              {/* Global Indexing Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Search Engine Indexing</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Allow search engines like Google and Bing to index your site pages.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowIndexing !== false}
                    onChange={e => handleGlobalChange('allowIndexing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Custom Head HTML */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom &lt;head&gt; HTML Snippets
                </label>
                <textarea
                  rows={4}
                  value={formData.customHeadHtml || ''}
                  onChange={e => handleGlobalChange('customHeadHtml', e.target.value)}
                  placeholder="<!-- Additional custom tags, tracking pixels, or meta tags -->"
                  className="w-full bg-slate-900 text-emerald-400 font-mono border border-slate-700 rounded-xl p-4 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Search Result Snippet Live Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" /> Google Search Result Preview
            </h3>
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl font-sans">
              <div className="text-xs text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-[10px] font-bold">G</span>
                <span>{formData.canonicalBaseUrl || 'https://watchwds.com'}</span>
                <span className="text-slate-400">›</span>
              </div>
              <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mt-1 truncate">
                {formData.metaTitle || 'Watch WDS - Live Sports Streaming'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {formData.metaDescription || 'Watch live sports, follow your favorite creators, and join the community.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Global Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PER-PAGE SEO MANAGER */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Per-Page Meta Overrides
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Customize title, description, robots directives, and canonical URLs for specific site paths.
              </p>
            </div>
            <button
              onClick={handleOpenNewPageModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Page Configuration
            </button>
          </div>

          {/* Pages Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">URL Path</th>
                    <th className="px-6 py-4">Meta Title</th>
                    <th className="px-6 py-4">Robots</th>
                    <th className="px-6 py-4">Structured Data</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                  {perPages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No custom per-page SEO configurations added yet. Click <strong>Add Page Configuration</strong> above to create one.
                      </td>
                    </tr>
                  ) : (
                    perPages.map(page => (
                      <tr key={page.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {page.path}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white max-w-xs truncate">
                          {page.title || <span className="text-slate-400 italic">Global Fallback</span>}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {page.noIndex ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-500 border border-red-500/20">
                              NoIndex
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Index
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {page.jsonLdSchema ? (
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <Code className="w-3.5 h-3.5" /> JSON-LD Ready
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditPage(page)}
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePage(page.id)}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SITEMAP & ROBOTS.TXT */}
      {activeTab === 'sitemap' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveGlobal} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500" /> XML Sitemap Settings
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your dynamic sitemap is automatically served at <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-indigo-500 underline font-mono">/sitemap.xml</a>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePingSitemap}
                  disabled={isPinging}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors shadow-sm disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
                  Ping Search Consoles Now
                </button>
              </div>

              {pingResult && (
                <div className={`p-4 rounded-xl text-xs font-semibold border ${pingResult.google || pingResult.bing ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                  {pingResult.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Default Sitemap Change Frequency
                  </label>
                  <select
                    value={formData.sitemapChangeFreq || 'daily'}
                    onChange={e => handleGlobalChange('sitemapChangeFreq', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                  >
                    <option value="always">Always</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Default Sitemap Priority
                  </label>
                  <select
                    value={formData.sitemapPriority || '0.8'}
                    onChange={e => handleGlobalChange('sitemapPriority', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                  >
                    <option value="1.0">1.0 (Highest Priority)</option>
                    <option value="0.9">0.9</option>
                    <option value="0.8">0.8 (High Priority)</option>
                    <option value="0.7">0.7</option>
                    <option value="0.6">0.6</option>
                    <option value="0.5">0.5 (Default Priority)</option>
                  </select>
                </div>
              </div>

              {/* Robots.txt Configuration */}
              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Custom robots.txt Content
                  </label>
                  <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-xs text-indigo-500 font-semibold hover:underline flex items-center gap-1">
                    Preview Live <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <textarea
                  rows={6}
                  value={formData.robotsTxt || 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml'}
                  onChange={e => handleGlobalChange('robotsTxt', e.target.value)}
                  className="w-full bg-slate-900 text-emerald-400 font-mono border border-slate-700 rounded-xl p-4 text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Directives instructing search engine crawlers on which paths to index or ignore.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Sitemap & Robots Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: VERIFICATIONS & ANALYTICS */}
      {activeTab === 'verifications' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" /> Search Console & Webmaster Verification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Google Search Console */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Google Search Console Code
                  </label>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1 font-semibold">
                    Google Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={formData.googleVerification || ''}
                  onChange={e => handleGlobalChange('googleVerification', e.target.value)}
                  placeholder="google-site-verification meta code"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Bing Webmaster */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Bing Webmaster Code
                  </label>
                  <a href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1 font-semibold">
                    Bing Webmaster <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={formData.bingVerification || ''}
                  onChange={e => handleGlobalChange('bingVerification', e.target.value)}
                  placeholder="msvalidate.01 meta code"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Yandex Webmaster */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Yandex Verification Code
                </label>
                <input
                  type="text"
                  value={formData.yandexVerification || ''}
                  onChange={e => handleGlobalChange('yandexVerification', e.target.value)}
                  placeholder="yandex-verification meta code"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Pinterest Verification */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Pinterest Domain Verification
                </label>
                <input
                  type="text"
                  value={formData.pinterestVerification || ''}
                  onChange={e => handleGlobalChange('pinterestVerification', e.target.value)}
                  placeholder="p:domain_verify meta code"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Analytics Integrations */}
            <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6 space-y-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Analytics & Tracking Tags
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Google Analytics ID (GA4)
                  </label>
                  <input
                    type="text"
                    value={formData.googleAnalyticsId || ''}
                    onChange={e => handleGlobalChange('googleAnalyticsId', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Google Tag Manager ID (GTM)
                  </label>
                  <input
                    type="text"
                    value={formData.googleTagManagerId || ''}
                    onChange={e => handleGlobalChange('googleTagManagerId', e.target.value)}
                    placeholder="GTM-XXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Verifications
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: SCHEMA & STRUCTURED DATA */}
      {activeTab === 'schema' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-500" /> Organization Schema Markup (JSON-LD)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.organizationName || ''}
                  onChange={e => handleGlobalChange('organizationName', e.target.value)}
                  placeholder={platformName}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Organization Type
                </label>
                <select
                  value={formData.organizationType || 'Organization'}
                  onChange={e => handleGlobalChange('organizationType', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                >
                  <option value="Organization">Organization</option>
                  <option value="SportsOrganization">Sports Organization</option>
                  <option value="Corporation">Corporation</option>
                  <option value="EducationalOrganization">Educational Organization</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Organization Logo URL
                </label>
                <input
                  type="text"
                  value={formData.organizationLogo || ''}
                  onChange={e => handleGlobalChange('organizationLogo', e.target.value)}
                  placeholder="https://watchwds.com/logo.png"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Generated JSON-LD Preview */}
            <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Generated JSON-LD Output
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(orgJsonLd);
                      setCopiedSchema(true);
                      setTimeout(() => setCopiedSchema(false), 2000);
                    }}
                    className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSchema ? 'Copied!' : 'Copy Code'}
                  </button>
                  <a
                    href="https://validator.schema.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Validate Schema <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-700">
                {orgJsonLd}
              </pre>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Schema Config
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: SOCIAL CARDS & OG */}
      {activeTab === 'social' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-500" /> OpenGraph & Twitter Meta
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  OpenGraph Title (og:title)
                </label>
                <input
                  type="text"
                  value={formData.ogTitle || ''}
                  onChange={e => handleGlobalChange('ogTitle', e.target.value)}
                  placeholder="Watch WDS"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Twitter Handle
                </label>
                <input
                  type="text"
                  value={formData.twitterHandle || ''}
                  onChange={e => handleGlobalChange('twitterHandle', e.target.value)}
                  placeholder="@watchwds"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  OpenGraph Description (og:description)
                </label>
                <textarea
                  rows={2}
                  value={formData.ogDescription || ''}
                  onChange={e => handleGlobalChange('ogDescription', e.target.value)}
                  placeholder="Experience the best live sports streaming platform."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Default OpenGraph Share Image URL
                </label>
                <input
                  type="text"
                  value={formData.ogImage || ''}
                  onChange={e => handleGlobalChange('ogImage', e.target.value)}
                  placeholder="https://watchwds.com/og-banner.jpg"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Social Card Preview */}
            <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" /> Twitter / Social Card Preview
              </h3>

              <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
                <div className="h-44 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                  {formData.ogImage ? (
                    <img src={formData.ogImage} alt="OG Card Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Share2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-mono">No OG Image specified</p>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">watchwds.com</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {formData.ogTitle || formData.metaTitle || 'Watch WDS'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {formData.ogDescription || formData.metaDescription || 'Live sports streaming'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Social Meta Settings
            </button>
          </div>
        </form>
      )}

      {/* EDIT PAGE MODAL */}
      {isPageModalOpen && editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {editingPage.id && perPages.some(p => p.id === editingPage.id) ? 'Edit Page SEO' : 'New Page SEO'}
              </h2>
              <button
                onClick={() => { setIsPageModalOpen(false); setEditingPage(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  URL Path (e.g. /matches or /plans)
                </label>
                <input
                  type="text"
                  value={editingPage.path || ''}
                  onChange={e => setEditingPage({ ...editingPage, path: e.target.value })}
                  placeholder="/matches"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Page Meta Title
                </label>
                <input
                  type="text"
                  value={editingPage.title || ''}
                  onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                  placeholder="Live Matches | Watch WDS"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Page Meta Description
                </label>
                <textarea
                  rows={3}
                  value={editingPage.description || ''}
                  onChange={e => setEditingPage({ ...editingPage, description: e.target.value })}
                  placeholder="Browse and watch upcoming live sports matches."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Canonical URL Override
                </label>
                <input
                  type="text"
                  value={editingPage.canonicalUrl || ''}
                  onChange={e => setEditingPage({ ...editingPage, canonicalUrl: e.target.value })}
                  placeholder="https://watchwds.com/matches"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingPage.noIndex}
                    onChange={e => setEditingPage({ ...editingPage, noIndex: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  NoIndex (Hide from Search Engines)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingPage.noFollow}
                    onChange={e => setEditingPage({ ...editingPage, noFollow: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  NoFollow (Do not follow links)
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Page Specific JSON-LD Schema
                </label>
                <textarea
                  rows={4}
                  value={editingPage.jsonLdSchema || ''}
                  onChange={e => setEditingPage({ ...editingPage, jsonLdSchema: e.target.value })}
                  placeholder='{"@context":"https://schema.org","@type":"WebPage","name":"Matches"}'
                  className="w-full bg-slate-900 text-emerald-400 font-mono border border-slate-700 rounded-xl p-3 text-xs"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setIsPageModalOpen(false); setEditingPage(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePageModal}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                Save Page Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
