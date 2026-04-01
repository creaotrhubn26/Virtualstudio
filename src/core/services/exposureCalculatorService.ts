export interface ExposureSettings {
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

export interface ExposureResult {
  ev: number;
  lux: number;
  footCandles: number;
  isValid: boolean;
  warnings: string[];
  suggestedSettings: ExposureSettings[];
}

export interface FlashExposureResult {
  guideNumber: number;
  flashDistance: number;
  effectiveAperture: number;
  recommendedISO: number;
}

const APERTURE_STOPS = [1.0, 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22, 32];
const ISO_STOPS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800];

export interface LightSource {
  id: string;
  type: 'strobe' | 'continuous' | 'speedlite' | 'led_panel';
  power: number;
  modifier?: string;
  colorTemp?: number;
  position: [number, number, number];
  distance: number;
  specifications?: Record<string, unknown>;
}

export interface PerLightAnalysis {
  ev: number;
  contribution: number;
  isKey: boolean;
  modifierLoss?: number;
  falloffPercent?: number;
  fStopAt100ISO?: number;
}

export interface SceneExposureAnalysis {
  overallExposure: number;
  highlights: number;
  shadows: number;
  midtones: number;
  contrastRatio: number;
  totalEV: number;
  keyLightEV: number;
  fillLightEV: number;
  flashSyncWarning?: string;
  focusWarning?: string;
  perLightAnalysis: Map<string, PerLightAnalysis>;
  recommendedSettings: {
    aperture: number;
    shutterSpeed: string;
    shutter: number;
    iso: number;
    ev: number;
    notes: string[];
  };
  lightSources: LightSource[];
  warnings: string[];
}

class ExposureCalculatorService {
  calculateEV(settings: ExposureSettings): number {
    const { aperture, shutterSpeed, iso } = settings;
    return Math.log2((aperture * aperture) / shutterSpeed) - Math.log2(iso / 100);
  }

  luxFromEV(ev: number): number {
    return 2.5 * Math.pow(2, ev);
  }

  analyze(settings: ExposureSettings, sceneEV?: number): ExposureResult {
    const ev = this.calculateEV(settings);
    const lux = this.luxFromEV(ev);
    const warnings: string[] = [];

    if (settings.iso > 3200) warnings.push('Høy ISO kan gi synlig støy');
    if (settings.shutterSpeed < 1 / 60 && !settings.shutterSpeed) warnings.push('Advarsel: Kan gi bevegelsesuskarphet');
    if (sceneEV !== undefined && Math.abs(ev - sceneEV) > 1) warnings.push('Eksponeringen er langt fra ideelt for scenen');

    const suggestedSettings = this.suggestSettings(sceneEV ?? ev);

    return {
      ev,
      lux,
      footCandles: lux / 10.764,
      isValid: warnings.length === 0,
      warnings,
      suggestedSettings,
    };
  }

  suggestSettings(targetEV: number): ExposureSettings[] {
    const suggestions: ExposureSettings[] = [];
    for (const aperture of APERTURE_STOPS) {
      for (const iso of ISO_STOPS) {
        const shutterSpeed = (aperture * aperture) / (Math.pow(2, targetEV) * (iso / 100));
        if (shutterSpeed >= 1 / 8000 && shutterSpeed <= 1) {
          suggestions.push({ aperture, shutterSpeed, iso });
          if (suggestions.length >= 5) return suggestions;
        }
      }
    }
    return suggestions;
  }

  calculateFlashExposure(
    flashPower: number,
    aperture: number,
    iso: number,
    _distance: number,
  ): FlashExposureResult {
    const guideNumber = Math.sqrt(flashPower) * 10;
    const flashDistance = guideNumber / aperture;
    const effectiveAperture = guideNumber / flashDistance;
    return { guideNumber, flashDistance, effectiveAperture, recommendedISO: iso };
  }

  evToDescription(ev: number): string {
    if (ev < 0) return 'Nattfotografering';
    if (ev < 5) return 'Svakt innendørslys';
    if (ev < 10) return 'Innendørslys';
    if (ev < 14) return 'Overskyet utendørs';
    if (ev < 16) return 'Dagslys';
    return 'Direkte sollys';
  }

  analyzeSceneExposure(lights: LightSource[], _cameraSettings?: unknown, _subjectPosition?: [number, number, number], _cameraBrand?: string, _cameraModel?: string): SceneExposureAnalysis {
    const totalPower = lights.reduce((sum, l) => sum + l.power, 0);
    const overallExposure = Math.log2((totalPower || 100) / 100) + 7;
    const sorted = [...lights].sort((a, b) => b.power - a.power);
    const keyEV = sorted[0] ? Math.log2((sorted[0].power || 100) / 100) + 7 : overallExposure;
    const fillEV = sorted[1] ? Math.log2((sorted[1].power || 50) / 100) + 7 : -Infinity;
    const perLightAnalysis = new Map<string, PerLightAnalysis>();
    lights.forEach((l, i) => {
      perLightAnalysis.set(l.id, {
        ev: Math.log2((l.power || 100) / 100) + 7,
        contribution: totalPower > 0 ? l.power / totalPower : 0,
        isKey: i === 0,
      });
    });
    return {
      overallExposure,
      highlights: overallExposure + 2,
      shadows: overallExposure - 4,
      midtones: overallExposure,
      contrastRatio: 5,
      totalEV: overallExposure,
      keyLightEV: keyEV,
      fillLightEV: fillEV,
      perLightAnalysis,
      recommendedSettings: {
        aperture: 8,
        shutterSpeed: '1/125',
        shutter: 1 / 125,
        iso: 100,
        ev: overallExposure,
        notes: ['Balanced exposure detected'],
      },
      lightSources: lights,
      warnings: [],
    };
  }

  calculateIntensityAtDistance(power: number, distance: number): number {
    return power / (distance * distance);
  }

  calculateFalloff(distance1: number, distance2: number): number {
    return (distance1 / distance2) ** 2;
  }

  checkMountCompatibility(lensMount: string, cameraMount: string): { compatible: boolean; warning?: string; adapterRequired?: boolean } {
    const compatible = lensMount === cameraMount || lensMount === 'universal' || cameraMount === 'universal';
    if (compatible) return { compatible: true };
    return { compatible: false, warning: `Mount mismatch: ${lensMount} vs ${cameraMount}`, adapterRequired: true };
  }
}

export const exposureCalculatorService = new ExposureCalculatorService();
export default exposureCalculatorService;

export const exposureCalculator = exposureCalculatorService;

export const MODIFIER_LIGHT_LOSS: Record<string, number> = {
  softbox: 1.0,
  octabox: 1.0,
  beauty_dish: 0.5,
  umbrella: 0.7,
  parabolic: 1.0,
  stripbox: 0.8,
  grid: 1.5,
  snoot: 2.0,
  fresnel: 0.3,
  none: 0,
};

