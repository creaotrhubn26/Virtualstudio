export interface LightEquipment {
  id: string;
  brand: string;
  model: string;
  power: number;
  colorTemperature: number;
  type: 'led' | 'strobe' | 'flash' | 'continuous';
}

export interface ModifierEquipment {
  id: string;
  name: string;
  type: 'softbox' | 'umbrella' | 'beauty_dish' | 'grid' | 'barn_doors' | 'universal';
  size: [number, number];
  diffusion: number;
}

export const ALL_LIGHTS: LightEquipment[] = [
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300D II', power: 300, colorTemperature: 5600, type: 'led' },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120D II', power: 120, colorTemperature: 5600, type: 'led' },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600D', power: 600, colorTemperature: 5600, type: 'led' },
  { id: 'godox-ad600', brand: 'Godox', model: 'AD600 Pro', power: 600, colorTemperature: 5600, type: 'strobe' },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10 Plus', power: 500, colorTemperature: 5500, type: 'strobe' },
];

export const ALL_MODIFIERS: ModifierEquipment[] = [
  { id: 'softbox-60', name: 'Softbox 60x60cm', type: 'softbox', size: [0.6, 0.6], diffusion: 0.8 },
  { id: 'softbox-90', name: 'Softbox 90x90cm', type: 'softbox', size: [0.9, 0.9], diffusion: 0.85 },
  { id: 'umbrella-120', name: 'Paraply 120cm', type: 'umbrella', size: [1.2, 1.2], diffusion: 0.7 },
  { id: 'beauty-dish-56', name: 'Beauty Dish 56cm', type: 'beauty_dish', size: [0.56, 0.56], diffusion: 0.5 },
  { id: 'universal-60', name: 'Universal Modifier', type: 'universal', size: [0.6, 0.6], diffusion: 0.6 },
];
