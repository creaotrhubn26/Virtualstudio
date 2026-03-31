/**
 * lightQualityService
 *
 * Converts a Virtual-Studio light node into a spectral power distribution (SPD)
 * and runs the full CIE 13.3-1995 CRI + EBU TLCI-2012 pipelines.
 *
 * Light-type → SPD strategy:
 *   tungsten / fresnel / par  → Planckian at CCT
 *   hmi / daylight            → CIE D-series at CCT
 *   led (tunable)             → broadband LED model: sum of Gaussian phosphor
 *                               peaks tuned to warm/cool white depending on CCT
 *   fluorescent               → line-spectrum fluorescent model (tri-phosphor)
 *   led (generic) / default   → Planckian at CCT as fallback
 */

import {
  generatePlanckianSPD,
  generateDaylightSPD,
  WAVELENGTHS,
} from './spectralDataService';
import {
  calculateSpectralCRI,
  calculateSpectralTLCI,
  type CRIResult,
  type TLCIResult,
} from './spectralCRIService';

export interface LightQualityResult {
  cri:  CRIResult;
  tlci: TLCIResult;
  spd:  number[];
}

// ── SPD model builders ────────────────────────────────────────────────────────

function gaussian(peak: number, fwhm: number): number[] {
  return WAVELENGTHS.map((wl) =>
    Math.exp(-4 * Math.LN2 * ((wl - peak) / fwhm) ** 2),
  );
}

function addArrays(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

function normalise(spd: number[]): number[] {
  const peak = Math.max(...spd, 1e-10);
  return spd.map((v) => v / peak);
}

/** Broadband phosphor-converted LED SPD (warm ≤3500 K, else cool). */
function ledSPD(cct: number): number[] {
  if (cct <= 3500) {
    // Warm white LED: blue pump + amber phosphor + warm red tail
    return normalise(
      addArrays(
        addArrays(gaussian(448, 22), gaussian(580, 80).map((v) => v * 2.5)),
        gaussian(620, 35).map((v) => v * 0.8),
      ),
    );
  }
  if (cct <= 5000) {
    // Neutral white LED: blue pump + broadband green/yellow phosphor
    return normalise(
      addArrays(gaussian(450, 22), gaussian(555, 90).map((v) => v * 2.2)),
    );
  }
  // Cool white / daylight LED: strong blue pump, shifted green phosphor
  return normalise(
    addArrays(gaussian(455, 20), gaussian(545, 85).map((v) => v * 1.8)),
  );
}

/** Tri-phosphor fluorescent SPD. */
function fluorescentSPD(cct: number): number[] {
  // Three narrow lines at ~440, ~544, ~611 nm plus background continuum
  const lines = addArrays(
    addArrays(gaussian(440, 12), gaussian(544, 12)),
    gaussian(611, 12),
  );
  // Mix with small Planckian component for background
  const bg = generatePlanckianSPD(cct).map((v) => v * 0.15);
  return normalise(addArrays(lines, bg));
}

/** Map light-type string to an SPD array (380–780 nm, 5 nm, 81 values). */
export function lightTypeSPD(lightType: string, cct: number): number[] {
  const t = lightType?.toLowerCase() ?? '';

  if (t.includes('tungsten') || t.includes('fresnel') || t.includes('par') ||
      t.includes('halogen') || t.includes('incandescent')) {
    return generatePlanckianSPD(cct);
  }
  if (t.includes('hmi') || t.includes('daylight') || t.includes('discharge')) {
    return generateDaylightSPD(Math.max(4000, cct));
  }
  if (t.includes('fluorescent') || t.includes('kino')) {
    return fluorescentSPD(cct);
  }
  if (t.includes('led') || t.includes('panel') || t.includes('softbox')) {
    return ledSPD(cct);
  }
  // Fallback: Planckian
  return generatePlanckianSPD(cct);
}

// ── public API ────────────────────────────────────────────────────────────────

export function calculateLightQuality(
  lightType: string,
  cct: number,
): LightQualityResult {
  const spd = lightTypeSPD(lightType, cct);
  const cri  = calculateSpectralCRI(spd, cct);
  const tlci = calculateSpectralTLCI(spd, cct);
  return { cri, tlci, spd };
}

class LightQualityService {
  calculate = calculateLightQuality;
  lightTypeSPD = lightTypeSPD;
}

export const lightQualityService = new LightQualityService();
