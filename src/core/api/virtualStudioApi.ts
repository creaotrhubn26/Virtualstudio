import virtualStudioApi from '../../services/virtualStudioApiService';

export interface RecentItem {
  id: string;
  name: string;
  timestamp: string;
}

export interface PreferencesData {
  favorites: Record<string, string[]>;
  recent: Record<string, RecentItem[]>;
}

const PREFERENCES_KEY = 'virtualStudio_preferences';

const readPreferences = (): PreferencesData => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) {
      return { favorites: {}, recent: {} };
    }
    const parsed = JSON.parse(stored) as PreferencesData;
    return {
      favorites: parsed.favorites || {},
      recent: parsed.recent || {},
    };
  } catch {
    return { favorites: {}, recent: {} };
  }
};

const writePreferences = (data: PreferencesData) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
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
    const remote = await tryRequest<PreferencesData>('/api/studio/preferences', {
      method: 'GET',
      credentials: 'include',
    });

    if (remote) {
      writePreferences(remote);
      return remote;
    }

    return readPreferences();
  },

  async updateFavorites(section: string, favorites: string[]): Promise<void> {
    const data = readPreferences();
    data.favorites[section] = favorites;
    writePreferences(data);

    await tryRequest('/api/studio/preferences/favorites', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, favorites }),
    });
  },

  async addRecent(section: string, item: { id: string; name: string }): Promise<void> {
    const data = readPreferences();
    const updated: RecentItem = {
      id: item.id,
      name: item.name,
      timestamp: new Date().toISOString(),
    };
    const existing = data.recent[section] || [];
    const filtered = existing.filter((entry) => entry.id !== item.id);
    data.recent[section] = [updated, ...filtered].slice(0, 10);
    writePreferences(data);

    await tryRequest('/api/studio/preferences/recent', {
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
}

export interface SnapshotRecord extends SnapshotPayload {
  id: string;
  createdAt: string;
}

const snapshotKey = (sceneId: string) => `virtualStudio_snapshots_${sceneId}`;

const readSnapshots = (sceneId: string): SnapshotRecord[] => {
  try {
    const stored = localStorage.getItem(snapshotKey(sceneId));
    return stored ? (JSON.parse(stored) as SnapshotRecord[]) : [];
  } catch {
    return [];
  }
};

const writeSnapshots = (sceneId: string, snapshots: SnapshotRecord[]) => {
  try {
    localStorage.setItem(snapshotKey(sceneId), JSON.stringify(snapshots));
  } catch {
    // Ignore storage errors
  }
};

export const snapshotsApi = {
  async list(sceneId: string): Promise<SnapshotRecord[]> {
    const remote = await tryRequest<{ snapshots: SnapshotRecord[] }>(`/api/studio/scenes/${sceneId}/snapshots`, {
      method: 'GET',
      credentials: 'include',
    });

    if (remote?.snapshots) {
      writeSnapshots(sceneId, remote.snapshots);
      return remote.snapshots;
    }

    return readSnapshots(sceneId);
  },

  async create(payload: SnapshotPayload): Promise<SnapshotRecord> {
    const createdAt = new Date().toISOString();
    const record: SnapshotRecord = {
      ...payload,
      id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
    };

    const remote = await tryRequest<{ snapshot: SnapshotRecord }>('/api/studio/snapshots', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (remote?.snapshot) {
      record.id = remote.snapshot.id;
      record.createdAt = remote.snapshot.createdAt || record.createdAt;
    }

    const stored = readSnapshots(payload.sceneId);
    writeSnapshots(payload.sceneId, [record, ...stored].slice(0, 10));

    return record;
  },

  async delete(snapshotId: string): Promise<void> {
    await tryRequest(`/api/studio/snapshots/${snapshotId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    Object.keys(localStorage)
      .filter((key) => key.startsWith('virtualStudio_snapshots_'))
      .forEach((key) => {
        try {
          const sceneId = key.replace('virtualStudio_snapshots_', '');
          const snapshots = readSnapshots(sceneId).filter((snapshot) => snapshot.id !== snapshotId);
          writeSnapshots(sceneId, snapshots);
        } catch {
          // Ignore cleanup errors
        }
      });
  },
};

export { virtualStudioApi };
