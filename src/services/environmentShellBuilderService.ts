import type {
  EnvironmentBuildShellRequest,
  EnvironmentBuildShellResponse,
  EnvironmentPlanLayoutGuidance,
  EnvironmentPlanRoomShell,
} from '../core/models/environmentPlan';
import { apiRequest } from '../lib/api';
import { environmentService } from '../core/services/environmentService';

type ShellBuilderMock =
  | EnvironmentBuildShellResponse
  | ((request: EnvironmentBuildShellRequest) => EnvironmentBuildShellResponse | Promise<EnvironmentBuildShellResponse>);

type EnvironmentShellBuilderWindow = Window & {
  __virtualStudioEnvironmentShellBuilderMock?: ShellBuilderMock;
  __virtualStudioEnvironmentShellBuilderRequests?: EnvironmentBuildShellRequest[];
};

const ROOM_TYPES = new Set([
  'studio_shell',
  'interior_room',
  'warehouse',
  'storefront',
  'abstract_stage',
  'outdoor_illusion',
]);

const DEFAULT_TYPE_ACCESSORY_HINTS: Record<string, string[]> = {
  studio_shell: [],
  interior_room: ['baseboard', 'crown_molding', 'ceiling_coffered', 'wall_segment_panel', 'wall_segment_pilaster'],
  warehouse: ['warehouse_beam', 'warehouse_column', 'ceiling_open_truss', 'wall_segment_bay'],
  storefront: ['storefront_awning', 'storefront_header', 'display_ledge', 'ceiling_canopy', 'wall_segment_bay'],
  abstract_stage: ['cyclorama_curve', 'stage_edge'],
  outdoor_illusion: ['sky_backdrop', 'ground_extension'],
};

function isBuildShellResponse(value: unknown): value is EnvironmentBuildShellResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<EnvironmentBuildShellResponse>;
  return Boolean(
    candidate.shell
    && typeof candidate.shell === 'object'
    && typeof candidate.shell.type === 'string'
    && ROOM_TYPES.has(candidate.shell.type)
    && typeof candidate.shell.width === 'number'
    && typeof candidate.shell.depth === 'number'
    && typeof candidate.shell.height === 'number'
    && Array.isArray(candidate.typeAccessoryHints),
  );
}

function getWindowRef(): EnvironmentShellBuilderWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as EnvironmentShellBuilderWindow;
}

function cloneRequest(request: EnvironmentBuildShellRequest): EnvironmentBuildShellRequest {
  return JSON.parse(JSON.stringify(request));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeRoomShellLocal(shell: Partial<EnvironmentPlanRoomShell> | null | undefined): EnvironmentPlanRoomShell {
  const fallback = environmentService.getState().roomShell;
  const requestedType = typeof shell?.type === 'string' && ROOM_TYPES.has(shell.type)
    ? shell.type
    : fallback.type;

  const normalized: EnvironmentPlanRoomShell = {
    type: requestedType,
    width: clampNumber(shell?.width, 4, 60, fallback.width),
    depth: clampNumber(shell?.depth, 4, 60, fallback.depth),
    height: clampNumber(shell?.height, 2.5, 20, fallback.height),
    openCeiling: shell?.openCeiling ?? fallback.openCeiling,
    ceilingStyle: typeof shell?.ceilingStyle === 'string' ? shell.ceilingStyle : fallback.ceilingStyle,
    notes: Array.isArray(shell?.notes) ? [...shell.notes] : (Array.isArray(fallback.notes) ? [...fallback.notes] : []),
    openings: Array.isArray(shell?.openings)
      ? shell.openings.map((opening) => ({
        ...opening,
        widthRatio: clampNumber(opening?.widthRatio, 0.08, 0.95, 0.24),
        heightRatio: clampNumber(opening?.heightRatio, 0.12, 0.95, 0.5),
        sillHeight: clampNumber(
          opening?.sillHeight,
          0,
          4,
          ['window', 'service_window', 'pass_through'].includes(String(opening?.kind || ''))
            ? 1.1
            : 0,
        ),
      }))
      : (Array.isArray(fallback.openings) ? [...fallback.openings] : []),
    zones: Array.isArray(shell?.zones)
      ? shell.zones.map((zone) => ({
        ...zone,
        xBias: clampNumber(zone?.xBias, -1, 1, 0),
        zBias: clampNumber(zone?.zBias, -1, 1, 0),
        widthRatio: clampNumber(zone?.widthRatio, 0.08, 1, 0.24),
        depthRatio: clampNumber(zone?.depthRatio, 0.08, 1, 0.24),
      }))
      : (Array.isArray(fallback.zones) ? [...fallback.zones] : []),
    fixtures: Array.isArray(shell?.fixtures)
      ? shell.fixtures.map((fixture) => ({
        ...fixture,
        xBias: clampNumber(fixture?.xBias, -1, 1, 0),
        zBias: clampNumber(fixture?.zBias, -1, 1, 0),
        widthRatio: clampNumber(fixture?.widthRatio, 0.08, 1, 0.24),
        depthRatio: clampNumber(fixture?.depthRatio, 0.08, 1, 0.16),
        height: clampNumber(fixture?.height, 0.2, 4.5, 1.0),
      }))
      : (Array.isArray(fallback.fixtures) ? [...fallback.fixtures] : []),
    niches: Array.isArray(shell?.niches)
      ? shell.niches.map((niche) => ({
        ...niche,
        widthRatio: clampNumber(niche?.widthRatio, 0.08, 0.9, 0.22),
        heightRatio: clampNumber(niche?.heightRatio, 0.12, 0.8, 0.32),
        sillHeight: clampNumber(niche?.sillHeight, 0, 4, 0.4),
        depth: clampNumber(niche?.depth, 0.08, 1.2, 0.24),
      }))
      : (Array.isArray(fallback.niches) ? [...fallback.niches] : []),
    wallSegments: Array.isArray(shell?.wallSegments)
      ? shell.wallSegments.map((segment) => ({
        ...segment,
        widthRatio: clampNumber(segment?.widthRatio, 0.08, 0.9, 0.2),
        heightRatio: clampNumber(segment?.heightRatio, 0.12, 0.9, 0.42),
        sillHeight: clampNumber(segment?.sillHeight, 0, 4, 0.18),
        depth: clampNumber(segment?.depth, 0.03, 0.8, 0.12),
      }))
      : (Array.isArray(fallback.wallSegments) ? [...fallback.wallSegments] : []),
  };

  return normalized;
}

function mapLayoutGuidanceToLayoutHints(layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined): Record<string, unknown> | null {
  if (!layoutGuidance) {
    return null;
  }

  return {
    roomType: layoutGuidance.roomType,
    visiblePlanes: layoutGuidance.visiblePlanes,
    suggestedZones: layoutGuidance.suggestedZones,
    depthProfile: layoutGuidance.depthProfile,
    detectedOpenings: layoutGuidance.detectedOpenings ?? [],
    objectAnchors: layoutGuidance.objectAnchors ?? [],
  };
}

class EnvironmentShellBuilderService {
  async buildShell(request: EnvironmentBuildShellRequest): Promise<EnvironmentBuildShellResponse> {
    const win = getWindowRef();
    const mock = win?.__virtualStudioEnvironmentShellBuilderMock;
    if (mock) {
      const clonedRequest = cloneRequest(request);
      win.__virtualStudioEnvironmentShellBuilderRequests = [
        ...(win.__virtualStudioEnvironmentShellBuilderRequests || []),
        clonedRequest,
      ];
      if (typeof mock === 'function') {
        return mock(clonedRequest);
      }
      return JSON.parse(JSON.stringify(mock));
    }

    try {
      const response = await apiRequest<EnvironmentBuildShellResponse>('/api/environment/build-shell', {
        method: 'POST',
        body: JSON.stringify({
          shell: request.shell,
          prompt: request.prompt || '',
          layoutHints: request.layoutHints || null,
        }),
      });
      if (isBuildShellResponse(response)) {
        return response;
      }
    } catch {
    }

    const shell = normalizeRoomShellLocal(request.shell);
    const ceilingAccessoryHint = ({
      coffered: 'ceiling_coffered',
      exposed_beams: 'ceiling_exposed_beams',
      open_truss: 'ceiling_open_truss',
      canopy: 'ceiling_canopy',
    } as Record<string, string | undefined>)[shell.ceilingStyle || 'flat'];
    return {
      shell,
      runtimeSupported: true,
      typeAccessoryHints: Array.from(new Set([
        ...(DEFAULT_TYPE_ACCESSORY_HINTS[shell.type] || []),
        ...(ceilingAccessoryHint ? [ceilingAccessoryHint] : []),
        ...((shell.wallSegments || []).map((segment) => `wall_segment_${segment.kind}`)),
        ...((shell.fixtures || []).map((fixture) => fixture.kind)),
      ])),
    };
  }

  layoutGuidanceToHints(layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined): Record<string, unknown> | null {
    return mapLayoutGuidanceToLayoutHints(layoutGuidance);
  }
}

export const environmentShellBuilderService = new EnvironmentShellBuilderService();
