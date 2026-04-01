export interface PBRSurfaceAnalysis {
  roughness: number;
  metallic: number;
  reflectivity: number;
  subsurfaceScattering: number;
  skinTone?: string;
}

export interface PBRItem {
  id: string;
  name: string;
  nameNo: string;
  description: string;
  category: 'essential' | 'recommended' | 'optional' | 'atmosphere';
  type?: string;
  price?: number;
  thumbnailUrl?: string;
  material?: { roughness?: number; metalness?: number };
}

export interface PBRRecommendation {
  id: string;
  name?: string;
  label: string;
  description: string;
  reason?: string;
  score: number;
  category?: 'essential' | 'recommended' | 'optional' | 'atmosphere';
  items?: PBRItem[];
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

export interface CharacterContext {
  name: string;
  tags?: string[];
  genre?: string;
  mood?: string;
  skinTone?: string;
}

export interface HDRIContext {
  id: string;
  name?: string;
  category?: string;
}

export function getPBRRecommendations(
  character: CharacterContext,
  hdri?: HDRIContext
): PBRRecommendation[] {
  void character;
  void hdri;
  return [
    {
      id: 'essential-bundle',
      label: 'Essensielle modifikatorer',
      description: 'Nødvendig utstyr for profesjonell portrettfotografering',
      score: 0.95,
      category: 'essential',
      items: [
        {
          id: 'diffuser-large',
          name: 'Large Diffuser',
          nameNo: 'Stor diffuser',
          description: 'Mykgjør lyset for jevnt, flatterende lys',
          category: 'essential',
        },
        {
          id: 'reflector-silver',
          name: 'Silver Reflector',
          nameNo: 'Sølvreflektor',
          description: 'Fyller inn skygger fra siden',
          category: 'essential',
        },
      ],
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
    {
      id: 'recommended-bundle',
      label: 'Anbefalte tillegg',
      description: 'Forbedrer kvaliteten ytterligere',
      score: 0.78,
      category: 'recommended',
      items: [
        {
          id: 'beauty-dish',
          name: 'Beauty Dish',
          nameNo: 'Beauty dish',
          description: 'Klassisk glamourlys med myk kant',
          category: 'recommended',
        },
      ],
      suggestedSettings: {
        keyLightCCT: 5500,
        keyLightIntensity: 0.75,
        fillRatio: 0.35,
        addPolarizer: true,
        addDiffuser: true,
        avoidSpecular: false,
      },
      materials: { roughness: 0.5, metallic: 0, reflectivity: 0.25, subsurfaceScattering: 0.7 },
    },
    {
      id: 'optional-bundle',
      label: 'Valgfrie forbedringer',
      description: 'For den fullstendige studioproduksjonen',
      score: 0.6,
      category: 'optional',
      items: [],
      suggestedSettings: {
        keyLightCCT: 5600,
        keyLightIntensity: 0.65,
        fillRatio: 0.3,
        addPolarizer: false,
        addDiffuser: true,
        avoidSpecular: true,
      },
      materials: { roughness: 0.4, metallic: 0, reflectivity: 0.2, subsurfaceScattering: 0.6 },
    },
  ];
}

class PBRRecommendationService {
  analyze(surfaces: PBRSurfaceAnalysis[]): PBRRecommendation[] {
    void surfaces;
    return getPBRRecommendations({ name: 'unknown' });
  }
}

export const pbrRecommendationService = new PBRRecommendationService();
export default pbrRecommendationService;
