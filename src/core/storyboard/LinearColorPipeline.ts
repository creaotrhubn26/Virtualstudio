/**
 * LinearColorPipeline - Professional color grading in linear light space
 * 
 * Processes images through a non-destructive, exposure-based color correction pipeline.
 * All adjustments are applied in linear light space for physically accurate results.
 * 
 * Uses Canvas2D ImageData processing for consistency with existing codebase.
 * Future upgrade path: WebGL shaders for real-time preview performance.
 */

// =============================================================================
// Types
// =============================================================================

export interface ColorGradeSettings {
  // Exposure-based adjustments (applied in linear space)
  exposure: number;      // -5 to +5 EV stops
  highlights: number;    // -100 to +100
  shadows: number;       // -100 to +100
  whites: number;        // -100 to +100
  blacks: number;        // -100 to +100
  contrast: number;      // -100 to +100
  
  // Color adjustments
  temperature: number;   // 2000K to 10000K (neutral = 6500)
  tint: number;          // -100 to +100 (green to magenta)
  saturation: number;    // -100 to +100
  vibrance: number;      // -100 to +100
  
  // Tone curve points (optional advanced)
  toneCurve?: ToneCurvePoint[];
}

export interface ToneCurvePoint {
  input: number;  // 0-1
  output: number; // 0-1
}

export const DEFAULT_COLOR_SETTINGS: ColorGradeSettings = {
  exposure: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  contrast: 0,
  temperature: 6500,
  tint: 0,
  saturation: 0,
  vibrance: 0,
};

// Slider configuration for UI
export interface ColorSliderConfig {
  key: keyof ColorGradeSettings;
  label: string;
  labelNo: string; // Norwegian translation
  min: number;
  max: number;
  step: number;
  unit?: string;
  group: 'light' | 'color' | 'tone';
}

export const COLOR_SLIDER_CONFIGS: ColorSliderConfig[] = [
  // Light adjustments
  { key: 'exposure', label: 'Exposure', labelNo: 'Eksponering', min: -5, max: 5, step: 0.1, unit: 'EV', group: 'light' },
  { key: 'highlights', label: 'Highlights', labelNo: 'Høylys', min: -100, max: 100, step: 1, group: 'light' },
  { key: 'shadows', label: 'Shadows', labelNo: 'Skygger', min: -100, max: 100, step: 1, group: 'light' },
  { key: 'whites', label: 'Whites', labelNo: 'Hvitt', min: -100, max: 100, step: 1, group: 'light' },
  { key: 'blacks', label: 'Blacks', labelNo: 'Svart', min: -100, max: 100, step: 1, group: 'light' },
  { key: 'contrast', label: 'Contrast', labelNo: 'Kontrast', min: -100, max: 100, step: 1, group: 'light' },
  
  // Color adjustments
  { key: 'temperature', label: 'Temperature', labelNo: 'Temperatur', min: 2000, max: 10000, step: 100, unit: 'K', group: 'color' },
  { key: 'tint', label: 'Tint', labelNo: 'Fargetone', min: -100, max: 100, step: 1, group: 'color' },
  { key: 'saturation', label: 'Saturation', labelNo: 'Metning', min: -100, max: 100, step: 1, group: 'color' },
  { key: 'vibrance', label: 'Vibrance', labelNo: 'Vibrans', min: -100, max: 100, step: 1, group: 'color' },
];

// =============================================================================
// Color Math Utilities
// =============================================================================

/**
 * Convert sRGB to linear light (gamma 2.2 decode)
 * Uses the official sRGB transfer function
 */
function srgbToLinear(value: number): number {
  const v = value / 255;
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear light to sRGB (gamma 2.2 encode)
 * Uses the official sRGB transfer function
 */
function linearToSrgb(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  if (clamped <= 0.0031308) {
    return Math.round(clamped * 12.92 * 255);
  }
  return Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
}

/**
 * RGB to HSL conversion (in linear space)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) {
    return [0, 0, l];
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  
  return [h, s, l];
}

/**
 * HSL to RGB conversion
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    return [l, l, l];
  }
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return [
    hue2rgb(p, q, h + 1/3),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1/3),
  ];
}

/**
 * Calculate luminance in linear space (Rec. 709)
 */
function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Soft clamp function for smooth highlight/shadow rolloff
 */
function softClamp(value: number, threshold: number = 0.9): number {
  if (value <= threshold) return value;
  const excess = value - threshold;
  const range = 1 - threshold;
  return threshold + range * (1 - Math.exp(-excess / range));
}

// =============================================================================
// LinearColorPipeline Class
// =============================================================================

export class LinearColorPipeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImageData: ImageData | null = null;
  private cachedProcessedData: ImageData | null = null;
  private settings: ColorGradeSettings = { ...DEFAULT_COLOR_SETTINGS };
  private isDirty: boolean = true;

  // Lookup tables for performance
  private srgbToLinearLUT: Float32Array;
  private linearToSrgbLUT: Uint8ClampedArray;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Cannot create canvas context');
    this.ctx = ctx;

    // Build lookup tables
    this.srgbToLinearLUT = new Float32Array(256);
    this.linearToSrgbLUT = new Uint8ClampedArray(4096);
    
    for (let i = 0; i < 256; i++) {
      this.srgbToLinearLUT[i] = srgbToLinear(i);
    }
    
    for (let i = 0; i < 4096; i++) {
      const linear = i / 4095;
      this.linearToSrgbLUT[i] = linearToSrgb(linear);
    }
  }

  /**
   * Load an image for processing
   */
  async loadImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        this.originalImageData = this.ctx.getImageData(0, 0, img.width, img.height);
        this.isDirty = true;
        this.cachedProcessedData = null;
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  /**
   * Load from existing ImageData
   */
  loadImageData(imageData: ImageData): void {
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.originalImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    this.isDirty = true;
    this.cachedProcessedData = null;
  }

  /**
   * Update settings (partial update supported)
   */
  setSettings(settings: Partial<ColorGradeSettings>): void {
    const newSettings = { ...this.settings, ...settings };
    
    // Check if anything actually changed
    if (JSON.stringify(newSettings) !== JSON.stringify(this.settings)) {
      this.settings = newSettings;
      this.isDirty = true;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): ColorGradeSettings {
    return { ...this.settings };
  }

  /**
   * Check if settings are at default values
   */
  isDefault(): boolean {
    return JSON.stringify(this.settings) === JSON.stringify(DEFAULT_COLOR_SETTINGS);
  }

  /**
   * Reset to default settings
   */
  reset(): void {
    this.settings = { ...DEFAULT_COLOR_SETTINGS };
    this.isDirty = true;
  }

  /**
   * Process the image with current settings
   * Uses caching to avoid reprocessing when settings haven't changed
   */
  process(): ImageData {
    if (!this.originalImageData) {
      throw new Error('No image loaded');
    }

    // Return cached result if not dirty
    if (!this.isDirty && this.cachedProcessedData) {
      return this.cachedProcessedData;
    }

    const src = this.originalImageData;
    const dst = new ImageData(src.width, src.height);
    const srcData = src.data;
    const dstData = dst.data;

    // Precompute adjustment factors
    const exposureFactor = Math.pow(2, this.settings.exposure);
    const contrastFactor = (this.settings.contrast + 100) / 100;
    const saturationFactor = (this.settings.saturation + 100) / 100;
    const vibranceFactor = this.settings.vibrance / 100;
    
    // Temperature shift (simplified Planckian locus approximation)
    const tempShift = (this.settings.temperature - 6500) / 10000;
    const tintShift = this.settings.tint / 100;

    // Highlights/shadows/whites/blacks factors
    const highlightsFactor = this.settings.highlights / 100;
    const shadowsFactor = this.settings.shadows / 100;
    const whitesFactor = this.settings.whites / 100;
    const blacksFactor = this.settings.blacks / 100;

    const len = srcData.length;
    
    for (let i = 0; i < len; i += 4) {
      // Read sRGB values and convert to linear using LUT
      let r = this.srgbToLinearLUT[srcData[i]];
      let g = this.srgbToLinearLUT[srcData[i + 1]];
      let b = this.srgbToLinearLUT[srcData[i + 2]];
      const a = srcData[i + 3];

      // 1. Apply exposure (linear multiplication - physically accurate)
      r *= exposureFactor;
      g *= exposureFactor;
      b *= exposureFactor;

      // 2. Apply temperature (warm/cool shift)
      if (tempShift !== 0) {
        // Approximate color temperature shift
        r *= 1 + tempShift * 0.4;
        g *= 1 + tempShift * 0.1;
        b *= 1 - tempShift * 0.4;
      }

      // 3. Apply tint (green/magenta shift)
      if (tintShift !== 0) {
        g *= 1 - tintShift * 0.3;
        r *= 1 + tintShift * 0.15;
        b *= 1 + tintShift * 0.15;
      }

      // 4. Apply highlights/shadows (luminosity-based tone mapping)
      const lum = luminance(r, g, b);
      
      if (highlightsFactor !== 0 && lum > 0.5) {
        const weight = (lum - 0.5) * 2; // 0 at midpoint, 1 at white
        const factor = 1 + highlightsFactor * weight * 0.5;
        r *= factor;
        g *= factor;
        b *= factor;
      }
      
      if (shadowsFactor !== 0 && lum < 0.5) {
        const weight = (0.5 - lum) * 2; // 1 at black, 0 at midpoint
        const factor = 1 + shadowsFactor * weight * 0.5;
        r *= factor;
        g *= factor;
        b *= factor;
      }

      // 5. Apply whites/blacks (endpoint adjustment)
      if (whitesFactor !== 0) {
        const whiteWeight = Math.pow(lum, 2);
        r += whitesFactor * 0.3 * whiteWeight;
        g += whitesFactor * 0.3 * whiteWeight;
        b += whitesFactor * 0.3 * whiteWeight;
      }
      
      if (blacksFactor !== 0) {
        const blackWeight = Math.pow(1 - lum, 2);
        r += blacksFactor * 0.3 * blackWeight * (1 - r);
        g += blacksFactor * 0.3 * blackWeight * (1 - g);
        b += blacksFactor * 0.3 * blackWeight * (1 - b);
      }

      // 6. Apply contrast (S-curve around middle gray)
      if (contrastFactor !== 1) {
        const pivot = 0.18; // Middle gray in linear (18% gray card)
        r = pivot + (r - pivot) * contrastFactor;
        g = pivot + (g - pivot) * contrastFactor;
        b = pivot + (b - pivot) * contrastFactor;
      }

      // 7. Apply saturation and vibrance
      if (saturationFactor !== 1 || vibranceFactor !== 0) {
        const [h, s, l] = rgbToHsl(Math.max(0, r), Math.max(0, g), Math.max(0, b));
        
        let newS = s * saturationFactor;
        
        // Vibrance: boost less saturated colors more (protects skin tones)
        if (vibranceFactor !== 0) {
          const vibranceBoost = vibranceFactor * (1 - Math.pow(s, 0.5));
          newS = s + vibranceBoost * 0.5;
        }
        
        newS = Math.max(0, Math.min(1, newS));
        [r, g, b] = hslToRgb(h, newS, l);
      }

      // 8. Soft highlight recovery (prevent harsh clipping)
      r = softClamp(r);
      g = softClamp(g);
      b = softClamp(b);

      // Convert back to sRGB using LUT (with scaling to LUT range)
      const rIdx = Math.round(Math.max(0, Math.min(1, r)) * 4095);
      const gIdx = Math.round(Math.max(0, Math.min(1, g)) * 4095);
      const bIdx = Math.round(Math.max(0, Math.min(1, b)) * 4095);
      
      dstData[i] = this.linearToSrgbLUT[rIdx];
      dstData[i + 1] = this.linearToSrgbLUT[gIdx];
      dstData[i + 2] = this.linearToSrgbLUT[bIdx];
      dstData[i + 3] = a;
    }

    this.cachedProcessedData = dst;
    this.isDirty = false;
    
    return dst;
  }

  /**
   * Apply processing and return canvas
   */
  applyToCanvas(): HTMLCanvasElement {
    const processed = this.process();
    this.ctx.putImageData(processed, 0, 0);
    return this.canvas;
  }

  /**
   * Export as data URL
   */
  toDataURL(format: 'png' | 'jpeg' = 'jpeg', quality = 0.92): string {
    this.applyToCanvas();
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Export as Blob
   */
  async toBlob(format: 'png' | 'jpeg' = 'jpeg', quality = 0.92): Promise<Blob> {
    this.applyToCanvas();
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        `image/${format}`,
        quality
      );
    });
  }

  /**
   * Get canvas for direct manipulation
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Serialize settings for storage
   */
  serializeSettings(): string {
    return JSON.stringify(this.settings);
  }

  /**
   * Deserialize settings from storage
   */
  deserializeSettings(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.setSettings(parsed);
    } catch (e) {
      console.warn('Failed to parse color settings:', e);
    }
  }
}

export default LinearColorPipeline;
