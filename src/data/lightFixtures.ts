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
  { id: 'godox-ad200pro', brand: 'Godox', model: 'AD200 Pro', type: 'strobe', power: 200, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 52, flashDuration: '1/220-1/13000', recycleTime: 0.5, lumens: 8000, modelingLightPower: 10, modelingLightLux1m: 2500, thumbnail: '/images/gear/godox_ad200_pro.png', description: 'Kompakt batteristroboskop med byonett-tilkobling' },
  { id: 'godox-ad400pro', brand: 'Godox', model: 'AD400 Pro', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 72, flashDuration: '1/220-1/10000', recycleTime: 0.75, lumens: 16000, modelingLightPower: 25, modelingLightLux1m: 6000, thumbnail: '/images/gear/godox_ad400_pro.png' },
  { id: 'godox-ad600pro', brand: 'Godox', model: 'AD600 Pro', type: 'strobe', power: 600, powerUnit: 'Ws', cct: 5600, cri: 97, guideNumber: 87, flashDuration: '1/220-1/10100', recycleTime: 0.9, lumens: 24000, modelingLightPower: 35, modelingLightLux1m: 8500, thumbnail: '/images/gear/godox_ad600_pro.png' },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10', type: 'strobe', power: 250, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 72, flashDuration: '1/400-1/14000', recycleTime: 2.0, lumens: 10000, lux1m: 10000, modelingLightPower: 15, modelingLightLux1m: 3500, thumbnail: '/images/gear/profoto_b10.png' },
  { id: 'profoto-b10plus', brand: 'Profoto', model: 'B10 Plus', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 102, flashDuration: '1/400-1/50000', recycleTime: 2.5, lumens: 20000, lux1m: 15000, modelingLightPower: 30, modelingLightLux1m: 7000, thumbnail: '/images/gear/profoto_b10_plus.png' },
  { id: 'profoto-d2', brand: 'Profoto', model: 'D2 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 98, guideNumber: 145, flashDuration: '1/1000-1/63000', recycleTime: 0.6, lumens: 40000, modelingLightPower: 50, modelingLightLux1m: 12000, thumbnail: '/images/gear/profoto_d2_1000.png' },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120d II', type: 'led', power: 135, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 20000, beamAngle: 55, lumens: 7100, thumbnail: '/images/gear/aputure_120d_ii.png', forwardAxis: '-y', description: 'Kompakt og kraftig daylight LED fixture' },
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300d II', type: 'led', power: 350, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 45000, beamAngle: 55, lumens: 18500, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Profesjonell daylight LED — industristandardfix' },
  { id: 'aputure-300d-strip', brand: 'Aputure', model: 'LS 300d Strip', type: 'led', power: 350, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 38000, beamAngle: 120, lumens: 16000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Stripboks-konfigurasjon for rimbelysning' },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600d Pro', type: 'led', power: 720, powerUnit: 'W', cct: 5600, cri: 96, tlci: 98, lux1m: 86000, beamAngle: 55, lumens: 36000, thumbnail: '/images/gear/aputure_600d_pro.png', forwardAxis: '-y', description: 'Kraftigste Aputure daylight LED' },
  { id: 'aputure-600x', brand: 'Aputure', model: 'LS 600x Pro', type: 'led', power: 720, powerUnit: 'W', cct: 5600, cri: 96, tlci: 98, lux1m: 72000, beamAngle: 55, lumens: 32000, thumbnail: '/images/gear/aputure_600d_pro.png', forwardAxis: '-y', description: 'Bicolor LED — 2700-6500K' },
  { id: 'aputure-60x', brand: 'Aputure', model: 'LS 60x', type: 'led', power: 80, powerUnit: 'W', cct: 5500, cri: 95, tlci: 96, lux1m: 12000, beamAngle: 15, lumens: 3000, thumbnail: '/images/gear/aputure_60x.png', forwardAxis: '-y', description: 'Kompakt LED for intimbelysning' },
  { id: 'aputure-nova-p300c', brand: 'Aputure', model: 'Nova P300c', type: 'led', power: 350, powerUnit: 'W', cct: 5600, cri: 95, tlci: 97, lux1m: 6800, beamAngle: 120, lumens: 28000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'RGBWW softpanel — full fargekontroll' },
  { id: 'nanlite-forza60', brand: 'Nanlite', model: 'Forza 60', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 98, tlci: 97, lux1m: 16500, beamAngle: 120, lumens: 2900, thumbnail: '/images/gear/nanlite_forza_60.png', forwardAxis: '-y', description: 'Kompakt Forza LED fixture' },
  { id: 'nanlite-forza150', brand: 'Nanlite', model: 'Forza 150', type: 'led', power: 150, powerUnit: 'W', cct: 5600, cri: 97, tlci: 97, lux1m: 24000, beamAngle: 120, lumens: 7800, thumbnail: '/images/gear/nanlite_forza_300.png', forwardAxis: '-y', description: 'Mellomklasse Forza LED fixture' },
  { id: 'nanlite-forza300', brand: 'Nanlite', model: 'Forza 300', type: 'led', power: 300, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 38000, beamAngle: 120, lumens: 13600, thumbnail: '/images/gear/nanlite_forza_300.png', forwardAxis: '-y', description: 'Kraftig Forza LED fixture' },
  { id: 'nanlite-forza500', brand: 'Nanlite', model: 'Forza 500', type: 'led', power: 500, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 62000, beamAngle: 120, lumens: 22000, thumbnail: '/images/gear/nanlite_forza_500.png', forwardAxis: '-y', description: 'Topp Forza LED fixture' },
  { id: 'nanlite-pavotube-15c', brand: 'Nanlite', model: 'PavoTube 15c', type: 'led', power: 15, powerUnit: 'W', cct: 5600, cri: 96, tlci: 95, lux1m: 800, beamAngle: 180, lumens: 700, thumbnail: '/images/gear/nanlite_forza_60.png', forwardAxis: '-y', description: 'RGB rørlys 45cm — for kreativ effektbelysning', colorGel: '#ffffff' },
  { id: 'nanlite-pavotube-30c', brand: 'Nanlite', model: 'PavoTube 30c', type: 'led', power: 30, powerUnit: 'W', cct: 5600, cri: 96, tlci: 95, lux1m: 1600, beamAngle: 180, lumens: 1400, thumbnail: '/images/gear/nanlite_forza_60.png', forwardAxis: '-y', description: 'RGB rørlys 90cm — for praktiske og bakgrunnseffekter', colorGel: '#ffffff' },
  { id: 'godox-sl200w', brand: 'Godox', model: 'SL-200W II', type: 'led', power: 200, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 24000, beamAngle: 55, lumens: 10000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '-y', description: 'Studio LED med Bowens montering' },
  { id: 'godox-ul150', brand: 'Godox', model: 'UL150 II', type: 'led', power: 150, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 14000, beamAngle: 55, lumens: 7500, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '-y', description: 'Lydløs LED — perfekt for videostudio' },
  { id: 'arri-skypanel-s30', brand: 'Arri', model: 'SkyPanel S30-C', type: 'led', power: 400, powerUnit: 'W', cct: 5600, cri: 95, tlci: 95, lux1m: 3200, beamAngle: 115, lumens: 20000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Profesjonell RGBW softpanel — filmindustristandard' },
  { id: 'arri-skypanel-s60', brand: 'Arri', model: 'SkyPanel S60-C', type: 'led', power: 900, powerUnit: 'W', cct: 5600, cri: 95, tlci: 95, lux1m: 6000, beamAngle: 115, lumens: 44000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Stor RGBW softpanel for film og TV-produksjon' },
  { id: 'westcott-fj200', brand: 'Westcott', model: 'FJ200 Strobe', type: 'strobe', power: 200, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 58, flashDuration: '1/400-1/11000', recycleTime: 1.0, lumens: 8000, modelingLightPower: 12, modelingLightLux1m: 3000, thumbnail: '/images/gear/godox_ad200_pro.png', description: 'Bærbar strobe med Bowens montering' },
  { id: 'profoto-a10', brand: 'Profoto', model: 'A10', type: 'strobe', power: 76, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 60, flashDuration: '1/800-1/20000', recycleTime: 1.2, lumens: 3000, thumbnail: '/images/gear/profoto_b10.png', description: 'Profesjonell TTL-blits for on-camera bruk' },
  { id: 'elinchrom-elc500', brand: 'Elinchrom', model: 'ELC Pro HD 500', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 90, flashDuration: '1/3800-1/5000', recycleTime: 0.6, lumens: 20000, modelingLightPower: 30, modelingLightLux1m: 7000, thumbnail: '/images/gear/elinchrom_elc_500.png' },
  { id: 'elinchrom-elc1000', brand: 'Elinchrom', model: 'ELC Pro HD 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 128, flashDuration: '1/2200-1/5000', recycleTime: 0.9, lumens: 40000, modelingLightPower: 50, modelingLightLux1m: 12000, thumbnail: '/images/gear/elinchrom_elc_1000.png' },
  { id: 'broncolor-siros400', brand: 'Broncolor', model: 'Siros 400 S', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 76, flashDuration: '1/2000-1/11000', recycleTime: 0.6, lumens: 16000, modelingLightPower: 25, modelingLightLux1m: 6000, thumbnail: '/images/gear/broncolor_siros_400.png' },
  { id: 'broncolor-siros800', brand: 'Broncolor', model: 'Siros 800 S', type: 'strobe', power: 800, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 108, flashDuration: '1/1600-1/11000', recycleTime: 0.8, lumens: 32000, modelingLightPower: 40, modelingLightLux1m: 9500, thumbnail: '/images/gear/broncolor_siros_800.png' },

  // --- Aputure Compact & Fresnel ---
  { id: 'aputure-mc-pro', brand: 'Aputure', model: 'MC Pro', type: 'led', power: 40, powerUnit: 'W', cct: 5600, cri: 96, tlci: 96, lux1m: 4200, beamAngle: 120, lumens: 1800, thumbnail: '/images/gear/aputure_60x.png', forwardAxis: '-y', description: 'RGBWW pocketlys — perfekt on-location og som praktisk', colorGel: '#ffffff' },
  { id: 'aputure-spotlight-mini', brand: 'Aputure', model: 'Spotlight Mini', type: 'led', power: 120, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 15000, beamAngle: 19, lumens: 5500, thumbnail: '/images/gear/aputure_60x.png', forwardAxis: '-y', description: 'LED fresnel med skarpt, presist lyskjerne — Bowens montering' },
  { id: 'amaran-100x', brand: 'Amaran', model: '100x Bi-Color', type: 'led', power: 100, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 14000, beamAngle: 55, lumens: 5500, thumbnail: '/images/gear/aputure_120d_ii.png', forwardAxis: '-y', description: 'Kompakt bicolor LED — 2700-6500K — budsjettfavoritt' },
  { id: 'amaran-200x', brand: 'Amaran', model: '200x Bi-Color', type: 'led', power: 200, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 28000, beamAngle: 55, lumens: 10000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '-y', description: 'Bicolor LED med kraftig lysstyrke — Bowens montering' },

  // --- Nanlite Extended Tube & Panel ---
  { id: 'nanlite-pavotube-60c', brand: 'Nanlite', model: 'PavoTube II 60C', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 96, tlci: 96, lux1m: 2400, beamAngle: 180, lumens: 2400, thumbnail: '/images/gear/nanlite_forza_60.png', forwardAxis: '-y', description: 'RGB rørlys 180cm — stor kreativ effektbelysning', colorGel: '#ffffff' },
  { id: 'nanlite-mixpad-mix27c', brand: 'Nanlite', model: 'MixPad Mix 27C', type: 'led', power: 80, powerUnit: 'W', cct: 5600, cri: 96, tlci: 96, lux1m: 3200, beamAngle: 120, lumens: 5600, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'RGBWW LED-panel med bred lysspredning' },
  { id: 'nanlite-forza300b', brand: 'Nanlite', model: 'Forza 300B II', type: 'led', power: 300, powerUnit: 'W', cct: 5600, cri: 97, tlci: 97, lux1m: 36000, beamAngle: 120, lumens: 13000, thumbnail: '/images/gear/nanlite_forza_300.png', forwardAxis: '-y', description: 'Bicolor Forza 300 — 2700-6500K, presis CCT-kontroll' },

  // --- Godox RGB & Video ---
  { id: 'godox-sz150r', brand: 'Godox', model: 'SZ150R', type: 'led', power: 150, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 14000, beamAngle: 45, lumens: 7000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '-y', description: 'Zoom RGB LED — 2800-6500K + full RGB', colorGel: '#ffffff' },
  { id: 'godox-ml60ii', brand: 'Godox', model: 'ML60 II Bi', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 9000, beamAngle: 55, lumens: 3000, thumbnail: '/images/gear/aputure_60x.png', forwardAxis: '-y', description: 'Kompakt bicolor LED — stille kjøling, Bowens montering' },

  // --- Litepanels ---
  { id: 'litepanels-astra-3x', brand: 'Litepanels', model: 'Astra 3X Bi', type: 'led', power: 50, powerUnit: 'W', cct: 5600, cri: 95, tlci: 96, lux1m: 2800, beamAngle: 115, lumens: 4500, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Kompakt bicolor 1x1 panel — broadcast og dokumentar' },
  { id: 'litepanels-gemini-2x1', brand: 'Litepanels', model: 'Gemini 2x1', type: 'led', power: 250, powerUnit: 'W', cct: 5600, cri: 95, tlci: 97, lux1m: 4200, beamAngle: 115, lumens: 20000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Stort RGBWW 2x1 panel — Netflix-godkjent for filmproduksjon' },

  // --- Kino Flo ---
  { id: 'kinoflo-diva-415', brand: 'Kino Flo', model: 'Diva-Lite 415', type: 'led', power: 80, powerUnit: 'W', cct: 5500, cri: 95, tlci: 96, lux1m: 2200, beamAngle: 120, lumens: 5200, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Klassisk fluosescent-erstatning — flattery LED for portrett og beauty' },

  // --- Zhiyun ---
  { id: 'zhiyun-molus-x100', brand: 'Zhiyun', model: 'Molus X100', type: 'led', power: 100, powerUnit: 'W', cct: 5600, cri: 96, tlci: 97, lux1m: 11000, beamAngle: 55, lumens: 4500, thumbnail: '/images/gear/aputure_120d_ii.png', forwardAxis: '-y', description: 'Kompakt powerhouse LED — COB design, 2700-6500K' },

  // --- Elinchrom Extended ---
  { id: 'elinchrom-elb500', brand: 'Elinchrom', model: 'ELB 500 TTL', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 90, flashDuration: '1/3800-1/9000', recycleTime: 0.5, lumens: 20000, modelingLightPower: 30, modelingLightLux1m: 7000, thumbnail: '/images/gear/elinchrom_elc_500.png', description: 'Bærbart TTL strobe-system med Ranger-batteripakke' },

  // --- Dracast ---
  { id: 'dracast-x4-500', brand: 'Dracast', model: 'X4 500 Bi-Color', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 96, tlci: 96, lux1m: 2600, beamAngle: 115, lumens: 5000, thumbnail: '/images/gear/aputure_300d_ii.png', forwardAxis: '+z', description: 'Kompakt 1x1 bicolor LED panel for studio og felt' },
  
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

  // PRACTICAL INTERIOR LIGHTS
  {
    id: 'practical-floor-lamp',
    brand: 'Practical',
    model: 'Gulvlampe',
    type: 'practical',
    power: 60,
    powerUnit: 'W',
    cct: 2700,
    cri: 90,
    lux1m: 180,
    beamAngle: 200,
    description: 'Stående gulvlampe med sjalusieffekt — varm stemningslys for interi-scener',
    animation: { flicker: false },
  },
  {
    id: 'practical-desk-lamp',
    brand: 'Practical',
    model: 'Bordlampe',
    type: 'practical',
    power: 40,
    powerUnit: 'W',
    cct: 2900,
    cri: 92,
    lux1m: 120,
    beamAngle: 90,
    description: 'Rettet bordlampe — typisk skrivebordslampe for kontorscener',
    animation: { flicker: false },
  },
  {
    id: 'practical-pendant-warm',
    brand: 'Practical',
    model: 'Pendellampe Varm',
    type: 'practical',
    power: 75,
    powerUnit: 'W',
    cct: 2400,
    cri: 88,
    lux1m: 250,
    beamAngle: 360,
    description: 'Hengende pendellampe — restaurantatmosfære, varm tungsten glød',
    animation: { flicker: false },
  },
  {
    id: 'practical-pendant-cool',
    brand: 'Practical',
    model: 'Pendellampe Kjølig',
    type: 'practical',
    power: 75,
    powerUnit: 'W',
    cct: 4000,
    cri: 90,
    lux1m: 280,
    beamAngle: 360,
    description: 'Industriell LED-pendel — loft/urban interiørstil, kjølig hvit',
    animation: { flicker: false },
  },
  {
    id: 'overhead-tube-fluorescent',
    brand: 'Practical',
    model: 'Neon Rørlampe T8',
    type: 'practical',
    power: 36,
    powerUnit: 'W',
    cct: 4100,
    cri: 82,
    lux1m: 1800,
    beamAngle: 180,
    description: 'Klassisk takmontert neonrør (T8 fluorescent) — studio, kjølerom, urban',
    animation: {
      flicker: true,
      flickerIntensity: 0.05,
      flickerSpeed: 0.1,
    },
  },
  {
    id: 'neon-strip-rgb',
    brand: 'Practical',
    model: 'Neon Strip RGB',
    type: 'practical',
    power: 20,
    powerUnit: 'W',
    cct: 5000,
    cri: 75,
    lux1m: 80,
    beamAngle: 180,
    colorGel: '#ff4488',
    description: 'RGB LED-neonstripe for bakgrunn og ambiente — velg farge fritt',
    animation: { flicker: false },
  },
  {
    id: 'window-daylight-emitter',
    brand: 'Atmosphere',
    model: 'Vinduseffekt Dagslys',
    type: 'atmospheric',
    power: 150,
    powerUnit: 'W',
    cct: 5600,
    cri: 95,
    lux1m: 800,
    beamAngle: 80,
    description: 'Simulert dagslysinnfall gjennom vindu — mykt naturlig lys fra siden',
    animation: { flicker: false },
  },
  {
    id: 'window-golden-hour',
    brand: 'Atmosphere',
    model: 'Vinduseffekt Gyllen Time',
    type: 'atmospheric',
    power: 150,
    powerUnit: 'W',
    cct: 3200,
    cri: 95,
    lux1m: 600,
    beamAngle: 60,
    colorGel: '#ffcc66',
    description: 'Gyllen time vindusinnfall — varm solnedgang for romantiske interiørscener',
    animation: { flicker: false },
  },
  {
    id: 'city-glow-ambient',
    brand: 'Atmosphere',
    model: 'Byglød Ambient',
    type: 'atmospheric',
    power: 80,
    powerUnit: 'W',
    cct: 3800,
    cri: 70,
    lux1m: 40,
    beamAngle: 180,
    colorGel: '#ff8833',
    description: 'Diffus bylysglo for nattscener — urbant oransje-gult omgivelseslys',
    animation: { flicker: false },
  },
  {
    id: 'fireplace-glow',
    brand: 'Atmosphere',
    model: 'Peiseffekt',
    type: 'atmospheric',
    power: 30,
    powerUnit: 'W',
    cct: 1800,
    cri: 80,
    lux1m: 60,
    beamAngle: 150,
    colorGel: '#ff5500',
    description: 'Varm, flimrende peisglød — koseleg stemning for interi-scener',
    animation: {
      flicker: true,
      flickerIntensity: 0.35,
      flickerSpeed: 1.5,
    },
  },
  {
    id: 'tv-screen-fill',
    brand: 'Atmosphere',
    model: 'TV-skjerm Ambient',
    type: 'atmospheric',
    power: 25,
    powerUnit: 'W',
    cct: 6500,
    cri: 70,
    lux1m: 30,
    beamAngle: 120,
    colorGel: '#aaccff',
    description: 'Blålig TV-skjermglo for moderne interiørscener — nattatmosfære',
    animation: {
      flicker: true,
      flickerIntensity: 0.15,
      flickerSpeed: 3.0,
    },
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
