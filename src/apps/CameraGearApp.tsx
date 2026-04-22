import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const CameraGearPanel = lazy(() =>
  import('../panels/CameraGearPanel').then((m) => ({ default: m.CameraGearPanel })),
);

const CameraGearApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <CameraGearPanel />
  </Suspense>
);

export default CameraGearApp;
