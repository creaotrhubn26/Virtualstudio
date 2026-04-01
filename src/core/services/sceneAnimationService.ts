export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic' | 'sine' | 'quad' | 'cubic';

export interface AnimationClipConfig {
  id: string;
  name: string;
  duration: number;
  fps: number;
  loop: boolean;
  easing: EasingType;
}

export interface AnimationState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  activeClipId: string | null;
}

export const ANIMATION_PRESETS: AnimationClipConfig[] = [
  { id: 'slow-reveal', name: 'Langsom Avduking', duration: 4.0, fps: 30, loop: false, easing: 'easeOut' },
  { id: 'orbit', name: 'Orbit', duration: 8.0, fps: 30, loop: true, easing: 'linear' },
  { id: 'bounce-in', name: 'Hopp Inn', duration: 1.5, fps: 30, loop: false, easing: 'bounce' },
  { id: 'elastic-appear', name: 'Elastisk Fremtredelse', duration: 2.0, fps: 30, loop: false, easing: 'elastic' },
];

class SceneAnimationService {
  private state: AnimationState = {
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    loop: false,
    activeClipId: null,
  };

  getState(): AnimationState {
    return { ...this.state };
  }

  play(clipId?: string): void {
    this.state.isPlaying = true;
    if (clipId) this.state.activeClipId = clipId;
  }

  pause(): void {
    this.state.isPlaying = false;
  }

  stop(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
  }

  seek(time: number): void {
    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
  }

  applyPreset(presetId: string): void {
    const preset = ANIMATION_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      this.state.duration = preset.duration;
      this.state.loop = preset.loop;
      this.state.activeClipId = presetId;
    }
  }

  update(deltaTime: number): void {
    if (!this.state.isPlaying) return;
    this.state.currentTime += deltaTime;
    if (this.state.currentTime >= this.state.duration) {
      if (this.state.loop) {
        this.state.currentTime = 0;
      } else {
        this.state.currentTime = this.state.duration;
        this.state.isPlaying = false;
      }
    }
  }
}

export const sceneAnimationService = new SceneAnimationService();
export default sceneAnimationService;


export function createAnimationClip(partial: Partial<AnimationClipConfig> & { id: string; name: string }): AnimationClipConfig {
  return {
    duration: 1.0,
    fps: 30,
    loop: false,
    easing: 'linear',
    ...partial,
  };
}
