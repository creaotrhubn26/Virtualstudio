import { describe, expect, it } from 'vitest';
import type { SceneComposition } from '../core/models/sceneComposer';
import { sceneExportService } from './sceneExportService';

function buildScene(): SceneComposition {
  return {
    id: 'scene-1',
    name: 'Pizza Scene',
    description: 'Warm commercial set',
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
    tags: ['pizza'],
    environment: {
      walls: [],
      floors: [],
    },
    environmentAssemblyValidation: {
      backendValidated: true,
      differences: [],
      localNodeCount: 6,
      localRelationshipCount: 8,
      localRuntimePropCount: 3,
      localRuntimeAssetIds: ['pizza_hero_display', 'counter_pizza_prep'],
      backendNodeCount: 6,
      backendRelationshipCount: 8,
      backendRuntimePropCount: 3,
      backendRuntimeAssetIds: ['pizza_hero_display', 'counter_pizza_prep'],
      backendShellType: 'storefront',
      validatedAt: '2026-03-22T08:00:00.000Z',
    },
  };
}

describe('sceneExportService', () => {
  it('includes environment assembly validation in JSON exports', () => {
    const json = sceneExportService.exportToJSON(buildScene());
    const parsed = JSON.parse(json);

    expect(parsed.environmentAssemblyValidation.backendValidated).toBe(true);
    expect(parsed.environmentAssemblyValidation.backendShellType).toBe('storefront');
  });

  it('includes environment assembly validation in XML and YAML exports', () => {
    const scene = buildScene();
    const xml = sceneExportService.exportToXML(scene);
    const yaml = sceneExportService.exportToYAML(scene);

    expect(xml).toContain('<environmentAssemblyValidation backendValidated="true">');
    expect(xml).toContain('<backendShellType>storefront</backendShellType>');
    expect(yaml).toContain('environmentAssemblyValidation:');
    expect(yaml).toContain('backendValidated: true');
    expect(yaml).toContain('backendShellType: storefront');
  });
});
