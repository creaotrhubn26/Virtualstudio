/**
 * Hair Physics Presets - Phase 2A Data
 * 
 * Pre-configured hair strand definitions for common avatar types
 */

import { HairStrandConfig } from '../services/hairPhysicsEngine';

/**
 * Hair type presets for different hairstyles
 */
export const HAIR_PRESETS = {
  /**
   * Long flowing hair (waist-length)
   * Suitable for: Women with long hair
   */
  LONG_FLOWING: {
    particleCount: 15,
    length: 0.8,
    width: 0.05,
    stiffness: 0.6,
    damping: 0.95,
    windSensitivity: 2.5,
    gravityInfluence: 0.8
  },

  /**
   * Medium hair (shoulder-length)
   * Suitable for: Both genders, casual styles
   */
  MEDIUM_HAIR: {
    particleCount: 12,
    length: 0.45,
    width: 0.045,
    stiffness: 0.7,
    damping: 0.92,
    windSensitivity: 2.0,
    gravityInfluence: 0.7
  },

  /**
   * Short hair (chin-length or shorter)
   * Suitable for: Professional, athletic styles
   */
  SHORT_HAIR: {
    particleCount: 10,
    length: 0.25,
    width: 0.04,
    stiffness: 0.8,
    damping: 0.90,
    windSensitivity: 1.5,
    gravityInfluence: 0.5
  },

  /**
   * Very long, voluminous hair
   * Suitable for: Fantasy, costume, dramatic styles
   */
  VERY_LONG_VOLUMINOUS: {
    particleCount: 20,
    length: 1.2,
    width: 0.06,
    stiffness: 0.5,
    damping: 0.93,
    windSensitivity: 3.0,
    gravityInfluence: 0.9
  },

  /**
   * Tight curly/braided hair
   * Suitable for: Curly/braided hairstyles
   */
  TIGHT_BRAIDED: {
    particleCount: 8,
    length: 0.6,
    width: 0.03,
    stiffness: 0.85,
    damping: 0.88,
    windSensitivity: 1.2,
    gravityInfluence: 0.4
  },

  /**
   * Ponytail
   * Suitable for: Ponytail hairstyles
   */
  PONYTAIL: {
    particleCount: 16,
    length: 0.7,
    width: 0.08,
    stiffness: 0.65,
    damping: 0.93,
    windSensitivity: 2.2,
    gravityInfluence: 0.75
  },

  /**
   * Twin tails
   * Suitable for: Twin tails or pigtails
   */
  TWIN_TAILS: {
    particleCount: 12,
    length: 0.6,
    width: 0.05,
    stiffness: 0.7,
    damping: 0.92,
    windSensitivity: 2.0,
    gravityInfluence: 0.7
  }
};

/**
 * Pre-configured hair strand layouts for avatar mesh parts
 * Maps to common character rig bone structures
 */
export const AVATAR_HAIR_LAYOUTS = {
  /**
   * Standard female character with loose long hair
   * Assumes: hair mesh vertices split into several regions
   */
  FEMALE_LONG: [
    // Front-left strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 0,
      meshPartVertexEnd: 120,
      ...HAIR_PRESETS.LONG_FLOWING
    },
    // Front-right strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 120,
      meshPartVertexEnd: 240,
      ...HAIR_PRESETS.LONG_FLOWING
    },
    // Back-left strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 240,
      meshPartVertexEnd: 360,
      ...HAIR_PRESETS.LONG_FLOWING
    },
    // Back-right strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 360,
      meshPartVertexEnd: 480,
      ...HAIR_PRESETS.LONG_FLOWING
    }
  ] as HairStrandConfig[],

  /**
   * Male character with short hair
   * Minimal deformation needed
   */
  MALE_SHORT: [
    // Top of head strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 0,
      meshPartVertexEnd: 80,
      ...HAIR_PRESETS.SHORT_HAIR
    },
    // Side-left strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 80,
      meshPartVertexEnd: 130,
      ...HAIR_PRESETS.SHORT_HAIR
    },
    // Side-right strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 130,
      meshPartVertexEnd: 180,
      ...HAIR_PRESETS.SHORT_HAIR
    }
  ] as HairStrandConfig[],

  /**
   * Female character with ponytail
   * One main flowing strand from back of head
   */
  FEMALE_PONYTAIL: [
    // Main ponytail strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 0,
      meshPartVertexEnd: 300,
      ...HAIR_PRESETS.PONYTAIL
    },
    // Flyaway left
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 300,
      meshPartVertexEnd: 350,
      ...HAIR_PRESETS.MEDIUM_HAIR
    },
    // Flyaway right
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 350,
      meshPartVertexEnd: 400,
      ...HAIR_PRESETS.MEDIUM_HAIR
    }
  ] as HairStrandConfig[],

  /**
   * Character with very long voluminous hair
   * Multiple strands for rich simulation
   */
  LONG_VOLUMINOUS: [
    // Front-left
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 0,
      meshPartVertexEnd: 180,
      ...HAIR_PRESETS.VERY_LONG_VOLUMINOUS
    },
    // Front-right
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 180,
      meshPartVertexEnd: 360,
      ...HAIR_PRESETS.VERY_LONG_VOLUMINOUS
    },
    // Side-left
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 360,
      meshPartVertexEnd: 520,
      ...HAIR_PRESETS.VERY_LONG_VOLUMINOUS
    },
    // Side-right
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 520,
      meshPartVertexEnd: 680,
      ...HAIR_PRESETS.VERY_LONG_VOLUMINOUS
    },
    // Back-center
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 680,
      meshPartVertexEnd: 900,
      ...HAIR_PRESETS.VERY_LONG_VOLUMINOUS
    }
  ] as HairStrandConfig[],

  /**
   * Character with twin tails/pigtails
   */
  TWIN_TAILS: [
    // Left tail
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 0,
      meshPartVertexEnd: 240,
      ...HAIR_PRESETS.TWIN_TAILS
    },
    // Right tail
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 240,
      meshPartVertexEnd: 480,
      ...HAIR_PRESETS.TWIN_TAILS
    },
    // Center front strand
    {
      rootBoneName: 'Armature.Head',
      meshPartVertexStart: 480,
      meshPartVertexEnd: 530,
      ...HAIR_PRESETS.MEDIUM_HAIR
    }
  ] as HairStrandConfig[]
};

/**
 * Wind effect presets for different scenarios
 */
export const WIND_PRESETS = {
  /**
   * Gentle breeze
   */
  GENTLE: {
    direction: { x: 1, y: 0.1, z: 0 },
    strength: 1.5,
    description: 'Soft breeze effect'
  },

  /**
   * Medium wind
   */
  MEDIUM: {
    direction: { x: 1, y: 0, z: 0.3 },
    strength: 3.0,
    description: 'Moderate wind effect'
  },

  /**
   * Strong wind
   */
  STRONG: {
    direction: { x: 1, y: 0.2, z: 0.5 },
    strength: 6.0,
    description: 'Strong wind effect'
  },

  /**
   * Whirlwind
   */
  WHIRLWIND: {
    direction: { x: 0.7, y: 0.5, z: 0.7 },
    strength: 10.0,
    description: 'Dramatic whirlwind effect'
  },

  /**
   * Still air
   */
  STILL: {
    direction: { x: 0, y: 0, z: 0 },
    strength: 0,
    description: 'No wind'
  }
};

/**
 * Animation-to-hair-intensity mapping
 * Determines how much hair should be affected by animation speed
 */
export const ANIMATION_HAIR_INTENSITY = {
  // High-movement animations amplify hair physics
  DANCE: 1.5,
  JUMP: 1.3,
  RUN: 1.2,
  WALK: 0.8,
  IDLE: 0.3,
  COMBAT: 1.6,
  FALL: 1.4,
  LAND: 1.1,
  
  // Add more as needed
  DEFAULT: 1.0
};

/**
 * Get hair layout for an avatar based on style name
 * Falls back to FEMALE_LONG if not found
 */
export function getHairLayout(styleId: string): HairStrandConfig[] {
  const layout = (AVATAR_HAIR_LAYOUTS as any)[styleId];
  if (!layout) {
    console.warn(`Hair layout "${styleId}" not found, using FEMALE_LONG`);
    return AVATAR_HAIR_LAYOUTS.FEMALE_LONG;
  }
  return layout;
}

/**
 * Get hair physics multiplier for animation type
 */
export function getHairIntensityForAnimation(animationName: string): number {
  const intensity = Object.entries(ANIMATION_HAIR_INTENSITY).find(
    ([key]) => animationName.toLowerCase().includes(key.toLowerCase())
  );
  
  return intensity ? intensity[1] : ANIMATION_HAIR_INTENSITY.DEFAULT;
}

export type { HairStrandConfig };
