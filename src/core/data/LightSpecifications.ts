export type LightSourceType = 'strobe' | 'led' | 'hmi' | 'tungsten' | 'fluorescent' | 'plasma' | 'xenon';
export type MountSystem = 'Bowens' | 'Profoto' | 'Elinchrom' | 'Broncolor' | 'Godox' | 'Nanlite' | 'Aputure' | 'Generic';

export interface LightSpec {
  id: string;
  brand: string;
  model: string;
  type: LightSourceType;
  maxWatts: number;
  cct: number | [number, number];
  cri?: number;
  tlci?: number;
  ppfd?: number;
  beamAngle?: number;
  mount?: MountSystem;
  batteryPowered: boolean;
  hssCapable: boolean;
  ttlCapable: boolean;
  wifiControl: boolean;
  dmxControl: boolean;
  recycleTime?: number;
  flashDuration?: number;
  weightKg: number;
  ipRating?: string;
  price?: number;
  description?: string;
}

export const LIGHT_SPECS: LightSpec[] = [
  {
    id: 'profoto-b10plus',
    brand: 'Profoto',
    model: 'B10 Plus',
    type: 'strobe',
    maxWatts: 500,
    cct: 5500,
    cri: 98,
    mount: 'Profoto',
    batteryPowered: true,
    hssCapable: true,
    ttlCapable: true,
    wifiControl: true,
    dmxControl: false,
    recycleTime: 1.4,
    weightKg: 2.0,
    price: 29990,
    description: 'Kompakt batteriblitz med Profoto Air-system',
  },
  {
    id: 'godox-ad600pro',
    brand: 'Godox',
    model: 'AD600Pro',
    type: 'strobe',
    maxWatts: 600,
    cct: 5600,
    cri: 93,
    mount: 'Bowens',
    batteryPowered: true,
    hssCapable: true,
    ttlCapable: true,
    wifiControl: false,
    dmxControl: false,
    recycleTime: 1.5,
    weightKg: 2.8,
    price: 7990,
  },
  {
    id: 'aputure-600x-pro',
    brand: 'Aputure',
    model: '600X Pro',
    type: 'led',
    maxWatts: 720,
    cct: [2700, 6500],
    cri: 96,
    tlci: 96,
    beamAngle: 55,
    mount: 'Bowens',
    batteryPowered: false,
    hssCapable: false,
    ttlCapable: false,
    wifiControl: true,
    dmxControl: true,
    weightKg: 5.4,
    price: 24990,
    description: 'Bi-Color LED med Bowens-feste',
  },
  {
    id: 'nanlite-forza720b',
    brand: 'Nanlite',
    model: 'Forza 720B',
    type: 'led',
    maxWatts: 720,
    cct: [2700, 6500],
    cri: 96,
    tlci: 97,
    beamAngle: 55,
    mount: 'Bowens',
    batteryPowered: false,
    hssCapable: false,
    ttlCapable: false,
    wifiControl: true,
    dmxControl: true,
    weightKg: 5.8,
    price: 22990,
  },
];

export function getLightSpecById(id: string): LightSpec | undefined {
  return LIGHT_SPECS.find((s) => s.id === id);
}

export function getLightsByType(type: LightSourceType): LightSpec[] {
  return LIGHT_SPECS.filter((s) => s.type === type);
}

export function getLightsByBrand(brand: string): LightSpec[] {
  return LIGHT_SPECS.filter((s) => s.brand.toLowerCase() === brand.toLowerCase());
}

export function getDefaultLightSpec(): LightSpec {
  return LIGHT_SPECS[0] ?? {
    id: 'default',
    brand: 'Generic',
    model: 'Studio Strobe 400W',
    type: 'strobe' as LightSourceType,
    powerWatts: 400,
    maxPowerJoules: 400,
    colorTempK: 5600,
    bowens: true,
    mount: 'Bowens' as MountSystem,
    guideNumber: 60,
    recycleSec: 2,
    hssSyncSpeed: 1/250,
    ttlCompatible: false,
    batteryCompatible: false,
    weightKg: 3.2,
    dimensions: { width: 30, height: 25, depth: 30 },
  };
}

export interface LightNodeData {
  type: 'light';
  lightType: string;
  brand: string;
  model: string;
  intensity: number;
  colorTemp: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export function lightSpecToNodeData(spec: LightSpec): Omit<LightNodeData, 'position' | 'rotation'> {
  return {
    type: 'light',
    lightType: spec.type,
    brand: spec.brand,
    model: spec.model,
    intensity: (spec.powerWatts ?? 400) / 400,
    colorTemp: spec.colorTempK ?? 5600,
  };
}
