export interface PoseRecommendation {
  id: string;
  name: string;
  label: string;
  description: string;
  score: number;
  poseId: string;
  category: 'standing' | 'sitting' | 'lying' | 'action' | 'group';
  lightingCompatibility: number;
  tags: string[];
  thumbnailUrl?: string;
  idealAngles: Record<string, number>;
  tips: string[];
  keyPoints?: string[];
  difficulty?: string;
}

export interface PoseRecommendationContext {
  shootType: string;
  lightingStyle?: string;
  subjectCount?: number;
  gender?: string;
  photographyType?: string;
}

class PoseRecommendationService {
  recommend(context: PoseRecommendationContext): PoseRecommendation[] {
    void context;
    return [
      {
        id: 'pose-rec-1',
        name: 'natural-stand',
        label: 'Naturlig Stående',
        description: 'Avslappet stående positur med vekten på ett ben',
        score: 0.92,
        poseId: 'natural-stand',
        category: 'standing',
        lightingCompatibility: 0.95,
        tags: ['portrett', 'naturlig', 'avslappet'],
        idealAngles: { faceAngle: 15, bodyAngle: 20 },
        tips: ['Hold vekten på ett ben', 'Slapp av skuldrene', 'Legg hendene naturlig'],
      },
      {
        id: 'pose-rec-2',
        name: 'power-stance',
        label: 'Kraftfull Holdning',
        description: 'Selvsikker og sterk holdning',
        score: 0.85,
        poseId: 'power-stance',
        category: 'standing',
        lightingCompatibility: 0.88,
        tags: ['corporate', 'selvsikker', 'sterk'],
        idealAngles: { faceAngle: 0, bodyAngle: 0 },
        tips: ['Stå med rett rygg', 'Skuldrene tilbake og ned', 'Haken parallell med gulvet'],
      },
    ];
  }
}

export const poseRecommendationService = new PoseRecommendationService();
export default poseRecommendationService;
