/**
 * Avatar model definitions — single source of truth for avatar types and model URLs.
 * Shared by CharacterModelLoader (UI) and StorySceneLoaderService (story automation).
 */

export interface AvatarDefinition {
  /** Logical avatar type key — used in story preset manifests */
  type: string;
  /** Display name (Norwegian) */
  name: string;
  /** Path to the GLB model file */
  modelUrl: string;
  /** Skin hex colour used when creating procedural character materials */
  skinHex: string;
  /** Default height in metres */
  defaultHeight: number;
}

export const AVATAR_DEFINITIONS: AvatarDefinition[] = [
  {
    type: 'man',
    name: 'Voksen Mann',
    modelUrl: '/models/avatars/avatar_man.glb',
    skinHex: '#C68642',
    defaultHeight: 1.80,
  },
  {
    type: 'woman',
    name: 'Voksen Kvinne',
    modelUrl: '/models/avatars/avatar_woman.glb',
    skinHex: '#EAC086',
    defaultHeight: 1.68,
  },
  {
    type: 'child',
    name: 'Barn',
    modelUrl: '/models/avatars/avatar_child.glb',
    skinHex: '#FFDAB9',
    defaultHeight: 1.25,
  },
  {
    type: 'teenager',
    name: 'Tenåring',
    modelUrl: '/models/avatars/avatar_teenager.glb',
    skinHex: '#FFE4C4',
    defaultHeight: 1.60,
  },
  {
    type: 'elderly',
    name: 'Eldre',
    modelUrl: '/models/avatars/avatar_elderly.glb',
    skinHex: '#D2A679',
    defaultHeight: 1.65,
  },
  {
    type: 'athlete',
    name: 'Atlet',
    modelUrl: '/models/avatars/avatar_athlete.glb',
    skinHex: '#A0522D',
    defaultHeight: 1.85,
  },
  {
    type: 'dancer',
    name: 'Danser',
    modelUrl: '/models/avatars/avatar_dancer.glb',
    skinHex: '#C8A882',
    defaultHeight: 1.72,
  },
  {
    type: 'pregnant',
    name: 'Gravid',
    modelUrl: '/models/avatars/avatar_pregnant.glb',
    skinHex: '#EAC086',
    defaultHeight: 1.68,
  },
  {
    type: 'generated',
    name: 'Demo (rigget)',
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
    skinHex: '#EAC086',
    defaultHeight: 1.75,
  },
  {
    type: 'bakemester',
    name: 'Bakemester',
    modelUrl: '/models/avatars/avatar_bakemester.glb',
    skinHex: '#C68642',
    defaultHeight: 1.80,
  },
  {
    type: 'waiter',
    name: 'Kelner',
    modelUrl: '/models/avatars/avatar_waiter.glb',
    skinHex: '#8B6343',
    defaultHeight: 1.78,
  },
  {
    type: 'customer_woman',
    name: 'Restaurantgjest (Kvinne)',
    modelUrl: '/models/avatars/avatar_customer_woman.glb',
    skinHex: '#D4956B',
    defaultHeight: 1.68,
  },
  {
    type: 'customer_man',
    name: 'Restaurantgjest (Mann)',
    modelUrl: '/models/avatars/avatar_customer_man.glb',
    skinHex: '#A0522D',
    defaultHeight: 1.80,
  },
  {
    type: 'baker_assistant',
    name: 'Bakerassistent',
    modelUrl: '/models/avatars/avatar_baker_assistant.glb',
    skinHex: '#C89060',
    defaultHeight: 1.65,
  },
  {
    type: 'food_photographer',
    name: 'Matfotograf',
    modelUrl: '/models/avatars/avatar_food_photographer.glb',
    skinHex: '#8B6343',
    defaultHeight: 1.82,
  },
  {
    type: 'human_realistic',
    name: 'Fotorealistisk Mann',
    modelUrl: '/models/avatars/human-male-realistic.glb',
    skinHex: '#C68642',
    defaultHeight: 1.80,
  },
  {
    type: 'mixamo_soldier',
    name: 'Mixamo-figur (poseable)',
    modelUrl: '/models/avatars/mixamo-character.glb',
    skinHex: '#C68642',
    defaultHeight: 1.80,
  },
];

/** Look up an avatar definition by type key. Returns `undefined` if unknown. */
export function getAvatarDefinition(type: string): AvatarDefinition | undefined {
  return AVATAR_DEFINITIONS.find((a) => a.type === type);
}

/** Model URL for a given avatar type. Falls back to the 'generated' demo model. */
export function getAvatarModelUrl(type: string): string {
  return getAvatarDefinition(type)?.modelUrl
    ?? AVATAR_DEFINITIONS.find((a) => a.type === 'generated')!.modelUrl;
}

/** Skin hex for a given avatar type. Falls back to neutral. */
export function getAvatarSkinHex(type: string): string {
  return getAvatarDefinition(type)?.skinHex ?? '#EAC086';
}

// ──────────────────────────────────────────────────────────────────────────────
// Material definitions — used by AnimationMaterialController for per-avatar
// baseline material configuration (skin roughness, subsurface scattering, etc.)
// ──────────────────────────────────────────────────────────────────────────────

export interface AvatarMaterialDefinition {
  id: string;
  skinRoughness: number;
  skinMetallic: number;
  subsurfaceIntensity: number;
  clearcoatIntensity: number;
}

export const AVATAR_MATERIALS: AvatarMaterialDefinition[] = AVATAR_DEFINITIONS.map((a) => ({
  id: `avatar_${a.type}`,
  skinRoughness: 0.75,
  skinMetallic: 0.0,
  subsurfaceIntensity: a.type === 'child' ? 0.5 : 0.3,
  clearcoatIntensity: 0.0,
}));
