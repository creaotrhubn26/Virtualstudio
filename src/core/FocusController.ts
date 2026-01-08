import { useFocusStore, useAppStore, FocusMode, SafeAreaMode, CompositionGuide, HelperGuide } from '../state/store';

export class FocusController {
  private lastLightPositions: Map<string, { x: number; y: number; z: number }> = new Map();
  private viewportElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private focusGridElement: HTMLElement | null = null;
  private singlePointElement: HTMLElement | null = null;
  private isDragging = false;
  private dragPointId: number | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleModeChange = this.handleModeChange.bind(this);
    this.handleSafeAreaChange = this.handleSafeAreaChange.bind(this);
    this.handleGridToggle = this.handleGridToggle.bind(this);
  }

  init() {
    this.viewportElement = document.querySelector('.viewport-3d');
    this.overlayElement = document.getElementById('viewfinderOverlay');
    this.focusGridElement = document.getElementById('focusGrid');
    this.singlePointElement = document.getElementById('singleFocusPoint');

    if (!this.overlayElement || !this.viewportElement) {
      console.warn('FocusController: Required elements not found');
      return;
    }

    this.setupEventListeners();
    this.setupControlButtons();
    this.subscribeToStore();
    this.updateFocusPointsFromStore();
    this.setupCameraSettingsListener();
  }

  private setupCameraSettingsListener() {
    // Listen for camera settings changes to update exposure guide
    window.addEventListener('ch-camera-settings-changed', () => {
      const currentGuide = useFocusStore.getState().helperGuide;
      if (currentGuide === 'exposure') {
        this.updateHelperGuide('exposure');
      }
    });

    // Also listen for lens preset changes
    window.addEventListener('ch-lens-preset', () => {
      const currentGuide = useFocusStore.getState().helperGuide;
      if (currentGuide === 'exposure') {
        this.updateHelperGuide('exposure');
      }
    });
  }

  private setupEventListeners() {
    const focusPoints = document.querySelectorAll('.focus-point');
    focusPoints.forEach((point) => {
      point.addEventListener('pointerdown', this.handlePointerDown as EventListener);
    });

    if (this.singlePointElement) {
      this.singlePointElement.addEventListener('pointerdown', this.handlePointerDown as EventListener);
    }

    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp);
    
    // Click-to-focus on 3D viewport - add to both canvas and viewport container
    const canvas = document.getElementById('renderCanvas');
    const viewport = document.getElementById('viewport3d');
    
    // Manual double-click detection
    let lastClickTime = 0;
    const handlePointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left click
      const now = Date.now();
      const timeDiff = now - lastClickTime;
      console.log('[FocusController] Pointer up on viewport, timeDiff:', timeDiff);
      lastClickTime = now;
      
      if (timeDiff > 50 && timeDiff < 400) {
        console.log('[FocusController] Manual double-click detected!');
        this.handleViewportClick(e as unknown as MouseEvent);
      }
    };
    
    if (viewport) {
      console.log('[FocusController] Adding double-click-to-focus handler to viewport');
      viewport.addEventListener('dblclick', this.handleViewportClick.bind(this), { capture: true });
      viewport.addEventListener('pointerup', handlePointerUp, { capture: true });
    }
    
    if (canvas) {
      console.log('[FocusController] Adding double-click-to-focus handler to canvas');
      canvas.addEventListener('dblclick', this.handleViewportClick.bind(this), { capture: true });
      canvas.addEventListener('pointerup', handlePointerUp, { capture: true });
    }
    
    if (!canvas && !viewport) {
      console.warn('[FocusController] Neither canvas nor viewport found, retrying...');
      setTimeout(() => {
        const retryCanvas = document.getElementById('renderCanvas');
        const retryViewport = document.getElementById('viewport3d');
        if (retryCanvas) {
          console.log('[FocusController] Adding handlers to canvas (retry)');
          retryCanvas.addEventListener('dblclick', this.handleViewportClick.bind(this), { capture: true });
          retryCanvas.addEventListener('pointerup', handlePointerUp, { capture: true });
        }
        if (retryViewport) {
          console.log('[FocusController] Adding handlers to viewport (retry)');
          retryViewport.addEventListener('dblclick', this.handleViewportClick.bind(this), { capture: true });
          retryViewport.addEventListener('pointerup', handlePointerUp, { capture: true });
        }
      }, 500);
    }
    
    // Debounced update function to prevent too frequent updates and blinking
    const debouncedLightingUpdate = this.debounce(() => {
      const state = useFocusStore.getState();
      if (state.helperGuide === 'lighting') {
        this.updateHelperGuide('lighting');
      }
    }, 300); // Increased debounce to prevent blinking

    // Listen for light position changes (from top view or other sources)
    window.addEventListener('ch-light-position-changed', debouncedLightingUpdate);

    // Listen for light changes from VirtualStudio
    window.addEventListener('ch-light-updated', debouncedLightingUpdate);
    
    // Also listen for light selection changes
    window.addEventListener('ch-light-selected', debouncedLightingUpdate);
    
    // Listen for any scene updates that might affect lighting
    window.addEventListener('ch-scene-updated', debouncedLightingUpdate);
    
    // Handle light toggle switches (delegated event listener)
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('light-toggle-checkbox')) {
        const lightId = target.getAttribute('data-light-id');
        if (lightId) {
          const studio = (window as any).virtualStudio;
          if (studio && studio.lights) {
            const lightData = studio.lights.get(lightId);
            if (lightData && lightData.light) {
              const checkbox = target as HTMLInputElement;
              const wasEnabled = lightData.light.intensity > 0;
              
              if (checkbox.checked && !wasEnabled) {
                // Turn light on - restore previous intensity or use baseIntensity
                lightData.light.intensity = lightData.baseIntensity || 1.0;
                if (lightData.intensity !== undefined) {
                  lightData.intensity = lightData.light.intensity;
                }
              } else if (!checkbox.checked && wasEnabled) {
                // Turn light off - store current intensity and set to 0
                if (lightData.baseIntensity === undefined) {
                  lightData.baseIntensity = lightData.light.intensity;
                }
                lightData.light.intensity = 0;
                if (lightData.intensity !== undefined) {
                  lightData.intensity = 0;
                }
              }
              
              // Dispatch event to trigger update
              window.dispatchEvent(new CustomEvent('ch-light-updated', {
                detail: { lightId }
              }));
              
              // Update the guide immediately
              debouncedLightingUpdate();
            }
          }
        }
      }
    });
    
    // Periodic check as backup (in case events are missed)
    // Check every 500ms if lighting guide is active
    let positionCheckInterval: ReturnType<typeof setInterval> | null = null;
    const checkLightPositions = () => {
      const state = useFocusStore.getState();
      if (state.helperGuide !== 'lighting') {
        if (positionCheckInterval) {
          clearInterval(positionCheckInterval);
          positionCheckInterval = null;
        }
        return;
      }
      
      const studio = (window as any).virtualStudio;
      if (!studio || !studio.lights) return;
      
      let hasChanged = false;
      const lights = Array.from(studio.lights.values());
      
      for (const lightData of lights) {
        if (!lightData || !lightData.mesh || !lightData.mesh.position) continue;
        
        const pos = lightData.mesh.position;
        const lightId = lightData.mesh.name || lightData.name || '';
        const lastPos = this.lastLightPositions.get(lightId);
        
        if (!lastPos || 
            Math.abs(lastPos.x - pos.x) > 0.01 ||
            Math.abs(lastPos.y - pos.y) > 0.01 ||
            Math.abs(lastPos.z - pos.z) > 0.01) {
          this.lastLightPositions.set(lightId, { x: pos.x, y: pos.y, z: pos.z });
          hasChanged = true;
        }
      }
      
      if (hasChanged) {
        debouncedLightingUpdate();
      }
    };
    
    // Monitor helperGuide changes to start/stop position checking
    useFocusStore.subscribe((state) => {
      if (state.helperGuide === 'lighting') {
        if (!positionCheckInterval) {
          // Check every 500ms for position changes
          positionCheckInterval = setInterval(checkLightPositions, 500);
          // Initial check
          setTimeout(checkLightPositions, 100);
        }
      } else {
        if (positionCheckInterval) {
          clearInterval(positionCheckInterval);
          positionCheckInterval = null;
        }
        this.lastLightPositions.clear();
      }
    });
  }

  private setupControlButtons() {
    const overlayToggleBtn = document.querySelector('.vf-btn.overlay-toggle');
    const gridToggleBtn = document.querySelector('.vf-btn.grid-toggle');

    if (overlayToggleBtn) {
      overlayToggleBtn.addEventListener('click', this.handleOverlayToggle.bind(this));
    }
    if (gridToggleBtn) {
      gridToggleBtn.addEventListener('click', this.handleGridToggle);
    }

    // Setup dropdown menu handlers
    this.setupDropdownMenu('focusModeMenu', (value) => {
      useFocusStore.getState().setMode(value as FocusMode);
    });

    this.setupDropdownMenu('compositionMenu', (value) => {
      useFocusStore.getState().setCompositionGuide(value as CompositionGuide);
    });

    this.setupDropdownMenu('safeAreaMenu', (value) => {
      useFocusStore.getState().setSafeAreaMode(value as SafeAreaMode);
    });

    this.setupDropdownMenu('helperGuideMenu', (value) => {
      useFocusStore.getState().setHelperGuide(value as HelperGuide);
    });
  }

  private setupDropdownMenu(menuId: string, onSelect: (value: string) => void) {
    const menu = document.getElementById(menuId);
    if (!menu) return;

    const dropdown = menu.closest('.vf-dropdown');
    const btn = dropdown?.querySelector('.vf-btn');

    // Toggle dropdown on button click
    if (btn && dropdown) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        // Close all other dropdowns first
        document.querySelectorAll('.vf-dropdown.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) {
          dropdown.classList.add('open');
        }
      });
    }

    const items = menu.querySelectorAll('.vf-menu-item');
    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = (item as HTMLElement).dataset.value;
        if (value) {
          onSelect(value);
          // Update active state
          items.forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
          // Close dropdown after selection
          dropdown?.classList.remove('open');
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown?.classList.remove('open');
    });
  }

  private subscribeToStore() {
    this.unsubscribe = useFocusStore.subscribe((state, prevState) => {
      if (state.showOverlay !== prevState.showOverlay) {
        this.updateOverlayVisibility(state.showOverlay);
      }
      if (state.mode !== prevState.mode) {
        this.updateModeDisplay(state.mode);
      }
      if (state.activePointId !== prevState.activePointId) {
        this.updateActivePointDisplay(state.activePointId);
      }
      if (state.safeAreaMode !== prevState.safeAreaMode) {
        this.updateSafeAreaDisplay(state.safeAreaMode);
      }
      if (state.showGrid !== prevState.showGrid) {
        this.updateGridDisplay(state.showGrid);
      }
      if (state.compositionGuide !== prevState.compositionGuide) {
        this.updateCompositionGuide(state.compositionGuide);
      }
      if (state.helperGuide !== prevState.helperGuide) {
        this.updateHelperGuide(state.helperGuide);
      }
      if (state.focusDistance !== prevState.focusDistance) {
        this.updateFocusDistanceDisplay(state.focusDistance, state.hitObjectName);
      }
    });
  }

  private handlePointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('focus-point') && target.id !== 'singleFocusPoint') return;

    e.preventDefault();
    e.stopPropagation();
    
    const pointId = target.dataset.point ? parseInt(target.dataset.point) : -1;
    
    // For focus-points in zone mode, only allow selection (click), not dragging
    // Single focus point can still be dragged
    if (target.classList.contains('focus-point')) {
      // Just select the point, don't enable dragging
      if (pointId >= 0) {
        useFocusStore.getState().setActivePoint(pointId);
      }
      return;
    }
    
    // For single focus point, allow dragging
    if (target.id === 'singleFocusPoint') {
      this.isDragging = true;
      target.setPointerCapture(e.pointerId);
      this.dragPointId = -1;
      useFocusStore.getState().setDragging(true);
      target.classList.add('dragging');
      
      window.dispatchEvent(new CustomEvent('focus:dragstart', { 
        detail: { pointId: -1, x: e.clientX, y: e.clientY } 
      }));
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.viewportElement) return;

    const rect = this.viewportElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const state = useFocusStore.getState();
    
    // Only allow dragging for single focus point mode
    // Zone mode focus points are fixed in position (only selection via click)
    if (state.mode === 'single' || this.dragPointId === -1) {
      state.updateSinglePoint(x, y);
      this.updateSinglePointPosition(x, y);
      
      window.dispatchEvent(new CustomEvent('focus:drag', { 
        detail: { pointId: this.dragPointId, x, y } 
      }));
    }
    // Zone points should not be draggable anymore - removed this branch
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isDragging) return;

    this.isDragging = false;
    useFocusStore.getState().setDragging(false);
    
    const draggingPoint = document.querySelector('.focus-point.dragging');
    if (draggingPoint) {
      draggingPoint.classList.remove('dragging');
    }

    const state = useFocusStore.getState();
    const pos = state.getActivePointPosition();
    
    window.dispatchEvent(new CustomEvent('focus:dragend', { 
      detail: { pointId: this.dragPointId, x: pos.x, y: pos.y } 
    }));

    this.dragPointId = null;
  }

  private handleViewportClick(e: MouseEvent) {
    console.log('[FocusController] Viewport clicked at:', e.clientX, e.clientY);
    
    // Get focus mode from store
    const focusState = useFocusStore.getState();
    const appState = useAppStore.getState();
    
    console.log('[FocusController] Current focus mode:', focusState.mode);
    
    // Only handle click-to-focus in single, zone, wide, or tracking modes
    if (focusState.mode === 'none') {
      console.log('[FocusController] Mode is none, skipping click-to-focus');
      return;
    }
    
    // Get the AutoFocusSystem from VirtualStudio
    const studio = (window as any).virtualStudio;
    if (!studio || !studio.getAutoFocusSystem) {
      console.log('[FocusController] AutoFocusSystem not available');
      return;
    }
    
    const autoFocusSystem = studio.getAutoFocusSystem();
    if (!autoFocusSystem) {
      console.log('[FocusController] AutoFocusSystem is null');
      return;
    }
    
    // Get click position relative to canvas
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Scale for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const adjustedX = screenX * dpr;
    const adjustedY = screenY * dpr;
    
    // Call AutoFocusSystem to focus at this point
    const success = autoFocusSystem.focusAtScreenPoint(adjustedX, adjustedY);
    
    if (success) {
      // Update the single focus point position in the UI overlay
      const normalizedX = screenX / rect.width;
      const normalizedY = screenY / rect.height;
      
      // Update store and visual indicator
      focusState.updateSinglePoint(normalizedX, normalizedY);
      this.updateSinglePointPosition(normalizedX, normalizedY);
      
      // Dispatch event for other listeners
      window.dispatchEvent(new CustomEvent('focus:click', {
        detail: { x: normalizedX, y: normalizedY, screenX: adjustedX, screenY: adjustedY }
      }));
    }
  }

  private handleModeChange() {
    const modes: FocusMode[] = ['zone', 'single', 'wide', 'tracking'];
    const state = useFocusStore.getState();
    const currentIndex = modes.indexOf(state.mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    state.setMode(nextMode);
  }

  private handleSafeAreaChange() {
    const modes: SafeAreaMode[] = ['none', 'action', 'title', 'both'];
    const state = useFocusStore.getState();
    const currentIndex = modes.indexOf(state.safeAreaMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    state.setSafeAreaMode(nextMode);
  }

  private handleGridToggle() {
    useFocusStore.getState().toggleGrid();
  }

  private handleCompositionChange() {
    useFocusStore.getState().cycleCompositionGuide();
  }

  private handleHelperGuideChange() {
    useFocusStore.getState().cycleHelperGuide();
  }

  private handleOverlayToggle() {
    useFocusStore.getState().toggleOverlay();
  }

  private updateOverlayVisibility(show: boolean) {
    const overlay = document.getElementById('viewfinderOverlay');
    const overlayBtn = document.querySelector('.vf-btn.overlay-toggle');
    
    if (overlay) {
      const children = overlay.querySelectorAll('.viewfinder-focus-grid, .single-focus-point, .viewfinder-center-crosshair, .safe-area-overlay, .third-grid-overlay, .viewfinder-mode-indicator, .viewfinder-info');
      children.forEach(child => {
        (child as HTMLElement).style.opacity = show ? '1' : '0';
        (child as HTMLElement).style.pointerEvents = show ? 'auto' : 'none';
      });
    }
    
    if (overlayBtn) {
      overlayBtn.classList.toggle('active', show);
    }
  }

  private updateModeDisplay(mode: FocusMode) {
    const focusGrid = document.getElementById('focusGrid');
    const singlePoint = document.getElementById('singleFocusPoint');
    const modeBtn = document.querySelector('.vf-btn.focus-mode');

    if (focusGrid) {
      focusGrid.classList.remove('zone-mode', 'single-mode', 'wide-mode', 'tracking-mode');
      focusGrid.classList.add(`${mode}-mode`);
      focusGrid.style.display = mode === 'zone' || mode === 'wide' ? 'grid' : 'none';
    }

    if (singlePoint) {
      singlePoint.style.display = mode === 'single' || mode === 'tracking' ? 'block' : 'none';
    }

    if (modeBtn) {
      modeBtn.setAttribute('data-mode', mode);
      modeBtn.setAttribute('title', this.getModeLabel(mode));
    }
  }

  private getModeLabel(mode: FocusMode): string {
    const labels: Record<FocusMode, string> = {
      none: 'Av',
      single: 'Enkeltpunkt fokus',
      zone: 'Sone fokus',
      wide: 'Bred fokus',
      tracking: 'Sporingsfokus'
    };
    return labels[mode];
  }

  private updateActivePointDisplay(pointId: number) {
    const focusPoints = document.querySelectorAll('.focus-point');
    focusPoints.forEach((point) => {
      const el = point as HTMLElement;
      const id = parseInt(el.dataset.point || '-1');
      el.classList.toggle('active', id === pointId);
    });
  }

  private updateSafeAreaDisplay(mode: SafeAreaMode) {
    const safeAreaOverlay = document.getElementById('safeAreaOverlay');
    const safeAreaBtn = document.querySelector('.vf-btn.safe-area');
    
    if (safeAreaOverlay) {
      safeAreaOverlay.classList.remove('mode-none', 'mode-action', 'mode-title', 'mode-both');
      safeAreaOverlay.classList.add(`mode-${mode}`);
      safeAreaOverlay.style.display = mode === 'none' ? 'none' : 'block';
      safeAreaOverlay.innerHTML = mode !== 'none' ? this.getSafeAreaSVG(mode) + this.getSafeAreaFeedbackHTML(mode) : '';
    }

    if (safeAreaBtn) {
      safeAreaBtn.classList.toggle('active', mode !== 'none');
    }
  }

  private getSafeAreaSVG(mode: SafeAreaMode): string {
    const actionColor = 'rgba(255, 200, 0, 0.7)';
    const titleColor = 'rgba(0, 200, 255, 0.7)';
    
    const glowFilter = `
      <defs>
        <filter id="safeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    `;

    let svg = `<svg width="100%" height="100%" class="safe-area-svg">${glowFilter}`;
    
    if (mode === 'action' || mode === 'both') {
      svg += `
        <rect x="5%" y="5%" width="90%" height="90%" fill="none" stroke="${actionColor}" stroke-width="2" stroke-dasharray="12,6" filter="url(#safeGlow)"/>
        <text x="5.5%" y="4%" fill="${actionColor}" font-size="11" opacity="0.9">ACTION SAFE (90%)</text>
        <circle cx="5%" cy="5%" r="4" fill="${actionColor}" filter="url(#safeGlow)"/>
        <circle cx="95%" cy="5%" r="4" fill="${actionColor}" filter="url(#safeGlow)"/>
        <circle cx="5%" cy="95%" r="4" fill="${actionColor}" filter="url(#safeGlow)"/>
        <circle cx="95%" cy="95%" r="4" fill="${actionColor}" filter="url(#safeGlow)"/>
      `;
    }
    
    if (mode === 'title' || mode === 'both') {
      svg += `
        <rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="${titleColor}" stroke-width="2" stroke-dasharray="8,4" filter="url(#safeGlow)"/>
        <text x="10.5%" y="9%" fill="${titleColor}" font-size="11" opacity="0.9">TITLE SAFE (80%)</text>
        <circle cx="10%" cy="10%" r="4" fill="${titleColor}" filter="url(#safeGlow)"/>
        <circle cx="90%" cy="10%" r="4" fill="${titleColor}" filter="url(#safeGlow)"/>
        <circle cx="10%" cy="90%" r="4" fill="${titleColor}" filter="url(#safeGlow)"/>
        <circle cx="90%" cy="90%" r="4" fill="${titleColor}" filter="url(#safeGlow)"/>
      `;
    }
    
    svg += '</svg>';
    return svg;
  }

  private calculateSafeAreaScore(mode: SafeAreaMode): { actionSafe: boolean; titleSafe: boolean; level: string; color: string; message: string; objectName: string | null } {
    const scene = useAppStore.getState().scene;
    const models = scene.filter(n => n.type === 'model');
    
    if (models.length === 0) {
      return { 
        actionSafe: true,
        titleSafe: true,
        level: 'Ingen objekt', 
        color: '#666666', 
        message: 'Legg til en modell for å sjekke sikkerhetssoner',
        objectName: null
      };
    }

    const model = models[0];
    const pos = model.transform.position;
    
    // Convert 3D position to approximate 2D viewport position
    const viewportX = 0.5 + (pos[0] / 10);
    const viewportY = 0.5 - (pos[1] / 6);
    
    // Check if within action safe (5% margins = 0.05 to 0.95)
    const actionSafe = viewportX >= 0.05 && viewportX <= 0.95 && viewportY >= 0.05 && viewportY <= 0.95;
    
    // Check if within title safe (10% margins = 0.10 to 0.90)
    const titleSafe = viewportX >= 0.10 && viewportX <= 0.90 && viewportY >= 0.10 && viewportY <= 0.90;

    let level: string;
    let color: string;
    let message: string;

    if (titleSafe) {
      level = 'Perfekt';
      color = '#00ff88';
      message = 'Objektet er trygt innenfor tittel-sonen. Ingen risiko for beskjæring.';
    } else if (actionSafe) {
      level = 'Godt nok';
      color = '#ffcc00';
      message = 'Objektet er innenfor action-sonen, men nær kanten. Tekst kan bli kuttet.';
    } else {
      level = 'Advarsel';
      color = '#ff4444';
      message = 'Objektet kan bli beskåret på enkelte skjermer! Flytt nærmere sentrum.';
    }

    return { actionSafe, titleSafe, level, color, message, objectName: model.name };
  }

  private getSafeAreaFeedbackHTML(mode: SafeAreaMode): string {
    const feedback = this.calculateSafeAreaScore(mode);
    
    const modeLabels: Record<SafeAreaMode, string> = {
      none: '',
      action: 'Action Safe (90%)',
      title: 'Title Safe (80%)',
      both: 'Begge soner'
    };

    const modeDescriptions: Record<SafeAreaMode, string> = {
      none: '',
      action: 'Innhold innenfor denne sonen vil være synlig på de fleste TV-er og monitorer.',
      title: 'Tekst og viktige elementer bør plasseres innenfor denne sonen for å unngå beskjæring.',
      both: 'Vis både action- og tittel-soner for maksimal trygghet.'
    };

    return `
      <div class="safe-area-feedback-panel">
        <div class="safe-area-feedback-header">
          <h4>${modeLabels[mode]}</h4>
          <div class="safe-area-score-badge" style="background: ${feedback.color}20; border-color: ${feedback.color}; color: ${feedback.color};">
            ${feedback.level}
          </div>
        </div>
        
        <p class="safe-area-description">${modeDescriptions[mode]}</p>
        
        <div class="safe-area-zones-status">
          ${mode === 'action' || mode === 'both' ? `
            <div class="zone-status-item ${feedback.actionSafe ? 'safe' : 'warning'}">
              <span class="zone-indicator" style="background: ${feedback.actionSafe ? '#00ff88' : '#ff4444'};"></span>
              <span class="zone-label">Action Safe (90%)</span>
              <span class="zone-status">${feedback.actionSafe ? '✓ OK' : '✗ Utenfor'}</span>
            </div>
          ` : ''}
          ${mode === 'title' || mode === 'both' ? `
            <div class="zone-status-item ${feedback.titleSafe ? 'safe' : 'warning'}">
              <span class="zone-indicator" style="background: ${feedback.titleSafe ? '#00ff88' : '#ff4444'};"></span>
              <span class="zone-label">Title Safe (80%)</span>
              <span class="zone-status">${feedback.titleSafe ? '✓ OK' : '✗ Utenfor'}</span>
            </div>
          ` : ''}
        </div>
        
        ${feedback.objectName ? `
          <div class="safe-area-object-info">
            <span class="object-icon">📍</span>
            <span class="object-name">${feedback.objectName}</span>
          </div>
        ` : ''}
        
        <div class="safe-area-message" style="border-left-color: ${feedback.color};">
          ${feedback.message}
        </div>
        
        <div class="safe-area-info">
          <div class="info-header">Bruksområder:</div>
          <ul>
            <li><span style="color: #ffc800;">Action Safe</span> - Viktig handling og bevegelse</li>
            <li><span style="color: #00c8ff;">Title Safe</span> - Tekst, logoer og grafikk</li>
            <li>Eldre TV-er kan kutte opptil 10% av bildet</li>
          </ul>
        </div>
      </div>
    `;
  }

  private updateGridDisplay(show: boolean) {
    const gridOverlay = document.getElementById('thirdGridOverlay');
    const gridBtn = document.querySelector('.vf-btn.grid-toggle');
    
    if (gridOverlay) {
      gridOverlay.style.display = show ? 'block' : 'none';
    }

    if (gridBtn) {
      gridBtn.classList.toggle('active', show);
    }
  }

  private updateCompositionGuide(guide: CompositionGuide) {
    const overlay = document.getElementById('compositionOverlay');
    const btn = document.querySelector('.vf-btn.composition-guide');
    
    if (overlay) {
      overlay.setAttribute('data-guide', guide);
      overlay.innerHTML = this.getCompositionSVG(guide) + (guide !== 'none' ? this.getCompositionFeedbackHTML(guide) : '');
    }

    if (btn) {
      btn.classList.toggle('active', guide !== 'none');
      btn.setAttribute('title', this.getGuideLabel(guide));
    }
  }

  private getCompositionPowerPoints(guide: CompositionGuide): { x: number; y: number }[] {
    const phi = 1.618;
    const pos1 = 1 / (1 + phi);
    const pos2 = phi / (1 + phi);
    
    switch (guide) {
      case 'thirds':
        return [
          { x: 0.3333, y: 0.3333 },
          { x: 0.6667, y: 0.3333 },
          { x: 0.3333, y: 0.6667 },
          { x: 0.6667, y: 0.6667 }
        ];
      case 'golden':
        return [
          { x: pos1, y: pos1 },
          { x: pos2, y: pos1 },
          { x: pos1, y: pos2 },
          { x: pos2, y: pos2 }
        ];
      case 'center':
        return [{ x: 0.5, y: 0.5 }];
      case 'spiral':
        return [{ x: 0.382, y: 0.382 }, { x: 0.618, y: 0.618 }];
      case 'triangle':
        return [{ x: 0.5, y: 0.5 }];
      case 'diagonal':
        return [{ x: 0.5, y: 0.5 }, { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }];
      case 'symmetry':
        return [{ x: 0.5, y: 0.5 }];
      default:
        return [];
    }
  }

  private calculateCompositionScore(guide: CompositionGuide): { score: number; level: string; color: string; message: string; objectName: string | null } {
    const scene = useAppStore.getState().scene;
    const models = scene.filter(n => n.type === 'model');
    
    if (models.length === 0) {
      return { 
        score: 0, 
        level: 'ingen', 
        color: '#666666', 
        message: 'Legg til en modell for å analysere komposisjon',
        objectName: null
      };
    }

    const powerPoints = this.getCompositionPowerPoints(guide);
    if (powerPoints.length === 0) {
      return { 
        score: 0, 
        level: 'ukjent', 
        color: '#666666', 
        message: 'Velg en komposisjonsguide',
        objectName: null
      };
    }

    // Get the first model's position (simplified - in real scenario would use screen projection)
    const model = models[0];
    const pos = model.transform.position;
    
    // Convert 3D position to approximate 2D viewport position (simplified)
    // In a real implementation, this would project through the camera
    const viewportX = 0.5 + (pos[0] / 10);  // Approximate mapping
    const viewportY = 0.5 - (pos[1] / 6);   // Approximate mapping
    
    // Find the closest power point
    let minDistance = Infinity;
    for (const point of powerPoints) {
      const dist = Math.sqrt(Math.pow(viewportX - point.x, 2) + Math.pow(viewportY - point.y, 2));
      minDistance = Math.min(minDistance, dist);
    }

    // Convert distance to score (0-100)
    // 0 distance = 100 score, 0.5 distance = 0 score
    const score = Math.max(0, Math.min(100, (1 - minDistance * 2) * 100));

    let level: string;
    let color: string;
    let message: string;

    if (score >= 90) {
      level = 'Perfekt';
      color = '#00ff88';
      message = 'Objektet er perfekt plassert på kraftpunktet!';
    } else if (score >= 70) {
      level = 'Meget bra';
      color = '#88ff00';
      message = 'God plassering nær kraftpunktet';
    } else if (score >= 50) {
      level = 'Godt nok';
      color = '#ffcc00';
      message = 'Akseptabel plassering, kan forbedres';
    } else if (score >= 25) {
      level = 'Svak';
      color = '#ff8800';
      message = 'Flytt objektet nærmere kraftpunktet';
    } else {
      level = 'Dårlig';
      color = '#ff4444';
      message = 'Objektet er langt fra ideell plassering';
    }

    return { score, level, color, message, objectName: model.name };
  }

  private getCompositionFeedbackHTML(guide: CompositionGuide): string {
    const feedback = this.calculateCompositionScore(guide);
    const powerPoints = this.getCompositionPowerPoints(guide);
    
    const guideDescriptions: Record<CompositionGuide, string> = {
      none: '',
      thirds: 'Plasser hovedmotivet på ett av de fire skjæringspunktene',
      golden: 'Det gyldne snitt gir naturlig balansert komposisjon',
      spiral: 'Led blikket langs spiralen mot fokuspunktet',
      diagonal: 'Bruk diagonaler for dynamikk og bevegelse',
      center: 'Senterkomposisjon for symmetri og kraftfulle portretter',
      triangle: 'Trekantformasjon skaper stabilitet',
      symmetry: 'Dynamisk symmetri for klassisk harmoni'
    };

    const scoreBarWidth = Math.max(5, feedback.score);
    
    return `
      <div class="composition-feedback-panel">
        <div class="composition-feedback-header">
          <h4>${this.getGuideLabel(guide)}</h4>
          <div class="composition-score-badge" style="background: ${feedback.color}20; border-color: ${feedback.color}; color: ${feedback.color};">
            ${feedback.level}
          </div>
        </div>
        
        <p class="composition-description">${guideDescriptions[guide]}</p>
        
        <div class="composition-score-container">
          <div class="composition-score-bar-bg">
            <div class="composition-score-bar" style="width: ${scoreBarWidth}%; background: linear-gradient(90deg, ${feedback.color} 0%, ${feedback.color}88 100%);"></div>
          </div>
          <div class="composition-score-labels">
            <span class="score-label-bad">Dårlig</span>
            <span class="score-label-ok">Godt nok</span>
            <span class="score-label-good">Meget bra</span>
            <span class="score-label-perfect">Perfekt</span>
          </div>
        </div>
        
        ${feedback.objectName ? `
          <div class="composition-object-info">
            <span class="object-icon">📍</span>
            <span class="object-name">${feedback.objectName}</span>
          </div>
        ` : ''}
        
        <div class="composition-message" style="border-left-color: ${feedback.color};">
          ${feedback.message}
        </div>
        
        <div class="composition-tips">
          <div class="tip-header">Tips:</div>
          <ul>
            <li>Flytt modellen for å endre komposisjon</li>
            <li>Kraftpunktene markeres med prikker</li>
            <li>Se på historigrammet for eksponering</li>
          </ul>
        </div>
      </div>
    `;
  }

  private getGuideLabel(guide: CompositionGuide): string {
    const labels: Record<CompositionGuide, string> = {
      none: 'Komposisjonsguide',
      thirds: 'Tredjedelsregelen',
      golden: 'Gyllent snitt',
      spiral: 'Fibonacci-spiral',
      diagonal: 'Diagonaler',
      center: 'Senter-kryss',
      triangle: 'Gyldne trekanter',
      symmetry: 'Dynamisk symmetri'
    };
    return labels[guide];
  }

  private getCompositionSVG(guide: CompositionGuide): string {
    const lineColor = 'rgba(0, 255, 136, 0.7)';
    const glowColor = 'rgba(0, 255, 136, 0.3)';
    const pointColor = '#00ff88';
    const phi = 1.618;
    const pos1 = (1 / (1 + phi)) * 100;
    const pos2 = (phi / (1 + phi)) * 100;

    const glowFilter = `
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    `;

    const powerPointStyle = `fill="${pointColor}" filter="url(#glowStrong)"`;

    switch (guide) {
      case 'thirds':
        return `<svg width="100%" height="100%" class="composition-svg">
          ${glowFilter}
          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="66.67%" y1="0" x2="66.67%" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="0" y1="66.67%" x2="100%" y2="66.67%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <circle cx="33.33%" cy="33.33%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx="66.67%" cy="33.33%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx="33.33%" cy="66.67%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx="66.67%" cy="66.67%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
        </svg>`;
      case 'golden':
        return `<svg width="100%" height="100%" class="composition-svg">
          ${glowFilter}
          <line x1="${pos1}%" y1="0" x2="${pos1}%" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="${pos2}%" y1="0" x2="${pos2}%" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="0" y1="${pos1}%" x2="100%" y2="${pos1}%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="0" y1="${pos2}%" x2="100%" y2="${pos2}%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <circle cx="${pos1}%" cy="${pos1}%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx="${pos2}%" cy="${pos1}%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx="${pos1}%" cy="${pos2}%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx="${pos2}%" cy="${pos2}%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
          <text x="5" y="20" fill="${lineColor}" font-size="11" opacity="0.8">φ = 1.618</text>
        </svg>`;
      case 'spiral':
        return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" class="composition-svg">
          ${glowFilter}
          <rect x="0" y="0" width="61.8" height="100" fill="none" stroke="${glowColor}" stroke-width="0.8"/>
          <rect x="61.8" y="0" width="38.2" height="61.8" fill="none" stroke="${glowColor}" stroke-width="0.8"/>
          <rect x="61.8" y="61.8" width="23.6" height="38.2" fill="none" stroke="${glowColor}" stroke-width="0.8"/>
          <rect x="85.4" y="61.8" width="14.6" height="23.6" fill="none" stroke="${glowColor}" stroke-width="0.8"/>
          <path d="M 100 100 Q 100 61.8, 61.8 61.8 Q 38.2 61.8, 38.2 38.2 Q 38.2 23.6, 52.8 23.6 Q 61.8 23.6, 61.8 32.6 Q 61.8 38.2, 56.2 38.2" fill="none" stroke="${pointColor}" stroke-width="3" filter="url(#glow)"/>
          <circle cx="38.2" cy="38.2" r="1.5" ${powerPointStyle}/>
        </svg>`;
      case 'diagonal':
        return `<svg width="100%" height="100%" class="composition-svg">
          ${glowFilter}
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="0" y1="0" x2="50%" y2="100%" stroke="${glowColor}" stroke-width="1" stroke-dasharray="6,4"/>
          <line x1="50%" y1="0" x2="100%" y2="100%" stroke="${glowColor}" stroke-width="1" stroke-dasharray="6,4"/>
          <line x1="0" y1="0" x2="100%" y2="50%" stroke="${glowColor}" stroke-width="1" stroke-dasharray="6,4"/>
          <line x1="0" y1="50%" x2="100%" y2="100%" stroke="${glowColor}" stroke-width="1" stroke-dasharray="6,4"/>
          <circle cx="50%" cy="50%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
        </svg>`;
      case 'center':
        return `<svg width="100%" height="100%" class="composition-svg">
          ${glowFilter}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="${lineColor}" stroke-width="2" stroke-dasharray="12,6" filter="url(#glow)"/>
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="${lineColor}" stroke-width="2" stroke-dasharray="12,6" filter="url(#glow)"/>
          <circle cx="50%" cy="50%" r="20" fill="none" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"><animate attributeName="r" values="18;24;18" dur="3s" repeatCount="indefinite"/></circle>
          <circle cx="50%" cy="50%" r="8" ${powerPointStyle}/>
          <text x="52%" y="47%" fill="${lineColor}" font-size="11" opacity="0.8">Sentrum</text>
        </svg>`;
      case 'triangle':
        return `<svg width="100%" height="100%" class="composition-svg">
          ${glowFilter}
          <line x1="0" y1="100%" x2="100%" y2="0" stroke="${lineColor}" stroke-width="2.5" filter="url(#glow)"/>
          <line x1="0" y1="0" x2="50%" y2="50%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="100%" y1="100%" x2="50%" y2="50%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <circle cx="50%" cy="50%" r="10" ${powerPointStyle}><animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/></circle>
        </svg>`;
      case 'symmetry':
        return `<svg width="100%" height="100%" class="composition-svg">
          ${glowFilter}
          <line x1="0" y1="0" x2="70.7%" y2="100%" stroke="${glowColor}" stroke-width="1.5"/>
          <line x1="29.3%" y1="0" x2="100%" y2="100%" stroke="${glowColor}" stroke-width="1.5"/>
          <line x1="0" y1="0" x2="100%" y2="70.7%" stroke="${glowColor}" stroke-width="1.5"/>
          <line x1="0" y1="29.3%" x2="100%" y2="100%" stroke="${glowColor}" stroke-width="1.5"/>
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="${lineColor}" stroke-width="2" filter="url(#glow)"/>
          <circle cx="50%" cy="50%" r="8" ${powerPointStyle}><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle>
        </svg>`;
      default:
        return '';
    }
  }

  private debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return ((...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  private updateHelperGuide(guide: HelperGuide) {
    const overlay = document.getElementById('helperGuideOverlay');
    const btn = document.querySelector('.vf-btn.helper-guide');
    
    if (overlay) {
      const currentGuide = overlay.getAttribute('data-guide');
      const html = this.getHelperGuideHTML(guide);
      
      // Only update if guide changed or content changed (for lighting guide updates)
      const contentChanged = overlay.innerHTML !== html;
      const guideChanged = currentGuide !== guide;
      
      if (guideChanged || (guide === 'lighting' && contentChanged)) {
        overlay.setAttribute('data-guide', guide);
        
        // Use requestAnimationFrame for smooth update without blinking
        requestAnimationFrame(() => {
          // Double check content hasn't changed during RAF
          const newHtml = this.getHelperGuideHTML(guide);
          if (overlay.innerHTML !== newHtml) {
            overlay.innerHTML = newHtml;
          }
          
          // Show/hide overlay based on guide
          if (guide === 'none') {
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
          } else {
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
          }
        });
      }
    }

    if (btn) {
      btn.classList.toggle('active', guide !== 'none');
      btn.setAttribute('title', this.getHelperGuideLabel(guide));
    }
  }

  private getHelperGuideLabel(guide: HelperGuide): string {
    const labels: Record<HelperGuide, string> = {
      none: 'Hjelpeguider',
      colortemp: 'Fargetemperatur',
      exposure: 'Eksponeringssoner',
      height: 'Høydereferanser',
      glasses: 'Brillerefleksjoner',
      classphoto: 'Klassefoto',
      safety: 'Sikkerhetssoner',
      lighting: 'Lysoppsett (vinkler)'
    };
    return labels[guide];
  }

  private getSceneLights(): { name: string; cct: number }[] {
    const scene = useAppStore.getState().scene;
    return scene
      .filter(node => node.type === 'light')
      .map(node => ({
        name: node.name,
        cct: (node.userData?.cct as number) || 5500
      }));
  }

  private cctToColor(cct: number): string {
    if (cct < 2000) return '#ff7700';
    if (cct < 3000) return '#ff9329';
    if (cct < 4000) return '#ffb46b';
    if (cct < 5000) return '#ffdfc7';
    if (cct < 6000) return '#ffffff';
    if (cct < 7000) return '#e6f0ff';
    if (cct < 8000) return '#cce0ff';
    return '#99c2ff';
  }

  private cctToPosition(cct: number): number {
    // Map 1800K-10000K to 0-100%
    return Math.max(0, Math.min(100, ((cct - 1800) / (10000 - 1800)) * 100));
  }

  private getCameraExposureData(): {
    aperture: number;
    shutter: string;
    iso: number;
    cameraEV: number;
    sceneLux: number;
    sceneEV: number;
    subjectLux: number;
    subjectEV: number;
    sceneExposure: { status: string; evDiff: number; color: string };
    subjectExposure: { status: string; evDiff: number; color: string };
    subjectZone: number;
  } {
    // Get camera settings from window.virtualStudio
    const studio = (window as any).virtualStudio;
    const settings = studio?.cameraSettings || {
      aperture: 2.8,
      shutter: '1/125',
      iso: 100,
      nd: 0
    };

    // Parse shutter speed
    const shutterMatch = settings.shutter.match(/1\/(\d+)/);
    const shutterSpeed = shutterMatch ? parseInt(shutterMatch[1]) : 125;

    // Calculate camera EV: EV = log2(aperture² × shutter_speed / ISO)
    const cameraEV = Math.log2((settings.aperture * settings.aperture) * shutterSpeed / settings.iso) - (settings.nd || 0);

    // Get light data from studio
    let { sceneLux, subjectLux } = this.calculateSceneLighting(studio);

    // Adjust for atmosphere (fog, ambient)
    const atmosphere = studio?.atmosphereSettings || (studio?.scene ? {
      fogEnabled: studio.scene.fogMode !== 0,
      fogDensity: studio.scene.fogDensity || 0,
      ambientIntensity: 0.5,
    } : null);

    if (atmosphere) {
      // Fog reduces effective light
      if (atmosphere.fogEnabled && atmosphere.fogDensity) {
        const fogAttenuation = Math.exp(-atmosphere.fogDensity * 5);
        sceneLux *= fogAttenuation;
        subjectLux *= fogAttenuation;
      }
      
      // Ambient intensity affects overall scene brightness
      if (atmosphere.ambientIntensity !== undefined) {
        sceneLux *= atmosphere.ambientIntensity;
        subjectLux *= atmosphere.ambientIntensity;
      }
    }

    // Convert lux to EV (at ISO 100, 2.5 lux = EV 0)
    // EV = log2(lux / 2.5)
    const sceneEV = sceneLux > 0 ? Math.log2(sceneLux / 2.5) : 0;
    const subjectEV = subjectLux > 0 ? Math.log2(subjectLux / 2.5) : 0;

    // Calculate exposure difference
    // Positive = overexposed, negative = underexposed
    const sceneEvDiff = Math.round((cameraEV - sceneEV) * 10) / 10;
    const subjectEvDiff = Math.round((cameraEV - subjectEV) * 10) / 10;

    // Get status and color for exposures
    const getExposureStatus = (evDiff: number): { status: string; color: string } => {
      if (Math.abs(evDiff) < 0.5) return { status: 'Optimal', color: '#00ff88' };
      if (evDiff > 2) return { status: 'Kraftig overeksponert', color: '#ff4444' };
      if (evDiff > 1) return { status: 'Overeksponert', color: '#ff8844' };
      if (evDiff > 0) return { status: 'Litt lyst', color: '#ffcc00' };
      if (evDiff < -2) return { status: 'Kraftig undereksponert', color: '#ff4444' };
      if (evDiff < -1) return { status: 'Undereksponert', color: '#ff8844' };
      return { status: 'Litt mørkt', color: '#ffcc00' };
    };

    // Determine zone based on subject light level
    // Zone V (18% gray) corresponds to about 160 lux at ISO 100, f/8, 1/125s
    let subjectZone = 5;
    if (subjectLux < 5) subjectZone = 0;
    else if (subjectLux < 20) subjectZone = 2;
    else if (subjectLux < 80) subjectZone = 4;
    else if (subjectLux < 200) subjectZone = 5;
    else if (subjectLux < 500) subjectZone = 6;
    else if (subjectLux < 2000) subjectZone = 8;
    else subjectZone = 10;

    return {
      aperture: settings.aperture,
      shutter: settings.shutter,
      iso: settings.iso,
      cameraEV: Math.round(cameraEV * 10) / 10,
      sceneLux: Math.round(sceneLux),
      sceneEV: Math.round(sceneEV * 10) / 10,
      subjectLux: Math.round(subjectLux),
      subjectEV: Math.round(subjectEV * 10) / 10,
      sceneExposure: { ...getExposureStatus(sceneEvDiff), evDiff: sceneEvDiff },
      subjectExposure: { ...getExposureStatus(subjectEvDiff), evDiff: subjectEvDiff },
      subjectZone
    };
  }

  private calculateSceneLighting(studio: any): { sceneLux: number; subjectLux: number } {
    if (!studio?.lights) {
      return { sceneLux: 0, subjectLux: 0 };
    }

    let totalSceneLux = 0;
    let totalSubjectLux = 0;

    // Subject position (default to center of scene at chest height)
    const subjectPos = { x: 0, y: 1.2, z: 0 };

    // Get selected actor position if available
    const scene = useAppStore.getState().scene;
    const selectedId = useAppStore.getState().selectedNodeId;
    const selectedActor = scene.find(n => n.id === selectedId && n.type === 'model');
    if (selectedActor?.transform?.position) {
      subjectPos.x = selectedActor.transform.position[0];
      subjectPos.y = selectedActor.transform.position[1] + 1.2; // Chest height
      subjectPos.z = selectedActor.transform.position[2];
    }

    // Iterate through lights
    for (const [, lightData] of studio.lights) {
      const lightPos = lightData.mesh?.position;
      if (!lightPos) continue;

      const intensity = lightData.intensity || lightData.light?.intensity || 1;

      // Scene lux: average across studio (approximate with light at 3m distance)
      const sceneDistance = 3;

      // Subject lux: actual distance to subject
      const dx = lightPos.x - subjectPos.x;
      const dy = lightPos.y - subjectPos.y;
      const dz = lightPos.z - subjectPos.z;
      const subjectDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      // Get lux values based on light specs
      if (lightData.specs?.lux1m) {
        // Use spec: lux at 1m, then inverse square law
        totalSceneLux += lightData.specs.lux1m / (sceneDistance * sceneDistance);
        totalSubjectLux += lightData.specs.lux1m / Math.max(0.5, subjectDistance * subjectDistance);
      } else if (lightData.specs?.lumens) {
        // Convert lumens to lux (assuming point source)
        const baseLux = lightData.specs.lumens / (4 * Math.PI);
        totalSceneLux += baseLux / (sceneDistance * sceneDistance);
        totalSubjectLux += baseLux / Math.max(0.5, subjectDistance * subjectDistance);
      } else {
        // Estimate based on intensity (assume 1000 lux at 1m for intensity 1)
        const baseLux = intensity * 1000;
        totalSceneLux += baseLux / (sceneDistance * sceneDistance);
        totalSubjectLux += baseLux / Math.max(0.5, subjectDistance * subjectDistance);
      }
    }

    // Calculate bounce light from walls
    const environmentWalls = studio?.environmentWalls || 
      (studio?.scene ? studio.scene.meshes.filter((m: any) => 
        m.metadata?.type === 'wall' || m.metadata?.type === 'environment_wall' ||
        m.name === 'backWall' || m.name === 'leftWall' || m.name === 'rightWall' || m.name === 'rearWall'
      ) : []);

    if (environmentWalls && environmentWalls.length > 0) {
      environmentWalls.forEach((wall: any) => {
        const wallMat = wall.material;
        if (!wallMat) return;
        
        // Get wall reflectivity based on material
        const reflectivity = (wallMat as any).specularColor?.r || 
                           (wallMat as any).metallic || 
                           0.1; // Default reflectivity
        
        // For each light, calculate bounce
        for (const [, lightData] of studio.lights) {
          const lightPos = lightData.mesh?.position;
          if (!lightPos) continue;
          
          // Distance from light to wall
          const wallCenter = wall.position || { x: 0, y: 4, z: 0 };
          const lightToWall = Math.sqrt(
            Math.pow(wallCenter.x - lightPos.x, 2) +
            Math.pow(wallCenter.y - lightPos.y, 2) +
            Math.pow(wallCenter.z - lightPos.z, 2)
          );
          
          // Distance from wall to subject
          const wallToSubject = Math.sqrt(
            Math.pow(wallCenter.x - subjectPos.x, 2) +
            Math.pow(wallCenter.y - subjectPos.y, 2) +
            Math.pow(wallCenter.z - subjectPos.z, 2)
          );
          
          // Bounce contribution (inverse square law × 2)
          const lightIntensity = lightData.intensity || lightData.light?.intensity || 1;
          const baseLux = lightData.specs?.lux1m || lightIntensity * 1000;
          const bounceIntensity = (baseLux * reflectivity) / 
                                  Math.max(0.1, (lightToWall * lightToWall + wallToSubject * wallToSubject));
          
          totalSubjectLux += bounceIntensity * 0.5; // Bounce is typically 50% of direct light
        }
      });
    }

    return {
      sceneLux: totalSceneLux,
      subjectLux: totalSubjectLux
    };
  }

  private getHelperGuideHTML(guide: HelperGuide): string {
    const sceneLights = this.getSceneLights();
    const hasLights = sceneLights.length > 0;
    
    switch (guide) {
      case 'colortemp':
        const lightsMarkersHTML = sceneLights.map((light, i) => 
          `<div class="color-temp-marker" style="left: ${this.cctToPosition(light.cct)}%; background: linear-gradient(180deg, ${this.cctToColor(light.cct)} 0%, #00e5ff 100%);" title="${light.name}: ${light.cct}K"></div>`
        ).join('');
        
        const sceneLightsListHTML = hasLights ? `
          <div class="scene-lights-list">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span class="scene-info-badge"><span class="live-dot"></span>Scene lys</span>
            </div>
            ${sceneLights.map(light => `
              <div class="scene-light-item">
                <span class="scene-light-name">${light.name}</span>
                <span class="scene-light-cct" style="background: ${this.cctToColor(light.cct)}20; color: ${this.cctToColor(light.cct)};">${light.cct}K</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="scene-lights-list">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="scene-info-badge"><span class="live-dot"></span>Ingen lys i scenen</span>
            </div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 10px;">Legg til lys fra Lys-panelet for å se verdier her.</p>
          </div>
        `;
        
        return `
          <div class="helper-guide-panel bottom-left">
            <h4>Fargetemperatur (K)</h4>
            <div class="color-temp-scale">
              <div class="color-temp-bar">
                ${hasLights ? lightsMarkersHTML : '<div class="color-temp-marker" style="left: 55%"></div>'}
              </div>
              <div class="color-temp-labels">
                <span>1800K</span>
                <span>5500K</span>
                <span>10000K</span>
              </div>
              <div style="margin-top: 14px;">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <span style="color: #ff9329; font-size: 14px;">Stearinlys</span>
                  <span style="font-size: 14px; font-family: monospace;">1800K</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <span style="color: #ffb46b; font-size: 14px;">Glødelampe</span>
                  <span style="font-size: 14px; font-family: monospace;">2700K</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <span style="color: #ffffff; font-size: 14px;">Dagslys</span>
                  <span style="font-size: 14px; font-family: monospace;">5500K</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                  <span style="color: #cce0ff; font-size: 14px;">Skygge</span>
                  <span style="font-size: 14px; font-family: monospace;">7500K</span>
                </div>
              </div>
            </div>
            ${sceneLightsListHTML}
          </div>
        `;
      case 'exposure':
        const cameraData = this.getCameraExposureData();
        const hasLightsInScene = cameraData.sceneLux > 0;

        // Format EV difference display
        const formatEvDiff = (evDiff: number) => {
          if (evDiff === 0) return '±0';
          return evDiff > 0 ? `+${evDiff.toFixed(1)}` : evDiff.toFixed(1);
        };

        return `
          <div class="helper-guide-panel bottom-left" style="max-width: 420px;">
            <h4>Eksponeringsanalyse</h4>

            <!-- Camera Settings Row -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span class="scene-info-badge"><span class="live-dot"></span>Kamera</span>
              <span style="font-size: 14px; font-family: 'JetBrains Mono', monospace; color: #00e5ff;">
                f/${cameraData.aperture} · ${cameraData.shutter} · ISO ${cameraData.iso}
              </span>
              <span style="font-size: 12px; color: rgba(255,255,255,0.5); margin-left: auto;">
                EV ${cameraData.cameraEV}
              </span>
            </div>

            <!-- Scene vs Subject Exposure -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">

              <!-- Scene Exposure -->
              <div style="background: rgba(100,150,255,0.1); border: 1px solid rgba(100,150,255,0.3); border-radius: 10px; padding: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                  <span style="font-size: 16px;">🎬</span>
                  <span style="font-size: 12px; font-weight: 600; color: #88aaff;">SCENE</span>
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Generell lysstyrke</div>
                ${hasLightsInScene ? `
                  <div style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px;">${cameraData.sceneLux} lux</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.6);">EV ${cameraData.sceneEV}</div>
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Eksponering</div>
                    <div style="font-size: 13px; font-weight: 600; color: ${cameraData.sceneExposure.color};">
                      ${formatEvDiff(cameraData.sceneExposure.evDiff)} EV
                    </div>
                    <div style="font-size: 11px; color: ${cameraData.sceneExposure.color};">
                      ${cameraData.sceneExposure.status}
                    </div>
                  </div>
                ` : `
                  <div style="font-size: 13px; color: rgba(255,255,255,0.4); font-style: italic;">Ingen lys i scenen</div>
                `}
              </div>

              <!-- Subject Exposure -->
              <div style="background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); border-radius: 10px; padding: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                  <span style="font-size: 16px;">👤</span>
                  <span style="font-size: 12px; font-weight: 600; color: #00ff88;">SUBJEKT</span>
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Lys på motiv</div>
                ${hasLightsInScene ? `
                  <div style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px;">${cameraData.subjectLux} lux</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.6);">EV ${cameraData.subjectEV}</div>
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Eksponering</div>
                    <div style="font-size: 13px; font-weight: 600; color: ${cameraData.subjectExposure.color};">
                      ${formatEvDiff(cameraData.subjectExposure.evDiff)} EV
                    </div>
                    <div style="font-size: 11px; color: ${cameraData.subjectExposure.color};">
                      ${cameraData.subjectExposure.status}
                    </div>
                  </div>
                ` : `
                  <div style="font-size: 13px; color: rgba(255,255,255,0.4); font-style: italic;">Plasser lys i scenen</div>
                `}
              </div>
            </div>

            <!-- Zone System (based on subject) -->
            <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
                Subjekt Zone System (basert på lys som treffer motivet)
              </div>
              <div class="exposure-zones" style="font-size: 12px;">
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 0 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #000; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone 0 - Sort</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">&lt;5 lux</span>
                </div>
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 2 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #333; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone II - Skygge</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">5-20 lux</span>
                </div>
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 4 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #555; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone IV - Mørk</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">20-80 lux</span>
                </div>
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 5 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #808080; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone V - 18% grå</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">80-200 lux</span>
                </div>
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 6 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #999; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone VI - Hudtone</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">200-500 lux</span>
                </div>
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 8 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #ccc; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone VIII - Lyst</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">500-2000 lux</span>
                </div>
                <div class="exposure-zone" style="padding: 6px 10px; ${cameraData.subjectZone === 10 ? 'background: rgba(0,229,255,0.15); border-color: rgba(0,229,255,0.4);' : ''}">
                  <div class="exposure-zone-box" style="background: #fff; width: 28px; height: 18px;"></div>
                  <span class="exposure-zone-label" style="font-size: 12px;">Sone X - Hvit</span>
                  <span class="exposure-zone-ev" style="font-size: 11px;">&gt;2000 lux</span>
                </div>
              </div>
            </div>
          </div>
        `;
      case 'height':
        return `
          <div class="height-markers">
            <div class="height-marker" style="bottom: 0%; color: #88ccff;">
              <div class="height-line"></div>
              <span class="height-label">Barn 6 år - 110cm</span>
            </div>
            <div class="height-marker" style="bottom: 9%; color: #ffcc00;">
              <div class="height-line"></div>
              <span class="height-label">Sittende - 120cm</span>
            </div>
            <div class="height-marker" style="bottom: 36%; color: #88ff88;">
              <div class="height-line"></div>
              <span class="height-label">Tenåring - 150cm</span>
            </div>
            <div class="height-marker" style="bottom: 55%; color: #00ff88;">
              <div class="height-line"></div>
              <span class="height-label">Gjennomsnitt - 170cm</span>
            </div>
            <div class="height-marker" style="bottom: 68%; color: #ff8888;">
              <div class="height-line"></div>
              <span class="height-label">Høy - 185cm</span>
            </div>
          </div>
          <div class="helper-guide-panel bottom-right">
            <h4>Kamerahøyder</h4>
            <div style="font-size: 10px; color: #888;">
              <div style="margin-bottom: 4px;"><span style="color: #ff6600;">Lav vinkel</span> - 50cm</div>
              <div style="margin-bottom: 4px;"><span style="color: #ffcc00;">Øyehøyde sit</span> - 120cm</div>
              <div style="margin-bottom: 4px;"><span style="color: #00ff88;">Øyehøyde stå</span> - 160cm</div>
              <div><span style="color: #8888ff;">Høy vinkel</span> - 200cm</div>
            </div>
          </div>
        `;
      case 'glasses':
        return `
          <div class="helper-guide-panel bottom-left">
            <h4>Unngå Brillerefleksjoner</h4>
            <div class="glasses-tips">
              <div class="glasses-tip">
                <div class="glasses-tip-icon">1</div>
                <div class="glasses-tip-text">Hev hovedlyset over øyehøyde for å unngå direkte refleksjon</div>
              </div>
              <div class="glasses-tip">
                <div class="glasses-tip-icon">2</div>
                <div class="glasses-tip-text">Be modellen vippe haken lett ned for å endre refleksjonsvinkelen</div>
              </div>
              <div class="glasses-tip">
                <div class="glasses-tip-icon">3</div>
                <div class="glasses-tip-text">Flytt lyset 45 grader til siden av kameraaksen</div>
              </div>
              <div class="glasses-tip">
                <div class="glasses-tip-icon">4</div>
                <div class="glasses-tip-text">Bruk store, myke lyskilder for å minimere skarpe refleksjoner</div>
              </div>
            </div>
          </div>
          <svg width="100%" height="100%">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,200,0,0.7)" />
              </marker>
            </defs>
            <line x1="30%" y1="25%" x2="50%" y2="40%" stroke="rgba(255,200,0,0.5)" stroke-width="2" stroke-dasharray="8,4" marker-end="url(#arrowhead)"/>
            <text x="25%" y="22%" fill="rgba(255,200,0,0.8)" font-size="11">Hovedlys</text>
            <ellipse cx="50%" cy="42%" rx="8%" ry="4%" fill="none" stroke="rgba(0,255,136,0.4)" stroke-width="1" stroke-dasharray="4,4"/>
            <text x="52%" y="38%" fill="rgba(0,255,136,0.6)" font-size="10">Trygg sone</text>
          </svg>
        `;
      case 'classphoto':
        return `
          <div class="helper-guide-panel bottom-left">
            <h4>Klassefoto Guide</h4>
            <div class="classphoto-guides">
              <div class="classphoto-row">
                <div class="classphoto-icon" style="background: rgba(0,255,136,0.2); color: #00ff88;">H</div>
                <span>Hodejustering - Hold hodene i linje per rad</span>
              </div>
              <div class="classphoto-row">
                <div class="classphoto-icon" style="background: rgba(68,136,255,0.2); color: #4488ff;">S</div>
                <span>Avstand - 40-60cm mellom personer</span>
              </div>
              <div class="classphoto-row">
                <div class="classphoto-icon" style="background: rgba(255,255,0,0.2); color: #ffff00;">K</div>
                <span>Kamera FOV - Sjekk kantbeskjæring</span>
              </div>
              <div class="classphoto-row">
                <div class="classphoto-icon" style="background: rgba(255,68,68,0.2); color: #ff4444;">!</div>
                <span>Kantadvarsel - Unngå avkutting</span>
              </div>
            </div>
          </div>
          <svg width="100%" height="100%">
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="8,4"/>
            <line x1="0" y1="30%" x2="100%" y2="30%" stroke="rgba(0,255,136,0.4)" stroke-width="1" stroke-dasharray="4,4"/>
            <line x1="0" y1="55%" x2="100%" y2="55%" stroke="rgba(0,255,136,0.4)" stroke-width="1" stroke-dasharray="4,4"/>
            <line x1="0" y1="80%" x2="100%" y2="80%" stroke="rgba(0,255,136,0.4)" stroke-width="1" stroke-dasharray="4,4"/>
            <text x="52%" y="28%" fill="rgba(0,255,136,0.6)" font-size="10">Rad 1 - Høyde</text>
            <text x="52%" y="53%" fill="rgba(0,255,136,0.6)" font-size="10">Rad 2 - Høyde</text>
            <text x="52%" y="78%" fill="rgba(0,255,136,0.6)" font-size="10">Rad 3 - Høyde</text>
            <rect x="2%" y="2%" width="96%" height="96%" fill="none" stroke="rgba(255,68,68,0.3)" stroke-width="2" stroke-dasharray="8,4"/>
          </svg>
        `;
      case 'safety':
        return `
          <div class="helper-guide-panel bottom-left">
            <h4>Sikkerhetssoner</h4>
            <div class="safety-zones">
              <div class="safety-zone-item">
                <div class="safety-zone-color" style="color: #ff4444; background: rgba(255,68,68,0.2);"></div>
                <span>Varmt lys varsling (>500W)</span>
              </div>
              <div class="safety-zone-item">
                <div class="safety-zone-color" style="color: #ff8800; background: rgba(255,136,0,0.2);"></div>
                <span>C-stativ klarering (1.0m)</span>
              </div>
              <div class="safety-zone-item">
                <div class="safety-zone-color" style="color: #ffcc00; background: rgba(255,204,0,0.2);"></div>
                <span>Lysstativ klarering (0.6m)</span>
              </div>
              <div class="safety-zone-item">
                <div class="safety-zone-color" style="color: #88ff88; background: rgba(136,255,136,0.2);"></div>
                <span>Bevegelsessone (trygt)</span>
              </div>
            </div>
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 10px; color: #888;">
                <div style="margin-bottom: 4px;">Kabelruter vises på gulvet</div>
                <div>Hold 1m klaring rundt bommer</div>
              </div>
            </div>
          </div>
          <svg width="100%" height="100%">
            <circle cx="25%" cy="70%" r="8%" fill="none" stroke="rgba(255,136,0,0.5)" stroke-width="2" stroke-dasharray="6,4"/>
            <text x="25%" y="70%" fill="rgba(255,136,0,0.8)" font-size="10" text-anchor="middle" dominant-baseline="middle">C</text>
            <circle cx="75%" cy="65%" r="6%" fill="none" stroke="rgba(255,204,0,0.5)" stroke-width="2" stroke-dasharray="6,4"/>
            <text x="75%" y="65%" fill="rgba(255,204,0,0.8)" font-size="10" text-anchor="middle" dominant-baseline="middle">L</text>
            <circle cx="50%" cy="50%" r="15%" fill="rgba(136,255,136,0.1)" stroke="rgba(136,255,136,0.4)" stroke-width="1"/>
            <text x="50%" y="50%" fill="rgba(136,255,136,0.8)" font-size="11" text-anchor="middle" dominant-baseline="middle">Bevegelsessone</text>
          </svg>
        `;
      case 'lighting':
        // Get light positions and calculate angles
        const studio = (window as any).virtualStudio;
        if (!studio || !studio.lights) {
          return `
            <div class="helper-guide-panel bottom-left" style="max-width: 400px;">
              <h4>Lysoppsett (vinkler)</h4>
              <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">
                <p style="font-size: 13px; margin-bottom: 8px;">Virtual Studio ikke tilgjengelig</p>
              </div>
            </div>
          `;
        }
        
        // Get lights from studio, filter out lights without mesh/position
        const lights = Array.from(studio.lights.values()).filter((lightData: any) => {
          return lightData && lightData.mesh && lightData.mesh.position;
        });
        
        if (lights.length === 0) {
          return `
            <div class="helper-guide-panel bottom-left" style="max-width: 400px;">
              <h4>Lysoppsett (vinkler)</h4>
              <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">
                <p style="font-size: 13px; margin-bottom: 8px;">Ingen lys i scenen</p>
                <p style="font-size: 11px; color: rgba(255,255,255,0.4);">Legg til lys for å se vinkler</p>
              </div>
            </div>
          `;
        }
        const subjectPos = { x: 0, y: 1.2, z: 0 }; // Default subject position
        
        // Try to get actual subject position from selected actor
        // Check if virtualActorService is available via window or useAppStore
        try {
          const appStore = useAppStore.getState();
          const selectedNode = appStore.selectedNodeId 
            ? appStore.scene.nodes.find(n => n.id === appStore.selectedNodeId)
            : null;
          
          if (selectedNode && selectedNode.type === 'actor' && selectedNode.transform) {
            subjectPos.x = selectedNode.transform.position[0];
            subjectPos.y = selectedNode.transform.position[1] + 1.2;
            subjectPos.z = selectedNode.transform.position[2];
          }
        } catch (e) {
          // Use default position if unable to get actor position
        }
        
        // Helper function to convert CCT to color hex
        const cctToColorHex = (cct: number): string => {
          if (cct < 2000) return '#ff7700';
          if (cct < 3000) return '#ff9329';
          if (cct < 4000) return '#ffb46b';
          if (cct < 5000) return '#ffdfc7';
          if (cct < 6000) return '#ffffff';
          if (cct < 7000) return '#e6f0ff';
          if (cct < 8000) return '#cce0ff';
          return '#99c2ff';
        };
        
        const lightAnglesHTML = lights.map((lightData: any, index: number) => {
          const lightPos = lightData.mesh?.position;
          if (!lightPos) return '';
          
          // Calculate horizontal angle (0-360 degrees, 0 = front, 90 = right, 180 = back, 270 = left)
          const dx = lightPos.x - subjectPos.x;
          const dz = lightPos.z - subjectPos.z;
          const horizontalAngle = (Math.atan2(dz, dx) * 180 / Math.PI + 90 + 360) % 360;
          
          // Calculate vertical angle (0-90 degrees, 0 = horizontal, 90 = straight up)
          const dy = lightPos.y - subjectPos.y;
          const distance = Math.sqrt(dx*dx + dz*dz);
          const verticalAngle = Math.atan2(dy, distance) * 180 / Math.PI;
          
          // Determine light position on viewfinder (convert 3D angle to 2D screen position)
          const angleRad = (horizontalAngle - 90) * Math.PI / 180;
          const radius = 0.4; // Distance from center
          const screenX = 50 + Math.cos(angleRad) * radius * 100;
          const screenY = 50 - Math.sin(angleRad) * radius * 100;
          
          const lightName = lightData.name || `Lys ${index + 1}`;
          const lightColor = lightData.cct ? cctToColorHex(lightData.cct) : '#ffff00';
          
          // Determine position label for SVG overlay
          let positionLabel = '';
          let positionColor = '#ffffff';
          
          if (horizontalAngle >= 315 || horizontalAngle < 45) {
            if (horizontalAngle >= 330 || horizontalAngle < 30) {
              positionLabel = 'Front';
              positionColor = '#00ff88';
            } else {
              positionLabel = 'Key';
              positionColor = '#ffff00';
            }
          } else if (horizontalAngle >= 45 && horizontalAngle < 135) {
            if (horizontalAngle >= 45 && horizontalAngle < 90) {
              positionLabel = 'Key';
              positionColor = '#ffff00';
            } else if (horizontalAngle >= 90 && horizontalAngle < 120) {
              positionLabel = 'Rim';
              positionColor = '#ff8800';
            } else {
              positionLabel = 'Back';
              positionColor = '#ff4444';
            }
          } else if (horizontalAngle >= 135 && horizontalAngle < 225) {
            if (horizontalAngle >= 135 && horizontalAngle < 180) {
              positionLabel = 'Back';
              positionColor = '#ff4444';
            } else {
              positionLabel = 'Rim';
              positionColor = '#ff8800';
            }
          } else {
            if (horizontalAngle >= 225 && horizontalAngle < 270) {
              positionLabel = 'Rim';
              positionColor = '#ff8800';
            } else if (horizontalAngle >= 270 && horizontalAngle < 300) {
              positionLabel = 'Fill';
              positionColor = '#4488ff';
            } else {
              positionLabel = 'Key';
              positionColor = '#ffff00';
            }
          }
          
          // Calculate label position with better spacing
          const labelOffsetX = screenX > 50 ? 2.5 : -2.5;
          const labelX = screenX + labelOffsetX;
          
          return `
            <g class="light-angle-marker">
              <!-- Glowing circle for light position (no animation to prevent blinking) -->
              <circle cx="${screenX}%" cy="${screenY}%" r="2.5%" fill="${lightColor}" opacity="0.9"/>
              <circle cx="${screenX}%" cy="${screenY}%" r="3.5%" fill="${lightColor}" opacity="0.3"/>
              
              <!-- Connection line to center (no animation) -->
              <line x1="50%" y1="50%" x2="${screenX}%" y2="${screenY}%" 
                    stroke="${lightColor}" stroke-width="3" opacity="0.6" stroke-dasharray="6,4"/>
              
              <!-- Position label background with glow -->
              <defs>
                <filter id="glow-${index}">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <rect x="${labelX - (positionLabel.length * 0.35)}%" 
                    y="${parseFloat(screenY) - 2.2}%" 
                    width="${positionLabel.length * 0.7}%" 
                    height="2.5%" 
                    fill="${positionColor}ee" 
                    rx="6" 
                    opacity="0.95"
                    filter="url(#glow-${index})"
                    stroke="${positionColor}" 
                    stroke-width="2"/>
              
              <!-- Position label text -->
              <text x="${labelX}%" 
                    y="${screenY}%" 
                    fill="#000000" 
                    font-size="14" 
                    font-weight="900"
                    font-family="Inter, system-ui, sans-serif"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    stroke="${positionColor}"
                    stroke-width="0.5"
                    opacity="1">
                ${positionLabel}
              </text>
              
              <!-- Light name with background -->
              <rect x="${labelX - (lightName.length * 0.25)}%" 
                    y="${parseFloat(screenY) + 1.5}%" 
                    width="${lightName.length * 0.5}%" 
                    height="1.8%" 
                    fill="rgba(0,0,0,0.7)" 
                    rx="4" 
                    opacity="0.9"/>
              
              <text x="${labelX}%" 
                    y="${parseFloat(screenY) + 2.4}%" 
                    fill="${lightColor}" 
                    font-size="11" 
                    font-weight="700"
                    font-family="Inter, system-ui, sans-serif"
                    text-anchor="middle"
                    dominant-baseline="middle">
                ${lightName}
              </text>
              
              <!-- Angle info with background -->
              <rect x="${labelX - 1.2}%" 
                    y="${parseFloat(screenY) + 3.5}%" 
                    width="2.4%" 
                    height="1.5%" 
                    fill="rgba(0,0,0,0.7)" 
                    rx="3" 
                    opacity="0.9"/>
              
              <text x="${labelX}%" 
                    y="${parseFloat(screenY) + 4.25}%" 
                    fill="#ffffff" 
                    font-size="9" 
                    font-weight="600"
                    font-family="'JetBrains Mono', monospace"
                    text-anchor="middle"
                    dominant-baseline="middle">
                ${Math.round(horizontalAngle)}°H ${Math.round(verticalAngle)}°V
              </text>
            </g>
          `;
        }).join('');
        
        // Calculate dynamic height based on number of lights
        // Each light item is approximately 92px tall (12px padding top/bottom, 8px margin bottom, ~72px content)
        const itemHeight = 92; // Height per light item
        const headerHeight = 60; // Header + subtitle height
        const padding = 32; // Top and bottom padding (16px each)
        const estimatedContentHeight = (lights.length * itemHeight) + headerHeight;
        const maxHeight = Math.min(window.innerHeight * 0.85, 800); // Maximum 85% of viewport or 800px
        const needsScroll = estimatedContentHeight > maxHeight;
        
        return `
          <div class="helper-guide-panel bottom-left" style="max-width: 420px; max-height: ${maxHeight}px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-shrink: 0;">
              <div style="width: 4px; height: 18px; background: linear-gradient(180deg, #00e5ff 0%, #0088cc 100%); border-radius: 2px;"></div>
              <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #00e5ff; text-shadow: 0 0 15px rgba(0,229,255,0.4);">Lysoppsett (vinkler)</h4>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.65); margin-bottom: 12px; padding-left: 14px; flex-shrink: 0;">
              Vinkler beregnet fra motivets posisjon
            </div>
            ${lights.length > 0 ? `
              <div class="light-angles-list" style="${needsScroll ? `max-height: ${maxHeight - headerHeight - padding}px; overflow-y: auto;` : 'overflow: visible;'} overflow-x: hidden; padding-right: 6px; flex: 1 1 auto; min-height: 0;">
                ${lights.map((lightData: any, index: number) => {
                  const lightPos = lightData.mesh?.position;
                  if (!lightPos) return '';
                  
                  const dx = lightPos.x - subjectPos.x;
                  const dz = lightPos.z - subjectPos.z;
                  const dy = lightPos.y - subjectPos.y;
                  const distance = Math.sqrt(dx*dx + dz*dz);
                  
                  const horizontalAngle = (Math.atan2(dz, dx) * 180 / Math.PI + 90 + 360) % 360;
                  const verticalAngle = Math.atan2(dy, distance) * 180 / Math.PI;
                  
                  const lightName = lightData.name || `Lys ${index + 1}`;
                  const lightColor = lightData.cct ? cctToColorHex(lightData.cct) : '#ffff00';
                  
                  // Determine position label with more precise lighting terminology
                  let positionLabel = '';
                  let positionColor = '#ffffff';
                  
                  // Front lighting positions (0-45° and 315-360°)
                  if (horizontalAngle >= 315 || horizontalAngle < 45) {
                    if (horizontalAngle >= 330 || horizontalAngle < 30) {
                      positionLabel = 'Front';
                      positionColor = '#00ff88';
                    } else {
                      positionLabel = 'Key';
                      positionColor = '#ffff00';
                    }
                  }
                  // Right side lighting positions (45-135°)
                  else if (horizontalAngle >= 45 && horizontalAngle < 135) {
                    if (horizontalAngle >= 45 && horizontalAngle < 90) {
                      positionLabel = 'Key';
                      positionColor = '#ffff00';
                    } else if (horizontalAngle >= 90 && horizontalAngle < 120) {
                      positionLabel = 'Rim';
                      positionColor = '#ff8800';
                    } else {
                      positionLabel = 'Back';
                      positionColor = '#ff4444';
                    }
                  }
                  // Back lighting positions (135-225°)
                  else if (horizontalAngle >= 135 && horizontalAngle < 225) {
                    if (horizontalAngle >= 135 && horizontalAngle < 180) {
                      positionLabel = 'Back';
                      positionColor = '#ff4444';
                    } else {
                      positionLabel = 'Rim';
                      positionColor = '#ff8800';
                    }
                  }
                  // Left side lighting positions (225-315°)
                  else {
                    if (horizontalAngle >= 225 && horizontalAngle < 270) {
                      positionLabel = 'Rim';
                      positionColor = '#ff8800';
                    } else if (horizontalAngle >= 270 && horizontalAngle < 300) {
                      positionLabel = 'Fill';
                      positionColor = '#4488ff';
                    } else {
                      positionLabel = 'Key';
                      positionColor = '#ffff00';
                    }
                  }
                  
                  const totalDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                  
                  // Check if light is enabled (has intensity > 0)
                  const lightId = lightData.mesh?.name?.replace('mesh_', 'light_') || '';
                  const isLightEnabled = lightData.light && lightData.light.intensity > 0;
                  
                  return `
                    <div class="light-angle-item" style="padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%); border-radius: 10px; border-left: 3px solid ${lightColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.3); opacity: ${isLightEnabled ? '1' : '0.5'};">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                          <label class="light-toggle-switch" style="position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0;">
                            <input type="checkbox" class="light-toggle-checkbox" data-light-id="${lightId}" ${isLightEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="light-toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isLightEnabled ? '#00e5ff' : '#666'}; transition: 0.3s; border-radius: 22px; box-shadow: 0 0 8px ${isLightEnabled ? 'rgba(0,229,255,0.5)' : 'transparent'};"></span>
                          </label>
                          <span style="font-weight: 700; font-size: 13px; color: ${lightColor}; text-shadow: 0 0 10px ${lightColor}40;">${lightName}</span>
                        </div>
                        <span style="font-size: 11px; font-weight: 700; color: #000; background: ${positionColor}; padding: 4px 10px; border-radius: 12px; border: 1.5px solid ${positionColor}; box-shadow: 0 0 12px ${positionColor}40, 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 0.3px; white-space: nowrap;">${positionLabel}</span>
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 8px;">
                        <div style="background: rgba(0,229,255,0.12); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,229,255,0.25);">
                          <div style="color: rgba(255,255,255,0.7); font-size: 9px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;">Horisontal</div>
                          <div style="font-family: 'JetBrains Mono', monospace; color: #00e5ff; font-size: 18px; font-weight: 700; text-shadow: 0 0 10px rgba(0,229,255,0.5); line-height: 1.1;">${Math.round(horizontalAngle)}°</div>
                        </div>
                        <div style="background: rgba(0,229,255,0.12); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,229,255,0.25);">
                          <div style="color: rgba(255,255,255,0.7); font-size: 9px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;">Vertikal</div>
                          <div style="font-family: 'JetBrains Mono', monospace; color: #00e5ff; font-size: 18px; font-weight: 700; text-shadow: 0 0 10px rgba(0,229,255,0.5); line-height: 1.1;">${Math.round(verticalAngle)}°</div>
                        </div>
                      </div>
                      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; opacity: 0.8;">📏</span>
                        <span>Avstand: <strong style="color: #fff; font-family: 'JetBrains Mono', monospace; font-weight: 600;">${totalDistance.toFixed(1)}m</strong></span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">
                <p style="font-size: 13px; margin-bottom: 8px;">Ingen lys i scenen</p>
                <p style="font-size: 11px; color: rgba(255,255,255,0.4);">Legg til lys fra Lys-panelet for å se vinkler her.</p>
              </div>
            `}
          </div>
          <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
            <defs>
              <marker id="light-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
              </marker>
            </defs>
            <circle cx="50%" cy="50%" r="40%" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4,4"/>
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="2,2"/>
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="2,2"/>
            <text x="50%" y="5%" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">Foran</text>
            <text x="95%" y="52%" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="end">Høyre</text>
            <text x="50%" y="95%" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">Bak</text>
            <text x="5%" y="52%" fill="rgba(255,255,255,0.3)" font-size="10">Venstre</text>
            ${lightAnglesHTML}
          </svg>
        `;
      default:
        return '';
    }
  }

  private updateFocusDistanceDisplay(distance: number, objectName: string | null) {
    const distanceDisplay = document.getElementById('focusDistanceDisplay');
    if (distanceDisplay) {
      distanceDisplay.textContent = `${distance.toFixed(2)}m`;
      if (objectName) {
        distanceDisplay.title = `Fokusert på: ${objectName}`;
      }
    }
  }

  private updateFocusPointsFromStore() {
    const state = useFocusStore.getState();
    
    state.zonePoints.forEach((point) => {
      this.updateZonePointPosition(point.id, point.x, point.y);
    });

    this.updateModeDisplay(state.mode);
    this.updateActivePointDisplay(state.activePointId);
    this.updateSafeAreaDisplay(state.safeAreaMode);
    this.updateGridDisplay(state.showGrid);
  }

  private updateSinglePointPosition(x: number, y: number) {
    if (!this.singlePointElement) return;
    this.singlePointElement.style.left = `${x * 100}%`;
    this.singlePointElement.style.top = `${y * 100}%`;
  }

  private updateZonePointPosition(id: number, x: number, y: number) {
    const point = document.querySelector(`.focus-point[data-point="${id}"]`) as HTMLElement;
    if (point) {
      point.style.left = `${x * 100}%`;
      point.style.top = `${y * 100}%`;
    }
  }

  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);

    const focusPoints = document.querySelectorAll('.focus-point');
    focusPoints.forEach((point) => {
      point.removeEventListener('pointerdown', this.handlePointerDown as EventListener);
    });
  }
}

export const focusController = new FocusController();
