import { SceneComposition } from '../core/models/sceneComposer';

interface CacheEntry {
  scene: SceneComposition;
  timestamp: number;
  accessCount: number;
}

export class SceneCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 50; // Maximum number of scenes to cache
  private ttl: number = 3600000; // Time to live: 1 hour

  /**
   * Get scene from cache
   */
  get(id: string): SceneComposition | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      return null;
    }

    // Update access count and timestamp
    entry.accessCount++;
    entry.timestamp = Date.now();
    return entry.scene;
  }

  /**
   * Add scene to cache
   */
  set(scene: SceneComposition): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(scene.id, {
      scene,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  /**
   * Remove scene from cache
   */
  delete(id: string): void {
    this.cache.delete(id);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, id) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestId = id;
      }
    });

    if (oldestId) {
      this.cache.delete(oldestId);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number; // Would need to track hits/misses
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to implement hit/miss tracking
    };
  }
}

export const sceneCacheService = new SceneCacheService();

