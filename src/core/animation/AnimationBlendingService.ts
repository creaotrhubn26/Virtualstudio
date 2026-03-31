export interface BlendConfig {
  id: string;
  name: string;
  duration: number;
  easing: string;
  weight: number;
}

export interface CameraAnimationPreset {
  id: string;
  name: string;
  label: string;
  description: string;
  duration: number;
  keyframes: Array<{ time: number; position: [number, number, number]; target: [number, number, number] }>;
}

export interface LightAnimationPreset {
  id: string;
  name: string;
  label: string;
  description: string;
  duration: number;
  keyframes: Array<{ time: number; intensity: number; color?: string; cct?: number }>;
}

export const CAMERA_ANIMATION_PRESETS: CameraAnimationPreset[] = [
  {
    id: 'slow-push-in',
    name: 'slow-push-in',
    label: 'Langsom Push Inn',
    description: 'Langsom kamerabevegelse inn mot motivet',
    duration: 5.0,
    keyframes: [
      { time: 0, position: [0, 1.6, 5], target: [0, 1.4, 0] },
      { time: 5, position: [0, 1.6, 2], target: [0, 1.4, 0] },
    ],
  },
  {
    id: 'orbit-subject',
    name: 'orbit-subject',
    label: 'Orbit Rundt Motiv',
    description: 'Kamera sirkler rundt motivet',
    duration: 8.0,
    keyframes: [
      { time: 0, position: [3, 1.6, 0], target: [0, 1.4, 0] },
      { time: 2, position: [0, 1.6, 3], target: [0, 1.4, 0] },
      { time: 4, position: [-3, 1.6, 0], target: [0, 1.4, 0] },
      { time: 6, position: [0, 1.6, -3], target: [0, 1.4, 0] },
      { time: 8, position: [3, 1.6, 0], target: [0, 1.4, 0] },
    ],
  },
  {
    id: 'crane-up',
    name: 'crane-up',
    label: 'Kran Opp',
    description: 'Kamera beveger seg oppover som en kran',
    duration: 4.0,
    keyframes: [
      { time: 0, position: [0, 0.5, 3], target: [0, 1.0, 0] },
      { time: 4, position: [0, 4.0, 3], target: [0, 1.4, 0] },
    ],
  },
];

export const LIGHT_ANIMATION_PRESETS: LightAnimationPreset[] = [
  {
    id: 'sunrise',
    name: 'sunrise',
    label: 'Soloppgang',
    description: 'Lyset simulerer en soloppgang',
    duration: 10.0,
    keyframes: [
      { time: 0, intensity: 0.1, cct: 2200 },
      { time: 3, intensity: 0.4, cct: 3000 },
      { time: 6, intensity: 0.8, cct: 4000 },
      { time: 10, intensity: 1.0, cct: 5500 },
    ],
  },
  {
    id: 'heartbeat-flash',
    name: 'heartbeat-flash',
    label: 'Hjerteslag Blitz',
    description: 'Lyset pulserer som et hjerteslag',
    duration: 2.0,
    keyframes: [
      { time: 0.0, intensity: 1.0 },
      { time: 0.1, intensity: 0.2 },
      { time: 0.3, intensity: 0.9 },
      { time: 0.4, intensity: 0.2 },
      { time: 2.0, intensity: 1.0 },
    ],
  },
  {
    id: 'color-cycle',
    name: 'color-cycle',
    label: 'Farge Syklus',
    description: 'Lyset sykler gjennom farger',
    duration: 6.0,
    keyframes: [
      { time: 0, intensity: 1.0, color: '#ff0000' },
      { time: 2, intensity: 1.0, color: '#00ff00' },
      { time: 4, intensity: 1.0, color: '#0000ff' },
      { time: 6, intensity: 1.0, color: '#ff0000' },
    ],
  },
];

class AnimationBlendingService {
  blend(fromWeight: number, toWeight: number, alpha: number): number {
    return fromWeight + (toWeight - fromWeight) * alpha;
  }

  crossFade(clipA: string, clipB: string, duration: number): BlendConfig {
    return { id: `${clipA}-to-${clipB}`, name: `${clipA} → ${clipB}`, duration, easing: 'easeInOut', weight: 0 };
  }
}

export const animationBlendingService = new AnimationBlendingService();
export default animationBlendingService;
