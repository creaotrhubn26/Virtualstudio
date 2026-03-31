export interface LightSpecifications {
  id: string;
  brand: string;
  model: string;
  type: 'strobe' | 'continuous' | 'led' | 'hmi' | 'tungsten' | 'fluorescent';
  maxPowerWatts: number;
  colorTemperatureK: number | [number, number];
  cri?: number;
  tlci?: number;
  bowensMountCompatible: boolean;
  batteryPowered: boolean;
  hssCapable: boolean;
  ttlCompatible: boolean;
  recycleTimeMs?: number;
  flashDurationMs?: number;
  beamAngleDeg?: number;
  weightKg: number;
  dimensions?: { width: number; height: number; depth: number };
  ipRating?: string;
  price?: number;
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
}

export const equipmentSpecsService = new EquipmentSpecsService();
export default equipmentSpecsService;
