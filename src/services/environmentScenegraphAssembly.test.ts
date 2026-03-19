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
    expect(
      result.assembly.relationships.some((relationship) => (
        relationship.type === 'styled_with'
        && relationship.reason?.includes('reflective')
      )),
    ).toBe(true);
    expect(
      result.assembly.relationships.some((relationship) => relationship.type === 'hero_focus'),
    ).toBe(true);
  });
});
