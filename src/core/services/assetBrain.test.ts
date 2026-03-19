import { describe, expect, it } from 'vitest';
import type { EnvironmentPlan } from '../models/environmentPlan';
import { assetBrainService } from './assetBrain';

function createPlan(overrides: Partial<EnvironmentPlan> = {}): EnvironmentPlan {
  return {
    version: '1.0',
    planId: 'asset-brain-test-plan',
    prompt: 'Elegant beauty campaign with glossy highlights',
    source: 'prompt',
    summary: 'Luxury editorial set',
    concept: 'Beauty Editorial',
    roomShell: {
      type: 'studio_shell',
      width: 20,
      depth: 20,
      height: 8,
      openCeiling: true,
    },
    surfaces: [],
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

describe('assetBrainService', () => {
  it('finds the expected pizzeria wall prop from a generic description', () => {
    const matches = assetBrainService.search({
      text: 'wall mounted menu board for a pizzeria set',
      placementHint: 'Back wall',
      contextText: 'warm italian restaurant interior',
      assetTypes: ['prop'],
      preferredPlacementMode: 'wall',
      limit: 3,
    });

    expect(matches[0]?.entry.id).toBe('menu_board_wall');
  });

  it('returns a grounded surface-anchor placement profile for anchor tables', () => {
    const profile = assetBrainService.getPlacementProfile('table_rustic');

    expect(profile?.defaultPlacementMode).toBe('ground');
    expect(profile?.anchorRole).toBe('surface_anchor');
    expect(profile?.surfaceAnchorTypes).toContain('table');
    expect(profile?.dimensions.footprintWidth).toBeGreaterThan(1);
  });

  it('uses plan context to resolve editorial beauty suggestions', () => {
    const matches = assetBrainService.matchEnvironmentPropSuggestion({
      name: 'Vanity table',
      category: 'hero',
      priority: 'high',
      placementHint: 'Center foreground',
    }, createPlan());

    expect(matches[0]?.entry.id).toBe('beauty_table');
  });

  it('indexes wall and floor materials for later retrieval layers', () => {
    const wallMatches = assetBrainService.search({
      text: 'cyberpunk neon wall',
      assetTypes: ['wall'],
      limit: 2,
    });
    const floorMatches = assetBrainService.search({
      text: 'wet blade runner floor',
      assetTypes: ['floor'],
      limit: 2,
    });

    expect(wallMatches[0]?.entry.id).toBe('urban-neon-cyan');
    expect(floorMatches[0]?.entry.id).toBe('blade-runner-wet');
  });
});
