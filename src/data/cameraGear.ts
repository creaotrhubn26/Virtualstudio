export interface CameraBody {
  id: string;
  name: string;
  brand: string;
  sensor: string;
  sensorSize: string;
  megapixels: number;
  baseISO: number;
  maxISO: number;
  dynamicRange: number;
  colorDepth: number;
  maxShutter: string;
  flashSync: string;
  category: 'foto' | 'cine';
  ibis?: number;
  burstFps?: number;
  maxFps?: number;
  codec?: string;
  recording?: string;
  image?: string;
}

export interface Lens {
  id: string;
  name: string;
  brand: string;
  focalLength: string;
  aperture: string;
  minAperture: string;
  type: 'prime' | 'zoom' | 'macro' | 'tele' | 'probe';
  minFocusDistance?: number;
  weight?: number;
  filterSize?: number;
  opticalElements?: number;
  image?: string;
}

export const CAMERA_BODIES: CameraBody[] = [
  { 
    id: 'sony-a7iv', name: 'Sony A7 IV', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.9×24mm', megapixels: 33, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.7, colorDepth: 25.4,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 5.5, burstFps: 10,
    category: 'foto',
    image: '/images/gear/sony_a7_iv_camera.png' 
  },
  { 
    id: 'canon-r5', name: 'Canon EOS R5', brand: 'Canon', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 45, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.6, colorDepth: 25.3,
    maxShutter: '1/8000', flashSync: '1/200', ibis: 8, burstFps: 12,
    category: 'foto',
    image: '/images/gear/canon_eos_r5_camera.png' 
  },
  { 
    id: 'nikon-z8', name: 'Nikon Z8', brand: 'Nikon', 
    sensor: 'Full Frame', sensorSize: '35.9×23.9mm', megapixels: 45.7, 
    baseISO: 64, maxISO: 25600, dynamicRange: 14.8, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '1/200', ibis: 6, burstFps: 20,
    category: 'foto',
    image: '/images/gear/nikon_z8_camera.png' 
  },
  { 
    id: 'fuji-xh2s', name: 'Fujifilm X-H2S', brand: 'Fujifilm', 
    sensor: 'APS-C', sensorSize: '23.5×15.6mm', megapixels: 26.1, 
    baseISO: 160, maxISO: 12800, dynamicRange: 12.8, colorDepth: 23.8,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 7, burstFps: 40,
    category: 'foto',
    image: '/images/gear/fujifilm_x-h2s_camera_body.png'
  },
  { 
    id: 'hasselblad-x2d', name: 'Hasselblad X2D 100C', brand: 'Hasselblad', 
    sensor: 'Medium Format', sensorSize: '43.8×32.9mm', megapixels: 100, 
    baseISO: 64, maxISO: 25600, dynamicRange: 15.0, colorDepth: 26.2,
    maxShutter: '1/4000', flashSync: '1/4000', ibis: 7,
    category: 'foto',
    image: '/images/gear/hasselblad_x2d_camera.png' 
  },
  { 
    id: 'phase-one', name: 'Phase One IQ4 150MP', brand: 'Phase One', 
    sensor: 'Medium Format', sensorSize: '53.4×40mm', megapixels: 150, 
    baseISO: 50, maxISO: 12800, dynamicRange: 15.3, colorDepth: 26.4,
    maxShutter: '1/4000', flashSync: '1/1600',
    category: 'foto',
    image: '/images/gear/phase_one_iq4_digital_back.png'
  },
  { 
    id: 'sony-a1', name: 'Sony A1', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.9×24mm', megapixels: 50.1, 
    baseISO: 100, maxISO: 32000, dynamicRange: 15.0, colorDepth: 25.6,
    maxShutter: '1/8000', flashSync: '1/400', ibis: 5.5, burstFps: 30,
    category: 'foto',
    image: '/images/gear/sony_a1_flagship_camera.png'
  },
  { 
    id: 'leica-sl3', name: 'Leica SL3', brand: 'Leica', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 60, 
    baseISO: 100, maxISO: 100000, dynamicRange: 15.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 5,
    category: 'foto',
    image: '/images/gear/leica_sl3_mirrorless_camera.png'
  },
  { 
    id: 'arri-alexa35', name: 'ARRI ALEXA 35', brand: 'ARRI', 
    sensor: 'Super 35', sensorSize: '27.99×19.22mm', megapixels: 14.5, 
    baseISO: 160, maxISO: 6400, dynamicRange: 17.0, colorDepth: 26.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'ARRIRAW, ProRes 4444 XQ', recording: '4.6K',
    category: 'cine',
    image: '/images/gear/arri_alexa_35_cinema_camera.png'
  },
  { 
    id: 'arri-alexamini', name: 'ARRI ALEXA Mini LF', brand: 'ARRI', 
    sensor: 'Large Format', sensorSize: '36.70×25.54mm', megapixels: 13.8, 
    baseISO: 800, maxISO: 3200, dynamicRange: 14.5, colorDepth: 25.8,
    maxShutter: '1/8000', flashSync: '-', maxFps: 90,
    codec: 'ARRIRAW, ProRes 4444 XQ', recording: '4.5K',
    category: 'cine',
    image: '/images/gear/arri_alexa_mini_lf_camera.png'
  },
  { 
    id: 'red-v-raptor', name: 'RED V-RAPTOR 8K VV', brand: 'RED', 
    sensor: 'Vista Vision', sensorSize: '40.96×21.60mm', megapixels: 35.4, 
    baseISO: 800, maxISO: 6400, dynamicRange: 17.0, colorDepth: 26.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 150,
    codec: 'REDCODE RAW 16-bit', recording: '8K',
    category: 'cine',
    image: '/images/gear/red_v-raptor_8k_cube_camera.png'
  },
  { 
    id: 'red-komodo', name: 'RED KOMODO 6K', brand: 'RED', 
    sensor: 'Super 35', sensorSize: '27.03×14.26mm', megapixels: 19.9, 
    baseISO: 800, maxISO: 3200, dynamicRange: 16.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 40,
    codec: 'REDCODE RAW, ProRes 422 HQ', recording: '6K',
    category: 'cine',
    image: '/images/gear/red_komodo_6k_compact_cube.png'
  },
  { 
    id: 'blackmagic-ursa', name: 'Blackmagic URSA Mini Pro 12K', brand: 'Blackmagic', 
    sensor: 'Super 35', sensorSize: '27.03×14.25mm', megapixels: 80, 
    baseISO: 800, maxISO: 3200, dynamicRange: 14.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'Blackmagic RAW 12-bit', recording: '12K',
    category: 'cine',
    image: '/images/gear/blackmagic_ursa_mini_pro_12k.png'
  },
  { 
    id: 'sony-venice2', name: 'Sony VENICE 2 8K', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 49.7, 
    baseISO: 800, maxISO: 3200, dynamicRange: 16.0, colorDepth: 25.8,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'X-OCN, XAVC', recording: '8.6K',
    category: 'cine',
    image: '/images/gear/sony_venice_2_cinema_camera.png'
  },
  { 
    id: 'sony-fx6', name: 'Sony FX6', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.6×23.8mm', megapixels: 10.2, 
    baseISO: 800, maxISO: 409600, dynamicRange: 15.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'XAVC-I, XAVC-L', recording: '4K',
    category: 'cine',
    image: '/images/gear/sony_fx6_cinema_camera.png'
  },
  { 
    id: 'canon-c70', name: 'Canon C70', brand: 'Canon', 
    sensor: 'Super 35', sensorSize: '26.2×13.8mm', megapixels: 8.85, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC', recording: '4K',
    category: 'cine',
    image: '/images/gear/canon_c70_cinema_camera.png'
  },
  { 
    id: 'canon-c80', name: 'Canon C80', brand: 'Canon', 
    sensor: 'Full Frame BSI', sensorSize: '36×24mm', megapixels: 18.0, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.5, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC', recording: '6K',
    category: 'cine',
    image: '/images/gear/canon_c80_camera.png'
  },
  { 
    id: 'canon-c50', name: 'Canon C50', brand: 'Canon', 
    sensor: 'Full Frame BSI', sensorSize: '36×24mm', megapixels: 20.0, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.5, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'Cinema RAW Light, XF-AVC', recording: '7K',
    category: 'cine',
    image: '/images/gear/canon_c50_camera.png'
  },
  { 
    id: 'panasonic-s1h', name: 'Panasonic S1H', brand: 'Panasonic', 
    sensor: 'Full Frame', sensorSize: '35.6×23.8mm', megapixels: 24.2, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.0, colorDepth: 24.8,
    maxShutter: '1/8000', flashSync: '1/320', ibis: 6.5, maxFps: 60,
    codec: 'V-Log, 10-bit 4:2:2', recording: '6K',
    category: 'cine',
    image: '/images/gear/panasonic_s1h_camera.png'
  },
];

export const LENSES: Lens[] = [
  { id: 'sony-24-70', name: 'Sony 24-70mm f/2.8 GM II', brand: 'Sony', focalLength: '24-70mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'zoom', minFocusDistance: 0.21, weight: 695, filterSize: 82, opticalElements: 20, image: '/images/gear/sony_24-70mm_gm_ii_lens.png' },
  { id: 'sony-85', name: 'Sony 85mm f/1.4 GM', brand: 'Sony', focalLength: '85mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.80, weight: 820, filterSize: 77, opticalElements: 11, image: '/images/gear/sony_85mm_gm_lens.png' },
  { id: 'sony-50', name: 'Sony 50mm f/1.2 GM', brand: 'Sony', focalLength: '50mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.40, weight: 778, filterSize: 72, opticalElements: 14, image: '/images/gear/sony_50mm_gm_lens.png' },
  { id: 'sony-90-macro', name: 'Sony 90mm f/2.8 Macro G OSS', brand: 'Sony', focalLength: '90mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'macro', minFocusDistance: 0.28, weight: 602, filterSize: 62, opticalElements: 15, image: '/images/gear/sony_90mm_macro_lens.png' },
  { id: 'canon-rf85', name: 'Canon RF 85mm f/1.2L USM', brand: 'Canon', focalLength: '85mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.85, weight: 1195, filterSize: 82, opticalElements: 13, image: '/images/gear/canon_rf_85mm_lens.png' },
  { id: 'canon-rf100-macro', name: 'Canon RF 100mm f/2.8L Macro IS', brand: 'Canon', focalLength: '100mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'macro', minFocusDistance: 0.26, weight: 685, filterSize: 67, opticalElements: 17, image: '/images/gear/canon_rf_100mm_macro_l_lens.png' },
  { id: 'canon-rf70-200', name: 'Canon RF 70-200mm f/2.8L IS', brand: 'Canon', focalLength: '70-200mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'tele', minFocusDistance: 0.70, weight: 1070, filterSize: 77, opticalElements: 17, image: '/images/gear/canon_rf_70-200mm_lens.png' },
  { id: 'nikon-z50', name: 'Nikon Z 50mm f/1.2 S', brand: 'Nikon', focalLength: '50mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.45, weight: 1090, filterSize: 82, opticalElements: 17, image: '/images/gear/nikon_z_50mm_lens.png' },
  { id: 'nikon-z105-macro', name: 'Nikon Z MC 105mm f/2.8 VR S', brand: 'Nikon', focalLength: '105mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'macro', minFocusDistance: 0.29, weight: 630, filterSize: 62, opticalElements: 16, image: '/images/gear/nikon_z_mc_105mm_macro_lens.png' },
  { id: 'sigma-art35', name: 'Sigma 35mm f/1.4 DG DN Art', brand: 'Sigma', focalLength: '35mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.30, weight: 645, filterSize: 67, opticalElements: 15, image: '/images/gear/sigma_35mm_art_lens.png' },
  { id: 'sigma-105-macro', name: 'Sigma 105mm f/2.8 DG DN Macro Art', brand: 'Sigma', focalLength: '105mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'macro', minFocusDistance: 0.295, weight: 715, filterSize: 62, opticalElements: 17, image: '/images/gear/sigma_105mm_macro_lens.png' },
  { id: 'zeiss-otus85', name: 'Zeiss Otus 85mm f/1.4 APO', brand: 'Zeiss', focalLength: '85mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.80, weight: 1140, filterSize: 86, opticalElements: 11, image: '/images/gear/zeiss_otus_85mm_lens.png' },
  { id: 'laowa-probe', name: 'Laowa 24mm f/14 2x Macro Probe', brand: 'Laowa', focalLength: '24mm', aperture: 'f/14', minAperture: 'f/40', type: 'probe', minFocusDistance: 0.02, weight: 474, opticalElements: 27, image: '/images/gear/laowa_probe_macro_lens.png' },
  { id: 'laowa-probe-cine', name: 'Laowa 24mm T14 2x Periprobe', brand: 'Laowa', focalLength: '24mm', aperture: 'T/14', minAperture: 'T/40', type: 'probe', minFocusDistance: 0.02, weight: 770, opticalElements: 28, image: '/images/gear/laowa_periprobe_cine_macro_lens.png' },
  { id: 'innovision-probe', name: 'Innovision Probe II Plus', brand: 'Innovision', focalLength: '9.8mm', aperture: 'f/5.6', minAperture: 'f/22', type: 'probe', minFocusDistance: 0.01, weight: 1200, image: '/images/gear/innovision_probe_ii_plus_lens.png' },
];

export function getLensFocalLength(lens: Lens): number {
  const match = lens.focalLength.match(/(\d+)(?:-(\d+))?mm/);
  if (match) {
    if (match[2]) {
      return Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
    }
    return parseInt(match[1]);
  }
  return 50;
}

export function getLensAperture(lens: Lens): number {
  const match = lens.aperture.match(/[fT]\/([\d.]+)/);
  return match ? parseFloat(match[1]) : 2.8;
}
