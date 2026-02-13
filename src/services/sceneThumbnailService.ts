import { SceneComposition } from '../core/models/sceneComposer';

export class SceneThumbnailService {
  private thumbnailQueue: string[] = [];
  private isProcessing: boolean = false;

  /**
   * Generate thumbnail in background
   */
  async generateThumbnail(sceneId: string, scene: SceneComposition): Promise<string> {
    // Add to queue
    this.thumbnailQueue.push(sceneId);

    // Process queue
    if (!this.isProcessing) {
      this.processQueue();
    }

    // For now, return a placeholder
    // In production, this would capture actual scene screenshot
    return this.generatePlaceholderThumbnail(scene.name);
  }

  /**
   * Process thumbnail queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.thumbnailQueue.length === 0) return;

    this.isProcessing = true;

    while (this.thumbnailQueue.length > 0) {
      const sceneId = this.thumbnailQueue.shift();
      if (!sceneId) break;

      try {
        // Generate thumbnail (would use actual scene rendering)
        await this.generateThumbnailForScene(sceneId);
      } catch (error) {
        console.error(`Error generating thumbnail for scene ${sceneId}:`, error);
      }

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Generate thumbnail for a specific scene
   */
  private async generateThumbnailForScene(sceneId: string): Promise<void> {
    // This would trigger actual scene rendering and capture
    // For now, it's a placeholder
    console.log(`Generating thumbnail for scene: ${sceneId}`);
  }

  /**
   * Generate placeholder thumbnail
   */
  private generatePlaceholderThumbnail(label?: string): string {
    // Create a simple colored canvas as placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1c2128';
      ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = '#00d4ff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Scene Preview', 160, 90);
      if (label) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#9ddcff';
        ctx.fillText(label.substring(0, 20), 160, 120);
      }
    }
    return canvas.toDataURL('image/png');
  }

  /**
   * Cancel thumbnail generation
   */
  cancel(sceneId: string): void {
    this.thumbnailQueue = this.thumbnailQueue.filter(id => id !== sceneId);
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.thumbnailQueue = [];
  }
}

export const sceneThumbnailService = new SceneThumbnailService();

