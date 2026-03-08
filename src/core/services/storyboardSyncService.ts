import { useStoryboardStore, type Storyboard } from '../../state/storyboardStore';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSynced: string | null;
  pendingChanges: number;
}

type Subscriber = (state: SyncState) => void;

interface PersistedSyncPayload {
  storyboards: Storyboard[];
  savedAt: string;
}

const STORAGE_KEY = 'virtualstudio_storyboard_sync_cache';

const subscribers = new Set<Subscriber>();

const state: SyncState = {
  status: 'idle',
  lastSynced: null,
  pendingChanges: 0,
};

const notify = (): void => {
  subscribers.forEach((callback) => callback({ ...state }));
};

const setState = (partial: Partial<SyncState>): void => {
  Object.assign(state, partial);
  notify();
};

const getStoryboardsSnapshot = (): Storyboard[] => {
  const snapshot = useStoryboardStore.getState().storyboards;
  return JSON.parse(JSON.stringify(snapshot)) as Storyboard[];
};

const persistLocal = (storyboards: Storyboard[]): void => {
  const payload: PersistedSyncPayload = {
    storyboards,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadPersistedLocal = (): PersistedSyncPayload | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedSyncPayload;
    if (!Array.isArray(parsed.storyboards)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const replaceStoreStoryboards = (storyboards: Storyboard[]): void => {
  useStoryboardStore.setState((previous) => ({
    ...previous,
    storyboards,
    currentStoryboardId:
      previous.currentStoryboardId && storyboards.some((item) => item.id === previous.currentStoryboardId)
        ? previous.currentStoryboardId
        : storyboards[0]?.id ?? null,
    selectedFrameId: null,
  }));
};

const remoteFetch = async (): Promise<Storyboard[] | null> => {
  const endpoints = ['/api/storyboards', '/api/storyboards/list'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as {
        storyboards?: unknown;
        data?: unknown;
      };

      const candidates =
        Array.isArray(payload.storyboards)
          ? payload.storyboards
          : Array.isArray(payload.data)
            ? payload.data
            : null;

      if (!candidates) {
        continue;
      }

      return candidates.filter((item): item is Storyboard => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).id === 'string' &&
          Array.isArray((item as Record<string, unknown>).frames)
        );
      });
    } catch {
      // Try next endpoint.
    }
  }

  return null;
};

const remotePush = async (storyboards: Storyboard[]): Promise<boolean> => {
  const endpoints = ['/api/storyboards/sync', '/api/storyboards/bulk'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboards }),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Try next endpoint.
    }
  }

  return false;
};

export const storyboardSyncService = {
  subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    callback({ ...state });
    return () => {
      subscribers.delete(callback);
    };
  },

  async fetchAll(): Promise<void> {
    setState({ status: 'syncing' });

    try {
      const remote = await remoteFetch();
      if (remote && remote.length > 0) {
        replaceStoreStoryboards(remote);
        persistLocal(remote);
        setState({
          status: 'idle',
          lastSynced: new Date().toISOString(),
          pendingChanges: 0,
        });
        return;
      }

      const persisted = loadPersistedLocal();
      if (persisted?.storyboards?.length) {
        replaceStoreStoryboards(persisted.storyboards);
        setState({ status: 'idle', lastSynced: persisted.savedAt, pendingChanges: 0 });
        return;
      }

      setState({ status: 'idle', pendingChanges: getStoryboardsSnapshot().length > 0 ? 1 : 0 });
    } catch {
      setState({ status: 'error', pendingChanges: Math.max(1, getStoryboardsSnapshot().length) });
    }
  },

  async pushChanges(): Promise<void> {
    const snapshot = getStoryboardsSnapshot();

    setState({ status: 'syncing', pendingChanges: snapshot.length });

    try {
      persistLocal(snapshot);
      const pushed = await remotePush(snapshot);

      if (pushed) {
        setState({
          status: 'idle',
          lastSynced: new Date().toISOString(),
          pendingChanges: 0,
        });
      } else {
        setState({
          status: 'error',
          pendingChanges: snapshot.length,
        });
      }
    } catch {
      setState({ status: 'error', pendingChanges: snapshot.length });
    }
  },
};
