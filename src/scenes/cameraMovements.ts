/**
 * Cinematic camera movements for any Babylon ArcRotateCamera.
 *
 * The Scene Director emits `shot.movement` ∈
 *   "static" | "pan" | "tilt" | "dolly-in" | "dolly-out" |
 *   "tracking" | "handheld"
 *
 * This module turns that string into a real animation on the camera.
 * Pure utility — works on the studio scene's camera and on the
 * LocationScene's camera identically. Keep it free of imports beyond
 * @babylonjs/core so the studio side can pick it up later without
 * pulling in tile-renderer dependencies.
 *
 * Behaviour rationale
 * -------------------
 *  • static    — no animation. The default / safety net.
 *  • pan       — slow horizontal arc (alpha sweep). 10° in 6s feels
 *                cinematic; faster reads as "search", slower as
 *                "establishing".
 *  • tilt      — same but on beta. Common for "reveal" shots.
 *  • dolly-in  — radius shrinks 25% over 8s. Push-in feel.
 *  • dolly-out — radius grows 25% over 8s. Pull-back reveal.
 *  • tracking  — a slow lateral pan combined with a gentle radius
 *                drift, mimicking a Steadicam following a subject.
 *                Real subject-tracking would lock onto a moving mesh;
 *                MVP is a 12s slow arc to give "moving with the action".
 *  • handheld  — per-frame Perlin-ish noise on alpha/beta/radius
 *                producing the natural micro-jitter of an operator's
 *                shoulder. Small amplitude — visible motion without
 *                seasickness. Action / chase scenes set this.
 *
 * All non-static movements run on a loop so the operator sees the
 * effect across multiple takes; loops are cancellable via the returned
 * disposer when the operator re-applies a different ShotPlan.
 */

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Scene } from '@babylonjs/core/scene';
import { Animation } from '@babylonjs/core/Animations/animation';
import { CubicEase, EasingFunction } from '@babylonjs/core/Animations/easing';
import { Observer } from '@babylonjs/core/Misc/observable';

export type ShotMovement =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly-in'
  | 'dolly-out'
  | 'tracking'
  | 'handheld';

export interface MovementOptions {
  /** Frames-per-second baseline for property animations. Default 60. */
  fps?: number;
  /**
   * Animation duration in seconds. Defaults are tuned per movement
   * (pan/tilt 6s, dolly 8s, tracking 12s) — pass to override.
   */
  durationSec?: number;
  /**
   * Handheld jitter amplitude scalar (0..1). Default 1.0 = "documentary
   * camera". 0.4 = subtle. 2+ = "ow my eyes".
   */
  handheldAmplitude?: number;
}

export interface MovementHandle {
  /** Cancel the animation + restore camera to its pre-movement state. */
  dispose: () => void;
}

/**
 * Apply the requested movement to an ArcRotateCamera. Returns a handle
 * so the caller can cancel before applying a different movement.
 *
 * If the camera was animating already (from a previous applyMovement
 * call) the caller should dispose that handle first — this function
 * does NOT auto-cancel prior animations because it has no reference
 * to them; that's the calling layer's responsibility.
 */
export function applyMovement(
  scene: Scene,
  camera: ArcRotateCamera,
  movement: ShotMovement,
  opts: MovementOptions = {},
): MovementHandle {
  const fps = opts.fps ?? 60;

  // Snapshot the start values so we can both build animations from
  // them and restore them when disposed.
  const startAlpha = camera.alpha;
  const startBeta = camera.beta;
  const startRadius = camera.radius;

  let frameObserver: Observer<Scene> | null = null;
  const ownedAnimatables: Array<{ stop: () => void }> = [];
  const cleanup: Array<() => void> = [];

  const ease = new CubicEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

  /**
   * Helper to start a tween animation on a numeric camera property,
   * looping back to start (yoyo) so the movement keeps being visible
   * during the operator's preview session.
   */
  function tween(
    property: 'alpha' | 'beta' | 'radius',
    fromValue: number,
    toValue: number,
    durationSec: number,
  ): void {
    const totalFrames = Math.max(1, Math.round(durationSec * fps));
    const anim = new Animation(
      `mv_${property}`,
      property,
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    // Yoyo (back and forth) so a "pan right" continuously sweeps R→L→R
    // — the operator sees the movement repeating through the preview.
    anim.setKeys([
      { frame: 0, value: fromValue },
      { frame: totalFrames / 2, value: toValue },
      { frame: totalFrames, value: fromValue },
    ]);
    anim.setEasingFunction(ease);
    const animatable = scene.beginDirectAnimation(
      camera,
      [anim],
      0,
      totalFrames,
      true, // loop
    );
    ownedAnimatables.push({ stop: () => animatable.stop() });
  }

  switch (movement) {
    case 'static':
      // Intentional no-op. Keep the function returning a handle so
      // the caller's lifecycle is uniform.
      break;

    case 'pan': {
      const dur = opts.durationSec ?? 6;
      // 10° sweep in alpha (orbit angle around Y).
      tween('alpha', startAlpha, startAlpha + (Math.PI * 10) / 180, dur);
      break;
    }

    case 'tilt': {
      const dur = opts.durationSec ?? 6;
      // 6° sweep in beta. Smaller because beta has a tighter natural
      // range (Babylon clamps inside [0.01, π−0.01]).
      const delta = (Math.PI * 6) / 180;
      const target = Math.min(Math.PI - 0.05, startBeta + delta);
      tween('beta', startBeta, target, dur);
      break;
    }

    case 'dolly-in': {
      const dur = opts.durationSec ?? 8;
      // Push-in: -25% radius. Don't go below 5m so we never clip
      // through the subject.
      const target = Math.max(5, startRadius * 0.75);
      tween('radius', startRadius, target, dur);
      break;
    }

    case 'dolly-out': {
      const dur = opts.durationSec ?? 8;
      const target = startRadius * 1.3;
      tween('radius', startRadius, target, dur);
      break;
    }

    case 'tracking': {
      const dur = opts.durationSec ?? 12;
      // Tracking = lateral arc + a touch of radius drift. The arc is
      // wider than `pan` because tracking shots tend to cover more
      // ground; the radius drift sells the operator following the
      // subject (not just rotating around them).
      tween('alpha', startAlpha, startAlpha + (Math.PI * 18) / 180, dur);
      tween('radius', startRadius, startRadius * 0.92, dur);
      break;
    }

    case 'handheld': {
      // Documentary handheld jitter. Multi-frequency sin/cos for
      // anti-coherent wobble (single sine reads "rocking", multiple
      // out-of-phase sines read "human"). Amplitude is small — what
      // looks subtle on screen is actually quite a lot in numbers.
      const amp = opts.handheldAmplitude ?? 1.0;
      const alphaAmp = (Math.PI * 0.5) / 180 * amp;   // ±0.5°
      const betaAmp = (Math.PI * 0.4) / 180 * amp;    // ±0.4°
      const radiusAmp = startRadius * 0.005 * amp;    // ±0.5%
      const t0 = performance.now() / 1000;
      frameObserver = scene.onBeforeRenderObservable.add(() => {
        const t = performance.now() / 1000 - t0;
        // Three multi-frequency components per axis for organic feel.
        camera.alpha =
          startAlpha +
          alphaAmp *
            (Math.sin(t * 1.7) +
              Math.sin(t * 3.1 + 0.7) * 0.5 +
              Math.sin(t * 5.9 + 1.3) * 0.25) /
            1.75;
        camera.beta =
          startBeta +
          betaAmp *
            (Math.sin(t * 2.3 + 0.5) +
              Math.sin(t * 4.7 + 1.1) * 0.5 +
              Math.sin(t * 7.3 + 2.0) * 0.25) /
            1.75;
        camera.radius =
          startRadius +
          radiusAmp *
            (Math.sin(t * 0.9) + Math.sin(t * 2.1 + 1.4) * 0.5);
      });
      break;
    }
  }

  cleanup.push(() => {
    for (const a of ownedAnimatables) {
      try {
        a.stop();
      } catch {
        /* noop */
      }
    }
    if (frameObserver) {
      scene.onBeforeRenderObservable.remove(frameObserver);
      frameObserver = null;
    }
    // Restore camera to its pre-movement state. Skip if the operator
    // was already mid-animation when we entered (we'd just snap them
    // back); the snapshot at the top of this function is the source
    // of truth.
    camera.alpha = startAlpha;
    camera.beta = startBeta;
    camera.radius = startRadius;
  });

  return {
    dispose() {
      while (cleanup.length) {
        const fn = cleanup.shift();
        try {
          fn?.();
        } catch {
          /* noop */
        }
      }
    },
  };
}
