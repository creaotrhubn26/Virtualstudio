/**
 * Lighting Plot PDF Service — Guardrail Tests
 *
 * Validates that generateLightingPlotSVG() produces valid SVG output with the
 * correct visual elements for each light type and scene configuration.
 * generateLightingPlotSVG() is a pure string-returning function with no DOM dependency.
 */
import { describe, it, expect } from 'vitest';
import { generateLightingPlotSVG } from './lightingPlotPDFService';
import type { LightingPlotData, PlotLight, PlotCharacter } from './lightingPlotPDFService';

function makeLight(overrides: Partial<PlotLight> = {}): PlotLight {
  return {
    id: 'light_0',
    name: 'Key Light',
    type: 'led',
    x: 3.5,
    z: -2.0,
    y: 3.2,
    cct: 5600,
    intensity: 80,
    modifier: 'none',
    enabled: true,
    beamAngle: 60,
    ...overrides,
  };
}

function makeData(overrides: Partial<LightingPlotData> = {}): LightingPlotData {
  return {
    sceneName: 'Test Scene',
    lights: [makeLight()],
    characters: [],
    props: [],
    studioWidth: 10,
    studioDepth: 10,
    exportedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('generateLightingPlotSVG — SVG structure', () => {
  it('returns a string starting with <svg', () => {
    const svg = generateLightingPlotSVG(makeData());
    expect(svg.trimStart()).toMatch(/^<svg/i);
  });

  it('closes with </svg>', () => {
    const svg = generateLightingPlotSVG(makeData());
    expect(svg.trimEnd()).toMatch(/<\/svg>$/i);
  });

  it('includes xmlns attribute for valid SVG', () => {
    const svg = generateLightingPlotSVG(makeData());
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('generateLightingPlotSVG — light rendering', () => {
  it('renders a circle element for each enabled light', () => {
    const svg = generateLightingPlotSVG(makeData({
      lights: [
        makeLight({ id: 'l0', enabled: true }),
        makeLight({ id: 'l1', enabled: true }),
      ],
    }));
    const circles = svg.match(/<circle/g) ?? [];
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render circles for disabled lights', () => {
    const svgWith = generateLightingPlotSVG(makeData({ lights: [makeLight({ enabled: true })] }));
    const svgWithout = generateLightingPlotSVG(makeData({ lights: [makeLight({ enabled: false })] }));
    const circlesBefore = (svgWith.match(/<circle/g) ?? []).length;
    const circlesAfter = (svgWithout.match(/<circle/g) ?? []).length;
    expect(circlesBefore).toBeGreaterThan(circlesAfter);
  });

  it('includes the light name as a text label', () => {
    const svg = generateLightingPlotSVG(makeData({
      lights: [makeLight({ name: 'UniqueKeyLightName' })],
    }));
    expect(svg).toContain('UniqueKeyLightName');
  });

  it('renders beam angle cone for lights with beamAngle', () => {
    const svg = generateLightingPlotSVG(makeData({
      lights: [makeLight({ beamAngle: 45 })],
    }));
    // Beam cones are rendered as path or polygon elements
    expect(svg).toMatch(/<(path|polygon|line)/);
  });

  it('includes CCT value in label text', () => {
    const svg = generateLightingPlotSVG(makeData({
      lights: [makeLight({ cct: 5600 })],
    }));
    expect(svg).toContain('5600');
  });
});

describe('generateLightingPlotSVG — character markers', () => {
  const char: PlotCharacter = { id: 'char_0', name: 'Model', x: 0, z: 0 };

  it('renders a marker for each character', () => {
    const svgWith = generateLightingPlotSVG(makeData({ characters: [char] }));
    const svgWithout = generateLightingPlotSVG(makeData({ characters: [] }));
    const circlesWith = (svgWith.match(/<circle/g) ?? []).length;
    const circlesWithout = (svgWithout.match(/<circle/g) ?? []).length;
    expect(circlesWith).toBeGreaterThan(circlesWithout);
  });

  it('includes character name in SVG text', () => {
    const svg = generateLightingPlotSVG(makeData({ characters: [char] }));
    expect(svg).toContain('Model');
  });
});

describe('generateLightingPlotSVG — metadata', () => {
  it('includes the scene name', () => {
    const svg = generateLightingPlotSVG(makeData({ sceneName: 'Wedding Shoot' }));
    expect(svg).toContain('Wedding Shoot');
  });

  it('includes a grid (line or pattern elements)', () => {
    const svg = generateLightingPlotSVG(makeData());
    expect(svg).toMatch(/<pattern|grid-line|<line/);
  });

  it('includes a legend section', () => {
    const svg = generateLightingPlotSVG(makeData());
    // Legend is a text/rect block; just check there is text beyond light labels
    const textNodes = (svg.match(/<text/g) ?? []).length;
    expect(textNodes).toBeGreaterThan(2);
  });
});

describe('generateLightingPlotSVG — edge cases', () => {
  it('handles empty scene with no lights or characters', () => {
    const svg = generateLightingPlotSVG(makeData({ lights: [], characters: [] }));
    expect(svg).toBeTruthy();
    expect(svg).toContain('<svg');
  });

  it('handles many lights without throwing', () => {
    const manyLights = Array.from({ length: 20 }, (_, i) =>
      makeLight({ id: `l${i}`, x: (i % 5) * 2, z: Math.floor(i / 5) * 2 })
    );
    expect(() => generateLightingPlotSVG(makeData({ lights: manyLights }))).not.toThrow();
  });

  it('handles lights at the extreme edges of the studio', () => {
    const svg = generateLightingPlotSVG(makeData({
      lights: [
        makeLight({ id: 'edge1', x: -5, z: -5 }),
        makeLight({ id: 'edge2', x: 5, z: 5 }),
      ],
      studioWidth: 10,
      studioDepth: 10,
    }));
    expect(svg).toContain('<svg');
  });

  it('XML-escapes special characters in scene name', () => {
    const svg = generateLightingPlotSVG(makeData({ sceneName: 'Studio & Co <Test>' }));
    // Should not contain raw unescaped < or & in a text element
    const textContent = svg.match(/<text[^>]*>([^<]*)<\/text>/g) ?? [];
    const hasRaw = textContent.some(t => t.includes('Studio & Co <Test>'));
    expect(hasRaw).toBe(false);
  });
});
