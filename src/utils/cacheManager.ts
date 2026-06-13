/**
 * Multi-layer Caching Engine for WDSportz
 * Implements Query Caching, API Fragment Caching, CDN Proxy Simulation, Cache Invalidation,
 * Cache Warming, and Real-time Monitoring.
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  staleAt?: number; // For stale-while-revalidate
  layer: 'database' | 'fragment' | 'cdn';
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  staleServes: number;
  totalRequests: number;
}

export interface CacheEvent {
  id: string;
  timestamp: string;
  event: string;
  details: string;
  layer: 'database' | 'fragment' | 'cdn' | 'general';
}

// Configurable TTLs (in seconds)
export const DEFAULT_TTLS = {
  database: 15,
  fragment: 30,
  cdn: 60,
};

// Global Cache Store State
class CacheManager {
  private dbCache = new Map<string, CacheEntry>();
  private fragmentCache = new Map<string, CacheEntry>();
  private cdnCache = new Map<string, CacheEntry>();

  // TTL Settings
  public ttls = { ...DEFAULT_TTLS };

  // Metrics
  public metrics: Record<'database' | 'fragment' | 'cdn', CacheMetrics> = {
    database: { hits: 0, misses: 0, staleServes: 0, totalRequests: 0 },
    fragment: { hits: 0, misses: 0, staleServes: 0, totalRequests: 0 },
    cdn: { hits: 0, misses: 0, staleServes: 0, totalRequests: 0 },
  };

  // Recent events log (capped at 50)
  public events: CacheEvent[] = [];

  constructor() {
    this.logEvent('System Init', 'Initialized Multi-layer Caching Engine with baseline TTLs', 'general');
  }

  // --- LOGGING ---
  public logEvent(event: string, details: string, layer: 'database' | 'fragment' | 'cdn' | 'general' = 'general') {
    const id = Math.random().toString(36).substring(2, 9);
    const newEvent: CacheEvent = {
      id,
      timestamp: new Date().toISOString(),
      event,
      details,
      layer,
    };
    this.events.unshift(newEvent);
    if (this.events.length > 50) {
      this.events.pop();
    }
    console.log(`[CacheManager] [${layer.toUpperCase()}] ${event}: ${details}`);
  }

  // --- GETTERS & SETTERS ---
  public get(layer: 'database' | 'fragment' | 'cdn', key: string): any | null {
    const store = this.getStore(layer);
    this.metrics[layer].totalRequests++;

    if (!store.has(key)) {
      this.metrics[layer].misses++;
      return null;
    }

    const entry = store.get(key)!;
    const now = Date.now();

    // Check expiration
    if (now > entry.expiresAt) {
      // Check if we can work in a stale-while-revalidate mode (Dynamic serve of stale content)
      if (layer === 'cdn' && entry.staleAt && now <= entry.staleAt) {
        this.metrics[layer].staleServes++;
        this.metrics[layer].hits++;
        this.logEvent('Stale Serve', `Serving stale-while-revalidate cache for key: ${key}`, layer);
        return { value: entry.value, stale: true };
      }

      // Expired!
      store.delete(key);
      this.metrics[layer].misses++;
      this.logEvent('Cache Expired', `Key expired: ${key}`, layer);
      return null;
    }

    this.metrics[layer].hits++;
    // If cdn, maybe return with stale: false
    return layer === 'cdn' ? { value: entry.value, stale: false } : entry.value;
  }

  public set(layer: 'database' | 'fragment' | 'cdn', key: string, value: any, customTtl?: number) {
    const store = this.getStore(layer);
    const ttlSeconds = customTtl !== undefined ? customTtl : this.ttls[layer];
    const now = Date.now();
    
    // Calculate expires and stale windows
    const expiresAt = now + (ttlSeconds * 1000);
    const staleAt = layer === 'cdn' ? expiresAt + (30 * 1000) : undefined; // 30s stale window for CDN

    store.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt,
      staleAt,
      layer,
    });

    this.logEvent('Cache Write', `Written key: ${key} (TTL: ${ttlSeconds}s)`, layer);
  }

  // --- FLUSH OPERATIONS ---
  public flush(layer: 'database' | 'fragment' | 'cdn' | 'all') {
    if (layer === 'all') {
      this.dbCache.clear();
      this.fragmentCache.clear();
      this.cdnCache.clear();
      this.logEvent('Flush Caches', 'All caching layers flushed manually', 'general');
    } else {
      const store = this.getStore(layer);
      store.clear();
      this.logEvent('Flush Layer', `Flushed all keys from ${layer} cache`, layer);
    }
  }

  public invalidatePattern(layer: 'database' | 'fragment' | 'cdn', pattern: string) {
    const store = this.getStore(layer);
    let count = 0;
    for (const key of store.keys()) {
      if (key.includes(pattern)) {
        store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logEvent('Invalidation Pattern', `Invalidated ${count} key(s) matching "${pattern}"`, layer);
    }
  }

  public invalidateCollection(collectionPath: string) {
    // Invalidate DB queries on this collection
    this.invalidatePattern('database', `db::${collectionPath}`);
    this.invalidatePattern('database', `db-doc::${collectionPath}`);
    // Also invalidate related fragments
    this.invalidatePattern('fragment', `/api/${collectionPath}`);
    // Also invalidate CDN cache
    this.invalidatePattern('cdn', `/api/${collectionPath}`);
  }

  // --- MEMORY AND MONITORING METRICS ---
  public getMemoryStats() {
    let dbBytes = 0;
    let fragmentBytes = 0;
    let cdnBytes = 0;

    const estimateSize = (val: any): number => {
      try {
        const str = JSON.stringify(val);
        return (str ? str.length * 2 : 0) + 128; // UTF-16 character (2 bytes) + object memory overhead (128B)
      } catch {
        return 256;
      }
    };

    this.dbCache.forEach(entry => { dbBytes += estimateSize(entry.value); });
    this.fragmentCache.forEach(entry => { fragmentBytes += estimateSize(entry.value); });
    this.cdnCache.forEach(entry => { cdnBytes += estimateSize(entry.value); });

    const rss = process.memoryUsage().rss;
    const heapUsed = process.memoryUsage().heapUsed;

    return {
      layers: {
        database: { bytes: dbBytes, sizeStr: this.formatBytes(dbBytes), keysCount: this.dbCache.size },
        fragment: { bytes: fragmentBytes, sizeStr: this.formatBytes(fragmentBytes), keysCount: this.fragmentCache.size },
        cdn: { bytes: cdnBytes, sizeStr: this.formatBytes(cdnBytes), keysCount: this.cdnCache.size }
      },
      process: {
        rss: this.formatBytes(rss),
        heapUsed: this.formatBytes(heapUsed),
      }
    };
  }

  // --- DYNAMIC CACHE WARMING ---
  // Simple simulator to cold/warm API responses and popular DB records
  public async warmCaches(fetcherFn: (url: string) => Promise<any>) {
    this.logEvent('Cache Warming', 'Starting background cache warming for critical paths...', 'general');
    
    const pathsToWarm = [
      '/api/features',
      '/api/matches',
      '/api/plans',
      '/api/tasks'
    ];

    let warmedCount = 0;
    for (const path of pathsToWarm) {
      try {
        const data = await fetcherFn(path);
        if (data) {
          this.set('fragment', path, data);
          warmedCount++;
        }
      } catch (err: any) {
        console.error(`Failed to warm cache for path ${path}: ${err.message}`);
      }
    }

    this.logEvent('Cache Warming Finished', `Successfully pre-heated ${warmedCount} critical API fragments`, 'general');
    return warmedCount;
  }

  // --- UTILS ---
  private getStore(layer: 'database' | 'fragment' | 'cdn'): Map<string, CacheEntry> {
    switch (layer) {
      case 'database': return this.dbCache;
      case 'fragment': return this.fragmentCache;
      case 'cdn': return this.cdnCache;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const cacheEngine = new CacheManager();
