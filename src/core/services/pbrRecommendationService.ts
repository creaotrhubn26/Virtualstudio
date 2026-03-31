export interface PBRSurfaceAnalysis {
  roughness: number;
  metallic: number;
  reflectivity: number;
  subsurfaceScattering: number;
  skinTone?: string;
}

export interface PBRRecommendation {
  id: string;
  label: string;
  description: string;
  score: number;
  suggestedSettings: {
    keyLightCCT: number;
    keyLightIntensity: number;
    fillRatio: number;
    addPolarizer: boolean;
    addDiffuser: boolean;
    avoidSpecular: boolean;
  };
  materials: PBRSurfaceAnalysis;
}

class PBRRecommendationService {
  analyze(surfaces: PBRSurfaceAnalysis[]): PBRRecommendation[] {
    void surfaces;
    return [
      {
        id: 'pbr-skin',
        label: 'Hud-optimalisert Lyssetting',
        description: 'Optimal lyssetting for hudtoner med subsurface scattering',
        score: 0.88,
        suggestedSettings: {
          keyLightCCT: 5200,
          keyLightIntensity: 0.85,
          fillRatio: 0.4,
          addPolarizer: false,
          addDiffuser: true,
          avoidSpecular: false,
        },
        materials: { roughness: 0.6, metallic: 0, reflectivity: 0.3, subsurfaceScattering: 0.8 },
      },
    ];
  }
}

export const pbrRecommendationService = new PBRRecommendationService();
export default pbrRecommendationService;
