import {
  inferEnvironmentLightingRecipe,
  type EnvironmentLightingRecipe,
} from '../core/services/lightingPatternIntelligence';
import type {
  EnvironmentPlan,
  EnvironmentPlanCharacterSuggestion,
  EnvironmentPlanEvaluationSummary,
  EnvironmentPlanLightingCue,
  EnvironmentPlanRoomShell,
  EnvironmentPlanRoomShellOpening,
  EnvironmentPlanRoomShellZone,
} from '../core/models/environmentPlan';

export interface EnvironmentAutoRefineResult {
  plan: EnvironmentPlan;
  changed: boolean;
  reasons: string[];
  changes: string[];
}

export interface EnvironmentAutoRefineOptions {
  iteration?: number;
  previousReasons?: string[];
}

const LOW_SCORE_THRESHOLD = 0.72;

function clonePlan(plan: EnvironmentPlan): EnvironmentPlan {
  return JSON.parse(JSON.stringify(plan)) as EnvironmentPlan;
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function mergeUniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function buildContextText(plan: EnvironmentPlan): string {
  return [
    plan.prompt,
    plan.summary,
    plan.concept,
    plan.camera?.shotType,
    plan.camera?.mood,
    plan.recommendedPresetId,
    plan.roomShell?.type,
    plan.branding?.brandName,
    plan.branding?.profileName,
    Array.isArray(plan.branding?.notes) ? plan.branding.notes.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildCreativeIntentText(plan: EnvironmentPlan): string {
  return [
    plan.prompt,
    plan.summary,
    plan.concept,
    plan.camera?.shotType,
    plan.camera?.mood,
    plan.recommendedPresetId,
    plan.roomShell?.type,
    ...plan.lighting.map((cue) => cue.intent || cue.purpose || cue.role),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasAdjustmentSignal(
  evaluation: EnvironmentPlanEvaluationSummary,
  categoryKey: keyof EnvironmentPlanEvaluationSummary['categories'],
  tokens: string[],
): boolean {
  const category = evaluation.categories[categoryKey];
  if (category && typeof category.score === 'number' && category.score < LOW_SCORE_THRESHOLD) {
    return true;
  }
  return evaluation.suggestedAdjustments.some((item) => includesAny(normalizeText(item), tokens));
}

function dedupeProps(plan: EnvironmentPlan): EnvironmentPlan['props'] {
  const seen = new Set<string>();
  return plan.props.filter((prop) => {
    const key = `${normalizeText(prop.category)}:${normalizeText(prop.name)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function inferShotType(plan: EnvironmentPlan): string {
  const text = buildCreativeIntentText(plan);
  const currentShotType = String(plan.camera?.shotType || '').trim();
  if (includesAny(text, ['beauty', 'editorial', 'cosmetic', 'fashion'])) {
    return 'close-up beauty';
  }
  if (includesAny(text, ['pizza', 'food', 'restaurant', 'trattoria', 'hero product', 'product'])) {
    return 'hero shot';
  }
  if (includesAny(text, ['office', 'interview', 'podcast', 'presentation'])) {
    return 'medium shot';
  }
  if (includesAny(text, ['warehouse', 'storefront', 'showroom', 'retail'])) {
    return 'medium wide';
  }
  return currentShotType || 'medium shot';
}

function inferFovForShotType(shotType: string): number {
  const normalized = normalizeText(shotType);
  if (includesAny(normalized, ['close', 'beauty', 'portrait', 'macro'])) {
    return 34;
  }
  if (includesAny(normalized, ['hero'])) {
    return 38;
  }
  if (includesAny(normalized, ['medium wide', 'wide'])) {
    return 56;
  }
  if (includesAny(normalized, ['establishing'])) {
    return 66;
  }
  return 46;
}

function inferTargetHeight(plan: EnvironmentPlan): number {
  const text = buildContextText(plan);
  if (includesAny(text, ['product', 'pizza', 'food', 'hero'])) {
    return 1.15;
  }
  return 1.5;
}

function depthZoneToTargetZ(depthZone: 'foreground' | 'midground' | 'background', shellDepth: number): number {
  if (depthZone === 'foreground') {
    return -shellDepth * 0.12;
  }
  if (depthZone === 'background') {
    return shellDepth * 0.14;
  }
  return 0;
}

function buildCameraTargetFromLayout(plan: EnvironmentPlan): [number, number, number] {
  const heroZone = plan.layoutGuidance?.suggestedZones?.hero;
  const shell = plan.roomShell;
  const targetY = inferTargetHeight(plan);
  if (!heroZone) {
    return [0, targetY, 0];
  }
  const x = Number((heroZone.xBias * shell.width * 0.22).toFixed(2));
  const z = Number(depthZoneToTargetZ(heroZone.depthZone, shell.depth).toFixed(2));
  return [x, targetY, z];
}

function buildCameraPositionHint(plan: EnvironmentPlan, shotType: string, target: [number, number, number]): [number, number, number] {
  const normalized = normalizeText(shotType);
  const shell = plan.roomShell;
  let distance = shell.depth * 0.52;
  let y = includesAny(normalized, ['close', 'beauty']) ? 1.62 : 1.78;
  if (includesAny(normalized, ['wide', 'establishing'])) {
    distance = shell.depth * 0.72;
    y = 1.92;
  } else if (includesAny(normalized, ['hero'])) {
    distance = shell.depth * 0.46;
    y = 1.7;
  }

  const xOffset = Number((target[0] * 0.18).toFixed(2));
  return [
    Number((target[0] + xOffset).toFixed(2)),
    y,
    Number((target[2] - distance).toFixed(2)),
  ];
}

function mergeRecipeWithCue(
  cue: EnvironmentPlanLightingCue,
  recipe: EnvironmentLightingRecipe,
): EnvironmentPlanLightingCue {
  const nextRationale = mergeUniqueStrings([
    cue.rationale,
    `Auto-refine: ${recipe.rationale}`,
  ]).join(' ');

  return {
    ...cue,
    intent: recipe.intent,
    modifier: recipe.modifier,
    beamAngle: cue.beamAngle
      ? Math.round(((cue.beamAngle * 0.4) + (recipe.beamAngle * 0.6)) * 10) / 10
      : recipe.beamAngle,
    rationale: nextRationale,
    haze: recipe.haze
      ? {
        ...cue.haze,
        ...recipe.haze,
        enabled: true,
      }
      : cue.haze,
    gobo: cue.gobo || recipe.gobo
      ? {
        ...(recipe.gobo || {}),
        ...(cue.gobo || {}),
        rationale: mergeUniqueStrings([
          recipe.gobo?.rationale,
          cue.gobo?.rationale,
        ]).join(' ') || undefined,
      }
      : undefined,
  };
}

function ensureWallSegments(shell: EnvironmentPlanRoomShell): EnvironmentPlanRoomShell {
  if (Array.isArray(shell.wallSegments) && shell.wallSegments.length > 0) {
    return shell;
  }

  return {
    ...shell,
    wallSegments: [
      {
        id: 'auto-segment-center-panel',
        wallTarget: 'backWall',
        kind: 'panel',
        widthRatio: 0.28,
        heightRatio: 0.74,
        xAlign: 'center',
        notes: ['Auto-refine: center panel to reduce flat wall reads.'],
      },
      {
        id: 'auto-segment-left-pilaster',
        wallTarget: 'backWall',
        kind: 'pilaster',
        widthRatio: 0.08,
        heightRatio: 0.82,
        xAlign: 'left',
        notes: ['Auto-refine: architectural rhythm.'],
      },
      {
        id: 'auto-segment-right-pilaster',
        wallTarget: 'backWall',
        kind: 'pilaster',
        widthRatio: 0.08,
        heightRatio: 0.82,
        xAlign: 'right',
        notes: ['Auto-refine: architectural rhythm.'],
      },
    ],
  };
}

function ensureNiche(shell: EnvironmentPlanRoomShell): EnvironmentPlanRoomShell {
  if (Array.isArray(shell.niches) && shell.niches.length > 0) {
    return shell;
  }

  return {
    ...shell,
    niches: [
      {
        id: 'auto-display-niche',
        wallTarget: 'backWall',
        kind: 'display',
        widthRatio: 0.22,
        heightRatio: 0.42,
        xAlign: 'right',
        sillHeight: 1.0,
        depth: 0.2,
        notes: ['Auto-refine: display niche to add layered set depth.'],
      },
    ],
  };
}

function ensureBackroomZone(shell: EnvironmentPlanRoomShell): EnvironmentPlanRoomShell {
  const zones = Array.isArray(shell.zones) ? shell.zones : [];
  if (zones.some((zone) => zone.purpose === 'backroom')) {
    return shell;
  }

  return {
    ...shell,
    zones: [
      ...zones,
      {
        id: 'auto-backroom',
        label: 'Backroom',
        purpose: 'backroom',
        xBias: 0,
        zBias: 0.78,
        widthRatio: 0.32,
        depthRatio: 0.18,
        notes: ['Auto-refine: support zone behind the hero space.'],
      },
    ],
  };
}

function ensureFoodServiceOpening(shell: EnvironmentPlanRoomShell): EnvironmentPlanRoomShell {
  const openings = Array.isArray(shell.openings) ? shell.openings : [];
  if (openings.some((opening) => opening.kind === 'service_window' || opening.kind === 'pass_through')) {
    return shell;
  }

  const nextOpening: EnvironmentPlanRoomShellOpening = {
    id: 'auto-pass-through',
    wallTarget: 'backWall',
    kind: 'service_window',
    widthRatio: 0.22,
    heightRatio: 0.34,
    xAlign: 'center',
    sillHeight: 1.02,
    notes: ['Auto-refine: service pass-through adds restaurant realism.'],
  };

  return {
    ...shell,
    openings: [...openings, nextOpening],
    fixtures: [
      ...(Array.isArray(shell.fixtures) ? shell.fixtures : []),
      {
        id: 'auto-pass-shelf',
        kind: 'pass_shelf',
        wallTarget: 'backWall',
        widthRatio: 0.24,
        depthRatio: 0.06,
        height: 1.04,
        notes: ['Auto-refine: pass shelf below service opening.'],
      },
    ],
  };
}

function refineRoomShell(plan: EnvironmentPlan): EnvironmentPlanRoomShell {
  let shell = { ...plan.roomShell };
  const contextText = buildContextText(plan);

  shell = ensureWallSegments(shell);
  shell = ensureNiche(shell);

  if (includesAny(contextText, ['pizza', 'restaurant', 'trattoria', 'food', 'kitchen'])) {
    shell = ensureBackroomZone(shell);
    shell = ensureFoodServiceOpening(shell);
  }

  if (shell.type === 'warehouse' && !shell.ceilingStyle) {
    shell = {
      ...shell,
      ceilingStyle: 'open_truss',
      openCeiling: true,
      notes: mergeUniqueStrings([...(shell.notes || []), 'Auto-refine: open truss ceiling for industrial realism.']),
    };
  }

  if (plan.layoutGuidance?.detectedOpenings?.length) {
    const existingKeys = new Set((shell.openings || []).map((opening) => `${opening.kind}:${opening.wallTarget}:${opening.xAlign}`));
    const mergedOpenings = [...(shell.openings || [])];
    plan.layoutGuidance.detectedOpenings.forEach((opening) => {
      const key = `${opening.kind}:${opening.wallTarget}:${opening.xAlign}`;
      if (!existingKeys.has(key)) {
        mergedOpenings.push(opening);
      }
    });
    shell.openings = mergedOpenings;
  }

  return shell;
}

function mergeBrandTargets(
  branding: NonNullable<EnvironmentPlan['branding']>,
): NonNullable<EnvironmentPlan['branding']>['applicationTargets'] {
  const merged = new Set([
    ...(branding.applicationTargets || []),
    'environment',
    'wardrobe',
    'signage',
    'packaging',
    'interior_details',
  ]);
  return Array.from(merged) as NonNullable<EnvironmentPlan['branding']>['applicationTargets'];
}

function refineBranding(plan: EnvironmentPlan): EnvironmentPlan['branding'] {
  const branding = plan.branding;
  if (!branding) {
    return branding;
  }

  return {
    ...branding,
    enabled: true,
    applyToEnvironment: true,
    applyToWardrobe: true,
    applyToSignage: true,
    applicationTargets: mergeBrandTargets(branding),
    uniformPolicy: branding.uniformPolicy || 'match_palette',
    signageStyle: branding.signageStyle || (includesAny(buildContextText(plan), ['pizza', 'restaurant']) ? 'menu_board' : 'window_decal'),
    packagingStyle: branding.packagingStyle || (includesAny(buildContextText(plan), ['pizza', 'restaurant']) ? 'box_stamp' : 'printed_wrap'),
    interiorStyle: branding.interiorStyle || ((branding.palette?.length || 0) >= 3 ? 'full_palette' : 'accent_trim'),
    notes: mergeUniqueStrings([
      ...(branding.notes || []),
      'Auto-refine: expanded brand coverage across scene, staff and supporting details.',
    ]),
  };
}

function inferZoneByPurpose(shell: EnvironmentPlanRoomShell, purposes: EnvironmentPlanRoomShellZone['purpose'][]): string | undefined {
  const zones = Array.isArray(shell.zones) ? shell.zones : [];
  for (const purpose of purposes) {
    const zone = zones.find((candidate) => candidate.purpose === purpose);
    if (zone) {
      return zone.id;
    }
  }
  return zones[0]?.id;
}

function refineCharacterBlocking(
  plan: EnvironmentPlan,
  character: EnvironmentPlanCharacterSuggestion,
  iteration: number,
): EnvironmentPlanCharacterSuggestion {
  const behaviorPlan = character.behaviorPlan;
  if (!behaviorPlan) {
    return character;
  }

  const zoneIds = new Set((plan.roomShell.zones || []).map((zone) => zone.id));
  const roleText = normalizeText(`${character.role} ${character.placementHint || ''} ${character.actionHint || ''}`);
  const nextBehaviorPlan = {
    ...behaviorPlan,
    routeZoneIds: Array.isArray(behaviorPlan.routeZoneIds)
      ? behaviorPlan.routeZoneIds.filter((zoneId) => zoneIds.has(zoneId))
      : behaviorPlan.routeZoneIds,
  };

  if (!nextBehaviorPlan.homeZoneId || !zoneIds.has(nextBehaviorPlan.homeZoneId)) {
    if (includesAny(roleText, ['baker', 'cook', 'pizza'])) {
      nextBehaviorPlan.homeZoneId = inferZoneByPurpose(plan.roomShell, ['prep', 'service', 'counter']);
    } else if (includesAny(roleText, ['cashier', 'register', 'counter'])) {
      nextBehaviorPlan.homeZoneId = inferZoneByPurpose(plan.roomShell, ['counter', 'queue', 'service']);
    } else if (includesAny(roleText, ['server', 'waiter'])) {
      nextBehaviorPlan.homeZoneId = inferZoneByPurpose(plan.roomShell, ['service', 'dining', 'counter']);
    } else if (includesAny(roleText, ['customer', 'guest'])) {
      nextBehaviorPlan.homeZoneId = inferZoneByPurpose(plan.roomShell, ['dining', 'queue', 'hero']);
    }
  }

  if ((!nextBehaviorPlan.routeZoneIds || nextBehaviorPlan.routeZoneIds.length === 0) && nextBehaviorPlan.type !== 'stationary') {
    if (includesAny(roleText, ['baker', 'cook', 'pizza'])) {
      nextBehaviorPlan.routeZoneIds = mergeUniqueStrings([
        inferZoneByPurpose(plan.roomShell, ['prep']),
        inferZoneByPurpose(plan.roomShell, ['service', 'counter']),
      ]);
    } else if (includesAny(roleText, ['server', 'waiter'])) {
      nextBehaviorPlan.routeZoneIds = mergeUniqueStrings([
        inferZoneByPurpose(plan.roomShell, ['service']),
        inferZoneByPurpose(plan.roomShell, ['dining']),
      ]);
    } else if (includesAny(roleText, ['cashier', 'register'])) {
      nextBehaviorPlan.routeZoneIds = mergeUniqueStrings([
        inferZoneByPurpose(plan.roomShell, ['counter']),
        inferZoneByPurpose(plan.roomShell, ['queue']),
      ]);
    } else if (includesAny(roleText, ['customer', 'guest'])) {
      nextBehaviorPlan.routeZoneIds = mergeUniqueStrings([
        inferZoneByPurpose(plan.roomShell, ['queue']),
        inferZoneByPurpose(plan.roomShell, ['dining']),
      ]);
    }
  }

  if (!nextBehaviorPlan.pace || iteration >= 2) {
    if (includesAny(roleText, ['baker', 'cook', 'pizza', 'server', 'waiter'])) {
      nextBehaviorPlan.pace = 'active';
    } else if (includesAny(roleText, ['cashier', 'host'])) {
      nextBehaviorPlan.pace = 'subtle';
    } else if (includesAny(roleText, ['customer', 'guest'])) {
      nextBehaviorPlan.pace = 'still';
    }
  }

  if (!nextBehaviorPlan.lookAtTarget || iteration >= 2) {
    if (includesAny(roleText, ['baker', 'cook', 'pizza'])) {
      nextBehaviorPlan.lookAtTarget = 'oven';
    } else if (includesAny(roleText, ['cashier', 'host'])) {
      nextBehaviorPlan.lookAtTarget = 'guests';
    } else if (includesAny(roleText, ['server', 'waiter'])) {
      nextBehaviorPlan.lookAtTarget = 'hero_prop';
    } else if (includesAny(roleText, ['customer', 'guest'])) {
      nextBehaviorPlan.lookAtTarget = 'counter';
    }
  }

  if (!character.placementHint && plan.layoutGuidance?.objectAnchors?.length) {
    const anchor = plan.layoutGuidance.objectAnchors.find((candidate) => {
      const label = normalizeText(`${candidate.kind} ${candidate.label}`);
      if (includesAny(roleText, ['cashier', 'register'])) return includesAny(label, ['counter', 'register']);
      if (includesAny(roleText, ['baker', 'cook', 'pizza'])) return includesAny(label, ['oven', 'counter', 'prep']);
      if (includesAny(roleText, ['server', 'waiter'])) return includesAny(label, ['table', 'dining', 'counter']);
      if (includesAny(roleText, ['customer', 'guest'])) return includesAny(label, ['table', 'dining', 'queue']);
      return false;
    });
    if (anchor) {
      character = {
        ...character,
        placementHint: `Near ${anchor.label}`,
      };
    }
  }

  return {
    ...character,
    behaviorPlan: nextBehaviorPlan,
  };
}

function refinePropsFromAnchors(plan: EnvironmentPlan): EnvironmentPlan['props'] {
  const anchors = plan.layoutGuidance?.objectAnchors || [];
  if (anchors.length === 0) {
    return plan.props;
  }

  const counterAnchor = anchors.find((anchor) => includesAny(normalizeText(`${anchor.kind} ${anchor.label}`), ['counter', 'prep']));
  const displayAnchor = anchors.find((anchor) => includesAny(normalizeText(`${anchor.kind} ${anchor.label}`), ['display', 'shelf', 'menu']));

  return plan.props.map((prop) => {
    if (prop.category === 'hero' && counterAnchor) {
      return {
        ...prop,
        placementHint: prop.placementHint || `Centered on ${counterAnchor.label}`,
      };
    }
    if (!prop.placementHint && displayAnchor && prop.category !== 'hero') {
      return {
        ...prop,
        placementHint: `Near ${displayAnchor.label}`,
      };
    }
    return prop;
  });
}

function refinePropsFromLayoutZones(
  plan: EnvironmentPlan,
  iteration: number,
): EnvironmentPlan['props'] {
  const supportingZone = plan.layoutGuidance?.suggestedZones?.supporting;
  const backgroundZone = plan.layoutGuidance?.suggestedZones?.background;
  const anchors = plan.layoutGuidance?.objectAnchors || [];
  const backgroundWall = backgroundZone?.wallTarget || 'backWall';

  return plan.props.map((prop) => {
    const propText = normalizeText(`${prop.name} ${prop.description || ''} ${prop.placementHint || ''}`);
    const menuLike = includesAny(propText, ['menu', 'sign', 'board']);
    const wallAnchor = anchors.find((anchor) => (
      menuLike
        ? includesAny(normalizeText(`${anchor.kind} ${anchor.label}`), ['menu', 'display', 'shelf', 'wall'])
        : includesAny(normalizeText(`${anchor.kind} ${anchor.label}`), ['display', 'shelf', 'table', 'counter'])
    ));

    if (prop.category === 'supporting') {
      if (wallAnchor) {
        return {
          ...prop,
          placementHint: `Place near ${wallAnchor.label}`,
        };
      }
      if (!prop.placementHint && supportingZone) {
        return {
          ...prop,
          placementHint: `${supportingZone.side} ${supportingZone.depthZone} support cluster`,
        };
      }
    }

    if (prop.category === 'set_dressing') {
      if (menuLike) {
        return {
          ...prop,
          placementHint: `Attach to ${backgroundWall}`,
        };
      }
      if (!prop.placementHint && iteration >= 2 && backgroundZone) {
        return {
          ...prop,
          placementHint: `${backgroundZone.depthZone} dressing against ${backgroundWall}`,
        };
      }
    }

    return prop;
  });
}

type EnvironmentSceneFamily =
  | 'photo_studio'
  | 'film_studio'
  | 'beauty'
  | 'noir'
  | 'luxury_retail'
  | 'warehouse'
  | 'office'
  | 'nightclub'
  | 'food'
  | 'unknown';

type EvaluationCategoryKey = keyof EnvironmentPlanEvaluationSummary['categories'];

function inferSceneFamily(plan: EnvironmentPlan): EnvironmentSceneFamily {
  const contextText = buildCreativeIntentText(plan);
  const lightingIntents = plan.lighting.map((cue) => normalizeText(cue.intent));
  const hasLightingIntent = (value: string) => lightingIntents.includes(value);

  if (includesAny(contextText, ['photo studio', 'photography studio', 'seamless', 'cyclorama', 'editorial studio']) || hasLightingIntent('soft_daylight')) {
    return 'photo_studio';
  }
  if (includesAny(contextText, ['film studio', 'soundstage', 'stage build', 'cinema set', 'backlot'])) {
    return 'film_studio';
  }
  if (includesAny(contextText, ['beauty', 'editorial', 'cosmetic', 'fashion']) || hasLightingIntent('beauty')) {
    return 'beauty';
  }
  if (includesAny(contextText, ['noir', 'detective', 'venetian', 'low-key']) || hasLightingIntent('noir')) {
    return 'noir';
  }
  if (includesAny(contextText, ['luxury retail', 'showroom', 'boutique', 'premium retail']) || hasLightingIntent('luxury_retail')) {
    return 'luxury_retail';
  }
  if (includesAny(contextText, ['warehouse', 'industrial', 'factory', 'garage']) || hasLightingIntent('warehouse')) {
    return 'warehouse';
  }
  if (includesAny(contextText, ['office', 'corporate', 'meeting room', 'interview', 'presentation']) || hasLightingIntent('office')) {
    return 'office';
  }
  if (includesAny(contextText, ['nightclub', 'club', 'dancefloor', 'dj', 'strobe']) || hasLightingIntent('nightclub')) {
    return 'nightclub';
  }
  if (includesAny(contextText, ['pizza', 'restaurant', 'trattoria', 'food']) || hasLightingIntent('food')) {
    return 'food';
  }
  return 'unknown';
}

function getFamilyCriticalThresholds(
  family: EnvironmentSceneFamily,
): Partial<Record<EvaluationCategoryKey, number>> {
  switch (family) {
    case 'photo_studio':
      return {
        lightingIntentMatch: 0.78,
        compositionMatch: 0.76,
      };
    case 'film_studio':
      return {
        lightingIntentMatch: 0.76,
        compositionMatch: 0.74,
        roomRealism: 0.76,
      };
    case 'beauty':
      return {
        lightingIntentMatch: 0.8,
        compositionMatch: 0.78,
      };
    case 'noir':
      return {
        lightingIntentMatch: 0.8,
        compositionMatch: 0.74,
      };
    case 'luxury_retail':
      return {
        lightingIntentMatch: 0.76,
        compositionMatch: 0.76,
        roomRealism: 0.78,
        brandConsistency: 0.8,
      };
    case 'warehouse':
      return {
        lightingIntentMatch: 0.74,
        roomRealism: 0.78,
      };
    case 'office':
      return {
        lightingIntentMatch: 0.78,
        compositionMatch: 0.74,
        technicalIntegrity: 0.74,
      };
    case 'nightclub':
      return {
        lightingIntentMatch: 0.78,
        compositionMatch: 0.74,
      };
    case 'food':
      return {
        lightingIntentMatch: 0.74,
        compositionMatch: 0.76,
        brandConsistency: 0.74,
      };
    default:
      return {};
  }
}

function applySceneFamilyRefinement(
  plan: EnvironmentPlan,
  family: EnvironmentSceneFamily,
  iteration: number,
): { plan: EnvironmentPlan; changes: string[]; reasons: string[] } {
  const nextPlan = clonePlan(plan);
  const changes: string[] = [];
  const reasons = new Set<string>();

  const setAtmospherePatch = (patch: Partial<EnvironmentPlan['atmosphere']>, change: string) => {
    const nextAtmosphere = {
      ...(nextPlan.atmosphere || {}),
      ...patch,
    };
    if (JSON.stringify(nextAtmosphere) !== JSON.stringify(nextPlan.atmosphere || {})) {
      nextPlan.atmosphere = nextAtmosphere;
      reasons.add('atmosphere');
      changes.push(change);
    }
  };

  const setCameraPatch = (patch: Partial<EnvironmentPlan['camera']>, change: string) => {
    const nextCamera = {
      ...nextPlan.camera,
      ...patch,
    };
    if (JSON.stringify(nextCamera) !== JSON.stringify(nextPlan.camera)) {
      nextPlan.camera = nextCamera;
      reasons.add('camera');
      changes.push(change);
    }
  };

  const setRoomShellPatch = (patch: Partial<EnvironmentPlan['roomShell']>, change: string) => {
    const nextShell = {
      ...nextPlan.roomShell,
      ...patch,
    };
    if (JSON.stringify(nextShell) !== JSON.stringify(nextPlan.roomShell)) {
      nextPlan.roomShell = nextShell;
      reasons.add('roomShell');
      changes.push(change);
    }
  };

  const setLighting = (mapper: (cue: EnvironmentPlanLightingCue) => EnvironmentPlanLightingCue, change: string) => {
    const nextLighting = nextPlan.lighting.map(mapper);
    if (JSON.stringify(nextLighting) !== JSON.stringify(nextPlan.lighting)) {
      nextPlan.lighting = nextLighting;
      reasons.add('lighting');
      changes.push(change);
    }
  };

  if (family === 'beauty') {
    setCameraPatch(
      {
        shotType: 'close-up beauty',
        fov: 34,
        mood: nextPlan.camera?.mood || 'luxury beauty editorial',
      },
      'Låste beauty-kameraet til et tettere, mer editorialt hero-utsnitt.',
    );
    setAtmospherePatch(
      {
        fogEnabled: false,
        fogDensity: 0,
        clearColor: '#f5efe7',
        ambientColor: '#fff6ef',
        ambientIntensity: Math.max(0.78, Number(nextPlan.atmosphere?.ambientIntensity || 0)),
      },
      'Ryddet beauty-atmosfæren for renere hud- og bakgrunnsgjengivelse.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['key', 'fill'])) {
        return {
          ...cue,
          modifier: 'softbox',
          beamAngle: Math.max(42, Number(cue.beamAngle || 0) || 42),
          haze: undefined,
          gobo: undefined,
        };
      }
      if (includesAny(role, ['accent', 'rim', 'background'])) {
        return {
          ...cue,
          modifier: cue.modifier || 'stripbox',
          gobo: cue.gobo || {
            goboId: 'breakup',
            size: 1.0,
            rotation: 0,
            intensity: 0.48,
            rationale: 'Beauty accents benefit from a restrained glossy breakup, not a dirty key.',
          },
        };
      }
      return cue;
    }, 'Skreddersydde beauty-lys med rene key/fill-kilder og subtil glossy separation.');
  }

  if (family === 'photo_studio') {
    setCameraPatch(
      {
        shotType: 'medium shot',
        fov: 44,
        mood: nextPlan.camera?.mood || 'clean photo studio',
      },
      'Låste foto-studio-kameraet til en kontrollert studio-framing med trygg portrett-/produktlesning.',
    );
    setAtmospherePatch(
      {
        fogEnabled: false,
        fogDensity: 0,
        clearColor: '#f3f4f6',
        ambientColor: '#ffffff',
        ambientIntensity: 0.86,
      },
      'Ryddet foto-studio-atmosfæren til en nøytral seamless-basert studio-look.',
    );
    setRoomShellPatch(
      {
        type: 'studio_shell',
        openCeiling: true,
      },
      'Låste shellen til åpen studio-rigg for en mer troverdig fotostudio-følelse.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['key', 'fill'])) {
        return {
          ...cue,
          modifier: 'softbox',
          beamAngle: Math.max(52, Number(cue.beamAngle || 0) || 52),
          haze: undefined,
          gobo: undefined,
        };
      }
      if (includesAny(role, ['rim', 'accent'])) {
        return {
          ...cue,
          modifier: cue.modifier || 'stripbox',
          haze: undefined,
          gobo: undefined,
        };
      }
      return cue;
    }, 'Strammet foto-studio-lyset til rene studioformere uten gobo-støy i bildet.');
  }

  if (family === 'film_studio') {
    setCameraPatch(
      {
        shotType: 'medium wide',
        fov: 54,
        mood: nextPlan.camera?.mood || 'cinematic stage',
      },
      'Åpnet filmstudio-kameraet for å lese mer av scenografien og stage-volumet.',
    );
    setAtmospherePatch(
      {
        fogEnabled: true,
        fogDensity: Math.max(0.008, Number(nextPlan.atmosphere?.fogDensity || 0)),
        clearColor: '#1a1a1f',
        ambientColor: '#343742',
        ambientIntensity: 0.48,
      },
      'La inn subtil film-haze og mørkere stage-base for mer cinematic separation.',
    );
    setRoomShellPatch(
      {
        type: nextPlan.roomShell.type === 'abstract_stage' ? 'abstract_stage' : 'studio_shell',
        openCeiling: true,
      },
      'Justerte shellen mot soundstage/studio-rigg for en mer troverdig filmstudio-følelse.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['key'])) {
        return {
          ...cue,
          modifier: 'fresnel',
          beamAngle: Math.min(34, Number(cue.beamAngle || 34)),
          haze: cue.haze || {
            enabled: true,
            density: 0.008,
            rationale: 'Subtle stage haze helps film lights separate in space.',
          },
        };
      }
      if (includesAny(role, ['rim', 'accent', 'background'])) {
        return {
          ...cue,
          modifier: cue.modifier || 'fresnel',
          gobo: cue.gobo,
        };
      }
      return cue;
    }, 'Ga filmstudio-lysene mer stage-preget shaping og subtil volumfølelse.');
  }

  if (family === 'warehouse') {
    setCameraPatch(
      {
        shotType: 'medium wide',
        fov: 56,
        mood: nextPlan.camera?.mood || 'industrial warehouse mood',
      },
      'Åpnet kameraet for å lese mer av det industrielle volumet.',
    );
    setAtmospherePatch(
      {
        fogEnabled: true,
        fogDensity: Math.max(0.014, Number(nextPlan.atmosphere?.fogDensity || 0)),
        clearColor: '#1f2328',
        ambientColor: '#3a4048',
        ambientIntensity: 0.42,
      },
      'La inn industriell haze og mørkere base for å få warehouse-lysene til å lese i dybden.',
    );
    setRoomShellPatch(
      {
        openCeiling: true,
        ceilingStyle: 'open_truss',
      },
      'Låste warehouse-shellen til åpen truss for mer troverdig industri-look.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['accent', 'background', 'rim'])) {
        return {
          ...cue,
          modifier: 'gobo_projector',
          haze: {
            enabled: true,
            density: 0.014,
            rationale: 'Warehouse accents need visible haze to carry breakup and shafts.',
          },
          gobo: cue.gobo || {
            goboId: 'breakup',
            size: 1.2,
            rotation: 0,
            intensity: 0.78,
            rationale: 'Dusty breakup helps warehouse backgrounds read as layered and industrial.',
          },
        };
      }
      return cue;
    }, 'Låste warehouse-lys til industriell breakup og synlig volum i luften.');
  }

  if (family === 'office') {
    setCameraPatch(
      {
        shotType: 'medium shot',
        fov: 46,
        mood: nextPlan.camera?.mood || 'clean corporate daylight',
      },
      'Strammet office-kameraet til en trygg, lesbar corporate-framing.',
    );
    setAtmospherePatch(
      {
        fogEnabled: false,
        fogDensity: 0,
        clearColor: '#dde6f2',
        ambientColor: '#f5f8fc',
        ambientIntensity: 0.82,
      },
      'Ryddet office-atmosfæren for klarere, brand-sikker daylight-look.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['key'])) {
        return {
          ...cue,
          modifier: 'softbox',
          beamAngle: Math.max(48, Number(cue.beamAngle || 0) || 48),
          haze: undefined,
          gobo: undefined,
        };
      }
      if (includesAny(role, ['fill', 'background', 'accent', 'rim'])) {
        return {
          ...cue,
          haze: undefined,
          gobo: undefined,
        };
      }
      return cue;
    }, 'Forenklet office-lysriggen til myk, ren daylight uten unødvendig tekstur i bildet.');
  }

  if (family === 'noir') {
    setCameraPatch(
      {
        shotType: 'medium close-up',
        fov: 40,
        mood: nextPlan.camera?.mood || 'dramatic noir',
      },
      'Strammet noir-kameraet til en mer intens, skyggetung portrett-/scene-lesning.',
    );
    setAtmospherePatch(
      {
        fogEnabled: true,
        fogDensity: Math.max(0.01, Number(nextPlan.atmosphere?.fogDensity || 0)),
        clearColor: '#101015',
        ambientColor: '#272734',
        ambientIntensity: 0.3,
      },
      'Bygde noir-atmosfære med mørkere base og lett haze for å bære skyggeteksturen.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['key', 'accent', 'rim'])) {
        return {
          ...cue,
          modifier: 'fresnel',
          beamAngle: Math.min(26, Number(cue.beamAngle || 26)),
          gobo: cue.gobo || {
            goboId: 'blinds',
            size: 1.2,
            rotation: 0,
            intensity: 0.88,
            rationale: 'Noir reads best with venetian-blind texture across the set.',
          },
          haze: cue.haze || {
            enabled: true,
            density: 0.01,
            rationale: 'Light noir haze helps hard beams read in the darkness.',
          },
        };
      }
      return cue;
    }, 'Låste noir-lysene til hardere shaping og venetian-blind breakup.');
  }

  if (family === 'luxury_retail') {
    const shouldUseCofferedCeiling = !nextPlan.roomShell.ceilingStyle
      || nextPlan.roomShell.ceilingStyle === 'flat';
    setCameraPatch(
      {
        shotType: 'hero shot',
        fov: 42,
        mood: nextPlan.camera?.mood || 'premium retail showcase',
      },
      'Låste luxury retail-kameraet til en premium merchandize/hero-framing.',
    );
    setAtmospherePatch(
      {
        fogEnabled: false,
        fogDensity: 0,
        clearColor: '#ece8e2',
        ambientColor: '#fff8ef',
        ambientIntensity: 0.74,
      },
      'Ryddet luxury retail-atmosfæren til lysere showroom-base med premium lesbarhet.',
    );
    setRoomShellPatch(
      {
        type: nextPlan.roomShell.type === 'storefront' ? 'storefront' : 'interior_room',
        ceilingStyle: shouldUseCofferedCeiling
          ? 'coffered'
          : nextPlan.roomShell.ceilingStyle,
      },
      'Ga luxury retail-shellen mer showroom-arkitektur med tydelig premium rytme.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['key'])) {
        return {
          ...cue,
          modifier: 'fresnel',
          beamAngle: Math.min(36, Number(cue.beamAngle || 36)),
          gobo: undefined,
          haze: undefined,
        };
      }
      if (includesAny(role, ['accent', 'background', 'rim'])) {
        return {
          ...cue,
          modifier: cue.modifier || 'stripbox',
          gobo: cue.gobo || {
            goboId: 'lines',
            size: 1.0,
            rotation: 90,
            intensity: 0.42,
            rationale: 'Luxury retail benefits from linear architectural breakup behind the product.',
          },
          haze: undefined,
        };
      }
      return cue;
    }, 'Låste luxury retail-lysene til premium key-shaping og arkitektonisk line-breakup.');
  }

  if (family === 'nightclub') {
    setCameraPatch(
      {
        shotType: 'medium wide',
        fov: 58,
        mood: nextPlan.camera?.mood || 'nightclub promo',
      },
      'Åpnet nightclub-kameraet for å få med bevegelse, haze og grafiske lysflater.',
    );
    setAtmospherePatch(
      {
        fogEnabled: true,
        fogDensity: Math.max(0.024, Number(nextPlan.atmosphere?.fogDensity || 0)),
        clearColor: '#0f1020',
        ambientColor: '#24153b',
        ambientIntensity: 0.36,
      },
      'Bygde nightclub-atmosfære med mer haze og mørkere base for synlige beams.',
    );
    setLighting((cue) => {
      const role = normalizeText(cue.role);
      if (includesAny(role, ['accent', 'practical', 'rim', 'background'])) {
        return {
          ...cue,
          modifier: 'gobo_projector',
          haze: {
            enabled: true,
            density: 0.026,
            rationale: 'Nightclub fixtures need haze to draw beams in the volume.',
          },
          gobo: {
            goboId: includesAny(role, ['accent', 'background']) ? 'dots' : 'lines',
            size: 0.96,
            rotation: includesAny(role, ['rim']) ? 90 : 0,
            intensity: 0.72,
            rationale: 'Graphic nightclub breakup creates a more kinetic club read.',
          },
        };
      }
      return cue;
    }, 'Låste nightclub-lysene til grafiske gobos, haze og mer kinetisk volum.');
  }

  return {
    plan: nextPlan,
    changes,
    reasons: Array.from(reasons),
  };
}

class EnvironmentAutoRefineService {
  shouldAutoRefine(evaluation: EnvironmentPlanEvaluationSummary | null | undefined): boolean {
    if (!evaluation) {
      return false;
    }
    if (evaluation.verdict === 'needs_refinement') {
      return true;
    }
    return evaluation.overallScore < 0.8;
  }

  shouldAutoRefinePlan(
    plan: EnvironmentPlan | null | undefined,
    evaluation: EnvironmentPlanEvaluationSummary | null | undefined,
  ): boolean {
    if (!evaluation) {
      return false;
    }
    if (this.shouldAutoRefine(evaluation)) {
      return true;
    }
    if (!plan) {
      return false;
    }

    const thresholds = getFamilyCriticalThresholds(inferSceneFamily(plan));
    return Object.entries(thresholds).some(([categoryKey, threshold]) => {
      if (typeof threshold !== 'number') {
        return false;
      }
      const category = evaluation.categories?.[categoryKey as EvaluationCategoryKey];
      return typeof category?.score === 'number' && category.score < threshold;
    });
  }

  refinePlan(
    plan: EnvironmentPlan,
    evaluation: EnvironmentPlanEvaluationSummary,
    options: EnvironmentAutoRefineOptions = {},
  ): EnvironmentAutoRefineResult {
    const nextPlan = clonePlan(plan);
    const reasons: string[] = [];
    const changes: string[] = [];
    const contextText = buildContextText(nextPlan);
    const iteration = Math.max(1, options.iteration ?? 1);
    const previousReasonSet = new Set(options.previousReasons || []);
    const sceneFamily = inferSceneFamily(nextPlan);

    const lightingNeedsAttention = hasAdjustmentSignal(
      evaluation,
      'lightingIntentMatch',
      ['lighting intent', 'modifier', 'beam angle', 'haze'],
    );
    if (lightingNeedsAttention && nextPlan.lighting.length > 0) {
      const nextLighting = nextPlan.lighting.map((cue) => mergeRecipeWithCue(
        cue,
        inferEnvironmentLightingRecipe({
          role: cue.role,
          purpose: cue.purpose,
          mood: nextPlan.camera?.mood || null,
          contextText,
        }),
      ));
      if (JSON.stringify(nextLighting) !== JSON.stringify(nextPlan.lighting)) {
        nextPlan.lighting = nextLighting;
        reasons.push('lighting');
        changes.push('Finjusterte intent, modifier, beam angle og gobo/haze for lysriggen.');
      }
    }

    const compositionNeedsAttention = hasAdjustmentSignal(
      evaluation,
      'compositionMatch',
      ['kamera-shot', 'target', 'hero-zoner', 'komposisjon'],
    );
    if (compositionNeedsAttention) {
      const shotType = inferShotType(nextPlan);
      const target = buildCameraTargetFromLayout(nextPlan);
      const positionHint = buildCameraPositionHint(nextPlan, shotType, target);
      const refinedCamera = {
        ...nextPlan.camera,
        shotType,
        target,
        positionHint,
        fov: inferFovForShotType(shotType),
      };
      if (JSON.stringify(refinedCamera) !== JSON.stringify(nextPlan.camera)) {
        nextPlan.camera = refinedCamera;
        reasons.push('camera');
        changes.push(`Justerte kamera til ${shotType} med tydeligere hero-framing.`);
      }
    }

    if (sceneFamily !== 'unknown') {
      const sceneFamilyResult = applySceneFamilyRefinement(nextPlan, sceneFamily, iteration);
      if (JSON.stringify(sceneFamilyResult.plan) !== JSON.stringify(nextPlan)) {
        Object.assign(nextPlan, sceneFamilyResult.plan);
        sceneFamilyResult.reasons.forEach((reason) => reasons.push(reason));
        changes.push(...sceneFamilyResult.changes);
      }
    }

    const realismNeedsAttention = hasAdjustmentSignal(
      evaluation,
      'roomRealism',
      ['arkitektoniske signaler', 'pass-through', 'backroom', 'nisjer'],
    );
    if (realismNeedsAttention) {
      const refinedShell = refineRoomShell(nextPlan);
      if (JSON.stringify(refinedShell) !== JSON.stringify(nextPlan.roomShell)) {
        nextPlan.roomShell = refinedShell;
        reasons.push('roomShell');
        changes.push('La til sterkere romsignaler med segmenter, nisjer og støttefunksjoner.');
      }
    }

    const brandNeedsAttention = hasAdjustmentSignal(
      evaluation,
      'brandConsistency',
      ['brandprofilen', 'signage', 'wardrobe', 'packaging', 'interior details'],
    );
    if (brandNeedsAttention && nextPlan.branding) {
      const refinedBranding = refineBranding(nextPlan);
      if (JSON.stringify(refinedBranding) !== JSON.stringify(nextPlan.branding)) {
        nextPlan.branding = refinedBranding;
        reasons.push('branding');
        changes.push('Utvidet brandprofilen til staff, signage, packaging og interiørdetaljer.');
      }
    }

    const technicalNeedsAttention = hasAdjustmentSignal(
      evaluation,
      'technicalIntegrity',
      ['assemblyen', 'duplikater', 'behavior-ruter'],
    );
    const layoutNeedsAttention = hasAdjustmentSignal(
      evaluation,
      'imageLayoutMatch',
      ['image-layout-signaler', 'openings', 'object anchors', 'blocking'],
    );

    if (technicalNeedsAttention || layoutNeedsAttention) {
      let nextProps = refinePropsFromAnchors({
        ...nextPlan,
        props: dedupeProps(nextPlan),
      });
      nextProps = refinePropsFromLayoutZones({
        ...nextPlan,
        props: nextProps,
      }, iteration);
      const nextCharacters = nextPlan.characters.map((character) => refineCharacterBlocking(nextPlan, character, iteration));

      if (JSON.stringify(nextProps) !== JSON.stringify(nextPlan.props)) {
        nextPlan.props = nextProps;
      }
      if (JSON.stringify(nextCharacters) !== JSON.stringify(nextPlan.characters)) {
        nextPlan.characters = nextCharacters;
      }
      if (
        JSON.stringify(nextProps) !== JSON.stringify(plan.props)
        || JSON.stringify(nextCharacters) !== JSON.stringify(plan.characters)
      ) {
        reasons.push('blocking');
        changes.push('Strammet inn prop-plassering og character blocking mot gyldige soner og anchors.');
      }
    }

    if (
      iteration >= 2
      && previousReasonSet.has('roomShell')
      && hasAdjustmentSignal(
        evaluation,
        'roomRealism',
        ['arkitektoniske signaler', 'pass-through', 'backroom', 'nisjer'],
      )
      && nextPlan.roomShell.type === 'storefront'
      && !nextPlan.roomShell.ceilingStyle
    ) {
      nextPlan.roomShell = {
        ...nextPlan.roomShell,
        ceilingStyle: 'coffered',
        notes: mergeUniqueStrings([
          ...(nextPlan.roomShell.notes || []),
          'Auto-refine: coffered storefront ceiling for extra realism on later iteration.',
        ]),
      };
      reasons.push('roomShell');
      changes.push('La til tydeligere takbehandling for å få lokalet til å lese mer som et ekte sted.');
    }

    return {
      plan: nextPlan,
      changed: JSON.stringify(nextPlan) !== JSON.stringify(plan),
      reasons,
      changes,
    };
  }
}

export const environmentAutoRefineService = new EnvironmentAutoRefineService();
