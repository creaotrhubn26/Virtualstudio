import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BRAND,
  MAX_BRAND_NAME,
  brandColour,
  brandInitials,
  brandLuminance,
  brandRgb,
  normaliseBrand,
  readableOn,
  sameBrand,
} from './studioBranding';

describe('a brand the renderer can always build from', () => {
  it('keeps what is given and falls back on what is not', () => {
    const brand = normaliseBrand({ name: 'Holy Crust', tagline: 'PIZZA · STREET FOOD', accent: '#E03A20' });
    expect(brand.name).toBe('Holy Crust');
    expect(brand.tagline).toBe('PIZZA · STREET FOOD');
    // Hex is normalised, not rejected for its case.
    expect(brand.accent).toBe('#e03a20');
    expect(brand.slogan).toBe(DEFAULT_BRAND.slogan);
    expect(brand.surface).toBe(DEFAULT_BRAND.surface);
  });

  it('opens with a plain sign rather than no sign', () => {
    // A scene should never come back from a broken document with an unlit,
    // untextured board over the door.
    for (const broken of [undefined, null, 42, 'red', { accent: 'not a colour', name: '   ' }]) {
      const brand = normaliseBrand(broken);
      expect(brand.name.length).toBeGreaterThan(0);
      expect(brand.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(brand.surface).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('cuts a name to what a sign can carry', () => {
    const brand = normaliseBrand({ name: 'x'.repeat(200) });
    expect(brand.name).toHaveLength(MAX_BRAND_NAME);
  });

  it('drops a logo that is not there', () => {
    expect(normaliseBrand({ logoUrl: '  ' }).logoUrl).toBeUndefined();
    expect(normaliseBrand({ logoUrl: '/assets/holycrust.png' }).logoUrl).toBe('/assets/holycrust.png');
  });

  it('knows when nothing would be drawn differently', () => {
    const a = normaliseBrand({ name: 'Holy Crust', accent: '#e03a20' });
    expect(sameBrand(a, normaliseBrand({ name: 'Holy Crust', accent: '#E03A20' }))).toBe(true);
    expect(sameBrand(a, normaliseBrand({ name: 'Holy Crust', accent: '#20e03a' }))).toBe(false);
  });
});

describe('colour arithmetic', () => {
  it('reads a hex colour as channels', () => {
    expect(brandRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
    expect(brandRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(brandRgb('#e03a20').r).toBeCloseTo(224 / 255, 10);
  });

  it('falls back rather than producing a colour of NaN', () => {
    expect(brandColour('tomato', '#123456')).toBe('#123456');
    expect(brandColour('#12345', '#123456')).toBe('#123456');
    expect(Object.values(brandRgb('nonsense')).every(Number.isFinite)).toBe(true);
  });

  it('puts readable text on any brand colour', () => {
    expect(readableOn('#ffffff')).toBe('#000000');
    expect(readableOn('#14110f')).toBe('#ffffff');
    // The case a channel average gets wrong: pure blue is dark, pure yellow is
    // light, and averaging calls them the same.
    expect(readableOn('#0000ff')).toBe('#ffffff');
    expect(readableOn('#ffff00')).toBe('#000000');
    expect(brandLuminance('#ffff00')).toBeGreaterThan(brandLuminance('#0000ff'));
  });
});

describe('the mark when there is no logo file', () => {
  it('takes the initials of the name', () => {
    expect(brandInitials('Holy Crust')).toBe('HC');
    expect(brandInitials('  pizza  palass ')).toBe('PP');
    expect(brandInitials('Pizzeria')).toBe('PI');
    // A blank disc reads as a mistake, not as a mark.
    expect(brandInitials('   ')).toHaveLength(2);
  });
});
