export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSynced: string | null;
  pendingChanges: number;
}

type Subscriber = (state: SyncState) => void;

const subscribers: Subscriber[] = [];

export const storyboardSyncService = {
  subscribe(callback: Subscriber) {
    subscribers.push(callback);
    return () => {
      const idx = subscribers.indexOf(callback);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  },
  async fetchAll(): Promise<void> {
    const state: SyncState = {
      status: 'idle',
      lastSynced: new Date().toISOString(),
      pendingChanges: 0,
    };
    subscribers.forEach((cb) => cb(state));
  },
};
