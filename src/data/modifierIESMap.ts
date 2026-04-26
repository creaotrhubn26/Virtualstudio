/**
 * Modifier → IES profile mapping.
 *
 * Scene Director emits a modifier string on every LightSource (e.g.
 * "octabox-120", "stripbox-30x120", "snoot", "grid-20deg", "gobo-window").
 * This file resolves that string to a real photometric .ies file in
 * /public/ies/ so applySceneAssembly can attach the measured candela
 * distribution to the SpotLight's projectionTexture instead of leaving
 * it with a generic cone.
 *
 * The 32 .ies files that ship in /public/ies/ are real LM-63-2002
 * profiles derived from each manufacturer's published beam data
 * (candela + lumens + beam angle). See public/ies/index.json for the
 * catalog of available files.
 *
 * Why a map and not a hunt-by-beam-angle?
 *  - Two modifiers may share a beam angle but have very different
 *    distributions (fresnel has a sharp hotspot; softbox is flat).
 *  - A director-authored modifier name carries the intent of the shot;
 *    picking the IES that matches the intent keeps the look correct.
 */

export interface ModifierIESEntry {
  /** Filename under /public/ies/. HEAD-check at apply time. */
  filename: string;
  /** Short label for logs. */
  label: string;
  /**
   * When true, picking this IES should keep the fixture's stored
   * beamAngle (soft/wide modifiers flatten the spot cone); when false,
   * applyIESToSpotLight will widen the cone to match the IES's vertical
   * angle extent (for hard-edge modifiers like snoots/fresnels the IES
   * itself carries the falloff).
   */
  preserveBeamAngle?: boolean;
}

const IES_BASE = '/ies/';

/**
 * Map from director modifier id → IES entry. Unknown modifiers resolve
 * to null and applySceneAssembly falls back to the fixture's default
 * cone (no projection texture).
 */
export const MODIFIER_TO_IES: Record<string, ModifierIESEntry> = {
  // ---- Soft key modifiers (flat, wide, wrapping) --------------------
  // Octaboxes of all sizes share a flat-plateau distribution; the
  // 120 cm strobe-octabox file is our canonical soft-key profile.
  'octabox-90': { filename: 'strobe-octabox-120cm.ies', label: 'Octabox 90cm', preserveBeamAngle: true },
  'octabox-120': { filename: 'strobe-octabox-120cm.ies', label: 'Octabox 120cm', preserveBeamAngle: true },
  'octabox-180': { filename: 'strobe-octabox-120cm.ies', label: 'Octabox 180cm', preserveBeamAngle: true },
  'softbox-90': { filename: 'strobe-octabox-120cm.ies', label: 'Softbox 90cm', preserveBeamAngle: true },
  // Beauty dish: tighter hotspot than a softbox — use a slight-spot
  // fresnel to give it a centred falloff while keeping the soft edge.
  'beauty-dish-42': { filename: 'aputure-ls300d-ii-fresnel-flood.ies', label: 'Beauty Dish 42"', preserveBeamAngle: true },

  // ---- Strip / rim modifiers (narrow vertical, long horizontal) -----
  'stripbox-30x120': { filename: 'strobe-stripbox-35x160.ies', label: 'Stripbox 30×120', preserveBeamAngle: true },
  'stripbox-60x180': { filename: 'strobe-stripbox-35x160.ies', label: 'Stripbox 60×180', preserveBeamAngle: true },

  // ---- Hard-cut / hair modifiers ------------------------------------
  // Snoots: narrow cone, hard edge. Joker HMI has the tightest measured
  // beam of our library (~10°). Don't preserve beam angle — let the IES
  // dictate the cone extent.
  snoot: { filename: 'joker-bug-400-hmi.ies', label: 'Snoot (narrow)' },
  'grid-20deg': { filename: 'aputure-ls300d-ii-fresnel-spot.ies', label: '20° Grid' },

  // ---- Flat fill ----------------------------------------------------
  'umbrella-white-110': {
    filename: 'aputure-ls120d-ii-openface.ies',
    label: 'White Umbrella 110cm',
    preserveBeamAngle: true,
  },

  // ---- Passive modifiers (reflectors, scrims) -----------------------
  // Even passive modifiers are represented as emitters on our side; use
  // a wide-open-face IES so the falloff reads as bounce, not spot.
  'reflector-silver': {
    filename: 'aputure-ls300d-ii-openface.ies',
    label: 'Silver Reflector (bounce)',
    preserveBeamAngle: true,
  },
  'scrim-large': {
    filename: 'litepanels-gemini-2x1.ies',
    label: '6×6 Scrim (diffused)',
    preserveBeamAngle: true,
  },

  // ---- Hard sunlight / gobo / practicals ----------------------------
  'par64-open': { filename: 'arri-m18-hmi-flood.ies', label: 'PAR / HMI Flood' },
  'gobo-window': {
    filename: 'arri-skypanel-s60-c.ies',
    label: 'Skypanel gobo window',
    preserveBeamAngle: true,
  },
  'bare-bulb': { filename: 'profoto-d2-1000-reflector.ies', label: 'Bare bulb / reflector' },
};

export function iesForModifier(modifier: string | null | undefined): {
  url: string;
  filename: string;
  label: string;
  preserveBeamAngle: boolean;
} | null {
  if (!modifier) return null;
  const entry = MODIFIER_TO_IES[modifier];
  if (!entry) return null;
  return {
    url: IES_BASE + entry.filename,
    filename: entry.filename,
    label: entry.label,
    preserveBeamAngle: entry.preserveBeamAngle ?? false,
  };
}
