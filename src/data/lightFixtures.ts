export interface LightSpec {
  id: string;
  brand: string;
  model: string;
  type: 'strobe' | 'continuous' | 'led' | 'flash' | 'atmospheric' | 'practical';
  power: number;
  powerUnit: 'Ws' | 'W';
  cct?: number;
  cri?: number;
  tlci?: number;
  lux1m?: number;
  beamAngle?: number;
  guideNumber?: number;
  flashDuration?: string;
  recycleTime?: number;
  lumens?: number;
  price?: number;
  thumbnail?: string;
  colorGel?: string;
  description?: string;
  modelingLightPower?: number; // Modeling light power in watts (for strobes)
  modelingLightLux1m?: number; // Modeling light lux at 1m (optional, more accurate)
  animation?: {
    flicker?: boolean;
    flickerIntensity?: number;
    flickerSpeed?: number;
  };
  // Local-space forward axis for 3D model beam direction
  // Values: '-z' (default), '+z', '-x', '+x', '-y', '+y'
  // Use this to specify which direction the model's light beam faces in local space
  forwardAxis?: '-z' | '+z' | '-x' | '+x' | '-y' | '+y';
}

export const LIGHT_DATABASE: LightSpec[] = [
  { id: 'godox-ad200pro', brand: 'Godox', model: 'AD200 Pro', type: 'strobe', power: 200, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 52, flashDuration: '1/220-1/13000', recycleTime: 0.5, lumens: 8000, modelingLightPower: 10, modelingLightLux1m: 2500, thumbnail: '/images/gear/godox_ad200_pro.png' },
  { id: 'godox-ad400pro', brand: 'Godox', model: 'AD400 Pro', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 72, flashDuration: '1/220-1/10000', recycleTime: 0.75, lumens: 16000, modelingLightPower: 25, modelingLightLux1m: 6000, thumbnail: '/images/gear/godox_ad400_pro.png' },
  { id: 'godox-ad600pro', brand: 'Godox', model: 'AD600 Pro', type: 'strobe', power: 600, powerUnit: 'Ws', cct: 5600, cri: 97, guideNumber: 87, flashDuration: '1/220-1/10100', recycleTime: 0.9, lumens: 24000, modelingLightPower: 35, modelingLightLux1m: 8500, thumbnail: '/images/gear/godox_ad600_pro.png' },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10', type: 'strobe', power: 250, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 72, flashDuration: '1/400-1/14000', recycleTime: 2.0, lumens: 10000, lux1m: 10000, modelingLightPower: 15, modelingLightLux1m: 3500, thumbnail: '/images/gear/profoto_b10.png' },
  { id: 'profoto-b10plus', brand: 'Profoto', model: 'B10 Plus', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 102, flashDuration: '1/400-1/50000', recycleTime: 2.5, lumens: 20000, lux1m: 15000, modelingLightPower: 30, modelingLightLux1m: 7000, thumbnail: '/images/gear/profoto_b10_plus.png' },
  { id: 'profoto-d2', brand: 'Profoto', model: 'D2 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 98, guideNumber: 145, flashDuration: '1/1000-1/63000', recycleTime: 0.6, lumens: 40000, modelingLightPower: 50, modelingLightLux1m: 12000, thumbnail: '/images/gear/profoto_d2_1000.png' },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120d II', type: 'led', power: 135, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 20000, beamAngle: 55, lumens: 7100, thumbnail: '/images/gear/aputure_120d_ii.png', forwardAxis: '-y' },
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300d II', type: 'led', power: 350, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 45000, beamAngle: 55, lumens: 18500, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z' },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600d Pro', type: 'led', power: 720, powerUnit: 'W', cct: 5600, cri: 96, tlci: 98, lux1m: 86000, beamAngle: 55, lumens: 36000, thumbnail: '/images/gear/aputure_600d_pro.png', forwardAxis: '-y' },
  { id: 'aputure-60x', brand: 'Aputure', model: 'LS 60x', type: 'led', power: 80, powerUnit: 'W', cct: 5500, cri: 95, tlci: 96, lux1m: 12000, beamAngle: 15, lumens: 3000, thumbnail: '/images/gear/aputure_60x.png', forwardAxis: '-y' },
  { id: 'nanlite-forza60', brand: 'Nanlite', model: 'Forza 60', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 98, tlci: 97, lux1m: 16500, beamAngle: 120, lumens: 2900, thumbnail: '/images/gear/nanlite_forza_60.png', forwardAxis: '-y' },
  { id: 'nanlite-forza300', brand: 'Nanlite', model: 'Forza 300', type: 'led', power: 300, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 38000, beamAngle: 120, lumens: 13600, thumbnail: '/images/gear/nanlite_forza_300.png', forwardAxis: '-y' },
  { id: 'nanlite-forza500', brand: 'Nanlite', model: 'Forza 500', type: 'led', power: 500, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 62000, beamAngle: 120, lumens: 22000, thumbnail: '/images/gear/nanlite_forza_500.png', forwardAxis: '-y' },
  { id: 'elinchrom-elc500', brand: 'Elinchrom', model: 'ELC Pro HD 500', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 90, flashDuration: '1/3800-1/5000', recycleTime: 0.6, lumens: 20000, modelingLightPower: 30, modelingLightLux1m: 7000, thumbnail: '/images/gear/elinchrom_elc_500.png' },
  { id: 'elinchrom-elc1000', brand: 'Elinchrom', model: 'ELC Pro HD 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 128, flashDuration: '1/2200-1/5000', recycleTime: 0.9, lumens: 40000, modelingLightPower: 50, modelingLightLux1m: 12000, thumbnail: '/images/gear/elinchrom_elc_1000.png' },
  { id: 'broncolor-siros400', brand: 'Broncolor', model: 'Siros 400 S', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 76, flashDuration: '1/2000-1/11000', recycleTime: 0.6, lumens: 16000, modelingLightPower: 25, modelingLightLux1m: 6000, thumbnail: '/images/gear/broncolor_siros_400.png' },
  { id: 'broncolor-siros800', brand: 'Broncolor', model: 'Siros 800 S', type: 'strobe', power: 800, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 108, flashDuration: '1/1600-1/11000', recycleTime: 0.8, lumens: 32000, modelingLightPower: 40, modelingLightLux1m: 9500, thumbnail: '/images/gear/broncolor_siros_800.png' },
  
  // ============================================
  // ATMOSPHERIC LIGHTS - For Lovecraft/mood environments
  // ============================================
  {
    id: 'eldritch-glow',
    brand: 'Atmosphere',
    model: 'Eldritch Glow',
    type: 'atmospheric',
    power: 50,
    powerUnit: 'W',
    cct: 4000, // Grønnaktig
    cri: 70,
    lux1m: 100,
    beamAngle: 360,
    colorGel: '#1a4d1a',
    description: 'Mystisk grønt glødende lys for Lovecraft-atmosfære',
    animation: {
      flicker: true,
      flickerIntensity: 0.2,
      flickerSpeed: 0.5,
    },
  },
  {
    id: 'candle-light',
    brand: 'Atmosphere',
    model: 'Candle Simulation',
    type: 'practical',
    power: 10,
    powerUnit: 'W',
    cct: 1900,
    cri: 90,
    lux1m: 20,
    beamAngle: 360,
    animation: {
      flicker: true,
      flickerIntensity: 0.4,
      flickerSpeed: 2.0,
    },
  },
  {
    id: 'moonlight',
    brand: 'Atmosphere',
    model: 'Moonlight',
    type: 'atmospheric',
    power: 80,
    powerUnit: 'W',
    cct: 6500,
    cri: 85,
    lux1m: 50,
    beamAngle: 120,
    description: 'Kaldt månelys for nattscener',
  },
];

// Export atmospheric lights separately for easy access
export const ATMOSPHERIC_LIGHTS: LightSpec[] = LIGHT_DATABASE.filter(
  light => light.type === 'atmospheric' || light.type === 'practical'
);

export function getLightById(id: string): LightSpec | undefined {
  return LIGHT_DATABASE.find(light => light.id === id);
}

export function getLightDisplayName(light: LightSpec): string {
  return `${light.brand} ${light.model}`;
}

export function getLightPowerDisplay(light: LightSpec): string {
  return `${light.power}${light.powerUnit}`;
}
