import type { EnvironmentPlan } from '../core/models/environmentPlan';
import type { EnvironmentPlanInsightPresentation } from './environmentPlanInsightPresentation';

export interface MarketplaceEnvironmentPackSuggestion {
  name: string;
  description: string;
  tags: string[];
  features: string[];
  environmentCategory: string;
  familyId: string;
}

const FAMILY_LABELS: Record<string, { title: string; category: string; tags: string[]; featureHints: string[] }> = {
  food: {
    title: 'Food Environment Pack',
    category: 'food',
    tags: ['environment', 'food', 'restaurant', 'branding'],
    featureHints: ['Branded food shell', 'Hero product lighting', 'Staff and service zoning'],
  },
  warehouse: {
    title: 'Warehouse Industrial Pack',
    category: 'urban',
    tags: ['environment', 'warehouse', 'industrial', 'cinematic'],
    featureHints: ['Warehouse shell', 'Industrial breakup lighting', 'Open truss depth staging'],
  },
  noir: {
    title: 'Noir Detective Pack',
    category: 'cinematic',
    tags: ['environment', 'noir', 'cinematic', 'dramatic'],
    featureHints: ['Noir room shell', 'Blind breakup lighting', 'Dramatic mood framing'],
  },
  luxury_retail: {
    title: 'Luxury Retail Showroom Pack',
    category: 'studio',
    tags: ['environment', 'luxury retail', 'showroom', 'premium'],
    featureHints: ['Premium storefront shell', 'Display rhythm and plinths', 'Architectural accent lighting'],
  },
  film_studio: {
    title: 'Film Soundstage Pack',
    category: 'studio',
    tags: ['environment', 'film studio', 'soundstage', 'production'],
    featureHints: ['Open soundstage shell', 'Hero and camera lanes', 'Flexible cinematic base lighting'],
  },
  photo_studio: {
    title: 'Editorial Photo Studio Pack',
    category: 'studio',
    tags: ['environment', 'photo studio', 'editorial', 'beauty'],
    featureHints: ['Seamless studio shell', 'Beauty lighting rig', 'Clean editorial framing'],
  },
};

function slugToTitle(input: string): string {
  return input
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    const value = String(tag || '').trim().toLowerCase();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized.slice(0, 8);
}

export function suggestMarketplaceEnvironmentPackMetadata(
  plan: EnvironmentPlan,
  options: {
    insights?: EnvironmentPlanInsightPresentation | null;
  } = {},
): MarketplaceEnvironmentPackSuggestion {
  const normalizedFamilyId = String(options.insights?.familyId || '').trim().toLowerCase()
    || String(plan.layoutGuidance?.roomType || '').trim().toLowerCase()
    || String(plan.branding?.brandName ? 'food' : '').trim().toLowerCase()
    || 'environment';
  const familyDefaults = FAMILY_LABELS[normalizedFamilyId] || {
    title: `${slugToTitle(normalizedFamilyId)} Environment Pack`,
    category: plan.roomShell?.type || 'studio',
    tags: ['environment', normalizedFamilyId],
    featureHints: ['Scene-ready environment plan', 'Shell, lighting and camera setup'],
  };

  const brandedName = String(plan.branding?.brandName || '').trim();
  const concept = String(plan.concept || '').trim();
  const summary = String(plan.summary || plan.prompt || '').trim();
  const name = brandedName
    ? `${brandedName} ${familyDefaults.title}`
    : concept || familyDefaults.title;

  const descriptionParts = [
    summary || familyDefaults.title,
    plan.branding?.enabled ? 'Med branding, palett og scene-retning.' : 'Scene-klar miljøpakke for Virtual Studio.',
  ];

  const featureHints = [
    ...familyDefaults.featureHints,
    plan.characters && plan.characters.length > 0 ? `${plan.characters.length} scene characters` : '',
    plan.roomShell?.type ? `${slugToTitle(plan.roomShell.type)} shell` : '',
  ].filter(Boolean);

  const tags = normalizeTags([
    ...familyDefaults.tags,
    ...(plan.branding?.enabled ? ['branding'] : []),
    ...(plan.characters && plan.characters.length > 0 ? ['characters'] : []),
    ...(plan.props && plan.props.length > 0 ? ['props'] : []),
    plan.roomShell?.type || '',
    options.insights?.familyId || '',
  ]);

  return {
    name,
    description: descriptionParts.join(' '),
    tags,
    features: featureHints.slice(0, 5),
    environmentCategory: familyDefaults.category,
    familyId: normalizedFamilyId,
  };
}
