/**
 * StoryboardAnnotationEngine - Extended annotation system for storyboard frames
 * 
 * Supports complex arrow paths (straight, curved, L-shape, arc), shapes with text labels,
 * layer ordering, and JSON serialization for persistence.
 * 
 * Persistence format: Stored in StoryboardFrame.annotations as JSON-serializable array
 * with full bezier path data, labels, and zIndex for layer ordering.
 */

import { 
  ArrowPathType, 
  CameraMovementPreset, 
  detectArrowGesture,
  CustomArrowGesture 
} from './CameraMovementPresets';

// =============================================================================
// Types
// =============================================================================

export type AnnotationType = 'arrow' | 'shape' | 'text' | 'marker' | 'focus';

export type ShapeAnnotationType = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'callout' | 'ellipse';

export type LabelPosition = 'above' | 'below' | 'inside' | 'along-path' | 'start' | 'end' | 'center';

export interface Point {
  x: number;
  y: number;
}

export interface BezierPath {
  start: Point;
  end: Point;
  controlPoints?: Point[]; // For quadratic (1 point) or cubic (2 points) curves
  cornerPoints?: Point[];  // For L-shapes
}

export interface AnnotationLabel {
  text: string;
  position: LabelPosition;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  rotation?: number; // For along-path labels
}

export interface AnnotationStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  opacity: number;
  dashPattern?: number[];
  arrowHeadSize?: number;
  arrowHeadType?: 'filled' | 'open' | 'diamond';
}

// Base annotation interface
export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  label?: AnnotationLabel;
  style: AnnotationStyle;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// Arrow annotation
export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  pathType: ArrowPathType;
  path: BezierPath;
  presetId?: string; // Reference to CameraMovementPreset
  detectedGesture?: CustomArrowGesture;
}

// Shape annotation with text support
export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: ShapeAnnotationType;
  bounds: { x: number; y: number; width: number; height: number };
  rotation?: number;
  cornerRadius?: number;
  text?: string;
  textStyle?: {
    fontSize: number;
    fontFamily: string;
    color: string;
    align: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
  };
}

// Text annotation (standalone)
export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor?: string;
  padding?: number;
  maxWidth?: number;
}

// Marker annotation (blocking markers, actor positions, etc.)
export interface MarkerAnnotation extends BaseAnnotation {
  type: 'marker';
  markerType: 'actor' | 'camera' | 'light' | 'prop' | 'focus' | 'custom';
  position: Point;
  size: number;
  iconName?: string;
}

// Focus annotation (highlight areas)
export interface FocusAnnotation extends BaseAnnotation {
  type: 'focus';
  focusType: 'highlight' | 'blur' | 'vignette' | 'spotlight';
  bounds: { x: number; y: number; width: number; height: number };
  feather?: number;
}

// Union type for all annotations
export type StoryboardAnnotation = 
  | ArrowAnnotation 
  | ShapeAnnotation 
  | TextAnnotation 
  | MarkerAnnotation 
  | FocusAnnotation;

// Engine state
export interface AnnotationEngineState {
  annotations: StoryboardAnnotation[];
  selectedIds: string[];
  hoveredId: string | null;
}

// Event types
export type AnnotationEventType = 
  | 'add' 
  | 'update' 
  | 'delete' 
  | 'select' 
  | 'deselect' 
  | 'reorder' 
  | 'hover';

export interface AnnotationEvent {
  type: AnnotationEventType;
  annotations: StoryboardAnnotation[];
  previousState?: AnnotationEngineState;
}

export type AnnotationEventHandler = (event: AnnotationEvent) => void;

// =============================================================================
// Default Styles
// =============================================================================

export const DEFAULT_ARROW_STYLE: AnnotationStyle = {
  strokeColor: '#2196F3',
  strokeWidth: 3,
  opacity: 1,
  arrowHeadSize: 12,
  arrowHeadType: 'filled',
};

export const DEFAULT_SHAPE_STYLE: AnnotationStyle = {
  strokeColor: '#4CAF50',
  strokeWidth: 2,
  fillColor: 'rgba(76, 175, 80, 0.2)',
  opacity: 1,
};

export const DEFAULT_TEXT_STYLE = {
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  textColor: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  padding: 4,
};

// =============================================================================
// StoryboardAnnotationEngine Class
// =============================================================================

export class StoryboardAnnotationEngine {
  private annotations: StoryboardAnnotation[] = [];
  private selectedIds: Set<string> = new Set();
  private hoveredId: string | null = null;
  private eventHandlers: Map<AnnotationEventType, AnnotationEventHandler[]> = new Map();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Drawing state for custom arrows
  private isDrawing = false;
  private drawingPoints: Point[] = [];
  private drawingStartTime = 0;

  constructor() {
    // Initialize event handler maps
    const eventTypes: AnnotationEventType[] = ['add', 'update', 'delete', 'select', 'deselect', 'reorder', 'hover'];
    eventTypes.forEach(type => this.eventHandlers.set(type, []));
  }

  // ==========================================================================
  // Canvas Setup
  // ==========================================================================

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  detachCanvas(): void {
    this.canvas = null;
    this.ctx = null;
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  on(eventType: AnnotationEventType, handler: AnnotationEventHandler): () => void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
    
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    };
  }

  private emit(eventType: AnnotationEventType, annotations: StoryboardAnnotation[]): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const event: AnnotationEvent = {
      type: eventType,
      annotations,
    };
    handlers.forEach(handler => handler(event));
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Add annotation(s) to the engine
   */
  addAnnotation(...annotations: StoryboardAnnotation[]): void {
    annotations.forEach(annotation => {
      // Assign zIndex if not set (place on top)
      if (annotation.zIndex === undefined) {
        annotation.zIndex = this.getMaxZIndex() + 1;
      }
      this.annotations.push(annotation);
    });
    
    this.sortByZIndex();
    this.emit('add', annotations);
  }

  /**
   * Update an annotation by ID
   */
  updateAnnotation(id: string, updates: Partial<StoryboardAnnotation>): StoryboardAnnotation | null {
    const index = this.annotations.findIndex(a => a.id === id);
    if (index < 0) return null;
    
    const updated = {
      ...this.annotations[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    } as StoryboardAnnotation;
    
    this.annotations[index] = updated;
    
    if ('zIndex' in updates) {
      this.sortByZIndex();
    }
    
    this.emit('update', [updated]);
    return updated;
  }

  /**
   * Delete annotation(s) by ID
   */
  deleteAnnotation(...ids: string[]): StoryboardAnnotation[] {
    const deleted: StoryboardAnnotation[] = [];
    
    ids.forEach(id => {
      const index = this.annotations.findIndex(a => a.id === id);
      if (index >= 0) {
        deleted.push(...this.annotations.splice(index, 1));
        this.selectedIds.delete(id);
      }
    });
    
    if (deleted.length > 0) {
      this.emit('delete', deleted);
    }
    
    return deleted;
  }

  /**
   * Get annotation by ID
   */
  getAnnotation(id: string): StoryboardAnnotation | undefined {
    return this.annotations.find(a => a.id === id);
  }

  /**
   * Get all annotations
   */
  getAnnotations(): StoryboardAnnotation[] {
    return [...this.annotations];
  }

  /**
   * Get annotations sorted by zIndex (for rendering)
   */
  getAnnotationsByLayer(): StoryboardAnnotation[] {
    return [...this.annotations].sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    const all = [...this.annotations];
    this.annotations = [];
    this.selectedIds.clear();
    this.emit('delete', all);
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  select(...ids: string[]): void {
    ids.forEach(id => this.selectedIds.add(id));
    const selected = this.annotations.filter(a => ids.includes(a.id));
    this.emit('select', selected);
  }

  deselect(...ids: string[]): void {
    const deselected: StoryboardAnnotation[] = [];
    ids.forEach(id => {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
        const annotation = this.getAnnotation(id);
        if (annotation) deselected.push(annotation);
      }
    });
    if (deselected.length > 0) {
      this.emit('deselect', deselected);
    }
  }

  deselectAll(): void {
    const ids = [...this.selectedIds];
    ids.forEach(id => this.deselect(id));
  }

  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  getSelectedAnnotations(): StoryboardAnnotation[] {
    return this.annotations.filter(a => this.selectedIds.has(a.id));
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  // ==========================================================================
  // Layer Ordering
  // ==========================================================================

  private getMaxZIndex(): number {
    return this.annotations.reduce((max, a) => Math.max(max, a.zIndex), 0);
  }

  private getMinZIndex(): number {
    return this.annotations.reduce((min, a) => Math.min(min, a.zIndex), Infinity);
  }

  private sortByZIndex(): void {
    this.annotations.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Move annotation up one layer
   */
  moveUp(id: string): void {
    const annotation = this.getAnnotation(id);
    if (!annotation) return;
    
    // Find the annotation directly above
    const above = this.annotations.find(a => a.zIndex > annotation.zIndex);
    if (above) {
      const tempZ = annotation.zIndex;
      this.updateAnnotation(id, { zIndex: above.zIndex });
      this.updateAnnotation(above.id, { zIndex: tempZ });
    }
    
    this.sortByZIndex();
    this.emit('reorder', [annotation]);
  }

  /**
   * Move annotation down one layer
   */
  moveDown(id: string): void {
    const annotation = this.getAnnotation(id);
    if (!annotation) return;
    
    // Find the annotation directly below
    const below = [...this.annotations]
      .reverse()
      .find(a => a.zIndex < annotation.zIndex);
    
    if (below) {
      const tempZ = annotation.zIndex;
      this.updateAnnotation(id, { zIndex: below.zIndex });
      this.updateAnnotation(below.id, { zIndex: tempZ });
    }
    
    this.sortByZIndex();
    this.emit('reorder', [annotation]);
  }

  /**
   * Bring annotation to front (top layer)
   */
  bringToFront(id: string): void {
    const annotation = this.getAnnotation(id);
    if (!annotation) return;
    
    this.updateAnnotation(id, { zIndex: this.getMaxZIndex() + 1 });
    this.sortByZIndex();
    this.emit('reorder', [annotation]);
  }

  /**
   * Send annotation to back (bottom layer)
   */
  sendToBack(id: string): void {
    const annotation = this.getAnnotation(id);
    if (!annotation) return;
    
    this.updateAnnotation(id, { zIndex: this.getMinZIndex() - 1 });
    this.sortByZIndex();
    this.emit('reorder', [annotation]);
  }

  /**
   * Reorder annotations by array of IDs (for drag-drop reordering)
   */
  reorderByIds(orderedIds: string[]): void {
    const reordered: StoryboardAnnotation[] = [];
    
    orderedIds.forEach((id, index) => {
      const updated = this.updateAnnotation(id, { zIndex: index });
      if (updated) reordered.push(updated);
    });
    
    this.sortByZIndex();
    this.emit('reorder', reordered);
  }

  // ==========================================================================
  // Arrow Creation Helpers
  // ==========================================================================

  /**
   * Create arrow from preset
   */
  createArrowFromPreset(
    preset: CameraMovementPreset,
    canvasWidth: number,
    canvasHeight: number,
    options?: Partial<ArrowAnnotation>
  ): ArrowAnnotation {
    const path = this.scalePathToCanvas(preset.defaultPath, canvasWidth, canvasHeight);
    
    return {
      id: this.generateId(),
      type: 'arrow',
      pathType: preset.pathType,
      path,
      presetId: preset.id,
      zIndex: this.getMaxZIndex() + 1,
      visible: true,
      locked: false,
      label: {
        text: preset.defaultLabel,
        position: 'above',
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: preset.color,
        padding: 4,
      },
      style: {
        strokeColor: preset.color,
        strokeWidth: preset.strokeWidth,
        opacity: 1,
        dashPattern: preset.dashPattern,
        arrowHeadSize: preset.arrowHeadSize,
        arrowHeadType: 'filled',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...options,
    };
  }

  /**
   * Create arrow from custom drawing gesture
   */
  createArrowFromGesture(
    points: Point[],
    canvasWidth: number,
    canvasHeight: number,
    options?: Partial<ArrowAnnotation>
  ): ArrowAnnotation {
    const gesture = detectArrowGesture(points);
    
    // Simplify points using Ramer-Douglas-Peucker algorithm
    const simplified = this.simplifyPath(points, 3);
    
    // Build path based on detected type
    let path: BezierPath;
    
    if (gesture.detectedType === 'l-shape' && simplified.length >= 3) {
      // Find the corner point
      const midIndex = Math.floor(simplified.length / 2);
      path = {
        start: simplified[0],
        end: simplified[simplified.length - 1],
        cornerPoints: [simplified[midIndex]],
      };
    } else if (gesture.detectedType === 'curved' || gesture.detectedType === 'arc') {
      // Calculate control points for smooth curve
      const controlPoints = this.calculateBezierControlPoints(simplified);
      path = {
        start: simplified[0],
        end: simplified[simplified.length - 1],
        controlPoints,
      };
    } else {
      // Straight arrow
      path = {
        start: simplified[0],
        end: simplified[simplified.length - 1],
      };
    }

    return {
      id: this.generateId(),
      type: 'arrow',
      pathType: gesture.detectedType,
      path,
      detectedGesture: gesture,
      zIndex: this.getMaxZIndex() + 1,
      visible: true,
      locked: false,
      label: gesture.suggestedLabel ? {
        text: gesture.suggestedLabel,
        position: 'above',
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 4,
      } : undefined,
      style: { ...DEFAULT_ARROW_STYLE },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...options,
    };
  }

  /**
   * Start custom arrow drawing
   */
  startDrawing(point: Point): void {
    this.isDrawing = true;
    this.drawingPoints = [point];
    this.drawingStartTime = Date.now();
  }

  /**
   * Continue custom arrow drawing
   */
  continueDrawing(point: Point): void {
    if (!this.isDrawing) return;
    
    // Throttle points for performance
    const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + 
      Math.pow(point.y - lastPoint.y, 2)
    );
    
    if (distance > 5) { // Minimum 5px between points
      this.drawingPoints.push(point);
    }
  }

  /**
   * End custom arrow drawing and create annotation
   */
  endDrawing(canvasWidth: number, canvasHeight: number): ArrowAnnotation | null {
    if (!this.isDrawing || this.drawingPoints.length < 2) {
      this.isDrawing = false;
      this.drawingPoints = [];
      return null;
    }
    
    const arrow = this.createArrowFromGesture(
      this.drawingPoints,
      canvasWidth,
      canvasHeight
    );
    
    this.isDrawing = false;
    this.drawingPoints = [];
    
    return arrow;
  }

  /**
   * Get current drawing points (for preview)
   */
  getDrawingPoints(): Point[] {
    return [...this.drawingPoints];
  }

  /**
   * Check if currently drawing
   */
  getIsDrawing(): boolean {
    return this.isDrawing;
  }

  // ==========================================================================
  // Shape Creation Helpers
  // ==========================================================================

  /**
   * Create shape annotation
   */
  createShape(
    shapeType: ShapeAnnotationType,
    bounds: { x: number; y: number; width: number; height: number },
    options?: Partial<ShapeAnnotation>
  ): ShapeAnnotation {
    return {
      id: this.generateId(),
      type: 'shape',
      shapeType,
      bounds,
      zIndex: this.getMaxZIndex() + 1,
      visible: true,
      locked: false,
      style: { ...DEFAULT_SHAPE_STYLE },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...options,
    };
  }

  /**
   * Create text annotation
   */
  createText(
    position: Point,
    text: string,
    options?: Partial<TextAnnotation>
  ): TextAnnotation {
    return {
      id: this.generateId(),
      type: 'text',
      position,
      text,
      fontSize: DEFAULT_TEXT_STYLE.fontSize,
      fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
      textColor: DEFAULT_TEXT_STYLE.textColor,
      backgroundColor: DEFAULT_TEXT_STYLE.backgroundColor,
      padding: DEFAULT_TEXT_STYLE.padding,
      zIndex: this.getMaxZIndex() + 1,
      visible: true,
      locked: false,
      style: {
        strokeColor: 'transparent',
        strokeWidth: 0,
        opacity: 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...options,
    };
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  /**
   * Render all annotations to canvas
   */
  render(): void {
    if (!this.ctx || !this.canvas) return;
    
    const sortedAnnotations = this.getAnnotationsByLayer();
    
    sortedAnnotations.forEach(annotation => {
      if (!annotation.visible) return;
      
      this.ctx!.save();
      this.ctx!.globalAlpha = annotation.style.opacity;
      
      switch (annotation.type) {
        case 'arrow':
          this.renderArrow(annotation);
          break;
        case 'shape':
          this.renderShape(annotation);
          break;
        case 'text':
          this.renderText(annotation);
          break;
        case 'marker':
          this.renderMarker(annotation);
          break;
        case 'focus':
          this.renderFocus(annotation);
          break;
      }
      
      // Render selection indicator
      if (this.selectedIds.has(annotation.id)) {
        this.renderSelectionIndicator(annotation);
      }
      
      this.ctx!.restore();
    });
  }

  private renderArrow(arrow: ArrowAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.strokeStyle = arrow.style.strokeColor;
    ctx.lineWidth = arrow.style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (arrow.style.dashPattern) {
      ctx.setLineDash(arrow.style.dashPattern);
    }
    
    ctx.beginPath();
    
    const { start, end, controlPoints, cornerPoints } = arrow.path;
    
    ctx.moveTo(start.x, start.y);
    
    if (arrow.pathType === 'l-shape' && cornerPoints?.length) {
      // Draw L-shape
      cornerPoints.forEach(cp => ctx.lineTo(cp.x, cp.y));
      ctx.lineTo(end.x, end.y);
    } else if ((arrow.pathType === 'curved' || arrow.pathType === 'arc') && controlPoints?.length) {
      // Draw bezier curve
      if (controlPoints.length === 1) {
        ctx.quadraticCurveTo(controlPoints[0].x, controlPoints[0].y, end.x, end.y);
      } else if (controlPoints.length >= 2) {
        ctx.bezierCurveTo(
          controlPoints[0].x, controlPoints[0].y,
          controlPoints[1].x, controlPoints[1].y,
          end.x, end.y
        );
      }
    } else {
      // Straight line
      ctx.lineTo(end.x, end.y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw arrow head
    this.renderArrowHead(arrow);
    
    // Draw label
    if (arrow.label) {
      this.renderLabel(arrow.label, arrow.path);
    }
  }

  private renderArrowHead(arrow: ArrowAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const { end, controlPoints, cornerPoints } = arrow.path;
    const headSize = arrow.style.arrowHeadSize || 12;
    
    // Calculate angle at end point
    let prevPoint: Point;
    if (cornerPoints?.length) {
      prevPoint = cornerPoints[cornerPoints.length - 1];
    } else if (controlPoints?.length) {
      // For curves, approximate tangent at end
      prevPoint = controlPoints[controlPoints.length - 1];
    } else {
      prevPoint = arrow.path.start;
    }
    
    const angle = Math.atan2(end.y - prevPoint.y, end.x - prevPoint.x);
    
    ctx.fillStyle = arrow.style.strokeColor;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headSize * Math.cos(angle - Math.PI / 6),
      end.y - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - headSize * Math.cos(angle + Math.PI / 6),
      end.y - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  private renderShape(shape: ShapeAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const { x, y, width, height } = shape.bounds;
    
    ctx.strokeStyle = shape.style.strokeColor;
    ctx.lineWidth = shape.style.strokeWidth;
    if (shape.style.fillColor) {
      ctx.fillStyle = shape.style.fillColor;
    }
    
    ctx.save();
    if (shape.rotation) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(shape.rotation * Math.PI / 180);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    
    ctx.beginPath();
    
    switch (shape.shapeType) {
      case 'rectangle':
        if (shape.cornerRadius) {
          this.roundRect(ctx, x, y, width, height, shape.cornerRadius);
        } else {
          ctx.rect(x, y, width, height);
        }
        break;
        
      case 'circle':
      case 'ellipse':
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;
        
      case 'triangle':
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        break;
        
      case 'diamond':
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height / 2);
        ctx.lineTo(x + width / 2, y + height);
        ctx.lineTo(x, y + height / 2);
        ctx.closePath();
        break;
        
      case 'callout':
        // Rectangle with pointer
        const pointerSize = Math.min(width, height) * 0.2;
        const calloutRadius = shape.cornerRadius ?? 0;
        ctx.moveTo(x + calloutRadius, y);
        ctx.lineTo(x + width - calloutRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + calloutRadius);
        ctx.lineTo(x + width, y + height - calloutRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - calloutRadius, y + height);
        // Pointer
        ctx.lineTo(x + width * 0.3 + pointerSize, y + height);
        ctx.lineTo(x + width * 0.2, y + height + pointerSize);
        ctx.lineTo(x + width * 0.3 - pointerSize, y + height);
        ctx.lineTo(x + calloutRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - calloutRadius);
        ctx.lineTo(x, y + calloutRadius);
        ctx.quadraticCurveTo(x, y, x + calloutRadius, y);
        break;
    }
    
    if (shape.style.fillColor) {
      ctx.fill();
    }
    ctx.stroke();
    
    // Render text inside shape
    if (shape.text && shape.textStyle) {
      ctx.fillStyle = shape.textStyle.color;
      ctx.font = `${shape.textStyle.fontSize}px ${shape.textStyle.fontFamily}`;
      ctx.textAlign = shape.textStyle.align;
      ctx.textBaseline = shape.textStyle.verticalAlign === 'top' ? 'top' : 
                         shape.textStyle.verticalAlign === 'bottom' ? 'bottom' : 'middle';
      
      const textX = shape.textStyle.align === 'left' ? x + 8 : 
                    shape.textStyle.align === 'right' ? x + width - 8 : x + width / 2;
      const textY = shape.textStyle.verticalAlign === 'top' ? y + 8 : 
                    shape.textStyle.verticalAlign === 'bottom' ? y + height - 8 : y + height / 2;
      
      ctx.fillText(shape.text, textX, textY, width - 16);
    }
    
    ctx.restore();
  }

  private renderText(text: TextAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.font = `${text.fontSize}px ${text.fontFamily}`;
    const metrics = ctx.measureText(text.text);
    const textHeight = text.fontSize * 1.2;
    
    // Background
    if (text.backgroundColor) {
      const padding = text.padding || 4;
      ctx.fillStyle = text.backgroundColor;
      ctx.fillRect(
        text.position.x - padding,
        text.position.y - textHeight / 2 - padding,
        metrics.width + padding * 2,
        textHeight + padding * 2
      );
    }
    
    // Text
    ctx.fillStyle = text.textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(text.text, text.position.x, text.position.y);
  }

  private renderMarker(marker: MarkerAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const { position, size, markerType } = marker;
    
    ctx.fillStyle = marker.style.fillColor || marker.style.strokeColor;
    ctx.strokeStyle = marker.style.strokeColor;
    ctx.lineWidth = marker.style.strokeWidth;
    
    // Draw marker based on type
    ctx.beginPath();
    switch (markerType) {
      case 'actor':
        // Person icon
        ctx.arc(position.x, position.y - size * 0.3, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(position.x, position.y + size * 0.2, size * 0.4, Math.PI, 0);
        ctx.fill();
        break;
        
      case 'camera':
        // Camera icon (rectangle with circle)
        ctx.rect(position.x - size * 0.4, position.y - size * 0.25, size * 0.8, size * 0.5);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(position.x, position.y, size * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        break;
        
      case 'light':
        // Sun-like icon
        ctx.arc(position.x, position.y, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.moveTo(
            position.x + Math.cos(angle) * size * 0.35,
            position.y + Math.sin(angle) * size * 0.35
          );
          ctx.lineTo(
            position.x + Math.cos(angle) * size * 0.5,
            position.y + Math.sin(angle) * size * 0.5
          );
        }
        ctx.stroke();
        break;
        
      default:
        // Generic circle marker
        ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
  }

  private renderFocus(focus: FocusAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const { x, y, width, height } = focus.bounds;
    
    switch (focus.focusType) {
      case 'highlight':
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        break;
        
      case 'spotlight':
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas!.width, this.canvas!.height);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
    }
  }

  private renderLabel(label: AnnotationLabel, path: BezierPath): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const fontSize = label.fontSize || 12;
    ctx.font = `${fontSize}px ${label.fontFamily || 'Inter, sans-serif'}`;
    const metrics = ctx.measureText(label.text);
    const padding = label.padding || 4;
    
    // Calculate label position
    let labelX: number, labelY: number;
    const midX = (path.start.x + path.end.x) / 2;
    const midY = (path.start.y + path.end.y) / 2;
    
    switch (label.position) {
      case 'above':
        labelX = midX - metrics.width / 2;
        labelY = midY - 15;
        break;
      case 'below':
        labelX = midX - metrics.width / 2;
        labelY = midY + 15;
        break;
      case 'start':
        labelX = path.start.x - metrics.width / 2;
        labelY = path.start.y - 15;
        break;
      case 'end':
        labelX = path.end.x - metrics.width / 2;
        labelY = path.end.y - 15;
        break;
      default:
        labelX = midX - metrics.width / 2;
        labelY = midY;
    }
    
    // Draw background
    if (label.backgroundColor) {
      ctx.fillStyle = label.backgroundColor;
      ctx.fillRect(
        labelX - padding,
        labelY - fontSize / 2 - padding,
        metrics.width + padding * 2,
        fontSize + padding * 2
      );
    }
    
    // Draw text
    ctx.fillStyle = label.color || '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.text, labelX, labelY);
  }

  private renderSelectionIndicator(annotation: StoryboardAnnotation): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    
    // Get bounding box
    const bounds = this.getAnnotationBounds(annotation);
    if (bounds) {
      ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
      
      // Draw resize handles
      const handleSize = 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2196F3';
      ctx.setLineDash([]);
      
      const corners = [
        { x: bounds.x - 4, y: bounds.y - 4 },
        { x: bounds.x + bounds.width + 4, y: bounds.y - 4 },
        { x: bounds.x - 4, y: bounds.y + bounds.height + 4 },
        { x: bounds.x + bounds.width + 4, y: bounds.y + bounds.height + 4 },
      ];
      
      corners.forEach(corner => {
        ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      });
    }
    
    ctx.setLineDash([]);
  }

  private getAnnotationBounds(annotation: StoryboardAnnotation): { x: number; y: number; width: number; height: number } | null {
    switch (annotation.type) {
      case 'arrow': {
        const { start, end, controlPoints, cornerPoints } = annotation.path;
        const allPoints = [start, end, ...(controlPoints || []), ...(cornerPoints || [])];
        const xs = allPoints.map(p => p.x);
        const ys = allPoints.map(p => p.y);
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      }
      case 'shape':
        return annotation.bounds;
      case 'text':
        return {
          x: annotation.position.x,
          y: annotation.position.y - annotation.fontSize / 2,
          width: 100, // Approximate
          height: annotation.fontSize,
        };
      case 'marker':
        return {
          x: annotation.position.x - annotation.size / 2,
          y: annotation.position.y - annotation.size / 2,
          width: annotation.size,
          height: annotation.size,
        };
      case 'focus':
        return annotation.bounds;
      default:
        return null;
    }
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serialize all annotations to JSON string
   */
  serialize(): string {
    return JSON.stringify(this.annotations);
  }

  /**
   * Deserialize annotations from JSON string
   */
  deserialize(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this.annotations = parsed;
        this.sortByZIndex();
      }
    } catch (e) {
      console.warn('Failed to deserialize annotations:', e);
    }
  }

  /**
   * Export annotations as array for storage
   */
  toArray(): StoryboardAnnotation[] {
    return [...this.annotations];
  }

  /**
   * Import annotations from array
   */
  fromArray(annotations: StoryboardAnnotation[]): void {
    this.annotations = [...annotations];
    this.sortByZIndex();
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private generateId(): string {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private scalePathToCanvas(
    path: { start: Point; end: Point; controlPoints?: Point[] },
    width: number,
    height: number,
    margin = 0.1
  ): BezierPath {
    const effectiveWidth = width * (1 - 2 * margin);
    const effectiveHeight = height * (1 - 2 * margin);
    const offsetX = width * margin;
    const offsetY = height * margin;

    const scalePoint = (p: Point): Point => ({
      x: offsetX + p.x * effectiveWidth,
      y: offsetY + p.y * effectiveHeight,
    });

    return {
      start: scalePoint(path.start),
      end: scalePoint(path.end),
      controlPoints: path.controlPoints?.map(scalePoint),
    };
  }

  private simplifyPath(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    
    // Ramer-Douglas-Peucker algorithm
    let maxDist = 0;
    let maxIndex = 0;
    
    const start = points[0];
    const end = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    if (maxDist > tolerance) {
      const left = this.simplifyPath(points.slice(0, maxIndex + 1), tolerance);
      const right = this.simplifyPath(points.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    }
    
    return [start, end];
  }

  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + 
      Math.pow(point.y - lineStart.y, 2)
    );
    
    return Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    ) / len;
  }

  private calculateBezierControlPoints(points: Point[]): Point[] {
    if (points.length < 3) return [];
    
    // For simple curves, use the middle point as control
    const midIndex = Math.floor(points.length / 2);
    return [points[midIndex]];
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

export default StoryboardAnnotationEngine;
