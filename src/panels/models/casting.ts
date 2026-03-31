export type ShotType = 'wide' | 'medium' | 'close-up' | 'extreme-close-up' | 'extreme-wide' | 'two-shot' | 'over-the-shoulder' | 'point-of-view' | 'cutaway' | 'insert';
export type CameraAngle = 'eye-level' | 'low-angle' | 'high-angle' | 'birds-eye' | 'worms-eye' | 'dutch-angle' | 'overhead';
export type CameraMovement = 'static' | 'pan' | 'tilt' | 'dolly' | 'truck' | 'zoom' | 'handheld' | 'crane' | 'steadicam' | 'tracking';

export interface CastingShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: ShotType;
  angle: CameraAngle;
  movement: CameraMovement;
  duration: number;
  description: string;
  subjectIds: string[];
  notes?: string;
  thumbnail?: string;
  isApproved?: boolean;
  createdAt: string;
}

export interface CastingSubject {
  id: string;
  name: string;
  role: string;
  notes?: string;
  thumbnailUrl?: string;
}

export interface CastingScene {
  id: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'golden-hour';
  shots: CastingShot[];
  subjects: CastingSubject[];
  notes?: string;
}

export function createCastingShot(overrides: Partial<CastingShot> = {}): CastingShot {
  return {
    id: `shot-${Date.now()}`,
    sceneId: 'default',
    shotNumber: 1,
    shotType: 'medium',
    angle: 'eye-level',
    movement: 'static',
    duration: 5,
    description: '',
    subjectIds: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function getShotTypeLabel(type: ShotType): string {
  const labels: Record<ShotType, string> = {
    'wide': 'Totalt',
    'medium': 'Halvtotalt',
    'close-up': 'Nærbilde',
    'extreme-close-up': 'Ekstremt nærbilde',
    'extreme-wide': 'Ekstremt totalt',
    'two-shot': 'To-personsbilde',
    'over-the-shoulder': 'Over skulderen',
    'point-of-view': 'POV',
    'cutaway': 'Cutaway',
    'insert': 'Innsett',
  };
  return labels[type] ?? type;
}

export function getCameraAngleLabel(angle: CameraAngle): string {
  const labels: Record<CameraAngle, string> = {
    'eye-level': 'Øyenivå',
    'low-angle': 'Lavvinkel',
    'high-angle': 'Høyvinkel',
    'birds-eye': 'Fugleperspektiv',
    'worms-eye': 'Ormeperspektiv',
    'dutch-angle': 'Skjev vinkel',
    'overhead': 'Ovenfra',
  };
  return labels[angle] ?? angle;
}
