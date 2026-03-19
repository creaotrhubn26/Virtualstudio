import type {
  EnvironmentPlanRoomShell,
  EnvironmentSurfaceTarget,
} from './environmentPlan';
import type { AssetBrainPlacementMode } from './assetBrain';

export type EnvironmentScenegraphNodeType = 'room_shell' | 'surface' | 'prop' | 'camera';

export type EnvironmentScenegraphPropRole =
  | 'shell'
  | 'anchor'
  | 'hero'
  | 'supporting'
  | 'set_dressing';

export type EnvironmentScenegraphRelationshipType =
  | 'contains'
  | 'attached_to'
  | 'supported_by'
  | 'supports'
  | 'paired_with'
  | 'styled_with'
  | 'near'
  | 'hero_focus';

export interface EnvironmentScenegraphNode {
  id: string;
  type: EnvironmentScenegraphNodeType;
  label: string;
  assetId?: string;
  surfaceTarget?: EnvironmentSurfaceTarget;
  placementMode?: AssetBrainPlacementMode;
  role: EnvironmentScenegraphPropRole;
  autoAdded?: boolean;
  roomShell?: EnvironmentPlanRoomShell;
  metadata?: Record<string, unknown>;
}

export interface EnvironmentScenegraphRelationship {
  id: string;
  type: EnvironmentScenegraphRelationshipType;
  sourceNodeId: string;
  targetNodeId: string;
  strength?: number;
  reason?: string;
}

export interface EnvironmentScenegraphAssembly {
  planId: string;
  nodes: EnvironmentScenegraphNode[];
  relationships: EnvironmentScenegraphRelationship[];
  autoAddedAssetIds: string[];
}
