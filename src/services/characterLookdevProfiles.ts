import * as BABYLON from '@babylonjs/core';

export type CharacterQualityTier = 'hero' | 'standard' | 'crowd';
export type CharacterLookdevKind = 'skin' | 'hair' | 'fabric' | 'trim' | 'eyes';

type ColorScale = readonly [number, number, number];

export interface CharacterLookdevPreset {
  roughness: number;
  metallic: number;
  specularIntensity: number;
  environmentIntensity: number;
  emissiveScale?: ColorScale;
  subSurface?: {
    enabled: boolean;
    translucencyIntensity: number;
    tintScale: ColorScale;
    diffusionProfileScale?: ColorScale;
  };
  clearCoat?: {
    enabled: boolean;
    intensity: number;
    roughness: number;
    indexOfRefraction?: number;
    tintColorScale?: ColorScale;
    tintColorAtDistance?: number;
    tintThickness?: number;
  };
  sheen?: {
    enabled: boolean;
    intensity: number;
    roughness: number;
    colorScale?: ColorScale;
    albedoScaling?: boolean;
    linkWithAlbedo?: boolean;
  };
  anisotropy?: {
    enabled: boolean;
    intensity: number;
    direction: readonly [number, number];
  };
}

const LOOKDEV_PRESETS: Record<CharacterQualityTier, Record<CharacterLookdevKind, CharacterLookdevPreset>> = {
  hero: {
    skin: {
      roughness: 0.62,
      metallic: 0,
      specularIntensity: 0.34,
      environmentIntensity: 0.96,
      emissiveScale: [0.035, 0.022, 0.018],
      subSurface: {
        enabled: true,
        translucencyIntensity: 0.26,
        tintScale: [1.06, 0.95, 0.88],
        diffusionProfileScale: [0.92, 0.58, 0.45],
      },
      clearCoat: {
        enabled: true,
        intensity: 0.1,
        roughness: 0.78,
        indexOfRefraction: 1.42,
      },
    },
    hair: {
      roughness: 0.42,
      metallic: 0,
      specularIntensity: 0.46,
      environmentIntensity: 1.04,
      emissiveScale: [0.012, 0.012, 0.012],
      anisotropy: {
        enabled: true,
        intensity: 0.72,
        direction: [1, 0.14],
      },
      sheen: {
        enabled: true,
        intensity: 0.08,
        roughness: 0.34,
        colorScale: [1.02, 1.02, 1.0],
        albedoScaling: true,
        linkWithAlbedo: false,
      },
    },
    fabric: {
      roughness: 0.72,
      metallic: 0.02,
      specularIntensity: 0.2,
      environmentIntensity: 0.88,
      sheen: {
        enabled: true,
        intensity: 0.24,
        roughness: 0.9,
        colorScale: [1.02, 1.02, 1.02],
        albedoScaling: true,
        linkWithAlbedo: false,
      },
    },
    trim: {
      roughness: 0.36,
      metallic: 0.03,
      specularIntensity: 0.26,
      environmentIntensity: 0.9,
      clearCoat: {
        enabled: true,
        intensity: 0.4,
        roughness: 0.22,
        indexOfRefraction: 1.5,
      },
    },
    eyes: {
      roughness: 0.14,
      metallic: 0,
      specularIntensity: 0.92,
      environmentIntensity: 1.2,
      clearCoat: {
        enabled: true,
        intensity: 1,
        roughness: 0.02,
        indexOfRefraction: 1.376,
      },
    },
  },
  standard: {
    skin: {
      roughness: 0.7,
      metallic: 0,
      specularIntensity: 0.28,
      environmentIntensity: 0.8,
      emissiveScale: [0.022, 0.015, 0.012],
      subSurface: {
        enabled: true,
        translucencyIntensity: 0.21,
        tintScale: [1.05, 0.95, 0.89],
        diffusionProfileScale: [0.9, 0.56, 0.43],
      },
      clearCoat: {
        enabled: true,
        intensity: 0.05,
        roughness: 0.84,
        indexOfRefraction: 1.4,
      },
    },
    hair: {
      roughness: 0.54,
      metallic: 0,
      specularIntensity: 0.34,
      environmentIntensity: 0.82,
      anisotropy: {
        enabled: true,
        intensity: 0.46,
        direction: [1, 0.08],
      },
    },
    fabric: {
      roughness: 0.82,
      metallic: 0.01,
      specularIntensity: 0.14,
      environmentIntensity: 0.72,
      sheen: {
        enabled: true,
        intensity: 0.12,
        roughness: 0.94,
        colorScale: [1.01, 1.01, 1.01],
        albedoScaling: true,
        linkWithAlbedo: false,
      },
    },
    trim: {
      roughness: 0.48,
      metallic: 0.02,
      specularIntensity: 0.2,
      environmentIntensity: 0.78,
      clearCoat: {
        enabled: true,
        intensity: 0.2,
        roughness: 0.32,
        indexOfRefraction: 1.46,
      },
    },
    eyes: {
      roughness: 0.18,
      metallic: 0,
      specularIntensity: 0.76,
      environmentIntensity: 1.02,
      clearCoat: {
        enabled: true,
        intensity: 0.82,
        roughness: 0.06,
        indexOfRefraction: 1.376,
      },
    },
  },
  crowd: {
    skin: {
      roughness: 0.78,
      metallic: 0,
      specularIntensity: 0.18,
      environmentIntensity: 0.58,
      emissiveScale: [0.012, 0.008, 0.006],
      subSurface: {
        enabled: true,
        translucencyIntensity: 0.12,
        tintScale: [1.03, 0.97, 0.92],
        diffusionProfileScale: [0.86, 0.54, 0.42],
      },
    },
    hair: {
      roughness: 0.62,
      metallic: 0,
      specularIntensity: 0.2,
      environmentIntensity: 0.56,
    },
    fabric: {
      roughness: 0.9,
      metallic: 0,
      specularIntensity: 0.1,
      environmentIntensity: 0.52,
    },
    trim: {
      roughness: 0.56,
      metallic: 0.01,
      specularIntensity: 0.14,
      environmentIntensity: 0.58,
    },
    eyes: {
      roughness: 0.24,
      metallic: 0,
      specularIntensity: 0.42,
      environmentIntensity: 0.72,
      clearCoat: {
        enabled: true,
        intensity: 0.45,
        roughness: 0.12,
        indexOfRefraction: 1.376,
      },
    },
  },
};

export function resolveCharacterQualityTier(input: {
  explicitTier?: CharacterQualityTier | null;
  characterTier?: string | null;
  qualityTarget?: string | null;
  renderingPreset?: string | null;
  shotDepthZone?: string | null;
}): CharacterQualityTier {
  if (input.explicitTier) {
    return input.explicitTier;
  }

  const characterTier = (input.characterTier || '').toLowerCase();
  const qualityTarget = (input.qualityTarget || '').toLowerCase();
  const renderingPreset = (input.renderingPreset || '').toLowerCase();
  const shotDepthZone = (input.shotDepthZone || '').toLowerCase();

  if (
    characterTier.includes('hero')
    || qualityTarget.includes('hero')
    || qualityTarget.includes('closeup')
    || renderingPreset.includes('portrait-realistic')
  ) {
    return 'hero';
  }

  if (
    shotDepthZone === 'background'
    || qualityTarget === 'draft'
  ) {
    return 'crowd';
  }

  return 'standard';
}

export function detectCharacterLookdevKind(
  meshName: string,
  materialName = '',
): CharacterLookdevKind {
  const lowered = `${meshName} ${materialName}`.toLowerCase();

  if (/(cornea|sclera|iris|pupil|eyeball|eye)/.test(lowered)) {
    return 'eyes';
  }

  if (/(hair|beard|brow|lash|mustache|moustache)/.test(lowered)) {
    return 'hair';
  }

  if (/(logo|trim|button|zipper|buckle|bag|jewel|glasses|belt|watch|shoe|boot|heel|sole|accessory)/.test(lowered)) {
    return 'trim';
  }

  if (/(shirt|pants|dress|cloth|fabric|jacket|coat|sleeve|hoodie|sweater|jean|skirt|legging|trouser|uniform|apron|hat|cap)/.test(lowered)) {
    return 'fabric';
  }

  if (/(skin|face|head|ear|arm|hand|leg|body|torso|neck|lip|nose|cheek|bust)/.test(lowered)) {
    return 'skin';
  }

  return 'fabric';
}

export function getCharacterLookdevPreset(
  kind: CharacterLookdevKind,
  qualityTier: CharacterQualityTier,
): CharacterLookdevPreset {
  return LOOKDEV_PRESETS[qualityTier][kind];
}

export function getCharacterLookdevFallbackColor(kind: CharacterLookdevKind): BABYLON.Color3 {
  switch (kind) {
    case 'skin':
      return new BABYLON.Color3(0.83, 0.68, 0.58);
    case 'hair':
      return new BABYLON.Color3(0.2, 0.16, 0.13);
    case 'trim':
      return new BABYLON.Color3(0.18, 0.2, 0.24);
    case 'eyes':
      return new BABYLON.Color3(0.52, 0.38, 0.31);
    case 'fabric':
    default:
      return new BABYLON.Color3(0.38, 0.42, 0.48);
  }
}

export function applyCharacterLookdevPreset(
  material: BABYLON.PBRMaterial,
  kind: CharacterLookdevKind,
  qualityTier: CharacterQualityTier,
  baseColor?: BABYLON.Color3,
): void {
  const preset = getCharacterLookdevPreset(kind, qualityTier);
  const referenceColor = baseColor || material.albedoColor || getCharacterLookdevFallbackColor(kind);

  material.metallic = preset.metallic;
  material.roughness = preset.roughness;
  material.specularIntensity = preset.specularIntensity;
  material.environmentIntensity = preset.environmentIntensity;
  material.backFaceCulling = true;
  material.twoSidedLighting = false;

  if (preset.emissiveScale) {
    material.emissiveColor = scaleColor(referenceColor, preset.emissiveScale);
  }

  if (preset.subSurface?.enabled) {
    material.subSurface.isTranslucencyEnabled = true;
    material.subSurface.translucencyIntensity = preset.subSurface.translucencyIntensity;
    material.subSurface.tintColor = scaleColor(referenceColor, preset.subSurface.tintScale);
    material.subSurface.scatteringDiffusionProfile = scaleColor(
      referenceColor,
      preset.subSurface.diffusionProfileScale || preset.subSurface.tintScale,
    );
  } else {
    material.subSurface.isTranslucencyEnabled = false;
  }

  if (preset.clearCoat?.enabled) {
    material.clearCoat.isEnabled = true;
    material.clearCoat.intensity = preset.clearCoat.intensity;
    material.clearCoat.roughness = preset.clearCoat.roughness;
    if (typeof preset.clearCoat.indexOfRefraction === 'number') {
      material.clearCoat.indexOfRefraction = preset.clearCoat.indexOfRefraction;
    }
    if (preset.clearCoat.tintColorScale) {
      material.clearCoat.isTintEnabled = true;
      material.clearCoat.tintColor = scaleColor(referenceColor, preset.clearCoat.tintColorScale);
      material.clearCoat.tintColorAtDistance = preset.clearCoat.tintColorAtDistance || 0.28;
      material.clearCoat.tintThickness = preset.clearCoat.tintThickness || 0.4;
    } else {
      material.clearCoat.isTintEnabled = false;
    }
  } else {
    material.clearCoat.isEnabled = false;
  }

  if (preset.sheen?.enabled) {
    material.sheen.isEnabled = true;
    material.sheen.intensity = preset.sheen.intensity;
    material.sheen.roughness = preset.sheen.roughness;
    material.sheen.color = scaleColor(referenceColor, preset.sheen.colorScale || [1, 1, 1]);
    material.sheen.albedoScaling = preset.sheen.albedoScaling ?? true;
    material.sheen.linkSheenWithAlbedo = preset.sheen.linkWithAlbedo ?? false;
  } else {
    material.sheen.isEnabled = false;
  }

  if (preset.anisotropy?.enabled) {
    material.anisotropy.isEnabled = true;
    material.anisotropy.intensity = preset.anisotropy.intensity;
    material.anisotropy.direction = new BABYLON.Vector2(
      preset.anisotropy.direction[0],
      preset.anisotropy.direction[1],
    );
  } else {
    material.anisotropy.isEnabled = false;
  }
}

function scaleColor(baseColor: BABYLON.Color3, scale: ColorScale): BABYLON.Color3 {
  return new BABYLON.Color3(
    BABYLON.Scalar.Clamp(baseColor.r * scale[0], 0, 1),
    BABYLON.Scalar.Clamp(baseColor.g * scale[1], 0, 1),
    BABYLON.Scalar.Clamp(baseColor.b * scale[2], 0, 1),
  );
}
