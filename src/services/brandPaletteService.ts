export interface BrandPaletteOption {
  id: string;
  label: string;
  colors: string[];
  description: string;
}

const FALLBACK_PALETTE = ['#c0392b', '#f4e7d3', '#1f2937', '#f97316'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(value: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(value) || '#000000';
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);

  let hue = 0;
  switch (max) {
    case rn:
      hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
      break;
    case gn:
      hue = ((bn - rn) / delta + 2) / 6;
      break;
    default:
      hue = ((rn - gn) / delta + 4) / 6;
      break;
  }

  return { h: hue * 360, s: saturation, l: lightness };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360 / 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);

  if (saturation === 0) {
    const value = lightness * 255;
    return { r: value, g: value, b: value };
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const toChannel = (t: number): number => {
    let tc = t;
    if (tc < 0) tc += 1;
    if (tc > 1) tc -= 1;
    if (tc < 1 / 6) return p + (q - p) * 6 * tc;
    if (tc < 1 / 2) return q;
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
    return p;
  };

  return {
    r: toChannel(hue + 1 / 3) * 255,
    g: toChannel(hue) * 255,
    b: toChannel(hue - 1 / 3) * 255,
  };
}

function shiftColor(hex: string, adjustments: { hue?: number; saturation?: number; lightness?: number }): string {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const next = hslToRgb(
    hsl.h + (adjustments.hue || 0),
    hsl.s + (adjustments.saturation || 0),
    hsl.l + (adjustments.lightness || 0),
  );
  return rgbToHex(next.r, next.g, next.b);
}

function dedupeColors(colors: string[], limit = 5): string[] {
  const seen = new Set<string>();
  const palette: string[] = [];
  for (const raw of colors) {
    const normalized = normalizeHex(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    palette.push(normalized);
    if (palette.length >= limit) break;
  }
  return palette;
}

function quantizeChannel(value: number): number {
  return clamp(Math.round(value / 32) * 32, 0, 255);
}

export function buildBrandPaletteOptions(baseColors: string[]): BrandPaletteOption[] {
  const palette = dedupeColors(baseColors.length > 0 ? baseColors : FALLBACK_PALETTE, 5);
  const primary = palette[0] || FALLBACK_PALETTE[0];
  const secondary = palette[1] || shiftColor(primary, { hue: 24, saturation: -0.08, lightness: 0.12 });
  const accent = palette[2] || shiftColor(primary, { hue: 160, saturation: 0.08, lightness: -0.18 });
  const lightNeutral = palette[3] || shiftColor(primary, { saturation: -0.3, lightness: 0.34 });
  const darkNeutral = palette[4] || shiftColor(primary, { saturation: -0.22, lightness: -0.28 });

  return [
    {
      id: 'logo-original',
      label: 'Fra logo',
      description: 'Bruker de mest fremtredende fargene direkte fra logoen.',
      colors: dedupeColors([primary, secondary, accent, lightNeutral, darkNeutral], 5),
    },
    {
      id: 'logo-softened',
      label: 'Mykere brand',
      description: 'Lysere og mer editorial, fint for interiør, beauty og mat.',
      colors: dedupeColors([
        shiftColor(primary, { lightness: 0.08, saturation: -0.05 }),
        shiftColor(secondary, { lightness: 0.14, saturation: -0.1 }),
        shiftColor(accent, { lightness: 0.08 }),
        '#f6f1e8',
        shiftColor(darkNeutral, { lightness: -0.06 }),
      ], 5),
    },
    {
      id: 'logo-high-contrast',
      label: 'Høy kontrast',
      description: 'Sterkere kontrast for signage, uniformdetaljer og tydelige hero shots.',
      colors: dedupeColors([
        primary,
        shiftColor(primary, { hue: 180, saturation: 0.1, lightness: -0.12 }),
        accent,
        '#fff8ee',
        '#111827',
      ], 5),
    },
  ];
}

export async function extractBrandPaletteFromFile(file: File, limit = 5): Promise<string[]> {
  if (typeof window === 'undefined') {
    return FALLBACK_PALETTE.slice(0, limit);
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Could not read brand logo image'));
      nextImage.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return FALLBACK_PALETTE.slice(0, limit);
    }

    const targetWidth = 48;
    const aspectRatio = image.width > 0 ? image.height / image.width : 1;
    canvas.width = targetWidth;
    canvas.height = Math.max(24, Math.round(targetWidth * aspectRatio));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map<string, number>();

    for (let index = 0; index < imageData.length; index += 4) {
      const alpha = imageData[index + 3];
      if (alpha < 180) continue;

      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const brightness = (r + g + b) / 3;
      if (brightness < 18 || brightness > 245) continue;

      const key = rgbToHex(
        quantizeChannel(r),
        quantizeChannel(g),
        quantizeChannel(b),
      );
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const palette = [...buckets.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([hex]) => hex)
      .slice(0, limit);

    return dedupeColors(palette.length > 0 ? palette : FALLBACK_PALETTE, limit);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function extractBrandPaletteOptionsFromFile(file: File): Promise<BrandPaletteOption[]> {
  const basePalette = await extractBrandPaletteFromFile(file);
  return buildBrandPaletteOptions(basePalette);
}
