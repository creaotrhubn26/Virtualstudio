export type AssetRetrievalAssetType = 'prop' | 'wall' | 'floor';

export interface AssetRetrievalRequest {
  text: string;
  placementHint?: string;
  contextText?: string;
  assetTypes?: AssetRetrievalAssetType[];
  preferredPlacementMode?: 'ground' | 'wall' | 'surface';
  preferredRoomTypes?: string[];
  surfaceAnchor?: string;
  categoryHint?: 'hero' | 'supporting' | 'set_dressing';
  limit?: number;
  minScore?: number;
}

export interface AssetRetrievalPlacementProfile {
  defaultPlacementMode: 'ground' | 'wall' | 'surface';
  supportedModes: Array<'ground' | 'wall' | 'surface'>;
  surfaceAnchorTypes: string[];
  anchorRole: 'none' | 'surface_anchor' | 'wall_display';
  minClearance: number;
  wallYOffset: number;
  dimensions: {
    width?: number;
    height?: number;
    depth?: number;
    diameter?: number;
    footprintWidth: number;
    footprintDepth: number;
  };
}

export interface AssetRetrievalMatch {
  entry: {
    id: string;
    assetType: AssetRetrievalAssetType;
    name: string;
    category: string;
    placementProfile: AssetRetrievalPlacementProfile | null;
  };
  score: number;
  reasons: string[];
  matchedTokens: string[];
}

export interface AssetRetrievalResponse {
  success: boolean;
  provider: string;
  matches: AssetRetrievalMatch[];
}
