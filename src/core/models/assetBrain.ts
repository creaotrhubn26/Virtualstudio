export type AssetBrainAssetType = 'prop' | 'wall' | 'floor';

export type AssetBrainPlacementMode = 'ground' | 'wall' | 'surface';

export type AssetBrainAnchorRole = 'none' | 'surface_anchor' | 'wall_display';

export interface AssetBrainDimensions {
  width?: number;
  height?: number;
  depth?: number;
  diameter?: number;
  footprintWidth: number;
  footprintDepth: number;
}

export interface AssetBrainPlacementProfile {
  defaultPlacementMode: AssetBrainPlacementMode;
  supportedModes: AssetBrainPlacementMode[];
  surfaceAnchorTypes: string[];
  anchorRole: AssetBrainAnchorRole;
  minClearance: number;
  wallYOffset: number;
  dimensions: AssetBrainDimensions;
}

export interface AssetBrainEntry {
  id: string;
  assetType: AssetBrainAssetType;
  name: string;
  category: string;
  searchText: string;
  tokens: string[];
  keywords: string[];
  synonyms: string[];
  tags: string[];
  moods: string[];
  styles: string[];
  roomTypes: string[];
  colors: string[];
  placementProfile: AssetBrainPlacementProfile | null;
  metadata?: Record<string, unknown>;
}

export interface AssetBrainSearchQuery {
  text: string;
  placementHint?: string;
  categoryHint?: string;
  contextText?: string;
  assetTypes?: AssetBrainAssetType[];
  preferredPlacementMode?: AssetBrainPlacementMode;
  preferredRoomTypes?: string[];
  surfaceAnchor?: string;
  limit?: number;
  minScore?: number;
}

export interface AssetBrainMatch {
  entry: AssetBrainEntry;
  score: number;
  reasons: string[];
  matchedTokens: string[];
}
