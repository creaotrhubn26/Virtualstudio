import { useFocusStore, FocusMode, SafeAreaMode, CompositionGuide } from '../state/store';

export class FocusController {
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
  }

  private setupControlButtons() {
    const overlayToggleBtn = document.querySelector('.vf-btn.overlay-toggle');
    const focusModeBtn = document.querySelector('.vf-btn.focus-mode');
    const compositionBtn = document.querySelector('.vf-btn.composition-guide');
    const safeAreaBtn = document.querySelector('.vf-btn.safe-area');
    const gridToggleBtn = document.querySelector('.vf-btn.grid-toggle');

    if (overlayToggleBtn) {
      overlayToggleBtn.addEventListener('click', this.handleOverlayToggle.bind(this));
    }
    if (focusModeBtn) {
      focusModeBtn.addEventListener('click', this.handleModeChange);
    }
    if (compositionBtn) {
      compositionBtn.addEventListener('click', this.handleCompositionChange.bind(this));
    }
    if (safeAreaBtn) {
      safeAreaBtn.addEventListener('click', this.handleSafeAreaChange);
    }
    if (gridToggleBtn) {
      gridToggleBtn.addEventListener('click', this.handleGridToggle);
    }
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
    
    this.isDragging = true;
    target.setPointerCapture(e.pointerId);
    
    const pointId = target.dataset.point ? parseInt(target.dataset.point) : -1;
    this.dragPointId = pointId;
    
    if (pointId >= 0) {
      useFocusStore.getState().setActivePoint(pointId);
    }
    useFocusStore.getState().setDragging(true);
    
    target.classList.add('dragging');

    window.dispatchEvent(new CustomEvent('focus:dragstart', { 
      detail: { pointId, x: e.clientX, y: e.clientY } 
    }));
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.viewportElement) return;

    const rect = this.viewportElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const state = useFocusStore.getState();
    
    if (state.mode === 'single' || this.dragPointId === -1) {
      state.updateSinglePoint(x, y);
      this.updateSinglePointPosition(x, y);
    } else if (this.dragPointId !== null && this.dragPointId >= 0) {
      state.updateZonePoint(this.dragPointId, x, y);
      this.updateZonePointPosition(this.dragPointId, x, y);
    }

    window.dispatchEvent(new CustomEvent('focus:drag', { 
      detail: { pointId: this.dragPointId, x, y } 
    }));
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
    }

    if (safeAreaBtn) {
      safeAreaBtn.classList.toggle('active', mode !== 'none');
    }
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
      overlay.innerHTML = this.getCompositionSVG(guide);
    }

    if (btn) {
      btn.classList.toggle('active', guide !== 'none');
      btn.setAttribute('title', this.getGuideLabel(guide));
    }
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
    const color = 'rgba(0, 255, 136, 0.5)';
    const phi = 1.618;
    const pos1 = (1 / (1 + phi)) * 100;
    const pos2 = (phi / (1 + phi)) * 100;

    switch (guide) {
      case 'thirds':
        return `<svg width="100%" height="100%">
          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="66.67%" y1="0" x2="66.67%" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="${color}" stroke-width="1"/>
          <line x1="0" y1="66.67%" x2="100%" y2="66.67%" stroke="${color}" stroke-width="1"/>
          <circle cx="33.33%" cy="33.33%" r="4" fill="${color}"/>
          <circle cx="66.67%" cy="33.33%" r="4" fill="${color}"/>
          <circle cx="33.33%" cy="66.67%" r="4" fill="${color}"/>
          <circle cx="66.67%" cy="66.67%" r="4" fill="${color}"/>
        </svg>`;
      case 'golden':
        return `<svg width="100%" height="100%">
          <line x1="${pos1}%" y1="0" x2="${pos1}%" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="${pos2}%" y1="0" x2="${pos2}%" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="0" y1="${pos1}%" x2="100%" y2="${pos1}%" stroke="${color}" stroke-width="1"/>
          <line x1="0" y1="${pos2}%" x2="100%" y2="${pos2}%" stroke="${color}" stroke-width="1"/>
          <circle cx="${pos1}%" cy="${pos1}%" r="4" fill="${color}"/>
          <circle cx="${pos2}%" cy="${pos1}%" r="4" fill="${color}"/>
          <circle cx="${pos1}%" cy="${pos2}%" r="4" fill="${color}"/>
          <circle cx="${pos2}%" cy="${pos2}%" r="4" fill="${color}"/>
        </svg>`;
      case 'spiral':
        return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="0" y="0" width="61.8" height="100" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
          <rect x="61.8" y="0" width="38.2" height="61.8" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
          <rect x="61.8" y="61.8" width="23.6" height="38.2" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
          <path d="M 100 100 Q 100 61.8, 61.8 61.8 Q 38.2 61.8, 38.2 38.2 Q 38.2 23.6, 52.8 23.6 Q 61.8 23.6, 61.8 32.6 Q 61.8 38.2, 56.2 38.2" fill="none" stroke="${color}" stroke-width="1.5"/>
        </svg>`;
      case 'diagonal':
        return `<svg width="100%" height="100%">
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="0" y1="0" x2="50%" y2="100%" stroke="${color}" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.6"/>
          <line x1="50%" y1="0" x2="100%" y2="100%" stroke="${color}" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.6"/>
        </svg>`;
      case 'center':
        return `<svg width="100%" height="100%">
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="${color}" stroke-width="1" stroke-dasharray="8,4"/>
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="${color}" stroke-width="1" stroke-dasharray="8,4"/>
          <circle cx="50%" cy="50%" r="8" fill="none" stroke="${color}" stroke-width="2"/>
          <circle cx="50%" cy="50%" r="2" fill="${color}"/>
        </svg>`;
      case 'triangle':
        return `<svg width="100%" height="100%">
          <line x1="0" y1="100%" x2="100%" y2="0" stroke="${color}" stroke-width="1.5"/>
          <line x1="0" y1="0" x2="50%" y2="50%" stroke="${color}" stroke-width="1" opacity="0.8"/>
          <line x1="100%" y1="100%" x2="50%" y2="50%" stroke="${color}" stroke-width="1" opacity="0.8"/>
          <circle cx="50%" cy="50%" r="4" fill="${color}"/>
        </svg>`;
      case 'symmetry':
        return `<svg width="100%" height="100%">
          <line x1="0" y1="0" x2="70.7%" y2="100%" stroke="${color}" stroke-width="1" opacity="0.7"/>
          <line x1="29.3%" y1="0" x2="100%" y2="100%" stroke="${color}" stroke-width="1" opacity="0.7"/>
          <line x1="0" y1="0" x2="100%" y2="70.7%" stroke="${color}" stroke-width="1" opacity="0.7"/>
          <line x1="0" y1="29.3%" x2="100%" y2="100%" stroke="${color}" stroke-width="1" opacity="0.7"/>
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="${color}" stroke-width="1"/>
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="${color}" stroke-width="1"/>
        </svg>`;
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
