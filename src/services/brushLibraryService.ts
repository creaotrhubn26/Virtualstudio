/**
 * Brush Library Service
 * 
 * Provides database persistence for custom brush presets with localStorage fallback.
 */

export interface BrushPreset {
  id: string;
  name: string;
  description?: string;
  config: {
    size: number;
    opacity: number;
    color: string;
    hardness?: number;
    spacing?: number;
    smoothing?: number;
    pressureSensitivity?: boolean;
    type?: string;
  };
  category?: string;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface StoredLibrary {
  presets: BrushPreset[];
  recentlyUsed: string[];
  lastUpdated: string;
}

const STORAGE_KEY = 'brush-library-data';
const LEGACY_KEY = 'storyboard-brush-presets';

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

function getStorageData(): StoredLibrary {
  try {
    // Check legacy key first
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (legacyData) {
      const parsed = JSON.parse(legacyData);
      localStorage.removeItem(LEGACY_KEY);
      return {
        presets: parsed.presets || [],
        recentlyUsed: parsed.recentlyUsed || [],
        lastUpdated: new Date().toISOString(),
      };
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { presets: [], recentlyUsed: [], lastUpdated: '' };
  } catch (error) {
    console.error('Error reading brush library from localStorage:', error);
    return { presets: [], recentlyUsed: [], lastUpdated: '' };
  }
}

function saveStorageData(data: StoredLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving brush library to localStorage:', error);
  }
}

export const brushLibraryService = {
  /**
   * Get all brush presets
   */
  async getPresets(): Promise<BrushPreset[]> {
    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch('/api/user/brush-presets');
        if (response.ok) {
          const data = await response.json();
          const presets = data.presets || data || [];
          
          // Cache to localStorage
          const storageData = getStorageData();
          storageData.presets = presets;
          storageData.lastUpdated = new Date().toISOString();
          saveStorageData(storageData);
          
          return presets;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch brush presets from API:', error);
    }

    // Fallback to localStorage
    return getStorageData().presets;
  },

  /**
   * Get recently used brush IDs
   */
  async getRecentlyUsed(): Promise<string[]> {
    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch('/api/user/brush-presets/recent');
        if (response.ok) {
          const data = await response.json();
          return data.recentlyUsed || [];
        }
      }
    } catch (error) {
      console.warn('Failed to fetch recently used brushes:', error);
    }

    return getStorageData().recentlyUsed;
  },

  /**
   * Save a brush preset
   */
  async savePreset(preset: BrushPreset): Promise<BrushPreset> {
    const now = new Date().toISOString();
    const presetToSave = {
      ...preset,
      updatedAt: now,
      createdAt: preset.createdAt || now,
    };

    // Save to localStorage first
    const storageData = getStorageData();
    const existingIndex = storageData.presets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      storageData.presets[existingIndex] = presetToSave;
    } else {
      storageData.presets.push(presetToSave);
    }
    storageData.lastUpdated = now;
    saveStorageData(storageData);

    // Try to save to database
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch('/api/user/brush-presets', {
          method: existingIndex >= 0 ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(presetToSave),
        });
        if (response.ok) {
          const saved = await response.json();
          return { ...presetToSave, ...saved };
        }
      }
    } catch (error) {
      console.warn('Failed to save brush preset to database:', error);
    }

    return presetToSave;
  },

  /**
   * Delete a brush preset
   */
  async deletePreset(presetId: string): Promise<void> {
    // Remove from localStorage
    const storageData = getStorageData();
    storageData.presets = storageData.presets.filter(p => p.id !== presetId);
    storageData.recentlyUsed = storageData.recentlyUsed.filter(id => id !== presetId);
    storageData.lastUpdated = new Date().toISOString();
    saveStorageData(storageData);

    // Try to delete from database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch(`/api/user/brush-presets/${presetId}`, { method: 'DELETE' });
      }
    } catch (error) {
      console.warn('Failed to delete brush preset from database:', error);
    }
  },

  /**
   * Mark a brush as recently used
   */
  async markRecentlyUsed(presetId: string, maxRecent: number = 10): Promise<void> {
    const storageData = getStorageData();
    
    // Remove if exists, add to front
    storageData.recentlyUsed = storageData.recentlyUsed.filter(id => id !== presetId);
    storageData.recentlyUsed.unshift(presetId);
    storageData.recentlyUsed = storageData.recentlyUsed.slice(0, maxRecent);
    storageData.lastUpdated = new Date().toISOString();
    saveStorageData(storageData);

    // Try to sync to database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch('/api/user/brush-presets/recent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presetId }),
        });
      }
    } catch (error) {
      console.warn('Failed to sync recently used to database:', error);
    }
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(presetId: string): Promise<void> {
    const storageData = getStorageData();
    const preset = storageData.presets.find(p => p.id === presetId);
    if (preset) {
      preset.isFavorite = !preset.isFavorite;
      preset.updatedAt = new Date().toISOString();
      saveStorageData(storageData);

      // Sync to database
      try {
        if (await checkDatabaseAvailability()) {
          await fetch(`/api/user/brush-presets/${presetId}/favorite`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavorite: preset.isFavorite }),
          });
        }
      } catch (error) {
        console.warn('Failed to sync favorite status:', error);
      }
    }
  },

  /**
   * Import presets from JSON
   */
  async importPresets(presets: BrushPreset[]): Promise<void> {
    const now = new Date().toISOString();
    const storageData = getStorageData();
    
    for (const preset of presets) {
      const existing = storageData.presets.find(p => p.id === preset.id);
      if (!existing) {
        storageData.presets.push({
          ...preset,
          createdAt: preset.createdAt || now,
          updatedAt: now,
        });
      }
    }
    
    storageData.lastUpdated = now;
    saveStorageData(storageData);

    // Try to sync all to database
    try {
      if (await checkDatabaseAvailability()) {
        await fetch('/api/user/brush-presets/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presets: storageData.presets }),
        });
      }
    } catch (error) {
      console.warn('Failed to sync imported presets to database:', error);
    }
  },
};

export default brushLibraryService;
