export interface EyeAnimationConfig {
  blinkInterval: number;
  blinkDuration: number;
  saccadeAmplitude: number;
  saccadeFrequency: number;
  microTremoramplitude: number;
  smoothFollowSpeed: number;
  enableBlinks: boolean;
  enableSaccades: boolean;
  enableMicroTremor: boolean;
}

export interface EyeAnimationState {
  blinkPhase: number;
  gazeOffsetX: number;
  gazeOffsetY: number;
  isBlinking: boolean;
  blinkProgress?: number;
  pupilDilation?: number;
}

export class EyeAnimationController {
  private config: EyeAnimationConfig;
  private state: EyeAnimationState;
  private lastBlinkTime: number = 0;
  private lastSaccadeTime: number = 0;
  private saccadeTargetX: number = 0;
  private saccadeTargetY: number = 0;

  constructor(config: Partial<EyeAnimationConfig> = {}) {
    this.config = { ...EYE_ANIMATION_PRESETS.natural, ...config };
    this.state = {
      blinkPhase: 0,
      gazeOffsetX: 0,
      gazeOffsetY: 0,
      isBlinking: false,
    };
  }

  update(deltaTime: number, currentTime: number): EyeAnimationState {
    if (this.config.enableBlinks) {
      this.updateBlink(deltaTime, currentTime);
    }
    if (this.config.enableSaccades) {
      this.updateSaccade(deltaTime, currentTime);
    }
    if (this.config.enableMicroTremor) {
      this.updateMicroTremor(deltaTime);
    }
    return { ...this.state };
  }

  private updateBlink(deltaTime: number, currentTime: number): void {
    const timeSinceBlink = currentTime - this.lastBlinkTime;
    if (timeSinceBlink > this.config.blinkInterval) {
      this.state.isBlinking = true;
      this.lastBlinkTime = currentTime;
    }
    if (this.state.isBlinking) {
      this.state.blinkPhase = Math.min(1, this.state.blinkPhase + deltaTime / this.config.blinkDuration);
      if (this.state.blinkPhase >= 1) {
        this.state.blinkPhase = 0;
        this.state.isBlinking = false;
      }
    }
  }

  private updateSaccade(deltaTime: number, currentTime: number): void {
    const timeSinceSaccade = currentTime - this.lastSaccadeTime;
    if (timeSinceSaccade > 1 / this.config.saccadeFrequency) {
      this.saccadeTargetX = (Math.random() - 0.5) * 2 * this.config.saccadeAmplitude;
      this.saccadeTargetY = (Math.random() - 0.5) * 2 * this.config.saccadeAmplitude;
      this.lastSaccadeTime = currentTime;
    }
    const alpha = Math.min(1, deltaTime * this.config.smoothFollowSpeed);
    this.state.gazeOffsetX += (this.saccadeTargetX - this.state.gazeOffsetX) * alpha;
    this.state.gazeOffsetY += (this.saccadeTargetY - this.state.gazeOffsetY) * alpha;
  }

  private updateMicroTremor(deltaTime: number): void {
    const amp = this.config.microTremoramplitude;
    this.state.gazeOffsetX += (Math.random() - 0.5) * amp * deltaTime;
    this.state.gazeOffsetY += (Math.random() - 0.5) * amp * deltaTime;
  }

  getBlinkValue(): number {
    const t = this.state.blinkPhase;
    return t < 0.5 ? t * 2 : (1 - t) * 2;
  }

  saccadeTo(target: { x: number; y: number; z: number }): void {
    const amplitude = this.config.saccadeAmplitude;
    this.saccadeTargetX = Math.max(-amplitude, Math.min(amplitude, target.x * 0.1));
    this.saccadeTargetY = Math.max(-amplitude, Math.min(amplitude, target.y * 0.1));
    this.lastSaccadeTime = 0;
  }

  setLightIntensity(intensity: number): void {
    const clamped = Math.max(0, Math.min(2, intensity));
    this.state.pupilDilation = 1 - clamped * 0.3;
  }

  smoothPursuit(target: { x: number; y: number; z: number }, deltaTime: number): void {
    const alpha = Math.min(1, deltaTime * this.config.smoothFollowSpeed);
    const targetX = Math.max(-this.config.saccadeAmplitude, Math.min(this.config.saccadeAmplitude, target.x * 0.05));
    const targetY = Math.max(-this.config.saccadeAmplitude, Math.min(this.config.saccadeAmplitude, target.y * 0.05));
    this.state.gazeOffsetX += (targetX - this.state.gazeOffsetX) * alpha;
    this.state.gazeOffsetY += (targetY - this.state.gazeOffsetY) * alpha;
  }

  getGazeWithMicroMovements(): { x: number; y: number; z: number } {
    const micro = this.config.microTremoramplitude;
    return {
      x: this.state.gazeOffsetX + (Math.random() - 0.5) * micro,
      y: this.state.gazeOffsetY + (Math.random() - 0.5) * micro,
      z: 1,
    };
  }

  setConfig(config: Partial<EyeAnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const EYE_ANIMATION_PRESETS: Record<string, EyeAnimationConfig> = {
  natural: {
    blinkInterval: 4.0,
    blinkDuration: 0.15,
    saccadeAmplitude: 0.02,
    saccadeFrequency: 0.5,
    microTremoramplitude: 0.001,
    smoothFollowSpeed: 8.0,
    enableBlinks: true,
    enableSaccades: true,
    enableMicroTremor: true,
  },
  portrait: {
    blinkInterval: 6.0,
    blinkDuration: 0.12,
    saccadeAmplitude: 0.01,
    saccadeFrequency: 0.3,
    microTremoramplitude: 0.0005,
    smoothFollowSpeed: 10.0,
    enableBlinks: true,
    enableSaccades: false,
    enableMicroTremor: false,
  },
  alert: {
    blinkInterval: 8.0,
    blinkDuration: 0.10,
    saccadeAmplitude: 0.03,
    saccadeFrequency: 1.0,
    microTremoramplitude: 0.002,
    smoothFollowSpeed: 15.0,
    enableBlinks: true,
    enableSaccades: true,
    enableMicroTremor: true,
  },
  relaxed: {
    blinkInterval: 3.0,
    blinkDuration: 0.20,
    saccadeAmplitude: 0.015,
    saccadeFrequency: 0.2,
    microTremoramplitude: 0.0008,
    smoothFollowSpeed: 5.0,
    enableBlinks: true,
    enableSaccades: true,
    enableMicroTremor: true,
  },
  still: {
    blinkInterval: 10.0,
    blinkDuration: 0.10,
    saccadeAmplitude: 0.0,
    saccadeFrequency: 0.0,
    microTremoramplitude: 0.0,
    smoothFollowSpeed: 20.0,
    enableBlinks: false,
    enableSaccades: false,
    enableMicroTremor: false,
  },
};
