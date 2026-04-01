export interface ExportPreset {
  id: string;
  name: string;
  label: string;
  format: 'mp4' | 'mov' | 'gif' | 'webm';
  resolution: { width: number; height: number };
  fps: number;
  quality: number;
  description: string;
  icon?: string;
  platform?: string;
  config?: { width: number; height: number; fps: number };
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'web-hd',
    name: 'web-hd',
    label: 'Web HD',
    format: 'mp4',
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    quality: 80,
    description: 'Optimalisert for nettbruk',
  },
  {
    id: 'social-square',
    name: 'social-square',
    label: 'Sosiale Medier Kvadrat',
    format: 'mp4',
    resolution: { width: 1080, height: 1080 },
    fps: 30,
    quality: 80,
    description: 'Kvadratisk format for sosiale medier',
  },
  {
    id: 'preview-gif',
    name: 'preview-gif',
    label: 'Forhåndsvisning GIF',
    format: 'gif',
    resolution: { width: 640, height: 480 },
    fps: 15,
    quality: 70,
    description: 'Animert GIF for forhåndsvisning',
  },
  {
    id: '4k-master',
    name: '4k-master',
    label: '4K Masterformat',
    format: 'mov',
    resolution: { width: 3840, height: 2160 },
    fps: 24,
    quality: 100,
    description: 'Full 4K for arkivering',
  },
];

interface GoogleDriveConfig {
  folderId?: string;
  accessToken?: string;
}

class GoogleDriveExportService {
  private config: GoogleDriveConfig = {};

  configure(config: GoogleDriveConfig): void {
    this.config = { ...this.config, ...config };
  }

  async uploadFile(_fileName: string, _blob: Blob): Promise<string> {
    console.warn('Google Drive export not configured — returning placeholder URL');
    return `https://drive.google.com/file/placeholder/${Date.now()}`;
  }

  isConfigured(): boolean {
    return Boolean(this.config.accessToken);
  }
}

export const googleDriveExportService = new GoogleDriveExportService();
export default googleDriveExportService;
