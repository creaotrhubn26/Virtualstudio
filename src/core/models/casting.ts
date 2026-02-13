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
  locationId?: string; // Kobling til Location
  date: string;
  time: string;
  location: string; // Fritekst backup eller hentet fra Location
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
      windSpeedKmh?: number;
      windSpeed?: number;
      windDirection?: number;
      droneSafety?: string;
      droneSafetyDescription?: string;
      sunrise?: string;
      sunset?: string;
      daylightHours?: number;
      sunDescription?: string;
    };
    accessAnalysis: {
      parkingAvailable: boolean;
      publicTransport: string[];
      walkingDistance: number;
      accessibility: 'wheelchair-accessible' | 'limited' | 'not-accessible';
      evParking?: {
        distance: number;
        description: string;
      };
      evCharging?: {
        distance: number;
        description: string;
      };
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
  | 'agency'
  | 'writer'        // Screenplay writer - can edit script
  | 'script_editor' // Script editor - can edit and approve script changes
  | 'reader';       // Read-only access to screenplay

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
    // Screenplay-specific permissions
    canEditScript?: boolean;
    canLockScript?: boolean;
    canRunTableRead?: boolean;
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

export type ConsentInvitationStatus = 'not_sent' | 'sent' | 'viewed' | 'signed' | 'declined';

export interface ConsentSignatureData {
  signature: string;
  signed_by: string;
  signed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface Consent {
  id: string;
  candidateId: string;
  projectId?: string;
  type: ConsentType;
  title?: string;
  description?: string;
  signed: boolean;
  date?: string;
  document?: string;
  notes?: string;
  accessCode?: string;
  pin?: string;
  password?: string;
  invitationStatus?: ConsentInvitationStatus;
  invitationSentAt?: string;
  signatureData?: ConsentSignatureData;
  expiresAt?: string;
  templateId?: string;
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
  // Optional count fields for backend optimization (when arrays are not fully loaded)
  rolesCount?: number;
  candidatesCount?: number;
  crewCount?: number;
  locationsCount?: number;
  propsCount?: number;
  schedulesCount?: number;
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
// ============================================================================
// MANUSCRIPT AND SCRIPT SYSTEM TYPES
// ============================================================================

/**
 * Manuscript - Main script/screenplay document
 */
export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  subtitle?: string;
  author?: string;
  version: string; // e.g., "1.0", "2.3", "Final Draft"
  format: 'fountain' | 'final-draft' | 'markdown'; // Script format
  content: string; // Full manuscript content
  pageCount: number;
  wordCount: number;
  estimatedRuntime?: number; // in minutes (1 page ≈ 1 minute)
  status: 'draft' | 'review' | 'approved' | 'shooting' | 'completed';
  coverImage?: string; // Base64 or URL to cover image
  notes?: string;
  metadata?: {
    copyright?: string;
    wgaRegistration?: string; // Writers Guild registration
    basedOn?: string; // "Based on the novel by..."
    contactInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Script Revision - Version control for manuscripts
 */
export interface ScriptRevision {
  id: string;
  manuscriptId: string;
  version: string;
  content: string;
  changesSummary?: string;
  changedBy?: string;
  colorCode?: 'white' | 'blue' | 'pink' | 'yellow' | 'green' | 'goldenrod' | 'buff' | 'salmon' | 'cherry';
  revisionNotes?: string;
  createdAt: string;
}

/**
 * Act/Chapter - Organize scenes into acts (3-act structure, chapters, etc.)
 */
export interface Act {
  id: string;
  manuscriptId: string;
  projectId: string;
  actNumber: number; // 1, 2, 3 for 3-act structure
  title?: string; // e.g., "Setup", "Confrontation", "Resolution" or "Chapter 1: The Beginning"
  description?: string;
  pageStart?: number;
  pageEnd?: number;
  estimatedRuntime?: number; // in minutes
  colorCode?: string; // For visual organization
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Scene Breakdown - Detailed scene information from script
 */
export interface SceneBreakdown {
  id: string;
  manuscriptId: string;
  projectId: string;
  actId?: string; // Link to Act/Chapter
  sceneNumber: string; // e.g., "1", "1A", "1B", "42"
  sceneHeading: string; // e.g., "INT. APARTMENT - DAY"
  intExt?: 'INT' | 'EXT' | 'INT/EXT'; // Interior/Exterior
  locationName: string; // e.g., "APARTMENT", "CITY STREET"
  timeOfDay?: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' | 'LATER' | 'MORNING' | 'EVENING';
  pageLength?: number; // in eighths (e.g., 2.375 = 2 3/8 pages)
  estimatedScreenTime?: number; // in seconds
  description?: string; // Action/description lines
  dramaticDay?: string; // Story timeline day (e.g., "Day 1", "Day 2")
  sequence?: string; // Sequence/act grouping
  
  // Production breakdown
  characters: string[]; // Role IDs of characters in scene
  extrasCount?: number;
  propsNeeded?: string[]; // Prop IDs or names
  wardrobeNotes?: string;
  makeupNotes?: string;
  specialEffects?: string;
  stuntsNotes?: string;
  vehicles?: string[];
  animals?: string[];
  soundNotes?: string;
  musicNotes?: string;
  
  // Scheduling
  locationId?: string; // Reference to Location
  shootingDate?: string;
  callTime?: string;
  estimatedDuration?: number; // shooting time in minutes
  priority?: number;
  status: 'not-scheduled' | 'scheduled' | 'shot' | 'in-post' | 'completed';
  
  // Production metadata (synced from ProductionManuscriptView)
  metadata?: {
    camera?: string;
    lens?: string;
    rig?: string;
    shotType?: string;
    keyLight?: string;
    sideLight?: string;
    gel?: string;
    mic?: string;
    atmos?: string;
    references?: string[];
    [key: string]: unknown;
  };
  
  notes?: string;
  
  // Storyboard integration
  storyboardFrames?: StoryboardFrame[]; // Linked storyboard frames for this scene
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Dialogue Line - Character dialogue from script
 */
export interface DialogueLine {
  id: string;
  sceneId: string;
  manuscriptId: string;
  characterName: string;
  roleId?: string; // Reference to Role if linked
  dialogueText: string;
  parenthetical?: string; // e.g., "(whispering)", "(to John)"
  lineNumber?: number;
  dialogueType: 'dialogue' | 'voice-over' | 'off-screen';
  emotionTag?: string; // For actor direction
  language?: string; // 'no', 'en', etc.
  translation?: string; // If multilingual
  audioNote?: string; // ADR notes, emphasis, etc.
  createdAt: string;
  updatedAt: string;
}

/**
 * Extended CastingProject to include manuscripts
 */
export interface CastingProjectWithManuscript extends CastingProject {
  manuscripts?: Manuscript[];
  scenes?: SceneBreakdown[];
}

/**
 * Shot Camera Details for export
 */
export interface ShotCamera {
  id: string;
  shotNumber: string;
  focalLength: number;
  cameraType: string;
  lensType: string;
  movement: string;
  framing: string;
  angle: string;
  notes?: string;
}

/**
 * Shot Lighting Details for export
 */
export interface ShotLighting {
  id: string;
  shotNumber: string;
  keyLight: { direction: string; intensity: number; color: string };
  fillLight: { direction: string; intensity: number; color: string };
  rimLight: { direction: string; intensity: number; color: string };
  practicals: string[];
  colorTemp: number;
  lightingStyle: string;
  notes?: string;
}

/**
 * Shot Audio Details for export
 */
export interface ShotAudio {
  id: string;
  shotNumber: string;
  dialogueType: string;
  atmosphereNeeded: string[];
  foleyNeeded: string[];
  musicCue?: string;
  micSetup: string;
  notes?: string;
}

/**
 * Shot Note for export
 */
export interface ShotNote {
  id: string;
  shotNumber: string;
  category: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  resolved: boolean;
  createdAt: string;
}

/**
 * Storyboard Frame for export
 */
export interface StoryboardFrame {
  id: string;
  shotNumber: string;
  imageUrl?: string;
  sketch?: string;
  description: string;
  cameraAngle: string;
  movement: string;
  duration: number;
  notes?: string;
  
  // Script linking - connects frame to screenplay
  sceneId?: string;                      // Links to SceneBreakdown.id
  scriptLineRange?: [number, number];    // Start and end line numbers in script
  dialogueCharacter?: string;            // Character speaking during this frame
  dialogueText?: string;                 // Actual dialogue line if applicable
  actionDescription?: string;            // Action line from script this frame covers
  
  // Drawing data for iPad sketching
  drawingData?: {
    strokes: any[];                      // PencilStroke data
    layers: any[];                       // DrawingLayer data
    template?: {
      aspectRatio: string;
      guides: string;
    };
  };
  
  // Image source tracking
  imageSource?: 'ai' | 'captured' | 'drawn' | 'uploaded' | 'generated';
  generatedFromScript?: boolean;         // Whether this was auto-generated from script analysis
}

/**
 * Complete Manuscript Export - includes everything needed for full restoration
 */
export interface ManuscriptExport {
  version: string;
  exportedAt: string;
  exportedBy: string;

  // Metadata
  metadata: {
    title: string;
    subtitle: string;
    author: string;
    description?: string;
    format: 'fountain' | 'final-draft' | 'markdown';
    projectId: string;
    manuscriptId: string;
    createdAt: string;
    updatedAt: string;
  };

  // Core manuscript data
  manuscript: Manuscript;
  acts: Act[];
  scenes: SceneBreakdown[];
  characters: string[];
  dialogueLines: DialogueLine[];

  // Production data
  production: {
    shotDetails: {
      cameras: Record<string, ShotCamera>;
      lighting: Record<string, ShotLighting>;
      audio: Record<string, ShotAudio>;
      notes: Record<string, ShotNote[]>;
    };
    storyboards: StoryboardFrame[];
  };

  // Revision history
  revisions: ScriptRevision[];

  // Statistics
  statistics: {
    sceneCount: number;
    characterCount: number;
    estimatedRuntime: number;
    shotCount: number;
  };
}