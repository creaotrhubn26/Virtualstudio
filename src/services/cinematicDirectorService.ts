import * as BABYLON from '@babylonjs/core';

export interface CinematicShot {
  id: string;
  name: string;
  description: string;
  duration: number;
  icon: string;
  category: 'establishing' | 'movement' | 'dramatic' | 'character' | 'product';
  sceneTypes: string[];
}

export interface CinematicState {
  isPlaying: boolean;
  currentShotId: string | null;
  progress: number;
}

export type CinematicStateCallback = (state: CinematicState) => void;

const SHOTS: CinematicShot[] = [
  // ─── Universal ──────────────────────────────────────────────────────────
  {
    id: 'orbit-slow',
    name: 'Sakte orbit',
    description: 'Kameraet roterer sakte 360° rundt motivet',
    duration: 12,
    icon: '🔄',
    category: 'movement',
    sceneTypes: ['all'],
  },
  {
    id: 'push-in',
    name: 'Slow push in',
    description: 'Klassisk innzooming mot motivet',
    duration: 6,
    icon: '➡️',
    category: 'establishing',
    sceneTypes: ['all'],
  },
  {
    id: 'pull-back-reveal',
    name: 'Pull-back reveal',
    description: 'Starter nært, trekker tilbake og avslører hele scenen',
    duration: 8,
    icon: '⬅️',
    category: 'establishing',
    sceneTypes: ['all'],
  },
  {
    id: 'crane-up',
    name: 'Kran-shot (opp)',
    description: 'Kameraet stiger høyt som en jib-kran og ser ned',
    duration: 7,
    icon: '🏗️',
    category: 'dramatic',
    sceneTypes: ['all'],
  },
  {
    id: 'dramatic-low-angle',
    name: 'Dramatisk lavvinkel',
    description: 'Lavt kamera-perspektiv for dramatisk effekt',
    duration: 5,
    icon: '⬇️',
    category: 'dramatic',
    sceneTypes: ['all'],
  },
  {
    id: 'tracking-side',
    name: 'Sidetracking',
    description: 'Kameraet tracker sideveis som en dolly på spor',
    duration: 8,
    icon: '↔️',
    category: 'movement',
    sceneTypes: ['all'],
  },

  // ─── Hollywood Studio ────────────────────────────────────────────────────
  {
    id: 'hw-establishing',
    name: 'Hollywood-etableringsskudd',
    description: 'Avslører hele studiomiljøet fra wide til medium shot',
    duration: 10,
    icon: '🎬',
    category: 'establishing',
    sceneTypes: ['hollywood', 'studio'],
  },
  {
    id: 'hw-camera-to-camera',
    name: 'Kamera-til-kamera',
    description: 'Panorer fra en kameraposisjon til LED-veggen og tilbake',
    duration: 9,
    icon: '🎥',
    category: 'movement',
    sceneTypes: ['hollywood', 'studio'],
  },
  {
    id: 'hw-virtual-production',
    name: 'Virtual production-shot',
    description: 'Dramatisk svingning mot LED-veggen — ILM/The Mandalorian-stil',
    duration: 7,
    icon: '🌟',
    category: 'dramatic',
    sceneTypes: ['hollywood', 'studio'],
  },

  // ─── Restaurant / Napoli ────────────────────────────────────────────────
  {
    id: 'np-romantic-reveal',
    name: 'Romantisk avslørings-pan',
    description: 'Avslører det stemningsfulle restaurantbordet',
    duration: 8,
    icon: '🕯️',
    category: 'establishing',
    sceneTypes: ['napoli', 'restaurant'],
  },
  {
    id: 'np-food-focus',
    name: 'Mat-zoom (hero shot)',
    description: 'Nær-bilde av maten, sakte innzooming',
    duration: 6,
    icon: '🍕',
    category: 'product',
    sceneTypes: ['napoli', 'restaurant'],
  },
  {
    id: 'np-outdoor-sweep',
    name: 'Piazza-panorama',
    description: 'Bred pan over utendørsplass i gylden kveldslys',
    duration: 10,
    icon: '🌅',
    category: 'establishing',
    sceneTypes: ['napoli', 'piazza'],
  },
];

type AnimatableTarget = { alpha?: number; beta?: number; radius?: number; target?: BABYLON.Vector3 };

class CinematicDirectorService {
  private activeAnimatables: BABYLON.Animatable[] = [];
  private orbitInterval: ReturnType<typeof setInterval> | null = null;
  private stateCallbacks: Set<CinematicStateCallback> = new Set();
  private currentState: CinematicState = {
    isPlaying: false,
    currentShotId: null,
    progress: 0,
  };
  private progressInterval: ReturnType<typeof setInterval> | null = null;

  getAllShots(): CinematicShot[] {
    return SHOTS;
  }

  getShotsForScene(sceneType: string): CinematicShot[] {
    return SHOTS.filter(
      (s) => s.sceneTypes.includes('all') || s.sceneTypes.includes(sceneType)
    );
  }

  onStateChange(cb: CinematicStateCallback): () => void {
    this.stateCallbacks.add(cb);
    return () => this.stateCallbacks.delete(cb);
  }

  private notify(update: Partial<CinematicState>): void {
    this.currentState = { ...this.currentState, ...update };
    this.stateCallbacks.forEach((cb) => cb(this.currentState));
  }

  getState(): CinematicState {
    return this.currentState;
  }

  stop(): void {
    this.activeAnimatables.forEach((a) => {
      try { a.stop(); } catch { /* already done */ }
    });
    this.activeAnimatables = [];
    if (this.orbitInterval) {
      clearInterval(this.orbitInterval);
      this.orbitInterval = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.notify({ isPlaying: false, currentShotId: null, progress: 0 });
  }

  playShot(shotId: string): void {
    const vs = (window as Record<string, unknown>).virtualStudio as {
      scene: BABYLON.Scene;
      camera: BABYLON.ArcRotateCamera;
    } | undefined;

    if (!vs?.scene || !vs?.camera) {
      console.warn('[CinematicDirector] No Babylon.js scene/camera available');
      return;
    }

    this.stop();

    const shot = SHOTS.find((s) => s.id === shotId);
    if (!shot) return;

    this.notify({ isPlaying: true, currentShotId: shotId, progress: 0 });

    const startAt = Date.now();
    this.progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startAt) / 1000;
      const progress = Math.min(elapsed / shot.duration, 1);
      this.notify({ progress });
      if (progress >= 1) {
        if (this.progressInterval) clearInterval(this.progressInterval);
        this.notify({ isPlaying: false, currentShotId: null, progress: 0 });
      }
    }, 100);

    this.executeShot(shotId, vs.scene, vs.camera);
  }

  private executeShot(
    shotId: string,
    scene: BABYLON.Scene,
    camera: BABYLON.ArcRotateCamera
  ): void {
    const fps = 30;
    const snap = {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone(),
    };

    const animate = (
      target: AnimatableTarget,
      property: string,
      from: number,
      to: number,
      frames: number,
      easingName: string = 'easeInOut',
      loop: boolean = false
    ): BABYLON.Animatable => {
      const easing = new BABYLON.CubicEase();
      easing.setEasingMode(
        easingName === 'easeIn'
          ? BABYLON.EasingFunction.EASINGMODE_EASEIN
          : easingName === 'easeOut'
          ? BABYLON.EasingFunction.EASINGMODE_EASEOUT
          : BABYLON.EasingFunction.EASINGMODE_EASEINOUT
      );
      const anim = BABYLON.Animation.CreateAndStartAnimation(
        `cinematic_${shotId}_${property}`,
        target,
        property,
        fps,
        frames,
        from,
        to,
        loop ? BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE : BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        easing
      );
      if (anim) this.activeAnimatables.push(anim);
      return anim!;
    };

    switch (shotId) {
      // ── Universal shots ──────────────────────────────────────────────────
      case 'orbit-slow': {
        const totalFrames = 12 * fps;
        const targetAlpha = snap.alpha + Math.PI * 2;
        animate(camera, 'alpha', snap.alpha, targetAlpha, totalFrames, 'linear', false);
        break;
      }

      case 'push-in': {
        const frames = 6 * fps;
        const closeRadius = Math.max(snap.radius * 0.35, 3.5);
        animate(camera, 'radius', snap.radius, closeRadius, frames, 'easeInOut');
        animate(camera, 'beta', snap.beta, Math.PI / 2.4, frames, 'easeInOut');
        break;
      }

      case 'pull-back-reveal': {
        const frames = 8 * fps;
        const startRadius = Math.max(snap.radius * 0.4, 4);
        camera.radius = startRadius;
        camera.beta = Math.PI / 2;
        animate(camera, 'radius', startRadius, snap.radius * 1.4, frames, 'easeOut');
        animate(camera, 'beta', Math.PI / 2, Math.PI / 3, frames, 'easeInOut');
        animate(camera, 'alpha', snap.alpha - 0.4, snap.alpha, frames, 'easeOut');
        break;
      }

      case 'crane-up': {
        const frames = 7 * fps;
        animate(camera, 'beta', snap.beta, Math.PI * 0.15, frames, 'easeInOut');
        animate(camera, 'radius', snap.radius, snap.radius * 1.2, frames, 'easeIn');
        animate(camera, 'alpha', snap.alpha, snap.alpha + 0.3, frames, 'easeInOut');
        break;
      }

      case 'dramatic-low-angle': {
        const frames = 5 * fps;
        animate(camera, 'beta', snap.beta, Math.PI * 0.72, frames, 'easeInOut');
        animate(camera, 'radius', snap.radius, snap.radius * 0.7, frames, 'easeIn');
        break;
      }

      case 'tracking-side': {
        const frames = 8 * fps;
        animate(camera, 'alpha', snap.alpha, snap.alpha + Math.PI * 0.55, frames, 'easeInOut');
        animate(camera, 'beta', snap.beta, Math.PI / 2.2, frames, 'easeInOut');
        animate(camera, 'radius', snap.radius, snap.radius * 0.9, frames, 'easeInOut');
        break;
      }

      // ── Hollywood Studio shots ────────────────────────────────────────────
      case 'hw-establishing': {
        const frames = 10 * fps;
        const wideRadius = 18;
        camera.radius = wideRadius;
        camera.beta = Math.PI / 4;
        camera.alpha = snap.alpha - Math.PI * 0.3;
        animate(camera, 'radius', wideRadius, 9, frames, 'easeOut');
        animate(camera, 'beta', Math.PI / 4, Math.PI / 2.2, frames, 'easeInOut');
        animate(camera, 'alpha', camera.alpha, snap.alpha, frames, 'easeInOut');
        break;
      }

      case 'hw-camera-to-camera': {
        const frames = 9 * fps;
        animate(camera, 'alpha', snap.alpha, snap.alpha + Math.PI * 0.7, frames, 'easeInOut');
        animate(camera, 'beta', snap.beta, Math.PI / 2.5, frames, 'easeInOut');
        animate(camera, 'radius', snap.radius, snap.radius * 0.75, frames, 'easeIn');
        break;
      }

      case 'hw-virtual-production': {
        const frames = 7 * fps;
        animate(camera, 'alpha', snap.alpha, snap.alpha + Math.PI, frames, 'easeInOut');
        animate(camera, 'beta', snap.beta, Math.PI / 2.8, frames, 'easeIn');
        animate(camera, 'radius', snap.radius, snap.radius * 1.3, frames, 'easeOut');
        break;
      }

      // ── Napoli / Restaurant shots ─────────────────────────────────────────
      case 'np-romantic-reveal': {
        const frames = 8 * fps;
        camera.alpha = snap.alpha - Math.PI * 0.5;
        camera.beta = Math.PI / 2.1;
        animate(camera, 'alpha', camera.alpha, snap.alpha, frames, 'easeOut');
        animate(camera, 'beta', Math.PI / 2.1, Math.PI / 2.5, frames, 'easeInOut');
        animate(camera, 'radius', snap.radius * 1.3, snap.radius * 0.8, frames, 'easeOut');
        break;
      }

      case 'np-food-focus': {
        const frames = 6 * fps;
        animate(camera, 'radius', snap.radius, Math.max(snap.radius * 0.3, 3), frames, 'easeInOut');
        animate(camera, 'beta', snap.beta, Math.PI / 3.5, frames, 'easeInOut');
        break;
      }

      case 'np-outdoor-sweep': {
        const frames = 10 * fps;
        animate(camera, 'alpha', snap.alpha, snap.alpha + Math.PI * 0.8, frames, 'easeInOut');
        animate(camera, 'beta', snap.beta, Math.PI / 2.8, frames, 'easeInOut');
        animate(camera, 'radius', snap.radius, snap.radius * 1.1, frames, 'easeOut');
        break;
      }

      default:
        console.warn('[CinematicDirector] Unknown shot:', shotId);
    }
  }
}

export const cinematicDirectorService = new CinematicDirectorService();

// Listen for custom events from panels/presets
window.addEventListener('ch-play-cinematic', (e: Event) => {
  const detail = (e as CustomEvent<{ shotId: string }>).detail;
  if (detail?.shotId) {
    cinematicDirectorService.playShot(detail.shotId);
  }
});

window.addEventListener('ch-stop-cinematic', () => {
  cinematicDirectorService.stop();
});
