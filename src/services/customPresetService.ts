import { ScenarioPreset } from '../data/scenarioPresets';

const STORAGE_KEY = 'virtualStudio_customPresets';

export interface CustomPreset extends Omit<ScenarioPreset, 'kategori'> {
  kategori: 'mine-oppsett';
  createdAt: string;
  updatedAt: string;
}

export const customPresetService = {
  getAll(): CustomPreset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
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
