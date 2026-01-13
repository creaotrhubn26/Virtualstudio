/**
 * Avatar Material Definitions - PBR materials for 8 base avatars + generated avatars
 * Provides realistic skin, fabric, hair, and eye materials with texture support
 * 
 * ENHANCEMENT: Replaces generic gray fallback (metallic=0.3, roughness=0.5)
 * with proper material differentiation and texture maps
 */

export type AvatarType = 'athlete' | 'child' | 'dancer' | 'elderly' | 'man' | 'pregnant' | 'teenager' | 'woman' | 'generated';

export interface MaterialProperties {
  albedoColor?: string;          // Hex color fallback (e.g., '#F5D5B8')
  albedoTexture?: string;        // Path/URL to color texture
  normalMapUrl?: string;         // Normal map for surface detail
  roughness: number;             // 0-1: rougher = more matte
  metallic: number;              // 0-1: 0 for organic, up to 0.08 for synthetic
  specularIntensity?: number;    // 0.2-0.4 for micro-facet highlights
  ormTexture?: string;           // Packed ORM (Occlusion, Roughness, Metallic)
}

export interface AvatarMaterial {
  id: string;
  name: string;
  avatarType: AvatarType;
  
  // Skin properties (face, neck, hands, arms, legs)
  skin: MaterialProperties & {
    subsurfaceScattering?: {
      enabled: boolean;
      translucencyIntensity: number;  // 0.2-0.4: how much light passes through
      tintColor?: string;
    };
  };
  
  // Fabric properties (shirts, pants, clothing)
  fabric: MaterialProperties & {
    weaveDetail?: boolean;  // Use normal maps for fabric texture
  };
  
  // Hair properties (head, beard, body hair)
  hair?: MaterialProperties;
  
  // Eye properties (glossy and reflective)
  eyes?: {
    albedoColor?: string;
    roughness: number;             // 0.12-0.25: very smooth = glossy wet look
    metallic: number;              // Always 0 for eyes
    clearCoat?: {
      enabled: boolean;
      intensity: number;    // 0.7-1.0 for cornea wet effect
    };
  };
  
  // Optional: embedded texture info from GLB inspection
  embeddedTextures?: {
    hasAlbedo?: boolean;
    hasNormal?: boolean;
    hasORM?: boolean;
    albedoPath?: string;
    normalPath?: string;
    ormPath?: string;
  };
  
  // Metadata
  tags: string[];
  hasDifferentiation: boolean;  // True if body parts have distinctly different materials
  skinToneRange?: string;        // e.g., 'light', 'medium', 'dark'
}

/**
 * Avatar Material Library - 8 base avatars + generated template
 * 
 * STRATEGY:
 * 1. Skin: roughness=0.75, subsurface scattering enabled
 * 2. Fabrics: roughness=0.8-0.95 depending on material (silk lighter, linen heavier)
 * 3. Hair: roughness=0.5-0.7 (allows specular highlights)
 * 4. Eyes: roughness=0.15 (glossy), clearcoat enabled (wet cornea)
 * 
 * Texture paths are organized by avatar, allowing both embedded and external textures.
 * If embedded textures exist in GLB, they will be used; otherwise, external URLs.
 */
export const AVATAR_MATERIALS: AvatarMaterial[] = [
  {
    id: 'avatar_woman',
    name: 'Woman (Professional)',
    avatarType: 'woman',
    skin: {
      albedoColor: '#F5D5B8',           // Light skin tone with warm undertone
      albedoTexture: '/textures/avatars/skin_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_light_normal.jpg',
      roughness: 0.75,                  // Realistic human skin
      metallic: 0,
      specularIntensity: 0.3,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.3,     // Light penetrates skin slightly
        tintColor: '#F5C8A0'
      }
    },
    fabric: {
      albedoColor: '#2C3E50',           // Dark professional clothing
      albedoTexture: '/textures/avatars/fabric_cotton_dark_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_cotton_dark_normal.jpg',
      roughness: 0.85,                  // Cotton-like matte finish
      metallic: 0,
      weaveDetail: true
    },
    hair: {
      albedoColor: '#6B4423',           // Brown hair
      albedoTexture: '/textures/avatars/hair_light_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_light_brown_normal.jpg',
      roughness: 0.6,                   // Hair allows specular highlights
      metallic: 0
    },
    eyes: {
      albedoColor: '#8B7355',           // Brown eyes
      roughness: 0.15,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.8 }
    },
    tags: ['female', 'professional', 'realistic', 'light-skin', 'brown-hair'],
    hasDifferentiation: true,
    skinToneRange: 'light'
  },
  
  {
    id: 'avatar_man',
    name: 'Man (Professional)',
    avatarType: 'man',
    skin: {
      albedoColor: '#ECC8AD',           // Medium-light skin
      albedoTexture: '/textures/avatars/skin_medium_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_medium_normal.jpg',
      roughness: 0.75,
      metallic: 0,
      specularIntensity: 0.3,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.3,
        tintColor: '#ECC8A0'
      }
    },
    fabric: {
      albedoColor: '#34495E',           // Dark blue suit
      albedoTexture: '/textures/avatars/fabric_wool_dark_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_wool_dark_normal.jpg',
      roughness: 0.82,                  // Wool blend = slightly less matte than cotton
      metallic: 0,
      weaveDetail: true
    },
    hair: {
      albedoColor: '#4A3728',           // Dark brown hair
      albedoTexture: '/textures/avatars/hair_dark_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_dark_brown_normal.jpg',
      roughness: 0.65,
      metallic: 0
    },
    eyes: {
      albedoColor: '#6B5344',           // Dark brown eyes
      roughness: 0.15,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.8 }
    },
    tags: ['male', 'professional', 'realistic', 'medium-skin', 'dark-hair'],
    hasDifferentiation: true,
    skinToneRange: 'medium'
  },
  
  {
    id: 'avatar_child',
    name: 'Child',
    avatarType: 'child',
    skin: {
      albedoColor: '#FDE5D0',           // Very light, youthful skin
      albedoTexture: '/textures/avatars/skin_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_light_normal.jpg',
      roughness: 0.72,                  // Slightly smoother child skin
      metallic: 0,
      specularIntensity: 0.35,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.4,     // Thinner skin, more translucent
        tintColor: '#FDD9C8'
      }
    },
    fabric: {
      albedoColor: '#FF6B9D',           // Colorful children's clothing
      albedoTexture: '/textures/avatars/fabric_cotton_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_cotton_light_normal.jpg',
      roughness: 0.88,
      metallic: 0
    },
    hair: {
      albedoColor: '#D4A574',           // Light brown hair
      albedoTexture: '/textures/avatars/hair_light_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_light_brown_normal.jpg',
      roughness: 0.55,                  // Softer, finer hair
      metallic: 0
    },
    eyes: {
      albedoColor: '#A0826D',
      roughness: 0.12,                  // Very glossy child eyes
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.9 }
    },
    tags: ['child', 'young', 'light-skin', 'realistic'],
    hasDifferentiation: true,
    skinToneRange: 'light'
  },
  
  {
    id: 'avatar_teenager',
    name: 'Teenager',
    avatarType: 'teenager',
    skin: {
      albedoColor: '#F5D5B8',
      albedoTexture: '/textures/avatars/skin_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_light_normal.jpg',
      roughness: 0.76,                  // Teen skin with slight texture
      metallic: 0,
      specularIntensity: 0.32,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.35,
        tintColor: '#F5C8A0'
      }
    },
    fabric: {
      albedoColor: '#3B5998',           // Casual casual clothing
      albedoTexture: '/textures/avatars/fabric_cotton_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_cotton_light_normal.jpg',
      roughness: 0.86,
      metallic: 0
    },
    hair: {
      albedoColor: '#5C4033',
      albedoTexture: '/textures/avatars/hair_light_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_light_brown_normal.jpg',
      roughness: 0.62,
      metallic: 0
    },
    eyes: {
      albedoColor: '#8B7355',
      roughness: 0.14,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.85 }
    },
    tags: ['teenager', 'youth', 'casual', 'light-skin'],
    hasDifferentiation: true,
    skinToneRange: 'light'
  },
  
  {
    id: 'avatar_elderly',
    name: 'Elderly',
    avatarType: 'elderly',
    skin: {
      albedoColor: '#E8C9A0',           // Aged skin with less glow
      albedoTexture: '/textures/avatars/skin_aged_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_aged_normal.jpg',  // More prominent texture
      roughness: 0.80,                  // Older skin is slightly rougher (age spots, texture)
      metallic: 0,
      specularIntensity: 0.25,          // Less specular, duller appearance
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.2,     // Less translucent with age
        tintColor: '#E8C9A0'
      }
    },
    fabric: {
      albedoColor: '#5D4037',           // Darker, more conservative clothing
      albedoTexture: '/textures/avatars/fabric_wool_dark_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_wool_dark_normal.jpg',
      roughness: 0.85,
      metallic: 0
    },
    hair: {
      albedoColor: '#A9A9A9',           // Gray/white hair
      albedoTexture: '/textures/avatars/hair_gray_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_gray_normal.jpg',
      roughness: 0.7,                   // Coarser, thinner with age
      metallic: 0
    },
    eyes: {
      albedoColor: '#6B5344',
      roughness: 0.25,                  // Cloudier, less glossy with age
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.6 }  // Reduced cornea effect
    },
    tags: ['elderly', 'aged', 'gray-hair', 'experienced', 'light-skin'],
    hasDifferentiation: true,
    skinToneRange: 'medium'
  },
  
  {
    id: 'avatar_athlete',
    name: 'Athlete',
    avatarType: 'athlete',
    skin: {
      albedoColor: '#F4B3A0',           // Tanned skin
      albedoTexture: '/textures/avatars/skin_tanned_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_tanned_normal.jpg',
      roughness: 0.73,                  // Athletic skin is tighter, smoother
      metallic: 0,
      specularIntensity: 0.35,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.32,
        tintColor: '#F4A390'
      }
    },
    fabric: {
      albedoColor: '#FF6B35',           // Bright athletic wear
      albedoTexture: '/textures/avatars/fabric_synthetic_bright_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_synthetic_bright_normal.jpg',
      roughness: 0.75,                  // Technical fabrics more reflective
      metallic: 0.05,                   // Synthetic can have slight sheen
      weaveDetail: true
    },
    hair: {
      albedoColor: '#8B6F47',
      albedoTexture: '/textures/avatars/hair_light_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_light_brown_normal.jpg',
      roughness: 0.58,                  // Shorter, controlled hair
      metallic: 0
    },
    eyes: {
      albedoColor: '#7A6E5D',
      roughness: 0.13,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.85 }
    },
    tags: ['athlete', 'fit', 'active', 'medium-skin', 'tanned'],
    hasDifferentiation: true,
    skinToneRange: 'medium'
  },
  
  {
    id: 'avatar_dancer',
    name: 'Dancer',
    avatarType: 'dancer',
    skin: {
      albedoColor: '#FDBCB4',           // Warm, radiant skin
      albedoTexture: '/textures/avatars/skin_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_light_normal.jpg',
      roughness: 0.72,                  // Smooth, well-maintained
      metallic: 0,
      specularIntensity: 0.38,          // High specular for stage presence
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.35,
        tintColor: '#FDAA98'
      }
    },
    fabric: {
      albedoColor: '#8B008B',           // Deep purple/magenta dance outfit
      albedoTexture: '/textures/avatars/fabric_silk_dark_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_silk_dark_normal.jpg',
      roughness: 0.65,                  // Silk-like: more reflective
      metallic: 0.08,
      weaveDetail: true
    },
    hair: {
      albedoColor: '#2C1810',           // Dark hair often styled
      albedoTexture: '/textures/avatars/hair_dark_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_dark_brown_normal.jpg',
      roughness: 0.48,                  // Controlled, styled hair
      metallic: 0
    },
    eyes: {
      albedoColor: '#6B5344',
      roughness: 0.12,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.9 }
    },
    tags: ['dancer', 'expressive', 'stage', 'professional', 'light-skin'],
    hasDifferentiation: true,
    skinToneRange: 'light'
  },
  
  {
    id: 'avatar_pregnant',
    name: 'Pregnant',
    avatarType: 'pregnant',
    skin: {
      albedoColor: '#F5D5B8',
      albedoTexture: '/textures/avatars/skin_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_light_normal.jpg',
      roughness: 0.74,
      metallic: 0,
      specularIntensity: 0.32,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.36,    // Slightly higher for pregnancy glow
        tintColor: '#F5C8A0'
      }
    },
    fabric: {
      albedoColor: '#4CAF50',           // Comfortable, soft clothing
      albedoTexture: '/textures/avatars/fabric_cotton_light_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_cotton_light_normal.jpg',
      roughness: 0.87,
      metallic: 0
    },
    hair: {
      albedoColor: '#6B4423',
      albedoTexture: '/textures/avatars/hair_light_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_light_brown_normal.jpg',
      roughness: 0.63,
      metallic: 0
    },
    eyes: {
      albedoColor: '#8B7355',
      roughness: 0.14,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.85 }
    },
    tags: ['pregnant', 'maternity', 'female', 'light-skin', 'realistic'],
    hasDifferentiation: true,
    skinToneRange: 'light'
  },
  
  {
    id: 'avatar_generated',
    name: 'Generated Avatar (Template)',
    avatarType: 'generated',
    skin: {
      albedoColor: '#E8C9B0',           // Medium generic skin tone
      albedoTexture: '/textures/avatars/skin_medium_albedo.jpg',
      normalMapUrl: '/textures/avatars/skin_medium_normal.jpg',
      roughness: 0.75,
      metallic: 0,
      specularIntensity: 0.30,
      subsurfaceScattering: {
        enabled: true,
        translucencyIntensity: 0.30,
        tintColor: '#E8C9A0'
      }
    },
    fabric: {
      albedoColor: '#2C3E50',           // Neutral clothing
      albedoTexture: '/textures/avatars/fabric_cotton_dark_albedo.jpg',
      normalMapUrl: '/textures/avatars/fabric_cotton_dark_normal.jpg',
      roughness: 0.85,
      metallic: 0
    },
    hair: {
      albedoColor: '#5C4033',
      albedoTexture: '/textures/avatars/hair_dark_brown_albedo.jpg',
      normalMapUrl: '/textures/avatars/hair_dark_brown_normal.jpg',
      roughness: 0.62,
      metallic: 0
    },
    eyes: {
      albedoColor: '#6B5344',
      roughness: 0.15,
      metallic: 0,
      clearCoat: { enabled: true, intensity: 0.8 }
    },
    tags: ['generated', 'template', 'procedural', 'generic'],
    hasDifferentiation: true,
    skinToneRange: 'medium'
  }
];

/**
 * Lookup helper - Get avatar material definition by ID
 */
export function getAvatarById(id: string): AvatarMaterial | undefined {
  return AVATAR_MATERIALS.find(a => a.id === id);
}

/**
 * Lookup helper - Get avatar material by avatar type
 */
export function getAvatarByType(type: AvatarType): AvatarMaterial[] {
  return AVATAR_MATERIALS.filter(a => a.avatarType === type);
}

/**
 * Lookup helper - Get all avatars matching tags
 */
export function getAvatarsByTag(tag: string): AvatarMaterial[] {
  return AVATAR_MATERIALS.filter(a => a.tags.includes(tag));
}

/**
 * Lookup helper - Get all light-skinned avatars
 */
export function getLightSkinAvatars(): AvatarMaterial[] {
  return AVATAR_MATERIALS.filter(a => a.skinToneRange === 'light');
}

/**
 * Lookup helper - Get all medium-skinned avatars
 */
export function getMediumSkinAvatars(): AvatarMaterial[] {
  return AVATAR_MATERIALS.filter(a => a.skinToneRange === 'medium');
}

/**
 * Lookup helper - Get all dark-skinned avatars
 */
export function getDarkSkinAvatars(): AvatarMaterial[] {
  return AVATAR_MATERIALS.filter(a => a.skinToneRange === 'dark');
}
