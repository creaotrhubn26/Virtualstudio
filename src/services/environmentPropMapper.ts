import type {
  EnvironmentPlan,
  EnvironmentPlanPropSuggestion,
} from '../core/models/environmentPlan';
import { assetBrainService } from '../core/services/assetBrain';

export interface EnvironmentRuntimePropRequest {
  assetId: string;
  name: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  placementHint?: string;
  metadata?: Record<string, unknown>;
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function pushUnique(
  target: EnvironmentRuntimePropRequest[],
  seen: Set<string>,
  request: EnvironmentRuntimePropRequest,
): void {
  const key = `${request.assetId}:${request.placementHint ?? ''}:${request.name}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(request);
}

function createRequest(
  assetId: string,
  suggestion: EnvironmentPlanPropSuggestion,
  metadata?: Record<string, unknown>,
): EnvironmentRuntimePropRequest {
  return {
    assetId,
    name: suggestion.name,
    description: suggestion.description,
    priority: suggestion.priority,
    placementHint: suggestion.placementHint,
    metadata,
  };
}

function createAssetBrainRequest(
  assetId: string,
  suggestion: EnvironmentPlanPropSuggestion,
): EnvironmentRuntimePropRequest {
  const profile = assetBrainService.getPlacementProfile(assetId);

  return createRequest(assetId, suggestion, {
    placementMode: profile?.defaultPlacementMode,
    surfaceHint: profile?.surfaceAnchorTypes[0],
    assetBrainDimensions: profile?.dimensions,
    assetBrainAnchorRole: profile?.anchorRole,
    assetBrainMinClearance: profile?.minClearance,
    assetBrainWallYOffset: profile?.wallYOffset,
  });
}

function buildAssetBrainRequests(
  suggestion: EnvironmentPlanPropSuggestion,
  plan: EnvironmentPlan,
): EnvironmentRuntimePropRequest[] {
  const matches = assetBrainService.matchEnvironmentPropSuggestion(suggestion, plan, {
    limit: 2,
  });

  if (matches.length === 0) {
    return [];
  }

  if (matches.length === 1) {
    return [createAssetBrainRequest(matches[0].entry.id, suggestion)];
  }

  const topScore = matches[0].score;
  return matches
    .filter((match, index) => index === 0 || topScore - match.score <= 0.55)
    .map((match) => createAssetBrainRequest(match.entry.id, suggestion));
}

function mapSuggestionToRequests(
  suggestion: EnvironmentPlanPropSuggestion,
  plan: EnvironmentPlan,
): EnvironmentRuntimePropRequest[] {
  const requests: EnvironmentRuntimePropRequest[] = [];
  const primaryText = [
    suggestion.name,
    suggestion.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const placementText = (suggestion.placementHint || '').toLowerCase();
  const suggestionText = `${primaryText} ${placementText}`;
  const contextText = [
    plan.concept,
    plan.prompt,
    plan.summary,
    plan.recommendedPresetId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const isPizzaContext = includesAny(contextText, ['pizza', 'pizzeria', 'restaurant', 'food', 'kitchen']);

  if (includesAny(primaryText, ['freshly baked pizza', 'hero pizza', 'whole pizza', 'pizza'])) {
    requests.push(createRequest('pizza_hero_display', suggestion, {
      placementMode: 'surface',
      surfaceHint: 'table',
    }));
  }

  if (includesAny(primaryText, ['rustic wooden table', 'wooden table', 'rustic table', 'hero table'])) {
    requests.push(createRequest('table_rustic', suggestion));
  }

  if (includesAny(primaryText, ['wine bottle'])) {
    requests.push(createRequest('wine_bottle_red', suggestion, {
      placementMode: 'surface',
      surfaceHint: 'table',
    }));
  }

  if (includesAny(primaryText, ['wine glass', 'wine glasses', 'glasses'])) {
    requests.push(createRequest('wine_glass_clear', suggestion, {
      placementMode: 'surface',
      surfaceHint: 'table',
    }));
  }

  if (includesAny(primaryText, ['pizza peel'])) {
    requests.push(createRequest('pizza_peel_wall', suggestion, { placementMode: 'wall' }));
  }

  if (includesAny(primaryText, ['herb pots', 'herb pot', 'italian herb', 'basil', 'basil plant'])) {
    requests.push(createRequest('herb_pots_cluster', suggestion, {
      placementMode: 'surface',
      surfaceHint: 'table',
    }));
  }

  if (includesAny(primaryText, ['poster', 'framed vintage italian poster', 'vintage italian poster'])) {
    requests.push(createRequest('menu_board_wall', suggestion, { placementMode: 'wall' }));
  }

  if (includesAny(primaryText, ['tablecloth'])) {
    requests.push(createRequest('restaurant_props_cluster', suggestion, {
      placementMode: 'surface',
      surfaceHint: 'table',
    }));
  }

  if (includesAny(primaryText, ['pizza prep', 'prep counter', 'counter'])) {
    requests.push(createRequest('counter_pizza_prep', suggestion));
  }

  if (includesAny(primaryText, ['wood-fired oven', 'oven facade', 'oven'])) {
    requests.push(createRequest('oven_facade_brick', suggestion));
  }

  if (includesAny(primaryText, ['menu board', 'menu', 'signage menu'])) {
    requests.push(createRequest('menu_board_wall', suggestion, { placementMode: 'wall' }));
  }

  if (includesAny(primaryText, ['olive oil', 'restaurant cues', 'set dressing', 'table-top props'])) {
    requests.push(createRequest('restaurant_props_cluster', suggestion, {
      placementMode: isPizzaContext ? 'surface' : undefined,
      surfaceHint: isPizzaContext ? 'table' : undefined,
    }));
  }

  if (includesAny(primaryText, ['beauty table', 'makeup table', 'vanity'])) {
    requests.push(createRequest('beauty_table', suggestion));
  }

  if (includesAny(primaryText, ['reflective panel', 'reflector', 'soft reflections', 'bounce panel'])) {
    requests.push(createRequest('reflective_panel', suggestion));
  }

  if (includesAny(primaryText, ['podium', 'pedestal', 'product stage', 'product podium'])) {
    requests.push(createRequest('product_podium_round', suggestion));
  }

  const isMagentaNeon = includesAny(primaryText, ['magenta signage', 'magenta neon', 'pink neon', 'burgundy accent']);
  const isCyanNeon = includesAny(primaryText, ['cyan signage', 'cyan neon']);
  const isGenericNeon = includesAny(primaryText, ['neon sign', 'signage']);

  if (isMagentaNeon) {
    requests.push(createRequest('neon_sign_magenta', suggestion, { placementMode: 'wall' }));
  } else if (isCyanNeon || isGenericNeon) {
    requests.push(createRequest('neon_sign_cyan', suggestion, { placementMode: 'wall' }));
  }

  if (includesAny(primaryText, ['shelf', 'shelves', 'display shelf'])) {
    requests.push(createRequest('display_shelf_wall', suggestion, { placementMode: 'wall' }));
  }

  if (
    includesAny(primaryText, ['plant', 'greenery', 'potted'])
    && !includesAny(primaryText, ['basil', 'herb'])
  ) {
    requests.push(createRequest('plant_potted', suggestion));
  }

  if (includesAny(primaryText, ['chair', 'posing chair'])) {
    requests.push(createRequest('chair_posing', suggestion));
  }

  if (includesAny(primaryText, ['stool', 'krakk'])) {
    requests.push(createRequest('stool_wooden', suggestion));
  }

  if (requests.length > 0) {
    return requests;
  }

  const assetBrainRequests = buildAssetBrainRequests(suggestion, plan);
  if (assetBrainRequests.length > 0) {
    return assetBrainRequests;
  }

  if (isPizzaContext) {
    if (suggestion.category === 'hero') {
      return [createRequest('pizza_hero_display', suggestion, {
        placementMode: 'surface',
        surfaceHint: 'table',
      })];
    }

    if (suggestion.category === 'set_dressing') {
      return [createRequest('restaurant_props_cluster', suggestion, {
        placementMode: 'surface',
        surfaceHint: 'table',
      })];
    }
  }

  if (suggestion.category === 'hero') {
    return [createRequest('product_podium_round', suggestion)];
  }

  if (suggestion.category === 'set_dressing') {
    return [createRequest('restaurant_props_cluster', suggestion)];
  }

  return [createRequest('table_small', suggestion)];
}

function buildFallbackRequests(plan: EnvironmentPlan): EnvironmentRuntimePropRequest[] {
  const text = [
    plan.prompt,
    plan.concept,
    plan.summary,
    plan.recommendedPresetId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const fallbackSuggestion = (
    name: string,
    priority: 'high' | 'medium' | 'low',
    placementHint: string,
  ): EnvironmentPlanPropSuggestion => ({
    name,
    category: priority === 'high' ? 'hero' : 'supporting',
    priority,
    placementHint,
  });

  if (includesAny(text, ['pizza', 'pizzeria', 'restaurant', 'food', 'kitchen'])) {
    return [
      createRequest('table_rustic', fallbackSuggestion('Rustic wooden table', 'high', 'Center foreground')),
      createRequest('pizza_hero_display', fallbackSuggestion('Freshly baked pizza', 'high', 'On the rustic wooden table'), {
        placementMode: 'surface',
        surfaceHint: 'table',
      }),
      createRequest('wine_bottle_red', fallbackSuggestion('Wine bottle', 'medium', 'On the table, next to the pizza'), {
        placementMode: 'surface',
        surfaceHint: 'table',
      }),
      createRequest('wine_glass_clear', fallbackSuggestion('Wine glass', 'medium', 'On the table, next to the wine bottle'), {
        placementMode: 'surface',
        surfaceHint: 'table',
      }),
      createRequest('pizza_peel_wall', fallbackSuggestion('Pizza peel', 'medium', 'Leaning against the back wall'), { placementMode: 'wall' }),
      createRequest('herb_pots_cluster', fallbackSuggestion('Italian herb pots', 'medium', 'On the table or a nearby shelf'), {
        placementMode: 'surface',
        surfaceHint: 'table',
      }),
      createRequest('menu_board_wall', fallbackSuggestion('Menu board', 'medium', 'Side wall'), { placementMode: 'wall' }),
    ];
  }

  if (includesAny(text, ['blade runner', 'cyberpunk', 'neon', 'futuristic'])) {
    return [
      createRequest('product_podium_round', fallbackSuggestion('Product podium', 'high', 'Center foreground')),
      createRequest('neon_sign_cyan', fallbackSuggestion('Cyan neon sign', 'medium', 'Left wall'), { placementMode: 'wall' }),
      createRequest('neon_sign_magenta', fallbackSuggestion('Magenta neon sign', 'medium', 'Right wall'), { placementMode: 'wall' }),
    ];
  }

  if (includesAny(text, ['beauty', 'editorial', 'luxury', 'fashion'])) {
    return [
      createRequest('beauty_table', fallbackSuggestion('Beauty table', 'high', 'Center foreground')),
      createRequest('reflective_panel', fallbackSuggestion('Reflective panel', 'medium', 'Right side')),
    ];
  }

  return [];
}

export function buildEnvironmentRuntimeProps(plan: EnvironmentPlan): EnvironmentRuntimePropRequest[] {
  const requests: EnvironmentRuntimePropRequest[] = [];
  const seen = new Set<string>();

  plan.props.forEach((suggestion) => {
    mapSuggestionToRequests(suggestion, plan).forEach((request) => {
      pushUnique(requests, seen, request);
    });
  });

  if (requests.length === 0) {
    buildFallbackRequests(plan).forEach((request) => {
      pushUnique(requests, seen, request);
    });
  }

  const anchorAssets = new Set(
    assetBrainService
      .getAllEntries('prop')
      .filter((entry) => entry.placementProfile?.anchorRole === 'surface_anchor')
      .map((entry) => entry.id),
  );

  const placementRank = (request: EnvironmentRuntimePropRequest): number => {
    const placementMode = (request.metadata?.placementMode as string | undefined)
      || assetBrainService.getPlacementProfile(request.assetId)?.defaultPlacementMode
      || 'ground';
    if (anchorAssets.has(request.assetId)) return 0;
    if (placementMode === 'ground') return 1;
    if (placementMode === 'wall') return 2;
    if (placementMode === 'surface') return 3;
    return 4;
  };

  return requests
    .sort((left, right) => placementRank(left) - placementRank(right))
    .slice(0, 8);
}
