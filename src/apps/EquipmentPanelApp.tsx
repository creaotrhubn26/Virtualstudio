import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';

const EquipmentPanel = lazy(() =>
  import('../panels/EquipmentPanel').then((m) => ({ default: m.EquipmentPanel })),
);

const EquipmentPanelApp: React.FC = () => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <EquipmentPanel />
  </Suspense>
);

export default EquipmentPanelApp;
