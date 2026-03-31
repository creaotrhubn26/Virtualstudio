/**
 * IES Profile Service
 * Parses ANSI/IESNA IES photometric data files and applies the
 * measured candela distribution as a projection texture on a Babylon.js SpotLight.
 *
 * Supports: IES LM-63-1991, LM-63-1995, LM-63-2002 (IESNA:LM-63-*)
 */

import * as BABYLON from '@babylonjs/core';

export interface IESProfile {
  filename: string;
  description: string;
  manufacturer: string;
  luminousFlux: number;   // lumens
  maxCandela: number;
  verticalAngles: number[];
  horizontalAngles: number[];
  candelaMatrix: number[][];  // [vertical][horizontal]
}

/**
 * Parse an IES file string into an IESProfile.
 */
export function parseIES(content: string, filename = 'profile.ies'): IESProfile {
  const lines = content.split(/\r?\n/);
  let description = '';
  let manufacturer = '';

  // Header keyword parsing
  for (const line of lines) {
    if (line.startsWith('[TEST]') || line.startsWith('[TESTLAB]')) {
      description = line.replace(/^\[[A-Z]+\]\s*/, '').trim();
    }
    if (line.startsWith('[MANUFAC]')) {
      manufacturer = line.replace('[MANUFAC]', '').trim();
    }
    if (line.startsWith('[LUMCAT]') && !description) {
      description = line.replace('[LUMCAT]', '').trim();
    }
  }

  // Find the TILT line (data begins after)
  let dataStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('TILT=')) {
      dataStart = i + 1;
      if (lines[i].includes('TILT=INCLUDE')) {
        // Skip the tilt data (5 lines)
        dataStart = i + 6;
      }
      break;
    }
  }

  if (dataStart < 0) {
    throw new Error('Ugyldig IES-fil: finner ikke TILT-linjen');
  }

  // Flatten all remaining tokens
  const tokens: number[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    for (const p of parts) {
      const n = parseFloat(p);
      if (!isNaN(n)) tokens.push(n);
    }
  }

  let idx = 0;
  const numLamps        = tokens[idx++] || 1;
  const lumensPerLamp   = tokens[idx++] || 0;
  const candelaMulti    = tokens[idx++] || 1;
  const numVertAngles   = Math.round(tokens[idx++] || 0);
  const numHorizAngles  = Math.round(tokens[idx++] || 0);
  /* photometric type */ idx++;
  /* units type       */ idx++;
  /* width/height/length */ idx += 3;
  const ballastFactor   = tokens[idx++] || 1;
  /* future use       */ idx++;
  const inputWatts      = tokens[idx++] || 0;

  void numLamps; void inputWatts;

  const verticalAngles: number[] = [];
  for (let i = 0; i < numVertAngles; i++) {
    verticalAngles.push(tokens[idx++]);
  }

  const horizontalAngles: number[] = [];
  for (let i = 0; i < numHorizAngles; i++) {
    horizontalAngles.push(tokens[idx++]);
  }

  // Candela values: numHorizAngles × numVertAngles matrices
  const candelaMatrix: number[][] = [];
  let maxCandela = 0;

  for (let h = 0; h < numHorizAngles; h++) {
    const row: number[] = [];
    for (let v = 0; v < numVertAngles; v++) {
      const raw = (tokens[idx++] || 0) * candelaMulti * ballastFactor;
      row.push(raw);
      if (raw > maxCandela) maxCandela = raw;
    }
    candelaMatrix.push(row);
  }

  const luminousFlux = Math.abs(lumensPerLamp) * numLamps;

  return {
    filename,
    description: description || filename,
    manufacturer,
    luminousFlux,
    maxCandela,
    verticalAngles,
    horizontalAngles,
    candelaMatrix,
  };
}

/**
 * Build a 512×512 greyscale texture that represents the candela distribution
 * when mapped as a SpotLight projection texture.
 * Returns the texture as a PNG data URL.
 */
export function buildIESTextureDataURL(profile: IESProfile, size = 256): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D niet beschikbaar');

  const imageData = ctx.createImageData(size, size);
  const { candelaMatrix, verticalAngles, horizontalAngles, maxCandela } = profile;

  if (maxCandela === 0) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    return canvas.toDataURL();
  }

  const cx = size / 2;
  const cy = size / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Map pixel to normalized [-1,1] disc
      const nx = (px - cx) / cx;
      const ny = (py - cy) / cy;
      const r = Math.sqrt(nx * nx + ny * ny);

      if (r > 1) {
        // Outside the disc → black
        const off = (py * size + px) * 4;
        imageData.data[off] = 0;
        imageData.data[off + 1] = 0;
        imageData.data[off + 2] = 0;
        imageData.data[off + 3] = 255;
        continue;
      }

      // Vertical angle: 0° at centre (nadir), 90° at rim
      const vAngle = r * (verticalAngles[verticalAngles.length - 1] ?? 90);
      // Horizontal angle: 0° at top, clockwise
      const hAngle = ((Math.atan2(ny, nx) * (180 / Math.PI)) + 360 + 90) % 360;

      // Bilinear interpolation in candela matrix
      const vi = bisect(verticalAngles, vAngle);
      const hi = bisect(horizontalAngles, hAngle % (horizontalAngles[horizontalAngles.length - 1] ?? 360));

      const v0 = Math.max(0, vi - 1);
      const v1 = Math.min(verticalAngles.length - 1, vi);
      const h0 = Math.max(0, hi - 1);
      const h1 = Math.min(horizontalAngles.length - 1, hi);

      const tv = verticalAngles[v1] === verticalAngles[v0]
        ? 0
        : (vAngle - verticalAngles[v0]) / (verticalAngles[v1] - verticalAngles[v0]);
      const th = horizontalAngles[h1] === horizontalAngles[h0]
        ? 0
        : (hAngle - horizontalAngles[h0]) / (horizontalAngles[h1] - horizontalAngles[h0]);

      const hIdx0 = Math.min(h0, candelaMatrix.length - 1);
      const hIdx1 = Math.min(h1, candelaMatrix.length - 1);

      const c00 = (candelaMatrix[hIdx0]?.[v0] ?? 0);
      const c10 = (candelaMatrix[hIdx1]?.[v0] ?? 0);
      const c01 = (candelaMatrix[hIdx0]?.[v1] ?? 0);
      const c11 = (candelaMatrix[hIdx1]?.[v1] ?? 0);

      const interp = c00 * (1 - th) * (1 - tv) + c10 * th * (1 - tv) + c01 * (1 - th) * tv + c11 * th * tv;
      const brightness = Math.round(Math.min(255, (interp / maxCandela) * 255));

      const off = (py * size + px) * 4;
      imageData.data[off] = brightness;
      imageData.data[off + 1] = brightness;
      imageData.data[off + 2] = brightness;
      imageData.data[off + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function bisect(arr: number[], val: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < val) lo = mid + 1;
    else hi = mid;
  }
  return Math.min(lo, arr.length - 1);
}

/**
 * Apply an IES profile as a projection texture to a Babylon.js SpotLight.
 * Returns the created texture so the caller can dispose it later.
 */
export function applyIESToSpotLight(
  light: BABYLON.SpotLight,
  profile: IESProfile,
  scene: BABYLON.Scene
): BABYLON.Texture {
  const dataUrl = buildIESTextureDataURL(profile, 256);
  const tex = new BABYLON.Texture(dataUrl, scene, true, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
  tex.name = `ies_${profile.filename}`;
  light.projectionTexture = tex;

  // Widen the spot cone to full hemisphere so the IES texture drives the distribution
  const maxV = profile.verticalAngles[profile.verticalAngles.length - 1] ?? 90;
  light.angle = Math.min(Math.PI * 0.95, (maxV * Math.PI) / 180 * 2);
  light.exponent = 0;

  return tex;
}

/**
 * Parse an IES file from a File object and return the profile.
 */
export async function loadIESFile(file: File): Promise<IESProfile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const profile = parseIES(content, file.name);
        resolve(profile);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Kunne ikke lese IES-filen'));
    reader.readAsText(file);
  });
}

/**
 * Show an IES candela preview in an existing canvas element.
 */
export function renderIESPreview(profile: IESProfile, canvas: HTMLCanvasElement): void {
  const dataUrl = buildIESTextureDataURL(profile, canvas.width || 128);
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}
