/**
 * Equipment Categories Service
 * 
 * Provides database persistence for custom equipment categories
 * with localStorage fallback for offline support.
 */

interface StoredCategories {
  [projectId: string]: {
    categories: string[];
    lastUpdated: string;
  };
}

const STORAGE_KEY = 'equipment-categories-data';

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

function getStorageData(): StoredCategories {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading categories from localStorage:', error);
    return {};
  }
}

function saveStorageData(data: StoredCategories): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving categories to localStorage:', error);
  }
}

// Migrate old format keys to new format
function migrateOldFormat(projectId: string): string[] | null {
  try {
    const oldKey = `equipment-custom-categories-${projectId}`;
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

export const equipmentCategoriesService = {
  /**
   * Get custom categories for a project
   */
  async getCustomCategories(projectId: string): Promise<string[]> {
    if (!projectId) return [];

    // Check for old format and migrate
    const migrated = migrateOldFormat(projectId);
    if (migrated) {
      // Save migrated data to new format
      const storageData = getStorageData();
      storageData[projectId] = {
        categories: migrated,
        lastUpdated: new Date().toISOString(),
      };
      saveStorageData(storageData);
      // Also try to save to database
      this.saveCustomCategories(projectId, migrated);
      return migrated;
    }

    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch(`/api/projects/${projectId}/equipment-categories`);
        if (response.ok) {
          const data = await response.json();
          // Cache to localStorage
          const storageData = getStorageData();
          storageData[projectId] = {
            categories: data.categories || [],
            lastUpdated: new Date().toISOString(),
          };
          saveStorageData(storageData);
          return data.categories || [];
        }
      }
    } catch (error) {
      console.warn('Failed to fetch categories from API, using localStorage:', error);
    }

    // Fallback to localStorage
    const storageData = getStorageData();
    return storageData[projectId]?.categories || [];
  },

  /**
   * Save custom categories for a project
   */
  async saveCustomCategories(projectId: string, categories: string[]): Promise<void> {
    if (!projectId) return;

    // Always save to localStorage first (for immediate access)
    const storageData = getStorageData();
    storageData[projectId] = {
      categories,
      lastUpdated: new Date().toISOString(),
    };
    saveStorageData(storageData);

    // Try to save to database
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch(`/api/projects/${projectId}/equipment-categories`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories }),
        });
        if (!response.ok) {
          console.warn('Failed to save categories to database:', response.statusText);
        }
      }
    } catch (error) {
      console.warn('Failed to save categories to database:', error);
    }
  },

  /**
   * Add a category
   */
  async addCategory(projectId: string, category: string): Promise<void> {
    const categories = await this.getCustomCategories(projectId);
    if (!categories.includes(category)) {
      categories.push(category);
      await this.saveCustomCategories(projectId, categories);
    }
  },

  /**
   * Remove a category
   */
  async removeCategory(projectId: string, category: string): Promise<void> {
    const categories = await this.getCustomCategories(projectId);
    const filtered = categories.filter(c => c !== category);
    await this.saveCustomCategories(projectId, filtered);
  },
};

export default equipmentCategoriesService;
