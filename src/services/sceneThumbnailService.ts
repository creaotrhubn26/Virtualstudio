import { SceneComposition } from '../core/models/sceneComposer';

interface ThumbnailJob {
  sceneId: string;
  scene: SceneComposition;
}

const STORAGE_NAMESPACE = 'virtualStudio_scene_thumbnails';

const safeParse = (value: string | null): Record<string, string> => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

export class SceneThumbnailService {
  private thumbnailQueue: ThumbnailJob[] = [];
  private isProcessing = false;
  private thumbnailCache = new Map<string, string>();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = safeParse(localStorage.getItem(STORAGE_NAMESPACE));
      Object.entries(stored).forEach(([sceneId, dataUrl]) => {
        this.thumbnailCache.set(sceneId, dataUrl);
      });
    }
  }

  async generateThumbnail(sceneId: string, scene: SceneComposition): Promise<string> {
    if (scene.thumbnail) {
      this.thumbnailCache.set(sceneId, scene.thumbnail);
      this.persistCache();
      return scene.thumbnail;
    }

    const cached = this.thumbnailCache.get(sceneId);
    if (cached) {
      this.enqueue(sceneId, scene);
      return cached;
    }

    const immediateThumbnail = this.renderSceneSummary(scene);
    this.thumbnailCache.set(sceneId, immediateThumbnail);
    this.persistCache();
    this.enqueue(sceneId, scene);

    return immediateThumbnail;
  }

  getCachedThumbnail(sceneId: string): string | null {
    return this.thumbnailCache.get(sceneId) ?? null;
  }

  cancel(sceneId: string): void {
    this.thumbnailQueue = this.thumbnailQueue.filter((job) => job.sceneId !== sceneId);
  }

  clearQueue(): void {
    this.thumbnailQueue = [];
  }

  private enqueue(sceneId: string, scene: SceneComposition): void {
    const existingIndex = this.thumbnailQueue.findIndex((job) => job.sceneId === sceneId);
    if (existingIndex >= 0) {
      this.thumbnailQueue[existingIndex] = { sceneId, scene };
    } else {
      this.thumbnailQueue.push({ sceneId, scene });
    }

    if (!this.isProcessing) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.thumbnailQueue.length > 0) {
      const job = this.thumbnailQueue.shift();
      if (!job) {
        continue;
      }

      try {
        const thumbnail = this.renderSceneSummary(job.scene);
        this.thumbnailCache.set(job.sceneId, thumbnail);
        this.persistCache();

        window.dispatchEvent(
          new CustomEvent('ch-scene-thumbnail-generated', {
            detail: {
              sceneId: job.sceneId,
              thumbnail,
            },
          }),
        );
      } catch (error) {
        console.error(`Error generating thumbnail for scene ${job.sceneId}:`, error);
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    this.isProcessing = false;
  }

  private persistCache(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload = Object.fromEntries(this.thumbnailCache.entries());
    localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(payload));
  }

  private renderSceneSummary(scene: SceneComposition): string {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    const gradient = ctx.createLinearGradient(0, 0, 320, 180);
    gradient.addColorStop(0, '#121a29');
    gradient.addColorStop(1, '#0d111a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 180);

    const lightCount = scene.lights.length;
    const actorCount = scene.actors.length;
    const propCount = scene.props.length;
    const cameraCount = scene.cameras.length;

    const circles = [
      { x: 58, y: 62, value: lightCount, color: '#f59e0b', label: 'Lights' },
      { x: 132, y: 62, value: actorCount, color: '#38bdf8', label: 'Actors' },
      { x: 206, y: 62, value: propCount, color: '#a78bfa', label: 'Props' },
      { x: 280, y: 62, value: cameraCount, color: '#34d399', label: 'Cams' },
    ];

    circles.forEach((item) => {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = item.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(item.value), item.x, item.y + 5);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(item.label, item.x, item.y + 40);
    });

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(scene.name.slice(0, 32), 16, 132);

    if (scene.description) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(scene.description.slice(0, 44), 16, 150);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`Updated ${new Date(scene.updatedAt).toLocaleDateString()}`, 16, 168);

    return canvas.toDataURL('image/png');
  }
}

export const sceneThumbnailService = new SceneThumbnailService();
