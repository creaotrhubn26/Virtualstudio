import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ToastStack';

const OutdoorLightingPanel = lazy(() =>
  import('../panels/OutdoorLightingPanel').then((m) => ({ default: m.OutdoorLightingPanel })),
);

const OutdoorLightingApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <OutdoorLightingPanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export default OutdoorLightingApp;
