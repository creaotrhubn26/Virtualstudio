import { describe, expect, it } from 'vitest';
import type { EnvironmentPlan } from '../core/models/environmentPlan';
import { buildEnvironmentRuntimeProps } from './environmentPropMapper';

function createBasePlan(overrides: Partial<EnvironmentPlan> = {}): EnvironmentPlan {
  return {
    version: '1.0',
    planId: 'test-plan',
    prompt: 'Pizza-reklame med varm italiensk pizzeria-følelse',
    source: 'prompt',
    summary: 'Warm pizzeria setup',
    concept: 'Italian Pizzeria Advertisement',
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
    characters: [],
    branding: null,
    lighting: [],
    camera: {
      shotType: 'hero',
    },
    assemblySteps: [],
    compatibility: {
      currentStudioShellSupported: true,
      confidence: 0.85,
      gaps: [],
      nextBuildModules: [],
    },
    ...overrides,
  };
}

describe('buildEnvironmentRuntimeProps', () => {
  it('orders pizza environment props so the table anchor comes before tabletop props', () => {
    const plan = createBasePlan({
      props: [
        {
          name: 'Freshly baked pizza',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center of the frame, on a rustic wooden table.',
        },
        {
          name: 'Rustic wooden table',
          category: 'supporting',
          priority: 'high',
          placementHint: 'Front-center, angled slightly towards the camera.',
        },
        {
          name: 'Wine bottle and glasses',
          category: 'supporting',
          priority: 'medium',
          placementHint: 'On the table, slightly out of focus, to the side of the pizza.',
        },
        {
          name: 'Small potted basil plant',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'On the table, adding a touch of freshness.',
        },
        {
          name: 'Wooden pizza peel',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Visible in the background, suggesting a working pizzeria.',
        },
      ],
    });

    const requests = buildEnvironmentRuntimeProps(plan);

    expect(requests[0]?.assetId).toBe('table_rustic');
    expect(requests.some((request) => request.assetId === 'pizza_hero_display')).toBe(true);
    expect(requests.some((request) => request.assetId === 'wine_bottle_red')).toBe(true);
    expect(requests.some((request) => request.assetId === 'wine_glass_clear')).toBe(true);
    expect(requests.some((request) => request.assetId === 'herb_pots_cluster')).toBe(true);
    expect(requests.some((request) => request.assetId === 'plant_potted')).toBe(false);
    expect(requests.filter((request) => request.assetId === 'pizza_hero_display')).toHaveLength(1);
    expect(
      requests.find((request) => request.assetId === 'pizza_hero_display')?.metadata?.placementMode,
    ).toBe('surface');
  });

  it('does not create duplicate hero pizzas from other pizza-related supporting props', () => {
    const requests = buildEnvironmentRuntimeProps(createBasePlan({
      props: [
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
          name: 'Pizza prep counter',
          category: 'supporting',
          priority: 'medium',
          placementHint: 'Back prep line',
        },
      ],
    }));

    expect(requests.filter((request) => request.assetId === 'pizza_hero_display')).toHaveLength(1);
    expect(requests.some((request) => request.assetId === 'pizza_peel_wall')).toBe(true);
    expect(requests.some((request) => request.assetId === 'counter_pizza_prep')).toBe(true);
  });

  it('builds a usable pizza fallback pack when the model returns no prop suggestions', () => {
    const requests = buildEnvironmentRuntimeProps(createBasePlan());

    expect(requests[0]?.assetId).toBe('table_rustic');
    expect(requests.some((request) => request.assetId === 'pizza_hero_display')).toBe(true);
    expect(requests.some((request) => request.assetId === 'pizza_peel_wall')).toBe(true);
    expect(requests.some((request) => request.assetId === 'menu_board_wall')).toBe(true);
  });

  it('maps beauty suggestions to the expected non-duplicated runtime props', () => {
    const requests = buildEnvironmentRuntimeProps(createBasePlan({
      prompt: '',
      summary: 'Mørk beauty-scene bygget fra referanse.',
      concept: 'Luxury Beauty Editorial Set',
      props: [
        {
          name: 'Beauty table',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center foreground',
        },
        {
          name: 'Product podium',
          category: 'supporting',
          priority: 'high',
          placementHint: 'Centered just behind the beauty table',
        },
        {
          name: 'Reflective panel',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Slightly to camera-left for glossy highlights',
        },
      ],
    }));

    expect(requests.map((request) => request.assetId)).toEqual([
      'beauty_table',
      'product_podium_round',
      'reflective_panel',
    ]);
  });

  it('maps Genie cyberpunk suggestions without cross-contaminating assets between lines', () => {
    const requests = buildEnvironmentRuntimeProps(createBasePlan({
      prompt: 'Neon-tung cyberpunk produktscene',
      summary: 'Blade Runner-inspirert scene med tydelige signage- og podium-props.',
      concept: 'Cinematic Neon Product Alley',
      props: [
        {
          name: 'Product podium',
          category: 'hero',
          priority: 'high',
          placementHint: 'Center foreground',
        },
        {
          name: 'Cyan neon sign',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Left wall',
        },
        {
          name: 'Magenta neon sign',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'Right wall',
        },
        {
          name: 'Display shelf',
          category: 'supporting',
          priority: 'medium',
          placementHint: 'Back wall with layered product silhouettes',
        },
      ],
    }));

    expect(requests.map((request) => request.assetId)).toEqual([
      'product_podium_round',
      'neon_sign_cyan',
      'neon_sign_magenta',
      'display_shelf_wall',
    ]);
  });

  it('uses Asset Brain fallback for generic object descriptions', () => {
    const requests = buildEnvironmentRuntimeProps(createBasePlan({
      prompt: 'Stilleben med varme toner og håndlaget interiør',
      summary: 'Editorial tabletop scene med en enkel styling-prop.',
      concept: 'Still Life Editorial',
      props: [
        {
          name: 'Ceramic vase',
          category: 'set_dressing',
          priority: 'medium',
          placementHint: 'On the table near the front edge',
        },
      ],
    }));

    expect(requests.map((request) => request.assetId)).toEqual(['vase_ceramic']);
    expect(requests[0]?.metadata?.placementMode).toBe('surface');
  });
});
