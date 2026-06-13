import React, { useEffect, useState } from 'react';
import { 
  Database, RefreshCw, Layers, ShieldAlert, Cpu, Zap, HardDrive, 
  Trash2, AlertCircle, CheckCircle, Clock, Settings, Sparkles, BarChart2
} from 'lucide-react';
import { useSettingsStore, useThemeStore } from '../../store';

interface LayerMetrics {
  hits: number;
  misses: number;
  staleServes: number;
  totalRequests: number;
}

interface LayerMemory {
  bytes: number;
  sizeStr: string;
  keysCount: number;
}

interface CacheStatsResponse {
  metrics: {
    database: LayerMetrics;
    fragment: LayerMetrics;
    cdn: LayerMetrics;
  };
  memory: {
    layers: {
      database: LayerMemory;
      fragment: LayerMemory;
      cdn: LayerMemory;
    };
    process: {
      rss: string;
      heapUsed: string;
    };
  };
  events: Array<{
    id: string;
    timestamp: string;
    event: string;
    details: string;
    layer: 'database' | 'fragment' | 'cdn' | 'general';
  }>;
  ttls: {
    database: number;
    fragment: number;
    cdn: number;
  };
}

export function CacheManagement() {
  const { isDarkMode } = useThemeStore();
  const [stats, setStats] = useState<CacheStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [flushing, setFlushing] = useState<string | null>(null);
  const [ttlSettings, setTtlSettings] = useState({
    database: 15,
    fragment: 30,
    cdn: 60
  });
  const [updatingTtls, setUpdatingTtls] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/cache/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: CacheStatsResponse = await res.json();
        setStats(data);
        setTtlSettings(data.ttls);
      } else {
        setErrorMsg('Failed to fetch cache metrics.');
      }
    } catch (err) {
      setErrorMsg('Network error when loading cache stats.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh stats every 3 seconds to show live telemetry
    const timer = setInterval(() => {
      fetchStats(true);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleFlush = async (layer: 'database' | 'fragment' | 'cdn' | 'all') => {
    setFlushing(layer);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/cache/flush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ layer })
      });
      if (res.ok) {
        setSuccessMsg(`Successfully flushed the ${layer} cache(s)!`);
        setTimeout(() => setSuccessMsg(null), 3000);
        await fetchStats(true);
      } else {
        setErrorMsg('Failed to flush cache.');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg('Network error when flushing cache.');
    } finally {
      setFlushing(null);
    }
  };

  const handleWarmCaches = async () => {
    setWarming(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/cache/warm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSuccessMsg('Manual cache warming completed successfully! Critical paths updated.');
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchStats(true);
      } else {
        setErrorMsg('Failed to warm caches.');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg('Network error triggered during cache warming.');
    } finally {
      setWarming(false);
    }
  };

  const handleUpdateTtls = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingTtls(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/cache/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ttlSettings)
      });
      if (res.ok) {
        setSuccessMsg('TTLs configured successfully. Live database caches refreshed.');
        setTimeout(() => setSuccessMsg(null), 3000);
        await fetchStats(true);
      } else {
        setErrorMsg('Failed to update settings.');
      }
    } catch (err) {
      setErrorMsg('Network error saving custom TTL settings.');
    } finally {
      setUpdatingTtls(false);
    }
  };

  const calculateHitRate = (layer: LayerMetrics) => {
    if (layer.totalRequests === 0) return 0;
    return Math.round((layer.hits / layer.totalRequests) * 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <RefreshCw className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Analyzing Multi-layer Caching Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            Performance & Multi-Layer Cache Panel
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time visual tuning, monitoring, warming, and invalidation for WatchWDS static and dynamic APIs.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleWarmCaches}
            disabled={warming}
            className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 font-bold py-2.5 px-4 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${warming ? 'animate-pulse text-yellow-500' : ''}`} />
            {warming ? 'Warming Paths...' : 'Warm Critical Caches'}
          </button>
          <button
            onClick={() => handleFlush('all')}
            disabled={flushing !== null}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all hover:scale-[1.01] shadow-sm shadow-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Purge All Caches
          </button>
        </div>
      </div>

      {/* Notifications bar */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 transition-opacity">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-500/30 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 transition-opacity">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Grid: 3 Caching Layers Performance Card Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEVEL 1: DATABASE CACHE */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg">
                LEVEL 1
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Query Caching</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Intercepts SQLite lookups and processes in-memory documents. Auto-invalidates on any table mutations.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Hit Rate</span>
                <span className="text-sm font-bold">{stats ? calculateHitRate(stats.metrics.database) : 0}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Total Keys Cached</span>
                <span className="text-sm font-bold font-mono">{stats?.memory.layers.database.keysCount ?? 0}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Estimated Cache Size</span>
                <span className="text-sm font-bold font-mono">{stats?.memory.layers.database.sizeStr ?? '0 B'}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Hits / Misses</span>
                <span className="text-sm font-bold font-mono text-slate-600 dark:text-slate-400">
                  {stats?.metrics.database.hits ?? 0}h / {stats?.metrics.database.misses ?? 0}m
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleFlush('database')}
            disabled={flushing === 'database'}
            className="w-full mt-6 bg-slate-50 hover:bg-slate-150 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-750 dark:text-white font-bold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-650 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${flushing === 'database' ? 'animate-spin' : ''}`} />
            Flush Database Queries
          </button>
        </div>

        {/* LEVEL 2: API FRAGMENT CACHE */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                LEVEL 2
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Page & Fragment API</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Caches full JSON response bodies on critical API routes like plans, matches, and features.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Hit Rate</span>
                <span className="text-sm font-bold">{stats ? calculateHitRate(stats.metrics.fragment) : 0}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Active Handlers</span>
                <span className="text-sm font-bold font-mono">{stats?.memory.layers.fragment.keysCount ?? 0}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Estimated Cache Size</span>
                <span className="text-sm font-bold font-mono">{stats?.memory.layers.fragment.sizeStr ?? '0 B'}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Hits / Misses</span>
                <span className="text-sm font-bold font-mono text-slate-600 dark:text-slate-400">
                  {stats?.metrics.fragment.hits ?? 0}h / {stats?.metrics.fragment.misses ?? 0}m
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleFlush('fragment')}
            disabled={flushing === 'fragment'}
            className="w-full mt-6 bg-slate-50 hover:bg-slate-150 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-755 dark:text-white font-bold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-650 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${flushing === 'fragment' ? 'animate-spin' : ''}`} />
            Flush API Fragments
          </button>
        </div>

        {/* LEVEL 3: CDN CACHE SIMULATION */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-lg">
                LEVEL 3
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold">CDN Edge Sim Proxy</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Fulfills Cache-Control headers, simulates s-maxage dynamic pops and stale-while-revalidate background fetches.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Hit Rate</span>
                <span className="text-sm font-bold">{stats ? calculateHitRate(stats.metrics.cdn) : 0}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">POP Regional Nodes</span>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">1 Online (London)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Stale edge revalidates</span>
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 font-mono">
                  {stats?.metrics.cdn.staleServes ?? 0}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Estimated Cache Size</span>
                <span className="text-sm font-bold font-mono">{stats?.memory.layers.cdn.sizeStr ?? '0 B'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleFlush('cdn')}
            disabled={flushing === 'cdn'}
            className="w-full mt-6 bg-slate-50 hover:bg-slate-150 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-755 dark:text-white font-bold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-650 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${flushing === 'cdn' ? 'animate-spin' : ''}`} />
            Purge Edge Simulator
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TTL CONFIG PANEL */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            Tune Cache Layer TTLs
          </h2>
          <form onSubmit={handleUpdateTtls} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Database TTL (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="3600"
                value={ttlSettings.database}
                onChange={(e) => setTtlSettings({ ...ttlSettings, database: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-colors"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Toggles MemCache duration of SQLite rows.</span>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                API Fragment TTL (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="3600"
                value={ttlSettings.fragment}
                onChange={(e) => setTtlSettings({ ...ttlSettings, fragment: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-colors"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Toggles origin server page caching.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                CDN Edge TTL (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="86400"
                value={ttlSettings.cdn}
                onChange={(e) => setTtlSettings({ ...ttlSettings, cdn: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-colors"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Sets max-age in headers to CDNs.</span>
            </div>

            <button
              type="submit"
              disabled={updatingTtls}
              className="w-full mt-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <HardDrive className="w-4 h-4" />
              {updatingTtls ? 'Saving Changes...' : 'Save TTL Durations'}
            </button>
          </form>

          {stats?.memory && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-700/80 pt-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Overall Container RAM
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Process RSS</div>
                  <div className="text-base font-black font-mono mt-1 text-slate-700 dark:text-slate-300">
                    {stats.memory.process.rss}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">V8 Heap Used</div>
                  <div className="text-base font-black font-mono mt-1 text-slate-700 dark:text-slate-300">
                    {stats.memory.process.heapUsed}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RECENT EVENTS & Purges AUDIT LOGS */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col h-[520px]">
          <h2 className="text-lg font-bold mb-4 flex items-center justify-between border-b border-slate-150 dark:border-slate-700 pb-3">
            <span className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              Real-time Cache Activity Audit
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 py-1 px-2.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              Live Stream
            </span>
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {stats && stats.events.length > 0 ? (
              stats.events.map((event) => {
                let badgeStyle = "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400";
                if (event.layer === 'database') badgeStyle = "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400";
                if (event.layer === 'fragment') badgeStyle = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400";
                if (event.layer === 'cdn') badgeStyle = "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400";

                return (
                  <div key={event.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3 transition-colors hover:border-slate-200 dark:hover:border-slate-700">
                    <span className="text-slate-400 mt-0.5"><Clock className="w-3.5 h-3.5" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate pr-2">
                          {event.event}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest font-mono text-slate-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono break-all leading-relaxed">
                        {event.details}
                      </p>
                      <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md ${badgeStyle}`}>
                        {event.layer.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <ShieldAlert className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-medium">No real-time cache activities recorded yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
