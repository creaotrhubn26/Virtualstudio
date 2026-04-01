import { logger } from './logger';

const log = logger.module('MonitorFeedService');

export type MonitorLayout = 'single' | '2x1' | '2x2' | 'pip';

interface CameraData {
  id: string;
  name: string;
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  camera?: {
    focalLength?: number;
    aperture?: number;
    iso?: number;
    shutter?: number;
  };
}

interface MonitorConfig {
  layout: MonitorLayout;
  showTimecode: boolean;
  showSafeAreas: boolean;
  showCameraInfo: boolean;
}

class MonitorFeedRenderer {
  private cameras: Map<string, CameraData> = new Map();
  private activeCameraId: string | null = null;
  private config: MonitorConfig = {
    layout: 'single',
    showTimecode: true,
    showSafeAreas: true,
    showCameraInfo: true,
  };

  registerCamera(camera: CameraData) {
    this.cameras.set(camera.id, camera);
    log.debug('Registered camera:', camera.name);
  }

  unregisterCamera(cameraId: string) {
    this.cameras.delete(cameraId);
  }

  setActiveCamera(cameraId: string) {
    if (this.cameras.has(cameraId)) {
      this.activeCameraId = cameraId;
      log.debug('Set active camera:', cameraId);
    }
  }

  getActiveCamera(): CameraData | null {
    if (!this.activeCameraId) return null;
    return this.cameras.get(this.activeCameraId) || null;
  }

  render(canvas?: HTMLCanvasElement): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = this.getActiveCamera();
    if (cam) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(`CAM: ${cam.name}`, 8, 20);
    }
  }

  setScene(_scene: unknown): void {
  }

  setConfig(config: Partial<MonitorConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MonitorConfig {
    return this.config;
  }

  cycleCamera() {
    const cameraIds = Array.from(this.cameras.keys());
    if (cameraIds.length === 0) return;
    
    const currentIndex = this.activeCameraId ? cameraIds.indexOf(this.activeCameraId) : -1;
    const nextIndex = (currentIndex + 1) % cameraIds.length;
    this.setActiveCamera(cameraIds[nextIndex]);
  }

  toggleRecording(cameraId: string) {
    log.debug('Toggle recording for camera:', cameraId);
  }
}

class MonitorFeedService {
  private renderer: MonitorFeedRenderer | null = null;

  init(_width?: number, _height?: number): MonitorFeedRenderer {
    if (!this.renderer) {
      this.renderer = new MonitorFeedRenderer();
    }
    return this.renderer;
  }

  getRenderer(): MonitorFeedRenderer | null {
    return this.renderer;
  }
}

export const monitorFeedService = new MonitorFeedService();
export type MonitorRenderer = MonitorFeedRenderer;
