export interface LightPattern {
  id: string;
  name: string;
  label: string;
  description: string;
  category: 'portrait' | 'product' | 'fashion' | 'cinematic' | 'corporate';
  lights: Array<{
    role: 'key' | 'fill' | 'hair' | 'rim' | 'background' | 'accent';
    position: [number, number, number];
    rotation: [number, number, number];
    intensity: number;
    cct?: number;
    modifier?: string;
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export const LIGHT_PATTERNS: LightPattern[] = [
  {
    id: 'one-light-key',
    name: 'one-light-key',
    label: 'Ett-Lys Nøkkel',
    description: 'Enkelt nøkkellys for dramatisk effekt',
    category: 'portrait',
    lights: [{ role: 'key', position: [1.5, 2, 1.5], rotation: [-30, -30, 0], intensity: 1.0, cct: 5500, modifier: 'softbox-60' }],
    difficulty: 'beginner',
    tags: ['enkel', 'dramatisk', 'portrett'],
  },
  {
    id: 'three-point',
    name: 'three-point',
    label: 'Tre-Punkts Lys',
    description: 'Klassisk tre-punkts lyssetting',
    category: 'portrait',
    lights: [
      { role: 'key', position: [1.5, 2, 1.5], rotation: [-30, -30, 0], intensity: 1.0, cct: 5500, modifier: 'softbox-90' },
      { role: 'fill', position: [-1.5, 1.5, 1], rotation: [-15, 30, 0], intensity: 0.4, cct: 5500 },
      { role: 'hair', position: [0, 2.5, -1.5], rotation: [45, 0, 0], intensity: 0.6, cct: 5500 },
    ],
    difficulty: 'intermediate',
    tags: ['klassisk', 'tre-punkt', 'portrett'],
  },
  {
    id: 'fashion-cross',
    name: 'fashion-cross',
    label: 'Mote Kryss-Lys',
    description: 'Kryss-lyssetting for mote',
    category: 'fashion',
    lights: [
      { role: 'key', position: [2, 2.5, 1], rotation: [-35, -45, 0], intensity: 1.0, cct: 5600, modifier: 'strip-30x120' },
      { role: 'fill', position: [-2, 2.5, 1], rotation: [-35, 45, 0], intensity: 0.7, cct: 5600, modifier: 'strip-30x120' },
      { role: 'background', position: [0, 1.5, -2], rotation: [0, 0, 0], intensity: 0.5, cct: 5600 },
    ],
    difficulty: 'intermediate',
    tags: ['mote', 'kryss', 'strip'],
  },
];

class LightPatternService {
  getAll(): LightPattern[] {
    return LIGHT_PATTERNS;
  }

  getById(id: string): LightPattern | undefined {
    return LIGHT_PATTERNS.find((p) => p.id === id);
  }

  getByCategory(category: LightPattern['category']): LightPattern[] {
    return LIGHT_PATTERNS.filter((p) => p.category === category);
  }

  search(query: string): LightPattern[] {
    const q = query.toLowerCase();
    return LIGHT_PATTERNS.filter(
      (p) => p.name.includes(q) || p.label.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)),
    );
  }
}

export const lightPatternService = new LightPatternService();
export default lightPatternService;
