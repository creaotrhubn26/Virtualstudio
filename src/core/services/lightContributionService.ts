export interface LightContribution {
  lightId: string;
  lightName: string;
  relativeContribution: number;
  absoluteIntensity: number;
  color: string;
  cct: number;
  isEnabled: boolean;
}

export interface ContributionAnalysis {
  totalIntensity: number;
  contributions: LightContribution[];
  keyLightId: string | null;
  fillRatio: number;
  contrastRatio: number;
  colorTemperatureBalance: number;
}

class LightContributionService {
  analyze(lights: Array<{ id: string; name: string; intensity: number; color?: string; cct?: number; enabled?: boolean }>): ContributionAnalysis {
    const enabledLights = lights.filter((l) => l.enabled !== false);
    const totalIntensity = enabledLights.reduce((sum, l) => sum + l.intensity, 0);

    const contributions: LightContribution[] = enabledLights.map((l) => ({
      lightId: l.id,
      lightName: l.name,
      relativeContribution: totalIntensity > 0 ? l.intensity / totalIntensity : 0,
      absoluteIntensity: l.intensity,
      color: l.color ?? '#FFFFFF',
      cct: l.cct ?? 5500,
      isEnabled: l.enabled !== false,
    }));

    contributions.sort((a, b) => b.absoluteIntensity - a.absoluteIntensity);
    const keyLight = contributions[0] ?? null;
    const fillLight = contributions[1] ?? null;

    return {
      totalIntensity,
      contributions,
      keyLightId: keyLight?.lightId ?? null,
      fillRatio: keyLight && fillLight ? fillLight.absoluteIntensity / keyLight.absoluteIntensity : 0,
      contrastRatio: keyLight && fillLight ? keyLight.absoluteIntensity / Math.max(0.001, fillLight.absoluteIntensity) : 1,
      colorTemperatureBalance: enabledLights.reduce((sum, l) => sum + (l.cct ?? 5500), 0) / Math.max(1, enabledLights.length),
    };
  }

  toggleContribution(lightId: string, _lights: unknown[]): void {
    console.log(`[LightContributionService] Toggle contribution for ${lightId}`);
  }
}

export const lightContributionService = new LightContributionService();
export default lightContributionService;
