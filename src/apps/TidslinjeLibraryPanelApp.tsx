import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const TidslinjeLibraryPanel = lazy(() =>
  import('../panels/TidslinjeLibraryPanel').then((m) => ({ default: m.TidslinjeLibraryPanel })),
);

const TidslinjeLibraryPanelApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <TidslinjeLibraryPanel />
  </Suspense>
);

export default TidslinjeLibraryPanelApp;
