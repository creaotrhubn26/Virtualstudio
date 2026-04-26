/**
 * HDRI registry — maps the Scene Director's mood-relative HDRI IDs (emitted
 * in SceneAssembly.lighting.hdri) to concrete files under /public/hdri/.
 *
 * The director's _TIME_LIGHTING table (backend/scene_director_service.py)
 * emits one of: daylight-soft, dawn-golden, dusk-magic, golden-hour,
 * moonlight. This file is the single source of truth for what each ID
 * means visually, what file on disk realises it, and what colour-temp /
 * exposure bias to pair with it.
 *
 * Only venice_sunset_2k.hdr ships in the repo. The rest are "expected"
 * filenames — an operator can drop HDRIs from Poly Haven (CC0) into the
 * matching path. The recommended sources below are tested and licence-safe:
 *
 *   daylight-soft.hdr  → polyhaven.com/a/studio_small_09     (2k)
 *   dawn-golden.hdr    → polyhaven.com/a/kloppenheim_06      (2k)
 *   dusk-magic.hdr     → polyhaven.com/a/golden_gate_hills   (2k)
 *   golden-hour.hdr    → polyhaven.com/a/venice_sunset       (2k)  [ships]
 *   moonlight.hdr      → polyhaven.com/a/moonless_golf       (2k)
 *
 * applySceneAssembly HEAD-checks the resolved URL before loading so a
 * missing file degrades gracefully to the default fallback, rather than
 * hanging the Babylon texture loader.
 */

export interface HDRIEntry {
  /** Matches the director's lighting.hdri string. */
  id: string;
  /** Public URL served by Vite (relative to the web root). */
  url: string;
  /** Human-readable label for UI + logs. */
  label: string;
  /** Dominant colour temperature in Kelvin (for UI hints). */
  cctKelvin: number;
  /** Suggested environmentIntensity when this HDRI is active. */
  defaultIntensity: number;
  /** One-line description for tooltips / logs. */
  description: string;
}

/** The one HDRI that definitely exists on disk — used as the safety net. */
export const FALLBACK_HDRI_URL = '/hdri/venice_sunset_2k.hdr';
export const FALLBACK_HDRI_ID = 'golden-hour';

export const HDRI_REGISTRY: HDRIEntry[] = [
  {
    id: 'daylight-soft',
    url: '/hdri/daylight-soft.hdr',
    label: 'Soft Daylight',
    cctKelvin: 5600,
    defaultIntensity: 0.9,
    description: 'Overcast-diffused daylight, neutral white balance, gentle sky dome',
  },
  {
    id: 'dawn-golden',
    url: '/hdri/dawn-golden.hdr',
    label: 'Golden Dawn',
    cctKelvin: 4200,
    defaultIntensity: 0.7,
    description: 'Low golden sun, long shadows, cool sky and warm key',
  },
  {
    id: 'dusk-magic',
    url: '/hdri/dusk-magic.hdr',
    label: 'Dusk Magic Hour',
    cctKelvin: 3400,
    defaultIntensity: 0.6,
    description: 'Orange-to-teal sky, final sun glow, classic magic hour warmth',
  },
  {
    id: 'golden-hour',
    url: FALLBACK_HDRI_URL,
    label: 'Venice Sunset',
    cctKelvin: 3200,
    defaultIntensity: 0.6,
    description: 'Warm sunset over water — lifts skin, creates soft rim-light naturally',
  },
  {
    id: 'moonlight',
    url: '/hdri/moonlight.hdr',
    label: 'Moonlight',
    cctKelvin: 5200,
    defaultIntensity: 0.25,
    description: 'Night sky with single cool key, deep ambient shadows',
  },
];

/** Lookup by id. Returns null for unknown ids. */
export function findHDRI(id: string | null | undefined): HDRIEntry | null {
  if (!id) return null;
  return HDRI_REGISTRY.find((h) => h.id === id) ?? null;
}

/**
 * HEAD-check a HDRI URL. Returns true if the server can serve it; false
 * for 404 / network errors. Used by applySceneAssembly to fall back to
 * the shipped HDRI when the requested mood's file hasn't been dropped in.
 */
export async function hdriExists(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve a director HDRI id to an HDRIEntry, falling back to the
 * shipped default if the id is unknown OR the file isn't on disk.
 * Returns the resolved entry plus a flag indicating whether the fallback
 * was used (so the caller can surface a warning).
 */
export async function resolveHDRI(
  id: string | null | undefined,
): Promise<{ entry: HDRIEntry; fellBack: boolean; reason: string | null }> {
  const fallback = findHDRI(FALLBACK_HDRI_ID) ?? HDRI_REGISTRY[3]; // golden-hour
  const requested = findHDRI(id);
  if (!requested) {
    return {
      entry: fallback,
      fellBack: true,
      reason: id ? `unknown HDRI id "${id}"` : 'no HDRI requested',
    };
  }
  if (await hdriExists(requested.url)) {
    return { entry: requested, fellBack: false, reason: null };
  }
  return {
    entry: fallback,
    fellBack: true,
    reason: `file missing at ${requested.url} — drop a .hdr there to enable`,
  };
}
