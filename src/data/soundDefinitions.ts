/**
 * Sound Library Definitions
 * Complete sound library with categories, metadata, and mood tags
 */

export type SoundCategory =
  | 'environment'  // Wind, rain, nature
  | 'atmosphere'   // Lovecraft, horror, sci-fi
  | 'production'   // Clapper, slate, countdown
  | 'practical'    // Doors, footsteps, objects
  | 'ambience'     // Room tone, background noise
  | 'music'        // Background music, stingers
  | 'ui';          // Interface sounds

export type MoodTag = 'dark' | 'mysterious' | 'tense' | 'calm' | 'epic' | 'warm' | 'cold';

export interface SoundDefinition {
  id: string;
  name: string;
  nameNo: string;
  category: SoundCategory;
  subcategory: string;
  url: string;
  duration: number;
  loop: boolean;
  spatial: boolean;
  defaultVolume: number;
  tags: string[];
  description?: string;
  descriptionNo?: string;
  moodTags?: MoodTag[];
  bpm?: number;
  key?: string;
}

export const SOUND_LIBRARY: SoundDefinition[] = [
  // ============================================
  // ENVIRONMENT - Nature sounds
  // ============================================
  {
    id: 'rain-light',
    name: 'Light Rain',
    nameNo: 'Lett regn',
    category: 'environment',
    subcategory: 'Weather',
    url: '/audio/environment/rain-light.mp3',
    duration: 60,
    loop: true,
    spatial: false,
    defaultVolume: 0.4,
    tags: ['rain', 'weather', 'outdoor', 'ambient'],
    moodTags: ['calm'],
  },
  {
    id: 'rain-heavy',
    name: 'Heavy Rain Storm',
    nameNo: 'Kraftig regnstorm',
    category: 'environment',
    subcategory: 'Weather',
    url: '/audio/environment/rain-heavy.mp3',
    duration: 120,
    loop: true,
    spatial: false,
    defaultVolume: 0.6,
    tags: ['rain', 'storm', 'thunder', 'weather'],
    moodTags: ['tense', 'dark'],
  },
  {
    id: 'wind-howling',
    name: 'Howling Wind',
    nameNo: 'Ulende vind',
    category: 'environment',
    subcategory: 'Weather',
    url: '/audio/environment/wind-howling.mp3',
    duration: 90,
    loop: true,
    spatial: false,
    defaultVolume: 0.5,
    tags: ['wind', 'weather', 'outdoor'],
    moodTags: ['mysterious', 'tense'],
  },
  {
    id: 'wind-gentle',
    name: 'Gentle Breeze',
    nameNo: 'Mild bris',
    category: 'environment',
    subcategory: 'Weather',
    url: '/audio/environment/wind-gentle.mp3',
    duration: 60,
    loop: true,
    spatial: false,
    defaultVolume: 0.3,
    tags: ['wind', 'breeze', 'calm', 'outdoor'],
    moodTags: ['calm', 'warm'],
  },
  {
    id: 'thunder-distant',
    name: 'Distant Thunder',
    nameNo: 'Fjern torden',
    category: 'environment',
    subcategory: 'Weather',
    url: '/audio/environment/thunder-distant.mp3',
    duration: 15,
    loop: false,
    spatial: true,
    defaultVolume: 0.7,
    tags: ['thunder', 'storm', 'weather'],
    moodTags: ['dark', 'tense'],
  },
  {
    id: 'thunder-close',
    name: 'Close Thunder Crack',
    nameNo: 'Naert tordenbrak',
    category: 'environment',
    subcategory: 'Weather',
    url: '/audio/environment/thunder-close.mp3',
    duration: 8,
    loop: false,
    spatial: true,
    defaultVolume: 0.85,
    tags: ['thunder', 'storm', 'loud'],
    moodTags: ['tense', 'epic'],
  },
  {
    id: 'forest-day',
    name: 'Forest Ambience (Day)',
    nameNo: 'Skogsstemning (dag)',
    category: 'environment',
    subcategory: 'Nature',
    url: '/audio/environment/forest-day.mp3',
    duration: 120,
    loop: true,
    spatial: false,
    defaultVolume: 0.35,
    tags: ['forest', 'birds', 'nature', 'outdoor'],
    moodTags: ['calm', 'warm'],
  },
  {
    id: 'forest-night',
    name: 'Forest Ambience (Night)',
    nameNo: 'Skogsstemning (natt)',
    category: 'environment',
    subcategory: 'Nature',
    url: '/audio/environment/forest-night.mp3',
    duration: 120,
    loop: true,
    spatial: false,
    defaultVolume: 0.4,
    tags: ['forest', 'crickets', 'owls', 'night'],
    moodTags: ['mysterious', 'calm'],
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    nameNo: 'Havbolger',
    category: 'environment',
    subcategory: 'Water',
    url: '/audio/environment/ocean-waves.mp3',
    duration: 90,
    loop: true,
    spatial: false,
    defaultVolume: 0.45,
    tags: ['ocean', 'waves', 'beach', 'water'],
    moodTags: ['calm'],
  },

  // ============================================
  // ATMOSPHERE - Mood sounds (Lovecraft, Horror, Sci-Fi)
  // ============================================
  {
    id: 'lovecraft-whispers',
    name: 'Eldritch Whispers',
    nameNo: 'Eldgamle hvisking',
    category: 'atmosphere',
    subcategory: 'Lovecraft',
    url: '/audio/atmosphere/lovecraft-whispers.mp3',
    duration: 45,
    loop: true,
    spatial: false,
    defaultVolume: 0.3,
    tags: ['lovecraft', 'horror', 'whispers', 'creepy'],
    moodTags: ['dark', 'mysterious'],
    description: 'Unsettling whispers from beyond',
    descriptionNo: 'Urovekkende hvisking fra det hinsidige',
  },
  {
    id: 'lovecraft-drone',
    name: 'Cosmic Drone',
    nameNo: 'Kosmisk drone',
    category: 'atmosphere',
    subcategory: 'Lovecraft',
    url: '/audio/atmosphere/lovecraft-drone.mp3',
    duration: 120,
    loop: true,
    spatial: false,
    defaultVolume: 0.4,
    tags: ['lovecraft', 'drone', 'ambient', 'cosmic'],
    moodTags: ['dark', 'mysterious', 'tense'],
  },
  {
    id: 'lovecraft-heartbeat',
    name: 'Ancient Heartbeat',
    nameNo: 'Eldgammelt hjerteslag',
    category: 'atmosphere',
    subcategory: 'Lovecraft',
    url: '/audio/atmosphere/lovecraft-heartbeat.mp3',
    duration: 30,
    loop: true,
    spatial: true,
    defaultVolume: 0.5,
    tags: ['lovecraft', 'heartbeat', 'pulse', 'horror'],
    moodTags: ['tense', 'dark'],
  },
  {
    id: 'lovecraft-ritual',
    name: 'Dark Ritual Chanting',
    nameNo: 'Mork ritualmessing',
    category: 'atmosphere',
    subcategory: 'Lovecraft',
    url: '/audio/atmosphere/lovecraft-ritual.mp3',
    duration: 90,
    loop: true,
    spatial: true,
    defaultVolume: 0.35,
    tags: ['lovecraft', 'ritual', 'chanting', 'occult'],
    moodTags: ['dark', 'mysterious'],
  },
  {
    id: 'lovecraft-tentacles',
    name: 'Tentacle Movement',
    nameNo: 'Tentakkelbevegelse',
    category: 'atmosphere',
    subcategory: 'Lovecraft',
    url: '/audio/atmosphere/lovecraft-tentacles.mp3',
    duration: 20,
    loop: false,
    spatial: true,
    defaultVolume: 0.45,
    tags: ['lovecraft', 'creature', 'tentacles', 'squelch'],
    moodTags: ['dark', 'tense'],
  },
  {
    id: 'horror-tension',
    name: 'Rising Tension',
    nameNo: 'Stigende spenning',
    category: 'atmosphere',
    subcategory: 'Horror',
    url: '/audio/atmosphere/horror-tension.mp3',
    duration: 60,
    loop: true,
    spatial: false,
    defaultVolume: 0.4,
    tags: ['horror', 'tension', 'suspense'],
    moodTags: ['tense'],
  },
  {
    id: 'horror-stinger',
    name: 'Horror Stinger',
    nameNo: 'Skrekk-stinger',
    category: 'atmosphere',
    subcategory: 'Horror',
    url: '/audio/atmosphere/horror-stinger.mp3',
    duration: 3,
    loop: false,
    spatial: false,
    defaultVolume: 0.7,
    tags: ['horror', 'stinger', 'jump', 'scare'],
    moodTags: ['tense', 'dark'],
  },
  {
    id: 'scifi-ambient',
    name: 'Sci-Fi Ship Ambience',
    nameNo: 'Sci-Fi romskip-stemning',
    category: 'atmosphere',
    subcategory: 'Sci-Fi',
    url: '/audio/atmosphere/scifi-ambient.mp3',
    duration: 120,
    loop: true,
    spatial: false,
    defaultVolume: 0.35,
    tags: ['scifi', 'spaceship', 'ambient', 'hum'],
    moodTags: ['calm', 'mysterious'],
  },
  {
    id: 'scifi-computer',
    name: 'Computer Interface',
    nameNo: 'Datamaskin-grensesnitt',
    category: 'atmosphere',
    subcategory: 'Sci-Fi',
    url: '/audio/atmosphere/scifi-computer.mp3',
    duration: 30,
    loop: true,
    spatial: true,
    defaultVolume: 0.3,
    tags: ['scifi', 'computer', 'beeps', 'tech'],
    moodTags: ['calm', 'cold'],
  },

  // ============================================
  // PRODUCTION - Film production sounds
  // ============================================
  {
    id: 'clapper-slate',
    name: 'Clapper Slate',
    nameNo: 'Filmklapper',
    category: 'production',
    subcategory: 'Markers',
    url: '/audio/production/clapper.mp3',
    duration: 1,
    loop: false,
    spatial: true,
    defaultVolume: 0.8,
    tags: ['clapper', 'slate', 'marker', 'sync'],
  },
  {
    id: 'countdown-beep',
    name: 'Countdown Beep',
    nameNo: 'Nedtellingspip',
    category: 'production',
    subcategory: 'Markers',
    url: '/audio/production/countdown-beep.mp3',
    duration: 0.5,
    loop: false,
    spatial: false,
    defaultVolume: 0.6,
    tags: ['countdown', 'beep', 'marker'],
  },
  {
    id: 'tone-1khz',
    name: '1kHz Reference Tone',
    nameNo: '1kHz referansetone',
    category: 'production',
    subcategory: 'Reference',
    url: '/audio/production/tone-1khz.mp3',
    duration: 10,
    loop: true,
    spatial: false,
    defaultVolume: 0.5,
    tags: ['tone', 'reference', 'calibration'],
  },
  {
    id: 'action-call',
    name: 'Action Call',
    nameNo: 'Action-rop',
    category: 'production',
    subcategory: 'Voice',
    url: '/audio/production/action-call.mp3',
    duration: 2,
    loop: false,
    spatial: false,
    defaultVolume: 0.7,
    tags: ['action', 'director', 'voice'],
  },
  {
    id: 'cut-call',
    name: 'Cut Call',
    nameNo: 'Cut-rop',
    category: 'production',
    subcategory: 'Voice',
    url: '/audio/production/cut-call.mp3',
    duration: 1.5,
    loop: false,
    spatial: false,
    defaultVolume: 0.7,
    tags: ['cut', 'director', 'voice'],
  },

  // ============================================
  // PRACTICAL - Everyday object sounds
  // ============================================
  {
    id: 'door-wooden-open',
    name: 'Wooden Door Open',
    nameNo: 'Tredoer apne',
    category: 'practical',
    subcategory: 'Doors',
    url: '/audio/practical/door-wooden-open.mp3',
    duration: 2,
    loop: false,
    spatial: true,
    defaultVolume: 0.6,
    tags: ['door', 'wood', 'open', 'creak'],
  },
  {
    id: 'door-wooden-close',
    name: 'Wooden Door Close',
    nameNo: 'Tredoer lukke',
    category: 'practical',
    subcategory: 'Doors',
    url: '/audio/practical/door-wooden-close.mp3',
    duration: 1.5,
    loop: false,
    spatial: true,
    defaultVolume: 0.65,
    tags: ['door', 'wood', 'close', 'slam'],
  },
  {
    id: 'footsteps-wood',
    name: 'Footsteps on Wood',
    nameNo: 'Fottrinn pa tre',
    category: 'practical',
    subcategory: 'Footsteps',
    url: '/audio/practical/footsteps-wood.mp3',
    duration: 5,
    loop: true,
    spatial: true,
    defaultVolume: 0.5,
    tags: ['footsteps', 'wood', 'walk'],
  },

  // ============================================
  // AMBIENCE - Room tones
  // ============================================
  {
    id: 'room-tone-studio',
    name: 'Studio Room Tone',
    nameNo: 'Studiolyd',
    category: 'ambience',
    subcategory: 'Room Tone',
    url: '/audio/ambience/room-tone-studio.mp3',
    duration: 60,
    loop: true,
    spatial: false,
    defaultVolume: 0.15,
    tags: ['room', 'tone', 'studio', 'silent'],
  },
  {
    id: 'crowd-murmur',
    name: 'Crowd Murmur',
    nameNo: 'Folkemengde-mumling',
    category: 'ambience',
    subcategory: 'Crowds',
    url: '/audio/ambience/crowd-murmur.mp3',
    duration: 90,
    loop: true,
    spatial: false,
    defaultVolume: 0.35,
    tags: ['crowd', 'murmur', 'people', 'background'],
  },

  // ============================================
  // MUSIC - Background music
  // ============================================
  {
    id: 'music-tension-low',
    name: 'Low Tension Underscore',
    nameNo: 'Lav spennings-underscore',
    category: 'music',
    subcategory: 'Underscore',
    url: '/audio/music/tension-low.mp3',
    duration: 120,
    loop: true,
    spatial: false,
    defaultVolume: 0.25,
    tags: ['music', 'tension', 'underscore'],
    moodTags: ['tense'],
    bpm: 80,
  },
  {
    id: 'music-ambient-dark',
    name: 'Dark Ambient',
    nameNo: 'Mork ambient',
    category: 'music',
    subcategory: 'Ambient',
    url: '/audio/music/ambient-dark.mp3',
    duration: 180,
    loop: true,
    spatial: false,
    defaultVolume: 0.3,
    tags: ['music', 'ambient', 'dark', 'atmosphere'],
    moodTags: ['dark', 'mysterious'],
  },

  // ============================================
  // UI - Interface sounds
  // ============================================
  {
    id: 'ui-click',
    name: 'UI Click',
    nameNo: 'UI-klikk',
    category: 'ui',
    subcategory: 'Buttons',
    url: '/audio/ui/click.mp3',
    duration: 0.1,
    loop: false,
    spatial: false,
    defaultVolume: 0.4,
    tags: ['ui', 'click', 'button'],
  },
  {
    id: 'ui-success',
    name: 'Success Chime',
    nameNo: 'Suksess-klang',
    category: 'ui',
    subcategory: 'Feedback',
    url: '/audio/ui/success.mp3',
    duration: 0.8,
    loop: false,
    spatial: false,
    defaultVolume: 0.5,
    tags: ['ui', 'success', 'notification'],
  },
];

// Category metadata for UI display
export interface SoundCategoryMeta {
  id: SoundCategory;
  name: string;
  nameNo: string;
  icon: string;
  description: string;
  descriptionNo: string;
}

export const SOUND_CATEGORIES: SoundCategoryMeta[] = [
  {
    id: 'environment',
    name: 'Environment',
    nameNo: 'Miljoe',
    icon: 'cloud',
    description: 'Weather and nature sounds',
    descriptionNo: 'Vaer og naturlyder',
  },
  {
    id: 'atmosphere',
    name: 'Atmosphere',
    nameNo: 'Atmosfaere',
    icon: 'moon',
    description: 'Mood and tension builders',
    descriptionNo: 'Stemning og spenningsbyggere',
  },
  {
    id: 'production',
    name: 'Production',
    nameNo: 'Produksjon',
    icon: 'film',
    description: 'Film production sounds',
    descriptionNo: 'Filmproduksjonslyder',
  },
  {
    id: 'practical',
    name: 'Practical',
    nameNo: 'Praktisk',
    icon: 'door-open',
    description: 'Everyday object sounds',
    descriptionNo: 'Hverdagslyder',
  },
  {
    id: 'ambience',
    name: 'Ambience',
    nameNo: 'Romtone',
    icon: 'volume-low',
    description: 'Background room tones',
    descriptionNo: 'Bakgrunnslyder',
  },
  {
    id: 'music',
    name: 'Music',
    nameNo: 'Musikk',
    icon: 'music',
    description: 'Background music and scores',
    descriptionNo: 'Bakgrunnsmusikk',
  },
  {
    id: 'ui',
    name: 'UI Sounds',
    nameNo: 'UI-lyder',
    icon: 'cursor-click',
    description: 'Interface feedback sounds',
    descriptionNo: 'Grensesnittlyder',
  },
];

// Helper function to get sounds by category
export function getSoundsByCategory(category: SoundCategory): SoundDefinition[] {
  return SOUND_LIBRARY.filter((sound) => sound.category === category);
}

// Helper function to search sounds
export function searchSounds(query: string): SoundDefinition[] {
  const lowerQuery = query.toLowerCase();
  return SOUND_LIBRARY.filter(
    (sound) =>
      sound.name.toLowerCase().includes(lowerQuery) ||
      sound.nameNo.toLowerCase().includes(lowerQuery) ||
      sound.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      (sound.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

// Helper function to get sounds by mood
export function getSoundsByMood(mood: MoodTag): SoundDefinition[] {
  return SOUND_LIBRARY.filter((sound) => sound.moodTags?.includes(mood));
}

// Get unique subcategories for a category
export function getSubcategories(category: SoundCategory): string[] {
  const sounds = getSoundsByCategory(category);
  return [...new Set(sounds.map((s) => s.subcategory))];
}
