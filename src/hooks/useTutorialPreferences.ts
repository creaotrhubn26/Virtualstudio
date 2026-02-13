import { useState, useCallback } from 'react';

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
  const [preferences, setPreferences] = useState<TutorialPreferences>(() => {
    try {
      const storageKey = _tutorialId ? `tutorialPreferences_${_tutorialId}` : 'tutorialPreferences';
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const updatePreferences = useCallback((updates: Partial<TutorialPreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...updates };
      const storageKey = _tutorialId ? `tutorialPreferences_${_tutorialId}` : 'tutorialPreferences';
      localStorage.setItem(storageKey, JSON.stringify(newPrefs));
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
