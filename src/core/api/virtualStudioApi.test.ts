import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSettingMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock('../../services/settingsService', () => ({
  __esModule: true,
  default: {
    getSetting: getSettingMock,
    setSetting: setSettingMock,
  },
  getCurrentUserId: () => 'test-user',
}));

vi.mock('../../services/virtualStudioApiService', () => ({
  __esModule: true,
  default: {},
}));

describe('snapshotsApi', () => {
  beforeEach(() => {
    getSettingMock.mockReset();
    setSettingMock.mockReset();
    vi.restoreAllMocks();
  });

  it('prefers normalized remote snapshot fields when persisting local cache', async () => {
    const remoteSnapshot = {
      id: 'snapshot_remote_123',
      sceneId: 'scene-1',
      name: 'After preset',
      description: 'Remote normalized snapshot',
      thumbnailUrl: '/api/studio/storage/files/scene-snapshot-remote.png',
      thumbnailAssetId: 'scene-snapshot-remote.png',
      thumbnailStorage: 'r2',
      sceneState: { camera: { id: 'camA' } },
      createdAt: '2026-03-19T00:00:00.000Z',
    };

    getSettingMock.mockResolvedValueOnce([]);
    setSettingMock.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: remoteSnapshot }),
      }),
    );

    const { snapshotsApi } = await import('./virtualStudioApi');
    const created = await snapshotsApi.create({
      sceneId: 'scene-1',
      name: 'After preset',
      description: 'Local preview',
      thumbnailUrl: 'data:image/png;base64,abc123',
      sceneState: { camera: { id: 'camA' } },
    });

    expect(created.id).toBe(remoteSnapshot.id);
    expect(created.thumbnailUrl).toBe(remoteSnapshot.thumbnailUrl);
    expect(created.thumbnailAssetId).toBe(remoteSnapshot.thumbnailAssetId);
    expect(setSettingMock).toHaveBeenCalledWith(
      'virtualStudio_snapshots',
      [
        expect.objectContaining({
          id: remoteSnapshot.id,
          thumbnailUrl: remoteSnapshot.thumbnailUrl,
          thumbnailAssetId: remoteSnapshot.thumbnailAssetId,
          thumbnailStorage: 'r2',
        }),
      ],
      expect.objectContaining({ projectId: 'scene-1', userId: 'test-user' }),
    );
  });
});

