import { describe, expect, it } from 'vitest';
import {
  findBestBehaviorLayoutAnchor,
  findBestCharacterLayoutAnchor,
  findBestLayoutObjectAnchor,
  findLayoutObjectAnchorById,
  getLayoutAnchorDepthZone,
  getLayoutAnchorShotZoneX,
  mapLayoutAnchorToBehaviorPosition,
  mapLayoutAnchorToRoomPosition,
  normalizeLayoutObjectAnchors,
} from './environmentLayoutAnchorGuidance';

const layoutGuidance = {
  provider: 'sam2_depth',
  roomType: 'storefront',
  visiblePlanes: ['floor', 'backWall', 'rightWall'] as const,
  depthProfile: {
    quality: 'deep',
    cameraElevation: 'eye',
    horizonLine: 0.48,
  },
  objectAnchors: [
    {
      id: 'anchor_counter_1',
      kind: 'counter',
      label: 'Front counter',
      placementMode: 'ground',
      bbox: [0.2, 0.52, 0.78, 0.82] as [number, number, number, number],
      preferredZonePurpose: 'counter',
      confidence: 0.92,
    },
    {
      id: 'anchor_menu_1',
      kind: 'menu_board',
      label: 'Menu board',
      placementMode: 'wall',
      bbox: [0.72, 0.14, 0.94, 0.36] as [number, number, number, number],
      wallTarget: 'rightWall' as const,
      preferredZonePurpose: 'background',
      confidence: 0.88,
    },
    {
      id: 'anchor_oven_1',
      kind: 'oven',
      label: 'Wood-fired oven',
      placementMode: 'ground',
      bbox: [0.06, 0.26, 0.28, 0.62] as [number, number, number, number],
      preferredZonePurpose: 'prep',
      confidence: 0.91,
    },
    {
      id: 'anchor_table_1',
      kind: 'table',
      label: 'Dining table',
      placementMode: 'ground',
      bbox: [0.6, 0.58, 0.88, 0.9] as [number, number, number, number],
      preferredZonePurpose: 'dining',
      confidence: 0.9,
    },
  ],
  suggestedZones: {
    hero: {
      xBias: 0,
      depthZone: 'midground' as const,
    },
    supporting: {
      side: 'left' as const,
      depthZone: 'midground' as const,
    },
    background: {
      wallTarget: 'backWall' as const,
      depthZone: 'background' as const,
    },
  },
};

describe('environmentLayoutAnchorGuidance', () => {
  it('finds the strongest counter anchor for pizza hero props', () => {
    const anchor = findBestLayoutObjectAnchor(layoutGuidance, {
      placementMode: 'surface',
      text: 'Hero pizza centered on the prep counter',
      preferredSurfaceHint: 'counter',
      priority: 'high',
    });

    expect(anchor?.id).toBe('anchor_counter_1');
    expect(getLayoutAnchorShotZoneX(anchor!)).toBeCloseTo(-0.02, 2);
    expect(getLayoutAnchorDepthZone(anchor!)).toBe('midground');
  });

  it('finds wall anchors for menu/display dressing', () => {
    const anchor = findBestLayoutObjectAnchor(layoutGuidance, {
      placementMode: 'wall',
      text: 'Menu board mounted on wall',
      priority: 'medium',
    });

    expect(anchor?.id).toBe('anchor_menu_1');
    expect(anchor?.wallTarget).toBe('rightWall');
  });

  it('maps layout anchors into shell coordinates for character placement', () => {
    const anchors = normalizeLayoutObjectAnchors(layoutGuidance);
    const position = mapLayoutAnchorToRoomPosition(anchors[0], {
      width: 18,
      depth: 12,
    });

    expect(position?.x).toBeCloseTo(-0.144, 3);
    expect(position?.z).toBe(0);
  });

  it('uses role and hints to choose character anchors', () => {
    const anchor = findBestCharacterLayoutAnchor(layoutGuidance, {
      role: 'cashier',
      name: 'Front-of-house',
      placementHint: 'Front counter zone',
      actionHint: 'Taking orders',
    });

    expect(anchor?.kind).toBe('counter');
  });

  it('uses phase-aware behavior mapping to switch from counter to oven anchors', () => {
    const prepAnchor = findBestBehaviorLayoutAnchor(layoutGuidance, {
      role: 'baker',
      name: 'Pizzaiolo',
      placementHint: 'Prep counter zone',
      actionHint: 'Stretching dough',
      behaviorType: 'work_loop',
      phase: 'prep',
      layoutAnchorId: 'anchor_counter_1',
      layoutAnchorKind: 'counter',
    });
    const ovenAnchor = findBestBehaviorLayoutAnchor(layoutGuidance, {
      role: 'baker',
      name: 'Pizzaiolo',
      placementHint: 'Prep counter zone',
      actionHint: 'Loading pizza into oven',
      behaviorType: 'work_loop',
      phase: 'oven_check',
      layoutAnchorId: 'anchor_counter_1',
      layoutAnchorKind: 'counter',
    });

    expect(prepAnchor?.id).toBe('anchor_counter_1');
    expect(ovenAnchor?.id).toBe('anchor_oven_1');
  });

  it('maps behavior anchor positions slightly in front of targets', () => {
    const counterAnchor = findLayoutObjectAnchorById(layoutGuidance, 'anchor_counter_1');
    const tableAnchor = findLayoutObjectAnchorById(layoutGuidance, 'anchor_table_1');
    const counterBase = mapLayoutAnchorToRoomPosition(counterAnchor, {
      width: 18,
      depth: 12,
    });
    const counterBehavior = mapLayoutAnchorToBehaviorPosition(counterAnchor, {
      width: 18,
      depth: 12,
    }, 'greet');
    const tableBase = mapLayoutAnchorToRoomPosition(tableAnchor, {
      width: 18,
      depth: 12,
    });
    const tableBehavior = mapLayoutAnchorToBehaviorPosition(tableAnchor, {
      width: 18,
      depth: 12,
    }, 'serve');

    expect(counterBehavior?.z).toBeGreaterThan(counterBase?.z ?? 0);
    expect(Math.abs(tableBehavior?.x ?? 0)).toBeLessThan(Math.abs(tableBase?.x ?? 0));
    expect(tableBehavior?.z).toBeGreaterThan(tableBase?.z ?? 0);
  });
});
