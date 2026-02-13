export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  notes?: string;
  tags?: string[];
  thumbnailUrl?: string;
}

const svgDataUrl = (label: string, color: string): string => {
  const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9" />
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)" />
  <rect x="28" y="28" width="584" height="304" rx="18" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
  <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-size="32" font-family="Arial, sans-serif" fill="#ffffff">${safeLabel}</text>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.75)">Studio Template</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'studio-compact',
    name: 'Compact Studio',
    description: 'Tight footprint for small product shoots, interviews, and quick lighting setups.',
    dimensions: { width: 6, depth: 5, height: 3 },
    notes: 'Ideal for 1-2 subjects with basic three-point lighting.',
    tags: ['small', 'interview', 'product'],
    thumbnailUrl: svgDataUrl('Compact Studio', '#2563eb'),
  },
  {
    id: 'studio-mid',
    name: 'Mid-Size Studio',
    description: 'Balanced layout for portrait sessions, commercials, and multi-camera setups.',
    dimensions: { width: 10, depth: 8, height: 4 },
    notes: 'Supports larger light modifiers and movable background walls.',
    tags: ['portrait', 'commercial', 'multi-camera'],
    thumbnailUrl: svgDataUrl('Mid-Size Studio', '#7c3aed'),
  },
  {
    id: 'cyclorama',
    name: 'Cyclorama Stage',
    description: 'Seamless infinity wall for clean silhouettes, product work, and stylized lighting.',
    dimensions: { width: 12, depth: 10, height: 5 },
    notes: 'Use softboxes or overhead grid for even background exposure.',
    tags: ['cyclorama', 'infinity wall', 'clean'],
    thumbnailUrl: svgDataUrl('Cyclorama Stage', '#f97316'),
  },
  {
    id: 'warehouse',
    name: 'Warehouse Loft',
    description: 'Industrial environment with open space for large props and set dressing.',
    dimensions: { width: 16, depth: 12, height: 6 },
    notes: 'Great for narrative scenes and wide establishing shots.',
    tags: ['industrial', 'narrative', 'wide'],
    thumbnailUrl: svgDataUrl('Warehouse Loft', '#0ea5e9'),
  },
];

const templateIndex = new Map(ROOM_TEMPLATES.map((template) => [template.id, template]));

export const roomLoader = {
  getAvailableTemplates(): string[] {
    return ROOM_TEMPLATES.map((template) => template.id);
  },
  async loadTemplate(id: string): Promise<RoomTemplate | null> {
    return templateIndex.get(id) ?? null;
  },
};
