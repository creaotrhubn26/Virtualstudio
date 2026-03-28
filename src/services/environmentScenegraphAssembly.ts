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
import {
  findBestLayoutObjectAnchor,
  getLayoutAnchorDepthZone,
  getLayoutAnchorShotZoneX,
  getLayoutAnchorSurfaceHint,
} from './environmentLayoutAnchorGuidance';

export interface EnvironmentScenegraphAssemblyResult {
  assembly: EnvironmentScenegraphAssembly;
  runtimeProps: EnvironmentRuntimePropRequest[];
}

type RelativePlacementType = 'next_to' | 'behind' | 'centered_on';
type RelativePlacementSide = 'left' | 'right' | 'center';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRequestSortLabel(request: EnvironmentRuntimePropRequest): string {
  const candidateName = typeof request.name === 'string' ? request.name.trim() : '';
  if (candidateName.length > 0) {
    return candidateName;
  }

  const description = typeof request.description === 'string' ? request.description.trim() : '';
  if (description.length > 0) {
    return description;
  }

  return request.assetId;
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

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function inferRelativeSideFromHint(hint?: string): RelativePlacementSide | undefined {
  const normalized = (hint || '').toLowerCase();
  if (includesAny(normalized, ['camera-left', 'slightly left', 'to the left', 'left side', 'left foreground'])) {
    return 'left';
  }
  if (includesAny(normalized, ['camera-right', 'slightly right', 'to the right', 'right side', 'right foreground'])) {
    return 'right';
  }
  if (normalized.includes('center')) {
    return 'center';
  }
  return undefined;
}

function getAnchorKeywordFromHint(hint?: string): string | null {
  const normalized = (hint || '').toLowerCase();
  if (normalized.includes('counter')) return 'counter';
  if (normalized.includes('podium') || normalized.includes('pedestal')) return 'podium';
  if (normalized.includes('shelf')) return 'shelf';
  if (normalized.includes('table')) return 'table';
  return null;
}

function findRequestByAnchorKeyword(
  requests: EnvironmentRuntimePropRequest[],
  keyword: string | null,
): EnvironmentRuntimePropRequest | null {
  if (!keyword) {
    return null;
  }

  return requests.find((candidate) => {
    const profile = assetBrainService.getPlacementProfile(candidate.assetId);
    const searchableText = `${candidate.assetId} ${candidate.name} ${candidate.description || ''}`.toLowerCase();
    return Boolean(
      profile?.anchorRole === 'surface_anchor'
      && (
        profile.surfaceAnchorTypes.includes(keyword)
        || searchableText.includes(keyword)
      )
    );
  }) || null;
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

function inferHeroShotDepthZone(plan: EnvironmentPlan): 'foreground' | 'midground' | 'background' {
  const shotType = (plan.camera.shotType || '').toLowerCase();
  if (
    includesAny(shotType, ['close', 'beauty', 'hero', 'macro', 'portrait'])
    || (typeof plan.camera.fov === 'number' && plan.camera.fov <= 0.58)
  ) {
    return 'foreground';
  }
  if (includesAny(shotType, ['establishing'])) {
    return 'background';
  }
  return 'midground';
}

function inferHeroShotZoneX(plan: EnvironmentPlan): number {
  const targetX = Array.isArray(plan.camera.target) && typeof plan.camera.target[0] === 'number'
    ? plan.camera.target[0]
    : 0;
  const usableHalfWidth = Math.max(1.6, plan.roomShell.width / 2 - 1.8);
  return clamp(targetX / usableHalfWidth, -1, 1);
}

function applyHeroShotAwareMetadata(
  request: EnvironmentRuntimePropRequest,
  plan: EnvironmentPlan,
): void {
  if (request.priority !== 'high') {
    return;
  }

  request.metadata = {
    ...(request.metadata || {}),
    shotZoneX: inferHeroShotZoneX(plan),
    shotDepthZone: inferHeroShotDepthZone(plan),
    shotAwarePlacement: true,
  };
}

function hasExplicitDirectionalHint(request: EnvironmentRuntimePropRequest): boolean {
  const hint = (request.placementHint || '').toLowerCase();
  return includesAny(hint, [
    'left',
    'right',
    'center',
    'foreground',
    'background',
    'front',
    'back',
    'behind',
    'next to',
    'camera-left',
    'camera-right',
  ]);
}

function applyPlanLayoutGuidanceMetadata(
  request: EnvironmentRuntimePropRequest,
  plan: EnvironmentPlan,
): void {
  const guidance = plan.layoutGuidance;
  if (!guidance || hasExplicitDirectionalHint(request)) {
    return;
  }

  const placementMode = inferPlacementMode(request);
  const isHero = request.priority === 'high';
  const nextMetadata: Record<string, unknown> = {
    ...(request.metadata || {}),
  };

  if (isHero) {
    applyHeroShotAwareMetadata(request, plan);
    return;
  }

  if (request.priority === 'medium') {
    const side = guidance.suggestedZones.supporting.side;
    nextMetadata.shotZoneX = side === 'left' ? -0.68 : side === 'right' ? 0.68 : 0;
    nextMetadata.shotDepthZone = guidance.suggestedZones.supporting.depthZone;
    nextMetadata.shotAwarePlacement = true;
  } else {
    nextMetadata.shotZoneX = 0;
    nextMetadata.shotDepthZone = guidance.suggestedZones.background.depthZone;
    nextMetadata.shotAwarePlacement = true;
  }

  if (placementMode === 'wall' || (request.placementHint || '').toLowerCase().includes('wall')) {
    nextMetadata.preferredWallTarget = guidance.suggestedZones.background.wallTarget;
  }

  request.metadata = nextMetadata;
}

function applyLayoutObjectAnchorMetadata(
  request: EnvironmentRuntimePropRequest,
  plan: EnvironmentPlan,
): void {
  const guidance = plan.layoutGuidance;
  if (!guidance) {
    return;
  }

  const existingMetadata: Record<string, unknown> = {
    ...(request.metadata || {}),
  };
  const placementMode = inferPlacementMode(request);
  const preferredSurfaceHint = typeof existingMetadata.surfaceHint === 'string'
    ? existingMetadata.surfaceHint
    : null;
  const anchor = findBestLayoutObjectAnchor(guidance, {
    placementMode,
    text: `${request.name} ${request.description || ''} ${request.placementHint || ''}`,
    preferredSurfaceHint,
    priority: request.priority,
  });

  if (!anchor) {
    return;
  }

  const anchorSurfaceHint = getLayoutAnchorSurfaceHint(anchor.kind);
  const shotZoneX = getLayoutAnchorShotZoneX(anchor);
  const shotDepthZone = getLayoutAnchorDepthZone(anchor);

  existingMetadata.layoutAnchorId = anchor.id;
  existingMetadata.layoutAnchorKind = anchor.kind;
  existingMetadata.layoutAnchorConfidence = anchor.confidence ?? null;
  if (anchor.preferredZonePurpose) {
    existingMetadata.preferredZonePurpose = anchor.preferredZonePurpose;
  }

  if (placementMode === 'surface' && anchorSurfaceHint) {
    existingMetadata.surfaceHint = anchorSurfaceHint;
  }
  if (placementMode === 'wall' && anchor.wallTarget) {
    existingMetadata.preferredWallTarget = anchor.wallTarget;
  }

  if (!hasExplicitDirectionalHint(request)) {
    if (shotZoneX !== null) {
      existingMetadata.shotZoneX = shotZoneX;
      existingMetadata.shotAwarePlacement = true;
    }
    if (shotDepthZone) {
      existingMetadata.shotDepthZone = shotDepthZone;
      existingMetadata.shotAwarePlacement = true;
    }
  }

  request.metadata = existingMetadata;
}

function inferAnchorEntryFromSearch(
  surfaceRequest: EnvironmentRuntimePropRequest,
  plan: EnvironmentPlan,
): AssetBrainEntry | null {
  const anchorTypes = getSurfaceAnchorTypes(surfaceRequest);
  const context = assetBrainService.inferPlanContext(plan);
  const matches = assetBrainService.search({
    text: `${surfaceRequest.name} ${surfaceRequest.description || ''} support anchor ${anchorTypes.join(' ')}`.trim(),
    placementHint: surfaceRequest.placementHint,
    contextText: [plan.prompt, plan.summary, plan.concept].filter(Boolean).join(' '),
    assetTypes: ['prop'],
    preferredPlacementMode: 'ground',
    preferredRoomTypes: context.roomTypes,
    surfaceAnchor: anchorTypes[0],
    categoryHint: 'supporting',
    limit: 8,
    minScore: 1.2,
  });

  return matches
    .map((match) => match.entry)
    .find((entry) => {
      const profile = entry.placementProfile;
      if (profile?.anchorRole !== 'surface_anchor') {
        return false;
      }
      if (anchorTypes.length === 0) {
        return true;
      }
      return profile.surfaceAnchorTypes.some((anchorType) => anchorTypes.includes(anchorType));
    }) || null;
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

function chooseRelationshipPlacementPair(
  requests: EnvironmentRuntimePropRequest[],
  leftRequest: EnvironmentRuntimePropRequest,
  rightRequest: EnvironmentRuntimePropRequest,
): {
  sourceRequest: EnvironmentRuntimePropRequest;
  targetRequest: EnvironmentRuntimePropRequest;
} {
  const leftPriority = priorityRank(leftRequest);
  const rightPriority = priorityRank(rightRequest);

  if (leftPriority !== rightPriority) {
    return leftPriority < rightPriority
      ? { sourceRequest: rightRequest, targetRequest: leftRequest }
      : { sourceRequest: leftRequest, targetRequest: rightRequest };
  }

  const leftPlacement = placementRank(leftRequest);
  const rightPlacement = placementRank(rightRequest);
  if (leftPlacement !== rightPlacement) {
    return leftPlacement < rightPlacement
      ? { sourceRequest: rightRequest, targetRequest: leftRequest }
      : { sourceRequest: leftRequest, targetRequest: rightRequest };
  }

  const leftIndex = requests.indexOf(leftRequest);
  const rightIndex = requests.indexOf(rightRequest);
  return leftIndex <= rightIndex
    ? { sourceRequest: rightRequest, targetRequest: leftRequest }
    : { sourceRequest: leftRequest, targetRequest: rightRequest };
}

function setRelativePlacementMetadata(
  request: EnvironmentRuntimePropRequest,
  targetRequest: EnvironmentRuntimePropRequest,
  type: RelativePlacementType,
  reason: string,
  side?: RelativePlacementSide,
): void {
  if (request.metadata?.relativePlacementType) {
    return;
  }

  request.metadata = {
    ...(request.metadata || {}),
    relativePlacementType: type,
    relativePlacementReason: reason,
    relativePlacementTargetAssemblyNodeId: targetRequest.metadata?.assemblyNodeId || null,
    relativePlacementTargetAssetId: targetRequest.assetId,
    relativePlacementSide: side || null,
  };
}

function setFacingMetadata(
  request: EnvironmentRuntimePropRequest,
  target: 'camera' | 'prop',
  targetRequest?: EnvironmentRuntimePropRequest,
): void {
  request.metadata = {
    ...(request.metadata || {}),
    faceTarget: target,
    faceTargetAssemblyNodeId: targetRequest?.metadata?.assemblyNodeId || null,
    faceTargetAssetId: targetRequest?.assetId || null,
  };
}

function inferExplicitRelativePlacement(
  request: EnvironmentRuntimePropRequest,
  requests: EnvironmentRuntimePropRequest[],
  heroRequest: EnvironmentRuntimePropRequest | null,
): {
  type: RelativePlacementType;
  targetRequest: EnvironmentRuntimePropRequest;
  side?: RelativePlacementSide;
  reason: string;
} | null {
  const hint = (request.placementHint || '').toLowerCase();
  if (!hint) {
    return null;
  }

  const anchorKeyword = getAnchorKeywordFromHint(hint);
  const explicitAnchorTarget = findRequestByAnchorKeyword(requests, anchorKeyword);
  const side = inferRelativeSideFromHint(hint);
  const heroTarget = heroRequest && heroRequest.assetId !== request.assetId ? heroRequest : null;
  const targetRequest = explicitAnchorTarget || heroTarget;

  if (!targetRequest) {
    return null;
  }

  if (includesAny(hint, ['behind', 'background', 'layered behind', 'just behind'])) {
    return {
      type: 'behind',
      targetRequest,
      side,
      reason: 'Placement hint requests background depth behind the primary focal element.',
    };
  }

  if (includesAny(hint, ['next to', 'beside', 'to the side', 'camera-left', 'camera-right', 'slightly left', 'slightly right'])) {
    return {
      type: 'next_to',
      targetRequest,
      side,
      reason: 'Placement hint requests side-by-side staging.',
    };
  }

  if (hint.includes('centered') && targetRequest.assetId !== request.assetId) {
    return {
      type: 'centered_on',
      targetRequest,
      side: 'center',
      reason: 'Placement hint requests centered alignment against the target asset.',
    };
  }

  return null;
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
    applyPlanLayoutGuidanceMetadata(request, plan);
    applyLayoutObjectAnchorMetadata(request, plan);
  });

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

    const chosenAnchorEntry = anchorMatch?.entry || inferAnchorEntryFromSearch(request, plan);
    if (!chosenAnchorEntry || selectedAssetIds.has(chosenAnchorEntry.id)) {
      return;
    }

    const anchorRequest = createAutoAddedAnchorRequest(chosenAnchorEntry, request);
    requests.push(anchorRequest);
    selectedAssetIds.add(chosenAnchorEntry.id);
    autoAddedAssetIds.push(chosenAnchorEntry.id);
    request.metadata = {
      ...(request.metadata || {}),
      preferredAnchorAssetId: chosenAnchorEntry.id,
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

    return getRequestSortLabel(left).localeCompare(getRequestSortLabel(right));
  });

  const nodes: EnvironmentScenegraphNode[] = [];
  const relationships: EnvironmentScenegraphRelationship[] = [];
  const shellNodeId = `shell:${plan.planId}`;
  const cameraNodeId = 'camera:primary';

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

  nodes.push({
    id: cameraNodeId,
    type: 'camera',
    label: `camera:${plan.camera.shotType || 'default'}`,
    role: 'shell',
    metadata: {
      shotType: plan.camera.shotType || null,
      positionHint: plan.camera.positionHint || null,
      target: plan.camera.target || null,
      fov: plan.camera.fov || null,
    },
  });
  relationships.push(createRelationship('contains', shellNodeId, cameraNodeId, 'Shell contains the active framing camera.'));

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
  const requestByNodeId = new Map<string, EnvironmentRuntimePropRequest>();
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
        preferredWallTarget: request.metadata?.preferredWallTarget || null,
        preferredZonePurpose: request.metadata?.preferredZonePurpose || null,
        layoutAnchorKind: request.metadata?.layoutAnchorKind || null,
        layoutAnchorId: request.metadata?.layoutAnchorId || null,
        shotZoneX: request.metadata?.shotZoneX ?? null,
        shotDepthZone: request.metadata?.shotDepthZone ?? null,
      },
    });
    const assetNodeIds = propNodeIdsByAssetId.get(request.assetId) || [];
    assetNodeIds.push(nodeId);
    propNodeIdsByAssetId.set(request.assetId, assetNodeIds);
    requestByNodeId.set(nodeId, request);
    relationships.push(createRelationship('contains', shellNodeId, nodeId, 'Shell contains assembled runtime props.'));
  });

  orderedRequests.forEach((request) => {
    const propNodeId = request.metadata?.assemblyNodeId as string | undefined;
    if (!propNodeId) {
      return;
    }

    const placementMode = inferPlacementMode(request);
    if (placementMode === 'wall') {
      const target = typeof request.metadata?.preferredWallTarget === 'string'
        ? request.metadata.preferredWallTarget
        : inferWallTargetFromHint(request.placementHint);
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
  const heroRequest = heroNode ? requestByNodeId.get(heroNode.id) || null : null;

  if (heroRequest) {
    if (!heroRequest.metadata?.layoutAnchorId) {
      applyHeroShotAwareMetadata(heroRequest, plan);
    }
    const heroNodeIndex = nodes.findIndex((node) => node.id === heroNode?.id);
    if (heroNodeIndex >= 0) {
      nodes[heroNodeIndex] = {
        ...nodes[heroNodeIndex],
        metadata: {
          ...(nodes[heroNodeIndex].metadata || {}),
          shotZoneX: heroRequest.metadata?.shotZoneX ?? null,
          shotDepthZone: heroRequest.metadata?.shotDepthZone ?? null,
        },
      };
    }
  }

  orderedRequests.forEach((request) => {
    const placementMode = inferPlacementMode(request);
    const nodeId = request.metadata?.assemblyNodeId as string | undefined;
    if (!nodeId) {
      return;
    }

    const explicitRelativePlacement = inferExplicitRelativePlacement(request, orderedRequests, heroRequest);
    if (explicitRelativePlacement && placementMode !== 'wall') {
      setRelativePlacementMetadata(
        request,
        explicitRelativePlacement.targetRequest,
        explicitRelativePlacement.type,
        explicitRelativePlacement.reason,
        explicitRelativePlacement.side,
      );
      relationships.push(createRelationship(
        explicitRelativePlacement.type,
        nodeId,
        explicitRelativePlacement.targetRequest.metadata?.assemblyNodeId as string,
        explicitRelativePlacement.reason,
      ));
    }

    const hint = (request.placementHint || '').toLowerCase();
    if (includesAny(hint, ['towards the camera', 'toward the camera', 'facing the camera', 'towards camera', 'toward camera'])) {
      setFacingMetadata(request, 'camera');
      relationships.push(createRelationship('facing', nodeId, cameraNodeId, 'Placement hint requests that the asset faces the camera.'));
    }
  });

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

    if (relationship.type === 'paired_with' || relationship.type === 'styled_with') {
      const leftRequest = requestByNodeId.get(leftNodeId);
      const rightRequest = requestByNodeId.get(rightNodeId);
      if (!leftRequest || !rightRequest) {
        return;
      }

      const { sourceRequest, targetRequest } = chooseRelationshipPlacementPair(
        orderedRequests,
        leftRequest,
        rightRequest,
      );
      const placementMode = inferPlacementMode(sourceRequest);
      if (placementMode === 'wall') {
        return;
      }

      const side = inferRelativeSideFromHint(sourceRequest.placementHint);
      setRelativePlacementMetadata(
        sourceRequest,
        targetRequest,
        'next_to',
        relationship.reason,
        side,
      );
      relationships.push(createRelationship(
        'next_to',
        sourceRequest.metadata?.assemblyNodeId as string,
        targetRequest.metadata?.assemblyNodeId as string,
        relationship.reason,
        relationship.strength,
      ));
    }
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
      relationships: Array.from(new Map(relationships.map((relationship) => [relationship.id, relationship])).values()),
      autoAddedAssetIds,
    },
    runtimeProps: orderedRequests,
  };
}
