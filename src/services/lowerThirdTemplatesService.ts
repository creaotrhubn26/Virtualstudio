/**
 * Lower Third Templates Service
 * 
 * Provides settings-based persistence for lower third templates in Course Creator.
 */

import { settingsService } from './settingsService';

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

const SETTINGS_NAMESPACE = 'virtualStudio_lowerThirdTemplates';

export const lowerThirdTemplatesService = {
  /**
   * Get all templates
   */
  async getTemplates(): Promise<LowerThirdTemplate[]> {
    try {
      const templates = await settingsService.getSetting<LowerThirdTemplate[]>(SETTINGS_NAMESPACE);
      if (templates) return templates;
    } catch (error) {
      console.warn('Failed to fetch lower third templates from settings API:', error);
    }

    return [];
  },

  /**
   * Save all templates
   */
  async saveTemplates(templates: LowerThirdTemplate[]): Promise<void> {
    try {
      await settingsService.setSetting(SETTINGS_NAMESPACE, templates);
    } catch (error) {
      console.warn('Failed to save lower third templates to settings API:', error);
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
