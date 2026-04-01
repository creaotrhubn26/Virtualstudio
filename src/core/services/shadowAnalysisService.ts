export interface ShadowInfo {
  id: string;
  lightId?: string;
  position: [number, number, number];
  size: [number, number];
  darkness: number;
  sharpness: number;
  direction?: [number, number, number];
  color?: string;
  intensity?: number;
  softness?: number;
}

export interface HighlightInfo {
  id: string;
  lightId?: string;
  position: [number, number, number];
  size: [number, number];
  brightness: number;
  hotspot: boolean;
  isClipping?: boolean;
}

export interface ShadowRegion {
  id: string;
  lightId: string;
  position: [number, number, number];
  size: [number, number];
  darkness: number;
  sharpness: number;
  direction: [number, number, number];
}

export interface ShadowAnalysis {
  totalShadowCoverage: number;
  shadowRegions: ShadowRegion[];
  underexposedAreas: number;
  overexposedAreas: number;
  contrastRatio: number;
  recommendations: string[];
  totalHighlightIntensity?: number;
  hasClipping?: boolean;
}

class ShadowAnalysisService {
  analyze(_sceneData: unknown): ShadowAnalysis {
    return {
      totalShadowCoverage: 0.25,
      shadowRegions: [],
      underexposedAreas: 0.1,
      overexposedAreas: 0.05,
      contrastRatio: 4.5,
      recommendations: [
        'Vurder å legge til et fyllys for å redusere kontrastforholdet',
        'Hårlyset kan bli sterkere for å skille motivet fra bakgrunnen',
      ],
    };
  }

  getHardShadowScore(_analysis: ShadowAnalysis): number {
    return 0.3;
  }

  getSoftShadowScore(_analysis: ShadowAnalysis): number {
    return 0.7;
  }

  analyzeScene(_nodes: unknown[], _center: [number, number, number]): ShadowAnalysis {
    return {
      totalShadowCoverage: 0,
      shadowRegions: [],
      underexposedAreas: 0,
      overexposedAreas: 0,
      contrastRatio: 1,
      recommendations: [],
    };
  }

  async analyzeShadowsWithSAM2(_imageUrl: string): Promise<Array<{ bbox: [number, number, number, number]; quality: number }>> {
    return [];
  }
}

export const shadowAnalysisService = new ShadowAnalysisService();
export default shadowAnalysisService;
