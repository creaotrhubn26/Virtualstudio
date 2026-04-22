import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const AccessoriesPanel = lazy(() =>
  import('../panels/AccessoriesPanel').then((m) => ({ default: m.AccessoriesPanel })),
);

const AccessoriesPanelApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <AccessoriesPanel />
  </Suspense>
);

export default AccessoriesPanelApp;
