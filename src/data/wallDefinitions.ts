/**
 * Wall Definitions - Materials, textures, and presets for studio walls
 */

export type WallCategory = 'solid' | 'textured' | 'gradient' | 'pattern' | 'lovecraft' | 'cinematic' | 'urban';

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
  tileScale?: number;
  tags: string[];
  moodTags?: string[];
  previewUrl?: string;
}

export const WALL_CATEGORIES: { id: WallCategory; name: string; nameNo: string; icon: string }[] = [
  { id: 'solid', name: 'Solid Colors', nameNo: 'Ensfargede', icon: '🎨' },
  { id: 'textured', name: 'Textured', nameNo: 'Teksturerte', icon: '🧱' },
  { id: 'gradient', name: 'Gradients', nameNo: 'Gradienter', icon: '🌈' },
  { id: 'pattern', name: 'Patterns', nameNo: 'Mønstre', icon: '🔲' },
  { id: 'urban', name: 'Urban', nameNo: 'Urbant', icon: '🏙️' },
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
  { id: 'cobalt', name: 'Cobalt Blue', nameNo: 'Koboltblå', category: 'solid', color: '#0047ab', roughness: 0.8, metallic: 0.05, tags: ['fashion', 'vivid', 'pop'], moodTags: ['vivid', 'bold'] },
  { id: 'electric-violet', name: 'Electric Violet', nameNo: 'Elektrisk violet', category: 'solid', color: '#7b00d4', roughness: 0.75, metallic: 0.05, tags: ['fashion', 'neon', 'vibrant', 'pop'], moodTags: ['vivid', 'energetic'] },
  { id: 'emerald', name: 'Emerald Green', nameNo: 'Smaragdgrønn', category: 'solid', color: '#046307', roughness: 0.8, metallic: 0.05, tags: ['fashion', 'vivid', 'rich'], moodTags: ['rich', 'vivid'] },
  { id: 'terracotta', name: 'Terracotta', nameNo: 'Terrakotta', category: 'solid', color: '#c06040', roughness: 0.85, metallic: 0, tags: ['warm', 'earthy', 'mediterranean', 'boho'], moodTags: ['warm', 'earthy'] },
  { id: 'dusty-rose', name: 'Dusty Rose', nameNo: 'Støvete rosa', category: 'solid', color: '#c48b8b', roughness: 0.85, metallic: 0, tags: ['beauty', 'feminine', 'soft', 'wedding'], moodTags: ['romantic', 'soft'] },
  { id: 'slate-blue', name: 'Slate Blue', nameNo: 'Skiferhvit blå', category: 'solid', color: '#4a6380', roughness: 0.82, metallic: 0, tags: ['cool', 'muted', 'corporate', 'editorial'], moodTags: ['professional', 'cool'] },
  { id: 'champagne', name: 'Champagne', nameNo: 'Champagne', category: 'solid', color: '#f0d9a0', roughness: 0.8, metallic: 0.05, tags: ['warm', 'luxury', 'soft', 'wedding'], moodTags: ['elegant', 'warm', 'luxury'] },

  // ============================================
  // TEXTURED - Realistic Materials
  // ============================================
  { id: 'concrete', name: 'Concrete', nameNo: 'Betong', category: 'textured', color: '#6b6b6b', textureUrl: '/textures/walls/concrete.png', roughness: 0.95, metallic: 0, tileScale: 2, tags: ['industrial', 'urban', 'modern'], moodTags: ['industrial', 'raw'] },
  { id: 'brick-red', name: 'Red Brick', nameNo: 'Rød murstein', category: 'textured', color: '#8b4513', textureUrl: '/textures/walls/brick_red.png', roughness: 0.9, metallic: 0, tileScale: 3, tags: ['industrial', 'vintage', 'warm'], moodTags: ['warm', 'industrial'] },
  { id: 'brick-white', name: 'White Brick', nameNo: 'Hvit murstein', category: 'textured', color: '#e8e8e8', textureUrl: '/textures/walls/brick_white.png', roughness: 0.85, metallic: 0, tileScale: 3, tags: ['modern', 'clean', 'scandinavian'], moodTags: ['modern', 'clean'] },
  { id: 'wood-panels', name: 'Wood Panels', nameNo: 'Trepanel', category: 'textured', color: '#8b6914', textureUrl: '/textures/walls/wood_panels.png', roughness: 0.7, metallic: 0, tileScale: 1, tags: ['warm', 'natural', 'vintage'], moodTags: ['warm', 'natural'] },
  { id: 'plaster', name: 'Plaster', nameNo: 'Puss', category: 'textured', color: '#f0e6d3', textureUrl: '/textures/walls/plaster.png', roughness: 0.9, metallic: 0, tileScale: 2, tags: ['classic', 'european', 'elegant'], moodTags: ['classic', 'elegant'] },
  { id: 'stucco', name: 'Stucco', nameNo: 'Stukkatur', category: 'textured', color: '#e8dcc8', textureUrl: '/textures/walls/stucco.png', roughness: 0.85, metallic: 0, tileScale: 2, tags: ['mediterranean', 'warm'], moodTags: ['warm', 'classic'] },

  // ============================================
  // GRADIENT - Modern Looks
  // ============================================
  { id: 'gradient-sunset', name: 'Sunset Gradient', nameNo: 'Solnedgangsgradient', category: 'gradient', gradientColors: ['#ff6b35', '#f7c59f', '#2a9d8f'], roughness: 0.8, metallic: 0.1, tags: ['warm', 'dramatic', 'artistic'], moodTags: ['dramatic', 'warm'] },
  { id: 'gradient-ocean', name: 'Ocean Gradient', nameNo: 'Havgradient', category: 'gradient', gradientColors: ['#0077b6', '#00b4d8', '#90e0ef'], roughness: 0.8, metallic: 0.1, tags: ['cool', 'calm', 'fresh'], moodTags: ['calm', 'fresh'] },
  { id: 'gradient-noir', name: 'Film Noir', nameNo: 'Film Noir', category: 'gradient', gradientColors: ['#0d0d0d', '#1a1a2e', '#16213e'], roughness: 0.9, metallic: 0.05, tags: ['dramatic', 'noir', 'classic'], moodTags: ['dark', 'mysterious'] },
  { id: 'gradient-rose-gold', name: 'Rose Gold', nameNo: 'Rosegull', category: 'gradient', gradientColors: ['#b76e79', '#e8c4b8', '#d4a5a5'], roughness: 0.75, metallic: 0.15, tags: ['fashion', 'beauty', 'warm', 'feminine'], moodTags: ['elegant', 'warm', 'romantic'] },
  { id: 'gradient-purple-blue', name: 'Purple to Blue', nameNo: 'Lilla til blå', category: 'gradient', gradientColors: ['#6a0572', '#1a0080', '#0d00c0'], roughness: 0.8, metallic: 0.1, tags: ['fashion', 'dramatic', 'night', 'neon'], moodTags: ['dramatic', 'vivid', 'night'] },
  { id: 'gradient-teal-black', name: 'Teal to Black', nameNo: 'Teal til svart', category: 'gradient', gradientColors: ['#00796b', '#004d40', '#0a0a0a'], roughness: 0.8, metallic: 0.1, tags: ['cinematic', 'dramatic', 'deep', 'moody'], moodTags: ['dramatic', 'moody', 'cinematic'] },
  { id: 'gradient-amber-crimson', name: 'Amber to Crimson', nameNo: 'Rav til karmosin', category: 'gradient', gradientColors: ['#ff8f00', '#c62828', '#1a0a0a'], roughness: 0.8, metallic: 0.1, tags: ['dramatic', 'warm', 'fire', 'intense'], moodTags: ['intense', 'dramatic', 'warm'] },
  { id: 'gradient-mint-white', name: 'Mint to White', nameNo: 'Mint til hvit', category: 'gradient', gradientColors: ['#a8d5b5', '#d4ecd9', '#f8fdf9'], roughness: 0.85, metallic: 0, tags: ['fresh', 'natural', 'clean', 'beauty'], moodTags: ['fresh', 'clean', 'natural'] },
  { id: 'gradient-midnight', name: 'Midnight Sky', nameNo: 'Midnattshimmel', category: 'gradient', gradientColors: ['#0a0a1a', '#1a1a4a', '#2a2a6a'], roughness: 0.9, metallic: 0.05, tags: ['night', 'dramatic', 'moody', 'deep'], moodTags: ['mysterious', 'night', 'dramatic'] },

  // ============================================
  // LOVECRAFT / HORROR - Eldritch Themes
  // ============================================
  { id: 'lovecraft-void', name: 'Eldritch Void', nameNo: 'Eldritsk tomrom', category: 'lovecraft', color: '#0a0a12', emissive: '#1a0a2e', emissiveIntensity: 0.1, roughness: 0.95, metallic: 0.1, tags: ['lovecraft', 'horror', 'cosmic', 'void'], moodTags: ['dark', 'mysterious', 'cosmic'] },
  { id: 'lovecraft-deep', name: 'Deep One Green', nameNo: 'Dypvesen grønn', category: 'lovecraft', color: '#0a2a1a', emissive: '#0d3d2d', emissiveIntensity: 0.15, roughness: 0.9, metallic: 0.2, tags: ['lovecraft', 'horror', 'ocean', 'deep'], moodTags: ['dark', 'mysterious', 'aquatic'] },
  { id: 'lovecraft-ritual', name: 'Ritual Chamber', nameNo: 'Ritualkammer', category: 'lovecraft', color: '#1a0a0a', emissive: '#3d0a0a', emissiveIntensity: 0.2, roughness: 0.85, metallic: 0.15, tags: ['lovecraft', 'horror', 'cult', 'ritual'], moodTags: ['dark', 'tense', 'ritual'] },
  { id: 'lovecraft-cosmic', name: 'Cosmic Horror', nameNo: 'Kosmisk skrekk', category: 'lovecraft', color: '#0f0a1a', emissive: '#2a0a4a', emissiveIntensity: 0.25, roughness: 0.8, metallic: 0.25, tags: ['lovecraft', 'horror', 'cosmic', 'stars'], moodTags: ['dark', 'mysterious', 'cosmic'] },
  { id: 'lovecraft-madness', name: 'Madness', nameNo: 'Galskap', category: 'lovecraft', color: '#1a1a0a', emissive: '#4a4a0a', emissiveIntensity: 0.3, roughness: 0.75, metallic: 0.1, tags: ['lovecraft', 'horror', 'insanity', 'yellow'], moodTags: ['tense', 'unsettling'] },
  { id: 'lovecraft-ancient', name: 'Ancient Stone', nameNo: 'Eldgammel stein', category: 'lovecraft', color: '#2a2a2a', textureUrl: '/textures/walls/ancient_stone.png', roughness: 0.95, metallic: 0, tags: ['lovecraft', 'ancient', 'ruins', 'cyclopean'], moodTags: ['mysterious', 'ancient'] },

  // ============================================
  // CINEMATIC - Film Inspired
  // ============================================
  { id: 'nolan-dark', name: 'Nolan Dark', nameNo: 'Nolan mørk', category: 'cinematic', color: '#0d0d10', roughness: 0.95, metallic: 0.02, tags: ['cinematic', 'nolan', 'dark', 'minimal'], moodTags: ['dramatic', 'minimal'] },
  { id: 'kubrick-red', name: 'Kubrick Red', nameNo: 'Kubrick rød', category: 'cinematic', color: '#4a0a0a', roughness: 0.8, metallic: 0.1, tags: ['cinematic', 'kubrick', 'dramatic', 'intense'], moodTags: ['intense', 'dramatic'] },
  { id: 'wes-anderson-pink', name: 'Wes Anderson Pink', nameNo: 'Wes Anderson rosa', category: 'cinematic', color: '#e8a4a4', roughness: 0.85, metallic: 0, tags: ['cinematic', 'wes-anderson', 'quirky', 'pastel'], moodTags: ['whimsical', 'quirky'] },
  { id: 'wes-anderson-mint', name: 'Wes Anderson Mint', nameNo: 'Wes Anderson mint', category: 'cinematic', color: '#a4e8d4', roughness: 0.85, metallic: 0, tags: ['cinematic', 'wes-anderson', 'quirky', 'pastel'], moodTags: ['whimsical', 'quirky'] },
  { id: 'blade-runner', name: 'Blade Runner', nameNo: 'Blade Runner', category: 'cinematic', color: '#1a1a2e', emissive: '#ff6b35', emissiveIntensity: 0.1, roughness: 0.7, metallic: 0.3, tags: ['cinematic', 'sci-fi', 'neon', 'futuristic'], moodTags: ['futuristic', 'moody'] },
  { id: 'alien-corridor', name: 'Alien Corridor', nameNo: 'Alien korridor', category: 'cinematic', color: '#1a2a1a', emissive: '#0a3a0a', emissiveIntensity: 0.15, roughness: 0.9, metallic: 0.4, tags: ['cinematic', 'sci-fi', 'horror', 'industrial'], moodTags: ['tense', 'industrial'] },

  // ============================================
  // URBAN - City and Industrial
  // ============================================
  { id: 'urban-graffiti', name: 'Graffiti Wall', nameNo: 'Grafittivegg', category: 'urban', color: '#4a4a4a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/graffiti_concrete_wall/graffiti_concrete_wall_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/graffiti_concrete_wall/graffiti_concrete_wall_nor_gl_1k.jpg', roughness: 0.9, metallic: 0, tags: ['urban', 'street', 'graffiti', 'art'], moodTags: ['edgy', 'artistic', 'street'] },
  { id: 'urban-rusted-metal', name: 'Rusted Metal', nameNo: 'Rustet metall', category: 'urban', color: '#6b4423', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rusty_metal_02/rusty_metal_02_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rusty_metal_02/rusty_metal_02_nor_gl_1k.jpg', roughness: 0.85, metallic: 0.6, tags: ['urban', 'industrial', 'rusty', 'decay'], moodTags: ['industrial', 'gritty', 'abandoned'] },
  { id: 'urban-corrugated', name: 'Corrugated Metal', nameNo: 'Bølgeblikk', category: 'urban', color: '#5a5a5a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron/corrugated_iron_nor_gl_1k.jpg', roughness: 0.7, metallic: 0.7, tags: ['urban', 'industrial', 'warehouse'], moodTags: ['industrial', 'raw'] },
  { id: 'urban-old-brick', name: 'Old City Brick', nameNo: 'Gammel bymurstein', category: 'urban', color: '#7a5040', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_008/brick_wall_008_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_008/brick_wall_008_nor_gl_1k.jpg', roughness: 0.9, metallic: 0, tags: ['urban', 'vintage', 'brick', 'alley'], moodTags: ['warm', 'vintage', 'gritty'] },
  { id: 'urban-subway-tile', name: 'Subway Tile', nameNo: 'T-baneflis', category: 'urban', color: '#e8e8e8', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/subway_tile/subway_tile_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/subway_tile/subway_tile_nor_gl_1k.jpg', roughness: 0.3, metallic: 0.1, tags: ['urban', 'subway', 'metro', 'clean'], moodTags: ['urban', 'transit'] },
  { id: 'urban-dirty-concrete', name: 'Dirty Concrete', nameNo: 'Skitten betong', category: 'urban', color: '#5a5a5a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_008/concrete_wall_008_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_008/concrete_wall_008_nor_gl_1k.jpg', roughness: 0.95, metallic: 0, tags: ['urban', 'concrete', 'industrial', 'parking'], moodTags: ['industrial', 'gritty'] },
  { id: 'urban-neon-panel', name: 'Neon Sign Panel', nameNo: 'Neonskiltpanel', category: 'urban', color: '#1a1a2a', emissive: '#ff00ff', emissiveIntensity: 0.3, roughness: 0.3, metallic: 0.5, tags: ['urban', 'neon', 'night', 'cyberpunk'], moodTags: ['neon', 'night', 'vibrant'] },
  { id: 'urban-neon-cyan', name: 'Cyan Neon Panel', nameNo: 'Cyan neonpanel', category: 'urban', color: '#1a2a2a', emissive: '#00ffff', emissiveIntensity: 0.3, roughness: 0.3, metallic: 0.5, tags: ['urban', 'neon', 'night', 'cyberpunk'], moodTags: ['neon', 'night', 'vibrant'] },
  { id: 'urban-neon-orange', name: 'Orange Neon Panel', nameNo: 'Oransje neonpanel', category: 'urban', color: '#2a1a1a', emissive: '#ff6600', emissiveIntensity: 0.3, roughness: 0.3, metallic: 0.5, tags: ['urban', 'neon', 'night', 'warm'], moodTags: ['neon', 'night', 'warm'] },
  { id: 'urban-chain-link', name: 'Chain Link Fence', nameNo: 'Nettinggjerde', category: 'urban', color: '#606060', roughness: 0.6, metallic: 0.8, opacity: 0.3, tags: ['urban', 'fence', 'industrial', 'street'], moodTags: ['industrial', 'gritty'] },
  { id: 'urban-posters', name: 'Poster Wall', nameNo: 'Plakatvegg', category: 'urban', color: '#3a3a3a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_with_posters/plastered_wall_with_posters_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_with_posters/plastered_wall_with_posters_nor_gl_1k.jpg', roughness: 0.9, metallic: 0, tags: ['urban', 'street', 'posters', 'art'], moodTags: ['urban', 'artistic', 'street'] },
  { id: 'urban-painted-metal', name: 'Painted Metal Door', nameNo: 'Malt metalldør', category: 'urban', color: '#2a4a3a', roughness: 0.6, metallic: 0.7, tags: ['urban', 'industrial', 'door', 'warehouse'], moodTags: ['industrial'] },
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

