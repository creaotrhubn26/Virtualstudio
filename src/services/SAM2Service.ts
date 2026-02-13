/**
 * SAM 2 (Segment Anything Model 2) Service – stub
 * Provides image segmentation capabilities
 */

export interface SAM2Mask {
  mask: unknown;
  bbox: unknown;
}

export interface SAM2Result {
  masks: SAM2Mask[];
}

class SAM2Service {
  async segmentImage(
    image: File,
    prompts: { points?: number[][] },
    mode: string,
    size: string
  ): Promise<SAM2Result> {
    // TODO: connect to actual SAM 2 backend
    console.warn('SAM2Service.segmentImage called – service not yet configured', { image, prompts, mode, size });
    return { masks: [] };
  }
}

export const sam2Service = new SAM2Service();
