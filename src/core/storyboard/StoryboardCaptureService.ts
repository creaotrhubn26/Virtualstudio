import type { CameraAngle, ShotType, StoryboardFrame } from '../../state/storyboardStore';

type SceneSnapshot = NonNullable<StoryboardFrame['sceneSnapshot']>;

interface CaptureOptions {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

interface CaptureResult {
  imageUrl: string;
  thumbnailUrl: string;
  sceneSnapshot: SceneSnapshot;
}

interface CameraLike {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  fov?: number;
  aperture?: number;
}

class StoryboardCaptureService {
  private renderer: unknown = null;
  private scene: unknown = null;
  private camera: CameraLike | null = null;
  private initialized = false;
  private lastSnapshot: SceneSnapshot | null = null;

  initialize(renderer?: unknown, scene?: unknown, camera?: unknown): void {
    this.renderer = renderer ?? null;
    this.scene = scene ?? null;
    this.camera = this.normalizeCamera(camera);
    this.initialized = true;
  }

  isReady(): boolean {
    return this.initialized;
  }

  async capture(options: CaptureOptions = {}): Promise<CaptureResult> {
    const canvasSource = this.resolveCanvas();
    const width = options.width ?? canvasSource?.width ?? 1280;
    const height = options.height ?? canvasSource?.height ?? 720;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context for capture');
    }

    if (canvasSource) {
      ctx.drawImage(canvasSource, 0, 0, width, height);
    } else {
      this.drawFallbackFrame(ctx, width, height);
    }

    const format = options.format ?? 'jpeg';
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    const quality = Math.max(0.1, Math.min(1, options.quality ?? 0.92));
    const imageUrl = exportCanvas.toDataURL(mimeType, quality);

    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = 320;
    thumbnailCanvas.height = 180;
    const thumbnailCtx = thumbnailCanvas.getContext('2d');
    if (!thumbnailCtx) {
      throw new Error('Failed to create thumbnail canvas context');
    }

    thumbnailCtx.drawImage(exportCanvas, 0, 0, 320, 180);
    const thumbnailUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.82);

    const sceneSnapshot = this.createSceneSnapshot();
    this.lastSnapshot = sceneSnapshot;

    return {
      imageUrl,
      thumbnailUrl,
      sceneSnapshot,
    };
  }

  async captureFrame(): Promise<CaptureResult> {
    return this.capture();
  }

  detectShotType(): ShotType {
    const focalLength = this.lastSnapshot?.camera.focalLength ?? 50;

    if (focalLength <= 24) {
      return 'Wide';
    }

    if (focalLength <= 50) {
      return 'Medium';
    }

    if (focalLength <= 100) {
      return 'Close-up';
    }

    return 'Detail';
  }

  detectCameraAngle(): CameraAngle {
    const cameraY = this.lastSnapshot?.camera.position[1] ?? 1.6;

    if (cameraY >= 3) {
      return 'Birds Eye';
    }

    if (cameraY >= 2.1) {
      return 'High Angle';
    }

    if (cameraY <= 0.9) {
      return 'Low Angle';
    }

    return 'Eye Level';
  }

  loadSceneSnapshot(snapshot?: StoryboardFrame['sceneSnapshot']): void {
    if (!snapshot) {
      return;
    }

    this.lastSnapshot = snapshot;

    window.dispatchEvent(
      new CustomEvent('ch-load-scene-snapshot', {
        detail: { snapshot },
      }),
    );
  }

  private resolveCanvas(): HTMLCanvasElement | null {
    const rendererCandidate = this.renderer as { domElement?: HTMLCanvasElement } | null;
    if (rendererCandidate?.domElement instanceof HTMLCanvasElement) {
      return rendererCandidate.domElement;
    }

    const current = document.querySelector('canvas#virtual-studio-canvas');
    if (current instanceof HTMLCanvasElement) {
      return current;
    }

    const anyCanvas = document.querySelector('canvas');
    return anyCanvas instanceof HTMLCanvasElement ? anyCanvas : null;
  }

  private drawFallbackFrame(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#16162a');
    gradient.addColorStop(1, '#090914');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `${Math.max(24, Math.round(width * 0.03))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Storyboard Capture', width / 2, height / 2 - 10);
    ctx.font = `${Math.max(14, Math.round(width * 0.012))}px system-ui, sans-serif`;
    ctx.fillText(new Date().toLocaleString(), width / 2, height / 2 + 22);
  }

  private normalizeCamera(camera: unknown): CameraLike | null {
    if (!camera || typeof camera !== 'object') {
      return null;
    }

    const record = camera as Record<string, unknown>;
    const position = this.toVector(record.position);
    const rotation = this.toVector(record.rotation);

    return {
      position: position ?? { x: 0, y: 1.6, z: 3 },
      rotation: rotation ?? { x: 0, y: 0, z: 0 },
      fov: Number.isFinite(Number(record.fov)) ? Number(record.fov) : undefined,
      aperture: Number.isFinite(Number(record.aperture)) ? Number(record.aperture) : undefined,
    };
  }

  private toVector(value: unknown): { x: number; y: number; z: number } | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const x = Number(record.x);
    const y = Number(record.y);
    const z = Number(record.z);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return null;
    }

    return { x, y, z };
  }

  private createSceneSnapshot(): SceneSnapshot {
    const cameraPosition = this.camera?.position ?? { x: 0, y: 1.6, z: 3 };
    const cameraRotation = this.camera?.rotation ?? { x: 0, y: 0, z: 0 };
    const fov = this.camera?.fov ?? 0.8;
    const focalLength = Math.round((35 / Math.max(fov, 0.1)) * 1.4);

    return {
      camera: {
        position: [cameraPosition.x, cameraPosition.y, cameraPosition.z],
        rotation: [cameraRotation.x, cameraRotation.y, cameraRotation.z],
        focalLength,
        aperture: this.camera?.aperture ?? 2.8,
      },
      lights: this.extractLightsFromScene(),
    };
  }

  private extractLightsFromScene(): SceneSnapshot['lights'] {
    const sceneRecord = this.scene as { lights?: unknown } | null;
    if (!sceneRecord?.lights || !Array.isArray(sceneRecord.lights)) {
      return [];
    }

    return sceneRecord.lights
      .map((light, index) => {
        if (!light || typeof light !== 'object') {
          return null;
        }

        const source = light as Record<string, unknown>;
        const position = this.toVector(source.position) ?? { x: 0, y: 2.5, z: 0 };

        return {
          id: typeof source.id === 'string' ? source.id : `light-${index}`,
          type: typeof source.type === 'string' ? source.type : 'point',
          position: [position.x, position.y, position.z] as [number, number, number],
          intensity: Number.isFinite(Number(source.intensity)) ? Number(source.intensity) : 1,
        };
      })
      .filter((light): light is SceneSnapshot['lights'][number] => light !== null);
  }
}

export const storyboardCaptureService = new StoryboardCaptureService();
