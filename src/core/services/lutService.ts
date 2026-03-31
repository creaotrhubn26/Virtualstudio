export interface LUTFile {
  id: string;
  name: string;
  label: string;
  filename: string;
  category: 'creative' | 'technical' | 'film-emulation' | 'correction';
  intensity: number;
  preview?: string;
  description?: string;
  tags: string[];
}

export const BUILT_IN_LUTS: LUTFile[] = [
  { id: 'rec709', name: 'rec709', label: 'Rec.709', filename: 'Rec709.cube', category: 'technical', intensity: 1.0, tags: ['broadcast', 'standard'] },
  { id: 'srgb', name: 'srgb', label: 'sRGB', filename: 'sRGB.cube', category: 'technical', intensity: 1.0, tags: ['web', 'standard'] },
  { id: 'cinematic-warm', name: 'cinematic-warm', label: 'Filmisk Varm', filename: 'CinematicWarm.cube', category: 'film-emulation', intensity: 0.8, tags: ['varm', 'filmisk'], description: 'Varm filmemulering' },
  { id: 'bw-classic', name: 'bw-classic', label: 'Klassisk Svart/Hvit', filename: 'BWClassic.cube', category: 'creative', intensity: 1.0, tags: ['svarthvit', 'klassisk'] },
  { id: 'fuji-400h', name: 'fuji-400h', label: 'Fuji 400H Emulering', filename: 'Fuji400H.cube', category: 'film-emulation', intensity: 0.7, tags: ['fuji', 'film', 'analog'] },
];

class LUTService {
  private activeLUTId: string | null = null;
  private activeIntensity: number = 1.0;

  getAll(): LUTFile[] {
    return BUILT_IN_LUTS;
  }

  getById(id: string): LUTFile | undefined {
    return BUILT_IN_LUTS.find((l) => l.id === id);
  }

  getByCategory(category: LUTFile['category']): LUTFile[] {
    return BUILT_IN_LUTS.filter((l) => l.category === category);
  }

  applyLUT(id: string, intensity = 1.0): void {
    this.activeLUTId = id;
    this.activeIntensity = intensity;
    console.log(`[LUTService] Applied LUT: ${id} at ${intensity * 100}%`);
  }

  removeLUT(): void {
    this.activeLUTId = null;
    this.activeIntensity = 1.0;
  }

  getActiveLUT(): { lut: LUTFile | null; intensity: number } {
    return {
      lut: this.activeLUTId ? this.getById(this.activeLUTId) ?? null : null,
      intensity: this.activeIntensity,
    };
  }

  async loadCustomLUT(_file: File): Promise<LUTFile> {
    const customLUT: LUTFile = {
      id: `custom-${Date.now()}`,
      name: 'custom',
      label: 'Egendefinert LUT',
      filename: 'custom.cube',
      category: 'creative',
      intensity: 1.0,
      tags: ['egendefinert'],
    };
    return customLUT;
  }
}

export const lutService = new LUTService();
export default lutService;
