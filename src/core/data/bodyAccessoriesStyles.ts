/**
 * Body Accessories Definitions
 * Earrings, Necklaces, Bracelets, Watches, Bags
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type BodyAccessoryCategory = 'earrings' | 'necklaces' | 'bracelets' | 'watches' | 'bags';

export type JewelryMaterial = 'gold' | 'silver' | 'platinum' | 'beads' | 'pearls';
export type AccessoryFormality = 'casual' | 'formal' | 'sport';

export interface BodyAccessoryStyle {
  id: string;
  name: string;
  category: BodyAccessoryCategory;
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
  formality?: AccessoryFormality;
  gender?: 'male' | 'female' | 'unisex';
  material?: JewelryMaterial;
}

// ============================================================================
// BODY ACCESSORY DEFINITIONS
// ============================================================================

export const BODY_ACCESSORIES: BodyAccessoryStyle[] = [
  // === EARRINGS ===
  {
    id: 'earrings_studs',
    name: 'Stud Earrings',
    category: 'earrings',
    modelUrl: '/models/body_accessories/earrings/earrings_studs.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 95 },
    defaultMaterial: { roughness: 0.1, metallic: 0.9 },
    tags: ['studs', 'diamonds', 'simple', 'elegant'],
    formality: 'formal',
    gender: 'unisex',
    material: 'platinum'
  },
  {
    id: 'earrings_hoops',
    name: 'Hoop Earrings',
    category: 'earrings',
    modelUrl: '/models/body_accessories/earrings/earrings_hoops.glb',
    defaultColor: { hue: 50, saturation: 100, lightness: 50 },
    defaultMaterial: { roughness: 0.2, metallic: 0.9 },
    tags: ['hoops', 'circular', 'gold', 'bold'],
    formality: 'casual',
    gender: 'female',
    material: 'gold'
  },
  {
    id: 'earrings_dangling',
    name: 'Dangling Earrings',
    category: 'earrings',
    modelUrl: '/models/body_accessories/earrings/earrings_dangling.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 90 },
    defaultMaterial: { roughness: 0.2, metallic: 0.8 },
    tags: ['dangling', 'long', 'gems', 'elegant'],
    formality: 'formal',
    gender: 'female',
    material: 'silver'
  },

  // === NECKLACES ===
  {
    id: 'necklace_chain',
    name: 'Gold Chain',
    category: 'necklaces',
    modelUrl: '/models/body_accessories/necklaces/necklace_chain.glb',
    defaultColor: { hue: 50, saturation: 100, lightness: 50 },
    defaultMaterial: { roughness: 0.2, metallic: 0.9 },
    tags: ['chain', 'gold', 'simple', 'delicate'],
    formality: 'casual',
    gender: 'unisex',
    material: 'gold'
  },
  {
    id: 'necklace_pendant',
    name: 'Pendant Necklace',
    category: 'necklaces',
    modelUrl: '/models/body_accessories/necklaces/necklace_pendant.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 90 },
    defaultMaterial: { roughness: 0.2, metallic: 0.8 },
    tags: ['pendant', 'heart', 'charm', 'romantic'],
    formality: 'casual',
    gender: 'female',
    material: 'silver'
  },
  {
    id: 'necklace_pearl',
    name: 'Pearl Necklace',
    category: 'necklaces',
    modelUrl: '/models/body_accessories/necklaces/necklace_pearl.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 95 },
    defaultMaterial: { roughness: 0.3, metallic: 0.2 },
    tags: ['pearls', 'classic', 'elegant', 'formal'],
    formality: 'formal',
    gender: 'female',
    material: 'pearls'
  },
  {
    id: 'necklace_choker',
    name: 'Choker',
    category: 'necklaces',
    modelUrl: '/models/body_accessories/necklaces/necklace_choker.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['choker', 'tight', 'modern', 'edgy'],
    formality: 'casual',
    gender: 'female',
    material: 'beads'
  },

  // === BRACELETS ===
  {
    id: 'bracelet_chain',
    name: 'Chain Bracelet',
    category: 'bracelets',
    modelUrl: '/models/body_accessories/bracelets/bracelet_chain.glb',
    defaultColor: { hue: 50, saturation: 100, lightness: 50 },
    defaultMaterial: { roughness: 0.2, metallic: 0.9 },
    tags: ['chain', 'gold', 'delicate', 'jewelry'],
    formality: 'casual',
    gender: 'unisex',
    material: 'gold'
  },
  {
    id: 'bracelet_bangle',
    name: 'Bangle Bracelet',
    category: 'bracelets',
    modelUrl: '/models/body_accessories/bracelets/bracelet_bangle.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 90 },
    defaultMaterial: { roughness: 0.2, metallic: 0.9 },
    tags: ['bangle', 'thick', 'solid', 'bold'],
    formality: 'casual',
    gender: 'female',
    material: 'silver'
  },
  {
    id: 'bracelet_beaded',
    name: 'Beaded Bracelet',
    category: 'bracelets',
    modelUrl: '/models/body_accessories/bracelets/bracelet_beaded.glb',
    defaultColor: { hue: 30, saturation: 70, lightness: 50 },
    defaultMaterial: { roughness: 0.6, metallic: 0 },
    tags: ['beads', 'colorful', 'casual', 'handmade'],
    formality: 'casual',
    gender: 'unisex',
    material: 'beads'
  },

  // === WATCHES ===
  {
    id: 'watch_digital',
    name: 'Digital Watch',
    category: 'watches',
    modelUrl: '/models/body_accessories/watches/watch_digital.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.5, metallic: 0.3 },
    tags: ['digital', 'sport', 'lcd', 'modern'],
    formality: 'sport',
    gender: 'unisex'
  },
  {
    id: 'watch_analog',
    name: 'Analog Watch',
    category: 'watches',
    modelUrl: '/models/body_accessories/watches/watch_analog.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 90 },
    defaultMaterial: { roughness: 0.3, metallic: 0.7 },
    tags: ['analog', 'classic', 'leather', 'elegant'],
    formality: 'formal',
    gender: 'unisex'
  },
  {
    id: 'watch_smart',
    name: 'Smartwatch',
    category: 'watches',
    modelUrl: '/models/body_accessories/watches/watch_smart.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.3, metallic: 0.6 },
    tags: ['smart', 'touchscreen', 'tech', 'fitness'],
    formality: 'casual',
    gender: 'unisex'
  },

  // === BAGS ===
  {
    id: 'backpack_school',
    name: 'School Backpack',
    category: 'bags',
    modelUrl: '/models/body_accessories/bags/backpack_school.glb',
    defaultColor: { hue: 220, saturation: 70, lightness: 50 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['backpack', 'school', 'straps', 'casual'],
    formality: 'casual',
    gender: 'unisex'
  },
  {
    id: 'backpack_hiking',
    name: 'Hiking Backpack',
    category: 'bags',
    modelUrl: '/models/body_accessories/bags/backpack_hiking.glb',
    defaultColor: { hue: 100, saturation: 60, lightness: 40 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['hiking', 'outdoor', 'large', 'adventure'],
    formality: 'sport',
    gender: 'unisex'
  },
  {
    id: 'bag_messenger',
    name: 'Messenger Bag',
    category: 'bags',
    modelUrl: '/models/body_accessories/bags/bag_messenger.glb',
    defaultColor: { hue: 30, saturation: 40, lightness: 40 },
    defaultMaterial: { roughness: 0.7, metallic: 0 },
    tags: ['messenger', 'crossbody', 'canvas', 'urban'],
    formality: 'casual',
    gender: 'unisex'
  },
  {
    id: 'bag_purse',
    name: 'Purse',
    category: 'bags',
    modelUrl: '/models/body_accessories/bags/bag_purse.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.4, metallic: 0 },
    tags: ['purse', 'handbag', 'leather', 'elegant'],
    formality: 'formal',
    gender: 'female'
  },
  {
    id: 'bag_tote',
    name: 'Tote Bag',
    category: 'bags',
    modelUrl: '/models/body_accessories/bags/bag_tote.glb',
    defaultColor: { hue: 0, saturation: 0, lightness: 95 },
    defaultMaterial: { roughness: 0.8, metallic: 0 },
    tags: ['tote', 'shopping', 'canvas', 'simple'],
    formality: 'casual',
    gender: 'unisex'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getBodyAccessoryById(id: string): BodyAccessoryStyle | undefined {
  return BODY_ACCESSORIES.find(accessory => accessory.id === id);
}

export function getBodyAccessoriesByCategory(category: BodyAccessoryCategory): BodyAccessoryStyle[] {
  return BODY_ACCESSORIES.filter(accessory => accessory.category === category);
}

export function getBodyAccessoriesByFormality(formality: AccessoryFormality): BodyAccessoryStyle[] {
  return BODY_ACCESSORIES.filter(accessory => accessory.formality === formality);
}

export function getBodyAccessoriesByGender(gender: 'male' | 'female' | 'unisex'): BodyAccessoryStyle[] {
  return BODY_ACCESSORIES.filter(accessory => accessory.gender === gender || accessory.gender === 'unisex');
}

export function getJewelryByMaterial(material: JewelryMaterial): BodyAccessoryStyle[] {
  return BODY_ACCESSORIES.filter(accessory => accessory.material === material);
}

export function getBodyAccessoriesByTags(tags: string[]): BodyAccessoryStyle[] {
  return BODY_ACCESSORIES.filter(accessory =>
    tags.some(tag => accessory.tags.includes(tag))
  );
}

// Group by category for UI
export const BODY_ACCESSORIES_BY_CATEGORY = {
  earrings: getBodyAccessoriesByCategory('earrings'),
  necklaces: getBodyAccessoriesByCategory('necklaces'),
  bracelets: getBodyAccessoriesByCategory('bracelets'),
  watches: getBodyAccessoriesByCategory('watches'),
  bags: getBodyAccessoriesByCategory('bags')
};
