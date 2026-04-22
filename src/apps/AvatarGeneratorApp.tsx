import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';

const AvatarGeneratorPanel = lazy(() =>
  import('../panels/AvatarGeneratorPanel').then((m) => ({ default: m.AvatarGeneratorPanel })),
);

const AvatarGeneratorApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openAvatarGenerator', handleOpen);
    return () => window.removeEventListener('openAvatarGenerator', handleOpen);
  }, []);

  const handleAvatarGenerated = (glbUrl: string, metadata: any) => {
    window.dispatchEvent(new CustomEvent('avatarGenerated', { detail: { glbUrl, metadata } }));
  };

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <AvatarGeneratorPanel
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onAvatarGenerated={handleAvatarGenerated}
      />
    </Suspense>
  );
};

export default AvatarGeneratorApp;
