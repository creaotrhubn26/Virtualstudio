export type ShotSuggestionType = 'angle' | 'lighting' | 'composition';

export interface LightingAdjustment {
  lightId: string;
  position?: [number, number, number];
  intensity?: number;
}

export interface ShotSuggestion {
  id: string;
  type: ShotSuggestionType;
  name: string;
  description: string;
  expectedScore: number;
  cameraPosition: [number, number, number];
  cameraRotation: [number, number, number];
  lightingAdjustments?: LightingAdjustment[];
}

interface ImageMetrics {
  brightness: number;
  contrast: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const pseudoSeedFromText = (text: string): number => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
};

const seeded = (seed: number, offset: number): number => {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
};

class AIShotSuggestionService {
  private readonly apiCandidates = [
    '/api/virtual-studio/shot-suggestions',
    '/api/shot-suggestions',
  ];

  async generateSuggestions(imageUrl: string): Promise<ShotSuggestion[]> {
    const fromApi = await this.tryRemoteSuggestions(imageUrl);
    if (fromApi.length > 0) {
      return fromApi;
    }

    const metrics = await this.analyzeImage(imageUrl);
    return this.buildLocalSuggestions(imageUrl, metrics);
  }

  private async tryRemoteSuggestions(imageUrl: string): Promise<ShotSuggestion[]> {
    for (const endpoint of this.apiCandidates) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as { suggestions?: unknown };
        if (!Array.isArray(payload.suggestions)) {
          continue;
        }

        return payload.suggestions
          .map((item, index) => this.normalizeSuggestion(item, index))
          .filter((item): item is ShotSuggestion => item !== null);
      } catch {
        // Try next endpoint.
      }
    }

    return [];
  }

  private normalizeSuggestion(value: unknown, index: number): ShotSuggestion | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    const type = candidate.type;
    if (type !== 'angle' && type !== 'lighting' && type !== 'composition') {
      return null;
    }

    const toVec3 = (raw: unknown, fallback: [number, number, number]): [number, number, number] => {
      if (!Array.isArray(raw) || raw.length < 3) {
        return fallback;
      }

      const x = Number(raw[0]);
      const y = Number(raw[1]);
      const z = Number(raw[2]);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        return [x, y, z];
      }
      return fallback;
    };

    const cameraPosition = toVec3(candidate.cameraPosition, [0, 1.6, 3]);
    const cameraRotation = toVec3(candidate.cameraRotation, [0, 0, 0]);

    const lightingAdjustments = Array.isArray(candidate.lightingAdjustments)
      ? candidate.lightingAdjustments
          .map((entry) => this.normalizeLightingAdjustment(entry))
          .filter((entry): entry is LightingAdjustment => entry !== null)
      : undefined;

    return {
      id: typeof candidate.id === 'string' ? candidate.id : `api-suggestion-${index}`,
      type,
      name: typeof candidate.name === 'string' ? candidate.name : `Suggestion ${index + 1}`,
      description:
        typeof candidate.description === 'string'
          ? candidate.description
          : 'Camera and lighting refinement suggestion.',
      expectedScore: clamp(Number(candidate.expectedScore) || 70, 1, 100),
      cameraPosition,
      cameraRotation,
      lightingAdjustments,
    };
  }

  private normalizeLightingAdjustment(value: unknown): LightingAdjustment | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    const lightId = typeof candidate.lightId === 'string' ? candidate.lightId : null;
    if (!lightId) {
      return null;
    }

    let position: [number, number, number] | undefined;
    if (Array.isArray(candidate.position) && candidate.position.length >= 3) {
      const x = Number(candidate.position[0]);
      const y = Number(candidate.position[1]);
      const z = Number(candidate.position[2]);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        position = [x, y, z];
      }
    }

    const intensityNumber = Number(candidate.intensity);
    const intensity = Number.isFinite(intensityNumber)
      ? clamp(intensityNumber, 0, 400)
      : undefined;

    return {
      lightId,
      position,
      intensity,
    };
  }

  private async analyzeImage(imageUrl: string): Promise<ImageMetrics> {
    return new Promise<ImageMetrics>((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const width = 128;
        const height = 128;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ brightness: 0.55, contrast: 0.3 });
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);

        try {
          const data = ctx.getImageData(0, 0, width, height).data;
          let sum = 0;
          let sqSum = 0;
          const pixelCount = width * height;

          for (let i = 0; i < data.length; i += 4) {
            const luminance =
              0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            sum += luminance;
            sqSum += luminance * luminance;
          }

          const mean = sum / pixelCount;
          const variance = Math.max(0, sqSum / pixelCount - mean * mean);
          const std = Math.sqrt(variance);

          resolve({
            brightness: clamp(mean / 255, 0, 1),
            contrast: clamp(std / 128, 0, 1),
          });
        } catch {
          resolve({ brightness: 0.55, contrast: 0.3 });
        }
      };

      image.onerror = () => resolve({ brightness: 0.55, contrast: 0.3 });
      image.src = imageUrl;
    });
  }

  private buildLocalSuggestions(imageUrl: string, metrics: ImageMetrics): ShotSuggestion[] {
    const seed = pseudoSeedFromText(imageUrl);
    const brightnessBias = metrics.brightness - 0.5;
    const contrastBias = metrics.contrast - 0.4;

    const angleSuggestion: ShotSuggestion = {
      id: `local-angle-${seed}`,
      type: 'angle',
      name: 'Dynamic Hero Angle',
      description:
        'Shift camera slightly lower with an oblique yaw to add depth and perceived subject authority.',
      expectedScore: clamp(Math.round(76 + contrastBias * 18), 1, 100),
      cameraPosition: [
        Number((seeded(seed, 1) * 1.4 - 0.7).toFixed(2)),
        Number((1.45 - brightnessBias * 0.35).toFixed(2)),
        Number((2.5 + seeded(seed, 2) * 1.3).toFixed(2)),
      ],
      cameraRotation: [0, Number((seeded(seed, 3) * 0.45 - 0.22).toFixed(2)), 0],
    };

    const lightingSuggestion: ShotSuggestion = {
      id: `local-light-${seed}`,
      type: 'lighting',
      name: 'Key/Fill Rebalance',
      description:
        brightnessBias > 0
          ? 'Highlights are slightly hot; pull key intensity and lift controlled fill from camera right.'
          : 'Frame is slightly dark; lift key and add gentle rim for separation from background.',
      expectedScore: clamp(Math.round(74 + (0.5 - Math.abs(brightnessBias)) * 30), 1, 100),
      cameraPosition: [0, 1.6, 3],
      cameraRotation: [0, 0, 0],
      lightingAdjustments: [
        {
          lightId: 'key',
          position: [-1.9, 2.2, 1.1],
          intensity: clamp(Math.round(120 - brightnessBias * 55), 60, 220),
        },
        {
          lightId: 'fill',
          position: [1.6, 1.9, 1.4],
          intensity: clamp(Math.round(80 + brightnessBias * 40), 30, 170),
        },
      ],
    };

    const compositionSuggestion: ShotSuggestion = {
      id: `local-composition-${seed}`,
      type: 'composition',
      name: 'Thirds + Lead Space',
      description:
        'Move subject center near the upper-left third and leave forward lead space to improve visual flow.',
      expectedScore: clamp(Math.round(72 + contrastBias * 12 + (0.5 - Math.abs(brightnessBias)) * 14), 1, 100),
      cameraPosition: [
        Number((0.25 + seeded(seed, 4) * 0.4).toFixed(2)),
        Number((1.55 + seeded(seed, 5) * 0.3).toFixed(2)),
        2.9,
      ],
      cameraRotation: [0, Number((seeded(seed, 6) * 0.2 - 0.1).toFixed(2)), 0],
    };

    return [angleSuggestion, lightingSuggestion, compositionSuggestion];
  }
}

export const aiShotSuggestionService = new AIShotSuggestionService();
