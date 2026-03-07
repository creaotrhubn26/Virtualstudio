/**
 * StoryboardFrameDrawingService
 * 
 * Service for managing frame drawings, persistence, and canvas operations
 */

import { 
  FrameDrawingData, 
  FrameImageSource,
  StoryboardFrame,
  useStoryboardStore 
} from '../../state/storyboardStore';
import { PencilStroke, PencilPoint } from '../../hooks/useApplePencil';
import settingsService, { getCurrentUserId } from '../../services/settingsService';

// =============================================================================
// Types
// =============================================================================

export interface DrawingExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0-1 for jpeg/webp
  maxWidth?: number;
  maxHeight?: number;
  backgroundColor?: string;
}

export interface DrawingMetadata {
  frameId: string;
  storyboardId: string;
  sceneId?: string;
  manuscriptId?: string;
  aspectRatio: string;
  deviceType: 'pencil' | 'touch' | 'mouse';
  strokeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDrawing {
  id: string;
  metadata: DrawingMetadata;
  drawingData: FrameDrawingData;
  thumbnailUrl?: string;
}

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  DRAWINGS: 'virtualstudio_frame_drawings',
  DRAWING_INDEX: 'virtualstudio_drawing_index',
};

// =============================================================================
// Canvas Utilities
// =============================================================================

/**
 * Convert canvas to data URL with options
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  options: DrawingExportOptions = { format: 'png', quality: 0.92 }
): string {
  const { format, quality } = options;
  const mimeType = `image/${format}`;
  return canvas.toDataURL(mimeType, quality);
}

/**
 * Create a thumbnail from a data URL
 */
export async function createThumbnail(
  dataUrl: string,
  maxWidth: number = 200,
  maxHeight: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate thumbnail dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Resize a data URL image
 */
export async function resizeDataUrl(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// =============================================================================
// Stroke Utilities
// =============================================================================

/**
 * Serialize strokes to JSON string
 */
export function serializeStrokes(strokes: PencilStroke[]): string {
  return JSON.stringify(strokes);
}

/**
 * Deserialize strokes from JSON string
 */
export function deserializeStrokes(data: string): PencilStroke[] {
  try {
    return JSON.parse(data) as PencilStroke[];
  } catch {
    console.error('Failed to deserialize strokes');
    return [];
  }
}

/**
 * Calculate stroke statistics
 */
export function getStrokeStats(strokes: PencilStroke[]) {
  const totalPoints = strokes.reduce((sum, s) => sum + s.points.length, 0);
  const avgPressure = strokes.length > 0
    ? strokes.reduce((sum, s) => {
        const strokeAvg = s.points.reduce((ps: number, p: PencilPoint) => ps + p.pressure, 0) / s.points.length;
        return sum + strokeAvg;
      }, 0) / strokes.length
    : 0;

  return {
    strokeCount: strokes.length,
    totalPoints,
    avgPressure,
    hasPressureData: strokes.some(s => s.points.some((p: PencilPoint) => p.pressure !== 0.5)),
    hasTiltData: strokes.some(s => s.points.some((p: PencilPoint) => p.tiltX !== 0 || p.tiltY !== 0)),
  };
}

// =============================================================================
// Storage Service
// =============================================================================

class StoryboardFrameDrawingService {
  private cachedDrawings: StoredDrawing[] = [];

  constructor() {
    void this.hydrateFromSettings();
  }

  private async hydrateFromSettings(): Promise<void> {
    try {
      const userId = getCurrentUserId();
      const remote = await settingsService.getSetting<StoredDrawing[]>('virtualStudio_storyboardDrawings', { userId });
      if (remote) {
        this.cachedDrawings = remote;
      }
    } catch {
      // Ignore hydration errors
    }
  }
  /**
   * Save drawing to settings cache
   */
  async saveDrawing(
    frameId: string,
    storyboardId: string,
    drawingData: FrameDrawingData,
    metadata: Partial<DrawingMetadata> = {}
  ): Promise<StoredDrawing> {
    const storedDrawing: StoredDrawing = {
      id: `drawing-${frameId}-${Date.now()}`,
      metadata: {
        frameId,
        storyboardId,
        sceneId: metadata.sceneId,
        manuscriptId: metadata.manuscriptId,
        aspectRatio: metadata.aspectRatio || '16:9',
        deviceType: drawingData.deviceType || 'mouse',
        strokeCount: drawingData.strokes ? deserializeStrokes(drawingData.strokes).length : 0,
        createdAt: drawingData.createdAt,
        updatedAt: drawingData.updatedAt,
      },
      drawingData,
    };

    // Create thumbnail
    try {
      storedDrawing.thumbnailUrl = await createThumbnail(drawingData.dataUrl);
    } catch (error) {
      console.warn('Failed to create thumbnail:', error);
    }

    // Save to settings cache
    this.saveToStorage(storedDrawing);

    return storedDrawing;
  }

  /**
   * Load drawing from settings cache
   */
  getDrawing(frameId: string): StoredDrawing | null {
    const drawings = this.getAllDrawings();
    return drawings.find(d => d.metadata.frameId === frameId) || null;
  }

  /**
   * Get all drawings for a storyboard
   */
  getDrawingsForStoryboard(storyboardId: string): StoredDrawing[] {
    const drawings = this.getAllDrawings();
    return drawings.filter(d => d.metadata.storyboardId === storyboardId);
  }

  /**
   * Get drawings linked to a manuscript scene
   */
  getDrawingsForScene(sceneId: string): StoredDrawing[] {
    const drawings = this.getAllDrawings();
    return drawings.filter(d => d.metadata.sceneId === sceneId);
  }

  /**
   * Delete a drawing
   */
  deleteDrawing(drawingId: string): void {
    const drawings = this.getAllDrawings();
    const filtered = drawings.filter(d => d.id !== drawingId);
    this.cachedDrawings = filtered;
    void settingsService.setSetting('virtualStudio_storyboardDrawings', filtered, { userId: getCurrentUserId() });
  }

  /**
   * Clear all drawings for a frame
   */
  clearFrameDrawings(frameId: string): void {
    const drawings = this.getAllDrawings();
    const filtered = drawings.filter(d => d.metadata.frameId !== frameId);
    this.cachedDrawings = filtered;
    void settingsService.setSetting('virtualStudio_storyboardDrawings', filtered, { userId: getCurrentUserId() });
  }

  /**
   * Export drawing as downloadable file
   */
  async exportDrawing(
    drawingData: FrameDrawingData,
    filename: string,
    options: DrawingExportOptions = { format: 'png', quality: 0.92 }
  ): Promise<void> {
    const { format } = options;
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = drawingData.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Import image as background for drawing
   */
  async importBackground(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Merge drawing with background image
   */
  async mergeWithBackground(
    drawingDataUrl: string,
    backgroundUrl: string,
    width: number,
    height: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const bgImg = new Image();
      bgImg.onload = () => {
        // Draw background
        ctx.drawImage(bgImg, 0, 0, width, height);

        // Draw overlay
        const drawingImg = new Image();
        drawingImg.onload = () => {
          ctx.drawImage(drawingImg, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        drawingImg.onerror = () => reject(new Error('Failed to load drawing'));
        drawingImg.src = drawingDataUrl;
      };
      bgImg.onerror = () => reject(new Error('Failed to load background'));
      bgImg.src = backgroundUrl;
    });
  }

  // Private methods

  private getAllDrawings(): StoredDrawing[] {
    return this.cachedDrawings;
  }

  private saveToStorage(drawing: StoredDrawing): void {
    try {
      const drawings = this.getAllDrawings();
      // Replace existing or add new
      const index = drawings.findIndex(d => d.metadata.frameId === drawing.metadata.frameId);
      if (index >= 0) {
        drawings[index] = drawing;
      } else {
        drawings.push(drawing);
      }
      this.cachedDrawings = drawings;
      void settingsService.setSetting('virtualStudio_storyboardDrawings', drawings, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Failed to save drawing to storage:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storyboardFrameDrawingService = new StoryboardFrameDrawingService();

export default storyboardFrameDrawingService;
