export interface StoryCharacterManifest {
  id: string;
  role: string;
  avatarType: string;
  poseId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
}

export interface StoryPropManifest {
  id: string;
  propId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  label: string;
}

export interface ScenarioPreset {
  id: string;
  navn: string;
  kategori: 'bryllup' | 'portrett' | 'mote' | 'naeringsliv' | 'hollywood' | 'skolefoto' | 'story';
  beskrivelse: string;
  tags: string[];
  previewImage?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  usedIn?: string[];
  characters?: StoryCharacterManifest[];
  props?: StoryPropManifest[];
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

export const scenarioPresets: ScenarioPreset[] = [
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
  },

  // ============================================================
  // STORY SCENES: "NAPOLI DREAMS" — Tre akter, én fortelling
  // En komplett produksjonsserie for en pizzarestaurant-merkevare.
  // ============================================================
  {
    id: 'story-napoli-akt1-restaurant',
    navn: 'Napoli Dreams — Akt 1: Restauranten',
    kategori: 'story',
    beskrivelse: 'Akt 1 av 3 — Ambiente og atmosfære i en autentisk italiensk pizzarestaurant. Stearinlys og varme tungstenlys skaper magisk, intim stemning. Perfekt for mat-innhold på sosiale medier, menybilder og restaurantpresentasjon. Fortellingen begynner her — i restaurantens hjerte.',
    tags: ['story', 'napoli-dreams', 'restaurant', 'mat', 'atmosfære', 'stearinlys', 'tungsten', 'varm', 'intim', 'pizzeria', 'akt-1'],
    difficulty: 'intermediate',
    usedIn: ['Napoli Dreams — Akt 1 av 3', 'Restaurantfotografering', 'Social media innhold'],
    characters: [
      {
        id: 'char-akt1-waiter',
        role: 'Kelner',
        avatarType: 'man',
        poseId: 'commercial_welcoming',
        position: [-0.6, 0, 0.3],
        rotation: [0, 15, 0],
        label: 'Kelner',
      },
      {
        id: 'char-akt1-guest',
        role: 'Gjest',
        avatarType: 'woman',
        poseId: 'commercial_seated_diner',
        position: [0.8, 0, 0.6],
        rotation: [0, -20, 0],
        label: 'Gjest',
      },
    ],
    props: [
      { id: 'prop-akt1-table', propId: 'dining-table', position: [0, 0, 0.4], rotation: [0, 0, 0], label: 'Restaurantbord' },
      { id: 'prop-akt1-chair-l', propId: 'wooden-chair-restaurant', position: [-0.5, 0, 0.8], rotation: [0, 20, 0], label: 'Restaurantstol venstre' },
      { id: 'prop-akt1-chair-r', propId: 'wooden-chair-restaurant', position: [0.5, 0, 0.8], rotation: [0, -20, 0], label: 'Restaurantstol høyre' },
      { id: 'prop-akt1-wine', propId: 'wine_bottle_red', position: [0.15, 0.76, 0.4], rotation: [0, 20, 0], label: 'Rødvin' },
      { id: 'prop-akt1-pizza', propId: 'pizza-plate', position: [-0.1, 0.76, 0.4], rotation: [0, 0, 0], label: 'Pizza på tallerk' },
      { id: 'prop-akt1-candle-l', propId: 'candle-holder', position: [-0.3, 0.76, 0.5], rotation: [0, 0, 0], label: 'Stearinlys venstre' },
      { id: 'prop-akt1-candle-r', propId: 'candle-holder', position: [0.3, 0.76, 0.5], rotation: [0, 0, 0], label: 'Stearinlys høyre' },
      { id: 'prop-akt1-counter', propId: 'chef-counter', position: [0, 0, -1.0], rotation: [0, 0, 0], label: 'Kjøkkenbenk (bakgrunn)' },
    ],
    sceneConfig: {
      lights: [
        {
          type: 'practical',
          position: [0, 2.6, -0.5],
          rotation: [0, 0, 0],
          intensity: 0.7,
          cct: 2700,
          color: '#ff8c1a',
          modifier: 'bare-bulb'
        },
        {
          type: 'practical',
          position: [-1.2, 2.5, 0.5],
          rotation: [0, 20, 0],
          intensity: 0.5,
          cct: 2700,
          color: '#ff7a00',
          modifier: 'bare-bulb'
        },
        {
          type: 'key-light',
          position: [-1.5, 2.0, 1.5],
          rotation: [-20, 35, 0],
          intensity: 0.6,
          cct: 3200,
          color: '#ffaa44',
          modifier: 'softbox-60x60'
        },
        {
          type: 'fill-light',
          position: [1.8, 1.4, 1.8],
          rotation: [0, -30, 0],
          intensity: 0.25,
          cct: 2800,
          color: '#ff9900',
          modifier: 'umbrella-white'
        },
        {
          type: 'atmospheric',
          position: [-0.3, 0.85, 0.8],
          rotation: [0, 0, 0],
          intensity: 0.35,
          cct: 1800,
          color: '#ff6600',
          modifier: 'candle'
        },
        {
          type: 'atmospheric',
          position: [0.6, 0.85, 1.0],
          rotation: [0, 0, 0],
          intensity: 0.3,
          cct: 1800,
          color: '#ff6600',
          modifier: 'candle'
        },
        {
          type: 'rim-light',
          position: [2.0, 2.2, -1.5],
          rotation: [-15, 140, 0],
          intensity: 0.4,
          cct: 3000,
          color: '#ffcc66',
          modifier: 'stripbox-15x60'
        }
      ],
      backdrop: {
        type: 'muslin',
        color: '#1c0e06'
      },
      camera: {
        position: [0, 1.15, 2.8],
        target: [0, 0.75, 0],
        focalLength: 85
      },
      gear: {
        setupType: 'foto',
        cameraBodyId: 'sony-a7r5',
        cameraLabel: 'Sony A7R V',
        lensId: 'sony-fe-85mm-f14-gm',
        lensLabel: '85mm f/1.4 GM',
        lightCount: 7,
        lightTypes: ['practical', 'atmospheric', 'led'],
        fixtureIds: ['candle-light', 'nanlite-forza60', 'aputure-60x']
      }
    },
    recommendedAssets: {
      lights: ['candle-light', 'nanlite-forza60', 'aputure-60x'],
      modifiers: ['softbox-60x60', 'umbrella-white', 'stripbox-15x60', 'barn-doors'],
      backdrops: ['muslin-dark', 'seamless-black']
    }
  },

  {
    id: 'story-napoli-akt2-produktfoto',
    navn: 'Napoli Dreams — Akt 2: Produktfotografering',
    kategori: 'story',
    beskrivelse: 'Akt 2 av 3 — Profesjonell matfotografering i studio. Ren hvit bakgrunn, overhead octabox og presist lys fremhever pizzaens farger, tekstur og appetittvekkende utseende. Brukes til menykort, nettside og leveringsapp. Produktet i sitt aller beste lys.',
    tags: ['story', 'napoli-dreams', 'mat', 'produkt', 'studio', 'overhead', 'matfoto', 'hvit', 'ren', 'meny', 'akt-2'],
    difficulty: 'beginner',
    usedIn: ['Napoli Dreams — Akt 2 av 3', 'Matfotografering', 'Menyfoto', 'Leveringsapp'],
    characters: [
      {
        id: 'char-akt2-stylist',
        role: 'Mat-stylist',
        avatarType: 'woman',
        poseId: 'portrait_overhead_lean',
        position: [1.2, 0, 0.5],
        rotation: [0, -45, 0],
        label: 'Mat-stylist',
      },
    ],
    props: [
      { id: 'prop-akt2-pizza', propId: 'pizza-plate', position: [0, 0.8, 0], rotation: [0, 0, 0], label: 'Pizza (hero shot)' },
      { id: 'prop-akt2-shoot-table', propId: 'shooting-table-studio', position: [0, 0, 0], rotation: [0, 0, 0], label: 'Fotograferingsbord (studio sweep)' },
      { id: 'prop-akt2-reflector-l', propId: 'reflective_panel', position: [-1.2, 0.8, 0.4], rotation: [0, 15, 0], label: 'Reflektor venstre' },
      { id: 'prop-akt2-reflector-r', propId: 'reflective_panel', position: [1.2, 0.8, 0.4], rotation: [0, -15, 0], label: 'Reflektor høyre' },
      { id: 'prop-akt2-candle', propId: 'candle-holder', position: [0.4, 0.8, 0.1], rotation: [0, 0, 0], label: 'Stearinlys (stemning)' },
    ],
    sceneConfig: {
      lights: [
        {
          type: 'key-light',
          position: [0, 3.0, 0.2],
          rotation: [-80, 0, 0],
          intensity: 1.0,
          cct: 5600,
          modifier: 'octabox-120'
        },
        {
          type: 'fill-light',
          position: [-2.2, 1.8, 1.0],
          rotation: [0, 55, 0],
          intensity: 0.45,
          cct: 5600,
          modifier: 'softbox-60x90'
        },
        {
          type: 'fill-light',
          position: [2.2, 1.8, 1.0],
          rotation: [0, -55, 0],
          intensity: 0.3,
          cct: 5600,
          modifier: 'reflector-white'
        },
        {
          type: 'rim-light',
          position: [-1.5, 2.0, -1.5],
          rotation: [-20, 120, 0],
          intensity: 0.55,
          cct: 5800,
          modifier: 'stripbox-30x120'
        },
        {
          type: 'rim-light',
          position: [1.5, 2.0, -1.5],
          rotation: [-20, -120, 0],
          intensity: 0.55,
          cct: 5800,
          modifier: 'stripbox-30x120'
        },
        {
          type: 'background-light',
          position: [0, 1.2, -2.8],
          rotation: [0, 180, 0],
          intensity: 0.6,
          cct: 5600
        }
      ],
      backdrop: {
        type: 'seamless',
        color: '#f2f2f0'
      },
      camera: {
        position: [0.3, 2.8, 1.2],
        target: [0, 0.55, 0],
        focalLength: 100
      },
      gear: {
        setupType: 'foto',
        cameraBodyId: 'canon-r5',
        cameraLabel: 'Canon EOS R5',
        lensId: 'canon-rf-100mm-f28l-macro',
        lensLabel: '100mm f/2.8L Macro',
        lightCount: 6,
        lightTypes: ['strobe', 'led'],
        fixtureIds: ['profoto-d2', 'profoto-b10', 'godox-ad400pro']
      }
    },
    recommendedAssets: {
      lights: ['profoto-d2', 'profoto-b10plus', 'godox-ad400pro'],
      modifiers: ['octabox-120', 'softbox-60x90', 'stripbox-30x120', 'reflector-white', 'diffuser-scrim-120'],
      backdrops: ['seamless-white', 'shooting-table']
    }
  },

  {
    id: 'story-napoli-akt3-video',
    navn: 'Napoli Dreams — Akt 3: Chef-videostudio',
    kategori: 'story',
    beskrivelse: 'Akt 3 av 3 — Branded video-studio for chef-intervju og merkevarefortelling. Bicolor LED-belysning gir filmisk, profesjonelt uttrykk. Tre-punkt-lys-oppsett optimalisert for video. Varm, autentisk estetikk for YouTube, Instagram Reels og TV-reklame. Fortellingens klimaks.',
    tags: ['story', 'napoli-dreams', 'video', 'intervju', 'chef', 'bicolor', 'led', 'branded', 'youtube', 'tre-punkt', 'akt-3'],
    difficulty: 'intermediate',
    usedIn: ['Napoli Dreams — Akt 3 av 3', 'Chef-intervju', 'Brand story video', 'YouTube produksjon'],
    characters: [
      {
        id: 'char-akt3-chef',
        role: 'Kokk',
        avatarType: 'man',
        poseId: 'commercial_welcoming',
        position: [-0.3, 0, 0.5],
        rotation: [0, 10, 0],
        label: 'Chef',
      },
      {
        id: 'char-akt3-interviewer',
        role: 'Intervjuer',
        avatarType: 'woman',
        poseId: 'commercial_seated_interview',
        position: [1.5, 0, 1.2],
        rotation: [0, -60, 0],
        label: 'Intervjuer',
      },
    ],
    props: [
      { id: 'prop-akt3-counter', propId: 'chef-counter', position: [0.3, 0, -0.4], rotation: [0, 0, 0], label: 'Kjøkkenbenk (chef)' },
      { id: 'prop-akt3-pizza', propId: 'pizza-plate', position: [0.3, 0.92, -0.4], rotation: [0, 0, 0], label: 'Pizza prop' },
      { id: 'prop-akt3-wine', propId: 'wine_bottle_red', position: [0.55, 0.92, -0.4], rotation: [0, 30, 0], label: 'Vinflasker' },
      { id: 'prop-akt3-podium', propId: 'podium-branded', position: [-0.9, 0, 0.5], rotation: [0, 25, 0], label: 'Podium (presenter)' },
      { id: 'prop-akt3-chair', propId: 'broadcast-chair', position: [1.0, 0, 0.5], rotation: [0, -25, 0], label: 'Intervjustol (broadcast)' },
      { id: 'prop-akt3-monitor', propId: 'studio-monitor', position: [1.6, 0, -0.5], rotation: [0, -20, 0], label: 'Studioskjerm (monitor)' },
      { id: 'prop-akt3-neon', propId: 'neon_sign_cyan', position: [0, 1.8, -1.5], rotation: [0, 0, 0], label: 'Neonskilt (bakgrunn)' },
    ],
    sceneConfig: {
      lights: [
        {
          type: 'key-light',
          position: [-1.8, 2.4, 2.2],
          rotation: [-30, 42, 0],
          intensity: 1.0,
          cct: 4500,
          color: '#fff5e0',
          modifier: 'softbox-90x120'
        },
        {
          type: 'fill-light',
          position: [2.0, 1.9, 2.0],
          rotation: [0, -40, 0],
          intensity: 0.45,
          cct: 4200,
          color: '#fff8ee',
          modifier: 'umbrella-white'
        },
        {
          type: 'hair-light',
          position: [0.8, 3.0, -0.8],
          rotation: [-55, 150, 0],
          intensity: 0.6,
          cct: 5200,
          modifier: 'stripbox-15x60'
        },
        {
          type: 'rim-light',
          position: [-2.2, 2.1, -1.0],
          rotation: [-20, 125, 0],
          intensity: 0.5,
          cct: 5600,
          modifier: 'stripbox-30x120'
        },
        {
          type: 'background-light',
          position: [-1.0, 1.0, -2.5],
          rotation: [15, 30, 0],
          intensity: 0.55,
          cct: 3200,
          color: '#ff8833',
          modifier: 'fresnel'
        },
        {
          type: 'background-light',
          position: [1.0, 1.0, -2.5],
          rotation: [15, -30, 0],
          intensity: 0.4,
          cct: 2800,
          color: '#cc5500',
          modifier: 'barn-doors'
        },
        {
          type: 'atmospheric',
          position: [0, 0.9, -1.8],
          rotation: [0, 0, 0],
          intensity: 0.2,
          cct: 2200,
          color: '#ff6600',
          modifier: 'candle'
        }
      ],
      backdrop: {
        type: 'muslin',
        color: '#2a1508'
      },
      camera: {
        position: [0, 1.6, 4.5],
        target: [0, 1.5, 0],
        focalLength: 50
      },
      gear: {
        setupType: 'video',
        cameraBodyId: 'sony-fx3',
        cameraLabel: 'Sony FX3',
        cameraCount: 2,
        lensId: 'sony-fe-50mm-f12-gm',
        lensLabel: '50mm f/1.2 GM',
        lightCount: 7,
        lightTypes: ['led', 'atmospheric'],
        fixtureIds: ['aputure-300d', 'aputure-120d', 'nanlite-forza300', 'candle-light']
      }
    },
    recommendedAssets: {
      lights: ['aputure-300d', 'aputure-120d', 'nanlite-forza300', 'candle-light'],
      modifiers: ['softbox-90x120', 'umbrella-white', 'stripbox-15x60', 'stripbox-30x120', 'fresnel', 'barn-doors'],
      backdrops: ['muslin-dark', 'cove']
    }
  }
];

export const getPresetsByKategori = (kategori: string): ScenarioPreset[] => {
  if (kategori === 'alle') return scenarioPresets;
  return scenarioPresets.filter(p => p.kategori === kategori);
};

export const getPresetById = (id: string): ScenarioPreset | undefined => {
  return scenarioPresets.find(p => p.id === id);
};
