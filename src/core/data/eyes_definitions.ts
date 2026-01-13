/**
 * Eye Definitions and Color Presets
 * To be merged into facialFeaturesStyles.ts after GLB generation completes
 */

// Add 'eyes' to FacialFeatureCategory type:
// export type FacialFeatureCategory = 'noses' | 'ears' | 'mouths' | 'eyebrows' | 'facial_hair' | 'eyes';

// ============================================================================
// EYE COLOR PRESETS
// ============================================================================

export interface EyeColorPreset {
  id: string;
  name: string;
  hue: number;
  saturation: number;
  lightness: number;
}

export const EYE_COLOR_PRESETS: EyeColorPreset[] = [
  { id: 'brown_dark', name: 'Dark Brown', hue: 30, saturation: 60, lightness: 25 },
  { id: 'brown_medium', name: 'Medium Brown', hue: 30, saturation: 50, lightness: 40 },
  { id: 'brown_light', name: 'Light Brown', hue: 30, saturation: 40, lightness: 55 },
  { id: 'hazel', name: 'Hazel', hue: 35, saturation: 55, lightness: 45 },
  { id: 'amber', name: 'Amber', hue: 40, saturation: 70, lightness: 50 },
  { id: 'green', name: 'Green', hue: 120, saturation: 45, lightness: 45 },
  { id: 'blue_light', name: 'Light Blue', hue: 210, saturation: 55, lightness: 65 },
  { id: 'blue_medium', name: 'Medium Blue', hue: 210, saturation: 60, lightness: 50 },
  { id: 'blue_dark', name: 'Dark Blue', hue: 210, saturation: 70, lightness: 35 },
  { id: 'gray', name: 'Gray', hue: 200, saturation: 10, lightness: 55 },
  { id: 'violet', name: 'Violet', hue: 270, saturation: 50, lightness: 50 },
];

// ============================================================================
// EYE DEFINITIONS (Add to FACIAL_FEATURES array)
// ============================================================================

const EYES_TO_ADD = [
  {
    id: 'eyes_almond',
    name: 'Almond Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_almond.glb',
    defaultColor: { hue: 30, saturation: 50, lightness: 40 }, // Medium brown
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['almond', 'classic', 'elegant', 'symmetrical'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyes_round',
    name: 'Round Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_round.glb',
    defaultColor: { hue: 210, saturation: 60, lightness: 50 }, // Medium blue
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['round', 'large', 'expressive', 'innocent'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyes_hooded',
    name: 'Hooded Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_hooded.glb',
    defaultColor: { hue: 120, saturation: 45, lightness: 45 }, // Green
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['hooded', 'sultry', 'mysterious', 'mature'],
    gender: 'unisex',
    ageGroup: 'adult'
  },
  {
    id: 'eyes_upturned',
    name: 'Upturned Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_upturned.glb',
    defaultColor: { hue: 35, saturation: 55, lightness: 45 }, // Hazel
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['upturned', 'cat-like', 'exotic', 'sharp'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyes_downturned',
    name: 'Downturned Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_downturned.glb',
    defaultColor: { hue: 30, saturation: 60, lightness: 25 }, // Dark brown
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['downturned', 'gentle', 'soft', 'kind'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyes_wide',
    name: 'Wide Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_wide.glb',
    defaultColor: { hue: 210, saturation: 55, lightness: 65 }, // Light blue
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['wide', 'alert', 'surprised', 'bright'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyes_narrow',
    name: 'Narrow Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_narrow.glb',
    defaultColor: { hue: 200, saturation: 10, lightness: 55 }, // Gray
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['narrow', 'mysterious', 'elegant', 'focused'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyes_deep_set',
    name: 'Deep-Set Eyes',
    category: 'eyes',
    modelUrl: '/models/facial_features/eyes/eyes_deep_set.glb',
    defaultColor: { hue: 210, saturation: 70, lightness: 35 }, // Dark blue
    defaultMaterial: { roughness: 0.3, metallic: 0.1 },
    tags: ['deep-set', 'intense', 'strong', 'masculine'],
    gender: 'unisex',
    ageGroup: 'adult'
  },
];

// Note: Eyes have lower roughness (0.3) and slight metallic (0.1) for glossy, wet appearance
