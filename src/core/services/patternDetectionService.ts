export interface DetectedPattern {
  id: string;
  type: 'rembrandt' | 'butterfly' | 'loop' | 'split' | 'broad' | 'short' | 'flat' | 'rim' | 'custom';
  confidence: number;
  description: string;
  label: string;
  lightIds: string[];
}

export interface LightPlacementTip {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionType: 'move' | 'adjust-intensity' | 'adjust-angle' | 'add-modifier' | 'add-light';
  affectedLightId?: string;
}

export interface PatternDetectionResult {
  detectedPatterns: DetectedPattern[];
  tips: LightPlacementTip[];
  overallQuality: number;
}

class PatternDetectionService {
  detect(_lights: Array<{ id: string; position: [number, number, number]; intensity: number }>): PatternDetectionResult {
    return {
      detectedPatterns: [],
      tips: [
        {
          id: 'tip-1',
          title: 'Optimaliser nøkkellysvinkel',
          description: 'Juster nøkkellysets vinkel til 45° for bedre Rembrandt-mønster',
          priority: 'medium',
          actionType: 'adjust-angle',
        },
      ],
      overallQuality: 0.75,
    };
  }

  identifyPattern(
    lights: Array<{ position: [number, number, number]; intensity: number }>,
  ): DetectedPattern | null {
    if (lights.length === 0) return null;
    return {
      id: 'detected-1',
      type: 'custom',
      confidence: 0.6,
      description: 'Tilpasset lyssetting',
      label: 'Tilpasset',
      lightIds: [],
    };
  }
}

export const patternDetectionService = new PatternDetectionService();
export default patternDetectionService;
