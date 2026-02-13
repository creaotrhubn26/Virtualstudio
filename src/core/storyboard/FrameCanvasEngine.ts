/**
 * FrameCanvasEngine - Canvas drawing engine for storyboard frame annotations
 * 
 * Features:
 * - Drawing tools: pen, arrow, rectangle, circle, text, markers
 * - Extended arrow types: straight, curved, L-shape, arc
 * - Layer ordering with zIndex
 * - Selection and manipulation of objects
 * - Undo/redo support
 * - State serialization for persistence
 * - Export to image
 */

import { ArrowPathType, CameraMovementPreset, detectArrowGesture, CustomArrowGesture } from './CameraMovementPresets';

// Gesture detection result type alias for clarity
type GestureDetectionResult = CustomArrowGesture;

// =============================================================================
// Types
// =============================================================================

export type ToolType = 'select' | 'pen' | 'arrow' | 'arrow-preset' | 'arrow-custom' | 'rectangle' | 'circle' | 'text' | 'marker' | 'shape';

export type ExtendedArrowType = 'straight' | 'curved' | 'l-shape' | 'arc' | 'bidirectional' | 'dolly-zoom';

export interface DrawingStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  fontSize?: number;
  fontFamily?: string;
  dashPattern?: number[];
  arrowHeadSize?: number;
  opacity?: number;
}

export const DEFAULT_STYLE: DrawingStyle = {
  strokeColor: '#ffffff',
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial',
  arrowHeadSize: 12,
  opacity: 1,
};

export const MARKER_COLORS = {
  actor: '#4CAF50',
  camera: '#2196F3',
  lighting: '#FFC107',
  prop: '#9C27B0',
} as const;

export type MarkerType = keyof typeof MARKER_COLORS;

export interface Point {
  x: number;
  y: number;
}

export interface BezierPath {
  start: Point;
  end: Point;
  controlPoints?: Point[];
  cornerPoints?: Point[]; // For L-shapes
}

export interface ArrowLabel {
  text: string;
  position: 'above' | 'below' | 'start' | 'end' | 'center';
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
}

export interface CanvasObject {
  id: string;
  type: 'pen' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'marker' | 'shape';
  points?: Point[];
  start?: Point;
  end?: Point;
  center?: Point;
  radius?: number;
  text?: string;
  label?: string;
  markerType?: MarkerType;
  style: DrawingStyle;
  selected?: boolean;
  zIndex?: number;
  
  // Extended arrow properties
  arrowType?: ExtendedArrowType;
  bezierPath?: BezierPath;
  arrowLabel?: ArrowLabel;
  presetId?: string;
  detectedGesture?: CustomArrowGesture;
}

export interface CanvasState {
  objects: CanvasObject[];
  selectedId: string | null;
  imageUrl?: string;
}

type StateChangeCallback = (state: CanvasState) => void;
type SelectionCallback = (objectId: string | null) => void;

// =============================================================================
// FrameCanvasEngine Class
// =============================================================================

export class FrameCanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private objects: CanvasObject[] = [];
  private selectedId: string | null = null;
  private currentTool: ToolType = 'select';
  private currentStyle: DrawingStyle = { ...DEFAULT_STYLE };
  
  // Drawing state
  private isDrawing = false;
  private currentPoints: Point[] = [];
  private startPoint: Point | null = null;
  
  // Arrow drawing state
  private currentArrowType: ExtendedArrowType = 'straight';
  private currentPreset: CameraMovementPreset | null = null;
  private customArrowDetection = true;
  
  // History for undo/redo
  private history: CanvasState[] = [];
  private historyIndex = -1;
  private maxHistoryLength = 50;
  
  // Callbacks
  private onStateChange: StateChangeCallback | null = null;
  private onSelection: SelectionCallback | null = null;
  private onGestureDetected: ((gesture: GestureDetectionResult | null) => void) | null = null;

  // =============================================================================
  // Initialization
  // =============================================================================

  initialize(
    canvas: HTMLCanvasElement,
    imageUrl: string | undefined,
    onStateChange: StateChangeCallback,
    onSelection: SelectionCallback
  ): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStateChange = onStateChange;
    this.onSelection = onSelection;

    // Set up event listeners
    this.setupEventListeners();

    // Load background image if provided
    if (imageUrl) {
      this.loadBackgroundImage(imageUrl);
    } else {
      this.render();
    }

    // Save initial state
    this.saveToHistory();
  }

  private loadBackgroundImage(imageUrl: string): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.backgroundImage = img;
      this.resizeCanvas();
      this.render();
    };
    img.onerror = () => {
      console.error('Failed to load background image:', imageUrl);
      this.render();
    };
    img.src = imageUrl;
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.backgroundImage) return;
    
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const containerWidth = parent.clientWidth;
    const containerHeight = parent.clientHeight;
    const imgAspect = this.backgroundImage.width / this.backgroundImage.height;
    const containerAspect = containerWidth / containerHeight;

    let width: number, height: number;
    if (containerAspect > imgAspect) {
      height = containerHeight;
      width = height * imgAspect;
    } else {
      width = containerWidth;
      height = width / imgAspect;
    }

    this.canvas.width = width;
    this.canvas.height = height;
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);

    // Touch support
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);

    // Resize observer
    if (this.canvas.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
        this.render();
      });
      resizeObserver.observe(this.canvas.parentElement);
    }
  }

  destroy(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);

    this.canvas = null;
    this.ctx = null;
  }

  // =============================================================================
  // Event Handlers
  // =============================================================================

  private getEventPoint(e: MouseEvent | Touch): Point {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const point = this.getEventPoint(e);
    this.startDrawing(point);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const point = this.getEventPoint(e);
    this.continueDrawing(point);
  };

  private handleMouseUp = (): void => {
    this.finishDrawing();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const point = this.getEventPoint(e.touches[0]);
      this.startDrawing(point);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const point = this.getEventPoint(e.touches[0]);
      this.continueDrawing(point);
    }
  };

  private handleTouchEnd = (): void => {
    this.finishDrawing();
  };

  // =============================================================================
  // Drawing Logic
  // =============================================================================

  private startDrawing(point: Point): void {
    if (this.currentTool === 'select') {
      this.handleSelection(point);
      return;
    }

    this.isDrawing = true;
    this.startPoint = point;
    this.currentPoints = [point];
  }

  private continueDrawing(point: Point): void {
    if (!this.isDrawing) return;

    if (this.currentTool === 'pen') {
      this.currentPoints.push(point);
    }

    this.render();
    this.renderPreview(point);
  }

  private finishDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (!this.startPoint) return;

    const endPoint = this.currentPoints[this.currentPoints.length - 1] || this.startPoint;
    
    let newObject: CanvasObject | null = null;
    const nextZIndex = this.getMaxZIndex() + 1;

    switch (this.currentTool) {
      case 'pen':
        if (this.currentPoints.length > 1) {
          newObject = {
            id: this.generateId(),
            type: 'pen',
            points: [...this.currentPoints],
            style: { ...this.currentStyle },
            zIndex: nextZIndex,
          };
        }
        break;

      case 'arrow':
        newObject = {
          id: this.generateId(),
          type: 'arrow',
          start: this.startPoint,
          end: endPoint,
          arrowType: 'straight',
          bezierPath: { start: this.startPoint, end: endPoint },
          style: { ...this.currentStyle },
          zIndex: nextZIndex,
        };
        break;

      case 'arrow-preset':
        if (this.currentPreset) {
          const path = this.scalePresetPath(this.currentPreset, this.startPoint, endPoint);
          newObject = {
            id: this.generateId(),
            type: 'arrow',
            start: path.start,
            end: path.end,
            arrowType: this.currentPreset.pathType as ExtendedArrowType,
            bezierPath: path,
            presetId: this.currentPreset.id,
            arrowLabel: {
              text: this.currentPreset.defaultLabel,
              position: 'above',
              fontSize: 12,
              color: '#FFFFFF',
              backgroundColor: this.currentPreset.color,
            },
            style: {
              ...this.currentStyle,
              strokeColor: this.currentPreset.color,
              strokeWidth: this.currentPreset.strokeWidth,
              arrowHeadSize: this.currentPreset.arrowHeadSize,
              dashPattern: this.currentPreset.dashPattern,
            },
            zIndex: nextZIndex,
          };
        }
        break;

      case 'arrow-custom':
        if (this.currentPoints.length > 1 && this.customArrowDetection) {
          const gesture = detectArrowGesture(this.currentPoints);
          const simplified = this.simplifyPath(this.currentPoints, 3);
          const bezierPath = this.buildBezierPath(simplified, gesture.detectedType);
          
          // Notify UI of detected gesture
          this.onGestureDetected?.(gesture);
          
          newObject = {
            id: this.generateId(),
            type: 'arrow',
            start: simplified[0],
            end: simplified[simplified.length - 1],
            points: simplified,
            arrowType: gesture.detectedType as ExtendedArrowType,
            bezierPath,
            detectedGesture: gesture,
            arrowLabel: gesture.suggestedLabel ? {
              text: gesture.suggestedLabel,
              position: 'above',
              fontSize: 12,
              color: '#FFFFFF',
              backgroundColor: 'rgba(0,0,0,0.7)',
            } : undefined,
            style: { ...this.currentStyle },
            zIndex: nextZIndex,
          };
        }
        break;

      case 'rectangle':
        newObject = {
          id: this.generateId(),
          type: 'rectangle',
          start: this.startPoint,
          end: endPoint,
          style: { ...this.currentStyle },
          zIndex: nextZIndex,
        };
        break;

      case 'circle':
        const radius = Math.sqrt(
          Math.pow(endPoint.x - this.startPoint.x, 2) +
          Math.pow(endPoint.y - this.startPoint.y, 2)
        );
        newObject = {
          id: this.generateId(),
          type: 'circle',
          center: this.startPoint,
          radius,
          style: { ...this.currentStyle },
          zIndex: nextZIndex,
        };
        break;
    }

    if (newObject) {
      this.objects.push(newObject);
      this.sortByZIndex();
      this.saveToHistory();
      this.notifyStateChange();
    }

    this.currentPoints = [];
    this.startPoint = null;
    this.render();
  }

  private handleSelection(point: Point): void {
    // Find object at point (reverse order for top-most first)
    let found: CanvasObject | null = null;
    
    for (let i = this.objects.length - 1; i >= 0; i--) {
      if (this.isPointInObject(point, this.objects[i])) {
        found = this.objects[i];
        break;
      }
    }

    // Update selection
    this.objects.forEach(obj => obj.selected = false);
    
    if (found) {
      found.selected = true;
      this.selectedId = found.id;
    } else {
      this.selectedId = null;
    }

    this.onSelection?.(this.selectedId);
    this.render();
  }

  private isPointInObject(point: Point, obj: CanvasObject): boolean {
    const threshold = 10;

    switch (obj.type) {
      case 'pen':
        if (!obj.points) return false;
        for (const p of obj.points) {
          if (Math.abs(p.x - point.x) < threshold && Math.abs(p.y - point.y) < threshold) {
            return true;
          }
        }
        return false;

      case 'arrow':
      case 'rectangle':
        if (!obj.start || !obj.end) return false;
        const minX = Math.min(obj.start.x, obj.end.x) - threshold;
        const maxX = Math.max(obj.start.x, obj.end.x) + threshold;
        const minY = Math.min(obj.start.y, obj.end.y) - threshold;
        const maxY = Math.max(obj.start.y, obj.end.y) + threshold;
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;

      case 'circle':
        if (!obj.center || !obj.radius) return false;
        const dist = Math.sqrt(
          Math.pow(point.x - obj.center.x, 2) + Math.pow(point.y - obj.center.y, 2)
        );
        return Math.abs(dist - obj.radius) < threshold;

      case 'text':
      case 'marker':
        if (!obj.center) return false;
        return Math.abs(point.x - obj.center.x) < 30 && Math.abs(point.y - obj.center.y) < 30;

      default:
        return false;
    }
  }

  // =============================================================================
  // Rendering
  // =============================================================================

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background image
    if (this.backgroundImage) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Draw placeholder background
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Sort by zIndex before rendering
    const sortedObjects = [...this.objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // Draw all objects in layer order
    for (const obj of sortedObjects) {
      this.ctx.save();
      this.ctx.globalAlpha = obj.style.opacity ?? 1;
      this.renderObject(obj);
      this.ctx.restore();
    }
  }

  private renderObject(obj: CanvasObject): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = obj.style.strokeColor;
    this.ctx.lineWidth = obj.style.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (obj.type) {
      case 'pen':
        this.renderPen(obj);
        break;
      case 'arrow':
        this.renderArrow(obj);
        break;
      case 'rectangle':
        this.renderRectangle(obj);
        break;
      case 'circle':
        this.renderCircle(obj);
        break;
      case 'text':
        this.renderText(obj);
        break;
      case 'marker':
        this.renderMarker(obj);
        break;
    }

    // Draw selection indicator
    if (obj.selected) {
      this.renderSelectionIndicator(obj);
    }
  }

  private renderPen(obj: CanvasObject): void {
    if (!this.ctx || !obj.points || obj.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(obj.points[0].x, obj.points[0].y);
    
    for (let i = 1; i < obj.points.length; i++) {
      this.ctx.lineTo(obj.points[i].x, obj.points[i].y);
    }
    
    this.ctx.stroke();
  }

  private renderArrow(obj: CanvasObject): void {
    if (!this.ctx || !obj.start || !obj.end) return;

    const ctx = this.ctx;
    const headLength = obj.style.arrowHeadSize || 15;
    
    // Set dash pattern if specified
    if (obj.style.dashPattern) {
      ctx.setLineDash(obj.style.dashPattern);
    }

    // Handle extended arrow types with bezier paths
    if (obj.bezierPath) {
      const { start, end, controlPoints, cornerPoints } = obj.bezierPath;
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      
      if (obj.arrowType === 'l-shape' && cornerPoints?.length) {
        // Draw L-shape through corner points
        cornerPoints.forEach(cp => ctx.lineTo(cp.x, cp.y));
        ctx.lineTo(end.x, end.y);
      } else if ((obj.arrowType === 'curved' || obj.arrowType === 'arc') && controlPoints?.length) {
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
      
      // Draw arrowhead
      let prevPoint: Point;
      if (cornerPoints?.length) {
        prevPoint = cornerPoints[cornerPoints.length - 1];
      } else if (controlPoints?.length) {
        prevPoint = controlPoints[controlPoints.length - 1];
      } else {
        prevPoint = start;
      }
      
      const angle = Math.atan2(end.y - prevPoint.y, end.x - prevPoint.x);
      
      ctx.fillStyle = obj.style.strokeColor;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Draw bidirectional arrow head at start
      if (obj.arrowType === 'bidirectional') {
        let nextPoint: Point;
        if (cornerPoints?.length) {
          nextPoint = cornerPoints[0];
        } else if (controlPoints?.length) {
          nextPoint = controlPoints[0];
        } else {
          nextPoint = end;
        }
        
        const startAngle = Math.atan2(start.y - nextPoint.y, start.x - nextPoint.x);
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(
          start.x - headLength * Math.cos(startAngle - Math.PI / 6),
          start.y - headLength * Math.sin(startAngle - Math.PI / 6)
        );
        ctx.lineTo(
          start.x - headLength * Math.cos(startAngle + Math.PI / 6),
          start.y - headLength * Math.sin(startAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
      
      // Draw arrow label
      if (obj.arrowLabel) {
        this.renderArrowLabel(obj.arrowLabel, obj.bezierPath);
      }
    } else {
      // Fallback to simple arrow
      const angle = Math.atan2(obj.end.y - obj.start.y, obj.end.x - obj.start.x);

      // Draw line
      ctx.beginPath();
      ctx.moveTo(obj.start.x, obj.start.y);
      ctx.lineTo(obj.end.x, obj.end.y);
      ctx.stroke();

      // Draw arrowhead
      ctx.beginPath();
      ctx.moveTo(obj.end.x, obj.end.y);
      ctx.lineTo(
        obj.end.x - headLength * Math.cos(angle - Math.PI / 6),
        obj.end.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(obj.end.x, obj.end.y);
      ctx.lineTo(
        obj.end.x - headLength * Math.cos(angle + Math.PI / 6),
        obj.end.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
    
    // Reset dash pattern
    ctx.setLineDash([]);
  }

  private renderArrowLabel(label: ArrowLabel, path: BezierPath): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const fontSize = label.fontSize || 12;
    ctx.font = `${fontSize}px Arial`;
    const metrics = ctx.measureText(label.text);
    const padding = 4;
    
    // Calculate label position
    const midX = (path.start.x + path.end.x) / 2;
    const midY = (path.start.y + path.end.y) / 2;
    
    let labelX: number, labelY: number;
    
    switch (label.position) {
      case 'above':
        labelX = midX - metrics.width / 2;
        labelY = midY - 15;
        break;
      case 'below':
        labelX = midX - metrics.width / 2;
        labelY = midY + 20;
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

  private renderRectangle(obj: CanvasObject): void {
    if (!this.ctx || !obj.start || !obj.end) return;

    const x = Math.min(obj.start.x, obj.end.x);
    const y = Math.min(obj.start.y, obj.end.y);
    const width = Math.abs(obj.end.x - obj.start.x);
    const height = Math.abs(obj.end.y - obj.start.y);

    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    
    if (obj.style.fillColor) {
      this.ctx.fillStyle = obj.style.fillColor;
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  private renderCircle(obj: CanvasObject): void {
    if (!this.ctx || !obj.center || !obj.radius) return;

    this.ctx.beginPath();
    this.ctx.arc(obj.center.x, obj.center.y, obj.radius, 0, Math.PI * 2);
    
    if (obj.style.fillColor) {
      this.ctx.fillStyle = obj.style.fillColor;
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  private renderText(obj: CanvasObject): void {
    if (!this.ctx || !obj.center || !obj.text) return;

    const fontSize = obj.style.fontSize || 16;
    const fontFamily = obj.style.fontFamily || 'Arial';
    
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = obj.style.strokeColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(obj.text, obj.center.x, obj.center.y);
  }

  private renderMarker(obj: CanvasObject): void {
    if (!this.ctx || !obj.center) return;

    const color = obj.markerType ? MARKER_COLORS[obj.markerType] : '#4CAF50';
    const radius = 20;

    // Draw marker circle
    this.ctx.beginPath();
    this.ctx.arc(obj.center.x, obj.center.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw label
    if (obj.label) {
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(obj.label, obj.center.x, obj.center.y);
    }
  }

  private renderSelectionIndicator(obj: CanvasObject): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = '#00bfff';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    let bounds: { x: number; y: number; width: number; height: number } | null = null;

    switch (obj.type) {
      case 'pen':
        if (obj.points && obj.points.length > 0) {
          const xs = obj.points.map(p => p.x);
          const ys = obj.points.map(p => p.y);
          bounds = {
            x: Math.min(...xs) - 5,
            y: Math.min(...ys) - 5,
            width: Math.max(...xs) - Math.min(...xs) + 10,
            height: Math.max(...ys) - Math.min(...ys) + 10,
          };
        }
        break;

      case 'arrow':
      case 'rectangle':
        if (obj.start && obj.end) {
          bounds = {
            x: Math.min(obj.start.x, obj.end.x) - 5,
            y: Math.min(obj.start.y, obj.end.y) - 5,
            width: Math.abs(obj.end.x - obj.start.x) + 10,
            height: Math.abs(obj.end.y - obj.start.y) + 10,
          };
        }
        break;

      case 'circle':
        if (obj.center && obj.radius) {
          bounds = {
            x: obj.center.x - obj.radius - 5,
            y: obj.center.y - obj.radius - 5,
            width: obj.radius * 2 + 10,
            height: obj.radius * 2 + 10,
          };
        }
        break;

      case 'text':
      case 'marker':
        if (obj.center) {
          bounds = {
            x: obj.center.x - 30,
            y: obj.center.y - 20,
            width: 60,
            height: 40,
          };
        }
        break;
    }

    if (bounds) {
      this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    this.ctx.setLineDash([]);
  }

  private renderPreview(currentPoint: Point): void {
    if (!this.ctx || !this.startPoint) return;

    this.ctx.strokeStyle = this.currentStyle.strokeColor;
    this.ctx.lineWidth = this.currentStyle.strokeWidth;
    this.ctx.setLineDash([5, 5]);

    switch (this.currentTool) {
      case 'pen':
        if (this.currentPoints.length > 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.currentPoints[0].x, this.currentPoints[0].y);
          for (let i = 1; i < this.currentPoints.length; i++) {
            this.ctx.lineTo(this.currentPoints[i].x, this.currentPoints[i].y);
          }
          this.ctx.stroke();
        }
        break;

      case 'arrow':
        this.renderArrow({
          id: 'preview',
          type: 'arrow',
          start: this.startPoint,
          end: currentPoint,
          style: this.currentStyle,
        });
        break;

      case 'rectangle':
        this.ctx.beginPath();
        this.ctx.rect(
          Math.min(this.startPoint.x, currentPoint.x),
          Math.min(this.startPoint.y, currentPoint.y),
          Math.abs(currentPoint.x - this.startPoint.x),
          Math.abs(currentPoint.y - this.startPoint.y)
        );
        this.ctx.stroke();
        break;

      case 'circle':
        const radius = Math.sqrt(
          Math.pow(currentPoint.x - this.startPoint.x, 2) +
          Math.pow(currentPoint.y - this.startPoint.y, 2)
        );
        this.ctx.beginPath();
        this.ctx.arc(this.startPoint.x, this.startPoint.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
    }

    this.ctx.setLineDash([]);
  }

  // =============================================================================
  // Public API
  // =============================================================================

  setTool(tool: ToolType): void {
    this.currentTool = tool;
  }

  setStyle(style: Partial<DrawingStyle>): void {
    this.currentStyle = { ...this.currentStyle, ...style };
  }

  addText(position: Point, text: string): void {
    const obj: CanvasObject = {
      id: this.generateId(),
      type: 'text',
      center: position,
      text,
      style: { ...this.currentStyle },
    };
    this.objects.push(obj);
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  addMarker(position: Point, label: string, markerType: MarkerType): void {
    const obj: CanvasObject = {
      id: this.generateId(),
      type: 'marker',
      center: position,
      label,
      markerType,
      style: { ...this.currentStyle },
    };
    this.objects.push(obj);
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  deleteSelected(): void {
    if (!this.selectedId) return;
    this.objects = this.objects.filter(obj => obj.id !== this.selectedId);
    this.selectedId = null;
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  clear(): void {
    this.objects = [];
    this.selectedId = null;
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  // =============================================================================
  // Undo/Redo
  // =============================================================================

  undo(): boolean {
    if (this.historyIndex <= 0) return false;
    
    this.historyIndex--;
    this.restoreFromHistory();
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    
    this.historyIndex++;
    this.restoreFromHistory();
    return true;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  private saveToHistory(): void {
    // Remove any redo states
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add current state
    this.history.push({
      objects: JSON.parse(JSON.stringify(this.objects)),
      selectedId: this.selectedId,
    });
    
    this.historyIndex = this.history.length - 1;

    // Limit history length
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  private restoreFromHistory(): void {
    const state = this.history[this.historyIndex];
    if (!state) return;
    
    this.objects = JSON.parse(JSON.stringify(state.objects));
    this.selectedId = state.selectedId;
    this.notifyStateChange();
    this.render();
  }

  // =============================================================================
  // State Management
  // =============================================================================

  getState(): CanvasState {
    return {
      objects: JSON.parse(JSON.stringify(this.objects)),
      selectedId: this.selectedId,
      imageUrl: this.backgroundImage?.src,
    };
  }

  loadState(state: CanvasState): void {
    this.objects = JSON.parse(JSON.stringify(state.objects || []));
    this.selectedId = state.selectedId;
    this.history = [{ objects: this.objects, selectedId: this.selectedId }];
    this.historyIndex = 0;
    this.render();
  }

  toDataURL(format: 'png' | 'jpeg' = 'png', quality = 1.0): string {
    if (!this.canvas) return '';
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  // =============================================================================
  // Utilities
  // =============================================================================

  private generateId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyStateChange(): void {
    this.onStateChange?.({
      objects: this.objects,
      selectedId: this.selectedId,
    });
  }

  // =============================================================================
  // Layer Ordering
  // =============================================================================

  private getMaxZIndex(): number {
    return this.objects.reduce((max, obj) => Math.max(max, obj.zIndex || 0), 0);
  }

  private getMinZIndex(): number {
    return this.objects.reduce((min, obj) => Math.min(min, obj.zIndex || 0), Infinity);
  }

  private sortByZIndex(): void {
    this.objects.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }

  moveObjectUp(id: string): void {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    
    const above = this.objects.find(o => (o.zIndex || 0) > (obj.zIndex || 0));
    if (above) {
      const tempZ = obj.zIndex;
      obj.zIndex = above.zIndex;
      above.zIndex = tempZ;
    }
    
    this.sortByZIndex();
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  moveObjectDown(id: string): void {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    
    const below = [...this.objects]
      .reverse()
      .find(o => (o.zIndex || 0) < (obj.zIndex || 0));
    
    if (below) {
      const tempZ = obj.zIndex;
      obj.zIndex = below.zIndex;
      below.zIndex = tempZ;
    }
    
    this.sortByZIndex();
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  bringToFront(id: string): void {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    
    obj.zIndex = this.getMaxZIndex() + 1;
    this.sortByZIndex();
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  sendToBack(id: string): void {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    
    obj.zIndex = this.getMinZIndex() - 1;
    this.sortByZIndex();
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  reorderByIds(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const obj = this.objects.find(o => o.id === id);
      if (obj) obj.zIndex = index;
    });
    
    this.sortByZIndex();
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  getObjectsSortedByLayer(): CanvasObject[] {
    return [...this.objects].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  }

  // =============================================================================
  // Extended Arrow Helpers
  // =============================================================================

  setArrowPreset(preset: CameraMovementPreset | null): void {
    this.currentPreset = preset;
    if (preset) {
      this.currentTool = 'arrow-preset';
      this.currentArrowType = preset.pathType as ExtendedArrowType;
    }
  }

  setCustomArrowMode(enabled: boolean): void {
    this.customArrowDetection = enabled;
    if (enabled) {
      this.currentTool = 'arrow-custom';
    }
  }

  setGestureCallback(callback: ((gesture: GestureDetectionResult | null) => void) | null): void {
    this.onGestureDetected = callback;
  }

  private scalePresetPath(
    preset: CameraMovementPreset,
    start: Point,
    end: Point
  ): BezierPath {
    // Scale the preset's normalized path to the drawn bounding box
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const width = maxX - minX;
    const height = maxY - minY;

    const scalePoint = (p: { x: number; y: number }): Point => ({
      x: minX + p.x * width,
      y: minY + p.y * height,
    });

    return {
      start: scalePoint(preset.defaultPath.start),
      end: scalePoint(preset.defaultPath.end),
      controlPoints: preset.defaultPath.controlPoints?.map(scalePoint),
    };
  }

  private buildBezierPath(points: Point[], arrowType: string): BezierPath {
    if (points.length < 2) {
      return { start: points[0] || { x: 0, y: 0 }, end: points[0] || { x: 0, y: 0 } };
    }

    const start = points[0];
    const end = points[points.length - 1];

    if (arrowType === 'l-shape' && points.length >= 3) {
      const midIndex = Math.floor(points.length / 2);
      return {
        start,
        end,
        cornerPoints: [points[midIndex]],
      };
    }

    if (arrowType === 'curved' || arrowType === 'arc') {
      const midIndex = Math.floor(points.length / 2);
      return {
        start,
        end,
        controlPoints: [points[midIndex]],
      };
    }

    return { start, end };
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
    
    if (len === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + 
        Math.pow(point.y - lineStart.y, 2)
      );
    }
    
    return Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    ) / len;
  }

  // =============================================================================
  // Object Label Management
  // =============================================================================

  updateObjectLabel(id: string, label: ArrowLabel | null): void {
    const obj = this.objects.find(o => o.id === id);
    if (!obj || obj.type !== 'arrow') return;
    
    obj.arrowLabel = label || undefined;
    this.saveToHistory();
    this.notifyStateChange();
    this.render();
  }

  getObjects(): CanvasObject[] {
    return [...this.objects];
  }

  getObjectById(id: string): CanvasObject | undefined {
    return this.objects.find(o => o.id === id);
  }
}

export default FrameCanvasEngine;
