import { describe, expect, it } from 'vitest';

import { buildBrandPaletteOptions } from './brandPaletteService';

describe('brandPaletteService', () => {
  it('builds three palette options from a base palette', () => {
    const options = buildBrandPaletteOptions(['#c0392b', '#f4e7d3', '#1f2937']);

    expect(options).toHaveLength(3);
    expect(options[0].colors[0]).toBe('#c0392b');
    expect(options[0].colors[1]).toBe('#f4e7d3');
    expect(options[1].colors.length).toBeGreaterThanOrEqual(4);
    expect(options[2].colors).toContain('#111827');
  });

  it('falls back to a safe palette when input is empty', () => {
    const options = buildBrandPaletteOptions([]);

    expect(options[0].colors[0]).toBe('#c0392b');
    expect(options[0].colors.length).toBeGreaterThan(0);
  });
});
