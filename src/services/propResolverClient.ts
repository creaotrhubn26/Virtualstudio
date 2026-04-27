/**
 * Prop Resolver client — calls the backend to turn a Claude-authored prop
 * description ("vintage brass typewriter on desk") into a browser-loadable
 * GLB URL. Handles the BlenderKit → Meshy → Tripo fallback chain + the R2
 * fingerprint cache server-side; the browser just sees `glbUrl`.
 *
 * The URL returned is a short-lived presigned R2 GET — regenerate by
 * re-calling the endpoint rather than persisting it anywhere. 7-day TTL.
 */
import { apiRequest } from '../lib/api';

export interface ResolvedProp {
  success: boolean;
  glbUrl: string | null;
  fingerprint: string;
  provider: 'cache' | 'blenderkit' | 'meshy' | 'tripo' | null;
  cacheHit: boolean;
  sizeKb: number | null;
  elapsedSec: number | null;
  description: string;
  error: string | null;
  attempts?: Array<{
    provider: string;
    status: string;
    error?: string | null;
    elapsed_sec?: number;
    reason?: string;
  }>;
}

export interface PropResolverStatus {
  available: boolean;
  chain: Array<{ provider: string; enabled: boolean }>;
}

export async function getPropResolverStatus(): Promise<PropResolverStatus> {
  return apiRequest<PropResolverStatus>('/api/scene-director/prop-resolver/status');
}

export interface ResolvePropOptions {
  /** Override the default art-style hint. Passed through to Meshy. */
  styleHint?: string;
  /** Bypass the R2 cache — re-bills provider. */
  forceRefresh?: boolean;
  /**
   * Meshy text-to-3D preview timeout. Default 300s covers typical
   * 60–180s preview latency with headroom. Drop to 30–60s if the UI
   * can't wait and you want the resolver to fail fast on cache misses
   * that would need a Meshy generation.
   */
  meshyTimeoutSec?: number;
}

export async function resolveProp(
  description: string,
  opts: ResolvePropOptions = {},
): Promise<ResolvedProp> {
  return apiRequest<ResolvedProp>('/api/scene-director/resolve-prop', {
    method: 'POST',
    body: JSON.stringify({
      description,
      styleHint: opts.styleHint ?? 'realistic',
      forceRefresh: opts.forceRefresh ?? false,
      meshyTimeoutSec: opts.meshyTimeoutSec ?? 300,
    }),
  });
}

export interface ResolveManyResponse {
  count: number;
  results: ResolvedProp[];
}

/**
 * Batch resolution — one HTTP round-trip for a whole SceneAssembly's
 * props. The backend caps concurrency server-side (default 2, max 4)
 * so an 8-prop scene with all cache misses doesn't submit 8 parallel
 * Meshy jobs.
 */
export async function resolveProps(
  descriptions: string[],
  opts: ResolvePropOptions & { concurrency?: number } = {},
): Promise<ResolveManyResponse> {
  if (!descriptions.length) return { count: 0, results: [] };
  return apiRequest<ResolveManyResponse>('/api/scene-director/resolve-props', {
    method: 'POST',
    body: JSON.stringify({
      descriptions,
      styleHint: opts.styleHint ?? 'realistic',
      forceRefresh: opts.forceRefresh ?? false,
      meshyTimeoutSec: opts.meshyTimeoutSec ?? 300,
      concurrency: opts.concurrency ?? 2,
    }),
  });
}

// ---- characters / cast resolution -------------------------------------

export interface ResolvedCharacter {
  success: boolean;
  glbUrl: string | null;
  fingerprint: string;
  provider: 'cache' | 'meshy' | null;
  cacheHit: boolean;
  sizeKb: number | null;
  elapsedSec: number | null;
  description: string;
  heightMeters: number;
  walkingGlbUrl: string | null;
  runningGlbUrl: string | null;
  /**
   * The PBR-textured (refined) variant of the character. Meshy's
   * rigged output ships without textures — its meshes have zero
   * materials and Babylon's GLTFLoader assigns a chrome-white default.
   * The textured variant is the same character with the proper
   * appearance but no skeleton, used by the frontend for static
   * shots where appearance beats animation. Null on older cache
   * entries that predate the refine pipeline.
   */
  texturedGlbUrl: string | null;
  error: string | null;
}

export interface ResolveCharacterOptions {
  heightMeters?: number;
  includeAnimations?: boolean;
  styleHint?: string;
  forceRefresh?: boolean;
}

export interface ResolveCastResponse {
  count: number;
  results: ResolvedCharacter[];
}

/**
 * Batch character resolution — takes a list of humanoid descriptions
 * and runs them through the Meshy text-to-3d → auto-rig pipeline
 * server-side. Server defaults to concurrency=1 because every fresh
 * generation costs ~$0.05 + 2 min; let cached descriptions fly.
 */
export async function resolveCast(
  descriptions: string[],
  opts: ResolveCharacterOptions & { concurrency?: number } = {},
): Promise<ResolveCastResponse> {
  if (!descriptions.length) return { count: 0, results: [] };
  return apiRequest<ResolveCastResponse>('/api/scene-director/resolve-cast', {
    method: 'POST',
    body: JSON.stringify({
      descriptions,
      heightMeters: opts.heightMeters ?? 1.78,
      includeAnimations: opts.includeAnimations ?? true,
      styleHint: opts.styleHint ?? 'realistic',
      forceRefresh: opts.forceRefresh ?? false,
      concurrency: opts.concurrency ?? 1,
    }),
  });
}
