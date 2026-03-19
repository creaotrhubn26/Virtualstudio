export type AssetBrainAssetType = 'prop' | 'wall' | 'floor';

export type AssetBrainPlacementMode = 'ground' | 'wall' | 'surface';

export type AssetBrainAnchorRole = 'none' | 'surface_anchor' | 'wall_display';

export type AssetBrainRelationshipType =
  | 'supported_by'
  | 'supports'
  | 'paired_with'
  | 'styled_with'
  | 'co_occurs_with';

export type AssetBrainRelationshipDirection = 'outgoing' | 'incoming' | 'any';

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
  relatedToAssetIds?: string[];
  relationshipTypes?: AssetBrainRelationshipType[];
  limit?: number;
  minScore?: number;
}

export interface AssetBrainMatch {
  entry: AssetBrainEntry;
  score: number;
  reasons: string[];
  matchedTokens: string[];
}

export interface AssetBrainRelationship {
  sourceAssetId: string;
  targetAssetId: string;
  type: AssetBrainRelationshipType;
  strength: number;
  source: 'seed' | 'inferred' | 'usage';
  reasons: string[];
  sharedRoomTypes: string[];
}

export interface AssetBrainRelatedAssetQuery {
  assetId: string;
  assetTypes?: AssetBrainAssetType[];
  direction?: AssetBrainRelationshipDirection;
  relationTypes?: AssetBrainRelationshipType[];
  preferredRoomTypes?: string[];
  limit?: number;
  minScore?: number;
}

export interface AssetBrainRelatedAssetMatch {
  entry: AssetBrainEntry;
  score: number;
  relationshipTypes: AssetBrainRelationshipType[];
  reasons: string[];
}

export interface AssetBrainUsageSignal {
  assetIds: string[];
  roomTypes?: string[];
  styles?: string[];
  prompt?: string;
  planId?: string;
  source?: string;
}

export interface AssetBrainFeedbackSignal {
  assetId: string;
  roomTypes?: string[];
  styles?: string[];
  prompt?: string;
  planId?: string;
  source?: string;
  reason?: string;
}
