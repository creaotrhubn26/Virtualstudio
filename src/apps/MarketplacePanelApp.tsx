import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';
import { ToastProvider } from '../components/ToastStack';

const MarketplacePanel = lazy(() =>
  import('../components/MarketplacePanel').then((m) => ({ default: m.MarketplacePanel })),
);

const MarketplacePanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => {
        const newState = !prev;
        const panel = document.getElementById('marketplacePanel');
        if (panel) {
          if (newState) {
            const aiPanel = document.getElementById('aiAssistantPanel');
            const studioPanel = document.getElementById('actorBottomPanel');
            if (aiPanel?.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
            }
            if (studioPanel?.classList.contains('open')) {
              studioPanel.classList.remove('open');
              const t = document.getElementById('actorPanelTrigger');
              t?.classList.remove('active');
              t?.setAttribute('aria-expanded', 'false');
            }
            panel.style.display = 'flex';
            panel.classList.add('open');
          } else {
            panel.style.display = 'none';
            panel.classList.remove('open');
            panel.classList.remove('fullscreen');
            setIsFullscreen(false);
          }
        }
        const trigger = document.getElementById('marketplaceTrigger');
        if (trigger) {
          trigger.classList.toggle('active', newState);
          trigger.setAttribute('aria-expanded', String(newState));
          const arrow = trigger.querySelector('.library-arrow');
          if (arrow) arrow.textContent = newState ? '−' : '+';
        }
        return newState;
      });
    };

    const handleFullscreen = (e: Event) => {
      setIsFullscreen((e as CustomEvent<boolean>).detail);
    };

    window.addEventListener('toggle-marketplace-panel', handleToggle);
    window.addEventListener('marketplace-toggle-fullscreen', handleFullscreen);
    return () => {
      window.removeEventListener('toggle-marketplace-panel', handleToggle);
      window.removeEventListener('marketplace-toggle-fullscreen', handleFullscreen);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <MarketplacePanel
          isFullscreen={isFullscreen}
          onClose={() => window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'))}
          onToggleFullscreen={() => {
            const panel = document.getElementById('marketplacePanel');
            if (panel) {
              const newFs = !panel.classList.contains('fullscreen');
              setIsFullscreen(newFs);
              if (newFs) panel.classList.add('fullscreen');
              else panel.classList.remove('fullscreen');
              window.dispatchEvent(
                new CustomEvent('marketplace-toggle-fullscreen', { detail: newFs }),
              );
            }
          }}
        />
      </Suspense>
    </ToastProvider>
  );
};

export default MarketplacePanelApp;
