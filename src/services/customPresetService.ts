import { ScenarioPreset } from '../data/scenarioPresets';
import { presetApi } from './virtualStudioApiService';

const STORAGE_KEY = 'virtualStudio_customPresets';

export interface CustomPreset extends Omit<ScenarioPreset, 'kategori'> {
  kategori: 'mine-oppsett';
  createdAt: string;
  updatedAt: string;
}

export const customPresetService = {
  async getAllAsync(): Promise<CustomPreset[]> {
    try {
      const dbPresets = await presetApi.getAll(undefined, 'custom');
      if (dbPresets.length > 0) {
        return dbPresets.map(p => ({
          ...(p.preset_data as Partial<CustomPreset>),
          id: p.id,
          kategori: 'mine-oppsett' as const,
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
        })) as CustomPreset[];
      }
    } catch (error) {
      console.warn('Database unavailable, falling back to localStorage:', error);
    }
    return this.getAll();
  },

  getAll(): CustomPreset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async saveAsync(preset: CustomPreset): Promise<void> {
    try {
      await presetApi.save({
        id: preset.id,
        name: preset.navn,
        type: 'custom',
        preset_data: preset as Record<string, unknown>,
      });
    } catch (error) {
      console.warn('Database save failed:', error);
    }
    this.save(preset);
  },

  save(preset: CustomPreset): void {
    const presets = this.getAll();
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      presets[existingIndex] = { ...preset, updatedAt: new Date().toISOString() };
    } else {
      presets.push(preset);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  },

  async deleteAsync(id: string): Promise<void> {
    try {
      await presetApi.delete(id);
    } catch (error) {
      console.warn('Database delete failed:', error);
    }
    this.delete(id);
  },

  delete(id: string): void {
    const presets = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  },

  createFromCurrentScene(
    navn: string,
    beskrivelse: string,
    tags: string[],
    sceneConfig: ScenarioPreset['sceneConfig']
  ): CustomPreset {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    return {
      id,
      navn,
      kategori: 'mine-oppsett',
      beskrivelse,
      tags: ['egendefinert', ...tags],
      difficulty: 'beginner',
      sceneConfig,
      recommendedAssets: { lights: [], modifiers: [], backdrops: [] },
      createdAt: now,
      updatedAt: now
    };
  },

  async updateAsync(id: string, updates: Partial<CustomPreset>): Promise<void> {
    const presets = this.getAll();
    const index = presets.findIndex(p => p.id === id);
    if (index >= 0) {
      const updated = { ...presets[index], ...updates, updatedAt: new Date().toISOString() };
      try {
        await presetApi.save({
          id: updated.id,
          name: updated.navn,
          type: 'custom',
          preset_data: updated as Record<string, unknown>,
        });
      } catch (error) {
        console.warn('Database update failed:', error);
      }
      this.update(id, updates);
    }
  },

  update(id: string, updates: Partial<CustomPreset>): void {
    const presets = this.getAll();
    const index = presets.findIndex(p => p.id === id);
    if (index >= 0) {
      presets[index] = { 
        ...presets[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }
  }
};
