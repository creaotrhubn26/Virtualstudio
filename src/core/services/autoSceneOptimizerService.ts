export interface SceneOptimizationLight {
  id: string;
  suggested: boolean;
  position: number[];
  intensity?: number;
  color?: string;
}

export interface SceneOptimizationSubject {
  id: string;
  suggested: boolean;
  position: number[];
}

export interface SceneOptimization {
  expectedImprovement: number;
  overallScore?: number;
  camera: {
    suggested: boolean;
    position: number[];
  };
  lights: SceneOptimizationLight[];
  subjects: SceneOptimizationSubject[];
  background: {
    suggested: boolean;
    adjustments: string[];
  };
}

async function optimizeScene(imageUrl: string): Promise<SceneOptimization> {
  const response = await fetch('/api/ml/optimize-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  if (!response.ok) {
    throw new Error(`Scene optimization request failed: ${response.status}`);
  }
  return response.json() as Promise<SceneOptimization>;
}

export const autoSceneOptimizerService = { optimizeScene };
