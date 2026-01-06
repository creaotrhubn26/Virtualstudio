/**
 * Wall Definitions - Materials, textures, and presets for studio walls
 */

export type WallCategory = 'solid' | 'textured' | 'gradient' | 'pattern' | 'lovecraft' | 'cinematic';

export interface WallMaterial {
  id: string;
  name: string;
  nameNo: string;
  category: WallCategory;
  color?: string;
  gradientColors?: string[];
  textureUrl?: string;
  normalMapUrl?: string;
  roughness?: number;
  metallic?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  tags: string[];
  moodTags?: string[];
  previewUrl?: string;
}

export const WALL_CATEGORIES: { id: WallCategory; name: string; nameNo: string; icon: string }[] = [
  { id: 'solid', name: 'Solid Colors', nameNo: 'Ensfargede', icon: '🎨' },
  { id: 'textured', name: 'Textured', nameNo: 'Teksturerte', icon: '🧱' },
  { id: 'gradient', name: 'Gradients', nameNo: 'Gradienter', icon: '🌈' },
  { id: 'pattern', name: 'Patterns', nameNo: 'Mønstre', icon: '🔲' },
  { id: 'lovecraft', name: 'Lovecraft/Horror', nameNo: 'Lovecraft/Skrekk', icon: '🐙' },
  { id: 'cinematic', name: 'Cinematic', nameNo: 'Filmisk', icon: '🎬' },
];

export const WALL_MATERIALS: WallMaterial[] = [
  // ============================================
  // SOLID COLORS - Studio Standards
  // ============================================
  { id: 'white', name: 'Studio White', nameNo: 'Studio hvit', category: 'solid', color: '#ffffff', roughness: 0.9, metallic: 0, tags: ['studio', 'clean', 'bright'], moodTags: ['professional', 'clean'] },
  { id: 'gray-light', name: 'Light Gray', nameNo: 'Lys grå', category: 'solid', color: '#d0d0d0', roughness: 0.85, metallic: 0, tags: ['studio', 'neutral'], moodTags: ['professional'] },
  { id: 'gray-medium', name: 'Medium Gray', nameNo: 'Mellomgrå', category: 'solid', color: '#808080', roughness: 0.8, metallic: 0, tags: ['studio', 'neutral', 'classic'], moodTags: ['professional', 'versatile'] },
  { id: 'gray-dark', name: 'Dark Gray', nameNo: 'Mørk grå', category: 'solid', color: '#404040', roughness: 0.75, metallic: 0, tags: ['studio', 'dramatic'], moodTags: ['dramatic', 'moody'] },
  { id: 'black', name: 'Studio Black', nameNo: 'Studio svart', category: 'solid', color: '#1a1a1a', roughness: 0.95, metallic: 0, tags: ['studio', 'dramatic', 'void'], moodTags: ['dramatic', 'dark'] },
  { id: 'cream', name: 'Cream', nameNo: 'Kremfarget', category: 'solid', color: '#f5e6d3', roughness: 0.9, metallic: 0, tags: ['warm', 'soft', 'wedding'], moodTags: ['romantic', 'warm'] },
  { id: 'navy', name: 'Navy Blue', nameNo: 'Marineblå', category: 'solid', color: '#1a2744', roughness: 0.8, metallic: 0.05, tags: ['corporate', 'elegant'], moodTags: ['professional', 'serious'] },
  { id: 'burgundy', name: 'Burgundy', nameNo: 'Burgunder', category: 'solid', color: '#4a1c2e', roughness: 0.8, metallic: 0.05, tags: ['warm', 'elegant', 'rich'], moodTags: ['dramatic', 'rich'] },
  { id: 'forest-green', name: 'Forest Green', nameNo: 'Skogsgrønn', category: 'solid', color: '#1a3d2e', roughness: 0.8, metallic: 0.05, tags: ['nature', 'calm'], moodTags: ['calm', 'natural'] },

  // ============================================
  // TEXTURED - Realistic Materials
  // ============================================
  { id: 'concrete', name: 'Concrete', nameNo: 'Betong', category: 'textured', color: '#6b6b6b', textureUrl: '/textures/walls/concrete.jpg', normalMapUrl: '/textures/walls/concrete_normal.jpg', roughness: 0.95, metallic: 0, tags: ['industrial', 'urban', 'modern'], moodTags: ['industrial', 'raw'] },
  { id: 'brick-red', name: 'Red Brick', nameNo: 'Rød murstein', category: 'textured', color: '#8b4513', textureUrl: '/textures/walls/brick_red.jpg', normalMapUrl: '/textures/walls/brick_normal.jpg', roughness: 0.9, metallic: 0, tags: ['industrial', 'vintage', 'warm'], moodTags: ['warm', 'industrial'] },
  { id: 'brick-white', name: 'White Brick', nameNo: 'Hvit murstein', category: 'textured', color: '#e8e8e8', textureUrl: '/textures/walls/brick_white.jpg', roughness: 0.85, metallic: 0, tags: ['modern', 'clean', 'scandinavian'], moodTags: ['modern', 'clean'] },
  { id: 'wood-panels', name: 'Wood Panels', nameNo: 'Trepanel', category: 'textured', color: '#8b6914', textureUrl: '/textures/walls/wood_panels.jpg', roughness: 0.7, metallic: 0, tags: ['warm', 'natural', 'vintage'], moodTags: ['warm', 'natural'] },
  { id: 'plaster', name: 'Plaster', nameNo: 'Puss', category: 'textured', color: '#f0e6d3', textureUrl: '/textures/walls/plaster.jpg', roughness: 0.9, metallic: 0, tags: ['classic', 'european', 'elegant'], moodTags: ['classic', 'elegant'] },
  { id: 'stucco', name: 'Stucco', nameNo: 'Stukkatur', category: 'textured', color: '#e8dcc8', textureUrl: '/textures/walls/stucco.jpg', roughness: 0.85, metallic: 0, tags: ['mediterranean', 'warm'], moodTags: ['warm', 'classic'] },

  // ============================================
  // GRADIENT - Modern Looks
  // ============================================
  { id: 'gradient-sunset', name: 'Sunset Gradient', nameNo: 'Solnedgangsgradient', category: 'gradient', gradientColors: ['#ff6b35', '#f7c59f', '#2a9d8f'], roughness: 0.8, metallic: 0.1, tags: ['warm', 'dramatic', 'artistic'], moodTags: ['dramatic', 'warm'] },
  { id: 'gradient-ocean', name: 'Ocean Gradient', nameNo: 'Havgradient', category: 'gradient', gradientColors: ['#0077b6', '#00b4d8', '#90e0ef'], roughness: 0.8, metallic: 0.1, tags: ['cool', 'calm', 'fresh'], moodTags: ['calm', 'fresh'] },
  { id: 'gradient-noir', name: 'Film Noir', nameNo: 'Film Noir', category: 'gradient', gradientColors: ['#0d0d0d', '#1a1a2e', '#16213e'], roughness: 0.9, metallic: 0.05, tags: ['dramatic', 'noir', 'classic'], moodTags: ['dark', 'mysterious'] },

  // ============================================
  // LOVECRAFT / HORROR - Eldritch Themes
  // ============================================
  { id: 'lovecraft-void', name: 'Eldritch Void', nameNo: 'Eldritsk tomrom', category: 'lovecraft', color: '#0a0a12', emissive: '#1a0a2e', emissiveIntensity: 0.1, roughness: 0.95, metallic: 0.1, tags: ['lovecraft', 'horror', 'cosmic', 'void'], moodTags: ['dark', 'mysterious', 'cosmic'] },
  { id: 'lovecraft-deep', name: 'Deep One Green', nameNo: 'Dypvesen grønn', category: 'lovecraft', color: '#0a2a1a', emissive: '#0d3d2d', emissiveIntensity: 0.15, roughness: 0.9, metallic: 0.2, tags: ['lovecraft', 'horror', 'ocean', 'deep'], moodTags: ['dark', 'mysterious', 'aquatic'] },
  { id: 'lovecraft-ritual', name: 'Ritual Chamber', nameNo: 'Ritualkammer', category: 'lovecraft', color: '#1a0a0a', emissive: '#3d0a0a', emissiveIntensity: 0.2, roughness: 0.85, metallic: 0.15, tags: ['lovecraft', 'horror', 'cult', 'ritual'], moodTags: ['dark', 'tense', 'ritual'] },
  { id: 'lovecraft-cosmic', name: 'Cosmic Horror', nameNo: 'Kosmisk skrekk', category: 'lovecraft', color: '#0f0a1a', emissive: '#2a0a4a', emissiveIntensity: 0.25, roughness: 0.8, metallic: 0.25, tags: ['lovecraft', 'horror', 'cosmic', 'stars'], moodTags: ['dark', 'mysterious', 'cosmic'] },
  { id: 'lovecraft-madness', name: 'Madness', nameNo: 'Galskap', category: 'lovecraft', color: '#1a1a0a', emissive: '#4a4a0a', emissiveIntensity: 0.3, roughness: 0.75, metallic: 0.1, tags: ['lovecraft', 'horror', 'insanity', 'yellow'], moodTags: ['tense', 'unsettling'] },
  { id: 'lovecraft-ancient', name: 'Ancient Stone', nameNo: 'Eldgammel stein', category: 'lovecraft', color: '#2a2a2a', textureUrl: '/textures/walls/ancient_stone.jpg', roughness: 0.95, metallic: 0, tags: ['lovecraft', 'ancient', 'ruins', 'cyclopean'], moodTags: ['mysterious', 'ancient'] },

  // ============================================
  // CINEMATIC - Film Inspired
  // ============================================
  { id: 'nolan-dark', name: 'Nolan Dark', nameNo: 'Nolan mørk', category: 'cinematic', color: '#0d0d10', roughness: 0.95, metallic: 0.02, tags: ['cinematic', 'nolan', 'dark', 'minimal'], moodTags: ['dramatic', 'minimal'] },
  { id: 'kubrick-red', name: 'Kubrick Red', nameNo: 'Kubrick rød', category: 'cinematic', color: '#4a0a0a', roughness: 0.8, metallic: 0.1, tags: ['cinematic', 'kubrick', 'dramatic', 'intense'], moodTags: ['intense', 'dramatic'] },
  { id: 'wes-anderson-pink', name: 'Wes Anderson Pink', nameNo: 'Wes Anderson rosa', category: 'cinematic', color: '#e8a4a4', roughness: 0.85, metallic: 0, tags: ['cinematic', 'wes-anderson', 'quirky', 'pastel'], moodTags: ['whimsical', 'quirky'] },
  { id: 'wes-anderson-mint', name: 'Wes Anderson Mint', nameNo: 'Wes Anderson mint', category: 'cinematic', color: '#a4e8d4', roughness: 0.85, metallic: 0, tags: ['cinematic', 'wes-anderson', 'quirky', 'pastel'], moodTags: ['whimsical', 'quirky'] },
  { id: 'blade-runner', name: 'Blade Runner', nameNo: 'Blade Runner', category: 'cinematic', color: '#1a1a2e', emissive: '#ff6b35', emissiveIntensity: 0.1, roughness: 0.7, metallic: 0.3, tags: ['cinematic', 'sci-fi', 'neon', 'futuristic'], moodTags: ['futuristic', 'moody'] },
  { id: 'alien-corridor', name: 'Alien Corridor', nameNo: 'Alien korridor', category: 'cinematic', color: '#1a2a1a', emissive: '#0a3a0a', emissiveIntensity: 0.15, roughness: 0.9, metallic: 0.4, tags: ['cinematic', 'sci-fi', 'horror', 'industrial'], moodTags: ['tense', 'industrial'] },
];

// Helper functions
export const getWallsByCategory = (category: WallCategory): WallMaterial[] => 
  WALL_MATERIALS.filter(w => w.category === category);

export const getWallById = (id: string): WallMaterial | undefined => 
  WALL_MATERIALS.find(w => w.id === id);

export const searchWalls = (query: string): WallMaterial[] => {
  const lowerQuery = query.toLowerCase();
  return WALL_MATERIALS.filter(w =>
    w.name.toLowerCase().includes(lowerQuery) ||
    w.nameNo.toLowerCase().includes(lowerQuery) ||
    w.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    w.moodTags?.some(m => m.toLowerCase().includes(lowerQuery))
  );
};

export const getWallsByMood = (mood: string): WallMaterial[] =>
  WALL_MATERIALS.filter(w => w.moodTags?.includes(mood));

