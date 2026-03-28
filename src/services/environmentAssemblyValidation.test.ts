import { describe, expect, it } from 'vitest';
import type { EnvironmentScenegraphAssembly } from '../core/models/environmentScenegraph';
import type { EnvironmentPlanRoomShell } from '../core/models/environmentPlan';
import type { EnvironmentRuntimePropRequest } from './environmentPropMapper';
import { buildEnvironmentAssemblyValidationSummary } from './environmentAssemblyValidation';

function buildShell(type: EnvironmentPlanRoomShell['type']): EnvironmentPlanRoomShell {
  return {
    type,
    width: 14,
    depth: 10,
    height: 4.6,
    openCeiling: false,
    notes: [],
    openings: [],
    zones: [],
  };
}

function buildAssembly(autoAddedAssetIds: string[] = []): EnvironmentScenegraphAssembly {
  return {
    planId: 'plan-1',
    nodes: [
      { id: 'shell:plan-1', type: 'room_shell', label: 'Shell', role: 'shell' },
      { id: 'camera:primary', type: 'camera', label: 'Camera', role: 'shell' },
      { id: 'prop:0:pizza_hero_display', type: 'prop', label: 'Hero Pizza', role: 'hero', assetId: 'pizza_hero_display' },
      { id: 'prop:1:counter_pizza_prep', type: 'prop', label: 'Counter', role: 'anchor', assetId: 'counter_pizza_prep', autoAdded: true },
    ],
    relationships: [
      { id: 'contains:shell:plan-1:camera:primary', type: 'contains', sourceNodeId: 'shell:plan-1', targetNodeId: 'camera:primary' },
      { id: 'supported_by:prop:0:pizza_hero_display:prop:1:counter_pizza_prep', type: 'supported_by', sourceNodeId: 'prop:0:pizza_hero_display', targetNodeId: 'prop:1:counter_pizza_prep' },
    ],
    autoAddedAssetIds,
  };
}

function buildRuntimeProps(): EnvironmentRuntimePropRequest[] {
  return [
    {
      assetId: 'counter_pizza_prep',
      name: 'Counter',
      priority: 'medium',
      placementHint: 'Center foreground',
      metadata: {
        placementMode: 'ground',
        surfaceHint: 'counter',
      },
    },
    {
      assetId: 'pizza_hero_display',
      name: 'Hero Pizza',
      priority: 'high',
      placementHint: 'Centered on the counter',
      metadata: {
        placementMode: 'surface',
        surfaceHint: 'counter',
        preferredAnchorAssetId: 'counter_pizza_prep',
      },
    },
  ];
}

describe('buildEnvironmentAssemblyValidationSummary', () => {
  it('reports a clean backend validation when shell and runtime props match', () => {
    const localAssembly = buildAssembly(['counter_pizza_prep']);
    const localRuntimeProps = buildRuntimeProps();

    const summary = buildEnvironmentAssemblyValidationSummary({
      localAssembly,
      localRuntimeProps,
      localShell: buildShell('storefront'),
      backendResult: {
        success: true,
        provider: 'local_scenegraph',
        shell: buildShell('storefront'),
        assembly: buildAssembly(['counter_pizza_prep']),
        runtimeProps: buildRuntimeProps(),
      },
    });

    expect(summary.backendValidated).toBe(true);
    expect(summary.differences).toEqual([]);
    expect(summary.backendRuntimePropCount).toBe(2);
  });

  it('reports differences when backend shell and runtime selection diverge', () => {
    const localAssembly = buildAssembly(['counter_pizza_prep']);
    const localRuntimeProps = buildRuntimeProps();

    const summary = buildEnvironmentAssemblyValidationSummary({
      localAssembly,
      localRuntimeProps,
      localShell: buildShell('storefront'),
      backendResult: {
        success: true,
        provider: 'local_scenegraph',
        shell: buildShell('warehouse'),
        assembly: buildAssembly([]),
        runtimeProps: [
          {
            assetId: 'table_rustic',
            name: 'Rustic Table',
            priority: 'medium',
            metadata: {
              placementMode: 'ground',
              surfaceHint: 'table',
            },
          },
        ],
      },
    });

    expect(summary.differences).toEqual(expect.arrayContaining([
      'Assembly-avvik: backend normaliserte romskallet til warehouse',
      'Assembly-avvik: frontend bygget 2 props, backend bygget 1',
      'Assembly-avvik: asset-valg eller plasseringstype skiller seg mellom frontend og backend',
      'Assembly-avvik: auto-lagte støtte-assets skiller seg mellom frontend og backend',
    ]));
  });
});
