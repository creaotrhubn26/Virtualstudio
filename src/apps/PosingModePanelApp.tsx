import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ToastStack';

const PosingModePanel = lazy(() =>
  import('../panels/PosingModePanel').then((m) => ({ default: m.PosingModePanel })),
);

const PosingModePanelApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <PosingModePanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export default PosingModePanelApp;
