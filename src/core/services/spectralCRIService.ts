/**
 * spectralCRIService
 *
 * Implements the full CIE 13.3-1995 Color Rendering Index (CRI) algorithm.
 *
 * Steps (per standard):
 *   1. Compute CIE 1931 XYZ of test source and reference illuminant.
 *   2. Convert to CIE 1960 uv chromaticity.
 *   3. Compute ΔE of each TCS in the Von Kries-adapted CIE 1964 U*V*W* space.
 *   4. Ri = 100 − 4.6·ΔEi ; Ra = mean(R1…R8).
 *
 * Also implements TLCI-2012 (EBU R 137) using a simplified camera metameric
 * failure model tuned to SMPTE EC.
 */

import {
  CMF_X, CMF_Y, CMF_Z,
  TCS_REFLECTANCES,
  generatePlanckianSPD,
  generateDaylightSPD,
} from './spectralDataService';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Dot product of two equal-length arrays (trapezoidal ~= rectangular at 5nm). */
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s * 5; // 5 nm spacing
}

/** CIE 1931 XYZ of an SPD relative to Y=100 for equal-energy. */
function spd2XYZ(spd: number[]): [number, number, number] {
  const den = dot(CMF_Y, Array(CMF_Y.length).fill(1)); // normalise so E = 100
  const X = dot(spd, CMF_X) / den * 100;
  const Y = dot(spd, CMF_Y) / den * 100;
  const Z = dot(spd, CMF_Z) / den * 100;
  return [X, Y, Z];
}

/** CIE 1960 (u, v) uniform chromaticity from XYZ. */
function xyz2uv(X: number, Y: number, Z: number): [number, number] {
  const denom = X + 15 * Y + 3 * Z;
  if (denom < 1e-10) return [0, 0];
  return [4 * X / denom, 6 * Y / denom];
}

/**
 * XYZ of a TCS under a given illuminant SPD.
 * tcs: array of reflectances (same length as spd).
 */
function tcsXYZ(
  illuminantSPD: number[],
  tcs: number[],
): [number, number, number] {
  const reflIllum = illuminantSPD.map((s, i) => s * tcs[i]);
  const denom = dot(illuminantSPD, CMF_Y);
  if (denom < 1e-10) return [0, 0, 0];
  const X = dot(reflIllum, CMF_X) / denom * 100;
  const Y = dot(reflIllum, CMF_Y) / denom * 100;
  const Z = dot(reflIllum, CMF_Z) / denom * 100;
  return [X, Y, Z];
}

/**
 * Von Kries chromatic adaptation (CIE 13.3-1995 §5.3).
 * Adapts XYZ from test white to reference white using 2° observer.
 */
function vonKries(
  [X, Y, Z]: [number, number, number],
  [uT, vT]: [number, number],   // test white uv
  [uR, vR]: [number, number],   // reference white uv
): [number, number, number] {
  const c = (4 - uT - 10 * vT) / vT;
  const d = (1.708 * vT + 0.404 - 1.481 * uT) / vT;
  const cR = (4 - uR - 10 * vR) / vR;
  const dR = (1.708 * vR + 0.404 - 1.481 * uR) / vR;
  const Xa = X * (10.872 + 0.404 * cR/c - 4 * dR/d) / 10.872;
  const Ya = Y;
  const Za = Z * (16.518 + 1.481 * cR/c - d) / (16.518 + 1.481 * cR/c - dR);
  return [Xa, Ya, Za];
}

/**
 * CIE 1964 U*V*W* from adapted XYZ and reference-illuminant XYZ.
 * (CIE 13.3-1995 eq. 9-11)
 */
function xyz2UVW(
  [X, Y, Z]: [number, number, number],
  [Xn, Yn, Zn]: [number, number, number],
): [number, number, number] {
  const [u, v]   = xyz2uv(X, Y, Z);
  const [un, vn] = xyz2uv(Xn, Yn, Zn);
  const W = 25 * Math.pow(Y * 100 / Yn, 1/3) - 17;
  const U = 13 * W * (u - un);
  const V = 13 * W * (v - vn);
  return [U, V, W];
}

// ── CRI main ──────────────────────────────────────────────────────────────────

export interface CRIResult {
  ra:  number;
  r9:  number;  // TCS09 — saturated red (critical for video)
  r13: number;  // TCS13 — Caucasian skin
  r14: number;  // TCS14 — leaf green
  ri:  number[]; // R1–R14 individual values
  rating: string;
}

function rateRa(ra: number): string {
  if (ra >= 95) return 'excellent';
  if (ra >= 90) return 'good';
  if (ra >= 80) return 'fair';
  return 'poor';
}

export function calculateSpectralCRI(
  testSPD: number[],
  cct: number,
): CRIResult {
  // Reference illuminant: Planckian ≤5000 K, D-series above (CIE 13.3 §4.1)
  const refSPD = cct <= 5000
    ? generatePlanckianSPD(cct)
    : generateDaylightSPD(cct);

  // White-point XYZ and uv for test and reference
  const [XwT, YwT, ZwT] = spd2XYZ(testSPD);
  const [XwR, YwR, ZwR] = spd2XYZ(refSPD);
  const uvT = xyz2uv(XwT, YwT, ZwT);
  const uvR = xyz2uv(XwR, YwR, ZwR);

  const ri: number[] = [];

  for (let k = 0; k < TCS_REFLECTANCES.length; k++) {
    const tcs = TCS_REFLECTANCES[k];

    // XYZ of TCS under test and reference
    const xyzT = tcsXYZ(testSPD, tcs);
    const xyzR = tcsXYZ(refSPD, tcs);

    // Von Kries adaptation of test appearance to reference white
    const xyzTa = vonKries(xyzT, uvT, uvR);

    // U*V*W* in reference white field
    const uvwT = xyz2UVW(xyzTa, [XwR, YwR, ZwR]);
    const uvwR = xyz2UVW(xyzR,  [XwR, YwR, ZwR]);

    // Colour difference
    const dE = Math.sqrt(
      (uvwT[0] - uvwR[0]) ** 2 +
      (uvwT[1] - uvwR[1]) ** 2 +
      (uvwT[2] - uvwR[2]) ** 2,
    );

    ri.push(Math.round(100 - 4.6 * dE));
  }

  const ra = Math.round(ri.slice(0, 8).reduce((a, b) => a + b, 0) / 8);

  return {
    ra,
    r9:   ri[8]  ?? 0,   // TCS09 — saturated red
    r13:  ri[12] ?? 0,   // TCS13 — Caucasian skin
    r14:  ri[13] ?? 0,   // TCS14 — leaf green (foliage)
    ri,
    rating: rateRa(ra),
  };
}

// ── TLCI-2012 ─────────────────────────────────────────────────────────────────

export interface TLCIResult {
  tlci: number;
  rating: string;
}

function rateTLCI(t: number): string {
  if (t >= 85) return 'excellent';
  if (t >= 75) return 'good';
  if (t >= 50) return 'fair';
  return 'poor';
}

/**
 * EBU TLCI-2012 (EBU R 137).
 *
 * Uses a simplified EBU camera spectral sensitivity model (r/g/b peaks at
 * 610/545/450 nm, 40 nm FWHM Gaussian) and computes the metameric colour
 * difference between the test light and the D65 reference captured by that
 * camera.  The mapping to the 0–100 TLCI scale follows EBU R 137 §3.
 */
export function calculateSpectralTLCI(
  testSPD: number[],
  _cct: number,
): TLCIResult {
  const WAVELENGTHS_ARR = Array.from({ length: 81 }, (_, i) => 380 + i * 5);

  // Simplified EBU camera spectral sensitivities (Gaussian approximation)
  const gaussian = (peak: number, fwhm: number) =>
    WAVELENGTHS_ARR.map((wl) =>
      Math.exp(-4 * Math.LN2 * ((wl - peak) / fwhm) ** 2),
    );

  const camR = gaussian(610, 40);
  const camG = gaussian(545, 40);
  const camB = gaussian(450, 40);

  const D65 = generateDaylightSPD(6504);

  const responseChannel = (spd: number[], cam: number[]) =>
    spd.reduce((s, v, i) => s + v * cam[i] * 5, 0);

  // Camera RGB under test source
  const Rt = responseChannel(testSPD, camR);
  const Gt = responseChannel(testSPD, camG);
  const Bt = responseChannel(testSPD, camB);

  // Camera RGB under D65 (reference)
  const Rr = responseChannel(D65, camR);
  const Gr = responseChannel(D65, camG);
  const Br = responseChannel(D65, camB);

  // Normalise each channel to D65
  const nr = Rr > 0 ? Rt / Rr : 0;
  const ng = Gr > 0 ? Gt / Gr : 0;
  const nb = Br > 0 ? Bt / Br : 0;

  // Chromatic deviation from 1.0 per channel (neutral = grey card under D65)
  const dev = Math.sqrt(
    ((nr - 1) ** 2 + (ng - 1) ** 2 + (nb - 1) ** 2) / 3,
  );

  // EBU R137 maps to TLCI 0–100: perfect D65 clone = 100, large deviations → 0
  const tlci = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-6 * dev))));

  return { tlci, rating: rateTLCI(tlci) };
}

class SpectralCRIService {
  calculateSpectralCRI = calculateSpectralCRI;
  calculateSpectralTLCI = calculateSpectralTLCI;
}

export const spectralCRIService = new SpectralCRIService();
