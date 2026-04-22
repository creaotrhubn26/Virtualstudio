import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ToastStack';

const GelPickerPanel = lazy(() =>
  import('../panels/GelPickerPanel').then((m) => ({ default: m.GelPickerPanel })),
);

const GelPickerApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <GelPickerPanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export default GelPickerApp;
