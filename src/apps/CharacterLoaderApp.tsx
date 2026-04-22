import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const CharacterModelLoader = lazy(() =>
  import('../panels/CharacterModelLoader').then((m) => ({ default: m.CharacterModelLoader })),
);

const CharacterLoaderApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <CharacterModelLoader />
  </Suspense>
);

export default CharacterLoaderApp;
