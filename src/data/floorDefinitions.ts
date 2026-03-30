/**
 * Floor Definitions - Materials, textures, and presets for studio floors
 */

export type FloorCategory = 'solid' | 'wood' | 'concrete' | 'tile' | 'special' | 'lovecraft' | 'cinematic' | 'urban';

export interface FloorMaterial {
  id: string;
  name: string;
  nameNo: string;
  category: FloorCategory;
  color?: string;
  textureUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  roughness?: number;
  metallic?: number;
  reflectivity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  tileScale?: number;
  tags: string[];
  moodTags?: string[];
  previewUrl?: string;
}

export const FLOOR_CATEGORIES: { id: FloorCategory; name: string; nameNo: string; icon: string }[] = [
  { id: 'solid', name: 'Solid Colors', nameNo: 'Ensfargede', icon: '🎨' },
  { id: 'wood', name: 'Wood', nameNo: 'Tre', icon: '🪵' },
  { id: 'concrete', name: 'Concrete', nameNo: 'Betong', icon: '🏗️' },
  { id: 'tile', name: 'Tile', nameNo: 'Flis', icon: '🔲' },
  { id: 'urban', name: 'Urban', nameNo: 'Urbant', icon: '🏙️' },
  { id: 'special', name: 'Special', nameNo: 'Spesial', icon: '✨' },
  { id: 'lovecraft', name: 'Lovecraft/Horror', nameNo: 'Lovecraft/Skrekk', icon: '🐙' },
  { id: 'cinematic', name: 'Cinematic', nameNo: 'Filmisk', icon: '🎬' },
];

export const FLOOR_MATERIALS: FloorMaterial[] = [
  // ============================================
  // SOLID COLORS - Studio Standards
  // ============================================
  { id: 'white', name: 'Studio White', nameNo: 'Studio hvit', category: 'solid', color: '#ffffff', roughness: 0.8, metallic: 0, reflectivity: 0.1, tags: ['studio', 'clean', 'bright'], moodTags: ['professional', 'clean'] },
  { id: 'white-semi-gloss', name: 'Semi-Gloss White', nameNo: 'Halvblank hvit', category: 'solid', color: '#f8f8f8', roughness: 0.4, metallic: 0, reflectivity: 0.4, tags: ['studio', 'clean', 'reflective'], moodTags: ['professional', 'clean'] },
  { id: 'gray-light', name: 'Light Gray', nameNo: 'Lys grå', category: 'solid', color: '#c0c0c0', roughness: 0.75, metallic: 0, reflectivity: 0.15, tags: ['studio', 'neutral'], moodTags: ['professional'] },
  { id: 'gray-18pct', name: '18% Middle Gray', nameNo: '18% mellomgrå', category: 'solid', color: '#767676', roughness: 0.85, metallic: 0, reflectivity: 0.08, tags: ['studio', 'neutral', 'exposure'], moodTags: ['professional', 'technical'] },
  { id: 'gray-dark', name: 'Dark Gray', nameNo: 'Mørk grå', category: 'solid', color: '#404040', roughness: 0.7, metallic: 0, reflectivity: 0.2, tags: ['studio', 'dramatic'], moodTags: ['dramatic', 'moody'] },
  { id: 'black', name: 'Studio Black', nameNo: 'Studio svart', category: 'solid', color: '#1a1a1a', roughness: 0.85, metallic: 0, reflectivity: 0.05, tags: ['studio', 'dramatic', 'void'], moodTags: ['dramatic', 'dark'] },
  { id: 'black-glossy', name: 'Glossy Black', nameNo: 'Blank svart', category: 'solid', color: '#0d0d0d', roughness: 0.1, metallic: 0.1, reflectivity: 0.9, tags: ['studio', 'dramatic', 'reflective'], moodTags: ['dramatic', 'elegant'] },
  { id: 'vinyl-beige', name: 'Studio Vinyl Beige', nameNo: 'Studio vinyl beige', category: 'solid', color: '#d4c4a8', roughness: 0.7, metallic: 0, reflectivity: 0.12, tags: ['studio', 'vinyl', 'warm', 'natural'], moodTags: ['warm', 'natural'] },
  { id: 'vinyl-slate', name: 'Studio Vinyl Slate', nameNo: 'Studio vinyl skifer', category: 'solid', color: '#6a7a7a', roughness: 0.72, metallic: 0, reflectivity: 0.14, tags: ['studio', 'vinyl', 'cool', 'modern'], moodTags: ['modern', 'cool'] },

  // ============================================
  // WOOD - Natural and Finished
  // ============================================
  { id: 'oak-light', name: 'Light Oak', nameNo: 'Lys eik', category: 'wood', color: '#c4a77d', textureUrl: '/textures/floors/oak_light.png', roughness: 0.6, metallic: 0, reflectivity: 0.2, tileScale: 4, tags: ['natural', 'scandinavian', 'warm'], moodTags: ['warm', 'natural'] },
  { id: 'oak-dark', name: 'Dark Oak', nameNo: 'Mørk eik', category: 'wood', color: '#5a4a3a', textureUrl: '/textures/floors/walnut.png', roughness: 0.55, metallic: 0, reflectivity: 0.25, tileScale: 4, tags: ['natural', 'classic', 'rich'], moodTags: ['warm', 'classic'] },
  { id: 'walnut', name: 'Walnut', nameNo: 'Valnøtt', category: 'wood', color: '#4a3a2a', textureUrl: '/textures/floors/walnut.png', roughness: 0.5, metallic: 0, reflectivity: 0.3, tileScale: 4, tags: ['natural', 'elegant', 'rich'], moodTags: ['elegant', 'rich'] },
  { id: 'pine', name: 'Pine', nameNo: 'Furu', category: 'wood', color: '#d4b896', textureUrl: '/textures/floors/oak_light.png', roughness: 0.65, metallic: 0, reflectivity: 0.15, tileScale: 4, tags: ['natural', 'rustic', 'light'], moodTags: ['natural', 'rustic'] },
  { id: 'herringbone', name: 'Herringbone Parquet', nameNo: 'Fiskebenparkett', category: 'wood', color: '#8b7355', textureUrl: '/textures/floors/herringbone.png', roughness: 0.45, metallic: 0, reflectivity: 0.3, tileScale: 3, tags: ['elegant', 'classic', 'european'], moodTags: ['elegant', 'classic'] },
  { id: 'reclaimed', name: 'Reclaimed Wood', nameNo: 'Gjenbrukstrevirke', category: 'wood', color: '#6b5b4b', textureUrl: '/textures/floors/walnut.png', roughness: 0.8, metallic: 0, reflectivity: 0.1, tileScale: 3, tags: ['rustic', 'vintage', 'character'], moodTags: ['rustic', 'authentic'] },

  // ============================================
  // CONCRETE - Industrial
  // ============================================
  { id: 'concrete-raw', name: 'Raw Concrete', nameNo: 'Rå betong', category: 'concrete', color: '#6b6b6b', textureUrl: '/textures/floors/concrete_polished.png', roughness: 0.95, metallic: 0, reflectivity: 0.05, tileScale: 3, tags: ['industrial', 'raw', 'modern'], moodTags: ['industrial', 'raw'] },
  { id: 'concrete-polished', name: 'Polished Concrete', nameNo: 'Polert betong', category: 'concrete', color: '#808080', textureUrl: '/textures/floors/concrete_polished.png', roughness: 0.3, metallic: 0.1, reflectivity: 0.5, tileScale: 3, tags: ['industrial', 'modern', 'sleek'], moodTags: ['modern', 'sleek'] },
  { id: 'concrete-stained', name: 'Stained Concrete', nameNo: 'Farget betong', category: 'concrete', color: '#4a4a4a', roughness: 0.6, metallic: 0.05, reflectivity: 0.3, tags: ['industrial', 'artistic', 'modern'], moodTags: ['modern', 'artistic'] },

  // ============================================
  // TILE - Various Styles
  // ============================================
  { id: 'marble-white', name: 'White Marble', nameNo: 'Hvit marmor', category: 'tile', color: '#f8f8f8', textureUrl: '/textures/floors/marble_white.png', roughness: 0.2, metallic: 0, reflectivity: 0.6, tileScale: 3, tags: ['elegant', 'luxury', 'classic'], moodTags: ['elegant', 'luxury'] },
  { id: 'marble-black', name: 'Black Marble', nameNo: 'Sort marmor', category: 'tile', color: '#1a1a1a', textureUrl: '/textures/floors/marble_black.jpg', roughness: 0.15, metallic: 0.05, reflectivity: 0.7, tags: ['elegant', 'luxury', 'dramatic'], moodTags: ['elegant', 'dramatic'] },
  { id: 'terrazzo', name: 'Terrazzo', nameNo: 'Terrazzo', category: 'tile', color: '#e8e0d8', textureUrl: '/textures/floors/terrazzo.jpg', roughness: 0.4, metallic: 0, reflectivity: 0.35, tags: ['retro', 'artistic', 'colorful'], moodTags: ['retro', 'artistic'] },
  { id: 'checkerboard', name: 'Checkerboard', nameNo: 'Sjakkmønster', category: 'tile', color: '#ffffff', textureUrl: '/textures/floors/checkerboard.jpg', roughness: 0.3, metallic: 0, reflectivity: 0.4, tileScale: 4, tags: ['classic', 'retro', 'diner'], moodTags: ['retro', 'classic'] },

  // ============================================
  // SPECIAL - Effects
  // ============================================
  { id: 'mirror', name: 'Mirror Floor', nameNo: 'Speilgulv', category: 'special', color: '#c0c0c0', roughness: 0.02, metallic: 0.9, reflectivity: 0.98, tags: ['dramatic', 'artistic', 'fashion'], moodTags: ['dramatic', 'artistic'] },
  { id: 'water', name: 'Water Effect', nameNo: 'Vanneffekt', category: 'special', color: '#1a3a4a', roughness: 0.1, metallic: 0.2, reflectivity: 0.8, tags: ['artistic', 'dramatic', 'nature'], moodTags: ['calm', 'artistic'] },
  { id: 'infinity', name: 'Infinity Cove', nameNo: 'Uendelighetssveip', category: 'special', color: '#ffffff', roughness: 0.9, metallic: 0, reflectivity: 0.1, tags: ['studio', 'seamless', 'professional'], moodTags: ['clean', 'professional'] },

  // ============================================
  // LOVECRAFT / HORROR
  // ============================================
  { id: 'lovecraft-abyss', name: 'Abyssal Floor', nameNo: 'Avgrunngulv', category: 'lovecraft', color: '#050508', roughness: 0.95, metallic: 0.1, reflectivity: 0.02, emissive: '#0a0a1a', emissiveIntensity: 0.05, tags: ['lovecraft', 'horror', 'void', 'dark'], moodTags: ['dark', 'mysterious'] },
  { id: 'lovecraft-slime', name: 'Eldritch Slime', nameNo: 'Eldritsk slim', category: 'lovecraft', color: '#0a2a1a', roughness: 0.2, metallic: 0.3, reflectivity: 0.5, emissive: '#0a3a2a', emissiveIntensity: 0.1, tags: ['lovecraft', 'horror', 'gross', 'wet'], moodTags: ['unsettling', 'gross'] },
  { id: 'lovecraft-ritual', name: 'Ritual Circle', nameNo: 'Ritualsirkel', category: 'lovecraft', color: '#1a0a0a', emissive: '#3a0a0a', emissiveIntensity: 0.2, roughness: 0.7, metallic: 0.1, reflectivity: 0.2, tags: ['lovecraft', 'horror', 'occult', 'magic'], moodTags: ['dark', 'occult'] },
  { id: 'lovecraft-tentacle', name: 'Tentacle Pattern', nameNo: 'Tentakkelmønster', category: 'lovecraft', color: '#1a1a2a', textureUrl: '/textures/floors/tentacle_pattern.jpg', roughness: 0.8, metallic: 0.15, reflectivity: 0.15, tags: ['lovecraft', 'horror', 'organic', 'alien'], moodTags: ['unsettling', 'alien'] },

  // ============================================
  // CINEMATIC
  // ============================================
  { id: 'nolan-reflective', name: 'Nolan Reflective', nameNo: 'Nolan reflekterende', category: 'cinematic', color: '#0d0d10', roughness: 0.15, metallic: 0.2, reflectivity: 0.7, tags: ['cinematic', 'nolan', 'dramatic', 'reflective'], moodTags: ['dramatic', 'tense'] },
  { id: 'kubrick-shine', name: 'Kubrick Shine', nameNo: 'Kubrick skinn', category: 'cinematic', color: '#f0e6d8', roughness: 0.1, metallic: 0.1, reflectivity: 0.8, tags: ['cinematic', 'kubrick', 'eerie', 'hotel'], moodTags: ['eerie', 'unsettling'] },
  { id: 'blade-runner-wet', name: 'Blade Runner Wet', nameNo: 'Blade Runner våt', category: 'cinematic', color: '#1a1a2e', roughness: 0.05, metallic: 0.3, reflectivity: 0.85, emissive: '#ff3a00', emissiveIntensity: 0.05, tags: ['cinematic', 'sci-fi', 'neon', 'rainy'], moodTags: ['futuristic', 'moody'] },
  { id: 'alien-grating', name: 'Alien Grating', nameNo: 'Alien rist', category: 'cinematic', color: '#2a3a2a', textureUrl: '/textures/floors/metal_grating.jpg', roughness: 0.7, metallic: 0.8, reflectivity: 0.3, tags: ['cinematic', 'sci-fi', 'industrial', 'horror'], moodTags: ['tense', 'industrial'] },

  // ============================================
  // URBAN - City Streets and Industrial
  // ============================================
  { id: 'urban-asphalt', name: 'Asphalt', nameNo: 'Asfalt', category: 'urban', color: '#2a2a2a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_04/asphalt_04_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_04/asphalt_04_nor_gl_1k.jpg', roughness: 0.95, metallic: 0, reflectivity: 0.05, tags: ['urban', 'street', 'road', 'outdoor'], moodTags: ['urban', 'street'] },
  { id: 'urban-asphalt-wet', name: 'Wet Asphalt', nameNo: 'Våt asfalt', category: 'urban', color: '#1a1a1a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_04/asphalt_04_diff_1k.jpg', roughness: 0.2, metallic: 0.1, reflectivity: 0.7, tags: ['urban', 'street', 'rainy', 'night'], moodTags: ['moody', 'rainy', 'night'] },
  { id: 'urban-cobblestone', name: 'Cobblestone', nameNo: 'Brostein', category: 'urban', color: '#5a5a5a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cobblestone_floor_04/cobblestone_floor_04_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cobblestone_floor_04/cobblestone_floor_04_nor_gl_1k.jpg', roughness: 0.9, metallic: 0, reflectivity: 0.1, tags: ['urban', 'vintage', 'european', 'street'], moodTags: ['vintage', 'classic'] },
  { id: 'urban-sidewalk', name: 'Sidewalk', nameNo: 'Fortau', category: 'urban', color: '#8a8a8a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/pavement_04/pavement_04_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/pavement_04/pavement_04_nor_gl_1k.jpg', roughness: 0.85, metallic: 0, reflectivity: 0.1, tags: ['urban', 'sidewalk', 'street', 'outdoor'], moodTags: ['urban'] },
  { id: 'urban-metal-grating', name: 'Metal Grating', nameNo: 'Metallrist', category: 'urban', color: '#3a3a3a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_grate_01/metal_grate_01_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_grate_01/metal_grate_01_nor_gl_1k.jpg', roughness: 0.6, metallic: 0.8, reflectivity: 0.3, tags: ['urban', 'industrial', 'metal', 'factory'], moodTags: ['industrial'] },
  { id: 'urban-subway-platform', name: 'Subway Platform', nameNo: 'T-baneplattform', category: 'urban', color: '#4a4a4a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_nor_gl_1k.jpg', roughness: 0.8, metallic: 0, reflectivity: 0.15, tags: ['urban', 'subway', 'metro', 'transit'], moodTags: ['urban', 'transit'] },
  { id: 'urban-parking-lot', name: 'Parking Lot', nameNo: 'Parkeringsplass', category: 'urban', color: '#3a3a3a', roughness: 0.9, metallic: 0, reflectivity: 0.1, tags: ['urban', 'parking', 'concrete', 'industrial'], moodTags: ['industrial', 'urban'] },
  { id: 'urban-warehouse', name: 'Warehouse Floor', nameNo: 'Lagergulv', category: 'urban', color: '#5a5a4a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_worn_001/concrete_floor_worn_001_nor_gl_1k.jpg', roughness: 0.85, metallic: 0, reflectivity: 0.1, tags: ['urban', 'warehouse', 'industrial', 'factory'], moodTags: ['industrial', 'gritty'] },
  { id: 'urban-neon-floor', name: 'Neon Reflective', nameNo: 'Neonreflekterende', category: 'urban', color: '#1a1a2a', roughness: 0.1, metallic: 0.2, reflectivity: 0.8, emissive: '#ff00ff', emissiveIntensity: 0.05, tags: ['urban', 'neon', 'night', 'cyberpunk'], moodTags: ['neon', 'night', 'futuristic'] },
  { id: 'urban-puddles', name: 'Street with Puddles', nameNo: 'Gate med sølepytter', category: 'urban', color: '#2a2a2a', roughness: 0.15, metallic: 0.15, reflectivity: 0.75, tags: ['urban', 'rainy', 'night', 'street'], moodTags: ['moody', 'rainy'] },
  { id: 'urban-rooftop', name: 'Rooftop Gravel', nameNo: 'Takgrus', category: 'urban', color: '#5a5a5a', textureUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/gravel_concrete_03/gravel_concrete_03_diff_1k.jpg', normalMapUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/gravel_concrete_03/gravel_concrete_03_nor_gl_1k.jpg', roughness: 0.95, metallic: 0, reflectivity: 0.05, tags: ['urban', 'rooftop', 'outdoor'], moodTags: ['urban', 'outdoor'] },

  // ============================================
  // SPECIAL - Extended
  // ============================================
  { id: 'sand-desert', name: 'Desert Sand', nameNo: 'Ørkensan', category: 'special', color: '#c8b06a', roughness: 0.98, metallic: 0, reflectivity: 0.03, tileScale: 3, tags: ['outdoor', 'desert', 'warm', 'nature'], moodTags: ['warm', 'natural', 'exotic'] },
  { id: 'sand-beach', name: 'Wet Beach Sand', nameNo: 'Våt strandsand', category: 'special', color: '#b8a05a', roughness: 0.85, metallic: 0, reflectivity: 0.12, tileScale: 3, tags: ['outdoor', 'beach', 'coastal', 'natural'], moodTags: ['natural', 'fresh'] },
  { id: 'grass-lawn', name: 'Lawn Grass', nameNo: 'Plengressmatte', category: 'special', color: '#4a7a3a', roughness: 0.95, metallic: 0, reflectivity: 0.05, tileScale: 4, tags: ['outdoor', 'nature', 'green', 'garden'], moodTags: ['natural', 'fresh'] },
  { id: 'studio-hardwood-lacquered', name: 'Lacquered Studio Hardwood', nameNo: 'Lakert studioparketter', category: 'wood', color: '#a08060', roughness: 0.25, metallic: 0, reflectivity: 0.55, tileScale: 4, tags: ['studio', 'elegant', 'reflective', 'professional'], moodTags: ['elegant', 'professional'] },
  { id: 'cork', name: 'Cork Floor', nameNo: 'Korkgulv', category: 'wood', color: '#c4a060', roughness: 0.88, metallic: 0, reflectivity: 0.08, tileScale: 3, tags: ['natural', 'warm', 'eco', 'scandinavian'], moodTags: ['warm', 'natural'] },
  { id: 'bamboo', name: 'Bamboo', nameNo: 'Bambus', category: 'wood', color: '#c8b870', roughness: 0.55, metallic: 0, reflectivity: 0.22, tileScale: 4, tags: ['natural', 'asian', 'warm', 'eco'], moodTags: ['warm', 'natural'] },
  { id: 'slate-natural', name: 'Natural Slate', nameNo: 'Naturlig skifer', category: 'tile', color: '#4a4a5a', textureUrl: '/textures/floors/concrete_polished.png', roughness: 0.75, metallic: 0.1, reflectivity: 0.2, tileScale: 3, tags: ['natural', 'stone', 'rustic', 'nordic'], moodTags: ['natural', 'rustic'] },
  { id: 'travertine', name: 'Travertine', nameNo: 'Travertin', category: 'tile', color: '#d4c4a8', roughness: 0.45, metallic: 0, reflectivity: 0.3, tileScale: 3, tags: ['elegant', 'mediterranean', 'luxury', 'natural'], moodTags: ['elegant', 'warm'] },
  { id: 'epoxy-white', name: 'Epoxy White', nameNo: 'Epoxy hvit', category: 'special', color: '#f0f0f0', roughness: 0.08, metallic: 0.05, reflectivity: 0.82, tags: ['studio', 'clean', 'modern', 'sleek'], moodTags: ['clean', 'modern', 'professional'] },
  { id: 'epoxy-charcoal', name: 'Epoxy Charcoal', nameNo: 'Epoxy kull', category: 'special', color: '#303030', roughness: 0.1, metallic: 0.1, reflectivity: 0.75, tags: ['studio', 'dramatic', 'modern', 'sleek'], moodTags: ['dramatic', 'modern'] },
];

// Helper functions
export const getFloorsByCategory = (category: FloorCategory): FloorMaterial[] =>
  FLOOR_MATERIALS.filter(f => f.category === category);

export const getFloorById = (id: string): FloorMaterial | undefined =>
  FLOOR_MATERIALS.find(f => f.id === id);

export const searchFloors = (query: string): FloorMaterial[] => {
  const lowerQuery = query.toLowerCase();
  return FLOOR_MATERIALS.filter(f =>
    f.name.toLowerCase().includes(lowerQuery) ||
    f.nameNo.toLowerCase().includes(lowerQuery) ||
    f.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    f.moodTags?.some(m => m.toLowerCase().includes(lowerQuery))
  );
};

export const getFloorsByMood = (mood: string): FloorMaterial[] =>
  FLOOR_MATERIALS.filter(f => f.moodTags?.includes(mood));

