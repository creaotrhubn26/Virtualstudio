import { logger } from './logger';
import { assetBrainService } from './assetBrain';
import { WALL_MATERIALS, type WallMaterial } from '../../data/wallDefinitions';
import { FLOOR_MATERIALS, type FloorMaterial } from '../../data/floorDefinitions';
import { getAllProps, type PropCategory, type PropDefinition } from '../data/propDefinitions';

const log = logger.module('AssetLibrary');

function mapPropCategoryToAssetCategory(category: PropCategory): AssetLibraryItem['category'] {
  if (category === 'furniture') {
    return 'furniture';
  }

  if (category === 'lighting') {
    return 'accessory';
  }

  return 'prop';
}

export interface AssetLibraryItem {
  id: string;
  name: string;
  category: 'light' | 'light_shaper' | 'accessory' | 'prop' | 'furniture' | 'character' | 'modern_studio' | 'wall' | 'floor';
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

function mapAssetLibraryCategoryToAssetTypes(
  category?: string,
): Array<'prop' | 'wall' | 'floor'> | undefined {
  if (!category) {
    return undefined;
  }

  if (category === 'wall') {
    return ['wall'];
  }

  if (category === 'floor') {
    return ['floor'];
  }

  return ['prop'];
}

function mapAssetBrainEntryIdToLibraryId(
  entryId: string,
  assetType: 'prop' | 'wall' | 'floor',
): string {
  if (assetType === 'wall') {
    return `wall-${entryId}`;
  }
  if (assetType === 'floor') {
    return `floor-${entryId}`;
  }
  return entryId;
}

const ENVIRONMENT_PROP_ASSETS: AssetLibraryItem[] = getAllProps().map((prop: PropDefinition) => ({
  id: prop.id,
  name: prop.name,
  category: mapPropCategoryToAssetCategory(prop.category),
  thumbnail_url: prop.thumbnailUrl ?? null,
  model_url: prop.modelUrl ?? null,
  is_system: true,
  metadata: {
    ...prop.metadata,
    propCategory: prop.category,
    propSize: prop.size,
    propComplexity: prop.complexity,
    supportsLOD: prop.supportsLOD,
    supportsInstancing: prop.supportsInstancing,
    description: prop.description,
  },
}));

const DEFAULT_ASSETS: AssetLibraryItem[] = [
  {
    id: 'softbox_60x90',
    name: 'Softbox 60x90cm',
    category: 'light_shaper',
    thumbnail_url: null,
    model_url: '/api/models/softbox.glb', // Rodin-generated softbox from backend/rodin_models/
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
  // ============================================================================
  // MODERNE STUDIO ASSETS
  // ============================================================================
  {
    id: 'modern-desk-curved',
    name: 'Buet Desk (Moderne)',
    category: 'modern_studio',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: {
      type: 'modern-studio-desk',
      width: 8,
      height: 0.3,
      depth: 3,
      material: 'white-glossy',
    },
  },
  {
    id: 'green-screen-chroma',
    name: 'Grønn Skjerm (Chroma Key)',
    category: 'modern_studio',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: {
      type: 'green-screen',
      width: 6,
      height: 4,
      chromaKey: true,
      trackingMarkers: true,
    },
  },
  {
    id: 'light-strip-modern',
    name: 'Lysstripe (Moderne)',
    category: 'modern_studio',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: {
      type: 'light-strip',
      length: 1.5,
      intensity: 0.5,
      color: '#ffffff',
    },
  },
  {
    id: 'geometric-cube-modern',
    name: 'Geometrisk Kube',
    category: 'modern_studio',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: {
      type: 'geometric-cube',
      size: 1,
      material: 'white-reflective',
    },
  },
  {
    id: 'geometric-cube-large',
    name: 'Geometrisk Kube (Stor)',
    category: 'modern_studio',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: {
      type: 'geometric-cube',
      size: 1.2,
      material: 'white-reflective',
    },
  },
  {
    id: 'geometric-cube-small',
    name: 'Geometrisk Kube (Liten)',
    category: 'modern_studio',
    thumbnail_url: null,
    model_url: null,
    is_system: true,
    metadata: {
      type: 'geometric-cube',
      size: 0.8,
      material: 'white-reflective',
    },
  },
  // ============================================================================
  // WALL MATERIALS - Converted from wallDefinitions.ts
  // ============================================================================
  ...WALL_MATERIALS.map((wall: WallMaterial): AssetLibraryItem => ({
    id: `wall-${wall.id}`,
    name: wall.nameNo || wall.name,
    category: 'wall',
    thumbnail_url: wall.previewUrl || null,
    model_url: null,
    is_system: true,
    metadata: {
      wallMaterialId: wall.id,
      color: wall.color,
      gradientColors: wall.gradientColors,
      textureUrl: wall.textureUrl,
      normalMapUrl: wall.normalMapUrl,
      roughness: wall.roughness,
      metallic: wall.metallic,
      emissive: wall.emissive,
      emissiveIntensity: wall.emissiveIntensity,
      opacity: wall.opacity,
      category: wall.category,
      tags: wall.tags,
      moodTags: wall.moodTags,
      // Mark standard materials used by CreatorHub VirtualStudio
      // Note: These materials are used with wall logos (added automatically in scene)
      isDefault: wall.id === 'gray-medium' || wall.id === 'gray-dark',
      hasLogo: wall.id === 'gray-medium' || wall.id === 'gray-dark', // Standard walls have CreatorHub logo
    },
  })),
  // ============================================================================
  // FLOOR MATERIALS - Converted from floorDefinitions.ts
  // ============================================================================
  ...FLOOR_MATERIALS.map((floor: FloorMaterial): AssetLibraryItem => ({
    id: `floor-${floor.id}`,
    name: floor.nameNo || floor.name,
    category: 'floor',
    thumbnail_url: floor.previewUrl || null,
    model_url: null,
    is_system: true,
    metadata: {
      floorMaterialId: floor.id,
      color: floor.color,
      textureUrl: floor.textureUrl,
      normalMapUrl: floor.normalMapUrl,
      roughnessMapUrl: floor.roughnessMapUrl,
      roughness: floor.roughness,
      metallic: floor.metallic,
      reflectivity: floor.reflectivity,
      emissive: floor.emissive,
      emissiveIntensity: floor.emissiveIntensity,
      tileScale: floor.tileScale,
      category: floor.category,
      tags: floor.tags,
      moodTags: floor.moodTags,
      // Mark standard material used by CreatorHub VirtualStudio
      isDefault: floor.id === 'gray-dark',
    },
  })),
  ...ENVIRONMENT_PROP_ASSETS,
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
      const semanticMatches = assetBrainService.search({
        text: options.search,
        assetTypes: mapAssetLibraryCategoryToAssetTypes(options.category),
        limit: Math.max(filtered.length, 24),
        minScore: 0.75,
      });
      const semanticRank = new Map(
        semanticMatches.map((match, index) => [
          mapAssetBrainEntryIdToLibraryId(match.entry.id, match.entry.assetType),
          index,
        ]),
      );
      const semanticallyFiltered = filtered.filter((asset) => semanticRank.has(asset.id));

      if (semanticallyFiltered.length > 0) {
        filtered = semanticallyFiltered.sort((left, right) => {
          const leftRank = semanticRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
          const rightRank = semanticRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }
          return left.name.localeCompare(right.name);
        });
      } else {
        filtered = filtered.filter((a) => a.name.toLowerCase().includes(search));
      }
    }

    if (options?.is_system !== undefined) {
      filtered = filtered.filter((a) => a.is_system === options.is_system);
    }

    // Sort: Standard materials first (gray-medium, gray-dark for walls and floors)
    const standardMaterialIds = ['wall-gray-medium', 'wall-gray-dark', 'floor-gray-dark'];
    filtered.sort((a, b) => {
      const aIsStandard = standardMaterialIds.includes(a.id);
      const bIsStandard = standardMaterialIds.includes(b.id);
      if (aIsStandard && !bIsStandard) return -1;
      if (!aIsStandard && bIsStandard) return 1;
      return 0;
    });

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
    assetBrainService.recordUsage({ assetIds: [assetId] });
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
