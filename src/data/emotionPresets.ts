/**
 * Emotion Material Presets
 * Facial expression-driven material changes for realistic emotional responses
 */

import * as BABYLON from '@babylonjs/core';

export interface EmotionPreset {
  name: string;
  skin?: {
    albedoTint?: BABYLON.Color3;
    roughnessShift?: number;
    sssShift?: number;
  };
  eyes?: {
    roughnessShift?: number;
    clearcoatShift?: number;
    albedoTint?: BABYLON.Color3;
  };
  lips?: {
    roughnessShift?: number;
    clearcoatShift?: number;
    albedoTint?: BABYLON.Color3;
  };
}

/**
 * Material presets for different emotional states
 * Applied based on blend shape weights from facial animations
 */
export const EMOTION_MATERIAL_PRESETS: Record<string, EmotionPreset> = {
  happy: {
    name: 'Happy',
    skin: {
      albedoTint: new BABYLON.Color3(1.02, 0.99, 0.98),  // Warm, healthy glow
      sssShift: 0.05,                                     // Increased translucency
      roughnessShift: -0.08                               // Slightly glossier
    },
    lips: {
      roughnessShift: -0.1,                               // Glossier lips
      clearcoatShift: 0.15,                               // More wetness
      albedoTint: new BABYLON.Color3(1.05, 0.85, 0.88)   // Pinker tint
    },
    eyes: {
      roughnessShift: -0.05,                              // Sharper sparkle
      clearcoatShift: 0.05                                // Slight wetness
    }
  },

  sad: {
    name: 'Sad',
    skin: {
      albedoTint: new BABYLON.Color3(0.98, 0.98, 1.02),  // Cooler, paler tone
      sssShift: -0.1,                                     // Reduced translucency (pale)
      roughnessShift: 0.05                                // Slightly duller
    },
    eyes: {
      roughnessShift: -0.1,                               // Wet appearance
      clearcoatShift: 0.4,                                // Tears/extreme wetness
      albedoTint: new BABYLON.Color3(0.95, 0.95, 1.0)    // Slightly blue-ish (tear color)
    },
    lips: {
      roughnessShift: 0.1,                                // Drier lips
      clearcoatShift: -0.1                                // Less glossy
    }
  },

  angry: {
    name: 'Angry',
    skin: {
      albedoTint: new BABYLON.Color3(1.1, 0.88, 0.85),   // Very red, flushed
      sssShift: 0.15,                                     // Strong blood flow glow
      roughnessShift: -0.1                                // Intense, glossy appearance
    },
    eyes: {
      roughnessShift: -0.08,                              // Sharp, intense look
      albedoTint: new BABYLON.Color3(1.0, 0.92, 0.9)     // Reddened whites of eyes
    },
    lips: {
      albedoTint: new BABYLON.Color3(1.08, 0.8, 0.82),   // Darker, angrier red
      roughnessShift: -0.05
    }
  },

  surprised: {
    name: 'Surprised',
    skin: {
      albedoTint: new BABYLON.Color3(1.01, 1.0, 1.0),    // Neutral bright
      sssShift: 0.1,                                      // Increased glow (adrenaline)
      roughnessShift: -0.05                               // Slightly glossier
    },
    eyes: {
      roughnessShift: -0.15,                              // Very sharp, wide
      clearcoatShift: 0.25,                               // Wide-eyed wetness
      albedoTint: new BABYLON.Color3(1.05, 1.05, 1.05)   // Brighter
    },
    lips: {
      roughnessShift: 0.1                                 // Slightly parted/drier
    }
  },

  confused: {
    name: 'Confused',
    skin: {
      albedoTint: new BABYLON.Color3(0.99, 0.99, 1.0),   // Neutral, slightly cool
      sssShift: 0.0,
      roughnessShift: 0.0                                 // No change
    },
    eyes: {
      roughnessShift: 0.05,                               // Less focused
      clearcoatShift: 0.0
    }
  },

  fearful: {
    name: 'Fearful',
    skin: {
      albedoTint: new BABYLON.Color3(0.95, 0.95, 1.05),  // Pale, cool blue-ish
      sssShift: 0.2,                                      // Blood rushes (adrenaline)
      roughnessShift: -0.15                               // Sweaty appearance
    },
    eyes: {
      roughnessShift: -0.2,                               // Very sharp, alert
      clearcoatShift: 0.35,                               // Frightened eyes (wet)
      albedoTint: new BABYLON.Color3(0.92, 0.92, 1.0)    // Slightly white
    }
  },

  neutral: {
    name: 'Neutral',
    skin: {
      albedoTint: new BABYLON.Color3(1.0, 1.0, 1.0),     // No tint
      sssShift: 0.0,
      roughnessShift: 0.0
    },
    eyes: {
      roughnessShift: 0.0,
      clearcoatShift: 0.0
    },
    lips: {
      roughnessShift: 0.0,
      clearcoatShift: 0.0
    }
  }
};

/**
 * Blend shape to emotion mapping
 * Helps identify emotional state from blend shape weights
 */
export const BLENDSHAPE_EMOTION_MAPPING = {
  // Smile-related
  'smile': { primary: 'happy', secondary: 'surprised', weight: 0.7 },
  'mouthSmile': { primary: 'happy', secondary: 'neutral', weight: 0.8 },
  'cheekRaise': { primary: 'happy', secondary: 'neutral', weight: 0.6 },

  // Frown-related
  'mouthFrown': { primary: 'sad', secondary: 'angry', weight: 0.6 },
  'mouthFrown_L': { primary: 'sad', secondary: 'angry', weight: 0.6 },
  'mouthFrown_R': { primary: 'sad', secondary: 'angry', weight: 0.6 },

  // Brow furrow (anger)
  'browFurrow': { primary: 'angry', secondary: 'fearful', weight: 0.8 },
  'browDownLeft': { primary: 'angry', secondary: 'neutral', weight: 0.5 },
  'browDownRight': { primary: 'angry', secondary: 'neutral', weight: 0.5 },

  // Brow raise (surprise)
  'browRaise': { primary: 'surprised', secondary: 'fearful', weight: 0.7 },
  'browRaiseLeft': { primary: 'surprised', secondary: 'fearful', weight: 0.6 },
  'browRaiseRight': { primary: 'surprised', secondary: 'fearful', weight: 0.6 },

  // Eye related
  'eyeWide': { primary: 'surprised', secondary: 'fearful', weight: 0.8 },
  'eyeSquintLeft': { primary: 'happy', secondary: 'neutral', weight: 0.5 },
  'eyeSquintRight': { primary: 'happy', secondary: 'neutral', weight: 0.5 },

  // Mouth open (surprise/fear)
  'mouthOpen': { primary: 'surprised', secondary: 'fearful', weight: 0.7 },
  'mouthWide': { primary: 'surprised', secondary: 'happy', weight: 0.6 },

  // Nostril flare (anger)
  'nostrilFlare': { primary: 'angry', secondary: 'fearful', weight: 0.6 },

  // Jaw clench (anger)
  'jawClench': { primary: 'angry', secondary: 'fearful', weight: 0.7 },

  // Blink/eye close
  'eyeBlinkLeft': { primary: 'neutral', secondary: 'neutral', weight: 0.2 },
  'eyeBlinkRight': { primary: 'neutral', secondary: 'neutral', weight: 0.2 },
};

/**
 * Determine emotion from blend shape weights
 * Analyzes active blend shapes and returns dominant emotion
 */
export function detectEmotionFromBlendShapes(
  blendShapeWeights: Map<string, number>,
  threshold: number = 0.3
): { emotion: string; confidence: number } {
  const emotionScores: Map<string, number> = new Map();
  let totalWeight = 0;

  // Accumulate emotion scores from active blend shapes
  blendShapeWeights.forEach((weight, blendShapeName) => {
    if (weight < threshold) return;

    const mapping = BLENDSHAPE_EMOTION_MAPPING[blendShapeName as keyof typeof BLENDSHAPE_EMOTION_MAPPING];
    if (!mapping) return;

    const primaryScore = (emotionScores.get(mapping.primary) || 0) + (weight * mapping.weight);
    emotionScores.set(mapping.primary, primaryScore);

    if (mapping.secondary) {
      const secondaryScore = (emotionScores.get(mapping.secondary) || 0) + (weight * (mapping.weight * 0.5));
      emotionScores.set(mapping.secondary, secondaryScore);
    }

    totalWeight += weight;
  });

  // Find dominant emotion
  let dominantEmotion = 'neutral';
  let maxScore = 0;

  emotionScores.forEach((score, emotion) => {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  });

  // Calculate confidence (0-1)
  const confidence = totalWeight > 0 ? Math.min(1.0, maxScore / totalWeight) : 0;

  return { emotion: dominantEmotion, confidence };
}

/**
 * Get a blend of emotions based on blend shape analysis
 * Returns multiple emotions with weights for more nuanced expression
 */
export function blendEmotionsFromShapes(
  blendShapeWeights: Map<string, number>,
  threshold: number = 0.2
): Map<string, number> {
  const emotionBlends: Map<string, number> = new Map();

  blendShapeWeights.forEach((weight, blendShapeName) => {
    if (weight < threshold) return;

    const mapping = BLENDSHAPE_EMOTION_MAPPING[blendShapeName as keyof typeof BLENDSHAPE_EMOTION_MAPPING];
    if (!mapping) return;

    // Add primary emotion
    const primaryScore = (emotionBlends.get(mapping.primary) || 0) + (weight * mapping.weight);
    emotionBlends.set(mapping.primary, primaryScore);

    // Add secondary emotion with lower weight
    if (mapping.secondary) {
      const secondaryScore = (emotionBlends.get(mapping.secondary) || 0) + (weight * (mapping.weight * 0.3));
      emotionBlends.set(mapping.secondary, secondaryScore);
    }
  });

  // Normalize to 0-1 range
  let maxScore = 0;
  emotionBlends.forEach(score => {
    maxScore = Math.max(maxScore, score);
  });

  if (maxScore > 0) {
    const normalized: Map<string, number> = new Map();
    emotionBlends.forEach((score, emotion) => {
      normalized.set(emotion, Math.min(1.0, score / maxScore));
    });
    return normalized;
  }

  return emotionBlends;
}
