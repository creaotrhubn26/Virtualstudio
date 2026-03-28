type PreviewCaptureOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/png';
  cacheKey?: string;
  cacheTtlMs?: number;
  forceFresh?: boolean;
};

type PreviewCaptureWindow = Window & {
  virtualStudio?: {
    captureEnvironmentValidationPreview?: (options?: PreviewCaptureOptions) => Promise<string | null> | string | null;
  };
  __virtualStudioDiagnostics?: {
    environment?: {
      updatedAt?: string | null;
    };
  };
  __virtualStudioEnvironmentPreviewMock?: string | null | ((options?: PreviewCaptureOptions) => Promise<string | null> | string | null);
};

function getWindowRef(): PreviewCaptureWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as PreviewCaptureWindow;
}

function scaleDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

class EnvironmentPreviewCaptureService {
  private previewCache = new Map<string, { capturedAt: number; preview: string | null }>();

  private buildCacheKey(
    win: PreviewCaptureWindow,
    options: PreviewCaptureOptions,
  ): string {
    return JSON.stringify({
      sceneVersion: options.cacheKey || win.__virtualStudioDiagnostics?.environment?.updatedAt || 'no-scene-version',
      maxWidth: options.maxWidth ?? 960,
      maxHeight: options.maxHeight ?? 540,
      quality: options.quality ?? 0.82,
      mimeType: options.mimeType ?? 'image/jpeg',
    });
  }

  async capturePreview(options: PreviewCaptureOptions = {}): Promise<string | null> {
    const win = getWindowRef();
    if (!win) {
      return null;
    }

    const cacheTtlMs = Math.max(0, options.cacheTtlMs ?? 600);
    const cacheKey = this.buildCacheKey(win, options);
    if (!options.forceFresh && cacheTtlMs > 0) {
      const cached = this.previewCache.get(cacheKey);
      if (cached && (Date.now() - cached.capturedAt) <= cacheTtlMs) {
        return cached.preview;
      }
    }

    const mock = win.__virtualStudioEnvironmentPreviewMock;
    if (typeof mock === 'function') {
      const preview = await mock(options);
      if (cacheTtlMs > 0) {
        this.previewCache.set(cacheKey, { capturedAt: Date.now(), preview });
      }
      return preview;
    }
    if (typeof mock === 'string' || mock === null) {
      if (cacheTtlMs > 0) {
        this.previewCache.set(cacheKey, { capturedAt: Date.now(), preview: mock });
      }
      return mock;
    }

    if (typeof win.virtualStudio?.captureEnvironmentValidationPreview === 'function') {
      const preview = await win.virtualStudio.captureEnvironmentValidationPreview(options);
      if (cacheTtlMs > 0) {
        this.previewCache.set(cacheKey, { capturedAt: Date.now(), preview });
      }
      return preview;
    }

    const renderCanvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
    if (!renderCanvas) {
      return null;
    }

    const maxWidth = Math.max(320, options.maxWidth ?? 960);
    const maxHeight = Math.max(180, options.maxHeight ?? 540);
    const mimeType = options.mimeType ?? 'image/jpeg';
    const quality = Math.max(0.3, Math.min(1, options.quality ?? 0.82));

    try {
      const { width, height } = scaleDimensions(
        renderCanvas.width || renderCanvas.clientWidth || maxWidth,
        renderCanvas.height || renderCanvas.clientHeight || maxHeight,
        maxWidth,
        maxHeight,
      );

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const context = offscreenCanvas.getContext('2d');
      if (!context) {
        return null;
      }

      context.drawImage(renderCanvas, 0, 0, width, height);
      const preview = offscreenCanvas.toDataURL(mimeType, quality);
      if (cacheTtlMs > 0) {
        this.previewCache.set(cacheKey, { capturedAt: Date.now(), preview });
      }
      return preview;
    } catch {
      try {
        const preview = renderCanvas.toDataURL(mimeType, quality);
        if (cacheTtlMs > 0) {
          this.previewCache.set(cacheKey, { capturedAt: Date.now(), preview });
        }
        return preview;
      } catch {
        return null;
      }
    }
  }
}

export const environmentPreviewCaptureService = new EnvironmentPreviewCaptureService();
