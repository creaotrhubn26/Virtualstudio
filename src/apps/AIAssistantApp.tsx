import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';

const AIAssistantPanel = lazy(() =>
  import('../components/AIAssistantPanel').then((m) => ({ default: m.AIAssistantPanel })),
);

const AIAssistantApp: React.FC = () => {
  const [, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => {
        const newState = !prev;

        const panel = document.getElementById('aiAssistantPanel');
        if (panel) {
          if (newState) {
            const studioLibraryPanel = document.getElementById('actorBottomPanel');
            const marketplacePanel = document.getElementById('marketplacePanel');

            if (studioLibraryPanel && studioLibraryPanel.classList.contains('open')) {
              const trigger = document.getElementById('actorPanelTrigger');
              if (trigger) {
                studioLibraryPanel.classList.remove('open');
                trigger.classList.remove('active');
                trigger.setAttribute('aria-expanded', 'false');
                const arrow = trigger.querySelector('.library-arrow');
                if (arrow) arrow.textContent = '+';
              }
            }
            if (marketplacePanel && marketplacePanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
            }
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-help-panel'));
            }

            panel.style.display = 'flex';
            panel.classList.add('open');

            const checkMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight;
            const setMaxHeight = (window as any).setPanelToMaxHeight;
            if (checkMaxHeight && setMaxHeight && checkMaxHeight('marketplacePanel')) {
              setMaxHeight('marketplacePanel', 'marketplacePanelHeight');
            }
          } else {
            panel.style.display = 'none';
            panel.classList.remove('open');
            panel.classList.remove('fullscreen');
            setIsFullscreen(false);
          }
        }

        const trigger = document.getElementById('tool-trigger-plugin-ai-assistant');
        if (trigger) {
          if (newState) {
            trigger.classList.add('active');
            trigger.setAttribute('aria-expanded', 'true');
            const arrow = trigger.querySelector('.library-arrow');
            if (arrow) arrow.textContent = '−';
          } else {
            trigger.classList.remove('active');
            trigger.setAttribute('aria-expanded', 'false');
            const arrow = trigger.querySelector('.library-arrow');
            if (arrow) arrow.textContent = '+';
          }
        }

        return newState;
      });
    };

    const handleFullscreen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsFullscreen(customEvent.detail);
    };

    window.addEventListener('toggle-ai-assistant-panel', handleToggle);
    window.addEventListener('ai-assistant-toggle-fullscreen', handleFullscreen);

    return () => {
      window.removeEventListener('toggle-ai-assistant-panel', handleToggle);
      window.removeEventListener('ai-assistant-toggle-fullscreen', handleFullscreen);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setIsFullscreen(false);
    const panel = document.getElementById('aiAssistantPanel');
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('open');
      panel.classList.remove('fullscreen');
    }
    const trigger = document.getElementById('tool-trigger-plugin-ai-assistant');
    if (trigger) {
      trigger.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
      const arrow = trigger.querySelector('.library-arrow');
      if (arrow) arrow.textContent = '+';
    }
  };

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <AIAssistantPanel
        onClose={handleClose}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {
          const panel = document.getElementById('aiAssistantPanel');
          if (panel) {
            const newState = !panel.classList.contains('fullscreen');
            setIsFullscreen(newState);
            if (newState) {
              panel.classList.add('fullscreen');
            } else {
              panel.classList.remove('fullscreen');
            }
            window.dispatchEvent(
              new CustomEvent('ai-assistant-toggle-fullscreen', { detail: newState }),
            );
          }
        }}
      />
    </Suspense>
  );
};

export default AIAssistantApp;
