export type LensType = 'prime' | 'zoom' | 'macro' | 'tilt-shift' | 'fisheye' | 'telephoto' | 'wide-angle';
export type MountType = 'EF' | 'RF' | 'F' | 'Z' | 'E' | 'FE' | 'L' | 'M43' | 'X' | 'PL' | 'MFT';

export interface LensSpec {
  apertureBlades?: number;
  bokehQuality?: number;
  id: string;
  brand: string;
  model: string;
  type: LensType;
  focalLength: number | [number, number];
  maxAperture: number;
  minAperture: number;
  minFocusDistance: number;
  filterDiameter?: number;
  mount: MountType[];
  hasSwitchable: boolean;
  opticalStabilization: boolean;
  weatherSealing: boolean;
  weightGrams: number;
  lengthMm: number;
  diameterMm: number;
  price?: number;
  elements?: number;
  groups?: number;
  bladeCount?: number;
  magnification?: number;
  stabilization?: boolean;
  vignetting?: number;
}

export const LENS_DATABASE: LensSpec[] = [
  {
    id: 'canon-rf-50-1.2',
    brand: 'Canon',
    model: 'RF 50mm f/1.2L USM',
    type: 'prime',
    focalLength: 50,
    maxAperture: 1.2,
    minAperture: 16,
    minFocusDistance: 0.4,
    filterDiameter: 77,
    mount: ['RF'],
    hasSwitchable: false,
    opticalStabilization: false,
    weatherSealing: true,
    weightGrams: 950,
    lengthMm: 108.5,
    diameterMm: 89.8,
    price: 24990,
    bladeCount: 10,
  },
  {
    id: 'sigma-85-1.4-art',
    brand: 'Sigma',
    model: '85mm f/1.4 DG HSM Art',
    type: 'prime',
    focalLength: 85,
    maxAperture: 1.4,
    minAperture: 16,
    minFocusDistance: 0.85,
    filterDiameter: 86,
    mount: ['EF', 'F', 'E'],
    hasSwitchable: false,
    opticalStabilization: false,
    weatherSealing: false,
    weightGrams: 1130,
    lengthMm: 126,
    diameterMm: 98,
    price: 9990,
    bladeCount: 9,
  },
  {
    id: 'tamron-70-200-2.8',
    brand: 'Tamron',
    model: '70-200mm f/2.8 Di III VXD G2',
    type: 'zoom',
    focalLength: [70, 200],
    maxAperture: 2.8,
    minAperture: 22,
    minFocusDistance: 0.8,
    filterDiameter: 77,
    mount: ['FE'],
    hasSwitchable: false,
    opticalStabilization: false,
    weatherSealing: true,
    weightGrams: 1165,
    lengthMm: 199,
    diameterMm: 88,
    price: 14990,
    bladeCount: 9,
  },
  {
    id: 'nikon-z-35-1.8',
    brand: 'Nikon',
    model: 'NIKKOR Z 35mm f/1.8 S',
    type: 'prime',
    focalLength: 35,
    maxAperture: 1.8,
    minAperture: 16,
    minFocusDistance: 0.25,
    filterDiameter: 62,
    mount: ['Z'],
    hasSwitchable: false,
    opticalStabilization: false,
    weatherSealing: true,
    weightGrams: 370,
    lengthMm: 86,
    diameterMm: 73,
    price: 8990,
    bladeCount: 9,
  },
];

export function getLensById(id: string): LensSpec | undefined {
  return LENS_DATABASE.find((l) => l.id === id);
}

export function getLensesByType(type: LensType): LensSpec[] {
  return LENS_DATABASE.filter((l) => l.type === type);
}

export function getLensesByMount(mount: MountType): LensSpec[] {
  return LENS_DATABASE.filter((l) => l.mount.includes(mount));
}

export function getFocalLengthDisplay(lens: LensSpec): string {
  if (Array.isArray(lens.focalLength)) {
    return `${lens.focalLength[0]}-${lens.focalLength[1]}mm`;
  }
  return `${lens.focalLength}mm`;
}

export function findLensSpec(idOrBrand: string, model?: string): LensSpec | undefined {
  if (model) {
    return LENS_DATABASE.find(
      (l) => l.brand.toLowerCase() === idOrBrand.toLowerCase() &&
             l.model.toLowerCase().includes(model.toLowerCase()),
    );
  }
  return getLensById(idOrBrand);
}

export function findLensSpecByBrand(brand: string, model?: string): LensSpec | undefined {
  return LENS_DATABASE.find((l) =>
    l.brand.toLowerCase() === brand.toLowerCase() &&
    (!model || l.model.toLowerCase().includes(model.toLowerCase())),
  );
}

export function getDefaultLensSpec(): LensSpec {
  return LENS_DATABASE[0] ?? {
    id: 'default',
    brand: 'Generic',
    model: '50mm f/1.8',
    type: 'prime',
    focalLength: 50,
    maxAperture: 1.8,
    minAperture: 22,
    minFocusDistance: 0.45,
    mount: ['EF'],
    hasSwitchable: false,
    opticalStabilization: false,
    weatherSealing: false,
    weightGrams: 300,
    lengthMm: 60,
    diameterMm: 68,
    bladeCount: 7,
  };
}

export function getFocalLengthFromLensSpec(lens: LensSpec): number {
  return Array.isArray(lens.focalLength) ? lens.focalLength[0] : lens.focalLength;
}

export function getMaxApertureFromLensSpec(lens: LensSpec): number {
  return lens.maxAperture;
}

export interface LensNodeData {
  type: 'lens';
  brand: string;
  model: string;
  focalLength: number;
  maxAperture: number;
  minFocusDistance: number;
  aperture?: number;
  fieldOfView?: number;
  userData?: Record<string, unknown>;
}

export function lensSpecToCameraData(spec: LensSpec): LensNodeData {
  return {
    type: 'lens',
    brand: spec.brand,
    model: spec.model,
    focalLength: getFocalLengthFromLensSpec(spec),
    maxAperture: spec.maxAperture,
    minFocusDistance: spec.minFocusDistance,
  };
}
