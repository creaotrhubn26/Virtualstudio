export interface LightShaper {
  id: string;
  name: string;
  label: string;
  type: 'softbox' | 'octabox' | 'stripbox' | 'beauty-dish' | 'fresnel' | 'snoot' | 'grid' | 'barndoor' | 'reflector' | 'umbrella';
  size?: string;
  shape?: string;
  stopLoss: number;
  spread: number;
  softness: number;
  thumbnail?: string;
  mount?: string;
}

export const LIGHT_SHAPERS: LightShaper[] = [
  { id: 'softbox-60', name: 'softbox-60', label: 'Softbox 60cm', type: 'softbox', size: '60cm', shape: 'square', stopLoss: 1.5, spread: 80, softness: 0.8 },
  { id: 'softbox-90', name: 'softbox-90', label: 'Softbox 90cm', type: 'softbox', size: '90cm', shape: 'square', stopLoss: 1.5, spread: 90, softness: 0.85 },
  { id: 'octabox-120', name: 'octabox-120', label: 'Octabox 120cm', type: 'octabox', size: '120cm', shape: 'octagon', stopLoss: 2.0, spread: 100, softness: 0.9 },
  { id: 'strip-30x120', name: 'strip-30x120', label: 'Strip 30x120cm', type: 'stripbox', size: '30x120cm', shape: 'strip', stopLoss: 1.5, spread: 60, softness: 0.75 },
  { id: 'beauty-dish-55', name: 'beauty-dish-55', label: 'Beauty Dish 55cm', type: 'beauty-dish', size: '55cm', stopLoss: 0.5, spread: 70, softness: 0.6 },
  { id: 'snoot-standard', name: 'snoot-standard', label: 'Snoot', type: 'snoot', stopLoss: 0, spread: 20, softness: 0.1 },
  { id: 'grid-20', name: 'grid-20', label: 'Honeycomb Grid 20°', type: 'grid', size: '20°', stopLoss: 1.0, spread: 20, softness: 0.2 },
  { id: 'barndoor', name: 'barndoor', label: 'Barn Doors', type: 'barndoor', stopLoss: 0, spread: 60, softness: 0.3 },
];

class LightShaperService {
  getAll(): LightShaper[] {
    return LIGHT_SHAPERS;
  }

  getById(id: string): LightShaper | undefined {
    return LIGHT_SHAPERS.find((s) => s.id === id);
  }

  attach(_lightId: string, shaperId: string): void {
    console.log(`[LightShaperService] Attached ${shaperId}`);
  }

  detach(_lightId: string): void {
    console.log('[LightShaperService] Detached shaper');
  }

  calculateEffectiveIntensity(baseIntensity: number, shaper: LightShaper): number {
    return baseIntensity * Math.pow(0.5, shaper.stopLoss);
  }

  async getCompatibleShapers(_lightAssetId: string, _options?: { minScore?: number }): Promise<LightShaper[]> {
    return LIGHT_SHAPERS;
  }
}

export const lightShaperService = new LightShaperService();
export default lightShaperService;
