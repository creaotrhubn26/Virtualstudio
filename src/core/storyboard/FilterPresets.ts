/**
 * FilterPresets - Cinematic filter presets for storyboard frame editing
 * 
 * Pre-configured ColorGradeSettings for quick application of common looks.
 * Each preset simulates a popular film look or color treatment.
 */

import { ColorGradeSettings, DEFAULT_COLOR_SETTINGS } from './LinearColorPipeline';

// =============================================================================
// Types
// =============================================================================

export interface FilterPreset {
  id: string;
  name: string;
  nameNo: string; // Norwegian translation
  description: string;
  descriptionNo: string;
  category: FilterCategory;
  settings: ColorGradeSettings;
  thumbnailGradient?: string; // CSS gradient for preview
  icon?: string;
}

export type FilterCategory = 
  | 'cinematic' 
  | 'vintage' 
  | 'mood' 
  | 'color-grade' 
  | 'black-white' 
  | 'specialty';

// =============================================================================
// Filter Presets
// =============================================================================

export const FILTER_PRESETS: FilterPreset[] = [
  // === CINEMATIC ===
  {
    id: 'cinema-blockbuster',
    name: 'Blockbuster',
    nameNo: 'Blockbuster',
    description: 'High contrast, teal shadows, orange highlights - the Hollywood look',
    descriptionNo: 'Høy kontrast, blågrønne skygger, oransje høylys - Hollywood-stilen',
    category: 'cinematic',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.1,
      contrast: 25,
      highlights: -15,
      shadows: 10,
      temperature: 5500,
      tint: -5,
      saturation: 15,
      vibrance: 20,
    },
    thumbnailGradient: 'linear-gradient(135deg, #006064 0%, #FF8C00 100%)',
  },
  {
    id: 'cinema-thriller',
    name: 'Thriller',
    nameNo: 'Thriller',
    description: 'Dark, desaturated with blue-green shadows',
    descriptionNo: 'Mørk, avmettet med blågrønne skygger',
    category: 'cinematic',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: -0.3,
      contrast: 20,
      highlights: -25,
      shadows: -15,
      blacks: -20,
      temperature: 5000,
      tint: -10,
      saturation: -30,
      vibrance: -10,
    },
    thumbnailGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  {
    id: 'cinema-romantic',
    name: 'Romantic',
    nameNo: 'Romantisk',
    description: 'Warm, soft, dreamy look with lifted blacks',
    descriptionNo: 'Varm, myk, drømmende stil med hevede svarte toner',
    category: 'cinematic',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.2,
      contrast: -10,
      highlights: -10,
      shadows: 20,
      blacks: 30,
      temperature: 7000,
      tint: 5,
      saturation: 5,
      vibrance: 15,
    },
    thumbnailGradient: 'linear-gradient(135deg, #FFB6C1 0%, #FFA07A 50%, #FFD700 100%)',
  },
  {
    id: 'cinema-scifi',
    name: 'Sci-Fi',
    nameNo: 'Sci-Fi',
    description: 'Cool, futuristic with high contrast and cyan tones',
    descriptionNo: 'Kjølig, futuristisk med høy kontrast og cyan toner',
    category: 'cinematic',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0,
      contrast: 30,
      highlights: 10,
      shadows: -10,
      blacks: -15,
      temperature: 4500,
      tint: -15,
      saturation: 10,
      vibrance: 25,
    },
    thumbnailGradient: 'linear-gradient(135deg, #0D1117 0%, #00BFFF 50%, #00CED1 100%)',
  },

  // === VINTAGE ===
  {
    id: 'vintage-70s',
    name: '70s Film',
    nameNo: '70-talls film',
    description: 'Warm, faded look with orange-brown tones',
    descriptionNo: 'Varm, falmet stil med oransje-brune toner',
    category: 'vintage',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.1,
      contrast: -15,
      highlights: -20,
      shadows: 15,
      blacks: 20,
      temperature: 7500,
      tint: 10,
      saturation: -20,
      vibrance: -10,
    },
    thumbnailGradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #F4A460 100%)',
  },
  {
    id: 'vintage-polaroid',
    name: 'Polaroid',
    nameNo: 'Polaroid',
    description: 'Classic instant camera look with muted colors',
    descriptionNo: 'Klassisk polaroid-stil med dempede farger',
    category: 'vintage',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.15,
      contrast: -20,
      highlights: -30,
      shadows: 25,
      blacks: 35,
      whites: -20,
      temperature: 6800,
      tint: 5,
      saturation: -25,
      vibrance: 10,
    },
    thumbnailGradient: 'linear-gradient(135deg, #DEB887 0%, #F5DEB3 50%, #FAEBD7 100%)',
  },
  {
    id: 'vintage-kodachrome',
    name: 'Kodachrome',
    nameNo: 'Kodachrome',
    description: 'Rich, saturated colors with warm shadows',
    descriptionNo: 'Rike, mettede farger med varme skygger',
    category: 'vintage',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.05,
      contrast: 15,
      highlights: -10,
      shadows: 5,
      temperature: 6200,
      tint: 3,
      saturation: 25,
      vibrance: 30,
    },
    thumbnailGradient: 'linear-gradient(135deg, #FF4500 0%, #FFD700 50%, #32CD32 100%)',
  },

  // === MOOD ===
  {
    id: 'mood-cold',
    name: 'Cold',
    nameNo: 'Kald',
    description: 'Cool blue tones for winter or night scenes',
    descriptionNo: 'Kjølige blå toner for vinter- eller nattscener',
    category: 'mood',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: -0.1,
      contrast: 10,
      highlights: -5,
      shadows: 5,
      temperature: 4000,
      tint: -10,
      saturation: -15,
      vibrance: 5,
    },
    thumbnailGradient: 'linear-gradient(135deg, #1E90FF 0%, #87CEEB 50%, #E0FFFF 100%)',
  },
  {
    id: 'mood-warm',
    name: 'Warm',
    nameNo: 'Varm',
    description: 'Golden hour warmth for sunset or cozy scenes',
    descriptionNo: 'Gyldne timer-varme for solnedgang eller koselige scener',
    category: 'mood',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.15,
      contrast: 5,
      highlights: 10,
      shadows: 15,
      temperature: 8000,
      tint: 10,
      saturation: 15,
      vibrance: 20,
    },
    thumbnailGradient: 'linear-gradient(135deg, #FF8C00 0%, #FFD700 50%, #FFFFE0 100%)',
  },
  {
    id: 'mood-dramatic',
    name: 'Dramatic',
    nameNo: 'Dramatisk',
    description: 'High contrast, deep shadows for intense scenes',
    descriptionNo: 'Høy kontrast, dype skygger for intense scener',
    category: 'mood',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: -0.2,
      contrast: 40,
      highlights: -20,
      shadows: -30,
      blacks: -25,
      whites: 15,
      temperature: 5500,
      saturation: 10,
      vibrance: 15,
    },
    thumbnailGradient: 'linear-gradient(135deg, #000000 0%, #2F2F2F 40%, #808080 100%)',
  },
  {
    id: 'mood-ethereal',
    name: 'Ethereal',
    nameNo: 'Eterisk',
    description: 'Soft, dreamy, otherworldly feel',
    descriptionNo: 'Myk, drømmende, overjordisk følelse',
    category: 'mood',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.3,
      contrast: -25,
      highlights: -20,
      shadows: 30,
      blacks: 40,
      temperature: 6000,
      tint: -5,
      saturation: -20,
      vibrance: 10,
    },
    thumbnailGradient: 'linear-gradient(135deg, #E6E6FA 0%, #FFF0F5 50%, #F0FFFF 100%)',
  },

  // === COLOR GRADE ===
  {
    id: 'grade-teal-orange',
    name: 'Teal & Orange',
    nameNo: 'Blågrønn & Oransje',
    description: 'The classic complementary color grade',
    descriptionNo: 'Den klassiske komplementære fargegraderingen',
    category: 'color-grade',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0,
      contrast: 15,
      highlights: 5,
      shadows: -5,
      temperature: 5800,
      tint: -8,
      saturation: 20,
      vibrance: 25,
    },
    thumbnailGradient: 'linear-gradient(135deg, #008B8B 0%, #20B2AA 25%, #FFA500 75%, #FF6347 100%)',
  },
  {
    id: 'grade-crushed-blacks',
    name: 'Crushed Blacks',
    nameNo: 'Knuste svarte',
    description: 'Deep blacks with lifted shadows for moody look',
    descriptionNo: 'Dype svarte med hevede skygger for stemningsfull stil',
    category: 'color-grade',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0,
      contrast: 20,
      shadows: -20,
      blacks: -40,
      temperature: 6000,
      saturation: -10,
    },
    thumbnailGradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 30%, #4a4a4a 100%)',
  },
  {
    id: 'grade-muted-pastel',
    name: 'Muted Pastel',
    nameNo: 'Dempet pastell',
    description: 'Soft, desaturated pastels for indie film look',
    descriptionNo: 'Myke, avmettede pastellfarger for indie-filmstil',
    category: 'color-grade',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.1,
      contrast: -20,
      highlights: -15,
      shadows: 20,
      blacks: 25,
      temperature: 6200,
      saturation: -35,
      vibrance: 15,
    },
    thumbnailGradient: 'linear-gradient(135deg, #DDA0DD 0%, #B0E0E6 50%, #F0E68C 100%)',
  },

  // === BLACK & WHITE ===
  {
    id: 'bw-classic',
    name: 'B&W Classic',
    nameNo: 'S/H Klassisk',
    description: 'Classic black and white conversion',
    descriptionNo: 'Klassisk svart-hvitt konvertering',
    category: 'black-white',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0,
      contrast: 15,
      highlights: -10,
      shadows: 10,
      saturation: -100,
    },
    thumbnailGradient: 'linear-gradient(135deg, #000000 0%, #808080 50%, #FFFFFF 100%)',
  },
  {
    id: 'bw-high-contrast',
    name: 'B&W High Contrast',
    nameNo: 'S/H Høy kontrast',
    description: 'Punchy black and white with deep blacks',
    descriptionNo: 'Kraftig svart-hvitt med dype svarte toner',
    category: 'black-white',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0,
      contrast: 40,
      highlights: 15,
      shadows: -25,
      blacks: -30,
      whites: 20,
      saturation: -100,
    },
    thumbnailGradient: 'linear-gradient(135deg, #000000 0%, #000000 40%, #FFFFFF 60%, #FFFFFF 100%)',
  },
  {
    id: 'bw-film-noir',
    name: 'Film Noir',
    nameNo: 'Film Noir',
    description: 'Dark, moody black and white with deep shadows',
    descriptionNo: 'Mørk, stemningsfull svart-hvitt med dype skygger',
    category: 'black-white',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: -0.3,
      contrast: 35,
      highlights: -20,
      shadows: -35,
      blacks: -40,
      saturation: -100,
    },
    thumbnailGradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 70%, #3d3d3d 100%)',
  },

  // === SPECIALTY ===
  {
    id: 'special-day-for-night',
    name: 'Day for Night',
    nameNo: 'Dag for natt',
    description: 'Simulate nighttime from daylight footage',
    descriptionNo: 'Simuler natt fra dagslysopptak',
    category: 'specialty',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: -1.2,
      contrast: 25,
      highlights: -30,
      shadows: -20,
      blacks: -30,
      temperature: 4000,
      tint: -15,
      saturation: -40,
    },
    thumbnailGradient: 'linear-gradient(135deg, #191970 0%, #000080 50%, #0D0D0D 100%)',
  },
  {
    id: 'special-flashback',
    name: 'Flashback',
    nameNo: 'Tilbakeblikk',
    description: 'Soft, warm, slightly desaturated for memory scenes',
    descriptionNo: 'Myk, varm, lett avmettet for minnescener',
    category: 'specialty',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0.2,
      contrast: -15,
      highlights: -25,
      shadows: 25,
      blacks: 30,
      temperature: 7200,
      tint: 8,
      saturation: -25,
      vibrance: -15,
    },
    thumbnailGradient: 'linear-gradient(135deg, #FFEFD5 0%, #FFDAB9 50%, #EEE8AA 100%)',
  },
  {
    id: 'special-bleach-bypass',
    name: 'Bleach Bypass',
    nameNo: 'Bleach Bypass',
    description: 'High contrast, desaturated with metallic look',
    descriptionNo: 'Høy kontrast, avmettet med metallisk utseende',
    category: 'specialty',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: 0,
      contrast: 35,
      highlights: -10,
      shadows: -15,
      blacks: -20,
      temperature: 5800,
      saturation: -50,
      vibrance: 10,
    },
    thumbnailGradient: 'linear-gradient(135deg, #2F4F4F 0%, #708090 50%, #C0C0C0 100%)',
  },
  {
    id: 'special-horror',
    name: 'Horror',
    nameNo: 'Skrekk',
    description: 'Green-tinged, desaturated, unsettling look',
    descriptionNo: 'Grønnskjær, avmettet, urovekkende stil',
    category: 'specialty',
    settings: {
      ...DEFAULT_COLOR_SETTINGS,
      exposure: -0.2,
      contrast: 20,
      highlights: -15,
      shadows: -25,
      blacks: -30,
      temperature: 5000,
      tint: -20,
      saturation: -35,
      vibrance: -20,
    },
    thumbnailGradient: 'linear-gradient(135deg, #013220 0%, #1a1a1a 50%, #2F4F4F 100%)',
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get filter preset by ID
 */
export function getFilterById(id: string): FilterPreset | undefined {
  return FILTER_PRESETS.find(f => f.id === id);
}

/**
 * Get filters by category
 */
export function getFiltersByCategory(category: FilterCategory): FilterPreset[] {
  return FILTER_PRESETS.filter(f => f.category === category);
}

/**
 * Get all filter categories
 */
export function getAllFilterCategories(): FilterCategory[] {
  return ['cinematic', 'vintage', 'mood', 'color-grade', 'black-white', 'specialty'];
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: FilterCategory, norwegian = false): string {
  const names: Record<FilterCategory, { en: string; no: string }> = {
    cinematic: { en: 'Cinematic', no: 'Filmatisk' },
    vintage: { en: 'Vintage', no: 'Vintage' },
    mood: { en: 'Mood', no: 'Stemning' },
    'color-grade': { en: 'Color Grade', no: 'Fargegradering' },
    'black-white': { en: 'Black & White', no: 'Svart & Hvitt' },
    specialty: { en: 'Specialty', no: 'Spesialeffekter' },
  };
  return norwegian ? names[category].no : names[category].en;
}

/**
 * Blend two filter settings (for transitions)
 */
export function blendFilters(
  from: ColorGradeSettings,
  to: ColorGradeSettings,
  t: number // 0-1 blend factor
): ColorGradeSettings {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  
  return {
    exposure: lerp(from.exposure, to.exposure),
    highlights: lerp(from.highlights, to.highlights),
    shadows: lerp(from.shadows, to.shadows),
    whites: lerp(from.whites, to.whites),
    blacks: lerp(from.blacks, to.blacks),
    contrast: lerp(from.contrast, to.contrast),
    temperature: lerp(from.temperature, to.temperature),
    tint: lerp(from.tint, to.tint),
    saturation: lerp(from.saturation, to.saturation),
    vibrance: lerp(from.vibrance, to.vibrance),
  };
}

/**
 * Calculate filter intensity (for preview slider)
 */
export function applyFilterIntensity(
  settings: ColorGradeSettings,
  intensity: number // 0-100
): ColorGradeSettings {
  return blendFilters(DEFAULT_COLOR_SETTINGS, settings, intensity / 100);
}

export default FILTER_PRESETS;
