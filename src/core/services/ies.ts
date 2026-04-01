export interface IESProfile {
  id: string;
  name: string;
  label: string;
  manufacturer: string;
  lumens: number;
  cct: number;
  cri: number;
  filename: string;
  url: string;
  category: 'spot' | 'flood' | 'downlight' | 'uplight' | 'wallwash' | 'linear' | 'area';
  beamAngle: number;
  fieldAngle: number;
  description?: string;
  thumbnail?: string;
  metadata?: {
    manufacturer?: string;
    modelNumber?: string;
    lumens?: number;
    cct?: number;
    cri?: number;
    wattage?: number;
    beamAngle?: number;
    fieldAngle?: number;
    luminaire?: string;
  };
}

export const IES_PROFILES: IESProfile[] = [
  {
    id: 'spot-narrow',
    name: 'spot-narrow',
    label: 'Smal Spot',
    manufacturer: 'Generic',
    lumens: 1000,
    cct: 3000,
    cri: 90,
    filename: 'spot-narrow.ies',
    url: '/ies/spot-narrow.ies',
    category: 'spot',
    beamAngle: 10,
    fieldAngle: 20,
    description: 'Smal spotlight profil',
  },
  {
    id: 'flood-wide',
    name: 'flood-wide',
    label: 'Bred Flombelysning',
    manufacturer: 'Generic',
    lumens: 5000,
    cct: 4000,
    cri: 85,
    filename: 'flood-wide.ies',
    url: '/ies/flood-wide.ies',
    category: 'flood',
    beamAngle: 90,
    fieldAngle: 120,
    description: 'Bred flombelysning profil',
  },
  {
    id: 'downlight-standard',
    name: 'downlight-standard',
    label: 'Standard Nedlys',
    manufacturer: 'Generic',
    lumens: 800,
    cct: 3500,
    cri: 92,
    filename: 'downlight.ies',
    url: '/ies/downlight.ies',
    category: 'downlight',
    beamAngle: 30,
    fieldAngle: 60,
  },
];

export async function parseIES(_text: string): Promise<{ lumens: number; data: number[][] }> {
  return { lumens: 1000, data: [] };
}

class IESService {
  getProfiles(): IESProfile[] {
    return IES_PROFILES;
  }

  getById(id: string): IESProfile | undefined {
    return IES_PROFILES.find((p) => p.id === id);
  }

  getByCategory(category: IESProfile['category']): IESProfile[] {
    return IES_PROFILES.filter((p) => p.category === category);
  }

  async loadIES(profile: IESProfile): Promise<{ lumens: number; data: number[][] } | null> {
    try {
      const response = await fetch(profile.url);
      if (!response.ok) return null;
      const text = await response.text();
      return parseIES(text);
    } catch {
      console.warn(`[IESService] Failed to load IES: ${profile.url}`);
      return null;
    }
  }
}

export const iesService = new IESService();
export default iesService;

export interface IESMetadata {
  manufacturer?: string;
  modelNumber?: string;
  lumens?: number;
  cct?: number;
  cri?: number;
  wattage?: number;
  beamAngle?: number;
  fieldAngle?: number;
}

declare module './ies' {
}

export function renderIESToCanvas(
  profile: IESProfile,
  canvas: HTMLCanvasElement | number,
  options?: { colorMap?: string; resolution?: number }
): HTMLCanvasElement {
  let resolvedCanvas: HTMLCanvasElement;
  if (typeof canvas === 'number') {
    resolvedCanvas = document.createElement('canvas');
    resolvedCanvas.width = canvas;
    resolvedCanvas.height = canvas;
  } else {
    resolvedCanvas = canvas;
  }
  const ctx = resolvedCanvas.getContext('2d');
  if (!ctx) return resolvedCanvas;
  const w = resolvedCanvas.width;
  const h = resolvedCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) / 2 - 10;
  const beamAngle = profile.beamAngle ?? 45;
  const halfAngle = (beamAngle / 2) * (Math.PI / 180);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  gradient.addColorStop(0, 'rgba(255,240,180,0.9)');
  gradient.addColorStop(Math.min(halfAngle / Math.PI, 0.8), 'rgba(255,200,80,0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,200,0.3)';
  ctx.lineWidth = 1;
  for (let r = maxR / 4; r <= maxR; r += maxR / 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  return resolvedCanvas;
}
