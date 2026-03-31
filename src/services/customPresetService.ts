import { ScenarioPreset } from '../data/scenarioPresets';
import { presetApi } from './virtualStudioApiService';
import settingsService, { getCurrentUserId } from './settingsService';

const STORAGE_KEY = 'virtualStudio_customPresets';
let cachedPresets: CustomPreset[] = [];

const hydratePresets = async (): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const remote = await settingsService.getSetting<CustomPreset[]>(STORAGE_KEY, { userId });
    if (remote) {
      cachedPresets = remote;
      return;
    }
  } catch {
    // Ignore hydration errors
  }
};

void hydratePresets();

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
        const mapped = dbPresets.map(p => ({
          ...(p.preset_data as Partial<CustomPreset>),
          id: p.id,
          kategori: 'mine-oppsett' as const,
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
        })) as CustomPreset[];
        cachedPresets = mapped;
        void settingsService.setSetting(STORAGE_KEY, mapped, { userId: getCurrentUserId() });
        return mapped;
      }
    } catch (error) {
      console.warn('Database unavailable, falling back to settings cache:', error);
    }
    return this.getAll();
  },

  getAll(): CustomPreset[] {
    return cachedPresets;
  },

  async saveAsync(preset: CustomPreset): Promise<void> {
    try {
      await presetApi.save({
        id: preset.id,
        name: preset.navn,
        type: 'custom',
        preset_data: preset as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.warn('Database save failed:', error);
    }
    this.save(preset);
  },

  save(preset: CustomPreset): void {
    const existingIndex = cachedPresets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      cachedPresets[existingIndex] = { ...preset, updatedAt: new Date().toISOString() };
    } else {
      cachedPresets.push(preset);
    }
    void settingsService.setSetting(STORAGE_KEY, cachedPresets, { userId: getCurrentUserId() });
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
    cachedPresets = cachedPresets.filter(p => p.id !== id);
    void settingsService.setSetting(STORAGE_KEY, cachedPresets, { userId: getCurrentUserId() });
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
    const index = cachedPresets.findIndex(p => p.id === id);
    if (index >= 0) {
      const updated = { ...cachedPresets[index], ...updates, updatedAt: new Date().toISOString() };
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
    const index = cachedPresets.findIndex(p => p.id === id);
    if (index >= 0) {
      cachedPresets[index] = { 
        ...cachedPresets[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      void settingsService.setSetting(STORAGE_KEY, cachedPresets, { userId: getCurrentUserId() });
    }
  }
};
