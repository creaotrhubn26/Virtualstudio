import { describe, expect, it } from 'vitest';
import type { SceneComposition } from '../core/models/sceneComposer';
import { sceneCompressionService } from './sceneCompressionService';

function buildScene(): SceneComposition {
  return {
    id: 'scene-1',
    name: 'Pizza Scene',
    createdAt: '2026-03-22T00:00:00.000Z',
    updatedAt: '2026-03-22T00:00:00.000Z',
    cameras: [],
    lights: [],
    actors: [],
    props: [],
    cameraSettings: {
      aperture: 2.8,
      shutter: '1/125',
      iso: 100,
      focalLength: 35,
      nd: 0,
    },
    layers: [],
    tags: [],
    environment: {
      walls: [],
      floors: [],
    },
    environmentAssemblyValidation: {
      backendValidated: false,
      differences: ['Assembly-avvik: frontend bygget 2 props, backend bygget 1'],
      localNodeCount: 4,
      localRelationshipCount: 5,
      localRuntimePropCount: 2,
      localRuntimeAssetIds: ['pizza_hero_display', 'counter_pizza_prep'],
      backendRuntimePropCount: 1,
      backendRuntimeAssetIds: ['pizza_hero_display'],
      validatedAt: '2026-03-22T08:10:00.000Z',
    },
  };
}

describe('sceneCompressionService', () => {
  it('preserves environment assembly validation through compression and decompression', () => {
    const compressed = sceneCompressionService.compress(buildScene());
    const restored = sceneCompressionService.decompress(compressed);

    expect(restored.environmentAssemblyValidation?.backendValidated).toBe(false);
    expect(restored.environmentAssemblyValidation?.differences).toEqual([
      'Assembly-avvik: frontend bygget 2 props, backend bygget 1',
    ]);
    expect(restored.environmentAssemblyValidation?.backendRuntimePropCount).toBe(1);
  });
});
