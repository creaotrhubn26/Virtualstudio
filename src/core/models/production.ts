import type { Vector3 } from '@babylonjs/core';

export type UserRoleType =
  | 'admin'
  | 'producer'
  | 'director'
  | 'assistant_director'
  | 'dp'
  | 'script_supervisor'
  | 'editor'
  | 'viewer';

export interface UserRolePermissions {
  canEdit: boolean;
  canLockScript: boolean;
  canRunTableRead: boolean;
  canShare: boolean;
  canExport: boolean;
  canManageUsers: boolean;
}

export interface UserRole {
  id: string;
  userId: string;
  projectId: string;
  role: UserRoleType;
  permissions: UserRolePermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface CastingProject {
  id: string;
  name: string;
  description?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived' | (string & {});
  startDate?: string;
  endDate?: string;
  budget?: number;
  roles: Role[];
  candidates: Candidate[];
  crew: CrewMember[];
  locations: Location[];
  props: Prop[];
  schedules: Schedule[];
  shotLists: ShotList[];
  productionDays?: ProductionDay[];
  userRoles?: UserRole[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type CrewRole =
  | 'director'
  | 'producer'
  | 'assistant_director'
  | 'dp'
  | 'gaffer'
  | 'key_grip'
  | 'sound'
  | 'makeup'
  | 'stylist'
  | 'editor'
  | 'other'
  | (string & {});

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface RoleAgeRange {
  min?: number;
  max?: number;
}

export interface RoleRequirements {
  age?: RoleAgeRange;
  skills?: string[];
  [key: string]: unknown;
}

export interface Role {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  requirements?: RoleRequirements;
  notes?: string;
  status?: 'open' | 'casting' | 'filled' | 'archived' | (string & {});
  candidateIds?: string[];
  sceneIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CandidateMedia {
  type: 'image' | 'video' | 'audio' | 'document' | (string & {});
  url: string;
  label?: string;
}

export interface Candidate {
  id: string;
  projectId?: string;
  roleId?: string;
  assignedRoles?: string[];
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactInfo?: ContactInfo;
  notes?: string;
  tags?: string[];
  photos?: string[];
  videos?: string[];
  media?: CandidateMedia[];
  avatarUrl?: string;
  modelUrl?: string;
  personality?: string;
  status?:
    | 'pending'
    | 'requested'
    | 'shortlist'
    | 'selected'
    | 'confirmed'
    | 'rejected'
    | 'declined'
    | (string & {});
  workflowStatus?:
    | 'pending'
    | 'auditioned'
    | 'offer_sent'
    | 'confirmed'
    | 'declined'
    | 'contracted'
    | (string & {});
  auditionRating?: number;
  auditionNotes?: string;
  auditionDate?: string;
  offerStatus?: string;
  contractStatus?: string;
  shotAssignments?: string[];
  consent?: Consent[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CrewAvailabilityWindow {
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface CrewMember {
  id: string;
  projectId?: string;
  name: string;
  role: CrewRole | string;
  department?: string;
  email?: string;
  phone?: string;
  address?: string;
  rate?: number;
  rateType?: 'hourly' | 'daily' | 'weekly' | 'project' | (string & {});
  notes?: string;
  contactInfo?: ContactInfo;
  availability?: CrewAvailabilityWindow;
  assignedScenes?: string[];
  splitSheet?: {
    percentage?: number;
    invitationStatus?: string;
    notes?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface LocationAvailabilityWindow {
  startDate?: string;
  endDate?: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationPhotographySpot {
  coordinates: LocationCoordinates;
  description: string;
  accessibility: 'easy' | 'moderate' | 'difficult';
  restrictions: string[];
}

export interface LocationDroneRestrictions {
  allowed: boolean;
  restrictions: string[];
  maxAltitude?: number;
  noFlyZones: LocationCoordinates[];
}

export interface LocationWeatherExposure {
  windExposure: 'low' | 'moderate' | 'high';
  sunExposure: 'morning' | 'afternoon' | 'all-day';
  shelterOptions: string[];
  sunrise?: string;
  sunset?: string;
  daylightHours?: number;
  sunDescription?: string;
  windSpeed?: number;
  windSpeedKmh?: number;
  windDirection?: number;
  droneSafety?: string;
  droneSafetyDescription?: string;
}

export interface LocationAccessSpot {
  name: string;
  address: string;
  distance: number;
  spaces?: number;
  coordinates: LocationCoordinates;
}

export interface LocationAccessAnalysis {
  parkingAvailable: boolean;
  publicTransport: string[];
  walkingDistance: number;
  accessibility: 'wheelchair-accessible' | 'limited' | 'not-accessible';
  evParking?: {
    type: string;
    distance: number;
    description: string;
  };
  evCharging?: {
    type: string;
    distance: number;
    description: string;
  };
  parkingSpots?: LocationAccessSpot[];
  evParkingSpots?: LocationAccessSpot[];
  evChargingSpots?: LocationAccessSpot[];
}

export interface LocationPropertyAnalysis {
  photographySpots: LocationPhotographySpot[];
  droneRestrictions: LocationDroneRestrictions;
  weatherExposure: LocationWeatherExposure;
  accessAnalysis: LocationAccessAnalysis;
}

export interface Location {
  id: string;
  projectId?: string;
  name: string;
  type?: 'indoor' | 'outdoor' | 'studio' | 'office' | 'warehouse' | 'other' | (string & {});
  address?: string;
  notes?: string;
  capacity?: number;
  facilities?: string[];
  assignedScenes?: string[];
  contactInfo?: ContactInfo;
  coordinates?: LocationCoordinates;
  propertyId?: string;
  propertyAnalysis?: LocationPropertyAnalysis;
  location?: string;
  contactName?: string;
  contactPhone?: string;
  accessNotes?: string;
  availability: LocationAvailabilityWindow;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PropAvailabilityWindow {
  startDate?: string;
  endDate?: string;
}

export interface Prop {
  id: string;
  projectId?: string;
  name: string;
  category: string;
  location?: string;
  description?: string;
  images?: string[];
  assignedScenes?: string[];
  quantity?: number;
  status?: 'available' | 'in_use' | 'maintenance' | 'retired' | (string & {});
  notes?: string;
  locationId?: string;
  availability?: PropAvailabilityWindow;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Schedule {
  id: string;
  projectId?: string;
  roleId?: string;
  candidateId?: string;
  title?: string;
  date: string;
  time?: string;
  endTime?: string;
  locationId?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | (string & {});
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type ShotStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | (string & {});
export type ShotPriority = 'critical' | 'important' | 'nice_to_have' | (string & {});
export type MediaType = 'photo' | 'video' | 'hybrid' | (string & {});
export type ShotType =
  | 'wide'
  | 'medium'
  | 'close_up'
  | 'insert'
  | 'establishing'
  | 'over_shoulder'
  | (string & {});
export type CameraAngle = 'eye_level' | 'high' | 'low' | 'bird_eye' | 'worm_eye' | (string & {});
export type CameraMovement =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly'
  | 'truck'
  | 'crane'
  | 'handheld'
  | (string & {});

export interface CastingShot {
  id: string;
  shotListId?: string;
  sceneId?: string;
  sceneNumber?: string;
  name?: string;
  description?: string;
  type?: ShotType;
  cameraAngle?: CameraAngle;
  cameraMovement?: CameraMovement;
  status?: ShotStatus;
  priority?: ShotPriority;
  mediaType?: MediaType;
  locationId?: string;
  roleIds?: string[];
  candidateIds?: string[];
  estimatedTime?: number;
  duration?: number;
  actualDuration?: number;
  completedAt?: string;
  fieldNotes?: string;
  notes?: string;
  thumbnail?: string;
  references?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type ProductionPhase = 'planning' | 'shooting' | 'review';
export type ProductionContext =
  | 'nature'
  | 'shopping_bag'
  | 'home'
  | 'movie'
  | 'videocam'
  | 'person'
  | 'event'
  | 'tune'
  | 'custom'
  | (string & {});

export interface ProductionPreset {
  id: ProductionContext;
  name: string;
  description: string;
  icon: 'nature' | 'shopping_bag' | 'home' | 'movie' | 'videocam' | 'person' | 'event' | 'tune';
}

export const PRODUCTION_PRESETS: Record<string, ProductionPreset> = {
  custom: {
    id: 'custom',
    name: 'Tilpasset',
    description: 'Manuelt oppsett uten forhåndsvalg.',
    icon: 'tune',
  },
  nature: {
    id: 'nature',
    name: 'Natur',
    description: 'Miljøfokus, naturlig lys og bred komposisjon.',
    icon: 'nature',
  },
  shopping_bag: {
    id: 'shopping_bag',
    name: 'Produkt',
    description: 'Detaljrik produktpresentasjon med kontrollert lys.',
    icon: 'shopping_bag',
  },
  home: {
    id: 'home',
    name: 'Interiør',
    description: 'Mykt uttrykk for innendørs lokasjoner.',
    icon: 'home',
  },
  movie: {
    id: 'movie',
    name: 'Film',
    description: 'Narrativ dekning med shot-prioritering for scene.',
    icon: 'movie',
  },
  videocam: {
    id: 'videocam',
    name: 'Live',
    description: 'Rask operasjon og kontinuerlig opptaksflyt.',
    icon: 'videocam',
  },
  person: {
    id: 'person',
    name: 'Portrett',
    description: 'Subjektfokus med tett utsnitt og lyskontroll.',
    icon: 'person',
  },
  event: {
    id: 'event',
    name: 'Arrangement',
    description: 'Tidskritisk dekning med høy gjennomstrømning.',
    icon: 'event',
  },
  tune: {
    id: 'tune',
    name: 'Teknisk',
    description: 'Teknisk kalibrert gjennomføring.',
    icon: 'tune',
  },
};

export interface ShotList {
  id: string;
  projectId?: string;
  name: string;
  sceneName?: string;
  description?: string;
  sceneIds?: string[];
  shots: CastingShot[];
  productionPhase?: ProductionPhase;
  productionContext?: ProductionContext;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ProductionDay {
  id: string;
  projectId: string;
  date: string;
  callTime: string;
  wrapTime?: string;
  locationId?: string;
  scenes: string[];
  crew: string[];
  props: string[];
  notes?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | (string & {});
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  version?: string;
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Act {
  id: string;
  manuscriptId: string;
  index: number;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface DialogueLine {
  id: string;
  manuscriptId: string;
  sceneId?: string;
  characterName?: string;
  text: string;
  lineNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SceneBreakdown {
  id: string;
  manuscriptId: string;
  actId?: string;
  sceneNumber?: string;
  title?: string;
  summary?: string;
  location?: string;
  locationId?: string;
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk' | (string & {});
  intExt?: 'INT' | 'EXT' | 'INT/EXT' | (string & {});
  pages?: number;
  estimatedMinutes?: number;
  castIds?: string[];
  propIds?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ScriptRevision {
  id: string;
  manuscriptId: string;
  version: string;
  notes?: string;
  content?: string;
  createdAt?: string;
  createdBy?: string;
  [key: string]: unknown;
}

export interface ShotCamera {
  id: string;
  shotId: string;
  focalLength?: number;
  aperture?: number;
  shutter?: string;
  iso?: number;
  cameraPosition?: Vector3 | { x: number; y: number; z: number };
  cameraTarget?: Vector3 | { x: number; y: number; z: number };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ShotLighting {
  id: string;
  shotId: string;
  setupName?: string;
  keyLight?: Record<string, unknown>;
  fillLight?: Record<string, unknown>;
  rimLight?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ShotAudio {
  id: string;
  shotId: string;
  notes?: string;
  ambience?: string;
  micSetup?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ShotNote {
  id: string;
  shotId: string;
  note: string;
  resolved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface StoryboardFrame {
  id: string;
  sceneId: string;
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  notes?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ManuscriptExport {
  manuscript: Manuscript;
  acts: Act[];
  scenes: SceneBreakdown[];
  dialogue: DialogueLine[];
  revisions?: ScriptRevision[];
}

export type ConsentType =
  | 'image_release'
  | 'video_release'
  | 'audio_release'
  | 'nda'
  | 'minor_guardian'
  | 'general'
  | (string & {});

export type ConsentInvitationStatus = 'not_sent' | 'sent' | 'viewed' | 'signed' | 'expired' | (string & {});

export interface ConsentSignatureData {
  signerName: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  signatureImageBase64?: string;
  [key: string]: unknown;
}

export interface Consent {
  id: string;
  projectId: string;
  candidateId: string;
  type: ConsentType;
  title?: string;
  description?: string;
  signed: boolean;
  invitationStatus?: ConsentInvitationStatus;
  date?: string;
  document?: string;
  notes?: string;
  signatureData?: ConsentSignatureData;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type ActivityActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'approved'
  | 'rejected'
  | 'moved'
  | 'assigned'
  | 'status_changed'
  | (string & {});

export interface ActivityLogEntry {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: ActivityActionType;
  targetType: 'shot' | 'shotlist' | 'comment' | 'project' | (string & {});
  targetId: string;
  targetName: string;
  timestamp: string;
  details?: {
    previousValue?: unknown;
    newValue?: unknown;
    fieldChanged?: string;
  };
  read: boolean;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | (string & {});
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
