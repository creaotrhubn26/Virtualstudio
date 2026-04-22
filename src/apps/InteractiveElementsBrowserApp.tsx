import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';

const InteractiveElementsBrowser = lazy(() =>
  import('../components/InteractiveElementsBrowser').then((m) => ({
    default: m.InteractiveElementsBrowser,
  })),
);

const InteractiveElementsBrowserApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('openInteractiveElements', handleOpen);
    window.addEventListener('closeInteractiveElements', handleClose);
    return () => {
      window.removeEventListener('openInteractiveElements', handleOpen);
      window.removeEventListener('closeInteractiveElements', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <InteractiveElementsBrowser />
    </Suspense>
  );
};

export default InteractiveElementsBrowserApp;
