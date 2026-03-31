export interface FacialLandmarks {
  leftEye: [number, number, number];
  rightEye: [number, number, number];
  nose: [number, number, number];
  mouthLeft: [number, number, number];
  mouthRight: [number, number, number];
  chin: [number, number, number];
  leftCheek: [number, number, number];
  rightCheek: [number, number, number];
  leftEyebrow: [number, number, number];
  rightEyebrow: [number, number, number];
}

export interface BlendShapeWeights {
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;
  eyeWideLeft: number;
  eyeWideRight: number;
  browDownLeft: number;
  browDownRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;
  jawOpen: number;
  jawLeft: number;
  jawRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  mouthPucker: number;
  mouthShrugLower: number;
  mouthShrugUpper: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
  noseSneerLeft: number;
  noseSneerRight: number;
  tongueOut: number;
}

export interface FaceShape {
  jawWidth: number;
  foreheadHeight: number;
  cheekboneWidth: number;
  chinPointedness: number;
  faceLength: number;
  symmetry: number;
}

export interface FacialFeaturesConfig {
  landmarks: Partial<FacialLandmarks>;
  blendShapes: Partial<BlendShapeWeights>;
  faceShape: Partial<FaceShape>;
  skinTone: string;
  irisColor: string;
  lipColor: string;
  eyebrowDensity: number;
  age: number;
}

export const DEFAULT_BLEND_SHAPES: BlendShapeWeights = {
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  eyeSquintLeft: 0,
  eyeSquintRight: 0,
  eyeWideLeft: 0,
  eyeWideRight: 0,
  browDownLeft: 0,
  browDownRight: 0,
  browInnerUp: 0,
  browOuterUpLeft: 0,
  browOuterUpRight: 0,
  jawOpen: 0,
  jawLeft: 0,
  jawRight: 0,
  mouthSmileLeft: 0,
  mouthSmileRight: 0,
  mouthFrownLeft: 0,
  mouthFrownRight: 0,
  mouthPucker: 0,
  mouthShrugLower: 0,
  mouthShrugUpper: 0,
  cheekSquintLeft: 0,
  cheekSquintRight: 0,
  noseSneerLeft: 0,
  noseSneerRight: 0,
  tongueOut: 0,
};

export const DEFAULT_FACE_SHAPE: FaceShape = {
  jawWidth: 0.5,
  foreheadHeight: 0.5,
  cheekboneWidth: 0.5,
  chinPointedness: 0.5,
  faceLength: 0.5,
  symmetry: 1.0,
};

export class FacialFeaturesModel {
  private config: FacialFeaturesConfig;

  constructor(config: Partial<FacialFeaturesConfig> = {}) {
    this.config = {
      landmarks: {},
      blendShapes: { ...DEFAULT_BLEND_SHAPES },
      faceShape: { ...DEFAULT_FACE_SHAPE },
      skinTone: '#FFDAB9',
      irisColor: '#3D5A80',
      lipColor: '#C27B78',
      eyebrowDensity: 0.6,
      age: 30,
      ...config,
    };
  }

  setBlendShape(key: keyof BlendShapeWeights, value: number): void {
    this.config.blendShapes[key] = Math.max(0, Math.min(1, value));
  }

  getBlendShapes(): Partial<BlendShapeWeights> {
    return { ...this.config.blendShapes };
  }

  setExpression(expression: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry'): void {
    const expressions: Record<string, Partial<BlendShapeWeights>> = {
      neutral: {},
      happy: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, cheekSquintLeft: 0.4, cheekSquintRight: 0.4 },
      sad: { mouthFrownLeft: 0.6, mouthFrownRight: 0.6, browDownLeft: 0.3, browDownRight: 0.3 },
      surprised: { jawOpen: 0.5, eyeWideLeft: 0.8, eyeWideRight: 0.8, browOuterUpLeft: 0.7, browOuterUpRight: 0.7 },
      angry: { browDownLeft: 0.8, browDownRight: 0.8, noseSneerLeft: 0.3, noseSneerRight: 0.3 },
    };
    const expr = expressions[expression] ?? {};
    this.config.blendShapes = { ...DEFAULT_BLEND_SHAPES, ...expr };
  }

  getConfig(): FacialFeaturesConfig {
    return { ...this.config };
  }
}

export const facialFeaturesModel = new FacialFeaturesModel();
export default FacialFeaturesModel;

export type FacialHairStyle = 'none' | 'stubble' | 'short-beard' | 'full-beard' | 'goatee' | 'mustache' | 'soul-patch';

export interface FacialHairOptions {
  style: FacialHairStyle;
  color: string;
  density: number;
  grayAmount: number;
  length: number;
}

export interface MakeupOptions {
  type: 'foundation' | 'blush' | 'eyeshadow' | 'lipstick' | 'eyeliner' | 'mascara';
  color: string;
  opacity: number;
}

export interface SkinDetailOptions {
  wrinkles: number;
  pores: number;
  freckles: number;
  age: number;
}

export interface FacialHairPreset {
  id: string;
  name: string;
  style: FacialHairStyle;
}

export interface MakeupItem {
  type: MakeupOptions['type'];
  color: string;
  opacity: number;
}

export interface MakeupPreset {
  id: string;
  name: string;
  items: MakeupItem[];
}

export const EXPRESSION_PRESETS: Record<string, Partial<BlendShapeWeights>> = {
  neutral: {},
  happy: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, cheekSquintLeft: 0.4, cheekSquintRight: 0.4 },
  sad: { mouthFrownLeft: 0.6, mouthFrownRight: 0.6, browDownLeft: 0.3, browDownRight: 0.3 },
  surprised: { jawOpen: 0.5, eyeWideLeft: 0.8, eyeWideRight: 0.8, browOuterUpLeft: 0.7, browOuterUpRight: 0.7 },
  angry: { browDownLeft: 0.8, browDownRight: 0.8, noseSneerLeft: 0.3, noseSneerRight: 0.3 },
  confident: { mouthSmileLeft: 0.3, mouthSmileRight: 0.3, browDownLeft: 0.1, browDownRight: 0.1 },
  serious: { browDownLeft: 0.2, browDownRight: 0.2 },
  relaxed: { mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
};

export const FACIAL_HAIR_PRESETS: FacialHairPreset[] = [
  { id: 'none', name: 'Ingen', style: 'none' },
  { id: 'stubble', name: 'Stubble', style: 'stubble' },
  { id: 'short-beard', name: 'Kort skjegg', style: 'short-beard' },
  { id: 'full-beard', name: 'Fullt skjegg', style: 'full-beard' },
  { id: 'goatee', name: 'Geitebart', style: 'goatee' },
  { id: 'mustache', name: 'Bart', style: 'mustache' },
  { id: 'soul-patch', name: 'Soul patch', style: 'soul-patch' },
];

export const MAKEUP_PRESETS: MakeupPreset[] = [
  {
    id: 'natural',
    name: 'Naturlig',
    items: [
      { type: 'foundation', color: '#f5c5a3', opacity: 0.5 },
      { type: 'blush', color: '#e8a0a0', opacity: 0.3 },
    ],
  },
  {
    id: 'evening',
    name: 'Kveld',
    items: [
      { type: 'foundation', color: '#d4956e', opacity: 0.7 },
      { type: 'eyeshadow', color: '#2d1a4e', opacity: 0.6 },
      { type: 'lipstick', color: '#8b0000', opacity: 0.9 },
      { type: 'eyeliner', color: '#000000', opacity: 0.9 },
    ],
  },
  {
    id: 'professional',
    name: 'Profesjonell',
    items: [
      { type: 'foundation', color: '#e0b090', opacity: 0.6 },
      { type: 'blush', color: '#d9967e', opacity: 0.25 },
      { type: 'lipstick', color: '#b05060', opacity: 0.7 },
    ],
  },
  {
    id: 'dramatic',
    name: 'Dramatisk',
    items: [
      { type: 'foundation', color: '#c07040', opacity: 0.8 },
      { type: 'eyeshadow', color: '#1a1a2e', opacity: 0.8 },
      { type: 'eyeliner', color: '#000000', opacity: 1 },
      { type: 'mascara', color: '#000000', opacity: 1 },
      { type: 'lipstick', color: '#cc0000', opacity: 1 },
    ],
  },
];

export function createFacialHairModel(options: FacialHairOptions): { style: FacialHairStyle; color: string; density: number } {
  return {
    style: options.style,
    color: options.color,
    density: options.density,
  };
}

export function createMakeupOverlay(items: MakeupOptions[]): { layers: MakeupOptions[] } {
  return { layers: items };
}
