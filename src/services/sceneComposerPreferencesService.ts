import settingsService, { getCurrentUserId } from './settingsService';
import type { SceneAssemblyValidationFilter } from './sceneAssemblyValidationPresentation';

export type SceneComposerSortOption = 'name' | 'createdAt' | 'updatedAt' | 'size' | 'validationStatus';
export type SceneComposerActiveTab = 'scenes' | 'timeline' | 'layers' | 'environment' | 'export' | 'advanced';

export interface SceneComposerPreferences {
  sortBy: SceneComposerSortOption;
  validationFilter: SceneAssemblyValidationFilter;
  showFavoritesOnly: boolean;
  filterTags: string[];
  activeTab: SceneComposerActiveTab;
}

const SCENE_COMPOSER_PREFERENCES_NAMESPACE = 'virtualStudio_sceneComposerPreferences';

const DEFAULT_PREFERENCES: SceneComposerPreferences = {
  sortBy: 'updatedAt',
  validationFilter: 'all',
  showFavoritesOnly: false,
  filterTags: [],
  activeTab: 'scenes',
};

function normalizeSortBy(value: unknown): SceneComposerSortOption {
  return value === 'name'
    || value === 'createdAt'
    || value === 'updatedAt'
    || value === 'size'
    || value === 'validationStatus'
    ? value
    : DEFAULT_PREFERENCES.sortBy;
}

function normalizeValidationFilter(value: unknown): SceneAssemblyValidationFilter {
  return value === 'all'
    || value === 'validated'
    || value === 'differences'
    || value === 'local'
    ? value
    : DEFAULT_PREFERENCES.validationFilter;
}

function normalizeShowFavoritesOnly(value: unknown): boolean {
  return value === true;
}

function normalizeFilterTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_PREFERENCES.filterTags];
  }

  const normalized = value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
}

function normalizeActiveTab(value: unknown): SceneComposerActiveTab {
  return value === 'scenes'
    || value === 'timeline'
    || value === 'layers'
    || value === 'environment'
    || value === 'export'
    || value === 'advanced'
    ? value
    : DEFAULT_PREFERENCES.activeTab;
}

export const sceneComposerPreferencesService = {
  async getPreferences(): Promise<SceneComposerPreferences> {
    const userId = getCurrentUserId();
    const remote = await settingsService.getSetting<Partial<SceneComposerPreferences>>(
      SCENE_COMPOSER_PREFERENCES_NAMESPACE,
      { userId },
    );

    return {
      sortBy: normalizeSortBy(remote?.sortBy),
      validationFilter: normalizeValidationFilter(remote?.validationFilter),
      showFavoritesOnly: normalizeShowFavoritesOnly(remote?.showFavoritesOnly),
      filterTags: normalizeFilterTags(remote?.filterTags),
      activeTab: normalizeActiveTab(remote?.activeTab),
    };
  },

  async setPreferences(preferences: Partial<SceneComposerPreferences>): Promise<SceneComposerPreferences> {
    const current = await this.getPreferences();
    const next: SceneComposerPreferences = {
      sortBy: normalizeSortBy(preferences.sortBy ?? current.sortBy),
      validationFilter: normalizeValidationFilter(preferences.validationFilter ?? current.validationFilter),
      showFavoritesOnly: normalizeShowFavoritesOnly(preferences.showFavoritesOnly ?? current.showFavoritesOnly),
      filterTags: normalizeFilterTags(preferences.filterTags ?? current.filterTags),
      activeTab: normalizeActiveTab(preferences.activeTab ?? current.activeTab),
    };
    await settingsService.setSetting(SCENE_COMPOSER_PREFERENCES_NAMESPACE, next, {
      userId: getCurrentUserId(),
    });
    return next;
  },

  defaults(): SceneComposerPreferences {
    return { ...DEFAULT_PREFERENCES };
  },
};
