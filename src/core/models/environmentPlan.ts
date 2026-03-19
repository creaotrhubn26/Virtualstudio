export type EnvironmentPlanSource =
  | 'prompt'
  | 'reference_image'
  | 'hybrid'
  | 'fallback'
  | 'genie_reference';

export type WorldModelProvider = 'none' | 'manual' | 'genie';

export interface EnvironmentPlanWorldModel {
  provider: WorldModelProvider;
  mode: 'none' | 'reference_capture' | 'lookdev' | 'world_sketch';
  prompt?: string;
  notes?: string;
  importedImageCount?: number;
  summary?: string;
  previewLabels?: string[];
}

export type EnvironmentSurfaceTarget =
  | 'backWall'
  | 'leftWall'
  | 'rightWall'
  | 'rearWall'
  | 'floor';

export interface EnvironmentPlanRoomShell {
  type: 'studio_shell' | 'interior_room' | 'warehouse' | 'storefront' | 'abstract_stage' | 'outdoor_illusion';
  width: number;
  depth: number;
  height: number;
  openCeiling: boolean;
  notes?: string[];
}

export interface EnvironmentPlanSurface {
  target: EnvironmentSurfaceTarget;
  materialId: string;
  visible: boolean;
  rationale?: string;
}

export interface EnvironmentPlanAtmosphere {
  fogEnabled?: boolean;
  fogDensity?: number;
  fogColor?: string;
  clearColor?: string;
  ambientColor?: string;
  ambientIntensity?: number;
}

export interface EnvironmentPlanLightingCue {
  role: string;
  position: [number, number, number];
  intensity: number;
  color?: string;
  cct?: number;
  purpose?: string;
}

export interface EnvironmentPlanCameraCue {
  shotType: string;
  mood?: string;
  target?: [number, number, number];
  positionHint?: [number, number, number];
  fov?: number;
}

export interface EnvironmentPlanPropSuggestion {
  name: string;
  category: 'hero' | 'supporting' | 'set_dressing';
  description?: string;
  priority: 'high' | 'medium' | 'low';
  placementHint?: string;
}

export interface EnvironmentPlanCompatibility {
  currentStudioShellSupported: boolean;
  confidence: number;
  gaps: string[];
  nextBuildModules: string[];
}

export interface EnvironmentPlan {
  version: '1.0';
  planId: string;
  prompt: string;
  source: EnvironmentPlanSource;
  worldModel?: EnvironmentPlanWorldModel;
  summary: string;
  concept: string;
  recommendedPresetId?: string;
  roomShell: EnvironmentPlanRoomShell;
  surfaces: EnvironmentPlanSurface[];
  atmosphere: EnvironmentPlanAtmosphere;
  ambientSounds: string[];
  props: EnvironmentPlanPropSuggestion[];
  lighting: EnvironmentPlanLightingCue[];
  camera: EnvironmentPlanCameraCue;
  assemblySteps: string[];
  compatibility: EnvironmentPlanCompatibility;
}

export interface EnvironmentPlanRequest {
  prompt: string;
  referenceImages?: string[];
  roomConstraints?: Record<string, unknown>;
  preferFallback?: boolean;
  preferredPresetId?: string;
  worldModelProvider?: WorldModelProvider;
  worldModelReference?: Partial<EnvironmentPlanWorldModel>;
}

export interface EnvironmentPlannerStatus {
  enabled: boolean;
  provider: 'gemini' | 'fallback';
  model: string;
  hasVisionSupport: boolean;
  supportedWorldModelProviders?: WorldModelProvider[];
}

export interface EnvironmentPlanResponse {
  success: boolean;
  provider: 'gemini' | 'fallback';
  model: string;
  usedFallback: boolean;
  warning?: string;
  plan: EnvironmentPlan;
}
