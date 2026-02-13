/**
 * ArrowAnimationSystem - Animated arrow previews for storyboard camera movements
 * 
 * Provides hover-triggered animations that show arrows "flowing" along their path
 * to preview the movement direction. Uses requestAnimationFrame for smooth 60fps.
 */

import { ArrowAnnotation, BezierPath, Point } from './StoryboardAnnotationEngine';
import { ArrowPathType } from './CameraMovementPresets';

// =============================================================================
// Types
// =============================================================================

export interface AnimationConfig {
  speed: number;           // Animation speed (1 = normal, 0.5 = half, 2 = double)
  loopDelay: number;       // Delay in ms before animation loops
  style: AnimationStyle;
  chevronCount: number;    // Number of chevrons/dots along path
  chevronSize: number;     // Size of each chevron/dot
  trailLength: number;     // Length of fading trail (0-1)
  glowEnabled: boolean;    // Whether to add glow effect
  glowColor?: string;      // Glow color (defaults to arrow color)
  glowRadius: number;      // Glow blur radius
}

export type AnimationStyle = 
  | 'dash-flow'      // Animated dashed line
  | 'chevron-march'  // Chevrons marching along path
  | 'dot-pulse'      // Dots pulsing along path
  | 'trail-fade'     // Single dot with fading trail
  | 'wave-ripple';   // Wave effect rippling along path

export interface ActiveAnimation {
  id: string;
  arrow: ArrowAnnotation;
  startTime: number;
  progress: number;        // 0-1
  isHovered: boolean;
  rafId: number | null;
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  speed: 1,
  loopDelay: 200,
  style: 'chevron-march',
  chevronCount: 3,
  chevronSize: 8,
  trailLength: 0.3,
  glowEnabled: true,
  glowRadius: 4,
};

// =============================================================================
// ArrowAnimationSystem Class
// =============================================================================

export class ArrowAnimationSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private activeAnimations: Map<string, ActiveAnimation> = new Map();
  private config: AnimationConfig = { ...DEFAULT_ANIMATION_CONFIG };
  private isEnabled = true;

  constructor(config?: Partial<AnimationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // ==========================================================================
  // Setup
  // ==========================================================================

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  detachCanvas(): void {
    this.stopAll();
    this.canvas = null;
    this.ctx = null;
  }

  setConfig(config: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AnimationConfig {
    return { ...this.config };
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
    this.stopAll();
  }

  // ==========================================================================
  // Animation Control
  // ==========================================================================

  /**
   * Start animation for an arrow (typically on hover)
   */
  startAnimation(arrow: ArrowAnnotation): void {
    if (!this.isEnabled) return;
    
    // Stop existing animation for this arrow
    this.stopAnimation(arrow.id);
    
    const animation: ActiveAnimation = {
      id: arrow.id,
      arrow,
      startTime: performance.now(),
      progress: 0,
      isHovered: true,
      rafId: null,
    };
    
    this.activeAnimations.set(arrow.id, animation);
    this.animate(arrow.id);
  }

  /**
   * Stop animation for an arrow (typically on hover end)
   */
  stopAnimation(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (animation?.rafId) {
      cancelAnimationFrame(animation.rafId);
    }
    this.activeAnimations.delete(id);
  }

  /**
   * Stop all active animations
   */
  stopAll(): void {
    this.activeAnimations.forEach((animation, id) => {
      if (animation.rafId) {
        cancelAnimationFrame(animation.rafId);
      }
    });
    this.activeAnimations.clear();
  }

  /**
   * Check if arrow is currently animating
   */
  isAnimating(id: string): boolean {
    return this.activeAnimations.has(id);
  }

  // ==========================================================================
  // Animation Loop
  // ==========================================================================

  private animate(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (!animation || !this.ctx || !this.canvas) return;
    
    const now = performance.now();
    const elapsed = now - animation.startTime;
    const duration = 1500 / this.config.speed; // Base duration scaled by speed
    
    // Calculate progress with looping
    let progress = (elapsed % (duration + this.config.loopDelay)) / duration;
    if (progress > 1) {
      progress = 0; // In delay phase
    }
    
    animation.progress = progress;
    
    // Render animation frame
    this.renderAnimationFrame(animation);
    
    // Continue animation if still hovered
    if (animation.isHovered && this.isEnabled) {
      animation.rafId = requestAnimationFrame(() => this.animate(id));
    }
  }

  private renderAnimationFrame(animation: ActiveAnimation): void {
    if (!this.ctx) return;
    
    const { arrow, progress } = animation;
    
    switch (this.config.style) {
      case 'dash-flow':
        this.renderDashFlow(arrow, progress);
        break;
      case 'chevron-march':
        this.renderChevronMarch(arrow, progress);
        break;
      case 'dot-pulse':
        this.renderDotPulse(arrow, progress);
        break;
      case 'trail-fade':
        this.renderTrailFade(arrow, progress);
        break;
      case 'wave-ripple':
        this.renderWaveRipple(arrow, progress);
        break;
    }
  }

  // ==========================================================================
  // Animation Styles
  // ==========================================================================

  private renderDashFlow(arrow: ArrowAnnotation, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.save();
    
    // Draw arrow path with animated dash offset
    ctx.strokeStyle = arrow.style.strokeColor;
    ctx.lineWidth = arrow.style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -progress * 60; // Animate dash offset
    
    this.drawArrowPath(ctx, arrow);
    ctx.stroke();
    
    ctx.restore();
  }

  private renderChevronMarch(arrow: ArrowAnnotation, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.save();
    
    const { chevronCount, chevronSize } = this.config;
    const pathPoints = this.getPathPoints(arrow.path, 100);
    
    // Draw chevrons at intervals along the path
    for (let i = 0; i < chevronCount; i++) {
      const chevronProgress = (progress + i / chevronCount) % 1;
      const pointIndex = Math.floor(chevronProgress * (pathPoints.length - 1));
      const nextIndex = Math.min(pointIndex + 1, pathPoints.length - 1);
      
      const point = pathPoints[pointIndex];
      const nextPoint = pathPoints[nextIndex];
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
      
      // Calculate opacity (fade at start and end)
      let opacity = 1;
      if (chevronProgress < 0.1) opacity = chevronProgress / 0.1;
      if (chevronProgress > 0.9) opacity = (1 - chevronProgress) / 0.1;
      
      ctx.globalAlpha = opacity;
      this.drawChevron(ctx, point, angle, chevronSize, arrow.style.strokeColor);
    }
    
    ctx.restore();
  }

  private renderDotPulse(arrow: ArrowAnnotation, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.save();
    
    const { chevronCount, chevronSize, glowEnabled, glowRadius } = this.config;
    const pathPoints = this.getPathPoints(arrow.path, 100);
    
    for (let i = 0; i < chevronCount; i++) {
      const dotProgress = (progress + i / chevronCount) % 1;
      const pointIndex = Math.floor(dotProgress * (pathPoints.length - 1));
      const point = pathPoints[pointIndex];
      
      // Pulse size
      const pulsePhase = (dotProgress * 2 * Math.PI);
      const pulseFactor = 0.8 + 0.4 * Math.sin(pulsePhase);
      const size = chevronSize * pulseFactor;
      
      // Opacity fade
      let opacity = 1;
      if (dotProgress < 0.1) opacity = dotProgress / 0.1;
      if (dotProgress > 0.9) opacity = (1 - dotProgress) / 0.1;
      
      ctx.globalAlpha = opacity;
      
      // Glow effect
      if (glowEnabled) {
        ctx.shadowColor = this.config.glowColor || arrow.style.strokeColor;
        ctx.shadowBlur = glowRadius;
      }
      
      ctx.fillStyle = arrow.style.strokeColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  private renderTrailFade(arrow: ArrowAnnotation, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.save();
    
    const { chevronSize, trailLength, glowEnabled, glowRadius } = this.config;
    const pathPoints = this.getPathPoints(arrow.path, 100);
    const leadIndex = Math.floor(progress * (pathPoints.length - 1));
    
    // Draw trail
    const trailPointCount = Math.floor(trailLength * pathPoints.length);
    for (let i = 0; i < trailPointCount; i++) {
      const trailIndex = leadIndex - i;
      if (trailIndex < 0) continue;
      
      const point = pathPoints[trailIndex];
      const trailOpacity = 1 - (i / trailPointCount);
      const trailSize = chevronSize * (1 - i / trailPointCount * 0.5);
      
      ctx.globalAlpha = trailOpacity * 0.8;
      ctx.fillStyle = arrow.style.strokeColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, trailSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw lead dot
    const leadPoint = pathPoints[leadIndex];
    ctx.globalAlpha = 1;
    
    if (glowEnabled) {
      ctx.shadowColor = this.config.glowColor || arrow.style.strokeColor;
      ctx.shadowBlur = glowRadius * 2;
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(leadPoint.x, leadPoint.y, chevronSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private renderWaveRipple(arrow: ArrowAnnotation, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.save();
    
    const pathPoints = this.getPathPoints(arrow.path, 100);
    const waveCount = 3;
    
    ctx.strokeStyle = arrow.style.strokeColor;
    ctx.lineWidth = arrow.style.strokeWidth;
    ctx.lineCap = 'round';
    
    // Draw multiple waves
    for (let w = 0; w < waveCount; w++) {
      const waveProgress = (progress + w / waveCount) % 1;
      const waveOpacity = 1 - waveProgress;
      
      ctx.globalAlpha = waveOpacity * 0.7;
      ctx.lineWidth = arrow.style.strokeWidth * (1 + waveProgress);
      
      // Draw wave as expanding circles along path
      const waveIndex = Math.floor(waveProgress * (pathPoints.length - 1));
      const point = pathPoints[waveIndex];
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5 + waveProgress * 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // ==========================================================================
  // Path Utilities
  // ==========================================================================

  private drawArrowPath(ctx: CanvasRenderingContext2D, arrow: ArrowAnnotation): void {
    const { start, end, controlPoints, cornerPoints } = arrow.path;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    
    if (arrow.pathType === 'l-shape' && cornerPoints?.length) {
      cornerPoints.forEach(cp => ctx.lineTo(cp.x, cp.y));
      ctx.lineTo(end.x, end.y);
    } else if ((arrow.pathType === 'curved' || arrow.pathType === 'arc') && controlPoints?.length) {
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
      ctx.lineTo(end.x, end.y);
    }
  }

  private getPathPoints(path: BezierPath, count: number): Point[] {
    const points: Point[] = [];
    const { start, end, controlPoints, cornerPoints } = path;
    const ctrlPts = controlPoints || [];
    
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      let point: Point;
      
      if (cornerPoints && cornerPoints.length > 0) {
        // L-shape: linear interpolation through corner points
        const allPoints = [start, ...cornerPoints, end];
        const totalSegments = allPoints.length - 1;
        const segmentIndex = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
        const segmentT = (t * totalSegments) - segmentIndex;
        
        const p0 = allPoints[segmentIndex];
        const p1 = allPoints[segmentIndex + 1];
        
        point = {
          x: p0.x + (p1.x - p0.x) * segmentT,
          y: p0.y + (p1.y - p0.y) * segmentT,
        };
      } else if (ctrlPts.length === 1) {
        // Quadratic bezier
        point = this.quadraticBezier(start, ctrlPts[0], end, t);
      } else if (ctrlPts.length >= 2) {
        // Cubic bezier
        point = this.cubicBezier(start, ctrlPts[0], ctrlPts[1], end, t);
      } else {
        // Linear
        point = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        };
      }
      
      points.push(point);
    }
    
    return points;
  }

  private quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    };
  }

  private cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    return {
      x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
      y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
    };
  }

  private drawChevron(
    ctx: CanvasRenderingContext2D,
    point: Point,
    angle: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 4, 0);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  // ==========================================================================
  // Render Integration
  // ==========================================================================

  /**
   * Render all active animations
   * Call this in the main render loop after drawing static arrows
   */
  renderActiveAnimations(): void {
    this.activeAnimations.forEach(animation => {
      this.renderAnimationFrame(animation);
    });
  }

  /**
   * Get currently animating arrow IDs
   */
  getAnimatingIds(): string[] {
    return Array.from(this.activeAnimations.keys());
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get animation style display name
 */
export function getAnimationStyleName(style: AnimationStyle, norwegian = false): string {
  const names: Record<AnimationStyle, { en: string; no: string }> = {
    'dash-flow': { en: 'Dash Flow', no: 'Strekflyt' },
    'chevron-march': { en: 'Chevron March', no: 'Pilmarsj' },
    'dot-pulse': { en: 'Dot Pulse', no: 'Prikkpuls' },
    'trail-fade': { en: 'Trail Fade', no: 'Spordemping' },
    'wave-ripple': { en: 'Wave Ripple', no: 'Bølgekrusning' },
  };
  return norwegian ? names[style].no : names[style].en;
}

/**
 * Get all animation styles
 */
export function getAllAnimationStyles(): AnimationStyle[] {
  return ['dash-flow', 'chevron-march', 'dot-pulse', 'trail-fade', 'wave-ripple'];
}

export default ArrowAnimationSystem;
