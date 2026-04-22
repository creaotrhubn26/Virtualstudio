import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';

const AmbientSoundsBrowser = lazy(() =>
  import('../components/AmbientSoundsBrowser').then((m) => ({
    default: m.AmbientSoundsBrowser,
  })),
);

const AmbientSoundsBrowserApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('openAmbientSounds', handleOpen);
    window.addEventListener('closeAmbientSounds', handleClose);
    return () => {
      window.removeEventListener('openAmbientSounds', handleOpen);
      window.removeEventListener('closeAmbientSounds', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <AmbientSoundsBrowser />
    </Suspense>
  );
};

export default AmbientSoundsBrowserApp;
