export interface HDRICacheEntry {
  id: string;
  url: string;
  data: ArrayBuffer;
  loadedAt: number;
  sizeBytes: number;
  source?: string;
}

export interface PreCacheProgress {
  loaded: number;
  total: number;
  currentId?: string;
  currentItem?: string;
  percent: number;
  isRunning?: boolean;
  completed: number;
  isPaused?: boolean;
}

export const PRE_CACHE_HDRIS: string[] = [];

class HDRICacheService {
  private cache = new Map<string, HDRICacheEntry>();
  private maxCacheSizeMB = 256;
  private hits = 0;
  private misses = 0;

  async init(): Promise<void> {
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  get(id: string): HDRICacheEntry | undefined {
    const entry = this.cache.get(id);
    if (entry) {
      this.hits++;
    } else {
      this.misses++;
    }
    return entry;
  }

  set(id: string, url: string, data: ArrayBuffer, source?: string | number): void {
    const sizeBytes = typeof source === 'number' ? source : (data?.byteLength ?? 0);
    const src = typeof source === 'string' ? source : undefined;
    this.cache.set(id, { id, url, data, loadedAt: Date.now(), sizeBytes, source: src });
    this.evictIfNeeded();
  }

  delete(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }

  async getCachedIds(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async getStats(): Promise<{ totalSize: number; count: number; hitRate: number }> {
    let totalSize = 0;
    this.cache.forEach((entry) => { totalSize += entry.sizeBytes; });
    return { totalSize, count: this.cache.size, hitRate: this.getHitRate() };
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  getCacheSizeMB(): number {
    let total = 0;
    this.cache.forEach((entry) => { total += entry.sizeBytes; });
    return total / (1024 * 1024);
  }

  formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  private evictIfNeeded(): void {
    if (this.getCacheSizeMB() <= this.maxCacheSizeMB) return;
    const sorted = Array.from(this.cache.values()).sort((a, b) => a.loadedAt - b.loadedAt);
    for (const entry of sorted) {
      this.cache.delete(entry.id);
      if (this.getCacheSizeMB() <= this.maxCacheSizeMB * 0.8) break;
    }
  }
}

class PreCacheManager {
  private progressCallbacks: Array<(progress: PreCacheProgress) => void> = [];
  private running = false;
  private paused = false;

  onProgress(callback: (progress: PreCacheProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyProgress(progress: PreCacheProgress): void {
    this.progressCallbacks.forEach((cb) => cb(progress));
  }

  async needsPreCache(): Promise<{ essential: number; recommended: number; optional: number }> {
    const total = PRE_CACHE_HDRIS.length;
    return {
      essential: Math.ceil(total * 0.3),
      recommended: Math.ceil(total * 0.5),
      optional: Math.floor(total * 0.2),
    };
  }

  async startPreCache(_priority?: string): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    await this.preCacheAll(PRE_CACHE_HDRIS);
    this.running = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  stop(): void {
    this.running = false;
    this.paused = false;
  }

  async preCacheAll(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      this.notifyProgress({
        loaded: i, total: ids.length, currentId: ids[i], currentItem: ids[i],
        percent: (i / ids.length) * 100, isRunning: this.running,
        completed: i, isPaused: this.paused,
      });
    }
    this.notifyProgress({
      loaded: ids.length, total: ids.length, percent: 100,
      isRunning: false, completed: ids.length, isPaused: false,
    });
  }
}

export const hdriCacheService = new HDRICacheService();
export const preCacheManager = new PreCacheManager();
export default hdriCacheService;
