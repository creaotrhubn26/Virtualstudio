export interface HairStyle {
  id: string;
  name: string;
  label: string;
  length: 'short' | 'medium' | 'long' | 'extra-long';
  type: 'straight' | 'wavy' | 'curly' | 'coily';
  density: number;
  primaryColor: string;
  highlightColor?: string;
  shininess: number;
  anisotropy: number;
}

export interface HairRenderConfig {
  style: HairStyle;
  physicsEnabled: boolean;
  windStrength: number;
  windDirection: [number, number, number];
  subsurfaceScatteringStrength: number;
}

export const DEFAULT_HAIR_STYLES: HairStyle[] = [
  { id: 'short-straight', name: 'short-straight', label: 'Kort Rett', length: 'short', type: 'straight', density: 0.8, primaryColor: '#4A3728', shininess: 0.6, anisotropy: 0.5 },
  { id: 'medium-wavy', name: 'medium-wavy', label: 'Middels Bølget', length: 'medium', type: 'wavy', density: 0.9, primaryColor: '#2C1810', shininess: 0.5, anisotropy: 0.6 },
  { id: 'long-curly', name: 'long-curly', label: 'Lang Krøllende', length: 'long', type: 'curly', density: 1.0, primaryColor: '#1A1A1A', shininess: 0.4, anisotropy: 0.4 },
  { id: 'blonde-straight', name: 'blonde-straight', label: 'Blond Rett', length: 'medium', type: 'straight', density: 0.7, primaryColor: '#D4A017', highlightColor: '#F0D070', shininess: 0.8, anisotropy: 0.7 },
];

class HairRenderingService {
  private currentConfig: HairRenderConfig | null = null;

  getStyles(): HairStyle[] {
    return DEFAULT_HAIR_STYLES;
  }

  getStyleById(id: string): HairStyle | undefined {
    return DEFAULT_HAIR_STYLES.find((s) => s.id === id);
  }

  setHairStyle(style: HairStyle): void {
    this.currentConfig = {
      style,
      physicsEnabled: false,
      windStrength: 0,
      windDirection: [0, 1, 0],
      subsurfaceScatteringStrength: 0.5,
    };
    console.log(`[HairRenderingService] Hair style set: ${style.name}`);
  }

  setPhysics(enabled: boolean, windStrength = 0, windDirection: [number, number, number] = [0, 0, 1]): void {
    if (this.currentConfig) {
      this.currentConfig.physicsEnabled = enabled;
      this.currentConfig.windStrength = windStrength;
      this.currentConfig.windDirection = windDirection;
    }
  }

  getCurrentConfig(): HairRenderConfig | null {
    return this.currentConfig;
  }

  update(_deltaTime: number): void {
    if (!this.currentConfig?.physicsEnabled) return;
  }

  async loadHairModel(_style: object, _options?: HairColorOptions): Promise<object> {
    return {};
  }
}

export interface HairColorOptions {
  color?: string;
  scale?: number;
  position?: object;
}

export const hairRenderingService = new HairRenderingService();
export default hairRenderingService;
