/**
 * Head Accessories Definitions
 * Hats, Hair, Headbands, Crowns, Helmets
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HeadAccessoryCategory = 'hats' | 'hair' | 'headbands' | 'crowns' | 'helmets';

export type HairLength = 'bald' | 'short' | 'medium' | 'long';
export type AccessoryStyle = 'casual' | 'formal' | 'fantasy' | 'sport' | 'vintage' | 'punk';

export interface HeadAccessoryStyle {
  id: string;
  name: string;
  category: HeadAccessoryCategory;
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
  style?: AccessoryStyle;
  gender?: 'male' | 'female' | 'unisex';
  hairLength?: HairLength;
}

// ============================================================================
// HEAD ACCESSORY DEFINITIONS
// ============================================================================

export const HEAD_ACCESSORIES: HeadAccessoryStyle[] = [
  // === HATS ===
  {
    id: 'hat_baseball_cap',
    name: 'Baseball Cap',
    category: 'hats',
    modelUrl: '/models/head_accessories/hats/hat_baseball_cap.glb',
    defaultColor: { hue: 220, saturation: 80, lightness: 40 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['casual', 'sports', 'modern', 'adjustable'],
    style: 'casual',
    gender: 'unisex'
  },
  {
    id: 'hat_fedora',
    name: 'Fedora',
    category: 'hats',
    modelUrl: '/models/head_accessories/hats/hat_fedora.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 20 },
    defaultMaterial: { roughness: 0.6, metallic: 0 },
    tags: ['formal', 'classic', 'stylish', 'vintage'],
    style: 'formal',
    gender: 'unisex'
  },
  {
    id: 'hat_cowboy',
    name: 'Cowboy Hat',
    category: 'hats',
    modelUrl: '/models/head_accessories/hats/hat_cowboy.glb',
    defaultColor: { hue: 30, saturation: 60, lightness: 40 },
    defaultMaterial: { roughness: 0.6, metallic: 0 },
    tags: ['western', 'leather', 'wide-brim', 'rugged'],
    style: 'casual',
    gender: 'unisex'
  },
  {
    id: 'hat_witch',
    name: 'Witch Hat',
    category: 'hats',
    modelUrl: '/models/head_accessories/hats/hat_witch.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['fantasy', 'magical', 'pointed', 'halloween'],
    style: 'fantasy',
    gender: 'unisex'
  },
  {
    id: 'hat_top_hat',
    name: 'Top Hat',
    category: 'hats',
    modelUrl: '/models/head_accessories/hats/hat_top_hat.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.3, metallic: 0.05 },
    tags: ['formal', 'elegant', 'victorian', 'tall'],
    style: 'formal',
    gender: 'unisex'
  },

  // === HAIR ===
  {
    id: 'hair_short_male',
    name: 'Short Male Cut',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_short_male.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['short', 'clean', 'modern', 'masculine'],
    style: 'casual',
    gender: 'male',
    hairLength: 'short'
  },
  {
    id: 'hair_long_straight',
    name: 'Long Straight Hair',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_long_straight.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['long', 'straight', 'flowing', 'elegant'],
    style: 'casual',
    gender: 'unisex',
    hairLength: 'long'
  },
  {
    id: 'hair_curly',
    name: 'Curly Hair',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_curly.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['curly', 'voluminous', 'natural', 'textured'],
    style: 'casual',
    gender: 'unisex',
    hairLength: 'medium'
  },
  {
    id: 'hair_ponytail',
    name: 'High Ponytail',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_ponytail.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['ponytail', 'tied', 'athletic', 'practical'],
    style: 'sport',
    gender: 'female',
    hairLength: 'long'
  },
  {
    id: 'hair_bun',
    name: 'Hair Bun',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_bun.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['bun', 'updo', 'elegant', 'formal'],
    style: 'formal',
    gender: 'female',
    hairLength: 'long'
  },
  {
    id: 'hair_braided',
    name: 'Braided Hair',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_braided.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['braided', 'twin-braids', 'styled', 'intricate'],
    style: 'casual',
    gender: 'female',
    hairLength: 'long'
  },
  {
    id: 'hair_mohawk',
    name: 'Mohawk',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_mohawk.glb',
    defaultColor: { hue: 300, saturation: 80, lightness: 50 },
    defaultMaterial: { roughness: 0.9, metallic: 0 },
    tags: ['mohawk', 'punk', 'spiky', 'edgy'],
    style: 'punk',
    gender: 'unisex',
    hairLength: 'short'
  },
  {
    id: 'hair_bald',
    name: 'Bald Head',
    category: 'hair',
    modelUrl: '/models/head_accessories/hair/hair_bald.glb',
    defaultColor: { hue: 25, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['bald', 'smooth', 'clean', 'simple'],
    style: 'casual',
    gender: 'unisex',
    hairLength: 'bald'
  },

  // === HEADBANDS ===
  {
    id: 'headband_sport',
    name: 'Sport Headband',
    category: 'headbands',
    modelUrl: '/models/head_accessories/headbands/headband_sport.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 100 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['athletic', 'sweatband', 'sport', 'practical'],
    style: 'sport',
    gender: 'unisex'
  },
  {
    id: 'headband_flower',
    name: 'Flower Crown',
    category: 'headbands',
    modelUrl: '/models/head_accessories/headbands/headband_flower.glb',
    defaultColor: { hue: 340, saturation: 70, lightness: 60 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['floral', 'decorative', 'feminine', 'natural'],
    style: 'casual',
    gender: 'female'
  },
  {
    id: 'headband_metal',
    name: 'Metal Circlet',
    category: 'headbands',
    modelUrl: '/models/head_accessories/headbands/headband_metal.glb',
    defaultColor: { hue: 45, saturation: 60, lightness: 70 },
    defaultMaterial: { roughness: 0.3, metallic: 0.8 },
    tags: ['metal', 'fantasy', 'gem', 'elegant'],
    style: 'fantasy',
    gender: 'unisex'
  },

  // === CROWNS ===
  {
    id: 'crown_gold',
    name: 'Royal Crown',
    category: 'crowns',
    modelUrl: '/models/head_accessories/crowns/crown_gold.glb',
    defaultColor: { hue: 50, saturation: 100, lightness: 50 },
    defaultMaterial: { roughness: 0.2, metallic: 0.9 },
    tags: ['gold', 'royal', 'jeweled', 'king'],
    style: 'fantasy',
    gender: 'unisex'
  },
  {
    id: 'tiara_princess',
    name: 'Princess Tiara',
    category: 'crowns',
    modelUrl: '/models/head_accessories/crowns/tiara_princess.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 90 },
    defaultMaterial: { roughness: 0.2, metallic: 0.8 },
    tags: ['silver', 'tiara', 'princess', 'diamonds'],
    style: 'fantasy',
    gender: 'female'
  },
  {
    id: 'crown_laurel',
    name: 'Laurel Wreath',
    category: 'crowns',
    modelUrl: '/models/head_accessories/crowns/crown_laurel.glb',
    defaultColor: { hue: 50, saturation: 100, lightness: 50 },
    defaultMaterial: { roughness: 0.3, metallic: 0.7 },
    tags: ['laurel', 'roman', 'golden', 'victory'],
    style: 'vintage',
    gender: 'unisex'
  },

  // === HELMETS ===
  {
    id: 'helmet_knight',
    name: 'Knight Helmet',
    category: 'helmets',
    modelUrl: '/models/head_accessories/helmets/helmet_knight.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 50 },
    defaultMaterial: { roughness: 0.4, metallic: 0.9 },
    tags: ['medieval', 'armor', 'steel', 'protection'],
    style: 'fantasy',
    gender: 'unisex'
  },
  {
    id: 'helmet_viking',
    name: 'Viking Helmet',
    category: 'helmets',
    modelUrl: '/models/head_accessories/helmets/helmet_viking.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 40 },
    defaultMaterial: { roughness: 0.5, metallic: 0.8 },
    tags: ['viking', 'horned', 'norse', 'warrior'],
    style: 'fantasy',
    gender: 'unisex'
  },
  {
    id: 'helmet_space',
    name: 'Space Helmet',
    category: 'helmets',
    modelUrl: '/models/head_accessories/helmets/helmet_space.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 95 },
    defaultMaterial: { roughness: 0.2, metallic: 0.6 },
    tags: ['futuristic', 'sci-fi', 'astronaut', 'visor'],
    style: 'casual',
    gender: 'unisex'
  },
  {
    id: 'helmet_bike',
    name: 'Bike Helmet',
    category: 'helmets',
    modelUrl: '/models/head_accessories/helmets/helmet_bike.glb',
    defaultColor: { hue: 0, saturation: 80, lightness: 50 },
    defaultMaterial: { roughness: 0.5, metallic: 0 },
    tags: ['bicycle', 'safety', 'modern', 'vented'],
    style: 'sport',
    gender: 'unisex'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getHeadAccessoryById(id: string): HeadAccessoryStyle | undefined {
  return HEAD_ACCESSORIES.find(accessory => accessory.id === id);
}

export function getHeadAccessoriesByCategory(category: HeadAccessoryCategory): HeadAccessoryStyle[] {
  return HEAD_ACCESSORIES.filter(accessory => accessory.category === category);
}

export function getHeadAccessoriesByStyle(style: AccessoryStyle): HeadAccessoryStyle[] {
  return HEAD_ACCESSORIES.filter(accessory => accessory.style === style);
}

export function getHeadAccessoriesByGender(gender: 'male' | 'female' | 'unisex'): HeadAccessoryStyle[] {
  return HEAD_ACCESSORIES.filter(accessory => accessory.gender === gender || accessory.gender === 'unisex');
}

export function getHairByLength(length: HairLength): HeadAccessoryStyle[] {
  return HEAD_ACCESSORIES.filter(accessory => 
    accessory.category === 'hair' && accessory.hairLength === length
  );
}

export function getHeadAccessoriesByTags(tags: string[]): HeadAccessoryStyle[] {
  return HEAD_ACCESSORIES.filter(accessory =>
    tags.some(tag => accessory.tags.includes(tag))
  );
}

// Group by category for UI
export const HEAD_ACCESSORIES_BY_CATEGORY = {
  hats: getHeadAccessoriesByCategory('hats'),
  hair: getHeadAccessoriesByCategory('hair'),
  headbands: getHeadAccessoriesByCategory('headbands'),
  crowns: getHeadAccessoriesByCategory('crowns'),
  helmets: getHeadAccessoriesByCategory('helmets')
};
