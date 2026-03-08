export type ACESColorSpace =
  | 'ACES2065-1'
  | 'ACEScg'
  | 'ACEScct'
  | 'sRGB'
  | 'Rec709'
  | 'Rec2020'
  | 'DCI-P3';

export interface ACESConfig {
  inputColorSpace: ACESColorSpace;
  outputColorSpace: ACESColorSpace;
  enableRRT: boolean;
  useFullRRT: boolean;
  enableLMT: boolean;
  lmtPreset?: string;
  exposure: number;
  gamma: number;
}

export interface ACESLMTPreset {
  id: string;
  name: string;
  description: string;
  exposureOffset: number;
  saturation: number;
  contrast: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const lmtPresets: ACESLMTPreset[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'No look modification; keeps source intent.',
    exposureOffset: 0,
    saturation: 1,
    contrast: 1,
  },
  {
    id: 'filmic_warm',
    name: 'Filmic Warm',
    description: 'Warm cinematic look with gentle contrast lift.',
    exposureOffset: 0.2,
    saturation: 1.08,
    contrast: 1.12,
  },
  {
    id: 'cool_drama',
    name: 'Cool Drama',
    description: 'Cooler mid-tones for moody scenes.',
    exposureOffset: -0.1,
    saturation: 0.94,
    contrast: 1.18,
  },
  {
    id: 'commercial_clean',
    name: 'Commercial Clean',
    description: 'High clarity with balanced contrast for product visuals.',
    exposureOffset: 0.1,
    saturation: 1.02,
    contrast: 1.08,
  },
  {
    id: 'print_soft',
    name: 'Print Soft',
    description: 'Soft print-like rolloff and reduced contrast.',
    exposureOffset: 0,
    saturation: 0.96,
    contrast: 0.92,
  },
];

class ACESService {
  readonly DEFAULT_CONFIG: ACESConfig = {
    inputColorSpace: 'ACEScg',
    outputColorSpace: 'sRGB',
    enableRRT: true,
    useFullRRT: true,
    enableLMT: false,
    lmtPreset: 'neutral',
    exposure: 0,
    gamma: 1,
  };

  getLMTPresets(): ACESLMTPreset[] {
    return [...lmtPresets];
  }

  getPresetById(id?: string): ACESLMTPreset {
    if (!id) {
      return lmtPresets[0];
    }

    const preset = lmtPresets.find((item) => item.id === id);
    return preset ?? lmtPresets[0];
  }

  applyColorPipeline(color: RGBColor, config: ACESConfig): RGBColor {
    const preset = config.enableLMT ? this.getPresetById(config.lmtPreset) : undefined;

    const exposureStops = config.exposure + (preset?.exposureOffset ?? 0);
    const exposureMultiplier = Math.pow(2, exposureStops);

    let r = color.r * exposureMultiplier;
    let g = color.g * exposureMultiplier;
    let b = color.b * exposureMultiplier;

    if (preset) {
      const luma = (r + g + b) / 3;
      r = luma + (r - luma) * preset.saturation;
      g = luma + (g - luma) * preset.saturation;
      b = luma + (b - luma) * preset.saturation;

      r = (r - 0.5) * preset.contrast + 0.5;
      g = (g - 0.5) * preset.contrast + 0.5;
      b = (b - 0.5) * preset.contrast + 0.5;
    }

    if (config.enableRRT) {
      const shoulder = config.useFullRRT ? 1.45 : 1.2;
      r = r / (r + shoulder);
      g = g / (g + shoulder);
      b = b / (b + shoulder);
    }

    const invGamma = 1 / Math.max(0.01, config.gamma);
    r = Math.pow(clamp01(r), invGamma);
    g = Math.pow(clamp01(g), invGamma);
    b = Math.pow(clamp01(b), invGamma);

    return {
      r: clamp01(r),
      g: clamp01(g),
      b: clamp01(b),
    };
  }

  validateConfig(config: ACESConfig): ACESConfig {
    const colorSpaces: ACESColorSpace[] = [
      'ACES2065-1',
      'ACEScg',
      'ACEScct',
      'sRGB',
      'Rec709',
      'Rec2020',
      'DCI-P3',
    ];

    const safeInput = colorSpaces.includes(config.inputColorSpace)
      ? config.inputColorSpace
      : this.DEFAULT_CONFIG.inputColorSpace;

    const safeOutput = colorSpaces.includes(config.outputColorSpace)
      ? config.outputColorSpace
      : this.DEFAULT_CONFIG.outputColorSpace;

    return {
      ...config,
      inputColorSpace: safeInput,
      outputColorSpace: safeOutput,
      exposure: Math.max(-5, Math.min(5, config.exposure)),
      gamma: Math.max(0.5, Math.min(2.5, config.gamma)),
      lmtPreset: this.getPresetById(config.lmtPreset).id,
    };
  }
}

export const acesService = new ACESService();
