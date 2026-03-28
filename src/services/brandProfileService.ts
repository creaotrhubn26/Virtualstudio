import type { EnvironmentPlanBrandReference } from '../core/models/environmentPlan';
import settingsService from './settingsService';
import type { BrandPaletteOption } from './brandPaletteService';
import { getBrandDirectionPresetById } from './brandDirectionService';

const BRAND_PROFILE_NAMESPACE = 'virtualStudio_brand_profile_current';
const BRAND_PROFILE_VERSION = '1.0';
const DEFAULT_APPLICATION_TARGETS = ['signage', 'wardrobe', 'packaging', 'interior_details'];

function normalizeApplicationTarget(target: string): string {
  const normalized = String(target || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'interior_details') {
    return 'interior_details';
  }
  return normalized;
}

export interface StoredBrandProfile {
  version: '1.0';
  brandName: string;
  brandNotes: string;
  logoName: string | null;
  logoImage: string | null;
  paletteOptions: BrandPaletteOption[];
  selectedPaletteId: string;
  selectedPaletteColors: string[];
  applicationTargets: string[];
  selectedDirectionId: string;
  uniformPolicy: string | null;
  signageStyle: string | null;
  packagingStyle: string | null;
  interiorStyle: string | null;
  lastUsedAt: string;
}

export interface SaveBrandProfileInput {
  brandName: string;
  brandNotes: string;
  logoName?: string | null;
  logoImage?: string | null;
  paletteOptions?: BrandPaletteOption[];
  selectedPaletteId?: string;
  selectedPaletteColors?: string[];
  applicationTargets?: string[];
  selectedDirectionId?: string;
  uniformPolicy?: string | null;
  signageStyle?: string | null;
  packagingStyle?: string | null;
  interiorStyle?: string | null;
}

function sanitizeHexPalette(colors: string[] | undefined, limit = 5): string[] {
  const palette: string[] = [];
  const seen = new Set<string>();

  for (const rawColor of colors || []) {
    if (typeof rawColor !== 'string') continue;
    const normalized = rawColor.trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    palette.push(normalized);
    if (palette.length >= limit) break;
  }

  return palette;
}

function sanitizePaletteOptions(options: BrandPaletteOption[] | undefined): BrandPaletteOption[] {
  return (options || [])
    .map((option) => ({
      id: String(option.id || '').trim(),
      label: String(option.label || '').trim(),
      description: String(option.description || '').trim(),
      colors: sanitizeHexPalette(option.colors),
    }))
    .filter((option) => option.id && option.label && option.colors.length > 0)
    .slice(0, 6);
}

function sanitizeApplicationTargets(targets: string[] | undefined): string[] {
  const normalized = (targets || [])
    .map((target) => normalizeApplicationTarget(target))
    .filter(Boolean);
  return normalized.length > 0 ? [...new Set(normalized)].slice(0, 8) : [...DEFAULT_APPLICATION_TARGETS];
}

function sanitizeStoredProfile(value: unknown): StoredBrandProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const paletteOptions = sanitizePaletteOptions(candidate.paletteOptions as BrandPaletteOption[] | undefined);
  const selectedPaletteColors = sanitizeHexPalette(candidate.selectedPaletteColors as string[] | undefined);

  return {
    version: BRAND_PROFILE_VERSION,
    brandName: String(candidate.brandName || '').trim(),
    brandNotes: String(candidate.brandNotes || '').trim(),
    logoName: typeof candidate.logoName === 'string' && candidate.logoName.trim() ? candidate.logoName.trim() : null,
    logoImage: typeof candidate.logoImage === 'string' && candidate.logoImage.trim() ? candidate.logoImage.trim() : null,
    paletteOptions,
    selectedPaletteId: typeof candidate.selectedPaletteId === 'string' ? candidate.selectedPaletteId.trim() : '',
    selectedPaletteColors,
    applicationTargets: sanitizeApplicationTargets(candidate.applicationTargets as string[] | undefined),
    selectedDirectionId: typeof candidate.selectedDirectionId === 'string' ? candidate.selectedDirectionId.trim() : '',
    uniformPolicy: typeof candidate.uniformPolicy === 'string' && candidate.uniformPolicy.trim() ? candidate.uniformPolicy.trim() : null,
    signageStyle: typeof candidate.signageStyle === 'string' && candidate.signageStyle.trim() ? candidate.signageStyle.trim() : null,
    packagingStyle: typeof candidate.packagingStyle === 'string' && candidate.packagingStyle.trim() ? candidate.packagingStyle.trim() : null,
    interiorStyle: typeof candidate.interiorStyle === 'string' && candidate.interiorStyle.trim() ? candidate.interiorStyle.trim() : null,
    lastUsedAt: typeof candidate.lastUsedAt === 'string' && candidate.lastUsedAt.trim()
      ? candidate.lastUsedAt.trim()
      : new Date(0).toISOString(),
  };
}

export function hasMeaningfulBrandProfile(input: {
  brandName?: string;
  brandNotes?: string;
  logoImage?: string | null;
  selectedPaletteColors?: string[];
}): boolean {
  return Boolean(
    input.brandName?.trim()
    || input.brandNotes?.trim()
    || input.logoImage
    || (input.selectedPaletteColors || []).length > 0
  );
}

export async function getStoredBrandProfile(): Promise<StoredBrandProfile | null> {
  const stored = await settingsService.getSetting<StoredBrandProfile>(BRAND_PROFILE_NAMESPACE);
  return sanitizeStoredProfile(stored);
}

export async function saveStoredBrandProfile(input: SaveBrandProfileInput): Promise<StoredBrandProfile> {
  const payload: StoredBrandProfile = {
    version: BRAND_PROFILE_VERSION,
    brandName: String(input.brandName || '').trim(),
    brandNotes: String(input.brandNotes || '').trim(),
    logoName: typeof input.logoName === 'string' && input.logoName.trim() ? input.logoName.trim() : null,
    logoImage: typeof input.logoImage === 'string' && input.logoImage.trim() ? input.logoImage.trim() : null,
    paletteOptions: sanitizePaletteOptions(input.paletteOptions),
    selectedPaletteId: String(input.selectedPaletteId || '').trim(),
    selectedPaletteColors: sanitizeHexPalette(input.selectedPaletteColors),
    applicationTargets: sanitizeApplicationTargets(input.applicationTargets),
    selectedDirectionId: String(input.selectedDirectionId || '').trim(),
    uniformPolicy: typeof input.uniformPolicy === 'string' && input.uniformPolicy.trim() ? input.uniformPolicy.trim() : null,
    signageStyle: typeof input.signageStyle === 'string' && input.signageStyle.trim() ? input.signageStyle.trim() : null,
    packagingStyle: typeof input.packagingStyle === 'string' && input.packagingStyle.trim() ? input.packagingStyle.trim() : null,
    interiorStyle: typeof input.interiorStyle === 'string' && input.interiorStyle.trim() ? input.interiorStyle.trim() : null,
    lastUsedAt: new Date().toISOString(),
  };

  await settingsService.setSetting(BRAND_PROFILE_NAMESPACE, payload);
  return payload;
}

export async function clearStoredBrandProfile(): Promise<boolean> {
  return settingsService.deleteSetting(BRAND_PROFILE_NAMESPACE);
}

export function buildBrandReferenceFromProfile(profile: StoredBrandProfile | null): EnvironmentPlanBrandReference | undefined {
  if (!profile || !hasMeaningfulBrandProfile(profile)) {
    return undefined;
  }

  const targetCopy = profile.applicationTargets.length > 0
    ? `Apply this brand consistently to ${profile.applicationTargets.map((target) => target.replace(/_/g, ' ')).join(', ')}.`
    : 'Apply this brand consistently to signage, wardrobe, packaging and interior details.';
  const direction = getBrandDirectionPresetById(profile.selectedDirectionId);
  const usageNotes = [profile.brandNotes, direction?.usageNote, targetCopy].filter(Boolean).join(' ').trim();

  return {
    brandName: profile.brandName || undefined,
    profileName: direction?.label || profile.brandName || undefined,
    usageNotes: usageNotes || undefined,
    logoImage: profile.logoImage || undefined,
    palette: profile.selectedPaletteColors,
    applicationTargets: profile.applicationTargets as EnvironmentPlanBrandReference['applicationTargets'],
    uniformPolicy: (profile.uniformPolicy || direction?.uniformPolicy || undefined) as EnvironmentPlanBrandReference['uniformPolicy'],
    signageStyle: (profile.signageStyle || direction?.signageStyle || undefined) as EnvironmentPlanBrandReference['signageStyle'],
    packagingStyle: (profile.packagingStyle || direction?.packagingStyle || undefined) as EnvironmentPlanBrandReference['packagingStyle'],
    interiorStyle: (profile.interiorStyle || direction?.interiorStyle || undefined) as EnvironmentPlanBrandReference['interiorStyle'],
    directionId: profile.selectedDirectionId || direction?.id || undefined,
  };
}
