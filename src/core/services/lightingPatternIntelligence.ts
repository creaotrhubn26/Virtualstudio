import type { EnvironmentLightModifier, EnvironmentLightingIntent } from '../models/environmentPlan';

export type LightingPatternGuideId =
  | 'rembrandt'
  | 'butterfly'
  | 'loop'
  | 'split'
  | 'clamshell'
  | 'three-point'
  | 'high-key'
  | 'low-key';

export interface LightingPatternGoboRecommendation {
  goboId: 'window' | 'blinds' | 'leaves' | 'breakup' | 'dots' | 'lines';
  size?: number;
  rotation?: number;
  intensity?: number;
  rationale?: string;
}

export interface EnvironmentLightingRecipe {
  intent: EnvironmentLightingIntent;
  modifier: EnvironmentLightModifier;
  beamAngle: number;
  rationale: string;
  haze?: {
    enabled: boolean;
    density: number;
    rationale: string;
  };
  gobo?: LightingPatternGoboRecommendation | null;
}

export interface LightingPatternIntent {
  id: string;
  label: string;
  aliases: string[];
  categories: string[];
  topViewGuideId?: LightingPatternGuideId;
  thumbnailFile?: string;
  scenarioPresetIds?: string[];
  goboByRole?: Record<string, LightingPatternGoboRecommendation>;
}

type PatternLike =
  | string
  | {
      id?: string;
      slug?: string;
      name?: string;
      category?: string;
      description?: string;
      tags?: string[];
    };

const GENERATED_IMAGES_BASE = '/attached_assets/generated_images';

const buildGeneratedImagePath = (filename: string): string => `${GENERATED_IMAGES_BASE}/${filename}`;

const getPatternPreviewMeta = (patternLike: PatternLike): { category: string; label: string } => ({
  category:
    typeof patternLike === 'string'
      ? 'dramatic'
      : String(patternLike.category || 'dramatic').toLowerCase(),
  label:
    typeof patternLike === 'string'
      ? patternLike
      : patternLike.name || patternLike.id || patternLike.slug || 'Lighting Pattern',
});

const buildGenericPatternPreview = (label: string, accent: string): string => {
  const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f1117"/>
          <stop offset="100%" stop-color="#202630"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#bg)"/>
      <circle cx="88" cy="72" r="34" fill="${accent}" opacity="0.28"/>
      <circle cx="232" cy="104" r="26" fill="${accent}" opacity="0.18"/>
      <rect x="132" y="32" width="56" height="108" rx="10" fill="#e8edf5" opacity="0.16"/>
      <rect x="148" y="52" width="24" height="44" rx="12" fill="#e8edf5" opacity="0.24"/>
      <path d="M76 164 C124 132 198 132 246 164" stroke="${accent}" stroke-width="8" opacity="0.6" fill="none"/>
      <text x="24" y="176" fill="#f5f7fb" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700">${safeLabel}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const CATEGORY_PREVIEW_COLORS: Record<string, string> = {
  beauty: '#ffd08a',
  commercial: '#9fe7ff',
  dramatic: '#ff7d6d',
  film: '#c69bff',
  'film-noir': '#f2e0a2',
  hollywood: '#f2e0a2',
  interview: '#8ce0c6',
  portrait: '#ffb4c8',
  product: '#ffd37a',
};

const SCENE_FAMILY_PATTERN_RECOMMENDATIONS: Record<string, string[]> = {
  photo_studio: ['clamshell', 'butterfly', 'high-key'],
  film_studio: ['three-point', 'motivated', 'rim-light'],
  beauty: ['clamshell', 'butterfly', 'beauty-ring'],
  noir: ['low-key', 'split', 'motivated'],
  luxury_retail: ['high-key', 'clamshell', 'product-hero'],
  warehouse: ['low-key', 'motivated', 'rim-light'],
  office: ['three-point', 'loop', 'high-key'],
  nightclub: ['cyberpunk', 'split', 'rim-light'],
  food: ['product-hero', 'high-key', 'three-point'],
  unknown: [],
};

const LIGHTING_PATTERN_INTENTS: LightingPatternIntent[] = [
  {
    id: 'rembrandt',
    label: 'Rembrandt',
    aliases: ['rembrandt', 'hollywood-rembrandt'],
    categories: ['portrait', 'hollywood'],
    topViewGuideId: 'rembrandt',
    thumbnailFile: 'rembrandt_lighting_pattern_diagram.png',
    scenarioPresetIds: ['hollywood-rembrandt'],
  },
  {
    id: 'butterfly',
    label: 'Butterfly',
    aliases: ['butterfly', 'paramount', 'hollywood-butterfly'],
    categories: ['beauty', 'hollywood'],
    topViewGuideId: 'butterfly',
    thumbnailFile: 'butterfly_lighting_pattern_diagram.png',
    scenarioPresetIds: ['hollywood-butterfly'],
  },
  {
    id: 'loop',
    label: 'Loop',
    aliases: ['loop', 'hollywood-loop'],
    categories: ['portrait', 'hollywood'],
    topViewGuideId: 'loop',
    thumbnailFile: 'loop_lighting_pattern_diagram.png',
    scenarioPresetIds: ['hollywood-loop'],
  },
  {
    id: 'split',
    label: 'Split',
    aliases: ['split', 'hollywood-split'],
    categories: ['dramatic', 'hollywood'],
    topViewGuideId: 'split',
    thumbnailFile: 'split_lighting_pattern_diagram.png',
    scenarioPresetIds: ['hollywood-split'],
  },
  {
    id: 'clamshell',
    label: 'Clamshell',
    aliases: ['clamshell', 'hollywood-clamshell'],
    categories: ['beauty', 'hollywood'],
    topViewGuideId: 'clamshell',
    thumbnailFile: 'clamshell_lighting_pattern_diagram.png',
    scenarioPresetIds: ['hollywood-clamshell'],
  },
  {
    id: 'three-point',
    label: 'Three-Point',
    aliases: ['three-point', 'three point', 'hollywood-three-point'],
    categories: ['interview', 'video', 'hollywood'],
    topViewGuideId: 'three-point',
    thumbnailFile: 'three-point_lighting_diagram.png',
    scenarioPresetIds: ['hollywood-three-point'],
  },
  {
    id: 'high-key',
    label: 'High Key',
    aliases: ['high-key', 'high key', 'hollywood-high-key'],
    categories: ['commercial', 'hollywood'],
    topViewGuideId: 'high-key',
    thumbnailFile: 'high-key_lighting_diagram.png',
    scenarioPresetIds: ['hollywood-high-key'],
  },
  {
    id: 'low-key',
    label: 'Low Key',
    aliases: ['low-key', 'low key', 'hollywood-low-key', 'film noir'],
    categories: ['dramatic', 'film-noir', 'hollywood'],
    topViewGuideId: 'low-key',
    thumbnailFile: 'film_noir_lighting_diagram.png',
    scenarioPresetIds: ['hollywood-low-key'],
    goboByRole: {
      key: {
        goboId: 'blinds',
        size: 1.2,
        rotation: 0,
        intensity: 0.82,
        rationale: 'Venetian blinds reinforce a noir low-key look.',
      },
    },
  },
  {
    id: 'rim-light',
    label: 'Rim Light',
    aliases: ['rim-light', 'rim light', 'hollywood-rim-light'],
    categories: ['dramatic', 'hollywood'],
    thumbnailFile: 'rim_lighting_pattern_diagram.png',
    scenarioPresetIds: ['hollywood-rim-light'],
  },
  {
    id: 'broad',
    label: 'Broad',
    aliases: ['broad', 'broad lighting'],
    categories: ['portrait'],
    thumbnailFile: 'broad_lighting_pattern_diagram.png',
  },
  {
    id: 'short',
    label: 'Short',
    aliases: ['short', 'short lighting'],
    categories: ['portrait'],
    thumbnailFile: 'short_lighting_pattern_diagram.png',
  },
  {
    id: 'motivated',
    label: 'Motivated',
    aliases: ['motivated', 'window motivated', 'sunbeam'],
    categories: ['film-noir', 'dramatic'],
    goboByRole: {
      key: {
        goboId: 'window',
        size: 1.1,
        rotation: 0,
        intensity: 0.85,
        rationale: 'Motivated lighting benefits from a window-frame breakup.',
      },
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    aliases: ['cyberpunk', 'neon', 'blade runner'],
    categories: ['dramatic'],
    goboByRole: {
      key: {
        goboId: 'lines',
        size: 1.0,
        rotation: 90,
        intensity: 0.7,
        rationale: 'Linear gobo adds synthetic signage streaks.',
      },
      practical: {
        goboId: 'lines',
        size: 1.0,
        rotation: 0,
        intensity: 0.76,
        rationale: 'Linear gobo amplifies neon signage reflections.',
      },
      accent: {
        goboId: 'dots',
        size: 0.9,
        rotation: 0,
        intensity: 0.55,
        rationale: 'Pixel-like breakup keeps cyberpunk accents lively.',
      },
      rim: {
        goboId: 'lines',
        size: 1.0,
        rotation: 90,
        intensity: 0.62,
        rationale: 'Vertical line breakup adds futuristic edge texture.',
      },
    },
  },
];

const patternText = (patternLike: PatternLike): string => {
  if (typeof patternLike === 'string') {
    return patternLike.toLowerCase();
  }

  return [
    patternLike.id,
    patternLike.slug,
    patternLike.name,
    patternLike.category,
    patternLike.description,
    Array.isArray(patternLike.tags) ? patternLike.tags.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

function normalizeSceneFamilyId(familyId: string | null | undefined): string {
  return String(familyId || '').trim().toLowerCase();
}

function getPatternIdentityTokens(patternLike: PatternLike): string[] {
  const intent = inferLightingPatternIntent(patternLike);
  const baseTokens = typeof patternLike === 'string'
    ? [patternLike]
    : [
        patternLike.id,
        patternLike.slug,
        patternLike.name,
      ];

  return [
    intent?.id,
    ...(intent?.aliases || []),
    ...baseTokens,
  ]
    .filter(Boolean)
    .map((token) => String(token).trim().toLowerCase())
    .filter(Boolean);
}

export function inferLightingPatternIntent(patternLike: PatternLike): LightingPatternIntent | null {
  const haystack = patternText(patternLike);
  if (!haystack) {
    return null;
  }

  return (
    LIGHTING_PATTERN_INTENTS.find((intent) =>
      intent.aliases.some((alias) => haystack.includes(alias.toLowerCase())),
    ) || null
  );
}

export function getRecommendedLightingPatternIdsForSceneFamily(familyId: string | null | undefined): string[] {
  const normalizedFamilyId = normalizeSceneFamilyId(familyId);
  return [...(SCENE_FAMILY_PATTERN_RECOMMENDATIONS[normalizedFamilyId] || [])];
}

export function formatLightingPatternLabel(patternId: string | null | undefined): string {
  const normalizedId = String(patternId || '').trim();
  if (!normalizedId || normalizedId === 'none') {
    return 'Ingen';
  }

  const intent = inferLightingPatternIntent(normalizedId);
  if (intent?.label) {
    return intent.label;
  }

  return normalizedId
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function getRecommendedLightingPatternLabelsForSceneFamily(familyId: string | null | undefined): string[] {
  return getRecommendedLightingPatternIdsForSceneFamily(familyId).map((patternId) => formatLightingPatternLabel(patternId));
}

export function isLightingPatternRecommendedForSceneFamily(
  patternLike: PatternLike,
  familyId: string | null | undefined,
): boolean {
  const recommendedIds = getRecommendedLightingPatternIdsForSceneFamily(familyId);
  if (recommendedIds.length === 0) {
    return false;
  }

  const patternTokens = getPatternIdentityTokens(patternLike);
  return recommendedIds.some((recommendedId) => patternTokens.includes(recommendedId));
}

export function resolveLightingPatternThumbnail(patternLike: PatternLike): string {
  const intent = inferLightingPatternIntent(patternLike);
  if (intent?.thumbnailFile) {
    return buildGeneratedImagePath(intent.thumbnailFile);
  }

  return resolveLightingPatternThumbnailFallback(patternLike);
}

export function resolveLightingPatternThumbnailFallback(patternLike: PatternLike): string {
  const { category, label } = getPatternPreviewMeta(patternLike);
  return buildGenericPatternPreview(label, CATEGORY_PREVIEW_COLORS[category] || '#9fe7ff');
}

export function resolveScenarioPresetPreview(
  presetId: string,
  previewImage?: string,
  category?: string,
): string {
  const intent = inferLightingPatternIntent(presetId);
  if (intent?.thumbnailFile) {
    return buildGeneratedImagePath(intent.thumbnailFile);
  }

  if (previewImage && !previewImage.startsWith('/images/presets/')) {
    return previewImage;
  }

  const accent = CATEGORY_PREVIEW_COLORS[String(category || 'dramatic').toLowerCase()] || '#9fe7ff';
  const label = presetId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return buildGenericPatternPreview(label, accent);
}

export function getTopViewGuideForPattern(patternLike: PatternLike): LightingPatternGuideId | 'none' {
  return inferLightingPatternIntent(patternLike)?.topViewGuideId || 'none';
}

export function getLightingPatternGobo(
  patternLike: PatternLike,
  role: string,
  contextText: string = '',
): LightingPatternGoboRecommendation | null {
  const intent = inferLightingPatternIntent(patternLike);
  if (!intent?.goboByRole) {
    return null;
  }

  const normalizedRole = role.toLowerCase();
  const contextualText = `${patternText(patternLike)} ${contextText}`.toLowerCase();
  const directMatch = intent.goboByRole[normalizedRole];
  if (directMatch) {
    return directMatch;
  }

  if (intent.id === 'cyberpunk' && (normalizedRole === 'background' || normalizedRole === 'fill')) {
    return intent.goboByRole.accent || null;
  }

  if (intent.id === 'low-key' && contextualText.includes('noir')) {
    return intent.goboByRole.key || null;
  }

  if (intent.id === 'motivated' && (normalizedRole === 'back' || normalizedRole === 'rim')) {
    return intent.goboByRole.key || null;
  }

  return null;
}

export function inferEnvironmentLightingRecipe(options: {
  role: string;
  purpose?: string | null;
  mood?: string | null;
  contextText?: string | null;
}): EnvironmentLightingRecipe {
  const role = String(options.role || '').toLowerCase();
  const text = [
    options.role,
    options.purpose || '',
    options.mood || '',
    options.contextText || '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const roleMatches = (tokens: string[]) => tokens.some((token) => role.includes(token));
  const hasAny = (tokens: string[]) => tokens.some((token) => text.includes(token));
  const purpose = String(options.purpose || '').trim();

  const setRecipe = (
    intent: EnvironmentLightingIntent,
    modifier: EnvironmentLightModifier,
    beamAngle: number,
    rationale: string,
    extras: Pick<EnvironmentLightingRecipe, 'haze' | 'gobo'> = {},
  ): EnvironmentLightingRecipe => ({
    intent,
    modifier,
    beamAngle,
    rationale,
    gobo: extras.gobo,
    haze: extras.haze,
  });

  if (hasAny(['beauty', 'editorial', 'cosmetic', 'fashion'])) {
    const gobo = roleMatches(['accent', 'rim', 'background'])
      ? {
          goboId: 'breakup' as const,
          size: 1.0,
          rotation: 0,
          intensity: 0.55,
          rationale: 'Subtle breakup keeps the beauty background glossy without dirtying the key.',
        }
      : null;
    return setRecipe(
      'beauty',
      roleMatches(['key', 'fill']) ? 'softbox' : 'stripbox',
      roleMatches(['fill']) ? 66 : 42,
      purpose || 'Soft shaping for beauty skin, clean eyes and glossy premium separation.',
      { gobo },
    );
  }

  if (hasAny(['luxury retail', 'showroom', 'retail', 'boutique'])) {
    return setRecipe(
      'luxury_retail',
      roleMatches(['key']) ? 'fresnel' : 'stripbox',
      roleMatches(['accent', 'rim']) ? 26 : 38,
      purpose || 'Controlled premium showroom contrast with tight beams on merchandise and signage.',
      {
        gobo: roleMatches(['accent', 'background'])
          ? {
              goboId: 'lines',
              size: 1.0,
              rotation: 90,
              intensity: 0.42,
              rationale: 'Linear breakup hints at display slats and premium architectural rhythm.',
            }
          : null,
      },
    );
  }

  if (hasAny(['nightclub', 'club', 'dancefloor', 'dj', 'strobe'])) {
    return setRecipe(
      'nightclub',
      roleMatches(['practical', 'accent']) ? 'gobo_projector' : 'fresnel',
      roleMatches(['accent', 'practical']) ? 24 : 34,
      purpose || 'Punchy nightlife lighting with atmospheric haze and graphic texture.',
      {
        haze: {
          enabled: true,
          density: 0.026,
          rationale: 'Nightclub beams read better with visible haze in the volume.',
        },
        gobo: roleMatches(['accent', 'practical', 'rim'])
          ? {
              goboId: 'dots',
              size: 0.92,
              rotation: 0,
              intensity: 0.72,
              rationale: 'Dot breakup mimics moving club fixtures and LED texture.',
            }
          : null,
      },
    );
  }

  if (hasAny(['noir', 'detective', 'venetian', 'low-key'])) {
    return setRecipe(
      'noir',
      'fresnel',
      roleMatches(['key']) ? 24 : 32,
      purpose || 'Hard noir modeling with disciplined spill and shaped shadow texture.',
      {
        gobo: roleMatches(['key', 'accent', 'rim'])
          ? {
              goboId: 'blinds',
              size: 1.2,
              rotation: 0,
              intensity: 0.9,
              rationale: 'Venetian blind breakup reinforces the noir silhouette language.',
            }
          : null,
      },
    );
  }

  if (hasAny(['cyberpunk', 'blade runner', 'neon', 'futuristic'])) {
    return setRecipe(
      'cyberpunk',
      roleMatches(['practical', 'accent']) ? 'gobo_projector' : 'stripbox',
      roleMatches(['practical']) ? 28 : 34,
      purpose || 'Synthetic neon contrast with reflective streaks and animated practicals.',
      {
        haze: {
          enabled: true,
          density: 0.018,
          rationale: 'Light haze helps the neon beams read against reflective surfaces.',
        },
        gobo: roleMatches(['accent', 'rim', 'practical'])
          ? {
              goboId: roleMatches(['accent']) ? 'dots' : 'lines',
              size: 1.0,
              rotation: roleMatches(['rim']) ? 90 : 0,
              intensity: roleMatches(['practical']) ? 0.76 : 0.62,
              rationale: 'Graphic breakup reinforces synthetic signage and wet-surface reflections.',
            }
          : null,
      },
    );
  }

  if (hasAny(['warehouse', 'industrial', 'garage', 'factory'])) {
    return setRecipe(
      'warehouse',
      roleMatches(['key']) ? 'fresnel' : 'gobo_projector',
      roleMatches(['accent', 'background']) ? 28 : 36,
      purpose || 'Industrial overhead shaping with dusty background texture and deeper beam definition.',
      {
        haze: roleMatches(['accent', 'background'])
          ? {
              enabled: true,
              density: 0.014,
              rationale: 'A touch of haze helps industrial breakup and shafts read in depth.',
            }
          : undefined,
        gobo: roleMatches(['accent', 'background', 'rim'])
          ? {
              goboId: 'breakup',
              size: 1.25,
              rotation: 0,
              intensity: 0.78,
              rationale: 'Industrial breakup adds dusty warehouse texture and layered depth.',
            }
          : null,
      },
    );
  }

  if (hasAny(['pizza', 'pizzeria', 'restaurant', 'trattoria', 'food', 'menu', 'kitchen'])) {
    return setRecipe(
      'food',
      roleMatches(['key']) ? 'softbox' : roleMatches(['rim']) ? 'fresnel' : 'lantern',
      roleMatches(['key']) ? 38 : 30,
      purpose || 'Warm appetizing separation with controlled architectural texture around the food hero.',
      {
        gobo: roleMatches(['rim', 'accent', 'background'])
          ? {
              goboId: 'window',
              size: 1.0,
              rotation: 0,
              intensity: 0.45,
              rationale: 'Warm window breakup makes the set feel like a lived-in restaurant without cluttering the hero.',
            }
          : null,
      },
    );
  }

  if (hasAny(['office', 'corporate', 'meeting room', 'interview', 'presentation'])) {
    return setRecipe(
      'office',
      roleMatches(['key']) ? 'softbox' : 'none',
      roleMatches(['fill']) ? 72 : 46,
      purpose || 'Corporate-safe soft daylight style with clean spill and readable faces.',
      {},
    );
  }

  if (hasAny(['hero product', 'product', 'commercial'])) {
    return setRecipe(
      'hero_product',
      roleMatches(['key']) ? 'softbox' : 'stripbox',
      roleMatches(['accent', 'rim']) ? 24 : 36,
      purpose || 'Commercial product rig with crisp edge control and clean reflection management.',
      {},
    );
  }

  return setRecipe(
    roleMatches(['key']) ? 'dramatic' : 'soft_daylight',
    roleMatches(['key']) ? 'fresnel' : 'softbox',
    roleMatches(['key']) ? 34 : 52,
    purpose || 'Balanced studio lighting matched to the current scene intent.',
    {},
  );
}

export function inferEnvironmentLightingGobo(options: {
  role: string;
  purpose?: string | null;
  mood?: string | null;
  contextText?: string | null;
}): LightingPatternGoboRecommendation | null {
  const role = String(options.role || '').toLowerCase();
  const text = [
    options.role,
    options.purpose || '',
    options.mood || '',
    options.contextText || '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const roleMatches = (tokens: string[]) => tokens.some((token) => role.includes(token));

  const patternMatch = getLightingPatternGobo(
    `${options.mood || ''} ${options.contextText || ''}`.trim(),
    role,
    text,
  );
  if (patternMatch) {
    return patternMatch;
  }

  const recipeMatch = inferEnvironmentLightingRecipe(options).gobo;
  if (recipeMatch) {
    return recipeMatch;
  }

  const cleanPortraitTokens = [
    'rembrandt',
    'loop lighting',
    'loop portrait',
    'butterfly',
    'paramount',
    'clamshell',
    'three-point',
    'three point',
    'headshot',
    'clean portrait',
  ];
  const texturedGoboTokens = [
    'leaves',
    'forest',
    'garden',
    'organic',
    'blinds',
    'venetian',
    'noir',
    'detective',
    'window',
    'sunbeam',
    'sunlight',
    'cyberpunk',
    'neon',
    'scan',
    'ritual',
    'horror',
    'occult',
    'warehouse',
    'pizza',
    'pizzeria',
    'restaurant',
    'trattoria',
  ];
  const texturedSupportRoles = ['accent', 'background', 'rim', 'back', 'hair', 'practical'];

  if (
    cleanPortraitTokens.some((token) => text.includes(token))
    && !texturedGoboTokens.some((token) => text.includes(token))
    && !roleMatches(texturedSupportRoles)
  ) {
    return null;
  }

  if (['leaves', 'forest', 'garden', 'organic'].some((token) => text.includes(token))) {
    return {
      goboId: 'leaves',
      size: 1.5,
      rotation: 0,
      intensity: 0.82,
      rationale: 'Organic leaf breakup to add natural texture.',
    };
  }

  if (['blinds', 'venetian', 'noir', 'detective'].some((token) => text.includes(token))) {
    return {
      goboId: 'blinds',
      size: 1.2,
      rotation: 0,
      intensity: 0.9,
      rationale: 'Venetian blind pattern for cinematic noir contrast.',
    };
  }

  if (['window', 'sunbeam', 'sunlight'].some((token) => text.includes(token))) {
    return {
      goboId: 'window',
      size: 1.1,
      rotation: 0,
      intensity: 0.88,
      rationale: 'Window breakup to suggest architectural light entering the set.',
    };
  }

  if (['cyberpunk', 'neon', 'scan'].some((token) => text.includes(token))) {
    return {
      goboId: 'lines',
      size: 1.0,
      rotation: text.includes('vertical') ? 90 : 0,
      intensity: 0.72,
      rationale: 'Linear gobo to create synthetic signage streaks and wet-floor texture.',
    };
  }

  if (['pizza', 'pizzeria', 'restaurant', 'trattoria', 'food', 'appetizing', 'crust', 'steam', 'glassware'].some((token) => text.includes(token))) {
    if (roleMatches(texturedSupportRoles)) {
      return {
        goboId: 'window',
        size: 1.0,
        rotation: 0,
        intensity: 0.45,
        rationale: 'Warm window breakup adds appetizing architectural texture without cluttering the food hero.',
      };
    }
    return null;
  }

  if (['beauty', 'fashion', 'luxury', 'editorial'].some((token) => text.includes(token))) {
    if (!roleMatches(texturedSupportRoles)) {
      return null;
    }
    return {
      goboId: 'breakup',
      size: 1.0,
      rotation: 0,
      intensity: 0.55,
      rationale: 'Subtle breakup texture to add premium editorial depth without cluttering the face.',
    };
  }

  if (['warehouse', 'industrial', 'garage', 'factory'].some((token) => text.includes(token))) {
    if (
      roleMatches(texturedSupportRoles)
      || ['texture', 'breakup', 'shadow', 'silhouette', 'dusty', 'haze', 'beam', 'background'].some((token) => text.includes(token))
    ) {
      return {
        goboId: 'breakup',
        size: 1.25,
        rotation: 0,
        intensity: 0.78,
        rationale: 'Industrial breakup adds dusty warehouse texture and layered background contrast.',
      };
    }
    return null;
  }

  if (['ritual', 'horror', 'occult'].some((token) => text.includes(token))) {
    return {
      goboId: 'breakup',
      size: 1.3,
      rotation: 0,
      intensity: 0.84,
      rationale: 'Irregular breakup to add unease and environmental texture.',
    };
  }

  return null;
}
