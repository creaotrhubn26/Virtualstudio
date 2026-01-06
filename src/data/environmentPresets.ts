/**
 * Environment Presets - Complete studio/scene environment configurations
 * Combines walls, floors, lighting, camera presets, and ambient sounds
 */

export type EnvironmentCategory = 'studio' | 'cinematic' | 'lovecraft' | 'nature' | 'urban' | 'fantasy';

export interface EnvironmentPreset {
  id: string;
  name: string;
  nameNo: string;
  category: EnvironmentCategory;
  description: string;
  descriptionNo: string;
  thumbnail?: string;
  
  // Wall configuration
  walls: {
    backWall: { materialId: string; visible: boolean };
    leftWall: { materialId: string; visible: boolean };
    rightWall: { materialId: string; visible: boolean };
    rearWall: { materialId: string; visible: boolean };
  };
  
  // Floor configuration
  floor: {
    materialId: string;
    visible: boolean;
    gridVisible?: boolean;
  };
  
  // Lighting suggestions
  lightingPreset?: string;
  suggestedLights?: Array<{
    type: string;
    position: [number, number, number];
    intensity: number;
    color?: string;
    cct?: number;
  }>;
  
  // Camera suggestions
  cameraPreset?: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  
  // Ambient sound
  ambientSounds?: string[];
  
  // Mood/atmosphere
  moodTags: string[];
  tags: string[];
}

export const ENVIRONMENT_CATEGORIES: { id: EnvironmentCategory; name: string; nameNo: string; icon: string }[] = [
  { id: 'studio', name: 'Studio', nameNo: 'Studio', icon: '📷' },
  { id: 'cinematic', name: 'Cinematic', nameNo: 'Filmisk', icon: '🎬' },
  { id: 'lovecraft', name: 'Lovecraft/Horror', nameNo: 'Lovecraft/Skrekk', icon: '🐙' },
  { id: 'nature', name: 'Nature', nameNo: 'Natur', icon: '🌲' },
  { id: 'urban', name: 'Urban', nameNo: 'Urbant', icon: '🏙️' },
  { id: 'fantasy', name: 'Fantasy', nameNo: 'Fantasi', icon: '🏰' },
];

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  // ============================================
  // STUDIO PRESETS
  // ============================================
  {
    id: 'studio-classic-white',
    name: 'Classic White Studio',
    nameNo: 'Klassisk hvitt studio',
    category: 'studio',
    description: 'Clean white studio for professional portraits and product photography',
    descriptionNo: 'Rent hvitt studio for profesjonelle portretter og produktfotografering',
    walls: {
      backWall: { materialId: 'white', visible: true },
      leftWall: { materialId: 'white', visible: false },
      rightWall: { materialId: 'white', visible: false },
      rearWall: { materialId: 'white', visible: false },
    },
    floor: { materialId: 'infinity', visible: true, gridVisible: false },
    lightingPreset: 'portrett-studio',
    moodTags: ['professional', 'clean', 'bright'],
    tags: ['studio', 'portrait', 'product', 'commercial'],
  },
  {
    id: 'studio-dark-dramatic',
    name: 'Dark Dramatic Studio',
    nameNo: 'Mørkt dramatisk studio',
    category: 'studio',
    description: 'Moody black studio for dramatic portraits and fashion',
    descriptionNo: 'Stemningsfullt svart studio for dramatiske portretter og mote',
    walls: {
      backWall: { materialId: 'black', visible: true },
      leftWall: { materialId: 'black', visible: true },
      rightWall: { materialId: 'black', visible: true },
      rearWall: { materialId: 'black', visible: false },
    },
    floor: { materialId: 'black-glossy', visible: true, gridVisible: false },
    lightingPreset: 'mote-editorial',
    moodTags: ['dramatic', 'moody', 'dark'],
    tags: ['studio', 'fashion', 'dramatic', 'editorial'],
  },
  {
    id: 'studio-gray-neutral',
    name: 'Neutral Gray Studio',
    nameNo: 'Nøytralt grått studio',
    category: 'studio',
    description: 'Versatile gray studio for all types of photography',
    descriptionNo: 'Allsidig grått studio for alle typer fotografering',
    walls: {
      backWall: { materialId: 'gray-medium', visible: true },
      leftWall: { materialId: 'gray-dark', visible: false },
      rightWall: { materialId: 'gray-dark', visible: false },
      rearWall: { materialId: 'gray-dark', visible: false },
    },
    floor: { materialId: 'gray-dark', visible: true, gridVisible: true },
    moodTags: ['professional', 'versatile', 'neutral'],
    tags: ['studio', 'versatile', 'neutral', 'all-purpose'],
  },

  // ============================================
  // CINEMATIC PRESETS
  // ============================================
  {
    id: 'cinematic-nolan',
    name: 'Christopher Nolan Style',
    nameNo: 'Christopher Nolan stil',
    category: 'cinematic',
    description: 'Dark, minimal, dramatic atmosphere inspired by Nolan films',
    descriptionNo: 'Mørk, minimal, dramatisk atmosfære inspirert av Nolan-filmer',
    walls: {
      backWall: { materialId: 'nolan-dark', visible: true },
      leftWall: { materialId: 'nolan-dark', visible: true },
      rightWall: { materialId: 'nolan-dark', visible: true },
      rearWall: { materialId: 'nolan-dark', visible: true },
    },
    floor: { materialId: 'nolan-reflective', visible: true, gridVisible: false },
    suggestedLights: [
      { type: 'key-light', position: [-3, 4, 2], intensity: 0.8, cct: 5600 },
      { type: 'rim-light', position: [2, 3, -2], intensity: 0.4, cct: 6500 },
    ],
    ambientSounds: ['drone-low', 'wind-subtle'],
    moodTags: ['dramatic', 'minimal', 'tense'],
    tags: ['cinematic', 'nolan', 'thriller', 'drama'],
  },
  {
    id: 'cinematic-blade-runner',
    name: 'Blade Runner Cyberpunk',
    nameNo: 'Blade Runner Cyberpunk',
    category: 'cinematic',
    description: 'Neon-lit, rainy, futuristic cyberpunk atmosphere',
    descriptionNo: 'Neonbelyst, regnfull, futuristisk cyberpunk-atmosfære',
    walls: {
      backWall: { materialId: 'blade-runner', visible: true },
      leftWall: { materialId: 'blade-runner', visible: true },
      rightWall: { materialId: 'blade-runner', visible: true },
      rearWall: { materialId: 'blade-runner', visible: false },
    },
    floor: { materialId: 'blade-runner-wet', visible: true, gridVisible: false },
    suggestedLights: [
      { type: 'neon', position: [-4, 2, 0], intensity: 0.6, color: '#ff3a00' },
      { type: 'neon', position: [4, 2, 0], intensity: 0.6, color: '#00d4ff' },
    ],
    ambientSounds: ['rain-heavy', 'city-ambient', 'synth-drone'],
    moodTags: ['futuristic', 'moody', 'neon'],
    tags: ['cinematic', 'sci-fi', 'cyberpunk', 'neon'],
  },
  {
    id: 'cinematic-kubrick',
    name: 'Stanley Kubrick Style',
    nameNo: 'Stanley Kubrick stil',
    category: 'cinematic',
    description: 'Symmetrical, eerie, unsettling atmosphere from Kubrick films',
    descriptionNo: 'Symmetrisk, uhyggelig, urovekkende atmosfære fra Kubrick-filmer',
    walls: {
      backWall: { materialId: 'kubrick-red', visible: true },
      leftWall: { materialId: 'kubrick-red', visible: true },
      rightWall: { materialId: 'kubrick-red', visible: true },
      rearWall: { materialId: 'kubrick-red', visible: false },
    },
    floor: { materialId: 'kubrick-shine', visible: true, gridVisible: false },
    cameraPreset: { position: [0, 1.6, 6], target: [0, 1.5, 0], fov: 0.4 },
    moodTags: ['eerie', 'unsettling', 'symmetrical'],
    tags: ['cinematic', 'kubrick', 'horror', 'psychological'],
  },

  // ============================================
  // LOVECRAFT / HORROR PRESETS
  // ============================================
  {
    id: 'lovecraft-void',
    name: 'Cosmic Void',
    nameNo: 'Kosmisk tomrom',
    category: 'lovecraft',
    description: 'Infinite darkness of the cosmic void, where ancient beings dwell',
    descriptionNo: 'Uendelig mørke fra det kosmiske tomrommet, hvor eldgamle vesener dveler',
    walls: {
      backWall: { materialId: 'lovecraft-void', visible: true },
      leftWall: { materialId: 'lovecraft-void', visible: true },
      rightWall: { materialId: 'lovecraft-void', visible: true },
      rearWall: { materialId: 'lovecraft-void', visible: true },
    },
    floor: { materialId: 'lovecraft-abyss', visible: true, gridVisible: false },
    suggestedLights: [
      { type: 'point', position: [0, 3, 0], intensity: 0.2, color: '#1a0a2e' },
    ],
    ambientSounds: ['lovecraft-drone', 'lovecraft-whispers'],
    moodTags: ['dark', 'mysterious', 'cosmic', 'terrifying'],
    tags: ['lovecraft', 'horror', 'cosmic', 'void', 'cthulhu'],
  },
  {
    id: 'lovecraft-deep-one',
    name: 'Deep One Chamber',
    nameNo: 'Dypvesenkammer',
    category: 'lovecraft',
    description: 'Underwater temple of the Deep Ones, Dagon worshippers',
    descriptionNo: 'Undervanns tempel for Dypvesenene, Dagon-tilbedere',
    walls: {
      backWall: { materialId: 'lovecraft-deep', visible: true },
      leftWall: { materialId: 'lovecraft-deep', visible: true },
      rightWall: { materialId: 'lovecraft-deep', visible: true },
      rearWall: { materialId: 'lovecraft-ancient', visible: true },
    },
    floor: { materialId: 'lovecraft-slime', visible: true, gridVisible: false },
    suggestedLights: [
      { type: 'point', position: [0, 2, 0], intensity: 0.3, color: '#0a3a2a' },
      { type: 'point', position: [-3, 1, 2], intensity: 0.15, color: '#0a5a4a' },
    ],
    ambientSounds: ['water-dripping', 'lovecraft-heartbeat', 'ocean-deep'],
    moodTags: ['dark', 'aquatic', 'ancient', 'unsettling'],
    tags: ['lovecraft', 'horror', 'dagon', 'deep-ones', 'innsmouth'],
  },
  {
    id: 'lovecraft-ritual',
    name: 'Cult Ritual Chamber',
    nameNo: 'Kultens ritualkammer',
    category: 'lovecraft',
    description: 'Secret chamber where forbidden rituals are performed',
    descriptionNo: 'Hemmelig kammer hvor forbudte ritualer utføres',
    walls: {
      backWall: { materialId: 'lovecraft-ritual', visible: true },
      leftWall: { materialId: 'lovecraft-ritual', visible: true },
      rightWall: { materialId: 'lovecraft-ritual', visible: true },
      rearWall: { materialId: 'lovecraft-ancient', visible: true },
    },
    floor: { materialId: 'lovecraft-ritual', visible: true, gridVisible: false },
    suggestedLights: [
      { type: 'point', position: [0, 0.5, 0], intensity: 0.4, color: '#5a0a0a' },
      { type: 'candle', position: [-2, 1, 2], intensity: 0.2, color: '#ff6a00' },
      { type: 'candle', position: [2, 1, 2], intensity: 0.2, color: '#ff6a00' },
    ],
    ambientSounds: ['lovecraft-chanting', 'fire-crackling', 'lovecraft-whispers'],
    moodTags: ['dark', 'occult', 'ritual', 'tense'],
    tags: ['lovecraft', 'horror', 'cult', 'ritual', 'occult'],
  },
  {
    id: 'lovecraft-madness',
    name: 'Chambers of Madness',
    nameNo: 'Galskapsens kammer',
    category: 'lovecraft',
    description: 'A place where sanity erodes and reality warps',
    descriptionNo: 'Et sted hvor fornuften forvitrer og virkeligheten vrir seg',
    walls: {
      backWall: { materialId: 'lovecraft-madness', visible: true },
      leftWall: { materialId: 'lovecraft-cosmic', visible: true },
      rightWall: { materialId: 'lovecraft-cosmic', visible: true },
      rearWall: { materialId: 'lovecraft-madness', visible: true },
    },
    floor: { materialId: 'lovecraft-tentacle', visible: true, gridVisible: false },
    ambientSounds: ['lovecraft-whispers', 'lovecraft-drone', 'static-eerie'],
    moodTags: ['insane', 'unsettling', 'surreal', 'terrifying'],
    tags: ['lovecraft', 'horror', 'madness', 'yellow-king', 'hastur'],
  },

  // ============================================
  // NATURE PRESETS
  // ============================================
  {
    id: 'nature-forest',
    name: 'Forest Clearing',
    nameNo: 'Skogglenne',
    category: 'nature',
    description: 'Peaceful forest clearing with natural light filtering through trees',
    descriptionNo: 'Fredelig skogglenne med naturlig lys som filtreres gjennom trærne',
    walls: {
      backWall: { materialId: 'forest-green', visible: true },
      leftWall: { materialId: 'forest-green', visible: false },
      rightWall: { materialId: 'forest-green', visible: false },
      rearWall: { materialId: 'forest-green', visible: false },
    },
    floor: { materialId: 'reclaimed', visible: true, gridVisible: false },
    ambientSounds: ['birds-forest', 'wind-leaves', 'creek-gentle'],
    moodTags: ['calm', 'natural', 'peaceful'],
    tags: ['nature', 'forest', 'outdoor', 'peaceful'],
  },
];

// Helper functions
export const getEnvironmentsByCategory = (category: EnvironmentCategory): EnvironmentPreset[] =>
  ENVIRONMENT_PRESETS.filter(e => e.category === category);

export const getEnvironmentById = (id: string): EnvironmentPreset | undefined =>
  ENVIRONMENT_PRESETS.find(e => e.id === id);

export const searchEnvironments = (query: string): EnvironmentPreset[] => {
  const lowerQuery = query.toLowerCase();
  return ENVIRONMENT_PRESETS.filter(e =>
    e.name.toLowerCase().includes(lowerQuery) ||
    e.nameNo.toLowerCase().includes(lowerQuery) ||
    e.description.toLowerCase().includes(lowerQuery) ||
    e.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    e.moodTags.some(m => m.toLowerCase().includes(lowerQuery))
  );
};

export const getEnvironmentsByMood = (mood: string): EnvironmentPreset[] =>
  ENVIRONMENT_PRESETS.filter(e => e.moodTags.includes(mood));

