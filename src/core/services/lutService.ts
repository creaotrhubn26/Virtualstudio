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
  size?: number;
  data?: Float32Array | number[];
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

  parseCubeFile(text: string): LUTFile {
    const lines = text.split('\n');
    const meta: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TITLE')) meta['title'] = trimmed.replace('TITLE', '').trim().replace(/^"|"$/g, '');
      if (trimmed.startsWith('LUT_3D_SIZE')) meta['size'] = trimmed.split(/\s+/)[1] ?? '33';
    }
    const title = meta['title'] ?? `Custom LUT ${Date.now()}`;
    const id = `parsed-${Date.now()}`;
    return {
      id,
      name: id,
      label: title,
      filename: `${id}.cube`,
      category: 'creative',
      intensity: 1.0,
      tags: ['imported'],
    };
  }

  exportToCube(lut: LUTFile, options?: { size?: number; title?: string; domain?: [number, number] }): string {
    const size = options?.size ?? lut.size ?? 33;
    const lines: string[] = [
      `TITLE "${options?.title ?? lut.label}"`,
      `LUT_3D_SIZE ${size}`,
      '',
    ];
    for (let r = 0; r < size; r++) {
      for (let g = 0; g < size; g++) {
        for (let b = 0; b < size; b++) {
          const rv = (r / (size - 1)).toFixed(6);
          const gv = (g / (size - 1)).toFixed(6);
          const bv = (b / (size - 1)).toFixed(6);
          lines.push(`${rv} ${gv} ${bv}`);
        }
      }
    }
    return lines.join('\n');
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
