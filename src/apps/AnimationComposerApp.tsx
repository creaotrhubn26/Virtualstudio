import React, { Suspense, lazy } from 'react';
import { PanelLoadingFallback } from './shared';
import { ToastProvider } from '../components/ToastStack';

const AnimationComposerPanel = lazy(() =>
  import('../panels/AnimationComposerPanel').then((m) => ({ default: m.AnimationComposerPanel })),
);

const AnimationComposerApp: React.FC = () => (
  <ToastProvider>
    <Suspense fallback={<PanelLoadingFallback />}>
      <AnimationComposerPanel />
    </Suspense>
  </ToastProvider>
);

export default AnimationComposerApp;
