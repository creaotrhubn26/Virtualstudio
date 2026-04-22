import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ToastStack';

const CinematicEvaluationPanel = lazy(() =>
  import('../panels/CinematicEvaluationPanel').then((m) => ({
    default: m.CinematicEvaluationPanel,
  })),
);

const CinematicEvaluationApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <CinematicEvaluationPanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export default CinematicEvaluationApp;
