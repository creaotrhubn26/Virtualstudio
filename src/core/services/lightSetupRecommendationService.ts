export interface LightSetupRecommendation {
  id: string;
  name: string;
  label: string;
  description: string;
  reason?: string;
  bestFor?: string[];
  score: number;
  tips?: string[];
  lights: LightConfig[];
  tags: string[];
  category?: string;
  keyToFillRatio?: number;
  mood?: string;
  matchScore?: number;
}

export interface CharacterContext {
  gender?: string;
  age?: number;
  skinTone?: string;
  hairColor?: string;
  clothing?: string;
  height?: number;
  [key: string]: unknown;
}

export interface HDRIContext {
  environmentId?: string;
  intensity?: number;
  rotation?: number;
  [key: string]: unknown;
}

export interface LightConfig {
  type: string;
  role: 'key' | 'fill' | 'hair' | 'rim' | 'background';
  position: { x: number; y: number; z: number };
  intensity: number;
  cct?: number;
  modifier?: string;
  enabled?: boolean;
  name?: string;
  power?: number;
}

export interface RecommendationContext {
  shootType: string;
  subjectCount?: number;
  mood?: string;
  style?: string;
}

class LightSetupRecommendationService {
  recommend(context: RecommendationContext): LightSetupRecommendation[] {
    const base: LightSetupRecommendation[] = [
      {
        id: 'rembrandt',
        name: 'rembrandt',
        label: 'Rembrandt',
        description: 'Klassisk Rembrandt-lyssetting med 45° nøkkellys',
        score: 0.90,
        lights: [
          { type: 'strobe', role: 'key', position: { x: 1.5, y: 2.0, z: 1.5 }, intensity: 1.0, cct: 5500, modifier: 'softbox-90' },
          { type: 'strobe', role: 'fill', position: { x: -1.5, y: 1.5, z: 1.0 }, intensity: 0.3, cct: 5500, modifier: 'reflector' },
        ],
        tags: ['portrett', 'klassisk', 'rembrandt'],
      },
      {
        id: 'butterfly',
        name: 'butterfly',
        label: 'Butterfly',
        description: 'Paramont/butterfly-lyssetting fra fronten',
        score: 0.85,
        lights: [
          { type: 'strobe', role: 'key', position: { x: 0, y: 2.5, z: 1.5 }, intensity: 1.0, cct: 5500, modifier: 'beauty-dish' },
          { type: 'reflector', role: 'fill', position: { x: 0, y: 0.5, z: 1.0 }, intensity: 0.5, modifier: 'reflector' },
        ],
        tags: ['portrett', 'mote', 'butterfly', 'skjønnhet'],
      },
    ];

    void context;
    return base;
  }
}

export const lightSetupRecommendationService = new LightSetupRecommendationService();
export default lightSetupRecommendationService;

export function getLightSetupRecommendations(
  character: CharacterContext,
  hdri?: HDRIContext,
): LightSetupRecommendation[] {
  void hdri;
  const shootType = character.gender === 'female' ? 'Portrett Dame' : 'Portrett';
  return lightSetupRecommendationService.recommend({ shootType });
}
