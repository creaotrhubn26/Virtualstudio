export interface PosePresetData {
  id: string;
  name: string;
  label: string;
  category: string;
  joints: Record<string, { x: number; y: number; z: number; w?: number }>;
  thumbnail?: string;
  tags: string[];
}

export interface ExpressionPresetData {
  id: string;
  name: string;
  label: string;
  category: 'happy' | 'neutral' | 'sad' | 'surprised' | 'angry' | 'custom';
  blendShapes: Record<string, number>;
  thumbnail?: string;
  tags: string[];
}

export const DEFAULT_POSE_PRESETS: PosePresetData[] = [
  {
    id: 'a-pose',
    name: 'a-pose',
    label: 'A-Pose',
    category: 'neutral',
    joints: {},
    tags: ['nøytral', 'standard'],
  },
  {
    id: 't-pose',
    name: 't-pose',
    label: 'T-Pose',
    category: 'neutral',
    joints: {},
    tags: ['nøytral', 'standard'],
  },
  {
    id: 'relaxed-stand',
    name: 'relaxed-stand',
    label: 'Avslappet Stående',
    category: 'standing',
    joints: {},
    tags: ['stående', 'avslappet'],
  },
];

export const DEFAULT_EXPRESSION_PRESETS: ExpressionPresetData[] = [
  {
    id: 'neutral',
    name: 'neutral',
    label: 'Nøytral',
    category: 'neutral',
    blendShapes: {},
    tags: ['nøytral'],
  },
  {
    id: 'smile',
    name: 'smile',
    label: 'Smil',
    category: 'happy',
    blendShapes: { mouthSmile_L: 0.8, mouthSmile_R: 0.8, cheekSquint_L: 0.3, cheekSquint_R: 0.3 },
    tags: ['glad', 'smil'],
  },
  {
    id: 'big-smile',
    name: 'big-smile',
    label: 'Bredt Smil',
    category: 'happy',
    blendShapes: { mouthSmile_L: 1.0, mouthSmile_R: 1.0, jawOpen: 0.3, cheekSquint_L: 0.6, cheekSquint_R: 0.6 },
    tags: ['glad', 'bredt-smil'],
  },
];

class PresetLoader {
  private posePresets: PosePresetData[] = DEFAULT_POSE_PRESETS;
  private expressionPresets: ExpressionPresetData[] = DEFAULT_EXPRESSION_PRESETS;

  getPosePresets(): PosePresetData[] {
    return [...this.posePresets];
  }

  getPosePresetById(id: string): PosePresetData | undefined {
    return this.posePresets.find((p) => p.id === id);
  }

  getExpressionPresets(): ExpressionPresetData[] {
    return [...this.expressionPresets];
  }

  getExpressionPresetById(id: string): ExpressionPresetData | undefined {
    return this.expressionPresets.find((p) => p.id === id);
  }

  async loadPoseFromFile(_file: File): Promise<PosePresetData> {
    return {
      id: `custom-pose-${Date.now()}`,
      name: 'custom',
      label: 'Egendefinert Pose',
      category: 'custom',
      joints: {},
      tags: ['egendefinert'],
    };
  }

  async loadExpressionFromFile(_file: File): Promise<ExpressionPresetData> {
    return {
      id: `custom-expr-${Date.now()}`,
      name: 'custom',
      label: 'Egendefinert Uttrykk',
      category: 'custom',
      blendShapes: {},
      tags: ['egendefinert'],
    };
  }
}

export const presetLoader = new PresetLoader();
export default presetLoader;
