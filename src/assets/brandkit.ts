export interface BrandColor {
  name: string;
  hex: string;
  rgb: [number, number, number];
  usage: string;
}

export interface BrandTypography {
  family: string;
  weights: number[];
  sizes: Record<string, number>;
}

export interface FeatureIcon {
  id: string;
  name: string;
  label: string;
  path: string;
  category: string;
}

export interface BrandKit {
  name: string;
  version: string;
  logoUrl: string;
  logomarkUrl: string;
  colors: BrandColor[];
  typography: BrandTypography;
  icons: FeatureIcon[];
  gradients: Record<string, string>;
  logos?: { main: string; icon: string };
  watermark?: string;
  decorative?: { gridPattern: string; gradientOrb: string };
  loadingSpinner?: string;
}

export const brandColors: BrandColor[] = [
  { name: 'Primary Blue', hex: '#0A84FF', rgb: [10, 132, 255], usage: 'Primary actions, links' },
  { name: 'Dark Background', hex: '#0D1117', rgb: [13, 17, 23], usage: 'Main background' },
  { name: 'Surface', hex: '#161B22', rgb: [22, 27, 34], usage: 'Card backgrounds' },
  { name: 'Border', hex: '#30363D', rgb: [48, 54, 61], usage: 'Borders, dividers' },
  { name: 'Text Primary', hex: '#E6EDF3', rgb: [230, 237, 243], usage: 'Primary text' },
  { name: 'Text Secondary', hex: '#8B949E', rgb: [139, 148, 158], usage: 'Secondary text' },
  { name: 'Success', hex: '#3FB950', rgb: [63, 185, 80], usage: 'Success states' },
  { name: 'Warning', hex: '#D29922', rgb: [210, 153, 34], usage: 'Warning states' },
  { name: 'Error', hex: '#F85149', rgb: [248, 81, 73], usage: 'Error states' },
  { name: 'Gold Accent', hex: '#FFD700', rgb: [255, 215, 0], usage: 'Premium features, highlights' },
];

export const brandTypography: BrandTypography = {
  family: 'Inter, system-ui, -apple-system, sans-serif',
  weights: [300, 400, 500, 600, 700],
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
};

export const featureIcons: FeatureIcon[] = [
  { id: 'lighting', name: 'lighting', label: 'Lyssetting', path: '/icons/lighting.svg', category: 'core' },
  { id: 'camera', name: 'camera', label: 'Kamera', path: '/icons/camera.svg', category: 'core' },
  { id: 'animation', name: 'animation', label: 'Animasjon', path: '/icons/animation.svg', category: 'core' },
  { id: 'export', name: 'export', label: 'Eksport', path: '/icons/export.svg', category: 'core' },
  { id: 'ai', name: 'ai', label: 'AI Assistent', path: '/icons/ai.svg', category: 'ai' },
  { id: 'collaboration', name: 'collaboration', label: 'Samarbeid', path: '/icons/collaboration.svg', category: 'pro' },
];

export const brandKit: BrandKit = {
  name: 'Virtual Studio',
  version: '1.0.0',
  logoUrl: '/images/logo.svg',
  logomarkUrl: '/images/logomark.svg',
  colors: brandColors,
  typography: brandTypography,
  icons: featureIcons,
  gradients: {
    primary: 'linear-gradient(135deg, #0A84FF, #5E5CE6)',
    gold: 'linear-gradient(135deg, #FFD700, #FF9500)',
    dark: 'linear-gradient(180deg, #0D1117, #161B22)',
    surface: 'linear-gradient(135deg, #161B22, #1C2128)',
  },
};

export default brandKit;
