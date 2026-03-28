import { resolveScenarioPresetPreview } from '@/core/services/lightingPatternIntelligence';

export interface ScenarioPreset {
  id: string;
  navn: string;
  kategori: 'bryllup' | 'portrett' | 'mote' | 'naeringsliv' | 'hollywood' | 'skolefoto';
  beskrivelse: string;
  tags: string[];
  previewImage?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  usedIn?: string[];
  sceneConfig: {
    lights: Array<{
      type: string;
      position: [number, number, number];
      rotation: [number, number, number];
      intensity: number;
      color?: string;
      cct?: number;
      modifier?: string;
    }>;
    backdrop?: {
      type: string;
      color?: string;
    };
    camera?: {
      position: [number, number, number];
      target: [number, number, number];
      focalLength?: number;
    };
    gear?: {
      setupType?: 'foto' | 'video';
      cameraBodyId?: string;
      cameraLabel?: string;
      cameraCount?: number;
      lensId?: string;
      lensLabel?: string;
      lightCount?: number;
      lightTypes?: string[];
      fixtureIds?: string[];
    };
  };
  recommendedAssets: {
    lights: string[];
    modifiers: string[];
    backdrops: string[];
  };
}

const RAW_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'bryllup-klassisk',
    navn: 'Bryllup - Klassisk',
    kategori: 'bryllup',
    beskrivelse: 'Romantisk og bløt belysning for bryllupsportretter. Varm fargetemperatur med myk skygge.',
    tags: ['bryllup', 'romantisk', 'bløt', 'varm'],
    previewImage: '/images/presets/bryllup-klassisk.png',
    sceneConfig: {
      lights: [
        {
          type: 'softbox',
          position: [-2, 2.5, 2],
          rotation: [0, 45, 0],
          intensity: 0.8,
          cct: 4500,
          modifier: 'octabox-120'
        },
        {
          type: 'softbox',
          position: [2, 2, 1],
          rotation: [0, -30, 0],
          intensity: 0.4,
          cct: 4500,
          modifier: 'stripbox-30x120'
        },
        {
          type: 'backdrop-light',
          position: [0, 1, -3],
          rotation: [0, 180, 0],
          intensity: 0.3,
          cct: 3500
        }
      ],
      backdrop: {
        type: 'muslin',
        color: '#f5e6d3'
      },
      camera: {
        position: [0, 1.6, 4],
        target: [0, 1.4, 0],
        focalLength: 85
      }
    },
    recommendedAssets: {
      lights: ['godox-ad600-pro', 'profoto-b10'],
      modifiers: ['octabox-120', 'stripbox-30x120', 'umbrella-white'],
      backdrops: ['muslin-cream', 'velvet-ivory']
    }
  },
  {
    id: 'portrett-studio',
    navn: 'Portrett - Studio',
    kategori: 'portrett',
    beskrivelse: 'Klassisk 3-punkt belysning for profesjonelle portretter. Balansert og flatterende.',
    tags: ['portrett', 'studio', 'klassisk', '3-punkt'],
    previewImage: '/images/presets/portrett-studio.png',
    sceneConfig: {
      lights: [
        {
          type: 'key-light',
          position: [-1.5, 2.2, 2],
          rotation: [0, 35, 0],
          intensity: 1.0,
          cct: 5600,
          modifier: 'softbox-60x90'
        },
        {
          type: 'fill-light',
          position: [1.5, 1.8, 2],
          rotation: [0, -25, 0],
          intensity: 0.5,
          cct: 5600,
          modifier: 'umbrella-white'
        },
        {
          type: 'rim-light',
          position: [1, 2.5, -1.5],
          rotation: [0, 150, 0],
          intensity: 0.6,
          cct: 5600,
          modifier: 'stripbox-15x60'
        }
      ],
      backdrop: {
        type: 'seamless',
        color: '#808080'
      },
      camera: {
        position: [0, 1.5, 3.5],
        target: [0, 1.5, 0],
        focalLength: 105
      }
    },
    recommendedAssets: {
      lights: ['profoto-d2-1000', 'godox-ad400-pro'],
      modifiers: ['softbox-60x90', 'umbrella-white', 'stripbox-15x60', 'reflector-5in1'],
      backdrops: ['seamless-gray', 'seamless-white', 'seamless-black']
    }
  },
  {
    id: 'mote-editorial',
    navn: 'Mote - Editorial',
    kategori: 'mote',
    beskrivelse: 'Dramatisk og kreativ belysning for motefotografering. Sterk kontrast og rim-lys.',
    tags: ['mote', 'editorial', 'dramatisk', 'kontrast'],
    previewImage: '/images/presets/mote-editorial.png',
    sceneConfig: {
      lights: [
        {
          type: 'beauty-dish',
          position: [0, 2.5, 2],
          rotation: [-15, 0, 0],
          intensity: 1.0,
          cct: 5600,
          modifier: 'beauty-dish-56'
        },
        {
          type: 'rim-light',
          position: [-2, 2, -1],
          rotation: [0, 120, 0],
          intensity: 0.8,
          cct: 5600,
          modifier: 'stripbox-15x60'
        },
        {
          type: 'rim-light',
          position: [2, 2, -1],
          rotation: [0, -120, 0],
          intensity: 0.8,
          cct: 5600,
          modifier: 'stripbox-15x60'
        },
        {
          type: 'floor-light',
          position: [0, 0.3, 1.5],
          rotation: [45, 0, 0],
          intensity: 0.3,
          cct: 5600
        }
      ],
      backdrop: {
        type: 'seamless',
        color: '#1a1a1a'
      },
      camera: {
        position: [0, 1.4, 4],
        target: [0, 1.3, 0],
        focalLength: 70
      }
    },
    recommendedAssets: {
      lights: ['profoto-b10-plus', 'aputure-600d-pro'],
      modifiers: ['beauty-dish-56', 'stripbox-15x60', 'grid-40'],
      backdrops: ['seamless-black', 'seamless-white']
    }
  },
  {
    id: 'naeringsliv-headshot',
    navn: 'Næringsliv - Headshot',
    kategori: 'naeringsliv',
    beskrivelse: 'Profesjonell og jevn belysning for bedriftsportretter. Rent og tillitsvekkende uttrykk.',
    tags: ['næringsliv', 'headshot', 'profesjonell', 'bedrift'],
    previewImage: '/images/presets/naeringsliv-headshot.png',
    sceneConfig: {
      lights: [
        {
          type: 'key-light',
          position: [-1, 2, 2.5],
          rotation: [0, 25, 0],
          intensity: 0.9,
          cct: 5600,
          modifier: 'softbox-90x120'
        },
        {
          type: 'fill-light',
          position: [1.2, 1.8, 2],
          rotation: [0, -20, 0],
          intensity: 0.6,
          cct: 5600,
          modifier: 'softbox-60x60'
        },
        {
          type: 'hair-light',
          position: [0.5, 2.8, -0.5],
          rotation: [-45, 0, 0],
          intensity: 0.4,
          cct: 5600,
          modifier: 'stripbox-15x60'
        },
        {
          type: 'background-light',
          position: [0, 1, -2.5],
          rotation: [0, 180, 0],
          intensity: 0.5,
          cct: 5600
        }
      ],
      backdrop: {
        type: 'seamless',
        color: '#e8e8e8'
      },
      camera: {
        position: [0, 1.6, 3],
        target: [0, 1.55, 0],
        focalLength: 85
      }
    },
    recommendedAssets: {
      lights: ['elinchrom-elc-pro-hd-500', 'godox-ad200-pro'],
      modifiers: ['softbox-90x120', 'softbox-60x60', 'stripbox-15x60'],
      backdrops: ['seamless-light-gray', 'seamless-white']
    }
  },
  // Hollywood Lighting Patterns
  {
    id: 'hollywood-rembrandt',
    navn: 'Rembrandt Lighting',
    kategori: 'hollywood',
    beskrivelse: 'Key light 45° til siden, 30° over øyehøyde. Skaper trekantformet lys på kinnet. Fill svak eller reflektor.',
    tags: ['hollywood', 'rembrandt', 'portrett', 'dramatisk'],
    previewImage: '/images/presets/hollywood-rembrandt.png',
    difficulty: 'beginner',
    usedIn: ['The Godfather', 'Girl with a Pearl Earring'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-2, 2.2, 1], rotation: [-30, 45, 0], intensity: 1.0, cct: 5600, modifier: 'softbox' },
        { type: 'fill-light', position: [2, 1.5, 1.5], rotation: [0, -45, 0], intensity: 0.25, cct: 5600, modifier: 'reflector-white' }
      ],
      backdrop: { type: 'seamless', color: '#2a2a2a' },
      camera: { position: [0, 1.6, 3.5], target: [0, 1.5, 0], focalLength: 85 }
    },
    recommendedAssets: { lights: ['profoto-b10'], modifiers: ['softbox-60x90'], backdrops: ['seamless-gray'] }
  },
  {
    id: 'hollywood-butterfly',
    navn: 'Butterfly / Paramount',
    kategori: 'hollywood',
    beskrivelse: 'Beauty dish direkte foran, 45° over øyehøyde. Reflektor under haken fyller skygger. Fremhever kinnben.',
    tags: ['hollywood', 'butterfly', 'paramount', 'glamour', 'beauty'],
    previewImage: '/images/presets/hollywood-butterfly.png',
    difficulty: 'beginner',
    usedIn: ['Marlene Dietrich films', 'Vogue covers'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [0, 2.5, 1.5], rotation: [-45, 0, 0], intensity: 1.0, cct: 5600, modifier: 'beauty-dish' },
        { type: 'fill-light', position: [0, 0.5, 1.5], rotation: [45, 0, 0], intensity: 0.4, cct: 5600, modifier: 'reflector-white' }
      ],
      backdrop: { type: 'seamless', color: '#ffffff' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 85 }
    },
    recommendedAssets: { lights: ['profoto-b10'], modifiers: ['beauty-dish-56', 'reflector-white'], backdrops: ['seamless-white'] }
  },
  {
    id: 'hollywood-split',
    navn: 'Split Lighting',
    kategori: 'hollywood',
    beskrivelse: 'Key light eksakt 90° til siden, på øyehøyde. Deler ansiktet vertikalt. Ingen fill for maksimal kontrast.',
    tags: ['hollywood', 'split', 'dramatisk', 'mystisk'],
    previewImage: '/images/presets/hollywood-split.png',
    difficulty: 'beginner',
    usedIn: ['The Dark Knight', 'Breaking Bad'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-3, 1.6, 0], rotation: [0, 90, 0], intensity: 1.0, cct: 5600, modifier: 'barn-doors' }
      ],
      backdrop: { type: 'seamless', color: '#0a0a0a' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 85 }
    },
    recommendedAssets: { lights: ['aputure-600d-pro'], modifiers: ['barn-doors', 'grid-40'], backdrops: ['seamless-black'] }
  },
  {
    id: 'hollywood-loop',
    navn: 'Loop Lighting',
    kategori: 'hollywood',
    beskrivelse: 'Key light 30-45° til siden, litt over øyehøyde. Skaper loop-skygge fra nesen. Mest universelt flatterende.',
    tags: ['hollywood', 'loop', 'portrett', 'flatterende'],
    previewImage: '/images/presets/hollywood-loop.png',
    difficulty: 'beginner',
    usedIn: ['Corporate headshots', 'Magazine portraits'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-1.5, 2.1, 1.5], rotation: [-30, 35, 0], intensity: 1.0, cct: 5600, modifier: 'softbox' },
        { type: 'fill-light', position: [1.5, 1.6, 1.5], rotation: [0, -35, 0], intensity: 0.33, cct: 5600, modifier: 'reflector-white' }
      ],
      backdrop: { type: 'seamless', color: '#404040' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 85 }
    },
    recommendedAssets: { lights: ['godox-ad600-pro'], modifiers: ['softbox-60x90'], backdrops: ['seamless-gray'] }
  },
  {
    id: 'hollywood-three-point',
    navn: 'Three-Point Lighting',
    kategori: 'hollywood',
    beskrivelse: 'Key 45° side, Fill motsatt (50% styrke), Back bak for separasjon. Standard 2:1 ratio for naturlig look.',
    tags: ['hollywood', '3-punkt', 'klassisk', 'balansert'],
    previewImage: '/images/presets/hollywood-three-point.png',
    difficulty: 'beginner',
    usedIn: ['Interviews', 'Corporate videos', 'News broadcasts'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-2, 2.2, 1.5], rotation: [-30, 45, 0], intensity: 1.0, cct: 5600, modifier: 'softbox' },
        { type: 'fill-light', position: [2, 1.6, 1.5], rotation: [0, -45, 0], intensity: 0.5, cct: 5600, modifier: 'umbrella-white' },
        { type: 'back-light', position: [1, 2.5, -2], rotation: [-45, 150, 0], intensity: 0.7, cct: 5600, modifier: 'stripbox-15x60' }
      ],
      backdrop: { type: 'seamless', color: '#505050' },
      camera: { position: [0, 1.6, 3.5], target: [0, 1.5, 0], focalLength: 50 }
    },
    recommendedAssets: { lights: ['godox-ad600-pro', 'aputure-300d-ii'], modifiers: ['softbox-90x120', 'umbrella-white', 'stripbox-15x60'], backdrops: ['seamless-gray'] }
  },
  {
    id: 'hollywood-high-key',
    navn: 'High Key Lighting',
    kategori: 'hollywood',
    beskrivelse: 'Flere lys for jevn, lys belysning. 1:1 ratio key/fill. Bakgrunn 1-2 stopp lysere enn motiv for ren hvit.',
    tags: ['hollywood', 'high-key', 'lyst', 'optimistisk'],
    previewImage: '/images/presets/hollywood-high-key.png',
    difficulty: 'intermediate',
    usedIn: ['Product photography', 'Medical imaging', 'Comedy films'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [0, 2.2, 2], rotation: [-30, 0, 0], intensity: 1.0, cct: 5600, modifier: 'octabox-150' },
        { type: 'fill-light', position: [-2, 1.6, 1.5], rotation: [0, 30, 0], intensity: 0.8, cct: 5600, modifier: 'softbox-90x120' },
        { type: 'fill-light', position: [2, 1.6, 1.5], rotation: [0, -30, 0], intensity: 0.8, cct: 5600, modifier: 'softbox-90x120' },
        { type: 'background-light', position: [-1.5, 1.5, -3], rotation: [0, 180, 0], intensity: 1.2, cct: 5600 },
        { type: 'background-light', position: [1.5, 1.5, -3], rotation: [0, 180, 0], intensity: 1.2, cct: 5600 }
      ],
      backdrop: { type: 'seamless', color: '#ffffff' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 50 }
    },
    recommendedAssets: { lights: ['elinchrom-elc-pro-hd-1000'], modifiers: ['octabox-150', 'softbox-90x120'], backdrops: ['seamless-white'] }
  },
  {
    id: 'hollywood-low-key',
    navn: 'Low Key / Film Noir',
    kategori: 'hollywood',
    beskrivelse: 'Ett hardt lys, 45-90° vinkel, ingen fill. Grid eller barn doors for kontroll. 8:1 ratio for maksimal noir-stil.',
    tags: ['hollywood', 'low-key', 'noir', 'dramatisk', 'mørk'],
    previewImage: '/images/presets/hollywood-low-key.png',
    difficulty: 'intermediate',
    usedIn: ['Film noir', 'Thriller films', 'Sin City'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-2.5, 2.2, 0.5], rotation: [-20, 75, 0], intensity: 1.0, cct: 5600, modifier: 'grid-20' }
      ],
      backdrop: { type: 'seamless', color: '#0a0a0a' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 50 }
    },
    recommendedAssets: { lights: ['aputure-600d-pro'], modifiers: ['grid-20', 'barn-doors', 'snoot'], backdrops: ['seamless-black'] }
  },
  {
    id: 'hollywood-clamshell',
    navn: 'Clamshell Lighting',
    kategori: 'hollywood',
    beskrivelse: 'Beauty dish over (45° ned) og reflektor/fill under (45° opp). Key 2 stopp over fill for dimensjon.',
    tags: ['hollywood', 'clamshell', 'beauty', 'minimale-skygger'],
    previewImage: '/images/presets/hollywood-clamshell.png',
    difficulty: 'intermediate',
    usedIn: ['Beauty campaigns', 'Cosmetics advertising'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [0, 2.2, 1.5], rotation: [-45, 0, 0], intensity: 1.0, cct: 5600, modifier: 'beauty-dish' },
        { type: 'fill-light', position: [0, 0.5, 1.5], rotation: [45, 0, 0], intensity: 0.25, cct: 5600, modifier: 'reflector-white' }
      ],
      backdrop: { type: 'seamless', color: '#ffffff' },
      camera: { position: [0, 1.6, 2.5], target: [0, 1.5, 0], focalLength: 100 }
    },
    recommendedAssets: { lights: ['profoto-b10-plus'], modifiers: ['beauty-dish-56', 'reflector-silver'], backdrops: ['seamless-white'] }
  },
  {
    id: 'hollywood-rim-light',
    navn: 'Rim Light / Edge Light',
    kategori: 'hollywood',
    beskrivelse: 'To lys bak motivet i 45° vinkel. Skaper lysende kant for separasjon. Svak fill foran for detaljer.',
    tags: ['hollywood', 'rim', 'edge', 'kantlys', 'separasjon'],
    previewImage: '/images/presets/hollywood-rim-light.png',
    difficulty: 'intermediate',
    usedIn: ['Music performances', 'Sports photography', 'Dramatic portraits'],
    sceneConfig: {
      lights: [
        { type: 'rim-light', position: [-2, 2, -1.5], rotation: [-30, 135, 0], intensity: 1.0, cct: 5600, modifier: 'stripbox-30x120' },
        { type: 'rim-light', position: [2, 2, -1.5], rotation: [-30, -135, 0], intensity: 1.0, cct: 5600, modifier: 'stripbox-30x120' },
        { type: 'fill-light', position: [0, 1.5, 2.5], rotation: [0, 0, 0], intensity: 0.3, cct: 5600, modifier: 'softbox-60x90' }
      ],
      backdrop: { type: 'seamless', color: '#0a0a0a' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 85 }
    },
    recommendedAssets: { lights: ['aputure-300d-ii'], modifiers: ['stripbox-30x120', 'grid-40'], backdrops: ['seamless-black'] }
  },
  {
    id: 'hollywood-chiaroscuro',
    navn: 'Chiaroscuro',
    kategori: 'hollywood',
    beskrivelse: 'Ett dominant lys i 45° vinkel. Varm CCT (3200K) for renessanse-stemning. Dramatisk gradient fra lys til mørke.',
    tags: ['hollywood', 'chiaroscuro', 'renessanse', 'kunstnerisk'],
    previewImage: '/images/presets/hollywood-chiaroscuro.png',
    difficulty: 'advanced',
    usedIn: ['Barry Lyndon', 'Caravaggio paintings'],
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-2, 2.5, 0.5], rotation: [-25, 45, 0], intensity: 1.0, cct: 3200, modifier: 'fresnel' }
      ],
      backdrop: { type: 'seamless', color: '#050505' },
      camera: { position: [0, 1.6, 3], target: [0, 1.5, 0], focalLength: 50 }
    },
    recommendedAssets: { lights: ['aputure-60x'], modifiers: ['fresnel', 'barn-doors', 'grid-40'], backdrops: ['seamless-black'] }
  },
  {
    id: 'skolefoto-portrett',
    navn: 'Skolefoto - Portrett',
    kategori: 'skolefoto',
    beskrivelse: 'Enkelt 1-lys oppsett med reflektor. 85mm brennvidde (70-200 f/4) gir flatterende ansiktskompresjon. Hvit reflektor ved midjehøyde fyller skygger.',
    tags: ['skolefoto', 'portrett', 'barn', 'skole', 'individuell', 'enkelt', '1-lys', '70-200', '85mm'],
    previewImage: '/images/presets/skolefoto-portrett.png',
    difficulty: 'beginner',
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [0, 2.2, 1.5], rotation: [-25, 0, 0], intensity: 0.9, cct: 5500, modifier: 'octabox-120' },
        { type: 'reflector', position: [0, 0.8, 1.2], rotation: [45, 0, 0], intensity: 0, cct: 5500, modifier: 'reflector-white' }
      ],
      backdrop: { type: 'seamless', color: '#4a7c9b' },
      camera: { position: [0, 1.4, 2.5], target: [0, 1.3, 0], focalLength: 85 }
    },
    recommendedAssets: { lights: ['godox-ad200-pro'], modifiers: ['octabox-120', 'reflector-white-42'], backdrops: ['seamless-blue', 'seamless-grey'] }
  },
  {
    id: 'skolefoto-gruppe-liten',
    navn: 'Skolefoto - Liten Gruppe',
    kategori: 'skolefoto',
    beskrivelse: 'Enkelt 2-lys oppsett for 5-15 elever. 50mm brennvidde (24-105 f/4) balanserer dekning og minimal forvrengning. f/8-f/10 for skarphet.',
    tags: ['skolefoto', 'gruppe', 'klasse', 'barn', 'team', 'enkelt', '2-lys', '24-105', '50mm'],
    previewImage: '/images/presets/skolefoto-gruppe-liten.png',
    difficulty: 'beginner',
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-2.5, 2.5, 3], rotation: [0, 45, 0], intensity: 0.85, cct: 5500, modifier: 'umbrella-white-xl' },
        { type: 'key-light', position: [2.5, 2.5, 3], rotation: [0, -45, 0], intensity: 0.85, cct: 5500, modifier: 'umbrella-white-xl' }
      ],
      backdrop: { type: 'seamless', color: '#5a8fa8' },
      camera: { position: [0, 1.6, 6], target: [0, 1.2, 0], focalLength: 50 }
    },
    recommendedAssets: { lights: ['godox-ad400-pro'], modifiers: ['umbrella-white-xl'], backdrops: ['seamless-blue', 'seamless-grey'] }
  },
  {
    id: 'skolefoto-gruppe-stor',
    navn: 'Skolefoto - Stor Gruppe',
    kategori: 'skolefoto',
    beskrivelse: 'Enkelt 2-lys oppsett for 15-30+ elever. 35mm brennvidde (24-105 f/4) for bred dekning. f/8-f/11 sikrer alle rader skarpe.',
    tags: ['skolefoto', 'gruppe', 'klasse', 'stor', 'team', 'lag', 'enkelt', '2-lys', '24-105', '35mm'],
    previewImage: '/images/presets/skolefoto-gruppe-stor.png',
    difficulty: 'intermediate',
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [-3.5, 3, 4], rotation: [0, 45, 0], intensity: 1.0, cct: 5500, modifier: 'para-umbrella-180' },
        { type: 'key-light', position: [3.5, 3, 4], rotation: [0, -45, 0], intensity: 1.0, cct: 5500, modifier: 'para-umbrella-180' }
      ],
      backdrop: { type: 'seamless', color: '#3d6a80' },
      camera: { position: [0, 2, 8], target: [0, 1.3, 0], focalLength: 35 }
    },
    recommendedAssets: { lights: ['godox-ad600-pro'], modifiers: ['para-umbrella-180'], backdrops: ['seamless-blue', 'muslin-grey'] }
  },
  {
    id: 'skolefoto-sosken',
    navn: 'Skolefoto - Søsken',
    kategori: 'skolefoto',
    beskrivelse: 'Enkelt 1-lys oppsett med reflektor for 2-4 søsken. 70mm brennvidde (24-105 eller 70-200 f/4) gir naturlig perspektiv.',
    tags: ['skolefoto', 'søsken', 'familie', 'barn', 'gruppe', 'enkelt', '1-lys', '24-105', '70-200', '70mm'],
    previewImage: '/images/presets/skolefoto-sosken.png',
    difficulty: 'beginner',
    sceneConfig: {
      lights: [
        { type: 'key-light', position: [0, 2.3, 2], rotation: [-20, 0, 0], intensity: 0.95, cct: 5500, modifier: 'octabox-150' },
        { type: 'reflector', position: [0, 0.7, 1.5], rotation: [50, 0, 0], intensity: 0, cct: 5500, modifier: 'reflector-white' }
      ],
      backdrop: { type: 'seamless', color: '#4a7c9b' },
      camera: { position: [0, 1.4, 3.5], target: [0, 1.2, 0], focalLength: 70 }
    },
    recommendedAssets: { lights: ['godox-ad400-pro'], modifiers: ['octabox-150', 'reflector-white-42'], backdrops: ['seamless-blue', 'seamless-grey'] }
  }
];

export const scenarioPresets: ScenarioPreset[] = RAW_SCENARIO_PRESETS.map((preset) => ({
  ...preset,
  previewImage: resolveScenarioPresetPreview(preset.id, preset.previewImage, preset.kategori),
}));

export const getPresetsByKategori = (kategori: string): ScenarioPreset[] => {
  if (kategori === 'alle') return scenarioPresets;
  return scenarioPresets.filter(p => p.kategori === kategori);
};

export const getPresetById = (id: string): ScenarioPreset | undefined => {
  return scenarioPresets.find(p => p.id === id);
};
