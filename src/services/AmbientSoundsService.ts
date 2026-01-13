/**
 * Ambient Sounds Service
 * Manages environmental audio for 3D scenes
 * Supports layered sounds, spatial audio, and mood-based soundscapes
 */

// ============================================
// Types and Interfaces
// ============================================

export type SoundCategory = 
  | 'urban'
  | 'nature'
  | 'industrial'
  | 'weather'
  | 'interior'
  | 'scifi'
  | 'horror'
  | 'ambient';

export interface AmbientSoundDefinition {
  id: string;
  name: string;
  nameNo: string;
  category: SoundCategory;
  url: string;
  volume: number;
  loop: boolean;
  fadeInTime?: number;
  fadeOutTime?: number;
  tags: string[];
  moodTags: string[];
}

export interface ActiveSound {
  id: string;
  audio: HTMLAudioElement;
  volume: number;
  isPlaying: boolean;
  isFading: boolean;
}

export interface SoundscapeConfig {
  sounds: string[];
  masterVolume: number;
  crossfadeTime: number;
}

// ============================================
// Sound Definitions
// ============================================

export const AMBIENT_SOUNDS: AmbientSoundDefinition[] = [
  // ============================================
  // URBAN SOUNDS
  // ============================================
  {
    id: 'traffic-distant',
    name: 'Distant Traffic',
    nameNo: 'Fjern trafikk',
    category: 'urban',
    url: 'https://freesound.org/data/previews/531/531947_5674468-lq.mp3', // Placeholder - use local files in production
    volume: 0.4,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['traffic', 'city', 'cars', 'background'],
    moodTags: ['urban', 'busy', 'daytime'],
  },
  {
    id: 'traffic-busy',
    name: 'Busy Street Traffic',
    nameNo: 'Travelt gatetrafikk',
    category: 'urban',
    url: '/audio/ambient/traffic-busy.mp3',
    volume: 0.6,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['traffic', 'city', 'cars', 'horns'],
    moodTags: ['urban', 'busy', 'chaotic'],
  },
  {
    id: 'city-ambient',
    name: 'City Ambience',
    nameNo: 'Byambiens',
    category: 'urban',
    url: '/audio/ambient/city-ambient.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['city', 'people', 'distant', 'hum'],
    moodTags: ['urban', 'life', 'background'],
  },
  {
    id: 'metro-train',
    name: 'Metro Train',
    nameNo: 'T-banetog',
    category: 'urban',
    url: '/audio/ambient/metro-train.mp3',
    volume: 0.7,
    loop: false,
    fadeInTime: 1,
    fadeOutTime: 2,
    tags: ['metro', 'subway', 'train', 'underground'],
    moodTags: ['urban', 'transit', 'movement'],
  },
  {
    id: 'metro-ambient',
    name: 'Metro Station Ambience',
    nameNo: 'T-banestasjon ambiens',
    category: 'urban',
    url: '/audio/ambient/metro-ambient.mp3',
    volume: 0.4,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['metro', 'subway', 'echo', 'people'],
    moodTags: ['urban', 'underground', 'transit'],
  },
  {
    id: 'footsteps-echo',
    name: 'Echoing Footsteps',
    nameNo: 'Ekko av skritt',
    category: 'urban',
    url: '/audio/ambient/footsteps-echo.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 1,
    fadeOutTime: 2,
    tags: ['footsteps', 'echo', 'concrete', 'walk'],
    moodTags: ['lonely', 'underground', 'suspense'],
  },
  {
    id: 'car-distant',
    name: 'Distant Car',
    nameNo: 'Fjern bil',
    category: 'urban',
    url: '/audio/ambient/car-distant.mp3',
    volume: 0.3,
    loop: false,
    fadeInTime: 1,
    fadeOutTime: 1,
    tags: ['car', 'vehicle', 'passing'],
    moodTags: ['urban', 'night'],
  },
  {
    id: 'birds-pigeons',
    name: 'City Pigeons',
    nameNo: 'Byduer',
    category: 'urban',
    url: '/audio/ambient/birds-pigeons.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 2,
    tags: ['birds', 'pigeons', 'cooing', 'wings'],
    moodTags: ['urban', 'daytime', 'peaceful'],
  },
  {
    id: 'sirens-distant',
    name: 'Distant Sirens',
    nameNo: 'Fjerne sirener',
    category: 'urban',
    url: '/audio/ambient/sirens-distant.mp3',
    volume: 0.3,
    loop: false,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['sirens', 'police', 'ambulance', 'emergency'],
    moodTags: ['urban', 'tension', 'night'],
  },

  // ============================================
  // INDUSTRIAL SOUNDS
  // ============================================
  {
    id: 'hvac-hum',
    name: 'HVAC System Hum',
    nameNo: 'Ventilasjonssumming',
    category: 'industrial',
    url: '/audio/ambient/hvac-hum.mp3',
    volume: 0.25,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['hvac', 'ventilation', 'hum', 'drone'],
    moodTags: ['industrial', 'interior', 'mechanical'],
  },
  {
    id: 'machinery-distant',
    name: 'Distant Machinery',
    nameNo: 'Fjerne maskiner',
    category: 'industrial',
    url: '/audio/ambient/machinery-distant.mp3',
    volume: 0.35,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['machinery', 'factory', 'mechanical', 'distant'],
    moodTags: ['industrial', 'work', 'manufacturing'],
  },
  {
    id: 'metal-creaks',
    name: 'Metal Creaking',
    nameNo: 'Metallknirk',
    category: 'industrial',
    url: '/audio/ambient/metal-creaks.mp3',
    volume: 0.2,
    loop: true,
    fadeInTime: 1,
    fadeOutTime: 2,
    tags: ['metal', 'creaking', 'stress', 'structure'],
    moodTags: ['abandoned', 'decay', 'tension'],
  },
  {
    id: 'dripping-water',
    name: 'Dripping Water',
    nameNo: 'Druppende vann',
    category: 'industrial',
    url: '/audio/ambient/dripping-water.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 1,
    fadeOutTime: 2,
    tags: ['water', 'dripping', 'leak', 'plumbing'],
    moodTags: ['abandoned', 'decay', 'damp'],
  },
  {
    id: 'fan-small',
    name: 'Small Fan',
    nameNo: 'Liten vifte',
    category: 'industrial',
    url: '/audio/ambient/fan-small.mp3',
    volume: 0.2,
    loop: true,
    tags: ['fan', 'spinning', 'air', 'motor'],
    moodTags: ['industrial', 'interior'],
  },
  {
    id: 'fan-industrial',
    name: 'Industrial Fan',
    nameNo: 'Industrivifte',
    category: 'industrial',
    url: '/audio/ambient/fan-industrial.mp3',
    volume: 0.35,
    loop: true,
    tags: ['fan', 'large', 'industrial', 'wind'],
    moodTags: ['industrial', 'factory', 'ventilation'],
  },
  {
    id: 'fluorescent-buzz',
    name: 'Fluorescent Light Buzz',
    nameNo: 'Lysstoffrør-summing',
    category: 'industrial',
    url: '/audio/ambient/fluorescent-buzz.mp3',
    volume: 0.15,
    loop: true,
    fadeInTime: 1,
    fadeOutTime: 1,
    tags: ['fluorescent', 'electric', 'buzz', 'light'],
    moodTags: ['industrial', 'office', 'institutional'],
  },
  {
    id: 'neon-hum',
    name: 'Neon Sign Hum',
    nameNo: 'Neonskilt-summing',
    category: 'industrial',
    url: '/audio/ambient/neon-hum.mp3',
    volume: 0.15,
    loop: true,
    tags: ['neon', 'electric', 'hum', 'buzz'],
    moodTags: ['urban', 'night', 'neon', 'cyberpunk'],
  },
  {
    id: 'neon-buzz',
    name: 'Neon Buzzing',
    nameNo: 'Neon-summing',
    category: 'industrial',
    url: '/audio/ambient/neon-buzz.mp3',
    volume: 0.2,
    loop: true,
    tags: ['neon', 'electric', 'buzzing', 'flickering'],
    moodTags: ['urban', 'night', 'decay'],
  },

  // ============================================
  // WEATHER SOUNDS
  // ============================================
  {
    id: 'rain-light',
    name: 'Light Rain',
    nameNo: 'Lett regn',
    category: 'weather',
    url: '/audio/ambient/rain-light.mp3',
    volume: 0.4,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['rain', 'light', 'drizzle', 'water'],
    moodTags: ['calm', 'melancholic', 'peaceful'],
  },
  {
    id: 'rain-heavy',
    name: 'Heavy Rain',
    nameNo: 'Kraftig regn',
    category: 'weather',
    url: '/audio/ambient/rain-heavy.mp3',
    volume: 0.6,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['rain', 'heavy', 'storm', 'downpour'],
    moodTags: ['dramatic', 'moody', 'intense'],
  },
  {
    id: 'rain-on-metal',
    name: 'Rain on Metal Roof',
    nameNo: 'Regn på metalltak',
    category: 'weather',
    url: '/audio/ambient/rain-metal.mp3',
    volume: 0.5,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['rain', 'metal', 'roof', 'patter'],
    moodTags: ['industrial', 'cozy', 'interior'],
  },
  {
    id: 'thunder-distant',
    name: 'Distant Thunder',
    nameNo: 'Fjern torden',
    category: 'weather',
    url: '/audio/ambient/thunder-distant.mp3',
    volume: 0.5,
    loop: false,
    tags: ['thunder', 'storm', 'distant', 'rumble'],
    moodTags: ['dramatic', 'tension', 'storm'],
  },
  {
    id: 'wind-urban',
    name: 'Urban Wind',
    nameNo: 'Byvind',
    category: 'weather',
    url: '/audio/ambient/wind-urban.mp3',
    volume: 0.35,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['wind', 'urban', 'buildings', 'gusts'],
    moodTags: ['urban', 'exposed', 'rooftop'],
  },
  {
    id: 'wind-interior',
    name: 'Wind Through Building',
    nameNo: 'Vind gjennom bygning',
    category: 'weather',
    url: '/audio/ambient/wind-interior.mp3',
    volume: 0.25,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['wind', 'howling', 'interior', 'draft'],
    moodTags: ['abandoned', 'eerie', 'decay'],
  },

  // ============================================
  // NATURE SOUNDS
  // ============================================
  {
    id: 'birds-forest',
    name: 'Forest Birds',
    nameNo: 'Skogfugler',
    category: 'nature',
    url: '/audio/ambient/birds-forest.mp3',
    volume: 0.4,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['birds', 'forest', 'singing', 'chirping'],
    moodTags: ['peaceful', 'nature', 'morning'],
  },
  {
    id: 'wind-leaves',
    name: 'Wind in Leaves',
    nameNo: 'Vind i løv',
    category: 'nature',
    url: '/audio/ambient/wind-leaves.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['wind', 'leaves', 'trees', 'rustling'],
    moodTags: ['peaceful', 'nature', 'forest'],
  },
  {
    id: 'creek-gentle',
    name: 'Gentle Creek',
    nameNo: 'Stille bekk',
    category: 'nature',
    url: '/audio/ambient/creek-gentle.mp3',
    volume: 0.35,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['water', 'creek', 'stream', 'flowing'],
    moodTags: ['peaceful', 'nature', 'relaxing'],
  },
  {
    id: 'ocean-deep',
    name: 'Deep Ocean',
    nameNo: 'Dypt hav',
    category: 'nature',
    url: '/audio/ambient/ocean-deep.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['ocean', 'deep', 'underwater', 'pressure'],
    moodTags: ['mysterious', 'vast', 'lovecraft'],
  },
  {
    id: 'water-dripping',
    name: 'Cave Water Drips',
    nameNo: 'Huledrypp',
    category: 'nature',
    url: '/audio/ambient/water-dripping.mp3',
    volume: 0.25,
    loop: true,
    tags: ['water', 'dripping', 'cave', 'echo'],
    moodTags: ['underground', 'damp', 'mysterious'],
  },

  // ============================================
  // INTERIOR / AMBIENT SOUNDS
  // ============================================
  {
    id: 'room-tone',
    name: 'Room Tone',
    nameNo: 'Romtone',
    category: 'interior',
    url: '/audio/ambient/room-tone.mp3',
    volume: 0.1,
    loop: true,
    tags: ['room', 'silence', 'tone', 'air'],
    moodTags: ['neutral', 'interior', 'quiet'],
  },
  {
    id: 'office-ambient',
    name: 'Office Ambience',
    nameNo: 'Kontor ambiens',
    category: 'interior',
    url: '/audio/ambient/office-ambient.mp3',
    volume: 0.25,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['office', 'keyboard', 'people', 'murmur'],
    moodTags: ['work', 'professional', 'busy'],
  },
  {
    id: 'fire-crackling',
    name: 'Crackling Fire',
    nameNo: 'Knitrende ild',
    category: 'interior',
    url: '/audio/ambient/fire-crackling.mp3',
    volume: 0.4,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['fire', 'crackling', 'warm', 'fireplace'],
    moodTags: ['cozy', 'warm', 'comfortable'],
  },
  {
    id: 'arcade-ambient',
    name: 'Arcade Ambience',
    nameNo: 'Arkade ambiens',
    category: 'interior',
    url: '/audio/ambient/arcade-ambient.mp3',
    volume: 0.4,
    loop: true,
    fadeInTime: 2,
    fadeOutTime: 3,
    tags: ['arcade', 'games', 'beeps', 'coins'],
    moodTags: ['retro', 'fun', 'gaming', 'nostalgic'],
  },

  // ============================================
  // SCI-FI / SYNTH SOUNDS
  // ============================================
  {
    id: 'synth-drone',
    name: 'Synth Drone',
    nameNo: 'Synth-drone',
    category: 'scifi',
    url: '/audio/ambient/synth-drone.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 4,
    fadeOutTime: 5,
    tags: ['synth', 'drone', 'electronic', 'ambient'],
    moodTags: ['futuristic', 'cyberpunk', 'atmospheric'],
  },
  {
    id: 'drone-low',
    name: 'Low Frequency Drone',
    nameNo: 'Lavfrekvent drone',
    category: 'scifi',
    url: '/audio/ambient/drone-low.mp3',
    volume: 0.25,
    loop: true,
    fadeInTime: 4,
    fadeOutTime: 5,
    tags: ['drone', 'bass', 'low', 'rumble'],
    moodTags: ['tension', 'cinematic', 'dramatic'],
  },
  {
    id: 'computer-hum',
    name: 'Computer Room Hum',
    nameNo: 'Dataromsumming',
    category: 'scifi',
    url: '/audio/ambient/computer-hum.mp3',
    volume: 0.2,
    loop: true,
    tags: ['computer', 'server', 'electronic', 'hum'],
    moodTags: ['tech', 'futuristic', 'digital'],
  },

  // ============================================
  // HORROR / LOVECRAFT SOUNDS
  // ============================================
  {
    id: 'lovecraft-drone',
    name: 'Cosmic Horror Drone',
    nameNo: 'Kosmisk skrekk-drone',
    category: 'horror',
    url: '/audio/ambient/lovecraft-drone.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 5,
    fadeOutTime: 6,
    tags: ['drone', 'cosmic', 'dark', 'unsettling'],
    moodTags: ['lovecraft', 'horror', 'cosmic', 'dread'],
  },
  {
    id: 'lovecraft-whispers',
    name: 'Eldritch Whispers',
    nameNo: 'Eldgamle hvisker',
    category: 'horror',
    url: '/audio/ambient/lovecraft-whispers.mp3',
    volume: 0.2,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['whispers', 'voices', 'unsettling', 'supernatural'],
    moodTags: ['lovecraft', 'horror', 'madness', 'unsettling'],
  },
  {
    id: 'lovecraft-heartbeat',
    name: 'Cosmic Heartbeat',
    nameNo: 'Kosmisk hjerteslag',
    category: 'horror',
    url: '/audio/ambient/lovecraft-heartbeat.mp3',
    volume: 0.25,
    loop: true,
    tags: ['heartbeat', 'pulse', 'rhythm', 'organic'],
    moodTags: ['lovecraft', 'tension', 'dread', 'alive'],
  },
  {
    id: 'lovecraft-chanting',
    name: 'Cult Chanting',
    nameNo: 'Kultmessing',
    category: 'horror',
    url: '/audio/ambient/lovecraft-chanting.mp3',
    volume: 0.3,
    loop: true,
    fadeInTime: 4,
    fadeOutTime: 5,
    tags: ['chanting', 'cult', 'ritual', 'voices'],
    moodTags: ['lovecraft', 'horror', 'occult', 'ritual'],
  },
  {
    id: 'static-eerie',
    name: 'Eerie Static',
    nameNo: 'Uhyggelig støy',
    category: 'horror',
    url: '/audio/ambient/static-eerie.mp3',
    volume: 0.2,
    loop: true,
    tags: ['static', 'noise', 'electronic', 'interference'],
    moodTags: ['horror', 'unsettling', 'paranormal'],
  },
  {
    id: 'wind-subtle',
    name: 'Subtle Atmospheric Wind',
    nameNo: 'Subtil atmosfærisk vind',
    category: 'ambient',
    url: '/audio/ambient/wind-subtle.mp3',
    volume: 0.15,
    loop: true,
    fadeInTime: 3,
    fadeOutTime: 4,
    tags: ['wind', 'subtle', 'atmospheric', 'ambient'],
    moodTags: ['cinematic', 'atmospheric', 'minimal'],
  },
];

// ============================================
// Sound Effects (One-shots)
// ============================================

export const SOUND_EFFECTS: AmbientSoundDefinition[] = [
  {
    id: 'door-metal',
    name: 'Metal Door',
    nameNo: 'Metalldør',
    category: 'urban',
    url: '/audio/sfx/door-metal.mp3',
    volume: 0.6,
    loop: false,
    tags: ['door', 'metal', 'open', 'close'],
    moodTags: ['industrial', 'urban'],
  },
  {
    id: 'door-wood',
    name: 'Wooden Door',
    nameNo: 'Tredør',
    category: 'interior',
    url: '/audio/sfx/door-wood.mp3',
    volume: 0.5,
    loop: false,
    tags: ['door', 'wood', 'creak'],
    moodTags: ['interior', 'home'],
  },
  {
    id: 'door-glass',
    name: 'Glass Door',
    nameNo: 'Glassdør',
    category: 'interior',
    url: '/audio/sfx/door-glass.mp3',
    volume: 0.4,
    loop: false,
    tags: ['door', 'glass', 'swing'],
    moodTags: ['modern', 'office'],
  },
  {
    id: 'door-heavy',
    name: 'Heavy Door',
    nameNo: 'Tung dør',
    category: 'industrial',
    url: '/audio/sfx/door-heavy.mp3',
    volume: 0.7,
    loop: false,
    tags: ['door', 'heavy', 'slam', 'metal'],
    moodTags: ['industrial', 'dramatic'],
  },
  {
    id: 'switch-click',
    name: 'Light Switch Click',
    nameNo: 'Lysbryter klikk',
    category: 'interior',
    url: '/audio/sfx/switch-click.mp3',
    volume: 0.4,
    loop: false,
    tags: ['switch', 'click', 'light', 'electric'],
    moodTags: ['interior', 'utility'],
  },
  {
    id: 'switch-heavy',
    name: 'Heavy Switch',
    nameNo: 'Tung bryter',
    category: 'industrial',
    url: '/audio/sfx/switch-heavy.mp3',
    volume: 0.5,
    loop: false,
    tags: ['switch', 'heavy', 'industrial', 'clunk'],
    moodTags: ['industrial', 'power'],
  },
];

// ============================================
// Ambient Sounds Service Class
// ============================================

class AmbientSoundsService {
  private activeSounds: Map<string, ActiveSound> = new Map();
  private masterVolume: number = 1.0;
  private currentSoundscape: string[] = [];
  private audioContext: AudioContext | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for sound playback requests
    window.addEventListener('play-sound', ((event: CustomEvent) => {
      const { id, volume } = event.detail;
      this.playSound(id, volume);
    }) as EventListener);

    // Listen for sound stop requests
    window.addEventListener('stop-sound', ((event: CustomEvent) => {
      const { id } = event.detail;
      this.stopSound(id);
    }) as EventListener);

    // Listen for soundscape changes
    window.addEventListener('set-soundscape', ((event: CustomEvent) => {
      const { sounds, crossfade } = event.detail;
      this.setSoundscape(sounds, crossfade);
    }) as EventListener);

    // Listen for master volume changes
    window.addEventListener('set-ambient-volume', ((event: CustomEvent) => {
      const { volume } = event.detail;
      this.setMasterVolume(volume);
    }) as EventListener);
  }

  // Initialize audio context (must be called after user interaction)
  initialize(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[AmbientSounds] Service initialized');
    }
  }

  // Play a sound by ID
  playSound(soundId: string, volumeOverride?: number): void {
    // Find sound definition
    let soundDef = AMBIENT_SOUNDS.find(s => s.id === soundId);
    if (!soundDef) {
      soundDef = SOUND_EFFECTS.find(s => s.id === soundId);
    }

    if (!soundDef) {
      console.warn(`[AmbientSounds] Sound not found: ${soundId}`);
      return;
    }

    // Check if already playing
    if (this.activeSounds.has(soundId)) {
      console.log(`[AmbientSounds] Sound already playing: ${soundId}`);
      return;
    }

    // Create audio element
    const audio = new Audio(soundDef.url);
    audio.loop = soundDef.loop;
    audio.volume = 0; // Start at 0 for fade-in

    const targetVolume = (volumeOverride ?? soundDef.volume) * this.masterVolume;

    const activeSound: ActiveSound = {
      id: soundId,
      audio,
      volume: targetVolume,
      isPlaying: false,
      isFading: false,
    };

    this.activeSounds.set(soundId, activeSound);

    // Play with fade-in
    audio.play()
      .then(() => {
        activeSound.isPlaying = true;
        this.fadeIn(soundId, soundDef!.fadeInTime ?? 1);
        console.log(`[AmbientSounds] Playing: ${soundDef!.name}`);
      })
      .catch(error => {
        console.error(`[AmbientSounds] Error playing ${soundId}:`, error);
        this.activeSounds.delete(soundId);
      });

    // Handle non-looping sounds
    if (!soundDef.loop) {
      audio.addEventListener('ended', () => {
        this.activeSounds.delete(soundId);
      });
    }
  }

  // Stop a sound by ID
  stopSound(soundId: string, fadeOut: boolean = true): void {
    const activeSound = this.activeSounds.get(soundId);
    if (!activeSound) return;

    const soundDef = AMBIENT_SOUNDS.find(s => s.id === soundId) || SOUND_EFFECTS.find(s => s.id === soundId);

    if (fadeOut && soundDef?.fadeOutTime) {
      this.fadeOut(soundId, soundDef.fadeOutTime);
    } else {
      activeSound.audio.pause();
      activeSound.audio.currentTime = 0;
      this.activeSounds.delete(soundId);
      console.log(`[AmbientSounds] Stopped: ${soundId}`);
    }
  }

  // Fade in a sound
  private fadeIn(soundId: string, duration: number): void {
    const activeSound = this.activeSounds.get(soundId);
    if (!activeSound) return;

    activeSound.isFading = true;
    const startVolume = 0;
    const targetVolume = activeSound.volume;
    const startTime = performance.now();

    const fade = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      activeSound.audio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        activeSound.isFading = false;
      }
    };

    requestAnimationFrame(fade);
  }

  // Fade out a sound
  private fadeOut(soundId: string, duration: number): void {
    const activeSound = this.activeSounds.get(soundId);
    if (!activeSound) return;

    activeSound.isFading = true;
    const startVolume = activeSound.audio.volume;
    const startTime = performance.now();

    const fade = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      activeSound.audio.volume = startVolume * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        activeSound.audio.pause();
        activeSound.audio.currentTime = 0;
        this.activeSounds.delete(soundId);
        console.log(`[AmbientSounds] Faded out: ${soundId}`);
      }
    };

    requestAnimationFrame(fade);
  }

  // Set a complete soundscape (multiple sounds)
  setSoundscape(soundIds: string[], crossfadeTime: number = 2): void {
    // Stop sounds not in new soundscape
    const soundsToStop = this.currentSoundscape.filter(id => !soundIds.includes(id));
    soundsToStop.forEach(id => this.stopSound(id, true));

    // Start new sounds
    const soundsToStart = soundIds.filter(id => !this.currentSoundscape.includes(id));
    soundsToStart.forEach(id => this.playSound(id));

    this.currentSoundscape = [...soundIds];

    // Emit event
    window.dispatchEvent(new CustomEvent('soundscape-changed', {
      detail: { sounds: soundIds }
    }));

    console.log(`[AmbientSounds] Soundscape set:`, soundIds);
  }

  // Load soundscape from environment preset
  loadEnvironmentSounds(ambientSounds: string[]): void {
    this.setSoundscape(ambientSounds, 3);
  }

  // Set master volume
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update all active sounds
    this.activeSounds.forEach((activeSound) => {
      const soundDef = AMBIENT_SOUNDS.find(s => s.id === activeSound.id);
      if (soundDef && !activeSound.isFading) {
        activeSound.audio.volume = soundDef.volume * this.masterVolume;
        activeSound.volume = soundDef.volume * this.masterVolume;
      }
    });

    console.log(`[AmbientSounds] Master volume set to ${(this.masterVolume * 100).toFixed(0)}%`);
  }

  // Get master volume
  getMasterVolume(): number {
    return this.masterVolume;
  }

  // Stop all sounds
  stopAllSounds(fadeOut: boolean = true): void {
    this.activeSounds.forEach((_, id) => {
      this.stopSound(id, fadeOut);
    });
    this.currentSoundscape = [];
    console.log('[AmbientSounds] All sounds stopped');
  }

  // Get currently playing sounds
  getActiveSounds(): string[] {
    return Array.from(this.activeSounds.keys());
  }

  // Get current soundscape
  getCurrentSoundscape(): string[] {
    return [...this.currentSoundscape];
  }

  // Get available sounds by category
  getSoundsByCategory(category: SoundCategory): AmbientSoundDefinition[] {
    return AMBIENT_SOUNDS.filter(s => s.category === category);
  }

  // Get available sounds by mood tag
  getSoundsByMood(mood: string): AmbientSoundDefinition[] {
    return AMBIENT_SOUNDS.filter(s => s.moodTags.includes(mood));
  }

  // Get all sound definitions
  getAllSounds(): AmbientSoundDefinition[] {
    return [...AMBIENT_SOUNDS];
  }

  // Get all sound effect definitions
  getAllSoundEffects(): AmbientSoundDefinition[] {
    return [...SOUND_EFFECTS];
  }

  // Cleanup
  dispose(): void {
    this.stopAllSounds(false);
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('[AmbientSounds] Service disposed');
  }
}

// Export singleton instance
export const ambientSoundsService = new AmbientSoundsService();

// Export for use
export default ambientSoundsService;
