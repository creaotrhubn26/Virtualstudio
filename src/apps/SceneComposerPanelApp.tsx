import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const SceneComposerPanel = lazy(() =>
  import('../components/SceneComposerPanel').then((m) => ({ default: m.SceneComposerPanel })),
);

const SceneComposerPanelApp: React.FC = () => {
  const handleSaveScene = async (scene: unknown) => {
    window.dispatchEvent(new CustomEvent('save-scene', { detail: scene }));
  };

  const handleLoadScene = (scene: unknown) => {
    window.dispatchEvent(new CustomEvent('load-scene', { detail: scene }));
  };

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <SceneComposerPanel onSaveScene={handleSaveScene} onLoadScene={handleLoadScene} />
    </Suspense>
  );
};

export default SceneComposerPanelApp;
