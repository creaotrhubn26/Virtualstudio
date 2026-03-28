import { describe, expect, it } from 'vitest';
import {
  REMOTE_EXPORT_UPLOAD_THRESHOLD_BYTES,
  THUMBNAIL_REMOTE_UPLOAD_THRESHOLD,
  isSceneThumbnailDataUrl,
  shouldUploadSceneExport,
  shouldUploadSceneThumbnail,
} from './sceneAssetStorageService';

describe('sceneAssetStorageService helpers', () => {
  it('detects image data URLs that should be offloaded', () => {
    const thumbnail = `data:image/png;base64,${'a'.repeat(THUMBNAIL_REMOTE_UPLOAD_THRESHOLD)}`;

    expect(isSceneThumbnailDataUrl(thumbnail)).toBe(true);
    expect(shouldUploadSceneThumbnail(thumbnail)).toBe(true);
  });

  it('keeps small or remote thumbnails inline', () => {
    expect(shouldUploadSceneThumbnail('https://cdn.example.com/thumb.png')).toBe(false);
    expect(shouldUploadSceneThumbnail('data:image/png;base64,small')).toBe(false);
    expect(shouldUploadSceneThumbnail(undefined)).toBe(false);
  });

  it('only uploads exports when they cross the remote threshold', () => {
    expect(shouldUploadSceneExport(REMOTE_EXPORT_UPLOAD_THRESHOLD_BYTES - 1)).toBe(false);
    expect(shouldUploadSceneExport(REMOTE_EXPORT_UPLOAD_THRESHOLD_BYTES)).toBe(true);
  });
});

