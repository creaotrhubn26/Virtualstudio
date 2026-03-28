import type { GoboDefinition } from '../data/goboDefinitions';
import type { EnvironmentPlanInsightPresentation } from './environmentPlanInsightPresentation';

export function getLightingInsightForRole(
  environmentInsights: EnvironmentPlanInsightPresentation | null | undefined,
  lightRole: string | null | undefined,
): string | null {
  const rolePrefix = String(lightRole || '').trim().toLowerCase();
  if (rolePrefix && Array.isArray(environmentInsights?.lightingDetails)) {
    return environmentInsights.lightingDetails.find((detail) => detail.toLowerCase().startsWith(`${rolePrefix}:`)) || null;
  }
  return environmentInsights?.lightingDetails?.[0] || null;
}

export function inferRecommendedGoboId(
  selectedLightRole: string | null | undefined,
  selectedLightRationale: string | null | undefined,
  environmentInsights: EnvironmentPlanInsightPresentation | null | undefined,
): GoboDefinition['id'] | null {
  const roleDetail = getLightingInsightForRole(environmentInsights, selectedLightRole);
  const text = [
    selectedLightRationale,
    roleDetail,
    environmentInsights?.summary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!text) {
    return null;
  }
  if (text.includes('venetian') || text.includes('persienne') || text.includes('blinds')) {
    return 'blinds';
  }
  if (text.includes('window') || text.includes('vindu')) {
    return 'window';
  }
  if (text.includes('breakup') || text.includes('bruddmønster')) {
    return 'breakup';
  }
  if (text.includes('leave') || text.includes('leaf') || text.includes('løv')) {
    return 'leaves';
  }
  if (text.includes('lines') || text.includes('linjer')) {
    return 'lines';
  }
  if (text.includes('dots') || text.includes('prikker')) {
    return 'dots';
  }
  return null;
}

export function inferRecommendedModifier(
  selectedLightInsight: string | null | undefined,
): string | null {
  const text = String(selectedLightInsight || '').toLowerCase();
  if (!text) {
    return null;
  }
  if (text.includes('fresnel')) return 'fresnel';
  if (text.includes('softbox') || text.includes('softboks')) return 'softbox';
  if (text.includes('octabox') || text.includes('oktaboks')) return 'octabox';
  if (text.includes('stripbox') || text.includes('stripboks')) return 'stripbox';
  if (text.includes('umbrella') || text.includes('paraply')) return 'umbrella';
  if (text.includes('beauty dish') || text.includes('beautydish')) return 'beautydish';
  if (text.includes('grid')) return 'grid';
  if (text.includes('snoot')) return 'snoot';
  if (text.includes('barn door') || text.includes('barndoors') || text.includes('klaffed')) return 'barndoors';
  if (text.includes('gobo')) return 'gobo';
  return null;
}

export function inferRecommendedBeamAngle(
  selectedLightInsight: string | null | undefined,
): number | null {
  const text = String(selectedLightInsight || '');
  const match = text.match(/(\d{2,3})\s*°/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}
