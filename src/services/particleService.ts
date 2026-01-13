/**
 * Particle System Service
 * Comprehensive VFX system with presets for fire, smoke, rain, dust, sparks, and more
 */

import { create } from 'zustand';
import * as BABYLON from '@babylonjs/core';

// Particle effect types
export type ParticleEffectType = 
  | 'fire' 
  | 'smoke' 
  | 'rain' 
  | 'snow' 
  | 'dust' 
  | 'sparks' 
  | 'explosion' 
  | 'magic' 
  | 'fog'
  | 'confetti'
  | 'fireflies'
  | 'waterfall'
  | 'steam'
  | 'leaves'
  | 'custom';

export interface ParticlePreset {
  name: string;
  description: string;
  icon: string;
  category: 'natural' | 'fire' | 'weather' | 'magic' | 'environmental';
  config: ParticleConfig;
}

export interface ParticleConfig {
  // Emission
  emitRate: number;
  minLifeTime: number;
  maxLifeTime: number;
  minSize: number;
  maxSize: number;
  minEmitPower: number;
  maxEmitPower: number;
  
  // Direction
  direction1: BABYLON.Vector3;
  direction2: BABYLON.Vector3;
  gravity: BABYLON.Vector3;
  
  // Colors
  color1: BABYLON.Color4;
  color2: BABYLON.Color4;
  colorDead: BABYLON.Color4;
  
  // Animation
  minAngularSpeed: number;
  maxAngularSpeed: number;
  
  // Blend mode
  blendMode: number;
  
  // Texture
  textureUrl: string;
  
  // Emitter shape
  emitterType: 'point' | 'box' | 'sphere' | 'cone' | 'cylinder';
  emitterSize: BABYLON.Vector3;
}

export interface ActiveParticleSystem {
  id: string;
  name: string;
  type: ParticleEffectType;
  system: BABYLON.ParticleSystem | BABYLON.GPUParticleSystem;
  position: BABYLON.Vector3;
  isPlaying: boolean;
  config: ParticleConfig;
}

// Default particle configurations
const DEFAULT_CONFIG: ParticleConfig = {
  emitRate: 100,
  minLifeTime: 0.3,
  maxLifeTime: 1.5,
  minSize: 0.1,
  maxSize: 0.5,
  minEmitPower: 1,
  maxEmitPower: 3,
  direction1: new BABYLON.Vector3(-1, 8, -1),
  direction2: new BABYLON.Vector3(1, 8, 1),
  gravity: new BABYLON.Vector3(0, -9.81, 0),
  color1: new BABYLON.Color4(1, 0.5, 0, 1),
  color2: new BABYLON.Color4(1, 0, 0, 1),
  colorDead: new BABYLON.Color4(0, 0, 0, 0),
  minAngularSpeed: 0,
  maxAngularSpeed: Math.PI,
  blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
  textureUrl: '/textures/flare.png',
  emitterType: 'point',
  emitterSize: new BABYLON.Vector3(0.5, 0.5, 0.5)
};

// Particle presets
export const PARTICLE_PRESETS: Record<ParticleEffectType, ParticlePreset> = {
  fire: {
    name: 'Fire',
    description: 'Realistic fire with flames and embers',
    icon: 'local_fire_department',
    category: 'fire',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 150,
      minLifeTime: 0.2,
      maxLifeTime: 0.8,
      minSize: 0.2,
      maxSize: 0.8,
      minEmitPower: 1,
      maxEmitPower: 2,
      direction1: new BABYLON.Vector3(-0.5, 3, -0.5),
      direction2: new BABYLON.Vector3(0.5, 5, 0.5),
      gravity: new BABYLON.Vector3(0, 0, 0),
      color1: new BABYLON.Color4(1, 0.8, 0, 1),
      color2: new BABYLON.Color4(1, 0.2, 0, 1),
      colorDead: new BABYLON.Color4(0.2, 0, 0, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
      textureUrl: '/textures/particles/fire.png',
      emitterType: 'cone',
      emitterSize: new BABYLON.Vector3(0.3, 0.1, 0.3)
    }
  },
  smoke: {
    name: 'Smoke',
    description: 'Billowing smoke clouds',
    icon: 'cloud',
    category: 'fire',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 50,
      minLifeTime: 2,
      maxLifeTime: 5,
      minSize: 0.5,
      maxSize: 2,
      minEmitPower: 0.5,
      maxEmitPower: 1.5,
      direction1: new BABYLON.Vector3(-0.5, 2, -0.5),
      direction2: new BABYLON.Vector3(0.5, 4, 0.5),
      gravity: new BABYLON.Vector3(0, 0.5, 0),
      color1: new BABYLON.Color4(0.4, 0.4, 0.4, 0.8),
      color2: new BABYLON.Color4(0.2, 0.2, 0.2, 0.5),
      colorDead: new BABYLON.Color4(0.1, 0.1, 0.1, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/smoke.png',
      emitterType: 'sphere',
      emitterSize: new BABYLON.Vector3(0.3, 0.3, 0.3)
    }
  },
  rain: {
    name: 'Rain',
    description: 'Falling raindrops',
    icon: 'water_drop',
    category: 'weather',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 500,
      minLifeTime: 0.5,
      maxLifeTime: 1,
      minSize: 0.02,
      maxSize: 0.05,
      minEmitPower: 10,
      maxEmitPower: 15,
      direction1: new BABYLON.Vector3(-0.1, -1, -0.1),
      direction2: new BABYLON.Vector3(0.1, -1, 0.1),
      gravity: new BABYLON.Vector3(0, -20, 0),
      color1: new BABYLON.Color4(0.6, 0.7, 0.9, 0.8),
      color2: new BABYLON.Color4(0.4, 0.5, 0.7, 0.6),
      colorDead: new BABYLON.Color4(0.3, 0.4, 0.5, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/raindrop.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(20, 0.1, 20)
    }
  },
  snow: {
    name: 'Snow',
    description: 'Gentle falling snowflakes',
    icon: 'ac_unit',
    category: 'weather',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 200,
      minLifeTime: 3,
      maxLifeTime: 6,
      minSize: 0.05,
      maxSize: 0.15,
      minEmitPower: 0.5,
      maxEmitPower: 1,
      direction1: new BABYLON.Vector3(-0.5, -1, -0.5),
      direction2: new BABYLON.Vector3(0.5, -1, 0.5),
      gravity: new BABYLON.Vector3(0, -1, 0),
      color1: new BABYLON.Color4(1, 1, 1, 1),
      color2: new BABYLON.Color4(0.9, 0.95, 1, 0.9),
      colorDead: new BABYLON.Color4(1, 1, 1, 0),
      minAngularSpeed: -Math.PI / 4,
      maxAngularSpeed: Math.PI / 4,
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/snowflake.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(20, 0.1, 20)
    }
  },
  dust: {
    name: 'Dust',
    description: 'Floating dust particles',
    icon: 'grain',
    category: 'environmental',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 30,
      minLifeTime: 5,
      maxLifeTime: 10,
      minSize: 0.02,
      maxSize: 0.08,
      minEmitPower: 0.1,
      maxEmitPower: 0.3,
      direction1: new BABYLON.Vector3(-1, -0.5, -1),
      direction2: new BABYLON.Vector3(1, 0.5, 1),
      gravity: new BABYLON.Vector3(0, 0.05, 0),
      color1: new BABYLON.Color4(0.8, 0.7, 0.5, 0.3),
      color2: new BABYLON.Color4(0.6, 0.5, 0.4, 0.2),
      colorDead: new BABYLON.Color4(0.5, 0.4, 0.3, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/dust.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(10, 5, 10)
    }
  },
  sparks: {
    name: 'Sparks',
    description: 'Bright flying sparks',
    icon: 'bolt',
    category: 'fire',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 80,
      minLifeTime: 0.3,
      maxLifeTime: 0.8,
      minSize: 0.02,
      maxSize: 0.08,
      minEmitPower: 5,
      maxEmitPower: 10,
      direction1: new BABYLON.Vector3(-3, 5, -3),
      direction2: new BABYLON.Vector3(3, 10, 3),
      gravity: new BABYLON.Vector3(0, -5, 0),
      color1: new BABYLON.Color4(1, 0.9, 0.3, 1),
      color2: new BABYLON.Color4(1, 0.5, 0, 1),
      colorDead: new BABYLON.Color4(1, 0.2, 0, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
      textureUrl: '/textures/particles/spark.png',
      emitterType: 'point',
      emitterSize: new BABYLON.Vector3(0.1, 0.1, 0.1)
    }
  },
  explosion: {
    name: 'Explosion',
    description: 'Explosive burst effect',
    icon: 'flash_on',
    category: 'fire',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 1000,
      minLifeTime: 0.3,
      maxLifeTime: 1,
      minSize: 0.3,
      maxSize: 1.5,
      minEmitPower: 10,
      maxEmitPower: 20,
      direction1: new BABYLON.Vector3(-1, -1, -1),
      direction2: new BABYLON.Vector3(1, 1, 1),
      gravity: new BABYLON.Vector3(0, -5, 0),
      color1: new BABYLON.Color4(1, 0.8, 0.2, 1),
      color2: new BABYLON.Color4(1, 0.3, 0, 1),
      colorDead: new BABYLON.Color4(0.3, 0.1, 0, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
      textureUrl: '/textures/particles/explosion.png',
      emitterType: 'sphere',
      emitterSize: new BABYLON.Vector3(0.5, 0.5, 0.5)
    }
  },
  magic: {
    name: 'Magic',
    description: 'Mystical sparkle effect',
    icon: 'auto_awesome',
    category: 'magic',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 100,
      minLifeTime: 0.5,
      maxLifeTime: 2,
      minSize: 0.05,
      maxSize: 0.2,
      minEmitPower: 1,
      maxEmitPower: 3,
      direction1: new BABYLON.Vector3(-2, 2, -2),
      direction2: new BABYLON.Vector3(2, 5, 2),
      gravity: new BABYLON.Vector3(0, 1, 0),
      color1: new BABYLON.Color4(0.5, 0.2, 1, 1),
      color2: new BABYLON.Color4(0.2, 0.8, 1, 1),
      colorDead: new BABYLON.Color4(1, 0.5, 1, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
      textureUrl: '/textures/particles/star.png',
      emitterType: 'sphere',
      emitterSize: new BABYLON.Vector3(1, 1, 1)
    }
  },
  fog: {
    name: 'Fog',
    description: 'Ground fog/mist effect',
    icon: 'blur_on',
    category: 'environmental',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 20,
      minLifeTime: 8,
      maxLifeTime: 15,
      minSize: 3,
      maxSize: 8,
      minEmitPower: 0.1,
      maxEmitPower: 0.3,
      direction1: new BABYLON.Vector3(-1, 0, -1),
      direction2: new BABYLON.Vector3(1, 0.2, 1),
      gravity: new BABYLON.Vector3(0, 0.02, 0),
      color1: new BABYLON.Color4(0.8, 0.8, 0.9, 0.3),
      color2: new BABYLON.Color4(0.7, 0.7, 0.8, 0.2),
      colorDead: new BABYLON.Color4(0.6, 0.6, 0.7, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/cloud.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(30, 0.5, 30)
    }
  },
  confetti: {
    name: 'Confetti',
    description: 'Celebration confetti',
    icon: 'celebration',
    category: 'magic',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 200,
      minLifeTime: 3,
      maxLifeTime: 6,
      minSize: 0.1,
      maxSize: 0.3,
      minEmitPower: 5,
      maxEmitPower: 10,
      direction1: new BABYLON.Vector3(-3, 10, -3),
      direction2: new BABYLON.Vector3(3, 15, 3),
      gravity: new BABYLON.Vector3(0, -3, 0),
      color1: new BABYLON.Color4(1, 0, 0.5, 1),
      color2: new BABYLON.Color4(0, 1, 0.5, 1),
      colorDead: new BABYLON.Color4(0.5, 0.5, 1, 0),
      minAngularSpeed: -Math.PI * 2,
      maxAngularSpeed: Math.PI * 2,
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/confetti.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(5, 0.1, 5)
    }
  },
  fireflies: {
    name: 'Fireflies',
    description: 'Glowing fireflies',
    icon: 'lightbulb',
    category: 'natural',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 15,
      minLifeTime: 3,
      maxLifeTime: 8,
      minSize: 0.03,
      maxSize: 0.08,
      minEmitPower: 0.2,
      maxEmitPower: 0.5,
      direction1: new BABYLON.Vector3(-1, -0.5, -1),
      direction2: new BABYLON.Vector3(1, 1, 1),
      gravity: new BABYLON.Vector3(0, 0.1, 0),
      color1: new BABYLON.Color4(0.7, 1, 0.3, 1),
      color2: new BABYLON.Color4(0.5, 0.9, 0.2, 0.8),
      colorDead: new BABYLON.Color4(0.3, 0.5, 0.1, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
      textureUrl: '/textures/particles/glow.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(10, 3, 10)
    }
  },
  waterfall: {
    name: 'Waterfall',
    description: 'Cascading water',
    icon: 'water',
    category: 'natural',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 300,
      minLifeTime: 1,
      maxLifeTime: 2,
      minSize: 0.1,
      maxSize: 0.3,
      minEmitPower: 3,
      maxEmitPower: 5,
      direction1: new BABYLON.Vector3(-0.3, -1, -0.3),
      direction2: new BABYLON.Vector3(0.3, -1, 0.3),
      gravity: new BABYLON.Vector3(0, -15, 0),
      color1: new BABYLON.Color4(0.6, 0.8, 1, 0.8),
      color2: new BABYLON.Color4(0.4, 0.6, 0.9, 0.6),
      colorDead: new BABYLON.Color4(0.3, 0.5, 0.8, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/water.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(2, 0.1, 0.5)
    }
  },
  steam: {
    name: 'Steam',
    description: 'Rising steam vapor',
    icon: 'hot_tub',
    category: 'environmental',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 40,
      minLifeTime: 2,
      maxLifeTime: 4,
      minSize: 0.3,
      maxSize: 1.5,
      minEmitPower: 0.5,
      maxEmitPower: 1,
      direction1: new BABYLON.Vector3(-0.3, 2, -0.3),
      direction2: new BABYLON.Vector3(0.3, 4, 0.3),
      gravity: new BABYLON.Vector3(0, 0.5, 0),
      color1: new BABYLON.Color4(1, 1, 1, 0.6),
      color2: new BABYLON.Color4(0.9, 0.9, 1, 0.3),
      colorDead: new BABYLON.Color4(0.8, 0.8, 0.9, 0),
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/smoke.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(1, 0.1, 1)
    }
  },
  leaves: {
    name: 'Leaves',
    description: 'Falling autumn leaves',
    icon: 'eco',
    category: 'natural',
    config: {
      ...DEFAULT_CONFIG,
      emitRate: 20,
      minLifeTime: 5,
      maxLifeTime: 10,
      minSize: 0.1,
      maxSize: 0.3,
      minEmitPower: 0.5,
      maxEmitPower: 1,
      direction1: new BABYLON.Vector3(-2, -1, -2),
      direction2: new BABYLON.Vector3(2, 0, 2),
      gravity: new BABYLON.Vector3(0, -0.5, 0),
      color1: new BABYLON.Color4(1, 0.6, 0.2, 1),
      color2: new BABYLON.Color4(0.8, 0.3, 0.1, 1),
      colorDead: new BABYLON.Color4(0.5, 0.2, 0, 0),
      minAngularSpeed: -Math.PI,
      maxAngularSpeed: Math.PI,
      blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
      textureUrl: '/textures/particles/leaf.png',
      emitterType: 'box',
      emitterSize: new BABYLON.Vector3(20, 0.1, 20)
    }
  },
  custom: {
    name: 'Custom',
    description: 'User-defined particle system',
    icon: 'tune',
    category: 'environmental',
    config: { ...DEFAULT_CONFIG }
  }
};

interface ParticleStore {
  // State
  scene: BABYLON.Scene | null;
  activeSystems: ActiveParticleSystem[];
  selectedSystem: string | null;
  useGPU: boolean;
  
  // Initialize
  initialize: (scene: BABYLON.Scene) => void;
  dispose: () => void;
  
  // System management
  createSystem: (type: ParticleEffectType, position?: BABYLON.Vector3, name?: string) => string;
  removeSystem: (id: string) => void;
  duplicateSystem: (id: string) => string | null;
  selectSystem: (id: string | null) => void;
  
  // Playback control
  playSystem: (id: string) => void;
  stopSystem: (id: string) => void;
  playAll: () => void;
  stopAll: () => void;
  
  // Configuration
  updateSystemConfig: (id: string, config: Partial<ParticleConfig>) => void;
  updateSystemPosition: (id: string, position: BABYLON.Vector3) => void;
  applyPreset: (id: string, type: ParticleEffectType) => void;
  
  // GPU control
  setUseGPU: (useGPU: boolean) => void;
  
  // Utility
  getSystemById: (id: string) => ActiveParticleSystem | undefined;
  exportSystemConfig: (id: string) => string;
  importSystemConfig: (config: string, position?: BABYLON.Vector3) => string | null;
}

export const useParticleStore = create<ParticleStore>((set, get) => ({
  scene: null,
  activeSystems: [],
  selectedSystem: null,
  useGPU: true,
  
  initialize: (scene) => {
    set({ scene });
  },
  
  dispose: () => {
    const { activeSystems } = get();
    activeSystems.forEach(ps => {
      ps.system.dispose();
    });
    set({ activeSystems: [], scene: null, selectedSystem: null });
  },
  
  createSystem: (type, position = BABYLON.Vector3.Zero(), name) => {
    const { scene, useGPU, activeSystems } = get();
    if (!scene) return '';
    
    const preset = PARTICLE_PRESETS[type];
    const config = { ...preset.config };
    const systemId = `particle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const systemName = name || `${preset.name} ${activeSystems.length + 1}`;
    
    // Create particle system
    let system: BABYLON.ParticleSystem | BABYLON.GPUParticleSystem;
    
    if (useGPU && BABYLON.GPUParticleSystem.IsSupported) {
      system = new BABYLON.GPUParticleSystem(
        systemName,
        { capacity: 10000 },
        scene
      );
    } else {
      system = new BABYLON.ParticleSystem(systemName, 2000, scene);
    }
    
    // Configure emitter - use position directly as Vector3
    system.emitter = position.clone();
    
    // Apply configuration
    applyConfigToSystem(system, config);
    
    // Create fallback texture if needed
    if (!config.textureUrl || config.textureUrl.includes('particles/')) {
      // Create procedural particle texture
      const dynamicTexture = new BABYLON.DynamicTexture(
        'particleTexture',
        64,
        scene
      );
      const ctx = dynamicTexture.getContext();
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      dynamicTexture.update();
      system.particleTexture = dynamicTexture;
    } else {
      system.particleTexture = new BABYLON.Texture(config.textureUrl, scene);
    }
    
    // Start the system
    system.start();
    
    const activeSystem: ActiveParticleSystem = {
      id: systemId,
      name: systemName,
      type,
      system,
      position,
      isPlaying: true,
      config
    };
    
    set({
      activeSystems: [...activeSystems, activeSystem],
      selectedSystem: systemId
    });
    
    return systemId;
  },
  
  removeSystem: (id) => {
    const { activeSystems, selectedSystem } = get();
    const system = activeSystems.find(s => s.id === id);
    
    if (system) {
      system.system.dispose();
      const emitter = system.system.emitter;
      if (emitter instanceof BABYLON.TransformNode) {
        emitter.dispose();
      }
    }
    
    set({
      activeSystems: activeSystems.filter(s => s.id !== id),
      selectedSystem: selectedSystem === id ? null : selectedSystem
    });
  },
  
  duplicateSystem: (id) => {
    const { activeSystems } = get();
    const original = activeSystems.find(s => s.id === id);
    
    if (!original) return null;
    
    const newPosition = original.position.clone();
    newPosition.x += 2; // Offset the duplicate
    
    return get().createSystem(
      original.type,
      newPosition,
      `${original.name} Copy`
    );
  },
  
  selectSystem: (id) => {
    set({ selectedSystem: id });
  },
  
  playSystem: (id) => {
    const { activeSystems } = get();
    const system = activeSystems.find(s => s.id === id);
    
    if (system) {
      system.system.start();
      set({
        activeSystems: activeSystems.map(s =>
          s.id === id ? { ...s, isPlaying: true } : s
        )
      });
    }
  },
  
  stopSystem: (id) => {
    const { activeSystems } = get();
    const system = activeSystems.find(s => s.id === id);
    
    if (system) {
      system.system.stop();
      set({
        activeSystems: activeSystems.map(s =>
          s.id === id ? { ...s, isPlaying: false } : s
        )
      });
    }
  },
  
  playAll: () => {
    const { activeSystems } = get();
    activeSystems.forEach(s => s.system.start());
    set({
      activeSystems: activeSystems.map(s => ({ ...s, isPlaying: true }))
    });
  },
  
  stopAll: () => {
    const { activeSystems } = get();
    activeSystems.forEach(s => s.system.stop());
    set({
      activeSystems: activeSystems.map(s => ({ ...s, isPlaying: false }))
    });
  },
  
  updateSystemConfig: (id, newConfig) => {
    const { activeSystems } = get();
    const system = activeSystems.find(s => s.id === id);
    
    if (system) {
      const mergedConfig = { ...system.config, ...newConfig };
      applyConfigToSystem(system.system, mergedConfig);
      
      set({
        activeSystems: activeSystems.map(s =>
          s.id === id ? { ...s, config: mergedConfig } : s
        )
      });
    }
  },
  
  updateSystemPosition: (id, position) => {
    const { activeSystems } = get();
    const system = activeSystems.find(s => s.id === id);
    
    if (system) {
      const emitter = system.system.emitter;
      if (emitter instanceof BABYLON.TransformNode) {
        emitter.position = position;
      }
      
      set({
        activeSystems: activeSystems.map(s =>
          s.id === id ? { ...s, position } : s
        )
      });
    }
  },
  
  applyPreset: (id, type) => {
    const { activeSystems } = get();
    const system = activeSystems.find(s => s.id === id);
    
    if (system) {
      const preset = PARTICLE_PRESETS[type];
      applyConfigToSystem(system.system, preset.config);
      
      set({
        activeSystems: activeSystems.map(s =>
          s.id === id ? { ...s, type, config: { ...preset.config } } : s
        )
      });
    }
  },
  
  setUseGPU: (useGPU) => {
    set({ useGPU });
  },
  
  getSystemById: (id) => {
    return get().activeSystems.find(s => s.id === id);
  },
  
  exportSystemConfig: (id) => {
    const system = get().activeSystems.find(s => s.id === id);
    if (!system) return '';
    
    return JSON.stringify({
      type: system.type,
      name: system.name,
      config: serializeConfig(system.config)
    }, null, 2);
  },
  
  importSystemConfig: (configJson, position) => {
    try {
      const data = JSON.parse(configJson);
      return get().createSystem(
        data.type || 'custom',
        position || BABYLON.Vector3.Zero(),
        data.name
      );
    } catch {
      console.error('Failed to import particle config');
      return null;
    }
  }
}));

// Helper function to apply config to system
function applyConfigToSystem(
  system: BABYLON.ParticleSystem | BABYLON.GPUParticleSystem,
  config: ParticleConfig
) {
  system.emitRate = config.emitRate;
  system.minLifeTime = config.minLifeTime;
  system.maxLifeTime = config.maxLifeTime;
  system.minSize = config.minSize;
  system.maxSize = config.maxSize;
  system.minEmitPower = config.minEmitPower;
  system.maxEmitPower = config.maxEmitPower;
  
  system.direction1 = config.direction1.clone();
  system.direction2 = config.direction2.clone();
  system.gravity = config.gravity.clone();
  
  system.color1 = config.color1.clone();
  system.color2 = config.color2.clone();
  system.colorDead = config.colorDead.clone();
  
  system.minAngularSpeed = config.minAngularSpeed;
  system.maxAngularSpeed = config.maxAngularSpeed;
  
  system.blendMode = config.blendMode;
}

// Helper to serialize config for export
function serializeConfig(config: ParticleConfig): any {
  return {
    ...config,
    direction1: { x: config.direction1.x, y: config.direction1.y, z: config.direction1.z },
    direction2: { x: config.direction2.x, y: config.direction2.y, z: config.direction2.z },
    gravity: { x: config.gravity.x, y: config.gravity.y, z: config.gravity.z },
    emitterSize: { x: config.emitterSize.x, y: config.emitterSize.y, z: config.emitterSize.z },
    color1: { r: config.color1.r, g: config.color1.g, b: config.color1.b, a: config.color1.a },
    color2: { r: config.color2.r, g: config.color2.g, b: config.color2.b, a: config.color2.a },
    colorDead: { r: config.colorDead.r, g: config.colorDead.g, b: config.colorDead.b, a: config.colorDead.a }
  };
}

export default useParticleStore;
