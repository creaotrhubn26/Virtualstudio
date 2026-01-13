/**
 * Clothing Styles - Definitions for virtual actor clothing
 * Provides GLB model paths for separate clothing items that can be attached to avatars
 */

export type ClothingCategory = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'footwear' | 'accessories';
export type ClothingStyle = 'casual' | 'formal' | 'business' | 'athletic' | 'vintage' | 'modern';
export type ClothingFormality = 'casual' | 'semi-formal' | 'formal' | 'athleisure';
export type ClothingGender = 'unisex' | 'male' | 'female';

export interface ClothingStyleDefinition {
  id: string;
  name: string;
  category: ClothingCategory;
  style: ClothingStyle;
  formality: ClothingFormality;
  gender: ClothingGender;
  description: string;
  modelUrl: string;
  thumbnailUrl?: string;
  defaultScale?: number;
  defaultColor?: { hue: number; saturation: number; lightness: number };
  defaultMaterial?: { roughness: number; metallic: number };
  tags?: string[];
}

/**
 * All available clothing styles
 */
export const ALL_CLOTHING_STYLES: ClothingStyleDefinition[] = [
  // ===== TOPS =====
  {
    id: 'tshirt_basic',
    name: 'Basic T-Shirt',
    category: 'tops',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Classic crew neck t-shirt',
    modelUrl: '/models/clothing/tops/tshirt_basic.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 50 },
    defaultMaterial: { roughness: 0.85, metallic: 0 },
    tags: ['basic', 'casual', 'everyday'],
  },
  {
    id: 'polo_shirt',
    name: 'Polo Shirt',
    category: 'tops',
    style: 'casual',
    formality: 'semi-formal',
    gender: 'unisex',
    description: 'Classic polo with collar',
    modelUrl: '/models/clothing/tops/polo_shirt.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 200, saturation: 50, lightness: 40 },
    defaultMaterial: { roughness: 0.80, metallic: 0 },
    tags: ['polo', 'semi-formal', 'collar'],
  },
  {
    id: 'dress_shirt',
    name: 'Dress Shirt',
    category: 'tops',
    style: 'formal',
    formality: 'formal',
    gender: 'male',
    description: 'Formal dress shirt with buttons',
    modelUrl: '/models/clothing/tops/dress_shirt.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 95 },
    defaultMaterial: { roughness: 0.75, metallic: 0 },
    tags: ['formal', 'business', 'shirt'],
  },
  {
    id: 'blouse_silk',
    name: 'Silk Blouse',
    category: 'tops',
    style: 'formal',
    formality: 'formal',
    gender: 'female',
    description: 'Elegant silk blouse',
    modelUrl: '/models/clothing/tops/blouse_silk.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 15, saturation: 30, lightness: 85 },
    defaultMaterial: { roughness: 0.3, metallic: 0.08 },
    tags: ['formal', 'silk', 'elegant'],
  },
  {
    id: 'tank_top',
    name: 'Tank Top',
    category: 'tops',
    style: 'athletic',
    formality: 'casual',
    gender: 'unisex',
    description: 'Athletic tank top',
    modelUrl: '/models/clothing/tops/tank_top.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 20 },
    defaultMaterial: { roughness: 0.90, metallic: 0 },
    tags: ['athletic', 'gym', 'casual'],
  },
  {
    id: 'sweater_knit',
    name: 'Knit Sweater',
    category: 'tops',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Cozy knit sweater',
    modelUrl: '/models/clothing/tops/sweater_knit.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 30, saturation: 40, lightness: 50 },
    defaultMaterial: { roughness: 0.95, metallic: 0 },
    tags: ['sweater', 'knit', 'warm'],
  },

  // ===== BOTTOMS =====
  {
    id: 'jeans_straight',
    name: 'Straight Leg Jeans',
    category: 'bottoms',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Classic straight leg denim jeans',
    modelUrl: '/models/clothing/bottoms/jeans_straight.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 210, saturation: 50, lightness: 30 },
    defaultMaterial: { roughness: 0.85, metallic: 0 },
    tags: ['jeans', 'denim', 'casual'],
  },
  {
    id: 'jeans_skinny',
    name: 'Skinny Jeans',
    category: 'bottoms',
    style: 'modern',
    formality: 'casual',
    gender: 'unisex',
    description: 'Slim fit skinny jeans',
    modelUrl: '/models/clothing/bottoms/jeans_skinny.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 220, saturation: 40, lightness: 25 },
    defaultMaterial: { roughness: 0.85, metallic: 0 },
    tags: ['jeans', 'skinny', 'modern'],
  },
  {
    id: 'pants_chino',
    name: 'Chino Pants',
    category: 'bottoms',
    style: 'business',
    formality: 'semi-formal',
    gender: 'unisex',
    description: 'Smart casual chino pants',
    modelUrl: '/models/clothing/bottoms/pants_chino.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 30, saturation: 30, lightness: 60 },
    defaultMaterial: { roughness: 0.80, metallic: 0 },
    tags: ['chinos', 'business casual', 'smart'],
  },
  {
    id: 'pants_dress',
    name: 'Dress Pants',
    category: 'bottoms',
    style: 'formal',
    formality: 'formal',
    gender: 'unisex',
    description: 'Formal dress pants',
    modelUrl: '/models/clothing/bottoms/pants_dress.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 15 },
    defaultMaterial: { roughness: 0.70, metallic: 0 },
    tags: ['formal', 'dress', 'professional'],
  },
  {
    id: 'shorts_athletic',
    name: 'Athletic Shorts',
    category: 'bottoms',
    style: 'athletic',
    formality: 'casual',
    gender: 'unisex',
    description: 'Sport/gym shorts',
    modelUrl: '/models/clothing/bottoms/shorts_athletic.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 20 },
    defaultMaterial: { roughness: 0.90, metallic: 0 },
    tags: ['athletic', 'gym', 'sport'],
  },
  {
    id: 'skirt_pencil',
    name: 'Pencil Skirt',
    category: 'bottoms',
    style: 'formal',
    formality: 'formal',
    gender: 'female',
    description: 'Professional pencil skirt',
    modelUrl: '/models/clothing/bottoms/skirt_pencil.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 20 },
    defaultMaterial: { roughness: 0.75, metallic: 0 },
    tags: ['formal', 'professional', 'skirt'],
  },

  // ===== DRESSES =====
  {
    id: 'dress_cocktail',
    name: 'Cocktail Dress',
    category: 'dresses',
    style: 'formal',
    formality: 'formal',
    gender: 'female',
    description: 'Elegant cocktail dress',
    modelUrl: '/models/clothing/dresses/cocktail_dress.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.40, metallic: 0.05 },
    tags: ['formal', 'elegant', 'evening'],
  },
  {
    id: 'dress_summer',
    name: 'Summer Dress',
    category: 'dresses',
    style: 'casual',
    formality: 'casual',
    gender: 'female',
    description: 'Light summer dress',
    modelUrl: '/models/clothing/dresses/summer_dress.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 180, saturation: 40, lightness: 70 },
    defaultMaterial: { roughness: 0.85, metallic: 0 },
    tags: ['casual', 'summer', 'light'],
  },
  {
    id: 'dress_business',
    name: 'Business Dress',
    category: 'dresses',
    style: 'business',
    formality: 'formal',
    gender: 'female',
    description: 'Professional business dress',
    modelUrl: '/models/clothing/dresses/business_dress.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 30 },
    defaultMaterial: { roughness: 0.75, metallic: 0 },
    tags: ['formal', 'business', 'professional'],
  },

  // ===== OUTERWEAR =====
  {
    id: 'jacket_blazer',
    name: 'Blazer',
    category: 'outerwear',
    style: 'formal',
    formality: 'formal',
    gender: 'unisex',
    description: 'Classic blazer jacket',
    modelUrl: '/models/clothing/outerwear/blazer.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 220, saturation: 50, lightness: 25 },
    defaultMaterial: { roughness: 0.70, metallic: 0 },
    tags: ['formal', 'blazer', 'professional'],
  },
  {
    id: 'jacket_leather',
    name: 'Leather Jacket',
    category: 'outerwear',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Classic leather jacket',
    modelUrl: '/models/clothing/outerwear/leather_jacket.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 15 },
    defaultMaterial: { roughness: 0.50, metallic: 0.02 },
    tags: ['casual', 'leather', 'edgy'],
  },
  {
    id: 'cardigan',
    name: 'Cardigan',
    category: 'outerwear',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Comfortable knit cardigan',
    modelUrl: '/models/clothing/outerwear/cardigan.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 30, saturation: 30, lightness: 50 },
    defaultMaterial: { roughness: 0.95, metallic: 0 },
    tags: ['casual', 'knit', 'comfortable'],
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    category: 'outerwear',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Casual hooded sweatshirt',
    modelUrl: '/models/clothing/outerwear/hoodie.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 40 },
    defaultMaterial: { roughness: 0.90, metallic: 0 },
    tags: ['casual', 'comfortable', 'streetwear'],
  },

  // ===== FOOTWEAR =====
  {
    id: 'shoes_sneakers',
    name: 'Sneakers',
    category: 'footwear',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Casual sneakers',
    modelUrl: '/models/clothing/footwear/sneakers.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 95 },
    defaultMaterial: { roughness: 0.80, metallic: 0 },
    tags: ['casual', 'comfortable', 'athletic'],
  },
  {
    id: 'shoes_dress',
    name: 'Dress Shoes',
    category: 'footwear',
    style: 'formal',
    formality: 'formal',
    gender: 'male',
    description: 'Formal leather dress shoes',
    modelUrl: '/models/clothing/footwear/dress_shoes.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.40, metallic: 0.02 },
    tags: ['formal', 'leather', 'professional'],
  },
  {
    id: 'shoes_heels',
    name: 'High Heels',
    category: 'footwear',
    style: 'formal',
    formality: 'formal',
    gender: 'female',
    description: 'Classic high heels',
    modelUrl: '/models/clothing/footwear/heels.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 10 },
    defaultMaterial: { roughness: 0.30, metallic: 0.05 },
    tags: ['formal', 'elegant', 'heels'],
  },
  {
    id: 'boots_ankle',
    name: 'Ankle Boots',
    category: 'footwear',
    style: 'casual',
    formality: 'casual',
    gender: 'female',
    description: 'Casual ankle boots',
    modelUrl: '/models/clothing/footwear/ankle_boots.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 30, saturation: 40, lightness: 30 },
    defaultMaterial: { roughness: 0.60, metallic: 0 },
    tags: ['casual', 'boots', 'versatile'],
  },

  // ===== ACCESSORIES =====
  {
    id: 'belt_leather',
    name: 'Leather Belt',
    category: 'accessories',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Classic leather belt',
    modelUrl: '/models/clothing/accessories/belt_leather.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 30, saturation: 50, lightness: 25 },
    defaultMaterial: { roughness: 0.50, metallic: 0.02 },
    tags: ['belt', 'leather', 'accessory'],
  },
  {
    id: 'scarf',
    name: 'Scarf',
    category: 'accessories',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Warm knit scarf',
    modelUrl: '/models/clothing/accessories/scarf.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 15, saturation: 60, lightness: 50 },
    defaultMaterial: { roughness: 0.95, metallic: 0 },
    tags: ['scarf', 'warm', 'accessory'],
  },
  {
    id: 'hat_beanie',
    name: 'Beanie',
    category: 'accessories',
    style: 'casual',
    formality: 'casual',
    gender: 'unisex',
    description: 'Casual knit beanie',
    modelUrl: '/models/clothing/accessories/beanie.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 0, saturation: 0, lightness: 20 },
    defaultMaterial: { roughness: 0.95, metallic: 0 },
    tags: ['hat', 'beanie', 'casual'],
  },
  {
    id: 'tie_necktie',
    name: 'Necktie',
    category: 'accessories',
    style: 'formal',
    formality: 'formal',
    gender: 'male',
    description: 'Classic silk necktie',
    modelUrl: '/models/clothing/accessories/necktie.glb',
    defaultScale: 1.0,
    defaultColor: { hue: 220, saturation: 60, lightness: 40 },
    defaultMaterial: { roughness: 0.35, metallic: 0.08 },
    tags: ['tie', 'formal', 'silk'],
  },
];

/**
 * Clothing organized by category
 */
export const CLOTHING_BY_CATEGORY: Record<ClothingCategory, ClothingStyleDefinition[]> = {
  tops: ALL_CLOTHING_STYLES.filter(c => c.category === 'tops'),
  bottoms: ALL_CLOTHING_STYLES.filter(c => c.category === 'bottoms'),
  dresses: ALL_CLOTHING_STYLES.filter(c => c.category === 'dresses'),
  outerwear: ALL_CLOTHING_STYLES.filter(c => c.category === 'outerwear'),
  footwear: ALL_CLOTHING_STYLES.filter(c => c.category === 'footwear'),
  accessories: ALL_CLOTHING_STYLES.filter(c => c.category === 'accessories'),
};

/**
 * Get clothing style by ID
 */
export function getClothingStyleById(id: string): ClothingStyleDefinition | undefined {
  return ALL_CLOTHING_STYLES.find(style => style.id === id);
}

/**
 * Get clothing styles by category
 */
export function getClothingByCategory(category: ClothingCategory): ClothingStyleDefinition[] {
  return CLOTHING_BY_CATEGORY[category] || [];
}

/**
 * Get clothing styles by formality
 */
export function getClothingByFormality(formality: ClothingFormality): ClothingStyleDefinition[] {
  return ALL_CLOTHING_STYLES.filter(style => style.formality === formality);
}

/**
 * Get clothing styles by gender
 */
export function getClothingByGender(gender: ClothingGender): ClothingStyleDefinition[] {
  return ALL_CLOTHING_STYLES.filter(style => style.gender === gender || style.gender === 'unisex');
}
