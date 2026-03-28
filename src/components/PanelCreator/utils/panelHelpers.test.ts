import { describe, expect, it } from 'vitest';
import { generateFunctionContent } from './panelHelpers';

describe('generateFunctionContent', () => {
  it('uses modern studio library events for scene and asset templates', () => {
    const scenes = generateFunctionContent('scenes');
    const assets = generateFunctionContent('assets');

    expect(scenes).toContain("new CustomEvent('vs-open-studio-library-tab'");
    expect(scenes).toContain("detail: { tab: 'scener' }");
    expect(scenes).toContain("new CustomEvent('ch-open-scene-composer'");
    expect(assets).toContain("new CustomEvent('vs-open-studio-library-tab'");
    expect(assets).toContain("detail: { tab: 'assets' }");
    expect(assets).not.toContain("new CustomEvent('open-asset-library')");
  });

  it('uses modern lighting and camera events for light and camera templates', () => {
    const lights = generateFunctionContent('lights');
    const camera = generateFunctionContent('camera');

    expect(lights).toContain("new CustomEvent('vs-open-studio-library-tab'");
    expect(lights).toContain("detail: { tab: 'lights' }");
    expect(lights).toContain("new CustomEvent('vs-open-camera-controls-tab'");
    expect(lights).toContain("detail: { tab: 'light' }");

    expect(camera).toContain("new CustomEvent('vs-open-studio-library-tab'");
    expect(camera).toContain("detail: { tab: 'camera' }");
    expect(camera).toContain("new CustomEvent('vs-open-camera-controls-tab'");
    expect(camera).toContain("detail: { tab: 'camera' }");
  });

  it('uses modern studio library events for character, equipment, and hdri templates', () => {
    const characters = generateFunctionContent('characters');
    const equipment = generateFunctionContent('equipment');
    const hdri = generateFunctionContent('hdri');

    expect(characters).toContain("detail: { tab: 'models' }");
    expect(equipment).toContain("detail: { tab: 'equipment' }");
    expect(hdri).toContain("detail: { tab: 'hdri' }");
    expect(characters).not.toContain("open-character-library");
    expect(equipment).not.toContain("open-equipment-library");
    expect(hdri).not.toContain("open-hdri-library");
  });
});
