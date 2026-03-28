export type EnvironmentPlanSource =
  | 'prompt'
  | 'reference_image'
  | 'hybrid'
  | 'fallback'
  | 'genie_reference';

export type WorldModelProvider = 'none' | 'manual' | 'genie';
export type EnvironmentLayoutProvider = 'auto' | 'heuristics' | 'sam2_depth';

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

export type EnvironmentBrandApplicationTarget =
  | 'environment'
  | 'wardrobe'
  | 'signage'
  | 'packaging'
  | 'interior_details';

export interface EnvironmentPlanRoomShellOpening {
  id: string;
  wallTarget: Exclude<EnvironmentSurfaceTarget, 'floor'>;
  kind: 'door' | 'window' | 'service_window' | 'archway' | 'pass_through';
  widthRatio: number;
  heightRatio: number;
  xAlign: 'left' | 'center' | 'right';
  sillHeight?: number;
  notes?: string[];
}

export interface EnvironmentPlanRoomShellZone {
  id: string;
  label: string;
  purpose: 'prep' | 'counter' | 'service' | 'dining' | 'hero' | 'storage' | 'queue' | 'background' | 'backroom';
  xBias: number;
  zBias: number;
  widthRatio: number;
  depthRatio: number;
  notes?: string[];
}

export interface EnvironmentPlanRoomShellFixture {
  id: string;
  kind: 'counter_block' | 'prep_island' | 'banquette' | 'host_stand' | 'display_plinth' | 'partition' | 'planter_line' | 'pass_shelf';
  zoneId?: string;
  wallTarget?: Exclude<EnvironmentSurfaceTarget, 'floor'>;
  xBias?: number;
  zBias?: number;
  widthRatio: number;
  depthRatio: number;
  height: number;
  notes?: string[];
}

export interface EnvironmentPlanRoomShellNiche {
  id: string;
  wallTarget: Exclude<EnvironmentSurfaceTarget, 'floor'>;
  kind: 'alcove' | 'display' | 'shelf';
  widthRatio: number;
  heightRatio: number;
  xAlign: 'left' | 'center' | 'right';
  sillHeight?: number;
  depth?: number;
  notes?: string[];
}

export type EnvironmentPlanRoomCeilingStyle =
  | 'flat'
  | 'coffered'
  | 'exposed_beams'
  | 'open_truss'
  | 'canopy';

export interface EnvironmentPlanRoomWallSegment {
  id: string;
  wallTarget: Exclude<EnvironmentSurfaceTarget, 'floor'>;
  kind: 'panel' | 'pilaster' | 'bay';
  widthRatio: number;
  heightRatio: number;
  xAlign: 'left' | 'center' | 'right';
  sillHeight?: number;
  depth?: number;
  notes?: string[];
}

export interface EnvironmentPlanRoomShell {
  type: 'studio_shell' | 'interior_room' | 'warehouse' | 'storefront' | 'abstract_stage' | 'outdoor_illusion';
  width: number;
  depth: number;
  height: number;
  openCeiling: boolean;
  ceilingStyle?: EnvironmentPlanRoomCeilingStyle;
  notes?: string[];
  openings?: EnvironmentPlanRoomShellOpening[];
  zones?: EnvironmentPlanRoomShellZone[];
  fixtures?: EnvironmentPlanRoomShellFixture[];
  niches?: EnvironmentPlanRoomShellNiche[];
  wallSegments?: EnvironmentPlanRoomWallSegment[];
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

export type EnvironmentLightingIntent =
  | 'hero_product'
  | 'beauty'
  | 'interview'
  | 'dramatic'
  | 'soft_daylight'
  | 'noir'
  | 'cyberpunk'
  | 'food'
  | 'luxury_retail'
  | 'office'
  | 'nightclub'
  | 'warehouse';

export type EnvironmentLightModifier =
  | 'none'
  | 'softbox'
  | 'stripbox'
  | 'lantern'
  | 'fresnel'
  | 'practical_shade'
  | 'gobo_projector';

export interface EnvironmentPlanLightingCue {
  role: string;
  position: [number, number, number];
  intensity: number;
  color?: string;
  cct?: number;
  purpose?: string;
  intent?: EnvironmentLightingIntent;
  modifier?: EnvironmentLightModifier;
  beamAngle?: number;
  rationale?: string;
  haze?: {
    enabled: boolean;
    density?: number;
    rationale?: string;
  };
  gobo?: {
    goboId: 'window' | 'blinds' | 'leaves' | 'breakup' | 'dots' | 'lines';
    size?: number;
    rotation?: number;
    intensity?: number;
    rationale?: string;
  };
  behavior?: {
    type: 'none' | 'pulse' | 'flicker' | 'orbit' | 'pan_sweep';
    speed?: number;
    amplitude?: number;
    radius?: number;
  };
}

export interface EnvironmentPlanCameraCue {
  shotType: string;
  mood?: string;
  target?: [number, number, number];
  positionHint?: [number, number, number];
  fov?: number;
}

export interface EnvironmentPlanLayoutGuidance {
  provider: string;
  roomType?: EnvironmentPlanRoomShell['type'];
  summary?: string;
  visiblePlanes: Array<'floor' | 'leftWall' | 'rightWall' | 'backWall' | 'rearWall'>;
  depthProfile: {
    quality: 'shallow' | 'medium' | 'deep' | string;
    cameraElevation: 'low' | 'eye' | 'high' | string;
    horizonLine?: number;
  };
  detectedOpenings?: EnvironmentPlanRoomShellOpening[];
  objectAnchors?: Array<{
    id: string;
    kind: string;
    label: string;
    placementMode: 'ground' | 'wall' | string;
    bbox?: [number, number, number, number] | null;
    wallTarget?: Exclude<EnvironmentSurfaceTarget, 'floor'> | null;
    targetSurface?: string | null;
    preferredZonePurpose?: string;
    confidence?: number;
  }>;
  suggestedZones: {
    hero: {
      xBias: number;
      depthZone: 'foreground' | 'midground' | 'background';
    };
    supporting: {
      side: 'left' | 'right' | 'center';
      depthZone: 'foreground' | 'midground' | 'background';
    };
    background: {
      wallTarget: 'backWall' | 'leftWall' | 'rightWall' | 'rearWall';
      depthZone: 'foreground' | 'midground' | 'background';
    };
  };
}

export interface EnvironmentPlanPropSuggestion {
  name: string;
  category: 'hero' | 'supporting' | 'set_dressing';
  description?: string;
  priority: 'high' | 'medium' | 'low';
  placementHint?: string;
}

export interface EnvironmentPlanCharacterSuggestion {
  name: string;
  role: string;
  archetypeId?: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  placementHint?: string;
  actionHint?: string;
  wardrobeStyle?: 'baker' | 'server' | 'cashier' | 'worker' | 'host' | 'casual' | 'branded_uniform';
  wardrobeVariantId?: string;
  wardrobeNotes?: string[];
  outfitColors?: string[];
  logoPlacement?: 'none' | 'apron_chest' | 'shirt_chest' | 'cap_front';
  appearance?: {
    skinTone?: string;
    hairColor?: string;
    hairStyle?: 'short' | 'medium' | 'long' | 'bun' | 'covered';
    facialHair?: 'none' | 'stubble' | 'mustache' | 'beard';
    ageGroup?: 'teen' | 'young_adult' | 'adult' | 'senior';
    genderPresentation?: 'male' | 'female' | 'neutral';
  };
  behaviorPlan?: {
    type: 'stationary' | 'work_loop' | 'patrol' | 'counter_service' | 'serve_route' | 'hero_idle';
    homeZoneId?: string;
    routeZoneIds?: string[];
    customRoutePoints?: Array<{
      x: number;
      z: number;
    }>;
    lookAtTarget?: 'camera' | 'hero_prop' | 'counter' | 'oven' | 'guests';
    pace?: 'still' | 'subtle' | 'active';
    radius?: number;
  } | null;
}

export interface EnvironmentPlanBranding {
  enabled: boolean;
  brandName?: string;
  profileName?: string;
  palette: string[];
  signageText?: string;
  logoImage?: string | null;
  applyToEnvironment?: boolean;
  applyToWardrobe?: boolean;
  applyToSignage?: boolean;
  applicationTargets?: EnvironmentBrandApplicationTarget[];
  uniformPolicy?: 'match_palette' | 'hero_staff_only' | 'front_of_house_emphasis' | 'kitchen_emphasis';
  signageStyle?: 'painted_wall' | 'neon' | 'menu_board' | 'window_decal';
  packagingStyle?: 'box_stamp' | 'sticker' | 'printed_wrap';
  interiorStyle?: 'accent_trim' | 'full_palette' | 'materials_only';
  notes?: string[];
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
  characters: EnvironmentPlanCharacterSuggestion[];
  branding?: EnvironmentPlanBranding | null;
  lighting: EnvironmentPlanLightingCue[];
  camera: EnvironmentPlanCameraCue;
  layoutGuidance?: EnvironmentPlanLayoutGuidance | null;
  assemblySteps: string[];
  compatibility: EnvironmentPlanCompatibility;
}

export interface EnvironmentPlanBrandReference {
  brandName?: string;
  profileName?: string;
  usageNotes?: string;
  logoImage?: string;
  palette?: string[];
  applicationTargets?: EnvironmentBrandApplicationTarget[];
  uniformPolicy?: 'match_palette' | 'hero_staff_only' | 'front_of_house_emphasis' | 'kitchen_emphasis';
  signageStyle?: 'painted_wall' | 'neon' | 'menu_board' | 'window_decal';
  packagingStyle?: 'box_stamp' | 'sticker' | 'printed_wrap';
  interiorStyle?: 'accent_trim' | 'full_palette' | 'materials_only';
  directionId?: string;
}

export interface EnvironmentPlanRequest {
  prompt: string;
  referenceImages?: string[];
  roomConstraints?: Record<string, unknown>;
  preferFallback?: boolean;
  preferredPresetId?: string;
  worldModelProvider?: WorldModelProvider;
  worldModelReference?: Partial<EnvironmentPlanWorldModel>;
  layoutProvider?: EnvironmentLayoutProvider;
  layoutOptions?: Record<string, unknown>;
  brandReference?: EnvironmentPlanBrandReference;
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

export interface EnvironmentBuildShellRequest {
  shell?: Partial<EnvironmentPlanRoomShell> | null;
  prompt?: string;
  layoutHints?: Record<string, unknown> | null;
}

export interface EnvironmentBuildShellResponse {
  shell: EnvironmentPlanRoomShell;
  runtimeSupported: boolean;
  typeAccessoryHints: string[];
}

export interface EnvironmentPlanEvaluationCategory {
  score: number;
  notes: string[];
}

export interface EnvironmentPlanEvaluationSummary {
  provider: string;
  verdict: 'approved' | 'needs_refinement';
  overallScore: number;
  categories: {
    promptFidelity: EnvironmentPlanEvaluationCategory;
    compositionMatch: EnvironmentPlanEvaluationCategory;
    lightingIntentMatch: EnvironmentPlanEvaluationCategory;
    technicalIntegrity: EnvironmentPlanEvaluationCategory;
    roomRealism: EnvironmentPlanEvaluationCategory;
    brandConsistency?: EnvironmentPlanEvaluationCategory;
    imageLayoutMatch?: EnvironmentPlanEvaluationCategory;
    previewSimilarity?: EnvironmentPlanEvaluationCategory;
  };
  suggestedAdjustments: string[];
  validatedAt: string;
  previewUsed?: boolean;
  previewSource?: string | null;
  usedVisionModel?: boolean;
  warnings?: string[];
  providerMetadata?: Record<string, unknown> | null;
}

export interface EnvironmentValidateRequest {
  plan: EnvironmentPlan;
  previewImage?: string | null;
  provider?: 'auto' | 'heuristic' | 'vision_vlm';
  validationOptions?: Record<string, unknown>;
}

export interface EnvironmentValidateResponse {
  success: boolean;
  provider: string;
  usedFallback?: boolean;
  warnings?: string[];
  evaluation: EnvironmentPlanEvaluationSummary;
}
