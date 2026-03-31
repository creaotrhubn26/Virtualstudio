export type AssetType = 'model' | 'texture' | 'hdri' | 'lut' | 'audio' | 'font' | 'data';

export interface AssetEntry {
  id: string;
  type: AssetType;
  url: string;
  name: string;
  sizeBytes?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface LoadResult<T = unknown> {
  success: boolean;
  asset?: T;
  entry: AssetEntry;
  error?: string;
  loadTimeMs: number;
}

type ProgressCallback = (progress: number, url: string) => void;

class AssetLoader {
  private cache = new Map<string, unknown>();
  private loadingQueue: Array<() => Promise<void>> = [];
  private progressCallbacks: ProgressCallback[] = [];

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyProgress(progress: number, url: string): void {
    this.progressCallbacks.forEach((cb) => cb(progress, url));
  }

  async load<T = unknown>(entry: AssetEntry): Promise<LoadResult<T>> {
    const start = performance.now();

    if (this.cache.has(entry.id)) {
      return {
        success: true,
        asset: this.cache.get(entry.id) as T,
        entry,
        loadTimeMs: 0,
      };
    }

    try {
      const response = await fetch(entry.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.url}`);

      let asset: unknown;
      if (entry.type === 'data') {
        asset = await response.json();
      } else {
        asset = await response.blob();
      }

      this.cache.set(entry.id, asset);
      this.notifyProgress(1.0, entry.url);

      return {
        success: true,
        asset: asset as T,
        entry,
        loadTimeMs: performance.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        entry,
        error: err instanceof Error ? err.message : String(err),
        loadTimeMs: performance.now() - start,
      };
    }
  }

  async loadBatch<T = unknown>(entries: AssetEntry[]): Promise<Array<LoadResult<T>>> {
    return Promise.all(entries.map((e) => this.load<T>(e)));
  }

  isCached(id: string): boolean {
    return this.cache.has(id);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  async loadModel(url: string, _options?: { cacheable?: boolean; generateLODs?: boolean }): Promise<LoadResult<unknown>> {
    const name = url.split('/').pop() ?? url;
    return this.load({ id: url, url, type: 'model', name });
  }

  static getInstance(): AssetLoader {
    return assetLoader;
  }
}

export const assetLoader = new AssetLoader();
export default assetLoader;

export { AssetLoader };
