export type TemplateCategory =
  | 'portrait'
  | 'fashion'
  | 'product'
  | 'cinematic'
  | 'event'
  | 'corporate'
  | 'nature'
  | 'action'
  | 'commercial'
  | 'interview'
  | 'dramatic'
  | 'ambient';

export interface RequiredNode {
  type: 'camera' | 'light' | 'mesh';
  label: string;
  role: string;
}

export interface TemplateStep {
  time: number;
  description: string;
}

export interface AnimationTemplate {
  id: string;
  name: string;
  label: string;
  description: string;
  category: TemplateCategory;
  duration: number;
  totalDuration?: number;
  thumbnail?: string;
  tags: string[];
  requiredNodes?: RequiredNode[];
  steps?: TemplateStep[];
  tracks: Array<{
    targetType: 'camera' | 'light' | 'mesh';
    property: string;
    keyframes: Array<{ time: number; value: number | number[] }>;
  }>;
}

export const ANIMATION_TEMPLATES: AnimationTemplate[] = [
  {
    id: 'portrait-reveal',
    name: 'portrait-reveal',
    label: 'Portrett Avduking',
    description: 'Lyset åpenbarer seg gradvis rundt motivet',
    category: 'portrait',
    duration: 4.0,
    tags: ['portrett', 'lys', 'dramatisk'],
    tracks: [
      {
        targetType: 'light',
        property: 'intensity',
        keyframes: [{ time: 0, value: 0 }, { time: 2, value: 0.3 }, { time: 4, value: 1.0 }],
      },
    ],
  },
  {
    id: 'fashion-walk',
    name: 'fashion-walk',
    label: 'Mote Gange',
    description: 'Kamerabevegelse som følger en motemodell',
    category: 'fashion',
    duration: 6.0,
    tags: ['mote', 'kamera', 'bevegelse'],
    tracks: [
      {
        targetType: 'camera',
        property: 'position.z',
        keyframes: [{ time: 0, value: 4 }, { time: 6, value: 2 }],
      },
    ],
  },
  {
    id: 'product-360',
    name: 'product-360',
    label: 'Produkt 360°',
    description: 'Kamera roterer 360° rundt produktet',
    category: 'product',
    duration: 8.0,
    tags: ['produkt', 'rotasjon', '360'],
    tracks: [
      {
        targetType: 'camera',
        property: 'rotation.y',
        keyframes: [{ time: 0, value: 0 }, { time: 8, value: 6.283 }],
      },
    ],
  },
  {
    id: 'cinematic-dolly',
    name: 'cinematic-dolly',
    label: 'Filmisk Dolly',
    description: 'Sakte kamerabevegelse med lys-fade',
    category: 'cinematic',
    duration: 10.0,
    tags: ['film', 'dolly', 'cinematisk'],
    tracks: [
      {
        targetType: 'camera',
        property: 'position.z',
        keyframes: [{ time: 0, value: 6 }, { time: 10, value: 3 }],
      },
      {
        targetType: 'light',
        property: 'intensity',
        keyframes: [{ time: 0, value: 0.5 }, { time: 5, value: 1.0 }, { time: 10, value: 0.8 }],
      },
    ],
  },
];

export function getTemplatesByCategory(category: TemplateCategory): AnimationTemplate[] {
  return ANIMATION_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): AnimationTemplate | undefined {
  return ANIMATION_TEMPLATES.find((t) => t.id === id);
}

class AnimationTemplateService {
  getAllTemplates(): AnimationTemplate[] {
    return ANIMATION_TEMPLATES;
  }

  getTemplatesByCategory(category: TemplateCategory): AnimationTemplate[] {
    return ANIMATION_TEMPLATES.filter((t) => t.category === category);
  }

  searchTemplates(query: string): AnimationTemplate[] {
    const q = query.toLowerCase();
    return ANIMATION_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  applyTemplate(
    templateId: string,
    nodeMapping: Record<string, string>,
  ): { id: string; name: string; duration: number; tracks: unknown[] }[] {
    const template = ANIMATION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return [];
    return [
      {
        id: `clip-${templateId}-${Date.now()}`,
        name: template.label,
        duration: template.totalDuration ?? template.duration,
        tracks: template.tracks.map((tr, i) => ({
          id: `track-${i}`,
          name: `${tr.targetType}-${tr.property}`,
          targetId: nodeMapping[tr.targetType] ?? tr.targetType,
          targetType: 'node',
          property: tr.property,
          keyframes: tr.keyframes.map((kf) => ({
            time: kf.time,
            value: Array.isArray(kf.value) ? kf.value[0] ?? 0 : kf.value,
            easing: 'linear',
          })),
        })),
      },
    ];
  }
}

export const animationTemplateService = new AnimationTemplateService();
