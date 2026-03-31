export interface LightSetupRecommendation {
  id: string;
  name: string;
  label: string;
  description: string;
  score: number;
  lights: Array<{
    type: string;
    role: 'key' | 'fill' | 'hair' | 'rim' | 'background';
    position: [number, number, number];
    intensity: number;
    cct?: number;
    modifier?: string;
  }>;
  tags: string[];
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
          { type: 'strobe', role: 'key', position: [1.5, 2.0, 1.5], intensity: 1.0, cct: 5500, modifier: 'softbox-90' },
          { type: 'strobe', role: 'fill', position: [-1.5, 1.5, 1.0], intensity: 0.3, cct: 5500, modifier: 'reflector' },
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
          { type: 'strobe', role: 'key', position: [0, 2.5, 1.5], intensity: 1.0, cct: 5500, modifier: 'beauty-dish' },
          { type: 'reflector', role: 'fill', position: [0, 0.5, 1.0], intensity: 0.5, modifier: 'reflector' },
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
