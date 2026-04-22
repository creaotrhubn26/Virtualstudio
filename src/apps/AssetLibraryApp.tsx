import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const AssetLibraryPanel = lazy(() => import('../panels/AssetLibraryPanel'));

const AssetLibraryApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <AssetLibraryPanel />
  </Suspense>
);

export default AssetLibraryApp;
