import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';

const NotesPanel = lazy(() =>
  import('../components/NotesPanel').then((m) => ({ default: m.NotesPanel })),
);

const NotesPanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      if (isOpen && !isClosing) {
        setIsClosing(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsClosing(false);
        }, 350);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    };
    window.addEventListener('toggle-notes-panel', handleToggle);
    return () => window.removeEventListener('toggle-notes-panel', handleToggle);
  }, [isOpen, isClosing]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 350);
  };

  const showPanel = isOpen || isClosing;
  if (!showPanel) return null;

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <NotesPanel onClose={handleClose} isClosing={isClosing} />
    </Suspense>
  );
};

export default NotesPanelApp;
