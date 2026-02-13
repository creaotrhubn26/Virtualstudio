/**
 * Face Analysis History
 * Undo/redo support for face analysis snapshots
 */

import type { CameraAdjustment, LightingAdjustment, CompositionGuides } from './FaceAnalysisEnhancements';

export interface AnalysisSnapshot {
  id: string;
  timestamp: number;
  analysisResults: {
    headpose?: { pitch: number; yaw: number; roll: number };
    landmarks?: Array<[number, number]>;
    parsing?: unknown;
    attributes?: number[];
  };
  cameraAdjustment?: CameraAdjustment;
  lightingAdjustments?: LightingAdjustment[];
  compositionGuides?: CompositionGuides;
  sceneState?: {
    cameraNode?: unknown;
    lightNodes?: unknown;
  };
}

export interface HistoryStats {
  canUndo: boolean;
  canRedo: boolean;
  totalSnapshots: number;
}

class FaceAnalysisHistory {
  private snapshots: AnalysisSnapshot[] = [];
  private currentIndex = -1;

  getStats(): HistoryStats {
    return {
      canUndo: this.currentIndex > 0,
      canRedo: this.currentIndex < this.snapshots.length - 1,
      totalSnapshots: this.snapshots.length,
    };
  }

  addSnapshot(
    analysisResults: AnalysisSnapshot['analysisResults'],
    cameraAdjustment?: CameraAdjustment,
    lightingAdjustments?: LightingAdjustment[],
    compositionGuides?: CompositionGuides,
    sceneState?: AnalysisSnapshot['sceneState']
  ): string {
    // Trim any forward history
    this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);

    const id = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.snapshots.push({
      id,
      timestamp: Date.now(),
      analysisResults,
      cameraAdjustment,
      lightingAdjustments,
      compositionGuides,
      sceneState,
    });
    this.currentIndex = this.snapshots.length - 1;
    return id;
  }

  undo(): AnalysisSnapshot | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex--;
    return this.snapshots[this.currentIndex];
  }

  redo(): AnalysisSnapshot | null {
    if (this.currentIndex >= this.snapshots.length - 1) return null;
    this.currentIndex++;
    return this.snapshots[this.currentIndex];
  }
}

export const faceAnalysisHistory = new FaceAnalysisHistory();
