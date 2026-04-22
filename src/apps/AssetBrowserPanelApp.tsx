import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PanelLoadingFallback } from './shared';
import { CustomThemeProvider } from '../contexts/ThemeContext';

const AssetBrowserPanel = lazy(() =>
  import('../components/AssetBrowserPanel').then((m) => ({ default: m.AssetBrowserPanel })),
);

const AssetBrowserPanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => {
        const newState = !prev;
        const panel = document.getElementById('assetBrowserPanel');
        if (panel) {
          if (newState) {
            const marketplacePanel = document.getElementById('marketplacePanel');
            const aiPanel = document.getElementById('aiAssistantPanel');
            const studioPanel = document.getElementById('actorBottomPanel');
            if (marketplacePanel?.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
            }
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
        const trigger = document.getElementById('assetBrowserTrigger');
        if (trigger) {
          trigger.classList.toggle('active', newState);
          trigger.setAttribute('aria-expanded', String(newState));
          const arrow = trigger.querySelector('.library-arrow');
          if (arrow) arrow.textContent = newState ? '−' : '+';
        }
        return newState;
      });
    };

    window.addEventListener('toggle-asset-browser-panel', handleToggle);
    return () => window.removeEventListener('toggle-asset-browser-panel', handleToggle);
  }, []);

  if (!isOpen) return null;

  return (
    <CustomThemeProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <AssetBrowserPanel
          isFullscreen={isFullscreen}
          onClose={() => window.dispatchEvent(new CustomEvent('toggle-asset-browser-panel'))}
          onToggleFullscreen={() => {
            const panel = document.getElementById('assetBrowserPanel');
            if (panel) {
              const newFs = !panel.classList.contains('fullscreen');
              setIsFullscreen(newFs);
              if (newFs) panel.classList.add('fullscreen');
              else panel.classList.remove('fullscreen');
            }
          }}
        />
      </Suspense>
    </CustomThemeProvider>
  );
};

export default AssetBrowserPanelApp;
