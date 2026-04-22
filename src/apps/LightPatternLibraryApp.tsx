import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';

const LightPatternLibrary = lazy(() =>
  import('../panels/LightPatternLibrary').then((m) => ({ default: m.LightPatternLibrary })),
);

const LightPatternLibraryApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openLightPatternLibrary', handleOpen);
    return () => window.removeEventListener('openLightPatternLibrary', handleOpen);
  }, []);

  const handleApplyPattern = async (pattern: any) => {
    window.dispatchEvent(new CustomEvent('applyLightPattern', { detail: pattern }));
    setIsOpen(false);
  };

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <LightPatternLibrary
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onApplyPattern={handleApplyPattern}
      />
    </Suspense>
  );
};

export default LightPatternLibraryApp;
