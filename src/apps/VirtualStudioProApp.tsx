import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const VirtualStudioPro = lazy(() =>
  import('../components/VirtualStudioPro').then((m) => ({ default: m.VirtualStudioPro })),
);

const VirtualStudioProApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <VirtualStudioPro />
  </Suspense>
);

export default VirtualStudioProApp;
