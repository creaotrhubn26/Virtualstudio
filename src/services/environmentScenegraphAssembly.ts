import type { AssetBrainEntry, AssetBrainPlacementMode } from '../core/models/assetBrain';
import type { EnvironmentPlan } from '../core/models/environmentPlan';
import type {
  EnvironmentScenegraphAssembly,
  EnvironmentScenegraphNode,
  EnvironmentScenegraphPropRole,
  EnvironmentScenegraphRelationship,
  EnvironmentScenegraphRelationshipType,
} from '../core/models/environmentScenegraph';
import { assetBrainService } from '../core/services/assetBrain';
import {
  buildEnvironmentRuntimeProps,
  type EnvironmentRuntimePropRequest,
} from './environmentPropMapper';

export interface EnvironmentScenegraphAssemblyResult {
  assembly: EnvironmentScenegraphAssembly;
  runtimeProps: EnvironmentRuntimePropRequest[];
}

function uniqueRequests(
  requests: EnvironmentRuntimePropRequest[],
): EnvironmentRuntimePropRequest[] {
  const seen = new Set<string>();
  return requests.filter((request) => {
    const key = [
      request.assetId,
      request.name,
      request.placementHint || '',
      request.metadata?.placementMode || '',
      request.metadata?.autoAddedByAssembly || '',
    ].join('::');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function inferPlacementMode(request: EnvironmentRuntimePropRequest): AssetBrainPlacementMode {
  const metadataMode = request.metadata?.placementMode;
  if (metadataMode === 'wall' || metadataMode === 'surface') {
    return metadataMode;
  }

  return assetBrainService.getPlacementProfile(request.assetId)?.defaultPlacementMode || 'ground';
}

function getPropRole(request: EnvironmentRuntimePropRequest): EnvironmentScenegraphPropRole {
  if (request.priority === 'high') {
    return 'hero';
  }

  const profile = assetBrainService.getPlacementProfile(request.assetId);
  if (profile?.anchorRole === 'surface_anchor') {
    return 'anchor';
  }
  if (request.priority === 'medium') {
    return 'supporting';
  }
  return 'set_dressing';
}

function getSurfaceAnchorTypes(request: EnvironmentRuntimePropRequest): string[] {
  const explicit = request.metadata?.surfaceHint;
  if (typeof explicit === 'string' && explicit.length > 0) {
    return [explicit];
  }
  return assetBrainService.getPlacementProfile(request.assetId)?.surfaceAnchorTypes || [];
}

function isCompatibleAnchor(
  anchorRequest: EnvironmentRuntimePropRequest,
  surfaceAnchorTypes: string[],
): boolean {
  const anchorProfile = assetBrainService.getPlacementProfile(anchorRequest.assetId);
  if (anchorProfile?.anchorRole !== 'surface_anchor') {
    return false;
  }

  if (surfaceAnchorTypes.length === 0) {
    return true;
  }

  return anchorProfile.surfaceAnchorTypes.some((anchorType) => surfaceAnchorTypes.includes(anchorType));
}

function inferAnchorPlacementHint(surfaceRequest: EnvironmentRuntimePropRequest): string {
  const hint = (surfaceRequest.placementHint || '').toLowerCase();
  if (hint.includes('center')) {
    return 'Center foreground';
  }
  if (hint.includes('left')) {
    return 'Left foreground';
  }
  if (hint.includes('right')) {
    return 'Right foreground';
  }
  return 'Center foreground';
}

function inferWallTargetFromHint(
  hint?: string,
): 'backWall' | 'leftWall' | 'rightWall' | 'rearWall' {
  const normalized = (hint || '').toLowerCase();
  if (normalized.includes('left')) return 'leftWall';
  if (normalized.includes('right') || normalized.includes('side')) return 'rightWall';
  if (normalized.includes('rear')) return 'rearWall';
  return 'backWall';
}

function placementRank(request: EnvironmentRuntimePropRequest): number {
  const profile = assetBrainService.getPlacementProfile(request.assetId);
  const mode = inferPlacementMode(request);
  if (profile?.anchorRole === 'surface_anchor') return 0;
  if (mode === 'ground') return 1;
  if (mode === 'wall') return 2;
  if (mode === 'surface') return 3;
  return 4;
}

function priorityRank(request: EnvironmentRuntimePropRequest): number {
  if (request.priority === 'high') return 0;
  if (request.priority === 'medium') return 1;
  return 2;
}

function createRelationship(
  type: EnvironmentScenegraphRelationshipType,
  sourceNodeId: string,
  targetNodeId: string,
  reason?: string,
  strength?: number,
): EnvironmentScenegraphRelationship {
  return {
    id: `${type}:${sourceNodeId}:${targetNodeId}`,
    type,
    sourceNodeId,
    targetNodeId,
    reason,
    strength,
  };
}

function findAnchorRequestForSurface(
  requests: EnvironmentRuntimePropRequest[],
  surfaceRequest: EnvironmentRuntimePropRequest,
): EnvironmentRuntimePropRequest | null {
  const preferredAnchorAssetId = typeof surfaceRequest.metadata?.preferredAnchorAssetId === 'string'
    ? surfaceRequest.metadata.preferredAnchorAssetId
    : null;
  if (preferredAnchorAssetId) {
    const directAnchor = requests.find((candidate) => candidate.assetId === preferredAnchorAssetId);
    if (directAnchor) {
      return directAnchor;
    }
  }

  const anchorTypes = getSurfaceAnchorTypes(surfaceRequest);
  return requests.find((candidate) => (
    candidate.assetId !== surfaceRequest.assetId && isCompatibleAnchor(candidate, anchorTypes)
  )) || null;
}

function createAutoAddedAnchorRequest(
  relatedEntry: AssetBrainEntry,
  surfaceRequest: EnvironmentRuntimePropRequest,
): EnvironmentRuntimePropRequest {
  const profile = assetBrainService.getPlacementProfile(relatedEntry.id);

  return {
    assetId: relatedEntry.id,
    name: relatedEntry.name,
    description: `Auto-added anchor for ${surfaceRequest.name}`,
    priority: 'medium',
    placementHint: inferAnchorPlacementHint(surfaceRequest),
    metadata: {
      placementMode: profile?.defaultPlacementMode,
      surfaceHint: profile?.surfaceAnchorTypes[0],
      assetBrainDimensions: profile?.dimensions,
      assetBrainAnchorRole: profile?.anchorRole,
      assetBrainMinClearance: profile?.minClearance,
      assetBrainWallYOffset: profile?.wallYOffset,
      autoAddedByAssembly: 'support_anchor',
      supportsAssetId: surfaceRequest.assetId,
    },
  };
}

function buildSelectedRelationshipMap(
  requests: EnvironmentRuntimePropRequest[],
  preferredRoomTypes: string[],
): Map<string, { type: EnvironmentScenegraphRelationshipType; reason: string; strength: number }> {
  const selectedIds = new Set(requests.map((request) => request.assetId));
  const relationshipMap = new Map<string, {
    type: EnvironmentScenegraphRelationshipType;
    reason: string;
    strength: number;
  }>();

  requests.forEach((request) => {
    const relatedMatches = assetBrainService.getRelatedAssets({
      assetId: request.assetId,
      assetTypes: ['prop'],
      preferredRoomTypes,
      limit: 8,
      minScore: 0.9,
    });

    relatedMatches.forEach((match) => {
      if (!selectedIds.has(match.entry.id)) {
        return;
      }

      const key = [request.assetId, match.entry.id].sort().join('::');
      if (relationshipMap.has(key)) {
        return;
      }

      const type = match.relationshipTypes.includes('paired_with')
        ? 'paired_with'
        : match.relationshipTypes.includes('styled_with')
          ? 'styled_with'
          : match.relationshipTypes.includes('co_occurs_with')
            ? 'near'
            : null;
      if (!type) {
        return;
      }

      relationshipMap.set(key, {
        type,
        reason: match.reasons[0] || 'Selected together by asset brain',
        strength: match.score,
      });
    });
  });

  return relationshipMap;
}

export function assembleEnvironmentScenegraph(
  plan: EnvironmentPlan,
): EnvironmentScenegraphAssemblyResult {
  const context = assetBrainService.inferPlanContext(plan);
  const baseRequests = buildEnvironmentRuntimeProps(plan);
  const requests = [...baseRequests];
  const selectedAssetIds = new Set(requests.map((request) => request.assetId));
  const autoAddedAssetIds: string[] = [];

  requests.forEach((request) => {
    if (inferPlacementMode(request) !== 'surface') {
      return;
    }

    const existingAnchor = findAnchorRequestForSurface(requests, request);
    if (existingAnchor) {
      request.metadata = {
        ...(request.metadata || {}),
        preferredAnchorAssetId: existingAnchor.assetId,
      };
      return;
    }

    const relatedAnchors = assetBrainService.getRelatedAssets({
      assetId: request.assetId,
      assetTypes: ['prop'],
      relationTypes: ['supported_by', 'co_occurs_with'],
      preferredRoomTypes: context.roomTypes,
      limit: 6,
      minScore: 0.9,
    });

    const anchorMatch = relatedAnchors.find((match) => {
      const anchorProfile = match.entry.placementProfile;
      if (anchorProfile?.anchorRole !== 'surface_anchor') {
        return false;
      }
      return isCompatibleAnchor(
        {
          assetId: match.entry.id,
          name: match.entry.name,
          priority: 'medium',
          metadata: {
            placementMode: anchorProfile.defaultPlacementMode,
            surfaceHint: anchorProfile.surfaceAnchorTypes[0],
          },
        },
        getSurfaceAnchorTypes(request),
      );
    });

    if (!anchorMatch || selectedAssetIds.has(anchorMatch.entry.id)) {
      return;
    }

    const anchorRequest = createAutoAddedAnchorRequest(anchorMatch.entry, request);
    requests.push(anchorRequest);
    selectedAssetIds.add(anchorMatch.entry.id);
    autoAddedAssetIds.push(anchorMatch.entry.id);
    request.metadata = {
      ...(request.metadata || {}),
      preferredAnchorAssetId: anchorMatch.entry.id,
    };
  });

  const orderedRequests = uniqueRequests(requests).sort((left, right) => {
    const placementDelta = placementRank(left) - placementRank(right);
    if (placementDelta !== 0) {
      return placementDelta;
    }

    const priorityDelta = priorityRank(left) - priorityRank(right);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.name.localeCompare(right.name);
  });

  const nodes: EnvironmentScenegraphNode[] = [];
  const relationships: EnvironmentScenegraphRelationship[] = [];
  const shellNodeId = `shell:${plan.planId}`;

  nodes.push({
    id: shellNodeId,
    type: 'room_shell',
    label: plan.concept || 'Environment Shell',
    role: 'shell',
    roomShell: plan.roomShell,
    metadata: {
      source: plan.source,
      recommendedPresetId: plan.recommendedPresetId || null,
    },
  });

  const surfaceNodeIds = new Map<string, string>();
  plan.surfaces.forEach((surface) => {
    const nodeId = `surface:${surface.target}`;
    surfaceNodeIds.set(surface.target, nodeId);
    nodes.push({
      id: nodeId,
      type: 'surface',
      label: `${surface.target}:${surface.materialId}`,
      role: 'shell',
      surfaceTarget: surface.target,
      metadata: {
        materialId: surface.materialId,
        visible: surface.visible,
      },
    });
    relationships.push(createRelationship('contains', shellNodeId, nodeId, 'Shell owns the visible environment surfaces.'));
  });

  const propNodeIdsByAssetId = new Map<string, string[]>();
  orderedRequests.forEach((request, index) => {
    const nodeId = `prop:${index}:${request.assetId}`;
    const role = getPropRole(request);
    const placementMode = inferPlacementMode(request);

    request.metadata = {
      ...(request.metadata || {}),
      assemblyNodeId: nodeId,
    };

    nodes.push({
      id: nodeId,
      type: 'prop',
      label: request.name,
      assetId: request.assetId,
      placementMode,
      role,
      autoAdded: Boolean(request.metadata?.autoAddedByAssembly),
      metadata: {
        priority: request.priority,
        placementHint: request.placementHint || null,
        preferredAnchorAssetId: request.metadata?.preferredAnchorAssetId || null,
      },
    });
    const assetNodeIds = propNodeIdsByAssetId.get(request.assetId) || [];
    assetNodeIds.push(nodeId);
    propNodeIdsByAssetId.set(request.assetId, assetNodeIds);
    relationships.push(createRelationship('contains', shellNodeId, nodeId, 'Shell contains assembled runtime props.'));
  });

  orderedRequests.forEach((request) => {
    const propNodeId = request.metadata?.assemblyNodeId as string | undefined;
    if (!propNodeId) {
      return;
    }

    const placementMode = inferPlacementMode(request);
    if (placementMode === 'wall') {
      const target = inferWallTargetFromHint(request.placementHint);
      const targetNodeId = surfaceNodeIds.get(target);
      if (targetNodeId) {
        relationships.push(createRelationship('attached_to', propNodeId, targetNodeId, 'Wall prop is attached to a shell surface.'));
      }
      return;
    }

    if (placementMode === 'surface') {
      const anchorRequest = findAnchorRequestForSurface(orderedRequests, request);
      const anchorNodeId = anchorRequest?.metadata?.assemblyNodeId as string | undefined;
      if (anchorNodeId) {
        relationships.push(createRelationship('supported_by', propNodeId, anchorNodeId, 'Surface prop is supported by an anchor asset.'));
        relationships.push(createRelationship('supports', anchorNodeId, propNodeId, 'Anchor asset carries a surface prop.'));
      }
    }
  });

  const heroNode = nodes.find((node) => node.type === 'prop' && node.role === 'hero');
  if (heroNode) {
    relationships.push(createRelationship('hero_focus', shellNodeId, heroNode.id, 'Hero prop should stay in the primary composition field.'));
  }

  const selectedRelationshipMap = buildSelectedRelationshipMap(orderedRequests, context.roomTypes);
  selectedRelationshipMap.forEach((relationship, key) => {
    const [leftAssetId, rightAssetId] = key.split('::');
    const leftNodeId = propNodeIdsByAssetId.get(leftAssetId)?.[0];
    const rightNodeId = propNodeIdsByAssetId.get(rightAssetId)?.[0];
    if (!leftNodeId || !rightNodeId) {
      return;
    }

    relationships.push(createRelationship(
      relationship.type,
      leftNodeId,
      rightNodeId,
      relationship.reason,
      relationship.strength,
    ));
  });

  if (heroNode) {
    nodes
      .filter((node) => node.type === 'prop' && node.id !== heroNode.id && node.role !== 'anchor')
      .forEach((node) => {
        const relationshipId = `near:${node.id}:${heroNode.id}`;
        if (relationships.some((relationship) => relationship.id === relationshipId)) {
          return;
        }
        relationships.push(createRelationship('near', node.id, heroNode.id, 'Supporting props should cluster around the hero object.'));
      });
  }

  return {
    assembly: {
      planId: plan.planId,
      nodes,
      relationships,
      autoAddedAssetIds,
    },
    runtimeProps: orderedRequests,
  };
}
