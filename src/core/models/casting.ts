export interface Role {
  id: string;
  name: string;
  description?: string;
  requirements: {
    age?: { min?: number; max?: number };
    gender?: string[];
    appearance?: string[];
    skills?: string[];
    specialNeeds?: string[];
  };
  sceneIds?: string[]; // Kobling til Scene Composer
  status: 'draft' | 'open' | 'casting' | 'filled' | 'cancelled';
  crewRequirements?: string[]; // Crew member role IDs required
  locationRequirements?: string[]; // Location IDs required
  propRequirements?: string[]; // Prop IDs required
}

export interface Candidate {
  id: string;
  name: string;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
  photos: string[]; // URLs eller base64
  videos: string[]; // URLs eller base64
  modelUrl?: string; // URL to 3D GLB model for avatar preview
  personality?: 'calm' | 'energetic' | 'mysterious' | 'wise'; // Personality trait for animation
  auditionNotes: string;
  status: 'requested' | 'shortlist' | 'selected' | 'confirmed' | 'rejected' | 'pending';
  assignedRoles: string[]; // Role IDs
  createdAt: string;
  updatedAt: string;
  consent?: Consent[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface Schedule {
  id: string;
  candidateId: string;
  roleId: string;
  sceneId?: string; // Kobling til Scene Composer
  date: string;
  time: string;
  location: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Crew member types
export type CrewRole = 
  | 'director' 
  | 'producer' 
  | 'casting_director' 
  | 'production_manager' 
  | 'camera_operator' 
  | 'camera_assistant' 
  | 'cinematographer'
  | 'drone_pilot'
  | 'gaffer' 
  | 'grip' 
  | 'sound_engineer' 
  | 'audio_mixer'
  | 'video_editor'
  | 'colorist'
  | 'vfx_artist'
  | 'motion_graphics'
  | 'production_assistant'
  | 'script_supervisor'
  | 'location_manager'
  | 'production_designer'
  | 'makeup_artist' 
  | 'wardrobe' 
  | 'stylist'
  | 'collaborator'
  | 'other';

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
  availability: {
    startDate?: string;
    endDate?: string;
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
    notes?: string;
  };
  assignedScenes: string[]; // Scene IDs
  rate?: number; // Hourly/daily rate
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Split sheet contributor information (synced with SplitSheetContributor)
  splitSheet?: {
    percentage: number; // 0-100 ownership percentage
    signedAt?: string | null;
    invitationStatus?: 'not_sent' | 'sent' | 'viewed' | 'signed' | 'declined';
    orderIndex?: number;
    notes?: string | null;
    customFields?: Record<string, any>; // PRO affiliation, IPI number, etc.
  };
  // ExternalDataService integration
  travelCosts?: {
    [productionDayId: string]: {
      breakdown: {
        kilometers: number;
        kmCost: number;
        fuelCost: number;
        tollFees: number;
        additionalFees: number;
        totalCost: number;
      };
      rates: {
        taxRate: number;
        fuelPrice: number;
        fuelConsumption: number;
      };
    };
  };
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: 'studio' | 'outdoor' | 'indoor' | 'virtual' | 'other';
  capacity?: number;
  facilities?: string[]; // e.g., ['parking', 'restrooms', 'catering']
  availability: {
    startDate?: string;
    endDate?: string;
    daysOfWeek?: number[];
    notes?: string;
  };
  assignedScenes: string[]; // Scene IDs
  contactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // ExternalDataService integration
  coordinates?: {
    lat: number;
    lng: number;
  };
  propertyId?: string;
  propertyAnalysis?: {
    photographySpots: Array<{
      coordinates: {lat: number, lng: number};
      description: string;
      accessibility: 'easy' | 'moderate' | 'difficult';
      restrictions: string[];
    }>;
    droneRestrictions: {
      allowed: boolean;
      restrictions: string[];
      maxAltitude?: number;
      noFlyZones: Array<{lat: number, lng: number}>;
    };
    weatherExposure: {
      windExposure: 'low' | 'moderate' | 'high';
      sunExposure: 'morning' | 'afternoon' | 'all-day';
      shelterOptions: string[];
    };
    accessAnalysis: {
      parkingAvailable: boolean;
      publicTransport: string[];
      walkingDistance: number;
      accessibility: 'wheelchair-accessible' | 'limited' | 'not-accessible';
      parkingSpots?: Array<{
        name: string;
        address: string;
        distance: number;
        spaces?: number;
        coordinates: {
          lat: number;
          lng: number;
        };
      }>;
      evParkingSpots?: Array<{
        name: string;
        address: string;
        distance: number;
        spaces?: number;
        coordinates: {
          lat: number;
          lng: number;
        };
      }>;
      evChargingSpots?: Array<{
        name: string;
        address: string;
        distance: number;
        spaces?: number;
        coordinates: {
          lat: number;
          lng: number;
        };
      }>;
    };
  };
  weatherData?: {
    current?: {
      location: string;
      temperature: number;
      humidity: number;
      pressure: number;
      windSpeed: number;
      windDirection: number;
      cloudCover: number;
      visibility: number;
      uvIndex: number;
      timestamp: string;
      source: 'yr_api' | 'fallback';
    };
    forecast?: {
      location: string;
      forecast: Array<{
        date: string;
        temperature: number;
        humidity: number;
        windSpeed: number;
        precipitation: number;
        symbol: string;
      }>;
      days: number;
      source: 'yr_api' | 'fallback';
    };
    alerts?: {
      location: string;
      alerts: Array<{
        id: string;
        severity: string;
        category: string;
        description: string;
        effective: string;
        expires: string;
        area: string;
      }>;
      source: 'yr_api' | 'fallback';
    };
    lastUpdated?: string;
  };
}

export interface Prop {
  id: string;
  name: string;
  category: string; // e.g., 'furniture', 'decoration', 'costume', 'equipment'
  description?: string;
  images?: string[]; // URLs eller base64
  modelUrl?: string; // URL to 3D GLB model for preview
  availability: {
    startDate?: string;
    endDate?: string;
    notes?: string;
  };
  assignedScenes: string[]; // Scene IDs
  quantity?: number;
  location?: string; // Where the prop is stored
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionDay {
  id: string;
  projectId: string;
  date: string; // ISO date string
  callTime: string; // Time string (HH:mm)
  wrapTime: string; // Time string (HH:mm)
  locationId: string;
  scenes: string[]; // Scene IDs
  crew: string[]; // Crew member IDs
  props: string[]; // Prop IDs
  notes?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  // Audit/logging fields
  createdBy?: string; // User name/email who created
  lastModifiedBy?: string; // User name/email who last modified
  changeLog?: Array<{
    timestamp: string;
    user: string;
    action: 'created' | 'updated' | 'status_changed';
    changes?: string; // Description of what changed
  }>;
  // ExternalDataService integration
  weatherForecast?: {
    location: string;
    forecast: Array<{
      date: string;
      temperature: number;
      humidity: number;
      windSpeed: number;
      precipitation: number;
      symbol: string;
    }>;
    days: number;
    source: 'yr_api' | 'fallback';
  };
  totalTravelCosts?: number;
}

// Storyboard integration types
export type ShotType = 
  | 'Wide' 
  | 'Medium' 
  | 'Close-up' 
  | 'Extreme Close-up' 
  | 'Establishing' 
  | 'Detail' 
  | 'Two Shot' 
  | 'Over Shoulder' 
  | 'Point of View';

export type CameraAngle = 
  | 'Eye Level' 
  | 'High Angle' 
  | 'Low Angle' 
  | 'Birds Eye' 
  | 'Worms Eye' 
  | 'Dutch Angle' 
  | 'Overhead';

export type CameraMovement = 
  | 'Static' 
  | 'Pan' 
  | 'Tilt' 
  | 'Dolly' 
  | 'Truck' 
  | 'Crane' 
  | 'Handheld' 
  | 'Steadicam' 
  | 'Zoom' 
  | 'Orbit';

export type ShotStatus = 'not_started' | 'in_progress' | 'completed';

export type MediaType = 'photo' | 'video' | 'hybrid';

export type ShotPriority = 'critical' | 'important' | 'nice_to_have';

export interface ShotComment {
  id: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole?: UserRoleType | CrewRole | string;
  message: string;
  resolved?: boolean;
  updatedAt?: string;
  createdAt: string;
}

export type ProductionPhase = 'planning' | 'shooting' | 'review';

export type ProductionContext = 
  | 'lifestyle_outdoor'
  | 'commercial_product'
  | 'real_estate'
  | 'behind_the_scenes'
  | 'documentary'
  | 'portrait'
  | 'event'
  | 'custom';

export interface ProductionPreset {
  id: ProductionContext;
  name: string;
  description: string;
  defaultMediaType: MediaType;
  defaultPriority: ShotPriority;
  suggestedLenses: string[];
  suggestedLighting: string[];
  typicalDuration: number;
  icon: string;
}

export const PRODUCTION_PRESETS: Record<ProductionContext, ProductionPreset> = {
  lifestyle_outdoor: {
    id: 'lifestyle_outdoor',
    name: 'Lifestyle / Outdoor',
    description: 'Naturlig lys, autentiske situasjoner',
    defaultMediaType: 'photo',
    defaultPriority: 'important',
    suggestedLenses: ['35mm', '50mm', '85mm'],
    suggestedLighting: ['Naturlig lys', 'Reflektor'],
    typicalDuration: 5,
    icon: 'nature',
  },
  commercial_product: {
    id: 'commercial_product',
    name: 'Kommersiell Produkt',
    description: 'Produktfoto og video for markedsf\u00f8ring',
    defaultMediaType: 'hybrid',
    defaultPriority: 'critical',
    suggestedLenses: ['50mm Macro', '100mm Macro', '24-70mm'],
    suggestedLighting: ['Softbox', 'Rim light', 'Produkt tent'],
    typicalDuration: 10,
    icon: 'shopping_bag',
  },
  real_estate: {
    id: 'real_estate',
    name: 'Eiendom / Interi\u00f8r',
    description: 'Bolig- og n\u00e6ringseiendom',
    defaultMediaType: 'photo',
    defaultPriority: 'critical',
    suggestedLenses: ['16-35mm', '24mm Tilt-Shift', '14mm'],
    suggestedLighting: ['Naturlig + flash fill', 'HDR blend'],
    typicalDuration: 8,
    icon: 'home',
  },
  behind_the_scenes: {
    id: 'behind_the_scenes',
    name: 'Behind the Scenes / SoMe',
    description: 'Dokumentering av produksjon for sosiale medier',
    defaultMediaType: 'video',
    defaultPriority: 'nice_to_have',
    suggestedLenses: ['24mm', '35mm', '16-35mm'],
    suggestedLighting: ['Tilgjengelig lys', 'LED panel'],
    typicalDuration: 3,
    icon: 'movie',
  },
  documentary: {
    id: 'documentary',
    name: 'Dokumentar',
    description: 'Dokumentarisk stil med autentisk innhold',
    defaultMediaType: 'video',
    defaultPriority: 'important',
    suggestedLenses: ['24-70mm', '70-200mm', '35mm'],
    suggestedLighting: ['Naturlig lys', 'LED panel'],
    typicalDuration: 15,
    icon: 'videocam',
  },
  portrait: {
    id: 'portrait',
    name: 'Portrett',
    description: 'Portrettfotografering og headshots',
    defaultMediaType: 'photo',
    defaultPriority: 'critical',
    suggestedLenses: ['85mm', '105mm', '135mm'],
    suggestedLighting: ['Beauty dish', 'Softbox', 'Rim light'],
    typicalDuration: 5,
    icon: 'person',
  },
  event: {
    id: 'event',
    name: 'Event / Konferanse',
    description: 'Arrangement og konferansedekning',
    defaultMediaType: 'hybrid',
    defaultPriority: 'important',
    suggestedLenses: ['24-70mm', '70-200mm', '35mm'],
    suggestedLighting: ['Tilgjengelig lys', 'Speed light'],
    typicalDuration: 2,
    icon: 'event',
  },
  custom: {
    id: 'custom',
    name: 'Egendefinert',
    description: 'Tilpass innstillinger manuelt',
    defaultMediaType: 'photo',
    defaultPriority: 'important',
    suggestedLenses: [],
    suggestedLighting: [],
    typicalDuration: 5,
    icon: 'tune',
  },
};

export interface CastingShot {
  id: string;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  cameraMovement: CameraMovement;
  focalLength?: number; // mm
  description?: string;
  roleId: string;
  sceneId: string;
  candidateId?: string; // If shot is tied to specific candidate
  imageUrl?: string; // Thumbnail/preview
  duration?: number; // Seconds
  notes?: string;
  status?: ShotStatus; // Shoot mode status tracking
  locationId?: string; // Link to production location
  equipmentRecommendations?: string[]; // Suggested equipment for shot
  estimatedTime?: number; // Estimated time in minutes
  createdAt: string;
  updatedAt: string;
  
  // Interactive shot list fields
  mediaType?: MediaType; // Foto, video eller hybrid
  priority?: ShotPriority; // Kritisk, viktig eller nice-to-have
  deadline?: string; // ISO timestamp for when shot should be completed
  orderIndex?: number; // Custom ordering
  assigneeId?: string;
  assigneeName?: string; // Cached name for display
  reservedBy?: string; // User ID who has reserved this shot
  reservedByName?: string; // Cached name for display
  reservedAt?: string; // When the shot was reserved
  comments?: ShotComment[];
  
  // Production tracking
  completedAt?: string; // When shot was marked complete
  actualDuration?: number; // Actual time spent in minutes
  takesCount?: number; // Number of takes
  
  // Recommendations
  lensRecommendation?: string;
  lightingSetup?: string;
  backgroundRecommendation?: string;
  
  // Quick notes from field
  fieldNotes?: string;
  
  // Deliverables tracking
  deliverableType?: 'hero' | 'b_roll' | 'behind_scenes' | 'safety';
  
  // Visual categorization
  colorTag?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
}

export interface ShotList {
  id: string;
  projectId: string;
  sceneId: string;
  sceneName?: string;
  shots: CastingShot[];
  cameraSettings?: {
    focalLength?: number;
    aperture?: number;
    iso?: number;
    shutter?: number;
  };
  equipment: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  productionContext?: ProductionContext;
  productionPhase?: ProductionPhase;
  deadline?: string;
}

// User roles and permissions
export type UserRoleType = 
  | 'director' 
  | 'producer' 
  | 'casting_director' 
  | 'production_manager' 
  | 'camera_team' 
  | 'agency';

export interface UserRole {
  id: string;
  userId: string; // User identifier (email or ID)
  projectId: string;
  role: UserRoleType;
  permissions: {
    canViewAll?: boolean;
    canEditCasting?: boolean;
    canEditProduction?: boolean;
    canEditShotLists?: boolean;
    canManageCrew?: boolean;
    canManageLocations?: boolean;
    canApprove?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Consent management
export type ConsentType = 
  | 'photo_release' 
  | 'video_release' 
  | 'audio_release' 
  | 'location_release' 
  | 'minor_consent' 
  | 'other';

export interface Consent {
  id: string;
  candidateId: string;
  type: ConsentType;
  signed: boolean;
  date?: string; // Date signed (ISO string)
  document?: string; // URL or base64 of signed document
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CastingProject {
  id: string;
  name: string;
  description?: string;
  roles: Role[];
  candidates: Candidate[];
  schedules: Schedule[];
  crew: CrewMember[];
  locations: Location[];
  props: Prop[];
  productionDays: ProductionDay[];
  shotLists: ShotList[];
  userRoles: UserRole[];
  productionPlanId?: string; // Fremtidig integrasjon
  createdAt: string;
  updatedAt: string;
}

export type ActivityActionType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'reserve'
  | 'unreserve'
  | 'status_change'
  | 'comment'
  | 'approve'
  | 'reject';

export interface ActivityLogEntry {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: ActivityActionType;
  targetType: 'shot' | 'shotlist' | 'comment' | 'project';
  targetId: string;
  targetName: string;
  timestamp: string;
  details?: {
    previousValue?: unknown;
    newValue?: unknown;
    fieldChanged?: string;
  };
  read?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'mention' | 'deadline' | 'approval' | 'comment';
  title: string;
  message: string;
  targetType: 'shot' | 'shotlist' | 'comment';
  targetId: string;
  read: boolean;
  createdAt: string;
}

export interface ShotDependency {
  id: string;
  shotId: string;
  dependsOnShotId: string;
  type: 'must_complete_before' | 'should_complete_before' | 'related';
}

export interface ApprovalRequest {
  id: string;
  shotId: string;
  requestedBy: string;
  requestedAt: string;
  approvers: string[];
  approvedBy?: string[];
  rejectedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
}
