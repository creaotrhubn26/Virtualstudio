/**
 * A place that belongs to someone.
 *
 * The pizzeria the studio builds is *a* pizzeria. A brand makes it *theirs*:
 * the name over the door, the line under it, the two colours everything else
 * is trimmed with, the board on the pavement. Nothing here is decoration —
 * the sign is emissive, so a red brand actually throws red light on whoever
 * stands under it, which is the whole reason the place is geometry and not a
 * photograph behind the figure.
 *
 * This module is the data and the arithmetic only: what a brand is, what it
 * falls back to, and the contrast and initials that have one right answer.
 * Drawing it onto a surface is `brandTextures.ts`, which needs a scene.
 */

export interface StudioBrand {
  /** What the place is called. Goes on the sign over the door. */
  name: string;
  /** The line under the name: what the place actually sells. */
  tagline: string;
  /** The board on the pavement. Two or three short lines. */
  slogan: string;
  /** The colour the brand shouts with, as #rrggbb. Sign glow, trim, rules. */
  accent: string;
  /** What it is all printed on, as #rrggbb. */
  surface: string;
  /** An uploaded logo, drawn on the disc instead of the initials. */
  logoUrl?: string;
}

/**
 * The unbranded default.
 *
 * Deliberately generic: a studio that shipped with somebody's real restaurant
 * on the sign would be putting words in their mouth. The panel is one text
 * field away from their own.
 */
export const DEFAULT_BRAND: StudioBrand = {
  name: 'Pizzeria',
  tagline: 'PIZZA · STREET FOOD',
  slogan: 'VARM.\nFERSK.\nHVER DAG.',
  accent: '#e03a20',
  surface: '#14110f',
};

const HEX = /^#[0-9a-f]{6}$/i;

/** A colour the renderer can use, or the fallback if it is not one. */
export function brandColour(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}

/** sRGB channels, 0 to 1. */
export function brandRgb(hex: string): { r: number; g: number; b: number } {
  const safe = HEX.test(hex) ? hex : DEFAULT_BRAND.accent;
  return {
    r: parseInt(safe.slice(1, 3), 16) / 255,
    g: parseInt(safe.slice(3, 5), 16) / 255,
    b: parseInt(safe.slice(5, 7), 16) / 255,
  };
}

/**
 * Relative luminance, ITU-R BT.709 on linearised channels.
 *
 * Used to decide what colour text can be read on a surface. Averaging the
 * channels instead would call pure blue and pure yellow equally bright, and
 * put black text on navy.
 */
export function brandLuminance(hex: string): number {
  const { r, g, b } = brandRgb(hex);
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Black or white, whichever can be read on this colour. */
export function readableOn(hex: string): '#000000' | '#ffffff' {
  // The 0.179 crossover is where WCAG contrast against black and against
  // white are equal; anything lighter takes black text.
  return brandLuminance(hex) > 0.179 ? '#000000' : '#ffffff';
}

/**
 * The letters on the logo disc when there is no logo file.
 *
 * Two initials from the words of the name, or the first two letters when it is
 * one word. A disc with nothing on it reads as a mistake rather than a mark.
 */
export function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return DEFAULT_BRAND.name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** The most a sign can carry before it stops being readable across a street. */
export const MAX_BRAND_NAME = 28;
export const MAX_BRAND_TAGLINE = 48;
export const MAX_BRAND_SLOGAN = 60;

/**
 * A brand the renderer can build from, whatever the document contained.
 *
 * Anything missing or malformed falls back rather than failing: a scene should
 * open with a plain sign, never with no sign and an error.
 */
export function normaliseBrand(raw: unknown): StudioBrand {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (key: string, fallback: string, limit: number) => {
    const candidate = typeof value[key] === 'string' ? (value[key] as string).trim() : '';
    return candidate ? candidate.slice(0, limit) : fallback;
  };
  const logo = typeof value.logoUrl === 'string' && value.logoUrl.trim() ? value.logoUrl.trim() : undefined;
  return {
    name: text('name', DEFAULT_BRAND.name, MAX_BRAND_NAME),
    tagline: text('tagline', DEFAULT_BRAND.tagline, MAX_BRAND_TAGLINE),
    slogan: text('slogan', DEFAULT_BRAND.slogan, MAX_BRAND_SLOGAN),
    accent: brandColour(value.accent, DEFAULT_BRAND.accent),
    surface: brandColour(value.surface, DEFAULT_BRAND.surface),
    ...(logo ? { logoUrl: logo } : {}),
  };
}

/** Whether two brands would draw the same thing, so nothing is rebuilt for nothing. */
export function sameBrand(a: StudioBrand, b: StudioBrand): boolean {
  return a.name === b.name && a.tagline === b.tagline && a.slogan === b.slogan
    && a.accent === b.accent && a.surface === b.surface && a.logoUrl === b.logoUrl;
}
