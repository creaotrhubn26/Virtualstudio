import { useState, useCallback, useEffect } from 'react';
import settingsService, { getCurrentUserId } from '../services/settingsService';

interface TutorialPreferences {
  hasSeenTutorial: boolean;
  tutorialStep: number;
  dismissedTips: string[];
}

const DEFAULT_PREFERENCES: TutorialPreferences = {
  hasSeenTutorial: false,
  tutorialStep: 0,
  dismissedTips: [],
};

export function useTutorialPreferences(_tutorialId?: string) {
  const [preferences, setPreferences] = useState<TutorialPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadPreferences = async () => {
      const storageKey = _tutorialId ? `tutorialPreferences_${_tutorialId}` : 'tutorialPreferences';
      const userId = getCurrentUserId();
      const remote = await settingsService.getSetting<TutorialPreferences>(storageKey, { userId });
      if (remote) {
        setPreferences(remote);
        return;
      }
    };
    void loadPreferences();
  }, [_tutorialId]);

  const updatePreferences = useCallback((updates: Partial<TutorialPreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...updates };
      const storageKey = _tutorialId ? `tutorialPreferences_${_tutorialId}` : 'tutorialPreferences';
      void settingsService.setSetting(storageKey, newPrefs, { userId: getCurrentUserId() });
      return newPrefs;
    });
  }, [_tutorialId]);

  const markTutorialComplete = useCallback(() => {
    updatePreferences({ hasSeenTutorial: true });
  }, [updatePreferences]);

  const dismissTip = useCallback((tipId: string) => {
    updatePreferences({
      dismissedTips: [...preferences.dismissedTips, tipId],
    });
  }, [preferences.dismissedTips, updatePreferences]);

  const resetTutorial = useCallback(() => {
    updatePreferences(DEFAULT_PREFERENCES);
  }, [updatePreferences]);

  return {
    ...preferences,
    isDismissed: preferences.hasSeenTutorial,
    updatePreferences,
    markTutorialComplete,
    dismissTip,
    resetTutorial,
  };
}

export default useTutorialPreferences;
