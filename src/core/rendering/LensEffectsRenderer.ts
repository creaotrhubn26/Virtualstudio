export interface LensEffectConfig {
  vignetting?: number;
  transmissionFactor?: number;
  enabled: boolean;
  chromaticAberration: number;
  vignette: number;
  distortion: number;
  flareIntensity: number;
  flareThreshold: number;
  bloomIntensity: number;
  bloomRadius: number;
  glareIntensity: number;
  ghostingIntensity: number;
}

export interface FlareSource {
  id: string;
  position: [number, number, number];
  intensity: number;
  color: string;
  size: number;
}

export const DEFAULT_LENS_EFFECTS: LensEffectConfig = {
  enabled: false,
  chromaticAberration: 0.002,
  vignette: 0.3,
  distortion: 0.01,
  flareIntensity: 0.5,
  flareThreshold: 0.8,
  bloomIntensity: 0.5,
  bloomRadius: 0.5,
  glareIntensity: 0.3,
  ghostingIntensity: 0.2,
};

class LensEffectsRenderer {
  private config: LensEffectConfig = { ...DEFAULT_LENS_EFFECTS };
  private flareSources: FlareSource[] = [];

  getConfig(): LensEffectConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<LensEffectConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  addFlareSource(source: FlareSource): void {
    this.flareSources.push(source);
  }

  removeFlareSource(id: string): void {
    this.flareSources = this.flareSources.filter((s) => s.id !== id);
  }

  clearFlareSources(): void {
    this.flareSources = [];
  }

  getFlareSources(): FlareSource[] {
    return [...this.flareSources];
  }

  update(_camera: unknown, _scene: unknown): void {
    if (!this.config.enabled) return;
  }

  dispose(): void {
    this.clearFlareSources();
  }
}

export const lensEffectsRenderer = new LensEffectsRenderer();
export default lensEffectsRenderer;

export type LensEffectsParams = LensEffectConfig;

export function lensSpecToEffects(lensSpec: { maxAperture?: number; focalLength?: number | [number, number] }): LensEffectConfig {
  const aperture = lensSpec.maxAperture ?? 2.8;
  const fl = Array.isArray(lensSpec.focalLength) ? lensSpec.focalLength[0] : (lensSpec.focalLength ?? 50);
  return {
    enabled: true,
    chromaticAberration: aperture < 2 ? 0.003 : 0.001,
    vignette: aperture < 1.8 ? 0.5 : 0.3,
    distortion: fl < 24 ? 0.02 : fl > 100 ? 0.005 : 0.01,
    flareIntensity: 0.3,
    flareThreshold: 0.8,
    bloomIntensity: 0.4,
    bloomRadius: 0.4,
    glareIntensity: 0.2,
    ghostingIntensity: 0.1,
  };
}

export function drawVignetteOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number = 0.5,
): void {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7,
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
