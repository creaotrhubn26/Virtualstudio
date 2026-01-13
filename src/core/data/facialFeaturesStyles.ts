/**
 * Facial Features Definitions
 * Noses, Ears, Mouths, Eyebrows, Facial Hair
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FacialFeatureCategory = 'noses' | 'ears' | 'mouths' | 'eyebrows' | 'facial_hair';

export interface FacialFeatureStyle {
  id: string;
  name: string;
  category: FacialFeatureCategory;
  modelUrl: string;
  thumbnailUrl?: string;
  defaultColor?: {
    hue: number;
    saturation: number;
    lightness: number;
  };
  defaultMaterial?: {
    roughness: number;
    metallic: number;
  };
  tags: string[];
  gender?: 'male' | 'female' | 'unisex';
  ageGroup?: 'child' | 'teen' | 'adult' | 'elderly' | 'any';
}

// ============================================================================
// FACIAL FEATURE DEFINITIONS
// ============================================================================

export const FACIAL_FEATURES: FacialFeatureStyle[] = [
  // === NOSES ===
  {
    id: 'nose_small',
    name: 'Small Button Nose',
    category: 'noses',
    modelUrl: '/models/facial_features/noses/nose_small.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['small', 'button', 'cute', 'feminine'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'nose_medium',
    name: 'Medium Nose',
    category: 'noses',
    modelUrl: '/models/facial_features/noses/nose_medium.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['medium', 'neutral', 'average', 'balanced'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'nose_large',
    name: 'Large Prominent Nose',
    category: 'noses',
    modelUrl: '/models/facial_features/noses/nose_large.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['large', 'prominent', 'strong', 'masculine'],
    gender: 'unisex',
    ageGroup: 'adult'
  },
  {
    id: 'nose_wide',
    name: 'Wide Nose',
    category: 'noses',
    modelUrl: '/models/facial_features/noses/nose_wide.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['wide', 'broad', 'ethnic'],
    gender: 'unisex',
    ageGroup: 'any'
  },

  // === EARS ===
  {
    id: 'ears_normal',
    name: 'Normal Ears',
    category: 'ears',
    modelUrl: '/models/facial_features/ears/ears_normal.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['normal', 'average', 'standard', 'realistic'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'ears_large',
    name: 'Large Ears',
    category: 'ears',
    modelUrl: '/models/facial_features/ears/ears_large.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['large', 'prominent', 'distinctive'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'ears_elf',
    name: 'Elf Ears',
    category: 'ears',
    modelUrl: '/models/facial_features/ears/ears_elf.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['pointed', 'elf', 'fantasy', 'magical'],
    gender: 'unisex',
    ageGroup: 'any'
  },

  // === MOUTHS ===
  {
    id: 'lips_thin',
    name: 'Thin Lips',
    category: 'mouths',
    modelUrl: '/models/facial_features/mouths/lips_thin.glb',
    defaultColor: { hue: 0, saturation: 60, lightness: 50 },
    defaultMaterial: { roughness: 0.6, metallic: 0 },
    tags: ['thin', 'slim', 'subtle', 'masculine'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'lips_full',
    name: 'Full Lips',
    category: 'mouths',
    modelUrl: '/models/facial_features/mouths/lips_full.glb',
    defaultColor: { hue: 0, saturation: 60, lightness: 50 },
    defaultMaterial: { roughness: 0.6, metallic: 0 },
    tags: ['full', 'plump', 'sensual', 'feminine'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'mouth_smile',
    name: 'Smiling Mouth',
    category: 'mouths',
    modelUrl: '/models/facial_features/mouths/mouth_smile.glb',
    defaultColor: { hue: 0, saturation: 60, lightness: 50 },
    defaultMaterial: { roughness: 0.6, metallic: 0 },
    tags: ['smile', 'happy', 'friendly', 'cheerful'],
    gender: 'unisex',
    ageGroup: 'any'
  },

  // === EYEBROWS ===
  {
    id: 'eyebrows_thin',
    name: 'Thin Eyebrows',
    category: 'eyebrows',
    modelUrl: '/models/facial_features/eyebrows/eyebrows_thin.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['thin', 'arched', 'refined', 'feminine'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyebrows_thick',
    name: 'Thick Eyebrows',
    category: 'eyebrows',
    modelUrl: '/models/facial_features/eyebrows/eyebrows_thick.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['thick', 'bushy', 'bold', 'masculine'],
    gender: 'unisex',
    ageGroup: 'any'
  },
  {
    id: 'eyebrows_curved',
    name: 'Curved Eyebrows',
    category: 'eyebrows',
    modelUrl: '/models/facial_features/eyebrows/eyebrows_curved.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['curved', 'expressive', 'elegant'],
    gender: 'unisex',
    ageGroup: 'any'
  },

  // === FACIAL HAIR ===
  {
    id: 'beard_full',
    name: 'Full Beard',
    category: 'facial_hair',
    modelUrl: '/models/facial_features/facial_hair/beard_full.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['beard', 'full', 'masculine', 'mature'],
    gender: 'male',
    ageGroup: 'adult'
  },
  {
    id: 'beard_goatee',
    name: 'Goatee',
    category: 'facial_hair',
    modelUrl: '/models/facial_features/facial_hair/beard_goatee.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['goatee', 'trimmed', 'stylish', 'masculine'],
    gender: 'male',
    ageGroup: 'adult'
  },
  {
    id: 'mustache_classic',
    name: 'Classic Mustache',
    category: 'facial_hair',
    modelUrl: '/models/facial_features/facial_hair/mustache_classic.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['mustache', 'handlebar', 'classic', 'vintage'],
    gender: 'male',
    ageGroup: 'adult'
  },
  {
    id: 'mustache_thin',
    name: 'Thin Mustache',
    category: 'facial_hair',
    modelUrl: '/models/facial_features/facial_hair/mustache_thin.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['mustache', 'thin', 'pencil', 'refined'],
    gender: 'male',
    ageGroup: 'adult'
  },
  {
    id: 'beard_stubble',
    name: '5 O\'Clock Shadow',
    category: 'facial_hair',
    modelUrl: '/models/facial_features/facial_hair/beard_stubble.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['stubble', 'short', 'rugged', 'casual'],
    gender: 'male',
    ageGroup: 'adult'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getFacialFeatureById(id: string): FacialFeatureStyle | undefined {
  return FACIAL_FEATURES.find(feature => feature.id === id);
}

export function getFacialFeaturesByCategory(category: FacialFeatureCategory): FacialFeatureStyle[] {
  return FACIAL_FEATURES.filter(feature => feature.category === category);
}

export function getFacialFeaturesByGender(gender: 'male' | 'female' | 'unisex'): FacialFeatureStyle[] {
  return FACIAL_FEATURES.filter(feature => feature.gender === gender || feature.gender === 'unisex');
}

export function getFacialFeaturesByTags(tags: string[]): FacialFeatureStyle[] {
  return FACIAL_FEATURES.filter(feature =>
    tags.some(tag => feature.tags.includes(tag))
  );
}

// Group by category for UI
export const FACIAL_FEATURES_BY_CATEGORY = {
  noses: getFacialFeaturesByCategory('noses'),
  ears: getFacialFeaturesByCategory('ears'),
  mouths: getFacialFeaturesByCategory('mouths'),
  eyebrows: getFacialFeaturesByCategory('eyebrows'),
  facial_hair: getFacialFeaturesByCategory('facial_hair')
};
