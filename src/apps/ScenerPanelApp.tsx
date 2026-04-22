import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';
import { ScenarioPreset } from '../data/scenarioPresets';

const ScenerPanel = lazy(() =>
  import('../panels/ScenerPanel').then((m) => ({ default: m.ScenerPanel })),
);

const ScenerPanelApp: React.FC = () => {
  const handleApplyPreset = (preset: ScenarioPreset) => {
    window.dispatchEvent(new CustomEvent('applyScenarioPreset', { detail: preset }));
  };

  const handleShowRecommended = (preset: ScenarioPreset) => {
    window.dispatchEvent(new CustomEvent('showRecommendedAssets', { detail: preset }));
  };

  const getCurrentSceneConfig = () => {
    const event = new CustomEvent('getSceneConfig', { detail: { callback: null } });
    let config: ScenarioPreset['sceneConfig'] | null = null;
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      config = customEvent.detail;
    };
    window.addEventListener('sceneConfigResponse', handler, { once: true });
    window.dispatchEvent(event);
    window.removeEventListener('sceneConfigResponse', handler);
    return config;
  };

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <ScenerPanel
        onApplyPreset={handleApplyPreset}
        onShowRecommended={handleShowRecommended}
        getCurrentSceneConfig={getCurrentSceneConfig}
      />
    </Suspense>
  );
};

export default ScenerPanelApp;
