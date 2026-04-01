export type BodyAnimationName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'stand'
  | 'sit'
  | 'lean-left'
  | 'lean-right'
  | 'look-up'
  | 'look-down'
  | 'arms-crossed'
  | 'hands-hips'
  | 'wave'
  | 'point'
  | 'thumbs-up';

export interface BodyAnimationClip {
  name: BodyAnimationName;
  label: string;
  duration: number;
  loop: boolean;
  category: 'pose' | 'action' | 'idle';
}

export interface BodyPose {
  id: string;
  name: string;
  joints: Record<string, { x: number; y: number; z: number; w?: number }>;
  thumbnail?: string;
}

export const BODY_ANIMATION_CLIPS: BodyAnimationClip[] = [
  { name: 'idle', label: 'Idle', duration: 3.0, loop: true, category: 'idle' },
  { name: 'walk', label: 'Walk', duration: 1.2, loop: true, category: 'action' },
  { name: 'run', label: 'Run', duration: 0.8, loop: true, category: 'action' },
  { name: 'stand', label: 'Stand', duration: 0, loop: false, category: 'pose' },
  { name: 'sit', label: 'Sit', duration: 0, loop: false, category: 'pose' },
  { name: 'lean-left', label: 'Lean Left', duration: 0, loop: false, category: 'pose' },
  { name: 'lean-right', label: 'Lean Right', duration: 0, loop: false, category: 'pose' },
  { name: 'look-up', label: 'Look Up', duration: 0, loop: false, category: 'pose' },
  { name: 'look-down', label: 'Look Down', duration: 0, loop: false, category: 'pose' },
  { name: 'arms-crossed', label: 'Arms Crossed', duration: 0, loop: false, category: 'pose' },
  { name: 'hands-hips', label: 'Hands on Hips', duration: 0, loop: false, category: 'pose' },
  { name: 'wave', label: 'Wave', duration: 1.5, loop: false, category: 'action' },
  { name: 'point', label: 'Point', duration: 0, loop: false, category: 'pose' },
  { name: 'thumbs-up', label: 'Thumbs Up', duration: 0, loop: false, category: 'pose' },
];

export class BodyAnimationController {
  private currentAnimation: BodyAnimationName = 'idle';
  private blendWeight: number = 1.0;
  private time: number = 0;

  setAnimation(name: BodyAnimationName, blendDuration = 0.3): void {
    this.currentAnimation = name;
    this.time = 0;
    void blendDuration;
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
  }

  getCurrentAnimation(): BodyAnimationName {
    return this.currentAnimation;
  }

  getBlendWeight(): number {
    return this.blendWeight;
  }

  setBlendWeight(weight: number): void {
    this.blendWeight = Math.max(0, Math.min(1, weight));
  }
}

export const bodyAnimationController = new BodyAnimationController();

export type HandGesture = 'relaxed' | 'fist' | 'open' | 'pointing' | 'peace' | 'thumbsUp' | 'ok' | 'grip' | 'pinch' | 'wave';

export const HAND_PRESETS: Record<HandGesture, { label: string }> = {
  relaxed: { label: 'Avslappet' },
  fist: { label: 'Knyttneve' },
  open: { label: 'Åpen' },
  pointing: { label: 'Peker' },
  peace: { label: 'Fredstegn' },
  thumbsUp: { label: 'Tommel opp' },
  ok: { label: 'OK' },
  grip: { label: 'Grep' },
  pinch: { label: 'Klype' },
  wave: { label: 'Vinker' },
};

export const GESTURE_DEFINITIONS: Record<HandGesture, string> = {
  relaxed: 'Fingers slightly curled, natural resting position',
  fist: 'All fingers closed into a fist',
  open: 'All fingers extended and spread',
  pointing: 'Index finger extended, others curled',
  peace: 'Index and middle finger extended in V shape',
  thumbsUp: 'Thumb up, fingers curled',
  ok: 'Index and thumb form circle, others extended',
  grip: 'Fingers curled as if gripping object',
  pinch: 'Thumb and index finger pinching',
  wave: 'Fingers extended and slightly spread for waving',
};

export const HEAD_PRESETS: Record<string, { label: string; rotation: [number, number, number] }> = {
  neutral: { label: 'Nøytral', rotation: [0, 0, 0] },
  tiltLeft: { label: 'Tilt venstre', rotation: [0, 0, 15] },
  tiltRight: { label: 'Tilt høyre', rotation: [0, 0, -15] },
  lookUp: { label: 'Se opp', rotation: [-15, 0, 0] },
  lookDown: { label: 'Se ned', rotation: [10, 0, 0] },
  turnLeft: { label: 'Snu venstre', rotation: [0, -30, 0] },
  turnRight: { label: 'Snu høyre', rotation: [0, 30, 0] },
  chin: { label: 'Hake ned', rotation: [5, 0, 0] },
};

export const FULL_BODY_POSES: Record<string, { label: string }> = {
  standing: { label: 'Stående' },
  sitting: { label: 'Sittende' },
  casual: { label: 'Avslappet' },
  confident: { label: 'Selvsikker' },
  crossed_arms: { label: 'Korslagte armer' },
  hands_on_hips: { label: 'Hender på hofter' },
  leaning: { label: 'Lener seg' },
  walking: { label: 'Gående' },
};

export const BODY_ANIMATION_PRESETS = BODY_ANIMATION_CLIPS;
