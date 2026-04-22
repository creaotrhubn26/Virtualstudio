import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const HDRIPanel = lazy(() =>
  import('../panels/HDRIPanel').then((m) => ({ default: m.HDRIPanel })),
);

const HDRIPanelApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <HDRIPanel />
  </Suspense>
);

export default HDRIPanelApp;
