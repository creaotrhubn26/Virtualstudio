export type PropCategory =
  | 'furniture'
  | 'electronics'
  | 'decorations'
  | 'tools'
  | 'vehicles'
  | 'nature'
  | 'architecture'
  | 'lighting';

export interface PropDefinition {
  id: string;
  name: string;
  description: string;
  category: PropCategory;
  modelUrl: string | null;
  thumbnailUrl: string | null;
  defaultScale: number;
  size: 'small' | 'medium' | 'large';
  complexity: 'low' | 'medium' | 'high';
  supportsLOD: boolean;
  supportsInstancing: boolean;
  metadata?: Record<string, unknown>;
}

export const PROP_DEFINITIONS: PropDefinition[] = [
  {
    id: 'stool_wooden',
    name: 'Trekrakk',
    description: 'Solid, light wooden stool suited for studio seating or props staging.',
    category: 'furniture',
    modelUrl: '/models/props/stool.glb',
    thumbnailUrl: null,
    defaultScale: 1.0,
    size: 'small',
    complexity: 'low',
    supportsLOD: true,
    supportsInstancing: true,
  },
  {
    id: 'chair_posing',
    name: 'Posestol',
    description: 'Comfortable posing chair with stable proportions for portrait sessions.',
    category: 'furniture',
    modelUrl: '/models/props/chair.glb',
    thumbnailUrl: null,
    defaultScale: 1.0,
    size: 'medium',
    complexity: 'medium',
    supportsLOD: true,
    supportsInstancing: true,
  },
  {
    id: 'table_small',
    name: 'Lite Bord',
    description: 'Compact side table for small props, lighting accessories, or décor.',
    category: 'furniture',
    modelUrl: '/models/props/table_small.glb',
    thumbnailUrl: null,
    defaultScale: 1.0,
    size: 'medium',
    complexity: 'low',
    supportsLOD: true,
    supportsInstancing: true,
  },
  {
    id: 'backdrop_sweep',
    name: 'Bakgrunnssveip',
    description: 'Seamless curved backdrop for clean horizon lines and studio-grade backgrounds.',
    category: 'architecture',
    modelUrl: null,
    thumbnailUrl: null,
    defaultScale: 1.0,
    size: 'large',
    complexity: 'low',
    supportsLOD: false,
    supportsInstancing: false,
    metadata: { width: 3, height: 3, curveRadius: 0.5 },
  },
  {
    id: 'vase_ceramic',
    name: 'Keramikkvase',
    description: 'Minimal ceramic vase for table-top styling and still-life scenes.',
    category: 'decorations',
    modelUrl: '/models/props/vase.glb',
    thumbnailUrl: null,
    defaultScale: 0.3,
    size: 'small',
    complexity: 'low',
    supportsLOD: true,
    supportsInstancing: true,
  },
  {
    id: 'plant_potted',
    name: 'Potteplante',
    description: 'Medium potted plant for natural texture and environmental fill.',
    category: 'nature',
    modelUrl: '/models/props/plant.glb',
    thumbnailUrl: null,
    defaultScale: 0.5,
    size: 'medium',
    complexity: 'medium',
    supportsLOD: true,
    supportsInstancing: true,
  },
];

export const ALL_PROPS: PropDefinition[] = PROP_DEFINITIONS;

export const PROPS_BY_CATEGORY: Record<PropCategory, PropDefinition[]> = {
  furniture: PROP_DEFINITIONS.filter((p) => p.category === 'furniture'),
  electronics: PROP_DEFINITIONS.filter((p) => p.category === 'electronics'),
  decorations: PROP_DEFINITIONS.filter((p) => p.category === 'decorations'),
  tools: PROP_DEFINITIONS.filter((p) => p.category === 'tools'),
  vehicles: PROP_DEFINITIONS.filter((p) => p.category === 'vehicles'),
  nature: PROP_DEFINITIONS.filter((p) => p.category === 'nature'),
  architecture: PROP_DEFINITIONS.filter((p) => p.category === 'architecture'),
  lighting: PROP_DEFINITIONS.filter((p) => p.category === 'lighting'),
};

export function getPropById(id: string): PropDefinition | undefined {
  return PROP_DEFINITIONS.find((p) => p.id === id);
}

export function getPropsByCategory(category: PropCategory): PropDefinition[] {
  return PROPS_BY_CATEGORY[category];
}

export function getAllProps(): PropDefinition[] {
  return PROP_DEFINITIONS;
}
