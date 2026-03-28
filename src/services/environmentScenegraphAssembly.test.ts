import { beforeEach, describe, expect, it } from 'vitest';
import type { EnvironmentPlan } from '../core/models/environmentPlan';
import { assetBrainService } from '../core/services/assetBrain';
import { assembleEnvironmentScenegraph } from './environmentScenegraphAssembly';

function createPlan(overrides: Partial<EnvironmentPlan> = {}): EnvironmentPlan {
  return {
    version: '1.0',
    planId: 'scenegraph-test-plan',
    prompt: 'Pizza-reklame med varm italiensk stemning',
    source: 'prompt',
    summary: 'Pizzeria scene',
    concept: 'Italian Pizzeria Advertisement',
    roomShell: {
      type: 'studio_shell',
      width: 20,
      depth: 20,
      height: 8,
      openCeiling: true,
    },
    surfaces: [
      { target: 'backWall', materialId: 'brick-white', visible: true },
      { target: 'leftWall', materialId: 'stucco', visible: true },
      { target: 'rightWall', materialId: 'wood-panels', visible: true },
      { target: 'rearWall', materialId: 'plaster', visible: true },
      { target: 'floor', materialId: 'checkerboard', visible: true },
    ],
    atmosphere: {},
    ambientSounds: [],
    props: [],
    characters: [],
    branding: null,
    lighting: [],
    camera: {
      shotType: 'hero',
    },
    assemblySteps: [],
    compatibility: {
      currentStudioShellSupported: true,
      confidence: 0.9,
      gaps: [],
      nextBuildModules: [],
    },
    ...overrides,
  };
}

describe('assembleEnvironmentScenegraph', () => {
  beforeEach(() => {
    assetBrainService.resetLearnedSignals();
  });

  it('auto-adds a compatible anchor when the plan only provides a surface hero prop', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      props: [
        {
          name: 'Freshly baked pizza',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center of the frame, on a rustic wooden table.',
        },
      ],
    }));

    expect(result.runtimeProps.map((request) => request.assetId)).toEqual([
      'table_rustic',
      'pizza_hero_display',
    ]);
    expect(result.assembly.autoAddedAssetIds).toContain('table_rustic');
    expect(
      result.assembly.relationships.some((relationship) => (
        relationship.type === 'supported_by'
        && relationship.sourceNodeId.includes('pizza_hero_display')
        && relationship.targetNodeId.includes('table_rustic')
      )),
    ).toBe(true);
  });

  it('keeps selected assets tied together with explicit scenegraph relationships', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      prompt: 'Luxury beauty campaign with reflective shaping',
      summary: 'Editorial beauty set',
      concept: 'Beauty Editorial',
      props: [
        {
          name: 'Beauty table',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center foreground',
        },
        {
          name: 'Reflective panel',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Slightly camera-left',
        },
      ],
    }));

    expect(result.runtimeProps.map((request) => request.assetId)).toEqual([
      'beauty_table',
      'reflective_panel',
    ]);
    const reflectivePanelRequest = result.runtimeProps.find((request) => request.assetId === 'reflective_panel');
    expect(reflectivePanelRequest?.metadata?.relativePlacementType).toBe('next_to');
    expect(reflectivePanelRequest?.metadata?.relativePlacementTargetAssetId).toBe('beauty_table');
    expect(
      result.assembly.relationships.some((relationship) => (
        relationship.type === 'styled_with'
        && relationship.reason?.includes('reflective')
      )),
    ).toBe(true);
    expect(
      result.assembly.relationships.some((relationship) => relationship.type === 'next_to'),
    ).toBe(true);
    expect(
      result.assembly.relationships.some((relationship) => relationship.type === 'hero_focus'),
    ).toBe(true);
  });

  it('infers behind and facing relationships from placement hints', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      prompt: 'Beauty master shot with stool behind the vanity',
      summary: 'Beauty set with seated talent',
      concept: 'Beauty Product Hero',
      props: [
        {
          name: 'Beauty table',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center foreground',
        },
        {
          name: 'Chair',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Centered just behind the beauty table, facing the camera.',
        },
      ],
    }));

    const chairRequest = result.runtimeProps.find((request) => request.assetId === 'chair_posing');
    expect(chairRequest?.metadata?.relativePlacementType).toBe('behind');
    expect(chairRequest?.metadata?.relativePlacementTargetAssetId).toBe('beauty_table');
    expect(chairRequest?.metadata?.faceTarget).toBe('camera');
    expect(
      result.assembly.relationships.some((relationship) => relationship.type === 'behind'),
    ).toBe(true);
    expect(
      result.assembly.relationships.some((relationship) => relationship.type === 'facing'),
    ).toBe(true);
  });

  it('adds shot-aware metadata for hero props from camera framing', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      prompt: 'Luxury product hero framed slightly camera-right',
      summary: 'Beauty product close-up',
      concept: 'Beauty Product Hero',
      roomShell: {
        type: 'interior_room',
        width: 14,
        depth: 10,
        height: 4.6,
        openCeiling: false,
      },
      props: [
        {
          name: 'Beauty table',
          category: 'hero',
          priority: 'high',
          placementHint: 'Hero surface for the product setup.',
        },
      ],
      camera: {
        shotType: 'close-up beauty',
        target: [0.9, 1.45, 0],
        fov: 0.52,
      },
    }));

    const heroRequest = result.runtimeProps.find((request) => request.assetId === 'beauty_table');
    expect(heroRequest?.metadata?.shotAwarePlacement).toBe(true);
    expect(typeof heroRequest?.metadata?.shotZoneX).toBe('number');
    expect(Number(heroRequest?.metadata?.shotZoneX)).toBeGreaterThan(0);
    expect(heroRequest?.metadata?.shotDepthZone).toBe('foreground');
  });

  it('applies layout guidance to supporting props and wall dressing without explicit directional hints', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      prompt: 'Showroom set from a reference image',
      summary: 'Reference-driven environment',
      concept: 'Retail Product Showcase',
      layoutGuidance: {
        provider: 'heuristics',
        summary: 'Layout cues suggest hero to the right, supporting props to camera-left and wall dressing on the rear wall.',
        visiblePlanes: ['floor', 'rearWall'],
        depthProfile: {
          quality: 'deep',
          cameraElevation: 'eye',
          horizonLine: 0.56,
        },
        suggestedZones: {
          hero: {
            xBias: 0.45,
            depthZone: 'midground',
          },
          supporting: {
            side: 'left',
            depthZone: 'midground',
          },
          background: {
            wallTarget: 'rearWall',
            depthZone: 'background',
          },
        },
      },
      props: [
        {
          name: 'Beauty table',
          category: 'hero',
          priority: 'high',
          placementHint: 'Hero workstation.',
        },
        {
          name: 'Reflective panel',
          category: 'supporting',
          priority: 'medium',
          placementHint: 'Supportive bounce panel.',
        },
        {
          name: 'Display shelf',
          category: 'set_dressing',
          priority: 'low',
          placementHint: 'Wall dressing for displayed products.',
        },
      ],
    }));

    const supportingRequest = result.runtimeProps.find((request) => request.assetId === 'reflective_panel');
    const wallRequest = result.runtimeProps.find((request) => request.assetId === 'display_shelf_wall');
    expect(Number(supportingRequest?.metadata?.shotZoneX)).toBeLessThan(0);
    expect(supportingRequest?.metadata?.shotDepthZone).toBe('midground');
    expect(wallRequest?.metadata?.preferredWallTarget).toBe('rearWall');
    expect(wallRequest?.metadata?.shotDepthZone).toBe('background');
  });

  it('uses object anchors from layout guidance to bias surface anchors and wall targets', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      prompt: 'Pizza storefront reconstructed from a reference photo',
      summary: 'Reference-driven pizza counter scene',
      concept: 'Pizza Storefront',
      layoutGuidance: {
        provider: 'sam2_depth',
        roomType: 'storefront',
        summary: 'Segmentation detected a prep counter and menu board on the right wall.',
        visiblePlanes: ['floor', 'backWall', 'rightWall'],
        depthProfile: {
          quality: 'deep',
          cameraElevation: 'eye',
          horizonLine: 0.48,
        },
        objectAnchors: [
          {
            id: 'anchor_counter_1',
            kind: 'counter',
            label: 'Prep counter',
            placementMode: 'ground',
            bbox: [0.18, 0.52, 0.8, 0.84],
            preferredZonePurpose: 'counter',
            confidence: 0.94,
          },
          {
            id: 'anchor_menu_1',
            kind: 'menu_board',
            label: 'Menu board',
            placementMode: 'wall',
            bbox: [0.7, 0.14, 0.94, 0.34],
            wallTarget: 'rightWall',
            preferredZonePurpose: 'background',
            confidence: 0.88,
          },
        ],
        suggestedZones: {
          hero: {
            xBias: 0.0,
            depthZone: 'midground',
          },
          supporting: {
            side: 'left',
            depthZone: 'midground',
          },
          background: {
            wallTarget: 'backWall',
            depthZone: 'background',
          },
        },
      },
      props: [
        {
          name: 'Hero pizza',
          category: 'hero',
          priority: 'high',
          placementHint: 'Centered on prep station.',
        },
        {
          name: 'Menu board with prices',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Mounted wall menu.',
        },
      ],
    }));

    const heroRequest = result.runtimeProps.find((request) => request.assetId === 'pizza_hero_display');
    const anchorRequest = result.runtimeProps.find((request) => request.assetId === 'counter_pizza_prep');
    const menuRequest = result.runtimeProps.find((request) => request.assetId === 'menu_board_wall');
    expect(heroRequest?.metadata?.surfaceHint).toBe('counter');
    expect(heroRequest?.metadata?.preferredAnchorAssetId).toBe('counter_pizza_prep');
    expect(heroRequest?.metadata?.layoutAnchorKind).toBe('counter');
    expect(anchorRequest).toBeTruthy();
    expect(menuRequest?.metadata?.preferredWallTarget).toBe('rightWall');
    expect(menuRequest?.metadata?.layoutAnchorKind).toBe('menu_board');
  });

  it('keeps pizza hero props de-duplicated when the scene includes pizza-related support props', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      props: [
        {
          name: 'Rustic wooden table',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center foreground',
        },
        {
          name: 'Freshly baked pizza',
          category: 'hero',
          priority: 'high',
          placementHint: 'On the rustic wooden table',
        },
        {
          name: 'Pizza peel',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Leaning against the back wall',
        },
        {
          name: 'Menu board',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Side wall',
        },
      ],
    }));

    expect(result.runtimeProps.filter((request) => request.assetId === 'pizza_hero_display')).toHaveLength(1);
    expect(result.runtimeProps.some((request) => request.assetId === 'pizza_peel_wall')).toBe(true);
    expect(result.runtimeProps.some((request) => request.assetId === 'menu_board_wall')).toBe(true);
  });

  it('stays assembly-safe when a prop suggestion arrives without a usable name', () => {
    const result = assembleEnvironmentScenegraph(createPlan({
      prompt: 'Packaging stack for the pizza counter',
      summary: 'Counter packaging setup',
      concept: 'Pizza Counter Setup',
      props: [
        {
          name: undefined as unknown as string,
          description: 'Pizza boxes stacked on the counter',
          category: 'supporting',
          priority: 'medium',
          placementHint: 'Counter surface near the cashier.',
        },
      ] as EnvironmentPlan['props'],
    }));

    expect(result.runtimeProps.length).toBeGreaterThan(0);
    expect(result.runtimeProps.every((request) => typeof request.name === 'string' && request.name.length > 0)).toBe(true);
    expect(result.assembly.nodes.some((node) => node.type === 'prop')).toBe(true);
  });
});
