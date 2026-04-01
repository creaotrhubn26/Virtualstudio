export type ShotType = 'ECU' | 'CU' | 'MCU' | 'MS' | 'MLS' | 'LS' | 'WS' | 'EWS';
export type CameraAngle = 'eye-level' | 'high' | 'low' | 'dutch' | 'birds-eye' | 'worms-eye';
export type CameraMovement = 'static' | 'pan' | 'tilt' | 'dolly' | 'truck' | 'pedestal' | 'zoom' | 'arc';
export interface CastingShot {
  id: string;
  type: ShotType;
  angle?: CameraAngle;
  movement?: CameraMovement;
  description?: string;
  duration?: number;
  imageUrl?: string;
  notes?: string;
  shotType?: ShotType;
  cameraAngle?: CameraAngle;
  cameraMovement?: CameraMovement;
  focalLength?: number;
  createdAt?: string;
  updatedAt?: string;
  roleId?: string;
}
