/**
 * Scene Needs Service
 * 
 * Provides database persistence for scene needs (camera, light, sound requirements)
 * with localStorage fallback for offline support.
 */

export interface SceneNeeds {
  cam: boolean;
  light: boolean;
  sound: boolean;
}

interface StoredSceneNeeds {
  [projectId: string]: {
    needs: Record<string, SceneNeeds>;
    lastUpdated: string;
  };
}

const STORAGE_KEY = 'scene-needs-data';

// Database availability cache
let dbAvailable: boolean | null = null;

async function checkDatabaseAvailability(): Promise<boolean> {
  if (dbAvailable !== null) {
    return dbAvailable;
  }
  
  try {
    const response = await fetch('/api/casting/health');
    const result = await response.json();
    dbAvailable = result.status === 'healthy';
    return dbAvailable;
  } catch (error) {
    console.error('Database not available:', error);
    dbAvailable = false;
    return false;
  }
}

function getStorageData(): StoredSceneNeeds {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading scene needs from localStorage:', error);
    return {};
  }
}

function saveStorageData(data: StoredSceneNeeds): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving scene needs to localStorage:', error);
  }
}

// Migrate old format keys to new format
function migrateOldFormat(projectId: string): Record<string, SceneNeeds> | null {
  try {
    const oldKey = `scene-needs-${projectId}`;
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      localStorage.removeItem(oldKey);
      return parsed;
    }
  } catch {
    // Ignore migration errors
  }
  return null;
}

export const sceneNeedsService = {
  /**
   * Get scene needs for a project
   */
  async getSceneNeeds(projectId: string): Promise<Record<string, SceneNeeds>> {
    if (!projectId) return {};

    // Check for old format and migrate
    const migrated = migrateOldFormat(projectId);
    if (migrated) {
      // Save migrated data to new format
      const storageData = getStorageData();
      storageData[projectId] = {
        needs: migrated,
        lastUpdated: new Date().toISOString(),
      };
      saveStorageData(storageData);
      // Also try to save to database
      this.saveSceneNeeds(projectId, migrated);
      return migrated;
    }

    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch(`/api/projects/${projectId}/scene-needs`);
        if (response.ok) {
          const data = await response.json();
          // Cache to localStorage
          const storageData = getStorageData();
          storageData[projectId] = {
            needs: data.sceneNeeds || {},
            lastUpdated: new Date().toISOString(),
          };
          saveStorageData(storageData);
          return data.sceneNeeds || {};
        }
      }
    } catch (error) {
      console.warn('Failed to fetch scene needs from API, using localStorage:', error);
    }

    // Fallback to localStorage
    const storageData = getStorageData();
    return storageData[projectId]?.needs || {};
  },

  /**
   * Save scene needs for a project
   */
  async saveSceneNeeds(projectId: string, needs: Record<string, SceneNeeds>): Promise<void> {
    if (!projectId) return;

    // Always save to localStorage first (for immediate access)
    const storageData = getStorageData();
    storageData[projectId] = {
      needs,
      lastUpdated: new Date().toISOString(),
    };
    saveStorageData(storageData);

    // Try to save to database
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch(`/api/projects/${projectId}/scene-needs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneNeeds: needs }),
        });
        if (!response.ok) {
          console.warn('Failed to save scene needs to database:', response.statusText);
        }
      }
    } catch (error) {
      console.warn('Failed to save scene needs to database:', error);
    }
  },

  /**
   * Update a single scene's needs
   */
  async updateSceneNeeds(projectId: string, sceneId: string, needs: SceneNeeds): Promise<void> {
    const allNeeds = await this.getSceneNeeds(projectId);
    allNeeds[sceneId] = needs;
    await this.saveSceneNeeds(projectId, allNeeds);
  },

  /**
   * Delete scene needs for a project
   */
  async deleteSceneNeeds(projectId: string): Promise<void> {
    if (!projectId) return;

    // Remove from localStorage
    const storageData = getStorageData();
    delete storageData[projectId];
    saveStorageData(storageData);

    // Try to delete from database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch(`/api/projects/${projectId}/scene-needs`, {
          method: 'DELETE',
        });
      }
    } catch (error) {
      console.warn('Failed to delete scene needs from database:', error);
    }
  },
};

export default sceneNeedsService;
