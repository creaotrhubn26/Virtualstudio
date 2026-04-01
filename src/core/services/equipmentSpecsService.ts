export interface LightSpecifications {
  id: string;
  brand: string;
  model: string;
  type: 'strobe' | 'continuous' | 'led' | 'hmi' | 'tungsten' | 'fluorescent';
  lightType?: string;
  maxPowerWatts: number;
  wattage?: number;
  powerConsumption?: number;
  equivalentWattage?: number;
  lightOutput?: number;
  colorTemperatureK: number | [number, number];
  cct?: number;
  cctRange?: [number, number];
  cri?: number;
  tlci?: number;
  beamPattern?: string;
  beamAngle?: number;
  beamAngleDeg?: number;
  fieldAngle?: number;
  dimmingRange?: [number, number];
  bowensMountCompatible: boolean;
  batteryPowered: boolean;
  hssCapable: boolean;
  ttlCompatible: boolean;
  recycleTimeMs?: number;
  flashDurationMs?: number;
  weight?: number;
  weightKg: number;
  dimensions?: { width: number; height: number; depth: number };
  mountType?: string;
  compatibleModifiers?: string[];
  fanNoise?: number;
  wirelessControl?: boolean;
  dmxChannels?: number;
  ipRating?: string;
  price?: number;
  msrpPrice?: number;
  [key: string]: unknown;
}

export interface ModifierCompatibility {
  mountType: string;
  compatibleLightIds: string[];
}

class EquipmentSpecsService {
  private specs: LightSpecifications[] = [
    {
      id: 'profoto-b10',
      brand: 'Profoto',
      model: 'B10',
      type: 'strobe',
      maxPowerWatts: 250,
      colorTemperatureK: 5500,
      cri: 96,
      bowensMountCompatible: false,
      batteryPowered: true,
      hssCapable: true,
      ttlCompatible: true,
      recycleTimeMs: 1500,
      flashDurationMs: 1 / 3500,
      weightKg: 1.9,
    },
    {
      id: 'godox-ad600',
      brand: 'Godox',
      model: 'AD600Pro',
      type: 'strobe',
      maxPowerWatts: 600,
      colorTemperatureK: 5600,
      cri: 93,
      bowensMountCompatible: true,
      batteryPowered: true,
      hssCapable: true,
      ttlCompatible: true,
      recycleTimeMs: 1500,
      weightKg: 2.8,
    },
    {
      id: 'aputure-300x',
      brand: 'Aputure',
      model: '300X',
      type: 'led',
      maxPowerWatts: 350,
      colorTemperatureK: [2700, 6500],
      cri: 96,
      tlci: 96,
      bowensMountCompatible: true,
      batteryPowered: false,
      hssCapable: false,
      ttlCompatible: false,
      beamAngleDeg: 55,
      weightKg: 3.0,
    },
  ];

  getAll(): LightSpecifications[] {
    return [...this.specs];
  }

  getById(id: string): LightSpecifications | undefined {
    return this.specs.find((s) => s.id === id);
  }

  getByBrand(brand: string): LightSpecifications[] {
    return this.specs.filter((s) => s.brand.toLowerCase() === brand.toLowerCase());
  }

  getByType(type: LightSpecifications['type']): LightSpecifications[] {
    return this.specs.filter((s) => s.type === type);
  }

  compareLights(idA: string, idB: string): { a: LightSpecifications | undefined; b: LightSpecifications | undefined } {
    return { a: this.getById(idA), b: this.getById(idB) };
  }

  getLightSpecs(id: string): LightSpecifications | undefined {
    return this.getById(id);
  }

  getModifierSpecs(_id: string): {
    brand?: string;
    model?: string;
    name?: string;
    type?: string;
    size?: string;
    shape?: string;
    mountType?: string;
    diffusionLayers?: number;
    powerLossStops?: number;
    diffusionFactor?: number;
    weight?: number;
    gridIncluded?: boolean;
    gridDegrees?: number;
    [key: string]: unknown;
  } | undefined {
    return undefined;
  }

  isCompatible(lightId: string, _modifierId: string): boolean {
    const spec = this.getById(lightId);
    return spec !== undefined;
  }

  calculateEffectiveOutput(lightId: string, settings?: string | { power?: number; distance?: number }): number {
    if (typeof settings === 'string') settings = undefined;
    const spec = this.getById(lightId);
    if (!spec) return 0;
    const power = settings?.power ?? 1.0;
    const distance = settings?.distance ?? 1.0;
    return (spec.maxPowerWatts * power) / (distance * distance);
  }
}

export const equipmentSpecsService = new EquipmentSpecsService();
export default equipmentSpecsService;
