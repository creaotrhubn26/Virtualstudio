import { ALL_LIGHTS, ALL_MODIFIERS, type LightEquipment, type ModifierEquipment } from '../data/EquipmentDatabase';
import { cinematographyPatternsService, type CinematographyPattern, type LightSetup } from './cinematographyPatternsService';

export interface EquipmentRequirement {
  id: string;
  name: string;
  role: LightSetup['type'];
  idealPower: number;
  modifier?: string;
  distance: number;
  angle: number;
}

export interface EquipmentMatch {
  requirement: EquipmentRequirement;
  matchedEquipment?: LightEquipment;
  score: number;
  warnings: string[];
  suggestions: string[];
}

export interface RecommendedSettings {
  aperture: number;
  shutter: number;
  iso: number;
}

export interface PatternExposureAnalysis {
  pattern: CinematographyPattern;
  requirements: EquipmentRequirement[];
  equipmentMatches: EquipmentMatch[];
  missingEquipment: EquipmentRequirement[];
  feasibilityScore: number;
  recommendedSettings: RecommendedSettings;
  contrastRatio: string;
  dynamicRangeRequired: number;
  totalWattageNeeded: number;
  keyLightPower: number;
  fillLightPower: number;
  rimLightPower: number;
  warnings: string[];
  tips: string[];
}

export interface EquipmentSuggestion {
  equipment: string;
  priority: 'high' | 'medium' | 'low';
  unlocksPatterns: string[];
}

export interface UserEquipmentInventory {
  lights: LightEquipment[];
  modifiers: ModifierEquipment[];
}

const normalizeModifier = (modifier?: string): ModifierEquipment['type'] | null => {
  if (!modifier) return null;
  const lower = modifier.toLowerCase();
  if (lower.includes('softbox')) return 'softbox';
  if (lower.includes('umbrella') || lower.includes('paraply')) return 'umbrella';
  if (lower.includes('beauty')) return 'beauty_dish';
  if (lower.includes('grid')) return 'grid';
  if (lower.includes('barn')) return 'barn_doors';
  return 'universal';
};

const buildRequirement = (light: LightSetup, index: number): EquipmentRequirement => {
  const distance = Math.sqrt(light.position.x ** 2 + light.position.y ** 2 + light.position.z ** 2);
  const angle = Math.round(Math.atan2(Math.abs(light.position.x), Math.max(0.1, Math.abs(light.position.z))) * (180 / Math.PI));
  const idealPower = Math.max(50, Math.round(light.intensity * 3));

  return {
    id: `${light.type}-${index}`,
    name: `${light.type.charAt(0).toUpperCase()}${light.type.slice(1)} light`,
    role: light.type,
    idealPower,
    modifier: light.modifier,
    distance: Number(distance.toFixed(1)),
    angle,
  };
};

const matchRequirement = (requirement: EquipmentRequirement, inventory: UserEquipmentInventory): EquipmentMatch => {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const sortedLights = [...inventory.lights].sort((a, b) => b.power - a.power);
  const matchedEquipment = sortedLights.find((light) => light.power >= requirement.idealPower)
    ?? sortedLights[0];

  if (!matchedEquipment) {
    warnings.push('No matching light in inventory.');
    return {
      requirement,
      matchedEquipment: undefined,
      score: 0,
      warnings,
      suggestions: ['Add a compatible light to meet this requirement.'],
    };
  }

  const powerScore = Math.min(matchedEquipment.power / requirement.idealPower, 1);
  const modifierType = normalizeModifier(requirement.modifier);
  const hasModifier = modifierType
    ? inventory.modifiers.some((modifier) => modifier.type === modifierType || modifier.type === 'universal')
    : true;

  if (!hasModifier && modifierType) {
    warnings.push(`Missing modifier: ${modifierType.replace('_', ' ')}`);
    suggestions.push('Consider adding a compatible modifier to soften the light.');
  }

  if (powerScore < 0.8) {
    warnings.push('Light output is below the ideal power requirement.');
    suggestions.push('Use a closer distance or increase ISO to compensate.');
  }

  const score = Math.max(0.1, powerScore * (hasModifier ? 1 : 0.8));

  return {
    requirement,
    matchedEquipment,
    score,
    warnings,
    suggestions,
  };
};

const calculateRecommendedSettings = (
  targetFStop: number,
  targetISO: number,
  totalNeeded: number,
  totalAvailable: number
): RecommendedSettings => {
  const ratio = totalAvailable > 0 ? totalNeeded / totalAvailable : 2;
  const iso = Math.round(Math.min(6400, Math.max(100, targetISO * ratio)));
  const shutter = ratio > 1.2 ? 1 / 30 : 1 / 60;

  return {
    aperture: targetFStop,
    shutter,
    iso,
  };
};

export const patternExposureIntegration = {
  analyzePatternWithEquipment(
    pattern: CinematographyPattern,
    inventory: UserEquipmentInventory,
    targets: { targetFStop: number; targetISO: number }
  ): PatternExposureAnalysis {
    const requirements = pattern.lights.map(buildRequirement);
    const equipmentMatches = requirements.map((req) => matchRequirement(req, inventory));
    const missingEquipment = equipmentMatches
      .filter((match) => !match.matchedEquipment || match.score < 0.5)
      .map((match) => match.requirement);

    const totalWattageNeeded = requirements.reduce((sum, req) => sum + req.idealPower, 0);
    const totalAvailable = equipmentMatches.reduce((sum, match) => sum + (match.matchedEquipment?.power ?? 0), 0);

    const feasibilityScore = equipmentMatches.length
      ? equipmentMatches.reduce((sum, match) => sum + match.score, 0) / equipmentMatches.length
      : 0;

    const ratioValue = Number(pattern.keyToFillRatio) || 2;
    const contrastRatio = `${pattern.keyToFillRatio}:1`;
    const dynamicRangeRequired = Math.max(4, Math.log2(Math.max(1, ratioValue)) + 6);

    const keyLightPower = requirements
      .filter((req) => req.role === 'key')
      .reduce((sum, req) => sum + req.idealPower, 0);
    const fillLightPower = requirements
      .filter((req) => req.role === 'fill')
      .reduce((sum, req) => sum + req.idealPower, 0);
    const rimLightPower = requirements
      .filter((req) => req.role === 'rim' || req.role === 'back' || req.role === 'hair')
      .reduce((sum, req) => sum + req.idealPower, 0);

    const warnings = equipmentMatches
      .flatMap((match) => match.warnings)
      .filter((warning, index, arr) => arr.indexOf(warning) === index);

    if (feasibilityScore < 0.5) {
      warnings.push('Pattern may require additional lighting equipment.');
    }

    const tips: string[] = [];
    if (pattern.difficulty === 'advanced' || pattern.difficulty === 'expert') {
      tips.push('Consider rehearsing the setup to balance ratios quickly.');
    }
    if (ratioValue >= 4) {
      tips.push('Use flags or grids to keep spill light under control.');
    }
    if (pattern.mood === 'bright' || pattern.mood === 'high-key') {
      tips.push('Keep background light levels close to key light for clean highlights.');
    }

    const recommendedSettings = calculateRecommendedSettings(
      targets.targetFStop,
      targets.targetISO,
      totalWattageNeeded,
      totalAvailable
    );

    return {
      pattern,
      requirements,
      equipmentMatches,
      missingEquipment,
      feasibilityScore,
      recommendedSettings,
      contrastRatio,
      dynamicRangeRequired,
      totalWattageNeeded,
      keyLightPower,
      fillLightPower,
      rimLightPower,
      warnings,
      tips,
    };
  },

  suggestEquipmentForPatterns(inventory: UserEquipmentInventory): EquipmentSuggestion[] {
    const patterns = cinematographyPatternsService.getAllPatterns();
    const suggestions: EquipmentSuggestion[] = [];

    const maxPower = inventory.lights.reduce((max, light) => Math.max(max, light.power), 0);
    if (maxPower < 300) {
      const unlocks = patterns.filter((pattern) => pattern.difficulty !== 'beginner').map((pattern) => pattern.name);
      suggestions.push({
        equipment: '300W+ key light (LED or strobe)',
        priority: 'high',
        unlocksPatterns: unlocks.slice(0, 6),
      });
    }

    const hasSoftbox = inventory.modifiers.some((modifier) => modifier.type === 'softbox');
    if (!hasSoftbox) {
      const unlocks = patterns
        .filter((pattern) => pattern.lights.some((light) => (light.modifier || '').toLowerCase().includes('softbox')))
        .map((pattern) => pattern.name);
      suggestions.push({
        equipment: 'Medium softbox for diffused key light',
        priority: 'medium',
        unlocksPatterns: unlocks.slice(0, 6),
      });
    }

    const hasBeautyDish = inventory.modifiers.some((modifier) => modifier.type === 'beauty_dish');
    if (!hasBeautyDish) {
      const unlocks = patterns
        .filter((pattern) => pattern.category === 'beauty')
        .map((pattern) => pattern.name);
      suggestions.push({
        equipment: 'Beauty dish modifier',
        priority: 'medium',
        unlocksPatterns: unlocks.slice(0, 6),
      });
    }

    const hasRimLight = inventory.lights.length >= 2;
    if (!hasRimLight) {
      const unlocks = patterns
        .filter((pattern) => pattern.lights.some((light) => light.type === 'rim' || light.type === 'back'))
        .map((pattern) => pattern.name);
      suggestions.push({
        equipment: 'Compact rim light (100W+) for separation',
        priority: 'low',
        unlocksPatterns: unlocks.slice(0, 6),
      });
    }

    return suggestions;
  },
};

export default patternExposureIntegration;
