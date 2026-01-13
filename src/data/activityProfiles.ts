/**
 * Activity Profiles and Exertion Settings
 * Defines how materials change based on animation activity levels
 */

import * as BABYLON from '@babylonjs/core';

export interface ActivityProfile {
  roughnessReduction: number;     // How much to reduce roughness (0-1)
  sssBoost: number;               // Subsurface scattering intensity boost
  clearcoatBoost: number;          // Clearcoat intensity boost (sweating)
  albedoTint: BABYLON.Color3;      // Color tint for exertion (redness)
}

export const ACTIVITY_PROFILES: Record<string, ActivityProfile> = {
  idle: {
    roughnessReduction: 0,
    sssBoost: 0,
    clearcoatBoost: 0,
    albedoTint: new BABYLON.Color3(1.0, 1.0, 1.0)  // No tint
  },

  walk: {
    roughnessReduction: 0.08,      // Slightly glossier
    sssBoost: 0.05,                 // Mild glow
    clearcoatBoost: 0.1,            // Light sweat on forehead
    albedoTint: new BABYLON.Color3(1.02, 0.98, 0.97)  // Very subtle warm tint
  },

  run: {
    roughnessReduction: 0.2,        // Noticeably glossier
    sssBoost: 0.15,                 // Visible glow
    clearcoatBoost: 0.3,            // Moderate sweating
    albedoTint: new BABYLON.Color3(1.05, 0.95, 0.92)  // +5% red, -5% green/blue
  },

  athletic: {
    roughnessReduction: 0.33,       // Very glossy (0.75 → 0.42)
    sssBoost: 0.25,                 // Strong subsurface scattering
    clearcoatBoost: 0.5,            // Heavy sweating
    albedoTint: new BABYLON.Color3(1.08, 0.92, 0.87)  // +8% red
  },

  combat: {
    roughnessReduction: 0.4,        // Maximum glossiness (0.75 → 0.35)
    sssBoost: 0.35,                 // Maximum blood flow glow
    clearcoatBoost: 0.7,            // Extreme sweating
    albedoTint: new BABYLON.Color3(1.1, 0.9, 0.85)   // +10% red (flushed)
  }
};

/**
 * Exertion Material Adjustments
 * Detailed breakdown of how each activity affects material properties
 */
export const EXERTION_MATERIAL_ADJUSTMENTS = {
  idle: {
    roughness: { delta: 0.0, min: 0.75, max: 0.75 },
    subsurfaceScattering: { delta: 0.0, min: 0.3, max: 0.3 },
    clearcoat: { delta: 0.0, min: 0.0, max: 0.0 },
    albedoRed: { delta: 0.0, min: 1.0, max: 1.0 }
  },

  walk: {
    roughness: { delta: -0.08, min: 0.67, max: 0.75 },
    subsurfaceScattering: { delta: 0.05, min: 0.3, max: 0.35 },
    clearcoat: { delta: 0.1, min: 0.0, max: 0.1 },
    albedoRed: { delta: 0.02, min: 1.0, max: 1.02 }
  },

  run: {
    roughness: { delta: -0.2, min: 0.55, max: 0.75 },
    subsurfaceScattering: { delta: 0.15, min: 0.3, max: 0.45 },
    clearcoat: { delta: 0.3, min: 0.0, max: 0.3 },
    albedoRed: { delta: 0.05, min: 1.0, max: 1.05 }
  },

  athletic: {
    roughness: { delta: -0.33, min: 0.42, max: 0.75 },
    subsurfaceScattering: { delta: 0.25, min: 0.3, max: 0.55 },
    clearcoat: { delta: 0.5, min: 0.0, max: 0.5 },
    albedoRed: { delta: 0.08, min: 1.0, max: 1.08 }
  },

  combat: {
    roughness: { delta: -0.4, min: 0.35, max: 0.75 },
    subsurfaceScattering: { delta: 0.35, min: 0.3, max: 0.65 },
    clearcoat: { delta: 0.7, min: 0.0, max: 0.7 },
    albedoRed: { delta: 0.1, min: 1.0, max: 1.1 }
  }
};

/**
 * Animation Intensity Thresholds
 * Define activity types based on bone velocity analysis
 */
export const ACTIVITY_THRESHOLDS = {
  idle: { min: 0.0, max: 0.05 },
  walk: { min: 0.05, max: 0.2 },
  run: { min: 0.2, max: 0.5 },
  athletic: { min: 0.5, max: 0.8 },
  combat: { min: 0.8, max: 1.0 }
};

/**
 * Body Parts Affected by Each Activity
 * Used to apply effects selectively
 */
export const AFFECTED_PARTS_BY_ACTIVITY = {
  idle: [] as string[],

  walk: [
    'face',
    'neck',
    'forehead'
  ],

  run: [
    'face',
    'neck',
    'forehead',
    'cheeks',
    'shoulders'
  ],

  athletic: [
    'face',
    'neck',
    'forehead',
    'cheeks',
    'shoulders',
    'torso',
    'arms',
    'legs'
  ],

  combat: [
    'face',
    'neck',
    'forehead',
    'cheeks',
    'shoulders',
    'torso',
    'arms',
    'legs',
    'hands'
  ]
};

/**
 * Animation Type Detection Rules
 * Map animation names to activity types
 */
export const ANIMATION_TYPE_DETECTION = {
  idle: /idle|stand|rest|wait|breathe/i,
  walk: /walk|stroll|wander/i,
  run: /run|sprint|jog|dash/i,
  athletic: /dance|jump|climb|stretch|exercise|stretch|workout|yoga/i,
  combat: /punch|kick|fight|combat|attack|block|dodge|roll/i
};

/**
 * Get activity type from animation name
 */
export function getActivityTypeFromAnimation(animationName: string): 'idle' | 'walk' | 'run' | 'athletic' | 'combat' {
  for (const [type, regex] of Object.entries(ANIMATION_TYPE_DETECTION)) {
    if (regex.test(animationName)) {
      return type as 'idle' | 'walk' | 'run' | 'athletic' | 'combat';
    }
  }
  return 'idle';  // Default to idle if no match
}
