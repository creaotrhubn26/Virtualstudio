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
  AssetBrainFeedbackSignal,
  AssetBrainMatch,
  AssetBrainPlacementMode,
  AssetBrainPlacementProfile,
  AssetBrainRelatedAssetMatch,
  AssetBrainRelatedAssetQuery,
  AssetBrainRelationship,
  AssetBrainRelationshipType,
  AssetBrainSearchQuery,
  AssetBrainUsageSignal,
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

const ASSET_BRAIN_MEMORY_STORAGE_KEY = 'virtualstudio.asset-brain-memory.v1';

interface AssetBrainRelationshipSeed {
  sourceAssetId: string;
  targetAssetId: string;
  type: AssetBrainRelationshipType;
  strength: number;
  reasons: string[];
}

interface AssetBrainMemoryPayload {
  version: 1;
  usageCounts: Record<string, number>;
  contextCounts: Record<string, number>;
  coOccurrenceCounts: Record<string, number>;
  rejectionCounts: Record<string, number>;
  rejectionContextCounts: Record<string, number>;
}

const EXPLICIT_RELATIONSHIP_SEEDS: AssetBrainRelationshipSeed[] = [
  {
    sourceAssetId: 'pizza_hero_display',
    targetAssetId: 'table_rustic',
    type: 'supported_by',
    strength: 0.98,
    reasons: ['hero pizza needs a primary tabletop anchor'],
  },
  {
    sourceAssetId: 'wine_bottle_red',
    targetAssetId: 'table_rustic',
    type: 'supported_by',
    strength: 0.88,
    reasons: ['wine bottle is staged on the rustic dining table'],
  },
  {
    sourceAssetId: 'wine_glass_clear',
    targetAssetId: 'table_rustic',
    type: 'supported_by',
    strength: 0.86,
    reasons: ['wine glass is staged on the rustic dining table'],
  },
  {
    sourceAssetId: 'herb_pots_cluster',
    targetAssetId: 'table_rustic',
    type: 'supported_by',
    strength: 0.82,
    reasons: ['herb cluster belongs on the main restaurant table'],
  },
  {
    sourceAssetId: 'restaurant_props_cluster',
    targetAssetId: 'table_rustic',
    type: 'supported_by',
    strength: 0.76,
    reasons: ['restaurant dressing cues sit best on the anchor table'],
  },
  {
    sourceAssetId: 'wine_bottle_red',
    targetAssetId: 'wine_glass_clear',
    type: 'paired_with',
    strength: 0.9,
    reasons: ['wine bottle is commonly dressed with a matching glass'],
  },
  {
    sourceAssetId: 'beauty_table',
    targetAssetId: 'reflective_panel',
    type: 'styled_with',
    strength: 0.78,
    reasons: ['beauty sets benefit from reflective fill surfaces'],
  },
  {
    sourceAssetId: 'product_podium_round',
    targetAssetId: 'reflective_panel',
    type: 'styled_with',
    strength: 0.7,
    reasons: ['hero podium shots often use reflective shaping nearby'],
  },
  {
    sourceAssetId: 'display_shelf_wall',
    targetAssetId: 'neon_sign_cyan',
    type: 'styled_with',
    strength: 0.72,
    reasons: ['display shelves and cyan signage reinforce cyberpunk layering'],
  },
  {
    sourceAssetId: 'display_shelf_wall',
    targetAssetId: 'neon_sign_magenta',
    type: 'styled_with',
    strength: 0.72,
    reasons: ['display shelves and magenta signage reinforce cyberpunk layering'],
  },
];

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

function createCoOccurrenceKey(leftAssetId: string, rightAssetId: string): string {
  return [leftAssetId, rightAssetId].sort().join('::');
}

function createContextKey(assetId: string, contextType: 'room' | 'style', contextValue: string): string {
  return `${assetId}::${contextType}::${contextValue}`;
}

class AssetBrainService {
  private readonly entries: AssetBrainEntry[];
  private readonly entriesById: Map<string, AssetBrainEntry>;
  private readonly embeddingsById: Map<string, Float32Array>;
  private readonly relationships: AssetBrainRelationship[] = [];
  private readonly outgoingRelationshipsById: Map<string, AssetBrainRelationship[]> = new Map();
  private readonly incomingRelationshipsById: Map<string, AssetBrainRelationship[]> = new Map();
  private readonly usageCounts: Map<string, number> = new Map();
  private readonly contextCounts: Map<string, number> = new Map();
  private readonly coOccurrenceCounts: Map<string, number> = new Map();
  private readonly rejectionCounts: Map<string, number> = new Map();
  private readonly rejectionContextCounts: Map<string, number> = new Map();

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
    this.buildRelationships();
    this.loadMemory();
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

  inferPlanContext(plan: Pick<EnvironmentPlan, 'prompt' | 'summary' | 'concept'>): {
    roomTypes: string[];
    styles: string[];
  } {
    const tokens = tokenize([plan.prompt, plan.summary, plan.concept].filter(Boolean).join(' '));
    return {
      roomTypes: inferRoomTypes(tokens, []),
      styles: inferStyles(tokens, []),
    };
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

  getUsageCount(assetId: string): number {
    return this.usageCounts.get(assetId) || 0;
  }

  resetLearnedSignals(): void {
    this.usageCounts.clear();
    this.contextCounts.clear();
    this.coOccurrenceCounts.clear();
    this.rejectionCounts.clear();
    this.rejectionContextCounts.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ASSET_BRAIN_MEMORY_STORAGE_KEY);
    }
  }

  recordUsage(signal: AssetBrainUsageSignal): void {
    const assetIds = unique(signal.assetIds).filter((assetId) => this.entriesById.has(assetId));
    if (assetIds.length === 0) {
      return;
    }

    const promptTokens = tokenize(signal.prompt || '');
    const roomTypes = unique([
      ...(signal.roomTypes || []),
      ...inferRoomTypes(promptTokens, []),
    ]);
    const styles = unique([
      ...(signal.styles || []),
      ...inferStyles(promptTokens, []),
    ]);

    assetIds.forEach((assetId) => {
      this.usageCounts.set(assetId, (this.usageCounts.get(assetId) || 0) + 1);

      roomTypes.forEach((roomType) => {
        const key = createContextKey(assetId, 'room', roomType);
        this.contextCounts.set(key, (this.contextCounts.get(key) || 0) + 1);
      });

      styles.forEach((style) => {
        const key = createContextKey(assetId, 'style', style);
        this.contextCounts.set(key, (this.contextCounts.get(key) || 0) + 1);
      });
    });

    for (let leftIndex = 0; leftIndex < assetIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < assetIds.length; rightIndex += 1) {
        const pairKey = createCoOccurrenceKey(assetIds[leftIndex], assetIds[rightIndex]);
        this.coOccurrenceCounts.set(pairKey, (this.coOccurrenceCounts.get(pairKey) || 0) + 1);
      }
    }

    this.persistMemory();
  }

  recordRejection(signal: AssetBrainFeedbackSignal): void {
    if (!this.entriesById.has(signal.assetId)) {
      return;
    }

    this.rejectionCounts.set(signal.assetId, (this.rejectionCounts.get(signal.assetId) || 0) + 1);

    const promptTokens = tokenize(signal.prompt || '');
    const roomTypes = unique([
      ...(signal.roomTypes || []),
      ...inferRoomTypes(promptTokens, []),
    ]);
    const styles = unique([
      ...(signal.styles || []),
      ...inferStyles(promptTokens, []),
    ]);

    roomTypes.forEach((roomType) => {
      const key = createContextKey(signal.assetId, 'room', roomType);
      this.rejectionContextCounts.set(key, (this.rejectionContextCounts.get(key) || 0) + 1);
    });

    styles.forEach((style) => {
      const key = createContextKey(signal.assetId, 'style', style);
      this.rejectionContextCounts.set(key, (this.rejectionContextCounts.get(key) || 0) + 1);
    });

    this.persistMemory();
  }

  getRelatedAssets(query: AssetBrainRelatedAssetQuery): AssetBrainRelatedAssetMatch[] {
    const sourceEntry = this.entriesById.get(query.assetId);
    if (!sourceEntry) {
      return [];
    }

    const preferredRoomTypes = unique([
      ...(query.preferredRoomTypes || []),
      ...sourceEntry.roomTypes,
    ]);

    const matches = this.entries
      .filter((entry) => entry.id !== query.assetId)
      .filter((entry) => !query.assetTypes || query.assetTypes.includes(entry.assetType))
      .map((entry) => {
        const relationshipSignal = this.collectRelationshipSignal(query.assetId, entry.id, {
          relationTypes: query.relationTypes,
          direction: query.direction,
          preferredRoomTypes,
        });

        if (relationshipSignal.score <= 0) {
          return null;
        }

        let score = relationshipSignal.score;
        const reasons = [...relationshipSignal.reasons];
        const sharedRoomTypes = entry.roomTypes.filter((roomType) => preferredRoomTypes.includes(roomType));
        if (sharedRoomTypes.length > 0) {
          score += sharedRoomTypes.length * 0.32;
          reasons.push(`deler romtype: ${sharedRoomTypes.join(', ')}`);
        }

        const rejectionPenalty = this.getRejectionPenalty(entry.id, preferredRoomTypes);
        if (rejectionPenalty > 0) {
          score -= rejectionPenalty;
          reasons.push(`fravalgt: -${rejectionPenalty.toFixed(2)}`);
        }

        if (score <= 0) {
          return null;
        }

        return {
          entry,
          score: Number(score.toFixed(3)),
          relationshipTypes: relationshipSignal.relationshipTypes,
          reasons: reasons.slice(0, 4),
        } satisfies AssetBrainRelatedAssetMatch;
      })
      .filter((match): match is AssetBrainRelatedAssetMatch => Boolean(match))
      .filter((match) => match.score >= (query.minScore ?? 0.55))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return left.entry.name.localeCompare(right.entry.name);
      });

    return matches.slice(0, query.limit ?? 5);
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

    const usageBoost = this.getUsageBoost(entry.id);
    if (usageBoost > 0) {
      score += usageBoost;
      reasons.push(`bruk: ${usageBoost.toFixed(2)}`);
    }

    const contextUsageBoost = this.getContextUsageBoost(entry.id, roomTypeTokens);
    if (contextUsageBoost > 0) {
      score += contextUsageBoost;
      reasons.push(`scene-læring: ${contextUsageBoost.toFixed(2)}`);
    }

    if (query.relatedToAssetIds && query.relatedToAssetIds.length > 0) {
      const relationshipSignal = this.getStrongestRelationshipBoost(
        entry.id,
        query.relatedToAssetIds,
        query.relationshipTypes,
        query.preferredRoomTypes || roomTypeTokens,
      );
      if (relationshipSignal.score > 0) {
        score += relationshipSignal.score;
        reasons.push(...relationshipSignal.reasons);
      }
    }

    const rejectionPenalty = this.getRejectionPenalty(entry.id, roomTypeTokens);
    if (rejectionPenalty > 0) {
      score -= rejectionPenalty;
      reasons.push(`fravalgt: -${rejectionPenalty.toFixed(2)}`);
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

  private buildRelationships(): void {
    EXPLICIT_RELATIONSHIP_SEEDS.forEach((seed) => {
      if (seed.type === 'supported_by') {
        this.registerRelationship(seed.sourceAssetId, seed.targetAssetId, seed.type, seed.strength, 'seed', seed.reasons);
        this.registerRelationship(seed.targetAssetId, seed.sourceAssetId, 'supports', Math.max(0.4, seed.strength - 0.06), 'seed', seed.reasons);
        return;
      }

      this.registerRelationship(seed.sourceAssetId, seed.targetAssetId, seed.type, seed.strength, 'seed', seed.reasons);
      this.registerRelationship(seed.targetAssetId, seed.sourceAssetId, seed.type, seed.strength, 'seed', seed.reasons);
    });

    const propEntries = this.entries.filter((entry) => entry.assetType === 'prop');
    const anchorEntries = propEntries.filter((entry) => entry.placementProfile?.anchorRole === 'surface_anchor');
    const surfaceEntries = propEntries.filter((entry) => entry.placementProfile?.defaultPlacementMode === 'surface');

    surfaceEntries.forEach((surfaceEntry) => {
      anchorEntries.forEach((anchorEntry) => {
        const surfaceTypes = new Set(surfaceEntry.placementProfile?.surfaceAnchorTypes || []);
        const anchorTypes = anchorEntry.placementProfile?.surfaceAnchorTypes || [];
        const sharedAnchorTypes = anchorTypes.filter((anchorType) => surfaceTypes.has(anchorType));
        if (sharedAnchorTypes.length === 0) {
          return;
        }

        const sharedRoomTypes = surfaceEntry.roomTypes.filter((roomType) => anchorEntry.roomTypes.includes(roomType));
        const strength = Number((0.42 + sharedAnchorTypes.length * 0.18 + sharedRoomTypes.length * 0.07).toFixed(3));
        this.registerRelationship(
          surfaceEntry.id,
          anchorEntry.id,
          'supported_by',
          strength,
          'inferred',
          [`shared anchor: ${sharedAnchorTypes.join(', ')}`],
        );
        this.registerRelationship(
          anchorEntry.id,
          surfaceEntry.id,
          'supports',
          Math.max(0.35, strength - 0.04),
          'inferred',
          [`shared anchor: ${sharedAnchorTypes.join(', ')}`],
        );
      });
    });
  }

  private registerRelationship(
    sourceAssetId: string,
    targetAssetId: string,
    type: AssetBrainRelationshipType,
    strength: number,
    source: AssetBrainRelationship['source'],
    reasons: string[],
  ): void {
    const sourceEntry = this.entriesById.get(sourceAssetId);
    const targetEntry = this.entriesById.get(targetAssetId);
    if (!sourceEntry || !targetEntry) {
      return;
    }

    const relationship: AssetBrainRelationship = {
      sourceAssetId,
      targetAssetId,
      type,
      strength: Number(strength.toFixed(3)),
      source,
      reasons,
      sharedRoomTypes: sourceEntry.roomTypes.filter((roomType) => targetEntry.roomTypes.includes(roomType)),
    };

    this.relationships.push(relationship);
    const outgoing = this.outgoingRelationshipsById.get(sourceAssetId) || [];
    outgoing.push(relationship);
    this.outgoingRelationshipsById.set(sourceAssetId, outgoing);
    const incoming = this.incomingRelationshipsById.get(targetAssetId) || [];
    incoming.push(relationship);
    this.incomingRelationshipsById.set(targetAssetId, incoming);
  }

  private getUsageBoost(assetId: string): number {
    const count = this.usageCounts.get(assetId) || 0;
    if (count <= 0) {
      return 0;
    }

    return Number(Math.min(1.35, Math.log1p(count) * 0.28).toFixed(3));
  }

  private getContextUsageBoost(assetId: string, roomTypeTokens: string[]): number {
    const relevantRoomTypes = unique(roomTypeTokens);
    if (relevantRoomTypes.length === 0) {
      return 0;
    }

    const total = relevantRoomTypes.reduce((sum, roomType) => (
      sum + (this.contextCounts.get(createContextKey(assetId, 'room', roomType)) || 0)
    ), 0);

    if (total <= 0) {
      return 0;
    }

    return Number(Math.min(1.6, Math.log1p(total) * 0.34).toFixed(3));
  }

  private getStrongestRelationshipBoost(
    candidateAssetId: string,
    relatedToAssetIds: string[],
    relationshipTypes: AssetBrainRelationshipType[] | undefined,
    preferredRoomTypes: string[],
  ): {
    score: number;
    reasons: string[];
  } {
    const signals = relatedToAssetIds.map((relatedAssetId) => this.collectRelationshipSignal(
      relatedAssetId,
      candidateAssetId,
      {
        relationTypes: relationshipTypes,
        direction: 'any',
        preferredRoomTypes,
      },
    ));

    const strongest = signals.sort((left, right) => right.score - left.score)[0];
    if (!strongest || strongest.score <= 0) {
      return { score: 0, reasons: [] };
    }

    return {
      score: Number(Math.min(2.2, strongest.score * 0.55).toFixed(3)),
      reasons: strongest.reasons.slice(0, 2),
    };
  }

  private getRejectionPenalty(assetId: string, roomTypeTokens: string[]): number {
    const globalCount = this.rejectionCounts.get(assetId) || 0;
    const globalPenalty = globalCount > 0
      ? Math.min(0.85, Math.log1p(globalCount) * 0.2)
      : 0;

    const relevantRoomTypes = unique(roomTypeTokens);
    const contextualCount = relevantRoomTypes.reduce((sum, roomType) => (
      sum + (this.rejectionContextCounts.get(createContextKey(assetId, 'room', roomType)) || 0)
    ), 0);
    const contextualPenalty = contextualCount > 0
      ? Math.min(1.4, Math.log1p(contextualCount) * 0.34)
      : 0;

    return Number((globalPenalty + contextualPenalty).toFixed(3));
  }

  private collectRelationshipSignal(
    sourceAssetId: string,
    candidateAssetId: string,
    options: {
      relationTypes?: AssetBrainRelationshipType[];
      direction?: 'outgoing' | 'incoming' | 'any';
      preferredRoomTypes?: string[];
    },
  ): {
    score: number;
    reasons: string[];
    relationshipTypes: AssetBrainRelationshipType[];
  } {
    const allowedTypes = options.relationTypes ? new Set(options.relationTypes) : null;
    const preferredRoomTypes = new Set(options.preferredRoomTypes || []);
    const relationships: AssetBrainRelationship[] = [];

    if (options.direction !== 'incoming') {
      (this.outgoingRelationshipsById.get(sourceAssetId) || [])
        .filter((relationship) => relationship.targetAssetId === candidateAssetId)
        .forEach((relationship) => relationships.push(relationship));
    }

    if (options.direction !== 'outgoing') {
      (this.incomingRelationshipsById.get(sourceAssetId) || [])
        .filter((relationship) => relationship.sourceAssetId === candidateAssetId)
        .forEach((relationship) => relationships.push(relationship));
    }

    let score = 0;
    const reasons: string[] = [];
    const relationshipTypes = new Set<AssetBrainRelationshipType>();

    relationships.forEach((relationship) => {
      if (allowedTypes && !allowedTypes.has(relationship.type)) {
        return;
      }

      let relationshipScore = relationship.strength * 2.8;
      if (relationship.source === 'seed') {
        relationshipScore += 0.45;
      }
      if (
        preferredRoomTypes.size > 0
        && relationship.sharedRoomTypes.some((roomType) => preferredRoomTypes.has(roomType))
      ) {
        relationshipScore += 0.18;
      }

      score += relationshipScore;
      relationshipTypes.add(relationship.type);
      reasons.push(`${relationship.type}: ${relationship.reasons[0] || 'seeded relation'}`);
    });

    const allowsCoOccurrence = !allowedTypes || allowedTypes.has('co_occurs_with');
    if (allowsCoOccurrence) {
      const coOccurrenceCount = this.coOccurrenceCounts.get(createCoOccurrenceKey(sourceAssetId, candidateAssetId)) || 0;
      if (coOccurrenceCount > 0) {
        score += Math.min(1.75, Math.log1p(coOccurrenceCount) * 0.52);
        relationshipTypes.add('co_occurs_with');
        reasons.push(`co-occurs: brukt sammen ${coOccurrenceCount}x`);
      }
    }

    return {
      score: Number(score.toFixed(3)),
      reasons: reasons.slice(0, 4),
      relationshipTypes: Array.from(relationshipTypes),
    };
  }

  private loadMemory(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(ASSET_BRAIN_MEMORY_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const payload = JSON.parse(raw) as Partial<AssetBrainMemoryPayload>;
      Object.entries(payload.usageCounts || {}).forEach(([assetId, count]) => {
        if (typeof count === 'number') {
          this.usageCounts.set(assetId, count);
        }
      });
      Object.entries(payload.contextCounts || {}).forEach(([contextKey, count]) => {
        if (typeof count === 'number') {
          this.contextCounts.set(contextKey, count);
        }
      });
      Object.entries(payload.coOccurrenceCounts || {}).forEach(([pairKey, count]) => {
        if (typeof count === 'number') {
          this.coOccurrenceCounts.set(pairKey, count);
        }
      });
      Object.entries(payload.rejectionCounts || {}).forEach(([assetId, count]) => {
        if (typeof count === 'number') {
          this.rejectionCounts.set(assetId, count);
        }
      });
      Object.entries(payload.rejectionContextCounts || {}).forEach(([contextKey, count]) => {
        if (typeof count === 'number') {
          this.rejectionContextCounts.set(contextKey, count);
        }
      });
    } catch (error) {
      console.warn('[AssetBrain] Could not load persisted memory', error);
    }
  }

  private persistMemory(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const payload: AssetBrainMemoryPayload = {
      version: 1,
      usageCounts: Object.fromEntries(this.usageCounts.entries()),
      contextCounts: Object.fromEntries(this.contextCounts.entries()),
      coOccurrenceCounts: Object.fromEntries(this.coOccurrenceCounts.entries()),
      rejectionCounts: Object.fromEntries(this.rejectionCounts.entries()),
      rejectionContextCounts: Object.fromEntries(this.rejectionContextCounts.entries()),
    };

    try {
      window.localStorage.setItem(ASSET_BRAIN_MEMORY_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('[AssetBrain] Could not persist memory', error);
    }
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
