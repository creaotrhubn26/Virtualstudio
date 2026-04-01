export type EquipmentCategory = 'lighting' | 'modifier' | 'camera' | 'lens' | 'accessory' | 'grip';

export interface LightEquipment {
  id: string;
  brand: string;
  model: string;
  name: string;
  category: EquipmentCategory;
  power: number;
  colorTemperature: number;
  type: 'led' | 'strobe' | 'flash' | 'continuous';
  wattage?: number;
  specifications?: Record<string, unknown>;
  serialNumber?: string;
  condition?: string;
  status?: 'available' | 'in-use' | 'maintenance' | 'retired';
  location?: string;
}

export interface ModifierEquipment {
  id: string;
  brand: string;
  model: string;
  name: string;
  category: EquipmentCategory;
  type: 'softbox' | 'umbrella' | 'beauty_dish' | 'grid' | 'barn_doors' | 'universal';
  size: [number, number];
  diffusion: number;
  specifications?: Record<string, unknown>;
  serialNumber?: string;
  condition?: string;
  status?: 'available' | 'in-use' | 'maintenance' | 'retired';
  location?: string;
}

export const ALL_LIGHTS: LightEquipment[] = [
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300D II', name: 'Aputure LS 300D II', category: 'lighting', power: 300, colorTemperature: 5600, type: 'led', wattage: 300 },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120D II', name: 'Aputure LS 120D II', category: 'lighting', power: 120, colorTemperature: 5600, type: 'led', wattage: 120 },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600D', name: 'Aputure LS 600D', category: 'lighting', power: 600, colorTemperature: 5600, type: 'led', wattage: 600 },
  { id: 'godox-ad600', brand: 'Godox', model: 'AD600 Pro', name: 'Godox AD600 Pro', category: 'lighting', power: 600, colorTemperature: 5600, type: 'strobe', wattage: 600 },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10 Plus', name: 'Profoto B10 Plus', category: 'lighting', power: 500, colorTemperature: 5500, type: 'strobe', wattage: 500 },
];

export const ALL_MODIFIERS: ModifierEquipment[] = [
  { id: 'softbox-60', brand: 'Generic', model: 'Softbox 60', name: 'Softbox 60x60cm', category: 'modifier', type: 'softbox', size: [0.6, 0.6], diffusion: 0.8 },
  { id: 'softbox-90', brand: 'Generic', model: 'Softbox 90', name: 'Softbox 90x90cm', category: 'modifier', type: 'softbox', size: [0.9, 0.9], diffusion: 0.85 },
  { id: 'umbrella-120', brand: 'Generic', model: 'Paraply 120', name: 'Paraply 120cm', category: 'modifier', type: 'umbrella', size: [1.2, 1.2], diffusion: 0.7 },
  { id: 'beauty-dish-56', brand: 'Generic', model: 'Beauty Dish 56', name: 'Beauty Dish 56cm', category: 'modifier', type: 'beauty_dish', size: [0.56, 0.56], diffusion: 0.5 },
  { id: 'universal-60', brand: 'Generic', model: 'Universal 60', name: 'Universal Modifier', category: 'modifier', type: 'universal', size: [0.6, 0.6], diffusion: 0.6 },
];
