export interface LightPreset {
  id: string;
  name: string;
  description?: string;
  lights: Array<{
    type: string;
    position: [number, number, number];
    rotation: [number, number, number];
    intensity: number;
    color?: string;
    cct?: number;
    modifier?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  tags?: string[];
}

class LightPresetsService {
  private presets: LightPreset[] = [];

  getAll(): LightPreset[] {
    return [...this.presets];
  }

  getById(id: string): LightPreset | undefined {
    return this.presets.find((p) => p.id === id);
  }

  save(preset: Omit<LightPreset, 'id' | 'createdAt' | 'updatedAt'>): LightPreset {
    const newPreset: LightPreset = {
      ...preset,
      id: `preset-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.presets.push(newPreset);
    return newPreset;
  }

  update(id: string, updates: Partial<LightPreset>): void {
    const index = this.presets.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.presets[index] = { ...this.presets[index], ...updates, updatedAt: new Date().toISOString() };
    }
  }

  delete(id: string): void {
    this.presets = this.presets.filter((p) => p.id !== id);
  }

  toggleFavorite(id: string): void {
    const preset = this.presets.find((p) => p.id === id);
    if (preset) {
      preset.isFavorite = !preset.isFavorite;
    }
  }
}

export const lightPresetsService = new LightPresetsService();
export default lightPresetsService;
