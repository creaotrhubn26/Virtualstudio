/**
 * Character Profile Service
 * 
 * Provides database persistence for character profiles with localStorage fallback.
 * Used by ManuscriptPanel to store character metadata (alias, description, age, role).
 */

export interface CharacterProfile {
  name: string;
  alias?: string;
  description?: string;
  age?: string;
  role: 'lead' | 'supporting' | 'minor' | 'extra';
}

interface StoredCharacterProfiles {
  [manuscriptId: string]: {
    profiles: Record<string, CharacterProfile>;
    lastUpdated: string;
  };
}

const STORAGE_KEY = 'manuscript-character-profiles';

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

function getStorageData(): StoredCharacterProfiles {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading character profiles from localStorage:', error);
    return {};
  }
}

function saveStorageData(data: StoredCharacterProfiles): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving character profiles to localStorage:', error);
  }
}

export const characterProfileService = {
  /**
   * Get character profiles for a manuscript
   */
  async getProfiles(manuscriptId: string): Promise<Record<string, CharacterProfile>> {
    if (!manuscriptId) return {};

    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch(`/api/manuscripts/${manuscriptId}/character-profiles`);
        if (response.ok) {
          const data = await response.json();
          // Cache to localStorage
          const storageData = getStorageData();
          storageData[manuscriptId] = {
            profiles: data.profiles || {},
            lastUpdated: new Date().toISOString(),
          };
          saveStorageData(storageData);
          return data.profiles || {};
        }
      }
    } catch (error) {
      console.warn('Failed to fetch character profiles from API, using localStorage:', error);
    }

    // Fallback to localStorage
    const storageData = getStorageData();
    
    // Also check for old format keys
    const oldKey = `manuscript-characters-${manuscriptId}`;
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !storageData[manuscriptId]) {
      try {
        const profiles = JSON.parse(oldData);
        storageData[manuscriptId] = {
          profiles,
          lastUpdated: new Date().toISOString(),
        };
        saveStorageData(storageData);
        // Remove old key
        localStorage.removeItem(oldKey);
        return profiles;
      } catch {
        // Ignore parse errors
      }
    }

    return storageData[manuscriptId]?.profiles || {};
  },

  /**
   * Save character profiles for a manuscript
   */
  async saveProfiles(manuscriptId: string, profiles: Record<string, CharacterProfile>): Promise<void> {
    if (!manuscriptId) return;

    // Always save to localStorage first (for immediate access)
    const storageData = getStorageData();
    storageData[manuscriptId] = {
      profiles,
      lastUpdated: new Date().toISOString(),
    };
    saveStorageData(storageData);

    // Try to save to database
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch(`/api/manuscripts/${manuscriptId}/character-profiles`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profiles }),
        });
        if (!response.ok) {
          console.warn('Failed to save character profiles to database:', response.statusText);
        }
      }
    } catch (error) {
      console.warn('Failed to save character profiles to database:', error);
    }
  },

  /**
   * Update a single character profile
   */
  async updateProfile(manuscriptId: string, characterName: string, profile: CharacterProfile): Promise<void> {
    const profiles = await this.getProfiles(manuscriptId);
    profiles[characterName] = profile;
    await this.saveProfiles(manuscriptId, profiles);
  },

  /**
   * Delete a character profile
   */
  async deleteProfile(manuscriptId: string, characterName: string): Promise<void> {
    const profiles = await this.getProfiles(manuscriptId);
    delete profiles[characterName];
    await this.saveProfiles(manuscriptId, profiles);
  },

  /**
   * Delete all profiles for a manuscript
   */
  async deleteAllProfiles(manuscriptId: string): Promise<void> {
    if (!manuscriptId) return;

    // Remove from localStorage
    const storageData = getStorageData();
    delete storageData[manuscriptId];
    saveStorageData(storageData);

    // Try to delete from database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch(`/api/manuscripts/${manuscriptId}/character-profiles`, {
          method: 'DELETE',
        });
      }
    } catch (error) {
      console.warn('Failed to delete character profiles from database:', error);
    }
  },

  /**
   * Migrate old localStorage format to new unified format
   */
  async migrateOldFormat(): Promise<void> {
    const storageData = getStorageData();
    const keysToRemove: string[] = [];

    // Find all old format keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('manuscript-characters-')) {
        const manuscriptId = key.replace('manuscript-characters-', '');
        if (!storageData[manuscriptId]) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              storageData[manuscriptId] = {
                profiles: JSON.parse(data),
                lastUpdated: new Date().toISOString(),
              };
            }
          } catch {
            // Ignore parse errors
          }
        }
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      saveStorageData(storageData);
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Migrated ${keysToRemove.length} character profile entries to unified storage`);
    }
  },
};

export default characterProfileService;
