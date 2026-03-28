import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSettingMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock('./settingsService', () => ({
  __esModule: true,
  default: {
    getSetting: getSettingMock,
    setSetting: setSettingMock,
  },
  getCurrentUserId: () => 'test-user',
}));

describe('sceneComposerPreferencesService', () => {
  beforeEach(() => {
    getSettingMock.mockReset();
    setSettingMock.mockReset();
    vi.resetModules();
  });

  it('returns defaults when no stored preferences exist', async () => {
    getSettingMock.mockResolvedValue(null);
    const { sceneComposerPreferencesService } = await import('./sceneComposerPreferencesService');

    await expect(sceneComposerPreferencesService.getPreferences()).resolves.toEqual({
      sortBy: 'updatedAt',
      validationFilter: 'all',
      showFavoritesOnly: false,
      filterTags: [],
      activeTab: 'scenes',
    });
  });

  it('normalizes and persists preferences', async () => {
    getSettingMock.mockResolvedValue({
      sortBy: 'size',
      validationFilter: 'local',
      showFavoritesOnly: false,
      filterTags: ['pizza'],
      activeTab: 'timeline',
    });
    setSettingMock.mockResolvedValue(undefined);
    const { sceneComposerPreferencesService } = await import('./sceneComposerPreferencesService');

    const saved = await sceneComposerPreferencesService.setPreferences({
      sortBy: 'validationStatus',
      validationFilter: 'differences',
      showFavoritesOnly: true,
      filterTags: ['pizza', '  restaurant ', 'pizza', '', '  '],
      activeTab: 'environment',
    });

    expect(saved).toEqual({
      sortBy: 'validationStatus',
      validationFilter: 'differences',
      showFavoritesOnly: true,
      filterTags: ['pizza', 'restaurant'],
      activeTab: 'environment',
    });
    expect(setSettingMock).toHaveBeenCalledWith(
      'virtualStudio_sceneComposerPreferences',
      {
        sortBy: 'validationStatus',
        validationFilter: 'differences',
        showFavoritesOnly: true,
        filterTags: ['pizza', 'restaurant'],
        activeTab: 'environment',
      },
      { userId: 'test-user' },
    );
  });

  it('normalizes invalid stored values for extended preferences', async () => {
    getSettingMock.mockResolvedValue({
      sortBy: 'weird',
      validationFilter: 'broken',
      showFavoritesOnly: 'yes',
      filterTags: [' valid ', 123, '', 'valid', 'night'],
      activeTab: 'unknown',
    });
    const { sceneComposerPreferencesService } = await import('./sceneComposerPreferencesService');

    await expect(sceneComposerPreferencesService.getPreferences()).resolves.toEqual({
      sortBy: 'updatedAt',
      validationFilter: 'all',
      showFavoritesOnly: false,
      filterTags: ['valid', 'night'],
      activeTab: 'scenes',
    });
  });
});
