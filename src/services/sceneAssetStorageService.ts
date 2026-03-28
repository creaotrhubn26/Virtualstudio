export interface StoredSceneAssetResponse {
  success: boolean;
  assetId: string;
  url: string;
  storage: 'local' | 'r2' | string;
  contentType?: string;
  sizeBytes?: number;
  fileName?: string;
}

const STUDIO_API_BASE = '/api/studio';
export const THUMBNAIL_REMOTE_UPLOAD_THRESHOLD = 120_000;
export const REMOTE_EXPORT_UPLOAD_THRESHOLD_BYTES = 128 * 1024;

const thumbnailUploadCache = new Map<string, string>();
const thumbnailUploadInflight = new Map<string, Promise<string>>();

async function postStudioJson<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${STUDIO_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json() as Promise<T>;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function triggerBrowserDownload(url: string, fileName: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function isSceneThumbnailDataUrl(thumbnail?: string | null): boolean {
  return typeof thumbnail === 'string' && thumbnail.startsWith('data:image/');
}

export function shouldUploadSceneThumbnail(thumbnail?: string | null): boolean {
  return isSceneThumbnailDataUrl(thumbnail) && thumbnail.length >= THUMBNAIL_REMOTE_UPLOAD_THRESHOLD;
}

export function shouldUploadSceneExport(sizeBytes: number): boolean {
  return sizeBytes >= REMOTE_EXPORT_UPLOAD_THRESHOLD_BYTES;
}

export const sceneAssetStorageService = {
  async maybeStoreThumbnail(sceneId: string, thumbnail?: string | null): Promise<string | undefined> {
    if (!shouldUploadSceneThumbnail(thumbnail)) {
      return thumbnail ?? undefined;
    }

    const cacheKey = `${sceneId}:${thumbnail.length}:${thumbnail.slice(0, 48)}`;
    const cached = thumbnailUploadCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inflight = thumbnailUploadInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const uploadPromise = postStudioJson<StoredSceneAssetResponse>('/storage/thumbnail', {
      sceneId,
      thumbnailDataUrl: thumbnail,
      filename: `scene-thumbnail-${sceneId}.png`,
    })
      .then((result) => {
        const url = result.url || thumbnail;
        thumbnailUploadCache.set(cacheKey, url);
        return url;
      })
      .catch(() => thumbnail)
      .finally(() => {
        thumbnailUploadInflight.delete(cacheKey);
      });

    thumbnailUploadInflight.set(cacheKey, uploadPromise);
    return uploadPromise;
  },

  async uploadSceneExport(input: {
    sceneId: string;
    fileName: string;
    content: string;
    contentType: string;
    format: string;
  }): Promise<StoredSceneAssetResponse | null> {
    const bytes = new TextEncoder().encode(input.content);
    if (!shouldUploadSceneExport(bytes.byteLength)) {
      return null;
    }

    return postStudioJson<StoredSceneAssetResponse>('/scene-exports', {
      sceneId: input.sceneId,
      fileName: input.fileName,
      format: input.format,
      contentType: input.contentType,
      contentBase64: arrayBufferToBase64(bytes.buffer),
    });
  },

  async maybeDownloadSceneExport(input: {
    sceneId: string;
    fileName: string;
    content: string;
    contentType: string;
    format: string;
  }): Promise<boolean> {
    const stored = await this.uploadSceneExport(input);
    if (!stored?.url) {
      return false;
    }

    triggerBrowserDownload(stored.url, input.fileName);
    return true;
  },
};

