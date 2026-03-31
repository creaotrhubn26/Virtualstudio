export interface HDRICacheEntry {
  id: string;
  url: string;
  texture: unknown;
  loadedAt: number;
  sizeBytes: number;
}

class HDRICacheService {
  private cache = new Map<string, HDRICacheEntry>();
  private maxCacheSizeMB = 256;

  has(id: string): boolean {
    return this.cache.has(id);
  }

  get(id: string): HDRICacheEntry | undefined {
    return this.cache.get(id);
  }

  set(id: string, url: string, texture: unknown, sizeBytes = 0): void {
    this.cache.set(id, { id, url, texture, loadedAt: Date.now(), sizeBytes });
    this.evictIfNeeded();
  }

  delete(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }

  getCacheSizeMB(): number {
    let total = 0;
    this.cache.forEach((entry) => { total += entry.sizeBytes; });
    return total / (1024 * 1024);
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

export const hdriCacheService = new HDRICacheService();
export default hdriCacheService;
