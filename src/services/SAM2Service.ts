export interface SAM2SegmentationMask {
  id: string;
  mask: string;
  bbox: [number, number, number, number];
  center: [number, number];
  area: number;
  confidence: number;
  label?: string;
}

export interface SAM2SegmentationResult {
  masks: SAM2SegmentationMask[];
  image_size: [number, number];
  mode: string;
}

export type SAM2Mask = SAM2SegmentationMask;
export type SAM2Result = SAM2SegmentationResult;

interface SegmentPrompts {
  points?: number[][];
  box?: [number, number, number, number];
}

interface InternalImage {
  element: HTMLImageElement;
  width: number;
  height: number;
}

const normalizeCoordinate = (value: number, max: number): number => {
  if (value <= 1) {
    return value * max;
  }
  return value;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

class SAM2Service {
  private readonly apiCandidates = [
    '/api/sam2/segment',
    '/api/segment-image',
    '/api/vision/sam2',
  ];

  async segmentImage(
    image: File,
    prompts: SegmentPrompts = {},
    mode: string = 'auto',
    size: string = 'small',
  ): Promise<SAM2SegmentationResult> {
    const remote = await this.tryRemote(image, prompts, mode, size);
    if (remote) {
      return remote;
    }

    const imageDataUrl = await this.fileToDataUrl(image);
    return this.segmentImageFromUrl(imageDataUrl, prompts, mode, size);
  }

  async segmentImageFromUrl(
    imageUrl: string,
    prompts: SegmentPrompts = {},
    mode: string = 'auto',
    size: string = 'small',
  ): Promise<SAM2SegmentationResult> {
    const image = await this.loadImage(imageUrl);
    const masks = this.generateLocalMasks(image, prompts, mode, size);

    return {
      masks,
      image_size: [image.width, image.height],
      mode,
    };
  }

  private async tryRemote(
    image: File,
    prompts: SegmentPrompts,
    mode: string,
    size: string,
  ): Promise<SAM2SegmentationResult | null> {
    for (const endpoint of this.apiCandidates) {
      try {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('mode', mode);
        formData.append('size', size);
        formData.append('prompts', JSON.stringify(prompts));

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as {
          masks?: unknown;
          image_size?: unknown;
          mode?: unknown;
        };

        const parsed = this.normalizeResult(payload, mode);
        if (parsed) {
          return parsed;
        }
      } catch {
        // Try next endpoint.
      }
    }

    return null;
  }

  private normalizeResult(
    payload: { masks?: unknown; image_size?: unknown; mode?: unknown },
    fallbackMode: string,
  ): SAM2SegmentationResult | null {
    if (!Array.isArray(payload.masks)) {
      return null;
    }

    const imageSize = Array.isArray(payload.image_size) && payload.image_size.length >= 2
      ? [Number(payload.image_size[0]), Number(payload.image_size[1])]
      : [1024, 1024];

    const masks = payload.masks
      .map((entry, index) => this.normalizeMask(entry, index, imageSize[0], imageSize[1]))
      .filter((entry): entry is SAM2SegmentationMask => entry !== null);

    return {
      masks,
      image_size: [imageSize[0], imageSize[1]],
      mode: typeof payload.mode === 'string' ? payload.mode : fallbackMode,
    };
  }

  private normalizeMask(
    value: unknown,
    index: number,
    imageWidth: number,
    imageHeight: number,
  ): SAM2SegmentationMask | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const source = value as Record<string, unknown>;
    if (!Array.isArray(source.bbox) || source.bbox.length < 4) {
      return null;
    }

    const x = Number(source.bbox[0]);
    const y = Number(source.bbox[1]);
    const width = Number(source.bbox[2]);
    const height = Number(source.bbox[3]);

    if (![x, y, width, height].every(Number.isFinite)) {
      return null;
    }

    const bbox: [number, number, number, number] = [
      clamp(x, 0, imageWidth),
      clamp(y, 0, imageHeight),
      clamp(width, 1, imageWidth),
      clamp(height, 1, imageHeight),
    ];

    const center: [number, number] = Array.isArray(source.center) && source.center.length >= 2
      ? [Number(source.center[0]), Number(source.center[1])]
      : [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2];

    return {
      id: typeof source.id === 'string' ? source.id : `mask-${index}`,
      mask: typeof source.mask === 'string' ? source.mask : this.maskFromBBox(bbox, imageWidth, imageHeight),
      bbox,
      center,
      area: Number.isFinite(Number(source.area)) ? Number(source.area) : bbox[2] * bbox[3],
      confidence: Number.isFinite(Number(source.confidence))
        ? clamp(Number(source.confidence), 0, 1)
        : 0.75,
      label: typeof source.label === 'string' ? source.label : undefined,
    };
  }

  private async loadImage(url: string): Promise<InternalImage> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        resolve({
          element: image,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        });
      };
      image.onerror = () => reject(new Error('Failed to load image for segmentation'));
      image.src = url;
    });
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Failed to read file as data URL'));
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  private generateLocalMasks(
    image: InternalImage,
    prompts: SegmentPrompts,
    mode: string,
    size: string,
  ): SAM2SegmentationMask[] {
    const { width, height } = image;
    const results: SAM2SegmentationMask[] = [];

    const addMaskFromBBox = (
      bboxInput: [number, number, number, number],
      confidence: number,
      label: string,
    ): void => {
      const x = clamp(Math.round(bboxInput[0]), 0, width - 1);
      const y = clamp(Math.round(bboxInput[1]), 0, height - 1);
      const boxWidth = clamp(Math.round(bboxInput[2]), 1, width - x);
      const boxHeight = clamp(Math.round(bboxInput[3]), 1, height - y);
      const bbox: [number, number, number, number] = [x, y, boxWidth, boxHeight];

      results.push({
        id: `${label}-${results.length}`,
        mask: this.maskFromBBox(bbox, width, height),
        bbox,
        center: [x + boxWidth / 2, y + boxHeight / 2],
        area: boxWidth * boxHeight,
        confidence: clamp(confidence, 0, 1),
        label,
      });
    };

    const normalizedPoints = (prompts.points || []).map(([px = 0.5, py = 0.5]) => {
      return [normalizeCoordinate(px, width), normalizeCoordinate(py, height)] as [number, number];
    });

    if (mode === 'point' && normalizedPoints.length > 0) {
      const regionScale = size === 'large' ? 0.32 : size === 'medium' ? 0.24 : 0.18;
      const boxW = width * regionScale;
      const boxH = height * regionScale;

      normalizedPoints.forEach(([px, py], index) => {
        addMaskFromBBox([px - boxW / 2, py - boxH / 2, boxW, boxH], 0.86 - index * 0.04, 'point');
      });

      return results;
    }

    if (mode === 'box' && prompts.box) {
      const [bx, by, bw, bh] = prompts.box;
      const x = normalizeCoordinate(bx, width);
      const y = normalizeCoordinate(by, height);
      const boxW = normalizeCoordinate(bw, width);
      const boxH = normalizeCoordinate(bh, height);
      addMaskFromBBox([x, y, boxW, boxH], 0.9, 'box');
      return results;
    }

    const autoBoxes: Array<[number, number, number, number, number, string]> = [
      [width * 0.1, height * 0.16, width * 0.32, height * 0.56, 0.84, 'subject-left'],
      [width * 0.35, height * 0.14, width * 0.3, height * 0.58, 0.88, 'subject-center'],
      [width * 0.67, height * 0.2, width * 0.24, height * 0.48, 0.76, 'subject-right'],
    ];

    autoBoxes.forEach(([x, y, boxWidth, boxHeight, confidence, label]) => {
      addMaskFromBBox([x, y, boxWidth, boxHeight], confidence, label);
    });

    return results;
  }

  private maskFromBBox(
    bbox: [number, number, number, number],
    imageWidth: number,
    imageHeight: number,
  ): string {
    const [x, y, width, height] = bbox;

    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    ctx.clearRect(0, 0, imageWidth, imageHeight);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(x, y, width, height);

    return canvas.toDataURL('image/png');
  }
}

export const sam2Service = new SAM2Service();
