import type { WallMaterial } from '../../data/wallDefinitions';
import { WALL_MATERIALS } from '../../data/wallDefinitions';
import type { FloorMaterial } from '../../data/floorDefinitions';
import { FLOOR_MATERIALS } from '../../data/floorDefinitions';
import type {
  EnvironmentPlan,
  EnvironmentPlanPropSuggestion,
} from '../models/environmentPlan';
import type {
  AssetBrainDimensions,
  AssetBrainEntry,
  AssetBrainMatch,
  AssetBrainPlacementMode,
  AssetBrainPlacementProfile,
  AssetBrainSearchQuery,
} from '../models/assetBrain';
import type { PropDefinition } from '../data/propDefinitions';
import { getAllProps, getPropById } from '../data/propDefinitions';

const EMBEDDING_DIMENSION = 192;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'background',
  'behind',
  'center',
  'centered',
  'for',
  'foreground',
  'frame',
  'in',
  'just',
  'of',
  'on',
  'or',
  'slightly',
  'the',
  'to',
  'towards',
  'with',
]);

const CANONICAL_TOKEN_MAP: Record<string, string> = {
  glasses: 'glass',
  greenery: 'plant',
  herbs: 'herb',
  magenta: 'pink',
  menu: 'menu',
  pizzeria: 'pizza',
  posters: 'poster',
  shelving: 'shelf',
  signage: 'sign',
  signs: 'sign',
  tabletop: 'table',
  vanity: 'beauty',
};

const ROOM_TYPE_TOKEN_MAP: Record<string, string[]> = {
  beauty: ['beauty', 'editorial', 'fashion', 'studio'],
  pizza: ['pizza', 'pizzeria', 'restaurant', 'food', 'kitchen'],
  neon: ['cyberpunk', 'urban', 'futuristic', 'night'],
  podium: ['product', 'beauty', 'editorial'],
  plant: ['lifestyle', 'editorial', 'interior'],
  wine: ['restaurant', 'lifestyle'],
};

const PROP_SYNONYMS_BY_ID: Record<string, string[]> = {
  beauty_table: ['beauty table', 'makeup table', 'vanity table', 'editorial workstation'],
  chair_posing: ['chair', 'posing chair', 'portrait chair'],
  counter_pizza_prep: ['counter', 'prep counter', 'pizza counter', 'kitchen island'],
  display_shelf_wall: ['display shelf', 'wall shelf', 'shelf'],
  herb_pots_cluster: ['herb pots', 'basil pots', 'small potted herbs'],
  menu_board_wall: ['menu board', 'poster', 'sign board', 'framed sign'],
  neon_sign_cyan: ['cyan neon sign', 'blue neon sign', 'neon signage'],
  neon_sign_magenta: ['magenta neon sign', 'pink neon sign', 'neon signage'],
  oven_facade_brick: ['oven facade', 'pizza oven', 'wood-fired oven'],
  pizza_hero_display: ['hero pizza', 'whole pizza', 'pizza display'],
  pizza_peel_wall: ['pizza peel', 'wooden pizza peel'],
  plant_potted: ['plant', 'potted plant', 'greenery'],
  product_podium_round: ['podium', 'pedestal', 'product podium', 'display pedestal'],
  reflective_panel: ['reflective panel', 'bounce panel', 'reflector'],
  restaurant_props_cluster: ['set dressing', 'table props', 'restaurant props'],
  stool_wooden: ['stool', 'wooden stool'],
  table_rustic: ['rustic table', 'wooden table', 'hero table', 'dining table'],
  table_small: ['small table', 'side table'],
  vase_ceramic: ['vase', 'ceramic vase'],
  wine_bottle_red: ['wine bottle', 'red bottle'],
  wine_glass_clear: ['wine glass', 'glass stemware'],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/g)
    .map((token) => CANONICAL_TOKEN_MAP[token] || token)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildCharacterNgrams(text: string): string[] {
  const collapsed = normalizeText(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!collapsed) {
    return [];
  }

  const compact = ` ${collapsed} `;
  const ngrams: string[] = [];
  for (let index = 0; index < compact.length - 2; index += 1) {
    const gram = compact.slice(index, index + 3).trim();
    if (gram.length >= 2) {
      ngrams.push(gram);
    }
  }
  return ngrams;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addFeature(vector: Float32Array, feature: string, weight: number): void {
  const hash = stableHash(feature);
  const baseIndex = hash % EMBEDDING_DIMENSION;
  const signedWeight = ((hash & 1) === 0 ? 1 : -1) * weight;
  vector[baseIndex] += signedWeight;

  const secondaryIndex = (baseIndex * 31 + 17) % EMBEDDING_DIMENSION;
  vector[secondaryIndex] += signedWeight * 0.45;
}

function normalizeVector(vector: Float32Array): Float32Array {
  let magnitude = 0;
  for (let index = 0; index < vector.length; index += 1) {
    magnitude += vector[index] * vector[index];
  }

  const divisor = Math.sqrt(magnitude);
  if (!Number.isFinite(divisor) || divisor === 0) {
    return vector;
  }

  for (let index = 0; index < vector.length; index += 1) {
    vector[index] /= divisor;
  }

  return vector;
}

function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
  }
  return dot;
}

function createEmbedding(
  text: string,
  weightedLexicon: Array<{ value: string; weight: number }>,
): Float32Array {
  const vector = new Float32Array(EMBEDDING_DIMENSION);
  const normalizedText = normalizeText(text);

  tokenize(normalizedText).forEach((token) => {
    addFeature(vector, `tok:${token}`, 1.0);
  });
  buildCharacterNgrams(normalizedText).forEach((ngram) => {
    addFeature(vector, `ng:${ngram}`, 0.22);
  });
  weightedLexicon.forEach(({ value, weight }) => {
    tokenize(value).forEach((token) => {
      addFeature(vector, `lex:${token}`, weight);
    });
    buildCharacterNgrams(value).forEach((ngram) => {
      addFeature(vector, `lex-ng:${ngram}`, weight * 0.18);
    });
  });

  return normalizeVector(vector);
}

function unique(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function collectColorStrings(...values: Array<unknown>): string[] {
  return unique(
    values
      .flatMap((value) => {
        if (typeof value === 'string') {
          return [value];
        }
        if (Array.isArray(value)) {
          return value.filter((item): item is string => typeof item === 'string');
        }
        return [];
      }),
  );
}

function createFootprintDimensions(
  raw: Partial<Record<'width' | 'height' | 'depth' | 'diameter', number>>,
): AssetBrainDimensions {
  const width = typeof raw.width === 'number' ? raw.width : undefined;
  const height = typeof raw.height === 'number' ? raw.height : undefined;
  const depth = typeof raw.depth === 'number' ? raw.depth : undefined;
  const diameter = typeof raw.diameter === 'number' ? raw.diameter : undefined;
  const footprintWidth = width ?? diameter ?? 0.8;
  const footprintDepth = depth ?? diameter ?? 0.8;

  return {
    width,
    height,
    depth,
    diameter,
    footprintWidth,
    footprintDepth,
  };
}

function inferRoomTypes(tokens: string[], tags: string[]): string[] {
  const combined = new Set<string>([...tokens, ...tags]);
  const roomTypes = new Set<string>();

  combined.forEach((token) => {
    (ROOM_TYPE_TOKEN_MAP[token] || []).forEach((roomType) => {
      roomTypes.add(roomType);
    });
  });

  return Array.from(roomTypes);
}

function inferStyles(tokens: string[], tags: string[]): string[] {
  const candidates = [
    'beauty',
    'clean',
    'classic',
    'cyberpunk',
    'dramatic',
    'editorial',
    'industrial',
    'luxury',
    'modern',
    'moody',
    'neon',
    'rustic',
    'studio',
    'urban',
    'warm',
  ];

  const lookup = new Set<string>([...tokens, ...tags]);
  return candidates.filter((candidate) => lookup.has(candidate));
}

function inferPlacementProfile(prop: PropDefinition): AssetBrainPlacementProfile {
  const metadata = (prop.metadata || {}) as Record<string, unknown>;
  const primitive = typeof metadata.primitive === 'string' ? metadata.primitive : '';
  const explicitPlacement = typeof metadata.placementMode === 'string'
    ? metadata.placementMode
    : null;

  let defaultPlacementMode: AssetBrainPlacementMode = 'ground';
  if (explicitPlacement === 'wall' || explicitPlacement === 'surface') {
    defaultPlacementMode = explicitPlacement;
  } else if (['menu-board', 'neon-sign', 'display-shelf', 'pizza-peel'].includes(primitive)) {
    defaultPlacementMode = 'wall';
  }

  const anchorRole = ['table-small', 'rustic-table', 'counter', 'beauty-table'].includes(primitive)
    || metadata.surfaceAnchor === 'table'
    ? 'surface_anchor'
    : defaultPlacementMode === 'wall'
      ? 'wall_display'
      : 'none';

  const inferredAnchorType = primitive === 'counter'
    ? 'counter'
    : primitive === 'display-shelf'
      ? 'shelf'
      : anchorRole === 'surface_anchor'
        ? 'table'
        : undefined;

  const surfaceAnchorTypes = unique([
    inferredAnchorType,
    typeof metadata.surfaceHint === 'string' ? metadata.surfaceHint : undefined,
    typeof metadata.surfaceAnchor === 'string' ? metadata.surfaceAnchor : undefined,
    anchorRole === 'surface_anchor' ? 'table' : undefined,
  ]);

  const dimensions = createFootprintDimensions({
    width: typeof metadata.width === 'number' ? metadata.width : undefined,
    height: typeof metadata.height === 'number' ? metadata.height : undefined,
    depth: typeof metadata.depth === 'number' ? metadata.depth : undefined,
    diameter: typeof metadata.diameter === 'number' ? metadata.diameter : undefined,
  });

  const minClearance = Math.max(
    0.18,
    Math.min(0.6, Math.max(dimensions.footprintWidth, dimensions.footprintDepth) * 0.2),
  );

  const wallYOffset = defaultPlacementMode === 'wall'
    ? Math.max(1.35, (dimensions.height ?? 0.6) * 0.75 + 1.0)
    : 0;

  return {
    defaultPlacementMode,
    supportedModes: [defaultPlacementMode],
    surfaceAnchorTypes,
    anchorRole,
    minClearance,
    wallYOffset,
    dimensions,
  };
}

function buildPropEntry(prop: PropDefinition): AssetBrainEntry {
  const metadata = (prop.metadata || {}) as Record<string, unknown>;
  const description = [prop.name, prop.description, prop.id, metadata.primitive]
    .filter((value) => typeof value === 'string')
    .join(' ');
  const baseTokens = tokenize(description);
  const synonyms = PROP_SYNONYMS_BY_ID[prop.id] || [];
  const synonymTokens = synonyms.flatMap((synonym) => tokenize(synonym));
  const tags = unique([
    ...baseTokens,
    ...synonymTokens,
    prop.category,
    prop.size,
    prop.complexity,
    typeof metadata.surfaceHint === 'string' ? metadata.surfaceHint : undefined,
    typeof metadata.surfaceAnchor === 'string' ? metadata.surfaceAnchor : undefined,
  ]);
  const roomTypes = inferRoomTypes(baseTokens, tags);
  const styles = inferStyles(baseTokens, tags);
  const moods = unique([
    ...styles,
    roomTypes.includes('cyberpunk') ? 'night' : undefined,
    roomTypes.includes('restaurant') ? 'warm' : undefined,
  ]);

  return {
    id: prop.id,
    assetType: 'prop',
    name: prop.name,
    category: prop.category,
    searchText: description,
    tokens: unique(baseTokens),
    keywords: tags,
    synonyms,
    tags,
    moods,
    styles,
    roomTypes,
    colors: collectColorStrings(
      metadata.color,
      metadata.accentColor,
      metadata.emissiveColor,
    ),
    placementProfile: inferPlacementProfile(prop),
    metadata,
  };
}

function buildWallEntry(wall: WallMaterial): AssetBrainEntry {
  const tokens = tokenize([wall.name, wall.nameNo, wall.id, wall.category, ...wall.tags, ...(wall.moodTags || [])].join(' '));
  const tags = unique([...tokens, ...wall.tags, ...(wall.moodTags || [])]);

  return {
    id: wall.id,
    assetType: 'wall',
    name: wall.nameNo || wall.name,
    category: wall.category,
    searchText: [wall.name, wall.nameNo, wall.id, wall.category, ...wall.tags, ...(wall.moodTags || [])].join(' '),
    tokens,
    keywords: tags,
    synonyms: [],
    tags,
    moods: wall.moodTags || [],
    styles: inferStyles(tokens, tags),
    roomTypes: inferRoomTypes(tokens, tags),
    colors: collectColorStrings(wall.color, wall.gradientColors, wall.emissive),
    placementProfile: null,
    metadata: {
      category: wall.category,
      tags: wall.tags,
      moodTags: wall.moodTags,
    },
  };
}

function buildFloorEntry(floor: FloorMaterial): AssetBrainEntry {
  const tokens = tokenize([floor.name, floor.nameNo, floor.id, floor.category, ...floor.tags, ...(floor.moodTags || [])].join(' '));
  const tags = unique([...tokens, ...floor.tags, ...(floor.moodTags || [])]);

  return {
    id: floor.id,
    assetType: 'floor',
    name: floor.nameNo || floor.name,
    category: floor.category,
    searchText: [floor.name, floor.nameNo, floor.id, floor.category, ...floor.tags, ...(floor.moodTags || [])].join(' '),
    tokens,
    keywords: tags,
    synonyms: [],
    tags,
    moods: floor.moodTags || [],
    styles: inferStyles(tokens, tags),
    roomTypes: inferRoomTypes(tokens, tags),
    colors: collectColorStrings(floor.color, floor.emissive),
    placementProfile: null,
    metadata: {
      category: floor.category,
      tags: floor.tags,
      moodTags: floor.moodTags,
    },
  };
}

class AssetBrainService {
  private readonly entries: AssetBrainEntry[];
  private readonly entriesById: Map<string, AssetBrainEntry>;
  private readonly embeddingsById: Map<string, Float32Array>;

  constructor() {
    this.entries = [
      ...getAllProps().map((prop) => buildPropEntry(prop)),
      ...WALL_MATERIALS.map((wall) => buildWallEntry(wall)),
      ...FLOOR_MATERIALS.map((floor) => buildFloorEntry(floor)),
    ];
    this.entriesById = new Map(this.entries.map((entry) => [entry.id, entry]));
    this.embeddingsById = new Map(
      this.entries.map((entry) => [
        entry.id,
        createEmbedding(entry.searchText, [
          ...entry.synonyms.map((value) => ({ value, weight: 1.2 })),
          ...entry.tags.map((value) => ({ value, weight: 0.9 })),
          ...entry.roomTypes.map((value) => ({ value, weight: 0.7 })),
          ...entry.styles.map((value) => ({ value, weight: 0.65 })),
          ...entry.moods.map((value) => ({ value, weight: 0.55 })),
          ...entry.colors.map((value) => ({ value, weight: 0.3 })),
        ]),
      ]),
    );
  }

  getEntryById(id: string): AssetBrainEntry | undefined {
    return this.entriesById.get(id);
  }

  getPlacementProfile(assetId: string): AssetBrainPlacementProfile | null {
    return this.entriesById.get(assetId)?.placementProfile ?? null;
  }

  getAllEntries(assetType?: AssetBrainEntry['assetType']): AssetBrainEntry[] {
    if (!assetType) {
      return [...this.entries];
    }

    return this.entries.filter((entry) => entry.assetType === assetType);
  }

  search(query: AssetBrainSearchQuery): AssetBrainMatch[] {
    const primaryTokens = tokenize(query.text);
    const placementTokens = tokenize(query.placementHint || '');
    const contextTokens = tokenize(query.contextText || '');
    const queryEmbedding = createEmbedding(
      [query.text, query.placementHint || '', query.contextText || ''].filter(Boolean).join(' '),
      [
        ...(query.preferredRoomTypes || []).map((value) => ({ value, weight: 0.8 })),
        ...(query.preferredPlacementMode ? [{ value: query.preferredPlacementMode, weight: 0.75 }] : []),
        ...(query.surfaceAnchor ? [{ value: query.surfaceAnchor, weight: 0.8 }] : []),
      ],
    );
    const roomTypeTokens = unique([
      ...(query.preferredRoomTypes || []),
      ...contextTokens.filter((token) => token.length > 2),
    ]);

    const matches = this.entries
      .filter((entry) => !query.assetTypes || query.assetTypes.includes(entry.assetType))
      .map((entry) => this.scoreEntry(entry, primaryTokens, placementTokens, contextTokens, roomTypeTokens, query, queryEmbedding))
      .filter((match): match is AssetBrainMatch => Boolean(match))
      .filter((match) => match.score >= (query.minScore ?? 1.2))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return left.entry.name.localeCompare(right.entry.name);
      });

    return matches.slice(0, query.limit ?? 5);
  }

  matchEnvironmentPropSuggestion(
    suggestion: EnvironmentPlanPropSuggestion,
    plan: EnvironmentPlan,
    options: {
      limit?: number;
      minScore?: number;
    } = {},
  ): AssetBrainMatch[] {
    const preferredPlacementMode = this.inferPreferredPlacementMode(suggestion);
    const surfaceAnchor = this.inferSurfaceAnchor(suggestion);
    const preferredRoomTypes = inferRoomTypes(
      tokenize([plan.prompt, plan.summary, plan.concept].filter(Boolean).join(' ')),
      [],
    );

    return this.search({
      text: [suggestion.name, suggestion.description].filter(Boolean).join(' '),
      placementHint: suggestion.placementHint,
      categoryHint: suggestion.category,
      contextText: [plan.prompt, plan.summary, plan.concept, plan.recommendedPresetId].filter(Boolean).join(' '),
      assetTypes: ['prop'],
      preferredPlacementMode,
      preferredRoomTypes,
      surfaceAnchor,
      limit: options.limit ?? 3,
      minScore: options.minScore ?? 2.2,
    });
  }

  private inferPreferredPlacementMode(
    suggestion: EnvironmentPlanPropSuggestion,
  ): AssetBrainPlacementMode | undefined {
    const hint = normalizeText(`${suggestion.name} ${suggestion.placementHint || ''}`);
    if (hint.includes('wall') || hint.includes('shelf')) {
      return 'wall';
    }
    if (
      hint.includes('table')
      || hint.includes('surface')
      || hint.includes('counter')
      || hint.includes('podium')
    ) {
      return 'surface';
    }
    return undefined;
  }

  private inferSurfaceAnchor(suggestion: EnvironmentPlanPropSuggestion): string | undefined {
    const hint = normalizeText(`${suggestion.name} ${suggestion.placementHint || ''}`);
    if (hint.includes('table')) {
      return 'table';
    }
    if (hint.includes('counter')) {
      return 'counter';
    }
    if (hint.includes('shelf')) {
      return 'shelf';
    }
    return undefined;
  }

  private scoreEntry(
    entry: AssetBrainEntry,
    primaryTokens: string[],
    placementTokens: string[],
    contextTokens: string[],
    roomTypeTokens: string[],
    query: AssetBrainSearchQuery,
    queryEmbedding: Float32Array,
  ): AssetBrainMatch | null {
    let score = 0;
    const reasons: string[] = [];
    const matchedTokens = new Set<string>();
    const normalizedQuery = normalizeText(query.text);
    const normalizedName = normalizeText(entry.name);
    const searchableKeywords = unique([...entry.keywords, ...entry.synonyms.flatMap((value) => tokenize(value))]);
    const queryTokens = unique([...primaryTokens, ...placementTokens, ...contextTokens]);
    const embedding = this.embeddingsById.get(entry.id);

    if (normalizedQuery.includes(normalizedName) || normalizedName.includes(normalizedQuery)) {
      score += 7;
      reasons.push('navnefrase');
    }

    const primaryMatches = primaryTokens.filter((token) => entry.tokens.includes(token));
    if (primaryMatches.length > 0) {
      score += primaryMatches.length * 2.8;
      primaryMatches.forEach((token) => matchedTokens.add(token));
      reasons.push(`kjerneord: ${primaryMatches.join(', ')}`);
    }

    const keywordMatches = queryTokens.filter((token) => searchableKeywords.includes(token));
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 1.35;
      keywordMatches.forEach((token) => matchedTokens.add(token));
      reasons.push(`tags: ${keywordMatches.join(', ')}`);
    }

    const roomMatches = roomTypeTokens.filter((token) => entry.roomTypes.includes(token));
    if (roomMatches.length > 0) {
      score += roomMatches.length * 0.9;
      reasons.push(`romtype: ${roomMatches.join(', ')}`);
    }

    const styleMatches = contextTokens.filter((token) => entry.styles.includes(token) || entry.moods.includes(token));
    if (styleMatches.length > 0) {
      score += styleMatches.length * 0.55;
      reasons.push(`stil: ${styleMatches.join(', ')}`);
    }

    if (embedding) {
      const vectorSimilarity = cosineSimilarity(queryEmbedding, embedding);
      if (vectorSimilarity > 0.08) {
        score += vectorSimilarity * 5.5;
        reasons.push(`vektor: ${vectorSimilarity.toFixed(2)}`);
      }
    }

    if (query.preferredPlacementMode && entry.placementProfile) {
      if (entry.placementProfile.supportedModes.includes(query.preferredPlacementMode)) {
        score += 2.6;
        reasons.push(`plassering: ${query.preferredPlacementMode}`);
      } else {
        score -= 2.4;
      }
    }

    if (query.surfaceAnchor && entry.placementProfile?.surfaceAnchorTypes.includes(query.surfaceAnchor)) {
      score += 1.8;
      reasons.push(`anker: ${query.surfaceAnchor}`);
    }

    if (query.categoryHint === 'hero') {
      if (entry.tags.includes('hero') || entry.name.toLowerCase().includes('hero')) {
        score += 1.5;
      }
      if (entry.placementProfile?.anchorRole === 'surface_anchor') {
        score -= 0.6;
      }
    }

    if (query.categoryHint === 'set_dressing' && entry.placementProfile?.anchorRole === 'surface_anchor') {
      score -= 0.3;
    }

    if (entry.assetType === 'prop' && entry.placementProfile?.defaultPlacementMode === 'surface' && !query.preferredPlacementMode) {
      score += 0.2;
    }

    if (score <= 0) {
      return null;
    }

    return {
      entry,
      score: Number(score.toFixed(3)),
      reasons,
      matchedTokens: Array.from(matchedTokens),
    };
  }
}

export const assetBrainService = new AssetBrainService();

export function getAssetBrainPlacementProfile(
  assetId: string,
): AssetBrainPlacementProfile | null {
  return assetBrainService.getPlacementProfile(assetId);
}

export function getAssetBrainPropDefinition(assetId: string): PropDefinition | undefined {
  return getPropById(assetId);
}
