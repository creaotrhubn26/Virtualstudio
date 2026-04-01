import type { SceneNode } from '@/core/models/scene';

export interface LightContribution {
  lightId: string;
  lightName: string;
  relativeContribution: number;
  absoluteIntensity: number;
  color: string;
  cct: number;
  isEnabled: boolean;
  role?: string;
  power?: number;
}

export interface ContributionAnalysis {
  totalIntensity: number;
  contributions: LightContribution[];
  lights: LightContribution[];
  keyLightId: string | null;
  dominantLight: string | null;
  fillRatio: number;
  contrastRatio: number;
  colorTemperatureBalance: number;
  balance: 'good' | 'unbalanced' | 'single-source';
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
    const fillRatio = keyLight && fillLight ? fillLight.absoluteIntensity / keyLight.absoluteIntensity : 0;
    const balanceScore = fillRatio > 0 ? Math.min(1, fillRatio * 2) : 0;
    const balance: 'good' | 'unbalanced' | 'single-source' = contributions.length <= 1
      ? 'single-source'
      : balanceScore >= 0.5
        ? 'good'
        : 'unbalanced';

    return {
      totalIntensity,
      contributions,
      lights: contributions,
      keyLightId: keyLight?.lightId ?? null,
      dominantLight: keyLight?.lightId ?? null,
      fillRatio,
      contrastRatio: keyLight && fillLight ? keyLight.absoluteIntensity / Math.max(0.001, fillLight.absoluteIntensity) : 1,
      colorTemperatureBalance: enabledLights.reduce((sum, l) => sum + (l.cct ?? 5500), 0) / Math.max(1, enabledLights.length),
      balance,
    };
  }

  analyzeLights(nodes: Array<{ id: string; type: string; name?: string; visible?: boolean; light?: { power?: number; cct?: number } }>): ContributionAnalysis {
    const lights = nodes
      .filter((n) => n.type === 'light')
      .map((n) => ({
        id: n.id,
        name: n.name ?? n.id,
        intensity: n.light?.power ?? 0.5,
        enabled: n.visible !== false,
      }));
    return this.analyze(lights);
  }

  getContributionPercentage(lightId: string, analysis: ContributionAnalysis): number {
    const contribution = analysis.contributions.find((c) => c.lightId === lightId);
    return contribution ? Math.round(contribution.relativeContribution * 100) : 0;
  }

  toggleContribution(lightId: string, _lights: unknown[]): void {
    console.log(`[LightContributionService] Toggle contribution for ${lightId}`);
  }

  toggleLight(lightId: string, enabled: boolean): void {
    console.log(`[LightContributionService] Toggle light ${lightId} -> ${enabled}`);
  }

  soloLight(lightId: string): void {
    console.log(`[LightContributionService] Solo light ${lightId}`);
  }

  enableAllLights(): void {
    console.log('[LightContributionService] Enable all lights');
  }
}

export const lightContributionService = new LightContributionService();
export default lightContributionService;
