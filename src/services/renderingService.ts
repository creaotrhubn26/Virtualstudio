/**
 * Advanced Rendering Service
 * Post-processing effects, SSAO, SSR, volumetrics, and HDR pipeline
 */

import * as BABYLON from '@babylonjs/core';
import { create } from 'zustand';

// Rendering quality presets
export interface RenderingPreset {
  name: string;
  ssaoEnabled: boolean;
  ssaoSamples: number;
  ssrEnabled: boolean;
  ssrStrength: number;
  bloomEnabled: boolean;
  bloomIntensity: number;
  dofEnabled: boolean;
  dofFocalLength: number;
  dofAperture: number;
  motionBlurEnabled: boolean;
  motionBlurIntensity: number;
  chromaticAberrationEnabled: boolean;
  chromaticAberrationAmount: number;
  vignetteEnabled: boolean;
  vignetteStrength: number;
  grainEnabled: boolean;
  grainIntensity: number;
  sharpenEnabled: boolean;
  sharpenAmount: number;
  tonemapping: 'none' | 'aces' | 'reinhard' | 'filmic';
  exposure: number;
  contrast: number;
  saturation: number;
  volumetricLightingEnabled: boolean;
  volumetricLightingDensity: number;
  fogEnabled: boolean;
  fogDensity: number;
  fogColor: { r: number; g: number; b: number };
}

// Alias for consistency
export type RenderingSettings = RenderingPreset;

export const RENDERING_PRESETS: Record<string, Partial<RenderingPreset>> = {
  'performance': {
    name: 'Performance',
    ssaoEnabled: false,
    ssrEnabled: false,
    bloomEnabled: true,
    bloomIntensity: 0.3,
    dofEnabled: false,
    motionBlurEnabled: false,
    volumetricLightingEnabled: false,
    fogEnabled: false,
    tonemapping: 'aces',
    exposure: 1.0
  },
  'balanced': {
    name: 'Balanced',
    ssaoEnabled: true,
    ssaoSamples: 16,
    ssrEnabled: false,
    bloomEnabled: true,
    bloomIntensity: 0.5,
    dofEnabled: true,
    dofFocalLength: 50,
    dofAperture: 2.8,
    motionBlurEnabled: false,
    volumetricLightingEnabled: false,
    fogEnabled: false,
    tonemapping: 'aces',
    exposure: 1.0
  },
  'quality': {
    name: 'Quality',
    ssaoEnabled: true,
    ssaoSamples: 32,
    ssrEnabled: true,
    ssrStrength: 0.5,
    bloomEnabled: true,
    bloomIntensity: 0.6,
    dofEnabled: true,
    dofFocalLength: 50,
    dofAperture: 2.0,
    motionBlurEnabled: true,
    motionBlurIntensity: 0.5,
    chromaticAberrationEnabled: true,
    chromaticAberrationAmount: 0.1,
    vignetteEnabled: true,
    vignetteStrength: 0.3,
    volumetricLightingEnabled: true,
    volumetricLightingDensity: 0.05,
    tonemapping: 'aces',
    exposure: 1.0
  },
  'cinematic': {
    name: 'Cinematic',
    ssaoEnabled: true,
    ssaoSamples: 32,
    ssrEnabled: true,
    ssrStrength: 0.7,
    bloomEnabled: true,
    bloomIntensity: 0.8,
    dofEnabled: true,
    dofFocalLength: 35,
    dofAperture: 1.4,
    motionBlurEnabled: true,
    motionBlurIntensity: 0.7,
    chromaticAberrationEnabled: true,
    chromaticAberrationAmount: 0.15,
    vignetteEnabled: true,
    vignetteStrength: 0.5,
    grainEnabled: true,
    grainIntensity: 0.05,
    volumetricLightingEnabled: true,
    volumetricLightingDensity: 0.08,
    fogEnabled: true,
    fogDensity: 0.02,
    fogColor: { r: 0.5, g: 0.6, b: 0.7 },
    tonemapping: 'filmic',
    exposure: 1.1,
    contrast: 1.1,
    saturation: 0.95
  }
};

export interface RenderingState {
  // Current settings
  settings: RenderingPreset;
  activePreset: string | null;
  
  // Pipeline references
  pipeline: BABYLON.DefaultRenderingPipeline | null;
  ssaoPipeline: BABYLON.SSAO2RenderingPipeline | null;
  ssrPipeline: BABYLON.SSRRenderingPipeline | null;
  volumetricLightScatteringPasses: BABYLON.VolumetricLightScatteringPostProcess[];
  
  // State
  isInitialized: boolean;
  
  // Actions
  initialize: (scene: BABYLON.Scene, camera: BABYLON.Camera) => void;
  dispose: () => void;
  applyPreset: (presetName: string) => void;
  
  // Individual effect controls
  setSSAO: (enabled: boolean, samples?: number) => void;
  setSSR: (enabled: boolean, strength?: number) => void;
  setBloom: (enabled: boolean, intensity?: number) => void;
  setDOF: (enabled: boolean, focalLength?: number, aperture?: number) => void;
  setMotionBlur: (enabled: boolean, intensity?: number) => void;
  setChromaticAberration: (enabled: boolean, amount?: number) => void;
  setVignette: (enabled: boolean, strength?: number) => void;
  setGrain: (enabled: boolean, intensity?: number) => void;
  setSharpen: (enabled: boolean, amount?: number) => void;
  setTonemapping: (type: 'none' | 'aces' | 'reinhard' | 'filmic') => void;
  setExposure: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setVolumetricLighting: (enabled: boolean, density?: number) => void;
  setFog: (enabled: boolean, density?: number, color?: { r: number; g: number; b: number }) => void;
}

// Default settings
const defaultSettings: RenderingPreset = {
  name: 'Custom',
  ssaoEnabled: true,
  ssaoSamples: 16,
  ssrEnabled: false,
  ssrStrength: 0.5,
  bloomEnabled: true,
  bloomIntensity: 0.5,
  dofEnabled: false,
  dofFocalLength: 50,
  dofAperture: 2.8,
  motionBlurEnabled: false,
  motionBlurIntensity: 0.5,
  chromaticAberrationEnabled: false,
  chromaticAberrationAmount: 0.1,
  vignetteEnabled: false,
  vignetteStrength: 0.3,
  grainEnabled: false,
  grainIntensity: 0.05,
  sharpenEnabled: false,
  sharpenAmount: 0.3,
  tonemapping: 'aces',
  exposure: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  volumetricLightingEnabled: false,
  volumetricLightingDensity: 0.05,
  fogEnabled: false,
  fogDensity: 0.01,
  fogColor: { r: 0.5, g: 0.5, b: 0.5 }
};

export const useRenderingStore = create<RenderingState>((set, get) => ({
  settings: { ...defaultSettings },
  activePreset: null,
  pipeline: null,
  ssaoPipeline: null,
  ssrPipeline: null,
  volumetricLightScatteringPasses: [],
  isInitialized: false,
  
  initialize: (scene: BABYLON.Scene, camera: BABYLON.Camera) => {
    const { settings } = get();
    
    // Create default rendering pipeline (HDR enabled via 2nd param)
    const pipeline = new BABYLON.DefaultRenderingPipeline(
      'defaultPipeline',
      true, // HDR enabled
      scene,
      [camera]
    );
    
    // Configure bloom
    pipeline.bloomEnabled = settings.bloomEnabled;
    pipeline.bloomWeight = settings.bloomIntensity;
    pipeline.bloomThreshold = 0.9;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
    
    // Configure DOF
    pipeline.depthOfFieldEnabled = settings.dofEnabled;
    pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Medium;
    if (pipeline.depthOfField) {
      pipeline.depthOfField.focalLength = settings.dofFocalLength;
      pipeline.depthOfField.fStop = settings.dofAperture;
      pipeline.depthOfField.focusDistance = 2000;
    }
    
    // Configure chromatic aberration
    pipeline.chromaticAberrationEnabled = settings.chromaticAberrationEnabled;
    pipeline.chromaticAberration.aberrationAmount = settings.chromaticAberrationAmount;
    
    // Configure vignette
    pipeline.imageProcessingEnabled = true;
    if (pipeline.imageProcessing) {
      pipeline.imageProcessing.vignetteEnabled = settings.vignetteEnabled;
      pipeline.imageProcessing.vignetteWeight = settings.vignetteStrength;
      pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 1);
      
      // Tone mapping
      pipeline.imageProcessing.toneMappingEnabled = settings.tonemapping !== 'none';
      if (settings.tonemapping === 'aces') {
        pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
      } else if (settings.tonemapping === 'filmic') {
        pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
      }
      
      // Exposure and color
      pipeline.imageProcessing.exposure = settings.exposure;
      pipeline.imageProcessing.contrast = settings.contrast;
      pipeline.imageProcessing.colorCurvesEnabled = true;
    }
    
    // Configure grain
    pipeline.grainEnabled = settings.grainEnabled;
    pipeline.grain.intensity = settings.grainIntensity;
    pipeline.grain.animated = true;
    
    // Configure sharpen
    pipeline.sharpenEnabled = settings.sharpenEnabled;
    pipeline.sharpen.edgeAmount = settings.sharpenAmount;
    
    // Create SSAO pipeline
    let ssaoPipeline: BABYLON.SSAO2RenderingPipeline | null = null;
    if (settings.ssaoEnabled) {
      ssaoPipeline = new BABYLON.SSAO2RenderingPipeline(
        'ssao',
        scene,
        {
          ssaoRatio: 0.5,
          blurRatio: 0.5
        },
        [camera],
        true
      );
      ssaoPipeline.radius = 2;
      ssaoPipeline.totalStrength = 1.0;
      ssaoPipeline.expensiveBlur = true;
      ssaoPipeline.samples = settings.ssaoSamples;
      ssaoPipeline.maxZ = 100;
    }
    
    // Create SSR pipeline (if supported)
    let ssrPipeline: BABYLON.SSRRenderingPipeline | null = null;
    if (settings.ssrEnabled) {
      try {
        ssrPipeline = new BABYLON.SSRRenderingPipeline(
          'ssr',
          scene,
          [camera],
          false
        );
        ssrPipeline.strength = settings.ssrStrength;
        ssrPipeline.reflectionSpecularFalloffExponent = 3;
        ssrPipeline.step = 1;
        ssrPipeline.maxSteps = 100;
        ssrPipeline.maxDistance = 1000;
        ssrPipeline.enableSmoothReflections = true;
      } catch (e) {
        console.warn('SSR not supported on this device');
      }
    }
    
    // Configure fog
    if (settings.fogEnabled) {
      scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
      scene.fogDensity = settings.fogDensity;
      scene.fogColor = new BABYLON.Color3(
        settings.fogColor.r,
        settings.fogColor.g,
        settings.fogColor.b
      );
    }
    
    set({
      pipeline,
      ssaoPipeline,
      ssrPipeline,
      isInitialized: true
    });
  },
  
  dispose: () => {
    const { pipeline, ssaoPipeline, ssrPipeline, volumetricLightScatteringPasses } = get();
    
    if (pipeline) {
      pipeline.dispose();
    }
    if (ssaoPipeline) {
      ssaoPipeline.dispose();
    }
    if (ssrPipeline) {
      ssrPipeline.dispose();
    }
    // VolumetricLightScattering uses getCamera() internally when no camera passed
    volumetricLightScatteringPasses.forEach(pass => {
      try {
        // Try to dispose with the attached camera
        const camera = pass.getCamera?.();
        if (camera) {
          pass.dispose(camera);
        }
      } catch (e) {
        console.warn('Failed to dispose volumetric pass:', e);
      }
    });
    
    set({
      pipeline: null,
      ssaoPipeline: null,
      ssrPipeline: null,
      volumetricLightScatteringPasses: [],
      isInitialized: false
    });
  },
  
  applyPreset: (presetName: string) => {
    const preset = RENDERING_PRESETS[presetName];
    if (!preset) return;
    
    const newSettings = { ...get().settings, ...preset };
    const { pipeline, ssaoPipeline, ssrPipeline } = get();
    
    if (pipeline) {
      // Apply all settings from preset
      if (preset.bloomEnabled !== undefined) {
        pipeline.bloomEnabled = preset.bloomEnabled;
        pipeline.bloomWeight = preset.bloomIntensity || 0.5;
      }
      
      if (preset.dofEnabled !== undefined) {
        pipeline.depthOfFieldEnabled = preset.dofEnabled;
        if (pipeline.depthOfField && preset.dofFocalLength) {
          pipeline.depthOfField.focalLength = preset.dofFocalLength;
          pipeline.depthOfField.fStop = preset.dofAperture || 2.8;
        }
      }
      
      if (preset.chromaticAberrationEnabled !== undefined) {
        pipeline.chromaticAberrationEnabled = preset.chromaticAberrationEnabled;
        pipeline.chromaticAberration.aberrationAmount = preset.chromaticAberrationAmount || 0.1;
      }
      
      if (preset.vignetteEnabled !== undefined && pipeline.imageProcessing) {
        pipeline.imageProcessing.vignetteEnabled = preset.vignetteEnabled;
        pipeline.imageProcessing.vignetteWeight = preset.vignetteStrength || 0.3;
      }
      
      if (preset.grainEnabled !== undefined) {
        pipeline.grainEnabled = preset.grainEnabled;
        pipeline.grain.intensity = preset.grainIntensity || 0.05;
      }
      
      if (preset.sharpenEnabled !== undefined) {
        pipeline.sharpenEnabled = preset.sharpenEnabled;
        pipeline.sharpen.edgeAmount = preset.sharpenAmount || 0.3;
      }
      
      if (preset.exposure !== undefined && pipeline.imageProcessing) {
        pipeline.imageProcessing.exposure = preset.exposure;
      }
      
      if (preset.contrast !== undefined && pipeline.imageProcessing) {
        pipeline.imageProcessing.contrast = preset.contrast;
      }
    }
    
    set({ settings: newSettings, activePreset: presetName });
  },
  
  setSSAO: (enabled: boolean, samples?: number) => {
    const { ssaoPipeline, settings } = get();
    
    if (ssaoPipeline) {
      // Toggle visibility/processing
      if (enabled) {
        if (samples) {
          ssaoPipeline.samples = samples;
        }
      }
    }
    
    set({
      settings: {
        ...settings,
        ssaoEnabled: enabled,
        ssaoSamples: samples ?? settings.ssaoSamples
      }
    });
  },
  
  setSSR: (enabled: boolean, strength?: number) => {
    const { ssrPipeline, settings } = get();
    
    if (ssrPipeline) {
      ssrPipeline.strength = enabled ? (strength ?? settings.ssrStrength) : 0;
    }
    
    set({
      settings: {
        ...settings,
        ssrEnabled: enabled,
        ssrStrength: strength ?? settings.ssrStrength
      }
    });
  },
  
  setBloom: (enabled: boolean, intensity?: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline) {
      pipeline.bloomEnabled = enabled;
      if (intensity !== undefined) {
        pipeline.bloomWeight = intensity;
      }
    }
    
    set({
      settings: {
        ...settings,
        bloomEnabled: enabled,
        bloomIntensity: intensity ?? settings.bloomIntensity
      }
    });
  },
  
  setDOF: (enabled: boolean, focalLength?: number, aperture?: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline) {
      pipeline.depthOfFieldEnabled = enabled;
      if (pipeline.depthOfField) {
        if (focalLength !== undefined) {
          pipeline.depthOfField.focalLength = focalLength;
        }
        if (aperture !== undefined) {
          pipeline.depthOfField.fStop = aperture;
        }
      }
    }
    
    set({
      settings: {
        ...settings,
        dofEnabled: enabled,
        dofFocalLength: focalLength ?? settings.dofFocalLength,
        dofAperture: aperture ?? settings.dofAperture
      }
    });
  },
  
  setMotionBlur: (enabled: boolean, intensity?: number) => {
    const { settings } = get();
    
    // Motion blur requires additional post-process setup
    // This is a placeholder for the setting
    
    set({
      settings: {
        ...settings,
        motionBlurEnabled: enabled,
        motionBlurIntensity: intensity ?? settings.motionBlurIntensity
      }
    });
  },
  
  setChromaticAberration: (enabled: boolean, amount?: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline) {
      pipeline.chromaticAberrationEnabled = enabled;
      if (amount !== undefined) {
        pipeline.chromaticAberration.aberrationAmount = amount;
      }
    }
    
    set({
      settings: {
        ...settings,
        chromaticAberrationEnabled: enabled,
        chromaticAberrationAmount: amount ?? settings.chromaticAberrationAmount
      }
    });
  },
  
  setVignette: (enabled: boolean, strength?: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline?.imageProcessing) {
      pipeline.imageProcessing.vignetteEnabled = enabled;
      if (strength !== undefined) {
        pipeline.imageProcessing.vignetteWeight = strength;
      }
    }
    
    set({
      settings: {
        ...settings,
        vignetteEnabled: enabled,
        vignetteStrength: strength ?? settings.vignetteStrength
      }
    });
  },
  
  setGrain: (enabled: boolean, intensity?: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline) {
      pipeline.grainEnabled = enabled;
      if (intensity !== undefined) {
        pipeline.grain.intensity = intensity;
      }
    }
    
    set({
      settings: {
        ...settings,
        grainEnabled: enabled,
        grainIntensity: intensity ?? settings.grainIntensity
      }
    });
  },
  
  setSharpen: (enabled: boolean, amount?: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline) {
      pipeline.sharpenEnabled = enabled;
      if (amount !== undefined) {
        pipeline.sharpen.edgeAmount = amount;
      }
    }
    
    set({
      settings: {
        ...settings,
        sharpenEnabled: enabled,
        sharpenAmount: amount ?? settings.sharpenAmount
      }
    });
  },
  
  setTonemapping: (type: 'none' | 'aces' | 'reinhard' | 'filmic') => {
    const { pipeline, settings } = get();
    
    if (pipeline?.imageProcessing) {
      pipeline.imageProcessing.toneMappingEnabled = type !== 'none';
      if (type === 'aces') {
        pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
      } else if (type === 'filmic') {
        pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
      }
    }
    
    set({
      settings: { ...settings, tonemapping: type }
    });
  },
  
  setExposure: (value: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline?.imageProcessing) {
      pipeline.imageProcessing.exposure = value;
    }
    
    set({
      settings: { ...settings, exposure: value }
    });
  },
  
  setContrast: (value: number) => {
    const { pipeline, settings } = get();
    
    if (pipeline?.imageProcessing) {
      pipeline.imageProcessing.contrast = value;
    }
    
    set({
      settings: { ...settings, contrast: value }
    });
  },
  
  setSaturation: (value: number) => {
    const { settings } = get();
    
    // Saturation requires color curves adjustment
    // This is a placeholder
    
    set({
      settings: { ...settings, saturation: value }
    });
  },
  
  setVolumetricLighting: (enabled: boolean, density?: number) => {
    const { settings } = get();
    
    // Volumetric lighting setup
    // Requires creating VolumetricLightScatteringPostProcess for each light
    
    set({
      settings: {
        ...settings,
        volumetricLightingEnabled: enabled,
        volumetricLightingDensity: density ?? settings.volumetricLightingDensity
      }
    });
  },
  
  setFog: (enabled: boolean, density?: number, color?: { r: number; g: number; b: number }) => {
    const { pipeline, settings } = get();
    
    if (pipeline) {
      const scene = pipeline.scene;
      if (enabled) {
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogDensity = density ?? settings.fogDensity;
        if (color) {
          scene.fogColor = new BABYLON.Color3(color.r, color.g, color.b);
        }
      } else {
        scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
      }
    }
    
    set({
      settings: {
        ...settings,
        fogEnabled: enabled,
        fogDensity: density ?? settings.fogDensity,
        fogColor: color ?? settings.fogColor
      }
    });
  }
}));

export default useRenderingStore;
