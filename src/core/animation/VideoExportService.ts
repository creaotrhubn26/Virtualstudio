export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'gif';
  resolution: { width: number; height: number };
  fps: number;
  quality: number;
  startTime: number;
  endTime: number;
  includeAudio: boolean;
}

export interface ExportResult {
  success: boolean;
  url?: string;
  blob?: Blob;
  duration?: number;
  size?: number;
  error?: string;
}

export interface ExportProgress {
  percent: number;
  frame: number;
  totalFrames: number;
  elapsed: number;
  eta: number;
}

class VideoExportService {
  private isExporting = false;
  private progressCallbacks: Array<(progress: ExportProgress) => void> = [];
  private cancelFlag = false;

  onProgress(callback: (progress: ExportProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyProgress(progress: ExportProgress): void {
    this.progressCallbacks.forEach((cb) => cb(progress));
  }

  async exportVideo(
    _canvasElement: HTMLCanvasElement,
    options: VideoExportOptions,
  ): Promise<ExportResult> {
    if (this.isExporting) {
      return { success: false, error: 'Export already in progress', duration: 0, size: 0 };
    }

    this.isExporting = true;
    this.cancelFlag = false;

    const totalFrames = Math.floor((options.endTime - options.startTime) * options.fps);
    const startTime = performance.now();

    for (let i = 0; i <= totalFrames; i++) {
      if (this.cancelFlag) {
        this.isExporting = false;
        return { success: false, error: 'Export cancelled', duration: 0, size: 0 };
      }
      const elapsed = (performance.now() - startTime) / 1000;
      const eta = i > 0 ? (elapsed / i) * (totalFrames - i) : 0;
      this.notifyProgress({ percent: (i / totalFrames) * 100, frame: i, totalFrames, elapsed, eta });
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.isExporting = false;
    return {
      success: true,
      url: URL.createObjectURL(new Blob([], { type: `video/${options.format}` })),
      duration: options.endTime - options.startTime,
      size: 0,
    };
  }

  cancelExport(): void {
    this.cancelFlag = true;
  }

  isCurrentlyExporting(): boolean {
    return this.isExporting;
  }

  formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}t ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}

export const videoExportService = new VideoExportService();
export default videoExportService;
