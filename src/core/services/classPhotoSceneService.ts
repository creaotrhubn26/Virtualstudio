export interface SchoolHDRIPreset {
  id: string;
  name: string;
  label: string;
  url: string;
  intensity: number;
  rotation: number;
  description: string;
  tags: string[];
}

export const SCHOOL_HDRI_PRESETS: SchoolHDRIPreset[] = [
  {
    id: 'neutral-studio',
    name: 'neutral-studio',
    label: 'Nøytralt Studio',
    url: '/hdri/neutral-studio.hdr',
    intensity: 1.0,
    rotation: 0,
    description: 'Nøytralt studio-miljø for skolefoto',
    tags: ['studio', 'nøytral', 'skolefoto'],
  },
  {
    id: 'warm-school',
    name: 'warm-school',
    label: 'Varm Skole',
    url: '/hdri/warm-interior.hdr',
    intensity: 0.8,
    rotation: 45,
    description: 'Varmt innendørs skole-miljø',
    tags: ['varm', 'innendørs', 'skole'],
  },
  {
    id: 'overcast-outdoor',
    name: 'overcast-outdoor',
    label: 'Overskyet Utendørs',
    url: '/hdri/overcast-sky.hdr',
    intensity: 1.2,
    rotation: 90,
    description: 'Overskyet himmellys for utendørs skolefoto',
    tags: ['utendørs', 'overskyet', 'naturlig'],
  },
];

export interface ClassPhotoSceneConfig {
  hdriId: string;
  backdropType: 'seamless' | 'muslin' | 'canvas' | 'gradient';
  backdropColor: string;
  floorReflection: number;
  ambientLight: number;
  keyLightIntensity: number;
  fillLightIntensity: number;
  hairLightIntensity: number;
}

class ClassPhotoSceneService {
  getDefaultSceneConfig(): ClassPhotoSceneConfig {
    return {
      hdriId: 'neutral-studio',
      backdropType: 'seamless',
      backdropColor: '#F5F5F5',
      floorReflection: 0.05,
      ambientLight: 0.3,
      keyLightIntensity: 1.0,
      fillLightIntensity: 0.5,
      hairLightIntensity: 0.7,
    };
  }

  getHDRIPreset(id: string): SchoolHDRIPreset | undefined {
    return SCHOOL_HDRI_PRESETS.find((p) => p.id === id);
  }

  applySceneConfig(_config: ClassPhotoSceneConfig): void {
    console.log('[ClassPhotoSceneService] Scene config applied');
  }
}

export const classPhotoSceneService = new ClassPhotoSceneService();
export default classPhotoSceneService;
