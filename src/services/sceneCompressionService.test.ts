import { describe, expect, it } from 'vitest';
import { sceneCompressionService } from './sceneCompressionService';
import type { SceneComposition } from '../core/models/sceneComposer';

describe('studio document persistence', () => {
  it('round-trips model sources, poses, camera, lights and furnished surroundings', () => {
    const scene: SceneComposition = {
      id: 'studio', name: 'Portrait in industrial studio', createdAt: '2026-09-14', updatedAt: '2026-09-14',
      cameras: [{ id: 'main', alpha: -1.5, beta: 1.5, radius: 4.8, target: { x: 0, y: 1.2, z: 0 }, fov: .47 }],
      actors: [{ id: 'woman', type: 'model', name: 'Studiomodell', visible: true, locked: false,
        transform: { position: [1, .016, 2], rotation: [0, .4, 0], scale: [1, 1, 1] },
        userData: { modelUrl: '/models/avatars/studio/studio-woman.glb', heightMeters: 1.72, studioPose: 'StudioPortrait' } }],
      lights: [{ id: 'key', name: 'Hovedlys', fixtureId: 'aputure-300d', type: 'spot', position: [3.5, 3.2, -2],
        rotation: [0, .3, 0], scale: [1, 1, 1], aimTarget: [0, 1.3, 0], intensity: 260, baseIntensity: 520,
        powerMultiplier: .5, cct: 5600, modifier: 'softbox', visible: true, enabled: false }],
      props: [], layers: [], tags: [], cameraSettings: { aperture: 4, iso: 200, shutter: '1/250', focalLength: 85, nd: 1 },
      environment: { walls: [], floors: [], room: { type: 'industrial', furnishings: false, practicals: true } },
    };
    expect(sceneCompressionService.decompress(sceneCompressionService.compress(scene))).toEqual(scene);
  });
  it('continues to read legacy compact documents', () => {
    const restored = sceneCompressionService.decompress(JSON.stringify({ id: 'old', name: 'Legacy', cameras: [], lights: [], actors: [], props: [] }));
    expect(restored.id).toBe('old');
    expect(restored.actors).toEqual([]);
  });
  it('rejects an unknown version instead of silently discarding scene data', () => {
    expect(() => sceneCompressionService.decompress('{"format":"virtualstudio.scene","version":99}')).toThrow();
  });
});
