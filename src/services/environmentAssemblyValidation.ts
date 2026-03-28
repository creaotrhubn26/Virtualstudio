import type { EnvironmentPlanRoomShell } from '../core/models/environmentPlan';
import type { EnvironmentScenegraphAssembly } from '../core/models/environmentScenegraph';
import type { EnvironmentAssembleResponse } from './environmentAssemblyService';
import type { EnvironmentRuntimePropRequest } from './environmentPropMapper';

export interface EnvironmentAssemblyValidationSummary {
  backendValidated: boolean;
  differences: string[];
  localNodeCount: number;
  localRelationshipCount: number;
  localRuntimePropCount: number;
  localRuntimeAssetIds: string[];
  backendNodeCount?: number;
  backendRelationshipCount?: number;
  backendRuntimePropCount?: number;
  backendRuntimeAssetIds?: string[];
  backendShellType?: string;
}

function roundDimension(value: number | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function sortUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function shellFingerprint(shell: EnvironmentPlanRoomShell | null | undefined): string {
  if (!shell) {
    return '';
  }
  return [
    shell.type,
    roundDimension(shell.width),
    roundDimension(shell.depth),
    roundDimension(shell.height),
    shell.openCeiling ? 'open' : 'closed',
  ].join('::');
}

function runtimePropFingerprint(request: EnvironmentRuntimePropRequest): string {
  return [
    request.assetId,
    typeof request.metadata?.placementMode === 'string' ? request.metadata.placementMode : '',
    typeof request.metadata?.surfaceHint === 'string' ? request.metadata.surfaceHint : '',
    typeof request.metadata?.preferredAnchorAssetId === 'string' ? request.metadata.preferredAnchorAssetId : '',
    typeof request.metadata?.preferredWallTarget === 'string' ? request.metadata.preferredWallTarget : '',
  ].join('::');
}

function buildRuntimePropFingerprintList(requests: EnvironmentRuntimePropRequest[]): string[] {
  return sortUnique(requests.map(runtimePropFingerprint));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function buildEnvironmentAssemblyValidationSummary(args: {
  localAssembly: EnvironmentScenegraphAssembly;
  localRuntimeProps: EnvironmentRuntimePropRequest[];
  localShell?: EnvironmentPlanRoomShell | null;
  backendResult?: EnvironmentAssembleResponse | null;
}): EnvironmentAssemblyValidationSummary {
  const localRuntimeAssetIds = sortUnique(args.localRuntimeProps.map((request) => request.assetId));
  const summary: EnvironmentAssemblyValidationSummary = {
    backendValidated: Boolean(args.backendResult),
    differences: [],
    localNodeCount: args.localAssembly.nodes.length,
    localRelationshipCount: args.localAssembly.relationships.length,
    localRuntimePropCount: args.localRuntimeProps.length,
    localRuntimeAssetIds,
  };

  if (!args.backendResult) {
    return summary;
  }

  const backendAssembly = args.backendResult.assembly;
  const backendRuntimeProps = args.backendResult.runtimeProps;
  const backendRuntimeAssetIds = sortUnique(backendRuntimeProps.map((request) => request.assetId));
  summary.backendNodeCount = backendAssembly.nodes.length;
  summary.backendRelationshipCount = backendAssembly.relationships.length;
  summary.backendRuntimePropCount = backendRuntimeProps.length;
  summary.backendRuntimeAssetIds = backendRuntimeAssetIds;
  summary.backendShellType = args.backendResult.shell.type;

  if (shellFingerprint(args.localShell) !== shellFingerprint(args.backendResult.shell)) {
    summary.differences.push(`Assembly-avvik: backend normaliserte romskallet til ${args.backendResult.shell.type}`);
  }

  if (args.localRuntimeProps.length !== backendRuntimeProps.length) {
    summary.differences.push(`Assembly-avvik: frontend bygget ${args.localRuntimeProps.length} props, backend bygget ${backendRuntimeProps.length}`);
  }

  const localRuntimeFingerprints = buildRuntimePropFingerprintList(args.localRuntimeProps);
  const backendRuntimeFingerprints = buildRuntimePropFingerprintList(backendRuntimeProps);
  if (!arraysEqual(localRuntimeFingerprints, backendRuntimeFingerprints)) {
    summary.differences.push('Assembly-avvik: asset-valg eller plasseringstype skiller seg mellom frontend og backend');
  }

  const localAutoAdded = sortUnique(args.localAssembly.autoAddedAssetIds);
  const backendAutoAdded = sortUnique(backendAssembly.autoAddedAssetIds);
  if (!arraysEqual(localAutoAdded, backendAutoAdded)) {
    summary.differences.push('Assembly-avvik: auto-lagte støtte-assets skiller seg mellom frontend og backend');
  }

  return summary;
}
