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

export function useTutorialPreferences() {
  const [preferences, setPreferences] = useState<TutorialPreferences>(() => {
    try {
      const stored = localStorage.getItem('tutorialPreferences');
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const updatePreferences = useCallback((updates: Partial<TutorialPreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...updates };
      localStorage.setItem('tutorialPreferences', JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, []);

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
    updatePreferences,
    markTutorialComplete,
    dismissTip,
    resetTutorial,
  };
}

export default useTutorialPreferences;
