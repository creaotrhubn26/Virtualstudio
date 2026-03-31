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
}

export const shadowAnalysisService = new ShadowAnalysisService();
export default shadowAnalysisService;
