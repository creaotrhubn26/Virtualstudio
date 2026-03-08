import type { StoryboardFrame } from '../../state/storyboardStore';

export type QuickAnnotationType =
  | 'arrow_left'
  | 'arrow_right'
  | 'arrow_up'
  | 'arrow_down'
  | 'actor_marker'
  | 'camera_path'
  | 'light_marker'
  | 'focus_area';

const defaultSize = { width: 1280, height: 720 };

const createPlaceholderDataUrl = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = defaultSize.width;
  canvas.height = defaultSize.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.fillStyle = '#12121a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.fillStyle = '#5a5a72';
  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Storyboard Frame', canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/jpeg', 0.92);
};

const drawArrow = (
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  color: string,
): void => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();

  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const size = 20;

  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - size * Math.cos(angle - Math.PI / 6), to[1] - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to[0] - size * Math.cos(angle + Math.PI / 6), to[1] - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

class QuickAnnotationService {
  async addAnnotation(frame: StoryboardFrame, type: QuickAnnotationType): Promise<string> {
    const baseUrl = frame.imageUrl || frame.thumbnailUrl || createPlaceholderDataUrl();
    const image = await this.loadImage(baseUrl);

    const canvas = document.createElement('canvas');
    canvas.width = image?.width || defaultSize.width;
    canvas.height = image?.height || defaultSize.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create annotation canvas context');
    }

    if (image) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#12121a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.drawOverlay(ctx, type, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  private async loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    type: QuickAnnotationType,
    width: number,
    height: number,
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;

    switch (type) {
      case 'arrow_left':
        drawArrow(ctx, [centerX + 160, centerY], [centerX - 160, centerY], '#00d4ff');
        break;
      case 'arrow_right':
        drawArrow(ctx, [centerX - 160, centerY], [centerX + 160, centerY], '#00d4ff');
        break;
      case 'arrow_up':
        drawArrow(ctx, [centerX, centerY + 140], [centerX, centerY - 140], '#00d4ff');
        break;
      case 'arrow_down':
        drawArrow(ctx, [centerX, centerY - 140], [centerX, centerY + 140], '#00d4ff');
        break;
      case 'actor_marker':
        this.drawActorMarker(ctx, centerX, centerY);
        break;
      case 'camera_path':
        this.drawCameraPath(ctx, width, height);
        break;
      case 'light_marker':
        this.drawLightMarker(ctx, centerX, centerY - 120);
        break;
      case 'focus_area':
        this.drawFocusArea(ctx, centerX, centerY, width, height);
        break;
      default:
        break;
    }
  }

  private drawActorMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(x, y, 85, 135, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawCameraPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 6;
    ctx.setLineDash([14, 8]);

    ctx.beginPath();
    ctx.moveTo(width * 0.15, height * 0.75);
    ctx.bezierCurveTo(width * 0.35, height * 0.45, width * 0.65, height * 0.55, width * 0.85, height * 0.28);
    ctx.stroke();

    ctx.setLineDash([]);
    drawArrow(
      ctx,
      [width * 0.73, height * 0.35],
      [width * 0.85, height * 0.28],
      '#22c55e',
    );
    ctx.restore();
  }

  private drawLightMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const innerX = x + Math.cos(angle) * 42;
      const innerY = y + Math.sin(angle) * 42;
      const outerX = x + Math.cos(angle) * 62;
      const outerY = y + Math.sin(angle) * 62;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawFocusArea(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
  ): void {
    const boxWidth = Math.min(width * 0.35, 480);
    const boxHeight = Math.min(height * 0.42, 360);

    ctx.save();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 28, centerY);
    ctx.lineTo(centerX + 28, centerY);
    ctx.moveTo(centerX, centerY - 28);
    ctx.lineTo(centerX, centerY + 28);
    ctx.stroke();
    ctx.restore();
  }
}

export const quickAnnotationService = new QuickAnnotationService();
