/**
 * FaceXFormer Service – stub
 * Provides face analysis via FaceXFormer model
 */

export type FaceAnalysisTask = 'all' | 'parsing' | 'landmarks' | 'headpose' | 'attributes';

export interface FaceAnalysisResult {
  results: {
    face?: string;
    parsing?: string;
    parsing_visualization?: string;
    landmarks?: Array<[number, number]>;
    landmarks_visualization?: string;
    headpose?: { pitch: number; yaw: number; roll: number };
    headpose_visualization?: string;
    attributes?: number[];
    sam2_mask?: unknown;
    sam2_bbox?: unknown;
  };
}

class FaceXFormerService {
  async analyzeFace(
    image: File,
    task: FaceAnalysisTask | string,
    model: string
  ): Promise<FaceAnalysisResult> {
    // TODO: connect to actual FaceXFormer backend
    console.warn('FaceXFormerService.analyzeFace called – service not yet configured', { image, task, model });
    return { results: {} };
  }
}

export const faceXFormerService = new FaceXFormerService();
