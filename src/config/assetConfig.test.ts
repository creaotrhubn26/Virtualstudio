import { describe, it, expect } from 'vitest';
import {
  getAssetBaseUrl,
  resolveAudioPath,
  resolveImagePath,
  resolveModelPath,
  resolvePatternPath,
  resolveTexturePath,
  usingAssetCdn,
} from './assetConfig';

/**
 * Under Vitest neither PROD nor the R2 flag is set and no CDN base is
 * configured, so every asset must resolve to the local path it was given.
 * That is what lets the Playwright suites run against `public/` offline.
 */
describe('asset resolution without a CDN', () => {
  it('leaves local paths alone', () => {
    expect(usingAssetCdn()).toBe(false);
    expect(getAssetBaseUrl()).toBe('');
    expect(resolveModelPath('/models/avatars/studio/studio-woman.glb'))
      .toBe('/models/avatars/studio/studio-woman.glb');
    expect(resolveModelPath('/models/avatars/studio/wardrobe/studio-woman/shoes01.glb'))
      .toBe('/models/avatars/studio/wardrobe/studio-woman/shoes01.glb');
    expect(resolveAudioPath('/audio/ambience/room.wav')).toBe('/audio/ambience/room.wav');
    expect(resolveImagePath('/images/gear/profoto_b10.png')).toBe('/images/gear/profoto_b10.png');
    expect(resolveTexturePath('/textures/wood.jpg')).toBe('/textures/wood.jpg');
    expect(resolvePatternPath('/pattern-thumbnails/one.jpg')).toBe('/pattern-thumbnails/one.jpg');
  });

  it('is stable however the caller writes the path', () => {
    // Callers pass these with and without a leading slash; neither should turn
    // into a different asset.
    for (const path of ['/models/light.glb', 'models/light.glb']) {
      expect(resolveModelPath(path)).toBe(path);
    }
  });
});
