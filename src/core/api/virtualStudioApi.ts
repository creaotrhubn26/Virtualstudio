import virtualStudioApi from '../../services/virtualStudioApiService';
import settingsService, { getCurrentUserId } from '../../services/settingsService';

export interface RecentItem {
  id: string;
  name: string;
  timestamp: string;
}

export interface PreferencesData {
  favorites: Record<string, string[]>;
  recent: Record<string, RecentItem[]>;
  favoriteTemplates?: string[];
}

const PREFERENCES_KEY = 'virtualStudio_preferences';

const readPreferences = async (): Promise<PreferencesData> => {
  const userId = getCurrentUserId();
  const remote = await settingsService.getSetting<PreferencesData>(PREFERENCES_KEY, { userId });
  if (remote) {
    return {
      favorites: remote.favorites || {},
      recent: remote.recent || {},
    };
  }

  return { favorites: {}, recent: {} };
};

const writePreferences = async (data: PreferencesData) => {
  const userId = getCurrentUserId();
  await settingsService.setSetting(PREFERENCES_KEY, data, { userId });
};

const tryRequest = async <T>(endpoint: string, options: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const preferencesApi = {
  async get(): Promise<PreferencesData> {
    const userId = getCurrentUserId();
    const remote = await tryRequest<PreferencesData>(`/api/studio/preferences?user_id=${encodeURIComponent(userId)}` , {
      method: 'GET',
      credentials: 'include',
    });

    if (remote) {
      void writePreferences(remote);
      return remote;
    }

    return await readPreferences();
  },

  async updateFavorites(section: string, favorites: string[]): Promise<void> {
    const userId = getCurrentUserId();
    const data = await readPreferences();
    data.favorites[section] = favorites;
    await writePreferences(data);

    await tryRequest(`/api/studio/preferences/favorites?user_id=${encodeURIComponent(userId)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, favorites }),
    });
  },

  async addRecent(section: string, item: { id: string; name: string }): Promise<void> {
    const userId = getCurrentUserId();
    const data = await readPreferences();
    const updated: RecentItem = {
      id: item.id,
      name: item.name,
      timestamp: new Date().toISOString(),
    };
    const existing = data.recent[section] || [];
    const filtered = existing.filter((entry) => entry.id !== item.id);
    data.recent[section] = [updated, ...filtered].slice(0, 10);
    await writePreferences(data);

    await tryRequest(`/api/studio/preferences/recent?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, item: updated }),
    });
  },
};

export interface SnapshotPayload {
  sceneId: string;
  name: string;
  description?: string;
  thumbnailUrl: string;
  sceneState: unknown;
  cameraState?: unknown;
  nodeCount?: number;
  lightCount?: number;
}

export interface SnapshotRecord extends SnapshotPayload {
  id: string;
  createdAt: string;
}

const snapshotKey = (sceneId: string) => `virtualStudio_snapshots_${sceneId}`;

const SNAPSHOT_NAMESPACE = 'virtualStudio_snapshots';

const readSnapshots = async (sceneId: string): Promise<SnapshotRecord[]> => {
  const userId = getCurrentUserId();
  const remote = await settingsService.getSetting<SnapshotRecord[]>(SNAPSHOT_NAMESPACE, { userId, projectId: sceneId });
  if (remote) return remote;

  return [];
};

const writeSnapshots = async (sceneId: string, snapshots: SnapshotRecord[]) => {
  await settingsService.setSetting(SNAPSHOT_NAMESPACE, snapshots, { userId: getCurrentUserId(), projectId: sceneId });
};

export const snapshotsApi = {
  async list(sceneId: string): Promise<SnapshotRecord[]> {
    const userId = getCurrentUserId();
    const remote = await tryRequest<{ snapshots: SnapshotRecord[] }>(
      `/api/studio/scenes/${sceneId}/snapshots?user_id=${encodeURIComponent(userId)}`,
      {
      method: 'GET',
      credentials: 'include',
      }
    );

    if (remote?.snapshots) {
      await writeSnapshots(sceneId, remote.snapshots);
      return remote.snapshots;
    }

    return await readSnapshots(sceneId);
  },

  async create(payload: SnapshotPayload): Promise<SnapshotRecord> {
    const userId = getCurrentUserId();
    const createdAt = new Date().toISOString();
    const record: SnapshotRecord = {
      ...payload,
      id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
    };

    const remote = await tryRequest<{ snapshot: SnapshotRecord }>(
      `/api/studio/snapshots?user_id=${encodeURIComponent(userId)}`,
      {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      }
    );

    if (remote?.snapshot) {
      record.id = remote.snapshot.id;
      record.createdAt = remote.snapshot.createdAt || record.createdAt;
    }

    const stored = await readSnapshots(payload.sceneId);
    await writeSnapshots(payload.sceneId, [record, ...stored].slice(0, 10));

    return record;
  },

  async delete(snapshotId: string, sceneId: string): Promise<void> {
    const userId = getCurrentUserId();
    await tryRequest(`/api/studio/snapshots/${snapshotId}?sceneId=${encodeURIComponent(sceneId)}&user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const stored = await readSnapshots(sceneId);
    await writeSnapshots(sceneId, stored.filter((snapshot) => snapshot.id !== snapshotId));
  },
};

export { virtualStudioApi };
