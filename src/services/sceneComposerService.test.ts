import { describe, expect, it } from 'vitest';
import type { SceneComposition } from '../core/models/sceneComposer';
import { sceneComposerService } from './sceneComposerService';

function buildScene(
  id: string,
  updatedAt: string,
  validation?: SceneComposition['environmentAssemblyValidation'],
): SceneComposition {
  return {
    id,
    name: id,
    createdAt: updatedAt,
    updatedAt,
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
    environmentAssemblyValidation: validation,
  };
}

describe('sceneComposerService.sortScenes', () => {
  it('sorts by validation status with differences first, then local, then validated', () => {
    const scenes = [
      buildScene('validated', '2026-03-22T08:00:00.000Z', {
        backendValidated: true,
        differences: [],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      }),
      buildScene('local', '2026-03-22T08:05:00.000Z', {
        backendValidated: false,
        differences: [],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      }),
      buildScene('difference', '2026-03-22T08:10:00.000Z', {
        backendValidated: true,
        differences: ['Mismatch'],
        localNodeCount: 1,
        localRelationshipCount: 1,
        localRuntimePropCount: 1,
        localRuntimeAssetIds: [],
      }),
    ];

    const sorted = sceneComposerService.sortScenes(scenes, 'validationStatus');
    expect(sorted.map((scene) => scene.id)).toEqual(['difference', 'local', 'validated']);
  });
});
