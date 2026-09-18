/**
 * Where the studio loads models, audio, images and textures from.
 *
 * Three sources, in order of preference:
 *
 * 1. `VITE_ASSET_CDN_BASE` — the CloudFront distribution in front of the
 *    Virtualstudio S3 bucket. Set it and everything resolves there.
 * 2. Cloudflare R2, the previous home, kept working while assets move across.
 * 3. Local paths under `public/`, which is what development uses.
 *
 * The bucket keeps content under `assets/<kind>/` and the manifests that
 * describe a set under `system/`. Those prefixes are the contract this module
 * resolves against; see `scripts/aws/provision-assets.sh`.
 *
 * In development against R2 we use a Vite proxy (/r2-assets) to bypass CORS.
 */

/**
 * CloudFront in front of the S3 asset bucket, when one is configured.
 *
 * Empty until the distribution is provisioned, which is what keeps the R2 path
 * working while the assets move rather than breaking both at once.
 */
// @ts-ignore - Vite provides import.meta.env
const ASSET_CDN_BASE: string = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSET_CDN_BASE) || '';

// R2 CDN Base URLs
export const R2_PUBLIC_CDN = 'https://pub-957cc1572eca43cfb57af6fc3a8a4394.r2.dev';
export const R2_PRIVATE_ENDPOINT = 'https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com';

// Determine if we're using R2 or local assets
// In production or when USE_R2_ASSETS is true, use Cloudflare R2
// @ts-ignore - Vite provides import.meta.env
const USE_R2 = (typeof import.meta !== 'undefined' && import.meta.env?.PROD) || 
               (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_R2_ASSETS === 'true') ||
               false;

/** True once assets are served from the S3 bucket's distribution. */
export function usingAssetCdn(): boolean {
  return ASSET_CDN_BASE.length > 0;
}

// @ts-ignore - Vite provides import.meta.env
const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Get the R2 base URL - uses proxy in dev to bypass CORS
 */
function getR2BaseUrl(): string {
  // In development, use the Vite proxy to bypass CORS
  if (IS_DEV) {
    return '/r2-assets';
  }
  // In production, use direct R2 CDN URL
  return R2_PUBLIC_CDN;
}

/**
 * The base every asset kind hangs off, and whether a path needs a prefix.
 *
 * The CDN serves the bucket's own layout, so it is used in development too:
 * there is no CORS proxy to arrange, because the bucket allows GET from
 * anywhere.
 */
function assetBase(): { base: string; prefixed: boolean } {
  if (ASSET_CDN_BASE) return { base: ASSET_CDN_BASE.replace(/\/$/, ''), prefixed: true };
  if (USE_R2) return { base: getR2BaseUrl(), prefixed: true };
  return { base: '', prefixed: false };
}

/** Resolve one asset kind, stripping the kind's own prefix from a local path. */
function resolve(kind: keyof typeof R2_PATHS, localPath: string, folder: string): string {
  const { base, prefixed } = assetBase();
  if (!prefixed) return localPath;
  const clean = localPath.replace(new RegExp(`^/?(${folder}/)?`), '');
  return `${base}/${R2_PATHS[kind]}/${clean}`;
}

/**
 * Asset path prefixes for R2
 */
const R2_PATHS = {
  models: 'assets/models',
  audio: 'assets/audio',
  images: 'assets/images',
  textures: 'assets/textures',
  patterns: 'assets/pattern-thumbnails',
} as const;

/**
 * Get the base URL for assets based on environment
 */
export function getAssetBaseUrl(): string {
  return assetBase().base;
}

/**
 * Resolve a model path to either local or R2 URL
 * @param localPath - Local path like '/models/300D_Light.glb'
 * @returns Full URL for the asset
 */
export function resolveModelPath(localPath: string): string {
  return resolve('models', localPath, 'models');
}

/**
 * Resolve an audio path to either local or R2 URL
 * @param localPath - Local path like '/audio/ambience/dark-synth-pad.wav'
 * @returns Full URL for the asset
 */
export function resolveAudioPath(localPath: string): string {
  return resolve('audio', localPath, 'audio');
}

/**
 * Resolve an image path to either local or R2 URL
 * @param localPath - Local path like '/images/gear/camera.png'
 * @returns Full URL for the asset
 */
export function resolveImagePath(localPath: string): string {
  return resolve('images', localPath, 'images');
}

/**
 * Resolve a texture path to either local or R2 URL
 * @param localPath - Local path like '/textures/wood.jpg'
 * @returns Full URL for the asset
 */
export function resolveTexturePath(localPath: string): string {
  return resolve('textures', localPath, 'textures');
}

/**
 * Resolve a pattern thumbnail path
 * @param localPath - Local path like '/pattern-thumbnails/pattern1.jpg'
 * @returns Full URL for the asset
 */
export function resolvePatternPath(localPath: string): string {
  return resolve('patterns', localPath, 'pattern-thumbnails');
}

/**
 * Generic asset resolver
 * Automatically detects asset type from path
 */
export function resolveAssetPath(localPath: string): string {
  if (!USE_R2) return localPath;
  
  if (localPath.includes('/models/') || localPath.endsWith('.glb') || localPath.endsWith('.gltf')) {
    return resolveModelPath(localPath);
  }
  if (localPath.includes('/audio/') || localPath.endsWith('.wav') || localPath.endsWith('.mp3')) {
    return resolveAudioPath(localPath);
  }
  if (localPath.includes('/images/') || localPath.includes('/gear/')) {
    return resolveImagePath(localPath);
  }
  if (localPath.includes('/textures/')) {
    return resolveTexturePath(localPath);
  }
  if (localPath.includes('/pattern-thumbnails/')) {
    return resolvePatternPath(localPath);
  }
  
  // Default: return as-is
  return localPath;
}

/**
 * Check if R2 assets are enabled
 */
export function isR2Enabled(): boolean {
  return USE_R2;
}

/**
 * Model paths mapping - maps equipment types to their 3D model files
 * All paths are relative and will be resolved via resolveModelPath()
 */
export const MODEL_PATHS = {
  // Lights
  lights: {
    'aputure-300d': '300D_Light.glb',
    'aputure-120d': '300D_Light.glb',
    'aputure-600d': '300D_Light.glb',
    'aputure-300x': '300D_Light.glb',
    'aputure-nova': '300D_Light.glb',
    'godox-ad200': 'Profoto_B10.glb',
    'godox-ad200pro': 'Profoto_B10.glb',
    'godox-ad400pro': 'Profoto_B10.glb',
    'godox-ad600': 'Profoto_B10.glb',
    'godox-ad600pro': 'Profoto_B10.glb',
    'profoto-b10': 'Profoto_B10.glb',
    'profoto-b10plus': 'Profoto_B10.glb',
    'profoto-b1x': 'Profoto_B10.glb',
    'profoto-d2': 'Profoto_B10.glb',
    'profoto-a1': 'Profoto_B10.glb',
    'softbox': 'softbox.glb',
    'softbox-rect': 'softbox.glb',
    'softbox-octa': 'softbox.glb',
    'profoto-softbox': 'profoto_softbox.glb',
    'led-panel': '300D_Light.glb',
  },
  
  // Camera equipment
  cameras: {
    'video-crane': 'video_crane.glb',
  },
  
  // Avatars
  avatars: {
    'default-woman': 'avatars/avatar_woman.glb',
    'default-man': 'avatars/avatar_man.glb',
  },
  
  // Props
  props: {
    'playing-cards': 'playing_cards.glb',
    'poker-chips': 'poker_chips.glb',
    'hexagon-table': 'hexagon_table.glb',
    'oil-lantern': 'oil_lantern.glb',
    'wooden-stool': 'wooden_stool.glb',
  },
} as const;

/**
 * Get resolved model URL for a given equipment type and category
 */
export function getModelUrl(category: keyof typeof MODEL_PATHS, type: string): string {
  const categoryPaths = MODEL_PATHS[category];
  const modelFile = (categoryPaths as Record<string, string>)[type];
  
  if (!modelFile) {
    console.warn(`No model found for ${category}/${type}`);
    return '';
  }
  
  return resolveModelPath(`/models/${modelFile}`);
}

// Export for debugging
export const assetConfig = {
  USE_R2,
  R2_PUBLIC_CDN,
  R2_PATHS,
};
