import { useFocusStore, useAppStore, FocusMode, SafeAreaMode, CompositionGuide, HelperGuide } from '../state/store';

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

  private updateHelperGuide(guide: HelperGuide) {
    const overlay = document.getElementById('helperGuideOverlay');
    const btn = document.querySelector('.vf-btn.helper-guide');
    
    if (overlay) {
      overlay.setAttribute('data-guide', guide);
      overlay.innerHTML = this.getHelperGuideHTML(guide);
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
      safety: 'Sikkerhetssoner'
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
        return `
          <div class="helper-guide-panel bottom-left">
            <h4>Eksponeringssoner</h4>
            <div class="exposure-zones">
              <div class="exposure-zone">
                <div class="exposure-zone-box" style="background: #000;"></div>
                <span class="exposure-zone-label">Sone 0 - Ren sort</span>
                <span class="exposure-zone-ev">-5 EV</span>
              </div>
              <div class="exposure-zone">
                <div class="exposure-zone-box" style="background: #333;"></div>
                <span class="exposure-zone-label">Sone II - Skyggedetalj</span>
                <span class="exposure-zone-ev">-3 EV</span>
              </div>
              <div class="exposure-zone">
                <div class="exposure-zone-box" style="background: #808080;"></div>
                <span class="exposure-zone-label">Sone V - 18% grå</span>
                <span class="exposure-zone-ev">0 EV</span>
              </div>
              <div class="exposure-zone">
                <div class="exposure-zone-box" style="background: #999;"></div>
                <span class="exposure-zone-label">Sone VI - Hudtone</span>
                <span class="exposure-zone-ev">+1 EV</span>
              </div>
              <div class="exposure-zone">
                <div class="exposure-zone-box" style="background: #ccc;"></div>
                <span class="exposure-zone-label">Sone VIII - Høylys</span>
                <span class="exposure-zone-ev">+3 EV</span>
              </div>
              <div class="exposure-zone">
                <div class="exposure-zone-box" style="background: #fff;"></div>
                <span class="exposure-zone-label">Sone X - Ren hvit</span>
                <span class="exposure-zone-ev">+5 EV</span>
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
