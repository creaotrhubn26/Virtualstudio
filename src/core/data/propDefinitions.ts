export interface PropDefinition {
  id: string;
  name: string;
  category: 'furniture' | 'decoration' | 'backdrop' | 'tool' | 'accessory';
  modelUrl: string | null;
  thumbnailUrl: string | null;
  defaultScale: number;
  complexity: 'low' | 'medium' | 'high';
  supportsInstancing: boolean;
  metadata?: Record<string, unknown>;
}

export const PROP_DEFINITIONS: PropDefinition[] = [
  {
    id: 'stool_wooden',
    name: 'Trekrakk',
    category: 'furniture',
    modelUrl: '/models/props/stool.glb',
    thumbnailUrl: null,
    defaultScale: 1.0,
    complexity: 'low',
    supportsInstancing: true,
  },
  {
    id: 'chair_posing',
    name: 'Posestol',
    category: 'furniture',
    modelUrl: '/models/props/chair.glb',
    thumbnailUrl: null,
    defaultScale: 1.0,
    complexity: 'medium',
    supportsInstancing: true,
  },
  {
    id: 'table_small',
    name: 'Lite Bord',
    category: 'furniture',
    modelUrl: '/models/props/table_small.glb',
    thumbnailUrl: null,
    defaultScale: 1.0,
    complexity: 'low',
    supportsInstancing: true,
  },
  {
    id: 'backdrop_sweep',
    name: 'Bakgrunnssveip',
    category: 'backdrop',
    modelUrl: null,
    thumbnailUrl: null,
    defaultScale: 1.0,
    complexity: 'low',
    supportsInstancing: false,
    metadata: { width: 3, height: 3, curveRadius: 0.5 },
  },
  {
    id: 'vase_ceramic',
    name: 'Keramikkvase',
    category: 'decoration',
    modelUrl: '/models/props/vase.glb',
    thumbnailUrl: null,
    defaultScale: 0.3,
    complexity: 'low',
    supportsInstancing: true,
  },
  {
    id: 'plant_potted',
    name: 'Potteplante',
    category: 'decoration',
    modelUrl: '/models/props/plant.glb',
    thumbnailUrl: null,
    defaultScale: 0.5,
    complexity: 'medium',
    supportsInstancing: true,
  },
];

export function getPropById(id: string): PropDefinition | undefined {
  return PROP_DEFINITIONS.find((p) => p.id === id);
}

export function getPropsByCategory(category: PropDefinition['category']): PropDefinition[] {
  return PROP_DEFINITIONS.filter((p) => p.category === category);
}

export function getAllProps(): PropDefinition[] {
  return PROP_DEFINITIONS;
}
