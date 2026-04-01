/**
 * IndexedDB backup utilities for Panel Creator
 * Provides automatic backup and restore functionality
 */

import { PanelConfig } from '../types';
import { PanelVersion } from './versionHistory';

const DB_NAME = 'PanelCreatorDB';
const DB_VERSION = 1;
const PANELS_STORE = 'panels';
const VERSIONS_STORE = 'versions';
const BACKUP_STORE = 'backups';

export interface IDBBackup {
  id: string;
  timestamp: number;
  panels: PanelConfig[];
  versionCount: number;
  comment?: string;
}

/**
 * Open IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create panels store
      if (!db.objectStoreNames.contains(PANELS_STORE)) {
        const panelsStore = db.createObjectStore(PANELS_STORE, { keyPath: 'id' });
        panelsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create versions store
      if (!db.objectStoreNames.contains(VERSIONS_STORE)) {
        const versionsStore = db.createObjectStore(VERSIONS_STORE, { keyPath: 'id' });
        versionsStore.createIndex('panelId', 'panelId', { unique: false });
        versionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create backups store
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        const backupsStore = db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
        backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * Save panels to IndexedDB
 */
export const savePanelsToIndexedDB = async (panels: PanelConfig[]): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([PANELS_STORE], 'readwrite');
    const store = transaction.objectStore(PANELS_STORE);

    // Clear existing panels
    await store.clear();

    // Add all panels
    for (const panel of panels) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ ...panel, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving panels to IndexedDB:', error);
    throw error;
  }
};

/**
 * Load panels from IndexedDB
 */
export const loadPanelsFromIndexedDB = async (): Promise<PanelConfig[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([PANELS_STORE], 'readonly');
    const store = transaction.objectStore(PANELS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const panels = request.result.map((item: any) => {
          const { timestamp, ...panel } = item;
          return panel;
        });
        resolve(panels);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading panels from IndexedDB:', error);
    return [];
  }
};

/**
 * Save version history to IndexedDB
 */
export const saveVersionsToIndexedDB = async (versions: PanelVersion[]): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([VERSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(VERSIONS_STORE);

    // Clear existing versions
    await store.clear();

    // Add all versions
    for (const version of versions) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(version);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving versions to IndexedDB:', error);
    throw error;
  }
};

/**
 * Load version history from IndexedDB
 */
export const loadVersionsFromIndexedDB = async (): Promise<PanelVersion[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([VERSIONS_STORE], 'readonly');
    const store = transaction.objectStore(VERSIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading versions from IndexedDB:', error);
    return [];
  }
};

/**
 * Create a manual backup
 */
export const createBackup = async (
  panels: PanelConfig[],
  versionCount: number,
  comment?: string
): Promise<string> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([BACKUP_STORE], 'readwrite');
    const store = transaction.objectStore(BACKUP_STORE);

    const backup: IDBBackup = {
      id: `backup_${Date.now()}`,
      timestamp: Date.now(),
      panels: [...panels],
      versionCount,
      comment,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(backup);
      request.onsuccess = () => resolve(backup.id);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

/**
 * Get all backups
 */
export const getBackups = async (): Promise<IDBBackup[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([BACKUP_STORE], 'readonly');
    const store = transaction.objectStore(BACKUP_STORE);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        const backups = request.result.sort((a: IDBBackup, b: IDBBackup) => b.timestamp - a.timestamp);
        resolve(backups);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting backups:', error);
    return [];
  }
};

/**
 * Restore from backup
 */
export const restoreBackup = async (backupId: string): Promise<{ panels: PanelConfig[]; versionCount: number }> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([BACKUP_STORE], 'readonly');
    const store = transaction.objectStore(BACKUP_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(backupId);
      request.onsuccess = () => {
        const backup = request.result as IDBBackup;
        if (backup) {
          resolve({
            panels: backup.panels,
            versionCount: backup.versionCount,
          });
        } else {
          reject(new Error('Backup not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
};

/**
 * Delete a backup
 */
export const deleteBackup = async (backupId: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([BACKUP_STORE], 'readwrite');
    const store = transaction.objectStore(BACKUP_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(backupId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    throw error;
  }
};

/**
 * Sync panels with IndexedDB (automatic backup)
 */
export const syncPanelsToIndexedDB = async (panels: PanelConfig[]): Promise<void> => {
  try {
    await savePanelsToIndexedDB(panels);
  } catch (error) {
    console.error('Error syncing panels to IndexedDB:', error);
    // Don't throw - allow app to continue even if IndexedDB fails
  }
};

