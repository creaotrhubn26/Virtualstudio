/**
 * Spatial Audio Service
 * Professional 3D audio system with positioning, reverb zones, and ambience
 */

import { create } from 'zustand';
import * as BABYLON from '@babylonjs/core';

// Audio source types
export type AudioSourceType = 
  | 'point' 
  | 'ambient' 
  | 'directional' 
  | 'zone';

// Reverb presets
export type ReverbPreset = 
  | 'none'
  | 'room'
  | 'hall'
  | 'cathedral'
  | 'cave'
  | 'outdoor'
  | 'underwater'
  | 'custom';

export interface ReverbSettings {
  decay: number;
  earlyReflections: number;
  lateReflections: number;
  density: number;
  diffusion: number;
  highCut: number;
  lowCut: number;
  wetDryMix: number;
}

export interface AudioSource {
  id: string;
  name: string;
  type: AudioSourceType;
  url: string;
  position: BABYLON.Vector3;
  direction?: BABYLON.Vector3;
  
  // Playback
  isPlaying: boolean;
  isLooping: boolean;
  volume: number;
  pitch: number;
  
  // Spatial settings
  minDistance: number;
  maxDistance: number;
  rolloffFactor: number;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterVolume: number;
  
  // Internal audio nodes
  sound?: BABYLON.Sound;
  htmlAudio?: HTMLAudioElement;
  // Web Audio API for spatial 3D sound
  audioBuffer?: AudioBuffer;
  sourceNode?: AudioBufferSourceNode;
  pannerNode?: PannerNode;
  gainNode?: GainNode;
}

export interface AudioZone {
  id: string;
  name: string;
  position: BABYLON.Vector3;
  size: BABYLON.Vector3;
  reverbPreset: ReverbPreset;
  reverbSettings: ReverbSettings;
  ambienceUrl?: string;
  ambienceVolume: number;
  isActive: boolean;
}

export interface AudioListener {
  position: BABYLON.Vector3;
  forward: BABYLON.Vector3;
  up: BABYLON.Vector3;
}

// Reverb preset configurations
export const REVERB_PRESETS: Record<ReverbPreset, ReverbSettings> = {
  none: {
    decay: 0,
    earlyReflections: 0,
    lateReflections: 0,
    density: 0,
    diffusion: 0,
    highCut: 20000,
    lowCut: 20,
    wetDryMix: 0
  },
  room: {
    decay: 0.8,
    earlyReflections: 0.3,
    lateReflections: 0.4,
    density: 0.5,
    diffusion: 0.6,
    highCut: 8000,
    lowCut: 100,
    wetDryMix: 0.3
  },
  hall: {
    decay: 2.0,
    earlyReflections: 0.4,
    lateReflections: 0.6,
    density: 0.7,
    diffusion: 0.8,
    highCut: 6000,
    lowCut: 80,
    wetDryMix: 0.4
  },
  cathedral: {
    decay: 4.0,
    earlyReflections: 0.5,
    lateReflections: 0.8,
    density: 0.9,
    diffusion: 0.95,
    highCut: 4000,
    lowCut: 60,
    wetDryMix: 0.5
  },
  cave: {
    decay: 3.0,
    earlyReflections: 0.6,
    lateReflections: 0.7,
    density: 0.8,
    diffusion: 0.5,
    highCut: 5000,
    lowCut: 50,
    wetDryMix: 0.6
  },
  outdoor: {
    decay: 0.4,
    earlyReflections: 0.1,
    lateReflections: 0.2,
    density: 0.2,
    diffusion: 0.3,
    highCut: 12000,
    lowCut: 100,
    wetDryMix: 0.15
  },
  underwater: {
    decay: 1.5,
    earlyReflections: 0.2,
    lateReflections: 0.5,
    density: 0.6,
    diffusion: 0.4,
    highCut: 2000,
    lowCut: 200,
    wetDryMix: 0.7
  },
  custom: {
    decay: 1.0,
    earlyReflections: 0.3,
    lateReflections: 0.4,
    density: 0.5,
    diffusion: 0.5,
    highCut: 8000,
    lowCut: 100,
    wetDryMix: 0.3
  }
};

// Ambience presets
export interface AmbiencePreset {
  name: string;
  description: string;
  icon: string;
  category: string;
  layers: Array<{
    url: string;
    volume: number;
    loop: boolean;
  }>;
  reverb: ReverbPreset;
}

export const AMBIENCE_PRESETS: Record<string, AmbiencePreset> = {
  // === STRANGER THINGS STYLE SOUNDSCAPES ===
  'dark-synth': {
    name: 'Dark Synth Pad',
    description: 'Ominous evolving drone with deep bass',
    icon: 'dark_mode',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/dark-synth-pad.wav', volume: 0.5, loop: true }
    ],
    reverb: 'hall'
  },
  'pulsing-bass': {
    name: 'Pulsing Bass',
    description: 'Driving 80s synth bassline',
    icon: 'graphic_eq',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/pulsing-bass.wav', volume: 0.5, loop: true }
    ],
    reverb: 'room'
  },
  'eerie-arpeggio': {
    name: 'Eerie Arpeggio',
    description: 'Haunting minor key synth sequence',
    icon: 'piano',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/eerie-arpeggio.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/dark-synth-pad.wav', volume: 0.2, loop: true }
    ],
    reverb: 'hall'
  },
  'upside-down': {
    name: 'The Upside Down',
    description: 'Otherworldly distorted nightmare realm',
    icon: 'blur_on',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/upside-down.wav', volume: 0.5, loop: true },
      { url: '/audio/ambience/mind-flayer.wav', volume: 0.2, loop: true }
    ],
    reverb: 'cave'
  },
  'tension': {
    name: 'Rising Tension',
    description: 'Building dread and suspense',
    icon: 'trending_up',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/tension-build.wav', volume: 0.5, loop: true }
    ],
    reverb: 'hall'
  },
  'synth-choir': {
    name: 'Synth Choir',
    description: 'Ethereal vocal-like synthesizer',
    icon: 'surround_sound',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/synth-choir.wav', volume: 0.4, loop: true }
    ],
    reverb: 'cathedral'
  },
  'retro-drums': {
    name: '80s Drums',
    description: 'LinnDrum style gated reverb drums',
    icon: 'queue_music',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/retro-drums.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/pulsing-bass.wav', volume: 0.25, loop: true }
    ],
    reverb: 'hall'
  },
  'portal': {
    name: 'Dimensional Portal',
    description: 'Swirling interdimensional rift',
    icon: 'blur_circular',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/portal-rift.wav', volume: 0.5, loop: true }
    ],
    reverb: 'cave'
  },
  'mind-flayer': {
    name: 'Mind Flayer',
    description: 'Massive terrifying presence',
    icon: 'psychology',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/mind-flayer.wav', volume: 0.5, loop: true },
      { url: '/audio/ambience/upside-down.wav', volume: 0.15, loop: true }
    ],
    reverb: 'cave'
  },
  'eleven-power': {
    name: 'Psychic Power',
    description: 'Building telekinetic energy',
    icon: 'bolt',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/eleven-power.wav', volume: 0.5, loop: true }
    ],
    reverb: 'hall'
  },
  'hawkins-lab': {
    name: 'Hawkins Lab',
    description: 'Sterile government facility ambience',
    icon: 'science',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/lab-ambience.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/tension-build.wav', volume: 0.15, loop: true }
    ],
    reverb: 'room'
  },
  'full-stranger': {
    name: 'Full Stranger Things',
    description: 'Complete 80s synth horror experience',
    icon: 'movie',
    category: 'cinematic',
    layers: [
      { url: '/audio/ambience/dark-synth-pad.wav', volume: 0.3, loop: true },
      { url: '/audio/ambience/pulsing-bass.wav', volume: 0.25, loop: true },
      { url: '/audio/ambience/eerie-arpeggio.wav', volume: 0.2, loop: true }
    ],
    reverb: 'hall'
  },
  // === LEGACY PRESETS (mapped to ST sounds) ===
  'forest-day': {
    name: 'Eerie Forest',
    description: 'Something lurks in the woods',
    icon: 'forest',
    category: 'nature',
    layers: [
      { url: '/audio/ambience/eerie-arpeggio.wav', volume: 0.3, loop: true },
      { url: '/audio/ambience/dark-synth-pad.wav', volume: 0.2, loop: true }
    ],
    reverb: 'outdoor'
  },
  'forest-night': {
    name: 'Dark Night',
    description: 'The Upside Down bleeds through',
    icon: 'nightlight',
    category: 'nature',
    layers: [
      { url: '/audio/ambience/tension-build.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/upside-down.wav', volume: 0.15, loop: true }
    ],
    reverb: 'outdoor'
  },
  'rain': {
    name: 'Strange Weather',
    description: 'Interdimensional storm',
    icon: 'water_drop',
    category: 'weather',
    layers: [
      { url: '/audio/ambience/upside-down.wav', volume: 0.5, loop: true },
      { url: '/audio/ambience/portal-rift.wav', volume: 0.2, loop: true }
    ],
    reverb: 'room'
  },
  'thunderstorm': {
    name: 'Mind Flayer Storm',
    description: 'The shadow monster approaches',
    icon: 'thunderstorm',
    category: 'weather',
    layers: [
      { url: '/audio/ambience/mind-flayer.wav', volume: 0.6, loop: true },
      { url: '/audio/ambience/tension-build.wav', volume: 0.3, loop: true }
    ],
    reverb: 'hall'
  },
  'ocean': {
    name: 'Synth Waves',
    description: 'Ethereal synth ocean',
    icon: 'waves',
    category: 'nature',
    layers: [
      { url: '/audio/ambience/synth-choir.wav', volume: 0.5, loop: true }
    ],
    reverb: 'outdoor'
  },
  'city': {
    name: 'Hawkins',
    description: 'Small town with dark secrets',
    icon: 'location_city',
    category: 'urban',
    layers: [
      { url: '/audio/ambience/lab-ambience.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/retro-drums.wav', volume: 0.2, loop: true }
    ],
    reverb: 'outdoor'
  },
  'cafe': {
    name: 'Benny\'s Diner',
    description: 'Where it all began',
    icon: 'local_cafe',
    category: 'indoor',
    layers: [
      { url: '/audio/ambience/pulsing-bass.wav', volume: 0.2, loop: true },
      { url: '/audio/ambience/dark-synth-pad.wav', volume: 0.15, loop: true }
    ],
    reverb: 'room'
  },
  'office': {
    name: 'Government Facility',
    description: 'Something classified',
    icon: 'business',
    category: 'indoor',
    layers: [
      { url: '/audio/ambience/lab-ambience.wav', volume: 0.3, loop: true },
      { url: '/audio/ambience/tension-build.wav', volume: 0.15, loop: true }
    ],
    reverb: 'room'
  },
  'spaceship': {
    name: 'Psychic Realm',
    description: 'Inside Eleven\'s mind',
    icon: 'rocket',
    category: 'scifi',
    layers: [
      { url: '/audio/ambience/eleven-power.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/synth-choir.wav', volume: 0.2, loop: true }
    ],
    reverb: 'room'
  },
  'dungeon': {
    name: 'The Gate',
    description: 'Portal to the Upside Down',
    icon: 'castle',
    category: 'fantasy',
    layers: [
      { url: '/audio/ambience/portal-rift.wav', volume: 0.4, loop: true },
      { url: '/audio/ambience/upside-down.wav', volume: 0.3, loop: true }
    ],
    reverb: 'cave'
  }
};

interface SpatialAudioStore {
  // State
  scene: BABYLON.Scene | null;
  audioContext: AudioContext | null;
  sources: AudioSource[];
  zones: AudioZone[];
  selectedSource: string | null;
  selectedZone: string | null;
  
  // Global settings
  masterVolume: number;
  globalReverb: ReverbPreset;
  globalReverbSettings: ReverbSettings;
  isEnabled: boolean;
  
  // Listener
  listener: AudioListener;
  
  // Initialize
  initialize: (scene: BABYLON.Scene) => void;
  dispose: () => void;
  
  // Source management
  addSource: (config: Partial<AudioSource> & { url: string; name: string }) => string;
  removeSource: (id: string) => void;
  updateSource: (id: string, updates: Partial<AudioSource>) => void;
  selectSource: (id: string | null) => void;
  
  // Source playback
  playSource: (id: string) => void;
  stopSource: (id: string) => void;
  pauseSource: (id: string) => void;
  playAll: () => void;
  stopAll: () => void;
  
  // Zone management
  addZone: (config: Partial<AudioZone> & { name: string }) => string;
  removeZone: (id: string) => void;
  updateZone: (id: string, updates: Partial<AudioZone>) => void;
  selectZone: (id: string | null) => void;
  
  // Global controls
  setMasterVolume: (volume: number) => void;
  setGlobalReverb: (preset: ReverbPreset) => void;
  setEnabled: (enabled: boolean) => void;
  
  // Ambience
  loadAmbiencePreset: (presetKey: string) => void;
  
  // Listener
  updateListener: (listener: Partial<AudioListener>) => void;
  syncListenerToCamera: (camera: BABYLON.Camera) => void;
  
  // Utility
  getSourceById: (id: string) => AudioSource | undefined;
  getZoneById: (id: string) => AudioZone | undefined;
}

export const useSpatialAudioStore = create<SpatialAudioStore>((set, get) => ({
  scene: null,
  audioContext: null,
  sources: [],
  zones: [],
  selectedSource: null,
  selectedZone: null,
  masterVolume: 1.0,
  globalReverb: 'room',
  globalReverbSettings: { ...REVERB_PRESETS.room },
  isEnabled: true,
  listener: {
    position: new BABYLON.Vector3(0, 1.6, 0),
    forward: new BABYLON.Vector3(0, 0, 1),
    up: new BABYLON.Vector3(0, 1, 0)
  },
  
  initialize: (scene) => {
    console.log('[SpatialAudio] Initializing...');
    
    // Enable audio in Babylon.js
    const engine = BABYLON.Engine.audioEngine;
    let audioContext: AudioContext | null = null;
    
    if (engine) {
      engine.unlock();
      
      // Use Babylon's audio context if available
      audioContext = engine.audioContext as AudioContext;
      
      // Also try to unlock on user interaction
      if (!engine.unlocked) {
        const unlockAudio = () => {
          engine.unlock();
          if (engine.audioContext && engine.audioContext.state === 'suspended') {
            engine.audioContext.resume();
          }
          console.log('[SpatialAudio] Audio engine unlocked by user interaction');
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
      }
    }
    
    // Create Web Audio context if Babylon doesn't have one
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext && audioContext.state === 'suspended') {
      const resumeContext = () => {
        audioContext?.resume().then(() => {
          console.log('[SpatialAudio] Audio context resumed');
        });
        document.removeEventListener('click', resumeContext);
        document.removeEventListener('touchstart', resumeContext);
        document.removeEventListener('keydown', resumeContext);
      };
      document.addEventListener('click', resumeContext);
      document.addEventListener('touchstart', resumeContext);
      document.addEventListener('keydown', resumeContext);
    }
    
    set({ scene, audioContext });
    console.log('[SpatialAudio] Initialized with scene:', scene.uid, 'AudioContext state:', audioContext?.state);
  },
  
  dispose: () => {
    const { sources, audioContext } = get();
    
    // Stop and dispose all sounds
    sources.forEach(source => {
      if (source.sound) {
        source.sound.stop();
        source.sound.dispose();
      }
    });
    
    // Close audio context
    if (audioContext) {
      audioContext.close();
    }
    
    set({
      scene: null,
      audioContext: null,
      sources: [],
      zones: [],
      selectedSource: null,
      selectedZone: null
    });
  },
  
  addSource: (config) => {
    const { scene, sources } = get();
    if (!scene) return '';
    
    const sourceId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newSource: AudioSource = {
      id: sourceId,
      name: config.name,
      type: config.type || 'point',
      url: config.url,
      position: config.position || new BABYLON.Vector3(0, 0, 0),
      direction: config.direction,
      isPlaying: false,
      isLooping: config.isLooping ?? true,
      volume: config.volume ?? 1.0,
      pitch: config.pitch ?? 1.0,
      minDistance: config.minDistance ?? 1,
      maxDistance: config.maxDistance ?? 100,
      rolloffFactor: config.rolloffFactor ?? 1,
      coneInnerAngle: config.coneInnerAngle ?? 360,
      coneOuterAngle: config.coneOuterAngle ?? 360,
      coneOuterVolume: config.coneOuterVolume ?? 0
    };
    
    const { audioContext } = get();
    const isSpatial = newSource.type === 'point' || newSource.type === 'directional';
    
    if (isSpatial && audioContext) {
      // Use Web Audio API with PannerNode for true 3D spatial audio
      fetch(newSource.url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          newSource.audioBuffer = audioBuffer;
          
          // Create gain node for volume control
          const gainNode = audioContext.createGain();
          gainNode.gain.value = newSource.volume;
          newSource.gainNode = gainNode;
          
          // Create panner node for 3D positioning
          const pannerNode = audioContext.createPanner();
          pannerNode.panningModel = 'HRTF'; // Head-related transfer function for realistic 3D
          pannerNode.distanceModel = 'linear';
          pannerNode.refDistance = newSource.minDistance;
          pannerNode.maxDistance = newSource.maxDistance;
          pannerNode.rolloffFactor = newSource.rolloffFactor;
          pannerNode.coneInnerAngle = newSource.coneInnerAngle;
          pannerNode.coneOuterAngle = newSource.coneOuterAngle;
          pannerNode.coneOuterGain = newSource.coneOuterVolume;
          
          // Set initial position
          pannerNode.positionX.value = newSource.position.x;
          pannerNode.positionY.value = newSource.position.y;
          pannerNode.positionZ.value = newSource.position.z;
          
          newSource.pannerNode = pannerNode;
          
          // Connect: source -> panner -> gain -> destination
          gainNode.connect(audioContext.destination);
          pannerNode.connect(gainNode);
          
          console.log('[SpatialAudio] Web Audio 3D source created:', newSource.name, 'at position:', newSource.position);
        })
        .catch(error => {
          console.error('[SpatialAudio] Error loading spatial audio:', newSource.name, error);
        });
    } else {
      // Use HTML5 Audio for ambient/non-spatial sounds
      const audio = new Audio(newSource.url);
      audio.loop = newSource.isLooping;
      audio.volume = newSource.volume;
      audio.preload = 'auto';
      newSource.htmlAudio = audio;
      console.log('[SpatialAudio] Created HTML5 Audio for:', newSource.name);
    }
    
    set({
      sources: [...sources, newSource],
      selectedSource: sourceId
    });
    
    return sourceId;
  },
  
  removeSource: (id) => {
    const { sources, selectedSource } = get();
    const source = sources.find(s => s.id === id);
    
    if (source?.sound) {
      source.sound.stop();
      source.sound.dispose();
    }
    if (source?.htmlAudio) {
      source.htmlAudio.pause();
      source.htmlAudio.src = '';
    }
    if (source?.sourceNode) {
      try {
        source.sourceNode.stop();
        source.sourceNode.disconnect();
      } catch (e) { /* ignore */ }
    }
    if (source?.pannerNode) {
      source.pannerNode.disconnect();
    }
    if (source?.gainNode) {
      source.gainNode.disconnect();
    }
    
    set({
      sources: sources.filter(s => s.id !== id),
      selectedSource: selectedSource === id ? null : selectedSource
    });
  },
  
  updateSource: (id, updates) => {
    const { sources, masterVolume } = get();
    const source = sources.find(s => s.id === id);
    
    if (source) {
      // Apply updates to Web Audio API nodes (spatial 3D)
      if (source.gainNode && updates.volume !== undefined) {
        source.gainNode.gain.value = updates.volume * masterVolume;
      }
      if (source.pannerNode && updates.position !== undefined) {
        source.pannerNode.positionX.value = updates.position.x;
        source.pannerNode.positionY.value = updates.position.y;
        source.pannerNode.positionZ.value = updates.position.z;
      }
      
      // Apply updates to HTML5 Audio (ambient)
      if (source.htmlAudio) {
        if (updates.volume !== undefined) {
          source.htmlAudio.volume = updates.volume * masterVolume;
        }
        if (updates.isLooping !== undefined) {
          source.htmlAudio.loop = updates.isLooping;
        }
        if (updates.pitch !== undefined) {
          source.htmlAudio.playbackRate = updates.pitch;
        }
      }
      
      set({
        sources: sources.map(s =>
          s.id === id ? { ...s, ...updates } : s
        )
      });
    }
  },
  
  selectSource: (id) => {
    set({ selectedSource: id });
  },
  
  playSource: (id) => {
    const { sources, isEnabled, masterVolume, audioContext } = get();
    const source = sources.find(s => s.id === id);
    
    if (!isEnabled) {
      console.warn('[SpatialAudio] Audio is disabled');
      return;
    }
    
    if (!source) {
      console.warn('[SpatialAudio] Source not found:', id);
      return;
    }
    
    const finalVolume = Math.max(0.1, source.volume * masterVolume);
    
    const FADE_TIME = 0.5; // Fade duration in seconds
    
    // Play HTML5 Audio (for ambient sounds) with fade in
    if (source.htmlAudio) {
      source.htmlAudio.volume = 0;
      source.htmlAudio.play()
        .then(() => {
          // Fade in
          const fadeIn = () => {
            if (source.htmlAudio && source.htmlAudio.volume < finalVolume) {
              source.htmlAudio.volume = Math.min(source.htmlAudio.volume + (finalVolume / (FADE_TIME * 20)), finalVolume);
              setTimeout(fadeIn, 50);
            }
          };
          fadeIn();
          console.log('[SpatialAudio] HTML5 Audio playing with fade:', source.name);
        })
        .catch(err => console.error('[SpatialAudio] HTML5 Audio error:', err));
    }
    
    // Play Web Audio API spatial 3D sound with fade in
    if (source.audioBuffer && audioContext && source.pannerNode && source.gainNode) {
      // Stop existing source node if playing
      if (source.sourceNode) {
        try {
          source.sourceNode.stop();
          source.sourceNode.disconnect();
        } catch (e) { /* ignore */ }
      }
      
      // Create new source node (they can only be played once)
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = source.audioBuffer;
      sourceNode.loop = source.isLooping;
      sourceNode.playbackRate.value = source.pitch;
      
      // Connect: source -> panner -> gain -> destination
      sourceNode.connect(source.pannerNode);
      
      // Fade in using Web Audio API's built-in scheduling
      source.gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      source.gainNode.gain.linearRampToValueAtTime(finalVolume, audioContext.currentTime + FADE_TIME);
      
      // Update source reference
      source.sourceNode = sourceNode;
      
      // Start playback
      sourceNode.start(0);
      console.log('[SpatialAudio] Web Audio 3D playing with fade:', source.name, 'at position:', source.position);
      
      // Handle loop end
      sourceNode.onended = () => {
        if (!source.isLooping) {
          set({
            sources: get().sources.map(s =>
              s.id === id ? { ...s, isPlaying: false } : s
            )
          });
        }
      };
    }
    
    set({
      sources: sources.map(s =>
        s.id === id ? { ...s, isPlaying: true } : s
      )
    });
  },
  
  stopSource: (id) => {
    const { sources, audioContext } = get();
    const source = sources.find(s => s.id === id);
    const FADE_TIME = 0.3; // Faster fade out
    
    if (source?.htmlAudio) {
      // Fade out HTML5 Audio
      const currentVolume = source.htmlAudio.volume;
      const fadeOut = () => {
        if (source.htmlAudio && source.htmlAudio.volume > 0.01) {
          source.htmlAudio.volume = Math.max(0, source.htmlAudio.volume - (currentVolume / (FADE_TIME * 20)));
          setTimeout(fadeOut, 50);
        } else if (source.htmlAudio) {
          source.htmlAudio.pause();
          source.htmlAudio.currentTime = 0;
          source.htmlAudio.volume = currentVolume; // Reset volume for next play
        }
      };
      fadeOut();
    }
    
    if (source?.sourceNode && source?.gainNode && audioContext) {
      // Fade out Web Audio API
      source.gainNode.gain.setValueAtTime(source.gainNode.gain.value, audioContext.currentTime);
      source.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + FADE_TIME);
      
      // Stop after fade completes
      setTimeout(() => {
        try {
          source.sourceNode?.stop();
        } catch (e) { /* ignore */ }
      }, FADE_TIME * 1000);
    }
    
    set({
      sources: sources.map(s =>
        s.id === id ? { ...s, isPlaying: false } : s
      )
    });
  },
  
  pauseSource: (id) => {
    const { sources, audioContext } = get();
    const source = sources.find(s => s.id === id);
    const FADE_TIME = 0.2;
    
    if (source?.htmlAudio) {
      // Fade out then pause
      const currentVolume = source.htmlAudio.volume;
      const fadeOut = () => {
        if (source.htmlAudio && source.htmlAudio.volume > 0.01) {
          source.htmlAudio.volume = Math.max(0, source.htmlAudio.volume - (currentVolume / (FADE_TIME * 20)));
          setTimeout(fadeOut, 50);
        } else if (source.htmlAudio) {
          source.htmlAudio.pause();
          source.htmlAudio.volume = currentVolume; // Reset for resume
        }
      };
      fadeOut();
    }
    
    // Web Audio API doesn't support pause, fade out and stop
    if (source?.sourceNode && source?.gainNode && audioContext) {
      source.gainNode.gain.setValueAtTime(source.gainNode.gain.value, audioContext.currentTime);
      source.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + FADE_TIME);
      setTimeout(() => {
        try {
          source.sourceNode?.stop();
        } catch (e) { /* ignore */ }
      }, FADE_TIME * 1000);
    }
    
    set({
      sources: sources.map(s =>
        s.id === id ? { ...s, isPlaying: false } : s
      )
    });
  },
  
  playAll: () => {
    const { sources, isEnabled, masterVolume, audioContext } = get();
    
    if (!isEnabled) return;
    
    const FADE_TIME = 0.5;
    
    sources.forEach(source => {
      const finalVolume = Math.max(0.1, source.volume * masterVolume);
      
      // Play HTML5 Audio (ambient) with fade in
      if (source.htmlAudio) {
        source.htmlAudio.volume = 0;
        source.htmlAudio.play()
          .then(() => {
            const fadeIn = () => {
              if (source.htmlAudio && source.htmlAudio.volume < finalVolume) {
                source.htmlAudio.volume = Math.min(source.htmlAudio.volume + (finalVolume / (FADE_TIME * 20)), finalVolume);
                setTimeout(fadeIn, 50);
              }
            };
            fadeIn();
            console.log('[SpatialAudio] Playing HTML5 with fade:', source.name);
          })
          .catch(err => console.error('[SpatialAudio] HTML5 error:', err));
      }
      
      // Play Web Audio API spatial 3D sound with fade in
      if (source.audioBuffer && audioContext && source.pannerNode && source.gainNode) {
        if (source.sourceNode) {
          try {
            source.sourceNode.stop();
            source.sourceNode.disconnect();
          } catch (e) { /* ignore */ }
        }
        
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = source.audioBuffer;
        sourceNode.loop = source.isLooping;
        sourceNode.playbackRate.value = source.pitch;
        sourceNode.connect(source.pannerNode);
        
        // Fade in
        source.gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        source.gainNode.gain.linearRampToValueAtTime(finalVolume, audioContext.currentTime + FADE_TIME);
        
        source.sourceNode = sourceNode;
        sourceNode.start(0);
        console.log('[SpatialAudio] Playing 3D with fade:', source.name);
      }
    });
    
    set({
      sources: sources.map(s => ({ ...s, isPlaying: true }))
    });
  },
  
  stopAll: () => {
    const { sources, audioContext } = get();
    const FADE_TIME = 0.3;
    
    sources.forEach(source => {
      // Fade out HTML5 Audio
      if (source.htmlAudio && source.htmlAudio.volume > 0) {
        const currentVolume = source.htmlAudio.volume;
        const fadeOut = () => {
          if (source.htmlAudio && source.htmlAudio.volume > 0.01) {
            source.htmlAudio.volume = Math.max(0, source.htmlAudio.volume - (currentVolume / (FADE_TIME * 20)));
            setTimeout(fadeOut, 50);
          } else if (source.htmlAudio) {
            source.htmlAudio.pause();
            source.htmlAudio.currentTime = 0;
            source.htmlAudio.volume = currentVolume;
          }
        };
        fadeOut();
      }
      
      // Fade out Web Audio API
      if (source.sourceNode && source.gainNode && audioContext) {
        source.gainNode.gain.setValueAtTime(source.gainNode.gain.value, audioContext.currentTime);
        source.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + FADE_TIME);
        setTimeout(() => {
          try {
            source.sourceNode?.stop();
          } catch (e) { /* ignore */ }
        }, FADE_TIME * 1000);
      }
    });
    
    set({
      sources: sources.map(s => ({ ...s, isPlaying: false }))
    });
  },
  
  addZone: (config) => {
    const { zones } = get();
    
    const zoneId = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newZone: AudioZone = {
      id: zoneId,
      name: config.name,
      position: config.position || new BABYLON.Vector3(0, 0, 0),
      size: config.size || new BABYLON.Vector3(10, 5, 10),
      reverbPreset: config.reverbPreset || 'room',
      reverbSettings: config.reverbSettings || { ...REVERB_PRESETS.room },
      ambienceUrl: config.ambienceUrl,
      ambienceVolume: config.ambienceVolume ?? 0.5,
      isActive: config.isActive ?? true
    };
    
    set({
      zones: [...zones, newZone],
      selectedZone: zoneId
    });
    
    return zoneId;
  },
  
  removeZone: (id) => {
    const { zones, selectedZone } = get();
    
    set({
      zones: zones.filter(z => z.id !== id),
      selectedZone: selectedZone === id ? null : selectedZone
    });
  },
  
  updateZone: (id, updates) => {
    const { zones } = get();
    
    set({
      zones: zones.map(z =>
        z.id === id ? { ...z, ...updates } : z
      )
    });
  },
  
  selectZone: (id) => {
    set({ selectedZone: id });
  },
  
  setMasterVolume: (volume) => {
    const { sources } = get();
    
    // Update all playing sounds
    sources.forEach(source => {
      const finalVolume = source.volume * volume;
      if (source.htmlAudio) {
        source.htmlAudio.volume = finalVolume;
      }
      if (source.gainNode) {
        source.gainNode.gain.value = finalVolume;
      }
    });
    
    set({ masterVolume: volume });
  },
  
  setGlobalReverb: (preset) => {
    set({
      globalReverb: preset,
      globalReverbSettings: { ...REVERB_PRESETS[preset] }
    });
  },
  
  setEnabled: (enabled) => {
    const { sources } = get();
    
    if (!enabled) {
      sources.forEach(source => {
        if (source.htmlAudio && source.isPlaying) {
          source.htmlAudio.pause();
        }
        if (source.sourceNode && source.isPlaying) {
          try {
            source.sourceNode.stop();
          } catch (e) { /* ignore */ }
        }
      });
    }
    
    set({ isEnabled: enabled });
  },
  
  loadAmbiencePreset: (presetKey) => {
    const { scene } = get();
    if (!scene) return;
    
    const preset = AMBIENCE_PRESETS[presetKey];
    if (!preset) return;
    
    // Set global reverb
    get().setGlobalReverb(preset.reverb);
    
    // Load ambience layers as sources
    preset.layers.forEach((layer, index) => {
      get().addSource({
        name: `${preset.name} Layer ${index + 1}`,
        url: layer.url,
        type: 'ambient',
        volume: layer.volume,
        isLooping: layer.loop
      });
    });
  },
  
  updateListener: (updates) => {
    set(state => ({
      listener: { ...state.listener, ...updates }
    }));
  },
  
  syncListenerToCamera: (camera) => {
    const { scene, audioContext } = get();
    if (!scene) return;
    
    // Update listener position based on camera
    const position = camera.position.clone();
    const forward = camera.getForwardRay().direction;
    const up = camera.upVector;
    
    // Update Web Audio API listener for 3D spatial audio
    if (audioContext && audioContext.listener) {
      const listener = audioContext.listener;
      
      // Set listener position
      if (listener.positionX) {
        listener.positionX.value = position.x;
        listener.positionY.value = position.y;
        listener.positionZ.value = position.z;
      } else {
        listener.setPosition(position.x, position.y, position.z);
      }
      
      // Set listener orientation (forward and up vectors)
      if (listener.forwardX) {
        listener.forwardX.value = forward.x;
        listener.forwardY.value = forward.y;
        listener.forwardZ.value = forward.z;
        listener.upX.value = up.x;
        listener.upY.value = up.y;
        listener.upZ.value = up.z;
      } else {
        listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
      }
    }
    
    set({
      listener: { position, forward, up }
    });
  },
  
  getSourceById: (id) => {
    return get().sources.find(s => s.id === id);
  },
  
  getZoneById: (id) => {
    return get().zones.find(z => z.id === id);
  }
}));

export default useSpatialAudioStore;
