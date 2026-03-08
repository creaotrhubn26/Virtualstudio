import { SceneComposition } from '../core/models/sceneComposer';
import settingsService, { getCurrentUserId } from './settingsService';
import { sceneComposerService } from './sceneComposerService';

const OFFLINE_NAMESPACE = 'virtualStudio_offlineMode';
const SYNC_NAMESPACE = 'virtualStudio_sceneSyncCache';

interface SyncedScenePayload {
  scenes: SceneComposition[];
  syncedAt: string;
}

const parsePayload = (raw: unknown): SyncedScenePayload | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  if (!Array.isArray(payload.scenes)) {
    return null;
  }

  return {
    scenes: payload.scenes as SceneComposition[],
    syncedAt: typeof payload.syncedAt === 'string' ? payload.syncedAt : new Date().toISOString(),
  };
};

const indexById = (scenes: SceneComposition[]): Map<string, SceneComposition> => {
  return new Map(scenes.map((scene) => [scene.id, scene]));
};

export const sceneSyncService = {
  async syncScenes(localScenes?: SceneComposition[]): Promise<{ synced: number; conflicts: number }> {
    const isOffline = await this.isOfflineMode();
    const sourceScenes = localScenes ?? sceneComposerService.getAllScenes();

    if (isOffline) {
      await settingsService.setSetting(
        SYNC_NAMESPACE,
        {
          scenes: sourceScenes,
          syncedAt: new Date().toISOString(),
        },
        { userId: getCurrentUserId() },
      );

      return { synced: sourceScenes.length, conflicts: 0 };
    }

    const existingRaw = await settingsService.getSetting<unknown>(SYNC_NAMESPACE, {
      userId: getCurrentUserId(),
    });

    const existing = parsePayload(existingRaw);
    const remoteScenes = existing?.scenes ?? [];

    const localById = indexById(sourceScenes);
    const remoteById = indexById(remoteScenes);

    let synced = 0;
    let conflicts = 0;

    // Resolve local updates against remote cache.
    localById.forEach((localScene, sceneId) => {
      const remoteScene = remoteById.get(sceneId);
      if (!remoteScene) {
        remoteById.set(sceneId, localScene);
        synced += 1;
        return;
      }

      const localTs = new Date(localScene.updatedAt).getTime();
      const remoteTs = new Date(remoteScene.updatedAt).getTime();

      if (Number.isFinite(localTs) && Number.isFinite(remoteTs) && localTs >= remoteTs) {
        remoteById.set(sceneId, localScene);
        synced += 1;
      } else {
        conflicts += 1;
      }
    });

    const merged = Array.from(remoteById.values());

    await settingsService.setSetting(
      SYNC_NAMESPACE,
      {
        scenes: merged,
        syncedAt: new Date().toISOString(),
      },
      { userId: getCurrentUserId() },
    );

    return { synced, conflicts };
  },

  async pullScenes(): Promise<SceneComposition[]> {
    const payloadRaw = await settingsService.getSetting<unknown>(SYNC_NAMESPACE, {
      userId: getCurrentUserId(),
    });
    const payload = parsePayload(payloadRaw);
    return payload?.scenes ?? [];
  },

  async enableOfflineMode(): Promise<void> {
    await settingsService.setSetting(OFFLINE_NAMESPACE, true, { userId: getCurrentUserId() });
  },

  async disableOfflineMode(): Promise<void> {
    await settingsService.setSetting(OFFLINE_NAMESPACE, false, { userId: getCurrentUserId() });
  },

  async isOfflineMode(): Promise<boolean> {
    const stored = await settingsService.getSetting<boolean>(OFFLINE_NAMESPACE, {
      userId: getCurrentUserId(),
    });
    return stored === true;
  },
};
