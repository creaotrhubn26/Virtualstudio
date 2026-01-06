/**
 * Custom hook for managing panel storage in localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { PanelConfig, MarketplaceService } from '../types';
import { MARKETPLACE_SERVICES } from '../constants';

/**
 * Hook for managing panels in localStorage
 */
export const usePanelStorage = () => {
  const [panels, setPanels] = useState<PanelConfig[]>([]);
  const [marketplaceServices, setMarketplaceServices] = useState<MarketplaceService[]>(MARKETPLACE_SERVICES);
  const [loading, setLoading] = useState(true);

  // Load panels from localStorage
  useEffect(() => {
    try {
      const savedPanels = localStorage.getItem('customPanels');
      if (savedPanels) {
        const parsed = JSON.parse(savedPanels);
        // Ensure all panels have type field (for backward compatibility)
        const panelsWithType = parsed.map((p: PanelConfig) => ({
          ...p,
          type: p.type || 'function',
        }));
        setPanels(panelsWithType);
      }

      // Load installed services from localStorage
      const installedServices = localStorage.getItem('installedServices');
      if (installedServices) {
        const installed = JSON.parse(installedServices);
        setMarketplaceServices(prev => 
          prev.map(service => ({
            ...service,
            installed: installed.includes(service.id)
          }))
        );
      }
    } catch (e) {
      console.error('Error loading panels:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save panels to localStorage
  const savePanels = useCallback(async (newPanels: PanelConfig[]) => {
    setPanels(newPanels);
    localStorage.setItem('customPanels', JSON.stringify(newPanels));
    // Update DOM with new panels
    updatePanelsInDOM(newPanels);
    
    // Sync to IndexedDB for backup
    try {
      const { syncPanelsToIndexedDB } = await import('../utils/indexedDBBackup');
      await syncPanelsToIndexedDB(newPanels);
    } catch (error) {
      // IndexedDB backup is optional, continue even if it fails
      console.warn('IndexedDB backup failed:', error);
    }
  }, []);

  // Update panels in DOM
  const updatePanelsInDOM = useCallback((panelsToUpdate: PanelConfig[]) => {
    panelsToUpdate.forEach(panel => {
      if (!panel.enabled) {
        const existingPanel = document.getElementById(panel.id);
        if (existingPanel) {
          existingPanel.remove();
        }
        return;
      }

      let panelElement = document.getElementById(panel.id);
      
      if (!panelElement) {
        // Create new panel element
        panelElement = document.createElement('div');
        panelElement.id = panel.id;
        panelElement.className = 'actor-bottom-panel custom-panel';
        panelElement.style.display = 'none';
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'panel-resize-handle';
        resizeHandle.id = `${panel.id}ResizeHandle`;
        resizeHandle.setAttribute('aria-label', 'Dra for å endre panelstørrelse');
        panelElement.appendChild(resizeHandle);
        
        // Add panel header
        const header = document.createElement('div');
        header.className = 'actor-panel-tabs';
        header.innerHTML = `
          <div class="custom-panel-title">${panel.title}</div>
          <div class="actor-panel-actions">
            <button class="panel-fullscreen-btn" id="${panel.id}FullscreenBtn" title="Fullskjerm">
              <span aria-hidden="true">⛶</span>
            </button>
            <button class="panel-close-btn" id="${panel.id}CloseBtn" title="Lukk panel">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        `;
        panelElement.appendChild(header);
        
        // Add panel content
        const content = document.createElement('div');
        content.className = 'actor-panel-content';
        content.id = `${panel.id}Content`;
        content.innerHTML = panel.content;
        panelElement.appendChild(content);
        
        // Add to DOM
        const app = document.getElementById('app');
        if (app) {
          app.appendChild(panelElement);
        }
      } else {
        // Update existing panel
        const titleEl = panelElement.querySelector('.custom-panel-title');
        if (titleEl) titleEl.textContent = panel.title;
        
        const contentEl = panelElement.querySelector(`#${panel.id}Content`);
        if (contentEl) contentEl.innerHTML = panel.content;
      }
      
      // Set default height
      if (panel.defaultHeight) {
        panelElement.style.height = `${panel.defaultHeight}px`;
      }
      
      // Setup panel functionality
      setupPanelFunctionality(panel);
    });
  }, []);

  // Setup panel functionality (resize, toggle, etc.)
  const setupPanelFunctionality = useCallback((panel: PanelConfig) => {
    const panelElement = document.getElementById(panel.id);
    if (!panelElement) return;

    // Setup resize handle
    const resizeHandle = document.getElementById(`${panel.id}ResizeHandle`);
    if (resizeHandle && (window as any).setupPanelResizeHandle) {
      (window as any).setupPanelResizeHandle(
        `${panel.id}ResizeHandle`,
        panel.id,
        `${panel.storageKey}Height`
      );
    }

    // Setup close button
    const closeBtn = document.getElementById(`${panel.id}CloseBtn`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panelElement.style.display = 'none';
        panelElement.classList.remove('open');
      });
    }

    // Setup fullscreen button
    const fullscreenBtn = document.getElementById(`${panel.id}FullscreenBtn`);
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        panelElement.classList.toggle('fullscreen');
      });
    }
  }, []);

  // Install a marketplace service
  const installService = useCallback((serviceId: string) => {
    const service = marketplaceServices.find(s => s.id === serviceId);
    if (!service) return false;

    // Mark as installed
    const updatedServices = marketplaceServices.map(s => 
      s.id === serviceId ? { ...s, installed: true } : s
    );
    setMarketplaceServices(updatedServices);

    // Save to localStorage
    const installedServices = JSON.parse(localStorage.getItem('installedServices') || '[]');
    if (!installedServices.includes(serviceId)) {
      installedServices.push(serviceId);
      localStorage.setItem('installedServices', JSON.stringify(installedServices));
    }

    return true;
  }, [marketplaceServices]);

  // Load marketplace services (could be from API)
  const loadMarketplaceServices = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from marketplace API
      // For now, we use the default list
      // const services = await marketplaceService.getProducts({ category: 'plugin' });
      // setMarketplaceServices(services);
    } catch (e) {
      console.error('Error loading marketplace services:', e);
      throw e;
    }
  }, []);

  return {
    panels,
    marketplaceServices,
    loading,
    savePanels,
    installService,
    loadMarketplaceServices,
    updatePanelsInDOM,
  };
};

