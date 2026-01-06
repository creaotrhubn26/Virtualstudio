/**
 * Google Drive Export Service
 * Handles uploading exports to Google Drive
 */

export interface ExportPreset {
  id: string;
  name: string;
  icon: string;
  platform: string;
  description: string;
  config: {
    format: 'webm' | 'mp4';
    width: number;
    height: number;
    fps: number;
    bitrate: number;
    aspectRatio: string;
  };
  tips: string[];
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  success?: boolean;
}

export interface GoogleDriveUploadProgress {
  phase: string;
  progress: number;
  bytesUploaded?: number;
  totalBytes?: number;
  status?: string;
  percentage?: number;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-hd',
    name: 'YouTube HD',
    icon: '📺',
    platform: 'youtube',
    description: 'Optimized for YouTube HD',
    config: {
      format: 'mp4',
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 8000000,
      aspectRatio: '16:9',
    },
    tips: ['Use 16:9 aspect ratio', 'Add end screens'],
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    icon: '📱',
    platform: 'instagram',
    description: 'Optimized for Instagram Reels',
    config: {
      format: 'mp4',
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: 6000000,
      aspectRatio: '9:16',
    },
    tips: ['Keep under 90 seconds', 'Use vertical format'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    platform: 'tiktok',
    description: 'Optimized for TikTok',
    config: {
      format: 'mp4',
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: 5000000,
      aspectRatio: '9:16',
    },
    tips: ['Keep under 3 minutes', 'Add trending sounds'],
  },
];

interface DriveStatus {
  connected: boolean;
  oauthAvailable: boolean;
}

interface ProjectFolder {
  id: string;
  name: string;
  webViewLink: string;
}

class GoogleDriveExportService {
  async uploadToDrive(
    blob: Blob,
    filename: string,
    folderId?: string
  ): Promise<DriveUploadResult> {
    // Mock implementation
    return {
      fileId: 'mock-file-id',
      webViewLink: 'https://drive.google.com/file/mock',
    };
  }

  async checkDriveStatus(_userId: string): Promise<DriveStatus> {
    return {
      connected: false,
      oauthAvailable: true,
    };
  }

  async getProjectFolders(_userId: string): Promise<ProjectFolder[]> {
    return [];
  }

  async uploadVideo(
    _exportResult: { blob?: Blob; url?: string; filename?: string },
    _options: {
      userId: string;
      projectId?: string;
      projectName?: string;
      folderId?: string;
      createFolder?: boolean;
    },
    _onProgress?: (progress: GoogleDriveUploadProgress) => void
  ): Promise<DriveUploadResult> {
    return {
      fileId: 'mock-file-id',
      webViewLink: 'https://drive.google.com/file/mock',
      success: true,
    };
  }

  getPresetsByPlatform(platform: string): ExportPreset[] {
    return EXPORT_PRESETS.filter((p) => p.platform === platform);
  }

  getAllPlatforms(): string[] {
    return [...new Set(EXPORT_PRESETS.map((p) => p.platform))];
  }

  getPresetById(id: string): ExportPreset | undefined {
    return EXPORT_PRESETS.find((p) => p.id === id);
  }
}

export const googleDriveExportService = new GoogleDriveExportService();

