export type ModifierType = 'softbox' | 'octabox' | 'stripbox' | 'umbrella' | 'beauty-dish' | 'reflector' | 'grid' | 'snoot' | 'barn-doors' | 'diffuser' | 'fresnel' | 'ring-flash' | 'parabolic' | 'lantern';
export type ModifierMount = 'Bowens' | 'Profoto' | 'Elinchrom' | 'Broncolor' | 'Godox' | 'Nanlite' | 'Generic';
export type LightShape = 'square' | 'rectangle' | 'octagon' | 'strip' | 'circle' | 'ring' | 'parabolic' | 'lantern' | 'shoot-through' | 'deep-octagon';

export interface ModifierEntry {
  id: string;
  brand: string;
  model: string;
  name?: string;
  type: ModifierType;
  mount: ModifierMount[];
  mount_type?: string;
  shape?: LightShape;
  sizeMin?: number;
  sizeMax?: number;
  stopLoss: number;
  diffusion?: number;
  includeGrid?: boolean;
  price?: number;
  thumbnail?: string;
  description?: string;
  tags: string[];
  weight_kg?: number;
  files?: {
    glb?: string;
    thumbnail?: string;
    preview?: string;
  };
  dimensions?: {
    diameter?: number;
    width?: number;
    height?: number;
    depth?: number;
  };
}

export const MODIFIER_LIBRARY: ModifierEntry[] = [
  {
    id: 'profoto-rfi-3x4',
    brand: 'Profoto',
    model: 'RFi Softbox 3x4\'',
    type: 'softbox',
    mount: ['Profoto'],
    shape: 'rectangle',
    sizeMin: 90,
    sizeMax: 120,
    stopLoss: 1.5,
    diffusion: 0.8,
    includeGrid: true,
    price: 3990,
    tags: ['portrett', 'mote'],
  },
  {
    id: 'godox-qr-p120l',
    brand: 'Godox',
    model: 'QR-P120L Parabolic',
    type: 'parabolic',
    mount: ['Bowens'],
    shape: 'parabolic',
    sizeMin: 120,
    stopLoss: 1.5,
    diffusion: 0.85,
    price: 2990,
    tags: ['portrett', 'parabolic'],
  },
  {
    id: 'aputure-light-dome-ii',
    brand: 'Aputure',
    model: 'Light Dome II',
    type: 'softbox',
    mount: ['Bowens'],
    shape: 'parabolic',
    sizeMin: 90,
    stopLoss: 1.5,
    diffusion: 0.9,
    price: 1990,
    tags: ['allsidig', 'portrett'],
  },
  {
    id: 'westcott-rapid-box-strip',
    brand: 'Westcott',
    model: 'Rapid Box Switch Strip',
    type: 'stripbox',
    mount: ['Generic'],
    shape: 'strip',
    sizeMin: 15,
    sizeMax: 60,
    stopLoss: 1.5,
    diffusion: 0.75,
    price: 2490,
    tags: ['strip', 'mote', 'kantlys'],
  },
];

export function getModifierById(id: string): ModifierEntry | undefined {
  return MODIFIER_LIBRARY.find((m) => m.id === id);
}

export function getModifiersByType(type: ModifierType): ModifierEntry[] {
  return MODIFIER_LIBRARY.filter((m) => m.type === type);
}

export function getModifiersByMount(mount: ModifierMount): ModifierEntry[] {
  return MODIFIER_LIBRARY.filter((m) => m.mount.includes(mount));
}

export const modifierLibrary = {
  all: () => MODIFIER_LIBRARY,
  loadMetadata: async () => Promise.resolve(),
  getById: (id: string) => MODIFIER_LIBRARY.find((m) => m.id === id),
  filter: (fn: (m: ModifierEntry) => boolean) => MODIFIER_LIBRARY.filter(fn),
};

export type Modifier = ModifierEntry;

export function getAllModifiers(): ModifierEntry[] {
  return MODIFIER_LIBRARY;
}

export function getModifiersByBrand(brand: string): ModifierEntry[] {
  return MODIFIER_LIBRARY.filter((m) => m.brand?.toLowerCase() === brand.toLowerCase());
}

export function searchModifiers(query: string): ModifierEntry[] {
  const q = query.toLowerCase();
  return MODIFIER_LIBRARY.filter(
    (m) =>
      (m.name ?? '').toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q) ||
      (m.brand?.toLowerCase().includes(q) ?? false),
  );
}
