import type {
  EnvironmentPlanCharacterSuggestion,
  EnvironmentPlanLayoutGuidance,
  EnvironmentPlanRoomShell,
} from '../core/models/environmentPlan';

export interface ResolvedLayoutObjectAnchor {
  id: string;
  kind: string;
  label: string;
  placementMode: string;
  bbox?: [number, number, number, number] | null;
  wallTarget?: 'backWall' | 'leftWall' | 'rightWall' | 'rearWall' | null;
  targetSurface?: string | null;
  preferredZonePurpose?: string;
  confidence?: number;
}

type PropPlacementMode = 'ground' | 'wall' | 'surface';
type DepthZone = 'foreground' | 'midground' | 'background';

interface LayoutAnchorQuery {
  placementMode: PropPlacementMode;
  text: string;
  preferredSurfaceHint?: string | null;
  preferredKinds?: string[];
  preferredZonePurposes?: string[];
  priority?: 'high' | 'medium' | 'low';
}

interface BehaviorLayoutAnchorQuery {
  role?: string | null;
  name?: string | null;
  placementHint?: string | null;
  actionHint?: string | null;
  behaviorType?: string | null;
  phase?: string | null;
  layoutAnchorId?: string | null;
  layoutAnchorKind?: string | null;
}

const SURFACE_HINT_BY_ANCHOR_KIND: Record<string, string> = {
  banquette: 'table',
  bench: 'table',
  counter: 'counter',
  display: 'shelf',
  menu_board: 'shelf',
  prep_surface: 'counter',
  shelf: 'shelf',
  signage: 'shelf',
  storage_rack: 'shelf',
  table: 'table',
};

const ANCHOR_KEYWORDS: Record<string, string[]> = {
  banquette: ['banquette', 'booth', 'seat'],
  bench: ['bench', 'seat'],
  counter: ['counter', 'cashier', 'register', 'checkout', 'front counter'],
  display: ['display', 'showcase', 'shelf', 'merch'],
  menu_board: ['menu', 'menu board', 'price board'],
  oven: ['oven', 'pizza oven', 'bake'],
  prep_surface: ['prep', 'pizza', 'dough', 'kitchen', 'station', 'worktop'],
  shelf: ['shelf', 'display', 'wall shelf'],
  signage: ['sign', 'logo', 'signage', 'poster'],
  storage_rack: ['storage', 'rack', 'backroom'],
  table: ['table', 'tabletop', 'dining', 'wine', 'glass', 'plate'],
};

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function normalizeAnchor(anchor: EnvironmentPlanLayoutGuidance['objectAnchors'] extends Array<infer T> ? T : never): ResolvedLayoutObjectAnchor | null {
  if (!anchor || typeof anchor !== 'object') {
    return null;
  }

  const bbox = Array.isArray(anchor.bbox) && anchor.bbox.length >= 4
    ? [
      Number(anchor.bbox[0]) || 0,
      Number(anchor.bbox[1]) || 0,
      Number(anchor.bbox[2]) || 0,
      Number(anchor.bbox[3]) || 0,
    ] as [number, number, number, number]
    : null;

  return {
    id: String(anchor.id || ''),
    kind: String(anchor.kind || '').trim().toLowerCase(),
    label: String(anchor.label || anchor.kind || '').trim(),
    placementMode: String(anchor.placementMode || 'ground').trim().toLowerCase(),
    bbox,
    wallTarget: anchor.wallTarget || null,
    targetSurface: anchor.targetSurface || null,
    preferredZonePurpose: anchor.preferredZonePurpose || undefined,
    confidence: typeof anchor.confidence === 'number' ? anchor.confidence : undefined,
  };
}

export function normalizeLayoutObjectAnchors(layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined): ResolvedLayoutObjectAnchor[] {
  if (!layoutGuidance?.objectAnchors || !Array.isArray(layoutGuidance.objectAnchors)) {
    return [];
  }

  return layoutGuidance.objectAnchors
    .map((anchor) => normalizeAnchor(anchor))
    .filter((anchor): anchor is ResolvedLayoutObjectAnchor => Boolean(anchor?.id && anchor.kind));
}

export function getLayoutAnchorSurfaceHint(anchorKind: string | null | undefined): string | null {
  const normalized = String(anchorKind || '').trim().toLowerCase();
  return SURFACE_HINT_BY_ANCHOR_KIND[normalized] || null;
}

export function getLayoutAnchorShotZoneX(anchor: ResolvedLayoutObjectAnchor | null | undefined): number | null {
  if (!anchor?.bbox) {
    return null;
  }
  const centerX = (anchor.bbox[0] + anchor.bbox[2]) / 2;
  return Math.max(-1, Math.min(1, Number((((centerX - 0.5) * 2)).toFixed(3))));
}

export function getLayoutAnchorDepthZone(anchor: ResolvedLayoutObjectAnchor | null | undefined): DepthZone | null {
  if (anchor?.bbox) {
    const centerY = (anchor.bbox[1] + anchor.bbox[3]) / 2;
    if (centerY >= 0.68) {
      return 'foreground';
    }
    if (centerY <= 0.34) {
      return 'background';
    }
    return 'midground';
  }

  switch (anchor?.preferredZonePurpose) {
    case 'storage':
    case 'background':
      return 'background';
    case 'hero':
    case 'counter':
    case 'prep':
    case 'dining':
      return 'midground';
    default:
      return null;
  }
}

function scoreAnchor(anchor: ResolvedLayoutObjectAnchor, query: LayoutAnchorQuery): number {
  const normalizedText = query.text.toLowerCase();
  const keywords = ANCHOR_KEYWORDS[anchor.kind] || [anchor.kind];
  const surfaceHint = getLayoutAnchorSurfaceHint(anchor.kind);
  let score = anchor.confidence || 0;

  if (query.placementMode === 'wall' && anchor.placementMode === 'wall') {
    score += 2.2;
  } else if (query.placementMode === 'surface' && ['counter', 'prep_surface', 'table', 'bench', 'banquette', 'display', 'shelf'].includes(anchor.kind)) {
    score += 2.0;
  } else if (query.placementMode === 'ground' && anchor.placementMode === 'ground') {
    score += 1.4;
  }

  if (query.preferredSurfaceHint && surfaceHint === query.preferredSurfaceHint) {
    score += 2.8;
  }
  if (query.preferredKinds?.includes(anchor.kind)) {
    score += 3.1;
  }
  if (query.preferredZonePurposes?.includes(anchor.preferredZonePurpose || '')) {
    score += 1.9;
  }

  if (includesAny(normalizedText, keywords)) {
    score += 2.4;
  }
  if (anchor.label && normalizedText.includes(anchor.label.toLowerCase())) {
    score += 1.2;
  }

  if (query.priority === 'high' && anchor.preferredZonePurpose && ['counter', 'prep', 'hero', 'display'].includes(anchor.preferredZonePurpose)) {
    score += 0.6;
  }
  if (query.placementMode === 'wall' && anchor.wallTarget) {
    score += 0.35;
  }
  if (query.placementMode === 'surface' && anchor.preferredZonePurpose && ['counter', 'prep', 'dining'].includes(anchor.preferredZonePurpose)) {
    score += 0.45;
  }

  return score;
}

export function findBestLayoutObjectAnchor(
  layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined,
  query: LayoutAnchorQuery,
): ResolvedLayoutObjectAnchor | null {
  const anchors = normalizeLayoutObjectAnchors(layoutGuidance);
  if (anchors.length === 0) {
    return null;
  }

  let bestAnchor: ResolvedLayoutObjectAnchor | null = null;
  let bestScore = 0;
  for (const anchor of anchors) {
    const score = scoreAnchor(anchor, query);
    if (score > bestScore) {
      bestScore = score;
      bestAnchor = anchor;
    }
  }

  return bestScore >= 1.25 ? bestAnchor : null;
}

export function findLayoutObjectAnchorById(
  layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined,
  anchorId: string | null | undefined,
): ResolvedLayoutObjectAnchor | null {
  const normalizedId = String(anchorId || '').trim();
  if (!normalizedId) {
    return null;
  }

  return normalizeLayoutObjectAnchors(layoutGuidance)
    .find((anchor) => anchor.id === normalizedId)
    || null;
}

function getBehaviorAnchorPreferences(context: BehaviorLayoutAnchorQuery): {
  placementMode: PropPlacementMode;
  preferredSurfaceHint?: string | null;
  preferredKinds: string[];
  preferredZonePurposes: string[];
  priority: 'high' | 'medium' | 'low';
} {
  const role = String(context.role || '').toLowerCase();
  const phase = String(context.phase || '').toLowerCase();
  const behaviorType = String(context.behaviorType || '').toLowerCase();

  if (phase === 'carry_to_oven' || phase === 'oven_check') {
    return {
      placementMode: 'ground',
      preferredKinds: ['oven', 'prep_surface'],
      preferredZonePurposes: ['prep', 'background'],
      priority: 'high',
    };
  }

  if (phase === 'carry_service' || phase === 'serve' || phase === 'patrol') {
    return {
      placementMode: 'ground',
      preferredKinds: ['table', 'banquette', 'bench', 'counter'],
      preferredZonePurposes: ['dining', 'hero', 'service', 'queue'],
      preferredSurfaceHint: 'table',
      priority: phase === 'serve' ? 'high' : 'medium',
    };
  }

  if (phase === 'greet' || phase === 'register' || phase === 'handover') {
    return {
      placementMode: 'ground',
      preferredKinds: ['counter', 'prep_surface', 'display', 'shelf'],
      preferredZonePurposes: ['counter', 'queue', 'service', 'prep'],
      preferredSurfaceHint: 'counter',
      priority: 'high',
    };
  }

  if (phase === 'prep' || phase === 'pickup' || phase === 'finish_pass' || phase === 'return') {
    return {
      placementMode: 'ground',
      preferredKinds: ['counter', 'prep_surface', 'table', 'display'],
      preferredZonePurposes: ['prep', 'counter', 'service', 'hero'],
      preferredSurfaceHint: 'counter',
      priority: phase === 'prep' ? 'high' : 'medium',
    };
  }

  if (phase === 'present') {
    return {
      placementMode: 'ground',
      preferredKinds: ['table', 'display', 'counter'],
      preferredZonePurposes: ['hero', 'display', 'counter'],
      preferredSurfaceHint: 'table',
      priority: 'high',
    };
  }

  if (role.includes('baker') || behaviorType === 'work_loop') {
    return {
      placementMode: 'ground',
      preferredKinds: ['counter', 'prep_surface', 'oven'],
      preferredZonePurposes: ['prep', 'counter'],
      preferredSurfaceHint: 'counter',
      priority: 'high',
    };
  }

  if (role.includes('cashier') || role.includes('host') || behaviorType === 'counter_service') {
    return {
      placementMode: 'ground',
      preferredKinds: ['counter', 'display', 'shelf'],
      preferredZonePurposes: ['counter', 'queue', 'service'],
      preferredSurfaceHint: 'counter',
      priority: 'high',
    };
  }

  if (role.includes('server') || behaviorType === 'serve_route') {
    return {
      placementMode: 'ground',
      preferredKinds: ['table', 'banquette', 'bench', 'counter'],
      preferredZonePurposes: ['dining', 'hero', 'service'],
      preferredSurfaceHint: 'table',
      priority: 'medium',
    };
  }

  if (role.includes('customer') || role.includes('guest') || behaviorType === 'patrol') {
    return {
      placementMode: 'ground',
      preferredKinds: ['table', 'banquette', 'bench', 'counter'],
      preferredZonePurposes: ['dining', 'queue', 'hero'],
      preferredSurfaceHint: 'table',
      priority: 'medium',
    };
  }

  return {
    placementMode: 'ground',
    preferredKinds: ['counter', 'table', 'display'],
    preferredZonePurposes: ['hero', 'counter', 'display'],
    preferredSurfaceHint: null,
    priority: role.includes('hero') || behaviorType === 'hero_idle' ? 'high' : 'medium',
  };
}

export function findBestBehaviorLayoutAnchor(
  layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined,
  context: BehaviorLayoutAnchorQuery,
): ResolvedLayoutObjectAnchor | null {
  const preferences = getBehaviorAnchorPreferences(context);
  const directAnchor = findLayoutObjectAnchorById(layoutGuidance, context.layoutAnchorId);
  const directKindMatches = directAnchor
    ? (
      preferences.preferredKinds.length === 0
      || preferences.preferredKinds.includes(directAnchor.kind)
      || preferences.preferredZonePurposes.includes(directAnchor.preferredZonePurpose || '')
    )
    : false;

  const layoutAnchorKind = String(context.layoutAnchorKind || '').trim().toLowerCase();
  if (layoutAnchorKind && preferences.preferredKinds.includes(layoutAnchorKind)) {
    const byKind = normalizeLayoutObjectAnchors(layoutGuidance)
      .find((anchor) => anchor.kind === layoutAnchorKind);
    if (byKind) {
      return byKind;
    }
  }

  const text = [
    context.name || '',
    context.role || '',
    context.phase || '',
    context.behaviorType || '',
    context.placementHint || '',
    context.actionHint || '',
  ]
    .join(' ')
    .trim();

  const bestAnchor = findBestLayoutObjectAnchor(layoutGuidance, {
    placementMode: preferences.placementMode,
    text,
    preferredSurfaceHint: preferences.preferredSurfaceHint,
    preferredKinds: preferences.preferredKinds,
    preferredZonePurposes: preferences.preferredZonePurposes,
    priority: preferences.priority,
  });
  if (bestAnchor) {
    return bestAnchor;
  }
  if (directAnchor && directKindMatches) {
    return directAnchor;
  }
  return directAnchor;
}

export function mapLayoutAnchorToRoomPosition(
  anchor: ResolvedLayoutObjectAnchor | null | undefined,
  roomShell: Pick<EnvironmentPlanRoomShell, 'width' | 'depth'>,
): { x: number; z: number } | null {
  if (!anchor?.bbox) {
    if (!anchor?.wallTarget) {
      return null;
    }
    const wallInsetX = roomShell.width * 0.4;
    const wallInsetZ = roomShell.depth * 0.32;
    if (anchor.wallTarget === 'leftWall') {
      return { x: Number((-wallInsetX).toFixed(3)), z: 0 };
    }
    if (anchor.wallTarget === 'rightWall') {
      return { x: Number(wallInsetX.toFixed(3)), z: 0 };
    }
    if (anchor.wallTarget === 'backWall') {
      return { x: 0, z: Number((-(wallInsetZ)).toFixed(3)) };
    }
    return { x: 0, z: Number(wallInsetZ.toFixed(3)) };
  }

  const centerX = (anchor.bbox[0] + anchor.bbox[2]) / 2;
  const x = ((centerX - 0.5) * roomShell.width) * 0.8;
  const depthZone = getLayoutAnchorDepthZone(anchor);
  const z = depthZone === 'foreground'
    ? roomShell.depth * 0.22
    : depthZone === 'background'
      ? -(roomShell.depth * 0.24)
      : 0;

  return {
    x: Number(x.toFixed(3)),
    z: Number(z.toFixed(3)),
  };
}

export function mapLayoutAnchorToBehaviorPosition(
  anchor: ResolvedLayoutObjectAnchor | null | undefined,
  roomShell: Pick<EnvironmentPlanRoomShell, 'width' | 'depth'>,
  phase?: string | null,
): { x: number; z: number } | null {
  const basePosition = mapLayoutAnchorToRoomPosition(anchor, roomShell);
  if (!basePosition || !anchor) {
    return null;
  }

  const normalizedPhase = String(phase || '').toLowerCase();
  let x = basePosition.x;
  let z = basePosition.z;
  const depthStep = Math.max(0.18, roomShell.depth * 0.055);
  const centerPull = Math.max(0.16, roomShell.width * 0.045);

  if (anchor.kind === 'counter' || anchor.kind === 'prep_surface' || anchor.kind === 'display' || anchor.kind === 'shelf') {
    z += depthStep;
  } else if (anchor.kind === 'oven') {
    z += depthStep * 1.2;
  } else if (anchor.kind === 'table' || anchor.kind === 'banquette' || anchor.kind === 'bench') {
    z += depthStep * 0.65;
    x += x >= 0 ? -centerPull : centerPull;
  }

  if (normalizedPhase === 'serve' || normalizedPhase === 'carry_service' || normalizedPhase === 'patrol') {
    x += x >= 0 ? -centerPull * 0.4 : centerPull * 0.4;
    z += depthStep * 0.2;
  } else if (normalizedPhase === 'greet' || normalizedPhase === 'register' || normalizedPhase === 'handover') {
    z += depthStep * 0.24;
  }

  const clampedX = Math.max(-(roomShell.width * 0.46), Math.min(roomShell.width * 0.46, x));
  const clampedZ = Math.max(-(roomShell.depth * 0.46), Math.min(roomShell.depth * 0.46, z));
  return {
    x: Number(clampedX.toFixed(3)),
    z: Number(clampedZ.toFixed(3)),
  };
}

export function findBestCharacterLayoutAnchor(
  layoutGuidance: EnvironmentPlanLayoutGuidance | null | undefined,
  character: Pick<EnvironmentPlanCharacterSuggestion, 'role' | 'name' | 'placementHint' | 'actionHint'>,
): ResolvedLayoutObjectAnchor | null {
  return findBestBehaviorLayoutAnchor(layoutGuidance, {
    role: character.role,
    name: character.name,
    placementHint: character.placementHint,
    actionHint: character.actionHint,
  });
}
