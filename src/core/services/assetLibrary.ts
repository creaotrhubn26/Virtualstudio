import { logger } from './logger';

const log = logger.module('AssetLibrary');

export interface AssetLibraryItem {
  id: string;
  name: string;
  category: 'light' | 'light_shaper' | 'accessory' | 'prop' | 'furniture' | 'character';
  thumbnail_url: string | null;
  model_url: string | null;
  is_system: boolean;
  metadata?: Record<string, unknown>;
  recommended_patterns?: Array<{
    pattern_id: string;
    pattern_name: string;
    recommendation_strength: 'essential' | 'recommended' | 'optional';
  }>;
}

export interface AssetQueryOptions {
  category?: string;
  search?: string;
  is_system?: boolean;
  limit?: number;
}

const DEFAULT_ASSETS: AssetLibraryItem[] = [
  {
    id: 'softbox_60x90',
    name: 'Softbox 60x90cm',
    category: 'light_shaper',
    thumbnail_url: null,
    model_url: '/models/modifiers/softbox_60x90.glb',
    is_system: true,
  },
  {
    id: 'umbrella_white',
    name: 'Hvit Paraply',
    category: 'light_shaper',
    thumbnail_url: null,
    model_url: '/models/modifiers/umbrella_white.glb',
    is_system: true,
  },
  {
    id: 'reflector_5in1',
    name: 'Reflektor 5-i-1',
    category: 'accessory',
    thumbnail_url: null,
    model_url: '/models/accessories/reflector.glb',
    is_system: true,
  },
  {
    id: 'stool_wooden',
    name: 'Trekrakk',
    category: 'furniture',
    thumbnail_url: null,
    model_url: '/models/props/stool.glb',
    is_system: true,
  },
  {
    id: 'chair_posing',
    name: 'Posestol',
    category: 'furniture',
    thumbnail_url: null,
    model_url: '/models/props/chair.glb',
    is_system: true,
  },
  {
    id: 'backdrop_white',
    name: 'Hvit Bakgrunn',
    category: 'prop',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: { color: '#ffffff', width: 3, height: 3 },
  },
  {
    id: 'backdrop_gray',
    name: 'Grå Bakgrunn',
    category: 'prop',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: { color: '#808080', width: 3, height: 3 },
  },
];

class AssetLibraryService {
  private assets: AssetLibraryItem[] = DEFAULT_ASSETS;
  private favorites: Set<string> = new Set();
  private usageCount: Map<string, number> = new Map();

  async getAssets(options?: AssetQueryOptions): Promise<AssetLibraryItem[]> {
    let filtered = [...this.assets];

    if (options?.category) {
      filtered = filtered.filter((a) => a.category === options.category);
    }

    if (options?.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(search));
    }

    if (options?.is_system !== undefined) {
      filtered = filtered.filter((a) => a.is_system === options.is_system);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async getFavorites(): Promise<string[]> {
    return Array.from(this.favorites);
  }

  async toggleFavorite(assetId: string): Promise<void> {
    if (this.favorites.has(assetId)) {
      this.favorites.delete(assetId);
      log.debug(`Removed favorite: ${assetId}`);
    } else {
      this.favorites.add(assetId);
      log.debug(`Added favorite: ${assetId}`);
    }
  }

  async trackUsage(assetId: string): Promise<void> {
    const count = this.usageCount.get(assetId) || 0;
    this.usageCount.set(assetId, count + 1);
    log.debug(`Asset usage tracked: ${assetId} (${count + 1} times)`);
  }

  async addAsset(asset: Omit<AssetLibraryItem, 'id'>): Promise<AssetLibraryItem> {
    const newAsset: AssetLibraryItem = {
      ...asset,
      id: `custom_${Date.now()}`,
    };
    this.assets.push(newAsset);
    log.info(`Added new asset: ${newAsset.name}`);
    return newAsset;
  }

  getAssetById(id: string): AssetLibraryItem | undefined {
    return this.assets.find((a) => a.id === id);
  }
}

export const assetLibraryService = new AssetLibraryService();
