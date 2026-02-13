/**
 * Lower Third Templates Service
 * 
 * Provides database persistence for lower third templates in Course Creator
 * with localStorage fallback for offline support.
 */

export interface LowerThirdTemplate {
  id: string;
  videoId: string;
  text: string;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';
  style: 'minimal' | 'bold' | 'gradient' | 'outline';
  startTime: number;
  duration: number;
  animation: 'fade' | 'slide' | 'pop' | 'none';
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

interface StoredTemplates {
  templates: LowerThirdTemplate[];
  lastUpdated: string;
}

const STORAGE_KEY = 'lower-third-templates-data';

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

function getStorageData(): StoredTemplates {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { templates: [], lastUpdated: '' };
  } catch (error) {
    console.error('Error reading templates from localStorage:', error);
    return { templates: [], lastUpdated: '' };
  }
}

function saveStorageData(data: StoredTemplates): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving templates to localStorage:', error);
  }
}

// Migrate old format to new format
function migrateOldFormat(): LowerThirdTemplate[] | null {
  try {
    const oldKey = 'lowerThirdTemplates';
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

export const lowerThirdTemplatesService = {
  /**
   * Get all templates
   */
  async getTemplates(): Promise<LowerThirdTemplate[]> {
    // Check for old format and migrate
    const migrated = migrateOldFormat();
    if (migrated) {
      // Save migrated data to new format
      const storageData: StoredTemplates = {
        templates: migrated,
        lastUpdated: new Date().toISOString(),
      };
      saveStorageData(storageData);
      // Also try to save to database
      this.saveTemplates(migrated);
      return migrated;
    }

    // Try database first
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch('/api/course-creator/lower-third-templates');
        if (response.ok) {
          const data = await response.json();
          // Cache to localStorage
          const storageData: StoredTemplates = {
            templates: data.templates || [],
            lastUpdated: new Date().toISOString(),
          };
          saveStorageData(storageData);
          return data.templates || [];
        }
      }
    } catch (error) {
      console.warn('Failed to fetch templates from API, using localStorage:', error);
    }

    // Fallback to localStorage
    const storageData = getStorageData();
    return storageData.templates || [];
  },

  /**
   * Save all templates
   */
  async saveTemplates(templates: LowerThirdTemplate[]): Promise<void> {
    // Always save to localStorage first (for immediate access)
    const storageData: StoredTemplates = {
      templates,
      lastUpdated: new Date().toISOString(),
    };
    saveStorageData(storageData);

    // Try to save to database
    try {
      if (await checkDatabaseAvailability()) {
        const response = await fetch('/api/course-creator/lower-third-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templates }),
        });
        if (!response.ok) {
          console.warn('Failed to save templates to database:', response.statusText);
        }
      }
    } catch (error) {
      console.warn('Failed to save templates to database:', error);
    }
  },

  /**
   * Add a template
   */
  async addTemplate(template: LowerThirdTemplate): Promise<void> {
    const templates = await this.getTemplates();
    templates.push(template);
    await this.saveTemplates(templates);
  },

  /**
   * Remove a template
   */
  async removeTemplate(templateId: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    await this.saveTemplates(filtered);
  },

  /**
   * Update a template
   */
  async updateTemplate(templateId: string, updates: Partial<LowerThirdTemplate>): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === templateId);
    if (index >= 0) {
      templates[index] = { ...templates[index], ...updates };
      await this.saveTemplates(templates);
    }
  },
};

export default lowerThirdTemplatesService;
