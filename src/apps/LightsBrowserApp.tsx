import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const LightsBrowser = lazy(() =>
  import('../panels/LightsBrowser').then((m) => ({ default: m.LightsBrowser })),
);

const LightsBrowserApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <LightsBrowser />
  </Suspense>
);

export default LightsBrowserApp;
