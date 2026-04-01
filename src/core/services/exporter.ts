export type ExportFileFormat = 'glb' | 'gltf' | 'fbx' | 'obj' | 'usdz' | 'babylon' | 'json';

export interface ExportOptions {
  format: ExportFileFormat;
  includeTextures: boolean;
  includeLights: boolean;
  includeCamera: boolean;
  includeAnimations: boolean;
  compressTextures: boolean;
  textureResolution: 512 | 1024 | 2048 | 4096;
  embedTextures: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  sizeBytes: number;
  url?: string;
  blob?: Blob;
  error?: string;
  warnings: string[];
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'glb',
  includeTextures: true,
  includeLights: true,
  includeCamera: true,
  includeAnimations: true,
  compressTextures: true,
  textureResolution: 2048,
  embedTextures: true,
};

class ExporterService {
  async exportScene(_scene: unknown, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    console.log('[Exporter] Exporting scene as', opts.format);
    return {
      success: true,
      filename: `scene.${opts.format}`,
      sizeBytes: 0,
      blob: new Blob([], { type: 'model/gltf-binary' }),
      warnings: [],
    };
  }

  async exportNode(_nodeId: string, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    return {
      success: true,
      filename: `node.${opts.format}`,
      sizeBytes: 0,
      blob: new Blob([], { type: 'model/gltf-binary' }),
      warnings: [],
    };
  }

  getSupportedFormats(): ExportFileFormat[] {
    return ['glb', 'gltf', 'fbx', 'obj', 'usdz', 'babylon', 'json'];
  }

  getDefaultOptions(): ExportOptions {
    return { ...DEFAULT_EXPORT_OPTIONS };
  }
}

export const exporter = new ExporterService();
export default exporter;

export function exportJSON(scene: unknown): void {
  const json = JSON.stringify(scene, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scene-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
