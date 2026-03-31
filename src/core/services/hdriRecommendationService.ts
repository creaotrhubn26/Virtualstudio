export interface HDRIRecommendation {
  id: string;
  environmentId: string;
  reason: string;
  score: number;
  adjustedIntensity: number;
  adjustedRotation: number;
  tags: string[];
}

export interface HDRIRecommendationContext {
  shootType: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  mood?: string;
  lightingStyle?: string;
}

class HDRIRecommendationService {
  recommend(context: HDRIRecommendationContext): HDRIRecommendation[] {
    const recommendations: HDRIRecommendation[] = [
      {
        id: 'rec-1',
        environmentId: 'studio-neutral',
        reason: `Anbefalt for ${context.shootType}`,
        score: 0.92,
        adjustedIntensity: 1.0,
        adjustedRotation: 0,
        tags: ['studio', 'nøytral'],
      },
      {
        id: 'rec-2',
        environmentId: 'studio-warm',
        reason: 'Varm stemning passer godt',
        score: 0.78,
        adjustedIntensity: 0.9,
        adjustedRotation: 30,
        tags: ['varm', 'studio'],
      },
    ];
    return recommendations;
  }

  getTopRecommendation(context: HDRIRecommendationContext): HDRIRecommendation | null {
    const recs = this.recommend(context);
    return recs.length > 0 ? recs[0] : null;
  }
}

export const hdriRecommendationService = new HDRIRecommendationService();
export default hdriRecommendationService;
